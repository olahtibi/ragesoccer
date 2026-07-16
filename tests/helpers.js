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
    "src/core/debugTool.js",
    "src/world/ball.js",
    "src/world/player.js",
    "src/world/detectors/goalDetector.js",
    "src/world/detectors/boundaryDetector.js",
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
    "src/core/restarts/restartRegistry.js",
    "src/core/restarts/restartController.js",
    "src/core/restarts/restartPositioning.js",
    "src/core/restarts/kickoffRestart.js",
    "src/core/restarts/throwInRestart.js",
    "src/core/restarts/cornerRestart.js",
    "src/core/restarts/goalKickRestart.js",
    "src/core/matchFlow.js",
    "src/input/io.js",
    "src/core/game.js"
  ].forEach(loadScript);

  scriptsLoaded = true;
}

function makeConfig(options) {
  var config = new Configuration();
  options = options || {};
  config.teams.homeSize = options.homeTeamSize != null ? options.homeTeamSize : 1;
  config.teams.awaySize = options.awayTeamSize != null ? options.awayTeamSize : 1;
  config.teams.homeStrength = options.playerStrength != null ?
    options.playerStrength : config.teams.homeStrength;
  config.teams.awayStrength = options.opponentStrength != null ?
    options.opponentStrength : config.teams.awayStrength;
  config.restarts.kickoffSide = options.kickoffSide != null ?
    options.kickoffSide : config.restarts.kickoffSide;
  config.restarts.outOfPlayEnabled = options.outOfPlayRestartsEnabled != null ?
    options.outOfPlayRestartsEnabled : config.restarts.outOfPlayEnabled;
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
    boundaryDetector: game.matchFlow._boundaryDetector,
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
  if (game.matchFlow.simulationMode() == "ballOnly") {
    game.physics.lastDt = dt;
    game.physics._updateBallPosition(dt);
    game.matchFlow.updateAfterPhysics(game.context());
    return;
  }
  game._updateAi();
  var canMove = !game.matchFlow.isRestartActive() || game.restartController.canTeamMove(game.teams[0]);
  game.humanController.update(canMove);
  game.physics.lastDt = dt;
  game.physics._updatePlayerPositions(dt);
  game.physics._resolveBallPlayerContacts();
  game.physics._updateBallPosition(dt);
  game.matchFlow.updateAfterPhysics(game.context());
  if (!game._handleGoalDetection()) game.matchFlow.detectOutOfPlay(game.context());
}

module.exports = {
  loadGameScripts: loadGameScripts,
  makeConfig: makeConfig,
  makeFixture: makeFixture,
  replayDebugLog: replayDebugLog
};
