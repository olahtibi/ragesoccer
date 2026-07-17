var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

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

test("Player updateFacing uses standard north and northeast sectors", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;

  player.velocity.x = 0.1;
  player.velocity.y = -10;
  player.updateFacing();
  assertEqual(player.facingX, 0);
  assertEqual(player.facingY, -1);

  player.velocity.x = 5;
  player.velocity.y = -10;
  player.updateFacing();
  assertEqual(player.facingX, 1);
  assertEqual(player.facingY, -1);
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

test("Player advances its walk phase from distance travelled when rendered", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 10;

  fixture.physics._updatePlayerPositions(1);

  assertEqual(player.phaseIndex, 0);
  assertEqual(player.stepDistance, 0);

  var sprite = player.spriteFrame(0);

  assertEqual(sprite.phaseIndex, 2);
  assertEqual(player.phaseIndex, 2);
  assertNear(player.stepDistance, 2, 0.0001);
});

test("Player preserves partial walk distance while stationary", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 3;
  fixture.physics._updatePlayerPositions(1);

  player.spriteFrame(0);
  player.velocity.x = 0;
  player.spriteFrame(100);

  assertEqual(player.phaseIndex, 0);
  assertNear(player.stepDistance, 3, 0.0001);
});

test("Player animation adopts its initial movement direction immediately", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 10;
  player.velocity.y = 0;

  player.spriteFrame(0);

  assertEqual(player.facingX, 1);
  assertEqual(player.facingY, 0);
  assertEqual(player.animationFacingX, 1);
  assertEqual(player.animationFacingY, 0);
});

test("Player animation filters a one-frame opposite turn without delaying gameplay facing", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 10;
  player.spriteFrame(0);

  player.velocity.x = -10;
  player.spriteFrame(16);

  assertEqual(player.facingX, -1);
  assertEqual(player.animationFacingX, 1);

  player.velocity.x = 10;
  player.spriteFrame(32);

  assertEqual(player.animationFacingX, 1);
  assertEqual(player.animationFacingY, 0);
});

test("Player animation settles on a sustained turn", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 10;
  player.spriteFrame(0);

  player.velocity.x = -10;
  player.spriteFrame(16);
  assertEqual(player.animationFacingX, 1);

  player.spriteFrame(32);
  player.spriteFrame(48);
  assertEqual(player.animationFacingX, 1);

  for (var time = 64; time <= 144; time += 16) {
    player.spriteFrame(time);
  }

  assertEqual(player.animationFacingX, -1);
  assertEqual(player.animationFacingY, 0);
});

test("Player animation holds a stable row through the captured pre-kick corrections", function() {
  var fixture = makeFixture();
  var player = fixture.playerAway;
  var velocities = [
    [-38.15, -3.72],
    [12.39, 36.28],
    [-22.23, -31.23],
    [13.38, 35.92],
    [13.38, 35.92]
  ];
  var expectedGameplayFacing = [
    [-1, 0],
    [0, 1],
    [-1, -1],
    [0, 1],
    [0, 1]
  ];

  for (var i = 0; i < velocities.length; i++) {
    player.velocity.x = velocities[i][0];
    player.velocity.y = velocities[i][1];
    player.spriteFrame(i * 67);

    assertEqual(player.facingX, expectedGameplayFacing[i][0]);
    assertEqual(player.facingY, expectedGameplayFacing[i][1]);
    if(i < velocities.length - 1) {
      assertEqual(player.animationFacingX, -1);
      assertEqual(player.animationFacingY, 0);
    }
  }

  assertEqual(player.animationFacingX, 0);
  assertEqual(player.animationFacingY, 1);
});

test("Player animation smooths a quarter turn through a diagonal row", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 10;
  player.spriteFrame(0);
  player.velocity.x = 0;
  player.velocity.y = 10;
  var sawDiagonal = false;

  for (var time = 16; time <= 96; time += 16) {
    player.spriteFrame(time);
    if(player.animationFacingX == 1 && player.animationFacingY == 1) {
      sawDiagonal = true;
    }
  }

  assertEqual(sawDiagonal, true);
  assertEqual(player.animationFacingX, 0);
  assertEqual(player.animationFacingY, 1);
});

test("Player animation does not alternate around a direction-sector boundary", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.velocity.x = 10;
  player.velocity.y = 0;
  player.spriteFrame(0);
  var angles = [23, 21, 23, 21, 23, 21];

  for (var i = 0; i < angles.length; i++) {
    var radians = angles[i] * Math.PI / 180;
    player.velocity.x = Math.cos(radians) * 10;
    player.velocity.y = Math.sin(radians) * 10;
    player.spriteFrame((i + 1) * 16);
    assertEqual(player.animationFacingX, 1);
    assertEqual(player.animationFacingY, 0);
  }
});

test("Player animation ignores a brief stop then settles on the neutral phase", function() {
  var fixture = makeFixture();
  var player = fixture.playerHome;
  player.phaseIndex = 2;
  player.velocity.x = 10;
  player.spriteFrame(0);

  player.velocity.x = 0;
  assertEqual(player.spriteFrame(20).phaseIndex, 2);
  assertEqual(player.spriteFrame(40).phaseIndex, 2);
  assertEqual(player.spriteFrame(60).phaseIndex, 0);
  assertEqual(player.phaseIndex, 2);
});
