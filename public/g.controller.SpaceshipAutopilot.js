
//  g.controller.SpaceshipAutopilot a fun experminetn
// had some AI help here

g.controller.SpaceshipAutopilot = {
    active: false,
    targetPos: null,
    targetStarId: null,
    arrivalOffset: 0,
    intent: null,
    lastReason: '',
    // camera orientation relative to ship at time of engage (or last manual look)
    camLocalOffset: null,
    // once the player manually rotates the camera during a flight, stop overriding it
    playerTookCameraControl: false,
    // retarget misalignment correction bleeds off bad velocity over a short window
    retargetBrakeTimer: 0,   // seconds remaining
    retargetBrakeFactor: 0,  // 0-1 misalignment severity recorded at retarget moment

    load() {},

    isSpaceshipControllerActive() {
        return g.controller.current === g.controller.SpaceshipFlightQuaternion;
    },

    defaultArrivalOffset() {
        const mult = config.player.autopilotStopOffsetMultiplier || 2.5;
        return config.player.shipScale * mult;
    },

    hasManualFlightInput(manualInput) {
        if (!manualInput) return false;
        const eps = 0.0001;
        if (Math.abs(manualInput.move.x) > eps) return true;
        if (Math.abs(manualInput.move.y) > eps) return true;
        if (Math.abs(manualInput.move.z) > eps) return true;
        if (Math.abs(manualInput.roll) > eps) return true;
        if (manualInput.brake) return true;
        if (manualInput.alignToCamera) return true;
        if (manualInput.resetRotation) return true;
        return false;
    },

    cacheSelectedTarget(offsetOverride) {
        const star = g.pick.selectedStar;
        if (!star) return false;
        g.controller.SpaceshipAutopilot.targetPos = g.math.v3(star.worldPos[0], star.worldPos[1], star.worldPos[2]);
        if (g.pick.selectedStarId) {
            const sid = g.pick.selectedStarId;
            g.controller.SpaceshipAutopilot.targetStarId = {
                tileAx: sid.tileAx,
                tileAy: sid.tileAy,
                tileAz: sid.tileAz,
                index: sid.index,
            };
        } else {
            g.controller.SpaceshipAutopilot.targetStarId = {
                tileAx: star.tileAx,
                tileAy: star.tileAy,
                tileAz: star.tileAz,
                index: star.index,
            };
        }
        const off = (typeof offsetOverride === 'number') ? offsetOverride : g.controller.SpaceshipAutopilot.defaultArrivalOffset();
        g.controller.SpaceshipAutopilot.arrivalOffset = Math.max(0, off);
        // snapshot camera-relative-to-ship so follow cam knows the intended offset
        g.controller.SpaceshipAutopilot.camLocalOffset = g.math.quatNorm(
            g.math.quatMul(g.math.quatConjugate(g.player.rot), g.camera.orbitQuat)
        );

        // Compute velocity misalignment with new target direction.
        // Triggers extra bleedoff if velocity is mostly sideways or backward.
        const ap = g.controller.SpaceshipAutopilot;
        const speed = g.math.v3len(g.player.velocity);
        if (speed > 0.001 && ap.active) {
            const newTargetVec = g.math.v3sub(ap.targetPos, g.player.pos);
            const newTargetDist = g.math.v3len(newTargetVec);
            if (newTargetDist > 0.001) {
                const newDir = g.math.v3norm(newTargetVec);
                const velDir = g.math.v3norm(g.player.velocity);
                const velDot = Math.max(-1, Math.min(1, g.math.v3dot(velDir, newDir)));
                // lateral fraction: how much velocity is perpendicular to new target
                const lateralFrac = Math.sqrt(Math.max(0, 1 - velDot * velDot));
                // backward fraction: how much velocity is pointing away from new target
                const backwardFrac = Math.max(0, -velDot);
                // combined severity 0-1, weighted toward worst case
                const severity = Math.min(1, lateralFrac * 0.6 + backwardFrac * 0.8);
                const threshold = 0.35; // only trigger if meaningfully misaligned
                if (severity > threshold) {
                    ap.retargetBrakeFactor = severity;
                    ap.retargetBrakeTimer = 2.0; // seconds of extra bleedoff
                } else {
                    ap.retargetBrakeFactor = 0;
                    ap.retargetBrakeTimer = 0;
                }
            }
        } else {
            g.controller.SpaceshipAutopilot.retargetBrakeFactor = 0;
            g.controller.SpaceshipAutopilot.retargetBrakeTimer = 0;
        }

        return true;
    },

    startToSelected(offsetOverride) {
        if (!g.controller.SpaceshipAutopilot.isSpaceshipControllerActive()) return false;
        if (!g.controller.SpaceshipAutopilot.cacheSelectedTarget(offsetOverride)) return false;
        g.controller.SpaceshipAutopilot.active = true;
        g.controller.SpaceshipAutopilot.playerTookCameraControl = false;
        g.controller.SpaceshipAutopilot.lastReason = 'flying';
        return true;
    },

    startToPoint(worldPos, offsetOverride) {
        const ap = g.controller.SpaceshipAutopilot;
        if (!ap.isSpaceshipControllerActive()) return false;
        if (!worldPos || worldPos.length < 3) return false;

        ap.targetPos = g.math.v3(worldPos[0], worldPos[1], worldPos[2]);
        ap.targetStarId = null;
        const off = (typeof offsetOverride === 'number') ? offsetOverride : ap.defaultArrivalOffset();
        ap.arrivalOffset = Math.max(0, off);

        ap.camLocalOffset = g.math.quatNorm(
            g.math.quatMul(g.math.quatConjugate(g.player.rot), g.camera.orbitQuat)
        );

        // reset retarget bleedoff
        ap.retargetBrakeFactor = 0;
        ap.retargetBrakeTimer = 0;

        ap.active = true;
        ap.playerTookCameraControl = false;
        ap.lastReason = 'flying-manual-point';
        return true;
    },

    isSelectedDifferentFromTarget() {
        const sid = g.pick.selectedStarId;
        const tid = g.controller.SpaceshipAutopilot.targetStarId;
        if (!sid || !tid) return false;
        return sid.tileAx !== tid.tileAx || sid.tileAy !== tid.tileAy || sid.tileAz !== tid.tileAz || sid.index !== tid.index;
    },

    cancel(reason) {
        g.controller.SpaceshipAutopilot.active = false;
        g.controller.SpaceshipAutopilot.intent = null;
        g.controller.SpaceshipAutopilot.lastReason = reason || '';
    },

    update(dt, manualInput) {
        const ap = g.controller.SpaceshipAutopilot;
        ap.intent = null;
        if (!ap.active) return null;

        if (!ap.isSpaceshipControllerActive()) {
            ap.cancel('controller-switch');
            return null;
        }
        if (ap.hasManualFlightInput(manualInput)) {
            ap.cancel('manual-override');
            return null;
        }
        if (!ap.targetPos) {
            ap.cancel('missing-target');
            return null;
        }

        const toTarget = g.math.v3sub(ap.targetPos, g.player.pos);
        const dist = g.math.v3len(toTarget);
        const stopDist = Math.max(0, ap.arrivalOffset);
        const distToStop = Math.max(0, dist - stopDist);
        const speed = g.math.v3len(g.player.velocity);

        // Physics-accurate stopping distance: pos += velocity * sec * 60,
        // braking applies velocity *= exp(-brakeRate * sec), so continuous
        // stopping distance = speed * 60 / brakeRate. Use 1.5x safety margin.
        const stoppingDist = (speed * 60) / config.player.brakeRate;

        if (dist <= stopDist) {
            if (speed < 0.005) {
                ap.cancel('arrived');
                return null;
            }
            ap.intent = {
                move: { x: 0, y: 0, z: 0 },
                roll: 0,
                brake: true,
                alignToCamera: false,
                resetRotation: false,
                thrustLevel: 0,
                targetRot: null,
            };
            return ap.intent;
        }

        const desiredDir = g.math.v3norm(toTarget);
        // Align ship forward to target, but keep ship up matched to camera up (no sideways roll)
        const cameraUp = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 1, 0));
        const targetRot = g.math.quatFromLookDir(desiredDir, cameraUp);
        const forward = g.player.forward();
        const alignDot = Math.max(-1, Math.min(1, g.math.v3dot(forward, desiredDir)));

        // Extra velocity bleedoff after a retarget with bad misalignment.
        // Stacks on top of normal approach/turn braking.
        if (ap.retargetBrakeTimer > 0) {
            const sec = dt / 1000;
            ap.retargetBrakeTimer = Math.max(0, ap.retargetBrakeTimer - sec);
            const slowConfig = config.player.autopilotExtremeRetargetDirectionSlowing || 3.0;
            // fade the extra rate linearly as timer counts down
            const timerFrac = ap.retargetBrakeTimer / 2.0;
            const extraRate = slowConfig * ap.retargetBrakeFactor * timerFrac;
            if (extraRate > 0) {
                g.player.velocity = g.math.v3scale(
                    g.player.velocity, Math.exp(-extraRate * sec)
                );
            }
        }

        // Start braking early enough to stop at stopDist (1.5x safety margin)
        const shouldBrakeForApproach = stoppingDist * 1.5 >= distToStop;
        // Brake while not aligned so we don't blast past the target sideways
        const shouldBrakeForTurn = alignDot < 0.15 && speed > 0.05;
        const shouldBrake = shouldBrakeForApproach || shouldBrakeForTurn;

        // Only thrust when facing target and not already in braking mode
        let thrust = 0;
        if (!shouldBrake && alignDot > 0.5) {
            thrust = Math.min(1, alignDot);
        }

        ap.intent = {
            move: { x: 0, y: 0, z: thrust },
            roll: 0,
            brake: shouldBrake,
            alignToCamera: false,
            resetRotation: false,
            thrustLevel: thrust,
            targetRot: targetRot,
        };
        return ap.intent;
    },
};
g.loadHandlers.push(g.controller.SpaceshipAutopilot.load);
