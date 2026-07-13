var testlib = require("../testlib");
var helpers = require("../helpers");
var makeFixture = helpers.makeFixture;
var replayDebugLog = helpers.replayDebugLog;

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
  setup.fixture.config.debug = false;

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

test("DebugLog snapshot includes ball, players, and AI commands states and targets", function() {
  var setup = makeDebugGame({ homeTeamSize: 3, awayTeamSize: 3 });
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogEveryNFrames = 1;
  setup.fixture.ball.position.x = 12.345;
  setup.fixture.ball.velocity.y = -6.789;
  setup.game.started = true;
  setup.fixture.stadium.kickoffComplete = true;
  setup.fixture.ball.position.x = setup.fixture.awayPlayers[0].position.x + 20;
  setup.fixture.ball.position.y = setup.fixture.awayPlayers[0].position.y;
  setup.game.updateAi();

  setup.game.debugLog.record(setup.game);

  var snapshot = setup.game.debugLog.snapshots[0];
  assertEqual(snapshot.dt, 0);
  assertEqual(snapshot.ball.pos.x, setup.game.debugLog.round(setup.fixture.ball.position.x));
  assertEqual(snapshot.ball.vel.y, -6.79);
  assertEqual(snapshot.players.length, 6);
  assertEqual(snapshot.players[0].team, "home");
  assertEqual(snapshot.players[0].i, 0);
  assertTrue(snapshot.players[0].human || snapshot.players[1].human || snapshot.players[2].human);
  assertEqual(snapshot.ai.length, 6);
  assertEqual(snapshot.ai[3].team, "away");
  assertEqual(snapshot.ai[3].i, 0);
  assertEqual(snapshot.ai[3].command, "attackBall");
  assertTrue(
    snapshot.ai[3].state == "approach" ||
    snapshot.ai[3].state == "detour" ||
    snapshot.ai[3].state == "shoot"
  );
  assertTrue(snapshot.ai[3].target !== null);
});

test("DebugLog records keyboard and touch events when debug is true", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug = true;
  setup.game.debugLog.nowMs = function() {
    return 1000;
  };

  setup.game.debugLog.recordKeyEvent({ type: "keydown", keyCode: 39 });
  setup.game.debugLog.recordKeyEvent({ type: "keyup", keyCode: 39 });
  setup.game.debugLog.recordTouchEvent(new Vector2d(12.345, 67.891));

  assertEqual(setup.game.debugLog.events.length, 3);
  assertEqual(setup.game.debugLog.events[0].type, "keydown");
  assertEqual(setup.game.debugLog.events[0].keyCode, 39);
  assertEqual(setup.game.debugLog.events[1].type, "keyup");
  assertEqual(setup.game.debugLog.events[2].type, "touch");
  assertEqual(setup.game.debugLog.events[2].target.x, 12.35);
});

test("DebugLog records no input events when debug is false", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug = false;

  setup.game.debugLog.recordKeyEvent({ type: "keydown", keyCode: 39 });
  setup.game.debugLog.recordTouchEvent(new Vector2d(10, 20));

  assertEqual(setup.game.debugLog.events.length, 0);
});

test("DebugLog trims events older than configured seconds", function() {
  var setup = makeDebugGame();
  var now = 0;
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogSeconds = 0.05;
  setup.game.debugLog.nowMs = function() {
    now += 25;
    return now;
  };

  for (var i = 0; i < 5; i++) {
    setup.game.debugLog.recordKeyEvent({ type: "keydown", keyCode: 39 });
  }

  assertEqual(setup.game.debugLog.events.length, 3);
  assertEqual(setup.game.debugLog.events[0].time, 0.05);
  assertEqual(setup.game.debugLog.events[2].time, 0.1);
});

test("DebugLog dump includes compact frames and events payload", function() {
  var setup = makeDebugGame();
  var logged = null;
  var originalLog = console.log;
  setup.fixture.config.debug = true;
  setup.fixture.config.debugLogEveryNFrames = 1;
  console.log = function(message) {
    logged = message;
  };

  try {
    setup.game.debugLog.recordKeyEvent({ type: "keydown", keyCode: 39 });
    setup.game.debugLog.record(setup.game);
    setup.game.debugLog.dump();
  } finally {
    console.log = originalLog;
  }

  var payload = JSON.parse(logged);
  assertEqual(payload.type, "debugLog");
  assertEqual(payload.frames.length, 1);
  assertEqual(payload.events.length, 1);
});

test("Replay helper applies input events and frame dt without rendering", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var startX = fixture.playerHome.position.x;
  var payload = {
    frames: [
      { frame: 0, dt: 0.1 },
      { frame: 1, dt: 0.1 }
    ],
    events: [
      { frame: 0, type: "keydown", keyCode: 39 },
      { frame: 1, type: "keyup", keyCode: 39 }
    ]
  };

  replayDebugLog(payload, fixture);

  assertEqual(fixture.physics.lastDt, 0.1);
  assertTrue(fixture.playerHome.position.x > startX);
  assertEqual(fixture.playerHome.velocity.x, 0);
});
