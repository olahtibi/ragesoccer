require("./helpers").loadGameScripts();

[
  "./mathlib.test",
  "./goalDetector.test",
  "./player.test",
  "./physics.test",
  "./ai.test",
  "./stadium.test"
].forEach(require);

require("./testlib").runTests();
