var Game = function (config, stadium, camera, physics, aiControllers) {
  this.config = config;
  this.stadium = stadium;
  this.camera = camera;
  this.physics = physics;
  this.aiControllers = aiControllers || [];
  this.ai = this.aiControllers[0] || null;
  this.started = false;
  this.paused = false;
};

Game.prototype.isPaused = function() {
    return this.paused;
};

// Physics.update() short-circuits while paused, so we don't need to save or
// restore any velocities here — the simulation simply doesn't step.
Game.prototype.togglePause = function() {
    this.paused = !this.paused;
};

Game.prototype.updateAi = function() {
  for (var i = 0; i < this.aiControllers.length; i++) {
    if (this.aiControllers[i].controlledPlayer !== this.stadium.humanPlayer) {
      this.aiControllers[i].update();
    }
  }
};

Game.prototype.drawAiDebug = function(ctx) {
  for (var i = 0; i < this.aiControllers.length; i++) {
    this.aiControllers[i].draw(ctx);
  }
};

function createTeamPlayers(config, teamSide) {
  var positions = config.initialPlayerPositions(teamSide);
  var players = [];
  var img = teamSide == "home" ? config.imgPlayerHome : config.imgPlayerAway;
  for (var i = 0; i < positions.length; i++) {
    var player = new Player(img, positions[i], config.playerSpriteWidth, config.playerSpriteHeight, config.playerSpriteCenterX, config.playerSpriteCenterY);
    if (teamSide == "away") {
      player.facingY = 1;
    }
    players.push(player);
  }
  return players;
}

function createAiControllers(config, stadium, level) {
  var controllers = [];
  for (var i = 0; i < stadium.awayPlayers.length; i++) {
    controllers.push(new Ai(config, stadium, stadium.awayPlayers[i], "away", level));
  }
  for (var j = 0; j < stadium.homePlayers.length; j++) {
    controllers.push(new Ai(config, stadium, stadium.homePlayers[j], "home", level));
  }
  return controllers;
}

function startLoop() {
  var level = 1;
  // Create configuration
  var config = new Configuration();
  // Create players and ball
  var ball = new Ball(config.imgBall, config.ballRadius, config.initialBallPosition);
  var homePlayers = createTeamPlayers(config, "home");
  var awayPlayers = createTeamPlayers(config, "away");
  // Create goal detector
  var goalDetector = new GoalDetector(config, ball);
  // Create stadium
  var stadium = new Stadium(config.imgPitch, ball, homePlayers, awayPlayers, goalDetector);
  var camera = new Camera(config, stadium);
  // Create phisics
  var physics = new Physics(config, stadium);
  // Create AI
  var aiControllers = createAiControllers(config, stadium, level);
  window.game = new Game(config, stadium, camera, physics, aiControllers);
  window.ctx = createContext();
  window.requestAnimationFrame(renderNewFrame);
}

function createContext() {
  var canvas = window.game.config.objCanvas;
  canvas.width = window.game.config.viewportWidth;
  canvas.height = window.game.config.viewportHeight;
  var ctx = canvas.getContext("2d");
  ctx['imageSmoothingEnabled'] = false;       /* standard */
  ctx['mozImageSmoothingEnabled'] = false;    /* Firefox */
  ctx['oImageSmoothingEnabled'] = false;      /* Opera */
  ctx['webkitImageSmoothingEnabled'] = false; /* Safari */
  ctx['msImageSmoothingEnabled'] = false;     /* IE */
  return ctx;
}

function renderNewFrame() {    
  window.game.updateAi();
  window.game.physics.update();
  window.game.stadium.goalDetector.update();  
  window.game.camera.windowToViewport(window.ctx);
  window.game.stadium.draw(window.ctx);
  if(window.game.isPaused()) {
      window.game.drawAiDebug(window.ctx);
  }
  window.game.camera.renderOverlay(window.ctx);
  window.requestAnimationFrame(renderNewFrame);
}
