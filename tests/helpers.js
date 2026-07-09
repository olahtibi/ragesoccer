var fs = require("fs");
var path = require("path");
var vm = require("vm");

var rootDir = path.resolve(__dirname, "..");
var scriptsLoaded = false;

function setupBrowserStubs() {
  global.window = {
    innerWidth: 640,
    innerHeight: 480,
    location: {
      search: ""
    },
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
  config.playerStrength = options.playerStrength != null ? options.playerStrength : config.playerStrength;
  config.opponentStrength = options.opponentStrength != null ? options.opponentStrength : config.opponentStrength;
  config.playerVelocity = config.teamVelocity("home");
  return config;
}

function makeFixture(options) {
  var config = makeConfig(options);
  var ball = new Ball(config.imgBall, config.ballRadius, new Vector3d(334, 433, 0));
  var homeTeam = new Team(config, "home");
  var awayTeam = new Team(config, "away");

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

function replayDebugLog(payload, fixture) {
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  game.camera = {
    position: new Vector2d(0, 0),
    showStats: false
  };
  window.game = game;
  window.keyMap = {};

  var events = (payload.events || []).slice();
  var eventIndex = 0;
  var frames = payload.frames || [];
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    while (eventIndex < events.length && events[eventIndex].frame <= frame.frame) {
      applyReplayEvent(events[eventIndex], game);
      eventIndex++;
    }
    advanceReplayFrame(game, frame.dt || 0);
  }

  return game;
}

function applyReplayEvent(event, game) {
  if (event.type === "keydown" || event.type === "keyup") {
    checkInput({
      type: event.type,
      keyCode: event.keyCode
    });
    return;
  }

  if (event.type === "touch") {
    var player = game.stadium.homeTeam.selectHumanPlayer(game.stadium.ball);
    player.velocity = MathLib.computeVelocityForTarget(
      player.position,
      new Vector2d(event.target.x, event.target.y),
      game.config.teamVelocity("home")
    );
    game.started = true;
  }
}

function advanceReplayFrame(game, dt) {
  game.updateAi();
  game.physics.lastDt = dt;
  game.physics.updatePlayerPosition(dt);
  game.physics.resolveBallPlayerContacts();
  game.physics.updateBallPosition(dt);
  game.stadium.goalDetector.update();
}

module.exports = {
  loadGameScripts: loadGameScripts,
  makeConfig: makeConfig,
  makeFixture: makeFixture,
  replayDebugLog: replayDebugLog
};
