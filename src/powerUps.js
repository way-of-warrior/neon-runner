/**
 * src/powerUps.js
 * Definitions of the 3 Power-up types
 */
import { project3D, rectIntersect } from './utils.js';

export class PowerUp {
    constructor(type) {
        this.active = false;
        this.type = type; // 'shield', 'slow', 'multiplier'
        this.x = 0;
        this.y = 10;
        this.z = 0;
        this.baseY = 10;
        this.size = 6;
        
        // Oscillation
        this.time = 0;
        
        switch(type) {
            case 'shield':
                this.color = '#00f';
                this.glow = '#0ff';
                this.name = 'SHIELD';
                this.duration = 4;
                break;
            case 'slow':
                this.color = '#ff0';
                this.glow = '#ffa500';
                this.name = 'SLOW MOTION';
                this.duration = 5;
                break;
            case 'multiplier':
                this.color = '#0f0';
                this.glow = '#0f0';
                this.name = 'x2 SCORE';
                this.duration = 8;
                break;
        }
    }

    spawn(x, z) {
        this.active = true;
        this.x = x;
        this.z = z;
        this.time = Math.random() * 10;
    }

    update(dt, speed) {
        if (!this.active) return;
        this.z -= speed * dt;
        
        this.time += dt;
        // Bob up and down sine wave
        this.y = this.baseY + Math.sin(this.time * 5) * 5;

        // Despawn if behind camera
        if (this.z < -50) {
            this.active = false;
        }
    }

    draw(ctx, camera) {
        if (!this.active || this.z < camera.z) return;
        
        const { px, py, scale } = project3D(this.x, this.y, this.z, camera);
        const s = this.size * scale;
        
        if (s < 0.5) return;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.glow;
        ctx.shadowBlur = 15;
        
        ctx.beginPath();
        if (this.type === 'shield') {
            // Circle
            ctx.arc(px, py, s, 0, Math.PI*2);
            ctx.fill();
        } else if (this.type === 'slow') {
            // Hourglass/diamond
            ctx.moveTo(px, py - s);
            ctx.lineTo(px + s, py);
            ctx.lineTo(px, py + s);
            ctx.lineTo(px - s, py);
            ctx.fill();
        } else if (this.type === 'multiplier') {
            // Hexagon or Star
            ctx.fillRect(px - s, py - s, s*2, s*2);
        }
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x - this.size,
            right: this.x + this.size,
            top: this.y + this.size, // y goes up
            bottom: this.y - this.size,
            front: this.z - this.size,
            back: this.z + this.size
        };
    }
}
