var CornerRestart = function(config) {
  this.config = config;
  this.allowEarlyResume = true;
};

// Public API (underscore-prefixed members are private helpers)

CornerRestart.prototype._ballPosition = function(request) {
  var clearance = this.config.ball.radius + this.config.restarts.placementClearance;
  var left = request.position.x <= this.config.pitch.initialBallPosition.x;
  return new Vector3d(
    left ? this.config.pitch.fieldLeft + clearance : this.config.pitch.fieldRight - clearance,
    request.boundary == "top" ? this.config.pitch.fieldTop + clearance :
      this.config.pitch.fieldBottom - clearance,
    0
  );
};

CornerRestart.prototype.createScene = function(context, request) {
  var ballPosition = this._ballPosition(request);
  var offset = this.config.player.radius + this.config.ball.radius +
    this.config.restarts.takerClearance;
  var goalX = (this.config.pitch.goalTopTopLeft.x + this.config.pitch.goalTopTopRight.x) / 2;
  var goalY = request.awardedTo == "home" ? this.config.pitch.fieldTop : this.config.pitch.fieldBottom;
  var toGoal = MathLib.normalizeVector(goalX - ballPosition.x, goalY - ballPosition.y, 0,
    request.awardedTo == "home" ? -1 : 1);
  var takerIndex = this._takerIndex(context, request, ballPosition);
  var cornerPlan = new Formation(this.config).cornerAttackingPlan(
    request.awardedTo,
    this._awardedTeamSize(context, request),
    takerIndex,
    ballPosition.x <= this.config.pitch.initialBallPosition.x
  );
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(ballPosition.x - toGoal.x * offset, ballPosition.y - toGoal.y * offset),
    takerIndex,
    "cornerUs",
    cornerPlan.positions
  );
};

CornerRestart.prototype._awardedTeamSize = function(context, request) {
  for (var i = 0; i < context.teams.length; i++) {
    if (context.teams[i].side == request.awardedTo) return context.teams[i].players.length;
  }
  return 1;
};

CornerRestart.prototype._takerIndex = function(context, request, ballPosition) {
  var team = null;
  for (var i = 0; i < context.teams.length; i++) {
    if (context.teams[i].side == request.awardedTo) {
      team = context.teams[i];
      break;
    }
  }
  if (team == null) return 0;

  var formation = new Formation(this.config);
  var roles = formation.rolesForSize(team.players.length);
  var coverIndexes = formation.cornerCoverIndexes(team.players.length);
  var closestIndex = -1;
  var closestDistance = Infinity;

  for (var j = 0; j < team.players.length; j++) {
    if (roles[j] == "goalie" || coverIndexes.indexOf(j) >= 0) continue;
    var distance = MathLib.computeDistance(team.players[j].position, ballPosition);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = j;
    }
  }

  return closestIndex < 0 ? RestartPositioning.closestPlayerIndex(team.players, ballPosition) : closestIndex;
};

CornerRestart.prototype.teamAiState = function(team, request) {
  return RestartPositioning.stateFor("corner", team, request);
};

CornerRestart.prototype.canTeamMove = function(team, request) {
  return team.side == request.awardedTo;
};

CornerRestart.prototype.attackTarget = function(team, request) {
  if (team.side != request.awardedTo) return null;
  return new Vector2d(
    this.config.pitch.initialBallPosition.x,
    request.awardedTo == "home" ? this.config.pitch.fieldTop + this.config.restarts.cornerCrossDistance :
      this.config.pitch.fieldBottom - this.config.restarts.cornerCrossDistance
  );
};

CornerRestart.prototype.enforceRules = function() {};

CornerRestart.prototype.isComplete = function(context) {
  var velocity = context.ball.velocity;
  var minSpeed = this.config.physics.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
