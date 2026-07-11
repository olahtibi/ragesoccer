var testlib = require("../testlib");
var makeFixture = require("../helpers").makeFixture;

var test = testlib.test;
var assertNear = testlib.assertNear;

test("Camera snaps viewport translation to device pixels", function() {
  var originalDevicePixelRatio = window.devicePixelRatio;
  window.devicePixelRatio = 2;
  var fixture = makeFixture();
  fixture.config.viewportWidth = 501;
  fixture.config.viewportHeight = 300;
  fixture.config.viewportRatio = 0.7;
  fixture.ball.position.x = 200;
  fixture.ball.position.y = 300;
  var camera = new Camera(fixture.config, fixture.stadium);
  var translateArgs = null;
  var ctx = {
    save: function() {},
    scale: function() {},
    translate: function(x, y) {
      translateArgs = {
        x: x,
        y: y
      };
    }
  };

  try {
    camera.windowToViewport(ctx);
  } finally {
    window.devicePixelRatio = originalDevicePixelRatio;
  }

  var scaleBy = fixture.config.computeScaleBy();
  assertNear(translateArgs.x * scaleBy * 2, Math.round(translateArgs.x * scaleBy * 2), 0.0001);
  assertNear(translateArgs.y * scaleBy * 2, Math.round(translateArgs.y * scaleBy * 2), 0.0001);
});
