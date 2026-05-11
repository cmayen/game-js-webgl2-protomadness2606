
//  g.renderer.map.nebula 
g.renderer.map.nebula = {
    order: 5,
    glow: true,
    program: null,
    vbo: null,
    ibo: null,
    indexCount: 0,

    _u: null,
    _aPos: -1,

    load() {
        const gl = g.gl;
        const self = g.renderer.map.nebula;

        self.program = g.shader.create(
            `attribute vec2 aPos;
             uniform mat4 uVP;
             uniform vec3 uSliceCenter;
             uniform vec3 uCamRight;
             uniform vec3 uCamUp;
             uniform float uHalfSize;
             varying vec3 vWorldPos;
             varying vec2 vLocalUV;
             void main() {
                 vec3 world = uSliceCenter + uCamRight * (aPos.x * uHalfSize) + uCamUp * (aPos.y * uHalfSize);
                 vWorldPos = world;
                 vLocalUV = aPos;
                 gl_Position = uVP * vec4(world, 1.0);
             }`,
            `precision mediump float;
             varying vec3 vWorldPos;
             varying vec2 vLocalUV;

             uniform vec3 uCamPos;
             uniform float uTileSize;
             uniform float uNoiseScale;
             uniform float uDensityBias;
             uniform float uDensityContrast;
             uniform float uColorWarpStrength;
             uniform float uDitherStrength;
             uniform float uBloom;
             uniform float uTileFade;
             uniform float uTileDistFade;
             uniform float uFadeNearTiles;
             uniform float uFadeFarTiles;
             uniform float uSliceT;
             uniform float uSeed;
             uniform vec3 uTileCoord;
             uniform float uCoverageThresholdLow;
             uniform float uCoverageThresholdHigh;
             uniform float uWarpStrength;
             uniform float uAlphaScale;
             uniform int uOccupancyOctaves;
             uniform int uOctaves;
             uniform int uShaderQuality;

             uniform vec3 uHighlight;

             vec3 hsv2rgb(vec3 c) {
                 vec3 p = abs(fract(c.xxx + vec3(0.0, 0.6666667, 0.3333333)) * 6.0 - 3.0);
                 vec3 rgb = clamp(p - 1.0, 0.0, 1.0);
                 return c.z * mix(vec3(1.0), rgb, c.y);
             }

             float hash31(vec3 p) {
                 return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
             }

             float valueNoise3(vec3 p) {
                 vec3 i = floor(p);
                 vec3 f = fract(p);
                 f = f * f * (3.0 - 2.0 * f);

                 float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
                 float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
                 float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
                 float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
                 float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
                 float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
                 float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
                 float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

                 float nx00 = mix(n000, n100, f.x);
                 float nx10 = mix(n010, n110, f.x);
                 float nx01 = mix(n001, n101, f.x);
                 float nx11 = mix(n011, n111, f.x);

                 float nxy0 = mix(nx00, nx10, f.y);
                 float nxy1 = mix(nx01, nx11, f.y);
                 return mix(nxy0, nxy1, f.z);
             }

             float fbm(vec3 p, int oct) {
                 float f = 0.0;
                 float amp = 0.5;
                 vec3 q = p;

                 f += valueNoise3(q) * amp;
                 q *= 2.03; amp *= 0.5;

                 if (oct > 1) { f += valueNoise3(q) * amp; q *= 2.01; amp *= 0.5; }
                 if (oct > 2) { f += valueNoise3(q) * amp; q *= 1.98; amp *= 0.5; }
                 if (oct > 3) { f += valueNoise3(q) * amp; q *= 2.07; amp *= 0.5; }
                 if (oct > 4) { f += valueNoise3(q) * amp; q *= 2.11; amp *= 0.5; }
                 if (oct > 5) { f += valueNoise3(q) * amp; }

                 return f;
             }

             void main() {
                 vec2 uv = vLocalUV;
                 float radial = length(uv);
                 if (radial > 1.08) discard;

                 vec3 p = vWorldPos / max(uTileSize, 0.0001);
                 p = p * uNoiseScale;

                 if (uWarpStrength > 0.0001) {
                     // Low-frequency domain warp breaks repetition while preserving continuity.
                     vec3 wp = p * 0.43 + vec3(3.7, 9.2, 1.5);
                     vec3 wv = vec3(
                         valueNoise3(wp + vec3(0.0, 0.0, 0.0)),
                         valueNoise3(wp + vec3(17.0, 11.0, 5.0)),
                         valueNoise3(wp + vec3(29.0, 7.0, 13.0))
                     ) - 0.5;
                     p += wv * uWarpStrength;
                 }

                 vec3 pColor = p + vec3(uSeed * 0.00173);

                 float n = fbm(p, uOctaves);
                 if (uShaderQuality > 0) {
                     int detailOct = uOctaves;
                     if (detailOct > 4) detailOct = 4;
                     n += fbm(p * 2.9 + vec3(9.7, 2.3, 4.1), detailOct) * 0.17;
                 }
                 if (uShaderQuality > 1) {
                     n += valueNoise3(p * 7.2 + vec3(1.1, 6.7, 3.2)) * 0.08;
                 }

                 // Large-scale occupancy keeps wide areas mostly clear.
                 float occ;
                 if (uOccupancyOctaves > 1) occ = fbm(p * 0.25 + vec3(41.0, 13.0, 7.0), uOccupancyOctaves);
                 else occ = valueNoise3(p * 0.25 + vec3(41.0, 13.0, 7.0));
                 float occMask = smoothstep(uCoverageThresholdLow, uCoverageThresholdHigh, occ);

                 n = (n - uDensityBias) * uDensityContrast + 0.5;

                 float edgeFade = smoothstep(1.05, 0.25, radial);
                 float sliceFade = 1.0 - abs(uSliceT) * (0.22 + uTileFade);
                 float density = clamp(n * edgeFade * sliceFade * occMask, 0.0, 1.0);
                 if (density < 0.02) discard;

                 float dither = (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * uDitherStrength;
                 float stylized = clamp(density + dither, 0.0, 1.0);

                 float b0 = smoothstep(0.18, 0.42, stylized);
                 float b1 = smoothstep(0.45, 0.70, stylized);
                 float hi = smoothstep(0.80, 0.98, stylized);

                 float hueNoise = valueNoise3(pColor * 0.8 + vec3(13.0, 29.0, 7.0));
                 float tileHue = dot(uTileCoord, vec3(0.173, 0.347, 0.529));
                 float hue = fract(tileHue + hueNoise * 0.55 + uSeed * 0.0019 + b1 * 0.07);
                 float sat = clamp(0.52 + hi * 0.25 + (hueNoise - 0.5) * 0.12, 0.38, 0.88);
                 float val = clamp(0.30 + stylized * 0.75 + hi * 0.18, 0.20, 1.0);
                 vec3 col = hsv2rgb(vec3(hue, sat, val));
                 col = mix(col, uHighlight, hi * (0.48 + 0.52 * uBloom));

                 // Per-fragment distance fade avoids visible tile-edge pop while traveling.
                 float fragDistTiles = distance(vWorldPos, uCamPos) / max(uTileSize, 0.0001);
                 float fragDistFade = 1.0 - smoothstep(uFadeNearTiles, uFadeFarTiles, fragDistTiles);
                 float alpha = clamp(stylized * (0.58 + 0.42 * hi) * uTileDistFade * uAlphaScale * fragDistFade, 0.0, 1.0);
                 gl_FragColor = vec4(col, alpha);
             }`
        );
        if (!self.program) {
            console.error('Nebula shader program creation failed; disabling nebula renderer.');
            self.enabled = false;
            return;
        }

        const verts = new Float32Array([
            -1, -1,
             1, -1,
             1,  1,
            -1,  1,
        ]);
        const inds = new Uint16Array([0, 1, 2, 0, 2, 3]);

        self.vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, self.vbo);
        gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

        self.ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, inds, gl.STATIC_DRAW);
        self.indexCount = inds.length;

        self._aPos = gl.getAttribLocation(self.program, 'aPos');
        self._u = {
            uVP: gl.getUniformLocation(self.program, 'uVP'),
            uSliceCenter: gl.getUniformLocation(self.program, 'uSliceCenter'),
            uCamRight: gl.getUniformLocation(self.program, 'uCamRight'),
            uCamUp: gl.getUniformLocation(self.program, 'uCamUp'),
            uHalfSize: gl.getUniformLocation(self.program, 'uHalfSize'),
            uCamPos: gl.getUniformLocation(self.program, 'uCamPos'),
            uTileSize: gl.getUniformLocation(self.program, 'uTileSize'),
            uNoiseScale: gl.getUniformLocation(self.program, 'uNoiseScale'),
            uDensityBias: gl.getUniformLocation(self.program, 'uDensityBias'),
            uDensityContrast: gl.getUniformLocation(self.program, 'uDensityContrast'),
            uColorWarpStrength: gl.getUniformLocation(self.program, 'uColorWarpStrength'),
            uDitherStrength: gl.getUniformLocation(self.program, 'uDitherStrength'),
            uBloom: gl.getUniformLocation(self.program, 'uBloom'),
            uTileFade: gl.getUniformLocation(self.program, 'uTileFade'),
            uTileDistFade: gl.getUniformLocation(self.program, 'uTileDistFade'),
            uFadeNearTiles: gl.getUniformLocation(self.program, 'uFadeNearTiles'),
            uFadeFarTiles: gl.getUniformLocation(self.program, 'uFadeFarTiles'),
            uSliceT: gl.getUniformLocation(self.program, 'uSliceT'),
            uSeed: gl.getUniformLocation(self.program, 'uSeed'),
            uTileCoord: gl.getUniformLocation(self.program, 'uTileCoord'),
            uCoverageThresholdLow: gl.getUniformLocation(self.program, 'uCoverageThresholdLow'),
            uCoverageThresholdHigh: gl.getUniformLocation(self.program, 'uCoverageThresholdHigh'),
            uWarpStrength: gl.getUniformLocation(self.program, 'uWarpStrength'),
            uAlphaScale: gl.getUniformLocation(self.program, 'uAlphaScale'),
            uOccupancyOctaves: gl.getUniformLocation(self.program, 'uOccupancyOctaves'),
            uOctaves: gl.getUniformLocation(self.program, 'uOctaves'),
            uShaderQuality: gl.getUniformLocation(self.program, 'uShaderQuality'),
            uHighlight: gl.getUniformLocation(self.program, 'uHighlight'),
        };
    },

    draw(gl) {
        if (g.renderer.map.nebula.enabled === false) return;
        const neb = config.world.nebula;
        if (!neb || !neb.enabled) return;
        if (!g.map.nebula || !g.map.nebula.visibleTiles || g.map.nebula.visibleTiles.length === 0) return;

        const self = g.renderer.map.nebula;
        const sp = self.program;
        const u = self._u;
        const tier = g.map.nebula.getTierSettings();

        gl.useProgram(sp);
        gl.uniformMatrix4fv(u.uVP, false, g.camera.vpMatrix);

        const camRight = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(1, 0, 0));
        const camUp = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 1, 0));
        const camForward = g.math.quatRotateVec3(g.camera.orbitQuat, g.math.v3(0, 0, -1));

        gl.uniform3fv(u.uCamRight, camRight);
        gl.uniform3fv(u.uCamUp, camUp);
        gl.uniform3fv(u.uCamPos, g.camera.pos);
        gl.uniform1f(u.uTileSize, g.map.tileSize);
        gl.uniform1f(u.uNoiseScale, tier.noiseScale);
        gl.uniform1f(u.uDensityBias, neb.densityBias);
        gl.uniform1f(u.uDensityContrast, neb.densityContrast);
        gl.uniform1f(u.uColorWarpStrength, neb.colorWarpStrength);
        gl.uniform1f(u.uDitherStrength, neb.ditherStrength);
        gl.uniform1f(u.uBloom, neb.bloom);
        gl.uniform1f(u.uTileFade, neb.tileFade);
        const fadeNearTiles = neb.fadeNearTiles || 1.5;
        const fadeFarTiles = Math.max(fadeNearTiles + 0.001, neb.fadeFarTiles || 2.15);
        gl.uniform1f(u.uFadeNearTiles, fadeNearTiles);
        gl.uniform1f(u.uFadeFarTiles, fadeFarTiles);
        gl.uniform1f(u.uCoverageThresholdLow, neb.coverageThresholdLow);
        gl.uniform1f(u.uCoverageThresholdHigh, neb.coverageThresholdHigh);
        gl.uniform1f(u.uWarpStrength, tier.shaderQuality > 0 ? neb.warpStrength : 0.0);
        gl.uniform1f(u.uAlphaScale, neb.alphaScale);
        gl.uniform1i(u.uOccupancyOctaves, Math.max(1, neb.occupancyOctaves | 0));
        gl.uniform1i(u.uOctaves, tier.octaves);
        gl.uniform1i(u.uShaderQuality, tier.shaderQuality);
        gl.uniform3fv(u.uHighlight, new Float32Array(neb.highlightColor));

        gl.bindBuffer(gl.ARRAY_BUFFER, self.vbo);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, self.ibo);
        gl.enableVertexAttribArray(self._aPos);
        gl.vertexAttribPointer(self._aPos, 2, gl.FLOAT, false, 8, 0);

        gl.disable(gl.CULL_FACE);
        gl.depthMask(false);

        const cappedSlices = Math.max(3, Math.min(tier.slices, (neb.maxSlicesPerTile || 9) | 0));
        const halfSpan = Math.max(1, Math.floor(cappedSlices * 0.5));
        const halfSize = g.map.tileSize * tier.planeScale;
        gl.uniform1f(u.uHalfSize, halfSize);

        const maxTiles = Math.max((neb.maxRenderDistanceTiles || fadeFarTiles), fadeFarTiles) + tier.planeScale * 0.5;
        const maxTileDist = maxTiles * g.map.tileSize;
        const fadeNear = fadeNearTiles * g.map.tileSize;
        const fadeFar = fadeFarTiles * g.map.tileSize;
        const maxTileDistSq = maxTileDist * maxTileDist;

        for (let i = 0; i < g.map.nebula.visibleTiles.length; i++) {
            const t = g.map.nebula.visibleTiles[i];
            const tile = t.tile;
            const dx = tile.worldPos[0] - g.camera.pos[0];
            const dy = tile.worldPos[1] - g.camera.pos[1];
            const dz = tile.worldPos[2] - g.camera.pos[2];
            const distSq = dx * dx + dy * dy + dz * dz;
            if (distSq > maxTileDistSq) continue;
            const dist = Math.sqrt(distSq);
            const tFade = (fadeFar - dist) / (fadeFar - fadeNear);
            let tileDistFade = Math.max(0.0, Math.min(1.0, tFade));
            tileDistFade = tileDistFade * tileDistFade * (3.0 - 2.0 * tileDistFade);
            if (tileDistFade <= 0.001) continue;

            const seed = t.seed;
            const tileShift = t.phaseShift;
            gl.uniform1f(u.uTileDistFade, tileDistFade);
            gl.uniform3f(u.uTileCoord, tile.ax, tile.ay, tile.az);

            const farStepCfg = Math.max(1, (neb.farSliceStep || 2) | 0);
            const sliceStep = tileDistFade < 0.55 ? farStepCfg : 1;

            for (let s = -halfSpan; s <= halfSpan; s += sliceStep) {
                const st = halfSpan === 0 ? 0.0 : (s / halfSpan);
                const push = st * (g.map.tileSize * neb.sliceSpacing);
                const cx = tile.worldPos[0] + camForward[0] * push;
                const cy = tile.worldPos[1] + camForward[1] * push;
                const cz = tile.worldPos[2] + camForward[2] * push;

                gl.uniform3f(u.uSliceCenter, cx, cy, cz);
                gl.uniform1f(u.uSliceT, st + tileShift * 0.01);
                gl.uniform1f(u.uSeed, seed + neb.seed);
                gl.drawElements(gl.TRIANGLES, self.indexCount, gl.UNSIGNED_SHORT, 0);
            }
        }

        gl.depthMask(true);
    },
};
g.loadHandlers.push(g.renderer.map.nebula.load);
