const svg = document.getElementById('pig-svg');
import {
    FaceLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm";

const leftEyeGroup = document.getElementById('eye-left');
const rightEyeGroup = document.getElementById('eye-right');
const pigSVG = document.getElementById('pig-svg');

// Eye centers in SVG coordinates
// MODIFY THESE VALUES to adjust the eye positions
const leftEyeCenter = { x: 284, y: 414 };  // Change x, y for Left Eye
const rightEyeCenter = { x: 432, y: 405 }; // Change x, y for Right Eye

// Maximum distance the pupil can move from the center (SVG units)
const maxMove = 15;

function getSVGPoint(clientX, clientY) {
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
}

function updateEye(eyeGroup, eyeCenter, mouseSVG) {
    const dx = mouseSVG.x - eyeCenter.x;
    const dy = mouseSVG.y - eyeCenter.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    let moveX = dx;
    let moveY = dy;

    if (distance > maxMove) {
        const ratio = maxMove / distance;
        moveX = dx * ratio;
        moveY = dy * ratio;
    }

    // Update the transform of the group
    eyeGroup.setAttribute('transform', `translate(${eyeCenter.x + moveX}, ${eyeCenter.y + moveY})`);
}

// Helper to update eyes based on client coordinates
function updateEyes(clientX, clientY) {
    const mouseSVG = getSVGPoint(clientX, clientY);
    updateEye(leftEyeGroup, leftEyeCenter, mouseSVG);
    updateEye(rightEyeGroup, rightEyeCenter, mouseSVG);
}

// Animation state
let animationFrameId = null;

// Helper to set eye position
function setEyePosition(group, x, y) {
    group.setAttribute('transform', `translate(${x}, ${y})`);
}

// Easing function: Elastic Out
function easeOutElastic(x) {
    const c4 = (2 * Math.PI) / 3;
    return x === 0
        ? 0
        : x === 1
            ? 1
            : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1;
}

// Animate eyes back to center
function animateReturn() {
    // Cancel any existing animation
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    const startTime = performance.now();
    const duration = 1000; // 1 second duration

    // Get current positions (we need to know where we are starting from)
    // We can read the current transform attribute to get the start point
    // But since we just updated them in updateEyes, we can assume the last known position is where we are.
    // However, reading from DOM is safer to ensure continuity.

    function getCurrentPos(group) {
        const transform = group.getAttribute('transform');
        const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);
        return match ? { x: parseFloat(match[1]), y: parseFloat(match[2]) } : null;
    }

    const startLeft = getCurrentPos(leftEyeGroup) || leftEyeCenter;
    const startRight = getCurrentPos(rightEyeGroup) || rightEyeCenter;

    function frame(time) {
        let timeFraction = (time - startTime) / duration;
        if (timeFraction > 1) timeFraction = 1;

        const progress = easeOutElastic(timeFraction);

        const currentLeftX = startLeft.x + (leftEyeCenter.x - startLeft.x) * progress;
        const currentLeftY = startLeft.y + (leftEyeCenter.y - startLeft.y) * progress;

        const currentRightX = startRight.x + (rightEyeCenter.x - startRight.x) * progress;
        const currentRightY = startRight.y + (rightEyeCenter.y - startRight.y) * progress;

        setEyePosition(leftEyeGroup, currentLeftX, currentLeftY);
        setEyePosition(rightEyeGroup, currentRightX, currentRightY);

        if (timeFraction < 1) {
            animationFrameId = requestAnimationFrame(frame);
        } else {
            animationFrameId = null;
        }
    }

    animationFrameId = requestAnimationFrame(frame);
}

// Mouse interaction
document.addEventListener('mousemove', (event) => {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    updateEyes(event.clientX, event.clientY);
});

// Touch interaction
document.addEventListener('touchstart', (event) => {
    // Prevent default to stop scrolling/zooming while interacting with the eyes
    // We only prevent default if touching the SVG area to allow scrolling elsewhere if needed,
    // but for this full-screen-ish app, preventing on document is okay if the user intends to play.
    // Let's target the svg for preventing default to be safer, or just the document if it's the main purpose.
    // Given the request "Prevent default scrolling when interacting with pig", we'll assume document level for simplicity of the game feel.
    if (event.target.closest('#pig-svg')) {
        event.preventDefault();
    }
    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    const touch = event.touches[0];
    updateEyes(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchmove', (event) => {
    if (event.target.closest('#pig-svg')) {
        event.preventDefault();
    }
    const touch = event.touches[0];
    updateEyes(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchend', () => {
    animateReturn();
});

// Snout sound interaction
const snout = document.getElementById('snout');
const pigSound = document.getElementById('pig-sound');

snout.addEventListener('click', () => {
    pigSound.currentTime = 0; // Rewind to start if already playing
    pigSound.play().catch(e => console.log("Audio play failed:", e)); // Catch potential autoplay policy errors
});

// Also add touch listener for snout to ensure it works responsively on mobile
snout.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent double-firing with click if both are present
    pigSound.currentTime = 0;
    pigSound.play().catch(e => console.log("Audio play failed:", e));
}, { passive: false });

// --- Face Tracking Logic ---

let faceLandmarker = undefined;
let webcamRunning = false;
const video = document.getElementById("webcam");
const webcamButton = document.getElementById("webcamButton");

// Before we can use FaceLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function createFaceLandmarker() {
    console.log("Loading FaceLandmarker...");
    if (webcamButton) {
        webcamButton.innerText = "⏳"; // Loading
        webcamButton.disabled = true;
    }

    try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
        );
        faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
                modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
                delegate: "GPU"
            },
            outputFaceBlendshapes: true,
            runningMode: "VIDEO",
            numFaces: 1
        });
        console.log("FaceLandmarker loaded successfully!");
        if (webcamButton) {
            webcamButton.innerText = "🎦"; // Ready
            webcamButton.disabled = false;
        }
    } catch (error) {
        console.error("Error loading FaceLandmarker:", error);
        if (webcamButton) {
            webcamButton.innerText = "⚠️"; // Error
        }
    }
}
createFaceLandmarker();

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

if (hasGetUserMedia()) {
    if (webcamButton) {
        webcamButton.addEventListener("click", enableCam);
    }
} else {
    console.warn("getUserMedia() is not supported by your browser");
    if (webcamButton) {
        webcamButton.style.display = "none";
    }
}

function enableCam(event) {
    console.log("Enable Camera clicked");
    // DEBUG: Alert to confirm click is registered
    // alert("Button clicked!"); 

    if (!faceLandmarker) {
        alert("Patience ! L'IA est encore en train de charger...");
        return;
    }

    if (webcamRunning === true) {
        console.log("Stopping camera...");
        webcamRunning = false;
        webcamButton.innerText = "🎦"; // Back to Ready state
        webcamButton.classList.remove("active");
        // Stop the stream
        if (video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }

        // Reset eyes to center
        animateReturn();
    } else {
        console.log("Starting camera...");

        // Unlock audio context on user interaction (fix for NotAllowedError)
        pigSound.play().then(() => {
            pigSound.pause();
            pigSound.currentTime = 0;
        }).catch(e => console.log("Audio unlock failed (harmless if already unlocked):", e));

        webcamRunning = true;
        webcamButton.innerText = "⏹️"; // Stop icon
        webcamButton.classList.add("active");

        const constraints = {
            video: {
                facingMode: "user", // Use front camera
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };

        // Activate the webcam stream.
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            alert("Erreur: Votre navigateur ne supporte pas l'accès caméra.");
            return;
        }

        navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
            console.log("Camera stream started");
            video.srcObject = stream;
            video.addEventListener("loadeddata", predictWebcam);
        }).catch(err => {
            console.error("Error accessing camera:", err);
            alert("Erreur d'accès caméra: " + err.message);
            webcamButton.innerText = "⚠️"; // Error icon
            webcamRunning = false;
        });
    }
}

let lastVideoTime = -1;
let results = undefined;

const faceDebug = document.getElementById("face-debug");

// Linear Interpolation for smooth movement
function lerp(start, end, factor) {
    return start + (end - start) * factor;
}

// Sensitivity factors (Higher = eyes move more for smaller head movements)
const SENSITIVITY_X = 2.5;
const SENSITIVITY_Y = 2.0;

// Update eyes based on direction vector (-1 to 1)
function updateEyesByDirection(xDir, yDir) {
    // Clamp direction to [-1, 1]
    xDir = Math.max(-1, Math.min(1, xDir));
    yDir = Math.max(-1, Math.min(1, yDir));

    const moveX = xDir * maxMove;
    const moveY = yDir * maxMove;

    leftEyeGroup.setAttribute('transform', `translate(${leftEyeCenter.x + moveX}, ${leftEyeCenter.y + moveY})`);
    rightEyeGroup.setAttribute('transform', `translate(${rightEyeCenter.x + moveX}, ${rightEyeCenter.y + moveY})`);
}

let currentXDir = 0;
let currentYDir = 0;
const LERP_FACTOR = 0.1; // Adjust for smoothness (0.05 = very smooth/slow, 0.2 = snappy)

// Blink state
let blinkStartTime = null;
let hasBlinkTriggered = false;

// Check for Debug Mode via URL parameter
const urlParams = new URLSearchParams(window.location.search);
const DEBUG_MODE = urlParams.has('debug');

if (DEBUG_MODE) {
    const versionDiv = document.getElementById('version');
    if (versionDiv) versionDiv.style.display = 'block';
}

async function predictWebcam() {
    // if image mode is initialized, create a new classifier with video runningMode
    if (webcamRunning === false) {
        faceDebug.style.display = "none";
        return;
    }

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = faceLandmarker.detectForVideo(video, startTimeMs);
    }

    if (results.faceLandmarks && results.faceLandmarks.length > 0) {
        const landmarks = results.faceLandmarks[0];

        // Keypoint 6 is between the eyes.
        const nose = landmarks[6];

        // Mirror the X coordinate because it's a selfie camera
        const mirroredX = 1 - nose.x;
        const normalizedY = nose.y;

        // Calculate Direction Vector (offset from center 0.5)
        const targetXDir = (mirroredX - 0.5) * SENSITIVITY_X;
        const targetYDir = (normalizedY - 0.5) * SENSITIVITY_Y;

        // Apply smoothing (Lerp) to the DIRECTION
        currentXDir = lerp(currentXDir, targetXDir, LERP_FACTOR);
        currentYDir = lerp(currentYDir, targetYDir, LERP_FACTOR);

        // Update Debug Dot (only if DEBUG_MODE is true)
        if (DEBUG_MODE) {
            const screenX = mirroredX * window.innerWidth;
            const screenY = normalizedY * window.innerHeight;
            faceDebug.style.display = "block";
            faceDebug.style.left = `${screenX}px`;
            faceDebug.style.top = `${screenY}px`;
        } else {
            faceDebug.style.display = "none";
        }

        // Cancel any return animation if active
        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        // Update eyes using Parallel Gaze
        updateEyesByDirection(currentXDir, currentYDir);

        // --- Blink Detection ---
        if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
            const categories = results.faceBlendshapes[0].categories;
            // Find blink scores
            const blinkLeft = categories.find(cat => cat.categoryName === "eyeBlinkLeft")?.score || 0;
            const blinkRight = categories.find(cat => cat.categoryName === "eyeBlinkRight")?.score || 0;

            // Threshold for blinking
            const isBlinking = (blinkLeft > 0.5) || (blinkRight > 0.5);

            if (isBlinking) {
                // User is blinking
                if (!blinkStartTime) {
                    blinkStartTime = performance.now();
                } else {
                    const duration = performance.now() - blinkStartTime;
                    if (duration > 1000 && !hasBlinkTriggered) {
                        // Long blink detected (> 1s)
                        console.log("Long blink detected! Playing sound.");
                        pigSound.currentTime = 0;
                        pigSound.play().catch(e => console.log("Audio play failed:", e));
                        hasBlinkTriggered = true;
                    }
                }
            } else {
                // User is NOT blinking
                blinkStartTime = null;
                hasBlinkTriggered = false;
                // Ensure pupils are visible
                leftEyeGroup.style.opacity = "1";
                rightEyeGroup.style.opacity = "1";
            }
        }

    } else {
        faceDebug.style.display = "none";
    }

    // Call this function again to keep predicting when the browser is ready.
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}
