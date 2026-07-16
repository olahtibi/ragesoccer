var Physics = function (config, stadium) {
  this.config = config;
  this.stadium = stadium;
  this.lastUpdated = new Date().getTime();
  this.fps = 0.0;
  this.displayFps = 0;
  this.deltaArr = [];
  this.fpsDisplayIntervalMs = config.physics.fpsDisplayIntervalMs;
  this.lastFpsDisplayUpdated = 0;
  this.frameNumber = 0;
  this.lastDt = 0;
};

// Public API

Physics.prototype.update = function() {
  var currentTime = new Date().getTime();
  var dt = this._computeDt(currentTime);
  if (dt == null) {
    return;
  }
  this.lastDt = dt;
  this._updatePlayerPositions(dt);
  this._resolveBallPlayerContacts();
  this._updateBallPosition(dt);
  this._updateStats(currentTime);
};

Physics.prototype.updatePlayersOnly = function() {
  var currentTime = new Date().getTime();
  var dt = this._computeDt(currentTime);
  if (dt == null) {
    return;
  }
  this.lastDt = dt;
  this._updatePlayerPositions(dt);
  this._updateStats(currentTime);
};

Physics.prototype.updateBallOnly = function() {
  var currentTime = new Date().getTime();
  var dt = this._computeDt(currentTime);
  if (dt == null) return;
  this.lastDt = dt;
  this._updateBallPosition(dt);
  this._updateStats(currentTime);
};

// Private helpers

Physics.prototype._computeDt = function(currentTime) {
  var dt = (currentTime - this.lastUpdated) / 1000.0;
  // Clamp dt so a paused/backgrounded tab doesn't teleport bodies on resume.
  if (dt > this.config.physics.maxDeltaSeconds) dt = this.config.physics.maxDeltaSeconds;
  if (dt < 0) dt = 0;
  return dt;
};

Physics.prototype.resetClock = function() {
  this.lastUpdated = new Date().getTime();
  this.lastDt = 0;
};

Physics.prototype._updateStats = function(currentTime) {
  this.frameNumber++;
  var deltaT = currentTime - this.lastUpdated;
  var sampleFrames = this.config.physics.statsSampleFrames;
  if (this.deltaArr.length < sampleFrames) {
    this.deltaArr.push(deltaT);
  } else {
    this.deltaArr[this.frameNumber % sampleFrames] = deltaT;
  }
  var avg = 0.0;
  for (var i = 0; i < this.deltaArr.length; i++) {
    avg += this.deltaArr[i];
  }
  avg /= this.deltaArr.length;
  this.fps = avg > 0 ? 1000.0 / avg : 0;
  if (this.displayFps === 0 || currentTime - this.lastFpsDisplayUpdated >= this.fpsDisplayIntervalMs) {
    this.displayFps = Math.round(this.fps);
    this.lastFpsDisplayUpdated = currentTime;
  }
  this.lastUpdated = currentTime;
};

Physics.prototype._updatePlayerPositions = function(dt) {
  var pxPerPhase = this.config.player.stepPxPerPhase;
  for (var i = 0; i < this.stadium.players.length; i++) {
    var p = this.stadium.players[i];
    var moveX = p.velocity.x * dt;
    var moveY = p.velocity.y * dt;
    p.position.x += moveX;
    p.position.y += moveY;
    // Walk-cycle: advance one sprite phase for every `playerStepPxPerPhase`
    // pixels of travel. Ties the animation speed to actual motion, so a
    // stopped or paused player never steps in place.
    var stepDist = MathLib.vectorLength(moveX, moveY);
    if (stepDist > 0) {
      p.stepDistance += stepDist;
      while (p.stepDistance >= pxPerPhase) {
        p.phaseIndex = (p.phaseIndex + 1) % this.config.player.spritePhases;
        p.stepDistance -= pxPerPhase;
      }
    }
  }
};

// Circle-circle contact + impulse-based response. Runs once per frame after
// the players have moved but before the ball has integrated its own velocity.
Physics.prototype._resolveBallPlayerContacts = function() {
  var ball = this.stadium.ball;
  // A high, lofted ball flies over the player and cannot be touched.
  if (ball.position.z > this.config.physics.ballContactMaxZ) {
    return;
  }
  var contactDist = this.config.ball.radius + this.config.player.radius;
  var contactDist2 = contactDist * contactDist;

  for (var i = 0; i < this.stadium.players.length; i++) {
    var p = this.stadium.players[i];
    var dx = ball.position.x - p.position.x;
    var dy = ball.position.y - p.position.y;
    var d2 = dx * dx + dy * dy;
    if (d2 >= contactDist2) {
      continue;
    }
    ball.lastTouchedBy = p.teamSide;
    // Contact normal (unit vector from player toward ball).
    var d = Math.sqrt(d2);
    var nx, ny;
    if (d > this.config.physics.zeroDistanceEpsilon) {
      nx = dx / d;
      ny = dy / d;
    } else {
      // Degenerate overlap: fall back to the direction the player is facing.
      var fx = p.facingX || 0;
      var fy = p.facingY || -1;
      var fallback = MathLib.normalizeVector(fx, fy, 0, -1);
      nx = fallback.x;
      ny = fallback.y;
    }

    // Player and ball velocities projected onto the normal.
    var vpN = p.velocity.x * nx + p.velocity.y * ny;                 // player toward ball (positive = closing in)
    var vbN = ball.velocity.x * nx + ball.velocity.y * ny;           // ball along +n

    // Relative approach along the normal. Only apply the bounce impulse if
    // the pair is actually closing; otherwise we'd suck the ball back in.
    var vRel = vbN - vpN;
    var restitution = this.config.physics.ballPlayerRestitution;
    var jBounce = (vRel < 0) ? -(1 + restitution) * vRel : 0;

    // Active kick impulse: a small base "tap" plus a boost from the player's
    // closing speed. Both are along the outward normal.
    var approach = Math.max(0, vpN);
    var jKick = this.config.physics.baseKickBoost + approach * this.config.physics.playerMomentumTransfer;

    var jTotal = jBounce + jKick;
    // Applied along +n (outward from the player).
    ball.velocity.x += nx * jTotal;
    ball.velocity.y += ny * jTotal;

    // Cap the resulting horizontal speed so pathological momentum stacks
    // never produce absurd velocities.
    var sp2 = ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y;
    var maxSp = this.config.physics.maxKickSpeed;
    if (sp2 > maxSp * maxSp) {
      var sp = Math.sqrt(sp2);
      ball.velocity.x = ball.velocity.x / sp * maxSp;
      ball.velocity.y = ball.velocity.y / sp * maxSp;
    }

    // Loft: scale with the total outgoing impulse so harder kicks fly higher,
    // and add a small base lift so even taps show a visible hop.
    var loft = this.config.physics.baseLoft + jTotal * this.config.physics.kickLoftFactor;
    if (loft > ball.velocity.z) {
      ball.velocity.z = loft;
    }

    // Positional correction: push the ball to just outside the contact circle
    // so the pair doesn't stay overlapping and re-trigger every frame.
    var eps = this.config.physics.contactEpsilon;
    ball.position.x = p.position.x + nx * (contactDist + eps);
    ball.position.y = p.position.y + ny * (contactDist + eps);
  }
};

Physics.prototype._updateBallPosition = function(dt) {
  var ball = this.stadium.ball;

  // Vertical motion: gravity + ground bounce with restitution.
  if (ball.position.z > 0 || ball.velocity.z > 0) {
    ball.velocity.z -= this.config.physics.gravity * dt;
    ball.position.z += ball.velocity.z * dt;
    if (ball.position.z <= 0) {
      ball.position.z = 0;
      if (ball.velocity.z < 0) {
        ball.velocity.z = -ball.velocity.z * this.config.physics.ballGroundRestitution;
        if (ball.velocity.z < this.config.physics.minBounceVelocity) {
          ball.velocity.z = 0;
        }
        // Landing scrubs a bit of horizontal speed.
        ball.velocity.x *= this.config.physics.groundImpactDamping;
        ball.velocity.y *= this.config.physics.groundImpactDamping;
      }
    }
  }

  // Horizontal friction: exponential decay. Airborne balls decay slower.
  var mu = (ball.position.z > 0) ? this.config.physics.ballAirFriction : this.config.physics.ballFriction;
  var decay = Math.exp(-mu * dt);
  ball.velocity.x *= decay;
  ball.velocity.y *= decay;

  // Snap sub-threshold velocities to zero to avoid endless jitter.
  var speed2 = ball.velocity.x * ball.velocity.x + ball.velocity.y * ball.velocity.y;
  var minV = this.config.physics.minVelocity;
  if (speed2 < minV * minV) {
    ball.velocity.x = 0;
    ball.velocity.y = 0;
  }

  var moveArray = [ball.velocity.x * dt, ball.velocity.y * dt];

  if (!this.config.restarts.outOfPlayEnabled) {
    this._checkBoxCollision(moveArray);
  }
  this._checkGoalCollision(moveArray);

  ball.position.x += moveArray[0];
  ball.position.y += moveArray[1];

  // Sprite rotation: advance one phase for every `ballSpinPxPerPhase` pixels
  // the ball actually travelled this frame. This ties spin speed to linear
  // speed, so fast kicks blur and slow rolls show a clearly visible turn.
  var stepDist = MathLib.vectorLength(moveArray[0], moveArray[1]);
  if (stepDist > 0) {
    ball.rollDistance += stepDist;
    var pxPerPhase = this.config.ball.spinPxPerPhase;
    while (ball.rollDistance >= pxPerPhase) {
      ball.phaseIndex = (ball.phaseIndex + 1) % this.config.ball.spritePhases;
      ball.rollDistance -= pxPerPhase;
    }
  } else {
    // Ball at rest: keep the sprite from starting mid-phase next time.
    ball.rollDistance = 0;
  }
};

// Reflect the ball off a vertical-normal wall (horizontal surface, ball crossing pY).
Physics.prototype._reflectY = function(moveArray) {
  var e = this.config.physics.wallRestitution;
  moveArray[1] = -moveArray[1] * e;
  this.stadium.ball.velocity.y = -this.stadium.ball.velocity.y * e;
};

// Reflect the ball off a horizontal-normal wall (vertical surface, ball crossing pX).
Physics.prototype._reflectX = function(moveArray) {
  var e = this.config.physics.wallRestitution;
  moveArray[0] = -moveArray[0] * e;
  this.stadium.ball.velocity.x = -this.stadium.ball.velocity.x * e;
};

Physics.prototype._checkGoalCollision = function (moveArray) {
    if(MathLib.isIntersectedVertically(
       this.config.pitch.goalTopTopLeft.x,
       this.config.pitch.goalTopTopRight.x,
       this.config.pitch.goalTopTopLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      this._reflectY(moveArray);
    }
    else if(MathLib.isIntersectedVertically(
       this.config.pitch.goalBottomBottomLeft.x,
       this.config.pitch.goalBottomBottomRight.x,
       this.config.pitch.goalBottomBottomLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      this._reflectY(moveArray);
    }
    if(MathLib.isIntersectedHorizontally(
       this.config.pitch.goalTopTopLeft.y,
       this.config.pitch.goalTopBottomLeft.y,
       this.config.pitch.goalTopTopLeft.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      this._reflectX(moveArray);
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.pitch.goalTopTopRight.y,
       this.config.pitch.goalTopBottomRight.y,
       this.config.pitch.goalTopTopRight.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      this._reflectX(moveArray);
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.pitch.goalBottomTopLeft.y,
       this.config.pitch.goalBottomBottomLeft.y,
       this.config.pitch.goalBottomTopLeft.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      this._reflectX(moveArray);
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.pitch.goalBottomTopRight.y,
       this.config.pitch.goalBottomBottomRight.y,
       this.config.pitch.goalBottomTopRight.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      this._reflectX(moveArray);
    }
};

Physics.prototype._checkBoxCollision = function (moveArray) {
    if(MathLib.isIntersectedVertically(
       this.config.pitch.boxTopLeft.x,
       this.config.pitch.boxTopRight.x,
       this.config.pitch.boxTopLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      this._reflectY(moveArray);
    }
    else if(MathLib.isIntersectedVertically(
       this.config.pitch.boxBottomLeft.x,
       this.config.pitch.boxBottomRight.x,
       this.config.pitch.boxBottomLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      this._reflectY(moveArray);
    }
    if(MathLib.isIntersectedHorizontally(
       this.config.pitch.boxTopLeft.y,
       this.config.pitch.boxBottomLeft.y,
       this.config.pitch.boxTopLeft.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      this._reflectX(moveArray);
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.pitch.boxTopRight.y,
       this.config.pitch.boxBottomRight.y,
       this.config.pitch.boxTopRight.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      this._reflectX(moveArray);
    }
};
