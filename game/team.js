var Team = function(config, side) {
  this.config = config;
  this.side = side;
  this.players = this.createPlayers();
  this.humanPlayer = side == "home" ? this.players[0] : null;
  this.opponentTeam = null;
  this.stadium = null;
  this.aiControllers = [];
};

Team.prototype.createPlayers = function() {
  var positions = this.config.initialPlayerPositions(this.side);
  var players = [];
  var img = this.side == "home" ? this.config.imgPlayerHome : this.config.imgPlayerAway;

  for (var i = 0; i < positions.length; i++) {
    var player = new Player(img, positions[i], this.config.playerSpriteWidth, this.config.playerSpriteHeight, this.config.playerSpriteCenterX, this.config.playerSpriteCenterY);
    if (this.side == "away") {
      player.facingY = 1;
    }
    players.push(player);
  }

  return players;
};

Team.prototype.attach = function(stadium, opponentTeam) {
  this.stadium = stadium;
  this.opponentTeam = opponentTeam;
  this.aiControllers = [];
  for (var i = 0; i < this.players.length; i++) {
    this.aiControllers.push(new Ai(this.config, stadium, this.players[i], this, opponentTeam));
  }
  this.assignRoles();
};

Team.prototype.updateAi = function() {
  if (!this.config.teamAiEnabled) {
    this.clearRoles();
    return;
  }

  if (!this.formationAssigned) {
    this.assignRoles();
  }

  var context = this.buildAiContext();
  for (var i = 0; i < this.aiControllers.length; i++) {
    if (this.aiControllers[i].controlledPlayer !== this.humanPlayer) {
      this.aiControllers[i].update(context);
    }
  }
};

Team.prototype.assignRoles = function() {
  this.clearRoles();
  if (!this.config.teamAiEnabled || this.aiControllers.length === 0) {
    return;
  }

  var available = this.aiControllers.slice(0);
  if (available.length === 1) {
    this.setControllerSlot(available[0], "striker");
    this.finalizeSlotMetadata();
    this.formationAssigned = true;
    return;
  }

  if (available.length >= 3) {
    var goalie = this.closestControllerToOwnGoal(available);
    this.setControllerSlot(goalie, "goalie");
    available = this.withoutController(available, goalie);
  }

  var striker = this.highestUpfieldController(available);
  this.setControllerSlot(striker, "striker");
  available = this.withoutController(available, striker);

  available.sort(this.depthSort.bind(this));
  var defenderCount = available.length >= 3 ? 2 : Math.min(1, available.length);
  for (var i = 0; i < defenderCount; i++) {
    this.setControllerSlot(available[i], "defender");
  }
  for (var j = defenderCount; j < available.length; j++) {
    this.setControllerSlot(available[j], "support");
  }

  this.finalizeSlotMetadata();
  this.formationAssigned = true;
};

Team.prototype.clearRoles = function() {
  for (var i = 0; i < this.aiControllers.length; i++) {
    this.aiControllers[i].setRole(null, null);
    this.aiControllers[i].slotIndex = 0;
    this.aiControllers[i].slotCount = 1;
    this.aiControllers[i].slotLane = 0;
  }
  this.formationAssigned = false;
};

Team.prototype.setControllerSlot = function(controller, role) {
  controller.setRole(role, null);
  controller.slotLane = this.laneForController(controller);
};

Team.prototype.finalizeSlotMetadata = function() {
  var roleCounts = {};
  for (var i = 0; i < this.aiControllers.length; i++) {
    var role = this.aiControllers[i].role;
    if (role == null) continue;
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  }

  var roleIndexes = {};
  for (var j = 0; j < this.aiControllers.length; j++) {
    var controller = this.aiControllers[j];
    if (controller.role == null) continue;
    var index = roleIndexes[controller.role] || 0;
    controller.slotIndex = index;
    controller.slotCount = roleCounts[controller.role];
    roleIndexes[controller.role] = index + 1;
  }
};

Team.prototype.buildAiContext = function() {
  var reference = this.aiControllers[0];
  var ball = this.stadium.ball;
  var ballInOwnHalf = reference.isPointInOwnHalf(ball.position);
  var threat = reference.isBallThreateningOwnGoal();
  var goalie = this.roleController("goalie", true);
  var keeperChallenge = false;
  if (goalie != null && ballInOwnHalf) {
    keeperChallenge = MathLib.computeDistance(ball.position, goalie.ownGoalCenter) <= this.config.aiKeeperChallengeRadius;
  }

  var pressureController = null;
  var defensiveDepth = reference.defensiveDepth(ball.position);
  var defenderShouldPress = ballInOwnHalf && (threat || defensiveDepth >= this.config.aiPressReleaseDistance);
  if (!keeperChallenge) {
    if (defenderShouldPress) {
      pressureController = this.roleController("defender", false);
    }
    if (pressureController == null) {
      pressureController = this.roleController("striker", false);
    }
  }

  return {
    team: this,
    ball: ball,
    ballInOwnHalf: ballInOwnHalf,
    threat: threat,
    keeperChallenge: keeperChallenge,
    pressureController: pressureController,
    teammates: this.players
  };
};

Team.prototype.roleController = function(role, includeHuman) {
  for (var i = 0; i < this.aiControllers.length; i++) {
    var controller = this.aiControllers[i];
    if (controller.role == role && (includeHuman || controller.controlledPlayer !== this.humanPlayer)) {
      return controller;
    }
  }
  return null;
};

Team.prototype.highestUpfieldController = function(controllers) {
  var best = controllers[0];
  var bestProgress = this.attackProgress(best.controlledPlayer.position);
  for (var i = 1; i < controllers.length; i++) {
    var progress = this.attackProgress(controllers[i].controlledPlayer.position);
    if (progress > bestProgress) {
      best = controllers[i];
      bestProgress = progress;
    }
  }
  return best;
};

Team.prototype.depthSort = function(a, b) {
  var pa = this.attackProgress(a.controlledPlayer.position);
  var pb = this.attackProgress(b.controlledPlayer.position);
  if (pa === pb) {
    return a.controlledPlayer.position.x - b.controlledPlayer.position.x;
  }
  return pa - pb;
};

Team.prototype.attackProgress = function(point) {
  return this.side == "home" ? -point.y : point.y;
};

Team.prototype.laneForController = function(controller) {
  var centerX = this.config.stadiumWidth / 2;
  var dx = controller.controlledPlayer.position.x - centerX;
  if (Math.abs(dx) < 8) {
    return 0;
  }
  return dx < 0 ? -1 : 1;
};

Team.prototype.withoutController = function(controllers, removed) {
  var result = [];
  for (var i = 0; i < controllers.length; i++) {
    if (controllers[i] !== removed) {
      result.push(controllers[i]);
    }
  }
  return result;
};

Team.prototype.closestControllerToOwnGoal = function(controllers) {
  var best = controllers[0];
  var bestDistance = MathLib.computeDistance(best.controlledPlayer.position, best.ownGoalCenter);
  for (var i = 1; i < controllers.length; i++) {
    var distance = MathLib.computeDistance(controllers[i].controlledPlayer.position, controllers[i].ownGoalCenter);
    if (distance < bestDistance) {
      best = controllers[i];
      bestDistance = distance;
    }
  }
  return best;
};

Team.prototype.drawAiDebug = function(ctx) {
  for (var i = 0; i < this.aiControllers.length; i++) {
    this.aiControllers[i].draw(ctx);
  }
};

Team.prototype.findClosestPlayerToBall = function(ball) {
  var closest = null;
  var closestDistance = Infinity;
  var humanDistance = Infinity;

  for (var i = 0; i < this.players.length; i++) {
    var player = this.players[i];
    var distance = MathLib.computeDistance(player.position, ball.position);
    if (player === this.humanPlayer) {
      humanDistance = distance;
    }
    if (distance < closestDistance) {
      closest = player;
      closestDistance = distance;
    }
  }

  if (this.humanPlayer != null && closest !== this.humanPlayer) {
    var hysteresis = this.config.humanSwitchHysteresisDistance || 0;
    if (humanDistance <= closestDistance + hysteresis) {
      return this.humanPlayer;
    }
  }

  return closest;
};

Team.prototype.selectHumanPlayer = function(ball) {
  if (this.side != "home") {
    return null;
  }

  var selected = this.findClosestPlayerToBall(ball);
  if (selected != null && selected !== this.humanPlayer && this.humanPlayer != null) {
    this.humanPlayer.velocity.x = 0;
    this.humanPlayer.velocity.y = 0;
  }
  this.humanPlayer = selected;
  if (this.stadium != null) {
    this.stadium.humanPlayer = selected;
  }
  return selected;
};
