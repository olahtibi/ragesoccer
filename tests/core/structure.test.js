var fs = require("fs");
var path = require("path");
var testlib = require("../testlib");

var test = testlib.test;
var assertTrue = testlib.assertTrue;

var sourceRoot = path.resolve(__dirname, "../../src");

function javascriptFiles(directory) {
  var result = [];
  var entries = fs.readdirSync(directory, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var fullPath = path.join(directory, entries[i].name);
    if (entries[i].isDirectory()) result = result.concat(javascriptFiles(fullPath));
    else if (/\.js$/.test(entries[i].name)) result.push(fullPath);
  }
  return result;
}

test("Prototype classes identify their public API", function() {
  var files = javascriptFiles(sourceRoot);
  for (var i = 0; i < files.length; i++) {
    var source = fs.readFileSync(files[i], "utf8");
    if (source.indexOf(".prototype.") === -1) continue;
    assertTrue(
      source.indexOf("Public API") !== -1,
      path.relative(sourceRoot, files[i]) + " is missing a Public API header"
    );
  }
});

test("Cutscene uses the sceneTeams contract and private helper names", function() {
  var source = fs.readFileSync(path.join(sourceRoot, "core/cutscene.js"), "utf8");
  assertTrue(source.indexOf("options.sceneTeams") !== -1);
  assertTrue(source.indexOf("this._sceneTeams") !== -1);
  assertTrue(source.indexOf("prototype._movePlayerToTarget") !== -1);
  assertTrue(source.indexOf("prototype.movePlayerToTarget") === -1);
});
