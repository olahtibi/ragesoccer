var TeamAi = function(config, team, opponentTeam, ball) {
  this.config = config;
  this.team = team;
  this.opponentTeam = opponentTeam;
  this.ball = ball;
  this.formation = new Formation(config);
  this.state = config.restarts.kickoffSide == team.side ? "kickoffUs" : "kickoffOpponent";
  this.ballAttacker = null;
  this.cornerTakerIndex = -1;
  this.cornerPositioningTargets = null;
  this._individualAis = [];
  this.movementProfiles = this.createMovementProfiles();

  for (var i = 0; i < team.players.length; i++) {
    var individualAi = new IndividualAi(config, team, team.players[i]);
    individualAi.formationPaceMultiplier = this.movementProfiles[i].paceMultiplier;
    this._individualAis.push(individualAi);
  }
};

// Public API (underscore-prefixed members are private helpers)

TeamAi.prototype.update = function(context) {
  if (!this.config.ai.enabled) {
    return;
  }

  context = context || {};
  var restartActive = context.restartActive == true;
  this.state = this.nextState(restartActive);
  this.updateCornerContext(context);
  var targets = context.positioningTargets ||
    (this.state == "cornerUs" && this.cornerPositioningTargets != null ?
      this.cornerPositioningTargets :
      this.formation.positions(this.state, this.team.side, this.team.players.length));
  var openPlayFormation = !restartActive &&
    (this.state == "attack" || this.state == "defense");
  targets = openPlayFormation ?
    this.openPlayTargets(targets, context.deltaSeconds) :
    this.exactTargets(targets);
  var chasingCornerCross = this.state == "cornerUs" && !restartActive;
  var closest = chasingCornerCross ?
    (this.team.side == "home" ? this.team.humanPlayer : null) :
    (this.team.side == "home" ? this.team.humanPlayer :
      (context.restartTaker || this.selectedBallAttacker()));
  var commandContext = {
    ball: this.ball,
    team: this.team,
    opponentTeam: this.opponentTeam,
    attackTarget: context.attackTarget || null
  };

  for (var i = 0; i < this._individualAis.length; i++) {
    var ai = this._individualAis[i];
    if (context.canMove == false) {
      ai.player.velocity.x = 0;
      ai.player.velocity.y = 0;
      ai.setCommand("inactive", null);
    } else if (this.team.side == "home" && ai.player === closest) {
      ai.player.velocity.x = 0;
      ai.player.velocity.y = 0;
      ai.setCommand("inactive", null);
    } else if (chasingCornerCross && this.shouldChaseCorner(i)) {
      ai.setCommand("attackBall", null);
    } else if (this.team.side != "home" && ai.player === closest) {
      ai.setCommand("attackBall", null);
    } else {
      ai.setCommand("moveToPosition", targets[i]);
    }
    ai.update(commandContext);
  }
};

TeamAi.prototype.updateCornerContext = function(context) {
  if (this.state != "cornerUs") {
    this.cornerTakerIndex = -1;
    this.cornerPositioningTargets = null;
    return;
  }
  if (context.restartTaker != null) {
    this.cornerTakerIndex = this.team.players.indexOf(context.restartTaker);
  }
  if (context.positioningTargets != null) {
    this.cornerPositioningTargets = context.positioningTargets;
  }
};

TeamAi.prototype.createMovementProfiles = function() {
  var roles = this.formation.rolesForSize(this.team.players.length);
  var profiles = [];
  var paceValues = [];
  var paceTotal = 0;

  for (var i = 0; i < roles.length; i++) {
    var isGoalie = roles[i] == "goalie";
    var paceValue = isGoalie ? 0 : this.profileValue(i, 1);
    profiles.push({
      role: roles[i],
      paceValue: paceValue,
      paceMultiplier: 1,
      lateralBias: isGoalie ? 0 :
        this.profileValue(i, 2) * this.config.ai.formationLateralVariation,
      depthBias: isGoalie ? 0 :
        this.profileValue(i, 3) * this.config.ai.formationDepthVariation,
      responseRate: isGoalie ? 0 : this.profileRange(
        i,
        4,
        this.config.ai.formationTargetResponseMin,
        this.config.ai.formationTargetResponseMax
      ),
      ballResponseMultiplier: isGoalie ? 1 : 1 +
        this.profileValue(i, 5) * this.config.ai.formationBallResponseVariation,
      smoothedTarget: null,
      wanderStep: 0,
      wanderElapsed: 0,
      wanderDuration: 0,
      wanderFrom: new Vector2d(0, 0),
      wanderTo: new Vector2d(0, 0)
    });
    if (!isGoalie) {
      paceValues.push(paceValue);
      paceTotal += paceValue;
    }
  }

  var paceMean = paceValues.length == 0 ? 0 : paceTotal / paceValues.length;
  var maxDeviation = 0;
  for (var j = 0; j < profiles.length; j++) {
    if (profiles[j].role == "goalie") continue;
    var deviation = profiles[j].paceValue - paceMean;
    maxDeviation = Math.max(maxDeviation, Math.abs(deviation));
  }

  for (var k = 0; k < profiles.length; k++) {
    if (profiles[k].role == "goalie" || maxDeviation == 0) continue;
    profiles[k].paceMultiplier = 1 +
      (profiles[k].paceValue - paceMean) / maxDeviation *
      this.config.ai.formationPaceVariation;
  }

  return profiles;
};

TeamAi.prototype.profileValue = function(playerIndex, salt) {
  var sideSeed = this.team.side == "away" ? 0x9e3779b9 : 0x85ebca6b;
  var value = sideSeed ^ Math.imul(playerIndex + 1, 0x27d4eb2d) ^
    Math.imul(salt + 1, 0x165667b1);
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d);
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39);
  value = (value ^ (value >>> 15)) >>> 0;
  return value / 2147483647.5 - 1;
};

TeamAi.prototype.profileRange = function(playerIndex, salt, min, max) {
  var unit = (this.profileValue(playerIndex, salt) + 1) / 2;
  return min + (max - min) * unit;
};

TeamAi.prototype.exactTargets = function(targets) {
  for (var i = 0; i < this.movementProfiles.length; i++) {
    this.movementProfiles[i].smoothedTarget = null;
  }
  return targets;
};

TeamAi.prototype.openPlayTargets = function(baseTargets, deltaSeconds) {
  var desiredTargets = [];
  var attackDir = this.team.side == "home" ? -1 : 1;

  for (var i = 0; i < baseTargets.length; i++) {
    var profile = this.movementProfiles[i];
    if (profile.role == "goalie") {
      desiredTargets.push(baseTargets[i]);
      continue;
    }

    var ballShift = this.ballShiftForRole(profile.role);
    var wander = this.updateWander(profile, i, deltaSeconds);
    desiredTargets.push(this.formation.clampToField(new Vector2d(
      baseTargets[i].x + profile.lateralBias + wander.x +
        ballShift.x * profile.ballResponseMultiplier,
      baseTargets[i].y + (profile.depthBias + wander.y) * attackDir +
        ballShift.y * profile.ballResponseMultiplier
    )));
  }

  desiredTargets = this.separateFormationTargets(desiredTargets);
  var dt = deltaSeconds > 0 ? Math.min(deltaSeconds, 0.1) : 1 / 60;
  var result = [];
  for (var j = 0; j < desiredTargets.length; j++) {
    var movementProfile = this.movementProfiles[j];
    if (movementProfile.role == "goalie") {
      movementProfile.smoothedTarget = null;
      result.push(baseTargets[j]);
      continue;
    }

    if (movementProfile.smoothedTarget == null) {
      movementProfile.smoothedTarget = new Vector2d(
        this.team.players[j].position.x,
        this.team.players[j].position.y
      );
    }
    var alpha = 1 - Math.exp(-movementProfile.responseRate * dt);
    movementProfile.smoothedTarget = this.formation.clampToField(new Vector2d(
      movementProfile.smoothedTarget.x +
        (desiredTargets[j].x - movementProfile.smoothedTarget.x) * alpha,
      movementProfile.smoothedTarget.y +
        (desiredTargets[j].y - movementProfile.smoothedTarget.y) * alpha
    ));
    result.push(movementProfile.smoothedTarget);
  }
  return result;
};

TeamAi.prototype.updateWander = function(profile, playerIndex, deltaSeconds) {
  var dt = deltaSeconds > 0 ? Math.min(deltaSeconds, 0.1) : 1 / 60;
  if (profile.wanderDuration <= 0) {
    profile.wanderFrom = this.wanderOffset(playerIndex, 0);
    profile.wanderTo = this.wanderOffset(playerIndex, 1);
    profile.wanderDuration = this.wanderDuration(playerIndex, 0);
    profile.wanderElapsed = this.profileRange(playerIndex, 20, 0, 0.65) *
      profile.wanderDuration;
  }

  profile.wanderElapsed += dt;
  while (profile.wanderElapsed >= profile.wanderDuration) {
    profile.wanderElapsed -= profile.wanderDuration;
    profile.wanderStep++;
    profile.wanderFrom = profile.wanderTo;
    profile.wanderTo = this.wanderOffset(playerIndex, profile.wanderStep + 1);
    profile.wanderDuration = this.wanderDuration(playerIndex, profile.wanderStep);
  }

  var progress = profile.wanderElapsed / profile.wanderDuration;
  var smoothProgress = progress * progress * (3 - 2 * progress);
  return new Vector2d(
    profile.wanderFrom.x + (profile.wanderTo.x - profile.wanderFrom.x) * smoothProgress,
    profile.wanderFrom.y + (profile.wanderTo.y - profile.wanderFrom.y) * smoothProgress
  );
};

TeamAi.prototype.wanderOffset = function(playerIndex, step) {
  return new Vector2d(
    this.profileValue(playerIndex, 30 + step * 2) *
      this.config.ai.formationWanderLateral,
    this.profileValue(playerIndex, 31 + step * 2) *
      this.config.ai.formationWanderDepth
  );
};

TeamAi.prototype.wanderDuration = function(playerIndex, step) {
  return this.profileRange(
    playerIndex,
    100 + step,
    this.config.ai.formationWanderIntervalMin,
    this.config.ai.formationWanderIntervalMax
  );
};

TeamAi.prototype.ballShiftForRole = function(role) {
  var influence = role == "defender" ? this.config.ai.formationDefenderBallInfluence :
    (role == "midfielder" ? this.config.ai.formationMidfielderBallInfluence :
      this.config.ai.formationStrikerBallInfluence);
  var maxShift = role == "defender" ? this.config.ai.formationDefenderMaxShift :
    (role == "midfielder" ? this.config.ai.formationMidfielderMaxShift :
      this.config.ai.formationStrikerMaxShift);
  var center = this.config.pitch.initialBallPosition;
  if (influence <= 0 || maxShift <= 0) {
    return new Vector2d(0, 0);
  }
  return new Vector2d(
    this.clamp(this.ball.position.x - center.x, -maxShift / influence, maxShift / influence) * influence,
    this.clamp(this.ball.position.y - center.y, -maxShift / influence, maxShift / influence) * influence
  );
};

TeamAi.prototype.separateFormationTargets = function(targets) {
  var spacing = this.config.ai.minTeammateSpacing || 0;
  var maxShift = this.config.ai.formationSeparationMaxShift || 0;
  if (spacing <= 0 || maxShift <= 0) return targets;

  var result = [];
  for (var i = 0; i < targets.length; i++) {
    if (this.movementProfiles[i].role == "goalie") {
      result.push(targets[i]);
      continue;
    }

    var shiftX = 0;
    var shiftY = 0;
    var player = this.team.players[i];
    for (var j = 0; j < this.team.players.length; j++) {
      if (i == j) continue;
      var other = this.team.players[j];
      var dx = player.position.x - other.position.x;
      var dy = player.position.y - other.position.y;
      var distance = MathLib.vectorLength(dx, dy);
      if (distance >= spacing) continue;
      if (distance < 0.0001) {
        dx = i < j ? -1 : 1;
        dy = 0;
        distance = 1;
      }
      var strength = (spacing - distance) / spacing * maxShift;
      shiftX += dx / distance * strength;
      shiftY += dy / distance * strength;
    }

    var shiftLength = MathLib.vectorLength(shiftX, shiftY);
    if (shiftLength > maxShift) {
      shiftX = shiftX / shiftLength * maxShift;
      shiftY = shiftY / shiftLength * maxShift;
    }
    result.push(this.formation.clampToField(new Vector2d(
      targets[i].x + shiftX,
      targets[i].y + shiftY
    )));
  }
  return result;
};

TeamAi.prototype.clamp = function(value, min, max) {
  return Math.max(min, Math.min(max, value));
};

TeamAi.prototype.shouldChaseCorner = function(playerIndex) {
  var groups = this.formation.cornerAssignments(
    this.team.players.length,
    this.cornerTakerIndex
  );
  if (groups[playerIndex] == "box") return true;
  return groups[playerIndex] == "late" &&
    this.cornerBallProgress() >= this.config.restarts.cornerLateRunReleaseDistance;
};

TeamAi.prototype.cornerBallProgress = function() {
  return this.team.side == "home" ?
    this.ball.position.y - this.config.pitch.fieldTop :
    this.config.pitch.fieldBottom - this.ball.position.y;
};

TeamAi.prototype.setRestartState = function(state) {
  if (typeof state != "string" || state.length == 0) {
    return false;
  }
  this.state = state;
  this.ballAttacker = null;
  return true;
};

TeamAi.prototype.nextState = function(restartActive) {
  if (restartActive) {
    return this.state;
  }

  if (this.state == "cornerUs" && !this.cornerAttackResolved()) {
    return this.state;
  }

  if (this.isBallInOwnHalf()) {
    return "defense";
  }

  if (this.isBallInOpponentHalf()) {
    return "attack";
  }

  if (this.state == "defense" || this.state == "attack") {
    return this.state;
  }
  return "attack";
};

TeamAi.prototype.cornerAttackResolved = function() {
  if (this.ball.lastTouchedBy != null && this.ball.lastTouchedBy != this.team.side) {
    return true;
  }

  if (this.team.side == "home") {
    return this.ball.position.y >= this.config.pitch.fieldTop + this.config.restarts.cornerCrossDistance;
  }
  return this.ball.position.y <= this.config.pitch.fieldBottom - this.config.restarts.cornerCrossDistance;
};

TeamAi.prototype.isBallInOwnHalf = function() {
  var y = this.ball.position.y;
  if (this.team.side == "home") {
    return y > this.config.pitch.aiCenterY;
  }
  return y < this.config.pitch.aiCenterY;
};

TeamAi.prototype.isBallInOpponentHalf = function() {
  var y = this.ball.position.y;
  if (this.team.side == "home") {
    return y < this.config.pitch.aiCenterY;
  }
  return y > this.config.pitch.aiCenterY;
};

TeamAi.prototype.closestPlayerToBall = function() {
  var closest = null;
  var closestDistance = Infinity;
  for (var i = 0; i < this.team.players.length; i++) {
    var player = this.team.players[i];
    var distance = MathLib.computeDistance(player.position, this.ball.position);
    if (distance < closestDistance) {
      closest = player;
      closestDistance = distance;
    }
  }
  return closest;
};

TeamAi.prototype.selectedBallAttacker = function() {
  var closest = this.closestPlayerToBall();
  if (this.ballAttacker != null && closest !== this.ballAttacker) {
    var currentDistance = MathLib.computeDistance(this.ballAttacker.position, this.ball.position);
    var closestDistance = MathLib.computeDistance(closest.position, this.ball.position);
    var hysteresis = this.config.ai.attackerSwitchHysteresisDistance || 0;
    if (currentDistance <= closestDistance + hysteresis) {
      return this.ballAttacker;
    }
  }
  this.ballAttacker = closest;
  return closest;
};

TeamAi.prototype.draw = function(ctx) {
  for (var i = 0; i < this._individualAis.length; i++) {
    this._individualAis[i].draw(ctx);
  }
};

TeamAi.prototype.debugSnapshot = function() {
  var result = [];
  for (var i = 0; i < this._individualAis.length; i++) {
    var snapshot = this._individualAis[i].debugSnapshot();
    snapshot.teamState = this.state;
    result.push(snapshot);
  }
  return result;
};
