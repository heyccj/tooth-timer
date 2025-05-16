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

// Improved sleep prevention that works on iOS
function preventSleep() {
    // First, detect if we're on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    
    console.log("Device detection - iOS:", isIOS);
    
    if (canWakeLock() && !isIOS) {
        // Use Wake Lock API for supported non-iOS devices
        console.log("Using Wake Lock API");
        lockWakeState();
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !wakeLock) {
                lockWakeState();
            }
        });
    } else {
        // For iOS or devices without Wake Lock API support
        console.log("Using fallback sleep prevention");
        
        // Create a video element playing silently in the background
        const video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.width = 1;
        video.height = 1;
        video.style.position = 'absolute';
        video.style.left = '-1px';
        video.style.top = '-1px';
        video.style.opacity = '0.01';
        
        // Add a blank video source (data URI for a tiny video)
        const source = document.createElement('source');
        source.src = 'sample.mp4';;
        source.type = 'video/mp4';
        video.appendChild(source);
        
        document.body.appendChild(video);
        
        // Function to ensure video is playing
        const ensureVideoIsPlaying = () => {
            if (video.paused) {
                video.play().catch(e => {
                    console.error("Failed to play video for sleep prevention:", e);
                });
            }
        };
        
        // Play the video to keep the screen awake
        video.play().catch(e => {
            console.error("Initial video play error:", e);
            
            // For iOS, we need user interaction first
            // We'll try again when user interacts with the page
            document.addEventListener('click', function videoPlayHandler() {
                video.play().catch(e => console.error("Video play error after click:", e));
                document.removeEventListener('click', videoPlayHandler);
            }, { once: true });
        });
        
        // Periodically check if video is still playing
        setInterval(ensureVideoIsPlaying, 30000);
        
        // Also use audio to prevent sleep
        const createNoSleepAudio = () => {
            const audio = new Audio();
            audio.src = '1-sec.mp3'; // Your silent MP3
            audio.loop = true;
            audio.play().catch(e => console.error("Audio play error:", e));
            return audio;
        };
        
        let noSleepAudio = null;
        
        // Start audio on user interaction
        document.addEventListener('click', function audioStartHandler() {
            if (!noSleepAudio) {
                noSleepAudio = createNoSleepAudio();
            }
            document.removeEventListener('click', audioStartHandler);
        }, { once: true });
        
        // Also use the opacity trick as additional fallback
        setInterval(() => {
            document.body.style.opacity = document.body.style.opacity === '0.9999' ? '1' : '0.9999';
        }, 30000);
        
        // For iOS, add a touchstart listener to keep the device awake
        if (isIOS) {
            // Create an invisible div that covers the whole screen
            const touchDiv = document.createElement('div');
            touchDiv.style.position = 'fixed';
            touchDiv.style.top = '0';
            touchDiv.style.left = '0';
            touchDiv.style.width = '100%';
            touchDiv.style.height = '100%';
            touchDiv.style.zIndex = '-1'; // Behind everything
            touchDiv.style.opacity = '0';
            touchDiv.style.pointerEvents = 'none'; // Don't block real interactions
            document.body.appendChild(touchDiv);
            
            // Every 30 seconds, simulate a touch event
            setInterval(() => {
                // Create and dispatch a touch event
                try {
                    const touchEvent = new TouchEvent('touchstart', {
                        bubbles: true,
                        cancelable: true,
                        view: window
                    });
                    touchDiv.dispatchEvent(touchEvent);
                    console.log("Simulated touch event to prevent sleep");
                } catch (e) {
                    console.error("Failed to create touch event:", e);
                    
                    // Fallback: create a user interaction by focusing and blurring an element
                    const dummyInput = document.createElement('input');
                    dummyInput.style.position = 'absolute';
                    dummyInput.style.opacity = '0';
                    document.body.appendChild(dummyInput);
                    dummyInput.focus();
                    setTimeout(() => {
                        dummyInput.blur();
                        document.body.removeChild(dummyInput);
                    }, 10);
                }
            }, 30000);
        }
    }
}

// Variable to track if sleep prevention has been initialized
let sleepPreventionInitialized = false;

// Function to ensure sleep prevention is active
function ensureSleepPrevention() {
    if (!sleepPreventionInitialized) {
        preventSleep();
        sleepPreventionInitialized = true;
        console.log("Sleep prevention initialized");
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
            // Play start sound with the new system
            playSound('start');
            
            // Disable both buttons initially
            twoMinBtn.disabled = true;
            oneMinBtn.disabled = true;
            
            // Add active class to the clicked button
            button.classList.add('active');
            
            let timer = duration;
            let minutes, seconds;
            
            // Track if notifications have been played
            let notificationPlayed30s = false;
            let notificationPlayed60s = false;
            let notificationPlayed90s = false;
            
            const interval = setInterval(function() {
                minutes = parseInt(timer / 60, 10);
                seconds = parseInt(timer % 60, 10);
                
                minutes = minutes < 10 ? "0" + minutes : minutes;
                seconds = seconds < 10 ? "0" + seconds : seconds;
                
                displayElement.textContent = minutes + ":" + seconds;
                
                // Add sound notifications at specific times for 2-minute timer with range checking
                if (duration === 120) {
                    // Play sound at 1:30 mark (30 seconds elapsed)
                    if (timer <= 90 && timer >= 89 && !notificationPlayed30s) {
                        playSound('intermediate');
                        notificationPlayed30s = true;
                        console.log("Played 1:30 notification");
                    }
                    // Play sound at 1:00 mark (60 seconds elapsed)
                    else if (timer <= 60 && timer >= 59 && !notificationPlayed60s) {
                        playSound('intermediate');
                        notificationPlayed60s = true;
                        console.log("Played 1:00 notification");
                    }
                    // Play sound at 0:30 mark (90 seconds elapsed)
                    else if (timer <= 30 && timer >= 29 && !notificationPlayed90s) {
                        playSound('intermediate');
                        notificationPlayed90s = true;
                        console.log("Played 0:30 notification");
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
                    
                    // Play end sound with the new system
                    playSound('end');
                    
                    // Vibrate if supported (200ms vibration)
                    if ('vibrate' in navigator) {
                        navigator.vibrate([500, 200, 500]);
                    }
                }
            }, 1000);
            
            return interval;
        }
        
        twoMinBtn.addEventListener('click', function() {
    // Initialize audio on first interaction with better error handling
    if (!initAudio()) {
        console.warn("Audio initialization failed, but continuing with timer");
    }
    
    // Force an audio unlock attempt for iOS
    unlockAudioForIOS();
    
    // Ensure sleep prevention is active
    ensureSleepPrevention();
    
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
    // Initialize audio on first interaction with better error handling
    if (!initAudio()) {
        console.warn("Audio initialization failed, but continuing with timer");
    }
    
    // Force an audio unlock attempt for iOS
    unlockAudioForIOS();
    
    // Clear any existing intervals
    if (twoMinInterval) clearInterval(twoMinInterval);
    if (oneMinInterval) clearInterval(oneMinInterval);
    
    // Reset the other timer display
    twoMinCountdown.textContent = "2:00";
    twoMinBtn.classList.remove('active');
    
    // Start the 1-minute timer
    oneMinInterval = startTimer(60, oneMinCountdown, oneMinBtn, twoMinBtn);
});

// Function specifically designed to unlock audio on iOS
function unlockAudioForIOS() {
    // Create and play a silent HTML audio element
    const silentAudio = document.createElement('audio');
    silentAudio.setAttribute('autoplay', '');
    silentAudio.setAttribute('playsinline', '');
    silentAudio.setAttribute('webkit-playsinline', '');
    
    // Use the empty MP3 file you've already added
    const source = document.createElement('source');
    source.src = '1-sec.mp3'; // Assuming this is the name of your empty MP3 file
    source.type = 'audio/mpeg';
    silentAudio.appendChild(source);
    
    // Play the silent audio
    document.body.appendChild(silentAudio);
    silentAudio.play().then(() => {
        console.log("Silent audio played successfully");
        
        // Also try to create a very short beep with the Web Audio API
        if (audioContext) {
            try {
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
                
                console.log("Web Audio API test tone created");
            } catch (e) {
                console.error("Failed to create test tone:", e);
            }
        }
    }).catch(e => {
        console.error("Silent audio play error:", e);
    });
}
