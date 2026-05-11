
g.camera={
    position: [12, -12, 14],
    target: [0, 0, 0],
    up: [0, 0, 1],
    fov: Math.PI / 3,
    near: 0.1,
    far: 500,
    load(){
    },
    configure(options = {}){
        if(options.position){
            g.camera.position = options.position.slice();
        }
        if(options.target){
            g.camera.target = options.target.slice();
        }
        if(options.up){
            g.camera.up = options.up.slice();
        }
        if(typeof options.fov === "number"){
            g.camera.fov = options.fov;
        }
        if(typeof options.near === "number"){
            g.camera.near = options.near;
        }
        if(typeof options.far === "number"){
            g.camera.far = options.far;
        }
    },
    getViewProjection(aspect){
        const view = g.math.mat4LookAt(g.camera.position, g.camera.target, g.camera.up);
        const projection = g.math.mat4Perspective(g.camera.fov, aspect, g.camera.near, g.camera.far);
        return g.math.mat4Multiply(projection, view);
    },
};
g.loadHandlers.push(g.camera.load);
