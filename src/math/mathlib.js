var MathLib = MathLib || {

    computeAngleRadians: function(x, y) {
        var alpha = Math.atan2(y, x);
        if(alpha < 0) {
            alpha = 2 * Math.PI + alpha;
        }
        return alpha;
    },

    angleDeltaRadians: function(targetAngle, currentAngle) {
        var delta = targetAngle - currentAngle;
        while(delta > Math.PI) delta -= 2 * Math.PI;
        while(delta < -Math.PI) delta += 2 * Math.PI;
        return delta;
    },

    vectorLength: function(x, y) {
        return Math.sqrt(x * x + y * y);
    },

    distanceSquared: function(position1, position2) {
        var distanceX = position2.x - position1.x;
        var distanceY = position2.y - position1.y;
        return distanceX * distanceX + distanceY * distanceY;
    },

    normalizeVector: function(x, y, fallbackX, fallbackY) {
        var length = MathLib.vectorLength(x, y);
        if(length <= 0.0001) {
            return new Vector2d(fallbackX, fallbackY);
        }
        return new Vector2d(x / length, y / length);
    },

    vectorFromAngleRadians: function(angle, radius) {
        return new Vector2d(Math.cos(angle) * radius, Math.sin(angle) * radius);
    },

    computeVelocityForTarget: function(currentPosition, targetPosition, velocity) {
        var distanceX = targetPosition.x - currentPosition.x;
        var distanceY = targetPosition.y - currentPosition.y;
        var normalizeBy = velocity / MathLib.vectorLength(distanceX, distanceY);
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
        return Math.sqrt(MathLib.distanceSquared(position1, position2));
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
