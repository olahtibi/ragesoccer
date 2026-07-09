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

function countRole(team, role) {
  var count = 0;
  for (var i = 0; i < team.aiControllers.length; i++) {
    if (team.aiControllers[i].role == role) {
      count++;
    }
  }
  return count;
}

function roleController(team, role) {
  for (var i = 0; i < team.aiControllers.length; i++) {
    if (team.aiControllers[i].role == role) {
      return team.aiControllers[i];
    }
  }
  return null;
}

test("Team AI assigns fixed striker and defender in 2v2", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });

  fixture.awayTeam.assignRoles();

  assertEqual(countRole(fixture.awayTeam, "striker"), 1);
  assertEqual(countRole(fixture.awayTeam, "defender"), 1);
  assertEqual(countRole(fixture.awayTeam, "goalie"), 0);
});

test("Team AI assigns goalie striker and defender in 3v3", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3 });

  fixture.awayTeam.assignRoles();

  assertEqual(countRole(fixture.awayTeam, "goalie"), 1);
  assertEqual(countRole(fixture.awayTeam, "striker"), 1);
  assertEqual(countRole(fixture.awayTeam, "defender"), 1);
});

test("Team AI keeps fixed slots on human-controlled players", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 1 });
  var role = fixture.homeTeam.aiControllers[1].role;
  fixture.homeTeam.humanPlayer = fixture.homeTeam.players[1];

  fixture.homeTeam.assignRoles();

  assertEqual(fixture.homeTeam.aiControllers[1].role, role);
  assertTrue(fixture.homeTeam.aiControllers[1].role !== null);
});

test("Team AI roles do not change as the ball moves", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  var roles = [];
  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    roles.push(fixture.awayTeam.aiControllers[i].role);
  }

  fixture.ball.position.x = 100;
  fixture.ball.position.y = 700;
  window.game = {
    started: true,
    isPaused: function() { return false; }
  };
  fixture.awayTeam.updateAi();

  for (var j = 0; j < fixture.awayTeam.aiControllers.length; j++) {
    assertEqual(fixture.awayTeam.aiControllers[j].role, roles[j]);
  }
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

test("Team context uses striker pressure in midfield and defender pressure deep in own half", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 390;

  var midfieldContext = fixture.awayTeam.buildAiContext();

  assertEqual(midfieldContext.pressureController.role, "striker");

  fixture.ball.position.y = 250;
  var defensiveContext = fixture.awayTeam.buildAiContext();

  assertEqual(defensiveContext.pressureController.role, "defender");
});

test("Team context gives keeper challenge priority over non-goalie pressure", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 130;

  var context = fixture.awayTeam.buildAiContext();

  assertTrue(context.keeperChallenge);
  assertEqual(context.pressureController, null);
});

test("Only one non-goalie player presses the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 304;
  fixture.ball.position.y = 220;
  var context = fixture.awayTeam.buildAiContext();
  var pressing = 0;

  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    var controller = fixture.awayTeam.aiControllers[i];
    controller.updateRole(context);
    if (controller.role != "goalie" && (controller.state == "press" || controller.state == "receive")) {
      pressing++;
    }
  }

  assertEqual(pressing, 1);
});

test("Off-ball targets keep spacing from the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 304;
  fixture.ball.position.y = 220;
  var context = fixture.awayTeam.buildAiContext();

  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    var controller = fixture.awayTeam.aiControllers[i];
    controller.updateRole(context);
    if (controller !== context.pressureController && controller.role != "goalie") {
      assertTrue(MathLib.computeDistance(controller.roleTarget, fixture.ball.position) >= fixture.config.aiMinBallSpacing - 0.0001);
    }
  }
});

test("Off-ball targets keep spacing when the ball is near the field edge", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 468;
  fixture.ball.position.y = 95;
  var context = fixture.awayTeam.buildAiContext();

  for (var i = 0; i < fixture.awayTeam.aiControllers.length; i++) {
    var controller = fixture.awayTeam.aiControllers[i];
    controller.updateRole(context);
    if (controller !== context.pressureController && controller.role != "goalie") {
      assertTrue(MathLib.computeDistance(controller.roleTarget, fixture.ball.position) >= fixture.config.aiMinBallSpacing - 0.0001);
    }
  }
});

test("Defender shape target stays between ball and own goal", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 433;
  var context = fixture.awayTeam.buildAiContext();
  var defender = roleController(fixture.awayTeam, "defender");
  var target = defender.defenderShapeTarget(context);

  assertTrue(defender !== null);
  assertTrue(target.y > defender.ownGoalCenter.y);
  assertTrue(target.y < fixture.ball.position.y);
});

test("Goalie target stays in front of own goal", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 3 });

  var goalie = roleController(fixture.awayTeam, "goalie");
  var target = goalie.goalieSlotTarget(fixture.awayTeam.buildAiContext());

  assertTrue(goalie !== null);
  assertNear(target.y, goalie.ownGoalLineY + fixture.config.goalieDistance, 0.0001);
});
