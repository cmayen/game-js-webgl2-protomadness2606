g.input = {
    // current pointer state
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    buttons: 0,
    wheel: 0,
    pinch: 0,
    twist: 0,
    touchCount: 0,
    dragging: false,

    // click detection
    _clickCallbacks: [],
    _mouseDownX: 0,
    _mouseDownY: 0,
    _touchStartX: 0,
    _touchStartY: 0,
    _touchStartCount: 0,
    _clickThreshold: 5,

    // internals
    _touches: {},
    _prevPinchDist: 0,
    _prevAngle: 0,
    _lastX: 0,
    _lastY: 0,

    load(){
        const el = g.canvas.el;

        // mouse events
        el.addEventListener("mousedown", g.input._onMouseDown);
        el.addEventListener("mousemove", g.input._onMouseMove);
        window.addEventListener("mouseup", g.input._onMouseUp);
        el.addEventListener("wheel", g.input._onWheel, { passive: false });
        el.addEventListener("contextmenu", function(e){ e.preventDefault(); });
        el.addEventListener("click", g.input._onClick);

        // touch events
        el.addEventListener("touchstart", g.input._onTouchStart, { passive: false });
        el.addEventListener("touchmove", g.input._onTouchMove, { passive: false });
        el.addEventListener("touchend", g.input._onTouchEnd);
        el.addEventListener("touchcancel", g.input._onTouchEnd);

    },

    // called by consumer (controller) after reading deltas
    clearDeltas(){
        g.input.dx = 0;
        g.input.dy = 0;
        g.input.wheel = 0;
        g.input.pinch = 0;
        g.input.twist = 0;
    },

    onClick(callback){
        g.input._clickCallbacks.push(callback);
    },

    // --- mouse handlers ---
    _onMouseDown(e){
        g.input.buttons = e.buttons;
        g.input._lastX = e.clientX;
        g.input._lastY = e.clientY;
        g.input.x = e.clientX;
        g.input.y = e.clientY;
        g.input._mouseDownX = e.clientX;
        g.input._mouseDownY = e.clientY;
        g.input.dragging = true;
    },
    _onMouseMove(e){
        g.input.x = e.clientX;
        g.input.y = e.clientY;
        if(g.input.dragging){
            g.input.dx += e.clientX - g.input._lastX;
            g.input.dy += e.clientY - g.input._lastY;
        }
        g.input._lastX = e.clientX;
        g.input._lastY = e.clientY;
        g.input.buttons = e.buttons;
    },
    _onMouseUp(e){
        g.input.buttons = e.buttons;
        g.input.dragging = (e.buttons !== 0);
    },
    _onClick(e){
        const dx = e.clientX - g.input._mouseDownX;
        const dy = e.clientY - g.input._mouseDownY;
        if(Math.hypot(dx, dy) < g.input._clickThreshold){
            for(const cb of g.input._clickCallbacks){
                cb(e.clientX, e.clientY, e);
            }
        }
    },
    _onWheel(e){
        e.preventDefault();
        g.input.wheel += e.deltaY;
    },

    // --- touch handlers ---
    _onTouchStart(e){
        e.preventDefault();
        for(const touch of e.changedTouches){
            g.input._touches[touch.identifier] = { x: touch.clientX, y: touch.clientY };
        }
        const ids = Object.keys(g.input._touches);
        g.input.touchCount = ids.length;
        if(ids.length === 1){
            const t = g.input._touches[ids[0]];
            g.input._lastX = t.x;
            g.input._lastY = t.y;
            g.input.x = t.x;
            g.input.y = t.y;
            g.input._touchStartX = t.x;
            g.input._touchStartY = t.y;
            g.input._touchStartCount = 1;
            g.input.dragging = true;
            g.input.buttons = 1;
        }
        if(ids.length === 2){
            g.input._touchStartCount = 2;
            g.input._prevPinchDist = g.input._pinchDist();
            g.input._prevAngle = g.input._touchAngle();
            const touches = ids.map(id => g.input._touches[id]);
            g.input._lastX = (touches[0].x + touches[1].x) / 2;
            g.input._lastY = (touches[0].y + touches[1].y) / 2;
            g.input.buttons = 2;
            g.input.dragging = true;
        }
    },
    _onTouchMove(e){
        e.preventDefault();
        for(const touch of e.changedTouches){
            if(g.input._touches[touch.identifier]){
                g.input._touches[touch.identifier].x = touch.clientX;
                g.input._touches[touch.identifier].y = touch.clientY;
            }
        }
        const ids = Object.keys(g.input._touches);
        if(ids.length === 1){
            const t = g.input._touches[ids[0]];
            g.input.dx += t.x - g.input._lastX;
            g.input.dy += t.y - g.input._lastY;
            g.input._lastX = t.x;
            g.input._lastY = t.y;
            g.input.x = t.x;
            g.input.y = t.y;
        }
        if(ids.length === 2){
            // elevation via vertical midpoint drag
            const touches = ids.map(id => g.input._touches[id]);
            const avgX = (touches[0].x + touches[1].x) / 2;
            const avgY = (touches[0].y + touches[1].y) / 2;
            g.input.dy += avgY - g.input._lastY;
            g.input._lastX = avgX;
            g.input._lastY = avgY;

            // pinch zoom
            const dist = g.input._pinchDist();
            if(g.input._prevPinchDist > 0){
                g.input.pinch += g.input._prevPinchDist - dist;
            }
            g.input._prevPinchDist = dist;

            // twist rotation
            const angle = g.input._touchAngle();
            let delta = angle - g.input._prevAngle;
            // handle wraparound at ±PI
            if(delta > Math.PI) delta -= Math.PI * 2;
            if(delta < -Math.PI) delta += Math.PI * 2;
            g.input.twist += delta;
            g.input._prevAngle = angle;
        }
    },
    _onTouchEnd(e){
        // detect single-finger tap before removing touch
        const wasSingle = g.input._touchStartCount === 1;
        const endTouch = e.changedTouches[0];
        for(const touch of e.changedTouches){
            delete g.input._touches[touch.identifier];
        }
        const ids = Object.keys(g.input._touches);
        if(ids.length === 0){
            if(wasSingle && endTouch){
                const dx = endTouch.clientX - g.input._touchStartX;
                const dy = endTouch.clientY - g.input._touchStartY;
                if(Math.hypot(dx, dy) < g.input._clickThreshold){
                    for(const cb of g.input._clickCallbacks){
                        cb(endTouch.clientX, endTouch.clientY);
                    }
                }
            }
            g.input._touchStartCount = 0;
            g.input.dragging = false;
            g.input.buttons = 0;
            g.input.touchCount = 0;
            g.input._prevPinchDist = 0;
            g.input._prevAngle = 0;
        } else if(ids.length === 1){
            const t = g.input._touches[ids[0]];
            g.input._lastX = t.x;
            g.input._lastY = t.y;
            g.input.buttons = 1;
        }
    },

    _pinchDist(){
        const ids = Object.keys(g.input._touches);
        if(ids.length < 2) return 0;
        const a = g.input._touches[ids[0]];
        const b = g.input._touches[ids[1]];
        return Math.hypot(b.x - a.x, b.y - a.y);
    },
    _touchAngle(){
        const ids = Object.keys(g.input._touches);
        if(ids.length < 2) return 0;
        const a = g.input._touches[ids[0]];
        const b = g.input._touches[ids[1]];
        return Math.atan2(b.y - a.y, b.x - a.x);
    },
};
g.loadHandlers.push(g.input.load);
