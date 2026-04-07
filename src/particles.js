/**
 * src/particles.js
 * Particle system for visual effects (explosions, sparks, speedlines)
 */
import { rand, project3D } from './utils.js';

class Particle {
    constructor() {
        this.active = false;
        // 3D coords
        this.x = 0;
        this.y = 0;
        this.z = 0;
        // Velocity
        this.vx = 0;
        this.vy = 0;
        this.vz = 0;
        
        this.color = '#fff';
        this.size = 1;
        this.life = 0;
        this.maxLife = 1;
        
        // Options
        this.gravity = -200;
        this.is2D = false; // To use screen coords natively
    }

    spawn(opts) {
        this.active = true;
        this.x = opts.x || 0;
        this.y = opts.y || 0;
        this.z = opts.z || 0;
        this.vx = opts.vx || 0;
        this.vy = opts.vy || 0;
        this.vz = opts.vz || 0;
        this.color = opts.color || '#fff';
        this.size = opts.size || 2;
        this.life = opts.life || 1;
        this.maxLife = this.life;
        this.gravity = opts.gravity !== undefined ? opts.gravity : -200;
        this.is2D = opts.is2D || false;
    }

    update(dt) {
        if (!this.active) return;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }
        this.vy += this.gravity * dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.z += this.vz * dt;
    }

    draw(ctx, camera) {
        if (!this.active) return;
        
        const opacity = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        
        if (this.is2D) {
            ctx.globalAlpha = opacity;
            ctx.fillRect(this.x, this.y, this.size, this.size);
            ctx.globalAlpha = 1.0;
        } else {
            // Project to 2D
            if (this.z < camera.z) return; // Behind camera
            const { px, py, scale } = project3D(this.x, this.y, this.z, camera);
            
            const r = this.size * scale;
            if (r < 0.1) return;

            ctx.globalAlpha = opacity;
            ctx.beginPath();
            ctx.arc(px, py, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}

export class ParticleSystem {
    constructor(maxParticles = 500) {
        this.pool = [];
        for (let i = 0; i < maxParticles; i++) {
            this.pool.push(new Particle());
        }
    }

    spawnParticle(opts) {
        const p = this.pool.find(p => !p.active);
        if (p) p.spawn(opts);
    }

    // Explosion originating from x,y,z
    emitExplosion(x, y, z, color, count = 30) {
        for (let i = 0; i < count; i++) {
            this.spawnParticle({
                x, y, z,
                vx: rand(-100, 100),
                vy: rand(50, 200),
                vz: rand(-100, 100),
                color: Math.random() > 0.5 ? color : '#fff',
                size: rand(2, 6),
                life: rand(0.5, 1.5),
                gravity: -300
            });
        }
    }

    // Speed lines zooming towards the camera
    emitSpeedLines(camera, count = 2) {
        for (let i = 0; i < count; i++) {
            // Spawn far away with high negative z velocity
            this.spawnParticle({
                x: rand(-200, 200),
                y: rand(-50, 200),
                z: camera.z + 500,
                vx: 0,
                vy: 0,
                vz: rand(-800, -1500),
                color: 'rgba(0, 255, 255, 0.5)',
                size: rand(1, 3),
                life: 1.0,
                gravity: 0
            });
        }
    }

    // Small sparks from hit
    emitSparks(x, y, z) {
        this.emitExplosion(x, y, z, '#ffaa00', 15);
    }

    /**
     * Player trail — streaks of cyan/purple particles behind the player.
     * @param {number} x - Player world X
     * @param {number} y - Player world Y (bottom)
     * @param {number} z - Player world Z
     * @param {number} speedMultiplier - trail intensifies with speed
     */
    emitPlayerTrail(x, y, z, speedMultiplier) {
        const count = Math.min(3, Math.floor(speedMultiplier * 1.5));
        for (let i = 0; i < count; i++) {
            const colors = ['#0ff', '#8a2be2', '#f0f'];
            this.spawnParticle({
                x: x + rand(-2, 2),
                y: y + rand(0, 12),
                z: z + rand(4, 14),   // just behind player
                vx: rand(-5, 5),
                vy: rand(-5, 5),
                vz: rand(20, 60),     // drift backward
                color: colors[Math.floor(Math.random() * colors.length)],
                size: rand(1.5, 3),
                life: rand(0.15, 0.35),
                gravity: 0
            });
        }
    }

    update(dt) {
        for (let i = 0; i < this.pool.length; i++) {
            this.pool[i].update(dt);
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
    }
}
