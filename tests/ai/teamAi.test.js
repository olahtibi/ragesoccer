var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

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

test("TeamAi creates deterministic balanced formation movement profiles", function() {
  var first = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  var second = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  var profiles = first.awayTeamAi.movementProfiles;
  var paceTotal = 0;
  var outfieldCount = 0;
  var sawVariation = false;

  for (var i = 0; i < profiles.length; i++) {
    assertNear(
      profiles[i].paceMultiplier,
      second.awayTeamAi.movementProfiles[i].paceMultiplier,
      0.0000001
    );
    if (profiles[i].role == "goalie") {
      assertEqual(profiles[i].paceMultiplier, 1);
      assertEqual(profiles[i].lateralBias, 0);
      assertEqual(profiles[i].depthBias, 0);
      continue;
    }
    assertTrue(profiles[i].paceMultiplier >= 0.92);
    assertTrue(profiles[i].paceMultiplier <= 1.08);
    paceTotal += profiles[i].paceMultiplier;
    outfieldCount++;
    if (profiles[i].paceMultiplier != 1) sawVariation = true;
  }

  assertTrue(sawVariation);
  assertNear(paceTotal / outfieldCount, 1, 0.0000001);
});

test("TeamAi flexes open-play targets by player and role while keeping goalie exact", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 11 });
  var ai = fixture.awayTeamAi;
  var baseTargets = ai.formation.positions("attack", "away", 11);
  fixture.ball.position.x = fixture.config.initialBallPosition.x + 200;
  fixture.ball.position.y = fixture.config.initialBallPosition.y + 100;

  var targets = ai.openPlayTargets(baseTargets, 0.1);
  var defenderShift = ai.ballShiftForRole("defender");
  var midfielderShift = ai.ballShiftForRole("midfielder");

  assertTrue(targets[0] === baseTargets[0]);
  assertTrue(targets[1].x != baseTargets[1].x || targets[1].y != baseTargets[1].y);
  assertTrue(targets[2].x != targets[1].x);
  assertTrue(midfielderShift.x > defenderShift.x);
  for (var i = 0; i < targets.length; i++) {
    assertTrue(targets[i].x >= fixture.config.boxTopLeft.x);
    assertTrue(targets[i].x <= fixture.config.boxTopRight.x);
    assertTrue(targets[i].y >= fixture.config.boxTopLeft.y);
    assertTrue(targets[i].y <= fixture.config.boxBottomLeft.y);
  }
});

test("TeamAi independently wanders player depth instead of preserving flat lines", function() {
  var first = makeFixture({ homeTeamSize: 1, awayTeamSize: 11 });
  var second = makeFixture({ homeTeamSize: 1, awayTeamSize: 11 });
  var firstBase = first.awayTeamAi.formation.positions("attack", "away", 11);
  var secondBase = second.awayTeamAi.formation.positions("attack", "away", 11);
  var firstTargets;
  var secondTargets;
  var maxObservedSpread = 0;
  var initialDefenderY = null;

  for (var frame = 0; frame < 240; frame++) {
    firstTargets = first.awayTeamAi.openPlayTargets(firstBase, 1 / 30);
    secondTargets = second.awayTeamAi.openPlayTargets(secondBase, 1 / 30);
    if (initialDefenderY == null) initialDefenderY = firstTargets[1].y;
    var frameMinY = Infinity;
    var frameMaxY = -Infinity;
    for (var defenderIndex = 1; defenderIndex <= 4; defenderIndex++) {
      frameMinY = Math.min(frameMinY, firstTargets[defenderIndex].y);
      frameMaxY = Math.max(frameMaxY, firstTargets[defenderIndex].y);
    }
    maxObservedSpread = Math.max(maxObservedSpread, frameMaxY - frameMinY);
  }

  for (var i = 1; i <= 4; i++) {
    assertNear(firstTargets[i].x, secondTargets[i].x, 0.0000001);
    assertNear(firstTargets[i].y, secondTargets[i].y, 0.0000001);
  }
  assertTrue(maxObservedSpread > 15);
  assertTrue(Math.abs(firstTargets[1].y - initialDefenderY) > 2);
});

test("TeamAi gently separates crowded formation destinations", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 3 });
  var ai = fixture.awayTeamAi;
  fixture.awayPlayers[0].position.x = 100;
  fixture.awayPlayers[0].position.y = 100;
  fixture.awayPlayers[1].position.x = 300;
  fixture.awayPlayers[1].position.y = 300;
  fixture.awayPlayers[2].position.x = 300;
  fixture.awayPlayers[2].position.y = 300;
  var targets = [
    new Vector2d(100, 100),
    new Vector2d(300, 300),
    new Vector2d(300, 300)
  ];

  var separated = ai.separateFormationTargets(targets);

  assertTrue(separated[1].x < targets[1].x);
  assertTrue(separated[2].x > targets[2].x);
  assertTrue(targets[1].x - separated[1].x <= fixture.config.aiFormationSeparationMaxShift);
  assertTrue(separated[2].x - targets[2].x <= fixture.config.aiFormationSeparationMaxShift);
});

test("TeamAi uses exact targets and clears smoothing during restart setup", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 5 });
  var ai = fixture.awayTeamAi;
  var openTargets = ai.formation.positions("attack", "away", 5);
  ai.openPlayTargets(openTargets, 0.1);
  var restartTargets = ai.formation.positions("kickoffUs", "away", 5);

  ai.update({
    restartActive: true,
    canMove: true,
    restartTaker: fixture.awayPlayers[0],
    positioningTargets: restartTargets,
    deltaSeconds: 0.1
  });

  assertTrue(ai.debugSnapshot()[1].target === restartTargets[1]);
  for (var i = 0; i < ai.movementProfiles.length; i++) {
    assertEqual(ai.movementProfiles[i].smoothedTarget, null);
  }
});
