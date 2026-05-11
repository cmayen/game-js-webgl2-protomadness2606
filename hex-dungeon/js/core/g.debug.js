
g.debug={
    pre: [],
    elPre: null,
    _showPre: false,
    load(){
        g.css.push(`
            .debug-output{
                position:absolute;top:10px;right:10px;
                background-color:#222222;
                color:#aaaaaa;
                padding:5px;margin:0px;
                font-family:monospace;font-size:14px;
            }
        `);
        g.debug.elPre = document.createElement("pre");
        g.debug.elPre.classList.add("debug-output");
        document.body.appendChild(g.debug.elPre);
        // instead of pushing g.debug.update to 
        // g.rAF.updateHandlers, we can call it directly 
        // in g.rAF.update after the loop that calls the 
        // update handlers, this way it will always run 
        // after all the update handlers have run, and we 
        // don't have to worry about the order of the 
        // handlers in the array
        //g.rAF.updateHandlers.push(g.debug.update);
    },
    update(delta){
        g.debug.elPre.textContent = g.debug.pre.join("\n");
        g.debug.pre = [];
    },
    showPre(){
        if(g.debug.elPre){
            g.debug.elPre.style.display = "block";
        }
    },
    hidePre(){
        if(g.debug.elPre){
            g.debug.elPre.style.display = "none";
        }
    },
};
g.loadHandlers.push(g.debug.load);








g.debug.control = {
    el: null,
    details: { },
    syncInputState(input, value){
        if(!input){
            return;
        }
        if(input.type === "checkbox"){
            input.checked = !!value;
            input.title = input.checked ? "true" : "false";
            return;
        }
        const nextValue = `${value ?? ""}`;
        input.value = nextValue;
        input.title = nextValue;
    },
    load(){
        g.css.push(`
            .debug-control{
                position:absolute;top:10px;left:10px;/*bottom:10px;*/
                overflow:auto;min-width:300px;
                box-sizing:border-box; /* Width not affected by border/padding */
                pointer-events:none;
            }
            .debug-control details{ border:1px solid #333333; }
            .debug-control details>summary{
                font-weight:bold;padding:5px;cursor:pointer;
                background-color:#333333;
                pointer-events:auto;
            }
            .debug-control details>div{
                padding:5px;
                background-color:rgba(34,34,34,0.8);
            }
            .debug-control details > div > div {
                display:flex;align-items:center;gap:2px;
            }
            .debug-control details>div>div>label{
                flex: 0 0 100px;
            }
            .debug-control details>div input{
                background-color:#222222;
                border:1px solid #333333;
                color:#aaaaaa;
                padding:5px;margin:2px;
                font-family:monospace;font-size:14px;
                pointer-events:auto;
            }
            .debug-control details>div input[type="range"]{
                flex: 1;
            }
            .debug-control details>div input[type="number"]{
                flex: 1;
            }
            /* custom css for the default debug pre element used for output of the g.debug.pre.push()'d array */
            .debug-control details>div>pre{
                margin:0px;padding:0px;
                font-family:monospace;font-size:14px;
            }
        `);
        const self = g.debug.control;
        self.el = document.createElement("div");
        self.el.classList.add("debug-control");
        for(const sectionName in self.details){
            const section = self.details[sectionName];
            const details = document.createElement("details");
            //if(sectionName === "config"){
                details.open = true;
            //}
            const summary = document.createElement("summary");
            summary.textContent = sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
            details.appendChild(summary);
            const content = document.createElement("div");
            details.appendChild(content);
            self.el.appendChild(details);
            //
            const items = self.details[sectionName];
            for(const itemName in items){
                const item = items[itemName];


                if(item.type === "debug-pre"){
                    // check if g.debug.elPre exists and it's parent is still the body
                    if(g.debug.elPre && g.debug.elPre.parentElement === document.body){
                        // remove the id and class attrs, and move it to content
                        g.debug.elPre.id = "";
                        g.debug.elPre.className = "";
                        content.appendChild(g.debug.elPre);
                    } else {
                        // if not, create the pre element and add it to content
                        const pre = document.createElement("pre");
                        content.appendChild(pre);
                        // set g.debug.elPre to the new pre element
                        g.debug.elPre = pre;
                    }
                    // end of this custom type, skip the rest of the loop
                    continue;
                }


                if(item.type === "button"){
                    const btn = document.createElement("button");
                    btn.textContent = item.label || itemName;
                    btn.id = `debug-control-${sectionName}-${itemName}`;
                    btn.style.cssText = 'background:#333;border:1px solid #555;color:#aaa;padding:5px 10px;margin:2px;cursor:pointer;font-family:monospace;font-size:14px;pointer-events:auto;';
                    if(item.change) btn.addEventListener('click', () => item.change(btn));
                    const btnDiv = document.createElement("div");
                    btnDiv.appendChild(btn);
                    content.appendChild(btnDiv);
                    continue;
                }


                const itemDiv = document.createElement("div");
                const label = document.createElement("label");
                label.textContent = itemName.charAt(0).toUpperCase() + itemName.slice(1) + ":";
                itemDiv.appendChild(label);
                const input = document.createElement("input");
                input.type = item.type;
                input.value = item.value;
                input.id = `debug-control-${sectionName}-${itemName}`;
                if(item.type === "range"){
                    input.min = item.min;
                    input.max = item.max;
                    if(item.step) input.step = item.step;
                }
                if(item.type === "checkbox"){
                    input.checked = item.value;
                }
                self.syncInputState(input, item.type === "checkbox" ? input.checked : item.value);
                itemDiv.appendChild(input);
                content.appendChild(itemDiv);
                if(item.change){
                    input.addEventListener("change", (event) => {
                        item.change(input);
                        self.syncInputState(input, input.type === "checkbox" ? input.checked : input.value);
                    });
                    if(item.type === "range"){
                        input.addEventListener("input", (event) => {
                            item.change(input);
                            self.syncInputState(input, input.value);
                        });
                    }
                }
            }
            details.addEventListener("toggle", (event) => {
                if (details.open) {
                    /* the element was toggled open, this also fires onload */
                    //console.log(`Section "${sectionName}" opened`);
                    const items = self.details[sectionName];
                    for(const itemName in items){
                        if(items[itemName].load){
                            const input = document.getElementById(`debug-control-${sectionName}-${itemName}`);
                            self.syncInputState(input, items[itemName].load());
                        }
                    }
                } else { /*console.log(`Section "${sectionName}" closed`);*/ }
            });
        }
        document.body.appendChild(self.el);
    },
};
g.loadHandlers.push(g.debug.control.load);



/*
g.debug.control.details.debug = {
            showDebug: {
                type:"checkbox", value: true,
                load: function(){ 
                    let checked = document.getElementById(`debug-control-debug-showDebug`)?.checked;
                    if(checked){
                        g.debug.showPre();
                    } else {
                        g.debug.hidePre();
                    }
                    return checked;//g.rAF.fpsAverage.toFixed(1);
                },
                change: function(element){ 
                    // console.log("fpsAverage changed to", element.value);
                    if(element.checked){
                        g.debug.showPre();
                    } else {
                        g.debug.hidePre();
                    }
                },
            }
        };
*/




























g.debug.control.details.debug = {
            showDebug: {
                type:"debug-pre"
            }
        };


// ---- Camera ----
g.debug.control.details.camera = {
    fov: {
        type: 'range', value: 60, min: 20, max: 120, step: 1,
        load(){ return (g.camera.fov * 180 / Math.PI).toFixed(0); },
        change(el){ g.camera.fov = parseFloat(el.value) * Math.PI / 180; },
    },
    near: {
        type: 'range', value: 0.1, min: 0.01, max: 5, step: 0.01,
        load(){ return g.camera.near; },
        change(el){ g.camera.near = parseFloat(el.value); },
    },
    far: {
        type: 'range', value: 100, min: 10, max: 500, step: 1,
        load(){ return g.camera.far; },
        change(el){ g.camera.far = parseFloat(el.value); },
    },
};

// ---- Controller ----
g.debug.control.details.controller = {
    lookSensitivity: {
        type: 'range', value: 0.0022, min: 0.0005, max: 0.01, step: 0.0001,
        load(){ return g.controller.lookSensitivity; },
        change(el){ g.controller.lookSensitivity = parseFloat(el.value); },
    },
    walkSpeed: {
        type: 'range', value: 8.0, min: 1.0, max: 30.0, step: 0.5,
        load(){ return g.controller.walkSpeed; },
        change(el){ g.controller.walkSpeed = parseFloat(el.value); },
    },
    sprintMultiplier: {
        type: 'range', value: 1.75, min: 1.0, max: 4.0, step: 0.05,
        load(){ return g.controller.sprintMultiplier; },
        change(el){ g.controller.sprintMultiplier = parseFloat(el.value); },
    },
    flySpeedMultiplier: {
        type: 'range', value: 1.35, min: 1.0, max: 4.0, step: 0.05,
        load(){ return g.controller.flySpeedMultiplier; },
        change(el){ g.controller.flySpeedMultiplier = parseFloat(el.value); },
    },
    eyeHeight: {
        type: 'range', value: 0.55, min: 0.20, max: 2.0, step: 0.05,
        load(){ return g.controller.eyeHeight; },
        change(el){ g.controller.eyeHeight = Math.max(0.2, parseFloat(el.value) || 0.2); },
    },
    crouchEyeHeight: {
        type: 'range', value: 0.34, min: 0.15, max: 1.50, step: 0.01,
        load(){ return g.controller.crouchEyeHeight; },
        change(el){ g.controller.crouchEyeHeight = Math.max(0.15, parseFloat(el.value) || 0.15); },
    },
    crouchTransitionSpeed: {
        type: 'range', value: 14.0, min: 1.0, max: 40.0, step: 0.5,
        load(){ return g.controller.crouchTransitionSpeed; },
        change(el){ g.controller.crouchTransitionSpeed = Math.max(1.0, parseFloat(el.value) || 1.0); },
    },
    crouchSpeedMultiplier: {
        type: 'range', value: 0.6, min: 0.2, max: 1.0, step: 0.05,
        load(){ return g.controller.crouchSpeedMultiplier; },
        change(el){ g.controller.crouchSpeedMultiplier = Math.max(0.2, Math.min(1.0, parseFloat(el.value) || 0.2)); },
    },
    jumpSpeed: {
        type: 'range', value: 4.8, min: 1.0, max: 12.0, step: 0.1,
        load(){ return g.controller.jumpSpeed; },
        change(el){ g.controller.jumpSpeed = Math.max(1.0, parseFloat(el.value) || 1.0); },
    },
    gravity: {
        type: 'range', value: 18.0, min: 2.0, max: 40.0, step: 0.5,
        load(){ return g.controller.gravity; },
        change(el){ g.controller.gravity = Math.max(2.0, parseFloat(el.value) || 2.0); },
    },
    godMode: {
        type: 'checkbox', value: false,
        load(){ return !!g.controller.godMode; },
        change(el){ g.controller.godMode = !!el.checked; },
    },
    unlockPointer: {
        type: 'button', label: 'Unlock Pointer',
        change(){
            if(document.exitPointerLock){
                document.exitPointerLock();
            }
        },
    },
};

// ---- Map ----
g.debug.control.details.map = {
    radius: {
        type: 'range', value: 16, min: 8, max: 80, step: 1,
        load(){ return g.hexmap.radius; },
        change(el){ g.hexmap.radius = parseInt(el.value); },
    },
    hexSize: {
        type: 'range', value: 2.0, min: 0.2, max: 6.0, step: 0.1,
        load(){ return g.hexmap.hexSize; },
        change(el){ g.hexmap.hexSize = parseFloat(el.value); },
    },
    baseHeight: {
        type: 'range', value: 0.12, min: 0.0, max: 1.0, step: 0.01,
        load(){ return g.hexmap.baseHeight; },
        change(el){ g.hexmap.baseHeight = parseFloat(el.value); },
    },
    seed: {
        type: 'number', value: 42,
        load(){ return g.hexmap.seed; },
        change(el){ g.hexmap.seed = parseInt(el.value) || 1; },
    },
    roomCountMin: {
        type: 'number', value: 12,
        load(){ return g.hexmap.HexMapManager.config.roomCountMin; },
        change(el){ g.hexmap.HexMapManager.config.roomCountMin = Math.max(1, parseInt(el.value) || 1); },
    },
    roomCountMax: {
        type: 'number', value: 22,
        load(){ return g.hexmap.HexMapManager.config.roomCountMax; },
        change(el){ g.hexmap.HexMapManager.config.roomCountMax = Math.max(g.hexmap.HexMapManager.config.roomCountMin, parseInt(el.value) || g.hexmap.HexMapManager.config.roomCountMin); },
    },
    roomMinW: {
        type: 'number', value: 3,
        load(){ return g.hexmap.HexMapManager.config.roomMinW; },
        change(el){ g.hexmap.HexMapManager.config.roomMinW = Math.max(2, parseInt(el.value) || 2); },
    },
    roomMaxW: {
        type: 'number', value: 8,
        load(){ return g.hexmap.HexMapManager.config.roomMaxW; },
        change(el){ g.hexmap.HexMapManager.config.roomMaxW = Math.max(g.hexmap.HexMapManager.config.roomMinW, parseInt(el.value) || g.hexmap.HexMapManager.config.roomMinW); },
    },
    roomMinH: {
        type: 'number', value: 3,
        load(){ return g.hexmap.HexMapManager.config.roomMinH; },
        change(el){ g.hexmap.HexMapManager.config.roomMinH = Math.max(2, parseInt(el.value) || 2); },
    },
    roomMaxH: {
        type: 'number', value: 8,
        load(){ return g.hexmap.HexMapManager.config.roomMaxH; },
        change(el){ g.hexmap.HexMapManager.config.roomMaxH = Math.max(g.hexmap.HexMapManager.config.roomMinH, parseInt(el.value) || g.hexmap.HexMapManager.config.roomMinH); },
    },
    roomPadding: {
        type: 'number', value: 1,
        load(){ return g.hexmap.HexMapManager.config.roomPadding; },
        change(el){ g.hexmap.HexMapManager.config.roomPadding = Math.max(0, parseInt(el.value) || 0); },
    },
    windingChance: {
        type: 'range', value: 0.15, min: 0.0, max: 1.0, step: 0.01,
        load(){ return g.hexmap.HexMapManager.config.windingChance; },
        change(el){ g.hexmap.HexMapManager.config.windingChance = Math.max(0, Math.min(1, parseFloat(el.value) || 0)); },
    },
    floorHeight: {
        type: 'range', value: 0.08, min: 0.01, max: 0.25, step: 0.01,
        load(){ return g.hexmap.HexMapManager.config.floorHeight; },
        change(el){ g.hexmap.HexMapManager.config.floorHeight = Math.max(0.01, parseFloat(el.value) || 0.01); },
    },
    wallHeight: {
        type: 'range', value: 0.50, min: 0.10, max: 2.00, step: 0.01,
        load(){ return g.hexmap.HexMapManager.config.wallHeight; },
        change(el){ g.hexmap.HexMapManager.config.wallHeight = Math.max(0.1, parseFloat(el.value) || 0.1); },
    },
    straightWallsInRooms: {
        type: 'checkbox', value: false,
        load(){ return !!g.hexmap.HexMapManager.config.straightWallsInRooms; },
        change(el){ g.hexmap.HexMapManager.config.straightWallsInRooms = !!el.checked; },
    },
    hallTorchDensityMultiplier: {
        type: 'range', value: 1.0, min: 0.0, max: 3.0, step: 0.05,
        load(){ return g.hexmap.HexMapManager.config.hallTorchDensityMultiplier; },
        change(el){ g.hexmap.HexMapManager.config.hallTorchDensityMultiplier = Math.max(0, parseFloat(el.value) || 0); },
    },
    roomTorchDensityMultiplier: {
        type: 'range', value: 1.0, min: 0.0, max: 3.0, step: 0.05,
        load(){ return g.hexmap.HexMapManager.config.roomTorchDensityMultiplier; },
        change(el){ g.hexmap.HexMapManager.config.roomTorchDensityMultiplier = Math.max(0, parseFloat(el.value) || 0); },
    },

    generateMesh: {
        type: 'button', label: 'Generate Mesh',
        change(){
            if(g.hexmap.meshGen){
                g.hexmap.meshGen.generate();
            }
        },
    },
    smoothMesh: {
        type: 'button', label: 'Smooth Mesh',
        change(){
            if(g.hexmap.meshGen){
                g.hexmap.meshGen.smooth();
            }
        },
    },
    meshMinWalkableUpDot: {
        type: 'range', value: 0.4, min: 0.0, max: 1.0, step: 0.01,
        load(){ return g.hexmap.meshGen ? g.hexmap.meshGen.minWalkableUpDot : 0.4; },
        change(el){
            if(!g.hexmap.meshGen) return;
            g.hexmap.meshGen.minWalkableUpDot = Math.max(0, Math.min(1, parseFloat(el.value) || 0));
            if(g.hexmap.meshGen.mesh){
                g.hexmap.meshGen._rebuildCollisionIndex();
            }
        },
    },
    rebuild: {
        type: 'button', label: 'Rebuild Map',
        change(){
            const gl = g.canvas.gl;
            const geo = g.hexmap.geometry;
            if(geo){
                if(geo.positions.buffer){ gl.deleteBuffer(geo.positions.buffer); geo.positions.buffer = null; }
                if(geo.colors.buffer){ gl.deleteBuffer(geo.colors.buffer); geo.colors.buffer = null; }
                if(geo.edges.buffer){ gl.deleteBuffer(geo.edges.buffer); geo.edges.buffer = null; }
            }
            g.hexmap.targetedTile = null;
            g.hexmap._glowTileKey = null;
            g.hexmap._glowGeometry = null;
            g.hexmap.geometry = g.hexmap.createGeometry();
        },
    },
};

// ---- Renderer ----
g.debug.control.details.renderer = {
    wireframe: {
        type: 'checkbox', value: true,
        load(){ return !!g.hexmap._showWireframe; },
        change(el){ g.hexmap._showWireframe = el.checked; },
    },
    backfaceCull: {
        type: 'checkbox', value: false,
        load(){
            const gl = g.canvas.gl;
            return !!(gl && gl.isEnabled(gl.CULL_FACE));
        },
        change(el){
            const gl = g.canvas.gl;
            if(el.checked) gl.enable(gl.CULL_FACE);
            else gl.disable(gl.CULL_FACE);
        },
    },
    ambientLight: {
        type: 'range', value: 0.26, min: 0.02, max: 1.0, step: 0.01,
        load(){ return g.hexmap.ambientLight; },
        change(el){ g.hexmap.ambientLight = Math.max(0.02, Math.min(1.0, parseFloat(el.value) || 0.02)); },
    },
    maxActiveLights: {
        type: 'range', value: 16, min: 0, max: 16, step: 1,
        load(){ return g.hexmap.maxTorchLights; },
        change(el){ g.hexmap.maxTorchLights = Math.max(0, Math.min(16, parseInt(el.value) || 0)); },
    },
    torchRadiusMultiplier: {
        type: 'range', value: 1.0, min: 0.1, max: 3.0, step: 0.05,
        load(){ return g.hexmap.torchRadiusMultiplier; },
        change(el){ g.hexmap.torchRadiusMultiplier = Math.max(0.1, parseFloat(el.value) || 0.1); },
    },
};
/*
g.debug.control.details.debug = {
            showDebug: {
                type:"checkbox", value: true,
                load: function(){ 
                    let checked = document.getElementById(`debug-control-debug-showDebug`)?.checked;
                    if(checked){
                        g.debug.showPre();
                    } else {
                        g.debug.hidePre();
                    }
                    return checked;//g.rAF.fpsAverage.toFixed(1);
                },
                change: function(element){ 
                    // console.log("fpsAverage changed to", element.value);
                    if(element.checked){
                        g.debug.showPre();
                    } else {
                        g.debug.hidePre();
                    }
                },
            }
        };
*/




