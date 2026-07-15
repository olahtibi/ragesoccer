var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

test("Team owns players and score without constructing AI", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 2 });

  assertEqual(fixture.homeTeam.players.length, 3);
  assertEqual(fixture.awayTeam.players.length, 2);
  assertEqual(fixture.homeTeam.score, 0);
  assertEqual(fixture.homeTeam.teamAi, undefined);
});

test("Team creates relative home kickoff positions", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(fixture.config);
  var home = formation.positions("kickoffUs", "home", 3);
  var away = formation.positions("kickoffOpponent", "away", 3);

  assertEqual(fixture.homePlayers[2].position.y, home[2].y);
  assertEqual(fixture.awayPlayers[2].position.y, away[2].y);
});

test("Team creates relative away kickoff positions", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3, kickoffSide: "away" });
  var formation = new Formation(fixture.config);
  var home = formation.positions("kickoffOpponent", "home", 3);
  var away = formation.positions("kickoffUs", "away", 3);

  assertEqual(fixture.homePlayers[2].position.y, home[2].y);
  assertEqual(fixture.awayPlayers[2].position.y, away[2].y);
});

test("Team creates all eleven players in a full formation", function() {
  var fixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });

  assertEqual(fixture.homePlayers.length, 11);
  assertEqual(fixture.awayPlayers.length, 11);
});
