var InactiveCommand = function() {
  this.state = "stopped";
};

// Public API (underscore-prefixed members are private helpers)

InactiveCommand.prototype.update = function(ai) {
  this.state = "stopped";
  ai.sPos = null;
  ai.tPos = null;
};
