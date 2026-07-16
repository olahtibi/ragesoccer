var MatchFlow = function(restartController, boundaryDetector) {
  this.restartController = restartController;
  this._boundaryDetector = boundaryDetector;
  this._outOfPlay = null;
  this.state = "normalPlay";
  this.stateBeforePause = null;
};

// Public API (underscore-prefixed members are private helpers)

MatchFlow.prototype.beginRestart = function(request, context, options) {
  if (this.state == "paused" || this.state == "outOfPlay") return false;
  if (this.state == "restart" && this.restartController.phase() == "positioning") return false;
  return this._startRestart(request, context, options);
};

MatchFlow.prototype.pause = function() {
  if (this.state == "paused") return;
  this.stateBeforePause = this.state;
  this.state = "paused";
};

MatchFlow.prototype.resume = function() {
  if (this.state != "paused") return;
  this.state = this.stateBeforePause || "normalPlay";
  this.stateBeforePause = null;
};

MatchFlow.prototype.resumeFromInput = function(context, direction) {
  if (this.state == "restart") {
    return this.restartController.resumeFromInput(context, direction);
  }
  return this.state == "normalPlay";
};

MatchFlow.prototype.simulationMode = function() {
  if (this.state == "paused") return "none";
  if (this.state == "normalPlay") return "full";
  if (this.state == "outOfPlay") return "ballOnly";
  return this.restartController.simulationMode();
};

MatchFlow.prototype.updateBeforePhysics = function(context) {
  if (this.state != "restart") return;
  this.restartController.updateBeforePhysics(context);
};

MatchFlow.prototype.updateAfterPhysics = function(context) {
  if (this.state == "outOfPlay") {
    this._updateOutOfPlay(context);
    return;
  }
  if (this.state != "restart") return;
  this.restartController.updateAfterPhysics(context);
  if (this.restartController.isComplete()) {
    this.state = "normalPlay";
    this.restartController.clear();
  }
};

MatchFlow.prototype.isPaused = function() {
  return this.state == "paused";
};

MatchFlow.prototype.isRestartActive = function() {
  return this.state == "restart";
};

MatchFlow.prototype.isOutOfPlay = function() {
  return this.state == "outOfPlay" ||
    (this.state == "paused" && this.stateBeforePause == "outOfPlay");
};

MatchFlow.prototype.detectOutOfPlay = function(context) {
  if (this.state == "paused" || this.state == "outOfPlay") return false;
  var event = this._boundaryDetector.update();
  if (event == null) return false;
  if (event.lastTouchedBy == null) {
    this._restoreBall(context.ball, event.lastInBounds);
    this._boundaryDetector.reset();
    return false;
  }

  this._outOfPlay = { event: event, elapsed: 0 };
  this._stopPlayers(context.stadium.players);
  this.state = "outOfPlay";
  return true;
};

// Private helpers

MatchFlow.prototype._startRestart = function(request, context, options) {
  if (!this.restartController.begin(request, context, options)) return false;
  this.state = "restart";
  return true;
};

MatchFlow.prototype._restoreBall = function(ball, position) {
  ball.position.x = position.x;
  ball.position.y = position.y;
  ball.position.z = 0;
  ball.velocity.x = 0;
  ball.velocity.y = 0;
  ball.velocity.z = 0;
};

MatchFlow.prototype._stopPlayers = function(players) {
  for (var i = 0; i < players.length; i++) {
    players[i].velocity.x = 0;
    players[i].velocity.y = 0;
  }
};

MatchFlow.prototype._updateOutOfPlay = function(context) {
  if (this._outOfPlay == null) return false;
  this._outOfPlay.elapsed += context.game.physics.lastDt || 0;
  if (this._outOfPlay.elapsed < context.config.restarts.outOfPlayDelaySeconds) return false;
  return this._beginOutOfPlayRestart(context);
};

MatchFlow.prototype._beginOutOfPlayRestart = function(context) {
  var event = this._outOfPlay.event;
  var request = this._restartRequestForBoundary(event);
  if (!this._startRestart(request, context)) return false;
  this._outOfPlay = null;
  return true;
};

MatchFlow.prototype._restartRequestForBoundary = function(event) {
  var awardedTo;
  var type;
  if (event.boundary == "left" || event.boundary == "right") {
    type = "throwIn";
    awardedTo = event.lastTouchedBy == "home" ? "away" : "home";
  } else {
    var defendingSide = event.boundary == "top" ? "away" : "home";
    var attackingSide = defendingSide == "home" ? "away" : "home";
    if (event.lastTouchedBy == attackingSide) {
      type = "goalKick";
      awardedTo = defendingSide;
    } else {
      type = "corner";
      awardedTo = attackingSide;
    }
  }
  return {
    type: type,
    awardedTo: awardedTo,
    boundary: event.boundary,
    position: event.position
  };
};
