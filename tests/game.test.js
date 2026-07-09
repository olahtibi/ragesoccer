var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Game creates one AI controller per player and skips only current human player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  game.started = true;
  var updated = [];
  var controllers = fixture.stadium.homeTeam.aiControllers.concat(fixture.stadium.awayTeam.aiControllers);

  for (var i = 0; i < controllers.length; i++) {
    controllers[i].update = function() {
      updated.push(this.controlledPlayer);
    };
  }

  game.updateAi();

  assertEqual(game.aiControllers, undefined);
  assertEqual(controllers.length, 4);
  assertEqual(updated.length, 3);
  assertTrue(updated.indexOf(fixture.stadium.humanPlayer) === -1);
});

test("Game idle human control switches to closest home player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = {};
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  game.updateHumanControl();

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
});

test("Game keeps current human player while movement key is held", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = { 39: true };
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  game.updateHumanControl();

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[0]);
});

test("Game idle human control clears previous human velocity on switch", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = {};
  fixture.stadium.homePlayers[0].velocity.x = 10;
  fixture.stadium.homePlayers[0].velocity.y = -10;
  fixture.stadium.homePlayers[1].velocity.x = 5;
  fixture.stadium.homePlayers[1].velocity.y = 5;
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  game.updateHumanControl();

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
  assertEqual(fixture.stadium.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[0].velocity.y, 0);
  assertEqual(fixture.stadium.homePlayers[1].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[1].velocity.y, 0);
});

test("Game idle human control stops newly selected player with AI velocity", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = {};
  fixture.stadium.homePlayers[1].velocity.x = -7;
  fixture.stadium.homePlayers[1].velocity.y = 9;
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  game.updateHumanControl();

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[1]);
  assertEqual(fixture.stadium.homePlayers[1].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[1].velocity.y, 0);
});

test("Game touch target keeps current human moving without auto switch", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = {};
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;
  game.touchTarget = new Vector2d(
    fixture.stadium.homePlayers[0].position.x,
    fixture.stadium.homePlayers[0].position.y + 50
  );

  game.updateHumanControl();

  assertTrue(fixture.stadium.humanPlayer === fixture.stadium.homePlayers[0]);
  assertTrue(fixture.stadium.homePlayers[0].velocity.y > 0);
});

test("Game touch target clears and stops on arrival", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = {};
  fixture.stadium.homePlayers[0].velocity.x = 3;
  fixture.stadium.homePlayers[0].velocity.y = 4;
  game.touchTarget = new Vector2d(
    fixture.stadium.homePlayers[0].position.x + 1,
    fixture.stadium.homePlayers[0].position.y + 1
  );

  game.updateHumanControl();

  assertEqual(game.touchTarget, null);
  assertEqual(fixture.stadium.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[0].velocity.y, 0);
});

test("Game keyboard movement clears active touch target", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  window.keyMap = { 39: true };
  game.touchTarget = new Vector2d(100, 100);

  game.updateHumanControl();

  assertEqual(game.touchTarget, null);
});

test("Render frame updates human control before teammate AI", function() {
  var order = [];
  var originalGame = window.game;
  var originalCtx = window.ctx;
  var originalRequestAnimationFrame = window.requestAnimationFrame;
  window.ctx = {};
  window.requestAnimationFrame = function() {};
  window.game = {
    config: { debug: false },
    updateHumanControl: function() {
      order.push("human");
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
    window.game = originalGame;
    window.ctx = originalCtx;
    window.requestAnimationFrame = originalRequestAnimationFrame;
  }

  assertEqual(order[0], "human");
  assertEqual(order[1], "ai");
});
