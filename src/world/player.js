var Player = function (imgPlayer, position, playerSpriteWidth, playerSpriteHeight, playerSpriteCenterX, playerSpriteCenterY) {
    this.imgPlayer = imgPlayer;
    this.position = position;
    this.playerSpriteWidth = playerSpriteWidth;
    this.playerSpriteHeight = playerSpriteHeight;
    this.playerSpriteCenterX = playerSpriteCenterX;
    this.playerSpriteCenterY = playerSpriteCenterY;
    this.facingX = 0;
    this.facingY = -1;
    this.velocity = new Vector2d(0, 0);
    // Rendering keeps a filtered direction separate from gameplay facing so
    // brief steering changes cannot flash a different sprite row.
    this.animationFacingX = this.facingX;
    this.animationFacingY = this.facingY;
    this.animationDirectionX = this.facingX;
    this.animationDirectionY = this.facingY;
    this.animationMoving = false;
    this.animationIdleSeconds = 0;
    this.animationLastTimeMs = null;
    this.animationDirectionResponseRate = 18;
    this.animationIdleGraceSeconds = 0.05;
    // Walk-cycle state advanced by Physics.updatePlayerPosition in step with
    // distance actually travelled (not wall-clock time), so the animation
    // naturally freezes when nothing is moving — including during pause.
    this.phaseIndex = 0;
    this.stepDistance = 0;
};

Player.prototype.updateFacing = function() {
    if(this.velocity.x == 0 && this.velocity.y == 0) {
        return;
    }
    var facing = this.facingForDirection(this.velocity.x, this.velocity.y);
    this.facingX = facing.x;
    this.facingY = facing.y;
};

Player.prototype.facingForDirection = function(x, y) {
    var alpha = MathLib.computeAngleRadians(x, y);
    var eastNorth = Math.PI / 8;       // 22.5 degrees
    var southEast = 3 * Math.PI / 8;   // 67.5 degrees
    var southWest = 5 * Math.PI / 8;   // 112.5 degrees
    var westSouth = 7 * Math.PI / 8;   // 157.5 degrees
    var westNorth = 9 * Math.PI / 8;   // 202.5 degrees
    var northWest = 11 * Math.PI / 8;  // 247.5 degrees
    var northEast = 13 * Math.PI / 8;  // 292.5 degrees
    var eastSouth = 15 * Math.PI / 8;  // 337.5 degrees
    if(alpha <= eastNorth || alpha >= eastSouth) {
        return new Vector2d(1, 0);
    }
    else if(alpha <= southEast && alpha >= eastNorth) {
        return new Vector2d(1, 1);
    }
    else if(alpha <= southWest && alpha >= southEast) {
        return new Vector2d(0, 1);
    }
    else if(alpha <= westSouth && alpha >= southWest) {
        return new Vector2d(-1, 1);
    }
    else if(alpha <= westNorth && alpha >= westSouth) {
        return new Vector2d(-1, 0);
    }
    else if(alpha <= northWest && alpha >= westNorth) {
        return new Vector2d(-1, -1);
    }
    else if(alpha <= northEast && alpha >= northWest) {
        return new Vector2d(0, -1);
    }
    return new Vector2d(1, -1);
};

Player.prototype.animationNowMs = function() {
    if(typeof performance != "undefined" && performance.now) {
        return performance.now();
    }
    return Date.now();
};

Player.prototype.animationElapsedSeconds = function(nowMs) {
    if(this.animationLastTimeMs == null) {
        this.animationLastTimeMs = nowMs;
        return 0;
    }
    var elapsed = (nowMs - this.animationLastTimeMs) / 1000;
    this.animationLastTimeMs = nowMs;
    return Math.max(0, Math.min(0.1, elapsed));
};

Player.prototype.updateAnimation = function(nowMs) {
    nowMs = nowMs == null ? this.animationNowMs() : nowMs;
    var elapsed = this.animationElapsedSeconds(nowMs);
    var moving = this.velocity.x != 0 || this.velocity.y != 0;
    this.updateFacing();

    if(!moving) {
        this.animationIdleSeconds += elapsed;
        if(!this.animationMoving ||
           this.animationIdleSeconds >= this.animationIdleGraceSeconds) {
            this.animationMoving = false;
            this.animationDirectionX = this.facingX;
            this.animationDirectionY = this.facingY;
            this.animationFacingX = this.facingX;
            this.animationFacingY = this.facingY;
        }
        return;
    }

    var direction = MathLib.normalizeVector(
        this.velocity.x,
        this.velocity.y,
        this.facingX,
        this.facingY
    );
    this.animationIdleSeconds = 0;
    if(!this.animationMoving) {
        this.animationDirectionX = direction.x;
        this.animationDirectionY = direction.y;
        this.animationMoving = true;
    } else {
        var blend = 1 - Math.exp(-this.animationDirectionResponseRate * elapsed);
        this.animationDirectionX += (direction.x - this.animationDirectionX) * blend;
        this.animationDirectionY += (direction.y - this.animationDirectionY) * blend;
    }

    if(MathLib.vectorLength(this.animationDirectionX, this.animationDirectionY) > 0.0001) {
        var animationFacing = this.facingForDirection(
            this.animationDirectionX,
            this.animationDirectionY
        );
        this.animationFacingX = animationFacing.x;
        this.animationFacingY = animationFacing.y;
    }
};

Player.prototype.draw = function(ctx) {
    var img = document.getElementById(this.skin);
    var topLeftX = 0;
    var sprite = this.spriteFrame();
    ctx.drawImage(
        this.imgPlayer, 
        topLeftX, sprite.topLeftY, 
        this.playerSpriteWidth, this.playerSpriteHeight, 
        this.position.x - this.playerSpriteCenterX,
        this.position.y - this.playerSpriteCenterY,
        this.playerSpriteWidth, this.playerSpriteHeight
    );
};

Player.prototype.spriteFrame = function(animationTimeMs) {
    this.updateAnimation(animationTimeMs);
    var phaseIndex = this.animationMoving ? this.phaseIndex : 0;
    var topLeftY = 0;
    if(this.animationFacingY == -1 && this.animationFacingX == 0) {
        // NORTH
        topLeftY = (6 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == 1 && this.animationFacingX == 0) {
        // SOUTH
        topLeftY = (7 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == 0 && this.animationFacingX == -1) {
        // WEST
        topLeftY = (1 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == 0 && this.animationFacingX == 1) {
        // EAST
        topLeftY = (0 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == -1 && this.animationFacingX == 1) {
        // NE
        topLeftY = (5 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == -1 && this.animationFacingX == -1) {
        // NW
        topLeftY = (4 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == 1 && this.animationFacingX == 1) {
        // SE
        topLeftY = (3 * 3 + phaseIndex) * 18;
    }
    else if(this.animationFacingY == 1 && this.animationFacingX == -1) {
        // SW
        topLeftY = (2 * 3 + phaseIndex) * 18;
    }
    return {
        phaseIndex: phaseIndex,
        topLeftY: topLeftY
    };
};
