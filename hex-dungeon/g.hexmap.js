

g.hexmap={
    fillProgram: null,
    wireProgram: null,
    torchProgram: null,
    geometry: null,
    torchGeometry: null,
    torchLights: [],
    maxTorchLights: 16,
    ambientLight: 0.26,
    torchRadiusMultiplier: 1.0,
    radius: 16,
    hexSize: 2.0,
    baseHeight: 0.12,



    // tile data for picking
    tiles: {},          // keyed by "q,r"
    targetedTile: null,  // {q, r} or null
    _glowGeometry: null,
    _glowTileKey: null,
    _showWireframe: true,

    // dungeon tile palette (indexed by biome ID)
    biomes: [
        { name: 'RoomFloor',  color: [0.56, 0.53, 0.46, 1.0], minCount: 0, heightRange: [0.08, 0.08] },
        { name: 'HallFloor',  color: [0.48, 0.46, 0.40, 1.0], minCount: 0, heightRange: [0.08, 0.08] },
        { name: 'Wall',       color: [0.22, 0.24, 0.28, 1.0], minCount: 0, heightRange: [0.34, 0.34] },
        { name: 'Door',       color: [0.67, 0.46, 0.25, 1.0], minCount: 0, heightRange: [0.08, 0.08] },
        { name: 'StairsStart', color: [0.25, 0.60, 0.40, 1.0], minCount: 1, heightRange: [0.08, 0.08] },
        { name: 'StairsEnd',  color: [0.70, 0.30, 0.28, 1.0], minCount: 1, heightRange: [0.08, 0.08] },
    ],
    BIOME: { RoomFloor:0, HallFloor:1, Wall:2, Door:3, StairsStart:4, StairsEnd:5 },


    load(){
        g.hexmap.fillProgram = g.shader.create(
            `
                attribute vec3 a_position;
                attribute vec4 a_color;
                uniform mat4 u_modelViewProjection;
                varying vec4 v_color;
                varying vec3 v_worldPos;
                void main() {
                    v_color = a_color;
                    v_worldPos = a_position;
                    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
                }
            `,
            `
                precision mediump float;
                const int MAX_LIGHTS = 16;
                varying vec4 v_color;
                varying vec3 v_worldPos;
                uniform int u_lightCount;
                uniform vec3 u_lightPos[MAX_LIGHTS];
                uniform vec3 u_lightColor[MAX_LIGHTS];
                uniform float u_lightRadius[MAX_LIGHTS];
                uniform float u_ambient;
                uniform float u_time;
                void main() {
                    vec3 lit = v_color.rgb * u_ambient;
                    for(int i = 0; i < MAX_LIGHTS; i++){
                        if(i >= u_lightCount) break;
                        vec3 toL = u_lightPos[i] - v_worldPos;
                        float d = length(toL);
                        float atten = clamp(1.0 - (d / max(0.0001, u_lightRadius[i])), 0.0, 1.0);
                        atten *= atten;
                        float flicker = 0.92 + 0.08 * sin(u_time * 0.007 + float(i) * 13.37);
                        lit += v_color.rgb * u_lightColor[i] * atten * flicker;
                    }
                    gl_FragColor = vec4(clamp(lit, 0.0, 1.0), v_color.a);
                }
            `,
        );
        g.hexmap.wireProgram = g.shader.create(
            `
                attribute vec3 a_position;
                uniform mat4 u_modelViewProjection;
                void main() {
                    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
                }
            `,
            `
                precision mediump float;
                uniform vec4 u_color;
                void main() {
                    gl_FragColor = u_color;
                }
            `,
        );
        g.hexmap.torchProgram = g.shader.create(
            `
                attribute vec3 a_position;
                attribute vec4 a_color;
                uniform mat4 u_modelViewProjection;
                varying vec4 v_color;
                void main() {
                    v_color = a_color;
                    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
                    gl_PointSize = 9.0;
                }
            `,
            `
                precision mediump float;
                varying vec4 v_color;
                void main() {
                    vec2 p = gl_PointCoord - vec2(0.5, 0.5);
                    float d = length(p);
                    if(d > 0.5) discard;
                    float a = smoothstep(0.5, 0.0, d);
                    gl_FragColor = vec4(v_color.rgb, v_color.a * a);
                }
            `,
        );
        g.hexmap.geometry = g.hexmap.createGeometry();
        g.canvas.registerDrawHandler(g.hexmap.draw);
        g.input.onClick(g.hexmap._onClickTile);
    },

    _torchWorldDataFromHexTorch(torch){
        const [cx, cy] = g.hexmap.hexToWorld(torch.q, torch.r);
        const c0 = g.hexmap.hexCorner(cx, cy, torch.edge);
        const c1 = g.hexmap.hexCorner(cx, cy, (torch.edge + 1) % 6);
        const mx = 0.5 * (c0[0] + c1[0]);
        const my = 0.5 * (c0[1] + c1[1]);
        const inX = cx - mx;
        const inY = cy - my;
        const inLen = Math.hypot(inX, inY) || 1.0;
        const inwardOffset = g.hexmap.hexSize * 0.18;

        const tx = mx + (inX / inLen) * inwardOffset;
        const ty = my + (inY / inLen) * inwardOffset;

        const h = g.hexmap.HexMapManager.directHeights[`${torch.q},${torch.r}`] ?? g.hexmap.HexMapManager.config.floorHeight;
        const floorZ = g.hexmap.baseHeight + h * 4.20;
        const wallH = g.hexmap.HexMapManager.config.wallHeight || 0.5;
        const markerZ = floorZ + Math.min(0.42 * wallH + 0.42, 1.10);

        return [tx, ty, markerZ, floorZ, wallH];
    },

    _rebuildTorchData(){
        const torches = g.hexmap.HexMapManager.torches || [];
        const pos = [];
        const col = [];
        const lights = [];

        for(const t of torches){
            const [tx, ty, markerZ, floorZ, wallH] = g.hexmap._torchWorldDataFromHexTorch(t);
            pos.push(tx, ty, markerZ);
            col.push(1.0, 0.72, 0.30, 0.95);

            lights.push({
                x: tx,
                y: ty,
                z: floorZ + Math.min(wallH * 0.58 + 0.48, 1.32),
                radius: g.hexmap.hexSize * (t.kind === 'hall' ? 3.7 : 4.2),
                color: t.kind === 'hall' ? [1.00, 0.66, 0.32] : [1.00, 0.72, 0.42],
            });
        }

        g.hexmap.torchGeometry = {
            positions: { data: new Float32Array(pos), size: 3 },
            colors: { data: new Float32Array(col), size: 4 },
            vertexCount: pos.length / 3,
        };
        g.hexmap.torchLights = lights;
    },

    _getVisibleLights(max){
        const lights = g.hexmap.torchLights || [];
        if(max <= 0 || lights.length === 0){
            return [];
        }

        const canvas = g.canvas.el;
        const aspect = canvas && canvas.height ? canvas.width / canvas.height : 1;
        const viewProjection = g.camera.getViewProjection(aspect);
        const eye = g.camera.position;
        const closeLightDistance = g.hexmap.hexSize * 3.5;
        const closeLightDistanceSq = closeLightDistance * closeLightDistance;
        const frustumPadding = 0.18;
        const depthPadding = 0.25;
        const priority = [];
        const visible = [];

        for(const light of lights){
            const toLight = [light.x - eye[0], light.y - eye[1], light.z - eye[2]];
            const distanceSq = toLight[0] * toLight[0] + toLight[1] * toLight[1] + toLight[2] * toLight[2];
            if(distanceSq <= closeLightDistanceSq){
                priority.push({ light, distanceSq });
                continue;
            }

            const clip = g.math.vec4TransformMat4([light.x, light.y, light.z, 1], viewProjection);
            const w = clip[3];
            if(w <= 0){
                continue;
            }

            const invW = 1 / w;
            const ndcX = clip[0] * invW;
            const ndcY = clip[1] * invW;
            const ndcZ = clip[2] * invW;
            if(
                ndcX < -1 - frustumPadding || ndcX > 1 + frustumPadding ||
                ndcY < -1 - frustumPadding || ndcY > 1 + frustumPadding ||
                ndcZ < -1 - depthPadding || ndcZ > 1 + depthPadding
            ){
                continue;
            }

            visible.push({
                light,
                distanceSq,
            });
        }

        priority.sort((a, b) => a.distanceSq - b.distanceSq);
        visible.sort((a, b) => a.distanceSq - b.distanceSq);

        const selected = [];
        const seen = new Set();
        for(const entry of priority){
            const key = `${entry.light.x},${entry.light.y},${entry.light.z}`;
            if(seen.has(key)){
                continue;
            }
            seen.add(key);
            selected.push(entry.light);
            if(selected.length >= max){
                return selected;
            }
        }
        for(const entry of visible){
            const key = `${entry.light.x},${entry.light.y},${entry.light.z}`;
            if(seen.has(key)){
                continue;
            }
            seen.add(key);
            selected.push(entry.light);
            if(selected.length >= max){
                break;
            }
        }
        return selected;
    },

    _getLightUniforms(){
        const max = Math.max(0, Math.min(16, Math.floor(g.hexmap.maxTorchLights || 0)));
        const pos = new Float32Array(max * 3);
        const col = new Float32Array(max * 3);
        const radius = new Float32Array(max);
        const radiusMul = Math.max(0.05, g.hexmap.torchRadiusMultiplier || 0.05);

        const lights = g.hexmap._getVisibleLights(max);
        const count = Math.min(max, lights.length);
        for(let i = 0; i < count; i++){
            const L = lights[i];
            pos[i * 3 + 0] = L.x;
            pos[i * 3 + 1] = L.y;
            pos[i * 3 + 2] = L.z;
            col[i * 3 + 0] = L.color[0];
            col[i * 3 + 1] = L.color[1];
            col[i * 3 + 2] = L.color[2];
            radius[i] = L.radius * radiusMul;
        }
        return { count, pos, col, radius };
    },

    // --- simple smooth noise (value noise with smoothstep interpolation) ---
    _noisePermutation: null,
    seed: 420,
    _noiseSeed: 420,
    _initNoise(){
        const perm = new Uint8Array(512);
        const base = new Uint8Array(256);
        for(let i = 0; i < 256; i++) base[i] = i;
        for(let i = 255; i > 0; i--){
            const j = Math.floor(g.hexmap._seededRandom() * (i + 1));
            const tmp = base[i]; base[i] = base[j]; base[j] = tmp;
        }
        for(let i = 0; i < 512; i++) perm[i] = base[i & 255];
        g.hexmap._noisePermutation = perm;
    },
    _seededRandom(){
        g.hexmap._noiseSeed = (g.hexmap._noiseSeed * 16807 + 0) % 2147483647;
        return (g.hexmap._noiseSeed - 1) / 2147483646;
    },
    _fade(t){ return t * t * t * (t * (t * 6 - 15) + 10); },
    _lerp(a, b, t){ return a + t * (b - a); },
    _grad(hash, x, y){
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
    },
    noise2D(x, y){
        if(!g.hexmap._noisePermutation) g.hexmap._initNoise();
        const perm = g.hexmap._noisePermutation;
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const xf = x - Math.floor(x);
        const yf = y - Math.floor(y);
        const u = g.hexmap._fade(xf);
        const v = g.hexmap._fade(yf);
        const aa = perm[perm[X] + Y];
        const ab = perm[perm[X] + Y + 1];
        const ba = perm[perm[X + 1] + Y];
        const bb = perm[perm[X + 1] + Y + 1];
        return g.hexmap._lerp(
            g.hexmap._lerp(g.hexmap._grad(aa, xf, yf), g.hexmap._grad(ba, xf - 1, yf), u),
            g.hexmap._lerp(g.hexmap._grad(ab, xf, yf - 1), g.hexmap._grad(bb, xf - 1, yf - 1), u),
            v,
        );
    },
    fbm(x, y, octaves, lacunarity, gain){
        let value = 0;
        let amplitude = 1;
        let frequency = 1;
        let max = 0;
        for(let i = 0; i < octaves; i++){
            value += amplitude * g.hexmap.noise2D(x * frequency, y * frequency);
            max += amplitude;
            amplitude *= gain;
            frequency *= lacunarity;
        }
        return value / max;
    },

    // --- hex coordinate helpers (pointy-top, axial q,r, Z-up) ---
    hexToWorld(q, r){
        const size = g.hexmap.hexSize;
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const y = size * (3 / 2 * r);
        return [x, y];
    },
    hexCorner(cx, cy, i){
        const size = g.hexmap.hexSize;
        const angleDeg = 60 * i - 30; // pointy-top: first corner at -30°
        const angleRad = Math.PI / 180 * angleDeg;
        return [
            cx + size * Math.cos(angleRad),
            cy + size * Math.sin(angleRad),
        ];
    },

    getBiomeColor(normalizedHeight){
        // legacy fallback — not used by manager path
        for(const biome of g.hexmap.biomes){
            const r = biome.heightRange;
            if(normalizedHeight <= r[1]) return biome.color;
        }
        return g.hexmap.biomes[g.hexmap.biomes.length - 1].color;
    },

    getHeight(q, r){
        const [wx, wy] = g.hexmap.hexToWorld(q, r);
        const noiseScale = 0.12;
        const raw = g.hexmap.fbm(wx * noiseScale, wy * noiseScale, 4, 2.0, 0.5);
        const normalized = (raw + 1) / 2; // map [-1,1] to [0,1]
        return Math.max(0, Math.min(1, normalized));
    },

    hexNeighbors(q, r){
        return [
            [q+1, r], [q-1, r], [q, r+1],
            [q, r-1], [q+1, r-1], [q-1, r+1],
        ];
    },
    hexDistance(q1, r1, q2, r2){
        return (Math.abs(q1 - q2) + Math.abs(q1 + r1 - q2 - r2) + Math.abs(r1 - r2)) / 2;
    },

    // --- picking helpers ---
    worldToHex(wx, wy){
        const size = g.hexmap.hexSize;
        const q = (Math.sqrt(3) / 3 * wx - 1 / 3 * wy) / size;
        const r = (2 / 3 * wy) / size;
        return g.hexmap.axialRound(q, r);
    },
    axialRound(q, r){
        const s = -q - r;
        let rq = Math.round(q);
        let rr = Math.round(r);
        let rs = Math.round(s);
        const dq = Math.abs(rq - q);
        const dr = Math.abs(rr - r);
        const ds = Math.abs(rs - s);
        if(dq > dr && dq > ds){
            rq = -rr - rs;
        } else if(dr > ds){
            rr = -rq - rs;
        }
        return [rq, rr];
    },
    screenToRay(screenX, screenY){
        const canvas = g.canvas.el;
        const ndcX = (2 * screenX / canvas.clientWidth) - 1;
        const ndcY = 1 - (2 * screenY / canvas.clientHeight);
        const aspect = canvas.width / canvas.height;
        const vp = g.camera.getViewProjection(aspect);
        const ivp = g.math.mat4Inverse(vp);
        if(!ivp) return null;
        const near = g.math.vec4TransformMat4([ndcX, ndcY, -1, 1], ivp);
        const far = g.math.vec4TransformMat4([ndcX, ndcY, 1, 1], ivp);
        const nw = [near[0] / near[3], near[1] / near[3], near[2] / near[3]];
        const fw = [far[0] / far[3], far[1] / far[3], far[2] / far[3]];
        const dir = g.math.vec3Normalize(g.math.vec3Subtract(fw, nw));
        return { origin: nw, direction: dir };
    },
    pickTile(screenX, screenY){
        const ray = g.hexmap.screenToRay(screenX, screenY);
        if(!ray) return null;
        let closestT = Infinity;
        let closestTile = null;
        for(const key in g.hexmap.tiles){
            const tile = g.hexmap.tiles[key];
            if(Math.abs(ray.direction[2]) < 0.0001) continue;
            const t = (tile.zTop - ray.origin[2]) / ray.direction[2];
            if(t < 0 || t >= closestT) continue;
            const ix = ray.origin[0] + t * ray.direction[0];
            const iy = ray.origin[1] + t * ray.direction[1];
            const [hq, hr] = g.hexmap.worldToHex(ix, iy);
            if(hq === tile.q && hr === tile.r){
                closestT = t;
                closestTile = tile;
            }
        }
        return closestTile;
    },
    _onClickTile(screenX, screenY){
        const tile = g.hexmap.pickTile(screenX, screenY);
        if(!tile){
            g.hexmap.targetedTile = null;
            g.hexmap._glowTileKey = null;
            return;
        }
        const key = `${tile.q},${tile.r}`;
        if(g.hexmap._glowTileKey === key){
            g.hexmap.targetedTile = null;
            g.hexmap._glowTileKey = null;
        } else {
            g.hexmap.targetedTile = tile;
            g.hexmap._glowTileKey = key;
            g.hexmap._glowGeometry = tile.buildGlowGeometry();
        }
    },

    createGeometry(){
        const radius = g.hexmap.radius;
        const seed = g.hexmap.seed;

        // build noise permutation table deterministically from seed
        // (_initNoise consumes _noiseSeed via _seededRandom, so we
        //  reset it from the stable seed each time)
        g.hexmap._noiseSeed = seed;
        g.hexmap._noisePermutation = null;
        g.hexmap._initNoise();

        // run procedural generation (uses its own isolated RNG)
        g.hexmap.HexMapManager.generate(radius, seed);

        const triPositions = [];
        const triColors = [];
        const edgePositions = [];
        g.hexmap.tiles = {};

        // only build tiles that were placed by the generation passes
        const biomeMap = g.hexmap.HexMapManager.biomeMap;
        // pass 1: create all tiles so neighbor lookups work
        for(const coordKey in biomeMap){
            const [q, r] = coordKey.split(',').map(Number);
            g.hexmap.tiles[coordKey] = new g.hexmap.HexMapTile(q, r);
        }
        // pass 2: build geometry (per-vertex blending needs all neighbors present)
        for(const coordKey in g.hexmap.tiles){
            g.hexmap.tiles[coordKey].buildGeometry(triPositions, triColors, edgePositions);
        }

        const positions = new Float32Array(triPositions);
        const colors = new Float32Array(triColors);
        const edges = new Float32Array(edgePositions);

        g.hexmap._rebuildTorchData();

        return {
            positions: { data: positions, size: 3 },
            colors: { data: colors, size: 4 },
            edges: { data: edges, size: 3 },
            vertexCount: positions.length / 3,
            edgeVertexCount: edges.length / 3,
        };
    },

    draw(){
        const modelViewProjection = g.renderer.createModelViewProjection([0, 0, 0], [0, 0, 0]);
        const lightU = g.hexmap._getLightUniforms();
        g.renderer.submit({
            program: g.hexmap.fillProgram,
            mode: "TRIANGLES",
            count: g.hexmap.geometry.vertexCount,
            attributes: {
                a_position: g.hexmap.geometry.positions,
                a_color: g.hexmap.geometry.colors,
            },
            uniforms: {
                u_modelViewProjection: { type: "mat4", value: modelViewProjection },
                u_lightCount: { type: "int", value: lightU.count },
                u_lightPos: { type: "vec3Array", value: lightU.pos },
                u_lightColor: { type: "vec3Array", value: lightU.col },
                u_lightRadius: { type: "floatArray", value: lightU.radius },
                u_ambient: { type: "float", value: g.hexmap.ambientLight },
                u_time: { type: "float", value: performance.now() },
            },
            state: {
                polygonOffset: [1, 1],
            },
        });
        if(g.hexmap._showWireframe){
            g.renderer.submit({
                program: g.hexmap.wireProgram,
                mode: "LINES",
                count: g.hexmap.geometry.edgeVertexCount,
                attributes: {
                    a_position: g.hexmap.geometry.edges,
                },
                uniforms: {
                    u_modelViewProjection: { type: "mat4", value: modelViewProjection },
                    u_color: { type: "vec4", value: [0.96, 0.96, 0.98, 0.28] },
                },
            });
        }

        if(g.hexmap.torchGeometry && g.hexmap.torchGeometry.vertexCount > 0){
            g.renderer.submit({
                program: g.hexmap.torchProgram,
                mode: "POINTS",
                count: g.hexmap.torchGeometry.vertexCount,
                attributes: {
                    a_position: g.hexmap.torchGeometry.positions,
                    a_color: g.hexmap.torchGeometry.colors,
                },
                uniforms: {
                    u_modelViewProjection: { type: "mat4", value: modelViewProjection },
                },
                state: {
                    blend: 'additive',
                    depthMask: false,
                },
            });
        }

        // glow for targeted tile
        if(g.hexmap.targetedTile && g.hexmap._glowGeometry){
            g.renderer.submit({
                program: g.hexmap.fillProgram,
                mode: "TRIANGLES",
                count: g.hexmap._glowGeometry.vertexCount,
                attributes: {
                    a_position: g.hexmap._glowGeometry.positions,
                    a_color: g.hexmap._glowGeometry.colors,
                },
                uniforms: {
                    u_modelViewProjection: { type: "mat4", value: modelViewProjection },
                    u_lightCount: { type: "int", value: lightU.count },
                    u_lightPos: { type: "vec3Array", value: lightU.pos },
                    u_lightColor: { type: "vec3Array", value: lightU.col },
                    u_lightRadius: { type: "floatArray", value: lightU.radius },
                    u_ambient: { type: "float", value: g.hexmap.ambientLight },
                    u_time: { type: "float", value: performance.now() },
                },
                state: {
                    blend: 'additive',
                    depthMask: false,
                },
            });
            g.renderer.submit({
                program: g.hexmap.wireProgram,
                mode: "LINES",
                count: g.hexmap._glowGeometry.edgeVertexCount,
                attributes: {
                    a_position: g.hexmap._glowGeometry.edges,
                },
                uniforms: {
                    u_modelViewProjection: { type: "mat4", value: modelViewProjection },
                    u_color: { type: "vec4", value: [1.0, 0.85, 0.4, 1.0] },
                },
                state: {
                    depthMask: false,
                },
            });
        }
    },
};
g.loadHandlers.push(g.hexmap.load);

