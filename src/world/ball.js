var Ball = function(imgBall, ballRadius, position, ballConfig) {
  ballConfig = ballConfig || {};
  this.imgBall = imgBall;
  this.ballRadius = ballRadius;
  this.position = new Vector3d(position.x, position.y, position.z || 0);
  this.velocity = new Vector3d(0, 0, 0)
  this.kickDirection = new Vector2d(0, 0)
  this.phaseIndex = 0;
  this.lastTouchedBy = null;
  this.heldBy = null;
  // Accumulated distance rolled since the last sprite phase change.
  // Used by the physics loop to advance the sprite in proportion to travel.
  this.rollDistance = 0;
  this._heldOffsetX = ballConfig.heldOffsetX || 5;
  this._heldOffsetY = ballConfig.heldOffsetY || -8;
  this._shadowFrame = ballConfig.shadowFrame || 4;
  this._shadowOffset = ballConfig.shadowOffset || 1;
};

// Public API (underscore-prefixed members are private helpers)

Ball.prototype.draw = function(ctx) {
    if(this.heldBy != null) {
        var held = this.heldPosition();
        var heldSize = this.ballRadius * 2;
        ctx.drawImage(
            this.imgBall,
            this.phaseIndex * heldSize, 0,
            heldSize, heldSize,
            held.x - this.ballRadius,
            held.y - this.ballRadius,
            heldSize, heldSize
        );
        return;
    }
    var size = this.ballRadius * 2;
    ctx.drawImage(
        this.imgBall, 
        (size * this._shadowFrame), 0,
        size, size, 
        this.position.x - this.ballRadius + this._shadowOffset + this.position.z,
        this.position.y - this.ballRadius + this._shadowOffset + this.position.z,
        size, size
    );
    ctx.drawImage(
        this.imgBall, 
        this.phaseIndex * size, 0, 
        size, size, 
        this.position.x - this.ballRadius,
        this.position.y - this.ballRadius,
        size, size
    );
}

Ball.prototype.heldPosition = function() {
    if(this.heldBy == null) {
        return new Vector3d(this.position.x, this.position.y, this.position.z);
    }
    return new Vector3d(
        this.heldBy.position.x + this.heldBy.facingX * this._heldOffsetX,
        this.heldBy.position.y + this._heldOffsetY,
        0
    );
};
