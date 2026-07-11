var MoveToPositionCommand = function() {
};

MoveToPositionCommand.prototype.update = function(ai) {
  if (ai.target == null) {
    ai.stop();
    return;
  }

  ai.moveTo(ai.target);
};
