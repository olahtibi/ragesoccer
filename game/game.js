var Game = function (config, stadium, camera, physics, ai) {
  this.config = config;
  this.stadium = stadium;
  this.camera = camera;
  this.physics = physics;
  this.ai = ai;
  this.started = false;
};

function startLoop() {
  var level = 4;
  // Create configuration
  var config = new Configuration();
  // Create players and ball
  var ball = new Ball(config.imgBall, config.ballRadius, config.initialBallPosition);
  var playerHome = new Player(config.imgPlayerHome, config.initialPlayerHomePosition, config.playerSpriteWidth, config.playerSpriteHeight, config.playerSpriteCenterX, config.playerSpriteCenterY);
  var playerAway = new Player(config.imgPlayerAway, config.initialPlayerAwayPosition, config.playerSpriteWidth, config.playerSpriteHeight, config.playerSpriteCenterX, config.playerSpriteCenterY);
  playerAway.facingY = 1;
  // Create goal detector
  var goalDetector = new GoalDetector(config, ball);
  // Create stadium
  var stadium = new Stadium(config.imgPitch, ball, playerHome, playerAway, goalDetector);
  var camera = new Camera(config, stadium);
  // Create phisics
  var physics = new Physics(config, stadium);
  // Create AI
  var ai = new Ai(config, stadium, level);
  window.game = new Game(config, stadium, camera, physics, ai);
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
  window.game.ai.update();
  window.game.physics.update();
  window.game.stadium.goalDetector.update();  
  window.game.camera.windowToViewport(window.ctx);
  window.game.stadium.draw(window.ctx);
  window.game.camera.renderOverlay(window.ctx);
  window.requestAnimationFrame(renderNewFrame);
}
