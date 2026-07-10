var Ai = function (config, stadium, controlledPlayer, team, opponentTeam) {
    this.config = config;
    this.stadium = stadium;
    this.controlledPlayer = controlledPlayer;
    if (typeof team == "string") {
        this.teamSide = team;
        this.team = null;
        this.opponentTeam = opponentTeam || null;
    } else {
        this.team = team || stadium.awayTeam;
        this.opponentTeam = opponentTeam || (this.team == stadium.homeTeam ? stadium.awayTeam : stadium.homeTeam);
        this.teamSide = this.team.side;
    }
    this.speed = config.teamVelocity(this.teamSide);

    if (this.teamSide == "home") {
        this.ownGoalCenter = new Vector2d(
            (config.goalBottomTopLeft.x + config.goalBottomBottomRight.x) / 2,
            (config.goalBottomTopLeft.y + config.goalBottomBottomRight.y) / 2
        );
        this.oppGoalCenter = new Vector2d(
            (config.goalTopTopLeft.x + config.goalTopBottomRight.x) / 2,
            (config.goalTopTopLeft.y + config.goalTopBottomRight.y) / 2
        );
        this.ownGoalLineY = config.goalBottomTopLeft.y;
        this.ownGoalCenterX = (config.goalBottomTopLeft.x + config.goalBottomTopRight.x) / 2;
        this.ownGoalMouthLeftX = config.goalBottomTopLeft.x;
        this.ownGoalMouthRightX = config.goalBottomTopRight.x;
        this.defenseDirectionY = -1;
        this.goalieFacingY = -1;
    } else {
        // Away plays against the top goal (defends it) and shoots at the bottom goal.
        this.ownGoalCenter = new Vector2d(
            (config.goalTopTopLeft.x + config.goalTopBottomRight.x) / 2,
            (config.goalTopTopLeft.y + config.goalTopBottomRight.y) / 2
        );
        this.oppGoalCenter = new Vector2d(
            (config.goalBottomTopLeft.x + config.goalBottomBottomRight.x) / 2,
            (config.goalBottomTopLeft.y + config.goalBottomBottomRight.y) / 2
        );
        this.ownGoalLineY = config.goalTopBottomLeft.y;
        this.ownGoalCenterX = (config.goalTopTopLeft.x + config.goalTopTopRight.x) / 2;
        this.ownGoalMouthLeftX = config.goalTopTopLeft.x;
        this.ownGoalMouthRightX = config.goalTopTopRight.x;
        this.defenseDirectionY = 1;
        this.goalieFacingY = 1;
    }
    this.midlineY = config.stadiumHeight / 2;                                    // 424

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
    this.role = null;
    this.roleTarget = null;
};

Ai.prototype.setRole = function(role, target) {
    this.role = role;
    this.roleTarget = target;
};

Ai.prototype.update = function(context) {
    if (!(window.game != null && window.game.started == true && !window.game.isPaused())) {
        return;
    }
    var me = this.controlledPlayer;
    var opponent = this.nearestOpponentToBall();
    var ball = this.stadium.ball;

    if (this.role != null) {
        this.updateRole(context);
        return;
    }

    // Airborne ball: nobody can touch it until it comes down. Run to the
    // predicted landing point (or drop back to defend if the aerial race is
    // lost and the ball is landing in our half).
    if (ball.position.z > 0 || ball.velocity.z > 0) {
        this.handleAirborneBall(me, opponent);
        return;
    }

    var tMe = this.timeToReach(me.position);
    var tOpponent = opponent == null ? Infinity : this.timeToReach(opponent.position);
    var ballInOwnHalf = this.isPointInOwnHalf(ball.position);
    var threat = ballInOwnHalf || this.isBallThreateningOwnGoal();
    var opponentCloser = tOpponent < tMe;

    var target;
    if (threat && opponentCloser) {
        this.state = 'defend';
        target = this.defensePoint();
    } else if (tMe <= tOpponent + this.raceMargin) {
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
    this.holdGoaliePose();
};

Ai.prototype.updateRole = function(context) {
    var target = null;
    if (this.role == "goalie") {
        target = this.goalieSlotTarget(context);
    } else if (this.role == "defender") {
        target = this.defenderSlotTarget(context);
    } else if (this.role == "support") {
        target = this.supportSlotTarget(context);
    } else if (this.role == "striker") {
        target = this.strikerSlotTarget(context);
    }

    if (target == null) {
        this.state = "hold";
        target = this.controlledPlayer.position;
    }

    if (this.state !== "press") {
        this.orbitDir = 0;
    }
    this.moveToRoleTarget(target, context);
    this.holdGoaliePose();
};

Ai.prototype.goalieSlotTarget = function(context) {
    if (context != null && context.keeperChallenge) {
        this.state = "press";
        return this.pressureTarget(context);
    }

    this.state = "hold";
    return this.goalieTarget();
};

Ai.prototype.defenderSlotTarget = function(context) {
    if (context != null && context.pressureController === this) {
        this.state = "press";
        return this.pressureTarget(context);
    }

    this.state = "hold";
    return this.applyOffBallSpacing(this.defenderShapeTarget(context), context);
};

Ai.prototype.supportSlotTarget = function(context) {
    this.state = "support";
    return this.applyOffBallSpacing(this.supportShapeTarget(context), context);
};

Ai.prototype.strikerSlotTarget = function(context) {
    if (context == null || context.pressureController === this) {
        this.state = "press";
        return this.pressureTarget(context);
    }

    this.state = "hold";
    return this.applyOffBallSpacing(this.strikerOutletTarget(context), context);
};

Ai.prototype.pressureTarget = function(context) {
    var ball = context != null ? context.ball : this.stadium.ball;
    if (ball.position.z > 0 || ball.velocity.z > 0) {
        this.state = "receive";
        this.orbitDir = 0;
        return this.clampToField(this.predictLandingPos() || new Vector2d(ball.position.x, ball.position.y));
    }

    return this.clampToField(this.attackTarget(this.controlledPlayer));
};

Ai.prototype.defenderShapeTarget = function(context) {
    var ball = context != null ? context.ball : this.stadium.ball;
    if (context != null && context.ballInOwnHalf) {
        return this.defenderTarget(this.slotIndex || 0, this.slotCount || 1);
    }

    var lineDistance = this.config.defenderDistance + 65 + (this.slotIndex || 0) * 25;
    var lane = this.slotLaneForShape();
    var centerX = this.config.stadiumWidth / 2;
    return this.clampToField(new Vector2d(
        centerX + lane * this.config.attackWidth + (ball.position.x - centerX) * 0.2,
        this.ownGoalCenter.y + this.defenseDirectionY * lineDistance
    ));
};

Ai.prototype.supportShapeTarget = function(context) {
    var ball = context != null ? context.ball : this.stadium.ball;
    var lane = this.slotLaneForShape();
    return this.clampToField(new Vector2d(
        ball.position.x + lane * this.config.attackWidth,
        ball.position.y + this.defenseDirectionY * this.config.attackDistance
    ));
};

Ai.prototype.strikerOutletTarget = function(context) {
    var ball = context != null ? context.ball : this.stadium.ball;
    var lane = this.slotLane || 0;
    return this.clampToField(new Vector2d(
        ball.position.x + lane * this.config.attackWidth * 0.7,
        ball.position.y - this.defenseDirectionY * this.config.attackDistance
    ));
};

Ai.prototype.slotLaneForShape = function() {
    if (this.slotLane !== 0) {
        return this.slotLane;
    }
    return ((this.slotIndex || 0) % 2 === 0) ? -1 : 1;
};

Ai.prototype.applyOffBallSpacing = function(target, context) {
    if (context == null) {
        return this.clampToField(target);
    }

    var spaced = this.keepAwayFromPoint(
        target,
        context.ball.position,
        this.config.aiMinBallSpacing,
        this.slotLaneForShape(),
        this.defenseDirectionY
    );

    for (var i = 0; i < context.teammates.length; i++) {
        var teammate = context.teammates[i];
        if (teammate === this.controlledPlayer) continue;
        spaced = this.keepAwayFromPoint(
            spaced,
            teammate.position,
            this.config.aiMinTeammateSpacing,
            this.slotLaneForShape(),
            this.defenseDirectionY
        );
    }

    spaced = this.keepAwayFromPoint(
        spaced,
        context.ball.position,
        this.config.aiMinBallSpacing,
        this.slotLaneForShape(),
        this.defenseDirectionY
    );
    spaced = this.clampToField(spaced);
    if (MathLib.computeDistance(spaced, context.ball.position) < this.config.aiMinBallSpacing) {
        spaced = this.inFieldSpacingTarget(
            context.ball.position,
            this.config.aiMinBallSpacing,
            this.slotLaneForShape(),
            this.defenseDirectionY
        );
    }
    return spaced;
};

Ai.prototype.keepAwayFromPoint = function(target, point, minDistance, fallbackX, fallbackY) {
    var dx = target.x - point.x;
    var dy = target.y - point.y;
    var d = Math.sqrt(dx * dx + dy * dy);
    if (d >= minDistance) {
        return target;
    }

    if (d < 0.0001) {
        dx = fallbackX || 1;
        dy = fallbackY || 0;
        d = Math.sqrt(dx * dx + dy * dy) || 1;
    }

    return new Vector2d(
        point.x + dx / d * minDistance,
        point.y + dy / d * minDistance
    );
};

Ai.prototype.inFieldSpacingTarget = function(point, minDistance, fallbackX, fallbackY) {
    var directions = [
        [fallbackX, fallbackY],
        [fallbackX, 0],
        [0, fallbackY],
        [-fallbackX, fallbackY],
        [1, fallbackY],
        [-1, fallbackY]
    ];
    var best = null;
    var bestDistance = -1;

    for (var i = 0; i < directions.length; i++) {
        var dx = directions[i][0];
        var dy = directions[i][1];
        var len = Math.sqrt(dx * dx + dy * dy);
        if (len < 0.0001) continue;
        var candidate = this.clampToField(new Vector2d(
            point.x + dx / len * minDistance,
            point.y + dy / len * minDistance
        ));
        var distance = MathLib.computeDistance(candidate, point);
        if (distance > bestDistance) {
            best = candidate;
            bestDistance = distance;
        }
        if (distance >= minDistance - 0.0001) {
            return candidate;
        }
    }

    return best || this.clampToField(point);
};

Ai.prototype.moveToRoleTarget = function(target, context) {
    target = this.applyTargetDeadband(target);
    if (
        context != null &&
        this.role != "goalie" &&
        this !== context.pressureController &&
        MathLib.computeDistance(target, context.ball.position) < this.config.aiMinBallSpacing
    ) {
        target = this.applyOffBallSpacing(target, context);
    }
    this.roleTarget = target;
    this.moveTo(target);
};

Ai.prototype.applyTargetDeadband = function(target) {
    var deadband = this.config.aiTargetDeadband || 0;
    if (deadband <= 0 || this.tPos == null) {
        return target;
    }

    if (MathLib.computeDistance(this.tPos, this.controlledPlayer.position) < 0.75) {
        return target;
    }

    if (MathLib.computeDistance(target, this.tPos) < deadband) {
        return this.tPos;
    }
    return target;
};

Ai.prototype.clampToField = function(target) {
    var x = target.x;
    var y = target.y;
    if (x < this.config.boxTopLeft.x) x = this.config.boxTopLeft.x;
    if (x > this.config.boxTopRight.x) x = this.config.boxTopRight.x;
    if (y < this.config.boxTopLeft.y) y = this.config.boxTopLeft.y;
    if (y > this.config.boxBottomLeft.y) y = this.config.boxBottomLeft.y;
    return new Vector2d(x, y);
};

// While parked as goalie, look out at the pitch rather than into the net.
// updateFacing() only recomputes facing from a non-zero velocity, so once the
// AI's velocity has been snapped to zero on arrival its facing would otherwise
// stick to whatever direction it happened to arrive from (often north — into
// the goal — because the AI usually retreats from midfield toward its line).
Ai.prototype.holdGoaliePose = function() {
    if (this.role !== 'goalie' && this.state !== 'defend' && this.state !== 'goalie') return;
    var me = this.controlledPlayer;
    if (me.velocity.x === 0 && me.velocity.y === 0) {
        me.facingX = 0;
        me.facingY = this.goalieFacingY;
    }
};

// Where the ball will first touch the ground again, in world coordinates.
// Uses the same gravity constant as the physics, and integrates horizontal
// motion under air friction (not the ground friction that predictBallPos uses).
// Returns null if the ball isn't actually airborne.
Ai.prototype.predictLandingPos = function() {
    var ball = this.stadium.ball;
    if (ball.position.z <= 0 && ball.velocity.z <= 0) {
        return null;
    }
    var g = this.config.gravity;
    var vz = ball.velocity.z;
    var z = ball.position.z;
    // Solve z + vz*t - 0.5*g*t² = 0 for the positive root.
    var disc = vz * vz + 2 * g * z;
    if (disc < 0) return null;
    var tLand = (vz + Math.sqrt(disc)) / g;
    if (!isFinite(tLand) || tLand <= 0) return null;

    var mu = this.config.ballAirFriction;
    var travel = (1 - Math.exp(-mu * tLand)) / mu;
    return new Vector2d(
        ball.position.x + ball.velocity.x * travel,
        ball.position.y + ball.velocity.y * travel
    );
};

// Airborne-ball behavior. Chase the landing point unless the human clearly
// beats us to it AND the ball is dropping into our half — in which case we
// abandon the race and reset onto our defensive line.
Ai.prototype.handleAirborneBall = function(me, human) {
    this.orbitDir = 0;
    var landing = this.predictLandingPos();
    if (landing == null) {
        // Degenerate airborne state — fall back to just chasing the shadow.
        this.state = 'receive';
        this.moveTo(this.stadium.ball.position);
        return;
    }
    var meDx = landing.x - me.position.x;
    var meDy = landing.y - me.position.y;
    var dMe = Math.sqrt(meDx * meDx + meDy * meDy);
    var dHuman = Infinity;
    if (human != null) {
        var huDx = landing.x - human.position.x;
        var huDy = landing.y - human.position.y;
        dHuman = Math.sqrt(huDx * huDx + huDy * huDy);
    }
    // Race margin translated back to distance so we don't need a division.
    var raceSlack = this.speed * this.raceMargin;
    var meWinsRace = dMe <= dHuman + raceSlack;
    var landingGoalward = this.isPointInOwnHalf(landing);

    if (!meWinsRace && landingGoalward) {
        this.state = 'defend';
        this.moveTo(this.defensePoint());
        this.holdGoaliePose();
    } else {
        this.state = 'receive';
        this.moveTo(landing);
    }
};

Ai.prototype.moveTo = function(target) {
    var me = this.controlledPlayer;
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
    var slowRadius = this.config.aiArrivalSlowRadius || 0;
    var speed = this.speed;
    if (slowRadius > 0 && d < slowRadius) {
        speed *= d / slowRadius;
    }
    me.velocity.x = dx / d * speed;
    me.velocity.y = dy / d * speed;
};

Ai.prototype.goalieTarget = function() {
    var baseLineY = this.ownGoalLineY + this.defenseDirectionY * this.config.goalieDistance;
    var x = this.ownGoalCenterX;
    var ball = this.stadium.ball;
    var ballGoalward = this.isPointInOwnHalf(ball.position);

    if (ballGoalward || this.isBallThreateningOwnGoal()) {
        var dyBall = (ball.position.y - this.ownGoalLineY) * this.defenseDirectionY;
        if (dyBall > 0.5) {
            var t = Math.abs(baseLineY - this.ownGoalLineY) / dyBall;
            x = this.ownGoalCenterX + t * (ball.position.x - this.ownGoalCenterX);
        }
    }

    var mouthMargin = 8;
    var xMin = this.ownGoalMouthLeftX - mouthMargin;
    var xMax = this.ownGoalMouthRightX + mouthMargin;
    if (x < xMin) x = xMin;
    if (x > xMax) x = xMax;

    return new Vector2d(x, baseLineY);
};

Ai.prototype.defenderTarget = function(index, count) {
    var ball = this.stadium.ball;
    var distance = this.config.defenderDistance;
    var goalToBallX = ball.position.x - this.ownGoalCenter.x;
    var goalToBallY = ball.position.y - this.ownGoalCenter.y;
    var len = Math.sqrt(goalToBallX * goalToBallX + goalToBallY * goalToBallY) || 1;
    var ux = goalToBallX / len;
    var uy = goalToBallY / len;
    var spread = (index - (count - 1) / 2) * 35;
    var perpX = -uy;
    var perpY = ux;

    return new Vector2d(
        this.ownGoalCenter.x + ux * distance + perpX * spread,
        this.ownGoalCenter.y + uy * distance + perpY * spread
    );
};

Ai.prototype.opponents = function() {
    if (this.opponentTeam != null) {
        return this.opponentTeam.players;
    }
    return this.teamSide == "home" ? this.stadium.awayPlayers : this.stadium.homePlayers;
};

Ai.prototype.nearestOpponentToBall = function() {
    var opponents = this.opponents();
    var nearest = null;
    var nearestDistance = Infinity;
    for (var i = 0; i < opponents.length; i++) {
        var distance = MathLib.computeDistance(opponents[i].position, this.stadium.ball.position);
        if (distance < nearestDistance) {
            nearestDistance = distance;
            nearest = opponents[i];
        }
    }
    return nearest;
};

Ai.prototype.isPointInOwnHalf = function(point) {
    if (this.teamSide == "home") {
        return point.y > this.midlineY;
    }
    return point.y < this.midlineY;
};

Ai.prototype.defensiveDepth = function(point) {
    if (this.teamSide == "home") {
        return point.y - this.midlineY;
    }
    return this.midlineY - point.y;
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

// Goalie spot: on the pitch side of the goal line, blocking the shot from the
// ball toward the goal mouth. Hardcoded for the top goal (AI is always away).
//   * X tracks where the shot-line "ball → goal-mouth center" crosses the
//     defensive line, clamped to the goal mouth width plus a small margin.
//   * Y sits on the defensive line by default, but steps forward to challenge
//     the ball when it enters the come-out zone. It NEVER crosses the goal
//     line back into the net.
Ai.prototype.defensePoint = function() {
    var predicted = this.predictBallPos(0.15);
    var baseLineY = this.ownGoalLineY + this.defenseDirectionY * this.guardDistance;
    var comeOutTriggerY = baseLineY + this.defenseDirectionY * 20;

    // X: intersect the shot line with the defensive line.
    var dyBall = (predicted.y - this.ownGoalLineY) * this.defenseDirectionY;
    var goalieX;
    if (dyBall <= 0.5) {
        // Ball is already at/behind the goal line — cover the middle.
        goalieX = this.ownGoalCenterX;
    } else {
        var t = Math.abs(baseLineY - this.ownGoalLineY) / dyBall;
        goalieX = this.ownGoalCenterX + t * (predicted.x - this.ownGoalCenterX);
    }
    // Keep goalie in front of the goal mouth (with a small margin for near-post shots).
    var mouthMargin = 8;
    var xMin = this.ownGoalMouthLeftX - mouthMargin;
    var xMax = this.ownGoalMouthRightX + mouthMargin;
    if (goalieX < xMin) goalieX = xMin;
    if (goalieX > xMax) goalieX = xMax;

    // Y: hold the defensive line unless the ball has entered the come-out zone,
    // in which case step forward to meet it — but never cross the goal line.
    var goalieY;
    if ((predicted.y - comeOutTriggerY) * this.defenseDirectionY >= 0) {
        goalieY = baseLineY;
    } else {
        goalieY = predicted.y - this.defenseDirectionY * (this.contactDist + 1);
        var minPitchY = this.ownGoalLineY + this.defenseDirectionY * 2;   // never inside the box
        if (this.defenseDirectionY == 1 && goalieY < minPitchY) goalieY = minPitchY;
        if (this.defenseDirectionY == -1 && goalieY > minPitchY) goalieY = minPitchY;
    }

    return new Vector2d(goalieX, goalieY);
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

    var meBallDistance = Math.sqrt(meBallX * meBallX + meBallY * meBallY);
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

    if (meBallDistance <= this.detourRadius + this.config.aiArrivalSlowRadius && absDelta <= 0.25) {
        var correctionStep = Math.min(this.detourStep / 2, absDelta);
        var correctionDir = delta >= 0 ? 1 : -1;
        var correctionAngle = angleMe + correctionDir * correctionStep;
        var correctionRadius = Math.max(meBallDistance, this.detourRadius);
        var correctionTarget = new Vector2d(
            ball.position.x + Math.cos(correctionAngle) * correctionRadius,
            ball.position.y + Math.sin(correctionAngle) * correctionRadius
        );
        var correctionX = correctionTarget.x - me.position.x;
        var correctionY = correctionTarget.y - me.position.y;
        if (
            me.velocity != null &&
            me.velocity.x * me.velocity.x + me.velocity.y * me.velocity.y > 0.01 &&
            correctionX * me.velocity.x + correctionY * me.velocity.y < 0
        ) {
            var velocityLength = Math.sqrt(me.velocity.x * me.velocity.x + me.velocity.y * me.velocity.y);
            return new Vector2d(
                me.position.x + me.velocity.x / velocityLength * this.config.aiArrivalSlowRadius,
                me.position.y + me.velocity.y / velocityLength * this.config.aiArrivalSlowRadius
            );
        }
        return correctionTarget;
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
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'blue';
        ctx.stroke();
    }
};
