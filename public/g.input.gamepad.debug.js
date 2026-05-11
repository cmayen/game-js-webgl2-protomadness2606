
g.input.gamepad.debug = {
    el: null,
    load() {
        g.css.push(g.input.gamepad.debug.css);
        g.input.gamepad.debugUI = new g.input.gamepad.DebugUI();
        document.body.appendChild( g.input.gamepad.debugUI.el );
        
    },
    update() {
        //

        //
    },
};
g.loadHandlers.push(g.input.gamepad.debug.load);

















g.input.gamepad.DebugUI = function() {
    this.el = document.createElement('div'); this.el.className = 'gamepad';
    this.elLS = document.createElement('div'); this.el.appendChild(this.elLS);
    this.elLSI = document.createElement('div'); this.elLS.appendChild(this.elLSI);
    this.elLS.className = 'virtual-stick move-stick';
    this.elRS = document.createElement('div'); this.el.appendChild(this.elRS);
    this.elRSI = document.createElement('div'); this.elRS.appendChild(this.elRSI);
    this.elRS.className = 'virtual-stick look-stick';
    this.elLT = document.createElement('div'); this.el.appendChild(this.elLT);
    this.elLT.className = 'trigger trigger-left';
    this.elLTI = document.createElement('div'); this.elLT.appendChild(this.elLTI);
    this.elRT = document.createElement('div'); this.el.appendChild(this.elRT);
    this.elRT.className = 'trigger trigger-right';
    this.elRTI = document.createElement('div'); this.elRT.appendChild(this.elRTI);
    this.elLB = document.createElement('div'); this.el.appendChild(this.elLB);
    this.elLB.className = 'left-bumper';
    this.elRB = document.createElement('div'); this.el.appendChild(this.elRB);
    this.elRB.className = 'right-bumper';
    this.elBtnsTR = document.createElement('div'); this.el.appendChild(this.elBtnsTR);
    this.elBtnsTR.className = 'buttons-tr';
    this.elA = document.createElement('div'); this.elBtnsTR.appendChild(this.elA); //this.elA.innerText = 'A';
    this.elB = document.createElement('div'); this.elBtnsTR.appendChild(this.elB); //this.elB.innerText = 'B';
    this.elY = document.createElement('div'); this.elBtnsTR.appendChild(this.elY); //this.elY.innerText = 'Y';
    this.elX = document.createElement('div'); this.elBtnsTR.appendChild(this.elX); //this.elX.innerText = 'X';

    this.elDpad = document.createElement('div'); this.el.appendChild(this.elDpad);
    this.elDpad.className = 'dpad';
    this.elDpadUp = document.createElement('div'); this.elDpad.appendChild(this.elDpadUp);
    this.elDpadDown = document.createElement('div'); this.elDpad.appendChild(this.elDpadDown);
    this.elDpadLeft = document.createElement('div'); this.elDpad.appendChild(this.elDpadLeft);
    this.elDpadRight = document.createElement('div'); this.elDpad.appendChild(this.elDpadRight);
    this.elDpadCenter = document.createElement('div'); this.elDpad.appendChild(this.elDpadCenter);
    this.elView = document.createElement('div'); this.el.appendChild(this.elView);
    this.elView.className = 'view-button';
    this.elMenu = document.createElement('div'); this.el.appendChild(this.elMenu);
    this.elMenu.className = 'menu-button';
    this.elGuide = document.createElement('div'); this.el.appendChild(this.elGuide);
    this.elGuide.className = 'guide-button';
};


g.input.gamepad.DebugUI.prototype.update = function() {
    const gp = g.input.gamepad.gamepad;
    if (gp) {
        // update the debuger virtual joysticks
        const moveStickEl = this.elLSI;
        const lookStickEl = this.elRSI;
        if (moveStickEl) {
            moveStickEl.style.transform = `translate(${g.input.gamepad.moveStick.x * 25}px, ${g.input.gamepad.moveStick.y * 25}px) translate(-50%, -50%)`;
            if(g.input.gamepad.moveStick.pressed){
                moveStickEl.style.background = 'rgba(255, 255, 255, 0.5)';
            }else{
                moveStickEl.style.background = 'rgba(255, 255, 255, 0.0)';
            }
        }
        if (lookStickEl) {
            lookStickEl.style.transform = `translate(${g.input.gamepad.lookStick.x * 25}px, ${g.input.gamepad.lookStick.y * 25}px) translate(-50%, -50%)`;
            if(g.input.gamepad.lookStick.pressed){
                lookStickEl.style.background = 'rgba(255, 255, 255, 0.5)';
            }else{
                lookStickEl.style.background = 'rgba(255, 255, 255, 0.0)';
            }
        }
        const btnsToElem = {
        //10:{ name: "Left Stick Press", pressed: false, last: false },
        //11:{ name: "Right Stick Press", pressed: false, last: false },
            0: this.elA,
            1: this.elB,
            2: this.elY,
            3: this.elX,
            4: this.elLB,
            5: this.elRB,
            8: this.elView,
            9: this.elMenu,

            10:this.elLSI,
            11:this.elRSI,

            12:this.elDpadUp,
            13:this.elDpadDown,
            14:this.elDpadLeft,
            15:this.elDpadRight,
            16: this.elGuide,
        };
        gp.buttons.forEach((btn, i) => {
            const el = btnsToElem[i];
            if (el) {
                el.style.background = btn.pressed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.05)';
            }
        });


        // triggers (0 = released, 1 = full pull)
        g.input.gamepad.debugUI.elLTI.style.transform = `translate(-50%, ${(1 - g.input.gamepad.leftTrigger) * -100}%)`;
        g.input.gamepad.debugUI.elRTI.style.transform = `translate(-50%, ${(1 - g.input.gamepad.rightTrigger) * -100}%)`;
        //console.log("Axis", i, axis, "Processed:", xLeftStick, yLeftStick);

    }
};


function vibrate(gamepad, duration = 200, weak = 0.5, strong = 1.0) {
    if (!gamepad) return;
    const actuator = gamepad.vibrationActuator;
    if (actuator && actuator.type === "dual-rumble") {
        actuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: duration,
            weakMagnitude: weak,   // left motor (low freq)
            strongMagnitude: strong // right motor (high freq)
        });
    }
}




















g.input.gamepad.debug.css = `

        .gamepad{
                position: absolute;
                bottom:150px;
                left: 50%;
                width: 0px;
                height: 0px;
                overflow: visible;
                transform: translate(-50%, -50%) scale(1);
        }
        .gamepad>div{position:absolute;}
        .gamepad>div>div{position:absolute;}
    
        .virtual-stick {
            position: absolute;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
        }
        .virtual-stick>div {
            position: absolute;
            width: 20px;
            height: 20px;
            /*background: rgba(255, 255, 255, 0.5);*/
            border-radius: 50%;
            top: 50%;
            left: 50%;
            border:2px solid rgba(255, 255, 255, 0.25);
        }
        .move-stick {
            transform: translate(-70px, -20px) translate(-50%, -50%);
        }
        .look-stick {
            transform: translate(30px, 20px) translate(-50%, -50%);
        }

        .dpad{
            position: absolute;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            transform: translate(-30px, 20px) translate(-50%, -50%);
        
        }

        .buttons-tr{
            position: absolute;
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            transform: translate(70px, -20px) translate(-50%, -50%);

        }
        .buttons-tr>div{
            position: absolute;top: 50%; left: 50%; 
            width: 15px; height: 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
            text-align: center;vertical-align: middle;line-height: 15px;
        }
        .buttons-tr>div:nth-child(1){ /* A */
            transform: translate(0px, 15px) translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.05);
        }
        .buttons-tr>div:nth-child(2){ /* B */
            transform: translate(15px, 0px) translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.05);
        }
        .buttons-tr>div:nth-child(3){ /* Y */
            transform: translate(0px, -15px) translate(-50%, -50%);
            background: rgba(255, 255, 255, 0.05);
        }
        .buttons-tr>div:nth-child(4){ /* X */
            transform: translate(-15px, 0px) translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.05);
        }

        .dpad>div{
            position:absolute;top: 50%; left: 50%;
            width: 15px; height: 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            /*box-sizing: border-box;*/ /* makes border not affect size */
        }
        .dpad>div:nth-child(1){ /* up */
            transform: translate(0px, -17px) translate(-50%, -50%);
            border-bottom:0px;
        }
        .dpad>div:nth-child(2){ /* down */
            transform: translate(0px, 17px) translate(-50%, -50%);
            border-top:0px;
        }
        .dpad>div:nth-child(3){ /* left */
            transform: translate(-17px, 0px) translate(-50%, -50%);
            border-right:0px;
        }
        .dpad>div:nth-child(4){ /* right */
            transform: translate(17px, 0px) translate(-50%, -50%);
            border-left:0px;
        }
        .dpad>div:nth-child(5){ /* center */
            transform: translate(0px, 0px) translate(-50%, -50%);
            border:0px;
        }

        .view-button{
            position: absolute;top: 50%; left: 50%; 
            transform: translate(-15px, -15px) translate(-50%, -50%);
            width: 15px; height: 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
        }
        .menu-button{
            position: absolute;top: 50%; left: 50%; 
            transform: translate(15px, -15px) translate(-50%, -50%);
            width: 15px; height: 15px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
        }

        .left-bumper{
            position: absolute;top: 50%; left: 50%; 
            transform: translate(-30px, -40px) translate(-50%, -50%);
            width: 30px; height: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 5px;
        }
        .right-bumper{
            position: absolute;top: 50%; left: 50%; 
            transform: translate(30px, -40px) translate(-50%, -50%);
            width: 30px; height: 10px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 5px;
        }

        .trigger{
            position: absolute;top: 50%; left: 50%; 
            width: 12px; height: 22px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 5px;overflow:hidden;
        }
            .trigger-left{
                transform: translate(-34px, -20px) translate(-50%, -50%);
            }
            .trigger-right{
                transform: translate(34px, -20px) translate(-50%, -50%);
            }


        .trigger>div{
            position:absolute;top:0%; left: 50%;
            width: 100%; height: 100%;
            background: rgba(255, 255, 255, 0.25);
            transform: translate(-50%, -100%);
        }

        .guide-button{
            position: absolute;top: 50%; left: 50%; 
            transform: translate(0px, -34px) translate(-50%, -50%);
            width: 20px; height: 20px;
            background: rgba(255, 255, 255, 0.05);
            border: 2px solid rgba(255, 255, 255, 0.15);
            border-radius: 50%;
        }

`;