
//  g.renderer.map.targetLine
g.renderer.map.targetLine = {
    order: 30,
    program: null,
    vbo: null,

    load() {
        const gl = g.gl;
        const self = g.renderer.map.targetLine;

        self.program = g.shader.create(
            `attribute vec3 aPos;
             uniform mat4 uVP;
             varying float vDist;
             void main(){
                 gl_Position = uVP * vec4(aPos, 1.0);
                 vDist = aPos.x + aPos.y + aPos.z;
             }`,
            `precision mediump float;
             uniform float uAlpha;
             void main(){
                 gl_FragColor = vec4(0.3, 0.5, 1.0, uAlpha);
             }`
        );
        self.vbo = gl.createBuffer();
    },

    draw(gl) {
        if (!g.pick.selectedStar) return;

        const self = g.renderer.map.targetLine;
        const tp = self.program;
        gl.useProgram(tp);
        gl.uniformMatrix4fv(gl.getUniformLocation(tp, 'uVP'), false, g.camera.vpMatrix);
        gl.uniform1f(gl.getUniformLocation(tp, 'uAlpha'), 0.35);

        const sw = g.pick.selectedStar.worldPos;
        const L = 1000.0; // effectively infinite
        const lineVerts = new Float32Array([
            sw[0]-L, sw[1], sw[2],   sw[0]+L, sw[1], sw[2],  // X axis
            sw[0], sw[1]-L, sw[2],   sw[0], sw[1]+L, sw[2],  // Y axis
            sw[0], sw[1], sw[2]-L,   sw[0], sw[1], sw[2]+L,  // Z axis
        ]);
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, lineVerts, gl.DYNAMIC_DRAW);
        const tlPos = gl.getAttribLocation(tp, 'aPos');
        gl.enableVertexAttribArray(tlPos);
        gl.vertexAttribPointer(tlPos, 3, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.LINES, 0, 6);
    },
};
g.loadHandlers.push(g.renderer.map.targetLine.load);
