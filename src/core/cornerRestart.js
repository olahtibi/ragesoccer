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
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(ballPosition.x - toGoal.x * offset, ballPosition.y - toGoal.y * offset)
  );
};

CornerRestart.prototype.teamAiState = function(team, request) {
  return RestartPositioning.stateFor("corner", team, request);
};

CornerRestart.prototype.canTeamMove = function(team, request) {
  return team.side == request.awardedTo;
};

CornerRestart.prototype.enforceRules = function() {};

CornerRestart.prototype.isComplete = function(context) {
  var velocity = context.ball.velocity;
  var minSpeed = this.config.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
