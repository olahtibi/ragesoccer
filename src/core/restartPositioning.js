var RestartPositioning = {
  createScene: function(config, context, request, ballPosition, takerPosition) {
    var formation = new Formation(config);
    var teams = [];
    for (var i = 0; i < context.teams.length; i++) {
      var team = context.teams[i];
      var awarded = team.side == request.awardedTo;
      var positions = formation.positions(awarded ? "attack" : "defense", team.side, team.players.length);
      if (awarded) {
        positions[this.closestPlayerIndex(team.players, ballPosition)] = takerPosition;
      } else {
        positions = this.applyOpponentDistance(config, formation, positions, ballPosition);
      }
      teams.push({ side: team.side, players: team.players, positions: positions });
    }
    return { ballPosition: ballPosition, teams: teams };
  },

  closestPlayerIndex: function(players, position) {
    var closestIndex = 0;
    var closestDistance = Infinity;
    for (var i = 0; i < players.length; i++) {
      var distance = MathLib.computeDistance(players[i].position, position);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    return closestIndex;
  },

  applyOpponentDistance: function(config, formation, positions, ballPosition) {
    var result = [];
    var minimum = config.restartOpponentDistance || 0;
    for (var i = 0; i < positions.length; i++) {
      var target = positions[i];
      var dx = target.x - ballPosition.x;
      var dy = target.y - ballPosition.y;
      var distance = MathLib.vectorLength(dx, dy);
      if (distance < minimum) {
        if (distance < 0.0001) {
          dx = config.initialBallPosition.x - ballPosition.x;
          dy = config.aiCenterY - ballPosition.y;
          distance = MathLib.vectorLength(dx, dy);
        }
        target = new Vector2d(
          ballPosition.x + dx / distance * minimum,
          ballPosition.y + dy / distance * minimum
        );
      }
      result.push(this.clampToPlayingField(config, target));
    }
    return result;
  },

  clampToPlayingField: function(config, position) {
    return new Vector2d(
      Math.max(config.fieldLeft, Math.min(config.fieldRight, position.x)),
      Math.max(config.fieldTop, Math.min(config.fieldBottom, position.y))
    );
  },

  stateFor: function(type, team, request) {
    return type + (team.side == request.awardedTo ? "Us" : "Opponent");
  }
};
