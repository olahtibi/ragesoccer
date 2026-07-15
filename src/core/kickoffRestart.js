var KickoffRestart = function(config) {
  this.config = config;
  this.formation = new Formation(config);
};

KickoffRestart.prototype.createScene = function(context, request) {
  var teams = [];
  for (var i = 0; i < context.teams.length; i++) {
    var team = context.teams[i];
    var state = this.teamAiState(team, request);
    teams.push({
      side: team.side,
      players: team.players,
      positions: this.formation.positions(state, team.side, team.players.length)
    });
  }
  return {
    ballPosition: this.config.initialBallPosition,
    teams: teams
  };
};

KickoffRestart.prototype.teamAiState = function(team, request) {
  return team.side == request.awardedTo ? "kickoffUs" : "kickoffOpponent";
};

KickoffRestart.prototype.canTeamMove = function(team, request) {
  return team.side == request.awardedTo;
};

KickoffRestart.prototype.enforceRules = function(context, request) {
  if (request.awardedTo != "home") return;
  var player = context.humanController.player();
  if (player == null) return;

  var centerX = this.config.initialBallPosition.x;
  var centerY = this.config.aiCenterY;
  var radiusX = this.config.centerCircleRadiusX;
  var radiusY = this.config.centerCircleRadiusY;
  var dx = player.position.x - centerX;
  var dy = player.position.y - centerY;
  var distance = (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY);
  if (distance <= 1) return;

  var scale = 1 / Math.sqrt(distance);
  player.position.x = centerX + dx * scale;
  player.position.y = centerY + dy * scale;
  var outward = player.velocity.x * dx / (radiusX * radiusX) + player.velocity.y * dy / (radiusY * radiusY);
  if (outward > 0) {
    player.velocity.x = 0;
    player.velocity.y = 0;
  }
};

KickoffRestart.prototype.isComplete = function(context) {
  var velocity = context.ball.velocity;
  var minSpeed = this.config.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
