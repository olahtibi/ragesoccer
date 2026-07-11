var Stadium = function (imgStadium, ball, homeTeam, awayTeam, goalDetector) {
  this.imgStadium = imgStadium;
  this.ball = ball;
  this.homeTeam = homeTeam;
  this.awayTeam = awayTeam;
  this.teams = [this.homeTeam, this.awayTeam];
  this.homeTeam.attach(this, this.awayTeam);
  this.awayTeam.attach(this, this.homeTeam);
  this.homePlayers = this.homeTeam.players;
  this.awayPlayers = this.awayTeam.players;
  this.players = this.homePlayers.concat(this.awayPlayers);
  this.goalDetector = goalDetector;
};

Object.defineProperty(Stadium.prototype, "humanPlayer", {
  get: function() {
    return this.homeTeam.humanPlayer;
  }
});

Stadium.prototype.draw = function(ctx) {  
  ctx.drawImage(this.imgStadium, 0, 0);
  this.ball.draw(ctx);
  for (var i = 0; i < this.players.length; i++) {
    if (this.players[i] === this.humanPlayer) {
      this.drawHumanPlayerMarker(ctx, this.players[i]);
    }
    this.players[i].draw(ctx);
  }
};

Stadium.prototype.drawHumanPlayerMarker = function(ctx, player) {
  ctx.beginPath();
  ctx.ellipse(player.position.x, player.position.y, 10, 5, 0, 0, 2 * Math.PI);
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
  ctx.stroke();
};

Stadium.prototype.updateAi = function() {
  for (var i = 0; i < this.teams.length; i++) {
    this.teams[i].updateAi();
  }
};

Stadium.prototype.drawAiDebug = function(ctx) {
  for (var i = 0; i < this.teams.length; i++) {
    this.teams[i].drawAiDebug(ctx);
  }
};
