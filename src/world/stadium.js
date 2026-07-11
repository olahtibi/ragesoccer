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
  var centerX = player.position.x - 1;
  var centerY = player.position.y - 2;
  var outerRadius = 10;
  var innerRadius = 4;
  var points = 5;
  ctx.beginPath();
  for (var i = 0; i < points * 2; i++) {
    var radius = i % 2 == 0 ? outerRadius : innerRadius;
    var angle = -Math.PI / 2 + i * Math.PI / points;
    var x = centerX + Math.cos(angle) * radius;
    var y = centerY + Math.sin(angle) * radius;
    if (i == 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.closePath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255, 255, 0, 0.5)";
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
