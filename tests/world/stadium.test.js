var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Game objects can be composed without browser rendering", function() {
  var fixture = makeFixture();

  fixture.physics.updatePlayerPosition(0.1);
  fixture.goalDetector.update();

  assertEqual(fixture.stadium.players.length, 2);
  assertTrue(fixture.physics.fps >= 0);
});

test("Stadium includes all configured home and away players", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 2 });

  assertEqual(fixture.stadium.homePlayers.length, 3);
  assertEqual(fixture.stadium.awayPlayers.length, 2);
  assertEqual(fixture.stadium.players.length, 5);
  assertTrue(fixture.stadium.homeTeam.players[0] === fixture.stadium.homePlayers[0]);
  assertTrue(fixture.stadium.awayTeam.players[0] === fixture.stadium.awayPlayers[0]);
});

test("Stadium draw renders every player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 3 });
  var drawCount = 0;
  var ctx = {
    drawImage: function() {
      drawCount++;
    },
    beginPath: function() {},
    ellipse: function() {},
    stroke: function() {}
  };

  fixture.stadium.draw(ctx);

  assertEqual(drawCount, 8);
});

test("Stadium draw marks the human controlled player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var ellipseArgs = null;
  var strokes = 0;
  var ctx = {
    drawImage: function() {},
    beginPath: function() {},
    ellipse: function(x, y, radiusX, radiusY) {
      ellipseArgs = {
        x: x,
        y: y,
        radiusX: radiusX,
        radiusY: radiusY
      };
    },
    stroke: function() {
      strokes++;
    },
    strokeStyle: null
  };

  fixture.stadium.draw(ctx);

  assertEqual(ellipseArgs.x, fixture.stadium.humanPlayer.position.x);
  assertEqual(ellipseArgs.y, fixture.stadium.humanPlayer.position.y);
  assertEqual(ellipseArgs.radiusX, 10);
  assertEqual(ellipseArgs.radiusY, 5);
  assertEqual(ctx.strokeStyle, "rgba(255, 255, 255, 0.5)");
  assertEqual(strokes, 1);
});
