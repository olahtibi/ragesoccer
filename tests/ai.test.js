var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

test("Ai predictBallPos uses exponential ground friction", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 200;
  fixture.ball.velocity.x = 50;
  fixture.ball.velocity.y = -20;

  var predicted = fixture.ai.predictBallPos(0.5);
  var travel = (1 - Math.exp(-fixture.config.ballFriction * 0.5)) / fixture.config.ballFriction;

  assertNear(predicted.x, 100 + 50 * travel, 0.0001);
  assertNear(predicted.y, 200 - 20 * travel, 0.0001);
});

test("Ai predictLandingPos returns a forward landing point for airborne balls", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 200;
  fixture.ball.position.z = 20;
  fixture.ball.velocity.x = 40;
  fixture.ball.velocity.y = 10;
  fixture.ball.velocity.z = 50;

  var landing = fixture.ai.predictLandingPos();

  assertTrue(landing !== null);
  assertTrue(landing.x > fixture.ball.position.x);
  assertTrue(landing.y > fixture.ball.position.y);
});

test("Ai predictLandingPos returns null for grounded balls", function() {
  var fixture = makeFixture();
  fixture.ball.position.z = 0;
  fixture.ball.velocity.z = 0;

  assertEqual(fixture.ai.predictLandingPos(), null);
});

test("Ai timeToReach returns a bounded interception time", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 334;
  fixture.ball.position.y = 433;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  var t = fixture.ai.timeToReach(new Vector2d(334, 400));

  assertTrue(t > 0);
  assertTrue(t <= fixture.ai.maxLookaheadSeconds);
});

test("Ai detects balls threatening its own goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 150;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  assertTrue(fixture.ai.isBallThreateningOwnGoal());

  fixture.ball.position.x = 336;
  fixture.ball.position.y = 500;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = -80;

  assertTrue(fixture.ai.isBallThreateningOwnGoal());
});

test("Ai defensePoint stays in front of the own goal and clamps near the mouth", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 1000;
  fixture.ball.position.y = 130;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  var point = fixture.ai.defensePoint();

  assertTrue(point.y > fixture.ai.ownGoalLineY);
  assertTrue(point.x <= fixture.ai.ownGoalMouthRightX + 8);
  assertTrue(point.x >= fixture.ai.ownGoalMouthLeftX - 8);
});

test("Ai home controller defends bottom goal and attacks top goal", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var homeAi = new Ai(fixture.config, fixture.stadium, fixture.stadium.homePlayers[1], "home", 1);

  assertTrue(homeAi.ownGoalCenter.y > homeAi.midlineY);
  assertTrue(homeAi.oppGoalCenter.y < homeAi.midlineY);
  assertEqual(homeAi.goalieFacingY, -1);
});

test("Ai away controller defends top goal and attacks bottom goal", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  var awayAi = new Ai(fixture.config, fixture.stadium, fixture.stadium.awayPlayers[1], "away", 1);

  assertTrue(awayAi.ownGoalCenter.y < awayAi.midlineY);
  assertTrue(awayAi.oppGoalCenter.y > awayAi.midlineY);
  assertEqual(awayAi.goalieFacingY, 1);
});

test("Ai uses nearest opponent to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 100;
  fixture.stadium.homePlayers[0].position.x = 500;
  fixture.stadium.homePlayers[0].position.y = 500;
  fixture.stadium.homePlayers[1].position.x = 101;
  fixture.stadium.homePlayers[1].position.y = 100;

  var opponent = fixture.ai.nearestOpponentToBall();

  assertTrue(opponent === fixture.stadium.homePlayers[1]);
});

test("Ai moveTo sets velocity toward target", function() {
  var fixture = makeFixture();
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;

  fixture.ai.moveTo(new Vector2d(10, 20));

  assertNear(fixture.playerAway.velocity.x, 0, 0.0001);
  assertNear(fixture.playerAway.velocity.y, fixture.ai.speed, 0.0001);
});

test("Ai moveTo snaps velocity to zero when already at target", function() {
  var fixture = makeFixture();
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  fixture.playerAway.velocity.x = 1;
  fixture.playerAway.velocity.y = 1;

  fixture.ai.moveTo(new Vector2d(10, 10));

  assertEqual(fixture.playerAway.velocity.x, 0);
  assertEqual(fixture.playerAway.velocity.y, 0);
});

test("Ai holdGoaliePose faces the pitch while defending at rest", function() {
  var fixture = makeFixture();
  fixture.ai.state = "defend";
  fixture.playerAway.velocity.x = 0;
  fixture.playerAway.velocity.y = 0;
  fixture.playerAway.facingX = 1;
  fixture.playerAway.facingY = -1;

  fixture.ai.holdGoaliePose();

  assertEqual(fixture.playerAway.facingX, 0);
  assertEqual(fixture.playerAway.facingY, 1);
});

test("Ai attackTarget runs through the ball when aligned behind it", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;
  fixture.playerAway.position.x = 336;
  fixture.playerAway.position.y = 380;

  var target = fixture.ai.attackTarget(fixture.playerAway);

  assertNear(target.x, 336, 0.0001);
  assertTrue(target.y > fixture.ball.position.y);
  assertNear(target.y, fixture.ball.position.y + fixture.ai.runThroughDistance, 0.0001);
});
