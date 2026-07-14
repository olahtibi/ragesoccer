var Stadium = function (imgStadium, ball, homeTeam, awayTeam, goalDetector) {
  this.config = homeTeam.config;
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
  this.kickoffState = this.kickoffStateForSide(this.config.kickoffSide);
  this.kickoffComplete = false;
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

Stadium.prototype.kickoffStateForSide = function(side) {
  return side == "away" ? "kickoffOpponent" : "kickoffUs";
};

Stadium.prototype.startKickoff = function(state) {
  if (!this.isKickoffState(state)) {
    return false;
  }
  this.kickoffState = state;
  this.kickoffComplete = false;
  this.setTeamAiKickoffState(state);
  return true;
};

Stadium.prototype.setTeamAiKickoffState = function(state) {
  for (var i = 0; i < this.teams.length; i++) {
    if (this.teams[i].teamAi != null) {
      this.teams[i].teamAi.setKickoffState(state);
    }
  }
};

Stadium.prototype.currentKickoffState = function() {
  return this.kickoffState;
};

Stadium.prototype.isKickoffComplete = function() {
  return this.kickoffComplete == true;
};

Stadium.prototype.isKickoffState = function(state) {
  return state == "kickoffUs" || state == "kickoffOpponent";
};

Stadium.prototype.isTeamFrozenForKickoff = function(side) {
  if (this.kickoffComplete) {
    return false;
  }
  var state = this.currentKickoffState();
  return (state == "kickoffUs" && side == "away") || (state == "kickoffOpponent" && side == "home");
};

Stadium.prototype.updateKickoff = function() {
  if (this.kickoffComplete) {
    return;
  }
  this.restrictHomeKickoffPlayerToCenterEllipse();
  var vx = this.ball.velocity.x;
  var vy = this.ball.velocity.y;
  var minSpeed = this.config.minVelocity || 0;
  if (vx * vx + vy * vy > minSpeed * minSpeed) {
    this.kickoffComplete = true;
  }
};

Stadium.prototype.restrictHomeKickoffPlayerToCenterEllipse = function() {
  if (this.currentKickoffState() != "kickoffUs") {
    return;
  }
  if (typeof window != "undefined" && window.game != null && window.game.started != true) {
    return;
  }
  var player = this.humanPlayer;
  if (player == null) {
    return;
  }
  var centerX = this.config.initialBallPosition.x;
  var centerY = this.config.aiCenterY;
  var radiusX = this.config.centerCircleRadiusX;
  var radiusY = this.config.centerCircleRadiusY;
  var dx = player.position.x - centerX;
  var dy = player.position.y - centerY;
  var ellipseDistance = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
  if (ellipseDistance <= 1) {
    return;
  }

  var scale = 1 / Math.sqrt(ellipseDistance);
  var nx = dx * scale;
  var ny = dy * scale;
  player.position.x = centerX + nx;
  player.position.y = centerY + ny;

  var outward = player.velocity.x * dx / (radiusX * radiusX) + player.velocity.y * dy / (radiusY * radiusY);
  if (outward > 0) {
    player.velocity.x = 0;
    player.velocity.y = 0;
  }
};

Stadium.prototype.drawAiDebug = function(ctx) {
  for (var i = 0; i < this.teams.length; i++) {
    this.teams[i].drawAiDebug(ctx);
  }
};
