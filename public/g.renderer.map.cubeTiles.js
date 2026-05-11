
g.renderer.map.cubeTiles = {
    program:       null,
    edgeProgram:   null,
    cubeVBO:       null,
    cubeIBO:       null,
    cubeIndexCount: 0,
    edgeIBO:       null,
    edgeIndexCount: 0,

    // transparent cube faces
    faces: {
        order: 10,
        draw(gl) {
            if (!config.world.showCubeWireOutline) return;
            const ct = g.renderer.map.cubeTiles;
            const prog = ct.program;
            gl.useProgram(prog);
            const uMVP   = gl.getUniformLocation(prog, 'uMVP');
            const uModel = gl.getUniformLocation(prog, 'uModel');
            const uColor = gl.getUniformLocation(prog, 'uColor');
            const uEye   = gl.getUniformLocation(prog, 'uEye');
            const uSel   = gl.getUniformLocation(prog, 'uSelected');

            gl.uniform3fv(uEye, g.camera.pos);

            gl.bindBuffer(gl.ARRAY_BUFFER, ct.cubeVBO);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ct.cubeIBO);
            const aPos    = gl.getAttribLocation(prog, 'aPos');
            const aNormal = gl.getAttribLocation(prog, 'aNormal');
            gl.enableVertexAttribArray(aPos);
            gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 24, 0);
            gl.enableVertexAttribArray(aNormal);
            gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 24, 12);

            gl.disable(gl.CULL_FACE);
            gl.depthMask(false);
            for (const tile of g.map.tiles) {
                const model = g.math.m4mul(
                    g.math.m4translate(tile.worldPos[0], tile.worldPos[1], tile.worldPos[2]),
                    g.math.m4scale(g.map.tileSize, g.map.tileSize, g.map.tileSize)
                );
                const mvp = g.math.m4mul(g.camera.vpMatrix, model);
                gl.uniformMatrix4fv(uMVP,  false, mvp);
                gl.uniformMatrix4fv(uModel, false, model);
                gl.uniform3fv(uColor, tile.color);
                gl.uniform1f(uSel, tile.selected ? 1.0 : 0.0);
                gl.drawElements(gl.TRIANGLES, ct.cubeIndexCount, gl.UNSIGNED_SHORT, 0);
            }
            gl.depthMask(true);
        },
    },

    // edge wireframes
    edges: {
        order: 40,
        draw(gl) {
            if (!config.world.showCubeWireOutline) return;
            const ct = g.renderer.map.cubeTiles;
            const ep = ct.edgeProgram;
            gl.useProgram(ep);
            const eaMVP  = gl.getUniformLocation(ep, 'uMVP');
            const eColor = gl.getUniformLocation(ep, 'uColor');
            const eSel   = gl.getUniformLocation(ep, 'uSelected');

            gl.bindBuffer(gl.ARRAY_BUFFER, ct.cubeVBO);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ct.edgeIBO);
            const eaPos = gl.getAttribLocation(ep, 'aPos');
            gl.enableVertexAttribArray(eaPos);
            gl.vertexAttribPointer(eaPos, 3, gl.FLOAT, false, 24, 0);

            for (const tile of g.map.tiles) {
                const model = g.math.m4mul(
                    g.math.m4translate(tile.worldPos[0], tile.worldPos[1], tile.worldPos[2]),
                    g.math.m4scale(g.map.tileSize, g.map.tileSize, g.map.tileSize)
                );
                const mvp = g.math.m4mul(g.camera.vpMatrix, model);
                gl.uniformMatrix4fv(eaMVP, false, mvp);
                gl.uniform3fv(eColor, tile.color);
                gl.uniform1f(eSel, tile.selected ? 1.0 : 0.0);
                gl.drawElements(gl.LINES, ct.edgeIndexCount, gl.UNSIGNED_SHORT, 0);
            }
        },
    },

    load() {
        const gl = g.gl;
        const ct = g.renderer.map.cubeTiles;

        // cube face shader (lit, transparent)
        ct.program = g.shader.create(
            `attribute vec3 aPos;
             attribute vec3 aNormal;
             uniform mat4 uMVP;
             uniform mat4 uModel;
             varying vec3 vNormal;
             varying vec3 vWorldPos;
             void main(){
                 gl_Position = uMVP * vec4(aPos, 1.0);
                 vNormal = mat3(uModel) * aNormal;
                 vWorldPos = (uModel * vec4(aPos, 1.0)).xyz;
             }`,
            `precision mediump float;
             varying vec3 vNormal;
             varying vec3 vWorldPos;
             uniform vec3 uColor;
             uniform vec3 uEye;
             uniform float uSelected;
             void main(){
                 vec3 n = normalize(vNormal);
                 vec3 lightDir = normalize(vec3(0.4, 0.7, 0.5));
                 float diff = max(dot(n, lightDir), 0.0);
                 float amb = 0.25;
                 vec3 viewDir = normalize(uEye - vWorldPos);
                 vec3 refl = reflect(-lightDir, n);
                 float spec = pow(max(dot(viewDir, refl), 0.0), 32.0) * 0.4;
                 vec3 col = uColor * (amb + diff * 0.7) + vec3(spec);
                 col = mix(col, vec3(1.0), uSelected * 0.3);
                 gl_FragColor = vec4(col, 0.01 + uSelected * 0.15);
             }`
        );

        // edge wireframe shader (simple solid color)
        ct.edgeProgram = g.shader.create(
            `attribute vec3 aPos;
             uniform mat4 uMVP;
             void main(){
                 gl_Position = uMVP * vec4(aPos, 1.0);
             }`,
            `precision mediump float;
             uniform vec3 uColor;
             uniform float uSelected;
             void main(){
                 vec3 col = mix(uColor, vec3(1.0), uSelected * 0.5);
                 gl_FragColor = vec4(col, 1.0);
             }`
        );

        // cube geometry: 24 verts (unique normals per face), 36 indices
        const S = 0.5;
        const verts = new Float32Array([
            // front (+Z)
            -S,-S, S,  0, 0, 1,   S,-S, S,  0, 0, 1,   S, S, S,  0, 0, 1,  -S, S, S,  0, 0, 1,
            // back (-Z)
             S,-S,-S,  0, 0,-1,  -S,-S,-S,  0, 0,-1,  -S, S,-S,  0, 0,-1,   S, S,-S,  0, 0,-1,
            // left (-X)
            -S,-S,-S, -1, 0, 0,  -S,-S, S, -1, 0, 0,  -S, S, S, -1, 0, 0,  -S, S,-S, -1, 0, 0,
            // right (+X)
             S,-S, S,  1, 0, 0,   S,-S,-S,  1, 0, 0,   S, S,-S,  1, 0, 0,   S, S, S,  1, 0, 0,
            // top (+Y)
            -S, S, S,  0, 1, 0,   S, S, S,  0, 1, 0,   S, S,-S,  0, 1, 0,  -S, S,-S,  0, 1, 0,
            // bottom (-Y)
            -S,-S,-S,  0,-1, 0,   S,-S,-S,  0,-1, 0,   S,-S, S,  0,-1, 0,  -S,-S, S,  0,-1, 0,
        ]);
        const indices = new Uint16Array([
             0, 1, 2,  0, 2, 3,   4, 5, 6,  4, 6, 7,   8, 9,10,  8,10,11,
            12,13,14, 12,14,15,  16,17,18, 16,18,19,  20,21,22, 20,22,23
        ]);
        ct.cubeIndexCount = indices.length;

        // edge indices (12 edges of a cube as GL_LINES, using face verts)
        const edges = new Uint16Array([
            // front face edges
            0,1, 1,2, 2,3, 3,0,
            // back face edges
            4,5, 5,6, 6,7, 7,4,
            // connecting edges (front-to-back via shared corners)
            0,5,  1,4,  2,7,  3,6,
        ]);
        ct.edgeIndexCount = edges.length;
        ct.edgeIBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ct.edgeIBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, edges, gl.STATIC_DRAW);

        ct.cubeVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ct.cubeVBO);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        ct.cubeIBO = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ct.cubeIBO);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
    },
};
g.loadHandlers.push(g.renderer.map.cubeTiles.load);
