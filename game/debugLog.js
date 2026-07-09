var DebugLog = function(config) {
  this.config = config;
  this.snapshots = [];
  this.events = [];
  this.frame = 0;
  this.startTimeMs = null;
};

DebugLog.prototype.record = function(game) {
  if (!this.config.debug) {
    return;
  }

  var everyNFrames = this.config.debugLogEveryNFrames || 1;
  var frame = this.frame;
  this.frame++;

  if (frame % everyNFrames !== 0) {
    return;
  }

  var snapshot = this.snapshot(game, frame, this.currentTimeSeconds());
  this.snapshots.push(snapshot);
  this.trim(snapshot.time);
};

DebugLog.prototype.recordKeyEvent = function(e) {
  if (!this.config.debug) {
    return;
  }

  var event = {
    time: this.round(this.currentTimeSeconds()),
    frame: this.frame,
    type: e.type,
    keyCode: e.keyCode
  };
  this.events.push(event);
  this.trim(event.time);
};

DebugLog.prototype.recordTouchEvent = function(target) {
  if (!this.config.debug) {
    return;
  }

  var event = {
    time: this.round(this.currentTimeSeconds()),
    frame: this.frame,
    type: "touch",
    target: this.vectorSnapshot(target)
  };
  this.events.push(event);
  this.trim(event.time);
};

DebugLog.prototype.dump = function() {
  if (!this.config.debug) {
    return;
  }

  console.log(JSON.stringify({
    type: "debugLog",
    frames: this.snapshots,
    events: this.events
  }));
};

DebugLog.prototype.trim = function(currentTime) {
  var seconds = this.config.debugLogSeconds;
  if (seconds == null || seconds < 0) {
    return;
  }

  var minTime = currentTime - seconds;
  while (this.snapshots.length > 0 && this.snapshots[0].time < minTime) {
    this.snapshots.shift();
  }
  while (this.events.length > 0 && this.events[0].time < minTime) {
    this.events.shift();
  }
};

DebugLog.prototype.snapshot = function(game, frame, time) {
  return {
    frame: frame,
    time: this.round(time),
    dt: this.round(game.physics && game.physics.lastDt != null ? game.physics.lastDt : 0),
    paused: game.paused,
    started: game.started,
    ball: this.ballSnapshot(game.stadium.ball),
    players: this.playersSnapshot(game.stadium),
    ai: this.aiSnapshot(game.stadium)
  };
};

DebugLog.prototype.ballSnapshot = function(ball) {
  return {
    pos: this.vectorSnapshot(ball.position),
    vel: this.vectorSnapshot(ball.velocity)
  };
};

DebugLog.prototype.playersSnapshot = function(stadium) {
  var result = [];
  for (var t = 0; t < stadium.teams.length; t++) {
    var team = stadium.teams[t];
    for (var i = 0; i < team.players.length; i++) {
      var player = team.players[i];
      result.push({
        team: team.side,
        i: i,
        pos: this.vectorSnapshot(player.position),
        vel: this.vectorSnapshot(player.velocity),
        facing: [this.round(player.facingX), this.round(player.facingY)],
        phase: player.phaseIndex,
        step: this.round(player.stepDistance),
        human: player === stadium.humanPlayer
      });
    }
  }
  return result;
};

DebugLog.prototype.aiSnapshot = function(stadium) {
  var result = [];
  for (var t = 0; t < stadium.teams.length; t++) {
    var team = stadium.teams[t];
    for (var i = 0; i < team.aiControllers.length; i++) {
      var ai = team.aiControllers[i];
      result.push({
        team: team.side,
        i: i,
        role: ai.role,
        state: ai.state,
        roleTarget: this.vectorSnapshot(ai.roleTarget),
        target: this.vectorSnapshot(ai.tPos)
      });
    }
  }
  return result;
};

DebugLog.prototype.vectorSnapshot = function(vector) {
  if (vector == null) {
    return null;
  }

  var result = {
    x: this.round(vector.x),
    y: this.round(vector.y)
  };
  if (vector.z != null) {
    result.z = this.round(vector.z);
  }
  return result;
};

DebugLog.prototype.round = function(value) {
  if (typeof value !== "number") {
    return value;
  }
  return Math.round(value * 100) / 100;
};

DebugLog.prototype.nowMs = function() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
};

DebugLog.prototype.currentTimeSeconds = function() {
  var now = this.nowMs();
  if (this.startTimeMs == null) {
    this.startTimeMs = now;
  }
  return (now - this.startTimeMs) / 1000;
};
