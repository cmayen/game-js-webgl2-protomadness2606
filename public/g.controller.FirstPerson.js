
//  g.controller.FirstPerson
//  WASD movement along camera look direction, no ship rotation.
//  Camera IS the player view (zoom forced to 0)
g.controller.FirstPerson = {
    name: 'FirstPerson',

    load() {},

    activate() {
        // Y-up orientation, camera behind/above, first-person zoom
        g.player.rot = g.math.quatIdentity();
        g.camera.orbitQuat = g.math.quatFromAxisAngle(1, 0, 0, -0.3);
        g.camera.zoomTarget = 0;
        g.camera.zoom = 0;
        g.camera.lockY = true;
        g.player.thrustLevel = 0;
    },

    deactivate() {},

    update(dt) {
        const sec = dt / 1000;
        const speed = config.player.speedMovement;

        // keep zoom locked to first prson
        g.camera.zoomTarget = 0;

        // derive movement axes from camera orientation (XZ plane)
        const camFwd = g.camera.forward();
        const worldUp = g.math.v3(0, 1, 0);
        // flatten forward to XZ plane
        const flatFwd = g.math.v3norm(g.math.v3(camFwd[0], 0, camFwd[2]));
        const flatRight = g.math.v3cross(flatFwd, worldUp);

        // forward/backward
        if (g.input.move.z !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3scale(flatFwd, g.input.move.z * speed * sec));
        }
        // strafe
        if (g.input.move.x !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3scale(flatRight, g.input.move.x * speed * sec));
        }
        // up/down
        if (g.input.move.y !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3scale(worldUp, g.input.move.y * speed * sec));
        }

        // brake
        if (g.input.brake) {
            g.player.velocity = g.math.v3scale(g.player.velocity, Math.exp(-config.player.brakeRate * sec));
        }

        // sync player rotation to camera look
        g.player.rot = g.math.quatNorm(g.camera.orbitQuat);

        // thrust visual
        g.player.thrustLevel = (g.input.move.z > 0) ? g.input.move.z : 0;

        // integrate
        g.player.pos = g.math.v3add(g.player.pos, g.math.v3scale(g.player.velocity, sec * 60));
        g.player.applyDampingAndClamp();
    },
};