var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function makeCutsceneGame(fixture) {
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  return game;
}

test("Cutscene starts inactive and rejects invalid restart options", function() {
  var fixture = makeFixture();
  var game = makeCutsceneGame(fixture);

  assertEqual(game.cutscene.isActive(), false);
  assertEqual(game.cutscene.startRestart({}), false);
  assertEqual(game.cutscene.isActive(), false);
});

test("Cutscene rejects mismatched player and position counts", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);

  var started = game.cutscene.startRestart({
    ballPosition: fixture.config.initialBallPosition,
    teams: [
      {
        side: "home",
        players: fixture.homePlayers,
        positions: [new Vector2d(100, 100)]
      }
    ]
  });

  assertEqual(started, false);
  assertEqual(game.cutscene.isActive(), false);
});

test("Cutscene locks ball and moves players toward explicit targets", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1, playerStrength: 10 });
  var game = makeCutsceneGame(fixture);
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 200;
  fixture.ball.velocity.x = 90;
  fixture.homePlayers[0].position.x = 100;
  fixture.homePlayers[0].position.y = 100;

  game.cutscene.startRestart({
    ballPosition: new Vector3d(334, 433, 0),
    teams: [
      {
        side: "home",
        players: fixture.homePlayers,
        positions: [new Vector2d(120, 100)]
      }
    ]
  });
  game.cutscene.update(game);

  assertEqual(fixture.ball.position.x, 334);
  assertEqual(fixture.ball.position.y, 433);
  assertEqual(fixture.ball.velocity.x, 0);
  assertTrue(fixture.homePlayers[0].velocity.x > 0);
});

test("Cutscene waits for players and camera before completing", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);
  var cameraArrived = false;
  game.camera = {
    focusTarget: null,
    setFocusTarget: function(target) {
      this.focusTarget = target;
    },
    hasArrivedAtFocus: function() {
      return cameraArrived;
    },
    clearFocusTarget: function() {
      this.focusTarget = null;
    }
  };
  fixture.homePlayers[0].position.x = 120;
  fixture.homePlayers[0].position.y = 100;

  game.cutscene.startRestart({
    ballPosition: new Vector3d(334, 433, 0),
    teams: [
      {
        side: "home",
        players: fixture.homePlayers,
        positions: [new Vector2d(120, 100)]
      }
    ]
  });

  game.cutscene.update(game);
  assertEqual(game.cutscene.isActive(), true);
  assertTrue(game.camera.focusTarget !== null);

  cameraArrived = true;
  game.cutscene.update(game);

  assertEqual(game.cutscene.isActive(), false);
  assertEqual(game.camera.focusTarget, null);
});

test("Cutscene snaps overshot players to targets", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);
  var target = new Vector2d(120, 100);
  fixture.homePlayers[0].position.x = 120;
  fixture.homePlayers[0].position.y = 96;

  game.cutscene.startRestart({
    ballPosition: fixture.config.initialBallPosition,
    teams: [
      {
        side: "home",
        players: fixture.homePlayers,
        positions: [target]
      }
    ]
  });
  fixture.homePlayers[0].velocity.x = 0;
  fixture.homePlayers[0].velocity.y = -fixture.config.teamVelocity("home");
  var arrived = game.cutscene.movePlayerToTarget(game, fixture.homePlayers[0], target, "home");

  assertEqual(arrived, true);
  assertEqual(fixture.homePlayers[0].position.x, target.x);
  assertEqual(fixture.homePlayers[0].position.y, target.y);
  assertEqual(fixture.homePlayers[0].velocity.y, 0);
});

test("Cutscene ignores pre-cutscene velocity when moving players to targets", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);
  var target = new Vector2d(120, 100);
  fixture.awayPlayers[0].position.x = 80;
  fixture.awayPlayers[0].position.y = 100;
  fixture.awayPlayers[0].velocity.x = -fixture.config.teamVelocity("away");
  fixture.awayPlayers[0].velocity.y = 0;

  game.cutscene.startRestart({
    ballPosition: fixture.config.initialBallPosition,
    teams: [
      {
        side: "away",
        players: fixture.awayPlayers,
        positions: [target]
      }
    ]
  });
  game.cutscene.updateBeforePhysics(game);

  assertEqual(fixture.awayPlayers[0].position.x, 80);
  assertEqual(fixture.awayPlayers[0].position.y, 100);
  assertTrue(fixture.awayPlayers[0].velocity.x > 0);
});
