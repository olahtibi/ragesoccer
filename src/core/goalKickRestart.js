var GoalKickRestart = function(config) {
  this.config = config;
};

GoalKickRestart.prototype.ballPosition = function(request) {
  return new Vector3d(
    this.config.initialBallPosition.x,
    request.boundary == "top" ? this.config.fieldTop + this.config.goalKickDistance :
      this.config.fieldBottom - this.config.goalKickDistance,
    0
  );
};

GoalKickRestart.prototype.createScene = function(context, request) {
  var ballPosition = this.ballPosition(request);
  var offset = this.config.playerRadius + this.config.ballRadius + 2;
  var takerY = request.boundary == "top" ? ballPosition.y - offset : ballPosition.y + offset;
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(ballPosition.x, takerY)
  );
};

GoalKickRestart.prototype.teamAiState = function(team, request) {
  return RestartPositioning.stateFor("goalKick", team, request);
};

GoalKickRestart.prototype.canTeamMove = function(team, request) {
  return team.side == request.awardedTo;
};

GoalKickRestart.prototype.enforceRules = function() {};

GoalKickRestart.prototype.isComplete = function(context) {
  var velocity = context.ball.velocity;
  var minSpeed = this.config.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
