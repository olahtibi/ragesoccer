var Stadium = function (imgStadium, ball, playerHome, playerAway, goalDetector) {
  this.imgStadium = imgStadium;
  this.ball = ball;
  this.playerHome = playerHome;
  this.playerAway = playerAway;
  this.players = [playerHome, playerAway];
  this.goalDetector = goalDetector;
};

Stadium.prototype.draw = function(ctx) {  
  ctx.drawImage(this.imgStadium, 0, 0);
  this.ball.draw(ctx);
  this.playerHome.draw(ctx);
  this.playerAway.draw(ctx);
};