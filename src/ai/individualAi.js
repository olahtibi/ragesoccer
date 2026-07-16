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
  this.formationPaceMultiplier = 1;
};

// Public API (underscore-prefixed members are private helpers)

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
      (this.config.pitch.goalTopTopLeft.x + this.config.pitch.goalTopTopRight.x) / 2,
      (this.config.pitch.goalTopTopLeft.y + this.config.pitch.goalTopBottomLeft.y) / 2
    );
  } else {
    goal = new Vector2d(
      (this.config.pitch.goalBottomTopLeft.x + this.config.pitch.goalBottomTopRight.x) / 2,
      (this.config.pitch.goalBottomTopLeft.y + this.config.pitch.goalBottomBottomLeft.y) / 2
    );
  }

  var dx = goal.x - ballPosition.x;
  var dy = goal.y - ballPosition.y;
  return MathLib.normalizeVector(dx, dy, 0, 1);
};

IndividualAi.prototype.isAlignedBehindBall = function(ballPosition, toGoal, tolerance) {
  var dx = this.player.position.x - ballPosition.x;
  var dy = this.player.position.y - ballPosition.y;
  if (dx * dx + dy * dy < 0.0001) {
    return false;
  }
  var anglePlayer = MathLib.computeAngleRadians(dx, dy);
  var angleBehind = MathLib.computeAngleRadians(-toGoal.x, -toGoal.y);
  tolerance = tolerance == null ? this.config.ai.attackAimToleranceRadians : tolerance;
  return Math.abs(MathLib.angleDeltaRadians(angleBehind, anglePlayer)) <= tolerance;
};

IndividualAi.prototype.moveTo = function(target, targetReachedRadius) {
  this.sPos = this.player.position;
  this.tPos = target;

  var dx = target.x - this.player.position.x;
  var dy = target.y - this.player.position.y;
  var distance = MathLib.vectorLength(dx, dy);
  var reachedRadius = targetReachedRadius == null ?
    this.config.ai.targetReachedRadius : targetReachedRadius;
  if (distance <= reachedRadius) {
    return this.stop();
  }

  var speed = this.config.teamVelocity(this.team.side);
  this.player.velocity.x = dx / distance * speed;
  this.player.velocity.y = dy / distance * speed;
  return "moving";
};

IndividualAi.prototype.moveToFormationPosition = function(target, resumeFromStop) {
  this.sPos = this.player.position;
  this.tPos = target;

  var dx = target.x - this.player.position.x;
  var dy = target.y - this.player.position.y;
  var distance = MathLib.vectorLength(dx, dy);
  var deadband = this.config.ai.targetDeadband || this.config.ai.targetReachedRadius;
  var resumeRadius = this.config.ai.targetResumeRadius || deadband;
  var reachedRadius = resumeFromStop ? Math.max(deadband, resumeRadius) : deadband;
  if (distance <= reachedRadius) {
    return this.stop();
  }

  var arrivalRadius = this.config.ai.arrivalSlowRadius || 0;
  var arrivalFactor = 1;
  if (arrivalRadius > 0 && distance < arrivalRadius) {
    var minFactor = this.config.ai.arrivalMinSpeedFactor || 0;
    arrivalFactor = minFactor + (1 - minFactor) * distance / arrivalRadius;
  }

  var speed = this.config.teamVelocity(this.team.side) *
    this.formationPaceMultiplier * arrivalFactor;
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
