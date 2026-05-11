
//  g.controller.ThirdPerson 
g.controller.ThirdPerson = {
    name: 'ThirdPerson',

    load() {},

    activate() {
        // Y-up player, camera behind/above at comfortable orbit
        g.player.rot = g.math.quatIdentity();
        g.camera.orbitQuat = g.math.quatFromAxisAngle(1, 0, 0, -0.3);
        g.camera.zoomTarget = 150;
        g.camera.lockY = true;
        g.camera.orbitUpProvider = () => g.player.up();
        g.player.thrustLevel = 0;
    },

    deactivate() {},

    update(dt) {
        const sec = dt / 1000;
        const speed = config.player.speedMovement;

        // derive movement from camera-relative XZ plane
        const camFwd = g.camera.forward();
        const worldUp = g.math.v3(0, 1, 0);
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

        // rotate player to face movement direction
        const vel2d = g.math.v3(g.player.velocity[0], 0, g.player.velocity[2]);
        if (g.math.v3len(vel2d) > 0.0001) {
            const dir = g.math.v3norm(vel2d);
            // build a quaternion that looks along dir (facing -Z convention)
            const angle = Math.atan2(-dir[0], -dir[2]);
            const targetRot = g.math.quatFromAxisAngle(0, 1, 0, angle);
            const t = Math.min(1, config.player.alignSpeed * sec);
            g.player.rot = g.math.quatNorm(g.math.quatSlerp(g.player.rot, targetRot, t));
        }

        // thrust visual
        g.player.thrustLevel = (g.input.move.z > 0) ? g.input.move.z : 0;

        // integrate
        g.player.pos = g.math.v3add(g.player.pos, g.math.v3scale(g.player.velocity, sec * 60));
        g.player.applyDampingAndClamp();
    },
};