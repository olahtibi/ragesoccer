var ThrowInRestart = function(config) {
  this.config = config;
  this.launched = false;
};

ThrowInRestart.prototype.ballPosition = function(request) {
  var clearance = this.config.ballRadius + this.config.restartPlacementClearance;
  var x = request.boundary == "left" ? this.config.fieldLeft + clearance :
    this.config.fieldRight - clearance;
  var minY = this.config.fieldTop + clearance;
  var maxY = this.config.fieldBottom - clearance;
  return new Vector3d(x, Math.max(minY, Math.min(maxY, request.position.y)), 0);
};

ThrowInRestart.prototype.createScene = function(context, request) {
  this.launched = false;
  var ballPosition = this.ballPosition(request);
  var offset = this.config.playerRadius + this.config.ballRadius + 2;
  var takerX = request.boundary == "left" ? this.config.fieldLeft - offset :
    this.config.fieldRight + offset;
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(takerX, ballPosition.y)
  );
};

ThrowInRestart.prototype.teamAiState = function(team, request) {
  return RestartPositioning.stateFor("throwIn", team, request);
};

ThrowInRestart.prototype.canTeamMove = function(team, request) {
  return team.side == request.awardedTo;
};

ThrowInRestart.prototype.resume = function(context, request, direction) {
  var inwardX = request.boundary == "left" ? 1 : -1;
  var attackY = request.awardedTo == "home" ? -1 : 1;
  var dx;
  var dy;
  if (request.awardedTo == "away" || direction == null) {
    dx = inwardX;
    dy = attackY;
  } else {
    dx = direction.x || 0;
    dy = direction.y || 0;
    if (dx * inwardX < 0.35) dx = inwardX * 0.35;
  }
  var normalized = MathLib.normalizeVector(dx, dy, inwardX, attackY);
  context.ball.velocity.x = normalized.x * this.config.throwInSpeed;
  context.ball.velocity.y = normalized.y * this.config.throwInSpeed;
  context.ball.velocity.z = this.config.throwInLoft;
  context.ball.lastTouchedBy = request.awardedTo;
  this.launched = true;
  return true;
};

ThrowInRestart.prototype.enforceRules = function() {};

ThrowInRestart.prototype.isComplete = function(context) {
  if (!this.launched) return false;
  var velocity = context.ball.velocity;
  var minSpeed = this.config.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
