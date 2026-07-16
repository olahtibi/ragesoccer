var GoalKickRestart = function(config) {
  this.config = config;
  this.allowEarlyResume = true;
};

// Public API (underscore-prefixed members are private helpers)

GoalKickRestart.prototype._ballPosition = function(request) {
  return new Vector3d(
    this.config.pitch.initialBallPosition.x,
    request.boundary == "top" ? this.config.pitch.fieldTop + this.config.restarts.goalKickDistance :
      this.config.pitch.fieldBottom - this.config.restarts.goalKickDistance,
    0
  );
};

GoalKickRestart.prototype.createScene = function(context, request) {
  var ballPosition = this._ballPosition(request);
  var offset = this.config.restarts.goalKickTakerDistance;
  var takerY = request.boundary == "top" ? ballPosition.y - offset : ballPosition.y + offset;
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(ballPosition.x, takerY),
    this._goalkeeperIndex(context, request)
  );
};

GoalKickRestart.prototype._goalkeeperIndex = function(context, request) {
  for (var i = 0; i < context.teams.length; i++) {
    var team = context.teams[i];
    if (team.side != request.awardedTo) continue;
    var roles = new Formation(this.config).rolesForSize(team.players.length);
    for (var j = 0; j < roles.length; j++) {
      if (roles[j] == "goalie") return j;
    }
  }
  return 0;
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
  var minSpeed = this.config.physics.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
