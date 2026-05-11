g.renderer = {
    load(){
        const gl = g.canvas.gl;
        if(!gl){
            return;
        }
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.CULL_FACE);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.07, 0.07, 0.07, 1.0);
    },
    submit(item){
        if(!item){
            return;
        }
        g.canvas.renderList.push(item);
        return item;
    },
    beginFrame(){
        const gl = g.canvas.gl;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    },
    renderItems(items){
        for(const item of items){
            g.renderer.draw(item);
        }
    },
    draw(item){
        const gl = g.canvas.gl;
        if(!gl || !item || !item.program){
            return;
        }
        const state = item.state || {};
        const mode = g.renderer.getMode(item.mode);
        const attributes = item.attributes || {};
        const uniforms = item.uniforms || {};

        gl.useProgram(item.program);
        g.renderer.applyState(state);
        let vertexCount = item.count || 0;

        for(const attributeName in attributes){
            const attribute = attributes[attributeName];
            if(!attribute){
                continue;
            }
            const location = gl.getAttribLocation(item.program, attributeName);
            if(location < 0){
                continue;
            }
            const buffer = g.renderer.getBuffer(attribute);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.enableVertexAttribArray(location);
            gl.vertexAttribPointer(
                location,
                attribute.size,
                attribute.type || gl.FLOAT,
                attribute.normalized || false,
                attribute.stride || 0,
                attribute.offset || 0,
            );
            if(vertexCount === 0 && attribute.data && attribute.size){
                vertexCount = attribute.data.length / attribute.size;
            }
        }

        for(const uniformName in uniforms){
            const uniform = uniforms[uniformName];
            const location = gl.getUniformLocation(item.program, uniformName);
            if(location !== null && location !== -1){
                g.renderer.applyUniform(location, uniform);
            }
        }

        gl.drawArrays(mode, 0, vertexCount);
        g.renderer.cleanupState(state);
    },
    getBuffer(attribute){
        const gl = g.canvas.gl;
        if(!attribute.buffer){
            attribute.buffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, attribute.buffer);
            gl.bufferData(gl.ARRAY_BUFFER, attribute.data, attribute.usage || gl.STATIC_DRAW);
        }
        return attribute.buffer;
    },
    getMode(mode){
        const gl = g.canvas.gl;
        if(typeof mode === "number"){
            return mode;
        }
        return gl[mode || "TRIANGLES"];
    },
    applyState(state){
        const gl = g.canvas.gl;
        if(state.polygonOffset){
            gl.enable(gl.POLYGON_OFFSET_FILL);
            gl.polygonOffset(state.polygonOffset[0], state.polygonOffset[1]);
        }
        if(state.depthMask === false){
            gl.depthMask(false);
        }
        if(state.blend === 'additive'){
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        }
    },
    cleanupState(state){
        const gl = g.canvas.gl;
        if(state.polygonOffset){
            gl.disable(gl.POLYGON_OFFSET_FILL);
        }
        if(state.depthMask === false){
            gl.depthMask(true);
        }
        if(state.blend === 'additive'){
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        }
    },
    applyUniform(location, uniform){
        const gl = g.canvas.gl;
        if(!uniform){
            return;
        }
        if(uniform.type === "mat4"){
            gl.uniformMatrix4fv(location, false, uniform.value);
            return;
        }
        if(uniform.type === "vec4"){
            gl.uniform4f(location, uniform.value[0], uniform.value[1], uniform.value[2], uniform.value[3]);
            return;
        }
        if(uniform.type === "vec3"){
            gl.uniform3f(location, uniform.value[0], uniform.value[1], uniform.value[2]);
            return;
        }
        if(uniform.type === "vec3Array"){
            gl.uniform3fv(location, uniform.value);
            return;
        }
        if(uniform.type === "floatArray"){
            gl.uniform1fv(location, uniform.value);
            return;
        }
        if(uniform.type === "int"){
            gl.uniform1i(location, uniform.value);
            return;
        }
        if(uniform.type === "float"){
            gl.uniform1f(location, uniform.value);
        }
    },
    createModelViewProjection(position = [0, 0, 0], rotation = [0, 0, 0]){
        const aspect = g.canvas.el.width / g.canvas.el.height;
        const viewProjection = g.camera.getViewProjection(aspect);
        const model = g.math.mat4Compose(position, rotation);
        return g.math.mat4Multiply(viewProjection, model);
    },
};
g.loadHandlers.push(g.renderer.load);