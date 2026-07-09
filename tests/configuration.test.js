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

test("Configuration defaults strength and team-size options", function() {
  var originalSearch = window.location.search;
  window.location.search = "";

  var config = new Configuration();

  window.location.search = originalSearch;
  assertEqual(config.playerStrength, 6);
  assertEqual(config.opponentStrength, 6);
  assertEqual(config.homeTeamSize, 4);
  assertEqual(config.awayTeamSize, 4);
});

test("Configuration maps strength to velocity", function() {
  var config = makeConfig();

  assertNear(config.strengthToVelocity(1), 35, 0.0001);
  assertNear(config.strengthToVelocity(6), 51.6667, 0.0001);
  assertNear(config.strengthToVelocity(10), 65, 0.0001);
});

test("Configuration parses and clamps game options from query string", function() {
  var originalSearch = window.location.search;
  window.location.search = "?playerStrength=10&opponentStrength=0&homeTeamSize=5&awayTeamSize=12";

  var config = new Configuration();

  window.location.search = originalSearch;
  assertEqual(config.playerStrength, 10);
  assertEqual(config.opponentStrength, 1);
  assertEqual(config.homeTeamSize, 5);
  assertEqual(config.awayTeamSize, 5);
});

test("Configuration falls back for invalid query options", function() {
  var originalSearch = window.location.search;
  window.location.search = "?playerStrength=x&opponentStrength=&homeTeamSize=no&awayTeamSize=?";

  var config = new Configuration();

  window.location.search = originalSearch;
  assertEqual(config.playerStrength, 6);
  assertEqual(config.opponentStrength, 6);
  assertEqual(config.homeTeamSize, 4);
  assertEqual(config.awayTeamSize, 4);
});
