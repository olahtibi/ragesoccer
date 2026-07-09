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

test("Player spriteFrame uses neutral phase while standing without resetting walk state", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 0;
  player.velocity.y = 0;
  player.phaseIndex = 2;
  player.stepDistance = 3;

  var sprite = player.spriteFrame();

  assertEqual(sprite.phaseIndex, 0);
  assertEqual(player.phaseIndex, 2);
  assertEqual(player.stepDistance, 3);
});

test("Player draw does not reset walk state when velocity is momentarily zero", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 0;
  player.velocity.y = 0;
  player.phaseIndex = 1;
  player.stepDistance = 2;
  var ctx = {
    drawImage: function() {}
  };

  player.draw(ctx);

  assertEqual(player.phaseIndex, 1);
  assertEqual(player.stepDistance, 2);
});
