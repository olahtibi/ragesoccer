var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function makeDebugGame(options) {
  var fixture = makeFixture(options);
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  return {
    fixture: fixture,
    game: game
  };
}

test("DebugLog records no snapshots when debug is false", function() {
  var setup = makeDebugGame();

  setup.game.debugLog.record(setup.game);

  assertEqual(setup.game.debugLog.snapshots.length, 0);
});

test("DebugLog records snapshots when debug is true", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogEveryNFrames = 1;

  setup.game.debugLog.record(setup.game);

  assertEqual(setup.game.debugLog.snapshots.length, 1);
});

test("DebugLog samples snapshots by configured frame interval", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogEveryNFrames = 3;

  for (var i = 0; i < 7; i++) {
    setup.game.debugLog.record(setup.game);
  }

  assertEqual(setup.game.debugLog.snapshots.length, 3);
  assertEqual(setup.game.debugLog.snapshots[0].frame, 0);
  assertEqual(setup.game.debugLog.snapshots[1].frame, 3);
  assertEqual(setup.game.debugLog.snapshots[2].frame, 6);
});

test("DebugLog trims snapshots older than configured seconds", function() {
  var setup = makeDebugGame();
  var now = 0;
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogEveryNFrames = 1;
  setup.fixture.config.debugLogSeconds = 0.05;
  setup.game.debugLog.nowMs = function() {
    now += 25;
    return now;
  };

  for (var i = 0; i < 5; i++) {
    setup.game.debugLog.record(setup.game);
  }

  assertEqual(setup.game.debugLog.snapshots.length, 3);
  assertEqual(setup.game.debugLog.snapshots[0].time, 0.05);
  assertEqual(setup.game.debugLog.snapshots[2].time, 0.1);
});

test("DebugLog snapshot includes ball, players, and AI roles states and targets", function() {
  var setup = makeDebugGame({ homeTeamSize: 3, awayTeamSize: 3 });
  var ai = setup.fixture.stadium.awayTeam.aiControllers[0];
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogEveryNFrames = 1;
  setup.fixture.ball.position.x = 12.345;
  setup.fixture.ball.velocity.y = -6.789;
  ai.setRole("goalie", new Vector2d(300.123, 120.456));
  ai.state = "goalie";
  ai.tPos = new Vector2d(301.123, 121.456);

  setup.game.debugLog.record(setup.game);

  var snapshot = setup.game.debugLog.snapshots[0];
  assertEqual(snapshot.ball.pos.x, 12.35);
  assertEqual(snapshot.ball.vel.y, -6.79);
  assertEqual(snapshot.players.length, 6);
  assertEqual(snapshot.players[0].team, "home");
  assertEqual(snapshot.players[0].i, 0);
  assertTrue(snapshot.players[0].human);
  assertEqual(snapshot.ai.length, 6);
  assertEqual(snapshot.ai[3].team, "away");
  assertEqual(snapshot.ai[3].i, 0);
  assertEqual(snapshot.ai[3].role, "goalie");
  assertEqual(snapshot.ai[3].state, "goalie");
  assertEqual(snapshot.ai[3].roleTarget.x, 300.12);
  assertEqual(snapshot.ai[3].target.y, 121.46);
});
