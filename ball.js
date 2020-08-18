var Ball = function (imgBall, ballRadius, position) {
  this.imgBall = imgBall;
  this.ballRadius = ballRadius;
  this.position = position;
  this.velocity = new Vector3d(0, 0, 0)
  this.kickDirection = new Vector2d(0, 0)
  this.phaseIndex = 0;
};

Ball.prototype.draw = function(ctx) {
    var size = this.ballRadius * 2;
    ctx.drawImage(
        this.imgBall, 
        (size * 4), 0, 
        size, size, 
        this.position.x - this.ballRadius + 1 + this.position.z,
        this.position.y - this.ballRadius + 1 + this.position.z,
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