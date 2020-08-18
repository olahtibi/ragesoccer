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
  this.kickVelocity = [300, 200, 100, 0, 0];  // Pixels per second, for 500 ms long each step
  this.kickVelocityZ = [30, -30, 5, -5, 0];   // Pixels per second, for 500 ms long each step
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