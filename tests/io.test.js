var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

function makeInputGame(fixture) {
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  game.camera = {
    position: new Vector2d(0, 0),
    showStats: false
  };
  window.game = game;
  window.keyMap = {};
  game.debugLog.events = [];
  return game;
}

function selectHumanWithTeamAi(game) {
  game.started = true;
  game.updateAi();
}

test("Keyboard input controls the home player closest to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1, playerStrength: 10 });
  var game = makeInputGame(fixture);
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;
  selectHumanWithTeamAi(game);

  checkInput({ keyCode: 39, type: "keydown" });

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
  assertEqual(fixture.stadium.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[0].velocity.y, 0);
  assertEqual(fixture.stadium.homePlayers[1].velocity.x, fixture.config.teamVelocity("home"));
});

test("Keyboard diagonal input normalizes selected player velocity", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1, playerStrength: 10 });
  var game = makeInputGame(fixture);
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;
  selectHumanWithTeamAi(game);

  checkInput({ keyCode: 39, type: "keydown" });
  checkInput({ keyCode: 40, type: "keydown" });

  assertNear(fixture.stadium.homePlayers[1].velocity.x, fixture.config.teamVelocity("home") / Math.sqrt(2), 0.0001);
  assertNear(fixture.stadium.homePlayers[1].velocity.y, fixture.config.teamVelocity("home") / Math.sqrt(2), 0.0001);
});

test("Touch input controls the home player closest to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1, playerStrength: 10 });
  var game = makeInputGame(fixture);
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;
  selectHumanWithTeamAi(game);
  var scaleBy = fixture.config.computeScaleBy();

  touchHandler({
    touches: [
      {
        clientX: fixture.stadium.homePlayers[1].position.x * scaleBy,
        clientY: (fixture.stadium.homePlayers[1].position.y + 50) * scaleBy
      }
    ]
  });

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
  assertNear(fixture.stadium.homePlayers[1].velocity.y, fixture.config.teamVelocity("home"), 0.0001);
  assertNear(game.touchTarget.x, fixture.stadium.homePlayers[1].position.x, 0.0001);
  assertNear(game.touchTarget.y, fixture.stadium.homePlayers[1].position.y + 50, 0.0001);
});

test("Slash does not pause or dump logs when debug is disabled", function() {
  var fixture = makeFixture();
  var game = makeInputGame(fixture);
  var dumped = false;
  fixture.config.debug = false;
  game.debugLog.dump = function() {
    dumped = true;
  };

  checkInput({ keyCode: 191, type: "keydown" });

  assertEqual(game.isPaused(), false);
  assertEqual(dumped, false);
});

test("Slash toggles pause and dumps logs when debug is enabled", function() {
  var fixture = makeFixture();
  var game = makeInputGame(fixture);
  var dumped = false;
  fixture.config.debug = true;
  game.debugLog.dump = function() {
    dumped = true;
  };

  checkInput({ keyCode: 191, type: "keydown" });

  assertTrue(game.isPaused());
  assertEqual(dumped, true);
});

test("Input handlers record debug events only when debug is enabled", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = makeInputGame(fixture);
  fixture.config.debug = false;

  checkInput({ keyCode: 39, type: "keydown" });

  assertEqual(game.debugLog.events.length, 0);

  window.keyMap = {};
  game.debugLog.events = [];
  fixture.config.debug = true;
  checkInput({ keyCode: 39, type: "keydown" });
  checkInput({ keyCode: 39, type: "keyup" });

  assertEqual(game.debugLog.events.length, 2);
  assertEqual(game.debugLog.events[0].type, "keydown");
  assertEqual(game.debugLog.events[0].keyCode, 39);
  assertEqual(game.debugLog.events[1].type, "keyup");
});

test("Q and W zoom viewport in and out", function() {
  var fixture = makeFixture();
  var game = makeInputGame(fixture);
  var originalRatio = game.config.viewportRatio;

  checkInput({ keyCode: 81, type: "keydown" });

  assertEqual(game.config.viewportRatio, originalRatio / 1.2);

  checkInput({ keyCode: 81, type: "keyup" });
  checkInput({ keyCode: 87, type: "keydown" });

  assertNear(game.config.viewportRatio, originalRatio, 0.0001);
});

test("Touch handler records debug touch target in world coordinates", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = makeInputGame(fixture);
  var scaleBy = fixture.config.computeScaleBy();
  fixture.config.debug = true;
  game.camera.position.x = -10;
  game.camera.position.y = -20;

  touchHandler({
    touches: [
      {
        clientX: 30 * scaleBy,
        clientY: 40 * scaleBy
      }
    ]
  });

  assertEqual(game.debugLog.events.length, 1);
  assertEqual(game.debugLog.events[0].type, "touch");
  assertEqual(game.debugLog.events[0].target.x, 40);
  assertEqual(game.debugLog.events[0].target.y, 60);
});
