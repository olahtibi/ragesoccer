var ThrowInRestart = function(config) {
  this.config = config;
  this.allowEarlyResume = true;
  this.launched = false;
  this.taker = null;
};

// Public API (underscore-prefixed members are private helpers)

ThrowInRestart.prototype._ballPosition = function(request) {
  var clearance = this.config.ball.radius + this.config.restarts.placementClearance;
  var x = request.boundary == "left" ? this.config.pitch.fieldLeft + clearance :
    this.config.pitch.fieldRight - clearance;
  var minY = this.config.pitch.fieldTop + clearance;
  var maxY = this.config.pitch.fieldBottom - clearance;
  return new Vector3d(x, Math.max(minY, Math.min(maxY, request.position.y)), 0);
};

ThrowInRestart.prototype.createScene = function(context, request) {
  this.launched = false;
  var ballPosition = this._ballPosition(request);
  var offset = this.config.player.radius + this.config.ball.radius +
    this.config.restarts.takerClearance;
  var takerX = request.boundary == "left" ? this.config.pitch.fieldLeft - offset :
    this.config.pitch.fieldRight + offset;
  this.taker = this._findTaker(context, request, ballPosition);
  context.ball.heldBy = this.taker;
  return RestartPositioning.createScene(
    this.config,
    context,
    request,
    ballPosition,
    new Vector2d(takerX, ballPosition.y)
  );
};

ThrowInRestart.prototype._findTaker = function(context, request, ballPosition) {
  for (var i = 0; i < context.teams.length; i++) {
    if (context.teams[i].side == request.awardedTo) {
      var team = context.teams[i];
      return team.players[RestartPositioning.closestPlayerIndex(team.players, ballPosition)];
    }
  }
  return null;
};

ThrowInRestart.prototype.onPositioned = function(context, request) {
  if (this.taker == null) return;
  this.taker.facingX = request.boundary == "left" ? 1 : -1;
  this.taker.facingY = 0;
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
  var heldPosition = context.ball.heldPosition();
  context.ball.position.x = heldPosition.x;
  context.ball.position.y = heldPosition.y;
  context.ball.position.z = 0;
  context.ball.heldBy = null;
  context.ball.velocity.x = normalized.x * this.config.restarts.throwInSpeed;
  context.ball.velocity.y = normalized.y * this.config.restarts.throwInSpeed;
  context.ball.velocity.z = this.config.restarts.throwInLoft;
  context.ball.lastTouchedBy = request.awardedTo;
  this.launched = true;
  return true;
};

ThrowInRestart.prototype.enforceRules = function() {};

ThrowInRestart.prototype.isComplete = function(context) {
  if (!this.launched) return false;
  var velocity = context.ball.velocity;
  var minSpeed = this.config.physics.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
