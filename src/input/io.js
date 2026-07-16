var BrowserInput = function(game, eventTarget) {
  this.game = game;
  this.eventTarget = eventTarget;
  this.boundKeyHandler = this.handleKey.bind(this);
  this.boundTouchHandler = this.handleTouch.bind(this);
};

// Public API (underscore-prefixed members are private helpers)

BrowserInput.prototype.attach = function() {
  this.eventTarget.addEventListener("keydown", this.boundKeyHandler, false);
  this.eventTarget.addEventListener("keyup", this.boundKeyHandler, false);
  this.eventTarget.addEventListener("touchstart", this.boundTouchHandler, false);
};

BrowserInput.prototype.handleTouch = function(event) {
  if ((this.game.matchFlow.simulationMode() == "playersOnly" &&
      !this.game.restartController.canResumeFromInput()) || this.game.isPaused() ||
      this.game.isOutOfPlayPending()) return;
  var scaleBy = this.game.config.computeScaleBy();
  var target = new Vector2d(
    -this.game.camera.position.x + event.touches[0].clientX / scaleBy,
    -this.game.camera.position.y + event.touches[0].clientY / scaleBy
  );
  this.game.debugLog.recordTouchEvent(target);
  this.game.humanController.selectPlayer();
  this.game.humanController.setTouchTarget(target);
  this.game.resumeFromInput(new Vector2d(
    target.x - this.game.stadium.ball.position.x,
    target.y - this.game.stadium.ball.position.y
  ));
  this.applyHumanInput();
};

BrowserInput.prototype.handleKey = function(event) {
  this.game.debugLog.recordKeyEvent(event);
  this.game.humanController.setKey(event.keyCode, event.type == "keydown");
  if (event.type == "keydown") this.handleCommand(event.keyCode);
  if (this.game.humanController.hasMovementInput()) {
    this.game.resumeFromInput(this.game.humanController.inputDirection());
  }
  this.applyHumanInput();
};

BrowserInput.prototype.applyHumanInput = function() {
  if (this.game.isPaused() || this.game.matchFlow.simulationMode() == "playersOnly" ||
      this.game.isOutOfPlayPending()) return;
  this.game.humanController.selectPlayer();
  var canMove = !this.game.matchFlow.isRestartActive() ||
    this.game.restartController.canTeamMove(this.game.teams[0]);
  this.game.humanController.update(canMove);
};

BrowserInput.prototype.handleCommand = function(keyCode) {
  if (keyCode == 70) this.game.camera.showStats = !this.game.camera.showStats;
  if (keyCode == 81) this.game.config.viewport.ratio /= 1.2;
  if (keyCode == 87) this.game.config.viewport.ratio *= 1.2;
  if (keyCode == 67 && this.game.config.debug.enabled == true &&
      !this.game.isOutOfPlayPending()) {
    var cornerX = this.game.stadium.ball.position.x <=
      this.game.config.pitch.initialBallPosition.x ?
      this.game.config.pitch.fieldLeft : this.game.config.pitch.fieldRight;
    this.game.beginRestart("corner", "home", {
      boundary: "top",
      position: new Vector2d(cornerX, this.game.config.pitch.fieldTop)
    });
  }
  if (keyCode == 191 && this.game.config.debug.enabled == true) {
    this.game.togglePause();
    this.game.debugLog.dump();
  }
};
