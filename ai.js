var Ai = function (config, stadium, level) {
	this.config = config;
	this.stadium = stadium;
	this.level = level;
	this.actionRadius = 20;
	this.speed = (36 + level * 2);
}

Ai.prototype.update = function() {	
	if(window.game != null && window.game.started == true && !window.game.isPaused()) {
		var alpha = this.computeAngle();
		var distance = this.computeDistance();
		if(alpha < 180 && Math.abs(this.stadium.ball.position.x - this.stadium.playerAway.position.x) < this.actionRadius / 4){
			this.kick();	
		}
		else if(distance >= this.actionRadius) {
			this.chase();
		}
		else {
			if(alpha >= 0 && alpha < 180) {
				this.positionUp();
			}
			else if(alpha >= 270 && alpha < 360) {			
				this.positionRight();
			}
			else if(alpha >= 180 && alpha < 270) {
				this.positionLeft();
			}		
			else {
				this.stop;
			}
		}
	}
};

Ai.prototype.chase = function() {
    this.stadium.playerAway.velocity = MathLib.computeVelocityForTarget(this.stadium.playerAway.position, this.stadium.ball.position, this.speed);
};

Ai.prototype.positionUp = function() {
	var target = new Vector2d(this.stadium.ball.position.x, this.stadium.ball.position.y - this.actionRadius / 2);
    this.stadium.playerAway.velocity = MathLib.computeVelocityForTarget(this.stadium.playerAway.position, target, this.speed);
};

Ai.prototype.positionLeft = function() {
    var target = new Vector2d(this.stadium.ball.position.x + this.actionRadius, this.stadium.ball.position.y);
    this.stadium.playerAway.velocity = MathLib.computeVelocityForTarget(this.stadium.playerAway.position, target, this.speed);
};

Ai.prototype.positionRight = function() {
    var target = new Vector2d(this.stadium.ball.position.x - this.actionRadius, this.stadium.ball.position.y);
    this.stadium.playerAway.velocity = MathLib.computeVelocityForTarget(this.stadium.playerAway.position, target, this.speed);
};

Ai.prototype.kick = function() {	
	var gX = (this.config.goalTopBottomRight[0] - this.config.goalTopBottomLeft[0]) / 2 + this.config.goalTopBottomLeft[0];
	var direction = 0;
	if(gX > this.stadium.ball.position.x) {
		direction = 1;
	}
	else if(gX < this.stadium.ball.position.x) {
		direction = -1;
	}
	var current = new Vector2d(this.stadium.playerAway.position.x, this.stadium.playerAway.position.y - 4);
	var target = new Vector2d(this.stadium.ball.position.x + 2, this.stadium.ball.position.y);
    this.stadium.playerAway.velocity = MathLib.computeVelocityForTarget(current, target, this.speed);
};

Ai.prototype.stop = function() {
	this.stadium.playerAway.velocity.x = 0;
	this.stadium.playerAway.velocity.y = 0;
};

Ai.prototype.computeAngle = function() {
	return MathLib.computeAngle(this.stadium.ball.position.x - this.stadium.playerAway.position.x, this.stadium.ball.position.y - this.stadium.playerAway.position.y);
};

Ai.prototype.computeDistance = function() {
	return MathLib.computeDistance(this.stadium.playerAway.position, this.stadium.ball.position)
};