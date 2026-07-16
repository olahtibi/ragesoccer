require("./helpers").loadGameScripts();

var fs = require("fs");
var path = require("path");
var testlib = require("./testlib");

function findTestFiles(directory) {
  var result = [];
  var entries = fs.readdirSync(directory, { withFileTypes: true });
  for (var i = 0; i < entries.length; i++) {
    var entry = entries[i];
    var fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result = result.concat(findTestFiles(fullPath));
    } else if (/\.test\.js$/.test(entry.name)) {
      result.push(fullPath);
    }
  }
  return result;
}

findTestFiles(__dirname).sort().forEach(function(testPath) {
  var relativePath = path.relative(__dirname, testPath).replace(/\.test\.js$/, "");
  testlib.suite(relativePath.split(path.sep));
  require(testPath);
});

testlib.runTests();
