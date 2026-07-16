var RestartRegistry = function() {
  this._strategies = {};
};

// Public API

RestartRegistry.prototype.register = function(type, strategy) {
  this._strategies[type] = strategy;
};

RestartRegistry.prototype.get = function(type) {
  return this._strategies[type] || null;
};
