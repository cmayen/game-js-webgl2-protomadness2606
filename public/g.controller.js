
//  g.controller central hub
//  Routes update() to the active controller and handles 
// switching.

g.controller = {
    current: null,

    // ordered list of controller keys for the UI selector
    types: [
        'SpaceshipFlightQuaternion',
        'FirstPerson',
        'ThirdPerson',
        'TopDown',
        'Isometric',
        'SideScroller',
    ],

    load() {
        g.controller.switchTo('SpaceshipFlightQuaternion');
    },

    switchTo(name) {
        const next = g.controller[name];
        if (!next) return;
        if (g.controller.current && g.controller.current.deactivate) {
            g.controller.current.deactivate();
        }
        // default to world-up lock unless a controller overrides it
        g.camera.orbitUpProvider = null;
        g.controller.current = next;
        if (next.activate) next.activate();
        // sync LockY checkbox if HUD is loaded
        if (g.hud && g.hud.lockYEl) {
            g.hud.lockYEl.checked = g.camera.lockY;
        }
    },

    update(dt) {
        if (g.controller.current) g.controller.current.update(dt);
    },
};
g.loadHandlers.push(g.controller.load);
