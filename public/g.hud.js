
//  g.hud — HUD overlay
g.hud = {
    el: null,
    selectorEl: null,
    flyBtnEl: null,
    navTargetInputEl: null,
    navTargetBtnEl: null,
    navTargetErrorEl: null,
    apEtaEl: null,
    speedEl: null,
    apWasActive: false,

    apTripStartDist: 0,
    frameCount: 0,
    fpsAccum: 0,
    fpsDisplay: 0,
    load() {
        g.css.push(`#hud { position:absolute; top:10px; left:10px; font-size:12px; pointer-events:none; }`);
        g.css.push(`#controller-select {
            position:absolute; top:10px; right:10px; font-size:12px;
            font-family:monospace; background:#222; color:#aaa; border:1px solid #555;
            padding:4px 8px; outline:none; cursor:pointer;
        }`);
        g.css.push(`#controller-select:hover { border-color:#888; }`);
        g.css.push(`#lock-y-wrap {
            position:absolute; top:36px; right:10px; font-size:12px;
            font-family:monospace; color:#aaa; cursor:pointer; user-select:none;
        }`);
        g.css.push(`#lock-y-wrap input { vertical-align:middle; cursor:pointer; }`);
        g.css.push(`#fly-selected-btn {
            position:absolute; top:62px; right:10px; font-size:12px;
            font-family:monospace; background:#1d2a1f; color:#a9d9b0; border:1px solid #3e6f46;
            padding:4px 8px; outline:none; cursor:pointer;
        }`);
        g.css.push(`#fly-selected-btn:hover { border-color:#66a06f; }`);
        g.css.push(`#fly-selected-btn:disabled { opacity:0.5; cursor:not-allowed; }`);
        g.css.push(`#nav-target-wrap {
            position:absolute; top:88px; right:10px; display:flex; flex-direction:column; gap:3px; align-items:flex-end;
        }`);
        g.css.push(`#nav-target-input {
            font-size:11px; font-family:monospace; background:#111; color:#aaa;
            border:1px solid #555; padding:3px 6px; outline:none; width:200px;
        }`);
        g.css.push(`#nav-target-input:focus { border-color:#888; }`);
        g.css.push(`#nav-target-btn {
            font-size:12px; font-family:monospace; background:#1d1f2a; color:#a0b0d9;
            border:1px solid #3e4f8f; padding:4px 8px; outline:none; cursor:pointer;
        }`);
        g.css.push(`#nav-target-btn:hover { border-color:#6677cc; }`);
        g.css.push(`#nav-target-btn:disabled { opacity:0.5; cursor:not-allowed; }`);
        g.css.push(`#nav-target-error {
            font-size:10px; font-family:monospace; color:#e07070; max-width:210px; text-align:right;
        }`);
        g.css.push(`#ap-eta {
            position:absolute; bottom:10px; right:10px;
            font-size:12px; font-family:monospace; color:#a9d9b0;
            pointer-events:none; display:none;
        }`);
        g.css.push(`#speed-gauge {
            position:absolute; bottom:34px; right:10px;
            font-size:11px; font-family:monospace; color:#aaa;
            pointer-events:none; display:flex; flex-direction:column; align-items:flex-end; gap:2px;
        }`);
        g.css.push(`#speed-gauge-label { white-space:nowrap; }`);
        g.css.push(`#speed-gauge-bar-bg {
            width:120px; height:6px; background:#333; border:1px solid #555;
        }`);
        g.css.push(`#speed-gauge-bar-fill {
            height:100%; width:0%; background:#a9d9b0; transition:width 0.1s linear;
        }`);

        g.hud.el = document.createElement('div');
        g.hud.el.id = 'hud';
        document.body.appendChild(g.hud.el);

        // controller type selector
        const sel = document.createElement('select');
        sel.id = 'controller-select';
        g.controller.types.forEach(function(name) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = g.controller[name].name || name;
            sel.appendChild(opt);
        });
        sel.value = g.controller.types[0];
        sel.addEventListener('change', function() {
            g.controller.switchTo(sel.value);
        });
        document.body.appendChild(sel);
        g.hud.selectorEl = sel;

        // LockY checkbox
        const lockWrap = document.createElement('label');
        lockWrap.id = 'lock-y-wrap';
        const lockCb = document.createElement('input');
        lockCb.type = 'checkbox';
        lockCb.checked = g.camera.lockY;
        lockCb.addEventListener('change', function() {
            g.camera.lockY = lockCb.checked;
        });
        lockWrap.appendChild(lockCb);
        lockWrap.appendChild(document.createTextNode(' Lock Y'));
        document.body.appendChild(lockWrap);
        g.hud.lockYEl = lockCb;

        // Autopilot button
        const flyBtn = document.createElement('button');
        flyBtn.id = 'fly-selected-btn';
        flyBtn.textContent = 'Fly To Selected';
        flyBtn.addEventListener('click', function() {
            const ap = g.controller.SpaceshipAutopilot;
            if (!ap || !ap.isSpaceshipControllerActive()) return;
            if (ap.active) {
                if (g.pick.selectedStar && ap.isSelectedDifferentFromTarget()) ap.startToSelected();
                else ap.cancel('user-cancel');
                return;
            }
            ap.startToSelected();
        });
        document.body.appendChild(flyBtn);
        g.hud.flyBtnEl = flyBtn;

        // Nav-to-point UI
        const navWrap = document.createElement('div');
        navWrap.id = 'nav-target-wrap';

        const navInput = document.createElement('input');
        navInput.id = 'nav-target-input';
        navInput.type = 'text';
        navInput.value = '0,0,0:0,0,0';
        navInput.title = 'tileX,tileY,tileZ:innerX,innerY,innerZ';
        navInput.addEventListener('keydown', function(e) {
            // prevent game input from firing while typing
            e.stopPropagation();
        });
        navWrap.appendChild(navInput);
        g.hud.navTargetInputEl = navInput;

        const navBtn = document.createElement('button');
        navBtn.id = 'nav-target-btn';
        navBtn.textContent = 'Fly To Point';
        navBtn.addEventListener('click', function() {
            const ap = g.controller.SpaceshipAutopilot;
            if (!ap || !ap.isSpaceshipControllerActive()) return;
            const parsed = g.hud.parseNavTarget(navInput.value);
            if (!parsed) {
                g.hud.navTargetErrorEl.textContent = 'Invalid format. Use tileX,tileY,tileZ:innerX,innerY,innerZ';
                return;
            }
            const ts = config.world.tileSize;
            const worldPos = g.math.v3(
                parsed.tile[0] * ts + parsed.inner[0],
                parsed.tile[1] * ts + parsed.inner[1],
                parsed.tile[2] * ts + parsed.inner[2]
            );
            // clear star selection
            if (g.pick.selectedStar) g.pick.selectedStar.selected = false;
            g.pick.selectedStar = null;
            g.pick.selectedStarId = null;
            g.hud.navTargetErrorEl.textContent = '';
            ap.startToPoint(worldPos);
        });
        navWrap.appendChild(navBtn);
        g.hud.navTargetBtnEl = navBtn;

        const navError = document.createElement('div');
        navError.id = 'nav-target-error';
        navWrap.appendChild(navError);
        g.hud.navTargetErrorEl = navError;

        document.body.appendChild(navWrap);

        // Speed gauge
        const speedGauge = document.createElement('div');
        speedGauge.id = 'speed-gauge';
        const speedLabel = document.createElement('div');
        speedLabel.id = 'speed-gauge-label';
        speedGauge.appendChild(speedLabel);
        const speedBarBg = document.createElement('div');
        speedBarBg.id = 'speed-gauge-bar-bg';
        const speedBarFill = document.createElement('div');
        speedBarFill.id = 'speed-gauge-bar-fill';
        speedBarBg.appendChild(speedBarFill);
        speedGauge.appendChild(speedBarBg);
        document.body.appendChild(speedGauge);
        g.hud.speedEl = { label: speedLabel, fill: speedBarFill };

        // Autopilot ETA label
        const etaEl = document.createElement('div');
        etaEl.id = 'ap-eta';
        document.body.appendChild(etaEl);
        g.hud.apEtaEl = etaEl;
    },

    parseNavTarget(raw) {
        const m = (raw || '').trim().match(
            /^\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*:\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*$/
        );
        if (!m) return null;
        return {
            tile:  [Number(m[1]), Number(m[2]), Number(m[3])],
            inner: [Number(m[4]), Number(m[5]), Number(m[6])],
        };
    },
    update(dt) {
        g.hud.frameCount++;
        g.hud.fpsAccum += dt;
        if (g.hud.fpsAccum >= 1000) {
            g.hud.fpsDisplay = g.hud.frameCount;
            g.hud.frameCount = 0;
            g.hud.fpsAccum -= 1000;
        }
        const p = g.player.pos;
        const z = Math.round(g.camera.zoom);
        const spd = g.math.v3len(g.player.velocity).toFixed(3);
        const braking = g.input.brake ? ' [BRAKE]' : '';
        let info = `FPS: ${g.hud.fpsDisplay}  pos: ${p[0].toFixed(1)}, ${p[1].toFixed(1)}, ${p[2].toFixed(1)}  zoom: ${z}  vel: ${spd}${braking}`;

        const ap = g.controller.SpaceshipAutopilot;
        if (ap && ap.active && ap.targetPos) {
            const toTarget = g.math.v3sub(ap.targetPos, g.player.pos);
            const dist = g.math.v3len(toTarget);
            const distRemaining = Math.max(0, dist - (ap.arrivalOffset || 0));
            info += `  | autopilot: ON dist:${dist.toFixed(2)}`;

            // start/reset trip tracking when autopilot engages
            if (!g.hud.apWasActive) {
                g.hud.apTripStartDist = dist;
            }
            g.hud.apWasActive = true;

            // Physics-based ETA using maxSpeed, thrustPower, and brakeRate.
            // Model: ship accelerates from 0  maxSpeed, cruises, then brakes to a stop.
            //   accel phase:  constant thrust  time ≈ maxSpeed / thrustPower
            //   brake phase:  exponential drag with brakeRate
            //                 stopping time  1 / brakeRate (time-constant of e-fold decay)
            //                 stopping dist  maxSpeed / brakeRate
            //   cruise phase: remaining distance at maxSpeed
            const vMax       = config.player.maxSpeed      || 8.5;
            const thrust     = config.player.thrustPower   || 0.13;
            const brakeRate  = config.player.brakeRate     || 3.0;

            const accelTime  = vMax / thrust;                    // seconds to reach vMax
            const accelDist  = 0.5 * vMax * accelTime;          // distance covered while accelerating (linear approx)
            const brakeDist  = vMax / brakeRate;                 // stopping distance under exponential drag
            const brakeTime  = 1.5 / brakeRate;                  // ~1.5 time-constants to reach near-zero

            let secsLeft;
            if (distRemaining <= accelDist + brakeDist) {
                // Short trip mostly accel/brake, no cruise phase, scale linearly
                secsLeft = Math.sqrt(2 * distRemaining / thrust);
            } else {
                const cruiseDist = distRemaining - accelDist - brakeDist;
                const cruiseTime = cruiseDist / vMax;
                // Blend in how much of the accel phase is still ahead based on current speed
                const curSpeed   = g.math.v3len(g.player.velocity);
                const speedFrac  = Math.min(curSpeed / vMax, 1.0);
                const accelLeft  = accelTime * (1 - speedFrac);
                secsLeft = accelLeft + cruiseTime + brakeTime;
            }

            let etaText = '';
            if (secsLeft >= 0) {
                const mins    = Math.floor(secsLeft / 60);
                const secs    = Math.floor(secsLeft % 60);
                const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
                etaText = `ETA  ${timeStr}  (${distRemaining.toFixed(1)} u remaining)`;
            }
            if (g.hud.apEtaEl) { g.hud.apEtaEl.textContent = etaText; g.hud.apEtaEl.style.display = 'block'; }
        } else {
            if (g.hud.apWasActive) {
                g.hud.apWasActive = false;
            }
            if (g.hud.apEtaEl) g.hud.apEtaEl.style.display = 'none';
        }

        const ss = g.pick.selectedStar;
        if (ss) {
            info += `  | star seed:${ss.seed} tile:(${ss.tileAx},${ss.tileAy},${ss.tileAz}) local:(${ss.localPos[0].toFixed(2)},${ss.localPos[1].toFixed(2)},${ss.localPos[2].toFixed(2)})`;
        } else {
            info += '  [click to capture mouse]';
        }

        if (g.hud.navTargetBtnEl && ap) {
            g.hud.navTargetBtnEl.disabled = !ap.isSpaceshipControllerActive();
        }

        if (g.hud.flyBtnEl && ap) {
            const hasSelection = !!g.pick.selectedStar;
            const active = !!ap.active;
            const spaceshipActive = ap.isSpaceshipControllerActive();
            g.hud.flyBtnEl.disabled = !spaceshipActive || (!active && !hasSelection);
            let btnLabel = 'Fly To Selected';
            if (active) {
                btnLabel = (hasSelection && ap.isSelectedDifferentFromTarget()) ? 'Retarget Auto-Fly' : 'Cancel Auto-Fly';
            }
            g.hud.flyBtnEl.textContent = btnLabel;
        }

        // Speed gauge update
        if (g.hud.speedEl) {
            const currentSpd = g.math.v3len(g.player.velocity) * 60; // convert to wu/s
            const maxSpd = config.player.maxSpeed;
            const pct = Math.min(1, currentSpd / maxSpd) * 100;
            const atCap = pct >= 99.5;
            g.hud.speedEl.label.textContent = `SPD  ${currentSpd.toFixed(1)} / ${maxSpd} wu/s`;
            g.hud.speedEl.fill.style.width = pct.toFixed(1) + '%';
            g.hud.speedEl.fill.style.background = atCap ? '#e07070' : '#a9d9b0';
        }

        g.hud.el.textContent = info;
    },
};
g.loadHandlers.push(g.hud.load);
