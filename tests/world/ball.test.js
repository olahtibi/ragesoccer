var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

function drawingContext() {
  return { drawImage: function() {} };
}

test("Ball draw advances its animation by distance travelled", function() {
  var fixture = makeFixture();
  var ball = fixture.ball;
  var ctx = drawingContext();

  ball.position.x += fixture.config.ball.spinPxPerPhase * 2 + 1;
  ball.draw(ctx);

  assertEqual(ball.phaseIndex, 2);
  assertNear(ball.rollDistance, 1, 0.0001);
});

test("Ball draw resets partial roll distance while stationary", function() {
  var fixture = makeFixture();
  var ball = fixture.ball;
  var ctx = drawingContext();

  ball.position.x += fixture.config.ball.spinPxPerPhase - 1;
  ball.draw(ctx);
  ball.draw(ctx);

  assertEqual(ball.phaseIndex, 0);
  assertEqual(ball.rollDistance, 0);
});

test("Ball does not animate while held and starts from its release position", function() {
  var fixture = makeFixture();
  var ball = fixture.ball;
  var taker = fixture.playerHome;
  var ctx = drawingContext();

  ball.heldBy = taker;
  ball.draw(ctx);
  taker.position.x += fixture.config.ball.spinPxPerPhase * 3;
  ball.draw(ctx);

  assertEqual(ball.phaseIndex, 0);
  assertEqual(ball.rollDistance, 0);

  var held = ball.heldPosition();
  ball.position.x = held.x;
  ball.position.y = held.y;
  ball.heldBy = null;
  ball.draw(ctx);

  assertEqual(ball.phaseIndex, 0);
  assertEqual(ball.rollDistance, 0);
});
