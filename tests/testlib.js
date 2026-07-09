var tests = [];
var currentSuite = "Tests";

var symbols = {
  pass: "\u2713",
  fail: "\u2717"
};

var colors = {
  green: "\u001b[32m",
  red: "\u001b[31m",
  bold: "\u001b[1m",
  reset: "\u001b[0m"
};

function colorize(color, text) {
  if (!process.stdout.isTTY) {
    return text;
  }
  return colors[color] + text + colors.reset;
}

function suite(name) {
  currentSuite = name;
}

function test(name, fn) {
  tests.push({ suite: currentSuite, name: name, fn: fn });
}

function fail(message) {
  throw new Error(message);
}

function assertTrue(value, message) {
  if (!value) {
    fail(message || "Expected value to be true");
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    fail((message || "Values are not equal") + ": expected " + expected + ", got " + actual);
  }
}

function assertNear(actual, expected, epsilon, message) {
  if (Math.abs(actual - expected) > epsilon) {
    fail((message || "Values are not near") + ": expected " + expected + ", got " + actual);
  }
}

function runTests() {
  var passed = 0;
  var currentPrintedSuite = null;

  for (var i = 0; i < tests.length; i++) {
    var entry = tests[i];
    if (entry.suite !== currentPrintedSuite) {
      currentPrintedSuite = entry.suite;
      console.log("");
      console.log(colorize("bold", currentPrintedSuite));
    }

    try {
      entry.fn();
      passed++;
      console.log("  " + colorize("green", symbols.pass) + " " + entry.name);
    } catch (err) {
      console.log("  " + colorize("red", symbols.fail) + " " + entry.name);
      console.log("    " + colorize("red", err.message));
      if (err.stack) {
        console.log(err.stack.split("\n").slice(1).map(function(line) {
          return "    " + line;
        }).join("\n"));
      }
    }
  }

  console.log("");
  var summary = passed + "/" + tests.length + " tests passed";
  if (passed === tests.length) {
    console.log(colorize("green", symbols.pass + " " + summary));
  } else {
    console.log(colorize("red", symbols.fail + " " + summary));
  }

  if (passed !== tests.length) {
    process.exitCode = 1;
  }
}

module.exports = {
  suite: suite,
  test: test,
  assertTrue: assertTrue,
  assertEqual: assertEqual,
  assertNear: assertNear,
  runTests: runTests
};
