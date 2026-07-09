var tests = [];

function test(name, fn) {
  tests.push({ name: name, fn: fn });
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

  for (var i = 0; i < tests.length; i++) {
    var entry = tests[i];
    try {
      entry.fn();
      passed++;
      console.log("PASS " + entry.name);
    } catch (err) {
      console.log("FAIL " + entry.name);
      console.log("  " + err.message);
      if (err.stack) {
        console.log(err.stack.split("\n").slice(1).join("\n"));
      }
    }
  }

  console.log("");
  console.log(passed + "/" + tests.length + " tests passed");

  if (passed !== tests.length) {
    process.exitCode = 1;
  }
}

module.exports = {
  test: test,
  assertTrue: assertTrue,
  assertEqual: assertEqual,
  assertNear: assertNear,
  runTests: runTests
};
