
g.hexmap.HexMapTile = class HexMapTile {
    constructor(q, r){
        this.q = q;
        this.r = r;
        const [cx, cy] = g.hexmap.hexToWorld(q, r);
        this.cx = cx;
        this.cy = cy;

        const biomeMap = g.hexmap.HexMapManager && g.hexmap.HexMapManager.biomeMap;
        const directHeights = g.hexmap.HexMapManager && g.hexmap.HexMapManager.directHeights;
        const tileTypeMap = g.hexmap.HexMapManager && g.hexmap.HexMapManager.tileTypeMap;
        const key = `${q},${r}`;

        if(biomeMap && biomeMap[key] !== undefined && biomeMap[key] >= 0){
            this.biomeIndex = biomeMap[key];
            const biome = g.hexmap.biomes[this.biomeIndex];
            this.color = biome.color;
            this.h = (directHeights && directHeights[key] !== undefined)
                ? directHeights[key]
                : biome.heightRange[0];
            this.tileType = tileTypeMap && tileTypeMap[key] ? tileTypeMap[key] : 'unknown';
        } else {
            this.h = g.hexmap.getHeight(q, r);
            this.color = g.hexmap.getBiomeColor(this.h);
            this.biomeIndex = -1;
            this.tileType = 'unknown';
        }
        this.zTop = g.hexmap.baseHeight + this.h * 4.20;
    }

    getCorners(){
        const corners = [];
        for(let i = 0; i < 6; i++){
            corners.push(g.hexmap.hexCorner(this.cx, this.cy, i));
        }
        return corners;
    }

    _neighborTile(nq, nr){
        return g.hexmap.tiles[`${nq},${nr}`] || null;
    }

    buildGeometry(triPositions, triColors, edgePositions){
        const zTop = this.zTop;
        const color = this.color;
        const cx = this.cx;
        const cy = this.cy;
        const corners = this.getCorners();
        const cfg = (g.hexmap.HexMapManager && g.hexmap.HexMapManager.config)
            ? g.hexmap.HexMapManager.config : null;
        const wallH = cfg ? cfg.wallHeight : 0.50;
        const wallTop = zTop + wallH;
        const allowRoomStraightWalls = cfg ? !!cfg.straightWallsInRooms : false;

        const topColor = color;
        // Fixed stone wall colours — independent of floor tile colour
        const wallColorBot = [0.18, 0.17, 0.16, 1.0];
        const wallColorTop = [0.30, 0.29, 0.27, 1.0];

        // --- top face (6 triangles, fan from center) ---
        for(let i = 0; i < 6; i++){
            const next = (i + 1) % 6;
            triPositions.push(
                cx, cy, zTop,
                corners[i][0], corners[i][1], zTop,
                corners[next][0], corners[next][1], zTop,
            );
            triColors.push(...topColor, ...topColor, ...topColor);
        }

        // Correct edge → neighbor for pointy-top axial hex (XY plane, Z-up)
        // Edge i spans corner[i] → corner[(i+1)%6]; face centre angle = 60*i degrees
        // Derivation: hexToWorld gives neighbour offsets that confirm each angle.
        // Correct edge → neighbor for pointy-top axial hex (XY plane, Z-up)
        const sideNeighbors = [
            [this.q + 1, this.r    ],  // edge 0 →   0° (East)
            [this.q,     this.r + 1],  // edge 1 →  60°
            [this.q - 1, this.r + 1],  // edge 2 → 120°
            [this.q - 1, this.r    ],  // edge 3 → 180° (West)
            [this.q,     this.r - 1],  // edge 4 → 240°
            [this.q + 1, this.r - 1],  // edge 5 → 300°
        ];

        // Precompute which edges have a neighbour tile
        const hasNeighbor = sideNeighbors.map(([nq, nr]) => this._neighborTile(nq, nr) !== null);

        // Straight-wall pairs: [edgeA, edgeB, axisEdge1, axisEdge2]
        // When a tile has neighbours on BOTH opposite axis edges (axisEdge1 & axisEdge2),
        // and both pair edges (a, b) are open boundary, merge them into one straight wall:
        //   corners[a] → corners[(b+1)%6]  (skipping the jutting peak corner in between).
        // This makes collinear tiles produce flat, seamless corridor walls instead of zigzags.
        const straightPairs = [
            [1, 2, 0, 3],  // EW axis,   N side: corners[1]→corners[3]
            [4, 5, 0, 3],  // EW axis,   S side: corners[4]→corners[0]
            [2, 3, 1, 4],  // NESW axis, NW side: corners[2]→corners[4]
            [5, 0, 1, 4],  // NESW axis, SE side: corners[5]→corners[1]
            [3, 4, 2, 5],  // NWSE axis, SW side: corners[3]→corners[5]
            [0, 1, 2, 5],  // NWSE axis, NE side: corners[0]→corners[2]
        ];

        const consumed = new Array(6).fill(false);

        const _pushWall = (c0, c1) => {
            triPositions.push(
                c0[0], c0[1], zTop,
                c1[0], c1[1], wallTop,
                c1[0], c1[1], zTop,
            );
            triPositions.push(
                c0[0], c0[1], zTop,
                c0[0], c0[1], wallTop,
                c1[0], c1[1], wallTop,
            );
            triColors.push(
                ...wallColorBot, ...wallColorTop, ...wallColorBot,
                ...wallColorBot, ...wallColorTop, ...wallColorTop,
            );
            edgePositions.push(c0[0], c0[1], zTop,    c0[0], c0[1], wallTop);
            edgePositions.push(c0[0], c0[1], wallTop,  c1[0], c1[1], wallTop);
            edgePositions.push(c1[0], c1[1], wallTop,  c1[0], c1[1], zTop);
        };

        // --- straight walls (merged bumpy pairs) ---
        // Hallways/doors/stairs always use straight wall merges.
        // Rooms only use them when explicitly enabled in config.
        const tileCanUseStraightWalls = this.tileType !== 'room' || allowRoomStraightWalls;
        if(tileCanUseStraightWalls){
            for(const [a, b, ax1, ax2] of straightPairs){
                if(!hasNeighbor[a] && !hasNeighbor[b] && hasNeighbor[ax1] && hasNeighbor[ax2]){
                    consumed[a] = true;
                    consumed[b] = true;
                    _pushWall(corners[a], corners[(b + 1) % 6]);
                }
            }
        }

        // --- normal hex-edge walls for unconsumed boundary edges ---
        for(let i = 0; i < 6; i++){
            if(consumed[i] || hasNeighbor[i]) continue;
            _pushWall(corners[i], corners[(i + 1) % 6]);
        }

        // --- wireframe: top face perimeter ---
        for(let i = 0; i < 6; i++){
            const next = (i + 1) % 6;
            edgePositions.push(
                corners[i][0], corners[i][1], zTop,
                corners[next][0], corners[next][1], zTop,
            );
        }
    }

    buildGlowGeometry(){
        const gl = g.canvas.gl;
        const z = this.zTop + 0.02;
        const cx = this.cx;
        const cy = this.cy;
        const glowOuter = [1.0, 0.75, 0.25, 0.85];
        const glowInner = [1.0, 0.75, 0.25, 0.0];
        const insetScale = 0.7;
        const triPos = [];
        const triCol = [];
        const edgePos = [];
        const outerCorners = this.getCorners();
        const innerCorners = [];
        for(let i = 0; i < 6; i++){
            const oc = outerCorners[i];
            innerCorners.push([
                cx + (oc[0] - cx) * insetScale,
                cy + (oc[1] - cy) * insetScale,
            ]);
        }
        for(let i = 0; i < 6; i++){
            const next = (i + 1) % 6;
            const o0 = outerCorners[i], o1 = outerCorners[next];
            const i0 = innerCorners[i], i1 = innerCorners[next];
            triPos.push(
                o0[0], o0[1], z, o1[0], o1[1], z, i1[0], i1[1], z,
                o0[0], o0[1], z, i1[0], i1[1], z, i0[0], i0[1], z,
            );
            triCol.push(
                ...glowOuter, ...glowOuter, ...glowInner,
                ...glowOuter, ...glowInner, ...glowInner,
            );
            edgePos.push(
                o0[0], o0[1], z + 0.01,
                o1[0], o1[1], z + 0.01,
            );
        }
        // delete old buffers
        if(g.hexmap._glowGeometry){
            if(g.hexmap._glowGeometry.positions.buffer){ gl.deleteBuffer(g.hexmap._glowGeometry.positions.buffer); }
            if(g.hexmap._glowGeometry.colors.buffer){ gl.deleteBuffer(g.hexmap._glowGeometry.colors.buffer); }
            if(g.hexmap._glowGeometry.edges.buffer){ gl.deleteBuffer(g.hexmap._glowGeometry.edges.buffer); }
        }
        return {
            positions: { data: new Float32Array(triPos), size: 3 },
            colors: { data: new Float32Array(triCol), size: 4 },
            edges: { data: new Float32Array(edgePos), size: 3 },
            vertexCount: triPos.length / 3,
            edgeVertexCount: edgePos.length / 3,
        };
    }
};
