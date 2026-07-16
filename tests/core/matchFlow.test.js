var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertEqual = testlib.assertEqual;

function enterOutOfPlay(fixture) {
  fixture.game.matchFlow.state = "normalPlay";
  fixture.ball.lastTouchedBy = "home";
  fixture.ball.position.x = fixture.config.pitch.fieldRight + fixture.config.ball.radius + 1;
  return fixture.game.matchFlow.detectOutOfPlay(fixture.game.context());
}

function completeOutOfPlayDelay(fixture) {
  fixture.physics.lastDt = fixture.config.restarts.outOfPlayDelaySeconds;
  fixture.game.matchFlow.updateAfterPhysics(fixture.game.context());
}

test("MatchFlow awards a touchline exit to the team that did not touch last", function() {
  var fixture = makeFixture();
  enterOutOfPlay(fixture);
  completeOutOfPlayDelay(fixture);

  assertEqual(fixture.game.restartController.type(), "throwIn");
  assertEqual(fixture.game.restartController.phase(), "positioning");
  assertEqual(fixture.homeTeamAi.state, "throwInOpponent");
  assertEqual(fixture.awayTeamAi.state, "throwInUs");
});

test("MatchFlow chooses top end-line goal kicks and corners from last touch", function() {
  var goalKick = makeFixture();
  goalKick.game.matchFlow.state = "normalPlay";
  goalKick.ball.lastTouchedBy = "home";
  goalKick.ball.position.y = goalKick.config.pitch.fieldTop - goalKick.config.ball.radius - 1;
  goalKick.game.matchFlow.detectOutOfPlay(goalKick.game.context());
  completeOutOfPlayDelay(goalKick);

  assertEqual(goalKick.game.restartController.type(), "goalKick");
  assertEqual(goalKick.awayTeamAi.state, "goalKickUs");

  var corner = makeFixture();
  corner.game.matchFlow.state = "normalPlay";
  corner.ball.lastTouchedBy = "away";
  corner.ball.position.x = corner.config.pitch.fieldLeft + 20;
  corner.ball.position.y = corner.config.pitch.fieldTop - corner.config.ball.radius - 1;
  corner.game.matchFlow.detectOutOfPlay(corner.game.context());
  completeOutOfPlayDelay(corner);

  assertEqual(corner.game.restartController.type(), "corner");
  assertEqual(corner.homeTeamAi.state, "cornerUs");
});

test("MatchFlow chooses bottom end-line goal kicks and corners from last touch", function() {
  var goalKick = makeFixture();
  goalKick.game.matchFlow.state = "normalPlay";
  goalKick.ball.lastTouchedBy = "away";
  goalKick.ball.position.y = goalKick.config.pitch.fieldBottom + goalKick.config.ball.radius + 1;
  goalKick.game.matchFlow.detectOutOfPlay(goalKick.game.context());
  completeOutOfPlayDelay(goalKick);

  assertEqual(goalKick.game.restartController.type(), "goalKick");
  assertEqual(goalKick.homeTeamAi.state, "goalKickUs");

  var corner = makeFixture();
  corner.game.matchFlow.state = "normalPlay";
  corner.ball.lastTouchedBy = "home";
  corner.ball.position.x = corner.config.pitch.fieldRight - 20;
  corner.ball.position.y = corner.config.pitch.fieldBottom + corner.config.ball.radius + 1;
  corner.game.matchFlow.detectOutOfPlay(corner.game.context());
  completeOutOfPlayDelay(corner);

  assertEqual(corner.game.restartController.type(), "corner");
  assertEqual(corner.awayTeamAi.state, "cornerUs");
});

test("MatchFlow restores and stops an exit without last-touch ownership", function() {
  var fixture = makeFixture();
  var startX = fixture.ball.position.x;
  fixture.ball.position.x = fixture.config.pitch.fieldRight + fixture.config.ball.radius + 1;
  fixture.ball.velocity.x = 100;

  fixture.game.matchFlow.detectOutOfPlay(fixture.game.context());

  assertEqual(fixture.game.restartController.phase(), "waitingForInput");
  assertEqual(fixture.ball.position.x, startX);
  assertEqual(fixture.ball.velocity.x, 0);
});

test("MatchFlow exposes ball-only simulation while play is out", function() {
  var fixture = makeFixture();

  assertEqual(enterOutOfPlay(fixture), true);

  assertEqual(fixture.game.matchFlow.state, "outOfPlay");
  assertEqual(fixture.game.matchFlow.isOutOfPlay(), true);
  assertEqual(fixture.game.matchFlow.simulationMode(), "ballOnly");
});

test("MatchFlow pauses and resumes an out-of-play delay", function() {
  var fixture = makeFixture();
  enterOutOfPlay(fixture);
  fixture.physics.lastDt = fixture.config.restarts.outOfPlayDelaySeconds / 2;
  fixture.game.matchFlow.updateAfterPhysics(fixture.game.context());

  fixture.game.matchFlow.pause();
  fixture.physics.lastDt = fixture.config.restarts.outOfPlayDelaySeconds;
  fixture.game.matchFlow.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.matchFlow.isOutOfPlay(), true);
  assertEqual(fixture.game.matchFlow.simulationMode(), "none");

  fixture.game.matchFlow.resume();
  fixture.game.matchFlow.updateAfterPhysics(fixture.game.context());

  assertEqual(fixture.game.matchFlow.state, "restart");
  assertEqual(fixture.game.restartController.type(), "throwIn");
});

test("MatchFlow rejects input and external restarts while play is out", function() {
  var fixture = makeFixture();
  enterOutOfPlay(fixture);

  assertEqual(fixture.game.resumeFromInput(new Vector2d(1, 0)), false);
  assertEqual(fixture.game.beginRestart("corner", "home", {
    boundary: "top",
    position: new Vector2d(fixture.config.pitch.fieldLeft, fixture.config.pitch.fieldTop)
  }), false);
  assertEqual(fixture.game.matchFlow.state, "outOfPlay");
});
