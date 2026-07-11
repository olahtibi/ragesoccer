var InactiveCommand = function() {
};

InactiveCommand.prototype.update = function(ai) {
  ai.commandState = "stopped";
  ai.sPos = null;
  ai.tPos = null;
};
