var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Game composes explicit controllers without putting them on Stadium", function() {
  var fixture = makeFixture();

  assertEqual(fixture.game.teamAis.length, 2);
  assertTrue(fixture.game.humanController !== null);
  assertTrue(fixture.game.restartController !== null);
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
  fixture.game.updateScore = function() { order.push("score"); };
  fixture.game.debugLog.record = function() { order.push("debug"); };

  fixture.game.update();

  assertEqual(order.join(","), "ai,human,physics,rules,score,debug");
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

test("Game applies detector results to team-owned scores once", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  fixture.game.updateScore();
  fixture.game.updateScore();

  assertEqual(fixture.homeTeam.score, 1);
  assertEqual(fixture.awayTeam.score, 0);
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
