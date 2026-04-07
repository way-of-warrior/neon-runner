/**
 * src/inputHandler.js
 * Handles keyboard, touch, and mapped on-screen buttons
 */

export class InputHandler {
    constructor() {
        this.keys = {};
        this.actions = {
            jump: false,
            duck: false,
            left: false,
            right: false,
            pause: false,
            any: false
        };
        
        // Debounce tracking
        this.justPressed = {
            jump: false,
            duck: false,
            left: false,
            right: false,
            pause: false,
            any: false
        };

        // Touch tracking
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.swipeThreshold = 30;

        this.initEventListeners();
    }

    initEventListeners() {
        // Keyboard
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            this.updateActions(e.code, true);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            this.updateActions(e.code, false);
        });

        // Touch
        window.addEventListener('touchstart', (e) => {
            this.actions.any = true;
            this.justPressed.any = true;
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
        }, { passive: false });

        window.addEventListener('touchend', (e) => {
            if (this.actions.any) {
                this.actions.any = false;
            }
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            this.handleSwipe(this.touchStartX, this.touchStartY, touchEndX, touchEndY);
        });

        // Prevent default scrolling on canvas
        document.getElementById('game-container').addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

        // On-screen buttons (for mobile if visible)
        const bindButton = (id, action) => {
            const btn = document.getElementById(id);
            if(btn) {
                btn.addEventListener('touchstart', (e) => { e.preventDefault(); this.triggerAction(action, true); });
                btn.addEventListener('touchend', (e) => { e.preventDefault(); this.triggerAction(action, false); });
                btn.addEventListener('mousedown', (e) => { e.preventDefault(); this.triggerAction(action, true); });
                btn.addEventListener('mouseup', (e) => { e.preventDefault(); this.triggerAction(action, false); });
            }
        };

        bindButton('btn-up', 'jump');
        bindButton('btn-down', 'duck');
        bindButton('btn-left', 'left');
        bindButton('btn-right', 'right');
    }

    updateActions(code, isPressed) {
        if (isPressed) {
            this.actions.any = true;
            this.justPressed.any = true;
        }

        switch(code) {
            case 'ArrowUp':
            case 'KeyW':
            case 'Space':
                this.triggerAction('jump', isPressed);
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.triggerAction('duck', isPressed);
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.triggerAction('left', isPressed);
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.triggerAction('right', isPressed);
                break;
            case 'Escape':
            case 'KeyP':
                this.triggerAction('pause', isPressed);
                break;
        }
    }

    triggerAction(action, isPressed) {
        if (isPressed && !this.actions[action]) {
            this.justPressed[action] = true;
        }
        this.actions[action] = isPressed;
    }

    handleSwipe(startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;

        if (Math.abs(dx) > Math.abs(dy)) {
            // Horizontal swipe
            if (Math.abs(dx) > this.swipeThreshold) {
                if (dx > 0) this.justPressed.right = true;
                else this.justPressed.left = true;
            }
        } else {
            // Vertical swipe
            if (Math.abs(dy) > this.swipeThreshold) {
                if (dy < 0) this.justPressed.jump = true; // Up is negative Y
                else this.justPressed.duck = true;
            }
        }
    }

    consumeAction(action) {
        if (this.justPressed[action]) {
            this.justPressed[action] = false;
            return true;
        }
        return false;
    }

    reset() {
        for (let key in this.justPressed) {
            this.justPressed[key] = false;
        }
    }
}
