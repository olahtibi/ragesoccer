var CornerRestart = function(config) {
  this.config = config;
};

CornerRestart.prototype.ballPosition = function(request) {
  var clearance = this.config.ballRadius + this.config.restartPlacementClearance;
  var left = request.position.x <= this.config.initialBallPosition.x;
  return new Vector3d(
    left ? this.config.fieldLeft + clearance : this.config.fieldRight - clearance,
    request.boundary == "top" ? this.config.fieldTop + clearance :
      this.config.fieldBottom - clearance,
    0
  );
};

CornerRestart.prototype.createScene = function(context, request) {
  var ballPosition = this.ballPosition(request);
  var offset = this.config.playerRadius + this.config.ballRadius + 2;
  var goalX = (this.config.goalTopTopLeft.x + this.config.goalTopTopRight.x) / 2;
  var goalY = request.awardedTo == "home" ? this.config.fieldTop : this.config.fieldBottom;
  var toGoal = MathLib.normalizeVector(goalX - ballPosition.x, goalY - ballPosition.y, 0,
    request.awardedTo == "home" ? -1 : 1);
  var takerIndex = this.takerIndex(context, request, ballPosition);
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(ballPosition.x - toGoal.x * offset, ballPosition.y - toGoal.y * offset),
    takerIndex,
    "cornerUs"
  );
};

CornerRestart.prototype.takerIndex = function(context, request, ballPosition) {
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
  var coverIndex = formation.cornerCoverIndex(team.players.length);
  var closestIndex = -1;
  var closestDistance = Infinity;

  for (var j = 0; j < team.players.length; j++) {
    if (roles[j] == "goalie" || j == coverIndex) continue;
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
    this.config.initialBallPosition.x,
    request.awardedTo == "home" ? this.config.fieldTop + this.config.cornerCrossDistance :
      this.config.fieldBottom - this.config.cornerCrossDistance
  );
};

CornerRestart.prototype.enforceRules = function() {};

CornerRestart.prototype.isComplete = function(context) {
  var velocity = context.ball.velocity;
  var minSpeed = this.config.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
