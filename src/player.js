/**
 * src/player.js
 * Player movement, animation, bounds
 */
import { lerp, clamp, project3D } from './utils.js';

export class Player {
    constructor(gameState, audioManager, particles) {
        this.gameState = gameState;
        this.audio = audioManager;
        this.particles = particles;

        // Player configuration
        this.w = 10;
        this.h = 24;
        this.d = 14;
        this.duckH = 12; // Height when ducking
        this.baseY = 0;
        this.z = 80; // Fixed distance from camera — far enough for perspective scale to match lane width

        // Movement bounds
        this.currentLane = 1; // 0, 1, 2
        
        // Dynamic position
        this.targetX = this.gameState.lanes[this.currentLane];
        this.x = this.targetX;
        this.y = this.baseY;
        this.vy = 0;
        
        // State
        this.isGrounded = true;
        this.isDucking = false;
        this.duckTimer = 0;
        
        this.color = '#fff';
    }

    reset() {
        this.currentLane = 1;
        this.targetX = this.gameState.lanes[this.currentLane];
        this.x = this.targetX;
        this.y = this.baseY;
        this.vy = 0;
        this.isGrounded = true;
        this.isDucking = false;
        this.duckTimer = 0;
    }

    handleInput(input) {
        if (input.consumeAction('left') && this.currentLane > 0) {
            this.currentLane--;
            this.targetX = this.gameState.lanes[this.currentLane];
        }
        if (input.consumeAction('right') && this.currentLane < 2) {
            this.currentLane++;
            this.targetX = this.gameState.lanes[this.currentLane];
        }
        
        if (input.consumeAction('jump') && this.isGrounded) {
            this.vy = 250; // Jump force
            this.isGrounded = false;
            this.audio.play('jump');
            this.isDucking = false; // Cancel duck if jumping
        }
        
        if ((input.consumeAction('duck') || input.actions.duck) && this.isGrounded && !this.isDucking) {
            this.isDucking = true;
            this.duckTimer = 0.5; // Duck for 500ms
            this.audio.play('duck');
        }
    }

    update(dt) {
        // Lane morphing — snap to lane; clamp final value so we never overshoot
        this.x = lerp(this.x, this.targetX, Math.min(dt * 12, 1.0));
        // Snap completely when very close to avoid float drift
        if (Math.abs(this.x - this.targetX) < 0.1) this.x = this.targetX;
        
        // Vertical movement (Jump)
        if (!this.isGrounded) {
            this.vy += this.gameState.gravity * dt;
            this.y += this.vy * dt;
            
            if (this.y <= this.baseY) {
                this.y = this.baseY;
                this.vy = 0;
                this.isGrounded = true;
            }
        }
        
        // Ducking
        if (this.isDucking) {
            this.duckTimer -= dt;
            if (this.duckTimer <= 0) {
                this.isDucking = false;
            }
        }
    }

    draw(ctx, camera) {
        // Invincibility flashing
        if (this.gameState.invincibilityTimer > 0) {
            if (Math.floor(this.gameState.invincibilityTimer * 10) % 2 === 0) {
                return; // Skip drawn frame to flash
            }
        }

        const currentHeight = this.isDucking ? this.duckH : this.h;
        
        // Bottom center
        let pB = project3D(this.x, this.y, this.z, camera);
        // Top center
        let pT = project3D(this.x, this.y + currentHeight, this.z, camera);
        // We need left/right bounds. Easiest is to project left bottom and right bottom.
        let pLeft = project3D(this.x - this.w/2, this.y, this.z, camera);
        let pRight = project3D(this.x + this.w/2, this.y, this.z, camera);
        
        const width = pRight.px - pLeft.px;
        const height = pB.py - pT.py;

        ctx.save();
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 15;

        // Draw Player as a glowing capsule/rectangle
        ctx.beginPath();
        if (this.isDucking) {
             // A wider, shorter rect
             ctx.roundRect(pLeft.px, pT.py, width, height, width/2);
        } else {
             // Normal tall rect
             ctx.roundRect(pLeft.px, pT.py, width, height, width/4);
        }
        
        ctx.fill();

        // Inner core (darker)
        ctx.fillStyle = '#aaa';
        ctx.fill();

        ctx.restore();
    }

    getBounds() {
        const currentHeight = this.isDucking ? this.duckH : this.h;
        // The bounding box logic assumes y=0 is ground, positive y is up.
        // Shrink the bounding box slightly for forgiveness
        const shrink = 2;
        return {
            left: this.x - this.w/2 + shrink,
            right: this.x + this.w/2 - shrink,
            top: this.y + currentHeight - shrink,
            bottom: this.y + shrink,
            front: this.z - this.d/2,
            back: this.z + this.d/2
        };
    }
}
