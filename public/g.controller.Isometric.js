
//  g.controller.IsometricXZ plane movement
// Meh.... needs work. I dont like it
g.controller.Isometric = {
    name: 'Isometric',

    load() {},

    activate() {
        // Y-up player, isometric camera: 45d yaw, ~35d pitch down
        g.player.rot = g.math.quatIdentity();
        const pitch = g.math.quatFromAxisAngle(1, 0, 0, -Math.PI / 5);
        const yaw   = g.math.quatFromAxisAngle(0, 1, 0, Math.PI / 4);
        g.camera.orbitQuat = g.math.quatNorm(g.math.quatMul(pitch, yaw));
        g.camera.zoomTarget = 200;
        g.player.thrustLevel = 0;
    },

    deactivate() {},

    update(dt) {
        const sec = dt / 1000;
        const speed = config.player.speedMovement;

        // derive iso-aligned movement axes from camera
        const camFwd = g.camera.forward();
        const worldUp = g.math.v3(0, 1, 0);
        const flatFwd = g.math.v3norm(g.math.v3(camFwd[0], 0, camFwd[2]));
        const flatRight = g.math.v3cross(flatFwd, worldUp);

        // forward/backward along iso forward
        if (g.input.move.z !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3scale(flatFwd, g.input.move.z * speed * sec));
        }
        // strafe along iso right
        if (g.input.move.x !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3scale(flatRight, g.input.move.x * speed * sec));
        }

        // brake
        if (g.input.brake) {
            g.player.velocity = g.math.v3scale(g.player.velocity, Math.exp(-config.player.brakeRate * sec));
        }

        // lock camera to isometric angle (prevent mouse look from changing it)
        const pitch = g.math.quatFromAxisAngle(1, 0, 0, -Math.PI / 5);
        const yaw   = g.math.quatFromAxisAngle(0, 1, 0, Math.PI / 4);
        g.camera.orbitQuat = g.math.quatNorm(g.math.quatMul(pitch, yaw));

        // rotate player to face movement
        const vel2d = g.math.v3(g.player.velocity[0], 0, g.player.velocity[2]);
        if (g.math.v3len(vel2d) > 0.0001) {
            const dir = g.math.v3norm(vel2d);
            const angle = Math.atan2(-dir[0], -dir[2]);
            g.player.rot = g.math.quatFromAxisAngle(0, 1, 0, angle);
        }

        // thrust visual
        g.player.thrustLevel = (g.input.move.z > 0) ? g.input.move.z : 0;

        // integrate (lock Y)
        g.player.velocity[1] = 0;
        g.player.pos = g.math.v3add(g.player.pos, g.math.v3scale(g.player.velocity, sec * 60));
        g.player.applyDampingAndClamp();
    },
};