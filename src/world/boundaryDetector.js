var BoundaryDetector = function(config, ball) {
  this.config = config;
  this.ball = ball;
  this.previousPosition = new Vector2d(ball.position.x, ball.position.y);
  this.outside = false;
};

BoundaryDetector.prototype.update = function() {
  var current = new Vector2d(this.ball.position.x, this.ball.position.y);
  if (!this.config.outOfPlayRestartsEnabled) {
    this.previousPosition = current;
    this.outside = false;
    return null;
  }

  var crossing = this.firstCrossing(this.previousPosition, current);
  var currentlyOutside = this.isOutside(current);
  if (!currentlyOutside) {
    this.previousPosition = current;
    this.outside = false;
    return null;
  }
  if (this.outside) return null;

  this.outside = true;
  var lastInBounds = this.previousPosition;
  this.previousPosition = current;
  if (crossing == null) return null;
  crossing.lastTouchedBy = this.ball.lastTouchedBy;
  crossing.lastInBounds = new Vector2d(lastInBounds.x, lastInBounds.y);
  return crossing;
};

BoundaryDetector.prototype.isOutside = function(position) {
  var bounds = this.bounds();
  return position.x < bounds.left || position.x > bounds.right ||
    position.y < bounds.top || position.y > bounds.bottom;
};

BoundaryDetector.prototype.bounds = function() {
  var radius = this.ball.ballRadius || this.config.ballRadius || 0;
  return {
    left: this.config.fieldLeft - radius,
    right: this.config.fieldRight + radius,
    top: this.config.fieldTop - radius,
    bottom: this.config.fieldBottom + radius
  };
};

BoundaryDetector.prototype.firstCrossing = function(from, to) {
  var bounds = this.bounds();
  var candidates = [];
  this.addVerticalCrossing(candidates, "left", bounds.left, from, to);
  this.addVerticalCrossing(candidates, "right", bounds.right, from, to);
  this.addHorizontalCrossing(candidates, "top", bounds.top, from, to);
  this.addHorizontalCrossing(candidates, "bottom", bounds.bottom, from, to);
  if (candidates.length == 0) return null;
  candidates.sort(function(a, b) { return a.t - b.t; });
  return candidates[0];
};

BoundaryDetector.prototype.addVerticalCrossing = function(candidates, boundary, x, from, to) {
  var dx = to.x - from.x;
  if (dx == 0) return;
  var t = (x - from.x) / dx;
  if (t < 0 || t > 1) return;
  var y = from.y + (to.y - from.y) * t;
  var bounds = this.bounds();
  if (y < bounds.top || y > bounds.bottom) return;
  candidates.push({ boundary: boundary, position: new Vector2d(x, y), t: t });
};

BoundaryDetector.prototype.addHorizontalCrossing = function(candidates, boundary, y, from, to) {
  var dy = to.y - from.y;
  if (dy == 0) return;
  var t = (y - from.y) / dy;
  if (t < 0 || t > 1) return;
  var x = from.x + (to.x - from.x) * t;
  var bounds = this.bounds();
  if (x < bounds.left || x > bounds.right) return;
  candidates.push({ boundary: boundary, position: new Vector2d(x, y), t: t });
};

BoundaryDetector.prototype.reset = function() {
  this.previousPosition = new Vector2d(this.ball.position.x, this.ball.position.y);
  this.outside = false;
};
