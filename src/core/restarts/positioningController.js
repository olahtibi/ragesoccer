var PositioningController = function(config) {
  this._config = config;
  this._active = false;
  this._ballPosition = null;
  this._sceneTeams = [];
  this._readyPlayer = null;
  this._onComplete = null;
};

// Public API

PositioningController.prototype.isActive = function() {
  return this._active == true;
};

PositioningController.prototype.play = function(options) {
  if (!this._validRestartOptions(options)) return false;

  this._active = true;
  this._ballPosition = new Vector3d(
    options.ballPosition.x,
    options.ballPosition.y,
    options.ballPosition.z || 0
  );
  this._sceneTeams = options.sceneTeams;
  this._readyPlayer = options.readyPlayer || null;
  this._onComplete = typeof options.onComplete == "function" ? options.onComplete : null;
  this._stopPlayers();
  return true;
};

PositioningController.prototype.isReadyForInput = function() {
  if (!this._active || this._readyPlayer == null) return false;
  for (var t = 0; t < this._sceneTeams.length; t++) {
    var sceneTeam = this._sceneTeams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      if (sceneTeam.players[i] === this._readyPlayer) {
        return MathLib.computeDistance(this._readyPlayer.position, sceneTeam.positions[i]) <=
          this._config.cutscene.arrivedRadius;
      }
    }
  }
  return false;
};

PositioningController.prototype.updateBeforePhysics = function(context) {
  if (!this._active) return;
  this._lockBall(context.ball);
  if (context.camera != null && context.camera.setFocusTarget != null) {
    context.camera.setFocusTarget(this._ballPosition);
  }
  this._updatePlayers(context);
};

PositioningController.prototype.updateAfterPhysics = function(context) {
  if (!this._active) return;
  this._lockBall(context.ball);
  var allPlayersArrived = this._updatePlayers(context);
  var cameraArrived = context.camera == null || context.camera.hasArrivedAtFocus == null ||
    context.camera.hasArrivedAtFocus();
  if (allPlayersArrived && cameraArrived) this._clear(context);
};

PositioningController.prototype.update = function(context) {
  this.updateBeforePhysics(context);
  this.updateAfterPhysics(context);
};

PositioningController.prototype.cancel = function(context) {
  this._onComplete = null;
  this._clear(context);
};

// Private helpers

PositioningController.prototype._validRestartOptions = function(options) {
  if (options == null || options.ballPosition == null || options.sceneTeams == null) return false;
  if (options.sceneTeams.length == null) return false;
  for (var i = 0; i < options.sceneTeams.length; i++) {
    var sceneTeam = options.sceneTeams[i];
    if (sceneTeam == null || sceneTeam.players == null || sceneTeam.positions == null ||
        sceneTeam.side == null) return false;
    if (sceneTeam.players.length !== sceneTeam.positions.length) return false;
  }
  return true;
};

PositioningController.prototype._updatePlayers = function(context) {
  var allArrived = true;
  for (var t = 0; t < this._sceneTeams.length; t++) {
    var sceneTeam = this._sceneTeams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      if (!this._movePlayerToTarget(
        context,
        sceneTeam.players[i],
        sceneTeam.positions[i],
        sceneTeam.side
      )) allArrived = false;
    }
  }
  return allArrived;
};

PositioningController.prototype._stopPlayers = function() {
  for (var t = 0; t < this._sceneTeams.length; t++) {
    var sceneTeam = this._sceneTeams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      sceneTeam.players[i].velocity.x = 0;
      sceneTeam.players[i].velocity.y = 0;
    }
  }
};

PositioningController.prototype._movePlayerToTarget = function(context, player, target, side) {
  var distance = MathLib.computeDistance(player.position, target);
  var dx = target.x - player.position.x;
  var dy = target.y - player.position.y;
  var movingAway = player.velocity.x * dx + player.velocity.y * dy <= 0 &&
    (player.velocity.x != 0 || player.velocity.y != 0);
  if (distance <= this._config.cutscene.arrivedRadius || movingAway) {
    player.position.x = target.x;
    player.position.y = target.y;
    player.velocity.x = 0;
    player.velocity.y = 0;
    return true;
  }
  player.velocity = MathLib.computeVelocityForTarget(
    player.position,
    target,
    context.config.teamVelocity(side)
  );
  return false;
};

PositioningController.prototype._lockBall = function(ball) {
  ball.position.x = this._ballPosition.x;
  ball.position.y = this._ballPosition.y;
  ball.position.z = this._ballPosition.z || 0;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.velocity.z = 0;
};

PositioningController.prototype._clear = function(context) {
  var onComplete = this._onComplete;
  this._active = false;
  this._ballPosition = null;
  this._sceneTeams = [];
  this._readyPlayer = null;
  this._onComplete = null;
  if (context != null && context.camera != null && context.camera.clearFocusTarget != null) {
    context.camera.clearFocusTarget();
  }
  if (onComplete != null) onComplete(context);
};
