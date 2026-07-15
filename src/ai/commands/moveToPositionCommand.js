var MoveToPositionCommand = function() {
  this.state = "stopped";
};

MoveToPositionCommand.prototype.reset = function() {
  this.state = "stopped";
};

MoveToPositionCommand.prototype.update = function(ai) {
  if (ai.target == null) {
    this.state = ai.stop();
    return;
  }

  this.state = ai.moveToFormationPosition(ai.target, this.state == "stopped");
};
