/**
 * src/main.js
 * Game entry point, manages instantiation and the Game Loop
 */
import { GameState, STATES } from './gameState.js';
import { InputHandler } from './inputHandler.js';
import { AudioManager } from './audio.js';
import { ParticleSystem } from './particles.js';
import { UIManager } from './ui.js';
import { World } from './world.js';
import { PowerUpManager } from './powerUpManager.js';
import { ObstacleManager } from './obstacleManager.js';
import { Player } from './player.js';
import { Renderer } from './renderer.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        
        // Core Systems
        this.state = new GameState();
        this.input = new InputHandler();
        this.audio = new AudioManager();
        this.particles = new ParticleSystem(500);
        this.ui = new UIManager(this.state);
        
        // Game Entities
        this.world = new World(this.state);
        this.powerUps = new PowerUpManager(this.state, this.ui, this.particles, this.audio);
        this.obstacles = new ObstacleManager(this.state, this.particles, this.audio);
        this.player = new Player(this.state, this.audio, this.particles);
        
        // Renderer
        this.renderer = new Renderer(this.canvas, this.state, this.world, this.obstacles, this.powerUps, this.player, this.particles);

        // Loop variables
        this.lastTime = performance.now();
        this.animationFrameId = null;

        this.bindEvents();
        
        // Start Loop
        this.state.setState(STATES.START);
        this.loop(performance.now());
    }

    bindEvents() {
        // UI Buttons
        document.getElementById('btn-mute').addEventListener('click', (e) => {
            const isMuted = this.audio.toggleMute();
            e.target.textContent = isMuted ? '🔇' : '🔊';
        });

        document.getElementById('btn-resume').addEventListener('click', () => {
            this.state.setState(STATES.PLAYING);
        });

        const resetGame = () => {
            this.reset();
            this.state.setState(STATES.PLAYING);
            this.audio.startBGM(); // Ensure BGM is running
        };

        document.getElementById('btn-restart-pause').addEventListener('click', resetGame);
        document.getElementById('btn-restart-go').addEventListener('click', resetGame);

        // Speedup visuals
        this.state.on('speedUp', () => {
            this.audio.play('speedup');
            this.particles.emitSpeedLines(this.renderer.camera, 10);
        });

        // Near miss bonus
        this.state.on('nearMiss', (streak) => {
            // +50 bonus per near miss, scaled by streak
            const bonus = 50 * streak;
            this.state.addScore(bonus);
            const msg = streak >= 3 ? `INSANE! +${bonus}` : `NEAR MISS! +${bonus}`;
            this.ui.showNotification(msg, '#0ff');
            this.audio.play('jump'); // brief ping sound
        });

        // Perfect dodge streak milestones
        this.state.on('nearMiss', (streak) => {
            if (streak === 5)  this.ui.showNotification('PERFECT x5! 🔥', '#f0f');
            if (streak === 10) this.ui.showNotification('GODLIKE x10 💥', '#ff0');
        });

        // Boss wave
        this.state.on('bossWave', () => {
            this.ui.showNotification('⚠️ SURGE MODE ⚠️', '#f00');
            this.audio.play('speedup');
            this.particles.emitSpeedLines(this.renderer.camera, 20);
        });
        this.state.on('bossWaveEnd', () => {
            this.ui.showNotification('SURVIVED! 🏆', '#0f0');
            this.audio.play('powerup');
        });
        
        this.state.on('stateChange', (newState) => {
             if (newState === STATES.GAME_OVER) {
                  this.audio.stopBGM();
                  this.audio.play('gameover');
             }
        });
    }

    reset() {
        this.state.reset();
        this.input.reset();
        this.player.reset();
        this.powerUps.reset();
        this.obstacles.reset();
        this.particles.reset();
    }

    update(dt) {
        // Global input handling based on state
        if (this.state.currentState === STATES.START) {
            if (this.input.consumeAction('any')) {
                 // Initialize Audio on first user interaction
                 if (this.audio.ctx.state === 'suspended') {
                     this.audio.ctx.resume();
                 }
                this.reset();
                this.state.setState(STATES.PLAYING);
                this.audio.startBGM();
            }
        } 
        else if (this.state.currentState === STATES.PLAYING) {
            if (this.input.consumeAction('pause')) {
                this.state.setState(STATES.PAUSED);
                return;
            }

            // Calculate current speed
            let speed = this.state.baseSpeed * this.state.speedMultiplier;
            
            // Allow power up effects to alter speed internally, but for game state update we pass the real speed
            // Wait, PowerUpManager handles slowing directly on gameState.speedMultiplier.

            this.state.update(dt);
            this.player.handleInput(this.input);
            this.player.update(dt);

            // Recalculate speed AFTER state.update (power ups may have changed multiplier)
            speed = this.state.baseSpeed * this.state.speedMultiplier;

            this.world.update(dt, speed);
            this.particles.update(dt);
            
            this.powerUps.update(dt, speed, this.player.getBounds());
            
            // Obstacle hit detection — obstacles use capped speed during boss wave
            const obstacleSpeed = this.state.getEffectiveSpeed();
            if (this.state.lives > 0 && this.obstacles.update(dt, obstacleSpeed, this.player.getBounds())) {
                if (this.powerUps.activeEffect === 'shield') {
                    // Shield absorbs the hit!
                    this.powerUps.clearEffect();
                    this.particles.emitSparks(this.player.x, this.player.y + 10, this.player.z);
                    this.audio.play('duck'); // shield break sound substitute
                    this.ui.showNotification('SHIELD BROKEN!', '#00f');
                } else {
                    this.state.takeHit();
                    this.audio.play('hit');
                    this.ui.showNotification(this.state.lives > 0 ? 'HIT!' : 'GAME OVER', '#f00');
                }
            }

        }
        else if (this.state.currentState === STATES.PAUSED) {
            if (this.input.consumeAction('pause')) {
                this.state.setState(STATES.PLAYING);
            }
        }
        else if (this.state.currentState === STATES.GAME_OVER) {
            // Can restart via button
        }
    }

    loop(timestamp) {
        // Calculate raw Delta Time in seconds
        const rawDt = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        // Apply timeScale for hit slow-motion (gameState always updates at raw speed)
        const dt = rawDt * this.state.timeScale;

        this.update(dt);
        this.renderer.render();

        this.animationFrameId = requestAnimationFrame((ts) => this.loop(ts));
    }
}

// Initialize when DOM is ready
window.onload = () => {
    new Game();
};
