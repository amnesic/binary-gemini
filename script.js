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

// Mouse interaction
document.addEventListener('mousemove', (event) => {
    // Ensure smooth return is off during active interaction
    leftEyeGroup.classList.remove('smooth-return');
    rightEyeGroup.classList.remove('smooth-return');
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

    leftEyeGroup.classList.remove('smooth-return');
    rightEyeGroup.classList.remove('smooth-return');

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
    // Add class for smooth transition
    leftEyeGroup.classList.add('smooth-return');
    rightEyeGroup.classList.add('smooth-return');

    // Return to center (original translate coordinates)
    // We simply set the transform back to the center coordinates
    leftEyeGroup.setAttribute('transform', `translate(${leftEyeCenter.x}, ${leftEyeCenter.y})`);
    rightEyeGroup.setAttribute('transform', `translate(${rightEyeCenter.x}, ${rightEyeCenter.y})`);
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
