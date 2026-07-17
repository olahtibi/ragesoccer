var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Game composes explicit controllers without putting them on Stadium", function() {
  var fixture = makeFixture();
  var context = fixture.game.context();

  assertEqual(fixture.game.teamAis.length, 2);
  assertTrue(fixture.game.humanController !== null);
  assertEqual(fixture.game.restartController, undefined);
  assertTrue(fixture.game.matchFlow._restartController !== null);
  assertTrue(fixture.game.matchFlow._boundaryDetector !== null);
  assertTrue(fixture.game.debugTool !== null);
  assertEqual(fixture.game.debugLog, undefined);
  assertEqual(fixture.game.goalDetector, undefined);
  assertEqual(fixture.game.boundaryDetector, undefined);
  assertEqual(fixture.game.positioningController, undefined);
  assertEqual(fixture.stadium._updateAi, undefined);
  assertEqual(context.game, undefined);
  assertTrue(context.camera === fixture.game.camera);
});

test("Game update contains no kickoff-specific branch", function() {
  assertEqual(Game.prototype.update.toString().indexOf("kickoff"), -1);
});

test("Full simulation updates AI human input physics restart and score in order", function() {
  var fixture = makeFixture();
  var order = [];
  fixture.game.matchFlow.state = "normalPlay";
  fixture.game._updateAi = function() { order.push("ai"); };
  fixture.game.humanController.update = function() { order.push("human"); };
  fixture.game.physics.update = function() { order.push("physics"); };
  fixture.game.matchFlow.updateAfterPhysics = function() { order.push("restartRules"); };
  fixture.game.matchFlow.detectPostPhysicsEvents = function() { order.push("matchRules"); };
  fixture.game.debugTool.record = function() { order.push("debug"); };

  fixture.game.update();

  assertEqual(order.join(","), "ai,human,physics,restartRules,matchRules,debug");
});

test("A goal result takes priority over out-of-play detection", function() {
  var fixture = makeFixture();
  var outUpdates = 0;
  fixture.game.matchFlow.state = "normalPlay";
  fixture.game.physics.update = function() {};
  fixture.goalDetector.update = function() { return "home"; };
  fixture.game.matchFlow.detectOutOfPlay = function() { outUpdates++; };

  fixture.game.update();

  assertEqual(fixture.homeTeam.score, 1);
  assertEqual(outUpdates, 0);
});

test("Positioning simulation updates its controller around player-only physics", function() {
  var fixture = makeFixture();
  var order = [];
  fixture.game.beginRestart("kickoff", "home");
  fixture.game.matchFlow.updateBeforePhysics = function() { order.push("before"); };
  fixture.restartController.updateBeforePhysics = function() { order.push("direct"); };
  fixture.game.physics.updatePlayersOnly = function() { order.push("players"); };
  fixture.game.matchFlow.updateAfterPhysics = function() { order.push("after"); };
  fixture.game.debugTool.record = function() { order.push("debug"); };

  fixture.game.update();

  assertEqual(order.join(","), "before,players,after,debug");
});

test("Paused and waiting states reset the physics clock", function() {
  var fixture = makeFixture();
  var resets = 0;
  fixture.game.physics.resetClock = function() { resets++; };

  fixture.game.update();
  fixture.game.togglePause();
  fixture.game.update();

  assertEqual(resets, 2);
});

test("Game renders AI debug through DebugTool only while paused", function() {
  var fixture = makeFixture();
  var draws = 0;
  var ctx = {};
  fixture.config.debug.enabled = false;
  fixture.game.camera.windowToViewport = function() {};
  fixture.game.camera.renderOverlay = function() {};
  fixture.game.stadium.draw = function() {};
  fixture.game.debugTool.draw = function(actualCtx, teamAis) {
    if (actualCtx === ctx && teamAis === fixture.game.teamAis) draws++;
  };

  fixture.game.render(ctx);
  fixture.game.togglePause();
  fixture.game.render(ctx);

  assertEqual(draws, 1);
});

test("A home goal updates the score and starts an away kickoff once", function() {
  var fixture = makeFixture();
  fixture.restartController.clear();
  fixture.game.matchFlow.state = "normalPlay";
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  fixture.game.matchFlow.detectGoal(fixture.game.context());
  fixture.game.matchFlow.detectGoal(fixture.game.context());

  assertEqual(fixture.homeTeam.score, 1);
  assertEqual(fixture.awayTeam.score, 0);
  assertEqual(fixture.restartController.type(), "kickoff");
  assertEqual(fixture.restartController.phase(), "positioning");
  assertEqual(fixture.homeTeamAi.state, "kickoffOpponent");
  assertEqual(fixture.awayTeamAi.state, "kickoffUs");
});

test("An away goal updates the score and starts a home kickoff", function() {
  var fixture = makeFixture();
  fixture.restartController.clear();
  fixture.game.matchFlow.state = "normalPlay";
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 758;

  fixture.game.matchFlow.detectGoal(fixture.game.context());

  assertEqual(fixture.homeTeam.score, 0);
  assertEqual(fixture.awayTeam.score, 1);
  assertEqual(fixture.restartController.type(), "kickoff");
  assertEqual(fixture.restartController.phase(), "positioning");
  assertEqual(fixture.homeTeamAi.state, "kickoffUs");
  assertEqual(fixture.awayTeamAi.state, "kickoffOpponent");
});

test("A home goal kickoff waits for fresh input after positioning", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  fixture.restartController.clear();
  fixture.game.matchFlow.state = "normalPlay";
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 758;

  fixture.game.matchFlow.detectGoal(fixture.game.context());
  fixture.positioningController._clear(fixture.game.context());

  assertEqual(fixture.restartController.phase(), "waitingForInput");
  assertEqual(fixture.game.matchFlow.simulationMode(), "none");
});

test("An out-of-play ball continues flying while players remain frozen", function() {
  var fixture = makeFixture();
  fixture.game.matchFlow.state = "normalPlay";
  fixture.ball.lastTouchedBy = "home";
  fixture.ball.position.x = fixture.config.pitch.fieldRight + fixture.config.ball.radius + 1;
  fixture.ball.velocity.x = 100;
  fixture.playerHome.velocity.x = 20;
  fixture.game.matchFlow.detectOutOfPlay(fixture.game.context());
  var ballX = fixture.ball.position.x;
  var playerX = fixture.playerHome.position.x;
  fixture.physics.updateBallOnly = function() {
    fixture.physics.lastDt = 0.1;
    fixture.ball.position.x += 10;
  };

  fixture.game.update();
  fixture.game.update();
  fixture.game.update();

  assertEqual(fixture.ball.position.x, ballX + 30);
  assertEqual(fixture.playerHome.position.x, playerX);
  assertEqual(fixture.game.matchFlow.isOutOfPlay(), true);

  fixture.game.update();

  assertEqual(fixture.game.matchFlow.isOutOfPlay(), false);
  assertEqual(fixture.restartController.type(), "throwIn");
  assertEqual(fixture.restartController.phase(), "positioning");
});

test("Render frame delegates update and render before scheduling", function() {
  var originalGame = window.game;
  var originalContext = window.ctx;
  var originalRequest = window.requestAnimationFrame;
  var order = [];
  window.game = {
    update: function() { order.push("update"); },
    render: function(ctx) { if (ctx === window.ctx) order.push("render"); }
  };
  window.ctx = {};
  window.requestAnimationFrame = function() { order.push("schedule"); };

  renderNewFrame();

  window.game = originalGame;
  window.ctx = originalContext;
  window.requestAnimationFrame = originalRequest;
  assertEqual(order.join(","), "update,render,schedule");
});
