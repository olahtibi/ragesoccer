var AttackBallCommand = function() {
  this.state = "stopped";
  this.attackOrbitDir = 0;
  this.correctingAim = false;
};

AttackBallCommand.prototype.reset = function() {
  this.state = "stopped";
  this.attackOrbitDir = 0;
  this.correctingAim = false;
};

AttackBallCommand.prototype.update = function(ai, context) {
  var target = this.attackBallTarget(ai, context);
  var reachedRadius = this.correctingAim ?
    ai.config.aiAttackCorrectionReachedRadius : null;
  ai.moveTo(target, reachedRadius);
};

AttackBallCommand.prototype.attackBallTarget = function(ai, context) {
  var ball = context.ball;
  var toTarget = context.attackTarget == null ? ai.toOpponentGoal(ball.position) :
    MathLib.normalizeVector(
      context.attackTarget.x - ball.position.x,
      context.attackTarget.y - ball.position.y,
      0,
      ai.team.side == "home" ? -1 : 1
    );
  var wasShooting = this.state == "shoot";
  var aimError = this.attackAimError(ai, ball.position, toTarget);
  var alignmentTolerance = wasShooting ?
    ai.config.aiAttackAimReleaseToleranceRadians : ai.config.aiAttackAimToleranceRadians;
  if (aimError <= alignmentTolerance) {
    this.state = "shoot";
    if (wasShooting && aimError > ai.config.aiAttackAimToleranceRadians) {
      this.correctingAim = true;
    }
    if (this.correctingAim && aimError > ai.config.aiAttackAimCorrectionToleranceRadians) {
      return this.attackDetourTarget(ai, ball.position, toTarget);
    }
    this.correctingAim = false;
    this.attackOrbitDir = 0;
    return new Vector2d(
      ball.position.x + toTarget.x * ai.config.aiAttackRunThroughDistance,
      ball.position.y + toTarget.y * ai.config.aiAttackRunThroughDistance
    );
  }

  this.correctingAim = false;
  if (MathLib.computeDistance(ai.player.position, ball.position) <= ai.config.aiAttackCloseDistance) {
    this.state = "detour";
    return this.attackDetourTarget(ai, ball.position, toTarget);
  }

  this.attackOrbitDir = 0;
  this.state = "approach";
  return new Vector2d(
    ball.position.x - toTarget.x * ai.config.aiAttackSetupDistance,
    ball.position.y - toTarget.y * ai.config.aiAttackSetupDistance
  );
};

AttackBallCommand.prototype.attackAimError = function(ai, ballPosition, toTarget) {
  var dx = ai.player.position.x - ballPosition.x;
  var dy = ai.player.position.y - ballPosition.y;
  if (dx * dx + dy * dy < 0.0001) {
    return Math.PI;
  }
  var anglePlayer = MathLib.computeAngleRadians(dx, dy);
  var angleBehind = MathLib.computeAngleRadians(-toTarget.x, -toTarget.y);
  return Math.abs(MathLib.angleDeltaRadians(angleBehind, anglePlayer));
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
    attackOrbitDir: this.attackOrbitDir,
    correctingAim: this.correctingAim
  };
};
