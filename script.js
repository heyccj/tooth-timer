document.addEventListener('DOMContentLoaded', function() {
    const twoMinBtn = document.getElementById('twoMinBtn');
    const oneMinBtn = document.getElementById('oneMinBtn');
    const twoMinCountdown = document.getElementById('twoMinCountdown');
    const oneMinCountdown = document.getElementById('oneMinCountdown');
    
    let twoMinInterval;
    let oneMinInterval;
    
    // Initialize the wake lock manager
    const wakeLockManager = new WakeLockManager();
    
    // Initialize the audio manager
    const audioManager = new AudioManager();
    audioManager.initialize(wakeLockManager);
    
    // Function to start timer with better iOS audio handling
    function startTimer(duration, displayElement, button, otherButton) {
        // Try to play start sound
        audioManager.playStartSound();
        
        // Disable both buttons initially
        twoMinBtn.disabled = true;
        oneMinBtn.disabled = true;
        
        // Add active class to the clicked button
        button.classList.add('active');
        
        // Ensure wake lock is active
        wakeLockManager.requestWakeLock();
        
        let timer = duration;
        let minutes, seconds;
        
        // For iOS, create a periodic audio context resume
        let audioKeepAlive;
        if (audioManager.isIOS) {
            audioKeepAlive = setInterval(() => {
                if (audioManager.audioContext && audioManager.audioContext.state === 'suspended') {
                    audioManager.audioContext.resume().catch(() => {});
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
                    audioManager.playIntermediateSound();
                    console.log("Played 1:30 notification");
                }
                // Play sound at 1:00 mark (60 seconds elapsed)
                else if (timer === 60) {
                    audioManager.playIntermediateSound();
                    console.log("Played 1:00 notification");
                }
                // Play sound at 0:30 mark (90 seconds elapsed)
                else if (timer === 30) {
                    audioManager.playIntermediateSound();
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
                audioManager.playEndSound();
                
                // Vibrate if supported
                if ('vibrate' in navigator) {
                    navigator.vibrate([500, 200, 500]);
                }
            }
        }, 1000);
        
        return interval;
    }
    
    twoMinBtn.addEventListener('click', function() {
        // Handle user interaction for audio
        audioManager.handleUserInteraction();
        
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
        // Handle user interaction for audio
        audioManager.handleUserInteraction();
        
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
        
        // For iOS, show the permission prompt
        if (audioManager.isIOS) {
            audioManager.showPermissionPrompt();
        } else {
            // For non-iOS, try to request wake lock immediately
            wakeLockManager.requestWakeLock();
        }
        
        console.log('Application initialized successfully');
    }
    
    // Initialize the app
    initializeApp();
});

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
}
