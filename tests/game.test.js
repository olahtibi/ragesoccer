var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

test("Game delegates AI update to stadium without exposing controllers", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  game.started = true;
  var updated = [];
  fixture.stadium.updateAi = function() {
    updated.push("stadium");
  };

  game.updateAi();

  assertEqual(game.aiControllers, undefined);
  assertEqual(updated.length, 1);
  assertEqual(updated[0], "stadium");
});

test("Render frame updates AI then human input before physics", function() {
  var order = [];
  var originalGame = window.game;
  var originalCtx = window.ctx;
  var originalRequestAnimationFrame = window.requestAnimationFrame;
  var originalUpdateHumanInput = updateHumanInput;
  window.ctx = {};
  window.requestAnimationFrame = function() {};
  updateHumanInput = function() {
    order.push("human");
  };
  window.game = {
    config: { debug: false },
    updateAi: function() {
      order.push("ai");
    },
    physics: {
      update: function() {
        order.push("physics");
      }
    },
    stadium: {
      goalDetector: {
        update: function() {}
      },
      draw: function() {}
    },
    camera: {
      windowToViewport: function() {},
      renderOverlay: function() {}
    },
    isPaused: function() {
      return false;
    }
  };

  try {
    renderNewFrame();
  } finally {
    updateHumanInput = originalUpdateHumanInput;
    window.game = originalGame;
    window.ctx = originalCtx;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  }

  assertEqual(order[0], "ai");
  assertEqual(order[1], "human");
  assertEqual(order[2], "physics");
});
