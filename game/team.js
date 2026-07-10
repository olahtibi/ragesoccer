var Team = function(config, side) {
  this.config = config;
  this.side = side;
  this.players = this.createPlayers();
  this.humanPlayer = side == "home" ? this.players[0] : null;
  this.opponentTeam = null;
  this.stadium = null;
  this.teamAi = null;
};

Team.prototype.createPlayers = function() {
  var size = this.side == "home" ? this.config.homeTeamSize : this.config.awayTeamSize;
  var positions = new Formation(this.config).positions("kickoff", this.side, size);
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
  this.teamAi = new TeamAi(this.config, stadium, this, opponentTeam);
};

Team.prototype.updateAi = function() {
  if (this.teamAi != null) {
    this.teamAi.update();
  }
};

Team.prototype.drawAiDebug = function(ctx) {
  if (this.teamAi != null) {
    this.teamAi.draw(ctx);
  }
};
