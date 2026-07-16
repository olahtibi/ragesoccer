var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

test("Physics advances player position and walk phase by travelled distance", function() {
  var fixture = makeFixture();
  var startX = fixture.playerHome.position.x;
  var startY = fixture.playerHome.position.y;
  fixture.playerHome.velocity.x = 10;
  fixture.playerHome.velocity.y = 0;

  fixture.physics._updatePlayerPositions(1);

  assertNear(fixture.playerHome.position.x, startX + 10, 0.0001);
  assertNear(fixture.playerHome.position.y, startY, 0.0001);
  assertEqual(fixture.playerHome.phaseIndex, 2);
  assertNear(fixture.playerHome.stepDistance, 2, 0.0001);
});

test("Ball position does not mutate configured initial ball position", function() {
  var fixture = makeFixture();
  var initialX = fixture.config.pitch.initialBallPosition.x;
  var initialY = fixture.config.pitch.initialBallPosition.y;

  fixture.ball.position.x += 25;
  fixture.ball.position.y += 30;

  assertNear(fixture.config.pitch.initialBallPosition.x, initialX, 0.0001);
  assertNear(fixture.config.pitch.initialBallPosition.y, initialY, 0.0001);
});

test("Physics advances every player in the stadium", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2 });
  for (var i = 0; i < fixture.stadium.players.length; i++) {
    fixture.stadium.players[i].velocity.x = 10;
    fixture.stadium.players[i].velocity.y = 0;
  }

  fixture.physics._updatePlayerPositions(1);

  for (var j = 0; j < fixture.stadium.players.length; j++) {
    assertNear(fixture.stadium.players[j].stepDistance, 2, 0.0001);
    assertEqual(fixture.stadium.players[j].phaseIndex, 2);
  }
});

test("Physics advances a full 22-player match", function() {
  var fixture = makeFixture({ homeTeamSize: 11, awayTeamSize: 11 });
  assertEqual(fixture.stadium.players.length, 22);
  for (var i = 0; i < fixture.stadium.players.length; i++) {
    fixture.stadium.players[i].velocity.x = 10;
  }

  fixture.physics._updatePlayerPositions(0.5);

  for (var j = 0; j < fixture.stadium.players.length; j++) {
    assertNear(fixture.stadium.players[j].stepDistance, 1, 0.0001);
  }
});

test("Physics ball friction reduces horizontal velocity", function() {
  var fixture = makeFixture();
  fixture.ball.velocity.x = 100;
  fixture.ball.velocity.y = 0;

  fixture.physics._updateBallPosition(0.5);

  assertTrue(fixture.ball.velocity.x > 0);
  assertTrue(fixture.ball.velocity.x < 100);
});

test("Physics snaps tiny ball velocity to zero", function() {
  var fixture = makeFixture();
  fixture.ball.velocity.x = 1;
  fixture.ball.velocity.y = 1;

  fixture.physics._updateBallPosition(0.1);

  assertEqual(fixture.ball.velocity.x, 0);
  assertEqual(fixture.ball.velocity.y, 0);
});

test("Physics reflects X velocity and movement using wall restitution", function() {
  var fixture = makeFixture();
  fixture.ball.velocity.x = 10;
  var moveArray = [5, 0];

  fixture.physics._reflectX(moveArray);

  assertNear(moveArray[0], -3.5, 0.0001);
  assertNear(fixture.ball.velocity.x, -7, 0.0001);
});

test("Physics reflects Y velocity and movement using wall restitution", function() {
  var fixture = makeFixture();
  fixture.ball.velocity.y = -10;
  var moveArray = [0, -5];

  fixture.physics._reflectY(moveArray);

  assertNear(moveArray[1], 3.5, 0.0001);
  assertNear(fixture.ball.velocity.y, 7, 0.0001);
});

test("Physics ball-player contact kicks the ball outward", function() {
  var fixture = makeFixture();
  fixture.playerHome.position.x = 100;
  fixture.playerHome.position.y = 100;
  fixture.playerHome.velocity.x = 20;
  fixture.playerHome.velocity.y = 0;
  fixture.ball.position.x = 104;
  fixture.ball.position.y = 100;
  fixture.ball.position.z = 0;

  fixture.physics._resolveBallPlayerContacts();

  assertTrue(fixture.ball.velocity.x > 0);
  assertTrue(fixture.ball.velocity.z > 0);
  assertNear(fixture.ball.position.x, 106.01, 0.0001);
  assertEqual(fixture.ball.lastTouchedBy, "home");
});

test("Disabled out-of-play restarts preserve reflective pitch boundaries", function() {
  var fixture = makeFixture({ outOfPlayRestartsEnabled: false });
  fixture.ball.position.x = fixture.config.pitch.boxTopLeft.x + 1;
  fixture.ball.position.y = fixture.config.pitch.aiCenterY;
  fixture.ball.velocity.x = -100;

  fixture.physics._updateBallPosition(0.1);

  assertTrue(fixture.ball.velocity.x > 0);
  assertTrue(fixture.ball.position.x > fixture.config.pitch.boxTopLeft.x);
});

test("Enabled out-of-play restarts allow the ball to cross pitch boundaries", function() {
  var fixture = makeFixture({ outOfPlayRestartsEnabled: true });
  fixture.ball.position.x = fixture.config.pitch.fieldLeft + 1;
  fixture.ball.position.y = fixture.config.pitch.aiCenterY;
  fixture.ball.velocity.x = -100;

  fixture.physics._updateBallPosition(0.1);

  assertTrue(fixture.ball.velocity.x < 0);
  assertTrue(fixture.ball.position.x < fixture.config.pitch.fieldLeft);
});

test("Physics player-only update advances players without touching the ball", function() {
  var fixture = makeFixture();
  fixture.playerHome.position.x = 100;
  fixture.playerHome.position.y = 100;
  fixture.playerHome.velocity.x = 20;
  fixture.ball.position.x = 104;
  fixture.ball.position.y = 100;
  fixture.ball.velocity.x = 100;
  fixture.physics.lastUpdated = new Date().getTime() - 100;

  fixture.physics.updatePlayersOnly();

  assertEqual(fixture.ball.position.x, 104);
  assertEqual(fixture.ball.position.y, 100);
  assertEqual(fixture.ball.velocity.x, 100);
  assertTrue(fixture.playerHome.position.x > 100);
});

test("Physics keeps a rounded throttled FPS display value", function() {
  var fixture = makeFixture();
  fixture.physics.lastUpdated = 0;

  fixture.physics._updateStats(16);
  var firstDisplay = fixture.physics.displayFps;
  fixture.physics._updateStats(32);

  assertEqual(firstDisplay, 63);
  assertEqual(fixture.physics.displayFps, firstDisplay);

  fixture.physics._updateStats(272);

  assertTrue(fixture.physics.fps > 0);
  assertEqual(fixture.physics.displayFps, Math.round(fixture.physics.fps));
});
