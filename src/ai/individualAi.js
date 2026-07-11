var IndividualAi = function(config, team, player) {
  this.config = config;
  this.team = team;
  this.player = player;
  this.command = "inactive";
  this.target = null;
  this.sPos = null;
  this.tPos = null;
  this.commands = createIndividualAiCommandRegistry();
  this.activeCommand = this.commands[this.command];
};

IndividualAi.prototype.setCommand = function(command, target) {
  if (this.command != command && this.activeCommand != null && this.activeCommand.reset != null) {
    this.activeCommand.reset(this);
  }
  this.command = command;
  this.target = target || null;
  this.activeCommand = this.commands[this.command] || null;
};

IndividualAi.prototype.update = function(context) {
  if (this.activeCommand == null) {
    this.stop();
    return;
  }

  this.activeCommand.update(this, context);
};

IndividualAi.prototype.toOpponentGoal = function(ballPosition) {
  var goal;
  if (this.team.side == "home") {
    goal = new Vector2d(
      (this.config.goalTopTopLeft.x + this.config.goalTopTopRight.x) / 2,
      (this.config.goalTopTopLeft.y + this.config.goalTopBottomLeft.y) / 2
    );
  } else {
    goal = new Vector2d(
      (this.config.goalBottomTopLeft.x + this.config.goalBottomTopRight.x) / 2,
      (this.config.goalBottomTopLeft.y + this.config.goalBottomBottomLeft.y) / 2
    );
  }

  var dx = goal.x - ballPosition.x;
  var dy = goal.y - ballPosition.y;
  return MathLib.normalizeVector(dx, dy, 0, 1);
};

IndividualAi.prototype.isAlignedBehindBall = function(ballPosition, toGoal) {
  var dx = this.player.position.x - ballPosition.x;
  var dy = this.player.position.y - ballPosition.y;
  if (dx * dx + dy * dy < 0.0001) {
    return false;
  }
  var anglePlayer = MathLib.computeAngleRadians(dx, dy);
  var angleBehind = MathLib.computeAngleRadians(-toGoal.x, -toGoal.y);
  return Math.abs(MathLib.angleDeltaRadians(angleBehind, anglePlayer)) <= this.config.aiAttackAimToleranceRadians;
};

IndividualAi.prototype.moveTo = function(target) {
  this.sPos = this.player.position;
  this.tPos = target;

  var dx = target.x - this.player.position.x;
  var dy = target.y - this.player.position.y;
  var distance = MathLib.vectorLength(dx, dy);
  if (distance <= this.config.aiTargetReachedRadius) {
    return this.stop();
  }

  var speed = this.config.teamVelocity(this.team.side);
  this.player.velocity.x = dx / distance * speed;
  this.player.velocity.y = dy / distance * speed;
  return "moving";
};

IndividualAi.prototype.stop = function() {
  this.player.velocity.x = 0;
  this.player.velocity.y = 0;
  return "stopped";
};

IndividualAi.prototype.draw = function(ctx) {
  if (this.sPos != null && this.tPos != null) {
    ctx.beginPath();
    ctx.moveTo(this.sPos.x, this.sPos.y);
    ctx.lineTo(this.tPos.x, this.tPos.y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "blue";
    ctx.stroke();
  }
};

IndividualAi.prototype.debugSnapshot = function() {
  var snapshot = {
    command: this.command,
    state: this.activeCommand != null ? this.activeCommand.state : "stopped",
    target: this.tPos
  };
  if (this.activeCommand != null && this.activeCommand.debugSnapshot != null) {
    var commandSnapshot = this.activeCommand.debugSnapshot(this);
    for (var key in commandSnapshot) {
      snapshot[key] = commandSnapshot[key];
    }
  }
  return snapshot;
};
