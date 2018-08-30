var Physics = function (config, stadium) {
  this.config = config;
  this.stadium = stadium;
  this.lastUpdated = new Date().getTime();
  this.kickStarted = null;
  this.fps = 0.0;
  this.deltaArr = [0.0];
  this.frameNumber = 0;
}

Physics.prototype.update = function() {
  this.updatePlayerPosition();
  this.checkBallTouchCollision();
  this.updateBallPosition();
  this.updateStats();
};

Physics.prototype.updateStats = function() {
  this.frameNumber++;
  var currentTime = new Date().getTime();
  var deltaT = currentTime - this.lastUpdated;
  this.deltaArr[this.frameNumber % 100] = deltaT;
  var avg = 0.0;
  for(var i = 0; i < this.deltaArr.length; i++) {
    avg += this.deltaArr[i];
  }
  avg /= this.deltaArr.length;
  this.fps = 1000.0 / avg;
  this.lastUpdated = new Date().getTime();
}

Physics.prototype.updatePlayerPosition = function() {
  var currentTime = new Date().getTime();
  var deltaT = currentTime - this.lastUpdated;
  for (var i = 0; i < this.stadium.players.length; i++) {
    if(this.stadium.players[i].velocity.y != 0) {
      this.stadium.players[i].position.y += (this.stadium.players[i].velocity.y * deltaT / 1000.0);
    }
    if(this.stadium.players[i].velocity.x != 0) {
      this.stadium.players[i].position.x += (this.stadium.players[i].velocity.x * deltaT / 1000.0);
    }
  }  
};

Physics.prototype.checkBallTouchCollision = function() {
  for (var i = 0; i < this.stadium.players.length; i++) {
    var dist = this.config.ballRadius + this.config.playerRadius;
    var a = this.stadium.ball.position.x - this.stadium.players[i].position.x;
    var b = this.stadium.ball.position.y - this.stadium.players[i].position.y;
    if(Math.abs(a) < dist && Math.abs(b) < dist) {
      this.kickStarted = new Date().getTime();
      var c = Math.sqrt(Math.pow(a, 2) + Math.pow(b, 2));
      this.stadium.ball.kickDirection.x = a * (1 / c);
      this.stadium.ball.kickDirection.y = b * (1 / c);
    }
  }
};

Physics.prototype.updateBallPosition = function() {
    var currentTime = new Date().getTime();
    var deltaT = currentTime - this.lastUpdated;
    this.updateKickedBallVelocity(currentTime);   
    var moveArray = [0, 0];
    var moved = false;
    if(this.stadium.ball.velocity.x != 0) {
        moveArray[0] = this.stadium.ball.velocity.x * deltaT / 1000.0
        if(Math.abs(moveArray[0]) >= 1.0) {
            moved = true;
        }
    }
    if(this.stadium.ball.velocity.y != 0) {
        moveArray[1] = this.stadium.ball.velocity.y * deltaT / 1000.0;
        if(Math.abs(moveArray[1]) >= 1.0) {
            moved = true;
        }
    }
    this.checkBoxCollision(moveArray);
    this.checkGoalCollision(moveArray);
    this.stadium.ball.position.x += moveArray[0];
    this.stadium.ball.position.y += moveArray[1];
    if(this.stadium.ball.velocity.z != 0) {
        moveZ = this.stadium.ball.velocity.z * deltaT / 1000.0
        this.stadium.ball.position.z += moveZ;
    }
    if(moved) {
        this.stadium.ball.phaseIndex++;
        this.stadium.ball.phaseIndex %= 4;    
    }
};

Physics.prototype.updateKickedBallVelocity = function(currentTime) {
    if(this.kickStarted != 0) {        
        var phaseIndex = Math.floor((currentTime - this.kickStarted) / 500.0);
        if(phaseIndex < this.config.kickVelocity.length) {
            if(this.stadium.ball.kickDirection.x != 0) {
                this.stadium.ball.velocity.x = (this.stadium.ball.kickDirection.x * this.config.kickVelocity[phaseIndex]);
            }
            if(this.stadium.ball.kickDirection.y != 0) {
                this.stadium.ball.velocity.y = (this.stadium.ball.kickDirection.y * this.config.kickVelocity[phaseIndex]);
            }
            this.stadium.ball.velocity.z = this.config.kickVelocityZ[phaseIndex];
        }
        else {
            this.stadium.ball.velocity.x = 0;
            this.stadium.ball.velocity.y = 0;
            this.stadium.ball.kickDirection.x = 0;
            this.stadium.ball.kickDirection.y = 0;
            this.kickStarted = null;
        }
        if(this.stadium.ball.velocity.x == 0 && this.stadium.ball.velocity.y == 0 && this.stadium.ball.velocity.z == 0) {
            this.stadium.ball.position.z = 0;
        }
    }
};

Physics.prototype.checkGoalCollision = function (moveArray) {
    if(MathLib.isIntersectedVertically(
       this.config.goalTopTopLeft.x,
       this.config.goalTopTopRight.x,
       this.config.goalTopTopLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      moveArray[1] *= -1;
      this.stadium.ball.kickDirection.y *= -1;
    }
    else if(MathLib.isIntersectedVertically(
       this.config.goalBottomBottomLeft.x,
       this.config.goalBottomBottomRight.x,
       this.config.goalBottomBottomLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      moveArray[1] *= -1;
      this.stadium.ball.kickDirection.y *= -1;
    }
    if(MathLib.isIntersectedHorizontally(
       this.config.goalTopTopLeft.y,
       this.config.goalTopBottomLeft.y,
       this.config.goalTopTopLeft.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      moveArray[0] *= -1;
      this.stadium.ball.kickDirection.x *= -1;
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.goalTopTopRight.y,
       this.config.goalTopBottomRight.y,
       this.config.goalTopTopRight.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      moveArray[0] *= -1;
      this.stadium.ball.kickDirection.x *= -1;
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.goalBottomTopLeft.y,
       this.config.goalBottomBottomLeft.y,
       this.config.goalBottomTopLeft.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      moveArray[0] *= -1;
      this.stadium.ball.kickDirection.x *= -1;
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.goalBottomTopRight.y,
       this.config.goalBottomBottomRight.y,
       this.config.goalBottomTopRight.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      moveArray[0] *= -1;
      this.stadium.ball.kickDirection.x *= -1;
    }
};

Physics.prototype.checkBoxCollision = function (moveArray) {    
    if(MathLib.isIntersectedVertically(
       this.config.boxTopLeft.x,
       this.config.boxTopRight.x,
       this.config.boxTopLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      moveArray[1] *= -1;
      this.stadium.ball.kickDirection.y *= -1;
    }
    else if(MathLib.isIntersectedVertically(
       this.config.boxBottomLeft.x,
       this.config.boxBottomRight.x,
       this.config.boxBottomLeft.y,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[1]
    )) {
      moveArray[1] *= -1;
      this.stadium.ball.kickDirection.y *= -1;
    }
    if(MathLib.isIntersectedHorizontally(
       this.config.boxTopLeft.y,
       this.config.boxBottomLeft.y,
       this.config.boxTopLeft.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      moveArray[0] *= -1;
      this.stadium.ball.kickDirection.x *= -1;
    }
    else if(MathLib.isIntersectedHorizontally(
       this.config.boxTopRight.y,
       this.config.boxBottomRight.y,
       this.config.boxTopRight.x,
       this.stadium.ball.position.x,
       this.stadium.ball.position.y,
       moveArray[0]
    )) {
      moveArray[0] *= -1;
      this.stadium.ball.kickDirection.x *= -1;
    }  
};


