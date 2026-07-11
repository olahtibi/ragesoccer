var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Team creates configured players and team AI", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 2 });

  assertEqual(fixture.homeTeam.players.length, 3);
  assertTrue(fixture.homeTeam.teamAi !== null);
  assertEqual(fixture.awayTeam.players.length, 2);
  assertTrue(fixture.awayTeam.teamAi !== null);
});

test("Team creates players at kickoff formation positions", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(fixture.config);
  var homePositions = formation.positions("kickoff", "home", 3);
  var awayPositions = formation.positions("kickoff", "away", 3);

  assertEqual(fixture.homePlayers[2].position.x, homePositions[2].x);
  assertEqual(fixture.homePlayers[2].position.y, homePositions[2].y);
  assertEqual(fixture.awayPlayers[2].position.x, awayPositions[2].x);
  assertEqual(fixture.awayPlayers[2].position.y, awayPositions[2].y);
});

test("Team update delegates to team AI", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var updated = false;
  fixture.awayTeam.teamAi.update = function() {
    updated = true;
  };

  fixture.awayTeam.updateAi();

  assertTrue(updated);
});

test("Team draw delegates to team AI", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var drew = false;
  fixture.awayTeam.teamAi.draw = function() {
    drew = true;
  };

  fixture.awayTeam.drawAiDebug({});

  assertTrue(drew);
});
