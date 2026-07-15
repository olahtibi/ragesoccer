var TeamAi = function(config, team, opponentTeam, ball) {
  this.config = config;
  this.team = team;
  this.opponentTeam = opponentTeam;
  this.ball = ball;
  this.formation = new Formation(config);
  this.state = config.kickoffSide == team.side ? "kickoffUs" : "kickoffOpponent";
  this.ballAttacker = null;
  this._individualAis = [];

  for (var i = 0; i < team.players.length; i++) {
    this._individualAis.push(new IndividualAi(config, team, team.players[i]));
  }
};

TeamAi.prototype.update = function(context) {
  if (!this.config.teamAiEnabled) {
    return;
  }

  context = context || {};
  var restartActive = context.restartActive == true;
  this.state = this.nextState(restartActive);
  var targets = this.formation.positions(this.state, this.team.side, this.team.players.length);
  var chasingCornerCross = this.state == "cornerUs" && !restartActive;
  var closest = chasingCornerCross ?
    (this.team.side == "home" ? this.team.humanPlayer : null) :
    (this.team.side == "home" ? this.team.humanPlayer : this.selectedBallAttacker());
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
    } else if (chasingCornerCross && this.isCornerReceiver(i)) {
      ai.setCommand("attackBall", null);
    } else if (this.team.side != "home" && ai.player === closest) {
      ai.setCommand("attackBall", null);
    } else {
      ai.setCommand("moveToPosition", targets[i]);
    }
    ai.update(commandContext);
  }
};

TeamAi.prototype.isCornerReceiver = function(playerIndex) {
  var roles = this.formation.rolesForSize(this.team.players.length);
  return roles[playerIndex] != "goalie" &&
    playerIndex != this.formation.cornerCoverIndex(this.team.players.length);
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
    return this.ball.position.y >= this.config.fieldTop + this.config.cornerCrossDistance;
  }
  return this.ball.position.y <= this.config.fieldBottom - this.config.cornerCrossDistance;
};

TeamAi.prototype.isBallInOwnHalf = function() {
  var y = this.ball.position.y;
  if (this.team.side == "home") {
    return y > this.config.aiCenterY;
  }
  return y < this.config.aiCenterY;
};

TeamAi.prototype.isBallInOpponentHalf = function() {
  var y = this.ball.position.y;
  if (this.team.side == "home") {
    return y < this.config.aiCenterY;
  }
  return y > this.config.aiCenterY;
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
    var hysteresis = this.config.aiAttackerSwitchHysteresisDistance || 0;
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
