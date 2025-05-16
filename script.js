// Global audio context with better management
let audioContext = null;
let audioInitialized = false;

// Initialize audio context with more robust handling
function initAudio() {
    if (audioContext === null) {
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log("AudioContext created with state:", audioContext.state);
            
            // iOS requires explicit resume of AudioContext
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    console.log("AudioContext resumed successfully");
                    audioInitialized = true;
                }).catch(err => {
                    console.error("Failed to resume AudioContext:", err);
                });
            } else {
                audioInitialized = true;
                console.log("AudioContext initialized and active");
            }
            
            // Setup event listener for state changes
            audioContext.onstatechange = () => {
                console.log("AudioContext state changed to:", audioContext.state);
            };
        } catch (e) {
            console.error("Failed to create AudioContext:", e);
        }
    } else if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("AudioContext resumed from suspended state");
            audioInitialized = true;
        }).catch(err => {
            console.error("Failed to resume existing AudioContext:", err);
        });
    }
    
    return audioInitialized;
}

// Function to enable audio on iOS silent mode
function enableIOSAudio() {
    // Create a silent HTML audio element
    const silentAudio = document.createElement('audio');
    silentAudio.setAttribute('autoplay', '');
    silentAudio.setAttribute('playsinline', '');
    silentAudio.setAttribute('webkit-playsinline', '');
    
    // Add a short silent MP3 file (can be replaced with a real silent MP3)
    const source = document.createElement('source');
    source.src = '1-sec.mp3';
    source.type = 'audio/mpeg';
    silentAudio.appendChild(source);
    
    // Play the silent audio
    document.body.appendChild(silentAudio);
    silentAudio.play().catch(e => console.error('Silent audio play error:', e));
    
    // Also use the unblockPlayback function
    unblockPlayback();
}

// Reliable sound player function that works on all devices
function playSound(type) {
    console.log(`Attempting to play ${type} sound`);
    
    // Make sure audio is initialized
    if (!audioContext) {
        const initialized = initAudio();
        if (!initialized) {
            console.error("Failed to initialize audio for", type);
            return;
        }
    }
    
    // Always try to resume the context before playing
    if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
            console.log("AudioContext resumed before playing", type);
            actuallyPlaySound(type);
        }).catch(err => {
            console.error(`Failed to resume AudioContext for ${type}:`, err);
        });
    } else {
        actuallyPlaySound(type);
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

// Function that actually plays the sound
function actuallyPlaySound(type) {
    console.log(`Actually playing ${type} sound`);
    
    const now = audioContext.currentTime;
    
    switch(type) {
        case 'start':
            // Create bell-like sound with harmonics
            createBellTone(440, 0.4, now);  // Fundamental - increased volume
            createBellTone(880, 0.2, now);  // 2nd harmonic - increased volume
            createBellTone(1320, 0.15, now); // 3rd harmonic - increased volume
            break;
            
        case 'intermediate':
            // Double bell for intermediate
            createBellTone(523.25, 0.4, now);  // Fundamental (C5) - increased volume
            createBellTone(1046.5, 0.2, now);  // 2nd harmonic - increased volume
            createBellTone(1569.75, 0.1, now); // 3rd harmonic - increased volume
            
            // Second bell after a short delay
            createBellTone(523.25, 0.4, now + 0.5);
            createBellTone(1046.5, 0.2, now + 0.5);
            createBellTone(1569.75, 0.1, now + 0.5);
            break;
            
        case 'end':
            // Play ascending bell sequence with increased volume
            createBellTone(523.25, 0.4, now);       // C5
            createBellTone(523.25 * 2, 0.2, now);   // 2nd harmonic
            createBellTone(523.25 * 3, 0.1, now);   // 3rd harmonic
            
            createBellTone(587.33, 0.4, now + 0.6); // D5
            createBellTone(587.33 * 2, 0.2, now + 0.6);
            createBellTone(587.33 * 3, 0.1, now + 0.6);
            
            createBellTone(659.25, 0.4, now + 1.2); // E5
            createBellTone(659.25 * 2, 0.2, now + 1.2);
            createBellTone(659.25 * 3, 0.1, now + 1.2);
            break;
    }
}

// Helper function to create bell tones
function createBellTone(freq, gain, time) {
    try {
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        gainNode.gain.setValueAtTime(gain, time);
        // Use linearRampToValueAtTime for better iOS compatibility
        gainNode.gain.linearRampToValueAtTime(0.01, time + 1.0);
        
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        osc.start(time);
        osc.stop(time + 1.0);
        
        console.log(`Created bell tone at frequency ${freq}`);
        return true;
    } catch (e) {
        console.error("Failed to create bell tone:", e);
        return false;
    }
}

// Improved unblockPlayback function
function unblockPlayback() {
    // Create and play a silent audio buffer to unblock audio on iOS
    if (audioContext) {
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
        
        // For iOS, also try playing a short beep that's inaudible
        const osc = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        osc.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Set the volume very low
        gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
        
        // Use a high frequency that's less audible
        osc.frequency.setValueAtTime(19000, audioContext.currentTime);
        
        // Play for a very short time
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.01);
    }
}

// Play start notification (bell sound)
function playStartSound() {
    playSound('start');
}

// Play intermediate notification with special handling for iOS
function playIntermediateSound() {
    console.log("Attempting to play intermediate sound");
    
    // Check if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    // For iOS, try to forcefully resume audio context before playing
    if (isIOS) {
        // Try to resume audio context
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log("AudioContext resumed for intermediate sound");
                // Force a user interaction simulation
                unblockPlayback();
                // Now play the sound
                playSound('intermediate');
            }).catch(err => {
                console.error("Failed to resume AudioContext for intermediate sound:", err);
                // Still try to play the sound
                playSound('intermediate');
            });
        } else {
            // Audio context is already running or doesn't exist
            playSound('intermediate');
        }
        
        // Also trigger vibration which is more reliable on iOS
        if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]);
        }
    } else {
        // Non-iOS device, just play normally
        playSound('intermediate');
    }
}

// Play end sound (bell sequence)
function playEndSound() {
    playSound('end');
}

/**
 * Wake Lock Manager - Handles keeping the screen awake across different platforms
 */
class WakeLockManager {
    constructor() {
        this.wakeLock = null;
        this.isSupported = 'wakeLock' in navigator && 'request' in navigator.wakeLock;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        this.hasUserInteracted = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen for visibility changes to reacquire wake lock when tab becomes visible again
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.hasUserInteracted) {
                this.requestWakeLock();
            }
        });

        // Capture any user interaction to enable wake lock
        const interactionEvents = ['click', 'touchstart', 'keydown'];
        interactionEvents.forEach(eventType => {
            document.addEventListener(eventType, () => {
                this.hasUserInteracted = true;
                if (!this.wakeLock && document.visibilityState === 'visible') {
                    this.requestWakeLock();
                }
            }, { once: false, passive: true });
        });

        // Try to reacquire wake lock when app returns from background
        window.addEventListener('focus', () => {
            if (this.hasUserInteracted && document.visibilityState === 'visible') {
                this.requestWakeLock();
            }
        });
    }

    async requestWakeLock() {
        if (!this.isSupported) {
            console.warn('Wake Lock API is not supported in this browser');
            return false;
        }

        try {
            this.wakeLock = await navigator.wakeLock.request('screen');
            
            console.log('Wake Lock is active');
            
            // Add release event listener
            this.wakeLock.addEventListener('release', (e) => {
                console.log('Wake Lock was released:', e);
                this.wakeLock = null;
                
                // Try to reacquire wake lock if page is still visible
                if (document.visibilityState === 'visible' && this.hasUserInteracted) {
                    this.requestWakeLock();
                }
            });
            
            return true;
        } catch (error) {
            console.error(`Wake Lock error: ${error.name}, ${error.message}`);
            
            // Special handling for iOS/Safari
            if (this.isIOS && (error.name === 'NotAllowedError' || error.name === 'NotAllowed')) {
                console.info('iOS requires user interaction before enabling wake lock');
                this.showUserPrompt();
            }
            
            return false;
        }
    }

    release() {
        if (this.wakeLock) {
            this.wakeLock.release()
                .then(() => {
                    this.wakeLock = null;
                    console.log('Wake Lock released manually');
                })
                .catch(error => {
                    console.error('Failed to release Wake Lock:', error);
                });
        }
    }
    
    // Show a user-friendly message prompting for interaction
    showUserPrompt() {
        if (this.isIOS && !this.hasUserInteracted) {
            const promptEl = document.createElement('div');
            promptEl.style.position = 'fixed';
            promptEl.style.top = '10px';
            promptEl.style.left = '50%';
            promptEl.style.transform = 'translateX(-50%)';
            promptEl.style.padding = '10px 20px';
            promptEl.style.backgroundColor = 'rgba(0,0,0,0.7)';
            promptEl.style.color = 'white';
            promptEl.style.borderRadius = '5px';
            promptEl.style.zIndex = '9999';
            promptEl.style.textAlign = 'center';
            promptEl.textContent = 'Tap anywhere to keep screen awake';
            
            document.body.appendChild(promptEl);
            
            // Remove the prompt after user interaction
            document.addEventListener('click', () => {
                promptEl.remove();
            }, { once: true });
            
            // Auto-remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(promptEl)) {
                    promptEl.remove();
                }
            }, 5000);
        }
    }
}

// Initialize the wake lock manager
const wakeLockManager = new WakeLockManager();

// Function to ensure wake lock is active
function ensureWakeLock() {
    // Try to request wake lock
    wakeLockManager.requestWakeLock();
    
    // For iOS, also enable audio to help keep the device awake
    if (wakeLockManager.isIOS) {
        enableIOSAudio();
    }
}

// Timer functionality
document.addEventListener('DOMContentLoaded', function() {
    const twoMinBtn = document.getElementById('twoMinBtn');
    const oneMinBtn = document.getElementById('oneMinBtn');
    const twoMinCountdown = document.getElementById('twoMinCountdown');
    const oneMinCountdown = document.getElementById('oneMinCountdown');
    
    let twoMinInterval;
    let oneMinInterval;
    
    // Function to start timer with better iOS audio handling
    function startTimer(duration, displayElement, button, otherButton) {
        // Force audio initialization
        if (!audioContext) {
            initAudio();
        }
        
        // For iOS, try to unblock audio playback
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIOS) {
            unblockPlayback();
            
            // Create a user gesture simulation
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume().catch(err => {
                    console.error("Failed to resume AudioContext at timer start:", err);
                });
            }
        }
        
        // Play start sound
        playStartSound();
        
        // Disable both buttons initially
        twoMinBtn.disabled = true;
        oneMinBtn.disabled = true;
        
        // Add active class to the clicked button
        button.classList.add('active');
        
        // Ensure wake lock is active
        ensureWakeLock();
        
        let timer = duration;
        let minutes, seconds;
        
        // For iOS, create a periodic audio context resume
        let audioKeepAlive;
        if (isIOS) {
            audioKeepAlive = setInterval(() => {
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume().catch(() => {});
                }
            }, 10000); // Try every 10 seconds
        }
        
        const interval = setInterval(function() {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);
            
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;
            
            displayElement.textContent = minutes + ":" + seconds;
            
            // Add sound notifications at specific times for 2-minute timer
            if (duration === 120) {
                // Play sound at 1:30 mark (30 seconds elapsed)
                if (timer === 90) {
                    playIntermediateSound();
                    console.log("Played 1:30 notification");
                }
                // Play sound at 1:00 mark (60 seconds elapsed)
                else if (timer === 60) {
                    playIntermediateSound();
                    console.log("Played 1:00 notification");
                }
                // Play sound at 0:30 mark (90 seconds elapsed)
                else if (timer === 30) {
                    playIntermediateSound();
                    console.log("Played 0:30 notification");
                }
            }
            
            if (--timer < 0) {
                clearInterval(interval);
                if (audioKeepAlive) clearInterval(audioKeepAlive);
                
                displayElement.textContent = duration === 120 ? "2:00" : "1:00";
                
                // Re-enable both buttons
                twoMinBtn.disabled = false;
                oneMinBtn.disabled = false;
                
                // Remove active class
                button.classList.remove('active');
                
                // Play end sound
                playEndSound();
                
                // Vibrate if supported (200ms vibration)
                if ('vibrate' in navigator) {
                    navigator.vibrate([500, 200, 500]);
                }
            }
        }, 1000);
        
        return interval;
    }
    
    twoMinBtn.addEventListener('click', function() {
        // Initialize audio on first interaction
        initAudio();
        
        // Unblock audio for iOS silent mode
        unblockPlayback();
        
        // Clear any existing intervals
        if (twoMinInterval) clearInterval(twoMinInterval);
        if (oneMinInterval) clearInterval(oneMinInterval);
        
        // Reset the other timer display
        oneMinCountdown.textContent = "1:00";
        oneMinBtn.classList.remove('active');
        
        // Start the 2-minute timer
        twoMinInterval = startTimer(120, twoMinCountdown, twoMinBtn, oneMinBtn);
    });
    
    oneMinBtn.addEventListener('click', function() {
        // Initialize audio on first interaction
        initAudio();
        
        // Unblock audio for iOS silent mode
        unblockPlayback();
        
        // Clear any existing intervals
        if (twoMinInterval) clearInterval(twoMinInterval);
        if (oneMinInterval) clearInterval(oneMinInterval);
        
        // Reset the other timer display
        twoMinCountdown.textContent = "2:00";
        twoMinBtn.classList.remove('active');
        
        // Start the 1-minute timer
        oneMinInterval = startTimer(60, oneMinCountdown, oneMinBtn, twoMinBtn);
    });
    
    // Initialize the application
    function initializeApp() {
        console.log('Initializing application...');
        
        // Try to request wake lock immediately (will work on desktop browsers but not iOS)
        wakeLockManager.requestWakeLock();
        
        // For iOS, initialize audio to help with keeping the device awake
        if (wakeLockManager.isIOS) {
            // Set up audio context on first user interaction
            document.addEventListener('click', function initIOSAudio() {
                initAudio();
                enableIOSAudio();
                document.removeEventListener('click', initIOSAudio);
            }, { once: true });
        }
        
        console.log('Application initialized successfully');
    }
    
    // Initialize the app when the DOM is fully loaded
    initializeApp();
});

// Function to initialize audio specifically for iOS
function initializeIOSAudio() {
    // Add a tap-to-enable-audio message for iOS users
    const audioPrompt = document.createElement('div');
    audioPrompt.style.position = 'fixed';
    audioPrompt.style.top = '50%';
    audioPrompt.style.left = '50%';
    audioPrompt.style.transform = 'translate(-50%, -50%)';
    audioPrompt.style.padding = '20px';
    audioPrompt.style.backgroundColor = 'rgba(0,0,0,0.8)';
    audioPrompt.style.color = 'white';
    audioPrompt.style.borderRadius = '10px';
    audioPrompt.style.zIndex = '10000';
    audioPrompt.style.textAlign = 'center';
    audioPrompt.style.maxWidth = '80%';
    audioPrompt.innerHTML = '<p>Tap here to enable sounds</p><p>(Required for timer notifications)</p>';
    
    // Add to document
    document.body.appendChild(audioPrompt);
    
    // Handle tap
    audioPrompt.addEventListener('click', function() {
        // Initialize audio
        initAudio();
        
        // Try to play a silent sound to enable audio
        if (audioContext) {
            // Resume the context
            audioContext.resume().then(() => {
                console.log("AudioContext resumed by user interaction");
                
                // Play a silent sound
                const buffer = audioContext.createBuffer(1, 1, 22050);
                const source = audioContext.createBufferSource();
                source.buffer = buffer;
                source.connect(audioContext.destination);
                source.start(0);
                
                // Also try a short beep
                const osc = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                osc.connect(gainNode);
                gainNode.connect(audioContext.destination);
                gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
                osc.frequency.setValueAtTime(440, audioContext.currentTime);
                osc.start(audioContext.currentTime);
                osc.stop(audioContext.currentTime + 0.1);
                
                // Remove the prompt
                document.body.removeChild(audioPrompt);
            }).catch(err => {
                console.error("Failed to resume AudioContext on user interaction:", err);
            });
        }
    });
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (document.body.contains(audioPrompt)) {
            document.body.removeChild(audioPrompt);
        }
    }, 10000);
}

// Check if we're on iOS and initialize accordingly
if (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeIOSAudio);
    } else {
        initializeIOSAudio();
    }
}
