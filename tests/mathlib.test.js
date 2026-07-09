var testlib = require("./testlib");

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertNear = testlib.assertNear;

test("MathLib computes cardinal angles", function() {
  assertNear(MathLib.computeAngle(1, 0), 0, 0.0001);
  assertNear(MathLib.computeAngle(0, 1), 90, 0.0001);
  assertNear(MathLib.computeAngle(-1, 0), 180, 0.0001);
  assertNear(MathLib.computeAngle(0, -1), 270, 0.0001);
});

test("MathLib computes distance", function() {
  assertNear(MathLib.computeDistance(new Vector2d(0, 0), new Vector2d(3, 4)), 5, 0.0001);
});

test("MathLib detects points inside a rectangle", function() {
  assertTrue(MathLib.inside(new Vector2d(1, 2), new Vector2d(5, 6), new Vector2d(3, 4)));
  assertTrue(!MathLib.inside(new Vector2d(1, 2), new Vector2d(5, 6), new Vector2d(6, 4)));
});

test("MathLib detects vertical intersections", function() {
  assertTrue(MathLib.isIntersectedVertically(10, 20, 50, 15, 55, -10));
  assertTrue(MathLib.isIntersectedVertically(10, 20, 50, 15, 45, 10));
  assertTrue(!MathLib.isIntersectedVertically(10, 20, 50, 25, 45, 10));
});

test("MathLib detects horizontal intersections", function() {
  assertTrue(MathLib.isIntersectedHorizontally(10, 20, 50, 55, 15, -10));
  assertTrue(MathLib.isIntersectedHorizontally(10, 20, 50, 45, 15, 10));
  assertTrue(!MathLib.isIntersectedHorizontally(10, 20, 50, 45, 25, 10));
});

test("MathLib computes velocity toward a target", function() {
  var velocity = MathLib.computeVelocityForTarget(new Vector2d(0, 0), new Vector2d(3, 4), 10);
  assertNear(velocity.x, 6, 0.0001);
  assertNear(velocity.y, 8, 0.0001);
});
