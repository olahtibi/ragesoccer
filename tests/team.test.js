var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Team creates configured players and AI controllers", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 2 });

  assertEqual(fixture.homeTeam.players.length, 3);
  assertEqual(fixture.homeTeam.aiControllers.length, 3);
  assertEqual(fixture.awayTeam.players.length, 2);
  assertEqual(fixture.awayTeam.aiControllers.length, 2);
});

test("Home team skips only the current human player during AI update", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 1 });
  var updated = [];
  fixture.homeTeam.humanPlayer = fixture.homeTeam.players[1];

  for (var i = 0; i < fixture.homeTeam.aiControllers.length; i++) {
    fixture.homeTeam.aiControllers[i].update = function() {
      updated.push(this.controlledPlayer);
    };
  }

  fixture.homeTeam.updateAi();

  assertEqual(updated.length, 2);
  assertTrue(updated.indexOf(fixture.homeTeam.players[1]) === -1);
});

test("Away team updates all AI controllers", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 3 });
  var updated = [];

  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    fixture.awayTeam.aiControllers[i].update = function() {
      updated.push(this.controlledPlayer);
    };
  }

  fixture.awayTeam.updateAi();

  assertEqual(updated.length, 3);
});

test("Team selectHumanPlayer chooses closest player to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.ball.position.x = fixture.homeTeam.players[1].position.x;
  fixture.ball.position.y = fixture.homeTeam.players[1].position.y;

  var selected = fixture.homeTeam.selectHumanPlayer(fixture.ball);

  assertTrue(selected === fixture.homeTeam.players[1]);
  assertTrue(fixture.stadium.humanPlayer === selected);
});
