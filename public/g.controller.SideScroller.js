
//  g.controller.SideScroller 2D side-scrolling style
//  A/D = left/right (X axis), W/S = up/down (Y axis)
//  Camera locked  to XY plane
g.controller.SideScroller = {
    name: 'SideScroller',

    load() {},

    activate() {
        // Y-up player, camera from side (identity = looking along -Z)
        g.player.rot = g.math.quatIdentity();
        g.camera.orbitQuat = g.math.quatIdentity();
        g.camera.zoomTarget = 200;
        g.player.thrustLevel = 0;
    },

    deactivate() {},

    update(dt) {
        const sec = dt / 1000;
        const speed = config.player.speedMovement;

        // left/right (X axis)
        if (g.input.move.x !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3(g.input.move.x * speed * sec, 0, 0));
        }
        // up/down (Y axis) W/S mapped to move.z, remap to Y
        if (g.input.move.z !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3(0, g.input.move.z * speed * sec, 0));
        }
        // also allow explicit vertical via Shift/Ctrl
        if (g.input.move.y !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
                g.math.v3(0, g.input.move.y * speed * sec, 0));
        }

        // brake
        if (g.input.brake) {
            g.player.velocity = g.math.v3scale(g.player.velocity, Math.exp(-config.player.brakeRate * sec));
        }

        // lock camera to side view
        g.camera.orbitQuat = g.math.quatIdentity();

        // face movement direction on XY plane
        const vx = g.player.velocity[0];
        if (Math.abs(vx) > 0.0001) {
            // flip ship to face left or right
            const angle = vx > 0 ? -Math.PI / 2 : Math.PI / 2;
            g.player.rot = g.math.quatFromAxisAngle(0, 1, 0, angle);
        }

        // thrust visual
        g.player.thrustLevel = (Math.abs(g.input.move.x) > 0 || Math.abs(g.input.move.z) > 0) ? 0.5 : 0;

        // integrate (lock Z velocity to 0)
        g.player.velocity[2] = 0;
        g.player.pos = g.math.v3add(g.player.pos, g.math.v3scale(g.player.velocity, sec * 60));
        g.player.applyDampingAndClamp();
    },
};