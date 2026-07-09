var testlib = require("./testlib");
var makeConfig = require("./helpers").makeConfig;

var test = testlib.test;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

test("Test helper defaults to one player per team", function() {
  var config = makeConfig();

  assertEqual(config.homeTeamSize, 1);
  assertEqual(config.awayTeamSize, 1);
  assertEqual(config.initialPlayerPositions("home").length, 1);
  assertEqual(config.initialPlayerPositions("away").length, 1);
});

test("Test helper overrides production team-size defaults", function() {
  var config = new Configuration();
  config.homeTeamSize = 4;
  config.awayTeamSize = 3;

  var testConfig = makeConfig();

  assertEqual(testConfig.homeTeamSize, 1);
  assertEqual(testConfig.awayTeamSize, 1);
});

test("Configuration returns configured formation sizes up to five players", function() {
  var config = makeConfig({ homeTeamSize: 3, awayTeamSize: 5 });

  assertEqual(config.initialPlayerPositions("home").length, 3);
  assertEqual(config.initialPlayerPositions("away").length, 5);
});

test("Configuration preserves existing 1v1 starting positions", function() {
  var config = makeConfig();
  var home = config.initialPlayerPositions("home")[0];
  var away = config.initialPlayerPositions("away")[0];

  assertNear(home.x, config.initialPlayerHomePosition.x, 0.0001);
  assertNear(home.y, config.initialPlayerHomePosition.y, 0.0001);
  assertNear(away.x, config.initialPlayerAwayPosition.x, 0.0001);
  assertNear(away.y, config.initialPlayerAwayPosition.y, 0.0001);
});
