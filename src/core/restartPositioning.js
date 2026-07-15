var RestartPositioning = {
  createScene: function(config, context, request, ballPosition, takerPosition, takerIndex, awardedState) {
    var formation = new Formation(config);
    var teams = [];
    var readyPlayer = null;
    for (var i = 0; i < context.teams.length; i++) {
      var team = context.teams[i];
      var awarded = team.side == request.awardedTo;
      var positions = formation.positions(
        awarded ? (awardedState || "attack") : "defense",
        team.side,
        team.players.length
      );
      var selectedIndex = -1;
      if (awarded) {
        selectedIndex = takerIndex == null ?
          this.closestPlayerIndex(team.players, ballPosition) : takerIndex;
      }
      positions = this.randomizePositions(
        config,
        formation,
        positions,
        request,
        team.side,
        selectedIndex
      );
      if (awarded) {
        positions[selectedIndex] = takerPosition;
        readyPlayer = team.players[selectedIndex];
      } else {
        positions = this.applyOpponentDistance(config, formation, positions, ballPosition);
      }
      teams.push({ side: team.side, players: team.players, positions: positions });
    }
    return { ballPosition: ballPosition, teams: teams, readyPlayer: readyPlayer };
  },

  randomizePositions: function(config, formation, positions, request, teamSide, protectedIndex) {
    var result = [];
    var variationX = config.restartPositionVariationX || 0;
    var variationY = config.restartPositionVariationY || 0;
    for (var i = 0; i < positions.length; i++) {
      if (i == protectedIndex) {
        result.push(positions[i]);
        continue;
      }
      var x = positions[i].x +
        this.randomValue(request.positioningSeed, teamSide, i, 1) * variationX;
      var y = positions[i].y +
        this.randomValue(request.positioningSeed, teamSide, i, 2) * variationY;
      result.push(formation.clampToField(new Vector2d(x, y)));
    }
    return result;
  },

  randomValue: function(seed, teamSide, playerIndex, salt) {
    seed = seed || 0;
    var sideSeed = teamSide == "away" ? 0x9e3779b9 : 0x85ebca6b;
    var value = sideSeed ^ Math.imul(seed + 1, 0x27d4eb2d) ^
      Math.imul(playerIndex + 1, 0x165667b1) ^ Math.imul(salt + 1, 0x2c1b3c6d);
    value = Math.imul(value ^ (value >>> 15), 0x297a2d39);
    value = Math.imul(value ^ (value >>> 12), 0x1b873593);
    value = (value ^ (value >>> 15)) >>> 0;
    return value / 2147483647.5 - 1;
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
