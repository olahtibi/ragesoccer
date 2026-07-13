var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function startedGame(fixture) {
  window.game = {
    started: true,
    isPaused: function() { return false; }
  };
}

function completeKickoff(fixture) {
  fixture.stadium.kickoffComplete = true;
}

test("TeamAi starts in kickoffUs when home kicks off", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  startedGame(fixture);

  fixture.homeTeam.updateAi();
  fixture.awayTeam.updateAi();

  assertEqual(fixture.homeTeam.teamAi.state, "kickoffUs");
  assertEqual(fixture.awayTeam.teamAi.state, "kickoffUs");
});

test("TeamAi starts in kickoffOpponent when away kicks off", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2, kickoffSide: "away" });
  startedGame(fixture);

  fixture.homeTeam.updateAi();
  fixture.awayTeam.updateAi();

  assertEqual(fixture.homeTeam.teamAi.state, "kickoffOpponent");
  assertEqual(fixture.awayTeam.teamAi.state, "kickoffOpponent");
});

test("TeamAi keeps kickoff state until kickoff is complete", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  startedGame(fixture);
  fixture.ball.position.y = fixture.config.aiCenterY + 120;

  fixture.homeTeam.updateAi();

  assertEqual(fixture.homeTeam.teamAi.state, "kickoffUs");
});

test("TeamAi does not return to kickoff after kickoff is complete", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.ball.position.x = fixture.config.initialBallPosition.x;
  fixture.ball.position.y = fixture.config.initialBallPosition.y;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.awayTeam.teamAi.state, "attack");
});

test("TeamAi state is attack when ball is in opponent half", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.ball.position.y = fixture.config.aiCenterY + 80;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.awayTeam.teamAi.state, "attack");
});

test("TeamAi state is defense when ball is in own half", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.ball.position.y = fixture.config.aiCenterY - 80;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.awayTeam.teamAi.state, "defense");
});

test("TeamAi uses configured center line for half detection", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.aiCenterY = 390;
  fixture.ball.position.y = 410;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.awayTeam.teamAi.state, "attack");
});

test("TeamAi assigns inactive to closest home player and stops it", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.homePlayers[0].velocity.x = 3;
  fixture.homePlayers[0].velocity.y = 4;
  fixture.homePlayers[1].velocity.x = 9;
  fixture.homePlayers[1].velocity.y = -4;
  fixture.ball.position.x = fixture.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.homePlayers[1].position.y;

  fixture.homeTeam.updateAi();

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[1]);
  assertEqual(fixture.homePlayers[1].velocity.x, 0);
  assertEqual(fixture.homePlayers[1].velocity.y, 0);
  assertEqual(fixture.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.homePlayers[0].velocity.y, 0);
});

test("TeamAi keeps current human when another player is only slightly closer", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.humanSwitchHysteresisDistance = 20;
  fixture.homePlayers[0].position.x = 100;
  fixture.homePlayers[0].position.y = 100;
  fixture.homePlayers[1].position.x = 112;
  fixture.homePlayers[1].position.y = 100;
  fixture.ball.position.x = 120;
  fixture.ball.position.y = 100;
  fixture.homeTeam.humanPlayer = fixture.homePlayers[0];

  fixture.homeTeam.updateAi();

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[0]);
});

test("TeamAi switches human when another player is clearly closer", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.humanSwitchHysteresisDistance = 20;
  fixture.homePlayers[0].position.x = 100;
  fixture.homePlayers[0].position.y = 100;
  fixture.homePlayers[1].position.x = 140;
  fixture.homePlayers[1].position.y = 100;
  fixture.ball.position.x = 140;
  fixture.ball.position.y = 100;
  fixture.homeTeam.humanPlayer = fixture.homePlayers[0];

  fixture.homeTeam.updateAi();

  assertTrue(fixture.homeTeam.humanPlayer === fixture.homePlayers[1]);
});

test("TeamAi away ball attacker ignores human hysteresis", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.humanSwitchHysteresisDistance = 500;
  fixture.awayPlayers[0].position.x = 100;
  fixture.awayPlayers[0].position.y = 100;
  fixture.awayPlayers[1].position.x = 140;
  fixture.awayPlayers[1].position.y = 100;
  fixture.ball.position.x = 140;
  fixture.ball.position.y = 100;

  fixture.awayTeam.updateAi();

  assertEqual(attackBallIndex(fixture.awayTeam), 1);
});

function attackBallIndex(team) {
  var snapshots = team.teamAi.debugSnapshot();
  for (var i = 0; i < snapshots.length; i++) {
    if (snapshots[i].command == "attackBall") {
      return i;
    }
  }
  return -1;
}

test("TeamAi keeps away ball attacker when another player is only slightly closer", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.aiAttackerSwitchHysteresisDistance = 20;
  fixture.awayPlayers[0].position.x = 100;
  fixture.awayPlayers[0].position.y = 100;
  fixture.awayPlayers[1].position.x = 140;
  fixture.awayPlayers[1].position.y = 100;
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 100;

  fixture.awayTeam.updateAi();
  assertEqual(attackBallIndex(fixture.awayTeam), 0);

  fixture.ball.position.x = 126;
  fixture.ball.position.y = 100;
  fixture.awayTeam.updateAi();

  assertEqual(attackBallIndex(fixture.awayTeam), 0);
});

test("TeamAi switches away ball attacker when another player is clearly closer", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.aiAttackerSwitchHysteresisDistance = 20;
  fixture.awayPlayers[0].position.x = 100;
  fixture.awayPlayers[0].position.y = 100;
  fixture.awayPlayers[1].position.x = 160;
  fixture.awayPlayers[1].position.y = 100;
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 100;

  fixture.awayTeam.updateAi();
  assertEqual(attackBallIndex(fixture.awayTeam), 0);

  fixture.ball.position.x = 160;
  fixture.ball.position.y = 100;
  fixture.awayTeam.updateAi();

  assertEqual(attackBallIndex(fixture.awayTeam), 1);
});

test("TeamAi moves non-human home players to formation", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.homePlayers[0].position.x += 30;
  fixture.ball.position.x = fixture.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.homePlayers[1].position.y;

  fixture.homeTeam.updateAi();

  assertTrue(fixture.homePlayers[0].velocity.x !== 0 || fixture.homePlayers[0].velocity.y !== 0);
});

test("TeamAi assigns attackBall to closest away player", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.ball.position.x = fixture.awayPlayers[1].position.x + 20;
  fixture.ball.position.y = fixture.awayPlayers[1].position.y;

  fixture.awayTeam.updateAi();

  assertEqual(attackBallIndex(fixture.awayTeam), 1);
});

test("TeamAi moves non-closest away players to formation", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.awayPlayers[0].position.x += 30;
  fixture.ball.position.x = fixture.awayPlayers[1].position.x;
  fixture.ball.position.y = fixture.awayPlayers[1].position.y;

  fixture.awayTeam.updateAi();

  assertTrue(fixture.awayPlayers[0].velocity.x !== 0 || fixture.awayPlayers[0].velocity.y !== 0);
});

test("TeamAi disabled skips updates", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  completeKickoff(fixture);
  fixture.config.teamAiEnabled = false;
  fixture.ball.position.x = fixture.awayPlayers[1].position.x + 20;
  fixture.ball.position.y = fixture.awayPlayers[1].position.y;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.awayPlayers[1].velocity.x, 0);
  assertEqual(fixture.awayPlayers[1].velocity.y, 0);
});

test("TeamAi freezes away team during home kickoff", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  startedGame(fixture);
  fixture.awayPlayers[0].velocity.x = 10;
  fixture.awayPlayers[1].velocity.y = 12;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.awayPlayers[0].velocity.x, 0);
  assertEqual(fixture.awayPlayers[0].velocity.y, 0);
  assertEqual(fixture.awayPlayers[1].velocity.x, 0);
  assertEqual(fixture.awayPlayers[1].velocity.y, 0);
  assertEqual(attackBallIndex(fixture.awayTeam), -1);
});

test("TeamAi freezes home team during away kickoff", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1, kickoffSide: "away" });
  startedGame(fixture);
  fixture.homePlayers[0].velocity.x = 10;
  fixture.homePlayers[1].velocity.y = 12;

  fixture.homeTeam.updateAi();

  assertEqual(fixture.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.homePlayers[0].velocity.y, 0);
  assertEqual(fixture.homePlayers[1].velocity.x, 0);
  assertEqual(fixture.homePlayers[1].velocity.y, 0);
});
