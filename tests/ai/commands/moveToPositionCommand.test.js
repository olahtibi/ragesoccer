var testlib = require("../../testlib");
var makeFixture = require("../../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

test("moveToPosition sets velocity toward target", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;

  ai.setCommand("moveToPosition", new Vector2d(10, 20));
  ai.update({ ball: fixture.ball });

  var arrivalFactor = fixture.config.aiArrivalMinSpeedFactor +
    (1 - fixture.config.aiArrivalMinSpeedFactor) * 10 / fixture.config.aiArrivalSlowRadius;
  assertNear(fixture.playerAway.velocity.x, 0, 0.0001);
  assertNear(
    fixture.playerAway.velocity.y,
    fixture.config.teamVelocity("away") * arrivalFactor,
    0.0001
  );
  assertEqual(ai.debugSnapshot().state, "moving");
});

test("moveToPosition applies formation pace outside the arrival radius", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  ai.formationPaceMultiplier = 0.92;

  ai.setCommand("moveToPosition", new Vector2d(10, 60));
  ai.update({ ball: fixture.ball });

  assertNear(
    fixture.playerAway.velocity.y,
    fixture.config.teamVelocity("away") * 0.92,
    0.0001
  );
});

test("moveToPosition stops at target", function() {
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
  assertEqual(ai.debugSnapshot().state, "stopped");
});
