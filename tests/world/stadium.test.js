var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

function centerEllipseDistance(config, position) {
  var dx = position.x - config.initialBallPosition.x;
  var dy = position.y - config.aiCenterY;
  return (dx * dx) / (config.centerCircleRadiusX * config.centerCircleRadiusX) +
    (dy * dy) / (config.centerCircleRadiusY * config.centerCircleRadiusY);
}

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
    moveTo: function() {},
    lineTo: function() {},
    closePath: function() {},
    stroke: function() {}
  };

  fixture.stadium.draw(ctx);

  assertEqual(drawCount, 8);
});

test("Stadium draw marks the human controlled player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.stadium.humanPlayer.facingX = 0;
  fixture.stadium.humanPlayer.facingY = -1;
  var moveToArgs = null;
  var lineToCount = 0;
  var strokes = 0;
  var closed = false;
  var ctx = {
    drawImage: function() {},
    beginPath: function() {},
    moveTo: function(x, y) {
      moveToArgs = {
        x: x,
        y: y
      };
    },
    lineTo: function() {
      lineToCount++;
    },
    closePath: function() {
      closed = true;
    },
    stroke: function() {
      strokes++;
    },
    strokeStyle: null,
    lineWidth: null
  };

  fixture.stadium.draw(ctx);

  assertEqual(moveToArgs.x, fixture.stadium.humanPlayer.position.x - 1);
  assertEqual(moveToArgs.y, fixture.stadium.humanPlayer.position.y - 12);
  assertEqual(lineToCount, 9);
  assertTrue(closed);
  assertEqual(ctx.lineWidth, 1);
  assertEqual(ctx.strokeStyle, "rgba(255, 255, 0, 0.5)");
  assertEqual(strokes, 1);
});

test("Stadium keeps kickoff incomplete while ball is below speed threshold", function() {
  var fixture = makeFixture();
  fixture.ball.velocity.x = fixture.config.minVelocity;
  fixture.ball.velocity.y = 0;

  fixture.stadium.updateKickoff();

  assertEqual(fixture.stadium.kickoffComplete, false);
});

test("Stadium completes kickoff when ball exceeds speed threshold", function() {
  var fixture = makeFixture();
  fixture.ball.velocity.x = fixture.config.minVelocity + 1;
  fixture.ball.velocity.y = 0;

  fixture.stadium.updateKickoff();

  assertEqual(fixture.stadium.kickoffComplete, true);
});

test("Stadium keeps home kickoff player inside center ellipse before kickoff", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  window.game = {
    started: true,
    isPaused: function() { return false; }
  };
  fixture.stadium.humanPlayer.position.x = fixture.config.initialBallPosition.x;
  fixture.stadium.humanPlayer.position.y = fixture.config.aiCenterY - fixture.config.centerCircleRadiusY - 20;
  fixture.stadium.humanPlayer.velocity.y = -fixture.config.teamVelocity("home");

  fixture.stadium.updateKickoff();

  assertNear(centerEllipseDistance(fixture.config, fixture.stadium.humanPlayer.position), 1, 0.0001);
  assertEqual(fixture.stadium.humanPlayer.velocity.x, 0);
  assertEqual(fixture.stadium.humanPlayer.velocity.y, 0);
});

test("Stadium does not clamp default home player before game starts", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  window.game = {
    started: false,
    isPaused: function() { return false; }
  };
  var player = fixture.stadium.humanPlayer;
  var startX = player.position.x;
  var startY = player.position.y;

  fixture.stadium.updateKickoff();

  assertEqual(player.position.x, startX);
  assertEqual(player.position.y, startY);
});

test("Stadium does not clamp home player after kickoff is complete", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  window.game = {
    started: true,
    isPaused: function() { return false; }
  };
  fixture.stadium.kickoffComplete = true;
  fixture.stadium.humanPlayer.position.x = fixture.config.initialBallPosition.x;
  fixture.stadium.humanPlayer.position.y = fixture.config.aiCenterY - fixture.config.centerCircleRadiusY - 20;

  fixture.stadium.updateKickoff();

  assertTrue(centerEllipseDistance(fixture.config, fixture.stadium.humanPlayer.position) > 1);
});

test("Stadium does not clamp home player during opponent kickoff", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1, kickoffSide: "away" });
  window.game = {
    started: true,
    isPaused: function() { return false; }
  };
  fixture.stadium.humanPlayer.position.x = fixture.config.initialBallPosition.x;
  fixture.stadium.humanPlayer.position.y = fixture.config.aiCenterY - fixture.config.centerCircleRadiusY - 20;

  fixture.stadium.updateKickoff();

  assertTrue(centerEllipseDistance(fixture.config, fixture.stadium.humanPlayer.position) > 1);
});
