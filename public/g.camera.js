
// orbit camera with zoom (1st/3rd person, quaternion orbit)
g.camera = {
    orbitQuat: null, // quaternion defining camera orbit orientation
    orbitUpProvider: null, // optional function returning dynamic up axis for lock mode
    zoom: config.camera.zoomDefault,
    zoomTarget: config.camera.zoomDefault,
    projMatrix: null,
    viewMatrix: null,
    vpMatrix: null,
    pos: null,

    // pitch limits (+-85deg)
    pitchMin: -85 * Math.PI / 180,
    pitchMax:  85 * Math.PI / 180,

    // when true, yaw orbits around lock up axis and pitch is clamped
    // when false, full free-orbit with camera-local axes (space)
    lockY: true,

    load() {
        g.camera.pos = g.math.v3(0, 1.6, 5);
        // initial slight downward pitch (Y-up, looking slightly down from behind)
        g.camera.orbitQuat = g.math.quatFromAxisAngle(1, 0, 0, -0.3);
        g.camera.updateProjection();
        window.addEventListener('resize', g.camera.updateProjection);
    },
    updateProjection() {
        const aspect = g.canvas.width / g.canvas.height;
        g.camera.projMatrix = g.math.m4perspective(
            config.camera.fov * Math.PI / 180, aspect, config.camera.clipNear, config.camera.clipFar
        );
    },
    // camera look direction derived from orbit quaternion
    forward() {
        // default look is -Z; orbit quat rotates the "back" vector, so forward = rotated -Z
        return g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 0, -1));
    },
    lockUpAxis() {
        const up = g.camera.orbitUpProvider ? g.camera.orbitUpProvider() : g.math.v3(0, 1, 0);
        if (!up || g.math.v3len(up) < 0.000001) return g.math.v3(0, 1, 0);
        return g.math.v3norm(up);
    },
    // clamp orbit pitch to prevent flipping (per-controller call)
    // rebuilds from look direction + lock up axis to remove roll drift
    clampPitch(minPitch, maxPitch, lockUpAxis) {
        const up = g.math.v3norm(lockUpAxis || g.camera.lockUpAxis());
        const fwd = g.math.v3norm(g.camera.forward());

        const dotFU = Math.max(-1, Math.min(1, g.math.v3dot(fwd, up)));
        const pitch = Math.asin(dotFU);
        const clamped = Math.max(minPitch, Math.min(maxPitch, pitch));

        let flat = g.math.v3sub(fwd, g.math.v3scale(up, dotFU));
        if (g.math.v3len(flat) < 0.00001) {
            const camRight = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(1, 0, 0));
            flat = g.math.v3cross(up, camRight);
            if (g.math.v3len(flat) < 0.00001) {
                const ref = Math.abs(up[1]) < 0.99 ? g.math.v3(0, 1, 0) : g.math.v3(1, 0, 0);
                flat = g.math.v3cross(up, g.math.v3cross(ref, up));
            }
        }

        flat = g.math.v3norm(flat);
        const cp = Math.cos(clamped);
        const sp = Math.sin(clamped);
        const newFwd = g.math.v3norm(g.math.v3add(g.math.v3scale(flat, cp), g.math.v3scale(up, sp)));
        g.camera.orbitQuat = g.math.quatFromLookDir(newFwd, up);
    },
    // apply mouse delta as incremental orbit rotation
    applyMouseDelta(dx, dy) {
        const sens = config.camera.sensitivity;
        if (g.camera.lockY) {
            const up = g.camera.lockUpAxis();
            // yaw around lock up axis
            const yawQ = g.math.quatFromAxisAngle(up[0], up[1], up[2], -dx * sens);
            // pitch around camera-local X
            const camRight = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(1, 0, 0));
            const pitchQ = g.math.quatFromAxisAngle(camRight[0], camRight[1], camRight[2], -dy * sens);
            g.camera.orbitQuat = g.math.quatNorm(g.math.quatMul(pitchQ, g.math.quatMul(yawQ, g.camera.orbitQuat)));
            // clamp pitch immediately to prevent any frame of flip
            g.camera.clampPitch(g.camera.pitchMin, g.camera.pitchMax, up);
        } else {
            // free orbit — camera-local axes (6DOF-friendly)
            const camUp = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 1, 0));
            const yawQ = g.math.quatFromAxisAngle(camUp[0], camUp[1], camUp[2], -dx * sens);
            const camRight = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(1, 0, 0));
            const pitchQ = g.math.quatFromAxisAngle(camRight[0], camRight[1], camRight[2], -dy * sens);
            g.camera.orbitQuat = g.math.quatNorm(g.math.quatMul(pitchQ, g.math.quatMul(yawQ, g.camera.orbitQuat)));
        }
    },
    update(dt) {
        const sec = dt / 1000;

        // Smooth zoom
        g.camera.zoom += (g.camera.zoomTarget - g.camera.zoom) * Math.min(1, config.camera.zoomSmooth * sec);

        // Distance from zoom (0=first person, 255=max orbit)
        const t = g.camera.zoom / 255;
        const dist = t * config.camera.orbitMaxDist;

        // Reduce the framing lift as we zoom in so the ship stays in frame.
        const focalLift = config.camera.focalHeightOffset * t;
        const focal = g.math.v3(
            g.player.pos[0],
            g.player.pos[1] + focalLift,
            g.player.pos[2]
        );

        // Orbit offset: orbit quat rotates (0,0,1) to get "back" direction
        const back = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 0, 1));

        g.camera.pos = g.math.v3(
            focal[0] + back[0] * dist,
            focal[1] + back[1] * dist,
            focal[2] + back[2] * dist
        );

        // Build view matrix from orbit quaternion
        // The view matrix is the inverse of the camera's world transform
        // Camera world rotation = orbitQuat, but view needs the conjugate
        const viewRot = g.math.quatToMat4(g.math.quatConjugate(g.camera.orbitQuat));
        const tr = g.math.m4translate(-g.camera.pos[0], -g.camera.pos[1], -g.camera.pos[2]);
        g.camera.viewMatrix = g.math.m4mul(viewRot, tr);
        g.camera.vpMatrix   = g.math.m4mul(g.camera.projMatrix, g.camera.viewMatrix);
    },
};
g.loadHandlers.push(g.camera.load);
