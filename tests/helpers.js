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
    "src/math/vector.js",
    "src/math/mathlib.js",
    "src/core/configuration.js",
    "src/core/debugLog.js",
    "src/world/ball.js",
    "src/world/player.js",
    "src/world/goalDetector.js",
    "src/world/boundaryDetector.js",
    "src/ai/formation.js",
    "src/ai/commands/inactiveCommand.js",
    "src/ai/commands/moveToPositionCommand.js",
    "src/ai/commands/attackBallCommand.js",
    "src/ai/commands/commandRegistry.js",
    "src/ai/individualAi.js",
    "src/ai/teamAi.js",
    "src/world/team.js",
    "src/world/stadium.js",
    "src/world/physics.js",
    "src/core/camera.js",
    "src/core/cutscene.js",
    "src/input/humanController.js",
    "src/core/restart.js",
    "src/core/restartPositioning.js",
    "src/core/kickoffRestart.js",
    "src/core/throwInRestart.js",
    "src/core/cornerRestart.js",
    "src/core/goalKickRestart.js",
    "src/core/matchFlow.js",
    "src/input/io.js",
    "src/core/game.js"
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
  config.kickoffSide = options.kickoffSide != null ? options.kickoffSide : config.kickoffSide;
  config.outOfPlayRestartsEnabled = options.outOfPlayRestartsEnabled != null ?
    options.outOfPlayRestartsEnabled : config.outOfPlayRestartsEnabled;
  config.playerVelocity = config.teamVelocity("home");
  return config;
}

function makeFixture(options) {
  var config = makeConfig(options);
  var game = createGame(config);
  var ball = game.stadium.ball;
  var homeTeam = game.teams[0];
  var awayTeam = game.teams[1];
  var goalDetector = game.goalDetector;
  var stadium = game.stadium;
  var physics = game.physics;

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
    boundaryDetector: game.boundaryDetector,
    stadium: stadium,
    physics: physics,
    teamAis: game.teamAis,
    homeTeamAi: game.teamAis[0],
    awayTeamAi: game.teamAis[1],
    game: game
  };
}

function replayDebugLog(payload, fixture) {
  var game = fixture.game;
  game.camera = {
    position: new Vector2d(0, 0),
    showStats: false
  };
  window.game = game;
  var input = new BrowserInput(game, window);

  var events = (payload.events || []).slice();
  var eventIndex = 0;
  var frames = payload.frames || [];
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    while (eventIndex < events.length && events[eventIndex].frame <= frame.frame) {
      applyReplayEvent(events[eventIndex], game, input);
      eventIndex++;
    }
    advanceReplayFrame(game, frame.dt || 0);
  }

  return game;
}

function applyReplayEvent(event, game, input) {
  if (event.type === "keydown" || event.type === "keyup") {
    input.handleKey({
      type: event.type,
      keyCode: event.keyCode
    });
    return;
  }

  if (event.type === "touch") {
    var target = new Vector2d(event.target.x, event.target.y);
    game.humanController.setTouchTarget(target);
    game.resumeFromInput(new Vector2d(
      target.x - game.stadium.ball.position.x,
      target.y - game.stadium.ball.position.y
    ));
  }
}

function advanceReplayFrame(game, dt) {
  if (game.isOutOfPlayPending()) {
    game.physics.lastDt = dt;
    game.physics.updateBallPosition(dt);
    game.updatePendingOutOfPlay();
    return;
  }
  game.updateAi();
  var canMove = !game.matchFlow.isRestartActive() || game.restartController.canTeamMove(game.teams[0]);
  game.humanController.update(canMove);
  game.physics.lastDt = dt;
  game.physics.updatePlayerPosition(dt);
  game.physics.resolveBallPlayerContacts();
  game.physics.updateBallPosition(dt);
  game.matchFlow.updateAfterPhysics(game.context());
  if (!game.updateScore()) game.updateOutOfPlay();
}

module.exports = {
  loadGameScripts: loadGameScripts,
  makeConfig: makeConfig,
  makeFixture: makeFixture,
  replayDebugLog: replayDebugLog
};
