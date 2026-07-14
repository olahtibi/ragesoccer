var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

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

test("Render frame updates AI then human input before physics and kickoff", function() {
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
    cutscene: {
      isActive: function() { return false; },
      updateBeforePhysics: function() {
        order.push("cutsceneBefore");
      },
      updateAfterPhysics: function() {
        order.push("cutsceneAfter");
      }
    },
    updateAi: function() {
      order.push("ai");
    },
    physics: {
      update: function() {
        order.push("physics");
      }
    },
    stadium: {
      updateKickoff: function() {
        order.push("kickoff");
      },
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
  assertEqual(order[3], "kickoff");
});

test("Render frame updates active cutscene instead of AI and human input", function() {
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
    cutscene: {
      isActive: function() { return true; },
      updateBeforePhysics: function() {
        order.push("cutsceneBefore");
      },
      updateAfterPhysics: function() {
        order.push("cutsceneAfter");
      }
    },
    updateAi: function() {
      order.push("ai");
    },
    physics: {
      update: function() {
        order.push("physics");
      },
      updatePlayersOnly: function() {
        order.push("playersOnly");
      }
    },
    stadium: {
      updateKickoff: function() {
        order.push("kickoff");
      },
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

  assertEqual(order[0], "cutsceneBefore");
  assertEqual(order[1], "playersOnly");
  assertEqual(order[2], "cutsceneAfter");
  assertEqual(order[3], "kickoff");
});
