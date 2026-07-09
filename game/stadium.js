var Stadium = function (imgStadium, ball, playerHome, playerAway, goalDetector) {
  this.imgStadium = imgStadium;
  this.ball = ball;
  this.homePlayers = playerHome instanceof Array ? playerHome : [playerHome];
  this.awayPlayers = playerAway instanceof Array ? playerAway : [playerAway];
  this.players = this.homePlayers.concat(this.awayPlayers);
  this.playerHome = this.homePlayers[0];
  this.playerAway = this.awayPlayers[0];
  this.humanPlayer = this.playerHome;
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
  var closest = null;
  var closestDistance = Infinity;
  var epsilon = 0.0001;

  for (var i = 0; i < this.homePlayers.length; i++) {
    var player = this.homePlayers[i];
    var distance = MathLib.computeDistance(player.position, this.ball.position);
    if (Math.abs(distance - closestDistance) <= epsilon && player === this.humanPlayer) {
      closest = player;
    } else if (distance < closestDistance - epsilon) {
      closest = player;
      closestDistance = distance;
    }
  }

  return closest;
};

Stadium.prototype.selectHumanPlayer = function() {
  var selected = this.findClosestHomePlayerToBall();
  if (selected != null && selected !== this.humanPlayer && this.humanPlayer != null) {
    this.humanPlayer.velocity.x = 0;
    this.humanPlayer.velocity.y = 0;
  }
  this.humanPlayer = selected;
  this.playerHome = selected;
  return selected;
};
