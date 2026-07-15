var CutsceneController = function(config) {
  this.config = config;
  this.active = false;
  this.ballPosition = null;
  this.teams = [];
  this.onComplete = null;
};

CutsceneController.prototype.isActive = function() {
  return this.active == true;
};

CutsceneController.prototype.play = function(options) {
  if (!this.validRestartOptions(options)) {
    return false;
  }

  this.active = true;
  this.ballPosition = new Vector3d(options.ballPosition.x, options.ballPosition.y, options.ballPosition.z || 0);
  this.teams = options.teams;
  this.onComplete = typeof options.onComplete == "function" ? options.onComplete : null;
  this.stopPlayers();
  return true;
};

CutsceneController.prototype.validRestartOptions = function(options) {
  if (options == null || options.ballPosition == null || options.teams == null) {
    return false;
  }
  if (options.teams.length == null) {
    return false;
  }
  for (var i = 0; i < options.teams.length; i++) {
    var team = options.teams[i];
    if (team == null || team.players == null || team.positions == null || team.side == null) {
      return false;
    }
    if (team.players.length !== team.positions.length) {
      return false;
    }
  }
  return true;
};

CutsceneController.prototype.updateBeforePhysics = function(game) {
  if (!this.active) {
    return;
  }

  this.lockBall(game.stadium.ball);
  if (game.camera != null && game.camera.setFocusTarget != null) {
    game.camera.setFocusTarget(this.ballPosition);
  }
  this.updatePlayers(game);
};

CutsceneController.prototype.updateAfterPhysics = function(game) {
  if (!this.active) {
    return;
  }

  this.lockBall(game.stadium.ball);
  var allPlayersArrived = this.updatePlayers(game);
  var cameraArrived = game.camera == null || game.camera.hasArrivedAtFocus == null || game.camera.hasArrivedAtFocus();
  if (allPlayersArrived && cameraArrived) {
    this.clear(game);
  }
};

CutsceneController.prototype.update = function(game) {
  this.updateBeforePhysics(game);
  this.updateAfterPhysics(game);
};

CutsceneController.prototype.updatePlayers = function(game) {
  var allArrived = true;
  for (var t = 0; t < this.teams.length; t++) {
    var team = this.teams[t];
    for (var i = 0; i < team.players.length; i++) {
      if (!this.movePlayerToTarget(game, team.players[i], team.positions[i], team.side)) {
        allArrived = false;
      }
    }
  }
  return allArrived;
};

CutsceneController.prototype.stopPlayers = function() {
  for (var t = 0; t < this.teams.length; t++) {
    var team = this.teams[t];
    for (var i = 0; i < team.players.length; i++) {
      team.players[i].velocity.x = 0;
      team.players[i].velocity.y = 0;
    }
  }
};

CutsceneController.prototype.movePlayerToTarget = function(game, player, target, side) {
  var distance = MathLib.computeDistance(player.position, target);
  var dx = target.x - player.position.x;
  var dy = target.y - player.position.y;
  var movingAway = player.velocity.x * dx + player.velocity.y * dy <= 0 &&
    (player.velocity.x != 0 || player.velocity.y != 0);
  if (distance <= this.config.cutsceneArrivedRadius || movingAway) {
    player.position.x = target.x;
    player.position.y = target.y;
    player.velocity.x = 0;
    player.velocity.y = 0;
    player.stepDistance = 0;
    return true;
  }

  player.velocity = MathLib.computeVelocityForTarget(player.position, target, game.config.teamVelocity(side));
  return false;
};

CutsceneController.prototype.lockBall = function(ball) {
  ball.position.x = this.ballPosition.x;
  ball.position.y = this.ballPosition.y;
  ball.position.z = this.ballPosition.z || 0;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.velocity.z = 0;
  ball.rollDistance = 0;
};

CutsceneController.prototype.clear = function(game) {
  var onComplete = this.onComplete;
  this.active = false;
  this.ballPosition = null;
  this.teams = [];
  this.onComplete = null;
  if (game != null && game.camera != null && game.camera.clearFocusTarget != null) {
    game.camera.clearFocusTarget();
  }
  if (onComplete != null) {
    onComplete(game);
  }
};
