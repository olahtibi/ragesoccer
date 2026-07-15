var GoalDetector = function (config, ball) {
  this.config = config;
  this.ball = ball;
  this.state = "start";
};

GoalDetector.prototype.update = function() {

	if(this.state == "start" && MathLib.inside(this.config.goalTopTopLeft, this.config.goalTopBottomRight, this.ball.position)) {
		this.state = "goal";
		return "home";
	}
	else if(this.state == "start" && MathLib.inside(this.config.goalBottomTopLeft, this.config.goalBottomBottomRight, this.ball.position)) {
		this.state = "goal";
		return "away";
	}
	else if(this.state == "goal" && !MathLib.inside(this.config.goalTopTopLeft, this.config.goalTopBottomRight, this.ball.position) && !MathLib.inside(this.config.goalBottomTopLeft, this.config.goalBottomBottomRight, this.ball.position)) {
		this.state = "start";
	} 
	return null;

};
