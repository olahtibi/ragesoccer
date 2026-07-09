var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

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

test("Team AI disabled clears roles", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  fixture.config.teamAiEnabled = false;

  fixture.awayTeam.assignRoles();

  assertEqual(fixture.awayTeam.aiControllers[0].role, null);
  assertEqual(fixture.awayTeam.aiControllers[1].role, null);
});

test("Team AI assigns only one chaser in 2v2", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });

  fixture.awayTeam.assignRoles();

  var chasers = 0;
  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    if (fixture.awayTeam.aiControllers[i].role == "chaser") {
      chasers++;
    }
  }
  assertEqual(chasers, 1);
});

test("Team AI assigns goalie chaser and support in 3v3", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3 });

  fixture.awayTeam.assignRoles();

  var roles = {};
  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    roles[fixture.awayTeam.aiControllers[i].role] = true;
  }

  assertTrue(roles.goalie);
  assertTrue(roles.chaser);
  assertTrue(roles.support);
});

test("Team AI does not assign an executable role to the human player", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 1 });
  fixture.homeTeam.humanPlayer = fixture.homeTeam.players[1];

  fixture.homeTeam.assignRoles();

  assertEqual(fixture.homeTeam.aiControllers[1].role, null);
});

test("Team AI assigns closest-to-ball player as chaser when no goalie is used", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  fixture.ball.position.x = 250;
  fixture.ball.position.y = 320;
  fixture.awayTeam.players[0].position.x = 500;
  fixture.awayTeam.players[0].position.y = 500;
  fixture.awayTeam.players[1].position.x = 251;
  fixture.awayTeam.players[1].position.y = 320;

  fixture.awayTeam.assignRoles();

  assertEqual(fixture.awayTeam.aiControllers[1].role, "chaser");
});

test("Team AI assigns closest-to-own-goal player as goalie", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 3 });
  fixture.awayTeam.players[0].position.x = 336;
  fixture.awayTeam.players[0].position.y = 115;
  fixture.awayTeam.players[1].position.x = 336;
  fixture.awayTeam.players[1].position.y = 300;
  fixture.awayTeam.players[2].position.x = 336;
  fixture.awayTeam.players[2].position.y = 400;

  fixture.awayTeam.assignRoles();

  assertEqual(fixture.awayTeam.aiControllers[0].role, "goalie");
});

test("Support target is not the ball position", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });

  fixture.awayTeam.assignRoles();
  var support = fixture.awayTeam.aiControllers[0].role == "support" ? fixture.awayTeam.aiControllers[0] : fixture.awayTeam.aiControllers[1];

  assertTrue(support.roleTarget !== null);
  assertTrue(MathLib.computeDistance(support.roleTarget, fixture.ball.position) > 1);
});

test("Defender target stays between ball and own goal", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 433;

  fixture.awayTeam.assignRoles();
  var defender = null;
  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    if (fixture.awayTeam.aiControllers[i].role == "defender") {
      defender = fixture.awayTeam.aiControllers[i];
    }
  }

  assertTrue(defender !== null);
  assertTrue(defender.roleTarget.y > defender.ownGoalCenter.y);
  assertTrue(defender.roleTarget.y < fixture.ball.position.y);
});

test("Goalie target stays in front of own goal", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 3 });

  fixture.awayTeam.assignRoles();
  var goalie = null;
  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    if (fixture.awayTeam.aiControllers[i].role == "goalie") {
      goalie = fixture.awayTeam.aiControllers[i];
    }
  }

  assertTrue(goalie !== null);
  assertNear(goalie.roleTarget.y, goalie.ownGoalLineY + fixture.config.goalieDistance, 0.0001);
});
