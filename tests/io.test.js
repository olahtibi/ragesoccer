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
  return game;
}

test("Keyboard input controls the home player closest to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  makeInputGame(fixture);
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  checkInput({ keyCode: 39, type: "keydown" });

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
  assertEqual(fixture.stadium.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[0].velocity.y, 0);
  assertEqual(fixture.stadium.homePlayers[1].velocity.x, fixture.config.playerVelocity);
});

test("Keyboard diagonal input normalizes selected player velocity", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  makeInputGame(fixture);
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  checkInput({ keyCode: 39, type: "keydown" });
  checkInput({ keyCode: 40, type: "keydown" });

  assertNear(fixture.stadium.homePlayers[1].velocity.x, fixture.config.playerVelocity / Math.sqrt(2), 0.0001);
  assertNear(fixture.stadium.homePlayers[1].velocity.y, fixture.config.playerVelocity / Math.sqrt(2), 0.0001);
});

test("Touch input controls the home player closest to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  makeInputGame(fixture);
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;
  var scaleBy = fixture.config.comnputeScaleBy();

  touchHandler({
    touches: [
      {
        clientX: fixture.stadium.homePlayers[1].position.x * scaleBy,
        clientY: (fixture.stadium.homePlayers[1].position.y + 50) * scaleBy
      }
    ]
  });

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
  assertTrue(fixture.stadium.homePlayers[1].velocity.y > 0);
});

test("P toggles pause without dumping logs when debug is disabled", function() {
  var fixture = makeFixture();
  var game = makeInputGame(fixture);
  var dumped = false;
  game.debugLog.dump = function() {
    dumped = true;
  };

  checkInput({ keyCode: 80, type: "keydown" });

  assertTrue(game.isPaused());
  assertEqual(dumped, false);
});

test("P toggles pause and dumps logs when debug is enabled", function() {
  var fixture = makeFixture();
  var game = makeInputGame(fixture);
  var dumped = false;
  fixture.config.debug = true;
  game.debugLog.dump = function() {
    dumped = true;
  };

  checkInput({ keyCode: 80, type: "keydown" });

  assertTrue(game.isPaused());
  assertEqual(dumped, true);
});
