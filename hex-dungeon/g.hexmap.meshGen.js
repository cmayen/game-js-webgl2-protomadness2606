
// g.hexmap.meshGen.js
// Generates a single merged mesh from the current hex dungeon geometry,
// and provides Laplacian smoothing on that mesh.
// Registers its own draw handler to visualize the result in the scene.
// Must be loaded after g.hexmap.HexMapTile.js.

g.hexmap.meshGen = {

    // The active merged mesh, or null before generate() is called.
    // mesh = {
    //   positions : { data: Float32Array(vCount*3), size: 3, buffer: WebGLBuffer|null }
    //   colors    : { data: Float32Array(vCount*4), size: 4, buffer: WebGLBuffer|null }
    //   vertexCount : number
    //   _uniqueVerts: Array<{x,y,z}>   — welded unique positions (mutated by smooth)
    //   _triIndices : Int32Array        — per-vertex index into _uniqueVerts
    //   _adjMap     : Array<Set<number>> — adjacency between unique vertices
    // }
    mesh: null,

    // When false the draw handler is a no-op.
    enabled: false,

    // Minimum slope considered walkable for collision sampling.
    minWalkableUpDot: 0.4,

    // Maximum step-up from current feet level that is treated as ground.
    maxStepUpFromReference: 0.45,

    load(){
        g.canvas.registerDrawHandler(g.hexmap.meshGen._draw);
    },

    // -----------------------------------------------------------------------
    // generate()
    // Copies the current dungeon geometry (floors + walls) into a single flat
    // mesh, welds coincident vertices for smoothing, and enables drawing.
    // -----------------------------------------------------------------------
    generate(){
        const geo = g.hexmap.geometry;
        if(!geo || !geo.positions || !geo.colors){
            console.warn('meshGen.generate: no dungeon geometry available — rebuild the map first');
            return;
        }

        const gl = g.canvas.gl;

        // Free previous GL buffers if re-generating.
        if(g.hexmap.meshGen.mesh){
            const old = g.hexmap.meshGen.mesh;
            if(old.positions.buffer){ gl.deleteBuffer(old.positions.buffer); }
            if(old.colors.buffer){ gl.deleteBuffer(old.colors.buffer); }
        }

        // Deep-copy the source arrays so this mesh is independent of future
        // map rebuilds and can be smoothed without disturbing the render path.
        const positions = new Float32Array(geo.positions.data);
        const colors    = new Float32Array(geo.colors.data);
        const vCount    = geo.vertexCount;

        const posAttr = { data: positions, size: 3, buffer: null };
        const colAttr = { data: colors,    size: 4, buffer: null };

        const { uniqueVerts, triIndices, adjMap } = g.hexmap.meshGen._buildWeld(positions, vCount);

        g.hexmap.meshGen.mesh = {
            positions:    posAttr,
            colors:       colAttr,
            vertexCount:  vCount,
            _uniqueVerts: uniqueVerts,
            _triIndices:  triIndices,
            _adjMap:      adjMap,
            _collisionTileTris: null,
            _collisionAllTris: null,
        };

        g.hexmap.meshGen._rebuildCollisionIndex();

        g.hexmap.meshGen.enabled = true;
        console.log(
            `meshGen.generate: ${vCount} vertices, ${uniqueVerts.length} unique positions`
        );
    },

    // -----------------------------------------------------------------------
    // smooth()
    // Applies one iteration of Laplacian smoothing to the mesh vertex
    // positions: each unique vertex is moved to the average of its neighbours.
    // The colours are preserved unchanged.
    // Can be called repeatedly for progressively smoother results.
    // -----------------------------------------------------------------------
    smooth(){
        const mesh = g.hexmap.meshGen.mesh;
        if(!mesh){
            console.warn('meshGen.smooth: call generate() first');
            return;
        }

        const uv  = mesh._uniqueVerts;
        const adj = mesh._adjMap;
        const n   = uv.length;

        // Compute new positions into temporary arrays (parallel update).
        const newX = new Float32Array(n);
        const newY = new Float32Array(n);
        const newZ = new Float32Array(n);

        for(let i = 0; i < n; i++){
            const neighbors = adj[i];
            if(!neighbors || neighbors.size === 0){
                newX[i] = uv[i].x;
                newY[i] = uv[i].y;
                newZ[i] = uv[i].z;
                continue;
            }
            let sx = 0, sy = 0, sz = 0, cnt = 0;
            for(const j of neighbors){
                sx += uv[j].x;
                sy += uv[j].y;
                sz += uv[j].z;
                cnt++;
            }
            newX[i] = sx / cnt;
            newY[i] = sy / cnt;
            newZ[i] = sz / cnt;
        }

        // Commit new positions back to the unique vertex list.
        for(let i = 0; i < n; i++){
            uv[i].x = newX[i];
            uv[i].y = newY[i];
            uv[i].z = newZ[i];
        }

        // Expand unique positions back into the flat triangle-soup array.
        const pos      = mesh.positions.data;
        const triIdx   = mesh._triIndices;
        const vCount   = mesh.vertexCount;
        for(let vi = 0; vi < vCount; vi++){
            const uid        = triIdx[vi];
            pos[vi * 3    ]  = uv[uid].x;
            pos[vi * 3 + 1]  = uv[uid].y;
            pos[vi * 3 + 2]  = uv[uid].z;
        }

        g.hexmap.meshGen._rebuildCollisionIndex();

        // Push updated positions to the GPU buffer.
        const gl = g.canvas.gl;
        if(mesh.positions.buffer){
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.positions.buffer);
            gl.bufferSubData(gl.ARRAY_BUFFER, 0, pos);
        }
        // If the buffer hasn't been created yet (no draw has occurred since
        // generate()), the renderer will upload the already-modified data
        // Float32Array on the next draw call.
    },

    // -----------------------------------------------------------------------
    // _buildWeld  (internal)
    // Welds vertices that share the same world position (using a string key
    // with fixed precision) and builds a triangle adjacency map between them.
    // -----------------------------------------------------------------------
    _buildWeld(positions, vCount){
        const vertexMap   = new Map();   // posKey -> unique index
        const uniqueVerts = [];          // [{x,y,z}]
        const triIndices  = new Int32Array(vCount);

        for(let vi = 0; vi < vCount; vi++){
            const x = positions[vi * 3    ];
            const y = positions[vi * 3 + 1];
            const z = positions[vi * 3 + 2];
            const key = `${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`;
            let idx = vertexMap.get(key);
            if(idx === undefined){
                idx = uniqueVerts.length;
                uniqueVerts.push({ x, y, z });
                vertexMap.set(key, idx);
            }
            triIndices[vi] = idx;
        }

        // Build triangle-edge adjacency between unique vertices.
        const adjMap = new Array(uniqueVerts.length);
        for(let i = 0; i < adjMap.length; i++) adjMap[i] = new Set();

        for(let ti = 0; ti < vCount; ti += 3){
            const a = triIndices[ti    ];
            const b = triIndices[ti + 1];
            const c = triIndices[ti + 2];
            adjMap[a].add(b); adjMap[a].add(c);
            adjMap[b].add(a); adjMap[b].add(c);
            adjMap[c].add(a); adjMap[c].add(b);
        }

        return { uniqueVerts, triIndices, adjMap };
    },

    _rebuildCollisionIndex(){
        const mesh = g.hexmap.meshGen.mesh;
        if(!mesh || !mesh.positions || !mesh.positions.data){
            return;
        }

        const pos = mesh.positions.data;
        const vCount = mesh.vertexCount;
        const tileTris = {};
        const allTris = [];
        const minUpDot = Math.max(0.0, Math.min(1.0, g.hexmap.meshGen.minWalkableUpDot || 0.0));
        const tileTypeMap = g.hexmap.HexMapManager.tileTypeMap || {};

        const isWalkableType = (type) => {
            return type === 'room' || type === 'hall' || type === 'door'
                || type === 'stairs-start' || type === 'stairs-end';
        };

        for(let vi = 0; vi < vCount; vi += 3){
            const ai = vi * 3;
            const bi = (vi + 1) * 3;
            const ci = (vi + 2) * 3;

            const ax = pos[ai    ], ay = pos[ai + 1], az = pos[ai + 2];
            const bx = pos[bi    ], by = pos[bi + 1], bz = pos[bi + 2];
            const cx = pos[ci    ], cy = pos[ci + 1], cz = pos[ci + 2];

            const abx = bx - ax, aby = by - ay, abz = bz - az;
            const acx = cx - ax, acy = cy - ay, acz = cz - az;
            const nx = aby * acz - abz * acy;
            const ny = abz * acx - abx * acz;
            const nz = abx * acy - aby * acx;
            const nLen = Math.hypot(nx, ny, nz);
            if(nLen < 0.00001) continue;

            const upDot = Math.abs(nz) / nLen;
            if(upDot < minUpDot) continue;

            const mx = (ax + bx + cx) / 3;
            const my = (ay + by + cy) / 3;
            const [q, r] = g.hexmap.worldToHex(mx, my);
            const tileType = tileTypeMap[`${q},${r}`];
            if(!isWalkableType(tileType)) continue;

            const key = `${q},${r}`;
            if(!tileTris[key]) tileTris[key] = [];
            tileTris[key].push(vi);
            allTris.push(vi);
        }

        mesh._collisionTileTris = tileTris;
        mesh._collisionAllTris = allTris;
    },

    _isPointInTri2D(px, py, ax, ay, bx, by, cx, cy){
        const denom = ((by - cy) * (ax - cx) + (cx - bx) * (ay - cy));
        if(Math.abs(denom) < 0.000001) return null;

        const w1 = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denom;
        const w2 = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denom;
        const w3 = 1 - w1 - w2;
        const eps = -0.00001;
        if(w1 < eps || w2 < eps || w3 < eps) return null;

        return [w1, w2, w3];
    },

    getSurfaceZAt(x, y, fallbackZ, referenceZ){
        const mesh = g.hexmap.meshGen.mesh;
        if(!mesh || !g.hexmap.meshGen.enabled) return fallbackZ;

        const pos = mesh.positions.data;
        const tileTris = mesh._collisionTileTris || {};
        const allTris = mesh._collisionAllTris || [];
        const [q, r] = g.hexmap.worldToHex(x, y);
        const key = `${q},${r}`;

        const candidates = tileTris[key] || allTris;
        if(!candidates || candidates.length === 0) return fallbackZ;

        let found = false;
        let bestZ = fallbackZ;
        let bestScore = Infinity;
        let hasStepCandidate = false;
        let bestStepZ = -Infinity;
        const ref = Number.isFinite(referenceZ) ? referenceZ : null;
        const maxStepUp = Math.max(0.01, g.hexmap.meshGen.maxStepUpFromReference || 0.01);

        for(let i = 0; i < candidates.length; i++){
            const vi = candidates[i];
            const ai = vi * 3;
            const bi = (vi + 1) * 3;
            const ci = (vi + 2) * 3;

            const ax = pos[ai    ], ay = pos[ai + 1], az = pos[ai + 2];
            const bx = pos[bi    ], by = pos[bi + 1], bz = pos[bi + 2];
            const cx = pos[ci    ], cy = pos[ci + 1], cz = pos[ci + 2];

            const w = g.hexmap.meshGen._isPointInTri2D(x, y, ax, ay, bx, by, cx, cy);
            if(!w) continue;

            const z = w[0] * az + w[1] * bz + w[2] * cz;

            if(ref !== null){
                if(z <= ref + maxStepUp && z > bestStepZ){
                    bestStepZ = z;
                    hasStepCandidate = true;
                }

                const score = Math.abs(z - ref);
                if(score < bestScore){
                    bestScore = score;
                    bestZ = z;
                    found = true;
                }
            } else if(!found || z > bestZ){
                bestZ = z;
                found = true;
            }
        }

        if(ref !== null && hasStepCandidate){
            return bestStepZ;
        }

        return found ? bestZ : fallbackZ;
    },

    // -----------------------------------------------------------------------
    // _draw  (registered as a canvas draw handler)
    // -----------------------------------------------------------------------
    _draw(){
        const mesh = g.hexmap.meshGen.mesh;
        if(!mesh || !g.hexmap.meshGen.enabled) return;

        const mvp    = g.renderer.createModelViewProjection([0, 0, 0], [0, 0, 0]);
        const lightU = g.hexmap._getLightUniforms();

        g.renderer.submit({
            program: g.hexmap.fillProgram,
            mode:    'TRIANGLES',
            count:   mesh.vertexCount,
            attributes: {
                a_position: mesh.positions,
                a_color:    mesh.colors,
            },
            uniforms: {
                u_modelViewProjection: { type: 'mat4',       value: mvp },
                u_lightCount:          { type: 'int',        value: lightU.count },
                u_lightPos:            { type: 'vec3Array',  value: lightU.pos },
                u_lightColor:          { type: 'vec3Array',  value: lightU.col },
                u_lightRadius:         { type: 'floatArray', value: lightU.radius },
                u_ambient:             { type: 'float',      value: g.hexmap.ambientLight },
                u_time:                { type: 'float',      value: performance.now() },
            },
        });
    },
};

g.loadHandlers.push(g.hexmap.meshGen.load);
