
g.input.touch = {
    moveStick: { x: 0, y: 0 },
    lookStick: { x: 0, y: 0, active: false },
    _brakeTouch: false,
    _aligning: false,
    _touchIds: { left: null, right: null, drag: null },
    _dragPrev: {},
    _dragStart: null,
    _lookAccum: { x: 0, y: 0 },
    _active: false,

    load() {
        g.css.push(`
            .joystick { position:fixed; bottom:30px; width:120px; height:120px; border-radius:50%; border:1px solid rgba(52,152,219,0.35); background:rgba(52,152,219,0.02); touch-action:none; z-index:10; box-shadow:0 0 12px rgba(52,152,219,0.08); display:none; }
            .joystick-left { left:30px; }
            .joystick-right { right:30px; }
            .joystick-knob { position:absolute; width:44px; height:44px; border-radius:50%; border:1px solid rgba(52,152,219,0.6); background:rgba(52,152,219,0.06); left:50%; top:50%; transform:translate(-50%,-50%); pointer-events:none; box-shadow:0 0 10px rgba(52,152,219,0.12); }
            .brake-btn { position:fixed; bottom:38px; left:50%; transform:translateX(-50%); width:110px; height:54px; background:rgba(220,40,40,0.85); border-radius:12px; border:2px solid #a22; color:#fff; font-size:22px; font-family:monospace; text-align:center; line-height:54px; z-index:12; box-shadow:0 0 16px rgba(220,40,40,0.18); display:none; user-select:none; }
            .brake-btn:active { background:rgba(220,40,40,1); }
            `);

        if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
            g.input.touch._active = true;
            g.input.touch.setupTouchControls();
            g.input.drivers.push(g.input.touch);
        }
    },

    update(dt) {
        const sec = dt / 1000;
        const t = g.input.touch;
        const d = {
            move: { x: 0, y: 0, z: 0 },
            lookDelta: { x: 0, y: 0 },
            zoomDelta: 0,
            brake: false,
            alignToCamera: false,
            roll: 0,
            resetRotation: false,
        };

        // Move stick
        if (Math.abs(t.moveStick.x) > 0.05) d.move.x += t.moveStick.x;
        if (Math.abs(t.moveStick.y) > 0.05) d.move.z -= t.moveStick.y;

        // Brake
        if (t._brakeTouch) d.brake = true;

        // Align to camera (right stick touch)
        if (t._aligning) d.alignToCamera = true;

        // Look accumulated drag deltas
        d.lookDelta.x = t._lookAccum.x;
        d.lookDelta.y = t._lookAccum.y;
        t._lookAccum.x = 0;
        t._lookAccum.y = 0;

        // Look continuous look stick
        if (t.lookStick.active) {
            const lookSpeed = 200;
            d.lookDelta.x += t.lookStick.x * lookSpeed * sec;
            d.lookDelta.y += t.lookStick.y * lookSpeed * sec;
        }

        return d;
    },

    setupTouchControls() {
        const t = g.input.touch;

        // Mobile brake button
        const brakeBtn = document.createElement('div');
        brakeBtn.className = 'brake-btn';
        brakeBtn.textContent = 'BRAKE';
        document.body.appendChild(brakeBtn);
        brakeBtn.style.display = 'block';
        brakeBtn.addEventListener('touchstart', e => {
            e.preventDefault();
            t._brakeTouch = true;
            brakeBtn.style.background = 'rgba(220,40,40,1)';
        });
        brakeBtn.addEventListener('touchend', e => {
            e.preventDefault();
            t._brakeTouch = false;
            brakeBtn.style.background = 'rgba(220,40,40,0.85)';
        });

        const leftPad = document.createElement('div');
        leftPad.className = 'joystick joystick-left';
        const leftKnob = document.createElement('div');
        leftKnob.className = 'joystick-knob';
        leftPad.appendChild(leftKnob);
        document.body.appendChild(leftPad);
        leftPad.style.display = 'block';

        const rightPad = document.createElement('div');
        rightPad.className = 'joystick joystick-right';
        const rightKnob = document.createElement('div');
        rightKnob.className = 'joystick-knob';
        rightPad.appendChild(rightKnob);
        document.body.appendChild(rightPad);
        rightPad.style.display = 'block';

        const padRadius = 60;
        const knobRadius = 22;
        const maxDisp = padRadius - knobRadius;

        function getPadCenter(el) {
            const r = el.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }

        function handleJoystick(tx, ty, pad, knob, stickObj) {
            const c = getPadCenter(pad);
            let dx = tx - c.x;
            let dy = ty - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > maxDisp) { dx = dx / dist * maxDisp; dy = dy / dist * maxDisp; }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            stickObj.x = dx / maxDisp;
            stickObj.y = dy / maxDisp;
        }

        function resetJoystick(knob, stickObj) {
            knob.style.transform = 'translate(-50%, -50%)';
            stickObj.x = 0;
            stickObj.y = 0;
        }

        leftPad.addEventListener('touchstart', e => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (t._touchIds.left === null) {
                    t._touchIds.left = touch.identifier;
                    handleJoystick(touch.clientX, touch.clientY, leftPad, leftKnob, t.moveStick);
                }
            }
        }, { passive: false });

        rightPad.addEventListener('touchstart', e => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (t._touchIds.right === null) {
                    t._touchIds.right = touch.identifier;
                    t.lookStick.active = true;
                    t._aligning = true;
                    handleJoystick(touch.clientX, touch.clientY, rightPad, rightKnob, t.lookStick);
                }
            }
        }, { passive: false });

        g.canvas.addEventListener('touchstart', e => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (t._touchIds.drag === null) {
                    t._touchIds.drag = touch.identifier;
                    t._dragPrev[touch.identifier] = { x: touch.clientX, y: touch.clientY };
                    t._dragStart = { x: touch.clientX, y: touch.clientY, time: performance.now() };
                }
            }
        }, { passive: false });

        window.addEventListener('touchmove', e => {
            e.preventDefault();
            for (const touch of e.changedTouches) {
                if (touch.identifier === t._touchIds.left) {
                    handleJoystick(touch.clientX, touch.clientY, leftPad, leftKnob, t.moveStick);
                } else if (touch.identifier === t._touchIds.right) {
                    handleJoystick(touch.clientX, touch.clientY, rightPad, rightKnob, t.lookStick);
                } else if (touch.identifier === t._touchIds.drag) {
                    const prev = t._dragPrev[touch.identifier];
                    if (prev) {
                        t._lookAccum.x += touch.clientX - prev.x;
                        t._lookAccum.y += touch.clientY - prev.y;
                        prev.x = touch.clientX;
                        prev.y = touch.clientY;
                    }
                }
            }
        }, { passive: false });

        function onTouchEnd(e) {
            for (const touch of e.changedTouches) {
                if (touch.identifier === t._touchIds.left) {
                    t._touchIds.left = null;
                    resetJoystick(leftKnob, t.moveStick);
                } else if (touch.identifier === t._touchIds.right) {
                    t._touchIds.right = null;
                    t.lookStick.active = false;
                    t._aligning = false;
                    resetJoystick(rightKnob, t.lookStick);
                } else if (touch.identifier === t._touchIds.drag) {
                    const ds = t._dragStart;
                    if (ds) {
                        const dx = touch.clientX - ds.x;
                        const dy = touch.clientY - ds.y;
                        const elapsed = performance.now() - ds.time;
                        if (Math.sqrt(dx * dx + dy * dy) < 12 && elapsed < 300) {
                            g.pick.pickAtScreen(touch.clientX, touch.clientY);
                        }
                    }
                    t._touchIds.drag = null;
                    delete t._dragPrev[touch.identifier];
                    t._dragStart = null;
                }
            }
        }
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
    },
};