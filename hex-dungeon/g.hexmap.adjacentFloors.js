// g.hexmap.adjacentFloors.js
// Builds and renders the floor above and below the active dungeon floor.
// Uses manager clones so each adjacent floor keeps independent generation state.

g.hexmap.adjacentFloors = {
    floorSpacing: 5.0,
    below: null,
    above: null,

    _isRefreshing: false,
    _isWrapped: false,
    _originalCreateGeometry: null,

    load(){
        g.hexmap.adjacentFloors._wrapCreateGeometry();
        g.hexmap.adjacentFloors.refresh();
        g.canvas.registerDrawHandler(g.hexmap.adjacentFloors.draw);
    },

    _wrapCreateGeometry(){
        const mod = g.hexmap.adjacentFloors;
        if(mod._isWrapped) return;

        mod._originalCreateGeometry = g.hexmap.createGeometry;
        g.hexmap.createGeometry = function(){
            const geometry = mod._originalCreateGeometry.apply(g.hexmap, arguments);
            if(!mod._isRefreshing){
                mod.refresh();
            }
            return geometry;
        };

        mod._isWrapped = true;
    },

    _createManagerClone(){
        const base = g.hexmap.HexMapManager;
        return {
            biomeMap: {},
            heightOverrides: {},
            directHeights: {},
            tileTypeMap: {},
            lockedTiles: new Set(),
            roomCenters: [],
            roomByKey: {},
            torches: [],
            stats: {
                roomCount: 0,
                corridorCount: 0,
                doorCount: 0,
                wallCount: 0,
                floorCount: 0,
                stairsCount: 0,
                torchCount: 0,
                walkableCount: 0,
                tileCount: 0,
                windingChance: 0,
            },
            config: {
                roomCountMin: base.config.roomCountMin,
                roomCountMax: base.config.roomCountMax,
                roomMinW: base.config.roomMinW,
                roomMaxW: base.config.roomMaxW,
                roomMinH: base.config.roomMinH,
                roomMaxH: base.config.roomMaxH,
                roomPadding: base.config.roomPadding,
                maxRoomPlacementAttempts: base.config.maxRoomPlacementAttempts,
                windingChance: base.config.windingChance,
                floorHeight: base.config.floorHeight,
                wallHeight: base.config.wallHeight,
                straightWallsInRooms: base.config.straightWallsInRooms,
                hallTorchDensityMultiplier: base.config.hallTorchDensityMultiplier,
                roomTorchDensityMultiplier: base.config.roomTorchDensityMultiplier,
            },
            _rngState: base._rngState,
            _initRng: base._initRng,
            _rand: base._rand,
            _key: base._key,
            generate: base.generate,
        };
    },

    _buildGeometryForManager(manager){
        const triPositions = [];
        const triColors = [];
        const edgePositions = [];
        const localTiles = {};

        const prevManager = g.hexmap.HexMapManager;
        const prevTiles = g.hexmap.tiles;

        try {
            g.hexmap.HexMapManager = manager;

            const biomeMap = manager.biomeMap;
            for(const coordKey in biomeMap){
                const parts = coordKey.split(',');
                const q = Number(parts[0]);
                const r = Number(parts[1]);
                localTiles[coordKey] = new g.hexmap.HexMapTile(q, r);
            }

            g.hexmap.tiles = localTiles;
            for(const coordKey in localTiles){
                localTiles[coordKey].buildGeometry(triPositions, triColors, edgePositions);
            }
        } finally {
            g.hexmap.HexMapManager = prevManager;
            g.hexmap.tiles = prevTiles;
        }

        return {
            positions: { data: new Float32Array(triPositions), size: 3 },
            colors: { data: new Float32Array(triColors), size: 4 },
            edges: { data: new Float32Array(edgePositions), size: 3 },
            vertexCount: triPositions.length / 3,
            edgeVertexCount: edgePositions.length / 3,
        };
    },

    _generateFloorData(seed){
        const manager = g.hexmap.adjacentFloors._createManagerClone();
        const prevManager = g.hexmap.HexMapManager;

        try {
            g.hexmap.HexMapManager = manager;
            manager.generate(g.hexmap.radius, seed);
        } finally {
            g.hexmap.HexMapManager = prevManager;
        }

        const geometry = g.hexmap.adjacentFloors._buildGeometryForManager(manager);
        return { seed, manager, geometry };
    },

    refresh(){
        const mod = g.hexmap.adjacentFloors;
        mod._isRefreshing = true;
        try {
            const currentSeed = Math.floor(g.hexmap.seed || 0);
            mod.below = mod._generateFloorData(currentSeed - 1);
            mod.above = mod._generateFloorData(currentSeed + 1);
        } finally {
            mod._isRefreshing = false;
        }
    },

    _submitFloor(floorData, zOffset){
        if(!floorData || !floorData.geometry || floorData.geometry.vertexCount <= 0){
            return;
        }

        const geometry = floorData.geometry;
        const modelViewProjection = g.renderer.createModelViewProjection([0, 0, zOffset], [0, 0, 0]);
        const lightU = g.hexmap._getLightUniforms();

        g.renderer.submit({
            program: g.hexmap.fillProgram,
            mode: 'TRIANGLES',
            count: geometry.vertexCount,
            attributes: {
                a_position: geometry.positions,
                a_color: geometry.colors,
            },
            uniforms: {
                u_modelViewProjection: { type: 'mat4', value: modelViewProjection },
                u_lightCount: { type: 'int', value: lightU.count },
                u_lightPos: { type: 'vec3Array', value: lightU.pos },
                u_lightColor: { type: 'vec3Array', value: lightU.col },
                u_lightRadius: { type: 'floatArray', value: lightU.radius },
                u_ambient: { type: 'float', value: g.hexmap.ambientLight * 0.7 },
                u_time: { type: 'float', value: performance.now() },
            },
            state: {
                polygonOffset: [1, 1],
            },
        });

        if(g.hexmap._showWireframe){
            g.renderer.submit({
                program: g.hexmap.wireProgram,
                mode: 'LINES',
                count: geometry.edgeVertexCount,
                attributes: {
                    a_position: geometry.edges,
                },
                uniforms: {
                    u_modelViewProjection: { type: 'mat4', value: modelViewProjection },
                    u_color: { type: 'vec4', value: [0.80, 0.84, 0.90, 0.22] },
                },
            });
        }
    },

    draw(){
        const mod = g.hexmap.adjacentFloors;
        const spacing = mod.floorSpacing;

        mod._submitFloor(mod.below, -spacing);
        mod._submitFloor(mod.above, spacing);
    },
};

g.loadHandlers.push(g.hexmap.adjacentFloors.load);
