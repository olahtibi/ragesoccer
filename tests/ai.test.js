var fs = require("fs");
var path = require("path");
var testlib = require("./testlib");
var makeFixture = require("./helpers").makeFixture;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

// function shotSide(fixture, target) {
//   var ball = fixture.ball;
//   var toGoalX = fixture.ai.oppGoalCenter.x - ball.position.x;
//   var toGoalY = fixture.ai.oppGoalCenter.y - ball.position.y;
//   var goalDist = Math.sqrt(toGoalX * toGoalX + toGoalY * toGoalY) || 1;
//   return (target.x - ball.position.x) * toGoalX / goalDist +
//     (target.y - ball.position.y) * toGoalY / goalDist;
// }

// function aimDeltaForPoint(fixture, point) {
//   var ball = fixture.ball;
//   var toGoalX = fixture.ai.oppGoalCenter.x - ball.position.x;
//   var toGoalY = fixture.ai.oppGoalCenter.y - ball.position.y;
//   var goalDist = Math.sqrt(toGoalX * toGoalX + toGoalY * toGoalY) || 1;
//   var ux = toGoalX / goalDist;
//   var uy = toGoalY / goalDist;
//   var anglePoint = Math.atan2(point.y - ball.position.y, point.x - ball.position.x);
//   var angleBehind = Math.atan2(-uy, -ux);
//   var delta = angleBehind - anglePoint;
//   if (delta > Math.PI) delta -= 2 * Math.PI;
//   if (delta < -Math.PI) delta += 2 * Math.PI;
//   return delta;
// }

// function applyAttackTargetAt(fixture, playerX, playerY, ballX, ballY) {
//   fixture.ball.position.x = ballX;
//   fixture.ball.position.y = ballY;
//   fixture.ball.position.z = 0;
//   fixture.ball.velocity.x = 0;
//   fixture.ball.velocity.y = 0;
//   fixture.ball.velocity.z = 0;
//   fixture.playerAway.position.x = playerX;
//   fixture.playerAway.position.y = playerY;
//   var target = fixture.ai.attackTarget(fixture.playerAway);
//   fixture.ai.moveTo(target);
//   return {
//     target: target,
//     velocity: new Vector2d(fixture.playerAway.velocity.x, fixture.playerAway.velocity.y)
//   };
// }

// function capturedAwayGoalGroups(logName) {
//   var logPath = path.join(__dirname, "..", "logs", logName);
//   var payload = JSON.parse(fs.readFileSync(logPath, "utf8"));
//   var groups = [];
//   var current = null;

//   for (var i = 0; i < payload.frames.length; i++) {
//     var frame = payload.frames[i];
//     var ball = frame.ball.pos;
//     var inAwayGoal = ball.x >= 300 && ball.x <= 372 && ball.y >= 753 && ball.y <= 763;
//     if (!inAwayGoal) continue;

//     if (current == null || frame.frame - current.lastFrame > 20) {
//       current = {
//         firstFrame: frame.frame,
//         lastFrame: frame.frame,
//         count: 0
//       };
//       groups.push(current);
//     }
//     current.lastFrame = frame.frame;
//     current.count++;
//   }

//   return groups;
// }

test("Ai predictBallPos uses exponential ground friction", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 200;
  fixture.ball.velocity.x = 50;
  fixture.ball.velocity.y = -20;

  var predicted = fixture.ai.predictBallPos(0.5);
  var travel = (1 - Math.exp(-fixture.config.ballFriction * 0.5)) / fixture.config.ballFriction;

  assertNear(predicted.x, 100 + 50 * travel, 0.0001);
  assertNear(predicted.y, 200 - 20 * travel, 0.0001);
});

test("Ai predictLandingPos returns a forward landing point for airborne balls", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 200;
  fixture.ball.position.z = 20;
  fixture.ball.velocity.x = 40;
  fixture.ball.velocity.y = 10;
  fixture.ball.velocity.z = 50;

  var landing = fixture.ai.predictLandingPos();

  assertTrue(landing !== null);
  assertTrue(landing.x > fixture.ball.position.x);
  assertTrue(landing.y > fixture.ball.position.y);
});

test("Ai predictLandingPos returns null for grounded balls", function() {
  var fixture = makeFixture();
  fixture.ball.position.z = 0;
  fixture.ball.velocity.z = 0;

  assertEqual(fixture.ai.predictLandingPos(), null);
});

test("Ai timeToReach returns a bounded interception time", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 334;
  fixture.ball.position.y = 433;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  var t = fixture.ai.timeToReach(new Vector2d(334, 400));

  assertTrue(t > 0);
  assertTrue(t <= fixture.ai.maxLookaheadSeconds);
});

test("Ai detects balls threatening its own goal", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 150;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  assertTrue(fixture.ai.isBallThreateningOwnGoal());

  fixture.ball.position.x = 336;
  fixture.ball.position.y = 500;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = -80;

  assertTrue(fixture.ai.isBallThreateningOwnGoal());
});

test("Ai defensePoint stays in front of the own goal and clamps near the mouth", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 1000;
  fixture.ball.position.y = 130;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;

  var point = fixture.ai.defensePoint();

  assertTrue(point.y > fixture.ai.ownGoalLineY);
  assertTrue(point.x <= fixture.ai.ownGoalMouthRightX + 8);
  assertTrue(point.x >= fixture.ai.ownGoalMouthLeftX - 8);
});

test("Ai home controller defends bottom goal and attacks top goal", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  var homeAi = new Ai(fixture.config, fixture.stadium, fixture.stadium.homePlayers[1], fixture.homeTeam, fixture.awayTeam);

  assertTrue(homeAi.ownGoalCenter.y > homeAi.midlineY);
  assertTrue(homeAi.oppGoalCenter.y < homeAi.midlineY);
  assertEqual(homeAi.goalieFacingY, -1);
});

test("Ai away controller defends top goal and attacks bottom goal", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 2 });
  var awayAi = new Ai(fixture.config, fixture.stadium, fixture.stadium.awayPlayers[1], fixture.awayTeam, fixture.homeTeam);

  assertTrue(awayAi.ownGoalCenter.y < awayAi.midlineY);
  assertTrue(awayAi.oppGoalCenter.y > awayAi.midlineY);
  assertEqual(awayAi.goalieFacingY, 1);
});

test("Ai speed uses team strength", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 2, playerStrength: 10, opponentStrength: 1 });
  var homeAi = new Ai(fixture.config, fixture.stadium, fixture.stadium.homePlayers[1], fixture.homeTeam, fixture.awayTeam);
  var awayAi = new Ai(fixture.config, fixture.stadium, fixture.stadium.awayPlayers[1], fixture.awayTeam, fixture.homeTeam);

  assertNear(homeAi.speed, 65, 0.0001);
  assertNear(awayAi.speed, 35, 0.0001);
});

test("Ai uses nearest opponent to the ball", function() {
  var fixture = makeFixture({ homeTeamSize: 2, awayTeamSize: 1 });
  fixture.ball.position.x = 100;
  fixture.ball.position.y = 100;
  fixture.stadium.homePlayers[0].position.x = 500;
  fixture.stadium.homePlayers[0].position.y = 500;
  fixture.stadium.homePlayers[1].position.x = 101;
  fixture.stadium.homePlayers[1].position.y = 100;

  var opponent = fixture.ai.nearestOpponentToBall();

  assertTrue(opponent === fixture.stadium.homePlayers[1]);
});

test("Ai moveTo sets velocity toward target", function() {
  var fixture = makeFixture();
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;

  fixture.ai.moveTo(new Vector2d(10, 20));

  assertNear(fixture.playerAway.velocity.x, 0, 0.0001);
  assertNear(fixture.playerAway.velocity.y, fixture.ai.speed, 0.0001);
});

test("Ai moveTo snaps velocity to zero when already at target", function() {
  var fixture = makeFixture();
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;
  fixture.playerAway.velocity.x = 1;
  fixture.playerAway.velocity.y = 1;

  fixture.ai.moveTo(new Vector2d(10, 10));

  assertEqual(fixture.playerAway.velocity.x, 0);
  assertEqual(fixture.playerAway.velocity.y, 0);
});

test("Ai moveTo slows down near target", function() {
  var fixture = makeFixture();
  fixture.playerAway.position.x = 10;
  fixture.playerAway.position.y = 10;

  fixture.ai.moveTo(new Vector2d(14, 10));

  assertNear(fixture.playerAway.velocity.x, fixture.ai.speed / 2, 0.0001);
  assertNear(fixture.playerAway.velocity.y, 0, 0.0001);
});

test("Ai holdGoaliePose faces the pitch while defending at rest", function() {
  var fixture = makeFixture();
  fixture.ai.state = "defend";
  fixture.playerAway.velocity.x = 0;
  fixture.playerAway.velocity.y = 0;
  fixture.playerAway.facingX = 1;
  fixture.playerAway.facingY = -1;

  fixture.ai.holdGoaliePose();

  assertEqual(fixture.playerAway.facingX, 0);
  assertEqual(fixture.playerAway.facingY, 1);
});

test("Ai attackTarget runs through the ball when aligned behind it", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;
  fixture.playerAway.position.x = 336;
  fixture.playerAway.position.y = 380;

  var target = fixture.ai.attackTarget(fixture.playerAway);

  assertNear(target.x, 336, 0.0001);
  assertTrue(target.y > fixture.ball.position.y);
  assertNear(target.y, fixture.ball.position.y + fixture.ai.runThroughDistance, 0.0001);
});

// Make this to be integTest. 
//   1. Replay recorded events in current code
//   2. Assert that 3 goals have been scored
//test("Captured aiming log contains three away goals", function() {
//  var groups = capturedAwayGoalGroups("example-01.json");
//
//  if (groups.length > 0) {
//    assertEqual(groups.length, 3);
//    assertEqual(groups[0].firstFrame, 648);
//    assertEqual(groups[1].firstFrame, 1012);
//    assertEqual(groups[2].firstFrame, 1224);
//  }
//});

// Remove this: Contains arbitrary magic numbers. If we need it make as integTest with captured log.
// test("Ai attackTarget corrects around the ball when close but not cleanly aligned", function() {
//   var fixture = makeFixture();
//   fixture.ball.position.x = 267.66;
//   fixture.ball.position.y = 148.01;
//   fixture.playerAway.position.x = 268.29;
//   fixture.playerAway.position.y = 136.71;

//   var originalAbsDelta = Math.abs(aimDeltaForPoint(fixture, fixture.playerAway.position));
//   var target = fixture.ai.attackTarget(fixture.playerAway);

//   assertTrue(shotSide(fixture, target) <= 0);
//   assertTrue(Math.abs(aimDeltaForPoint(fixture, target)) < originalAbsDelta);
//   assertNear(
//     MathLib.computeDistance(target, fixture.ball.position),
//     MathLib.computeDistance(fixture.playerAway.position, fixture.ball.position),
//     0.0001
//   );
// });

// Remove this: Contains arbitrary magic numbers. If we need it make as integTest with captured log.
// test("Ai attackTarget uses the strict aim gate for shooting", function() {
//   var fixture = makeFixture();
//   fixture.ball.position.x = 330.85;
//   fixture.ball.position.y = 724.18;
//   fixture.playerAway.position.x = 330.76;
//   fixture.playerAway.position.y = 710.06;

//   var target = fixture.ai.attackTarget(fixture.playerAway);

//   assertTrue(Math.abs(aimDeltaForPoint(fixture, fixture.playerAway.position)) < fixture.ai.shootAngleTolerance);
//   assertTrue(shotSide(fixture, target) > 0);
// });

// Remove this: Contains arbitrary magic numbers. If we need it make as integTest with captured log.
// test("Ai attackTarget does not shoot when near the ball but outside aim tolerance", function() {
//   var fixture = makeFixture();
//   fixture.ball.position.x = 336;
//   fixture.ball.position.y = 400;
//   fixture.playerAway.position.x = 330.67;
//   fixture.playerAway.position.y = 383.42;

//   var target = fixture.ai.attackTarget(fixture.playerAway);

//   assertTrue(Math.abs(aimDeltaForPoint(fixture, fixture.playerAway.position)) > fixture.ai.shootAngleTolerance);
//   assertTrue(shotSide(fixture, target) <= 0);
// });

// Remove this: Contains arbitrary magic numbers. If we need it make as integTest with captured log.
// test("Ai attackTarget close correction avoids the old far setup reversal", function() {
//   var fixture = makeFixture();
//   fixture.ball.position.x = 336;
//   fixture.ball.position.y = 400;
//   fixture.playerAway.position.x = 332.28;
//   fixture.playerAway.position.y = 383.42;

//   var target = fixture.ai.attackTarget(fixture.playerAway);

//   assertTrue(shotSide(fixture, target) <= 0);
//   assertNear(
//     MathLib.computeDistance(target, fixture.ball.position),
//     MathLib.computeDistance(fixture.playerAway.position, fixture.ball.position),
//     0.0001
//   );
//   assertTrue(MathLib.computeDistance(target, fixture.playerAway.position) < fixture.config.aiArrivalSlowRadius);
// });

// Remove this: Contains arbitrary magic numbers. If we need it make as integTest with captured log.
// test("Ai attackTarget stationary-ball press does not reverse near contact", function() {
//   var fixture = makeFixture();
//   var states = [
//     [330.06, 711.04],
//     [330.04, 712.94],
//     [330.08, 714.86],
//     [330.39, 717.37],
//     [330.25, 718.66],
//     [330.39, 720.55],
//     [330.52, 722.35],
//     [330.45, 723.15]
//   ];
//   var previousVelocity = null;

//   for (var i = 0; i < states.length; i++) {
//     var result = applyAttackTargetAt(fixture, states[i][0], states[i][1], 330.76, 729.84);
//     assertTrue(MathLib.computeDistance(result.velocity, new Vector2d(0, 0)) > 0);
//     if (previousVelocity != null) {
//       var dot = previousVelocity.x * result.velocity.x + previousVelocity.y * result.velocity.y;
//       assertTrue(dot >= 0);
//     }
//     previousVelocity = result.velocity;
//   }
// });

// test("Ai attackTarget stationary-ball press keeps moving when parked beside ball", function() {
//   var fixture = makeFixture();

//   var result = applyAttackTargetAt(fixture, 385.18, 677.78, 381.3, 687.58);

//   assertTrue(MathLib.computeDistance(result.velocity, new Vector2d(0, 0)) > 0);
// });

test("Ai attackTarget stationary-ball press keeps moving from captured stopped state", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  game.started = true;
  fixture.ball.position.x = 192.06;
  fixture.ball.position.y = 726.13;
  fixture.ball.position.z = 0;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;
  fixture.ball.velocity.z = 0;
  fixture.playerAway.position.x = 181.56;
  fixture.playerAway.position.y = 721.96;
  fixture.playerAway.velocity.x = 0;
  fixture.playerAway.velocity.y = 0;
  fixture.ai.tPos = new Vector2d(181.11, 722.46);

  fixture.awayTeam.updateAi();

  assertEqual(fixture.ai.role, "striker");
  assertEqual(fixture.ai.state, "press");
  assertTrue(MathLib.computeDistance(fixture.playerAway.velocity, new Vector2d(0, 0)) > 0);
});

test("Ai attackTarget still orbits when close but poorly aligned", function() {
  var fixture = makeFixture();
  fixture.ball.position.x = 336;
  fixture.ball.position.y = 400;
  fixture.playerAway.position.x = 346;
  fixture.playerAway.position.y = 400;

  var target = fixture.ai.attackTarget(fixture.playerAway);

  assertTrue(target.y < fixture.ball.position.y + fixture.ai.runThroughDistance - 1);
});

test("Away pressure defender near the ball keeps moving to kick", function() {
  var fixture = makeFixture({ homeTeamSize: 4, awayTeamSize: 4 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  game.started = true;
  fixture.ball.position.x = 267.66;
  fixture.ball.position.y = 148.01;
  fixture.ball.position.z = 0;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;
  fixture.ball.velocity.z = 0;
  fixture.awayPlayers[1].position.x = 268.29;
  fixture.awayPlayers[1].position.y = 136.71;

  fixture.awayTeam.updateAi();

  var defender = fixture.awayTeam.aiControllers[1];
  assertEqual(defender.role, "defender");
  assertEqual(defender.state, "press");
  assertTrue(MathLib.computeDistance(fixture.awayPlayers[1].velocity, new Vector2d(0, 0)) > 0);
});

test("Away pressure striker near setup point keeps moving", function() {
  var fixture = makeFixture({ homeTeamSize: 1, awayTeamSize: 1 });
  var game = new Game(fixture.config, fixture.stadium, {}, fixture.physics);
  window.game = game;
  game.started = true;
  fixture.ball.position.x = 304.89;
  fixture.ball.position.y = 629.7;
  fixture.ball.position.z = 0;
  fixture.ball.velocity.x = 0;
  fixture.ball.velocity.y = 0;
  fixture.ball.velocity.z = 0;
  fixture.playerAway.position.x = 304.14;
  fixture.playerAway.position.y = 618.43;

  fixture.awayTeam.updateAi();

  assertEqual(fixture.ai.role, "striker");
  assertEqual(fixture.ai.state, "press");
  assertTrue(MathLib.computeDistance(fixture.playerAway.velocity, new Vector2d(0, 0)) > 0);
});
