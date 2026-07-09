var fs = require("fs");
var path = require("path");
var vm = require("vm");

var rootDir = path.resolve(__dirname, "..");
var scriptsLoaded = false;

function setupBrowserStubs() {
  global.window = {
    innerWidth: 640,
    innerHeight: 480,
    game: null
  };

  global.document = {
    getElementById: function(id) {
      return {
        id: id,
        width: 0,
        height: 0,
        getContext: function() {
          return {};
        }
      };
    }
  };
}

function loadScript(relativePath) {
  var fullPath = path.join(rootDir, relativePath);
  var code = fs.readFileSync(fullPath, "utf8");
  vm.runInThisContext(code, { filename: relativePath });
}

function loadGameScripts() {
  if (scriptsLoaded) {
    return;
  }

  setupBrowserStubs();

  [
    "mathlib/vector.js",
    "mathlib/mathlib.js",
    "game/configuration.js",
    "game/ball.js",
    "game/player.js",
    "game/goalDetector.js",
    "game/stadium.js",
    "game/physics.js",
    "game/ai.js"
  ].forEach(loadScript);

  scriptsLoaded = true;
}

function makeConfig() {
  return new Configuration();
}

function makeFixture() {
  var config = makeConfig();
  var ball = new Ball(config.imgBall, config.ballRadius, new Vector3d(334, 433, 0));
  var playerHome = new Player(
    config.imgPlayerHome,
    new Vector2d(332, 480),
    config.playerSpriteWidth,
    config.playerSpriteHeight,
    config.playerSpriteCenterX,
    config.playerSpriteCenterY
  );
  var playerAway = new Player(
    config.imgPlayerAway,
    new Vector2d(334, 400),
    config.playerSpriteWidth,
    config.playerSpriteHeight,
    config.playerSpriteCenterX,
    config.playerSpriteCenterY
  );
  playerAway.facingY = 1;

  var goalDetector = new GoalDetector(config, ball);
  var stadium = new Stadium(config.imgPitch, ball, playerHome, playerAway, goalDetector);
  var physics = new Physics(config, stadium);
  var ai = new Ai(config, stadium, 1);

  return {
    config: config,
    ball: ball,
    playerHome: playerHome,
    playerAway: playerAway,
    goalDetector: goalDetector,
    stadium: stadium,
    physics: physics,
    ai: ai
  };
}

module.exports = {
  loadGameScripts: loadGameScripts,
  makeConfig: makeConfig,
  makeFixture: makeFixture
};
