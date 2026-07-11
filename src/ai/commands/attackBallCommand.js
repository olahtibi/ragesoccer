var AttackBallCommand = function() {
  this.state = "stopped";
  this.attackOrbitDir = 0;
};

AttackBallCommand.prototype.reset = function() {
  this.state = "stopped";
  this.attackOrbitDir = 0;
};

AttackBallCommand.prototype.update = function(ai, context) {
  var target = this.attackBallTarget(ai, context);
  ai.moveTo(target);
};

AttackBallCommand.prototype.attackBallTarget = function(ai, context) {
  var ball = context.ball;
  var toGoal = ai.toOpponentGoal(ball.position);
  var aligned = ai.isAlignedBehindBall(ball.position, toGoal);
  if (aligned) {
    this.attackOrbitDir = 0;
    this.state = "shoot";
    return new Vector2d(
      ball.position.x + toGoal.x * ai.config.aiAttackRunThroughDistance,
      ball.position.y + toGoal.y * ai.config.aiAttackRunThroughDistance
    );
  }

  if (MathLib.computeDistance(ai.player.position, ball.position) <= ai.config.aiAttackCloseDistance) {
    this.state = "detour";
    return this.attackDetourTarget(ai, ball.position, toGoal);
  }

  this.attackOrbitDir = 0;
  this.state = "approach";
  return new Vector2d(
    ball.position.x - toGoal.x * ai.config.aiAttackSetupDistance,
    ball.position.y - toGoal.y * ai.config.aiAttackSetupDistance
  );
};

AttackBallCommand.prototype.attackDetourTarget = function(ai, ballPosition, toGoal) {
  var dx = ai.player.position.x - ballPosition.x;
  var dy = ai.player.position.y - ballPosition.y;
  var anglePlayer = MathLib.computeAngleRadians(dx, dy);
  var angleBehind = MathLib.computeAngleRadians(-toGoal.x, -toGoal.y);
  var delta = MathLib.angleDeltaRadians(angleBehind, anglePlayer);
  var absDelta = Math.abs(delta);

  if (this.attackOrbitDir === 0) {
    this.attackOrbitDir = delta >= 0 ? 1 : -1;
  } else if (absDelta < ai.config.aiAttackOrbitCommitAngle) {
    var wanted = delta >= 0 ? 1 : -1;
    if (wanted !== this.attackOrbitDir) {
      this.attackOrbitDir = wanted;
    }
  }

  var step = Math.min(ai.config.aiAttackDetourStepRadians, absDelta);
  var angle = anglePlayer + this.attackOrbitDir * step;
  var radius = ai.config.aiAttackDetourRadius;
  var offset = MathLib.vectorFromAngleRadians(angle, radius);
  return new Vector2d(ballPosition.x + offset.x, ballPosition.y + offset.y);
};

AttackBallCommand.prototype.debugSnapshot = function() {
  return {
    state: this.state,
    attackOrbitDir: this.attackOrbitDir
  };
};
