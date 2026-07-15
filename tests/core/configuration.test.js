var testlib = require("../testlib");
var makeConfig = require("../helpers").makeConfig;

var test = testlib.test;
var assertEqual = testlib.assertEqual;
var assertNear = testlib.assertNear;

// Don't make asserts on how test tool works
// test("Test helper overrides production team-size defaults", function() {
//   var config = new Configuration();
//   config.homeTeamSize = 4;
//   config.awayTeamSize = 3;

//   var testConfig = makeConfig();

//   assertEqual(testConfig.homeTeamSize, 1);
//   assertEqual(testConfig.awayTeamSize, 1);
// });

test("Configuration defaults strength and team-size options", function() {
  var originalSearch = window.location.search;
  window.location.search = "";

  var config = new Configuration();

  window.location.search = originalSearch;
  assertEqual(config.playerStrength, 6);
  assertEqual(config.opponentStrength, 6);
  assertEqual(config.homeTeamSize, 4);
  assertEqual(config.awayTeamSize, 4);
  assertEqual(config.outOfPlayRestartsEnabled, true);
  assertNear(config.outOfPlayRestartDelaySeconds, 0.35, 0.0001);
  assertNear(config.cutsceneCameraLerp, 0.06, 0.0001);
});

test("Configuration maps strength to velocity", function() {
  var config = makeConfig();

  assertNear(config.strengthToVelocity(1), 35, 0.0001);
  assertNear(config.strengthToVelocity(6), 51.6667, 0.0001);
  assertNear(config.strengthToVelocity(10), 65, 0.0001);
});

test("Configuration parses and clamps game options from query string", function() {
  var originalSearch = window.location.search;
  window.location.search = "?playerStrength=10&opponentStrength=0&homeTeamSize=5&awayTeamSize=12&kickoffSide=away&outOfPlayRestartsEnabled=false";

  var config = new Configuration();

  window.location.search = originalSearch;
  assertEqual(config.playerStrength, 10);
  assertEqual(config.opponentStrength, 1);
  assertEqual(config.homeTeamSize, 5);
  assertEqual(config.awayTeamSize, 5);
  assertEqual(config.kickoffSide, "away");
  assertEqual(config.outOfPlayRestartsEnabled, false);
});

test("Configuration falls back for invalid query options", function() {
  var originalSearch = window.location.search;
  window.location.search = "?playerStrength=x&opponentStrength=&homeTeamSize=no&awayTeamSize=?&outOfPlayRestartsEnabled=maybe";

  var config = new Configuration();

  window.location.search = originalSearch;
  assertEqual(config.playerStrength, 6);
  assertEqual(config.opponentStrength, 6);
  assertEqual(config.homeTeamSize, 4);
  assertEqual(config.awayTeamSize, 4);
  assertEqual(config.outOfPlayRestartsEnabled, true);
});
