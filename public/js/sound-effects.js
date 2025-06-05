// 🎵 Tron-Style Sound Effects Manager
// Generates synth sounds using Web Audio API - no file loading required!

class SoundEffectsManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isEnabled = true;
        this.volume = 0.3; // Default volume
        this.init();
    }

    async init() {
        try {
            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create master gain node for volume control
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
            this.masterGain.connect(this.audioContext.destination);
            
            console.log('🎵 Sound Effects Manager initialized');
            console.log('🔊 Volume:', this.volume);
        } catch (error) {
            console.warn('⚠️ Web Audio API not supported:', error);
            this.isEnabled = false;
        }
    }

    // Resume audio context (required for modern browsers)
    async resumeAudio() {
        if (this.audioContext && this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
            console.log('🎵 Audio context resumed');
        }
    }

    // 🪙 Coin Collection Sound - Simple melodic tones (like classic Mario)
    playCoinCollect() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        
        // Play a simple C major arpeggio: C - E - G (very classic and pleasant)
        const notes = [
            { freq: 523.25, time: 0,    duration: 0.1 }, // C5
            { freq: 659.25, time: 0.07, duration: 0.1 }, // E5  
            { freq: 783.99, time: 0.14, duration: 0.15 } // G5
        ];
        
        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            // Simple triangle wave for soft, pleasant tone
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.freq, now + note.time);
            
            // Quick attack, smooth decay
            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(0.3, now + note.time + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + note.duration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now + note.time);
            osc.stop(now + note.time + note.duration);
        });
    }

    // 💥 Player Collision Sound - Quick impact sound
    playPlayerCollision() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 0.15;

        // Impact sound - quick, punchy
        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + duration);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Add some filtering for a thud-like sound
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, now);
        filter.Q.setValueAtTime(2, now);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + duration);
    }

    // ✨ Opponent Collection - Subtle sparkle
    playOpponentCollect() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 0.2;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
        osc.frequency.exponentialRampToValueAtTime(300, now + duration);
        
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + duration);
    }

    // 🎮 Player Join Sound - Welcome synth chord
    playPlayerJoin() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 0.8;
        const frequencies = [220, 277, 330, 440]; // A minor chord

        frequencies.forEach((freq, index) => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            
            gain.gain.setValueAtTime(0, now);
            gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now + index * 0.1);
            osc.stop(now + duration);
        });
    }

    // 👋 Player Leave Sound - Descending synth
    playPlayerLeave() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 0.6;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + duration);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Add some filtering
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(200, now + duration);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + duration);
    }

    // 🏆 Score Milestone Sound - Triumphant synth arpeggio
    playScoreMilestone(score) {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const notes = [440, 554, 659, 880]; // A, C#, E, A (major arpeggio)
        
        notes.forEach((freq, index) => {
            const startTime = now + index * 0.1;
            const duration = 0.3;
            
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(freq, startTime);
            
            gain.gain.setValueAtTime(0.3, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(startTime);
            osc.stop(startTime + duration);
        });
    }

    // 🚀 Game Start Sound - Rising synth sweep
    playGameStart() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 1.5;

        // Main sweep
        const osc1 = this.audioContext.createOscillator();
        const gain1 = this.audioContext.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(80, now);
        osc1.frequency.exponentialRampToValueAtTime(800, now + duration);
        
        gain1.gain.setValueAtTime(0, now);
        gain1.gain.linearRampToValueAtTime(0.2, now + 0.2);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // High sparkle
        const osc2 = this.audioContext.createOscillator();
        const gain2 = this.audioContext.createGain();
        
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(1600, now + 0.5);
        osc2.frequency.exponentialRampToValueAtTime(3200, now + duration);
        
        gain2.gain.setValueAtTime(0, now + 0.5);
        gain2.gain.linearRampToValueAtTime(0.15, now + 0.7);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Filter for movement
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, now);
        filter.frequency.exponentialRampToValueAtTime(4000, now + duration);
        
        osc1.connect(filter);
        osc2.connect(gain2);
        filter.connect(gain1);
        gain1.connect(this.masterGain);
        gain2.connect(this.masterGain);
        
        osc1.start(now);
        osc2.start(now + 0.5);
        osc1.stop(now + duration);
        osc2.stop(now + duration);
    }

    // 🎯 Button Click Sound - Quick blip
    playButtonClick() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 0.1;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.03);
        osc.frequency.exponentialRampToValueAtTime(400, now + duration);
        
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        osc.stop(now + duration);
    }

    // 🌊 Ambient Background Hum - Continuous atmospheric sound
    startAmbientHum() {
        if (!this.isEnabled || this.ambientOsc) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        
        this.ambientOsc = this.audioContext.createOscillator();
        this.ambientGain = this.audioContext.createGain();
        this.ambientFilter = this.audioContext.createBiquadFilter();
        
        this.ambientOsc.type = 'sawtooth';
        this.ambientOsc.frequency.setValueAtTime(55, now); // Low A
        
        this.ambientFilter.type = 'lowpass';
        this.ambientFilter.frequency.setValueAtTime(200, now);
        this.ambientFilter.Q.setValueAtTime(5, now);
        
        this.ambientGain.gain.setValueAtTime(0, now);
        this.ambientGain.gain.linearRampToValueAtTime(0.05, now + 2);
        
        this.ambientOsc.connect(this.ambientFilter);
        this.ambientFilter.connect(this.ambientGain);
        this.ambientGain.connect(this.masterGain);
        
        this.ambientOsc.start(now);
        
        // Add some variation to the ambient sound
        this.modulateAmbient();
    }

    modulateAmbient() {
        if (!this.ambientOsc) return;
        
        const now = this.audioContext.currentTime;
        const variation = Math.random() * 20 + 45; // 45-65 Hz
        const duration = Math.random() * 3 + 2; // 2-5 seconds
        
        this.ambientOsc.frequency.exponentialRampToValueAtTime(variation, now + duration);
        this.ambientFilter.frequency.exponentialRampToValueAtTime(
            Math.random() * 300 + 100, 
            now + duration
        );
        
        // Schedule next modulation
        setTimeout(() => this.modulateAmbient(), duration * 1000);
    }

    stopAmbientHum() {
        if (this.ambientOsc) {
            const now = this.audioContext.currentTime;
            this.ambientGain.gain.exponentialRampToValueAtTime(0.01, now + 1);
            this.ambientOsc.stop(now + 1);
            this.ambientOsc = null;
        }
    }

    // Volume control
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.volume, this.audioContext.currentTime);
        }
        console.log('🔊 Volume set to:', this.volume);
    }

    // Toggle sounds on/off
    toggle() {
        this.isEnabled = !this.isEnabled;
        if (!this.isEnabled) {
            this.stopAmbientHum();
        }
        console.log('🎵 Sound effects:', this.isEnabled ? 'ON' : 'OFF');
        return this.isEnabled;
    }

    // 💚 Extra Life Gained Sound - Triumphant chord
    playExtraLife() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        
        // Play uplifting major chord progression
        const chords = [
            { freqs: [261.63, 329.63, 392.00], time: 0,   duration: 0.3 }, // C major
            { freqs: [293.66, 369.99, 440.00], time: 0.2, duration: 0.4 }  // D major
        ];
        
        chords.forEach(chord => {
            chord.freqs.forEach(freq => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, now + chord.time);
                
                gain.gain.setValueAtTime(0, now + chord.time);
                gain.gain.linearRampToValueAtTime(0.2, now + chord.time + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, now + chord.time + chord.duration);
                
                osc.connect(gain);
                gain.connect(this.masterGain);
                
                osc.start(now + chord.time);
                osc.stop(now + chord.time + chord.duration);
            });
        });
    }

    // 💔 Life Lost Sound - Dramatic descending tone
    playLifeLost() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        const duration = 0.8;

        const osc = this.audioContext.createOscillator();
        const gain = this.audioContext.createGain();
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now); // Low A
        osc.frequency.exponentialRampToValueAtTime(110, now + duration);
        
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        
        // Add tremolo effect
        const tremolo = this.audioContext.createGain();
        const lfo = this.audioContext.createOscillator();
        lfo.frequency.setValueAtTime(6, now); // 6Hz tremolo
        lfo.connect(tremolo.gain);
        
        osc.connect(tremolo);
        tremolo.connect(gain);
        gain.connect(this.masterGain);
        
        osc.start(now);
        lfo.start(now);
        osc.stop(now + duration);
        lfo.stop(now + duration);
    }

    // ☠️ Player Eliminated Sound - Game over tone
    playEliminated() {
        if (!this.isEnabled) return;
        this.resumeAudio();

        const now = this.audioContext.currentTime;
        
        // Classic "game over" descending minor chord
        const notes = [
            { freq: 220, time: 0 },    // A
            { freq: 196, time: 0.3 },  // G
            { freq: 175, time: 0.6 },  // F
            { freq: 147, time: 0.9 }   // D
        ];
        
        notes.forEach(note => {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(note.freq, now + note.time);
            
            gain.gain.setValueAtTime(0, now + note.time);
            gain.gain.linearRampToValueAtTime(0.4, now + note.time + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.01, now + note.time + 0.5);
            
            osc.connect(gain);
            gain.connect(this.masterGain);
            
            osc.start(now + note.time);
            osc.stop(now + note.time + 0.5);
        });
    }
}

// Create global sound manager
window.soundManager = new SoundEffectsManager();

console.log('🎵 Tron-style sound effects loaded!'); 