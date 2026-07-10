var IndividualAi = function(config, team, player) {
  this.config = config;
  this.team = team;
  this.player = player;
  this.command = "inactive";
  this.commandState = "stopped";
  this.target = null;
  this.sPos = null;
  this.tPos = null;
  this.attackOrbitDir = 0;
};

IndividualAi.prototype.setCommand = function(command, target) {
  if (this.command != command && this.command == "attackBall") {
    this.attackOrbitDir = 0;
  }
  this.command = command;
  this.target = target || null;
};

IndividualAi.prototype.update = function(context) {
  if (this.command == "inactive") {
    this.commandState = "stopped";
    this.sPos = null;
    this.tPos = null;
    return;
  }

  var target = this.target;
  if (this.command == "attackBall") {
    this.updateAttackBall(context);
    return;
  }

  if (target == null) {
    this.stop();
    return;
  }

  this.moveTo(target);
};

IndividualAi.prototype.updateAttackBall = function(context) {
  var target = this.attackBallTarget(context);
  this.moveTo(target, this.commandState);
};

IndividualAi.prototype.attackBallTarget = function(context) {
  var ball = context.ball;
  var toGoal = this.toOpponentGoal(ball.position);
  var aligned = this.isAlignedBehindBall(ball.position, toGoal);
  if (aligned) {
    this.attackOrbitDir = 0;
    this.commandState = "shoot";
    return new Vector2d(
      ball.position.x + toGoal.x * this.config.aiAttackRunThroughDistance,
      ball.position.y + toGoal.y * this.config.aiAttackRunThroughDistance
    );
  }

  if (MathLib.computeDistance(this.player.position, ball.position) <= this.config.aiAttackCloseDistance) {
    this.commandState = "detour";
    return this.attackDetourTarget(ball.position, toGoal);
  }

  this.attackOrbitDir = 0;
  this.commandState = "approach";
  return new Vector2d(
    ball.position.x - toGoal.x * this.config.aiAttackSetupDistance,
    ball.position.y - toGoal.y * this.config.aiAttackSetupDistance
  );
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
  var d = Math.sqrt(dx * dx + dy * dy) || 1;
  return new Vector2d(dx / d, dy / d);
};

IndividualAi.prototype.isAlignedBehindBall = function(ballPosition, toGoal) {
  var dx = this.player.position.x - ballPosition.x;
  var dy = this.player.position.y - ballPosition.y;
  if (dx * dx + dy * dy < 0.0001) {
    return false;
  }
  var anglePlayer = Math.atan2(dy, dx);
  var angleBehind = Math.atan2(-toGoal.y, -toGoal.x);
  return Math.abs(this.angleDelta(angleBehind, anglePlayer)) <= this.config.aiAttackAimToleranceRadians;
};

IndividualAi.prototype.attackDetourTarget = function(ballPosition, toGoal) {
  var dx = this.player.position.x - ballPosition.x;
  var dy = this.player.position.y - ballPosition.y;
  var anglePlayer = Math.atan2(dy, dx);
  var angleBehind = Math.atan2(-toGoal.y, -toGoal.x);
  var delta = this.angleDelta(angleBehind, anglePlayer);
  var absDelta = Math.abs(delta);

  if (this.attackOrbitDir === 0) {
    this.attackOrbitDir = delta >= 0 ? 1 : -1;
  } else if (absDelta < this.config.aiAttackOrbitCommitAngle) {
    var wanted = delta >= 0 ? 1 : -1;
    if (wanted !== this.attackOrbitDir) {
      this.attackOrbitDir = wanted;
    }
  }

  var step = Math.min(this.config.aiAttackDetourStepRadians, absDelta);
  var angle = anglePlayer + this.attackOrbitDir * step;
  var radius = this.config.aiAttackDetourRadius;
  return new Vector2d(
    ballPosition.x + Math.cos(angle) * radius,
    ballPosition.y + Math.sin(angle) * radius
  );
};

IndividualAi.prototype.angleDelta = function(targetAngle, currentAngle) {
  var delta = targetAngle - currentAngle;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return delta;
};

IndividualAi.prototype.moveTo = function(target, movingState) {
  this.sPos = this.player.position;
  this.tPos = target;

  var dx = target.x - this.player.position.x;
  var dy = target.y - this.player.position.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= this.config.aiTargetReachedRadius) {
    this.stop(movingState);
    return;
  }

  var speed = this.config.teamVelocity(this.team.side);
  this.commandState = movingState || "moving";
  this.player.velocity.x = dx / distance * speed;
  this.player.velocity.y = dy / distance * speed;
};

IndividualAi.prototype.stop = function(state) {
  this.commandState = state || "stopped";
  this.player.velocity.x = 0;
  this.player.velocity.y = 0;
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
  return {
    command: this.command,
    state: this.commandState,
    target: this.tPos,
    attackOrbitDir: this.attackOrbitDir
  };
};
