var testlib = require("../testlib");
var makeConfig = require("../helpers").makeConfig;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Formation returns one position per player for supported team sizes", function() {
  var config = makeConfig();
  var formation = new Formation(config);

  for (var size = 1; size <= 11; size++) {
    assertEqual(formation.positions("attack", "home", size).length, size);
    assertEqual(formation.positions("defense", "away", size).length, size);
  }
});

test("Formation mirrors home and away around configured center line", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  config.aiCenterY = 410;
  var formation = new Formation(config);

  var home = formation.positions("attack", "home", 3);
  var away = formation.positions("attack", "away", 3);

  assertTrue(home[2].y < config.aiCenterY);
  assertTrue(away[2].y > config.aiCenterY);
});

function outsideCenterEllipse(config, position) {
  var dx = position.x - config.initialBallPosition.x;
  var dy = position.y - config.aiCenterY;
  return (dx * dx) / (config.centerCircleRadiusX * config.centerCircleRadiusX) +
    (dy * dy) / (config.centerCircleRadiusY * config.centerCircleRadiusY) >= 1;
}

test("Formation uses relative kickoff states for both teams", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(config);

  var home = formation.positions("kickoffUs", "home", 3);
  var away = formation.positions("kickoffOpponent", "away", 3);

  assertTrue(home[2].y > config.aiCenterY);
  assertTrue(Math.abs(home[2].y - config.aiCenterY) <= 25);
  assertTrue(away[2].y < config.aiCenterY);
  assertTrue(outsideCenterEllipse(config, away[2]));
});

test("Formation mirrors relative states for an away kickoff", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(config);

  var home = formation.positions("kickoffOpponent", "home", 3);
  var away = formation.positions("kickoffUs", "away", 3);

  assertTrue(away[2].y < config.aiCenterY);
  assertTrue(Math.abs(away[2].y - config.aiCenterY) <= 25);
  assertTrue(home[2].y > config.aiCenterY);
  assertTrue(outsideCenterEllipse(config, home[2]));
});

test("Formation gives one 5v5 striker a dedicated close kickoff position", function() {
  var config = makeConfig({ homeTeamSize: 5, awayTeamSize: 5 });
  var formation = new Formation(config);
  var home = formation.positions("kickoffUs", "home", 5);
  var away = formation.positions("kickoffUs", "away", 5);

  assertEqual(formation.kickoffTakerIndex(5), 3);
  assertEqual(home[3].x, config.initialBallPosition.x);
  assertEqual(home[3].y, config.aiCenterY + config.kickoffTakerDistance);
  assertEqual(away[3].x, config.initialBallPosition.x);
  assertEqual(away[3].y, config.aiCenterY - config.kickoffTakerDistance);

  assertEqual(home[4].x, config.initialBallPosition.x + 45);
  assertEqual(home[4].y, config.aiCenterY + 20);
  assertTrue(MathLib.computeDistance(home[3], config.initialBallPosition) <
    MathLib.computeDistance(home[4], config.initialBallPosition));
  assertTrue(MathLib.computeDistance(away[3], config.initialBallPosition) <
    MathLib.computeDistance(away[4], config.initialBallPosition));
});

test("Formation identifies the first striker as kickoff taker for every team size", function() {
  var formation = new Formation(makeConfig());
  var expected = [0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9];

  for (var size = 1; size <= 11; size++) {
    assertEqual(formation.kickoffTakerIndex(size), expected[size - 1]);
  }
});

test("Formation builds balanced roles through a full 4-4-2", function() {
  var formation = new Formation(makeConfig());
  var expected = {
    6: "goalie,defender,defender,midfielder,striker,striker",
    7: "goalie,defender,defender,midfielder,midfielder,striker,striker",
    8: "goalie,defender,defender,defender,midfielder,midfielder,striker,striker",
    9: "goalie,defender,defender,defender,midfielder,midfielder,midfielder,striker,striker",
    10: "goalie,defender,defender,defender,defender,midfielder,midfielder,midfielder,striker,striker",
    11: "goalie,defender,defender,defender,defender,midfielder,midfielder,midfielder,midfielder,striker,striker"
  };

  for (var size = 6; size <= 11; size++) {
    assertEqual(formation.rolesForSize(size).join(","), expected[size]);
  }
  var full = formation.rolesForSize(11);
  assertEqual(formation.roleCount(full, "goalie"), 1);
  assertEqual(formation.roleCount(full, "defender"), 4);
  assertEqual(formation.roleCount(full, "midfielder"), 4);
  assertEqual(formation.roleCount(full, "striker"), 2);
});

test("Formation mirrors the 11-player midfield and shifts it with team state", function() {
  var config = makeConfig({ homeTeamSize: 11, awayTeamSize: 11 });
  var formation = new Formation(config);
  var homeAttack = formation.positions("attack", "home", 11);
  var homeDefense = formation.positions("defense", "home", 11);
  var awayAttack = formation.positions("attack", "away", 11);

  for (var i = 5; i <= 8; i++) {
    assertEqual(homeAttack[i].x, awayAttack[i].x);
    assertEqual(homeAttack[i].y + awayAttack[i].y, config.aiCenterY * 2);
    assertTrue(homeAttack[i].y < homeDefense[i].y);
  }
});

test("Formation keeps 11-player kickoff midfielders outside the center ellipse", function() {
  var config = makeConfig({ homeTeamSize: 11, awayTeamSize: 11 });
  var formation = new Formation(config);
  var kicking = formation.positions("kickoffUs", "home", 11);
  var defending = formation.positions("kickoffOpponent", "away", 11);

  for (var i = 5; i <= 8; i++) {
    assertTrue(outsideCenterEllipse(config, kicking[i]));
    assertTrue(outsideCenterEllipse(config, defending[i]));
  }
  assertTrue(outsideCenterEllipse(config, defending[9]));
  assertTrue(outsideCenterEllipse(config, defending[10]));
  assertEqual(kicking[9].x, config.initialBallPosition.x);
  assertEqual(kicking[9].y, config.aiCenterY + config.kickoffTakerDistance);
});

test("Formation gives every 11-player kickoff opponent a unique position", function() {
  var config = makeConfig({ homeTeamSize: 11, awayTeamSize: 11 });
  var formation = new Formation(config);
  var home = formation.positions("kickoffOpponent", "home", 11);
  var away = formation.positions("kickoffOpponent", "away", 11);

  for (var i = 0; i < 11; i++) {
    for (var j = i + 1; j < 11; j++) {
      assertTrue(MathLib.computeDistance(home[i], home[j]) > config.playerRadius * 2);
      assertTrue(MathLib.computeDistance(away[i], away[j]) > config.playerRadius * 2);
    }
  }
});

test("Formation separates kickoff striker and midfield lines", function() {
  var config = makeConfig({ homeTeamSize: 11, awayTeamSize: 11 });
  var formation = new Formation(config);
  var homeKicking = formation.positions("kickoffUs", "home", 11);
  var homeDefending = formation.positions("kickoffOpponent", "home", 11);
  var awayKicking = formation.positions("kickoffUs", "away", 11);
  var awayDefending = formation.positions("kickoffOpponent", "away", 11);

  assertTrue(homeKicking[5].y - homeKicking[10].y >= 75);
  assertTrue(homeDefending[5].y - homeDefending[9].y >= 60);
  assertTrue(awayKicking[10].y - awayKicking[5].y >= 75);
  assertTrue(awayDefending[9].y - awayDefending[5].y >= 60);
});

test("Formation keeps kickoff and defensive lines vertically sparse", function() {
  var config = makeConfig({ homeTeamSize: 11, awayTeamSize: 11 });
  var formation = new Formation(config);
  var homeKickoff = formation.positions("kickoffUs", "home", 11);
  var awayKickoff = formation.positions("kickoffUs", "away", 11);
  var homeDefense = formation.positions("defense", "home", 11);
  var awayDefense = formation.positions("defense", "away", 11);

  assertTrue(homeKickoff[1].y - homeKickoff[5].y >= 100);
  assertTrue(awayKickoff[5].y - awayKickoff[1].y >= 100);
  assertTrue(homeDefense[1].y - homeDefense[5].y >= 160);
  assertTrue(homeDefense[5].y - homeDefense[9].y >= 120);
  assertTrue(awayDefense[5].y - awayDefense[1].y >= 160);
  assertTrue(awayDefense[9].y - awayDefense[5].y >= 120);

  assertTrue(config.goalieDistance + homeDefense[0].y - homeDefense[1].y >= 60);
  assertTrue(config.goalieDistance + awayDefense[1].y - awayDefense[0].y >= 60);
});

test("Formation defense shifts toward own goal and attack shifts toward opponent goal", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(config);

  var homeAttack = formation.positions("attack", "home", 3);
  var homeDefense = formation.positions("defense", "home", 3);
  var awayAttack = formation.positions("attack", "away", 3);
  var awayDefense = formation.positions("defense", "away", 3);

  assertTrue(homeAttack[2].y < homeDefense[2].y);
  assertTrue(awayAttack[2].y > awayDefense[2].y);
});

test("Formation keeps goalie near own goal when present", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(config);

  var home = formation.positions("attack", "home", 3);
  var away = formation.positions("attack", "away", 3);

  assertTrue(home[0].y > config.aiCenterY);
  assertTrue(away[0].y < config.aiCenterY);
});

test("Formation sends corner receivers up while the goalie and one defender stay back", function() {
  var config = makeConfig({ homeTeamSize: 5, awayTeamSize: 5 });
  var formation = new Formation(config);
  var homeAttack = formation.positions("attack", "home", 5);
  var awayAttack = formation.positions("attack", "away", 5);
  var homeCorner = formation.positions("cornerUs", "home", 5);
  var awayCorner = formation.positions("cornerUs", "away", 5);

  assertEqual(homeCorner[0].y, homeAttack[0].y);
  assertEqual(homeCorner[1].y, homeAttack[1].y);
  assertEqual(awayCorner[0].y, awayAttack[0].y);
  assertEqual(awayCorner[1].y, awayAttack[1].y);

  for (var i = 2; i < 5; i++) {
    assertEqual(homeCorner[i].y, config.fieldTop + config.cornerCrossDistance);
    assertEqual(awayCorner[i].y, config.fieldBottom - config.cornerCrossDistance);
    assertEqual(homeCorner[i].x, awayCorner[i].x);
  }

  assertEqual(homeCorner[3].x - homeCorner[2].x, config.cornerReceiverSpacing);
  assertEqual(homeCorner[4].x - homeCorner[3].x, config.cornerReceiverSpacing);
});

test("Formation supports a corner attack when no defender role exists", function() {
  var config = makeConfig({ homeTeamSize: 2 });
  var formation = new Formation(config);
  var positions = formation.positions("cornerUs", "home", 2);

  assertEqual(positions.length, 2);
  assertEqual(formation.cornerCoverIndex(2), -1);
  assertEqual(positions[1].y, config.fieldTop + config.cornerCrossDistance);
});

test("Formation sends nine 11-player corner receivers up", function() {
  var config = makeConfig({ homeTeamSize: 11 });
  var formation = new Formation(config);
  var attack = formation.positions("attack", "home", 11);
  var corner = formation.positions("cornerUs", "home", 11);

  assertEqual(corner[0].y, attack[0].y);
  assertEqual(corner[1].y, attack[1].y);
  for (var i = 2; i < 11; i++) {
    assertEqual(corner[i].y, config.fieldTop + config.cornerCrossDistance);
  }
});
