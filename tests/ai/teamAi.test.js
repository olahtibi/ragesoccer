var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function update(ai, restartActive, canMove) {
  ai.update({ restartActive: restartActive, canMove: canMove });
}

function attackBallIndex(ai) {
  var snapshots = ai.debugSnapshot();
  for (var i = 0; i < snapshots.length; i++) {
    if (snapshots[i].command == "attackBall") return i;
  }
  return -1;
}

function attackBallCount(ai) {
  var snapshots = ai.debugSnapshot();
  var count = 0;
  for (var i = 0; i < snapshots.length; i++) {
    if (snapshots[i].command == "attackBall") count++;
  }
  return count;
}

test("TeamAi kickoff states are relative to each team", function() {
  var homeKickoff = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  assertEqual(homeKickoff.homeTeamAi.state, "kickoffUs");
  assertEqual(homeKickoff.awayTeamAi.state, "kickoffOpponent");

  var awayKickoff = makeFixture({ homeTeamSize: 2, awayTeamSize: 2, kickoffSide: "away" });
  assertEqual(awayKickoff.homeTeamAi.state, "kickoffOpponent");
  assertEqual(awayKickoff.awayTeamAi.state, "kickoffUs");
});

test("TeamAi preserves its assigned state while a restart is active", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  fixture.ball.position.y += 100;

  update(fixture.homeTeamAi, true, true);

  assertEqual(fixture.homeTeamAi.state, "kickoffUs");
});

test("TeamAi returns to attack and defense after a restart", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  fixture.ball.position.y = fixture.config.aiCenterY + 80;

  update(fixture.homeTeamAi, false, true);
  update(fixture.awayTeamAi, false, true);

  assertEqual(fixture.homeTeamAi.state, "defense");
  assertEqual(fixture.awayTeamAi.state, "attack");
});

test("TeamAi keeps the human-controlled player inactive", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.homeTeam.humanPlayer = fixture.homePlayers[1];
  fixture.homePlayers[1].velocity.x = 10;

  update(fixture.homeTeamAi, false, true);

  assertEqual(fixture.homePlayers[1].velocity.x, 0);
  assertEqual(fixture.homeTeamAi.debugSnapshot()[1].command, "inactive");
});

test("TeamAi moves non-human home players to formation", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.homePlayers[1].position.x += 30;
  fixture.homeTeam.humanPlayer = fixture.homePlayers[0];

  update(fixture.homeTeamAi, false, true);

  assertTrue(fixture.homePlayers[1].velocity.x != 0 || fixture.homePlayers[1].velocity.y != 0);
});

test("TeamAi assigns attackBall to the closest away player", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  fixture.ball.position.x = fixture.awayPlayers[1].position.x;
  fixture.ball.position.y = fixture.awayPlayers[1].position.y;

  update(fixture.awayTeamAi, false, true);

  assertEqual(attackBallIndex(fixture.awayTeamAi), 1);
});

test("TeamAi applies attacker switching hysteresis", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  fixture.config.aiAttackerSwitchHysteresisDistance = 20;
  fixture.awayPlayers[0].position.x = 100;
  fixture.awayPlayers[1].position.x = 140;
  fixture.awayPlayers[0].position.y = fixture.awayPlayers[1].position.y = 100;
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 100;
  update(fixture.awayTeamAi, false, true);

  fixture.ball.position.x = 126;
  update(fixture.awayTeamAi, false, true);

  assertEqual(attackBallIndex(fixture.awayTeamAi), 0);
});

test("TeamAi freezes every player when match flow denies movement", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  fixture.awayPlayers[0].velocity.x = 10;
  fixture.awayPlayers[1].velocity.y = 12;

  update(fixture.awayTeamAi, true, false);

  assertEqual(fixture.awayPlayers[0].velocity.x, 0);
  assertEqual(fixture.awayPlayers[1].velocity.y, 0);
  assertEqual(attackBallIndex(fixture.awayTeamAi), -1);
});

test("TeamAi disabled skips updates", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  fixture.config.teamAiEnabled = false;

  update(fixture.awayTeamAi, false, true);

  assertEqual(attackBallIndex(fixture.awayTeamAi), -1);
});

test("TeamAi can run without window.game or input globals", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var originalGame = window.game;
  window.game = null;

  update(fixture.awayTeamAi, false, true);

  window.game = originalGame;
  assertEqual(attackBallIndex(fixture.awayTeamAi), 0);
});

test("TeamAi sends every corner receiver after the incoming cross", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 5 });
  fixture.awayTeamAi.setRestartState("cornerUs");
  fixture.ball.lastTouchedBy = "away";
  fixture.ball.position.y = fixture.config.fieldBottom - 20;

  update(fixture.awayTeamAi, false, true);

  assertEqual(fixture.awayTeamAi.state, "cornerUs");
  var snapshots = fixture.awayTeamAi.debugSnapshot();
  assertEqual(snapshots[0].command, "moveToPosition");
  assertEqual(snapshots[1].command, "moveToPosition");
  assertEqual(snapshots[2].command, "attackBall");
  assertEqual(snapshots[3].command, "attackBall");
  assertEqual(snapshots[4].command, "attackBall");

  fixture.ball.position.y = fixture.config.fieldBottom - fixture.config.cornerCrossDistance;
  update(fixture.awayTeamAi, false, true);

  assertEqual(fixture.awayTeamAi.state, "attack");
  assertEqual(attackBallCount(fixture.awayTeamAi), 1);
});

test("TeamAi uses only the corner taker before the cross is kicked", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 5 });
  fixture.awayTeamAi.setRestartState("cornerUs");
  fixture.ball.position.x = fixture.awayPlayers[4].position.x;
  fixture.ball.position.y = fixture.awayPlayers[4].position.y;

  update(fixture.awayTeamAi, true, true);

  assertEqual(attackBallCount(fixture.awayTeamAi), 1);
  assertEqual(attackBallIndex(fixture.awayTeamAi), 4);
});

test("TeamAi releases the corner shape when an opponent intercepts", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 4 });
  fixture.awayTeamAi.setRestartState("cornerUs");
  fixture.ball.position.y = fixture.config.fieldBottom - 20;
  fixture.ball.lastTouchedBy = "home";

  update(fixture.awayTeamAi, false, true);

  assertEqual(fixture.awayTeamAi.state, "attack");
  assertTrue(attackBallIndex(fixture.awayTeamAi) >= 0);
});
