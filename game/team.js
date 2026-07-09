var Team = function(config, side, level) {
  this.config = config;
  this.side = side;
  this.level = level || 1;
  this.players = this.createPlayers();
  this.humanPlayer = side == "home" ? this.players[0] : null;
  this.opponentTeam = null;
  this.stadium = null;
  this.aiControllers = [];
};

Team.prototype.createPlayers = function() {
  var positions = this.config.initialPlayerPositions(this.side);
  var players = [];
  var img = this.side == "home" ? this.config.imgPlayerHome : this.config.imgPlayerAway;

  for (var i = 0; i < positions.length; i++) {
    var player = new Player(img, positions[i], this.config.playerSpriteWidth, this.config.playerSpriteHeight, this.config.playerSpriteCenterX, this.config.playerSpriteCenterY);
    if (this.side == "away") {
      player.facingY = 1;
    }
    players.push(player);
  }

  return players;
};

Team.prototype.attach = function(stadium, opponentTeam) {
  this.stadium = stadium;
  this.opponentTeam = opponentTeam;
  this.aiControllers = [];
  for (var i = 0; i < this.players.length; i++) {
    this.aiControllers.push(new Ai(this.config, stadium, this.players[i], this, opponentTeam, this.level));
  }
};

Team.prototype.updateAi = function() {
  this.assignRoles();
  for (var i = 0; i < this.aiControllers.length; i++) {
    if (this.aiControllers[i].controlledPlayer !== this.humanPlayer) {
      this.aiControllers[i].update();
    }
  }
};

Team.prototype.assignRoles = function() {
  if (!this.config.teamAiEnabled || this.players.length <= 1) {
    for (var i = 0; i < this.aiControllers.length; i++) {
      this.aiControllers[i].setRole(null, null);
    }
    return;
  }

  var available = [];
  for (var j = 0; j < this.aiControllers.length; j++) {
    var controller = this.aiControllers[j];
    controller.setRole(null, null);
    if (controller.controlledPlayer !== this.humanPlayer) {
      available.push(controller);
    }
  }
  if (available.length === 0) {
    return;
  }

  var goalie = null;
  if (this.players.length >= 3) {
    goalie = this.closestControllerToOwnGoal(available);
    goalie.setRole("goalie", goalie.goalieTarget());
    available = this.withoutController(available, goalie);
  }

  if (available.length === 0) {
    return;
  }

  var chaser = this.fastestControllerToBall(available);
  chaser.setRole("chaser", null);
  available = this.withoutController(available, chaser);

  if (available.length === 0) {
    return;
  }

  var support = this.closestControllerToBall(available);
  support.setRole("support", support.supportTarget());
  available = this.withoutController(available, support);

  for (var k = 0; k < available.length; k++) {
    available[k].setRole("defender", available[k].defenderTarget(k, available.length));
  }
};

Team.prototype.withoutController = function(controllers, removed) {
  var result = [];
  for (var i = 0; i < controllers.length; i++) {
    if (controllers[i] !== removed) {
      result.push(controllers[i]);
    }
  }
  return result;
};

Team.prototype.fastestControllerToBall = function(controllers) {
  var best = controllers[0];
  var bestTime = best.timeToReach(best.controlledPlayer.position);
  for (var i = 1; i < controllers.length; i++) {
    var t = controllers[i].timeToReach(controllers[i].controlledPlayer.position);
    if (t < bestTime) {
      best = controllers[i];
      bestTime = t;
    }
  }
  return best;
};

Team.prototype.closestControllerToBall = function(controllers) {
  var best = controllers[0];
  var bestDistance = MathLib.computeDistance(best.controlledPlayer.position, this.stadium.ball.position);
  for (var i = 1; i < controllers.length; i++) {
    var distance = MathLib.computeDistance(controllers[i].controlledPlayer.position, this.stadium.ball.position);
    if (distance < bestDistance) {
      best = controllers[i];
      bestDistance = distance;
    }
  }
  return best;
};

Team.prototype.closestControllerToOwnGoal = function(controllers) {
  var best = controllers[0];
  var bestDistance = MathLib.computeDistance(best.controlledPlayer.position, best.ownGoalCenter);
  for (var i = 1; i < controllers.length; i++) {
    var distance = MathLib.computeDistance(controllers[i].controlledPlayer.position, controllers[i].ownGoalCenter);
    if (distance < bestDistance) {
      best = controllers[i];
      bestDistance = distance;
    }
  }
  return best;
};

Team.prototype.drawAiDebug = function(ctx) {
  for (var i = 0; i < this.aiControllers.length; i++) {
    this.aiControllers[i].draw(ctx);
  }
};

Team.prototype.findClosestPlayerToBall = function(ball) {
  var closest = null;
  var closestDistance = Infinity;
  var epsilon = 0.0001;

  for (var i = 0; i < this.players.length; i++) {
    var player = this.players[i];
    var distance = MathLib.computeDistance(player.position, ball.position);
    if (Math.abs(distance - closestDistance) <= epsilon && player === this.humanPlayer) {
      closest = player;
    } else if (distance < closestDistance - epsilon) {
      closest = player;
      closestDistance = distance;
    }
  }

  return closest;
};

Team.prototype.selectHumanPlayer = function(ball) {
  if (this.side != "home") {
    return null;
  }

  var selected = this.findClosestPlayerToBall(ball);
  if (selected != null && selected !== this.humanPlayer && this.humanPlayer != null) {
    this.humanPlayer.velocity.x = 0;
    this.humanPlayer.velocity.y = 0;
  }
  this.humanPlayer = selected;
  if (this.stadium != null) {
    this.stadium.humanPlayer = selected;
    this.stadium.playerHome = selected;
  }
  return selected;
};
