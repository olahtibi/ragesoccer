var testlib = require("../../testlib");
var makeFixture = require("../../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

test("GoalDetector scores home when ball enters top goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  var scoredBy = fixture.goalDetector.update();

  assertEqual(scoredBy, "home");
});

test("GoalDetector scores away when ball enters bottom goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 758;

  var scoredBy = fixture.goalDetector.update();

  assertEqual(scoredBy, "away");
});

test("GoalDetector does not double-count a ball that remains inside a goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  var first = fixture.goalDetector.update();
  var second = fixture.goalDetector.update();

  assertEqual(first, "home");
  assertEqual(second, null);
});

test("GoalDetector resets after the ball exits the goals", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;
  fixture.goalDetector.update();

  fixture.ball.position.x = 336;
  fixture.ball.position.y = 433;
  fixture.goalDetector.update();

  fixture.ball.position.y = 100;
  assertEqual(fixture.goalDetector.update(), "home");
});
