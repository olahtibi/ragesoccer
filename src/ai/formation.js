var Formation = function(config) {
  this.config = config;
};

Formation.prototype.positions = function(state, side, teamSize) {
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

Formation.prototype.rolesForSize = function(teamSize) {
  var sizes = {
    1: ["striker"],
    2: ["goalie", "striker"],
    3: ["goalie", "defender", "striker"],
    4: ["goalie", "defender", "defender", "striker"],
    5: ["goalie", "defender", "defender", "striker", "striker"]
  };
  return sizes[teamSize] || sizes[Math.max(1, Math.min(5, teamSize))];
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
  var progress = role == "defender" ? -150 : 130;

  if (state == "attack") {
    progress += 55;
  } else if (state == "defense") {
    progress -= 55;
  } else if (state == "kickoff" && role == "striker") {
    progress = -20;
  }

  var x = centerX + this.lane(index, count) * 90;
  var y = centerY + attackDir * progress;
  return this.clampToField(new Vector2d(x, y));
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
