require("./helpers").loadGameScripts();

var testlib = require("./testlib");

[
  { name: "Configuration", path: "./configuration.test" },
  { name: "MathLib", path: "./mathlib.test" },
  { name: "GoalDetector", path: "./goalDetector.test" },
  { name: "Player", path: "./player.test" },
  { name: "Physics", path: "./physics.test" },
  { name: "Formation", path: "./formation.test" },
  { name: "Individual AI", path: "./individualAi.test" },
  { name: "Team AI", path: "./teamAi.test" },
  { name: "Team", path: "./team.test" },
  { name: "Stadium", path: "./stadium.test" },
  { name: "DebugLog", path: "./debugLog.test" },
  { name: "Game", path: "./game.test" },
  { name: "Input", path: "./io.test" },
  { name: "HTML", path: "./html.test" }
].forEach(function(entry) {
  testlib.suite(entry.name);
  require(entry.path);
});

testlib.runTests();
