var Camera = function (config, stadium) {
  this.config = config;
  this.stadium = stadium;
  this.position = new Vector2d(0, 0);
  this.focusTarget = null;
  this.showStats = false;
};

Camera.prototype.windowToViewport = function(ctx) {
    ctx.save();
	var scaleBy = this.config.computeScaleBy();
	ctx.scale(scaleBy, scaleBy);
    var target = this.focusTarget || this.stadium.ball.position;
    var desired = this.viewportPositionForTarget(target, scaleBy);
    if(this.focusTarget != null) {
        var lerp = this.config.cutsceneCameraLerp || 1;
        this.position.x += (desired.x - this.position.x) * lerp;
        this.position.y += (desired.y - this.position.y) * lerp;
    } else {
        this.position.x = desired.x;
        this.position.y = desired.y;
    }
    ctx.translate(this.position.x, this.position.y);
};

Camera.prototype.viewportPositionForTarget = function(target, scaleBy) {
    var position = new Vector2d(0, 0);
    if(target.x * scaleBy >= this.config.stadiumWidth * scaleBy - (this.config.viewportWidth / 2)) {
        position.x = (this.config.viewportWidth - this.config.stadiumWidth * scaleBy) / scaleBy;
    }
    else if(target.x * scaleBy <= (this.config.viewportWidth / 2)) {
        position.x = 0;
    }
    else {
        position.x = ((this.config.viewportWidth / 2) - target.x * scaleBy) / scaleBy;
    }
    if(target.y * scaleBy >= this.config.stadiumHeight * scaleBy - (this.config.viewportHeight / 2)) {
        position.y = (this.config.viewportHeight - this.config.stadiumHeight * scaleBy) /scaleBy ;
    }
    else if(target.y * scaleBy <= (this.config.viewportHeight / 2)) {
        position.y =  0;
    }
    else {
        position.y = ((this.config.viewportHeight / 2) - target.y * scaleBy) / scaleBy;
    }
    return position;
};

Camera.prototype.setFocusTarget = function(target) {
    this.focusTarget = target;
};

Camera.prototype.clearFocusTarget = function() {
    this.focusTarget = null;
};

Camera.prototype.hasArrivedAtFocus = function() {
    if(this.focusTarget == null) {
        return true;
    }
    var desired = this.viewportPositionForTarget(this.focusTarget, this.config.computeScaleBy());
    return MathLib.computeDistance(this.position, desired) <= this.config.cutsceneCameraArrivedRadius;
};

Camera.prototype.renderOverlay = function(ctx, displayFps) {
    if(this.config.viewportRatio >= 0.6 && this.config.viewportRatio <= 0.8) {
        ctx.font = "30px Arial";
        ctx.fillStyle = 'white';
        ctx.fillText(this.stadium.homeTeam.score, 20 - this.position.x, 40 - this.position.y);
        ctx.fillStyle = 'red';
        ctx.fillText(this.stadium.homeTeam.score, 21 - this.position.x, 39 - this.position.y);
        ctx.fillStyle = 'white';
        ctx.fillText("-", 60 - this.position.x, 40 - this.position.y);
        ctx.fillStyle = 'black';
        ctx.fillText("-", 61 - this.position.x, 39 - this.position.y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.stadium.awayTeam.score, 80 - this.position.x, 40 - this.position.y);
        ctx.fillStyle = 'blue';
        ctx.fillText(this.stadium.awayTeam.score, 81 - this.position.x, 39 - this.position.y);
        if(this.showStats) {
            ctx.font = "10px Arial";
            ctx.fillStyle = 'white';
            ctx.fillText("FPS: " + displayFps, 420 - this.position.x, 15 - this.position.y);
        }
    }
    ctx.restore();

};
