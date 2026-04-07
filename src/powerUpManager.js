/**
 * src/powerUpManager.js
 * Spawns and tracks active power-ups and their effects
 */
import { PowerUp } from './powerUps.js';
import { randInt, rand, rectIntersect } from './utils.js';

export class PowerUpManager {
    constructor(gameState, ui, particles, audio) {
        this.gameState = gameState;
        this.ui = ui;
        this.particles = particles;
        this.audio = audio;
        
        this.types = ['shield', 'slow', 'multiplier'];
        this.pool = [];
        
        // Create pool
        for (let i=0; i<10; i++) {
            this.pool.push(new PowerUp(this.types[i % 3]));
        }
        
        this.spawnTimer = 0;
        
        this.activeEffect = null;
        this.effectTimer = 0;
        this.effectDuration = 0;
    }

    update(dt, speed, playerBounds) {
        // Spawning
        this.spawnTimer += dt;
        if (this.spawnTimer > 15) { // Spawn roughly every 15s
            this.spawnTimer = 0;
            this.spawn();
        }

        // Update items in world
        let playerCollected = false;
        
        for (let i = 0; i < this.pool.length; i++) {
            const pu = this.pool[i];
            if (!pu.active) continue;
            
            pu.update(dt, speed);
            
            // 3D Collision check
            if (pu.z > playerBounds.front && pu.z < playerBounds.back) {
                // Approximate 2D intersection
                const pub = pu.getBounds();
                if (rectIntersect({left: pub.left, right: pub.right, top: pub.top, bottom: pub.bottom}, playerBounds)) {
                    this.collect(pu);
                    pu.active = false;
                }
            }
        }

        // Manage active effect duration
        if (this.activeEffect) {
            this.effectTimer -= dt;
            const percent = Math.max(0, this.effectTimer / this.effectDuration);
            
            this.ui.setPowerUpBar(true, this.activeEffect.toUpperCase(), this.getEffectColor(this.activeEffect), percent);
            
            if (this.effectTimer <= 0) {
                this.clearEffect();
            }
        }
    }

    spawn() {
        const p = this.pool.find(p => !p.active);
        if (p) {
            // Randomly re-assign type
            p.type = this.types[randInt(0, 2)];
            // Re-run constructor logic basically
            const temp = new PowerUp(p.type);
            Object.assign(p, temp);
            
            const lane = this.gameState.lanes[randInt(0, 2)];
            p.spawn(lane, 600); // spawn far away
        }
    }

    collect(pu) {
        this.audio.play('powerup');
        this.particles.emitExplosion(pu.x, pu.y, pu.z, pu.color, 20);
        this.ui.showNotification(`${pu.name} ACTIVATED!`, pu.color);
        
        // Clear previous effect
        this.clearEffect();
        
        this.activeEffect = pu.type;
        this.effectDuration = pu.duration;
        this.effectTimer = pu.duration;
        
        // Apply effect
        if (pu.type === 'slow') {
            this.gameState.speedMultiplier -= 0.5;
        } else if (pu.type === 'multiplier') {
            this.gameState.combo += 2.0;
        }
    }

    clearEffect() {
        if (!this.activeEffect) return;
        
        if (this.activeEffect === 'slow') {
            this.gameState.speedMultiplier += 0.5;
        } else if (this.activeEffect === 'multiplier') {
            this.gameState.combo = Math.max(1.0, this.gameState.combo - 2.0);
        }
        
        this.activeEffect = null;
        this.ui.setPowerUpBar(false);
    }
    
    getEffectColor(type) {
        switch(type) {
            case 'shield': return '#00f';
            case 'slow': return '#ff0';
            case 'multiplier': return '#0f0';
            default: return '#fff';
        }
    }

    draw(ctx, camera) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].draw(ctx, camera);
        }
    }

    reset() {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].active = false;
        }
        this.clearEffect();
        this.spawnTimer = 0;
    }
}
