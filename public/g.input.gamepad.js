
g.input.gamepad = {
    
    gamepads: null, gamepad: null,
    moveStick: { x: 0, y: 0, pressed: false },
    lookStick: { x: 0, y: 0, active: false, pressed: false },
    leftTrigger: 0,
    rightTrigger: 0,
    buttons: {
        0: { name: "A", pressed: false, last: false },
        1: { name: "B", pressed: false, last: false },
        2: { name: "Y", pressed: false, last: false },
        3: { name: "X", pressed: false, last: false },
        4: { name: "LB", pressed: false, last: false },
        5: { name: "RB", pressed: false, last: false },
        6: { name: "LT", pressed: false, last: false },
        7: { name: "RT", pressed: false, last: false },
        8: { name: "View", pressed: false, last: false },
        9: { name: "Menu", pressed: false, last: false },
        10:{ name: "Left Stick Press", pressed: false, last: false },
        11:{ name: "Right Stick Press", pressed: false, last: false },
        12:{ name: "Dpad Up", pressed: false, last: false },
        13:{ name: "Dpad Down", pressed: false, last: false },
        14:{ name: "Dpad Left", pressed: false, last: false },
        15:{ name: "Dpad Right", pressed: false, last: false },
        16:{ name: "Guide", pressed: false, last: false },
    },
    load() {
        console.log("Gamepad API supported:", !!navigator.getGamepads);
        const connectedGamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        for (let gp of connectedGamepads) {
            if (gp) {
                console.log("Already connected gamepad:", gp);
                g.input.gamepad.gamepads = navigator.getGamepads();
                g.input.gamepad.gamepad = g.input.gamepad.gamepads[0];
                break;
            }
        }
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected:", e.gamepad);
            g.input.gamepad.gamepads = navigator.getGamepads();
            g.input.gamepad.gamepad = g.input.gamepad.gamepads[0];
        });
        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected:", e.gamepad);
            if (g.input.gamepad.gamepad && g.input.gamepad.gamepad.index === e.gamepad.index) {
                g.input.gamepad.gamepad = null;
            }
        });

        g.input.drivers.push(g.input.gamepad);
    },

    update(dt) {
        const sec = dt / 1000;
        const gd = g.input.gamepad;

        // Refresh gamepad snapshot (required by Chrome)
        if (gd.gamepad) {
            const gamepads = navigator.getGamepads();
            gd.gamepad = gamepads[gd.gamepad.index] || null;
        }

        const d = {
            move: { x: 0, y: 0, z: 0 },
            lookDelta: { x: 0, y: 0 },
            zoomDelta: 0,
            brake: false,
            alignToCamera: false,
            roll: 0,
            resetRotation: false,
        };

        const gp = gd.gamepad;
        if (!gp) return d;

        // Buttons
        gp.buttons.forEach((btn, i) => {
            if (!gd.buttons[i]) return;
            gd.buttons[i].last = gd.buttons[i].pressed;
            gd.buttons[i].pressed = btn.pressed;
            if (gd.buttons[i].last !== gd.buttons[i].pressed) {
                if (gd.buttons[i].pressed) {
                    console.log(gd.buttons[i].name + " button pressed");
                } else {
                    console.log(gd.buttons[i].name + " button released");
                }
            }
        });

        // Stick press
        gd.moveStick.pressed = gp.buttons[10] && gp.buttons[10].pressed;
        gd.lookStick.pressed = gp.buttons[11] && gp.buttons[11].pressed;

        // Axes (analog sticks)
        gd.moveStick.x = gd.applyDeadzone(gp.axes[0]);
        gd.moveStick.y = gd.applyDeadzone(gp.axes[1]);
        gd.lookStick.x = gd.applyDeadzone(gp.axes[2]);
        gd.lookStick.y = gd.applyDeadzone(gp.axes[3]);

        // Trigger analog values (axes 4/5, range -1 released to 1 full)
        gd.leftTrigger = (gd.applyDeadzone(gp.axes[4]) + 1) * 0.5;
        gd.rightTrigger = (gd.applyDeadzone(gp.axes[5]) + 1) * 0.5;

        // Look stick active
        gd.lookStick.active = (gd.lookStick.x !== 0 || gd.lookStick.y !== 0);

        // Build deltas from gamepad state
        // Move stick
        if (Math.abs(gd.moveStick.x) > 0.05) d.move.x += gd.moveStick.x;
        if (Math.abs(gd.moveStick.y) > 0.05) d.move.z -= gd.moveStick.y;

        // RT = proportional thrust
        d.move.z += gd.rightTrigger;

        // LT = brake
        if (gd.leftTrigger > 0.05) d.brake = true;

        // LB/RB = roll
        if (gp.buttons[4] && gp.buttons[4].pressed) d.roll += 1;
        if (gp.buttons[5] && gp.buttons[5].pressed) d.roll -= 1;

        // A button = pick star at crosshair (on press edge)
        if (gd.buttons[0].pressed && !gd.buttons[0].last) {
            g.pick.pickAtCrosshair();
        }

        // R stick press = align to camera
        if (gp.buttons[11] && gp.buttons[11].pressed) d.alignToCamera = true;

        // Look stick → camera look delta
        if (gd.lookStick.active) {
            const lookSpeed = 200;
            d.lookDelta.x += gd.lookStick.x * lookSpeed * sec;
            d.lookDelta.y += gd.lookStick.y * lookSpeed * sec;
        }

        // Update debug UI
        gd.debugUI.update();

        return d;
    },

    applyDeadzone(value, deadzone = 0.05) {
        return Math.abs(value) < deadzone ? 0 : value;
    },
    debugUI: null,
};
