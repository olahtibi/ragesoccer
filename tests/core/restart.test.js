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
  fixture.game.beginRestart("throwIn", "away", {
    boundary: "right",
    position: new Vector2d(fixture.config.fieldRight, fixture.config.aiCenterY)
  });
  fixture.game.cutscene.updateBeforePhysics(fixture.game);
  fixture.game.cutscene.clear(fixture.game);

  assertEqual(fixture.ball.heldBy.facingX, -1);
  assertEqual(fixture.ball.heldBy.facingY, 0);

  fixture.game.resumeFromInput(new Vector2d(0, -1));

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
