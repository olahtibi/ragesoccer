var GameState = function (ballVelocity, playerHomeVelocity, playerAwayVelocity, lastUpdated, kickStarted) {
    this.ballVelocity = ballVelocity;
    this.playerHomeVelocity = playerHomeVelocity;
    this.playerAwayVelocity = playerAwayVelocity;
    this.currentTime = new Date().getTime();
    this.lastUpdated = lastUpdated;
    this.kickStarted = kickStarted;
};
