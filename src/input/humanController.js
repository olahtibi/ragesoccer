var HumanController = function(config, team, ball) {
  this.config = config;
  this.team = team;
  this.ball = ball;
  this.keys = {};
  this.touchTarget = null;
};

// Public API (underscore-prefixed members are private helpers)

HumanController.prototype.player = function() {
  return this.team.humanPlayer;
};

HumanController.prototype.setKey = function(keyCode, pressed) {
  this.keys[keyCode] = pressed;
  if (this.hasMovementInput()) this.touchTarget = null;
};

HumanController.prototype.setTouchTarget = function(target) {
  this.touchTarget = target;
};

HumanController.prototype.clearInput = function() {
  this.keys = {};
  this.touchTarget = null;
  var player = this.player();
  if (player == null) return;
  player.velocity.x = 0;
  player.velocity.y = 0;
};

HumanController.prototype.hasMovementInput = function() {
  return this.keys[37] || this.keys[38] || this.keys[39] || this.keys[40];
};

HumanController.prototype.inputDirection = function() {
  var x = 0;
  var y = 0;
  if (this.keys[37]) x--;
  if (this.keys[39]) x++;
  if (this.keys[38]) y--;
  if (this.keys[40]) y++;
  if (x == 0 && y == 0) return null;
  return MathLib.normalizeVector(x, y, 0, -1);
};

HumanController.prototype.selectPlayer = function(preferredPlayer) {
  if (preferredPlayer != null) {
    var selected = this.team.humanPlayer;
    if (selected != null && selected !== preferredPlayer) {
      selected.velocity.x = 0;
      selected.velocity.y = 0;
    }
    this.team.humanPlayer = preferredPlayer;
    return preferredPlayer;
  }

  var closest = this.closestPlayerToBall();
  var current = this.team.humanPlayer;
  if (current != null && closest !== current) {
    var currentDistance = MathLib.computeDistance(current.position, this.ball.position);
    var closestDistance = MathLib.computeDistance(closest.position, this.ball.position);
    if (currentDistance <= closestDistance + (this.config.input.humanSwitchHysteresisDistance || 0)) {
      return current;
    }
  }
  if (current != null && closest !== current) {
    current.velocity.x = 0;
    current.velocity.y = 0;
  }
  this.team.humanPlayer = closest;
  return closest;
};

HumanController.prototype.closestPlayerToBall = function() {
  var closest = null;
  var distance = Infinity;
  for (var i = 0; i < this.team.players.length; i++) {
    var candidate = this.team.players[i];
    var candidateDistance = MathLib.computeDistance(candidate.position, this.ball.position);
    if (candidateDistance < distance) {
      closest = candidate;
      distance = candidateDistance;
    }
  }
  return closest;
};

HumanController.prototype.update = function(canMove) {
  var player = this.player();
  if (player == null) return;
  player.velocity.x = 0;
  player.velocity.y = 0;
  if (!canMove) {
    this.touchTarget = null;
    return;
  }

  var velocity = this.config.teamVelocity("home");
  if (this.hasMovementInput()) {
    if (this.keys[38]) player.velocity.y -= velocity;
    if (this.keys[40]) player.velocity.y += velocity;
    if (this.keys[37]) player.velocity.x -= velocity;
    if (this.keys[39]) player.velocity.x += velocity;
    if (player.velocity.x != 0 && player.velocity.y != 0) {
      player.velocity.x /= Math.sqrt(2);
      player.velocity.y /= Math.sqrt(2);
    }
    return;
  }

  if (this.touchTarget == null) return;
  if (MathLib.computeDistance(player.position, this.touchTarget) <= (this.config.ai.targetReachedRadius || 1)) {
    this.touchTarget = null;
    return;
  }
  player.velocity = MathLib.computeVelocityForTarget(player.position, this.touchTarget, velocity);
};
