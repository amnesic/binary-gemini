const svg = document.getElementById('pig-svg');
const leftEyeGroup = document.getElementById('eye-left');
const rightEyeGroup = document.getElementById('eye-right');

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
