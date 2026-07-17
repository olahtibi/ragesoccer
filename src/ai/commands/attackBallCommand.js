var AttackBallCommand = function() {
  this.state = "stopped";
  this.attackOrbitDir = 0;
  this.correctingAim = false;
};

// Public API (underscore-prefixed members are private helpers)

AttackBallCommand.prototype.reset = function() {
  this.state = "stopped";
  this.attackOrbitDir = 0;
  this.correctingAim = false;
};

AttackBallCommand.prototype.update = function(ai, context) {
  var target = this._attackBallTarget(ai, context);
  var reachedRadius = this.correctingAim ?
    ai.config.ai.attackCorrectionReachedRadius : null;
  ai.moveTo(target, reachedRadius);
};

AttackBallCommand.prototype._attackBallTarget = function(ai, context) {
  var ball = context.ball;
  var toTarget = context.attackTarget == null ? ai.toOpponentGoal(ball.position) :
    MathLib.normalizeVector(
      context.attackTarget.x - ball.position.x,
      context.attackTarget.y - ball.position.y,
      0,
      ai.team.side == "home" ? -1 : 1
    );
  var wasShooting = this.state == "shoot";
  var aimError = this._attackAimError(ai, ball.position, toTarget);
  var alignmentTolerance = wasShooting ?
    ai.config.ai.attackAimReleaseToleranceRadians : ai.config.ai.attackAimToleranceRadians;
  if (aimError <= alignmentTolerance) {
    this.state = "shoot";
    if (wasShooting && aimError > ai.config.ai.attackAimToleranceRadians) {
      this.correctingAim = true;
    }
    if (this.correctingAim && aimError > ai.config.ai.attackAimCorrectionToleranceRadians) {
      return this._attackDetourTarget(ai, ball.position, toTarget);
    }
    this.correctingAim = false;
    this.attackOrbitDir = 0;
    return new Vector2d(
      ball.position.x + toTarget.x * ai.config.ai.attackRunThroughDistance,
      ball.position.y + toTarget.y * ai.config.ai.attackRunThroughDistance
    );
  }

  this.correctingAim = false;
  if (MathLib.computeDistance(ai.player.position, ball.position) <= ai.config.ai.attackCloseDistance) {
    this.state = "detour";
    return this._attackDetourTarget(ai, ball.position, toTarget);
  }

  this.attackOrbitDir = 0;
  this.state = "approach";
  return new Vector2d(
    ball.position.x - toTarget.x * ai.config.ai.attackSetupDistance,
    ball.position.y - toTarget.y * ai.config.ai.attackSetupDistance
  );
};

AttackBallCommand.prototype._attackAimError = function(ai, ballPosition, toTarget) {
  var dx = ai.player.position.x - ballPosition.x;
  var dy = ai.player.position.y - ballPosition.y;
  if (dx * dx + dy * dy < 0.0001) {
    return Math.PI;
  }
  var anglePlayer = MathLib.computeAngleRadians(dx, dy);
  var angleBehind = MathLib.computeAngleRadians(-toTarget.x, -toTarget.y);
  return Math.abs(MathLib.angleDeltaRadians(angleBehind, anglePlayer));
};

AttackBallCommand.prototype._attackDetourTarget = function(ai, ballPosition, toGoal) {
  var dx = ai.player.position.x - ballPosition.x;
  var dy = ai.player.position.y - ballPosition.y;
  var anglePlayer = MathLib.computeAngleRadians(dx, dy);
  var angleBehind = MathLib.computeAngleRadians(-toGoal.x, -toGoal.y);
  var delta = MathLib.angleDeltaRadians(angleBehind, anglePlayer);
  var absDelta = Math.abs(delta);

  if (this.attackOrbitDir === 0) {
    this.attackOrbitDir = delta >= 0 ? 1 : -1;
  } else if (absDelta < ai.config.ai.attackOrbitCommitAngle) {
    var wanted = delta >= 0 ? 1 : -1;
    if (wanted !== this.attackOrbitDir) {
      this.attackOrbitDir = wanted;
    }
  }

  var step = Math.min(ai.config.ai.attackDetourStepRadians, absDelta);
  var angle = anglePlayer + this.attackOrbitDir * step;
  var radius = ai.config.ai.attackDetourRadius;
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
