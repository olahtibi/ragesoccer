var InactiveCommand = function() {
  this.state = "stopped";
};

InactiveCommand.prototype.update = function(ai) {
  this.state = "stopped";
  ai.sPos = null;
  ai.tPos = null;
};
