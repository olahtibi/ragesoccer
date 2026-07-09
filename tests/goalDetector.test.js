var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

test("GoalDetector scores home when ball enters top goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  fixture.goalDetector.update();

  assertEqual(fixture.goalDetector.homeScore, 1);
  assertEqual(fixture.goalDetector.awayScore, 0);
  assertEqual(fixture.goalDetector.state, "goal");
});

test("GoalDetector scores away when ball enters bottom goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 758;

  fixture.goalDetector.update();

  assertEqual(fixture.goalDetector.homeScore, 0);
  assertEqual(fixture.goalDetector.awayScore, 1);
  assertEqual(fixture.goalDetector.state, "goal");
});

test("GoalDetector does not double-count a ball that remains inside a goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;

  fixture.goalDetector.update();
  fixture.goalDetector.update();

  assertEqual(fixture.goalDetector.homeScore, 1);
});

test("GoalDetector resets after the ball exits the goals", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 100;
  fixture.goalDetector.update();

  fixture.ball.position.x = 336;
  fixture.ball.position.y = 433;
  fixture.goalDetector.update();

  assertEqual(fixture.goalDetector.state, "start");
});
