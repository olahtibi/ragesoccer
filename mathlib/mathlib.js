var MathLib = MathLib || {

    computeAngle: function(x, y) {
        var alpha = Math.atan2(y, x) * 180 / Math.PI;
        if(alpha < 0) {
            alpha = 360 + alpha;
        }
        return alpha;
    },

    computeVelocityForTarget: function(currentPosition, targetPosition, velocity) {
        var distanceX = targetPosition.x - currentPosition.x;
        var distanceY = targetPosition.y - currentPosition.y;
        var normalizeBy = velocity / Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));
        return new Vector2d(distanceX * normalizeBy, distanceY * normalizeBy);
    },

    isIntersectedVertically: function(p1X, p2X, pY, ballX, ballY, moveY) {                
        if(ballX >= p1X && ballX <= p2X) {        
            if(ballY >= pY && (ballY + moveY) <= pY) {
              return true;
            }
            if(ballY <= pY && (ballY + moveY) >= pY) {
              return true;
            }
        }
        return false;
    },

    isIntersectedHorizontally: function(p1Y, p2Y, pX, ballX, ballY, moveX) {                
        if(ballY >= p1Y && ballY <= p2Y) {        
            if(ballX >= pX && (ballX + moveX) <= pX) {
              return true;
            }
            if(ballX <= pX && (ballX + moveX) >= pX) {
              return true;
            }
        }
        return false;
    },

    computeDistance: function(position1, position2) {
        var distanceX = position2.x - position1.x;
        var distanceY = position2.y - position1.y;
        return Math.sqrt(Math.pow(distanceX, 2) + Math.pow(distanceY, 2));
    },

    inside: function(corner1, corner2, point) {
        if(point.x >= corner1.x && point.x <= corner2.x && point.y >= corner1.y && point.y <= corner2.y) {
            return true;
        }
        else {
            return false;
        }
    }

}