var KickoffRestart = function(config) {
  this.config = config;
  this.formation = new Formation(config);
  this.opponentAutoResumeAfterPositioning = true;
};

// Public API (underscore-prefixed members are private helpers)

KickoffRestart.prototype.createScene = function(context, request) {
  var sceneTeams = [];
  var readyPlayer = null;
  for (var i = 0; i < context.teams.length; i++) {
    var team = context.teams[i];
    var state = this.teamAiState(team, request);
    var takerIndex = -1;
    if (team.side == request.awardedTo) {
      takerIndex = this.formation.kickoffTakerIndex(team.players.length);
      readyPlayer = team.players[takerIndex];
    }
    var positions = RestartPositioning.randomizePositions(
      this.config,
      this.formation,
      this.formation.positions(state, team.side, team.players.length),
      request,
      team.side,
      takerIndex
    );
    positions = this._applyPositioningRules(positions, team.side, takerIndex);
    sceneTeams.push({
      side: team.side,
      players: team.players,
      positions: positions
    });
  }
  return {
    ballPosition: this.config.pitch.initialBallPosition,
    sceneTeams: sceneTeams,
    readyPlayer: readyPlayer
  };
};

KickoffRestart.prototype._applyPositioningRules = function(positions, side, takerIndex) {
  var result = [];
  var centerX = this.config.pitch.initialBallPosition.x;
  var centerY = this.config.pitch.aiCenterY;
  var radiusX = this.config.pitch.centerCircleRadiusX + this.config.player.radius + 1;
  var radiusY = this.config.pitch.centerCircleRadiusY + this.config.player.radius + 1;

  for (var i = 0; i < positions.length; i++) {
    if (i == takerIndex) {
      result.push(positions[i]);
      continue;
    }
    var target = positions[i];
    var y = side == "home" ? Math.max(target.y, centerY + this.config.player.radius) :
      Math.min(target.y, centerY - this.config.player.radius);
    var dx = target.x - centerX;
    var dy = y - centerY;
    var ellipseDistance = dx * dx / (radiusX * radiusX) + dy * dy / (radiusY * radiusY);
    if (ellipseDistance < 1) {
      var scale = 1 / Math.sqrt(ellipseDistance || 0.0001);
      target = new Vector2d(centerX + dx * scale, centerY + dy * scale);
    } else {
      target = new Vector2d(target.x, y);
    }
    result.push(RestartPositioning.clampToPlayingField(this.config, target));
  }
  return result;
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

  var centerX = this.config.pitch.initialBallPosition.x;
  var centerY = this.config.pitch.aiCenterY;
  var radiusX = this.config.pitch.centerCircleRadiusX;
  var radiusY = this.config.pitch.centerCircleRadiusY;
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
  var minSpeed = this.config.physics.minVelocity || 0;
  return velocity.x * velocity.x + velocity.y * velocity.y > minSpeed * minSpeed;
};
