var fs = require("fs");
var path = require("path");
var testlib = require("../testlib");

var test = testlib.test;
var assertTrue = testlib.assertTrue;

var rootDir = path.resolve(__dirname, "../..");

function readFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("Options page contains strength and team-size controls", function() {
  var html = readFile("index.html");

  assertTrue(html.indexOf('id="playerStrength"') !== -1);
  assertTrue(html.indexOf('id="opponentStrength"') !== -1);
  assertTrue(html.indexOf('id="homeTeamSize"') !== -1);
  assertTrue(html.indexOf('id="awayTeamSize"') !== -1);
  assertTrue(html.indexOf('<option value="6">6</option>') !== -1);
  assertTrue(html.indexOf('<option value="10">10</option>') !== -1);
  assertTrue(html.split('value="11" selected').length - 1 === 2);
  assertTrue(html.indexOf('id="kickoffSide"') !== -1);
  assertTrue(html.indexOf('id="outOfPlayRestartsEnabled"') !== -1);
  assertTrue(html.indexOf('"outOfPlayRestartsEnabled="') !== -1);
  assertTrue(html.indexOf('"kickoffSide="') !== -1);
  assertTrue(html.indexOf('value="home" selected') !== -1);
  assertTrue(html.indexOf('value="away"') !== -1);
  assertTrue(html.indexOf("<style>") !== -1);
  assertTrue(html.indexOf('name="viewport"') !== -1);
  assertTrue(html.indexOf('assets/images/menu-background.jpg') !== -1);
  assertTrue(html.indexOf('id="optionsForm"') !== -1);
  assertTrue(html.indexOf('class="options-grid"') !== -1);
  assertTrue(html.indexOf("@media (max-width: 600px)") !== -1);
  assertTrue(html.indexOf("prefers-reduced-motion") !== -1);
  assertTrue(html.indexOf("1 - Red Novices") !== -1);
  assertTrue(html.indexOf("1 - Blue Novices") !== -1);
  assertTrue(html.indexOf("10 - Red Titans") !== -1);
  assertTrue(html.indexOf("10 - Blue Titans") !== -1);
  assertTrue(html.indexOf("game.html?") !== -1);
});

test("Game page contains canvas assets scripts and boot hook", function() {
  var html = readFile("game.html");

  assertTrue(html.indexOf('onload="startGameWhenLandscape();"') !== -1);
  assertTrue(html.indexOf('id="myCanvas"') !== -1);
  assertTrue(html.indexOf('id="rotateNotice"') !== -1);
  assertTrue(html.indexOf("(orientation: portrait) and (pointer: coarse)") !== -1);
  assertTrue(html.indexOf("function startGameWhenLandscape()") !== -1);
  assertTrue(html.indexOf("startLoop();") !== -1);
  assertTrue(html.indexOf('src="assets/images/pitch.jpg"') !== -1);
  assertTrue(html.indexOf('src="src/core/configuration.js') !== -1);
  assertTrue(html.indexOf('src="src/core/cutscene.js') !== -1);
  assertTrue(html.indexOf('src="src/world/detectors/boundaryDetector.js') !== -1);
  assertTrue(html.indexOf('src="src/core/restarts/restartRegistry.js') !== -1);
  assertTrue(html.indexOf('src="src/core/restarts/throwInRestart.js') !== -1);
  assertTrue(html.indexOf('src="src/core/restarts/cornerRestart.js') !== -1);
  assertTrue(html.indexOf('src="src/core/restarts/goalKickRestart.js') !== -1);
  assertTrue(html.indexOf('src="src/ai/commands/commandRegistry.js') !== -1);
  assertTrue(html.indexOf('src="src/input/io.js') !== -1);
});
