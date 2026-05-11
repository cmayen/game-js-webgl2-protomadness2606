
g.renderer.sphereTest = {
    order: 25,
    program: null,
    sphereVBO: null,
    vertexCount: 0,

    load() {
        const gl = g.gl;
        const self = g.renderer.sphereTest;

        self.program = g.shader.create(
            `attribute vec3 aPos;
             uniform mat4 uMVP;
             uniform mat4 uModel;
             varying vec3 vNormal;
             varying vec3 vWorldPos;
             void main(){
                 gl_Position = uMVP * vec4(aPos, 1.0);
                 vNormal = mat3(uModel) * aPos;
                 vWorldPos = (uModel * vec4(aPos, 1.0)).xyz;
             }`,
            `precision mediump float;
             varying vec3 vNormal;
             varying vec3 vWorldPos;
             uniform vec3 uEye;
             void main(){
                 vec3 n = normalize(vNormal);
                 vec3 lightDir = normalize(vec3(0.4, 0.7, 0.5));
                 float diff = max(dot(n, lightDir), 0.0);
                 float amb = 0.25;
                 vec3 viewDir = normalize(uEye - vWorldPos);
                 vec3 refl = reflect(-lightDir, n);
                 float spec = pow(max(dot(viewDir, refl), 0.0), 32.0) * 0.4;
                 vec3 col = vec3(0.8, 0.5, 0.2) * (amb + diff * 0.7) + vec3(spec);
                 gl_FragColor = vec4(col, 1.0);
             }`
        );
        const sphere = g.shapes.isoSphere(2);
        self.sphereVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.sphereVBO);
        gl.bufferData(gl.ARRAY_BUFFER, sphere.vertices, gl.STATIC_DRAW);
        self.sphereIBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.sphereIBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sphere.indices, gl.STATIC_DRAW);
        self.indexCount = sphere.indices.length;


g.renderer.drawHandlers.push(g.renderer.sphereTest.draw2Handler);
    },

    draw(gl) {
        const self = g.renderer.sphereTest;
        const tile = g.map.tiles.find(t => t.ax === 0 && t.ay === 0 && t.az === 0);
        if (!tile) return;

        const sp = self.program;
        gl.useProgram(sp);

        const model = g.math.m4mul(
            g.math.m4translate(tile.worldPos[0], tile.worldPos[1], tile.worldPos[2]),
            g.math.m4scale(1, 1, 1)
        );
        const mvp = g.math.m4mul(g.camera.vpMatrix, model);

        gl.uniformMatrix4fv(gl.getUniformLocation(sp, 'uMVP'), false, mvp);
        gl.uniformMatrix4fv(gl.getUniformLocation(sp, 'uModel'), false, model);
        gl.uniform3fv(gl.getUniformLocation(sp, 'uEye'), g.camera.pos);

        gl.bindBuffer(gl.ARRAY_BUFFER, self.sphereVBO);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.sphereIBO);
        const aPos = gl.getAttribLocation(sp, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        gl.drawElements(gl.TRIANGLES, self.indexCount, gl.UNSIGNED_SHORT, 0);
    },




    draw2Handler(gl) {
        const self = g.renderer.sphereTest;
        const tile = g.map.tiles.find(t => t.ax === 1 && t.ay === 0 && t.az === 0);
        if (!tile) return;

        const sp = self.program;
        gl.useProgram(sp);

        const model = g.math.m4mul(
            g.math.m4translate(tile.worldPos[0], tile.worldPos[1], tile.worldPos[2]),
            g.math.m4scale(1, 1, 1)
        );
        const mvp = g.math.m4mul(g.camera.vpMatrix, model);

        gl.uniformMatrix4fv(gl.getUniformLocation(sp, 'uMVP'), false, mvp);
        gl.uniformMatrix4fv(gl.getUniformLocation(sp, 'uModel'), false, model);
        gl.uniform3fv(gl.getUniformLocation(sp, 'uEye'), g.camera.pos);

        gl.bindBuffer(gl.ARRAY_BUFFER, self.sphereVBO);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.sphereIBO);
        const aPos = gl.getAttribLocation(sp, 'aPos');
        gl.enableVertexAttribArray(aPos);
        gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);

        gl.drawElements(gl.TRIANGLES, self.indexCount, gl.UNSIGNED_SHORT, 0);
    },

};
g.loadHandlers.push(g.renderer.sphereTest.load);




// g.renderer.drawHandlers

