require("./helpers").loadGameScripts();

[
  "./configuration.test",
  "./mathlib.test",
  "./goalDetector.test",
  "./player.test",
  "./physics.test",
  "./ai.test",
  "./team.test",
  "./stadium.test",
  "./game.test",
  "./io.test"
].forEach(require);

require("./testlib").runTests();
