var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

function ellipseDistance(config, position) {
  var dx = position.x - config.initialBallPosition.x;
  var dy = position.y - config.aiCenterY;
  return dx * dx / (config.centerCircleRadiusX * config.centerCircleRadiusX) +
    dy * dy / (config.centerCircleRadiusY * config.centerCircleRadiusY);
}

function cutsceneTargetForPlayer(cutscene, player) {
  for (var t = 0; t < cutscene.teams.length; t++) {
    for (var i = 0; i < cutscene.teams[t].players.length; i++) {
      if (cutscene.teams[t].players[i] === player) return cutscene.teams[t].positions[i];
    }
  }
  return null;
}

test("RestartRegistry resolves strategies by generic type", function() {
  var registry = new RestartRegistry();
  var strategy = {};
  registry.register("throwIn", strategy);

  assertTrue(registry.get("throwIn") === strategy);
  assertEqual(registry.get("corner"), null);
});

test("Initial kickoff waits for input without playing a cutscene", function() {
  var fixture = makeFixture();

  assertEqual(fixture.game.matchFlow.state, "restart");
  assertEqual(fixture.game.restartController.type(), "kickoff");
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.game.matchFlow.simulationMode(), "none");
});

test("Restart positioning progresses through waiting and in-progress phases", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  fixture.game.beginRestart("kickoff", "away");

  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.game.matchFlow.simulationMode(), "playersOnly");

  fixture.game.cutscene.clear(fixture.game);
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");

  fixture.game.resumeFromInput();
  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertEqual(fixture.game.matchFlow.simulationMode(), "full");
});

test("Beginning a restart clears keyboard touch and controlled-player velocity", function() {
  var fixture = makeFixture();
  fixture.game.humanController.setKey(39, true);
  fixture.game.humanController.setTouchTarget(new Vector2d(400, 400));
  fixture.homeTeam.humanPlayer.velocity.x = 10;
  fixture.homeTeam.humanPlayer.velocity.y = -10;

  fixture.game.beginRestart("kickoff", "away");

  assertEqual(fixture.game.humanController.keys[39], undefined);
  assertEqual(fixture.game.humanController.touchTarget, null);
  assertEqual(fixture.homeTeam.humanPlayer.velocity.x, 0);
  assertEqual(fixture.homeTeam.humanPlayer.velocity.y, 0);
});

test("Goal kick can start when its taker arrives while teammates are still positioning", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.initialBallPosition.x, fixture.config.fieldBottom)
  });
  var cutscene = fixture.game.cutscene;
  var taker = cutscene.readyPlayer;
  var target = cutsceneTargetForPlayer(cutscene, taker);
  var unfinished = fixture.homePlayers[3];
  var designatedTarget = cutsceneTargetForPlayer(cutscene, unfinished);
  unfinished.position.x = fixture.config.fieldLeft;
  unfinished.position.y = fixture.config.aiCenterY;
  var unfinishedX = unfinished.position.x;
  var unfinishedY = unfinished.position.y;

  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), false);
  taker.position.x = target.x;
  taker.position.y = target.y;
  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), true);

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertEqual(cutscene.isActive(), false);
  assertEqual(unfinished.position.x, unfinishedX);
  assertEqual(unfinished.position.y, unfinishedY);

  fixture.game.updateAi();
  var targetAfterRelease = fixture.homeTeamAi.debugSnapshot()[3].target;
  assertEqual(targetAfterRelease.x, designatedTarget.x);
  assertEqual(targetAfterRelease.y, designatedTarget.y);
});

test("Early home restart selects the designated taker over a closer teammate", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.initialBallPosition.x, fixture.config.fieldBottom)
  });
  var cutscene = fixture.game.cutscene;
  var taker = cutscene.readyPlayer;
  var target = cutsceneTargetForPlayer(cutscene, taker);
  taker.position.x = target.x;
  taker.position.y = target.y;
  fixture.homePlayers[1].position.x = cutscene.ballPosition.x;
  fixture.homePlayers[1].position.y = cutscene.ballPosition.y;

  fixture.game.resumeFromInput(new Vector2d(0, -1));

  assertTrue(fixture.homeTeam.humanPlayer === taker);
});

test("Away corner waits for the configured delay after its taker is ready", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("corner", "away", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.fieldRight, fixture.config.fieldBottom)
  });
  var cutscene = fixture.game.cutscene;
  var target = cutsceneTargetForPlayer(cutscene, cutscene.readyPlayer);
  cutscene.readyPlayer.position.x = target.x;
  cutscene.readyPlayer.position.y = target.y;

  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), false);

  fixture.game.physics.lastDt = 0.4;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.restartController.phase(), "positioning");

  fixture.game.physics.lastDt = 0.6;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertEqual(cutscene.isActive(), false);
});

test("Opponent restart delay continues after every player finishes positioning", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.fieldRight, fixture.config.aiCenterY)
  });
  fixture.game.cutscene.clear(fixture.game);

  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.game.matchFlow.simulationMode(), "playersOnly");

  fixture.game.physics.lastDt = 0.5;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context());
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");

  fixture.game.physics.lastDt = 0.5;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context());
  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertTrue(fixture.ball.velocity.z > 0);
});

test("Early away goal kick keeps the goalkeeper as designated taker", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.config.opponentRestartDelaySeconds = 0;
  fixture.game.beginRestart("goalKick", "away", {
    boundary: "top",
    position: new Vector2d(fixture.config.initialBallPosition.x, fixture.config.fieldTop)
  });
  var cutscene = fixture.game.cutscene;
  var target = cutsceneTargetForPlayer(cutscene, cutscene.readyPlayer);
  cutscene.readyPlayer.position.x = target.x;
  cutscene.readyPlayer.position.y = target.y;
  fixture.awayPlayers[1].position.x = cutscene.ballPosition.x;
  fixture.awayPlayers[1].position.y = cutscene.ballPosition.y;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context());
  fixture.game.updateAi();

  assertEqual(fixture.awayTeamAi.debugSnapshot()[0].command, "attackBall");
  assertEqual(fixture.awayTeamAi.debugSnapshot()[1].command, "moveToPosition");
});

test("Away throw-in launches automatically when its taker is ready", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.config.opponentRestartDelaySeconds = 0;
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.fieldRight, fixture.config.aiCenterY)
  });
  var cutscene = fixture.game.cutscene;
  var target = cutsceneTargetForPlayer(cutscene, cutscene.readyPlayer);
  cutscene.readyPlayer.position.x = target.x;
  cutscene.readyPlayer.position.y = target.y;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertTrue(fixture.ball.velocity.x < 0);
  assertTrue(fixture.ball.velocity.z > 0);
  assertEqual(fixture.ball.lastTouchedBy, "away");
});

test("Held human input starts an early restart when the taker becomes ready", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.initialBallPosition.x, fixture.config.fieldBottom)
  });
  fixture.game.humanController.setKey(38, true);
  var cutscene = fixture.game.cutscene;
  var target = cutsceneTargetForPlayer(cutscene, cutscene.readyPlayer);
  cutscene.readyPlayer.position.x = target.x;
  cutscene.readyPlayer.position.y = target.y;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.restartController.phase(), "inProgress");
});

test("Kickoff assigns relative states and movement permission", function() {
  var fixture = makeFixture({ kickoffSide: "away" });
  fixture.game.resumeFromInput();

  assertEqual(fixture.homeTeamAi.state, "kickoffOpponent");
  assertEqual(fixture.awayTeamAi.state, "kickoffUs");
  assertEqual(fixture.game.restartController.canTeamMove(fixture.homeTeam), false);
  assertEqual(fixture.game.restartController.canTeamMove(fixture.awayTeam), true);
});

test("Throw-in uses fresh directional input to launch a lofted inward throw", function() {
  var fixture = makeFixture();
  fixture.game.beginRestart("throwIn", "home", {
    boundary: "left",
    position: new Vector2d(fixture.config.fieldLeft, fixture.config.aiCenterY)
  });
  fixture.game.cutscene.updateBeforePhysics(fixture.game);
  fixture.game.cutscene.clear(fixture.game);

  var taker = fixture.ball.heldBy;
  var heldPosition = fixture.ball.heldPosition();
  assertTrue(taker !== null);
  assertEqual(taker.facingX, 1);
  assertEqual(taker.facingY, 0);
  assertTrue(heldPosition.x > taker.position.x);
  assertTrue(heldPosition.y < taker.position.y);

  fixture.game.resumeFromInput(new Vector2d(-1, 0));

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertTrue(fixture.ball.velocity.x > 0);
  assertTrue(fixture.ball.velocity.z > 0);
  assertEqual(fixture.ball.lastTouchedBy, "home");
  assertEqual(fixture.ball.heldBy, null);
  assertEqual(fixture.ball.position.x, heldPosition.x);
  assertEqual(fixture.ball.position.y, heldPosition.y);
});

test("Away throw-in chooses an automatic inward attacking direction", function() {
  var fixture = makeFixture();
  fixture.config.opponentRestartDelaySeconds = 0;
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.fieldRight, fixture.config.aiCenterY)
  });
  fixture.game.cutscene.updateBeforePhysics(fixture.game);
  fixture.game.cutscene.clear(fixture.game);

  assertEqual(fixture.ball.heldBy.facingX, -1);
  assertEqual(fixture.ball.heldBy.facingY, 0);

  fixture.game.restartController.updateAfterPhysics(fixture.game.context());

  assertTrue(fixture.ball.velocity.x < 0);
  assertTrue(fixture.ball.velocity.y > 0);
  assertEqual(fixture.ball.lastTouchedBy, "away");
});

test("Set-piece positioning keeps opponents outside the restart distance", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("corner", "home", {
    boundary: "top",
    position: new Vector2d(fixture.config.fieldLeft, fixture.config.fieldTop)
  });
  var ballPosition = fixture.game.cutscene.ballPosition;
  var awayScene = fixture.game.cutscene.teams[1];

  for (var i = 0; i < awayScene.positions.length; i++) {
    assertTrue(MathLib.computeDistance(awayScene.positions[i], ballPosition) >=
      fixture.config.restartOpponentDistance - 0.0001);
  }
});

test("Corner restart gives the awarded AI team a central crossing target", function() {
  var fixture = makeFixture();
  fixture.game.beginRestart("corner", "away", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.fieldRight, fixture.config.fieldBottom)
  });

  var target = fixture.game.restartController.attackTarget(fixture.awayTeam);

  assertEqual(target.x, fixture.config.initialBallPosition.x);
  assertEqual(target.y, fixture.config.fieldBottom - fixture.config.cornerCrossDistance);
  assertEqual(fixture.game.restartController.attackTarget(fixture.homeTeam), null);
});

test("Corner restart never selects the goalkeeper or cover defender as taker", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  var corner = new Vector2d(fixture.config.fieldLeft, fixture.config.fieldTop);
  fixture.homePlayers[0].position.x = corner.x;
  fixture.homePlayers[0].position.y = corner.y;
  fixture.homePlayers[1].position.x = corner.x + 1;
  fixture.homePlayers[1].position.y = corner.y + 1;
  fixture.homePlayers[2].position.x = corner.x + 40;
  fixture.homePlayers[2].position.y = corner.y + 40;
  fixture.homePlayers[3].position.x = corner.x + 80;
  fixture.homePlayers[3].position.y = corner.y + 80;

  fixture.game.beginRestart("corner", "home", {
    boundary: "top",
    position: corner
  });

  var scene = fixture.game.cutscene;
  var homeScene = scene.teams[0];
  assertTrue(MathLib.computeDistance(homeScene.positions[2], scene.ballPosition) < 20);
  assertTrue(MathLib.computeDistance(homeScene.positions[0], scene.ballPosition) > 20);
  assertTrue(MathLib.computeDistance(homeScene.positions[1], scene.ballPosition) > 20);
  assertTrue(Math.abs(
    homeScene.positions[3].y -
      (fixture.config.fieldTop + fixture.config.cornerBoxDepth)
  ) <= fixture.config.restartPositionVariationY);
});

test("Corner restart applies the taker-aware layered plan before jitter", function() {
  var fixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  fixture.game.beginRestart("corner", "home", {
    boundary: "top",
    position: new Vector2d(fixture.config.fieldLeft, fixture.config.fieldTop)
  });
  var scene = fixture.game.cutscene;
  var homeScene = scene.teams[0];
  var takerIndex = homeScene.players.indexOf(scene.readyPlayer);
  var plan = new Formation(fixture.config).cornerAttackingPlan(
    "home",
    11,
    takerIndex,
    true
  );
  var shortIndex = plan.groups.indexOf("short");

  assertTrue(takerIndex >= 0);
  assertTrue(Math.abs(homeScene.positions[shortIndex].x - plan.positions[shortIndex].x) <=
    fixture.config.restartPositionVariationX);
  assertTrue(Math.abs(homeScene.positions[shortIndex].y - plan.positions[shortIndex].y) <=
    fixture.config.restartPositionVariationY);
  assertTrue(MathLib.computeDistance(homeScene.positions[takerIndex], scene.ballPosition) < 20);
});

test("Goal kick always positions the goalkeeper as the only nearby taker", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3 });
  var ballPosition = new Vector2d(
    fixture.config.initialBallPosition.x,
    fixture.config.fieldBottom - fixture.config.goalKickDistance
  );
  fixture.homePlayers[0].position.x = fixture.config.fieldLeft;
  fixture.homePlayers[0].position.y = fixture.config.aiCenterY;
  fixture.homePlayers[1].position.x = ballPosition.x;
  fixture.homePlayers[1].position.y = ballPosition.y;

  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.initialBallPosition.x, fixture.config.fieldBottom)
  });

  var homeScene = fixture.game.cutscene.teams[0];
  var nearby = 0;
  for (var i = 0; i < homeScene.positions.length; i++) {
    if (MathLib.computeDistance(homeScene.positions[i], ballPosition) < 40) nearby++;
  }
  assertEqual(nearby, 1);
  assertNear(
    MathLib.computeDistance(homeScene.positions[0], ballPosition),
    fixture.config.goalKickTakerDistance,
    0.0001
  );
});

test("Kickoff clamps the human player to the center ellipse", function() {
  var fixture = makeFixture();
  fixture.game.resumeFromInput();
  var player = fixture.homeTeam.humanPlayer;
  player.position.y = fixture.config.aiCenterY - fixture.config.centerCircleRadiusY - 20;
  player.velocity.y = -10;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context());

  assertNear(ellipseDistance(fixture.config, player.position), 1, 0.0001);
  assertEqual(player.velocity.y, 0);
});

test("Kickoff scene exposes the dedicated first striker as taker", function() {
  var homeFixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  homeFixture.game.beginRestart("kickoff", "home");
  assertTrue(homeFixture.game.cutscene.readyPlayer === homeFixture.homePlayers[9]);

  var awayFixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  awayFixture.game.beginRestart("kickoff", "away");
  assertTrue(awayFixture.game.cutscene.readyPlayer === awayFixture.awayPlayers[9]);
});

test("Kickoff slightly varies non-takers while preserving legal positions", function() {
  var fixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  var strategy = new KickoffRestart(fixture.config);
  var request = { awardedTo: "home", positioningSeed: 7 };
  var scene = strategy.createScene(fixture.game.context(), request);
  var formation = new Formation(fixture.config);
  var takerIndex = formation.kickoffTakerIndex(11);
  var exactHome = formation.positions("kickoffUs", "home", 11);
  var sawVariation = false;

  for (var teamIndex = 0; teamIndex < scene.teams.length; teamIndex++) {
    var sceneTeam = scene.teams[teamIndex];
    for (var i = 0; i < sceneTeam.positions.length; i++) {
      var isTaker = sceneTeam.side == "home" && i == takerIndex;
      if (isTaker) {
        assertEqual(sceneTeam.positions[i].x, exactHome[i].x);
        assertEqual(sceneTeam.positions[i].y, exactHome[i].y);
        continue;
      }
      assertTrue(ellipseDistance(fixture.config, sceneTeam.positions[i]) >= 1);
      if (sceneTeam.side == "home") {
        assertTrue(sceneTeam.positions[i].y >=
          fixture.config.aiCenterY + fixture.config.playerRadius);
        if (sceneTeam.positions[i].x != exactHome[i].x ||
            sceneTeam.positions[i].y != exactHome[i].y) {
          sawVariation = true;
        }
      } else {
        assertTrue(sceneTeam.positions[i].y <=
          fixture.config.aiCenterY - fixture.config.playerRadius);
      }
    }
  }
  assertTrue(sawVariation);
});

test("Throw-in corner and goal-kick positioning changes with restart seed", function() {
  var fixture = makeFixture({ homeTeamSize: 5, awayTeamSize: 5 });
  var cases = [
    {
      strategy: new ThrowInRestart(fixture.config),
      request: { awardedTo: "home", boundary: "left", position: new Vector2d(81, 400) }
    },
    {
      strategy: new CornerRestart(fixture.config),
      request: { awardedTo: "home", boundary: "top", position: new Vector2d(81, 113) }
    },
    {
      strategy: new GoalKickRestart(fixture.config),
      request: { awardedTo: "home", boundary: "bottom", position: new Vector2d(334, 753) }
    }
  ];

  for (var caseIndex = 0; caseIndex < cases.length; caseIndex++) {
    var entry = cases[caseIndex];
    entry.request.positioningSeed = 20;
    var first = entry.strategy.createScene(fixture.game.context(), entry.request);
    entry.request.positioningSeed = 21;
    var second = entry.strategy.createScene(fixture.game.context(), entry.request);
    var sawVariation = false;

    for (var teamIndex = 0; teamIndex < first.teams.length; teamIndex++) {
      for (var i = 0; i < first.teams[teamIndex].positions.length; i++) {
        var firstPlayer = first.teams[teamIndex].players[i];
        var firstTarget = first.teams[teamIndex].positions[i];
        var secondTarget = second.teams[teamIndex].positions[i];
        if (firstPlayer === first.readyPlayer) {
          assertEqual(firstTarget.x, secondTarget.x);
          assertEqual(firstTarget.y, secondTarget.y);
        } else if (firstTarget.x != secondTarget.x || firstTarget.y != secondTarget.y) {
          sawVariation = true;
        }
      }
    }
    assertTrue(sawVariation);
  }
});

test("Kickoff completes generically when its strategy condition is met", function() {
  var fixture = makeFixture();
  fixture.game.resumeFromInput();
  fixture.ball.velocity.x = fixture.config.minVelocity + 1;

  fixture.game.matchFlow.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.matchFlow.state, "normalPlay");
  assertEqual(fixture.game.restartController.type(), null);
  assertEqual(fixture.game.restartController.phase(), null);
});

test("MatchFlow pause resumes the previous restart state", function() {
  var fixture = makeFixture();
  fixture.game.togglePause();

  assertEqual(fixture.game.matchFlow.state, "paused");
  assertEqual(fixture.game.matchFlow.simulationMode(), "none");

  fixture.game.togglePause();
  assertEqual(fixture.game.matchFlow.state, "restart");
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
});

test("MatchFlow rejects nested positioning and paused restart requests", function() {
  var fixture = makeFixture();
  assertEqual(fixture.game.beginRestart("kickoff", "home"), true);
  assertEqual(fixture.game.beginRestart("kickoff", "away"), false);

  fixture.game.togglePause();
  assertEqual(fixture.game.beginRestart("kickoff", "away"), false);
});
