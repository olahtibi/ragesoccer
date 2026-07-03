var Ai = function (config, stadium, level) {
    this.config = config;
    this.stadium = stadium;
    this.level = level;
    // Level 1 → 41 px/s (below human 50). Level 4 → 56 px/s (a bit above).
    this.speed = 36 + level * 5;

    // Away plays against the top goal (defends it) and shoots at the bottom goal.
    this.ownGoalCenter = new Vector2d(
        (config.goalTopTopLeft.x + config.goalTopBottomRight.x) / 2,
        (config.goalTopTopLeft.y + config.goalTopBottomRight.y) / 2
    );
    this.oppGoalCenter = new Vector2d(
        (config.goalBottomTopLeft.x + config.goalBottomBottomRight.x) / 2,
        (config.goalBottomTopLeft.y + config.goalBottomBottomRight.y) / 2
    );

    this.contactDist = config.ballRadius + config.playerRadius;
    this.guardDistance = 30;          // How far in front of own goal the AI holds its defensive line.
    this.runThroughDistance = 18;     // How far past the ball the AI aims when shooting.
    this.detourStep = Math.PI / 6;    // Max angular step per frame when arcing around the ball (30°).
    this.detourRadius = this.contactDist + 4; // Radius of the arc waypoint around the ball.
    this.shootAngleTolerance = 0.15;  // Angular alignment needed (radians) before switching to shooting.
    this.orbitCommitAngle = Math.PI - 0.3; // Hysteresis: don't flip orbit direction near the exact opposite.
    this.orbitDir = 0;                // -1 or +1 once we've committed to a way around the ball.
    this.raceMargin = 0.08;           // seconds of slack before we concede the ball race.
    this.ownGoalDangerRadius = 130;   // Any ball closer than this to our goal is a threat.
    this.ownGoalDangerSpeed = 20;     // Or a ball moving into our goal faster than this.
    this.maxLookaheadSeconds = 1.5;

    this.state = 'idle';
    this.sPos = null;
    this.tPos = null;
};

Ai.prototype.update = function() {
    if (!(window.game != null && window.game.started == true && !window.game.isPaused())) {
        return;
    }
    var me = this.stadium.playerAway;
    var human = this.stadium.playerHome;

    var tMe = this.timeToReach(me.position);
    var tHuman = this.timeToReach(human.position);
    var threat = this.isBallThreateningOwnGoal();

    var target;
    if (threat && tHuman + this.raceMargin < tMe) {
        this.state = 'defend';
        target = this.defensePoint();
    } else if (tMe <= tHuman + this.raceMargin) {
        this.state = 'attack';
        target = this.attackTarget(me);
    } else {
        this.state = 'intercept';
        target = this.predictBallPos(Math.min(tMe, this.maxLookaheadSeconds));
    }
    // Reset the committed orbit direction whenever we leave the attack state
    // so we don't inherit a stale side next time we're back on the ball.
    if (this.state !== 'attack') {
        this.orbitDir = 0;
    }

    this.moveTo(target);
};

Ai.prototype.moveTo = function(target) {
    var me = this.stadium.playerAway;
    this.sPos = me.position;
    this.tPos = target;
    var dx = target.x - me.position.x;
    var dy = target.y - me.position.y;
    var d2 = dx * dx + dy * dy;
    // Snap velocity to zero once we're on top of the target, so the AI doesn't
    // jitter around it and doesn't accidentally kick a ball it's parked next to.
    if (d2 < 0.5) {
        me.velocity.x = 0;
        me.velocity.y = 0;
        return;
    }
    var d = Math.sqrt(d2);
    me.velocity.x = dx / d * this.speed;
    me.velocity.y = dy / d * this.speed;
};

// Ball position `t` seconds from now, assuming only exponential rolling friction.
// Matches the ground-friction model used in Physics.updateBallPosition.
Ai.prototype.predictBallPos = function(t) {
    if (t <= 0) return new Vector2d(this.stadium.ball.position.x, this.stadium.ball.position.y);
    var ball = this.stadium.ball;
    var mu = this.config.ballFriction || 1.6;
    var travel = (1 - Math.exp(-mu * t)) / mu;
    return new Vector2d(
        ball.position.x + ball.velocity.x * travel,
        ball.position.y + ball.velocity.y * travel
    );
};

// Fixed-point iteration for the earliest interception time from `pos` at our speed.
Ai.prototype.timeToReach = function(pos) {
    var t = 0;
    for (var i = 0; i < 5; i++) {
        var bp = this.predictBallPos(t);
        var dx = bp.x - pos.x;
        var dy = bp.y - pos.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        var newT = d / this.speed;
        if (Math.abs(newT - t) < 0.01) {
            t = newT;
            break;
        }
        t = newT;
    }
    return Math.min(t, this.maxLookaheadSeconds);
};

Ai.prototype.isBallThreateningOwnGoal = function() {
    var ball = this.stadium.ball;
    var dx = this.ownGoalCenter.x - ball.position.x;
    var dy = this.ownGoalCenter.y - ball.position.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var speedTowardOwnGoal = (ball.velocity.x * dx + ball.velocity.y * dy) / d;
    if (speedTowardOwnGoal > this.ownGoalDangerSpeed) return true;
    if (d < this.ownGoalDangerRadius) return true;
    return false;
};

// Goalie spot on the line own_goal → ball, at guardDistance from the goal.
// From this spot any contact sends the ball outward, away from our goal.
Ai.prototype.defensePoint = function() {
    var predicted = this.predictBallPos(0.2);
    var dx = predicted.x - this.ownGoalCenter.x;
    var dy = predicted.y - this.ownGoalCenter.y;
    var d = Math.sqrt(dx * dx + dy * dy) || 1;
    var guard = this.guardDistance;
    // Never overshoot the ball: cap the guard distance at ball-distance minus a hair.
    var maxGuard = d - this.contactDist - 1;
    if (guard > maxGuard) guard = Math.max(5, maxGuard);
    return new Vector2d(
        this.ownGoalCenter.x + dx / d * guard,
        this.ownGoalCenter.y + dy / d * guard
    );
};

// Attacking target: either swing around to the "behind ball" side (relative to
// the opponent goal), or, once we're there, run through the ball toward the goal.
Ai.prototype.attackTarget = function(me) {
    var ball = this.stadium.ball;
    var toGoalX = this.oppGoalCenter.x - ball.position.x;
    var toGoalY = this.oppGoalCenter.y - ball.position.y;
    var goalDist = Math.sqrt(toGoalX * toGoalX + toGoalY * toGoalY) || 1;
    var ux = toGoalX / goalDist;
    var uy = toGoalY / goalDist;

    var meBallX = me.position.x - ball.position.x;
    var meBallY = me.position.y - ball.position.y;

    // Angular alignment around the ball: 0 rad means "exactly behind the ball"
    // (opposite the goal). This is what actually controls shot accuracy.
    var angleMe = Math.atan2(meBallY, meBallX);
    var angleBehind = Math.atan2(-uy, -ux);
    var delta = angleBehind - angleMe;
    if (delta > Math.PI) delta -= 2 * Math.PI;
    if (delta < -Math.PI) delta += 2 * Math.PI;
    var absDelta = Math.abs(delta);

    if (absDelta < this.shootAngleTolerance) {
        // Cleanly lined up behind the ball → sprint straight through it toward
        // the goal. The contact normal at collision is essentially goal-ward,
        // so the physics impulse sends the ball at the goal.
        this.orbitDir = 0;
        return new Vector2d(
            ball.position.x + ux * this.runThroughDistance,
            ball.position.y + uy * this.runThroughDistance
        );
    }

    // Otherwise: arc around the ball on an escort circle. Two things matter
    // to avoid the jitter/clipping you saw:
    //   (1) The waypoint is placed at radius R / cos(step). This is the exact
    //       correction that makes AI motion tangent to the escort circle at
    //       its current position, so the AI does NOT spiral inward and clip
    //       the ball while turning.
    //   (2) We commit to a rotation direction and only flip it when the
    //       target angle is clearly on the other side, avoiding a sign flip
    //       when delta ≈ ±π (which is what caused the visible jitter near
    //       the goal-side of the ball).
    if (this.orbitDir === 0) {
        this.orbitDir = (delta >= 0) ? 1 : -1;
    } else if (absDelta < this.orbitCommitAngle) {
        var wantSign = (delta > 0) ? 1 : -1;
        if (wantSign !== this.orbitDir) {
            this.orbitDir = wantSign;
        }
    }

    var step = Math.min(this.detourStep, absDelta);
    var wpAngle = angleMe + this.orbitDir * step;
    var wpRadius = this.detourRadius / Math.cos(step);
    return new Vector2d(
        ball.position.x + Math.cos(wpAngle) * wpRadius,
        ball.position.y + Math.sin(wpAngle) * wpRadius
    );
};

Ai.prototype.draw = function(ctx) {
    if (this.sPos != null && this.tPos != null) {
        ctx.beginPath();
        ctx.moveTo(this.sPos.x, this.sPos.y);
        ctx.lineTo(this.tPos.x, this.tPos.y);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }
};
