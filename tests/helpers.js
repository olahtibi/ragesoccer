var fs = require("fs");
var path = require("path");
var vm = require("vm");

var rootDir = path.resolve(__dirname, "..");
var scriptsLoaded = false;

function setupBrowserStubs() {
  global.window = {
    innerWidth: 640,
    innerHeight: 480,
    game: null,
    keyMap: {},
    addEventListener: function() {},
    requestAnimationFrame: function() {}
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
    "game/ai.js",
    "game/camera.js",
    "game/game.js",
    "io/io.js"
  ].forEach(loadScript);

  scriptsLoaded = true;
}

function makeConfig(options) {
  var config = new Configuration();
  options = options || {};
  if (options.homeTeamSize != null) {
    config.homeTeamSize = options.homeTeamSize;
  }
  if (options.awayTeamSize != null) {
    config.awayTeamSize = options.awayTeamSize;
  }
  return config;
}

function makeFixture(options) {
  var config = makeConfig(options);
  var ball = new Ball(config.imgBall, config.ballRadius, new Vector3d(334, 433, 0));
  var homePlayers = createTeamPlayers(config, "home");
  var awayPlayers = createTeamPlayers(config, "away");

  var goalDetector = new GoalDetector(config, ball);
  var stadium = new Stadium(config.imgPitch, ball, homePlayers, awayPlayers, goalDetector);
  var physics = new Physics(config, stadium);
  var aiControllers = createAiControllers(config, stadium, 1);
  var ai = aiControllers[0] || new Ai(config, stadium, 1);

  return {
    config: config,
    ball: ball,
    playerHome: stadium.playerHome,
    playerAway: stadium.playerAway,
    homePlayers: homePlayers,
    awayPlayers: awayPlayers,
    goalDetector: goalDetector,
    stadium: stadium,
    physics: physics,
    aiControllers: aiControllers,
    ai: ai
  };
}

module.exports = {
  loadGameScripts: loadGameScripts,
  makeConfig: makeConfig,
  makeFixture: makeFixture
};
