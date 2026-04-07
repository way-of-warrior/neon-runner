/**
 * src/utils.js
 * Utility functions for math, interpolation, collision mapping
 */

/**
 * Linear interpolation
 */
export function lerp(a, b, t) {
    return a + (b - a) * t;
}

/**
 * Clamp a value between min and max
 */
export function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/**
 * Get random float between min and max
 */
export function rand(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Get random integer
 */
export function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

/**
 * Project 3D world coordinates (x, y, z) into 2D canvas coordinates (px, py) and scale
 * @param {number} x - Left/Right position
 * @param {number} y - Up/Down position
 * @param {number} z - Depth position (distance from camera)
 * @param {Object} camera - Camera configuration { x, y, z, fov, canvasWidth, canvasHeight }
 * @returns {Object} { px, py, scale }
 */
export function project3D(x, y, z, camera) {
    // Relative to camera
    const relX = x - camera.x;
    const relY = y - camera.y;
    // Prevent z <= 0 to avoid division by zero or going behind camera
    const relZ = Math.max(z - camera.z, 1); 

    // Calculate scale based on field of view and depth
    const scale = camera.fov / relZ;

    // Project to 2D
    const px = (relX * scale) + (camera.canvasWidth / 2);
    // Note: Inverting Y so that positive y goes up from ground
    const py = camera.canvasHeight / 2 - (relY * scale);

    return { px, py, scale };
}

/**
 * Simple 2D AABB rectangle intersection.
 * NOTE: coordinate system is Y-up, so 'top' > 'bottom' numerically.
 * left < right, bottom < top.
 */
export function rectIntersect(r1, r2) {
    return !(
        r2.left   > r1.right  ||   // r2 is to the right of r1
        r2.right  < r1.left   ||   // r2 is to the left of r1
        r2.bottom > r1.top    ||   // r2 is above r1  (in Y-up: r2.bottom > r1.top means r2 is higher)
        r2.top    < r1.bottom      // r2 is below r1
    );
}
