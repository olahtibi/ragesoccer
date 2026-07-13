var testlib = require("../testlib");
var makeConfig = require("../helpers").makeConfig;

var test = testlib.test;
var assertTrue = testlib.assertTrue;
var assertEqual = testlib.assertEqual;

test("Formation returns one position per player for supported team sizes", function() {
  var config = makeConfig();
  var formation = new Formation(config);

  for (var size = 1; size <= 5; size++) {
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

test("Formation kickoffUs puts home striker near kickoff and away striker outside center ellipse", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(config);

  var home = formation.positions("kickoffUs", "home", 3);
  var away = formation.positions("kickoffUs", "away", 3);

  assertTrue(home[2].y > config.aiCenterY);
  assertTrue(Math.abs(home[2].y - config.aiCenterY) <= 25);
  assertTrue(away[2].y < config.aiCenterY);
  assertTrue(outsideCenterEllipse(config, away[2]));
});

test("Formation kickoffOpponent puts away striker near kickoff and home striker outside center ellipse", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 3 });
  var formation = new Formation(config);

  var home = formation.positions("kickoffOpponent", "home", 3);
  var away = formation.positions("kickoffOpponent", "away", 3);

  assertTrue(away[2].y < config.aiCenterY);
  assertTrue(Math.abs(away[2].y - config.aiCenterY) <= 25);
  assertTrue(home[2].y > config.aiCenterY);
  assertTrue(outsideCenterEllipse(config, home[2]));
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
