/**
 * src/obstacleManager.js
 * Spawns and manages obstacles, handles difficulty progression
 */
import { Obstacle } from './obstacles.js';
import { randInt, rand, rectIntersect } from './utils.js';

export class ObstacleManager {
    constructor(gameState, particles, audio) {
        this.gameState = gameState;
        this.particles = particles;
        this.audio = audio;
        
        this.types = [
            'lowWall', 'ceilingBeam', 'sideSpike', 
            'fullBlock', 'movingBarrier', 'floorPit'
        ];
        
        // Use object pooling
        this.pool = [];
        for (let i = 0; i < 30; i++) {
            this.pool.push(new Obstacle('lowWall'));
        }
        
        this.spawnTimer = 0;
        this.minSpawnInterval = 1.0; 
        this.maxSpawnInterval = 2.5;

        // Near miss: track obstacles currently overlapping in Z with player
        // so we can fire when they exit without having caused a hit
        this.nearMissCandidates = new Set();

        // Boss wave burst spawn timer
        this.bossSpawnTimer = 0;
    }

    update(dt, speed, playerBounds) {
        // Normal spawn timer
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnPattern();
            const diffFactor = Math.max(0.5, 1 - (this.gameState.difficultyLevel * 0.05));
            this.spawnTimer = rand(this.minSpawnInterval * diffFactor, this.maxSpawnInterval * diffFactor);
        }

        // Boss wave: rapid extra spawns, but at a survivable pace
        if (this.gameState.bossWaveActive) {
            this.bossSpawnTimer -= dt;
            if (this.bossSpawnTimer <= 0) {
                this.bossSpawnTimer = 0.7; // One burst every 0.7s — intense but survivable
                this.spawnBossBurst();
            }
        }

        let hit = false;
        const invincible = this.gameState.invincibilityTimer > 0;
        
        for (let i = 0; i < this.pool.length; i++) {
            const obs = this.pool[i];
            if (!obs.active) continue;
            
            obs.update(dt, speed, this.gameState.lanes);
            if (!obs.active) {
                // Obstacle just despawned — if it was a near-miss candidate, fire the event
                if (this.nearMissCandidates.has(i)) {
                    this.nearMissCandidates.delete(i);
                    // Only award near miss if no hit was taken
                    if (!invincible) {
                        this.gameState.registerNearMiss();
                    }
                }
                continue;
            }

            if (invincible || hit) {
                // Even while invincible, track Z overlap for near-miss candidates
                const obsHalfDepth = 12;
                const inZone = (obs.z - obsHalfDepth) < playerBounds.back && (obs.z + obsHalfDepth) > playerBounds.front;
                if (inZone) this.nearMissCandidates.add(i);
                continue;
            }

            const obsHalfDepth = 12;
            const obsZMin = obs.z - obsHalfDepth;
            const obsZMax = obs.z + obsHalfDepth;
            const zOverlap = obsZMin < playerBounds.back && obsZMax > playerBounds.front;

            if (zOverlap) {
                // Mark as candidate — if it exits without a collision this triggers near-miss
                this.nearMissCandidates.add(i);
            } else if (this.nearMissCandidates.has(i)) {
                // Obstacle has exited the Z zone — near miss confirmed!
                this.nearMissCandidates.delete(i);
                this.gameState.registerNearMiss();
            }

            if (!zOverlap) continue;

            // --- X/Y overlap (Y-up coords: top > bottom) ---
            const obsBounds = obs.getBounds();
            const xOverlap = obsBounds.left < playerBounds.right && obsBounds.right > playerBounds.left;
            const yOverlap = obsBounds.bottom < playerBounds.top  && obsBounds.top   > playerBounds.bottom;

            if (xOverlap && yOverlap) {
                hit = true;
                obs.active = false;
                this.nearMissCandidates.delete(i); // not a near miss, it was a hit!
                this.particles.emitSparks(obs.x, playerBounds.top, obs.z);
                this.particles.emitExplosion(obs.x, playerBounds.top, obs.z, obs.color, 12);
            }
        }
        
        return hit;
    }

    spawnObstacle(type, laneIndex, z, config = {}) {
        const obs = this.pool.find(o => !o.active);
        if (obs) {
            obs.initType(type);
            obs.laneIndex = laneIndex;
            obs.spawn(this.gameState.lanes[laneIndex], z, config);
        }
    }

    spawnPattern() {
        const z = 800;
        const t1 = this.types[randInt(0, this.types.length - 1)];
        const l1 = randInt(0, 2);
        
        let config = {};
        if (t1 === 'movingBarrier') config.dir = Math.random() > 0.5 ? 1 : -1;
        if (t1 === 'sideSpike') {
            const sideLane = Math.random() > 0.5 ? 0 : 2;
            this.spawnObstacle(t1, sideLane, z, config);
            return;
        }

        this.spawnObstacle(t1, l1, z, config);

        // Chance for a second obstacle
        if (Math.random() > 0.6 + (this.gameState.difficultyLevel * 0.05)) {
            let l2 = randInt(0, 2);
            while (l2 === l1) l2 = randInt(0, 2);
            const t2 = this.types[randInt(0, this.types.length - 1)];
            if (t2 !== 'sideSpike') {
                this.spawnObstacle(t2, l2, z, config);
            }
        }
    }

    /** Boss wave: one pair of obstacles, always leaving exactly one clear lane */
    spawnBossBurst() {
        const z = 800;
        // Use only simple obstacle types that are clearly dodgeable
        const safeTypes = ['lowWall', 'ceilingBeam', 'movingBarrier'];
        const wallType = safeTypes[Math.floor(Math.random() * safeTypes.length)];
        
        // Pick one lane to keep clear — always announced by leaving EXACTLY one empty lane
        const clearLane = randInt(0, 2);
        for (let lane = 0; lane < 3; lane++) {
            if (lane === clearLane) continue;
            this.spawnObstacle(wallType, lane, z);
        }
    }

    draw(ctx, camera) {
        // Sort by Z for proper draw order (back to front) - Painter's Algorithm
        const activePool = this.pool.filter(obs => obs.active);
        activePool.sort((a, b) => b.z - a.z);
        
        activePool.forEach(obs => {
            obs.draw(ctx, camera);
        });
    }

    reset() {
        this.pool.forEach(obs => obs.active = false);
        this.nearMissCandidates.clear();
        this.spawnTimer = 2.0;
        this.bossSpawnTimer = 0;
    }
}
