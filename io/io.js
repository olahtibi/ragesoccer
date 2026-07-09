
window.keyMap = {};
window.addEventListener('keydown', checkInput, false);
window.addEventListener('keyup', checkInput, false);
window.addEventListener("touchstart", touchHandler, false);

function touchHandler(e) {
    var velocity = window.game.config.playerVelocity;
    var scaleBy = window.game.config.comnputeScaleBy();
    var targetX = (0 - window.game.camera.position.x) + e.touches[0].clientX / scaleBy;
    var targetY = (0 - window.game.camera.position.y) + e.touches[0].clientY / scaleBy;
    if(window.game.debugLog != null) {
        window.game.debugLog.recordTouchEvent(new Vector2d(targetX, targetY));
    }
    var player = window.game.stadium.homeTeam.selectHumanPlayer(window.game.stadium.ball);
    player.velocity = MathLib.computeVelocityForTarget(player.position, new Vector2d(targetX, targetY), velocity);
    startGame();
}

function checkInput(e) {
    if(window.game.debugLog != null) {
        window.game.debugLog.recordKeyEvent(e);
    }
    window.keyMap[e.keyCode] = e.type == 'keydown';
    if(!window.game.isPaused()) {
        // Pixels per second
        var velocity = window.game.config.playerVelocity;
        var player = window.game.stadium.homeTeam.selectHumanPlayer(window.game.stadium.ball);
        player.velocity.x = 0;
        player.velocity.y = 0;
        // player - home
        if(window.keyMap[38]) {
            // console.log('UP');
            player.velocity.y = 0 - velocity;
            startGame();
        }
        if(window.keyMap[40]) {
            // console.log('DOWN');
            player.velocity.y = velocity;
            startGame();
        }
        if(window.keyMap[37]) {
            // console.log('LEFT');
            player.velocity.x = 0 - velocity;
            startGame();
        }
        if(window.keyMap[39]) {
            // console.log('LEFT');
            player.velocity.x = velocity;
            startGame();
        }
        if(player.velocity.x != 0 && player.velocity.y != 0) {
            player.velocity.x /= Math.sqrt(2);
            player.velocity.y /= Math.sqrt(2);
        }
    }
    if(window.keyMap[70]) {
        window.game.camera.showStats = !window.game.camera.showStats;
    }
    if(window.keyMap[80]) {
        if(window.game.config.debug == true) {
            window.game.togglePause();
            window.game.debugLog.dump();
        }
    }
    if(window.keyMap[107]) {
        window.game.config.viewportRatio /= 1.2;
    }
    if(window.keyMap[109]) {
        window.game.config.viewportRatio *= 1.2;
    }
}

function startGame() {
    if(window.game != null && window.game.started == false) {
        window.game.started = true;    
    }
}
