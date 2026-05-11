
//  g.input
g.input = {
    // Abstract actions (read by player/camera each frame)
    move: { x: 0, y: 0, z: 0 },
    brake: false,
    alignToCamera: false,
    roll: 0,
    resetRotation: false,
    lookDelta: { x: 0, y: 0 },
    zoomDelta: 0,

    // Input drivers (populated by their own files)
    drivers: [],

    load() {
        g.input.mousekeyb.load();
        g.input.touch.load();
        g.input.gamepad.load();
    },

    update(dt) {
        const sec = dt / 1000;

        // Reset abstract actions
        g.input.move.x = 0;
        g.input.move.y = 0;
        g.input.move.z = 0;
        g.input.brake = false;
        g.input.alignToCamera = false;
        g.input.roll = 0;
        g.input.resetRotation = false;
        g.input.lookDelta.x = 0;
        g.input.lookDelta.y = 0;
        g.input.zoomDelta = 0;

        // Collect and merge deltas from all drivers
        for (const driver of g.input.drivers) {
            const d = driver.update(dt);
            if (!d) continue;
            g.input.move.x += d.move.x;
            g.input.move.y += d.move.y;
            g.input.move.z += d.move.z;
            if (d.brake) g.input.brake = true;
            if (d.alignToCamera) g.input.alignToCamera = true;
            g.input.roll += d.roll;
            if (d.resetRotation) g.input.resetRotation = true;
            g.input.lookDelta.x += d.lookDelta.x;
            g.input.lookDelta.y += d.lookDelta.y;
            g.input.zoomDelta += d.zoomDelta;
        }

        // Clamp
        g.input.move.x = Math.max(-1, Math.min(1, g.input.move.x));
        g.input.move.y = Math.max(-1, Math.min(1, g.input.move.y));
        g.input.move.z = Math.max(-1, Math.min(1, g.input.move.z));
        g.input.roll = Math.max(-1, Math.min(1, g.input.roll));

        // Apply camera look
        if (g.input.lookDelta.x !== 0 || g.input.lookDelta.y !== 0) {
            g.camera.applyMouseDelta(g.input.lookDelta.x, g.input.lookDelta.y);
        }

        // Apply zoom. As we get closer, reduce zoom sensitivity for finer control.
        if (g.input.zoomDelta !== 0) {
            const zoomT = Math.max(0, Math.min(1, g.camera.zoomTarget / 255));
            const minFactor = config.camera.zoomCloseInputMinFactor;
            const curve = config.camera.zoomCloseInputCurve;
            const scaledFactor = minFactor + (1 - minFactor) * Math.pow(zoomT, curve);
            g.camera.zoomTarget = Math.max(0, Math.min(255, g.camera.zoomTarget + g.input.zoomDelta * scaledFactor));
        }
    },
};
g.loadHandlers.push(g.input.load);
