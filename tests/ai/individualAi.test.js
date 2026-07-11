var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("IndividualAi dispatches command and exposes debug snapshot", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  var target = new Vector2d(10, 20);

  ai.setCommand("moveToPosition", target);
  ai.update({ ball: fixture.ball });
  var snapshot = ai.debugSnapshot();

  assertEqual(snapshot.command, "moveToPosition");
  assertEqual(snapshot.state, "moving");
  assertTrue(snapshot.target === target);
});

test("IndividualAi resets previous command when command changes", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.position.x = 346;
  fixture.playerAway.position.y = 400;
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;

  ai.setCommand("attackBall", null);
  ai.update({ ball: fixture.ball });
  assertTrue(ai.debugSnapshot().attackOrbitDir !== 0);

  ai.setCommand("moveToPosition", new Vector2d(400, 400));

  assertEqual(ai.debugSnapshot().attackOrbitDir, undefined);
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
