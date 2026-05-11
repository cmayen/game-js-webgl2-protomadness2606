
//  g.controller.TopDown
g.controller.TopDown = {
    name: 'TopDown',

    load() {},

    activate() {
        // Y-up player, camera straight down
        g.player.rot = g.math.quatIdentity();
        g.camera.orbitQuat = g.math.quatFromAxisAngle(1, 0, 0, -Math.PI / 2);
        g.camera.zoomTarget = 200;
        g.player.thrustLevel = 0;
    },

    deactivate() {},

    update(dt) {
        const sec = dt / 1000;
        const speed = config.player.speedMovement;

        // movement on world XZ plane (W = -Z, S = +Z, A = -X, D = +X)
        if (g.input.move.z !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3(0, 0, -g.input.move.z * speed * sec));
        }
        if (g.input.move.x !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3(g.input.move.x * speed * sec, 0, 0));
        }
        // Y-axis locked: ignore move.y

        // brake
        if (g.input.brake) {
            g.player.velocity = g.math.v3scale(g.player.velocity, Math.exp(-config.player.brakeRate * sec));
        }

        // keep camera looking down, but allow scroll-zoom
        g.camera.orbitQuat = g.math.quatFromAxisAngle(1, 0, 0, -Math.PI / 2);

        // rotate player to face movement direction on XZ
        const vel2d = g.math.v3(g.player.velocity[0], 0, g.player.velocity[2]);
        if (g.math.v3len(vel2d) > 0.0001) {
            const dir = g.math.v3norm(vel2d);
            const angle = Math.atan2(-dir[0], -dir[2]);
            g.player.rot = g.math.quatFromAxisAngle(0, 1, 0, angle);
        }

        // thrust visual
        g.player.thrustLevel = (g.input.move.z > 0) ? g.input.move.z : 0;

        // integrate (lock Y velocity to 0)
        g.player.velocity[1] = 0;
        g.player.pos = g.math.v3add(g.player.pos, g.math.v3scale(g.player.velocity, sec * 60));
        g.player.applyDampingAndClamp();
    },
};
