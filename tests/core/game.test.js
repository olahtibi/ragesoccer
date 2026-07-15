var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function completeOutOfPlayDelay(fixture) {
  fixture.physics.lastDt = fixture.config.outOfPlayRestartDelaySeconds;
  fixture.game.updatePendingOutOfPlay();
}

test("Game composes explicit controllers without putting them on Stadium", function() {
  var fixture = makeFixture();

  assertEqual(fixture.game.teamAis.length, 2);
  assertTrue(fixture.game.humanController !== null);
  assertTrue(fixture.game.restartController !== null);
  assertTrue(fixture.game.boundaryDetector !== null);
  assertEqual(fixture.stadium.updateAi, undefined);
});

test("Game update contains no kickoff-specific branch", function() {
  assertEqual(Game.prototype.update.toString().indexOf("kickoff"), -1);
});

test("Full simulation updates AI human input physics restart and score in order", function() {
  var fixture = makeFixture();
  var order = [];
  fixture.game.matchFlow.state = "normalPlay";
  fixture.game.updateAi = function() { order.push("ai"); };
  fixture.game.humanController.update = function() { order.push("human"); };
  fixture.game.physics.update = function() { order.push("physics"); };
  fixture.game.matchFlow.updateAfterPhysics = function() { order.push("rules"); };
  fixture.game.updateScore = function() { order.push("score"); return false; };
  fixture.game.updateOutOfPlay = function() { order.push("out"); };
  fixture.game.debugLog.record = function() { order.push("debug"); };

  fixture.game.update();

  assertEqual(order.join(","), "ai,human,physics,rules,score,out,debug");
});

test("A goal result takes priority over out-of-play detection", function() {
  var fixture = makeFixture();
  var outUpdates = 0;
  fixture.game.matchFlow.state = "normalPlay";
  fixture.game.physics.update = function() {};
  fixture.game.goalDetector.update = function() { return "home"; };
  fixture.game.updateOutOfPlay = function() { outUpdates++; };

  fixture.game.update();

  assertEqual(fixture.homeTeam.score, 1);
  assertEqual(outUpdates, 0);
});

test("Positioning simulation updates cutscene around player-only physics", function() {
  var fixture = makeFixture();
  var order = [];
  fixture.game.beginRestart("kickoff", "home");
  fixture.game.restartController.updateBeforePhysics = function() { order.push("before"); };
  fixture.game.physics.updatePlayersOnly = function() { order.push("players"); };
  fixture.game.matchFlow.updateAfterPhysics = function() { order.push("after"); };
  fixture.game.debugLog.record = function() { order.push("debug"); };

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

test("A home goal updates the score and starts an away kickoff once", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  fixture.game.updateScore();
  fixture.game.updateScore();

  assertEqual(fixture.homeTeam.score, 1);
  assertEqual(fixture.awayTeam.score, 0);
  assertEqual(fixture.game.restartController.type(), "kickoff");
  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.homeTeamAi.state, "kickoffOpponent");
  assertEqual(fixture.awayTeamAi.state, "kickoffUs");
});

test("An away goal updates the score and starts a home kickoff", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 758;

  fixture.game.updateScore();

  assertEqual(fixture.homeTeam.score, 0);
  assertEqual(fixture.awayTeam.score, 1);
  assertEqual(fixture.game.restartController.type(), "kickoff");
  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.homeTeamAi.state, "kickoffUs");
  assertEqual(fixture.awayTeamAi.state, "kickoffOpponent");
});

test("A goal kickoff waits for fresh input after positioning", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  fixture.game.updateScore();
  fixture.game.cutscene.clear(fixture.game);

  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.game.matchFlow.simulationMode(), "none");
});

test("A touchline exit starts a throw-in for the team that did not touch last", function() {
  var fixture = makeFixture();
  fixture.ball.lastTouchedBy = "home";
  fixture.ball.position.x = fixture.config.fieldRight + fixture.config.ballRadius + 1;

  fixture.game.updateOutOfPlay();

  assertEqual(fixture.game.isOutOfPlayPending(), true);
  completeOutOfPlayDelay(fixture);

  assertEqual(fixture.game.restartController.type(), "throwIn");
  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.homeTeamAi.state, "throwInOpponent");
  assertEqual(fixture.awayTeamAi.state, "throwInUs");
});

test("Top end-line exits choose goal kick or corner from last touch", function() {
  var goalKick = makeFixture();
  goalKick.ball.lastTouchedBy = "home";
  goalKick.ball.position.y = goalKick.config.fieldTop - goalKick.config.ballRadius - 1;
  goalKick.game.updateOutOfPlay();
  completeOutOfPlayDelay(goalKick);

  assertEqual(goalKick.game.restartController.type(), "goalKick");
  assertEqual(goalKick.awayTeamAi.state, "goalKickUs");

  var corner = makeFixture();
  corner.ball.lastTouchedBy = "away";
  corner.ball.position.x = corner.config.fieldLeft + 20;
  corner.ball.position.y = corner.config.fieldTop - corner.config.ballRadius - 1;
  corner.game.updateOutOfPlay();
  completeOutOfPlayDelay(corner);

  assertEqual(corner.game.restartController.type(), "corner");
  assertEqual(corner.homeTeamAi.state, "cornerUs");
});

test("Bottom end-line exits choose goal kick or corner from last touch", function() {
  var goalKick = makeFixture();
  goalKick.ball.lastTouchedBy = "away";
  goalKick.ball.position.y = goalKick.config.fieldBottom + goalKick.config.ballRadius + 1;
  goalKick.game.updateOutOfPlay();
  completeOutOfPlayDelay(goalKick);

  assertEqual(goalKick.game.restartController.type(), "goalKick");
  assertEqual(goalKick.homeTeamAi.state, "goalKickUs");

  var corner = makeFixture();
  corner.ball.lastTouchedBy = "home";
  corner.ball.position.x = corner.config.fieldRight - 20;
  corner.ball.position.y = corner.config.fieldBottom + corner.config.ballRadius + 1;
  corner.game.updateOutOfPlay();
  completeOutOfPlayDelay(corner);

  assertEqual(corner.game.restartController.type(), "corner");
  assertEqual(corner.awayTeamAi.state, "cornerUs");
});

test("An exit without last-touch ownership restores and stops the ball", function() {
  var fixture = makeFixture();
  var startX = fixture.ball.position.x;
  fixture.ball.position.x = fixture.config.fieldRight + fixture.config.ballRadius + 1;
  fixture.ball.velocity.x = 100;

  fixture.game.updateOutOfPlay();

  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.ball.position.x, startX);
  assertEqual(fixture.ball.velocity.x, 0);
});

test("An out-of-play ball continues flying while players remain frozen", function() {
  var fixture = makeFixture();
  fixture.game.matchFlow.state = "normalPlay";
  fixture.ball.lastTouchedBy = "home";
  fixture.ball.position.x = fixture.config.fieldRight + fixture.config.ballRadius + 1;
  fixture.ball.velocity.x = 100;
  fixture.playerHome.velocity.x = 20;
  fixture.game.updateOutOfPlay();
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
  assertEqual(fixture.game.isOutOfPlayPending(), true);

  fixture.game.update();

  assertEqual(fixture.game.isOutOfPlayPending(), false);
  assertEqual(fixture.game.restartController.type(), "throwIn");
  assertEqual(fixture.game.restartController.phase(), "positioning");
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
