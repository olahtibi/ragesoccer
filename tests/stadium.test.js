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

test("Stadium includes all configured home and away players", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 2 });

  assertEqual(fixture.stadium.homePlayers.length, 3);
  assertEqual(fixture.stadium.awayPlayers.length, 2);
  assertEqual(fixture.stadium.players.length, 5);
  assertTrue(fixture.stadium.playerHome === fixture.stadium.homePlayers[0]);
  assertTrue(fixture.stadium.playerAway === fixture.stadium.awayPlayers[0]);
});

test("Stadium selects the home player closest to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 3, awayTeamSize: 1 });
  fixture.ball.position.x = 400;
  fixture.ball.position.y = 560;

  var selected = fixture.stadium.findClosestHomePlayerToBall();

  assertTrue(selected === fixture.stadium.homePlayers[2]);
});

test("Stadium closest-player tie keeps the current human player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.stadium.homePlayers[0].position.x = 100;
  fixture.stadium.homePlayers[0].position.y = 100;
  fixture.stadium.homePlayers[1].position.x = 300;
  fixture.stadium.homePlayers[1].position.y = 100;
  fixture.ball.position.x = 200;
  fixture.ball.position.y = 100;
  fixture.stadium.homeTeam.humanPlayer = fixture.stadium.homePlayers[1];
  fixture.stadium.humanPlayer = fixture.stadium.homePlayers[1];

  var selected = fixture.stadium.findClosestHomePlayerToBall();

  assertTrue(selected === fixture.stadium.homePlayers[1]);
});

test("Stadium selectHumanPlayer clears previous human velocity on switch", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.stadium.homeTeam.humanPlayer = fixture.stadium.homePlayers[0];
  fixture.stadium.humanPlayer = fixture.stadium.homePlayers[0];
  fixture.stadium.homePlayers[0].velocity.x = 10;
  fixture.stadium.homePlayers[0].velocity.y = -10;
  fixture.ball.position.x = fixture.stadium.homePlayers[1].position.x;
  fixture.ball.position.y = fixture.stadium.homePlayers[1].position.y;

  var selected = fixture.stadium.selectHumanPlayer();

  assertTrue(selected === fixture.stadium.homePlayers[1]);
  assertEqual(fixture.stadium.homePlayers[0].velocity.x, 0);
  assertEqual(fixture.stadium.homePlayers[0].velocity.y, 0);
});

test("Stadium draw renders every player", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 3 });
  var drawCount = 0;
  var ctx = {
    drawImage: function() {
      drawCount++;
    }
  };

  fixture.stadium.draw(ctx);

  assertEqual(drawCount, 8);
});
