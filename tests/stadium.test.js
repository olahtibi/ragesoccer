var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Game objects can be composed without browser rendering", function() {
  var fixture = makeFixture();

  fixture.physics.updatePlayerPosition(0.1);
  fixture.goalDetector.update();
  fixture.ai.predictBallPos(0.1);

  assertEqual(fixture.stadium.players.length, 2);
  assertTrue(fixture.physics.fps >= 0);
});
