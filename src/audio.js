/**
 * src/audio.js
 * Procedural web audio generator
 */

export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.5;
        this.masterGain.connect(this.ctx.destination);
        
        this.isMuted = false;
        this.bgmOsc = null;
        this.bgmGain = null;
        this.bgmFilter = null;
        this.bgmInterval = null;
        this.bgmStep = 0;
    }

    mute() {
        this.isMuted = true;
        this.masterGain.gain.value = 0;
    }

    unmute() {
        this.isMuted = false;
        this.masterGain.gain.value = 0.5;
        if(this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    toggleMute() {
        this.isMuted ? this.unmute() : this.mute();
        return this.isMuted;
    }

    playOsc(type, freqStart, freqEnd, duration, vol = 1) {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, t);
        if (freqEnd !== freqStart) {
            osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration);
        }
        
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        osc.stop(t + duration);
    }

    playNoise(duration, filterFreq, vol = 1) {
        if (this.isMuted) return;
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(filterFreq, t);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start(t);
    }

    play(soundName) {
        if(this.ctx.state === 'suspended') this.ctx.resume();

        switch(soundName) {
            case 'jump':
                this.playOsc('square', 220, 440, 0.15, 0.3);
                break;
            case 'duck':
                this.playOsc('square', 440, 220, 0.15, 0.3);
                break;
            case 'hit':
                this.playNoise(0.3, 800, 1.0);
                this.playOsc('sawtooth', 100, 50, 0.3, 0.5);
                break;
            case 'powerup':
                // 3 note chime
                const t = this.ctx.currentTime;
                [440, 554, 659].forEach((freq, i) => {
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.value = freq;
                    gain.gain.setValueAtTime(0, t + i*0.1);
                    gain.gain.linearRampToValueAtTime(0.3, t + i*0.1 + 0.05);
                    gain.gain.exponentialRampToValueAtTime(0.01, t + i*0.1 + 0.3);
                    osc.connect(gain);
                    gain.connect(this.masterGain);
                    osc.start(t + i*0.1);
                    osc.stop(t + i*0.1 + 0.3);
                });
                break;
            case 'speedup':
                this.playOsc('sawtooth', 300, 800, 0.5, 0.4);
                break;
            case 'gameover':
                this.playOsc('square', 300, 50, 1.0, 0.5);
                break;
        }
    }

    // A simple pounding techno beat in the background
    startBGM() {
        if(this.ctx.state === 'suspended') this.ctx.resume();
        this.stopBGM();
        
        let tempo = 140; // BPM
        let beatTime = 60 / tempo;

        const playBeat = () => {
            if(this.isMuted) return;
            const t = this.ctx.currentTime;
            
            // Kick drum
            const kickOsc = this.ctx.createOscillator();
            const kickGain = this.ctx.createGain();
            kickOsc.frequency.setValueAtTime(150, t);
            kickOsc.frequency.exponentialRampToValueAtTime(0.01, t + 0.1);
            kickGain.gain.setValueAtTime(0.8, t);
            kickGain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
            kickOsc.connect(kickGain);
            kickGain.connect(this.masterGain);
            kickOsc.start(t);
            kickOsc.stop(t + 0.1);

            // Bassline (syncopated)
            if (this.bgmStep % 2 !== 0) {
                const bassOsc = this.ctx.createOscillator();
                const bassGain = this.ctx.createGain();
                const filter = this.ctx.createBiquadFilter();
                
                bassOsc.type = 'square';
                bassOsc.frequency.value = [55, 65, 73, 82][this.bgmStep % 4];
                
                filter.type = 'lowpass';
                filter.frequency.value = 400;

                bassGain.gain.setValueAtTime(0.3, t);
                bassGain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

                bassOsc.connect(filter);
                filter.connect(bassGain);
                bassGain.connect(this.masterGain);
                
                bassOsc.start(t);
                bassOsc.stop(t + 0.15);
            }

            this.bgmStep++;
        };

        this.bgmInterval = setInterval(playBeat, (beatTime / 2) * 1000);
    }

    stopBGM() {
        if(this.bgmInterval) {
            clearInterval(this.bgmInterval);
            this.bgmInterval = null;
        }
    }
}
