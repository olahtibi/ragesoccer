var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

test("Player updateFacing maps movement vectors", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;

  player.velocity.x = 10;
  player.velocity.y = 0;
  player.updateFacing();
  assertEqual(player.facingX, 1);
  assertEqual(player.facingY, 0);

  player.velocity.x = 0;
  player.velocity.y = -10;
  player.updateFacing();
  assertEqual(player.facingX, 0);
  assertEqual(player.facingY, -1);

  player.velocity.x = -10;
  player.velocity.y = 10;
  player.updateFacing();
  assertEqual(player.facingX, -1);
  assertEqual(player.facingY, 1);
});

test("Player updateFacing preserves facing at zero velocity", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.facingX = 1;
  player.facingY = 0;
  player.velocity.x = 0;
  player.velocity.y = 0;

  player.updateFacing();

  assertEqual(player.facingX, 1);
  assertEqual(player.facingY, 0);
});
