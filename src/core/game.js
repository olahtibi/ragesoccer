var Game = function(options) {
  this.config = options.config;
  this.stadium = options.stadium;
  this.teams = options.teams;
  this.teamAis = options.teamAis;
  this.camera = options.camera;
  this.physics = options.physics;
  this.goalDetector = options.goalDetector;
  this.humanController = options.humanController;
  this.cutscene = options.cutscene;
  this.restartController = options.restartController;
  this.matchFlow = options.matchFlow;
  this.debugTool = options.debugTool;
};

// Public API

Game.prototype.context = function() {
  return {
    config: this.config,
    stadium: this.stadium,
    ball: this.stadium.ball,
    teams: this.teams,
    teamAis: this.teamAis,
    humanController: this.humanController,
    camera: this.camera
  };
};

Game.prototype.isPaused = function() {
  return this.matchFlow.isPaused();
};

Game.prototype.togglePause = function() {
  if (this.matchFlow.isPaused()) {
    this.matchFlow.resume();
  } else {
    this.matchFlow.pause();
  }
};

Game.prototype.resumeFromInput = function(direction) {
  return this.matchFlow.resumeFromInput(this.context(), direction);
};

Game.prototype.beginRestart = function(type, awardedTo, details) {
  var request = {};
  details = details || {};
  for (var key in details) request[key] = details[key];
  request.type = type;
  request.awardedTo = awardedTo;
  return this.matchFlow.beginRestart(request, this.context());
};

Game.prototype.update = function() {
  var context = this.context();
  var mode = this.matchFlow.simulationMode();
  if (mode == "none") {
    this.physics.resetClock();
  } else if (mode == "ballOnly") {
    this.physics.updateBallOnly();
    this.matchFlow.updateAfterPhysics(context, this.physics.lastDt);
  } else if (mode == "playersOnly") {
    this.matchFlow.updateBeforePhysics(context);
    this.physics.updatePlayersOnly();
    this.matchFlow.updateAfterPhysics(context, this.physics.lastDt);
  } else {
    this._updateAi();
    var canMove = !this.matchFlow.isRestartActive() || this.restartController.canTeamMove(this.teams[0]);
    this.humanController.update(canMove);
    this.physics.update();
    this.matchFlow.updateAfterPhysics(context, this.physics.lastDt);
    if (!this._handleGoalDetection()) this.matchFlow.detectOutOfPlay(context);
  }
  this.debugTool.record(this);
};

Game.prototype.render = function(ctx) {
  this.camera.windowToViewport(ctx);
  this.stadium.draw(ctx);
  if (this.isPaused()) this.debugTool.draw(ctx, this.teamAis);
  this.camera.renderOverlay(ctx, this.physics.displayFps);
};

// Private helpers

Game.prototype._updateAi = function() {
  this.humanController.selectPlayer();
  for (var i = 0; i < this.teamAis.length; i++) {
    var teamAi = this.teamAis[i];
    teamAi.update({
      deltaSeconds: this.physics.lastDt,
      restartActive: this.matchFlow.isRestartActive(),
      canMove: !this.matchFlow.isRestartActive() || this.restartController.canTeamMove(teamAi.team),
      restartTaker: this.matchFlow.isRestartActive() ?
        this.restartController.taker(teamAi.team) : null,
      positioningTargets: this.matchFlow.isRestartActive() ?
        this.restartController.positioningTargets(teamAi.team) : null,
      attackTarget: this.matchFlow.isRestartActive() ?
        this.restartController.attackTarget(teamAi.team) : null
    });
  }
};

Game.prototype._handleGoalDetection = function() {
  var scoredBy = this.goalDetector.update();
  if (scoredBy == null) return false;
  var scoringTeam = null;
  var concedingTeam = null;
  for (var i = 0; i < this.teams.length; i++) {
    if (this.teams[i].side == scoredBy) {
      scoringTeam = this.teams[i];
    } else {
      concedingTeam = this.teams[i];
    }
  }
  if (scoringTeam == null || concedingTeam == null) return false;
  scoringTeam.score++;
  this.beginRestart("kickoff", concedingTeam.side);
  return true;
};

function createGame(config) {
  var ball = new Ball(
    config.assets.ball,
    config.ball.radius,
    config.pitch.initialBallPosition,
    config.ball
  );
  var homeTeam = new Team(config, "home");
  var awayTeam = new Team(config, "away");
  var teams = [homeTeam, awayTeam];
  var stadium = new Stadium(config.assets.pitch, ball, homeTeam, awayTeam);
  var teamAis = [
    new TeamAi(config, homeTeam, awayTeam, ball),
    new TeamAi(config, awayTeam, homeTeam, ball)
  ];
  var camera = new Camera(config, stadium);
  var physics = new Physics(config, stadium);
  var goalDetector = new GoalDetector(config, ball);
  var boundaryDetector = new BoundaryDetector(config, ball);
  var humanController = new HumanController(config, homeTeam, ball);
  var cutscene = new CutsceneController(config);
  var registry = new RestartRegistry();
  registry.register("kickoff", new KickoffRestart(config));
  registry.register("throwIn", new ThrowInRestart(config));
  registry.register("corner", new CornerRestart(config));
  registry.register("goalKick", new GoalKickRestart(config));
  var restartController = new RestartController(registry, cutscene);
  var matchFlow = new MatchFlow(restartController, boundaryDetector);
  var game = new Game({
    config: config,
    stadium: stadium,
    teams: teams,
    teamAis: teamAis,
    camera: camera,
    physics: physics,
    goalDetector: goalDetector,
    humanController: humanController,
    cutscene: cutscene,
    restartController: restartController,
    matchFlow: matchFlow,
    debugTool: new DebugTool(config)
  });
  matchFlow.beginRestart(
    { type: "kickoff", awardedTo: config.restarts.kickoffSide },
    game.context(),
    { skipPositioning: true, positionImmediately: true }
  );
  return game;
}

function startLoop() {
  window.game = createGame(new Configuration());
  window.input = new BrowserInput(window.game, window);
  window.input.attach();
  window.ctx = createContext(window.game);
  window.requestAnimationFrame(renderNewFrame);
}

function createContext(game) {
  var canvas = game.config.assets.canvas;
  canvas.width = game.config.viewport.width;
  canvas.height = game.config.viewport.height;
  var ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;
  ctx.mozImageSmoothingEnabled = false;
  ctx.oImageSmoothingEnabled = false;
  ctx.webkitImageSmoothingEnabled = false;
  ctx.msImageSmoothingEnabled = false;
  return ctx;
}

function renderNewFrame() {
  window.game.update();
  window.game.render(window.ctx);
  window.requestAnimationFrame(renderNewFrame);
}
