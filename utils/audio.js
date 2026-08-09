/* ==========================================================================
   SnapBooth Studio - Web Audio Synthesizer
   Synthesizes shutter click & countdown beep sound effects using Web Audio API
   ========================================================================== */

class SoundSynthesizer {
    constructor() {
        this.ctx = null;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    // Short beep for countdown numbers (3, 2, 1)
    playBeep(frequency = 600, duration = 0.08) {
        try {
            this.init();
            if (!this.ctx) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio play error:', e);
        }
    }

    // High pitch beep when taking picture (0 seconds)
    playSnapBeep() {
        this.playBeep(1200, 0.15);
    }

    // Mechanical camera shutter sound effect
    playShutterSound() {
        try {
            this.init();
            if (!this.ctx) return;

            const now = this.ctx.currentTime;

            // 1. Shutter noise burst
            const bufferSize = this.ctx.sampleRate * 0.08;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }

            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(1000, now);
            noiseFilter.Q.setValueAtTime(1.5, now);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);

            // 2. Mechanical click metallic pulse
            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(220, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);

            oscGain.gain.setValueAtTime(0.3, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

            osc.connect(oscGain);
            oscGain.connect(this.ctx.destination);

            noise.start(now);
            osc.start(now);
            osc.stop(now + 0.05);

        } catch (e) {
            console.warn('Shutter audio error:', e);
        }
    }
}

window.soundSynth = new SoundSynthesizer();
