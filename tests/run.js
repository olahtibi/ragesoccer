require("./helpers").loadGameScripts();

var testlib = require("./testlib");

[
  { name: "Configuration", path: "./core/configuration.test" },
  { name: "MathLib", path: "./math/mathlib.test" },
  { name: "GoalDetector", path: "./world/goalDetector.test" },
  { name: "Player", path: "./world/player.test" },
  { name: "Physics", path: "./world/physics.test" },
  { name: "Formation", path: "./ai/formation.test" },
  { name: "AI Commands", path: "./ai/commands/inactiveCommand.test" },
  { name: "AI Commands", path: "./ai/commands/moveToPositionCommand.test" },
  { name: "AI Commands", path: "./ai/commands/attackBallCommand.test" },
  { name: "Individual AI", path: "./ai/individualAi.test" },
  { name: "Team AI", path: "./ai/teamAi.test" },
  { name: "Team", path: "./world/team.test" },
  { name: "Stadium", path: "./world/stadium.test" },
  { name: "DebugLog", path: "./core/debugLog.test" },
  { name: "Game", path: "./core/game.test" },
  { name: "Input", path: "./input/io.test" },
  { name: "HTML", path: "./core/html.test" }
].forEach(function(entry) {
  testlib.suite(entry.name);
  require(entry.path);
});

testlib.runTests();
