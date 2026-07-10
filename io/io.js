
window.keyMap = {};
window.addEventListener('keydown', checkInput, false);
window.addEventListener('keyup', checkInput, false);
window.addEventListener("touchstart", touchHandler, false);

function touchHandler(e) {
    var velocity = window.game.config.teamVelocity("home");
    var scaleBy = window.game.config.comnputeScaleBy();
    var targetX = (0 - window.game.camera.position.x) + e.touches[0].clientX / scaleBy;
    var targetY = (0 - window.game.camera.position.y) + e.touches[0].clientY / scaleBy;
    if(window.game.debugLog != null) {
        window.game.debugLog.recordTouchEvent(new Vector2d(targetX, targetY));
    }
    var target = new Vector2d(targetX, targetY);
    var player = window.game.stadium.humanPlayer;
    if (player == null) {
        return;
    }
    window.game.touchTarget = target;
    player.velocity = MathLib.computeVelocityForTarget(player.position, target, velocity);
    startGame();
}

function updateHumanInput(game) {
    if(game == null || game.isPaused()) {
        return;
    }
    if(hasMovementInput()) {
        game.touchTarget = null;
        return;
    }
    if(game.touchTarget != null) {
        updateTouchControl(game);
    }
}

function hasMovementInput() {
    var keys = window.keyMap || {};
    return keys[37] || keys[38] || keys[39] || keys[40];
}

function updateTouchControl(game) {
    var player = game.stadium.humanPlayer;
    if(player == null) {
        game.touchTarget = null;
        return;
    }
    var threshold = game.config.aiTargetReachedRadius || 1;
    if(MathLib.computeDistance(player.position, game.touchTarget) <= threshold) {
        game.touchTarget = null;
        player.velocity.x = 0;
        player.velocity.y = 0;
        return;
    }
    player.velocity = MathLib.computeVelocityForTarget(player.position, game.touchTarget, game.config.teamVelocity("home"));
}

function checkInput(e) {
    if(window.game.debugLog != null) {
        window.game.debugLog.recordKeyEvent(e);
    }
    window.keyMap[e.keyCode] = e.type == 'keydown';
    if(!window.game.isPaused()) {
        // Pixels per second
        var velocity = window.game.config.teamVelocity("home");
        var player = window.game.stadium.humanPlayer;
        if(player == null) {
            return;
        }
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
    if(window.keyMap[191]) {
        if(window.game.config.debug == true) {
            window.game.togglePause();
            window.game.debugLog.dump();
        }
    }
    if(window.keyMap[81]) {
        window.game.config.viewportRatio /= 1.2;
    }
    if(window.keyMap[87]) {
        window.game.config.viewportRatio *= 1.2;
    }
}

function startGame() {
    if(window.game != null && window.game.started == false) {
        window.game.started = true;    
    }
}
