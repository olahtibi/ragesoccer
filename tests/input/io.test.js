var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

function setup(options) {
  var fixture = makeFixture(options);
  fixture.game.camera.position.x = 0;
  fixture.game.camera.position.y = 0;
  return {
    fixture: fixture,
    game: fixture.game,
    input: new BrowserInput(fixture.game, window)
  };
}

test("Keyboard input selects and controls the player closest to the ball", function() {
  var setupResult = setup({ homeTeamSize: 2, awayTeamSize: 1, playerStrength: 10 });
  var fixture = setupResult.fixture;
  fixture.ball.position.x = fixture.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.homePlayers[1].position.y;

  setupResult.input.handleKey({ keyCode: 39, type: "keydown" });

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[1]);
  assertEqual(fixture.homePlayers[1].velocity.x, fixture.config.teamVelocity("home"));
});

test("Human selection keeps the current player within the hysteresis margin", function() {
  var setupResult = setup({ homeTeamSize: 2, awayTeamSize: 1 });
  var fixture = setupResult.fixture;
  fixture.config.input.humanSwitchHysteresisDistance = 20;
  fixture.homePlayers[0].position.x = 100;
  fixture.homePlayers[1].position.x = 112;
  fixture.homePlayers[0].position.y = fixture.homePlayers[1].position.y = 100;
  fixture.ball.position.x = 120;
  fixture.ball.position.y = 100;

  fixture.game.humanController.selectPlayer();

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[0]);
});

test("Human selection switches and stops the old player outside hysteresis", function() {
  var setupResult = setup({ homeTeamSize: 2, awayTeamSize: 1 });
  var fixture = setupResult.fixture;
  fixture.config.input.humanSwitchHysteresisDistance = 20;
  fixture.homePlayers[0].position.x = 100;
  fixture.homePlayers[1].position.x = 140;
  fixture.homePlayers[0].position.y = fixture.homePlayers[1].position.y = 100;
  fixture.homePlayers[0].velocity.x = 10;
  fixture.ball.position.x = 140;
  fixture.ball.position.y = 100;

  fixture.game.humanController.selectPlayer();

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[1]);
  assertEqual(fixture.homePlayers[0].velocity.x, 0);
});

test("Keyboard diagonal input normalizes velocity", function() {
  var setupResult = setup({ playerStrength: 10 });
  setupResult.input.handleKey({ keyCode: 39, type: "keydown" });
  setupResult.input.handleKey({ keyCode: 40, type: "keydown" });

  assertNear(setupResult.fixture.playerHome.velocity.x,
    setupResult.fixture.config.teamVelocity("home") / Math.sqrt(2), 0.0001);
  assertNear(setupResult.fixture.playerHome.velocity.y,
    setupResult.fixture.config.teamVelocity("home") / Math.sqrt(2), 0.0001);
});

test("Touch input stores a world target and controls the selected player", function() {
  var setupResult = setup({ homeTeamSize: 2, awayTeamSize: 1, playerStrength: 10 });
  var fixture = setupResult.fixture;
  fixture.ball.position.x = fixture.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.homePlayers[1].position.y;
  var scale = fixture.config.computeScaleBy();

  setupResult.input.handleTouch({ touches: [{
    clientX: fixture.homePlayers[1].position.x * scale,
    clientY: (fixture.homePlayers[1].position.y + 50) * scale
  }] });

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[1]);
  assertNear(fixture.game.humanController.touchTarget.y, fixture.homePlayers[1].position.y + 50, 0.0001);
  assertTrue(fixture.homePlayers[1].velocity.y > 0);
});

test("Opponent kickoff ignores input and starts after its configured delay", function() {
  var setupResult = setup({ kickoffSide: "away" });

  setupResult.input.handleKey({ keyCode: 39, type: "keydown" });

  assertEqual(setupResult.game.restartController.phase(), "waitingForInput");
  assertEqual(setupResult.fixture.playerHome.velocity.x, 0);

  setupResult.fixture.physics.lastDt = 0.5;
  setupResult.game.restartController.updateAfterPhysics(setupResult.game.context());
  assertEqual(setupResult.game.restartController.phase(), "waitingForInput");

  setupResult.fixture.physics.lastDt = 0.5;
  setupResult.game.restartController.updateAfterPhysics(setupResult.game.context());
  assertEqual(setupResult.game.restartController.phase(), "inProgress");
});

test("Keyboard direction executes a human throw-in and clamps it inward", function() {
  var setupResult = setup();
  setupResult.game.beginRestart("throwIn", "home", {
    boundary: "left",
    position: new Vector2d(setupResult.fixture.config.pitch.fieldLeft, setupResult.fixture.config.pitch.aiCenterY)
  });
  setupResult.game.cutscene.updateBeforePhysics(setupResult.game);
  setupResult.game.cutscene._clear(setupResult.game);

  setupResult.input.handleKey({ keyCode: 37, type: "keydown" });

  assertEqual(setupResult.game.restartController.phase(), "inProgress");
  assertTrue(setupResult.fixture.ball.velocity.x > 0);
  assertTrue(setupResult.fixture.ball.velocity.z > 0);
});

test("Touch direction executes a human throw-in and clamps it inward", function() {
  var setupResult = setup();
  setupResult.game.beginRestart("throwIn", "home", {
    boundary: "right",
    position: new Vector2d(setupResult.fixture.config.pitch.fieldRight, setupResult.fixture.config.pitch.aiCenterY)
  });
  setupResult.game.cutscene.updateBeforePhysics(setupResult.game);
  setupResult.game.cutscene._clear(setupResult.game);
  var scale = setupResult.fixture.config.computeScaleBy();

  setupResult.input.handleTouch({ touches: [{
    clientX: (setupResult.fixture.config.pitch.fieldRight + 100) * scale,
    clientY: setupResult.fixture.config.pitch.aiCenterY * scale
  }] });

  assertEqual(setupResult.game.restartController.phase(), "inProgress");
  assertTrue(setupResult.fixture.ball.velocity.x < 0);
});

test("Touch executes a throw-in when the taker is ready before positioning completes", function() {
  var setupResult = setup({ homeTeamSize: 4, awayTeamSize: 4 });
  setupResult.game.beginRestart("throwIn", "home", {
    boundary: "right",
    position: new Vector2d(setupResult.fixture.config.pitch.fieldRight, setupResult.fixture.config.pitch.aiCenterY)
  });
  var cutscene = setupResult.game.cutscene;
  for (var t = 0; t < cutscene._sceneTeams.length; t++) {
    for (var i = 0; i < cutscene._sceneTeams[t].players.length; i++) {
      if (cutscene._sceneTeams[t].players[i] === cutscene._readyPlayer) {
        cutscene._readyPlayer.position.x = cutscene._sceneTeams[t].positions[i].x;
        cutscene._readyPlayer.position.y = cutscene._sceneTeams[t].positions[i].y;
      }
    }
  }
  var scale = setupResult.fixture.config.computeScaleBy();

  setupResult.input.handleTouch({ touches: [{
    clientX: (setupResult.fixture.config.pitch.fieldRight + 100) * scale,
    clientY: setupResult.fixture.config.pitch.aiCenterY * scale
  }] });

  assertEqual(setupResult.game.restartController.phase(), "inProgress");
  assertEqual(cutscene.isActive(), false);
  assertTrue(setupResult.fixture.ball.velocity.x < 0);
});

test("J and K do not start restarts", function() {
  var setupResult = setup();

  setupResult.input.handleKey({ keyCode: 74, type: "keydown" });
  setupResult.input.handleKey({ keyCode: 75, type: "keydown" });

  assertEqual(setupResult.game.restartController.phase(), "waitingForInput");
  assertEqual(setupResult.game.cutscene.isActive(), false);
});

test("C awards a home corner on the ball side when debugging is enabled", function() {
  var setupResult = setup();
  setupResult.fixture.config.debug.enabled = true;
  setupResult.game.restartController.clear();
  setupResult.game.matchFlow.state = "normalPlay";
  setupResult.fixture.ball.position.x = setupResult.fixture.config.pitch.fieldRight - 20;

  setupResult.input.handleKey({ keyCode: 67, type: "keydown" });

  assertEqual(setupResult.game.restartController.type(), "corner");
  assertEqual(setupResult.game.restartController.phase(), "positioning");
  assertEqual(
    setupResult.game.cutscene._ballPosition.x,
    setupResult.fixture.config.pitch.fieldRight -
      setupResult.fixture.config.ball.radius -
      setupResult.fixture.config.restarts.placementClearance
  );
  assertEqual(
    setupResult.game.cutscene._ballPosition.y,
    setupResult.fixture.config.pitch.fieldTop +
      setupResult.fixture.config.ball.radius +
      setupResult.fixture.config.restarts.placementClearance
  );
});

test("C corner diagnostic is disabled when debugging is disabled", function() {
  var setupResult = setup();
  setupResult.fixture.config.debug.enabled = false;
  setupResult.game.restartController.clear();
  setupResult.game.matchFlow.state = "normalPlay";

  setupResult.input.handleKey({ keyCode: 67, type: "keydown" });

  assertEqual(setupResult.game.restartController.type(), null);
  assertEqual(setupResult.game.cutscene.isActive(), false);
});

test("Restart positioning selects the newly closest human player on completion", function() {
  var setupResult = setup({ homeTeamSize: 4, awayTeamSize: 4, kickoffSide: "away" });
  setupResult.game.beginRestart("kickoff", "home");
  var cutscene = setupResult.game.cutscene;
  for (var i = 0; i < cutscene._sceneTeams[0].players.length; i++) {
    cutscene._sceneTeams[0].players[i].position.x = cutscene._sceneTeams[0].positions[i].x;
    cutscene._sceneTeams[0].players[i].position.y = cutscene._sceneTeams[0].positions[i].y;
  }

  cutscene._clear(setupResult.game);

  assertTrue(setupResult.fixture.homeTeam.humanPlayer === setupResult.fixture.homePlayers[3]);
});

test("Slash pauses and resumes while preserving restart positioning", function() {
  var setupResult = setup();
  setupResult.fixture.config.debug.enabled = true;
  setupResult.game.debugLog.dump = function() {};
  setupResult.game.beginRestart("kickoff", "home");

  setupResult.input.handleKey({ keyCode: 191, type: "keydown" });
  assertEqual(setupResult.game.matchFlow.state, "paused");

  setupResult.input.handleKey({ keyCode: 191, type: "keydown" });
  assertEqual(setupResult.game.matchFlow.state, "restart");
  assertEqual(setupResult.game.restartController.phase(), "positioning");
});

test("Slash is disabled when debug logging is disabled", function() {
  var setupResult = setup();
  setupResult.fixture.config.debug.enabled = false;

  setupResult.input.handleKey({ keyCode: 191, type: "keydown" });

  assertEqual(setupResult.game.isPaused(), false);
});

test("Input events are recorded only when debugging is enabled", function() {
  var setupResult = setup();
  setupResult.fixture.config.debug.enabled = false;
  setupResult.input.handleKey({ keyCode: 39, type: "keydown" });
  assertEqual(setupResult.game.debugLog.events.length, 0);

  setupResult.fixture.config.debug.enabled = true;
  setupResult.input.handleKey({ keyCode: 39, type: "keyup" });
  assertEqual(setupResult.game.debugLog.events.length, 1);
  assertEqual(setupResult.game.debugLog.events[0].type, "keyup");
});

test("Touch debug events use world coordinates", function() {
  var setupResult = setup();
  setupResult.fixture.config.debug.enabled = true;
  setupResult.game.camera.position.x = -10;
  setupResult.game.camera.position.y = -20;
  var scale = setupResult.fixture.config.computeScaleBy();

  setupResult.input.handleTouch({ touches: [{ clientX: 30 * scale, clientY: 40 * scale }] });

  assertEqual(setupResult.game.debugLog.events[0].target.x, 40);
  assertEqual(setupResult.game.debugLog.events[0].target.y, 60);
});

test("Q and W change the viewport ratio", function() {
  var setupResult = setup();
  var ratio = setupResult.fixture.config.viewport.ratio;
  setupResult.input.handleKey({ keyCode: 81, type: "keydown" });
  assertEqual(setupResult.fixture.config.viewport.ratio, ratio / 1.2);
  setupResult.input.handleKey({ keyCode: 87, type: "keydown" });
  assertNear(setupResult.fixture.config.viewport.ratio, ratio, 0.0001);
});
