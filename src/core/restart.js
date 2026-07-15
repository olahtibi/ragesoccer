var RestartRegistry = function() {
  this.strategies = {};
};

RestartRegistry.prototype.register = function(type, strategy) {
  this.strategies[type] = strategy;
};

RestartRegistry.prototype.get = function(type) {
  return this.strategies[type] || null;
};

var RestartController = function(registry, cutscene) {
  this.registry = registry;
  this.cutscene = cutscene;
  this.session = null;
  this.restartSequence = 0;
};

RestartController.prototype.begin = function(request, context, options) {
  var strategy = request == null ? null : this.registry.get(request.type);
  if (strategy == null) return false;

  this.restartSequence++;
  request.positioningSeed = this.restartSequence;

  context.humanController.clearInput();
  context.ball.heldBy = null;
  this.session = {
    request: request,
    strategy: strategy,
    opponentReadyElapsed: 0,
    phase: options != null && options.skipPositioning ? "waitingForInput" : "positioning"
  };
  this.assignTeamAiStates(context);

  if (this.session.phase == "positioning") {
    var controller = this;
    var scene = strategy.createScene(context, request);
    this.session.taker = scene.readyPlayer || null;
    this.session.positioningTeams = scene.teams;
    scene.onComplete = function() {
      controller.finishPositioning(context);
    };
    if (!this.cutscene.play(scene)) {
      this.session = null;
      return false;
    }
  } else if (options != null && options.positionImmediately == true) {
    var immediateScene = strategy.createScene(context, request);
    this.session.taker = immediateScene.readyPlayer || null;
    this.session.positioningTeams = immediateScene.teams;
    this.applySceneImmediately(context, immediateScene);
  }
  return true;
};

RestartController.prototype.applySceneImmediately = function(context, scene) {
  context.ball.position.x = scene.ballPosition.x;
  context.ball.position.y = scene.ballPosition.y;
  context.ball.position.z = scene.ballPosition.z || 0;
  context.ball.velocity.x = 0;
  context.ball.velocity.y = 0;
  context.ball.velocity.z = 0;
  for (var t = 0; t < scene.teams.length; t++) {
    var sceneTeam = scene.teams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      sceneTeam.players[i].position.x = sceneTeam.positions[i].x;
      sceneTeam.players[i].position.y = sceneTeam.positions[i].y;
      sceneTeam.players[i].velocity.x = 0;
      sceneTeam.players[i].velocity.y = 0;
    }
  }
};

RestartController.prototype.finishPositioning = function(context) {
  if (this.session == null) return;
  this.session.phase = "waitingForInput";
  if (this.session.strategy.onPositioned != null) {
    this.session.strategy.onPositioned(context, this.session.request);
  }
  var humanTaker = this.session.taker != null && this.session.taker.teamSide == "home" ?
    this.session.taker : null;
  context.humanController.selectPlayer(humanTaker);
};

RestartController.prototype.assignTeamAiStates = function(context) {
  for (var i = 0; i < context.teamAis.length; i++) {
    var teamAi = context.teamAis[i];
    teamAi.setRestartState(this.session.strategy.teamAiState(teamAi.team, this.session.request));
  }
};

RestartController.prototype.resume = function(context, direction) {
  if (!this.canResume()) return false;
  if (this.session.phase == "positioning") {
    this.cutscene.cancel(context.game);
    this.finishPositioning(context);
  }
  if (this.session.strategy.resume != null &&
      this.session.strategy.resume(context, this.session.request, direction) == false) {
    return false;
  }
  this.session.phase = "inProgress";
  return true;
};

RestartController.prototype.canResume = function() {
  if (this.session == null) return false;
  if (this.session.phase == "waitingForInput") return true;
  return this.session.phase == "positioning" &&
    this.session.strategy.allowEarlyResume == true &&
    this.cutscene.isReadyForInput();
};

RestartController.prototype.canResumeFromInput = function() {
  return !this.isDelayedOpponentRestart() && this.canResume();
};

RestartController.prototype.resumeFromInput = function(context, direction) {
  if (!this.canResumeFromInput()) return false;
  return this.resume(context, direction);
};

RestartController.prototype.simulationMode = function() {
  if (this.session == null) return "full";
  if (this.session.phase == "positioning") return "playersOnly";
  if (this.session.phase == "inProgress") return "full";
  if (this.session.phase == "waitingForInput" && this.isDelayedOpponentRestart()) {
    return "playersOnly";
  }
  return "none";
};

RestartController.prototype.isDelayedOpponentRestart = function() {
  return this.session != null && this.session.strategy.allowEarlyResume == true &&
    this.session.request.awardedTo != "home";
};

RestartController.prototype.canTeamMove = function(team) {
  if (this.session == null || this.session.phase != "inProgress") return false;
  return this.session.strategy.canTeamMove(team, this.session.request);
};

RestartController.prototype.attackTarget = function(team) {
  if (this.session == null || this.session.strategy.attackTarget == null) return null;
  return this.session.strategy.attackTarget(team, this.session.request);
};

RestartController.prototype.taker = function(team) {
  if (this.session == null || this.session.taker == null ||
      this.session.taker.teamSide != team.side) return null;
  return this.session.taker;
};

RestartController.prototype.positioningTargets = function(team) {
  if (this.session == null || this.session.positioningTeams == null) return null;
  for (var i = 0; i < this.session.positioningTeams.length; i++) {
    if (this.session.positioningTeams[i].side == team.side) {
      return this.session.positioningTeams[i].positions;
    }
  }
  return null;
};

RestartController.prototype.updateBeforePhysics = function(context) {
  if (this.session != null && this.session.phase == "positioning") {
    this.cutscene.updateBeforePhysics(context.game);
  }
};

RestartController.prototype.updateAfterPhysics = function(context) {
  if (this.session == null) return;
  if (this.session.phase == "positioning") {
    this.cutscene.updateAfterPhysics(context.game);
    this.resumeReadyRestart(context);
    return;
  }
  if (this.session.phase == "waitingForInput") {
    this.resumeReadyRestart(context);
    return;
  }
  if (this.session.phase != "inProgress") return;

  this.session.strategy.enforceRules(context, this.session.request);
  if (this.session.strategy.isComplete(context, this.session.request)) {
    this.session.phase = "complete";
  }
};

RestartController.prototype.resumeReadyRestart = function(context) {
  if (this.session == null || this.session.strategy.allowEarlyResume != true) {
    return false;
  }
  if (this.session.request.awardedTo != "home") {
    if (!this.canResume()) {
      this.session.opponentReadyElapsed = 0;
      return false;
    }
    this.session.opponentReadyElapsed += context.game.physics.lastDt || 0;
    var delay = Math.max(0, context.config.opponentRestartDelaySeconds || 0);
    if (this.session.opponentReadyElapsed < delay) return false;
    return this.resume(context, null);
  }
  if (!this.canResume()) return false;
  if (context.humanController.hasMovementInput()) {
    return this.resume(context, context.humanController.inputDirection());
  }
  return false;
};

RestartController.prototype.isComplete = function() {
  return this.session != null && this.session.phase == "complete";
};

RestartController.prototype.clear = function() {
  this.session = null;
};

RestartController.prototype.type = function() {
  return this.session == null ? null : this.session.request.type;
};

RestartController.prototype.phase = function() {
  return this.session == null ? null : this.session.phase;
};
