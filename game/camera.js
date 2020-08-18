var Camera = function (config, stadium) {
  this.config = config;
  this.stadium = stadium;
  this.position = new Vector2d(0, 0);
  this.showStats = false;
};

Camera.prototype.windowToViewport = function(ctx) {
    ctx.save();
	var scaleBy = this.config.comnputeScaleBy();
	ctx.scale(scaleBy, scaleBy);
    if(this.stadium.ball.position.x * scaleBy >= this.config.stadiumWidth * scaleBy - (this.config.viewportWidth / 2)) {
        this.position.x = (this.config.viewportWidth - this.config.stadiumWidth * scaleBy) / scaleBy;
    }
    else if(this.stadium.ball.position.x * scaleBy <= (this.config.viewportWidth / 2)) {
        this.position.x = 0;
    }
    else {
        this.position.x = ((this.config.viewportWidth / 2) - this.stadium.ball.position.x * scaleBy) / scaleBy;
    }
    if(this.stadium.ball.position.y * scaleBy >= this.config.stadiumHeight * scaleBy - (this.config.viewportHeight / 2)) {
        this.position.y = (this.config.viewportHeight - this.config.stadiumHeight * scaleBy) /scaleBy ;
    }
    else if(this.stadium.ball.position.y * scaleBy <= (this.config.viewportHeight / 2)) {
        this.position.y =  0;
    }
    else {
        this.position.y = ((this.config.viewportHeight / 2) - this.stadium.ball.position.y * scaleBy) / scaleBy;
    }
    ctx.translate(this.position.x, this.position.y);
};

Camera.prototype.renderOverlay = function(ctx) {
    if(this.config.viewportRatio >= 0.6 && this.config.viewportRatio <= 0.8) {
        ctx.font = "30px Arial";
        ctx.fillStyle = 'white';
        ctx.fillText(this.stadium.goalDetector.homeScore, 20 - this.position.x, 40 - this.position.y);
        ctx.fillStyle = 'red';
        ctx.fillText(this.stadium.goalDetector.homeScore, 21 - this.position.x, 39 - this.position.y);
        ctx.fillStyle = 'white';
        ctx.fillText("-", 60 - this.position.x, 40 - this.position.y);
        ctx.fillStyle = 'black';
        ctx.fillText("-", 61 - this.position.x, 39 - this.position.y);
        ctx.fillStyle = 'white';
        ctx.fillText(this.stadium.goalDetector.awayScore, 80 - this.position.x, 40 - this.position.y);
        ctx.fillStyle = 'blue';
        ctx.fillText(this.stadium.goalDetector.awayScore, 81 - this.position.x, 39 - this.position.y);
        if(this.showStats) {
            ctx.font = "10px Arial";
            ctx.fillStyle = 'white';
            ctx.fillText("FPS: " + window.game.physics.fps, 335 - this.position.x, 15 - this.position.y);
        }
    }
    ctx.restore();

};
