
g.player = {
    pos: null,
    rot: null, // quaternion [x,y,z,w]
    velocity: null,
    thrustLevel: 0,
    visualRoll: 0,
    visualPitch: 0,
    prevForward: null,

    load() {
        g.player.pos = g.math.v3(0, 1.5, 1.5);
        g.player.rot = g.math.quatIdentity();
        g.player.velocity = g.math.v3(0, 0, 0);
        g.player.visualRoll = 0;
        g.player.visualPitch = 0;
        g.player.prevForward = g.math.v3(0, 0, -1);
    },

    // local axes derived from quaternion
    forward() { return g.math.quatRotateVec3(g.player.rot, g.math.v3(0, 0, -1)); },
    right()   { return g.math.quatRotateVec3(g.player.rot, g.math.v3(1, 0, 0)); },
    up()      { return g.math.quatRotateVec3(g.player.rot, g.math.v3(0, 1, 0)); },

    resetVisualLean() {
        g.player.visualRoll = 0;
        g.player.visualPitch = 0;
        g.player.prevForward = g.player.forward();
    },

    displayRot() {
        const qPitch = g.math.quatFromAxisAngle(1, 0, 0, g.player.visualPitch);
        const qRoll = g.math.quatFromAxisAngle(0, 0, 1, g.player.visualRoll);
        const lean = g.math.quatNorm(g.math.quatMul(qPitch, qRoll));
        return g.math.quatNorm(g.math.quatMul(g.player.rot, lean));
    },

    applyDampingAndClamp() {
        g.player.velocity = g.math.v3scale(g.player.velocity, config.player.damping);
        const spd = g.math.v3len(g.player.velocity);
        const velCap = config.player.maxSpeed / 60;
        if (spd > velCap) {
            g.player.velocity = g.math.v3scale(g.player.velocity, velCap / spd);
        }
    },

    modelMatrix() {
        const t = g.math.m4translate(g.player.pos[0], g.player.pos[1], g.player.pos[2]);
        const r = g.math.quatToMat4(g.player.displayRot());
        const sc = g.math.m4scale(config.player.shipScale, config.player.shipScale, config.player.shipScale);
        return g.math.m4mul(t, g.math.m4mul(r, sc));
    },
};
g.loadHandlers.push(g.player.load);
