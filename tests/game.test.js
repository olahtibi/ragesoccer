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
