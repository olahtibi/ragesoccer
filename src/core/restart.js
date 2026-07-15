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
};

RestartController.prototype.begin = function(request, context, options) {
  var strategy = request == null ? null : this.registry.get(request.type);
  if (strategy == null) return false;

  context.humanController.clearInput();
  context.ball.heldBy = null;
  this.session = {
    request: request,
    strategy: strategy,
    phase: options != null && options.skipPositioning ? "waitingForInput" : "positioning"
  };
  this.assignTeamAiStates(context);

  if (this.session.phase == "positioning") {
    var controller = this;
    var scene = strategy.createScene(context, request);
    scene.onComplete = function() {
      controller.session.phase = "waitingForInput";
      if (strategy.onPositioned != null) strategy.onPositioned(context, request);
      context.humanController.selectPlayer();
    };
    if (!this.cutscene.play(scene)) {
      this.session = null;
      return false;
    }
  }
  return true;
};

RestartController.prototype.assignTeamAiStates = function(context) {
  for (var i = 0; i < context.teamAis.length; i++) {
    var teamAi = context.teamAis[i];
    teamAi.setRestartState(this.session.strategy.teamAiState(teamAi.team, this.session.request));
  }
};

RestartController.prototype.resume = function(context, direction) {
  if (this.session == null || this.session.phase != "waitingForInput") return false;
  if (this.session.strategy.resume != null &&
      this.session.strategy.resume(context, this.session.request, direction) == false) {
    return false;
  }
  this.session.phase = "inProgress";
  return true;
};

RestartController.prototype.simulationMode = function() {
  if (this.session == null) return "full";
  if (this.session.phase == "positioning") return "playersOnly";
  if (this.session.phase == "inProgress") return "full";
  return "none";
};

RestartController.prototype.canTeamMove = function(team) {
  if (this.session == null || this.session.phase != "inProgress") return false;
  return this.session.strategy.canTeamMove(team, this.session.request);
};

RestartController.prototype.attackTarget = function(team) {
  if (this.session == null || this.session.strategy.attackTarget == null) return null;
  return this.session.strategy.attackTarget(team, this.session.request);
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
    return;
  }
  if (this.session.phase != "inProgress") return;

  this.session.strategy.enforceRules(context, this.session.request);
  if (this.session.strategy.isComplete(context, this.session.request)) {
    this.session.phase = "complete";
  }
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
