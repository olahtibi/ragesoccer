var testlib = require("../testlib");
var helpers = require("../helpers");
var makeFixture = helpers.makeFixture;
var replayDebugLog = helpers.replayDebugLog;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function makeDebugGame(options) {
  var fixture = makeFixture(options);
  var game = fixture.game;
  window.game = game;
  return {
    fixture: fixture,
    game: game
  };
}

test("DebugTool records no snapshots when debug is false", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug.enabled = false;

  setup.game.debugTool.record(setup.game);

  assertEqual(setup.game.debugTool.snapshots.length, 0);
});

test("DebugTool records snapshots when debug is true", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug.enabled = true;
  setup.fixture.config.debug.logEveryNFrames = 1;

  setup.game.debugTool.record(setup.game);

  assertEqual(setup.game.debugTool.snapshots.length, 1);
});

test("DebugTool samples snapshots by configured frame interval", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug.enabled = true;
  setup.fixture.config.debug.logEveryNFrames = 3;

  for (var i = 0; i < 7; i++) {
    setup.game.debugTool.record(setup.game);
  }

  assertEqual(setup.game.debugTool.snapshots.length, 3);
  assertEqual(setup.game.debugTool.snapshots[0].frame, 0);
  assertEqual(setup.game.debugTool.snapshots[1].frame, 3);
  assertEqual(setup.game.debugTool.snapshots[2].frame, 6);
});

test("DebugTool trims snapshots older than configured seconds", function() {
  var setup = makeDebugGame();
  var now = 0;
  setup.fixture.config.debug.enabled = true;
  setup.fixture.config.debug.logEveryNFrames = 1;
  setup.fixture.config.debug.logSeconds = 0.05;
  setup.game.debugTool.nowMs = function() {
    now += 25;
    return now;
  };

  for (var i = 0; i < 5; i++) {
    setup.game.debugTool.record(setup.game);
  }

  assertEqual(setup.game.debugTool.snapshots.length, 3);
  assertEqual(setup.game.debugTool.snapshots[0].time, 0.05);
  assertEqual(setup.game.debugTool.snapshots[2].time, 0.1);
});

test("DebugTool snapshot includes ball, players, and AI commands states and targets", function() {
  var setup = makeDebugGame({ homeTeamSize: 3, awayTeamSize: 3 });
  setup.fixture.config.debug.enabled = true;
  setup.fixture.config.debug.logEveryNFrames = 1;
  setup.fixture.ball.position.x = 12.345;
  setup.fixture.ball.velocity.y = -6.789;
  setup.fixture.ball.lastTouchedBy = "away";
  setup.game.matchFlow.state = "normalPlay";
  setup.fixture.ball.position.x = setup.fixture.awayPlayers[0].position.x + 20;
  setup.fixture.ball.position.y = setup.fixture.awayPlayers[0].position.y;
  setup.game._updateAi();

  setup.game.debugTool.record(setup.game);

  var snapshot = setup.game.debugTool.snapshots[0];
  assertEqual(snapshot.dt, 0);
  assertEqual(snapshot.ball.pos.x, setup.game.debugTool.round(setup.fixture.ball.position.x));
  assertEqual(snapshot.ball.vel.y, -6.79);
  assertEqual(snapshot.ball.lastTouchedBy, "away");
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

test("DebugTool draws public AI targets from current player positions", function() {
  var config = makeFixture().config;
  var tool = new DebugTool(config);
  var calls = [];
  var ctx = {
    beginPath: function() { calls.push("begin"); },
    moveTo: function(x, y) { calls.push("move:" + x + "," + y); },
    lineTo: function(x, y) { calls.push("line:" + x + "," + y); },
    stroke: function() { calls.push("stroke"); }
  };
  var teamAi = {
    team: {
      players: [
        { position: new Vector2d(10, 11) },
        { position: new Vector2d(30, 31) }
      ]
    },
    debugSnapshot: function() {
      return [
        { target: new Vector2d(20, 21) },
        { target: null }
      ];
    }
  };

  tool.draw(ctx, [teamAi]);

  assertEqual(calls.join(","), "begin,move:10,11,line:20,21,stroke");
  assertEqual(ctx.lineWidth, 1);
  assertEqual(ctx.strokeStyle, "blue");
});

test("DebugTool records keyboard and touch events when debug is true", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug.enabled = true;
  setup.game.debugTool.nowMs = function() {
    return 1000;
  };

  setup.game.debugTool.recordKeyEvent({ type: "keydown", keyCode: 39 });
  setup.game.debugTool.recordKeyEvent({ type: "keyup", keyCode: 39 });
  setup.game.debugTool.recordTouchEvent(new Vector2d(12.345, 67.891));

  assertEqual(setup.game.debugTool.events.length, 3);
  assertEqual(setup.game.debugTool.events[0].type, "keydown");
  assertEqual(setup.game.debugTool.events[0].keyCode, 39);
  assertEqual(setup.game.debugTool.events[1].type, "keyup");
  assertEqual(setup.game.debugTool.events[2].type, "touch");
  assertEqual(setup.game.debugTool.events[2].target.x, 12.35);
});

test("DebugTool records no input events when debug is false", function() {
  var setup = makeDebugGame();
  setup.fixture.config.debug.enabled = false;

  setup.game.debugTool.recordKeyEvent({ type: "keydown", keyCode: 39 });
  setup.game.debugTool.recordTouchEvent(new Vector2d(10, 20));

  assertEqual(setup.game.debugTool.events.length, 0);
});

test("DebugTool trims events older than configured seconds", function() {
  var setup = makeDebugGame();
  var now = 0;
  setup.fixture.config.debug.enabled = true;
  setup.fixture.config.debug.logSeconds = 0.05;
  setup.game.debugTool.nowMs = function() {
    now += 25;
    return now;
  };

  for (var i = 0; i < 5; i++) {
    setup.game.debugTool.recordKeyEvent({ type: "keydown", keyCode: 39 });
  }

  assertEqual(setup.game.debugTool.events.length, 3);
  assertEqual(setup.game.debugTool.events[0].time, 0.05);
  assertEqual(setup.game.debugTool.events[2].time, 0.1);
});

test("DebugTool dump includes compact frames and events payload", function() {
  var setup = makeDebugGame();
  var logged = null;
  var originalLog = console.log;
  setup.fixture.config.debug.enabled = true;
  setup.fixture.config.debug.logEveryNFrames = 1;
  console.log = function(message) {
    logged = message;
  };

  try {
    setup.game.debugTool.recordKeyEvent({ type: "keydown", keyCode: 39 });
    setup.game.debugTool.record(setup.game);
    setup.game.debugTool.dump();
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
