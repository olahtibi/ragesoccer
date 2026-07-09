var Game = function (config, stadium, camera, physics) {
  this.config = config;
  this.stadium = stadium;
  this.camera = camera;
  this.physics = physics;
  this.started = false;
  this.paused = false;
  this.debugLog = new DebugLog(config);
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
  this.stadium.updateAi();
};

Game.prototype.drawAiDebug = function(ctx) {
  this.stadium.drawAiDebug(ctx);
};

function startLoop() {
  var level = 1;
  // Create configuration
  var config = new Configuration();
  // Create players and ball
  var ball = new Ball(config.imgBall, config.ballRadius, config.initialBallPosition);
  var homeTeam = new Team(config, "home", level);
  var awayTeam = new Team(config, "away", level);
  // Create goal detector
  var goalDetector = new GoalDetector(config, ball);
  // Create stadium
  var stadium = new Stadium(config.imgPitch, ball, homeTeam, awayTeam, goalDetector);
  var camera = new Camera(config, stadium);
  // Create physics
  var physics = new Physics(config, stadium);
  window.game = new Game(config, stadium, camera, physics);
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
  if (window.game.config.debug == true) {
    window.game.debugLog.record(window.game);
  }
  window.game.camera.windowToViewport(window.ctx);
  window.game.stadium.draw(window.ctx);
  if(window.game.isPaused()) {
      window.game.drawAiDebug(window.ctx);
  }
  window.game.camera.renderOverlay(window.ctx);
  window.requestAnimationFrame(renderNewFrame);
}
