var testlib = require("../testlib");

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertNear = testlib.assertNear;

test("MathLib computes cardinal angles in radians", function() {
  assertNear(MathLib.computeAngleRadians(1, 0), 0, 0.0001);
  assertNear(MathLib.computeAngleRadians(0, 1), Math.PI / 2, 0.0001);
  assertNear(MathLib.computeAngleRadians(-1, 0), Math.PI, 0.0001);
  assertNear(MathLib.computeAngleRadians(0, -1), 3 * Math.PI / 2, 0.0001);
});

test("MathLib computes wrapped angle deltas in radians", function() {
  assertNear(MathLib.angleDeltaRadians(Math.PI / 2, 0), Math.PI / 2, 0.0001);
  assertNear(MathLib.angleDeltaRadians(0, 3 * Math.PI / 2), Math.PI / 2, 0.0001);
  assertNear(MathLib.angleDeltaRadians(3 * Math.PI / 2, 0), -Math.PI / 2, 0.0001);
});

test("MathLib computes distance", function() {
  assertNear(MathLib.computeDistance(new Vector2d(0, 0), new Vector2d(3, 4)), 5, 0.0001);
});

test("MathLib computes vector length and squared distance", function() {
  assertNear(MathLib.vectorLength(3, 4), 5, 0.0001);
  assertNear(MathLib.distanceSquared(new Vector2d(0, 0), new Vector2d(3, 4)), 25, 0.0001);
});

test("MathLib normalizes vectors with fallback", function() {
  var normalized = MathLib.normalizeVector(3, 4, 0, -1);
  assertNear(normalized.x, 0.6, 0.0001);
  assertNear(normalized.y, 0.8, 0.0001);

  var fallback = MathLib.normalizeVector(0, 0, 0, -1);
  assertNear(fallback.x, 0, 0.0001);
  assertNear(fallback.y, -1, 0.0001);
});

test("MathLib computes vectors from radian angles", function() {
  var vector = MathLib.vectorFromAngleRadians(Math.PI / 2, 10);
  assertNear(vector.x, 0, 0.0001);
  assertNear(vector.y, 10, 0.0001);
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
