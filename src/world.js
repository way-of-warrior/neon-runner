/**
 * src/world.js
 * Renders the 3D track, background, and star tunnel effect
 */
import { project3D } from './utils.js';

export class World {
    constructor(gameState) {
        this.gameState = gameState;

        // Grid animation state
        this.gridOffset = 0;

        // ---- Star Tunnel ----
        // Each star lives in 3D space.  z goes from 0 (camera) to FAR_Z.
        // Every frame we subtract speed*dt from z (stars rush toward camera).
        // When z <= 0 we reset the star far away.
        this.FAR_Z = 1200;
        this.STAR_COUNT = 200;
        this.tunnelStars = [];
        this._initStars();
    }

    _initStars() {
        this.tunnelStars = [];
        for (let i = 0; i < this.STAR_COUNT; i++) {
            this.tunnelStars.push(this._makeStarAt(
                Math.random() * this.FAR_Z  // spread initial z across full depth
            ));
        }
    }

    /**
     * Create a single star placed at the given z depth.
     * Stars are spread in a wide cone around the track centre.
     */
    _makeStarAt(z) {
        const spread = 800; // how far left/right/up/down they can spawn
        return {
            x: (Math.random() - 0.5) * spread,
            y: (Math.random() - 0.5) * spread * 0.6, // squish vertically
            z: z,
            // size grows as the star gets closer (we scale by 1/z anyway,
            // but we store a base size so bright stars twinkle more)
            baseSize: Math.random() * 2.5 + 0.5,
            // random tint: mostly white, occasionally blue or magenta
            color: this._starColor()
        };
    }

    _starColor() {
        const r = Math.random();
        if (r < 0.7)  return '#ffffff';
        if (r < 0.85) return '#aaddff'; // blue-white
        if (r < 0.95) return '#ff88ff'; // magenta
        return '#ffff88';               // warm yellow
    }

    update(dt, speed) {
        // Move track grid lines toward player
        this.gridOffset += speed * dt;
        if (this.gridOffset > 50) this.gridOffset -= 50;

        // Move all tunnel stars toward the camera
        // Use a faster movement so stars streak at high speed
        const starSpeed = speed * 2.5;
        for (let i = 0; i < this.tunnelStars.length; i++) {
            const s = this.tunnelStars[i];
            s.z -= starSpeed * dt;
            // Recycle when past camera
            if (s.z <= 2) {
                this.tunnelStars[i] = this._makeStarAt(this.FAR_Z);
            }
        }
    }

    draw(ctx, camera) {
        // ---- 1. Background gradient ----
        const grad = ctx.createLinearGradient(0, 0, 0, camera.canvasHeight);
        grad.addColorStop(0,    '#000008'); // Deep black-blue
        grad.addColorStop(0.45, '#0a0520'); // Deep purple
        grad.addColorStop(0.49, '#1a0b2e'); // Violet haze
        grad.addColorStop(0.5,  '#0ff');    // Neon horizon flash
        grad.addColorStop(0.51, '#050510'); // Ground dark
        grad.addColorStop(1,    '#000000');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, camera.canvasWidth, camera.canvasHeight);

        // ---- 2. Star Tunnel ----
        // Only draw stars in the sky half (above horizon)
        const horizonY = project3D(0, 0, this.FAR_Z, camera).py;

        ctx.save();
        for (let i = 0; i < this.tunnelStars.length; i++) {
            const s = this.tunnelStars[i];
            if (s.z <= 2) continue;

            const { px, py, scale } = project3D(s.x, s.y + camera.y, s.z, camera);

            // Only render in upper half (above ground horizon)
            if (py > horizonY) continue;
            // Clip to canvas
            if (px < 0 || px > camera.canvasWidth) continue;

            const r = s.baseSize * scale;
            if (r < 0.1) continue;

            // Opacity: near = fully visible, far = faint
            const opacity = Math.min(1, (1 - s.z / this.FAR_Z) * 2.5 + 0.05);

            ctx.globalAlpha = opacity;
            ctx.fillStyle = s.color;

            // For close stars, draw a streaked line (motion blur illusion)
            if (scale > 0.4) {
                // project a point slightly further back in Z to make the streak
                const prev = project3D(s.x, s.y + camera.y, s.z + 30, camera);
                ctx.beginPath();
                ctx.lineWidth = r;
                ctx.strokeStyle = s.color;
                ctx.shadowColor = s.color;
                ctx.shadowBlur = r * 3;
                ctx.moveTo(prev.px, prev.py);
                ctx.lineTo(px, py);
                ctx.stroke();
            } else {
                // Distant star: plain dot
                ctx.shadowColor = s.color;
                ctx.shadowBlur = r * 2;
                ctx.beginPath();
                ctx.arc(px, py, r, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.restore();

        // ---- 3. 3D Track ----
        ctx.save();
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#0ff';
        ctx.shadowBlur = 10;

        const zDrawMax = 1000;
        const nearZ = 60;

        // Horizon line
        const horizon = project3D(0, 0, zDrawMax, camera);
        ctx.beginPath();
        ctx.moveTo(0, horizon.py);
        ctx.lineTo(camera.canvasWidth, horizon.py);
        ctx.stroke();

        // Lane dividers
        const dividerX = [
            this.gameState.lanes[0] - this.gameState.laneWidth / 2,
            this.gameState.lanes[0] + this.gameState.laneWidth / 2,
            this.gameState.lanes[1] + this.gameState.laneWidth / 2,
            this.gameState.lanes[2] + this.gameState.laneWidth / 2
        ];

        ctx.beginPath();
        for (let x of dividerX) {
            const start = project3D(x, 0, nearZ, camera);
            const end   = project3D(x, 0, zDrawMax, camera);
            ctx.moveTo(start.px, start.py);
            ctx.lineTo(end.px,   end.py);
        }
        ctx.stroke();

        // Horizontal scrolling grid lines
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.shadowBlur = 4;
        const trackLeft  = dividerX[0];
        const trackRight = dividerX[3];
        ctx.beginPath();
        for (let z = nearZ + this.gridOffset; z < zDrawMax; z += 50) {
            const pL = project3D(trackLeft,  0, z, camera);
            const pR = project3D(trackRight, 0, z, camera);
            ctx.globalAlpha = Math.max(0, 1 - z / zDrawMax);
            ctx.moveTo(pL.px, pL.py);
            ctx.lineTo(pR.px, pR.py);
        }
        ctx.stroke();
        ctx.globalAlpha = 1.0;

        // Side glowing neon borders (purple)
        ctx.strokeStyle = '#8a2be2';
        ctx.shadowColor = '#8a2be2';
        ctx.lineWidth = 4;
        ctx.beginPath();
        const lwS = project3D(trackLeft  - 2, 0, nearZ, camera);
        const lwE = project3D(trackLeft  - 2, 0, zDrawMax, camera);
        ctx.moveTo(lwS.px, lwS.py);
        ctx.lineTo(lwE.px, lwE.py);
        const rwS = project3D(trackRight + 2, 0, nearZ, camera);
        const rwE = project3D(trackRight + 2, 0, zDrawMax, camera);
        ctx.moveTo(rwS.px, rwS.py);
        ctx.lineTo(rwE.px, rwE.py);
        ctx.stroke();

        ctx.restore();
    }
}
