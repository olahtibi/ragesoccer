var Formation = function(config) {
  this.config = config;
};

// Public API (underscore-prefixed members are private helpers)

Formation.prototype.positions = function(state, side, teamSize) {
  if (state == "cornerUs") {
    return this.cornerAttackingPositions(side, teamSize);
  }

  var roles = this.rolesForSize(teamSize);
  var roleIndexes = {};
  var result = [];

  for (var i = 0; i < roles.length; i++) {
    var role = roles[i];
    var roleIndex = roleIndexes[role] || 0;
    roleIndexes[role] = roleIndex + 1;
    result.push(this.positionForRole(state, side, role, roleIndex, this.roleCount(roles, role)));
  }

  return result;
};

Formation.prototype.cornerAttackingPositions = function(side, teamSize) {
  return this.cornerAttackingPlan(side, teamSize, -1, true).positions;
};

Formation.prototype.cornerAttackingPlan = function(side, teamSize, takerIndex, cornerLeft) {
  var roles = this.rolesForSize(teamSize);
  var result = this.positions("attack", side, teamSize);
  var groups = this.cornerAssignments(teamSize, takerIndex);
  var groupIndexes = {};
  var groupCounts = {};

  for (var i = 0; i < groups.length; i++) {
    groupCounts[groups[i]] = (groupCounts[groups[i]] || 0) + 1;
  }

  var goalX = (this.config.pitch.goalTopTopLeft.x + this.config.pitch.goalTopTopRight.x) / 2;
  var goalY = side == "home" ? this.config.pitch.fieldTop : this.config.pitch.fieldBottom;
  var attackDir = side == "home" ? 1 : -1;
  for (var j = 0; j < groups.length; j++) {
    var group = groups[j];
    var groupIndex = groupIndexes[group] || 0;
    groupIndexes[group] = groupIndex + 1;
    var x;
    var depth;
    if (group == "box") {
      x = goalX + this.lane(groupIndex, groupCounts[group]) * this.config.restarts.cornerBoxSpacing;
      depth = this.config.restarts.cornerBoxDepth + groupIndex * this.config.restarts.cornerBoxDepthStep;
    } else if (group == "late") {
      x = goalX + this.lane(groupIndex, groupCounts[group]) * this.config.restarts.cornerBoxSpacing * 2;
      depth = this.config.restarts.cornerLateDepth;
    } else if (group == "edge") {
      x = goalX;
      depth = this.config.restarts.cornerEdgeDepth;
    } else if (group == "short") {
      x = cornerLeft ? this.config.pitch.fieldLeft + this.config.restarts.cornerShortInset :
        this.config.pitch.fieldRight - this.config.restarts.cornerShortInset;
      depth = this.config.restarts.cornerShortDepth;
    } else {
      continue;
    }
    result[j] = this.clampToField(new Vector2d(x, goalY + attackDir * depth));
  }

  return { positions: result, groups: groups };
};

Formation.prototype.cornerCoverIndex = function(teamSize) {
  var indexes = this.cornerCoverIndexes(teamSize);
  return indexes.length == 0 ? -1 : indexes[0];
};

Formation.prototype.cornerCoverIndexes = function(teamSize) {
  var roles = this.rolesForSize(teamSize);
  var outfieldCount = 0;
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] != "goalie") outfieldCount++;
  }
  var coverLimit = Math.min(2, Math.max(0, outfieldCount - 2));
  var defenders = [];
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] == "defender") defenders.push(i);
  }
  var result = [];
  if (coverLimit >= 1 && defenders.length > 0) result.push(defenders[0]);
  if (coverLimit >= 2 && defenders.length > 1) result.push(defenders[defenders.length - 1]);
  return result;
};

Formation.prototype.cornerAssignments = function(teamSize, takerIndex) {
  var roles = this.rolesForSize(teamSize);
  var covers = this.cornerCoverIndexes(teamSize);
  var groups = [];
  var candidates = [];
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] == "goalie") {
      groups[i] = "goalie";
    } else if (covers.indexOf(i) >= 0) {
      groups[i] = "cover";
    } else if (i == takerIndex) {
      groups[i] = "taker";
    } else {
      candidates.push(i);
    }
  }

  var advancedCount = candidates.length;
  if (advancedCount >= 2) {
    var shortIndex = this.takeCornerCandidate(candidates, roles, ["midfielder", "striker", "defender"], false);
    groups[shortIndex] = "short";
  }
  if (advancedCount >= 4) {
    var lateIndex = this.takeCornerCandidate(candidates, roles, ["midfielder", "defender", "striker"], false);
    groups[lateIndex] = "late";
  }
  if (advancedCount >= 6) {
    var edgeIndex = this.takeCornerCandidate(candidates, roles, ["midfielder", "defender", "striker"], true);
    groups[edgeIndex] = "edge";
  }
  for (var j = 0; j < candidates.length; j++) {
    groups[candidates[j]] = "box";
  }
  return groups;
};

Formation.prototype.takeCornerCandidate = function(candidates, roles, preferences, fromEnd) {
  for (var p = 0; p < preferences.length; p++) {
    if (fromEnd) {
      for (var i = candidates.length - 1; i >= 0; i--) {
        if (roles[candidates[i]] == preferences[p]) return candidates.splice(i, 1)[0];
      }
    } else {
      for (var j = 0; j < candidates.length; j++) {
        if (roles[candidates[j]] == preferences[p]) return candidates.splice(j, 1)[0];
      }
    }
  }
  return candidates.shift();
};

Formation.prototype.kickoffTakerIndex = function(teamSize) {
  var roles = this.rolesForSize(teamSize);
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] == "striker") return i;
  }
  return -1;
};

Formation.prototype.rolesForSize = function(teamSize) {
  var sizes = {
    1: ["striker"],
    2: ["goalie", "striker"],
    3: ["goalie", "defender", "striker"],
    4: ["goalie", "defender", "defender", "striker"],
    5: ["goalie", "defender", "defender", "striker", "striker"],
    6: ["goalie", "defender", "defender", "midfielder", "striker", "striker"],
    7: ["goalie", "defender", "defender", "midfielder", "midfielder", "striker", "striker"],
    8: ["goalie", "defender", "defender", "defender", "midfielder", "midfielder", "striker", "striker"],
    9: ["goalie", "defender", "defender", "defender", "midfielder", "midfielder", "midfielder", "striker", "striker"],
    10: ["goalie", "defender", "defender", "defender", "defender", "midfielder", "midfielder", "midfielder", "striker", "striker"],
    11: ["goalie", "defender", "defender", "defender", "defender", "midfielder", "midfielder", "midfielder", "midfielder", "striker", "striker"]
  };
  return sizes[teamSize] || sizes[Math.max(1, Math.min(11, teamSize))];
};

Formation.prototype.roleCount = function(roles, role) {
  var count = 0;
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] == role) {
      count++;
    }
  }
  return count;
};

Formation.prototype.positionForRole = function(state, side, role, index, count) {
  if (role == "goalie") {
    return this.goaliePosition(side);
  }

  var centerX = this.config.pitch.initialBallPosition.x;
  var centerY = this.config.pitch.aiCenterY;
  var attackDir = side == "home" ? -1 : 1;
  var progress = role == "defender" ? this.config.ai.formationDefenderProgress :
    (role == "midfielder" ? this.config.ai.formationMidfielderProgress :
      this.config.ai.formationStrikerProgress);
  var kickingSide = this.kickoffSideForState(state, side);
  var kickoffTaker = kickingSide != null && side == kickingSide &&
    role == "striker" && index == 0;

  if (state == "attack") {
    progress += this.config.ai.formationStateShift;
  } else if (state == "defense") {
    progress -= role == "defender" ? this.config.ai.formationDefenderDefenseShift :
      this.config.ai.formationStateShift;
  } else if (kickingSide != null && role == "striker") {
    progress = side == kickingSide ?
      (kickoffTaker ? -this.config.restarts.kickoffTakerDistance :
        -this.config.ai.formationFallbackDepth) :
      this.nonKickingStrikerProgress(index, count);
  } else if (kickingSide != null && role == "midfielder") {
    progress = this.config.ai.kickoffMidfielderProgress;
  }

  var x = kickoffTaker ? centerX : centerX + this.lane(index, count) * 90;
  var y = centerY + attackDir * progress;
  return this.clampToField(new Vector2d(x, y));
};

Formation.prototype.kickoffSideForState = function(state, side) {
  if (state == "kickoffUs") {
    return side;
  }
  if (state == "kickoffOpponent") {
    return side == "home" ? "away" : "home";
  }
  return null;
};

Formation.prototype.nonKickingStrikerProgress = function(index, count) {
  var radiusX = this.config.pitch.centerCircleRadiusX || 1;
  var radiusY = this.config.pitch.centerCircleRadiusY || 0;
  var xOffset = this.lane(index, count) * 90;
  var normalizedX = Math.min(1, Math.abs(xOffset) / radiusX);
  var boundaryY = radiusY * Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));
  return -(boundaryY + (this.config.player.radius || 0) + this.config.ai.fieldClampClearance);
};

Formation.prototype.goaliePosition = function(side) {
  var x = this.config.pitch.initialBallPosition.x;
  var y;
  if (side == "home") {
    y = this.config.pitch.goalBottomTopLeft.y - this.config.ai.goalieDistance;
  } else {
    y = this.config.pitch.goalTopBottomLeft.y + this.config.ai.goalieDistance;
  }
  return this.clampToField(new Vector2d(x, y));
};

Formation.prototype.lane = function(index, count) {
  if (count <= 1) {
    return 0;
  }
  return index - (count - 1) / 2;
};

Formation.prototype.clampToField = function(position) {
  var x = position.x;
  var y = position.y;
  if (x < this.config.pitch.boxTopLeft.x) x = this.config.pitch.boxTopLeft.x;
  if (x > this.config.pitch.boxTopRight.x) x = this.config.pitch.boxTopRight.x;
  if (y < this.config.pitch.boxTopLeft.y) y = this.config.pitch.boxTopLeft.y;
  if (y > this.config.pitch.boxBottomLeft.y) y = this.config.pitch.boxBottomLeft.y;
  return new Vector2d(x, y);
};
