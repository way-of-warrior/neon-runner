/**
 * src/gameState.js
 * Central state machine and game state data
 */

export const STATES = {
    START: 'START',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    GAME_OVER: 'GAME_OVER'
};

export class GameState {
    constructor() {
        this.currentState = STATES.START;
        
        // Scoring
        this.score = 0;
        this.highScore = parseInt(localStorage.getItem('neonRunnerHighScore') || '0', 10);
        this.combo = 1.0;
        this.baseSpeed = 130; // base units per second
        this.speedMultiplier = 1.0;
        this.difficultyLevel = 1;
        
        // Player state
        this.lives = 3;
        
        // Global time tracking for combo/speedups
        this.timeSinceLastHit = 0;
        this.invincibilityTimer = 0;
        this.timeSinceLastSpeedUp = 0;
        this.totalPointsForSpeedUp = 0; // tracking up to 500

        // Time scale (for hit slow-motion effect)
        this.timeScale = 1.0;
        this.timeScaleTimer = 0;

        // Dodge streak (perfect dodge multiplier)
        this.dodgeStreak = 0;

        // Boss wave
        this.timeUntilNextBoss = 30.0; // boss every 30 seconds
        this.currentBossDuration = 5.0; // starts at 5s, increases up to 30s
        this.bossWaveActive = false;
        this.bossWaveTimer = 0;
        
        // Physics constants
        this.gravity = -400; // Downward acceleration
        this.laneWidth = 20; // 3D units
        this.lanes = [-this.laneWidth, 0, this.laneWidth]; // x-coords of lanes (-1, 0, 1)

        // Event callbacks
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }

    setState(newState) {
        this.currentState = newState;
        this.emit('stateChange', newState);
    }

    reset() {
        this.score = 0;
        this.combo = 1.0;
        this.baseSpeed = 130;
        this.speedMultiplier = 1.0;
        this.difficultyLevel = 1;
        this.lives = 3;
        this.timeSinceLastHit = 0;
        this.invincibilityTimer = 0;
        this.timeSinceLastSpeedUp = 0;
        this.totalPointsForSpeedUp = 0;
        this.timeScale = 1.0;
        this.timeScaleTimer = 0;
        this.dodgeStreak = 0;
        this.timeUntilNextBoss = 30.0;
        this.currentBossDuration = 5.0;
        this.bossWaveActive = false;
        this.bossWaveTimer = 0;
        this.emit('reset');
    }

    addScore(points) {
        const actualPoints = points * this.combo;
        this.score += actualPoints;
        this.totalPointsForSpeedUp += actualPoints;

        if (this.totalPointsForSpeedUp >= 500) {
            this.totalPointsForSpeedUp -= 500;
            this.triggerSpeedUp();
        }

        if (this.score > this.highScore) {
            this.highScore = Math.floor(this.score);
            localStorage.setItem('neonRunnerHighScore', this.highScore);
        }
    }

    triggerSpeedUp() {
        if (this.speedMultiplier < 5.0) {
            this.speedMultiplier = Math.min(this.speedMultiplier + 0.1, 5.0); // Hard cap at 5.0x
            this.difficultyLevel = Math.floor(this.speedMultiplier * 2);
            this.emit('speedUp', this.speedMultiplier);
        }
    }

    takeHit() {
        this.combo = 1.0;
        this.timeSinceLastHit = 0;
        this.invincibilityTimer = 1.5;
        // Hit slow-motion: scale time to 30% for 0.2s
        this.timeScale = 0.3;
        this.timeScaleTimer = 0.2;
        // Reset dodge streak on hit
        this.dodgeStreak = 0;
        this.lives--;
        this.emit('hit', this.lives);
        
        if (this.lives <= 0) {
            this.setState(STATES.GAME_OVER);
        }
    }

    /** Called by obstacleManager when an obstacle passes the player without a hit */
    registerNearMiss() {
        this.dodgeStreak++;
        this.emit('nearMiss', this.dodgeStreak);
    }

    /**
     * Returns the effective obstacle movement speed.
     * During a boss wave, speed bumps to 1.5x of normal speed to increase adrenaline.
     */
    getEffectiveSpeed() {
        const raw = this.baseSpeed * this.speedMultiplier;
        if (this.bossWaveActive) {
            // Exactly 1.5x the normal speed as requested
            return raw * 1.5;
        }
        return raw;
    }

    update(dt) {
        if (this.currentState !== STATES.PLAYING) return;

        if (this.invincibilityTimer > 0) {
            this.invincibilityTimer -= dt;
        }

        // Hit slow-motion timer
        if (this.timeScaleTimer > 0) {
            this.timeScaleTimer -= dt; // use RAW dt so it always recovers at real speed
            if (this.timeScaleTimer <= 0) {
                this.timeScale = 1.0;
            } else {
                // Ease back toward 1.0
                this.timeScale = Math.min(1.0, this.timeScale + dt * 3.5);
            }
        }

        // Boss wave timer
        if (this.bossWaveActive) {
            this.bossWaveTimer -= dt;
            if (this.bossWaveTimer <= 0) {
                this.bossWaveActive = false;
                this.emit('bossWaveEnd');
            }
        }

        // Check if boss wave should trigger (every 30 seconds)
        if (!this.bossWaveActive) {
            this.timeUntilNextBoss -= dt;
            if (this.timeUntilNextBoss <= 0) {
                // Increase speed by 1 before surge mode
                this.speedMultiplier = Math.min(this.speedMultiplier + 1.0, 5.0);
                this.difficultyLevel = Math.floor(this.speedMultiplier * 2);

                this.bossWaveActive = true;
                this.bossWaveTimer = this.currentBossDuration;
                this.currentBossDuration = Math.min(this.currentBossDuration + 5.0, 30.0); // Increase duration for next wave
                this.timeUntilNextBoss = 30.0; // Reset for the next one
                this.emit('bossWave');
            }
        }

        // Combo increases 0.1 every 5s without hit
        this.timeSinceLastHit += dt;
        if (this.timeSinceLastHit >= 5.0) {
            this.timeSinceLastHit -= 5.0;
            this.combo = Math.min(this.combo + 0.1, 5.0);
            this.emit('comboUp', this.combo);
        }

        // Add passive score based on distance traveled
        const speed = this.baseSpeed * this.speedMultiplier;
        this.addScore((speed * dt) / 10);
    }
}
