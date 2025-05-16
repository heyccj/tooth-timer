// Unified Audio Manager for iOS and other platforms
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.initialized = false;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.hasUserInteracted = false;
        this.promptElement = null;
        this.wakeLockManager = null;
    }

    initialize(wakeLockManager) {
        this.wakeLockManager = wakeLockManager;
        
        // Create audio context
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext created with state:", this.audioContext.state);
            
            // Setup event listener for state changes
            this.audioContext.onstatechange = () => {
                console.log("AudioContext state changed to:", this.audioContext.state);
            };
        } catch (e) {
            console.error("Failed to create AudioContext:", e);
            return false;
        }
        
        // For iOS, show a unified prompt
        if (this.isIOS && !this.hasUserInteracted) {
            this.showPermissionPrompt();
        }
        
        // Setup event listeners for user interaction
        const interactionEvents = ['click', 'touchstart'];
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.handleUserInteraction();
            }, { once: true, passive: true });
        });
        
        return true;
    }
    
    showPermissionPrompt() {
        // Remove any existing prompt
        this.removePrompt();
        
        // Create the prompt element
        this.promptElement = document.createElement('div');
        this.promptElement.style.position = 'fixed';
        this.promptElement.style.top = '50%';
        this.promptElement.style.left = '50%';
        this.promptElement.style.transform = 'translate(-50%, -50%)';
        this.promptElement.style.padding = '20px';
        this.promptElement.style.backgroundColor = 'rgba(0,0,0,0.8)';
        this.promptElement.style.color = 'white';
        this.promptElement.style.borderRadius = '10px';
        this.promptElement.style.zIndex = '10000';
        this.promptElement.style.textAlign = 'center';
        this.promptElement.style.maxWidth = '80%';
        this.promptElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        this.promptElement.innerHTML = `
            <h3 style="margin-top:0;font-size:18px;">Tap to Enable Features</h3>
            <p style="margin:10px 0;font-size:14px;">• Keep screen on during timer</p>
            <p style="margin:10px 0;font-size:14px;">• Enable timer sound notifications</p>
            <button style="background:#007bff;border:none;color:white;padding:8px 16px;border-radius:4px;margin-top:10px;font-size:16px;">Enable</button>
        `;
        
        // Add to document
        document.body.appendChild(this.promptElement);
        
        // Add click handler specifically for the button
        const button = this.promptElement.querySelector('button');
        if (button) {
            button.addEventListener('click', () => {
                this.handleUserInteraction();
            });
        }
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            this.removePrompt();
        }, 10000);
    }
    
    handleUserInteraction() {
        this.hasUserInteracted = true;
        
        // Remove the prompt
        this.removePrompt();
        
        // Resume the audio context
        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed by user interaction");
                this.initialized = true;
                this.playUnblockSound();
            }).catch(err => {
                console.error("Failed to resume AudioContext on user interaction:", err);
            });
        } else {
            this.initialized = true;
            this.playUnblockSound();
        }
        
        // Also try to enable wake lock
        if (this.wakeLockManager) {
            this.wakeLockManager.hasUserInteracted = true;
            this.wakeLockManager.requestWakeLock();
        }
    }
    
    removePrompt() {
        if (this.promptElement && document.body.contains(this.promptElement)) {
            document.body.removeChild(this.promptElement);
            this.promptElement = null;
        }
    }
    
    playUnblockSound() {
        // Play a silent sound to unblock audio on iOS
        if (this.audioContext) {
            // Method 1: Silent buffer
            const buffer = this.audioContext.createBuffer(1, 1, 22050);
            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(this.audioContext.destination);
            source.start(0);
            
            // Method 2: Short inaudible beep
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            gainNode.gain.setValueAtTime(0.01, this.audioContext.currentTime);
            osc.frequency.setValueAtTime(440, this.audioContext.currentTime);
            osc.start(this.audioContext.currentTime);
            osc.stop(this.audioContext.currentTime + 0.1);
            
            // Method 3: Play silent MP3
            this.playSilentMP3();
        }
    }
    
    playSilentMP3() {
        // Create a silent HTML audio element
        const silentAudio = document.createElement('audio');
        silentAudio.setAttribute('autoplay', '');
        silentAudio.setAttribute('playsinline', '');
        silentAudio.setAttribute('webkit-playsinline', '');
        
        // Add a short silent MP3 file
        const source = document.createElement('source');
        source.src = '1-sec.mp3';
        source.type = 'audio/mpeg';
        silentAudio.appendChild(source);
        
        // Play the silent audio
        document.body.appendChild(silentAudio);
        silentAudio.play().catch(e => console.error('Silent audio play error:', e));
        
        // Remove after playing
        setTimeout(() => {
            if (document.body.contains(silentAudio)) {
                document.body.removeChild(silentAudio);
            }
        }, 1000);
    }
    
    playSound(type) {
        console.log(`Attempting to play ${type} sound`);
        
        // Make sure audio is initialized
        if (!this.audioContext || this.audioContext.state === 'closed') {
            console.error("AudioContext not available for", type);
            return;
        }
        
        // Always try to resume the context before playing
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                console.log("AudioContext resumed before playing", type);
                this.actuallyPlaySound(type);
            }).catch(err => {
                console.error(`Failed to resume AudioContext for ${type}:`, err);
                
                // For iOS, show the prompt again if we can't resume
                if (this.isIOS && !this.hasUserInteracted) {
                    this.showPermissionPrompt();
                }
            });
        } else {
            this.actuallyPlaySound(type);
        }
        
        // Add vibration for mobile devices
        if ('vibrate' in navigator) {
            switch(type) {
                case 'start':
                    navigator.vibrate(100);
                    break;
                case 'intermediate':
                    navigator.vibrate([100, 50, 100]);
                    break;
                case 'end':
                    navigator.vibrate([200, 100, 200, 100, 200]);
                    break;
            }
        }
    }
    
    actuallyPlaySound(type) {
        console.log(`Actually playing ${type} sound`);
        
        const now = this.audioContext.currentTime;
        
        switch(type) {
            case 'start':
                // Create bell-like sound with harmonics
                this.createBellTone(440, 0.4, now);  // Fundamental - increased volume
                this.createBellTone(880, 0.2, now);  // 2nd harmonic - increased volume
                this.createBellTone(1320, 0.15, now); // 3rd harmonic - increased volume
                break;
                
            case 'intermediate':
                // Double bell for intermediate
                this.createBellTone(523.25, 0.4, now);  // Fundamental (C5) - increased volume
                this.createBellTone(1046.5, 0.2, now);  // 2nd harmonic - increased volume
                this.createBellTone(1569.75, 0.1, now); // 3rd harmonic - increased volume
                
                // Second bell after a short delay
                this.createBellTone(523.25, 0.4, now + 0.5);
                this.createBellTone(1046.5, 0.2, now + 0.5);
                this.createBellTone(1569.75, 0.1, now + 0.5);
                break;
                
            case 'end':
                // Play ascending bell sequence with increased volume
                this.createBellTone(523.25, 0.4, now);       // C5
                this.createBellTone(523.25 * 2, 0.2, now);   // 2nd harmonic
                this.createBellTone(523.25 * 3, 0.1, now);   // 3rd harmonic
                
                this.createBellTone(587.33, 0.4, now + 0.6); // D5
                this.createBellTone(587.33 * 2, 0.2, now + 0.6);
                this.createBellTone(587.33 * 3, 0.1, now + 0.6);
                
                this.createBellTone(659.25, 0.4, now + 1.2); // E5
                this.createBellTone(659.25 * 2, 0.2, now + 1.2);
                this.createBellTone(659.25 * 3, 0.1, now + 1.2);
                break;
        }
    }
    
    createBellTone(freq, gain, time) {
        try {
            const osc = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gainNode.gain.setValueAtTime(gain, time);
            // Use linearRampToValueAtTime for better iOS compatibility
            gainNode.gain.linearRampToValueAtTime(0.01, time + 1.0);
            
            osc.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            osc.start(time);
            osc.stop(time + 1.0);
            
            console.log(`Created bell tone at frequency ${freq}`);
            return true;
        } catch (e) {
            console.error("Failed to create bell tone:", e);
            return false;
        }
    }
    
    // Convenience methods
    playStartSound() {
        this.playSound('start');
    }
    
    playIntermediateSound() {
        this.playSound('intermediate');
    }
    
    playEndSound() {
        this.playSound('end');
    }
}
