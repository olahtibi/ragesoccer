var BoundaryDetector = function(config, ball) {
  this._config = config;
  this._ball = ball;
  this._previousPosition = new Vector2d(ball.position.x, ball.position.y);
  this._outside = false;
};

// Public API

BoundaryDetector.prototype.update = function() {
  var current = new Vector2d(this._ball.position.x, this._ball.position.y);
  if (!this._config.restarts.outOfPlayEnabled) {
    this._previousPosition = current;
    this._outside = false;
    return null;
  }

  var crossing = this._firstCrossing(this._previousPosition, current);
  var currentlyOutside = this._isOutside(current);
  if (!currentlyOutside) {
    this._previousPosition = current;
    this._outside = false;
    return null;
  }
  if (this._outside) return null;

  this._outside = true;
  var lastInBounds = this._previousPosition;
  this._previousPosition = current;
  if (crossing == null) return null;
  crossing.lastTouchedBy = this._ball.lastTouchedBy;
  crossing.lastInBounds = new Vector2d(lastInBounds.x, lastInBounds.y);
  return crossing;
};

// Private helpers

BoundaryDetector.prototype._isOutside = function(position) {
  var bounds = this._bounds();
  return position.x < bounds.left || position.x > bounds.right ||
    position.y < bounds.top || position.y > bounds.bottom;
};

BoundaryDetector.prototype._bounds = function() {
  var radius = this._ball.ballRadius || this._config.ball.radius || 0;
  return {
    left: this._config.pitch.fieldLeft - radius,
    right: this._config.pitch.fieldRight + radius,
    top: this._config.pitch.fieldTop - radius,
    bottom: this._config.pitch.fieldBottom + radius
  };
};

BoundaryDetector.prototype._firstCrossing = function(from, to) {
  var bounds = this._bounds();
  var candidates = [];
  this._addVerticalCrossing(candidates, "left", bounds.left, from, to);
  this._addVerticalCrossing(candidates, "right", bounds.right, from, to);
  this._addHorizontalCrossing(candidates, "top", bounds.top, from, to);
  this._addHorizontalCrossing(candidates, "bottom", bounds.bottom, from, to);
  if (candidates.length == 0) return null;
  candidates.sort(function(a, b) { return a.t - b.t; });
  return candidates[0];
};

BoundaryDetector.prototype._addVerticalCrossing = function(candidates, boundary, x, from, to) {
  var dx = to.x - from.x;
  if (dx == 0) return;
  var t = (x - from.x) / dx;
  if (t < 0 || t > 1) return;
  var y = from.y + (to.y - from.y) * t;
  var bounds = this._bounds();
  if (y < bounds.top || y > bounds.bottom) return;
  candidates.push({ boundary: boundary, position: new Vector2d(x, y), t: t });
};

BoundaryDetector.prototype._addHorizontalCrossing = function(candidates, boundary, y, from, to) {
  var dy = to.y - from.y;
  if (dy == 0) return;
  var t = (y - from.y) / dy;
  if (t < 0 || t > 1) return;
  var x = from.x + (to.x - from.x) * t;
  var bounds = this._bounds();
  if (x < bounds.left || x > bounds.right) return;
  candidates.push({ boundary: boundary, position: new Vector2d(x, y), t: t });
};

BoundaryDetector.prototype.reset = function() {
  this._previousPosition = new Vector2d(this._ball.position.x, this._ball.position.y);
  this._outside = false;
};
