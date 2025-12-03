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

document.addEventListener('mousemove', (event) => {
    const mouseSVG = getSVGPoint(event.clientX, event.clientY);
    updateEye(leftEyeGroup, leftEyeCenter, mouseSVG);
    updateEye(rightEyeGroup, rightEyeCenter, mouseSVG);
});

// Snout sound interaction
const snout = document.getElementById('snout');
const pigSound = document.getElementById('pig-sound');

snout.addEventListener('click', () => {
    pigSound.currentTime = 0; // Rewind to start if already playing
    pigSound.play().catch(e => console.log("Audio play failed:", e)); // Catch potential autoplay policy errors
});
