var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

function makeCutsceneGame(fixture) {
  var game = fixture.game;
  window.game = game;
  return game;
}

test("Cutscene starts inactive and rejects invalid restart options", function() {
  var fixture = makeFixture();
  var game = makeCutsceneGame(fixture);

  assertEqual(game.cutscene.isActive(), false);
  assertEqual(game.cutscene.play({}), false);
  assertEqual(game.cutscene.isActive(), false);
});

test("Cutscene rejects mismatched player and position counts", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);

  var started = game.cutscene.play({
    ballPosition: fixture.config.pitch.initialBallPosition,
    sceneTeams: [
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

  game.cutscene.play({
    ballPosition: new Vector3d(334, 433, 0),
    sceneTeams: [
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

  game.cutscene.play({
    ballPosition: new Vector3d(334, 433, 0),
    sceneTeams: [
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

  game.cutscene.play({
    ballPosition: fixture.config.pitch.initialBallPosition,
    sceneTeams: [
      {
        side: "home",
        players: fixture.homePlayers,
        positions: [target]
      }
    ]
  });
  fixture.homePlayers[0].velocity.x = 0;
  fixture.homePlayers[0].velocity.y = -fixture.config.teamVelocity("home");
  var arrived = game.cutscene._movePlayerToTarget(game, fixture.homePlayers[0], target, "home");

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

  game.cutscene.play({
    ballPosition: fixture.config.pitch.initialBallPosition,
    sceneTeams: [
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

test("Cutscene becomes ready when its taker arrives before other players", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);
  var takerTarget = new Vector2d(120, 100);
  fixture.homePlayers[0].position.x = takerTarget.x;
  fixture.homePlayers[0].position.y = takerTarget.y;
  fixture.homePlayers[1].position.x = 300;
  fixture.homePlayers[1].position.y = 300;

  game.cutscene.play({
    ballPosition: fixture.config.pitch.initialBallPosition,
    readyPlayer: fixture.homePlayers[0],
    sceneTeams: [{
      side: "home",
      players: fixture.homePlayers,
      positions: [takerTarget, new Vector2d(400, 400)]
    }]
  });

  assertEqual(game.cutscene.isReadyForInput(), true);
  assertEqual(game.cutscene.isActive(), true);
});

test("Cancelling a ready cutscene does not snap unfinished players", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var game = makeCutsceneGame(fixture);
  var completed = false;
  fixture.homePlayers[0].position.x = 120;
  fixture.homePlayers[0].position.y = 100;
  fixture.homePlayers[1].position.x = 300;
  fixture.homePlayers[1].position.y = 300;

  game.cutscene.play({
    ballPosition: fixture.config.pitch.initialBallPosition,
    readyPlayer: fixture.homePlayers[0],
    onComplete: function() { completed = true; },
    sceneTeams: [{
      side: "home",
      players: fixture.homePlayers,
      positions: [new Vector2d(120, 100), new Vector2d(400, 400)]
    }]
  });
  game.cutscene.cancel(game);

  assertEqual(game.cutscene.isActive(), false);
  assertEqual(fixture.homePlayers[1].position.x, 300);
  assertEqual(fixture.homePlayers[1].position.y, 300);
  assertEqual(completed, false);
});
