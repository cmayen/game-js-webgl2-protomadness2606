
//  g.renderer.map.cubeTiles.stars
g.renderer.map.cubeTiles.stars = {
    order: 30,
    program: null,
    starVBO: null,

    load() {
        const gl = g.gl;
        const self = g.renderer.map.cubeTiles.stars;

        self.program = g.shader.create(
            `attribute vec3 aPos;
             attribute vec3 aColor;
             attribute float aSelected;
             uniform mat4 uVP;
             uniform float uDPI;
             uniform vec3 uCameraPos;
             uniform float uTileSize;
             varying vec3 vColor;
             varying float vSel;
             varying float vOpacity;
             void main(){
                 gl_Position = uVP * vec4(aPos, 1.0);
                 gl_PointSize = mix(6.0, 12.0, aSelected) * uDPI;
                 float dist = distance(aPos, uCameraPos);
                 // Fully visible when near, then fade to 0 toward tile-size distance.
                 float opacity = 1.0 - smoothstep(uTileSize * 0.75, uTileSize, dist);
                 if (aSelected > 0.5) opacity = 1.0;
                 vColor = aColor;
                 vSel = aSelected;
                 vOpacity = opacity;
             }`,
            `precision mediump float;
             varying vec3 vColor;
             varying float vSel;
             varying float vOpacity;
             void main(){
                 float d = length(gl_PointCoord - vec2(0.5));
                 if(d > 0.5) discard;
                 float glow = 1.0 - d * 2.0;
                 vec3 col = mix(vColor, vec3(1.0), vSel * 0.5);
                 float fade = smoothstep(0.06, 1.0, vOpacity);
                 float alpha = (0.8 + glow * 0.2) * fade;
                 if (alpha <= 0.001) discard;
                 // Keep RGB independent of fade so stars fade in cleanly instead of appearing as dark disks.
                 gl_FragColor = vec4(col * (0.6 + glow * 0.4), alpha);
             }`
        );
        self.starVBO = gl.createBuffer();
    },

    draw(gl) {
        const self = g.renderer.map.cubeTiles.stars;
        const sp = self.program;
        gl.useProgram(sp);
        gl.uniformMatrix4fv(gl.getUniformLocation(sp, 'uVP'), false, g.camera.vpMatrix);
        const dpr = window.devicePixelRatio || 1;
        gl.uniform1f(gl.getUniformLocation(sp, 'uDPI'), dpr);
        gl.uniform3fv(gl.getUniformLocation(sp, 'uCameraPos'), g.camera.pos);
        gl.uniform1f(gl.getUniformLocation(sp, 'uTileSize'), config.world.tileSize);

        // build star vertex data: pos(3) + color(3) + selected(1) = 7 floats per star
        let starCount = 0;
        for (const tile of g.map.tiles) starCount += tile.stars.length;
        const starData = new Float32Array(starCount * 7);
        let si = 0;
        for (const tile of g.map.tiles) {
            for (const star of tile.stars) {
                starData[si++] = star.worldPos[0];
                starData[si++] = star.worldPos[1];
                starData[si++] = star.worldPos[2];
                starData[si++] = star.color[0];
                starData[si++] = star.color[1];
                starData[si++] = star.color[2];
                starData[si++] = star.selected ? 1.0 : 0.0;
            }
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, self.starVBO);
        gl.bufferData(gl.ARRAY_BUFFER, starData, gl.DYNAMIC_DRAW);
        const saPos = gl.getAttribLocation(sp, 'aPos');
        const saCol = gl.getAttribLocation(sp, 'aColor');
        const saSel = gl.getAttribLocation(sp, 'aSelected');
        gl.enableVertexAttribArray(saPos);
        gl.vertexAttribPointer(saPos, 3, gl.FLOAT, false, 28, 0);
        gl.enableVertexAttribArray(saCol);
        gl.vertexAttribPointer(saCol, 3, gl.FLOAT, false, 28, 12);
        gl.enableVertexAttribArray(saSel);
        gl.vertexAttribPointer(saSel, 1, gl.FLOAT, false, 28, 24);
        gl.drawArrays(gl.POINTS, 0, starCount);
        gl.disableVertexAttribArray(saCol);
        gl.disableVertexAttribArray(saSel);
    },
};
g.loadHandlers.push(g.renderer.map.cubeTiles.stars.load);
