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
  this.attackDistance = 120;
  this.attackWidth = 70;
  this.defenderDistance = 85;
  this.goalieDistance = 30;
  this.ballRadius = 2;
  this.playerRadius = 4;
  this.imgPitch = document.getElementById("pitch");
  this.imgBall = document.getElementById("ball");
  this.imgPlayerHome = document.getElementById("player-home");
  this.imgPlayerAway = document.getElementById("player-away");
  this.objCanvas = document.getElementById("myCanvas");
  this.initialBallPosition = new Vector3d(334, 433, 0);
  this.initialPlayerHomePosition = new Vector2d(332, 480);
  this.initialPlayerAwayPosition = new Vector2d(334, 400);
  this.homeTeamSize = 4;
  this.awayTeamSize = 4;
  this.playerVelocity = 50; // Pixels per second
  this.playerSpriteWidth = 10 //10;
  this.playerSpriteHeight = 16 //18;
  this.playerSpriteCenterX = 6;
  this.playerSpriteCenterY = 13;
};

Configuration.prototype.comnputeScaleBy = function() {
  if(this.viewportWidth > this.viewportHeight) {
    return this.viewportWidth / (this.stadiumWidth * this.viewportRatio);  
  }
  else {
    return this.viewportHeight / (this.stadiumHeight * this.viewportRatio);
  }
};

Configuration.prototype.initialPlayerPositions = function(teamSide) {
  var positions;
  if (teamSide == "home") {
    positions = [
      this.initialPlayerHomePosition,
      new Vector2d(250, 560),
      new Vector2d(420, 560),
      new Vector2d(250, 650),
      new Vector2d(420, 650)
    ];
  } else {
    positions = [
      this.initialPlayerAwayPosition,
      new Vector2d(250, 320),
      new Vector2d(420, 320),
      new Vector2d(250, 230),
      new Vector2d(420, 230)
    ];
  }

  var size = teamSide == "home" ? this.homeTeamSize : this.awayTeamSize;
  if (size < 1) size = 1;
  if (size > positions.length) size = positions.length;

  var result = [];
  for (var i = 0; i < size; i++) {
    result.push(new Vector2d(positions[i].x, positions[i].y));
  }
  return result;
};
