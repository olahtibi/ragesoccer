var CutsceneController = function(config) {
  this._config = config;
  this._active = false;
  this._ballPosition = null;
  this._sceneTeams = [];
  this._readyPlayer = null;
  this._onComplete = null;
};

// Public API

CutsceneController.prototype.isActive = function() {
  return this._active == true;
};

CutsceneController.prototype.play = function(options) {
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

CutsceneController.prototype.isReadyForInput = function() {
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

CutsceneController.prototype.updateBeforePhysics = function(game) {
  if (!this._active) return;
  this._lockBall(game.stadium.ball);
  if (game.camera != null && game.camera.setFocusTarget != null) {
    game.camera.setFocusTarget(this._ballPosition);
  }
  this._updatePlayers(game);
};

CutsceneController.prototype.updateAfterPhysics = function(game) {
  if (!this._active) return;
  this._lockBall(game.stadium.ball);
  var allPlayersArrived = this._updatePlayers(game);
  var cameraArrived = game.camera == null || game.camera.hasArrivedAtFocus == null ||
    game.camera.hasArrivedAtFocus();
  if (allPlayersArrived && cameraArrived) this._clear(game);
};

CutsceneController.prototype.update = function(game) {
  this.updateBeforePhysics(game);
  this.updateAfterPhysics(game);
};

CutsceneController.prototype.cancel = function(game) {
  this._onComplete = null;
  this._clear(game);
};

// Private helpers

CutsceneController.prototype._validRestartOptions = function(options) {
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

CutsceneController.prototype._updatePlayers = function(game) {
  var allArrived = true;
  for (var t = 0; t < this._sceneTeams.length; t++) {
    var sceneTeam = this._sceneTeams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      if (!this._movePlayerToTarget(
        game,
        sceneTeam.players[i],
        sceneTeam.positions[i],
        sceneTeam.side
      )) allArrived = false;
    }
  }
  return allArrived;
};

CutsceneController.prototype._stopPlayers = function() {
  for (var t = 0; t < this._sceneTeams.length; t++) {
    var sceneTeam = this._sceneTeams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      sceneTeam.players[i].velocity.x = 0;
      sceneTeam.players[i].velocity.y = 0;
    }
  }
};

CutsceneController.prototype._movePlayerToTarget = function(game, player, target, side) {
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
    game.config.teamVelocity(side)
  );
  return false;
};

CutsceneController.prototype._lockBall = function(ball) {
  ball.position.x = this._ballPosition.x;
  ball.position.y = this._ballPosition.y;
  ball.position.z = this._ballPosition.z || 0;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.velocity.z = 0;
};

CutsceneController.prototype._clear = function(game) {
  var onComplete = this._onComplete;
  this._active = false;
  this._ballPosition = null;
  this._sceneTeams = [];
  this._readyPlayer = null;
  this._onComplete = null;
  if (game != null && game.camera != null && game.camera.clearFocusTarget != null) {
    game.camera.clearFocusTarget();
  }
  if (onComplete != null) onComplete(game);
};
