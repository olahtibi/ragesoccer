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
    "game/debugLog.js",
    "game/ball.js",
    "game/player.js",
    "game/goalDetector.js",
    "game/team.js",
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
  config.homeTeamSize = options.homeTeamSize != null ? options.homeTeamSize : 1;
  config.awayTeamSize = options.awayTeamSize != null ? options.awayTeamSize : 1;
  return config;
}

function makeFixture(options) {
  var config = makeConfig(options);
  var ball = new Ball(config.imgBall, config.ballRadius, new Vector3d(334, 433, 0));
  var homeTeam = new Team(config, "home", 1);
  var awayTeam = new Team(config, "away", 1);

  var goalDetector = new GoalDetector(config, ball);
  var stadium = new Stadium(config.imgPitch, ball, homeTeam, awayTeam, goalDetector);
  var physics = new Physics(config, stadium);
  var aiControllers = stadium.homeTeam.aiControllers.concat(stadium.awayTeam.aiControllers);
  var ai = stadium.awayTeam.aiControllers[0];

  return {
    config: config,
    ball: ball,
    playerHome: homeTeam.players[0],
    playerAway: awayTeam.players[0],
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    homePlayers: homeTeam.players,
    awayPlayers: awayTeam.players,
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
