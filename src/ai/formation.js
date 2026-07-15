var Formation = function(config) {
  this.config = config;
};

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
  var roles = this.rolesForSize(teamSize);
  var result = this.positions("attack", side, teamSize);
  var coverIndex = this.cornerCoverIndex(teamSize);
  var receivers = [];

  for (var i = 0; i < roles.length; i++) {
    if (roles[i] != "goalie" && i != coverIndex) {
      receivers.push(i);
    }
  }

  var goalX = (this.config.goalTopTopLeft.x + this.config.goalTopTopRight.x) / 2;
  var targetY = side == "home" ?
    this.config.fieldTop + this.config.cornerCrossDistance :
    this.config.fieldBottom - this.config.cornerCrossDistance;
  var spacing = this.config.cornerReceiverSpacing || 0;

  for (var j = 0; j < receivers.length; j++) {
    result[receivers[j]] = this.clampToField(new Vector2d(
      goalX + this.lane(j, receivers.length) * spacing,
      targetY
    ));
  }

  return result;
};

Formation.prototype.cornerCoverIndex = function(teamSize) {
  var roles = this.rolesForSize(teamSize);
  for (var i = 0; i < roles.length; i++) {
    if (roles[i] == "defender") return i;
  }
  return -1;
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

  var centerX = this.config.initialBallPosition.x;
  var centerY = this.config.aiCenterY;
  var attackDir = side == "home" ? -1 : 1;
  var progress = role == "defender" ? this.config.formationDefenderProgress :
    (role == "midfielder" ? this.config.formationMidfielderProgress :
      this.config.formationStrikerProgress);
  var kickingSide = this.kickoffSideForState(state, side);
  var kickoffTaker = kickingSide != null && side == kickingSide &&
    role == "striker" && index == 0;

  if (state == "attack") {
    progress += this.config.formationStateShift;
  } else if (state == "defense") {
    progress -= role == "defender" ? this.config.formationDefenderDefenseShift :
      this.config.formationStateShift;
  } else if (kickingSide != null && role == "striker") {
    progress = side == kickingSide ?
      (kickoffTaker ? -this.config.kickoffTakerDistance : -20) :
      this.nonKickingStrikerProgress(index, count);
  } else if (kickingSide != null && role == "midfielder") {
    progress = this.config.kickoffMidfielderProgress;
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
  var radiusX = this.config.centerCircleRadiusX || 1;
  var radiusY = this.config.centerCircleRadiusY || 0;
  var xOffset = this.lane(index, count) * 90;
  var normalizedX = Math.min(1, Math.abs(xOffset) / radiusX);
  var boundaryY = radiusY * Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX));
  return -(boundaryY + (this.config.playerRadius || 0) + 1);
};

Formation.prototype.goaliePosition = function(side) {
  var x = this.config.initialBallPosition.x;
  var y;
  if (side == "home") {
    y = this.config.goalBottomTopLeft.y - this.config.goalieDistance;
  } else {
    y = this.config.goalTopBottomLeft.y + this.config.goalieDistance;
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
  if (x < this.config.boxTopLeft.x) x = this.config.boxTopLeft.x;
  if (x > this.config.boxTopRight.x) x = this.config.boxTopRight.x;
  if (y < this.config.boxTopLeft.y) y = this.config.boxTopLeft.y;
  if (y > this.config.boxBottomLeft.y) y = this.config.boxBottomLeft.y;
  return new Vector2d(x, y);
};
