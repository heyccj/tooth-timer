    // Audio context for sound effects
    let audioContext;
    
    // Initialize audio context on user interaction
    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        // iOS requires explicit resume of AudioContext
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }
    
    // Play start sound (soft bell)
    function playStartSound() {
        if (!audioContext) initAudio();
        
        // iOS requires explicit resume of AudioContext
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        // Create multiple oscillators for richer bell-like sound
        const createBellTone = (freq, gain) => {
            const osc = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = freq;
            
            gainNode.gain.setValueAtTime(gain, audioContext.currentTime);
            // Use linearRampToValueAtTime instead of exponentialRampToValueAtTime for iOS
            gainNode.gain.linearRampToValueAtTime(0.01, audioContext.currentTime + 1.5);
            
            osc.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            osc.start();
            osc.stop(audioContext.currentTime + 1.5);
        };
        
        // Create bell-like sound with harmonics
        createBellTone(440, 0.3);  // Fundamental
        createBellTone(880, 0.15); // 2nd harmonic
        createBellTone(1320, 0.1); // 3rd harmonic
    }

    // Function to unblock audio playback on iOS
function unblockPlayback() {
    // Create and play a silent audio buffer to unblock audio on iOS
    if (audioContext) {
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const source = audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContext.destination);
        source.start(0);
    }
}

    // Play intermediate notification (soft double bell)
    function playIntermediateSound() {
        if (!audioContext) initAudio();
        
        // iOS requires explicit resume of AudioContext
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const playBell = (startTime) => {
            const createBellTone = (freq, gain, time) => {
                const osc = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                gainNode.gain.setValueAtTime(gain, time);
                // Use linearRampToValueAtTime instead of exponentialRampToValueAtTime for iOS
                gainNode.gain.linearRampToValueAtTime(0.01, time + 0.8);
                
                osc.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                osc.start(time);
                osc.stop(time + 0.8);
            };
            
            // Create bell-like sound with harmonics
            createBellTone(523.25, 0.2, startTime);  // Fundamental (C5)
            createBellTone(1046.5, 0.1, startTime);  // 2nd harmonic
            createBellTone(1569.75, 0.05, startTime); // 3rd harmonic
        };
        
        const now = audioContext.currentTime;
        playBell(now);
        playBell(now + 0.5);
    }

    // Play end sound (bell sequence)
    function playEndSound() {
        if (!audioContext) initAudio();
        
        // iOS requires explicit resume of AudioContext
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
        
        const playBell = (startTime, fundamental) => {
            const createBellTone = (freq, gain, time) => {
                const osc = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                osc.type = 'sine';
                osc.frequency.value = freq;
                
                gainNode.gain.setValueAtTime(gain, time);
                // Use linearRampToValueAtTime instead of exponentialRampToValueAtTime for iOS
                gainNode.gain.linearRampToValueAtTime(0.01, time + 1.0);
                
                osc.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                osc.start(time);
                osc.stop(time + 1.0);
            };
            
            // Create bell-like sound with harmonics
            createBellTone(fundamental, 0.2, startTime);  // Fundamental
            createBellTone(fundamental * 2, 0.1, startTime);  // 2nd harmonic
            createBellTone(fundamental * 3, 0.05, startTime); // 3rd harmonic
        };
        
        const now = audioContext.currentTime;
        // Play ascending bell sequence
        playBell(now, 523.25);       // C5
        playBell(now + 0.6, 587.33); // D5
        playBell(now + 1.2, 659.25); // E5
    }


        
// Check if Wake Lock API is supported
const canWakeLock = () => 'wakeLock' in navigator;

// Variable to store the wake lock
let wakeLock = null;

// Function to lock the wake state
async function lockWakeState() {
    if (!canWakeLock()) return;
    
    // Only request wake lock if document is visible
    if (document.visibilityState !== 'visible') {
        console.log('Page not visible, wake lock request deferred');
        return;
    }
    
    try {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => {
            console.log('Screen Wake State Locked:', !wakeLock.released);
            // Don't automatically re-request on release, as it might be intentional
            // or the page might not be visible
            wakeLock = null;
        });
        console.log('Screen Wake State Locked:', !wakeLock.released);
    } catch (e) {
        console.error('Failed to lock wake state with reason:', e.message);
        wakeLock = null;
    }
}

// Function to release the wake state
function releaseWakeState() {
    if (wakeLock) {
        wakeLock.release()
            .then(() => {
                console.log('Wake lock released');
                wakeLock = null;
            })
            .catch((err) => {
                console.error(`Error releasing wake lock: ${err.name}, ${err.message}`);
            });
    }
}

// Prevent device from sleeping
function preventSleep() {
    // Request a wake lock if supported
    if (canWakeLock()) {
        // Initial request
        lockWakeState();
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !wakeLock) {
                // Re-request wake lock when page becomes visible again
                lockWakeState();
            }
        });
    } else {
        // Fallback for browsers that don't support Wake Lock API
        // This is less reliable but better than nothing
        setInterval(() => {
            // Force a minimal DOM update to keep the screen on
            document.body.style.opacity = document.body.style.opacity === '0.9999' ? '1' : '0.9999';
        }, 30000);
    }
}

// Call the function to prevent sleep
preventSleep();
        
        // Timer functionality
        const twoMinBtn = document.getElementById('twoMinBtn');
        const oneMinBtn = document.getElementById('oneMinBtn');
        const twoMinCountdown = document.getElementById('twoMinCountdown');
        const oneMinCountdown = document.getElementById('oneMinCountdown');
        
        let twoMinInterval;
        let oneMinInterval;
        
        function startTimer(duration, displayElement, button, otherButton) {
            // Play start sound
            playStartSound();
            
            // Disable both buttons initially
            twoMinBtn.disabled = true;
            oneMinBtn.disabled = true;
            
            // Add active class to the clicked button
            button.classList.add('active');
            
            let timer = duration;
            let minutes, seconds;
            
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
                    }
                    // Play sound at 1:00 mark (60 seconds elapsed)
                    else if (timer === 60) {
                        playIntermediateSound();
                    }
                    // Play sound at 0:30 mark (90 seconds elapsed)
                    else if (timer === 30) {
                        playIntermediateSound();
                    }
                }
                
                if (--timer < 0) {
                    clearInterval(interval);
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
