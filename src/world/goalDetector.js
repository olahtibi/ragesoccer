var GoalDetector = function (config, ball) {
  this.config = config;
  this.ball = ball;
  this.homeScore = 0;
  this.awayScore = 0;
  this.state = "start";
};

GoalDetector.prototype.update = function() {

	if(this.state == "start" && MathLib.inside(this.config.goalTopTopLeft, this.config.goalTopBottomRight, this.ball.position)) {
		this.homeScore++;
		this.state = "goal";
	}
	else if(this.state == "start" && MathLib.inside(this.config.goalBottomTopLeft, this.config.goalBottomBottomRight, this.ball.position)) {
		this.awayScore++;
		this.state = "goal";
	}
	else if(this.state == "goal" && !MathLib.inside(this.config.goalTopTopLeft, this.config.goalTopBottomRight, this.ball.position) && !MathLib.inside(this.config.goalBottomTopLeft, this.config.goalBottomBottomRight, this.ball.position)) {
		this.state = "start";
	} 

};