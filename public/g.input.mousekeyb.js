
g.input.mousekeyb = {
    keys: {},
    mouseLeft: false,
    mouseRight: false,
    _dragging: false,
    _last: { x: 0, y: 0 },
    _dragStart: { x: 0, y: 0 },
    _lookAccum: { x: 0, y: 0 },
    _zoomAccum: 0,

    load() {
        window.addEventListener('keydown', e => { g.input.mousekeyb.keys[e.code] = true; });
        window.addEventListener('keyup',   e => { g.input.mousekeyb.keys[e.code] = false; });

        document.addEventListener('mousedown', e => {
            if (e.button === 2) g.input.mousekeyb.mouseRight = true;
            if (e.button === 0) {
                g.input.mousekeyb.mouseLeft = true;
                g.input.mousekeyb._dragging = true;
                g.input.mousekeyb._last.x = e.clientX;
                g.input.mousekeyb._last.y = e.clientY;
                g.input.mousekeyb._dragStart.x = e.clientX;
                g.input.mousekeyb._dragStart.y = e.clientY;
            }
        });
        document.addEventListener('mouseup', e => {
            if (e.button === 2) g.input.mousekeyb.mouseRight = false;
            if (e.button === 0) {
                g.input.mousekeyb.mouseLeft = false;
                const dx = e.clientX - g.input.mousekeyb._dragStart.x;
                const dy = e.clientY - g.input.mousekeyb._dragStart.y;
                const dragDist = Math.sqrt(dx * dx + dy * dy);
                // Only allow picking if the drag distance was minimal (true click, not a drag)
                if (dragDist < 5 && e.target === g.canvas) {
                    g.pick.pickAtScreen(e.clientX, e.clientY);
                }
                g.input.mousekeyb._dragging = false;
            }
        });
        window.addEventListener('mousemove', e => {
            if (g.input.mousekeyb._dragging) {
                g.input.mousekeyb._lookAccum.x += e.clientX - g.input.mousekeyb._last.x;
                g.input.mousekeyb._lookAccum.y += e.clientY - g.input.mousekeyb._last.y;
                g.input.mousekeyb._last.x = e.clientX;
                g.input.mousekeyb._last.y = e.clientY;
            }
        });
        g.canvas.addEventListener('contextmenu', e => e.preventDefault());
        g.canvas.addEventListener('wheel', e => {
            g.input.mousekeyb._zoomAccum += e.deltaY * 0.3;
            e.preventDefault();
        }, { passive: false });

        g.input.drivers.push(g.input.mousekeyb);
    },

    update(dt) {
        const k = g.input.mousekeyb.keys;
        const d = {
            move: { x: 0, y: 0, z: 0 },
            lookDelta: { x: 0, y: 0 },
            zoomDelta: 0,
            brake: false,
            alignToCamera: false,
            roll: 0,
            resetRotation: false,
        };

        if (k['KeyW']) d.move.z += 1;
        if (k['KeyS']) d.move.z -= 1;
        if (k['KeyA']) d.move.x -= 1;
        if (k['KeyD']) d.move.x += 1;
        if (k['ShiftLeft']) d.move.y += 1;
        if (k['ControlLeft']) d.move.y -= 1;
        if (k['Space']) d.brake = true;
        if (k['KeyQ']) d.roll += 1;
        if (k['KeyE']) d.roll -= 1;
        if (k['KeyR']) d.resetRotation = true;

        if (g.input.mousekeyb.mouseRight) d.alignToCamera = true;

        d.lookDelta.x = g.input.mousekeyb._lookAccum.x;
        d.lookDelta.y = g.input.mousekeyb._lookAccum.y;
        g.input.mousekeyb._lookAccum.x = 0;
        g.input.mousekeyb._lookAccum.y = 0;

        d.zoomDelta = g.input.mousekeyb._zoomAccum;
        g.input.mousekeyb._zoomAccum = 0;

        return d;
    },
};