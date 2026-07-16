var testlib = require("../../testlib");
var makeFixture = require("../../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

function ellipseDistance(config, position) {
  var dx = position.x - config.pitch.initialBallPosition.x;
  var dy = position.y - config.pitch.aiCenterY;
  return dx * dx / (config.pitch.centerCircleRadiusX * config.pitch.centerCircleRadiusX) +
    dy * dy / (config.pitch.centerCircleRadiusY * config.pitch.centerCircleRadiusY);
}

function positioningTargetForPlayer(controller, player) {
  for (var t = 0; t < controller._sceneTeams.length; t++) {
    for (var i = 0; i < controller._sceneTeams[t].players.length; i++) {
      if (controller._sceneTeams[t].players[i] === player) {
        return controller._sceneTeams[t].positions[i];
      }
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

test("Initial kickoff waits for input without running positioning", function() {
  var fixture = makeFixture();

  assertEqual(fixture.game.matchFlow.state, "restart");
  assertEqual(fixture.game.restartController.type(), "kickoff");
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.game.matchFlow.simulationMode(), "none");
});

test("Restart positioning progresses through waiting and in-progress phases", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  fixture.game.beginRestart("kickoff", "home");

  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.game.matchFlow.simulationMode(), "playersOnly");

  fixture.positioningController._clear(fixture.game.context());
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
    position: new Vector2d(fixture.config.pitch.initialBallPosition.x, fixture.config.pitch.fieldBottom)
  });
  var controller = fixture.positioningController;
  var taker = controller._readyPlayer;
  var target = positioningTargetForPlayer(controller, taker);
  var unfinished = fixture.homePlayers[3];
  var designatedTarget = positioningTargetForPlayer(controller, unfinished);
  unfinished.position.x = fixture.config.pitch.fieldLeft;
  unfinished.position.y = fixture.config.pitch.aiCenterY;
  var unfinishedX = unfinished.position.x;
  var unfinishedY = unfinished.position.y;

  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), false);
  taker.position.x = target.x;
  taker.position.y = target.y;
  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), true);

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertEqual(controller.isActive(), false);
  assertEqual(unfinished.position.x, unfinishedX);
  assertEqual(unfinished.position.y, unfinishedY);

  fixture.game._updateAi();
  var targetAfterRelease = fixture.homeTeamAi.debugSnapshot()[3].target;
  assertEqual(targetAfterRelease.x, designatedTarget.x);
  assertEqual(targetAfterRelease.y, designatedTarget.y);
});

test("Early home restart selects the designated taker over a closer teammate", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.pitch.initialBallPosition.x, fixture.config.pitch.fieldBottom)
  });
  var controller = fixture.positioningController;
  var taker = controller._readyPlayer;
  var target = positioningTargetForPlayer(controller, taker);
  taker.position.x = target.x;
  taker.position.y = target.y;
  fixture.homePlayers[1].position.x = controller._ballPosition.x;
  fixture.homePlayers[1].position.y = controller._ballPosition.y;

  fixture.game.resumeFromInput(new Vector2d(0, -1));

  assertTrue(fixture.homeTeam.humanPlayer === taker);
});

test("Away corner waits for the configured delay after its taker is ready", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("corner", "away", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.pitch.fieldRight, fixture.config.pitch.fieldBottom)
  });
  var controller = fixture.positioningController;
  var target = positioningTargetForPlayer(controller, controller._readyPlayer);
  controller._readyPlayer.position.x = target.x;
  controller._readyPlayer.position.y = target.y;

  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), false);

  fixture.game.physics.lastDt = 0.4;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertEqual(fixture.game.restartController.phase(), "positioning");

  fixture.game.physics.lastDt = 0.6;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertEqual(controller.isActive(), false);
});

test("Opponent restart delay continues after every player finishes positioning", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.pitch.fieldRight, fixture.config.pitch.aiCenterY)
  });
  fixture.positioningController._clear(fixture.game.context());

  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.game.matchFlow.simulationMode(), "playersOnly");

  fixture.game.physics.lastDt = 0.5;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");

  fixture.game.physics.lastDt = 0.5;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);
  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertTrue(fixture.ball.velocity.z > 0);
});

test("Away kickoff delay starts only after every player finishes positioning", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("kickoff", "away");
  var controller = fixture.positioningController;
  var takerTarget = positioningTargetForPlayer(controller, controller._readyPlayer);
  controller._readyPlayer.position.x = takerTarget.x;
  controller._readyPlayer.position.y = takerTarget.y;

  fixture.game.physics.lastDt = 1;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);
  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.game.resumeFromInput(new Vector2d(0, -1)), false);

  controller._clear(fixture.game.context());
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");

  fixture.game.physics.lastDt = 0.6;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);
  assertEqual(fixture.game.restartController.phase(), "waitingForInput");

  fixture.game.physics.lastDt = 0.4;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);
  assertEqual(fixture.game.restartController.phase(), "inProgress");
});

test("Early away goal kick keeps the goalkeeper as designated taker", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.config.restarts.opponentDelaySeconds = 0;
  fixture.game.beginRestart("goalKick", "away", {
    boundary: "top",
    position: new Vector2d(fixture.config.pitch.initialBallPosition.x, fixture.config.pitch.fieldTop)
  });
  var controller = fixture.positioningController;
  var target = positioningTargetForPlayer(controller, controller._readyPlayer);
  controller._readyPlayer.position.x = target.x;
  controller._readyPlayer.position.y = target.y;
  fixture.awayPlayers[1].position.x = controller._ballPosition.x;
  fixture.awayPlayers[1].position.y = controller._ballPosition.y;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);
  fixture.game._updateAi();

  assertEqual(fixture.awayTeamAi.debugSnapshot()[0].command, "attackBall");
  assertEqual(fixture.awayTeamAi.debugSnapshot()[1].command, "moveToPosition");
});

test("Away throw-in launches automatically when its taker is ready", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.config.restarts.opponentDelaySeconds = 0;
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.pitch.fieldRight, fixture.config.pitch.aiCenterY)
  });
  var controller = fixture.positioningController;
  var target = positioningTargetForPlayer(controller, controller._readyPlayer);
  controller._readyPlayer.position.x = target.x;
  controller._readyPlayer.position.y = target.y;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertEqual(fixture.game.restartController.phase(), "inProgress");
  assertTrue(fixture.ball.velocity.x < 0);
  assertTrue(fixture.ball.velocity.z > 0);
  assertEqual(fixture.ball.lastTouchedBy, "away");
});

test("Held human input starts an early restart when the taker becomes ready", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.pitch.initialBallPosition.x, fixture.config.pitch.fieldBottom)
  });
  fixture.game.humanController.setKey(38, true);
  var controller = fixture.positioningController;
  var target = positioningTargetForPlayer(controller, controller._readyPlayer);
  controller._readyPlayer.position.x = target.x;
  controller._readyPlayer.position.y = target.y;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertEqual(fixture.game.restartController.phase(), "inProgress");
});

test("Kickoff assigns relative states and movement permission", function() {
  var fixture = makeFixture({ kickoffSide: "away" });
  fixture.config.restarts.opponentDelaySeconds = 0;
  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertEqual(fixture.homeTeamAi.state, "kickoffOpponent");
  assertEqual(fixture.awayTeamAi.state, "kickoffUs");
  assertEqual(fixture.game.restartController.canTeamMove(fixture.homeTeam), false);
  assertEqual(fixture.game.restartController.canTeamMove(fixture.awayTeam), true);
});

test("Throw-in uses fresh directional input to launch a lofted inward throw", function() {
  var fixture = makeFixture();
  fixture.game.beginRestart("throwIn", "home", {
    boundary: "left",
    position: new Vector2d(fixture.config.pitch.fieldLeft, fixture.config.pitch.aiCenterY)
  });
  fixture.positioningController.updateBeforePhysics(fixture.game.context());
  fixture.positioningController._clear(fixture.game.context());

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
  fixture.config.restarts.opponentDelaySeconds = 0;
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.pitch.fieldRight, fixture.config.pitch.aiCenterY)
  });
  fixture.positioningController.updateBeforePhysics(fixture.game.context());
  fixture.positioningController._clear(fixture.game.context());

  assertEqual(fixture.ball.heldBy.facingX, -1);
  assertEqual(fixture.ball.heldBy.facingY, 0);

  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertTrue(fixture.ball.velocity.x < 0);
  assertTrue(fixture.ball.velocity.y > 0);
  assertEqual(fixture.ball.lastTouchedBy, "away");
});

test("Set-piece positioning keeps opponents outside the restart distance", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  fixture.game.beginRestart("corner", "home", {
    boundary: "top",
    position: new Vector2d(fixture.config.pitch.fieldLeft, fixture.config.pitch.fieldTop)
  });
  var ballPosition = fixture.positioningController._ballPosition;
  var awayScene = fixture.positioningController._sceneTeams[1];

  for (var i = 0; i < awayScene.positions.length; i++) {
    assertTrue(MathLib.computeDistance(awayScene.positions[i], ballPosition) >=
      fixture.config.restarts.opponentDistance - 0.0001);
  }
});

test("Corner restart gives the awarded AI team a central crossing target", function() {
  var fixture = makeFixture();
  fixture.game.beginRestart("corner", "away", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.pitch.fieldRight, fixture.config.pitch.fieldBottom)
  });

  var target = fixture.game.restartController.attackTarget(fixture.awayTeam);

  assertEqual(target.x, fixture.config.pitch.initialBallPosition.x);
  assertEqual(target.y, fixture.config.pitch.fieldBottom - fixture.config.restarts.cornerCrossDistance);
  assertEqual(fixture.game.restartController.attackTarget(fixture.homeTeam), null);
});

test("Corner restart never selects the goalkeeper or cover defender as taker", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  var corner = new Vector2d(fixture.config.pitch.fieldLeft, fixture.config.pitch.fieldTop);
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

  var scene = fixture.positioningController;
  var homeScene = scene._sceneTeams[0];
  assertTrue(MathLib.computeDistance(homeScene.positions[2], scene._ballPosition) < 20);
  assertTrue(MathLib.computeDistance(homeScene.positions[0], scene._ballPosition) > 20);
  assertTrue(MathLib.computeDistance(homeScene.positions[1], scene._ballPosition) > 20);
  assertTrue(Math.abs(
    homeScene.positions[3].y -
      (fixture.config.pitch.fieldTop + fixture.config.restarts.cornerBoxDepth)
  ) <= fixture.config.restarts.positionVariationY);
});

test("Corner restart applies the taker-aware layered plan before jitter", function() {
  var fixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  fixture.game.beginRestart("corner", "home", {
    boundary: "top",
    position: new Vector2d(fixture.config.pitch.fieldLeft, fixture.config.pitch.fieldTop)
  });
  var scene = fixture.positioningController;
  var homeScene = scene._sceneTeams[0];
  var takerIndex = homeScene.players.indexOf(scene._readyPlayer);
  var plan = new Formation(fixture.config).cornerAttackingPlan(
    "home",
    11,
    takerIndex,
    true
  );
  var shortIndex = plan.groups.indexOf("short");

  assertTrue(takerIndex >= 0);
  assertTrue(Math.abs(homeScene.positions[shortIndex].x - plan.positions[shortIndex].x) <=
    fixture.config.restarts.positionVariationX);
  assertTrue(Math.abs(homeScene.positions[shortIndex].y - plan.positions[shortIndex].y) <=
    fixture.config.restarts.positionVariationY);
  assertTrue(MathLib.computeDistance(homeScene.positions[takerIndex], scene._ballPosition) < 20);
});

test("Goal kick always positions the goalkeeper as the only nearby taker", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 3 });
  var ballPosition = new Vector2d(
    fixture.config.pitch.initialBallPosition.x,
    fixture.config.pitch.fieldBottom - fixture.config.restarts.goalKickDistance
  );
  fixture.homePlayers[0].position.x = fixture.config.pitch.fieldLeft;
  fixture.homePlayers[0].position.y = fixture.config.pitch.aiCenterY;
  fixture.homePlayers[1].position.x = ballPosition.x;
  fixture.homePlayers[1].position.y = ballPosition.y;

  fixture.game.beginRestart("goalKick", "home", {
    boundary: "bottom",
    position: new Vector2d(fixture.config.pitch.initialBallPosition.x, fixture.config.pitch.fieldBottom)
  });

  var homeScene = fixture.positioningController._sceneTeams[0];
  var nearby = 0;
  for (var i = 0; i < homeScene.positions.length; i++) {
    if (MathLib.computeDistance(homeScene.positions[i], ballPosition) < 40) nearby++;
  }
  assertEqual(nearby, 1);
  assertNear(
    MathLib.computeDistance(homeScene.positions[0], ballPosition),
    fixture.config.restarts.goalKickTakerDistance,
    0.0001
  );
});

test("Kickoff clamps the human player to the center ellipse", function() {
  var fixture = makeFixture();
  fixture.game.resumeFromInput();
  var player = fixture.homeTeam.humanPlayer;
  player.position.y = fixture.config.pitch.aiCenterY - fixture.config.pitch.centerCircleRadiusY - 20;
  player.velocity.y = -10;

  fixture.game.restartController.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

  assertNear(ellipseDistance(fixture.config, player.position), 1, 0.0001);
  assertEqual(player.velocity.y, 0);
});

test("Kickoff scene exposes the dedicated first striker as taker", function() {
  var homeFixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  homeFixture.game.beginRestart("kickoff", "home");
  assertTrue(
    homeFixture.positioningController._readyPlayer === homeFixture.homePlayers[9]
  );

  var awayFixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  awayFixture.game.beginRestart("kickoff", "away");
  assertTrue(
    awayFixture.positioningController._readyPlayer === awayFixture.awayPlayers[9]
  );
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

  for (var teamIndex = 0; teamIndex < scene.sceneTeams.length; teamIndex++) {
    var sceneTeam = scene.sceneTeams[teamIndex];
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
          fixture.config.pitch.aiCenterY + fixture.config.player.radius);
        if (sceneTeam.positions[i].x != exactHome[i].x ||
            sceneTeam.positions[i].y != exactHome[i].y) {
          sawVariation = true;
        }
      } else {
        assertTrue(sceneTeam.positions[i].y <=
          fixture.config.pitch.aiCenterY - fixture.config.player.radius);
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

    for (var teamIndex = 0; teamIndex < first.sceneTeams.length; teamIndex++) {
      for (var i = 0; i < first.sceneTeams[teamIndex].positions.length; i++) {
        var firstPlayer = first.sceneTeams[teamIndex].players[i];
        var firstTarget = first.sceneTeams[teamIndex].positions[i];
        var secondTarget = second.sceneTeams[teamIndex].positions[i];
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
  fixture.ball.velocity.x = fixture.config.physics.minVelocity + 1;

  fixture.game.matchFlow.updateAfterPhysics(fixture.game.context(), fixture.physics.lastDt);

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
