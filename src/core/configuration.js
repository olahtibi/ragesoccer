var Configuration = function() {
  this.pitch = {
    boxTopLeft: new Vector2d(50, 80),
    boxTopRight: new Vector2d(625, 80),
    boxBottomLeft: new Vector2d(50, 785),
    boxBottomRight: new Vector2d(625, 785),
    goalTopTopLeft: new Vector2d(300, 90),
    goalTopTopRight: new Vector2d(372, 90),
    goalTopBottomLeft: new Vector2d(300, 113),
    goalTopBottomRight: new Vector2d(372, 113),
    goalBottomTopLeft: new Vector2d(300, 753),
    goalBottomTopRight: new Vector2d(372, 753),
    goalBottomBottomLeft: new Vector2d(300, 763),
    goalBottomBottomRight: new Vector2d(372, 763),
    fieldLeft: 81,
    fieldRight: 590,
    fieldTop: 113,
    fieldBottom: 753,
    stadiumWidth: 672,
    stadiumHeight: 848,
    centerCircleRadiusX: 62,
    centerCircleRadiusY: 40,
    initialBallPosition: new Vector3d(334, 433, 0),
    aiCenterY: 433
  };

  this.viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
    ratio: 0.7,
    overlayMinRatio: 0.6,
    overlayMaxRatio: 0.8
  };

  // Physics tuning uses pixel units and seconds.
  this.physics = {
    baseKickBoost: 120,
    playerMomentumTransfer: 1.8,
    maxKickSpeed: 520,
    baseLoft: 55,
    kickLoftFactor: 0.35,
    ballPlayerRestitution: 0.35,
    ballFriction: 1.6,
    ballAirFriction: 0.35,
    gravity: 380,
    ballGroundRestitution: 0.55,
    groundImpactDamping: 0.88,
    minBounceVelocity: 25,
    wallRestitution: 0.7,
    minVelocity: 3,
    ballContactMaxZ: 5,
    maxDeltaSeconds: 0.1,
    contactEpsilon: 0.01,
    zeroDistanceEpsilon: 0.0001,
    statsSampleFrames: 100,
    fpsDisplayIntervalMs: 250
  };

  this.ball = {
    radius: 2,
    spinPxPerPhase: 6,
    spritePhases: 4,
    heldOffsetX: 5,
    heldOffsetY: -8,
    shadowFrame: 4,
    shadowOffset: 1
  };

  this.player = {
    radius: 4,
    stepPxPerPhase: 4,
    spriteWidth: 10,
    spriteHeight: 16,
    spriteCenterX: 6,
    spriteCenterY: 13,
    spriteSourceRowHeight: 18,
    spritePhases: 3,
    animationDirectionResponseRate: 18,
    animationDirectionConfidenceThreshold: 0.75,
    animationIdleGraceSeconds: 0.05,
    animationMaxDeltaSeconds: 0.1
  };

  this.teams = {
    minStrength: 1,
    maxStrength: 10,
    homeStrength: 6,
    awayStrength: 6,
    homeSize: 11,
    awaySize: 11,
    minVelocity: 35,
    velocityRange: 30
  };

  this.ai = {
    enabled: true,
    goalieDistance: 30,
    formationDefenderProgress: -200,
    formationMidfielderProgress: 0,
    formationStrikerProgress: 130,
    formationStateShift: 55,
    formationDefenderDefenseShift: 25,
    kickoffMidfielderProgress: -100,
    arrivalSlowRadius: 36,
    arrivalMinSpeedFactor: 0.35,
    minTeammateSpacing: 36,
    formationPaceVariation: 0.08,
    formationLateralVariation: 20,
    formationDepthVariation: 22,
    formationWanderLateral: 17,
    formationWanderDepth: 32,
    formationWanderIntervalMin: 1.2,
    formationWanderIntervalMax: 2.8,
    formationBallResponseVariation: 0.30,
    formationTargetResponseMin: 2,
    formationTargetResponseMax: 5,
    formationDefenderBallInfluence: 0.08,
    formationMidfielderBallInfluence: 0.14,
    formationStrikerBallInfluence: 0.10,
    formationDefenderMaxShift: 18,
    formationMidfielderMaxShift: 28,
    formationStrikerMaxShift: 22,
    formationSeparationMaxShift: 12,
    targetDeadband: 2,
    targetResumeRadius: 4,
    targetReachedRadius: 1,
    attackerSwitchHysteresisDistance: 20,
    formationFallbackDepth: 20,
    fieldClampClearance: 1,
    attackSetupDistance: 14,
    attackRunThroughDistance: 18,
    attackDetourStepRadians: Math.PI / 6,
    attackAimToleranceRadians: 0.15,
    attackAimCorrectionToleranceRadians: 0.05,
    attackAimReleaseToleranceRadians: 0.30,
    attackCorrectionReachedRadius: 0.1,
    attackDetourRadius: 10,
    attackCloseDistance: 26,
    attackOrbitCommitAngle: Math.PI - 0.3
  };

  this.restarts = {
    kickoffSide: "home",
    kickoffTakerDistance: 8,
    outOfPlayEnabled: true,
    outOfPlayDelaySeconds: 0.35,
    opponentDelaySeconds: 1,
    opponentDistance: 45,
    placementClearance: 1,
    positionVariationX: 10,
    positionVariationY: 12,
    goalKickDistance: 25,
    goalKickTakerDistance: 20,
    cornerCrossDistance: 65,
    cornerBoxSpacing: 34,
    cornerBoxDepth: 45,
    cornerBoxDepthStep: 15,
    cornerLateDepth: 115,
    cornerEdgeDepth: 145,
    cornerShortInset: 50,
    cornerShortDepth: 35,
    cornerLateRunReleaseDistance: 35,
    throwInSpeed: 180,
    throwInLoft: 90,
    takerClearance: 2
  };

  this.cutscene = {
    arrivedRadius: 3,
    cameraArrivedRadius: 2,
    cameraLerp: 0.06
  };

  this.input = {
    humanSwitchHysteresisDistance: 20
  };

  this.assets = {
    pitch: document.getElementById("pitch"),
    ball: document.getElementById("ball"),
    playerHome: document.getElementById("player-home"),
    playerAway: document.getElementById("player-away"),
    canvas: document.getElementById("myCanvas")
  };

  this.debug = {
    enabled: true,
    logSeconds: 3,
    logEveryNFrames: 4
  };

  this._applyQueryOptions();
};

// Public API

Configuration.prototype.strengthToVelocity = function(strength) {
  strength = this._parseIntOption(
    strength,
    this.teams.homeStrength,
    this.teams.minStrength,
    this.teams.maxStrength
  );
  return this.teams.minVelocity +
    (strength - this.teams.minStrength) *
    (this.teams.velocityRange / (this.teams.maxStrength - this.teams.minStrength));
};

Configuration.prototype.teamVelocity = function(teamSide) {
  var strength = teamSide == "away" ? this.teams.awayStrength : this.teams.homeStrength;
  return this.strengthToVelocity(strength);
};

Configuration.prototype.computeScaleBy = function() {
  var scaleBy;
  if (this.viewport.width > this.viewport.height) {
    scaleBy = this.viewport.width / (this.pitch.stadiumWidth * this.viewport.ratio);
  } else {
    scaleBy = this.viewport.height / (this.pitch.stadiumHeight * this.viewport.ratio);
  }
  return Math.round(scaleBy);
};

// Private helpers

Configuration.prototype._applyQueryOptions = function() {
  var params = this._queryParams();
  this.teams.homeStrength = this._parseIntOption(
    params.playerStrength,
    this.teams.homeStrength,
    this.teams.minStrength,
    this.teams.maxStrength
  );
  this.teams.awayStrength = this._parseIntOption(
    params.opponentStrength,
    this.teams.awayStrength,
    this.teams.minStrength,
    this.teams.maxStrength
  );
  this.teams.homeSize = this._parseIntOption(params.homeTeamSize, this.teams.homeSize, 1, 11);
  this.teams.awaySize = this._parseIntOption(params.awayTeamSize, this.teams.awaySize, 1, 11);
  this.restarts.kickoffSide = this._parseSideOption(params.kickoffSide, this.restarts.kickoffSide);
  this.restarts.outOfPlayEnabled = this._parseBooleanOption(
    params.outOfPlayRestartsEnabled,
    this.restarts.outOfPlayEnabled
  );
};

Configuration.prototype._queryParams = function() {
  var result = {};
  if (typeof window === "undefined" || window.location == null || !window.location.search) {
    return result;
  }

  var search = window.location.search;
  if (search.charAt(0) === "?") search = search.substring(1);
  if (search.length === 0) return result;

  var parts = search.split("&");
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].split("=");
    var key = decodeURIComponent(pair[0] || "");
    if (key.length === 0) continue;
    result[key] = decodeURIComponent(pair[1] || "");
  }
  return result;
};

Configuration.prototype._parseIntOption = function(paramsValue, defaultValue, minValue, maxValue) {
  var value = parseInt(paramsValue, 10);
  if (!isFinite(value)) value = defaultValue;
  if (value < minValue) value = minValue;
  if (value > maxValue) value = maxValue;
  return value;
};

Configuration.prototype._parseSideOption = function(paramsValue, defaultValue) {
  if (paramsValue == "home" || paramsValue == "away") return paramsValue;
  return defaultValue;
};

Configuration.prototype._parseBooleanOption = function(paramsValue, defaultValue) {
  if (paramsValue == "true") return true;
  if (paramsValue == "false") return false;
  return defaultValue;
};
