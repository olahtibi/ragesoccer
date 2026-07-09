var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Game creates one AI controller per player and skips only current human player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics, fixture.aiControllers);
  window.game = game;
  game.started = true;
  var updated = [];

  for (var i = 0; i < game.aiControllers.length; i++) {
    game.aiControllers[i].update = function() {
      updated.push(this.controlledPlayer);
    };
  }

  game.updateAi();

  assertEqual(game.aiControllers.length, 4);
  assertEqual(updated.length, 3);
  assertTrue(updated.indexOf(fixture.stadium.humanPlayer) === -1);
});
