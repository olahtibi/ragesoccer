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

test("IndividualAi attackBall sets velocity toward ball", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  fixture.ball.position.x = 20;
  fixture.ball.position.y = 10;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });

  assertNear(fixture.playerAway.velocity.x, fixture.config.teamVelocity("away"), 0.0001);
  assertNear(fixture.playerAway.velocity.y, 0, 0.0001);
  assertEqual(ai.commandState, "moving");
});

test("IndividualAi attackBall stops at ball target", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  fixture.ball.position.x = 10;
  fixture.ball.position.y = 10;
  fixture.playerAway.velocity.x = 2;
  fixture.playerAway.velocity.y = 3;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });

  assertEqual(fixture.playerAway.velocity.x, 0);
  assertEqual(fixture.playerAway.velocity.y, 0);
  assertEqual(ai.commandState, "stopped");
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
