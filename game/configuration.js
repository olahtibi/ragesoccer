var Configuration = function () {
  this.boxTopLeft = new Vector2d(50, 80);
  this.boxTopRight = new Vector2d(625, 80);
  this.boxBottomLeft = new Vector2d(50, 785);
  this.boxBottomRight = new Vector2d(625, 785);
  this.goalTopTopLeft = new Vector2d(300, 90);
  this.goalTopTopRight = new Vector2d(372, 90);
  this.goalTopBottomLeft = new Vector2d(300, 113);
  this.goalTopBottomRight = new Vector2d(372, 113);
  this.goalBottomTopLeft = new Vector2d(300, 753);
  this.goalBottomTopRight = new Vector2d(372, 753);
  this.goalBottomBottomLeft = new Vector2d(300, 763);
  this.goalBottomBottomRight = new Vector2d(372, 763);
  this.stadiumWidth = 672;
  this.stadiumHeight = 848;
  this.viewportWidth = window.innerWidth;
  this.viewportHeight = window.innerHeight;
  this.viewportRatio = 0.7;
  // Ball physics tuning (all in pixel units, seconds).
  this.baseKickBoost = 120;             // Minimum outward impulse on contact.
  this.playerMomentumTransfer = 1.8;    // How much of player's closing speed becomes ball speed.
  this.maxKickSpeed = 520;              // Cap on horizontal ball speed.
  this.baseLoft = 55;                   // Vertical velocity added to every kick (visible small hop).
  this.kickLoftFactor = 0.35;           // Fraction of the outgoing kick impulse added as vertical lift.
  this.ballPlayerRestitution = 0.35;    // Bounciness of a passive ball-on-player collision.
  this.ballFriction = 1.6;              // Exponential rolling-friction rate on the ground.
  this.ballAirFriction = 0.35;          // Slower decay while airborne.
  this.gravity = 380;                   // Downward acceleration on z.
  this.ballGroundRestitution = 0.55;    // Bounce energy retained on ground impact.
  this.groundImpactDamping = 0.88;      // Horizontal speed retained on ground impact.
  this.minBounceVelocity = 25;          // vz below which the ball is considered at rest.
  this.wallRestitution = 0.7;           // Bounce off box walls and goalposts.
  this.minVelocity = 3;                 // Horizontal speed below which the ball snaps to rest.
  this.ballContactMaxZ = 5;             // Ball height above which players cannot touch it.
  this.ballSpinPxPerPhase = 6;          // Pixels of travel per sprite phase change (higher = slower spin).
  this.playerStepPxPerPhase = 4;        // Pixels of travel per walk-cycle sprite phase change.
  this.teamAiEnabled = true;
  this.minStrength = 1;
  this.maxStrength = 10;
  this.playerStrength = 6;
  this.opponentStrength = 6;
  this.attackDistance = 120;
  this.attackWidth = 70;
  this.defenderDistance = 85;
  this.goalieDistance = 30;
  this.aiArrivalSlowRadius = 8;
  this.aiMinBallSpacing = 72;
  this.aiMinTeammateSpacing = 36;
  this.aiPressReleaseDistance = 90;
  this.aiKeeperChallengeRadius = 70;
  this.aiTargetDeadband = 2;
  this.aiKickoffSpotRadius = 5;
  this.aiTargetReachedRadius = 1;
  this.humanSwitchHysteresisDistance = 20;
  this.ballRadius = 2;
  this.playerRadius = 4;
  this.imgPitch = document.getElementById("pitch");
  this.imgBall = document.getElementById("ball");
  this.imgPlayerHome = document.getElementById("player-home");
  this.imgPlayerAway = document.getElementById("player-away");
  this.objCanvas = document.getElementById("myCanvas");
  this.initialBallPosition = new Vector3d(334, 433, 0);
  this.aiCenterY = this.initialBallPosition.y;
  this.homeTeamSize = 4;
  this.awayTeamSize = 4;
  this.playerVelocity = 50; // Pixels per second
  this.playerSpriteWidth = 10 //10;
  this.playerSpriteHeight = 16 //18;
  this.playerSpriteCenterX = 6;
  this.playerSpriteCenterY = 13;
  this.debug = false;
  this.debugLogSeconds = 3;
  this.debugLogEveryNFrames = 4;
  this.applyQueryOptions();
};

Configuration.prototype.applyQueryOptions = function() {
  var params = this.queryParams();
  this.playerStrength = this.parseIntOption(params.playerStrength, this.playerStrength, this.minStrength, this.maxStrength);
  this.opponentStrength = this.parseIntOption(params.opponentStrength, this.opponentStrength, this.minStrength, this.maxStrength);
  this.homeTeamSize = this.parseIntOption(params.homeTeamSize, this.homeTeamSize, 1, 5);
  this.awayTeamSize = this.parseIntOption(params.awayTeamSize, this.awayTeamSize, 1, 5);
  this.playerVelocity = this.teamVelocity("home");
};

Configuration.prototype.queryParams = function() {
  var result = {};
  if (typeof window === "undefined" || window.location == null || !window.location.search) {
    return result;
  }

  var search = window.location.search;
  if (search.charAt(0) === "?") {
    search = search.substring(1);
  }
  if (search.length === 0) {
    return result;
  }

  var parts = search.split("&");
  for (var i = 0; i < parts.length; i++) {
    var pair = parts[i].split("=");
    var key = decodeURIComponent(pair[0] || "");
    if (key.length === 0) continue;
    result[key] = decodeURIComponent(pair[1] || "");
  }
  return result;
};

Configuration.prototype.parseIntOption = function(paramsValue, defaultValue, minValue, maxValue) {
  var value = parseInt(paramsValue, 10);
  if (!isFinite(value)) {
    value = defaultValue;
  }
  if (value < minValue) value = minValue;
  if (value > maxValue) value = maxValue;
  return value;
};

Configuration.prototype.strengthToVelocity = function(strength) {
  strength = this.parseIntOption(strength, this.playerStrength, this.minStrength, this.maxStrength);
  return 35 + (strength - this.minStrength) * (30 / (this.maxStrength - this.minStrength));
};

Configuration.prototype.teamVelocity = function(teamSide) {
  var strength = teamSide == "away" ? this.opponentStrength : this.playerStrength;
  return this.strengthToVelocity(strength);
};

Configuration.prototype.comnputeScaleBy = function() {
  if(this.viewportWidth > this.viewportHeight) {
    return this.viewportWidth / (this.stadiumWidth * this.viewportRatio);  
  }
  else {
    return this.viewportHeight / (this.stadiumHeight * this.viewportRatio);
  }
};
