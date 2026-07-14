var Team = function(config, side) {
  this.config = config;
  this.side = side;
  this.players = this.createPlayers();
  this.humanPlayer = side == "home" ? this.players[0] : null;
  this.score = 0;
};

Team.prototype.createPlayers = function() {
  var size = this.side == "home" ? this.config.homeTeamSize : this.config.awayTeamSize;
  var kickoffState = this.config.kickoffSide == this.side ? "kickoffUs" : "kickoffOpponent";
  var positions = new Formation(this.config).positions(kickoffState, this.side, size);
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
