
window.keyMap = {};
window.addEventListener('keydown', checkInput, false);
window.addEventListener('keyup', checkInput, false);
window.addEventListener("touchstart", touchHandler, false);

function touchHandler(e) {
    var velocity = window.game.config.playerVelocity;
    var scaleBy = window.game.config.comnputeScaleBy();
    var targetX = (0 - window.game.camera.position.x) + e.touches[0].clientX / scaleBy;
    var targetY = (0 - window.game.camera.position.y) + e.touches[0].clientY / scaleBy;
    window.game.stadium.playerHome.velocity = MathLib.computeVelocityForTarget(window.game.stadium.playerHome.position, new Vector2d(targetX, targetY), velocity);
    startGame();
}

function checkInput(e) {
    window.keyMap[e.keyCode] = e.type == 'keydown';
    if(!window.game.isPaused()) {
        // Pixels per second
        var velocity = window.game.config.playerVelocity;
        window.game.stadium.playerHome.velocity.x = 0;
        window.game.stadium.playerHome.velocity.y = 0;
        // player - home
        if(window.keyMap[38]) {
            // console.log('UP');
            window.game.stadium.playerHome.velocity.y = 0 - velocity;
            startGame();
        }
        if(window.keyMap[40]) {
            // console.log('DOWN');
            window.game.stadium.playerHome.velocity.y = velocity;
            startGame();
        }
        if(window.keyMap[37]) {
            // console.log('LEFT');
            window.game.stadium.playerHome.velocity.x = 0 - velocity;
            startGame();
        }
        if(window.keyMap[39]) {
            // console.log('LEFT');
            window.game.stadium.playerHome.velocity.x = velocity;
            startGame();
        }
        if(window.game.stadium.playerHome.velocity.x != 0 && window.game.stadium.playerHome.velocity.x != 0) {
            window.game.stadium.playerHome.velocity.x /= Math.sqrt(2);
            window.game.stadium.playerHome.velocity.y /= Math.sqrt(2);
        }
    }
    if(window.keyMap[70]) {
        window.game.camera.showStats = !window.game.camera.showStats;
    }
    if(window.keyMap[80]) {
        window.game.togglePause();
    }
}

function startGame() {
    if(window.game != null && window.game.started == false) {
        window.game.started = true;    
    }
}