var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

test("IndividualAi moveToPosition sets velocity toward target", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;

  ai.setCommand("moveToPosition", new Vector2d(10, 20));
  ai.update({ ball: fixture.ball });

  assertNear(fixture.playerAway.velocity.x, 0, 0.0001);
  assertNear(fixture.playerAway.velocity.y, fixture.config.teamVelocity("away"), 0.0001);
  assertEqual(ai.commandState, "moving");
});

test("IndividualAi moveToPosition stops at target", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  fixture.playerAway.velocity.x = 2;
  fixture.playerAway.velocity.y = 3;

  ai.setCommand("moveToPosition", new Vector2d(10, 10));
  ai.update({ ball: fixture.ball });

  assertEqual(fixture.playerAway.velocity.x, 0);
  assertEqual(fixture.playerAway.velocity.y, 0);
  assertEqual(ai.commandState, "stopped");
});

test("IndividualAi attackBall shoots through ball when aligned behind it", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 336;
  fixture.playerAway.position.y = 380;
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });

  assertEqual(ai.commandState, "shoot");
  assertNear(ai.tPos.x, 336, 0.0001);
  assertTrue(ai.tPos.y > fixture.ball.position.y);
  assertNear(fixture.ball.velocity.x, 0, 0.0001);
  assertNear(fixture.ball.velocity.y, 0, 0.0001);
});

test("IndividualAi attackBall approaches behind-ball setup point when far and not aligned", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 300;
  fixture.playerAway.position.y = 400;
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });

  assertEqual(ai.commandState, "approach");
  assertNear(ai.tPos.x, 336, 0.0001);
  assertTrue(ai.tPos.y < fixture.ball.position.y);
});

test("IndividualAi attackBall detours around ball when close and not aligned", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 346;
  fixture.playerAway.position.y = 400;
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });

  assertEqual(ai.commandState, "detour");
  assertNear(MathLib.computeDistance(ai.tPos, fixture.ball.position), fixture.config.aiAttackDetourRadius, 0.0001);
  assertTrue(ai.attackOrbitDir !== 0);
});

test("IndividualAi attackBall keeps detour direction across updates", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 346;
  fixture.playerAway.position.y = 400;
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });
  var orbitDir = ai.attackOrbitDir;
  ai.update({ ball: fixture.ball });

  assertEqual(ai.commandState, "detour");
  assertEqual(ai.attackOrbitDir, orbitDir);
});

test("IndividualAi attackBall resets detour memory when command changes", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 346;
  fixture.playerAway.position.y = 400;
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });
  assertTrue(ai.attackOrbitDir !== 0);

  ai.setCommand("moveToPosition", new Vector2d(400, 400));

  assertEqual(ai.attackOrbitDir, 0);
});

test("IndividualAi inactive leaves velocity unchanged", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.velocity.x = 2;
  fixture.playerAway.velocity.y = 3;

  ai.setCommand("inactive", null);
  ai.update({ ball: fixture.ball });

  assertEqual(fixture.playerAway.velocity.x, 2);
  assertEqual(fixture.playerAway.velocity.y, 3);
  assertEqual(ai.commandState, "stopped");
});

test("IndividualAi draw renders movement target line", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  var drew = false;
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  ai.setCommand("moveToPosition", new Vector2d(20, 10));
  ai.update({ ball: fixture.ball });

  ai.draw({
    beginPath: function() {},
    moveTo: function() {},
    lineTo: function() {},
    stroke: function() {
      drew = true;
    }
  });

  assertTrue(drew);
});
