var fs = require("fs");
var path = require("path");
var testlib = require("./testlib");

var test = testlib.test;
var assertTrue = testlib.assertTrue;

var rootDir = path.resolve(__dirname, "..");

function readFile(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("Options page contains strength and team-size controls", function() {
  var html = readFile("index.html");

  assertTrue(html.indexOf('id="playerStrength"') !== -1);
  assertTrue(html.indexOf('id="opponentStrength"') !== -1);
  assertTrue(html.indexOf('id="homeTeamSize"') !== -1);
  assertTrue(html.indexOf('id="awayTeamSize"') !== -1);
  assertTrue(html.indexOf('href="css/options.css') !== -1);
  assertTrue(html.indexOf("1 - Red Novices") !== -1);
  assertTrue(html.indexOf("1 - Blue Novices") !== -1);
  assertTrue(html.indexOf("10 - Red Titans") !== -1);
  assertTrue(html.indexOf("10 - Blue Titans") !== -1);
  assertTrue(html.indexOf("game.html?") !== -1);
});

test("Game page contains canvas assets scripts and boot hook", function() {
  var html = readFile("game.html");

  assertTrue(html.indexOf('onload="startGameWhenLandscape();"') !== -1);
  assertTrue(html.indexOf('href="css/game.css') !== -1);
  assertTrue(html.indexOf('id="myCanvas"') !== -1);
  assertTrue(html.indexOf('id="rotateNotice"') !== -1);
  assertTrue(html.indexOf("function startGameWhenLandscape()") !== -1);
  assertTrue(html.indexOf("startLoop();") !== -1);
  assertTrue(html.indexOf('src="resources/pitch.jpg"') !== -1);
  assertTrue(html.indexOf('src="game/configuration.js') !== -1);
  assertTrue(html.indexOf('src="io/io.js') !== -1);
});
