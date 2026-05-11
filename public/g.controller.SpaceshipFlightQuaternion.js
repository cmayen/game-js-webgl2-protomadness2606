
//  g.controller.SpaceshipFlightQuaternion 6DOF !!!
g.controller.SpaceshipFlightQuaternion = {
    name: 'SpaceshipFlight',

    load() {},

    activate() {
        // default to Y-up orientation, camera behind/above
        g.player.rot = g.math.quatIdentity();
        g.player.resetVisualLean();
        g.camera.orbitQuat = g.math.quatFromAxisAngle(1, 0, 0, -0.3);
        g.camera.lockY = false;
    },

    deactivate() {
        if (g.controller.SpaceshipAutopilot) g.controller.SpaceshipAutopilot.cancel('controller-switch');
    },

    update(dt) {
        const sec = dt / 1000;

        const controls = {
            move: {
                x: g.input.move.x,
                y: g.input.move.y,
                z: g.input.move.z,
            },
            brake: g.input.brake,
            alignToCamera: g.input.alignToCamera,
            roll: g.input.roll,
            resetRotation: g.input.resetRotation,
        };

        const ap = g.controller.SpaceshipAutopilot;
        let apIntent = null;
        if (ap) {
            apIntent = ap.update(dt, controls);
            if (apIntent) {
                controls.move.x = apIntent.move.x;
                controls.move.y = apIntent.move.y;
                controls.move.z = apIntent.move.z;
                controls.brake = apIntent.brake;
                controls.alignToCamera = apIntent.alignToCamera;
                controls.roll = apIntent.roll;
                controls.resetRotation = apIntent.resetRotation;
            }
        }

        if (apIntent && apIntent.targetRot) {
            const t = Math.min(1, config.player.alignSpeed * sec);
            g.player.rot = g.math.quatNorm(g.math.quatSlerp(g.player.rot, apIntent.targetRot, t));
        }

        // The camera look direction is a slerp between where the ship noses and where
        // the star is, weighted by autopilotCamBlendFactor.  The star therefore ALWAYS
        // stays in view.  upRef follows LockY so the ship reads right-side-up.
        // Manual look input re-snapshots camLocalOffset so orbit resumes from there.
        if (ap && ap.active && ap.targetPos && !ap.playerTookCameraControl) {
            const hasLookInput = g.input.lookDelta.x !== 0 || g.input.lookDelta.y !== 0;
            if (hasLookInput) {
                // Player manually rotated,stop autopilot camera control for this flight
                ap.playerTookCameraControl = true;
            } else {
                const toStar = g.math.v3sub(ap.targetPos, g.player.pos);
                const starDist = g.math.v3len(toStar);

                // upRef: respect LockY (world Y) or match ship up for free-space flight
                const upRef = g.camera.lockY ? g.camera.lockUpAxis() : g.player.up();

                let desiredQuat;
                let shipAlignDot = 0;
                if (starDist > 0.001) {
                    const blendFactor = config.player.autopilotCamBlendFactor || 0.65;

                    // Quaternion looking at the star from the player's position
                    const toStarDir = g.math.v3norm(toStar);
                    const lookAtStarQuat = g.math.quatFromLookDir(toStarDir, upRef);

                    // Quaternion looking along the ship's forward axis
                    const shipFwd = g.player.forward();
                    const shipFwdQuat = g.math.quatFromLookDir(shipFwd, upRef);

                    shipAlignDot = Math.max(-1, Math.min(1, g.math.v3dot(shipFwd, toStarDir)));

                    // blendFactor controls how much weight stays on the star direction.
                    // t=0 pure ship-forward, t=1 pure look-at-star.
                    const t = Math.max(0, Math.min(1, blendFactor));
                    desiredQuat = g.math.quatNorm(
                        g.math.quatSlerp(shipFwdQuat, lookAtStarQuat, t)
                    );
                } else {
                    // At destination,look along ship forward
                    desiredQuat = g.math.quatFromLookDir(g.player.forward(), upRef);
                    shipAlignDot = 1;
                }

                const camT = Math.min(1, config.player.alignSpeed * sec);
                g.camera.orbitQuat = g.math.quatNorm(
                    g.math.quatSlerp(g.camera.orbitQuat, desiredQuat, camT)
                );

                // Always enforce LockY pitch clamp after setting orbitQuat
                if (g.camera.lockY) {
                    g.camera.clampPitch(g.camera.pitchMin, g.camera.pitchMax, g.camera.lockUpAxis());
                }

                // Roll-settle: once the ship is well aligned with the target, rotate the
                // camera around its current view axis so the ship's projected up vector is
                // screen-up. This keeps the target in view while actually leveling the ship.
                const rollSettleThreshold = 0.85;
                if (shipAlignDot > rollSettleThreshold) {
                    const camFwd = g.math.v3norm(
                        g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 0, -1))
                    );
                    const camUp = g.math.v3norm(
                        g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 1, 0))
                    );
                    const shipUp = g.player.up();
                    const shipUpProj = g.math.v3sub(
                        shipUp,
                        g.math.v3scale(camFwd, g.math.v3dot(shipUp, camFwd))
                    );

                    if (g.math.v3len(shipUpProj) > 0.0001) {
                        let desiredUp = g.math.v3norm(shipUpProj);

                        // In LockY mode, keep the ship upright on screen by choosing the
                        // desired up direction that stays in the same hemisphere as world up.
                        if (g.camera.lockY) {
                            const worldUp = g.camera.lockUpAxis();
                            const worldUpProj = g.math.v3sub(
                                worldUp,
                                g.math.v3scale(camFwd, g.math.v3dot(worldUp, camFwd))
                            );
                            if (g.math.v3len(worldUpProj) > 0.0001) {
                                const worldUpScreen = g.math.v3norm(worldUpProj);
                                if (g.math.v3dot(desiredUp, worldUpScreen) < 0) {
                                    desiredUp = g.math.v3scale(desiredUp, -1);
                                }
                            }
                        }

                        const crossUp = g.math.v3cross(camUp, desiredUp);
                        const sinAng = g.math.v3dot(camFwd, crossUp);
                        const cosAng = Math.max(-1, Math.min(1, g.math.v3dot(camUp, desiredUp)));
                        const rollAngle = Math.atan2(sinAng, cosAng);

                        const settleWeight = (shipAlignDot - rollSettleThreshold) / (1 - rollSettleThreshold);
                        const rollSpeed = config.player.autopilotCamRollSettleSpeed || 1.5;
                        const step = rollAngle * Math.min(1, rollSpeed * settleWeight * sec);
                        const rollQ = g.math.quatFromAxisAngle(camFwd[0], camFwd[1], camFwd[2], step);
                        g.camera.orbitQuat = g.math.quatNorm(g.math.quatMul(rollQ, g.camera.orbitQuat));
                    }
                }
            }
        }

        // Roll
        if (controls.roll !== 0) {
            const q = g.math.quatFromAxisAngle(0, 0, 1, controls.roll * config.player.rollSpeed * sec);
            g.player.rot = g.math.quatNorm(g.math.quatMul(g.player.rot, q));
        }

        // Align ship to camera
        if (controls.alignToCamera) {
            const t = Math.min(1, config.player.alignSpeed * sec);
            g.player.rot = g.math.quatNorm(g.math.quatSlerp(g.player.rot, g.camera.orbitQuat, t));
        }

        // Reset rotation
        if (controls.resetRotation) {
            const t = Math.min(1, config.player.resetSpeed * sec);
            g.player.rot = g.math.quatNorm(g.math.quatSlerp(g.player.rot, g.math.quatIdentity(), t));
            g.camera.orbitQuat = g.math.quatNorm(g.math.quatSlerp(g.camera.orbitQuat, g.math.quatIdentity(), t));
        }

        // Local axes
        const fwd = g.player.forward();
        const rgt = g.player.right();
        const upv = g.player.up();

        // Render-only lean to make the ship bank and pitch into turns without
        // affecting the actual flight quaternion used by physics/autopilot.
        const prevForward = g.player.prevForward || fwd;
        const deltaForward = g.math.v3sub(fwd, prevForward);
        const yawRate = sec > 0 ? g.math.v3dot(deltaForward, rgt) / sec : 0;
        const pitchRate = sec > 0 ? g.math.v3dot(deltaForward, upv) / sec : 0;
        const bankTarget = Math.max(
            -config.player.visualBankMax,
            Math.min(
                config.player.visualBankMax,
                -yawRate * config.player.visualTurnBankResponse - controls.move.x * config.player.visualStrafeBank
            )
        );
        const pitchTarget = Math.max(
            -config.player.visualPitchMax,
            Math.min(
                config.player.visualPitchMax,
                pitchRate * config.player.visualTurnPitchResponse
            )
        );
        const leanT = Math.min(1, config.player.visualLeanSmoothing * sec);
        g.player.visualRoll += (bankTarget - g.player.visualRoll) * leanT;
        g.player.visualPitch += (pitchTarget - g.player.visualPitch) * leanT;
        g.player.prevForward = fwd;

        // Thrust level for visuals
        if (controls.move.z > 0) g.player.thrustLevel = controls.move.z;
        else if (controls.move.z < 0) g.player.thrustLevel = 0.3;
        else g.player.thrustLevel = 0;

        // Forward/backward
        if (controls.move.z !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
            g.math.v3scale(fwd, controls.move.z * config.player.thrustPower * sec));
        }

        // Strafe left/right
        if (controls.move.x !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
            g.math.v3scale(rgt, controls.move.x * config.player.speedMovement * sec));
        }

        // Strafe up/down
        if (controls.move.y !== 0) {
            g.player.velocity = g.math.v3add(g.player.velocity,
            g.math.v3scale(upv, controls.move.y * config.player.speedMovement * sec));
        }

        // Brake
        if (controls.brake) {
            g.player.velocity = g.math.v3scale(g.player.velocity, Math.exp(-config.player.brakeRate * sec));
        }

        // Apply velocity
        g.player.pos = g.math.v3add(g.player.pos, g.math.v3scale(g.player.velocity, sec * 60));

        // Damping
        g.player.applyDampingAndClamp();
    },
};

