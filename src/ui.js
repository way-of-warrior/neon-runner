/**
 * src/ui.js
 * Updates the HTML/CSS overlays based on GameState
 */

export class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        
        // Cache DOM elements
        this.els = {
            score: document.getElementById('score'),
            highScore: document.getElementById('high-score'),
            lives: document.getElementById('lives-display'),
            combo: document.getElementById('combo-display'),
            speed: document.getElementById('speed-multiplier'),
            startHighScore: document.getElementById('start-high-score'),
            finalScore: document.getElementById('final-score'),
            newHighMsg: document.getElementById('new-high-score-msg'),
            notification: document.getElementById('notification'),
            powerupContainer: document.getElementById('powerup-bar-container'),
            powerupFill: document.getElementById('powerup-bar-fill'),
            powerupLabel: document.getElementById('powerup-label'),
            hud: document.getElementById('hud'),
            
            // Screens
            screenStart: document.getElementById('screen-start'),
            screenPaused: document.getElementById('screen-paused'),
            screenGameOver: document.getElementById('screen-game-over'),
            
            // Buttons
            btnMute: document.getElementById('btn-mute')
        };
        
        this.notifTimeout = null;
        
        this.registerEvents();
    }
    
    registerEvents() {
        this.gameState.on('stateChange', (state) => this.showScreen(state));
        this.gameState.on('reset', () => this.updateAll());
        this.gameState.on('speedUp', (mult) => {
            this.updateText();
            this.showNotification('SPEED UP!', '#ff0');
        });
        this.gameState.on('comboUp', (combo) => this.updateText());
        this.gameState.on('hit', (lives) => {
            this.updateLives();
            this.updateText();
        });
    }

    showScreen(state) {
        // Hide all screens
        this.els.screenStart.classList.add('hidden');
        this.els.screenPaused.classList.add('hidden');
        this.els.screenGameOver.classList.add('hidden');
        this.els.hud.classList.add('hidden');
        
        switch(state) {
            case 'START':
                this.els.screenStart.classList.remove('hidden');
                this.els.startHighScore.textContent = this.gameState.highScore;
                break;
            case 'PLAYING':
                this.els.hud.classList.remove('hidden');
                break;
            case 'PAUSED':
                this.els.hud.classList.remove('hidden');
                this.els.screenPaused.classList.remove('hidden');
                break;
            case 'GAME_OVER':
                this.els.screenGameOver.classList.remove('hidden');
                this.els.finalScore.textContent = `SCORE: ${Math.floor(this.gameState.score)}`;
                if (Math.floor(this.gameState.score) >= this.gameState.highScore && this.gameState.score > 0) {
                    this.els.newHighMsg.classList.remove('hidden');
                } else {
                    this.els.newHighMsg.classList.add('hidden');
                }
                
                // Refresh Ad
                try {
                    if (window.adsbygoogle) {
                        window.adsbygoogle.push({});
                    }
                } catch (e) {
                    console.error('AdSense error:', e);
                }
                break;
        }
    }

    updateText() {
        this.els.score.textContent = Math.floor(this.gameState.score);
        this.els.highScore.textContent = `HI: ${this.gameState.highScore}`;
        this.els.combo.textContent = `COMBO x${this.gameState.combo.toFixed(1)}`;
        this.els.speed.textContent = `${this.gameState.speedMultiplier.toFixed(1)}x SPD`;
    }

    updateLives() {
        let hearts = '';
        for (let i = 0; i < Math.max(0, this.gameState.lives); i++) {
            hearts += '❤️';
        }
        for (let i = this.gameState.lives; i < 3; i++) {
            hearts += '🖤';
        }
        this.els.lives.textContent = hearts;
    }

    showNotification(text, color) {
        this.els.notification.textContent = text;
        this.els.notification.style.color = color;
        this.els.notification.style.textShadow = `0 0 20px ${color}`;
        
        this.els.notification.classList.remove('show');
        // Trigger reflow
        void this.els.notification.offsetWidth;
        this.els.notification.classList.add('show');
        
        if (this.notifTimeout) clearTimeout(this.notifTimeout);
        this.notifTimeout = setTimeout(() => {
            this.els.notification.classList.remove('show');
        }, 1500);
    }

    setPowerUpBar(active, name = '', color = '', percent = 0) {
        if (!active) {
            this.els.powerupContainer.classList.add('hidden');
            return;
        }
        this.els.powerupContainer.classList.remove('hidden');
        this.els.powerupLabel.textContent = name;
        this.els.powerupFill.style.backgroundColor = color;
        this.els.powerupFill.style.width = `${percent * 100}%`;
    }

    updateAll() {
        this.updateText();
        this.updateLives();
        this.setPowerUpBar(false);
    }
}
