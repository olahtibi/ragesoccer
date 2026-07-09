var Game = function (config, stadium, camera, physics) {
  this.config = config;
  this.stadium = stadium;
  this.camera = camera;
  this.physics = physics;
  this.started = false;
  this.paused = false;
  this.touchTarget = null;
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

Game.prototype.updateHumanControl = function() {
  if (this.isPaused()) {
    return;
  }

  if (this.hasMovementInput()) {
    this.touchTarget = null;
    return;
  }

  if (this.touchTarget != null) {
    this.updateTouchControl();
    return;
  }

  var player = this.stadium.selectHumanPlayer();
  this.stopPlayer(player);
};

Game.prototype.hasMovementInput = function() {
  var keys = window.keyMap || {};
  return keys[37] || keys[38] || keys[39] || keys[40];
};

Game.prototype.updateTouchControl = function() {
  var player = this.stadium.humanPlayer;
  if (player == null) {
    this.touchTarget = null;
    return;
  }

  var threshold = this.config.aiTargetDeadband || 2;
  if (MathLib.computeDistance(player.position, this.touchTarget) <= threshold) {
    this.touchTarget = null;
    this.stopPlayer(player);
    return;
  }

  player.velocity = MathLib.computeVelocityForTarget(player.position, this.touchTarget, this.config.teamVelocity("home"));
};

Game.prototype.stopPlayer = function(player) {
  if (player == null) {
    return;
  }
  player.velocity.x = 0;
  player.velocity.y = 0;
};

Game.prototype.updateAi = function() {
  this.stadium.updateAi();
};

Game.prototype.drawAiDebug = function(ctx) {
  this.stadium.drawAiDebug(ctx);
};

function startLoop() {
  // Create configuration
  var config = new Configuration();
  // Create players and ball
  var ball = new Ball(config.imgBall, config.ballRadius, config.initialBallPosition);
  var homeTeam = new Team(config, "home");
  var awayTeam = new Team(config, "away");
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
  window.game.updateHumanControl();
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
