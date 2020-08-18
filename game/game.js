var Game = function (config, stadium, camera, physics, ai) {
  this.config = config;
  this.stadium = stadium;
  this.camera = camera;
  this.physics = physics;
  this.ai = ai;
  this.started = false;
  this.resumeState = null
};

Game.prototype.isPaused = function() {
    return this.resumeState != null;
};

Game.prototype.togglePause = function() {
    if(this.resumeState == null) {
        // Save state
        this.resumeState = new GameState(
            this.stadium.goalDetector.ball.velocity,
            this.stadium.playerHome.velocity,
            this.stadium.playerAway.velocity,
            this.physics.lastUpdated,
            this.physics.kickStarted
        );
        // Freeze velocities
        this.stadium.goalDetector.ball.velocity = new Vector3d(0, 0, 0);
        this.stadium.playerHome.velocity = new Vector2d(0, 0);
        this.stadium.playerAway.velocity = new Vector2d(0, 0);
        this.physics.kickStarted = null
    }
    else {
        // Restore state
        this.stadium.goalDetector.ball.velocity = this.resumeState.ballVelocity;
        this.stadium.playerHome.velocity = this.resumeState.playerHomeVelocity;
        this.stadium.playerAway.velocity = this.resumeState.playerAwayVelocity;
        if(this.resumeState.kickStarted != null) {
            var currentTime = new Date().getTime();
            var diff = (currentTime - this.resumeState.currentTime);
            this.physics.lastUpdated = this.resumeState.lastUpdated + diff;
            this.physics.kickStarted = this.resumeState.kickStarted + diff;
        }
        this.resumeState = null;
    }
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
  if(window.game.isPaused()) {
      window.game.ai.draw(window.ctx);
  }
  window.game.camera.renderOverlay(window.ctx);
  window.requestAnimationFrame(renderNewFrame);
}
