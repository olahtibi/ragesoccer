var RestartController = function(registry, positioningController) {
  this._registry = registry;
  this._positioningController = positioningController;
  this._session = null;
  this._restartSequence = 0;
};

// Public API

RestartController.prototype.begin = function(request, context, options) {
  var strategy = request == null ? null : this._registry.get(request.type);
  if (strategy == null) return false;
  var positioningMode = options != null ? options.positioningMode : null;
  var isImmediate = positioningMode == "immediate";

  this._restartSequence++;
  request.positioningSeed = this._restartSequence;

  context.humanController.clearInput();
  context.ball.heldBy = null;
  this._session = {
    request: request,
    strategy: strategy,
    opponentReadyElapsed: 0,
    phase: "positioning"
  };
  this._assignTeamAiStates(context);

  var controller = this;
  var scene = strategy.createScene(context, request);
  this._session.taker = scene.readyPlayer || null;
  this._session.positioningTeams = scene.sceneTeams;
  if (isImmediate) {
    this._applySceneImmediately(context, scene);
    this._finishPositioning(context);
  } else {
    scene.onComplete = function() {
      controller._finishPositioning(context);
    };
    if (!this._positioningController.play(scene)) {
      this._session = null;
      return false;
    }
  }
  return true;
};

RestartController.prototype._applySceneImmediately = function(context, scene) {
  context.ball.position.x = scene.ballPosition.x;
  context.ball.position.y = scene.ballPosition.y;
  context.ball.position.z = scene.ballPosition.z || 0;
  context.ball.velocity.x = 0;
  context.ball.velocity.y = 0;
  context.ball.velocity.z = 0;
  for (var t = 0; t < scene.sceneTeams.length; t++) {
    var sceneTeam = scene.sceneTeams[t];
    for (var i = 0; i < sceneTeam.players.length; i++) {
      sceneTeam.players[i].position.x = sceneTeam.positions[i].x;
      sceneTeam.players[i].position.y = sceneTeam.positions[i].y;
      sceneTeam.players[i].velocity.x = 0;
      sceneTeam.players[i].velocity.y = 0;
    }
  }
};

RestartController.prototype._finishPositioning = function(context) {
  if (this._session == null) return;
  this._session.phase = "waitingForInput";
  if (this._session.strategy.onPositioned != null) {
    this._session.strategy.onPositioned(context, this._session.request);
  }
  var humanTaker = this._session.taker != null && this._session.taker.teamSide == "home" ?
    this._session.taker : null;
  context.humanController.selectPlayer(humanTaker);
};

RestartController.prototype._assignTeamAiStates = function(context) {
  for (var i = 0; i < context.teamAis.length; i++) {
    var teamAi = context.teamAis[i];
    teamAi.setRestartState(this._session.strategy.teamAiState(teamAi.team, this._session.request));
  }
};

RestartController.prototype._resume = function(context, direction) {
  if (!this._canResume()) return false;
  if (this._session.phase == "positioning") {
    this._positioningController.cancel(context);
    this._finishPositioning(context);
  }
  if (this._session.strategy.resume != null &&
      this._session.strategy.resume(context, this._session.request, direction) == false) {
    return false;
  }
  this._session.phase = "inProgress";
  return true;
};

RestartController.prototype._canResume = function() {
  if (this._session == null) return false;
  if (this._session.phase == "waitingForInput") return true;
  return this._session.phase == "positioning" &&
    this._session.strategy.allowEarlyResume == true &&
    this._positioningController.isReadyForInput();
};

RestartController.prototype.canResumeFromInput = function() {
  return !this._isDelayedOpponentRestart() && this._canResume();
};

RestartController.prototype.resumeFromInput = function(context, direction) {
  if (!this.canResumeFromInput()) return false;
  return this._resume(context, direction);
};

RestartController.prototype.simulationMode = function() {
  if (this._session == null) return "full";
  if (this._session.phase == "positioning") return "playersOnly";
  if (this._session.phase == "inProgress") return "full";
  if (this._session.phase == "waitingForInput" && this._isDelayedOpponentRestart()) {
    return "playersOnly";
  }
  return "none";
};

RestartController.prototype._isDelayedOpponentRestart = function() {
  return this._session != null && this._session.request.awardedTo != "home" &&
    (this._session.strategy.allowEarlyResume == true ||
      this._session.strategy.opponentAutoResumeAfterPositioning == true);
};

RestartController.prototype.canTeamMove = function(team) {
  if (this._session == null || this._session.phase != "inProgress") return false;
  return this._session.strategy.canTeamMove(team, this._session.request);
};

RestartController.prototype.attackTarget = function(team) {
  if (this._session == null || this._session.strategy.attackTarget == null) return null;
  return this._session.strategy.attackTarget(team, this._session.request);
};

RestartController.prototype.taker = function(team) {
  if (this._session == null || this._session.taker == null ||
      this._session.taker.teamSide != team.side) return null;
  return this._session.taker;
};

RestartController.prototype.positioningTargets = function(team) {
  if (this._session == null || this._session.positioningTeams == null) return null;
  for (var i = 0; i < this._session.positioningTeams.length; i++) {
    if (this._session.positioningTeams[i].side == team.side) {
      return this._session.positioningTeams[i].positions;
    }
  }
  return null;
};

RestartController.prototype.updateBeforePhysics = function(context) {
  if (this._session != null && this._session.phase == "positioning") {
    this._positioningController.updateBeforePhysics(context);
  }
};

RestartController.prototype.updateAfterPhysics = function(context, deltaSeconds) {
  if (this._session == null) return;
  if (this._session.phase == "positioning") {
    this._positioningController.updateAfterPhysics(context);
    if (this._session.phase == "waitingForInput" &&
        this._session.strategy.opponentAutoResumeAfterPositioning == true) {
      this._session.opponentReadyElapsed = 0;
      return;
    }
    this._resumeReadyRestart(context, deltaSeconds);
    return;
  }
  if (this._session.phase == "waitingForInput") {
    this._resumeReadyRestart(context, deltaSeconds);
    return;
  }
  if (this._session.phase != "inProgress") return;

  this._session.strategy.enforceRules(context, this._session.request);
  if (this._session.strategy.isComplete(context, this._session.request)) {
    this._session.phase = "complete";
  }
};

RestartController.prototype._resumeReadyRestart = function(context, deltaSeconds) {
  if (this._session == null) return false;
  if (this._session.request.awardedTo != "home") {
    var canAutoResume = this._session.strategy.allowEarlyResume == true ||
      this._session.strategy.opponentAutoResumeAfterPositioning == true;
    if (!canAutoResume) return false;
    if (this._session.strategy.opponentAutoResumeAfterPositioning == true &&
        this._session.phase == "positioning") {
      this._session.opponentReadyElapsed = 0;
      return false;
    }
    if (!this._canResume()) {
      this._session.opponentReadyElapsed = 0;
      return false;
    }
    this._session.opponentReadyElapsed += deltaSeconds || 0;
    var delay = Math.max(0, context.config.restarts.opponentDelaySeconds || 0);
    if (this._session.opponentReadyElapsed < delay) return false;
    return this._resume(context, null);
  }
  if (this._session.strategy.allowEarlyResume != true) return false;
  if (!this._canResume()) return false;
  if (context.humanController.hasMovementInput()) {
    return this._resume(context, context.humanController.inputDirection());
  }
  return false;
};

RestartController.prototype.isComplete = function() {
  return this._session != null && this._session.phase == "complete";
};

RestartController.prototype.clear = function() {
  this._session = null;
};

RestartController.prototype.type = function() {
  return this._session == null ? null : this._session.request.type;
};

RestartController.prototype.phase = function() {
  return this._session == null ? null : this._session.phase;
};
