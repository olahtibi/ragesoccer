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
  for (var i = 0; i < this.aiControllers.length; i++) {
    if (this.aiControllers[i].controlledPlayer !== this.humanPlayer) {
      this.aiControllers[i].update();
    }
  }
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
