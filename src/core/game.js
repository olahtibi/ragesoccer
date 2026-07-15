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
  this.debugLog = options.debugLog;
};

Game.prototype.context = function() {
  return {
    game: this,
    config: this.config,
    stadium: this.stadium,
    ball: this.stadium.ball,
    teams: this.teams,
    teamAis: this.teamAis,
    humanController: this.humanController
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

Game.prototype.resumeFromInput = function() {
  return this.matchFlow.resumeFromInput();
};

Game.prototype.beginRestart = function(type, awardedTo) {
  return this.matchFlow.beginRestart({ type: type, awardedTo: awardedTo }, this.context());
};

Game.prototype.updateAi = function() {
  this.humanController.selectPlayer();
  for (var i = 0; i < this.teamAis.length; i++) {
    var teamAi = this.teamAis[i];
    teamAi.update({
      restartActive: this.matchFlow.isRestartActive(),
      canMove: !this.matchFlow.isRestartActive() || this.restartController.canTeamMove(teamAi.team)
    });
  }
};

Game.prototype.update = function() {
  var context = this.context();
  var mode = this.matchFlow.simulationMode();
  if (mode == "none") {
    this.physics.resetClock();
  } else if (mode == "playersOnly") {
    this.restartController.updateBeforePhysics(context);
    this.physics.updatePlayersOnly();
    this.matchFlow.updateAfterPhysics(context);
  } else {
    this.updateAi();
    var canMove = !this.matchFlow.isRestartActive() || this.restartController.canTeamMove(this.teams[0]);
    this.humanController.update(canMove);
    this.physics.update();
    this.matchFlow.updateAfterPhysics(context);
    this.updateScore();
  }
  this.debugLog.record(this);
};

Game.prototype.updateScore = function() {
  var scoredBy = this.goalDetector.update();
  if (scoredBy == null) return;
  var scoringTeam = null;
  var concedingTeam = null;
  for (var i = 0; i < this.teams.length; i++) {
    if (this.teams[i].side == scoredBy) {
      scoringTeam = this.teams[i];
    } else {
      concedingTeam = this.teams[i];
    }
  }
  if (scoringTeam == null || concedingTeam == null) return;
  scoringTeam.score++;
  this.beginRestart("kickoff", concedingTeam.side);
};

Game.prototype.render = function(ctx) {
  this.camera.windowToViewport(ctx);
  this.stadium.draw(ctx);
  if (this.isPaused()) this.drawAiDebug(ctx);
  this.camera.renderOverlay(ctx, this.physics.displayFps);
};

Game.prototype.drawAiDebug = function(ctx) {
  for (var i = 0; i < this.teamAis.length; i++) {
    this.teamAis[i].draw(ctx);
  }
};

function createGame(config) {
  var ball = new Ball(config.imgBall, config.ballRadius, config.initialBallPosition);
  var homeTeam = new Team(config, "home");
  var awayTeam = new Team(config, "away");
  var teams = [homeTeam, awayTeam];
  var stadium = new Stadium(config.imgPitch, ball, homeTeam, awayTeam);
  var teamAis = [
    new TeamAi(config, homeTeam, awayTeam, ball),
    new TeamAi(config, awayTeam, homeTeam, ball)
  ];
  var camera = new Camera(config, stadium);
  var physics = new Physics(config, stadium);
  var goalDetector = new GoalDetector(config, ball);
  var humanController = new HumanController(config, homeTeam, ball);
  var cutscene = new CutsceneController(config);
  var registry = new RestartRegistry();
  registry.register("kickoff", new KickoffRestart(config));
  var restartController = new RestartController(registry, cutscene);
  var matchFlow = new MatchFlow(restartController);
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
    debugLog: new DebugLog(config)
  });
  matchFlow.beginRestart(
    { type: "kickoff", awardedTo: config.kickoffSide },
    game.context(),
    { skipPositioning: true }
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
  var canvas = game.config.objCanvas;
  canvas.width = game.config.viewportWidth;
  canvas.height = game.config.viewportHeight;
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
