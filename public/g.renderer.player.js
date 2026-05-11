
//  g.renderer.player 
// ship and stuff
g.renderer.player = {
    order: 100,
    shipProgram:     null,
    shipVBO:         null,
    shipIBO:         null,
    thrusterProgram: null,
    thrusterVBO:     null,

    load() {
        const gl = g.gl;
        const self = g.renderer.player;

        // ship shader (per-vertex color, flat shaded)
        self.shipProgram = g.shader.create(
            `attribute vec3 aPos;
             attribute vec3 aNormal;
             attribute vec3 aColor;
             uniform mat4 uMVP;
             uniform mat4 uModel;
             varying vec3 vNormal;
             varying vec3 vWorldPos;
             varying vec3 vColor;
             void main(){
                 gl_Position = uMVP * vec4(aPos, 1.0);
                 vNormal = mat3(uModel) * aNormal;
                 vWorldPos = (uModel * vec4(aPos, 1.0)).xyz;
                 vColor = aColor;
             }`,
            `precision mediump float;
             varying vec3 vNormal;
             varying vec3 vWorldPos;
             varying vec3 vColor;
             uniform vec3 uEye;
             void main(){
                 vec3 n = normalize(vNormal);
                 vec3 lightDir = normalize(vec3(0.4, 0.7, 0.5));
                 float diff = max(dot(n, lightDir), 0.0);
                 float amb = 0.3;
                 vec3 viewDir = normalize(uEye - vWorldPos);
                 vec3 refl = reflect(-lightDir, n);
                 float spec = pow(max(dot(viewDir, refl), 0.0), 16.0) * 0.3;
                 vec3 col = vColor * (amb + diff * 0.7) + vec3(spec);
                 gl_FragColor = vec4(col, 1.0);
             }`
        );

        // upload ship geometry
        self.shipVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.shipVBO);
        gl.bufferData(gl.ARRAY_BUFFER, g.ship.vertData, gl.STATIC_DRAW);
        self.shipIBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.shipIBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.ship.idxData, gl.STATIC_DRAW);

        // thruster glow shader (additive billboard points)
        self.thrusterProgram = g.shader.create(
            `attribute vec3 aPos;
             attribute float aSize;
             attribute vec3 aColor;
             uniform mat4 uVP;
             varying vec3 vColor;
             void main(){
                 gl_Position = uVP * vec4(aPos, 1.0);
                 gl_PointSize = aSize;
                 vColor = aColor;
             }`,
            `precision mediump float;
             varying vec3 vColor;
             void main(){
                 float d = length(gl_PointCoord - vec2(0.5));
                 if(d > 0.5) discard;
                 float glow = 1.0 - d * 2.0;
                 glow = glow * glow;
                 gl_FragColor = vec4(vColor * glow, glow * 0.8);
             }`
        );
        self.thrusterVBO = gl.createBuffer();
    },

    draw(gl) {
        const self = g.renderer.player;

        // draw spaceship (skip in first-person mode)
        if (g.camera.zoom > 8) {
            const sp2 = self.shipProgram;
            gl.useProgram(sp2);
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);

            const shipModel = g.player.modelMatrix();
            const shipMVP   = g.math.m4mul(g.camera.vpMatrix, shipModel);

            gl.uniformMatrix4fv(gl.getUniformLocation(sp2, 'uMVP'), false, shipMVP);
            gl.uniformMatrix4fv(gl.getUniformLocation(sp2, 'uModel'), false, shipModel);
            gl.uniform3fv(gl.getUniformLocation(sp2, 'uEye'), g.camera.pos);

            gl.bindBuffer(gl.ARRAY_BUFFER, self.shipVBO);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.shipIBO);

            const sPos2  = gl.getAttribLocation(sp2, 'aPos');
            const sNorm  = gl.getAttribLocation(sp2, 'aNormal');
            const sCol   = gl.getAttribLocation(sp2, 'aColor');
            const stride = 36; // 9 floats * 4 bytes
            gl.enableVertexAttribArray(sPos2);
            gl.vertexAttribPointer(sPos2, 3, gl.FLOAT, false, stride, 0);
            gl.enableVertexAttribArray(sNorm);
            gl.vertexAttribPointer(sNorm, 3, gl.FLOAT, false, stride, 12);
            gl.enableVertexAttribArray(sCol);
            gl.vertexAttribPointer(sCol, 3, gl.FLOAT, false, stride, 24);

            gl.drawElements(gl.TRIANGLES, g.ship.indexCount, gl.UNSIGNED_SHORT, 0);

            gl.disableVertexAttribArray(sNorm);
            gl.disableVertexAttribArray(sCol);
            gl.disable(gl.CULL_FACE);
        }

        // draw thruster effects
        if (g.player.thrustLevel > 0.01 && g.camera.zoom > 5) {
            const tp2 = self.thrusterProgram;
            gl.useProgram(tp2);
            gl.uniformMatrix4fv(gl.getUniformLocation(tp2, 'uVP'), false, g.camera.vpMatrix);

            // Engine exhaust position in world space
            const mm = g.player.modelMatrix();
            // Multiple thruster particles at engine rear
            const thrustData = [];
            const intensity = g.player.thrustLevel;
            const time = performance.now() * 0.01;
            const ef = config.player.engineFactor;
            for (let i = 0; i < 6; i++) {
                const phase = i * 1.047; // 60 degrees apart
                const jitter = Math.sin(time + phase) * 0.15;
                const dist2 = 0.02 + i * 0.04 * ef * intensity;
                // Local position: engine is at +Z, slightly behind rear
                const lp = new Float32Array([
                    Math.sin(phase) * 0.03 * (1 + jitter),
                    Math.cos(phase) * 0.03 * (1 + jitter),
                    0.72 + dist2 + jitter * 0.05 * ef,
                    1.0
                ]);
                const wp = g.math.m4mulV4(mm, lp);
                const size = (12 - i * 1.0) * intensity * (1 + (ef - 1) * 0.3);
                // Color: hot core (white-yellow) outer (orange-red)
                const t2 = i / 5;
                thrustData.push(
                    wp[0], wp[1], wp[2],
                    size,
                    1.0, 0.7 - t2 * 0.4, 0.2 - t2 * 0.15
                );
            }
            const td = new Float32Array(thrustData);
            gl.bindBuffer(gl.ARRAY_BUFFER, self.thrusterVBO);
            gl.bufferData(gl.ARRAY_BUFFER, td, gl.DYNAMIC_DRAW);

            const tpPos  = gl.getAttribLocation(tp2, 'aPos');
            const tpSize = gl.getAttribLocation(tp2, 'aSize');
            const tpCol  = gl.getAttribLocation(tp2, 'aColor');
            gl.enableVertexAttribArray(tpPos);
            gl.vertexAttribPointer(tpPos, 3, gl.FLOAT, false, 28, 0);
            gl.enableVertexAttribArray(tpSize);
            gl.vertexAttribPointer(tpSize, 1, gl.FLOAT, false, 28, 12);
            gl.enableVertexAttribArray(tpCol);
            gl.vertexAttribPointer(tpCol, 3, gl.FLOAT, false, 28, 16);

            gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive blend for glow
            gl.depthMask(false);
            gl.drawArrays(gl.POINTS, 0, 6);
            gl.depthMask(true);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); // restore
            gl.disableVertexAttribArray(tpSize);
            gl.disableVertexAttribArray(tpCol);
        }
    },
};
g.loadHandlers.push(g.renderer.player.load);
