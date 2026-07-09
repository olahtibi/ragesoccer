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
  this.playerHome = this.homePlayers[0];
  this.playerAway = this.awayPlayers[0];
  this.humanPlayer = this.homeTeam.humanPlayer;
  this.goalDetector = goalDetector;
};

Stadium.prototype.draw = function(ctx) {  
  ctx.drawImage(this.imgStadium, 0, 0);
  this.ball.draw(ctx);
  for (var i = 0; i < this.players.length; i++) {
    this.players[i].draw(ctx);
  }
};

Stadium.prototype.findClosestHomePlayerToBall = function() {
  return this.homeTeam.findClosestPlayerToBall(this.ball);
};

Stadium.prototype.selectHumanPlayer = function() {
  return this.homeTeam.selectHumanPlayer(this.ball);
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
