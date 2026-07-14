var MatchFlow = function(restartController) {
  this.restartController = restartController;
  this.state = "normalPlay";
  this.stateBeforePause = null;
};

MatchFlow.prototype.beginRestart = function(request, context, options) {
  if (this.state == "paused") return false;
  if (this.state == "restart" && this.restartController.phase() == "positioning") return false;
  if (!this.restartController.begin(request, context, options)) {
    return false;
  }
  this.state = "restart";
  return true;
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

MatchFlow.prototype.resumeFromInput = function() {
  if (this.state == "restart") {
    return this.restartController.resume();
  }
  return this.state == "normalPlay";
};

MatchFlow.prototype.simulationMode = function() {
  if (this.state == "paused") return "none";
  if (this.state == "normalPlay") return "full";
  return this.restartController.simulationMode();
};

MatchFlow.prototype.updateAfterPhysics = function(context) {
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
