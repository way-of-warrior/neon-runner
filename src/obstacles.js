/**
 * src/obstacles.js
 * Definitions of the 6 obstacle types
 */
import { project3D } from './utils.js';

export class Obstacle {
    constructor(type) {
        this.active = false;
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.z = 0;
        // Dimensions
        this.w = 10;
        this.h = 10;
        this.d = 2; // depth
        this.color = '#fff';
        this.laneIndex = 1;
        
        // Extra state for moving obstacles
        this.dir = 1;
        
        this.initType(type);
    }

    initType(type) {
        this.type = type;
        this.y = 0;
        switch(type) {
            case 'lowWall':
                this.color = '#f0f'; // magenta
                this.w = 18;
                this.h = 10;
                break;
            case 'ceilingBeam':
                this.color = '#ffa500'; // orange
                this.w = 18;
                this.h = 15;
                this.y = 15; // Floating
                break;
            case 'sideSpike':
                this.color = '#f00'; // red
                this.w = 10;
                this.h = 10;
                break;
            case 'fullBlock':
                this.color = '#0ff'; // cyan
                this.w = 18;
                this.h = 30; // very tall
                break;
            case 'movingBarrier':
                this.color = '#ff0'; // yellow
                this.w = 18;
                this.h = 15;
                break;
            case 'floorPit':
                this.color = '#000'; // black hole
                this.w = 18;
                this.h = 1;
                this.y = -1; // Below ground
                this.d = 40; // Long pit
                break;
        }
    }

    spawn(laneX, z, config = {}) {
        this.active = true;
        this.z = z;
        this.x = laneX;
        if (this.type === 'sideSpike') {
            // align with edges
            this.x = laneX > 0 ? laneX + 5 : laneX - 5;
        }
        if (config.dir) this.dir = config.dir;
    }

    update(dt, speed, lanes) {
        if (!this.active) return;
        this.z -= speed * dt;

        if (this.type === 'movingBarrier') {
            this.x += this.dir * 20 * dt; // move 20 units/sec
            // Bounce on edges
            if (this.x > lanes[2]) {
                this.x = lanes[2];
                this.dir = -1;
            } else if (this.x < lanes[0]) {
                this.x = lanes[0];
                this.dir = 1;
            }
        }

        if (this.z < -50) {
            this.active = false;
        }
    }

    draw(ctx, camera) {
        // Player is at z=80. Disappear instantly when crossing the player.
        if (!this.active || this.z < 80) return;

        // Draw as a 3D box (simplified to just the front face)
        
        if (this.type === 'floorPit') {
            this.drawPit(ctx, camera);
            return;
        }

        // Bottom Left
        let pBL = project3D(this.x - this.w/2, this.y, this.z, camera);
        // Top Right
        let pTR = project3D(this.x + this.w/2, this.y + this.h, this.z, camera);

        const width = pTR.px - pBL.px;
        const height = pBL.py - pTR.py; 

        if (width < 0.5) return;

        ctx.save();

        // Solid fill so obstacles properly occlude things behind them
        ctx.fillStyle = '#050510'; 
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        if (this.type === 'sideSpike') {
            let pTop = project3D(this.x, this.y + this.h, this.z, camera);
            let pBRight = project3D(this.x + this.w/2, this.y, this.z, camera);
            ctx.moveTo(pTop.px, pTop.py);
            ctx.lineTo(pBL.px, pBL.py);
            ctx.lineTo(pBRight.px, pBRight.py);
            ctx.closePath();
        } else {
            ctx.rect(pBL.px, pTR.py, width, height);
        }
        
        ctx.fill();
        ctx.stroke();

        if (this.type === 'fullBlock') {
            ctx.beginPath();
            ctx.moveTo(pBL.px, pTR.py);
            ctx.lineTo(pBL.px + width, pBL.py);
            ctx.moveTo(pBL.px + width, pTR.py);
            ctx.lineTo(pBL.px, pBL.py);
            ctx.stroke();
        }

        ctx.restore();
    }

    drawPit(ctx, camera) {
        let pBL_f = project3D(this.x - this.w/2, this.y, this.z - this.d/2, camera);
        let pBR_f = project3D(this.x + this.w/2, this.y, this.z - this.d/2, camera);
        let pBL_b = project3D(this.x - this.w/2, this.y, this.z + this.d/2, camera);
        let pBR_b = project3D(this.x + this.w/2, this.y, this.z + this.d/2, camera);

        ctx.save();

        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#f00';
        ctx.lineWidth = 2;
        
        ctx.beginPath();
        ctx.moveTo(pBL_f.px, pBL_f.py);
        ctx.lineTo(pBR_f.px, pBR_f.py);
        ctx.lineTo(pBR_b.px, pBR_b.py);
        ctx.lineTo(pBL_b.px, pBL_b.py);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    }

    getBounds() {
        return {
            left: this.x - this.w/2,
            right: this.x + this.w/2,
            top: this.y + this.h,
            bottom: this.y,
            front: this.z - this.d/2,
            back: this.z + this.d/2
        };
    }
}
