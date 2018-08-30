var Player = function (imgPlayer, position, playerSpriteWidth, playerSpriteHeight, playerSpriteCenterX, playerSpriteCenterY) {
    this.imgPlayer = imgPlayer;
    this.position = position;
    this.playerSpriteWidth = playerSpriteWidth;
    this.playerSpriteHeight = playerSpriteHeight;
    this.playerSpriteCenterX = playerSpriteCenterX;
    this.playerSpriteCenterY = playerSpriteCenterY;
    this.facingX = 0;
    this.facingY = -1;
    this.velocity = new Vector2d(0, 0)
};

Player.prototype.updateFacing = function() {
    if(this.velocity.x == 0 && this.velocity.y == 0) {
        return;
    }
    var alpha = MathLib.computeAngle(this.velocity.x, this.velocity.y);
    if(alpha <= 22.5 || alpha >= 337.5) {
        this.facingX = 1;
        this.facingY = 0;
    }
    else if(alpha <= 67.5 && alpha >= 22.5) {
        this.facingX = 1;
        this.facingY = 1;
    }
    else if(alpha <= 112.5 && alpha >= 67.5) {
        this.facingX = 0;
        this.facingY = 1;
    }
    else if(alpha <= 157.5 && alpha >= 112.5) {
        this.facingX = -1;
        this.facingY = 1;
    }
    else if(alpha <= 202.5 && alpha >= 157.5) {
        this.facingX = -1;
        this.facingY = 0;
    }
    else if(alpha <= 247.5 && alpha >= 202.5) {
        this.facingX = -1;
        this.facingY = -1;
    }
    else if(alpha <= 272.5 && alpha >= 247.5) {
        this.facingX = 0;
        this.facingY = -1;
    }
    else {
        this.facingX = 1;
        this.facingY = -1;   
    }
};

Player.prototype.draw = function(ctx) {
    var img = document.getElementById(this.skin);
    var topLeftX = 0;
    var topLeftY = 0;
    var ms = new Date().getMilliseconds() % 250;
    var phaseIndex = 0;
    this.updateFacing();
    if(this.velocity.x != 0 || this.velocity.y != 0) {
        if(ms > 83.33 && ms < 166.66) {
            phaseIndex = 1;
        }
        if(ms > 166.66) {
            phaseIndex = 2;
        }    
    }
    if(this.facingY == -1 && this.facingX == 0) {
        // NORTH
        topLeftY = (6 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == 1 && this.facingX == 0) {
        // SOUTH
        topLeftY = (7 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == 0 && this.facingX == -1) {
        // WEST
        topLeftY = (1 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == 0 && this.facingX == 1) {
        // EAST
        topLeftY = (0 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == -1 && this.facingX == 1) {
        // NE
        topLeftY = (5 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == -1 && this.facingX == -1) {
        // NW
        topLeftY = (4 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == 1 && this.facingX == 1) {
        // SE
        topLeftY = (3 * 3 + phaseIndex) * 18;
    }
    else if(this.facingY == 1 && this.facingX == -1) {
        // SW
        topLeftY = (2 * 3 + phaseIndex) * 18;
    }
    ctx.drawImage(
        this.imgPlayer, 
        topLeftX, topLeftY, 
        this.playerSpriteWidth, this.playerSpriteHeight, 
        this.position.x - this.playerSpriteCenterX,
        this.position.y - this.playerSpriteCenterY,
        this.playerSpriteWidth, this.playerSpriteHeight
    );
}