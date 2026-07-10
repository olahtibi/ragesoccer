var IndividualAi = function(config, team, player) {
  this.config = config;
  this.team = team;
  this.player = player;
  this.command = "inactive";
  this.commandState = "stopped";
  this.target = null;
  this.sPos = null;
  this.tPos = null;
};

IndividualAi.prototype.setCommand = function(command, target) {
  this.command = command;
  this.target = target || null;
};

IndividualAi.prototype.update = function(context) {
  if (this.command == "inactive") {
    this.commandState = "stopped";
    this.sPos = null;
    this.tPos = null;
    return;
  }

  var target = this.target;
  if (this.command == "attackBall") {
    target = context.ball.position;
  }

  if (target == null) {
    this.stop();
    return;
  }

  this.moveTo(target);
};

IndividualAi.prototype.moveTo = function(target) {
  this.sPos = this.player.position;
  this.tPos = target;

  var dx = target.x - this.player.position.x;
  var dy = target.y - this.player.position.y;
  var distance = Math.sqrt(dx * dx + dy * dy);
  if (distance <= this.config.aiTargetReachedRadius) {
    this.stop();
    return;
  }

  var speed = this.config.teamVelocity(this.team.side);
  this.commandState = "moving";
  this.player.velocity.x = dx / distance * speed;
  this.player.velocity.y = dy / distance * speed;
};

IndividualAi.prototype.stop = function() {
  this.commandState = "stopped";
  this.player.velocity.x = 0;
  this.player.velocity.y = 0;
};

IndividualAi.prototype.draw = function(ctx) {
  if (this.sPos != null && this.tPos != null) {
    ctx.beginPath();
    ctx.moveTo(this.sPos.x, this.sPos.y);
    ctx.lineTo(this.tPos.x, this.tPos.y);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "blue";
    ctx.stroke();
  }
};

IndividualAi.prototype.debugSnapshot = function() {
  return {
    command: this.command,
    state: this.commandState,
    target: this.tPos
  };
};
