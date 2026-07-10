var TeamAi = function(config, stadium, team, opponentTeam) {
  this.config = config;
  this.stadium = stadium;
  this.team = team;
  this.opponentTeam = opponentTeam;
  this.formation = new Formation(config);
  this.state = "kickoff";
  this._individualAis = [];

  for (var i = 0; i < team.players.length; i++) {
    this._individualAis.push(new IndividualAi(config, team, team.players[i]));
  }
};

TeamAi.prototype.update = function() {
  if (!this.config.teamAiEnabled || !this.shouldUpdate()) {
    return;
  }

  this.state = this.nextState();
  var targets = this.formation.positions(this.state, this.team.side, this.team.players.length);
  var closest = this.team.side == "home" ? this.selectedHumanPlayer() : this.closestPlayerToBall();
  var activeHumanControl = this.team.side == "home" && this.hasActiveHumanControl();
  var context = {
    ball: this.stadium.ball,
    team: this.team,
    opponentTeam: this.opponentTeam
  };

  for (var i = 0; i < this._individualAis.length; i++) {
    var ai = this._individualAis[i];
    if (this.team.side == "home" && ai.player === closest) {
      this.team.humanPlayer = ai.player;
      if (!activeHumanControl) {
        ai.player.velocity.x = 0;
        ai.player.velocity.y = 0;
      }
      ai.setCommand("inactive", null);
    } else if (this.team.side != "home" && ai.player === closest) {
      ai.setCommand("attackBall", null);
    } else {
      ai.setCommand("moveToPosition", targets[i]);
    }
    ai.update(context);
  }
};

TeamAi.prototype.shouldUpdate = function() {
  if (typeof window == "undefined" || window.game == null) {
    return true;
  }
  return window.game.started == true && !window.game.isPaused();
};

TeamAi.prototype.hasActiveHumanControl = function() {
  if (typeof window == "undefined" || window.game == null) {
    return false;
  }
  if (window.game.touchTarget != null) {
    return true;
  }
  if (typeof hasMovementInput == "function" && hasMovementInput()) {
    return true;
  }
  return false;
};

TeamAi.prototype.nextState = function() {
  if (this.isKickoff()) {
    return "kickoff";
  }

  if (this.isBallInOwnHalf()) {
    return "defense";
  }

  if (this.isBallInOpponentHalf()) {
    return "attack";
  }

  if (this.state == "defense" || this.state == "attack") {
    return this.state;
  }
  return "attack";
};

TeamAi.prototype.isKickoff = function() {
  return MathLib.computeDistance(this.stadium.ball.position, this.config.initialBallPosition) <= this.config.aiKickoffSpotRadius;
};

TeamAi.prototype.isBallInOwnHalf = function() {
  var y = this.stadium.ball.position.y;
  if (this.team.side == "home") {
    return y > this.config.aiCenterY;
  }
  return y < this.config.aiCenterY;
};

TeamAi.prototype.isBallInOpponentHalf = function() {
  var y = this.stadium.ball.position.y;
  if (this.team.side == "home") {
    return y < this.config.aiCenterY;
  }
  return y > this.config.aiCenterY;
};

TeamAi.prototype.closestPlayerToBall = function() {
  var closest = null;
  var closestDistance = Infinity;
  for (var i = 0; i < this.team.players.length; i++) {
    var player = this.team.players[i];
    var distance = MathLib.computeDistance(player.position, this.stadium.ball.position);
    if (distance < closestDistance) {
      closest = player;
      closestDistance = distance;
    }
  }
  return closest;
};

TeamAi.prototype.selectedHumanPlayer = function() {
  var closest = this.closestPlayerToBall();
  var current = this.team.humanPlayer;
  if (current != null && closest !== current) {
    var currentDistance = MathLib.computeDistance(current.position, this.stadium.ball.position);
    var closestDistance = MathLib.computeDistance(closest.position, this.stadium.ball.position);
    var hysteresis = this.config.humanSwitchHysteresisDistance || 0;
    if (currentDistance <= closestDistance + hysteresis) {
      return current;
    }
  }
  return closest;
};

TeamAi.prototype.draw = function(ctx) {
  for (var i = 0; i < this._individualAis.length; i++) {
    this._individualAis[i].draw(ctx);
  }
};

TeamAi.prototype.debugSnapshot = function() {
  var result = [];
  for (var i = 0; i < this._individualAis.length; i++) {
    var snapshot = this._individualAis[i].debugSnapshot();
    snapshot.teamState = this.state;
    result.push(snapshot);
  }
  return result;
};
