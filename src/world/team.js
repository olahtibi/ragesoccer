var Team = function(config, side) {
  this.config = config;
  this.side = side;
  this.players = this._createPlayers();
  this.humanPlayer = side == "home" ? this.players[0] : null;
  this.score = 0;
};

// Public API fields are initialized by the constructor.

// Private helpers

Team.prototype._createPlayers = function() {
  var size = this.side == "home" ? this.config.teams.homeSize : this.config.teams.awaySize;
  var kickoffState = this.config.restarts.kickoffSide == this.side ? "kickoffUs" : "kickoffOpponent";
  var positions = new Formation(this.config).positions(kickoffState, this.side, size);
  var players = [];
  var img = this.side == "home" ? this.config.assets.playerHome : this.config.assets.playerAway;

  for (var i = 0; i < positions.length; i++) {
    var player = new Player(
      img,
      positions[i],
      this.config.player.spriteWidth,
      this.config.player.spriteHeight,
      this.config.player.spriteCenterX,
      this.config.player.spriteCenterY,
      this.config.player
    );
    player.teamSide = this.side;
    if (this.side == "away") {
      player.facingY = 1;
    }
    players.push(player);
  }

  return players;
};
