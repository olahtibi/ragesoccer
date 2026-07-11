var testlib = require("../../testlib");
var makeFixture = require("../../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

test("inactive leaves velocity unchanged", function() {
  var fixture = makeFixture();
  var ai = new IndividualAi(fixture.config, fixture.awayTeam, fixture.playerAway);
  fixture.playerAway.velocity.x = 2;
  fixture.playerAway.velocity.y = 3;

  ai.setCommand("inactive", null);
  ai.update({ ball: fixture.ball });

  assertEqual(fixture.playerAway.velocity.x, 2);
  assertEqual(fixture.playerAway.velocity.y, 3);
  assertEqual(ai.debugSnapshot().state, "stopped");
});
