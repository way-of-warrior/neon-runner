/**
 * src/renderer.js
 * Main canvas rendering pipeline and Camera definitions
 */

export class Renderer {
    constructor(canvas, gameState, world, obstacleManager, powerUpManager, player, particles) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { alpha: false }); // Optimize
        
        this.gameState = gameState;
        this.world = world;
        this.obstacleManager = obstacleManager;
        this.powerUpManager = powerUpManager;
        this.player = player;
        this.particles = particles;

        this.camera = {
            x: 0,
            y: 30, // Camera height
            z: 0,  // Camera depth
            fov: 300, // Field of view equivalent for projection
            canvasWidth: canvas.width,
            canvasHeight: canvas.height
        };

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.camera.canvasWidth = this.canvas.width;
        this.camera.canvasHeight = this.canvas.height;

        // Adjust FOV based on aspect ratio
        this.camera.fov = Math.min(this.canvas.width, this.canvas.height) * 0.8;
    }

    // Camera shake effect
    applyCameraShake(ctx) {
        if (this.gameState.invincibilityTimer > 1.2) {
            const intensity = (this.gameState.invincibilityTimer - 1.2) * 30;
            const dx = (Math.random() - 0.5) * intensity;
            const dy = (Math.random() - 0.5) * intensity;
            ctx.translate(dx, dy);
        }
    }

    /** Vignette overlay: red pulse for boss wave, cyan speed warp at edges */
    drawOverlays(ctx) {
        const w = this.camera.canvasWidth;
        const h = this.camera.canvasHeight;
        const speedRatio = Math.min((this.gameState.speedMultiplier - 1.0) / 3.0, 1.0);

        // Speed warp: dark cyan radial gradient at edges intensifying with speed
        if (speedRatio > 0) {
            const gradient = ctx.createRadialGradient(w/2, h/2, h * 0.25, w/2, h/2, h * 0.75);
            gradient.addColorStop(0, 'rgba(0,0,0,0)');
            gradient.addColorStop(1, `rgba(0, 255, 255, ${speedRatio * 0.25})`);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        // Boss wave red pulsing vignette
        if (this.gameState.bossWaveActive) {
            const pulse = 0.15 + 0.1 * Math.sin(Date.now() * 0.01); // oscillate
            const grad = ctx.createRadialGradient(w/2, h/2, h * 0.2, w/2, h/2, h * 0.7);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(1, `rgba(255, 0, 0, ${pulse})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }
    }

    render() {
        this.ctx.save();
        
        this.applyCameraShake(this.ctx);

        // 1. Draw Background & World
        this.world.draw(this.ctx, this.camera);
        
        // 2. Draw Obstacles
        this.obstacleManager.draw(this.ctx, this.camera);
        
        // 3. Draw Power-ups
        this.powerUpManager.draw(this.ctx, this.camera);
        
        // 4. Draw Player
        this.player.draw(this.ctx, this.camera);
        
        // 5. Draw Particles
        this.particles.draw(this.ctx, this.camera);

        // 6. Draw screen overlays (speed warp, boss vignette) LAST so they're on top
        this.drawOverlays(this.ctx);

        this.ctx.restore();
    }
}
