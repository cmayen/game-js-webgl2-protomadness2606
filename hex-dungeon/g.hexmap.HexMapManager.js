g.hexmap.HexMapManager = {
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
        roomCountMin: 12,
        roomCountMax: 22,
        roomMinW: 3,
        roomMaxW: 8,
        roomMinH: 3,
        roomMaxH: 8,
        roomPadding: 1,
        maxRoomPlacementAttempts: 700,
        windingChance: 0.15,
        floorHeight: 0.08,
        wallHeight: 1.50,
        straightWallsInRooms: false,
        hallTorchDensityMultiplier: 1.0,
        roomTorchDensityMultiplier: 1.0,
    },

    _rngState: 42,
    _initRng(seed){
        g.hexmap.HexMapManager._rngState = seed % 2147483647;
        if(g.hexmap.HexMapManager._rngState <= 0) g.hexmap.HexMapManager._rngState += 2147483646;
        for(let i = 0; i < 10; i++) g.hexmap.HexMapManager._rand();
    },
    _rand(){
        g.hexmap.HexMapManager._rngState = (g.hexmap.HexMapManager._rngState * 16807) % 2147483647;
        return (g.hexmap.HexMapManager._rngState - 1) / 2147483646;
    },

    _key(q, r){ return `${q},${r}`; },

    generate(radius, seed){
        const mgr = g.hexmap.HexMapManager;
        const B = g.hexmap.BIOME;
        const map = {};
        const tileTypeMap = {};
        const directHeights = {};
        const roomByKey = {};
        const roomCenters = [];
        const torches = [];

        mgr._initRng(seed);
        const rand = () => mgr._rand();
        const randInt = (min, max) => min + Math.floor(rand() * (max - min + 1));

        const inBounds = (q, r) => Math.abs(q) <= radius && Math.abs(r) <= radius && Math.abs(q + r) <= radius;
        const key = (q, r) => mgr._key(q, r);
        const setTile = (q, r, biome, type, h) => {
            if(!inBounds(q, r)) return;
            const k = key(q, r);
            map[k] = biome;
            tileTypeMap[k] = type;
            directHeights[k] = h;
        };
        const hasTile = (q, r) => map[key(q, r)] !== undefined;

        const isWalkableType = (type) =>
            type === 'room' || type === 'hall' || type === 'door' || type === 'stairs-start' || type === 'stairs-end';

        const edgeNeighbors = [
            [1, 0], [0, 1], [-1, 1],
            [-1, 0], [0, -1], [1, -1],
        ];

        const roomArea = (room) => {
            const tiles = [];
            for(let q = room.q0; q < room.q0 + room.w; q++){
                for(let r = room.r0; r < room.r0 + room.h; r++){
                    if(inBounds(q, r)) tiles.push([q, r]);
                }
            }
            return tiles;
        };

        const roomAreaWithPadding = (room, pad) => {
            const tiles = [];
            for(let q = room.q0 - pad; q < room.q0 + room.w + pad; q++){
                for(let r = room.r0 - pad; r < room.r0 + room.h + pad; r++){
                    if(inBounds(q, r)) tiles.push([q, r]);
                }
            }
            return tiles;
        };

        const roomFits = (room, pad) => {
            const padded = roomAreaWithPadding(room, pad);
            if(padded.length === 0) return false;
            for(const [q, r] of padded){
                if(hasTile(q, r)) return false;
            }
            return true;
        };

        const placeRooms = () => {
            const desired = randInt(mgr.config.roomCountMin, mgr.config.roomCountMax);
            let attempts = 0;
            while(roomCenters.length < desired && attempts < mgr.config.maxRoomPlacementAttempts){
                attempts++;
                const w = randInt(mgr.config.roomMinW, mgr.config.roomMaxW);
                const h = randInt(mgr.config.roomMinH, mgr.config.roomMaxH);

                const q0 = randInt(-radius + 1, radius - 1);
                const r0 = randInt(-radius + 1, radius - 1);
                const room = { id: roomCenters.length, q0, r0, w, h };

                const rawArea = roomArea(room);
                if(rawArea.length < Math.floor(w * h * 0.65)) continue;
                if(!roomFits(room, mgr.config.roomPadding)) continue;

                for(const [q, r] of rawArea){
                    const k = key(q, r);
                    setTile(q, r, B.RoomFloor, 'room', mgr.config.floorHeight);
                    roomByKey[k] = room.id;
                }

                const targetQ = q0 + (w - 1) * 0.5;
                const targetR = r0 + (h - 1) * 0.5;
                let cQ = rawArea[0][0];
                let cR = rawArea[0][1];
                let best = Infinity;
                for(const [aq, ar] of rawArea){
                    const d = Math.abs(aq - targetQ) + Math.abs(ar - targetR);
                    if(d < best){
                        best = d;
                        cQ = aq;
                        cR = ar;
                    }
                }
                roomCenters.push({
                    id: room.id,
                    q: cQ,
                    r: cR,
                    q0,
                    r0,
                    w,
                    h,
                });
            }
        };

        const corridorPath = (start, goal, windingChance) => {
            const gScore = {};
            const fScore = {};
            const cameFrom = {};
            const open = new Set();

            const startK = key(start[0], start[1]);
            const goalK = key(goal[0], goal[1]);
            gScore[startK] = 0;
            fScore[startK] = g.hexmap.hexDistance(start[0], start[1], goal[0], goal[1]);
            open.add(startK);

            while(open.size > 0){
                let currentK = null;
                let bestF = Infinity;
                for(const k of open){
                    const f = fScore[k] !== undefined ? fScore[k] : Infinity;
                    if(f < bestF){
                        bestF = f;
                        currentK = k;
                    }
                }
                if(currentK === goalK) break;
                if(currentK === null) break;

                open.delete(currentK);
                const [cq, cr] = currentK.split(',').map(Number);
                const nbs = g.hexmap.hexNeighbors(cq, cr);
                for(const [nq, nr] of nbs){
                    if(!inBounds(nq, nr)) continue;
                    const nk = key(nq, nr);
                    const walkBias = hasTile(nq, nr) ? 0.0 : 0.12;
                    const noise = rand() * windingChance * 2.5;
                    const tentative = gScore[currentK] + 1 + walkBias + noise;

                    if(tentative < (gScore[nk] !== undefined ? gScore[nk] : Infinity)){
                        cameFrom[nk] = currentK;
                        gScore[nk] = tentative;
                        fScore[nk] = tentative + g.hexmap.hexDistance(nq, nr, goal[0], goal[1]);
                        open.add(nk);
                    }
                }
            }

            if(!cameFrom[goalK]){
                return [start, goal];
            }

            const path = [];
            let cursor = goalK;
            while(cursor){
                const [q, r] = cursor.split(',').map(Number);
                path.push([q, r]);
                cursor = cameFrom[cursor];
            }
            path.reverse();
            return path;
        };

        const connectRooms = () => {
            if(roomCenters.length <= 1) return;

            const connected = new Set([roomCenters[0].id]);
            const edges = [];

            while(connected.size < roomCenters.length){
                let best = null;
                for(const a of roomCenters){
                    if(!connected.has(a.id)) continue;
                    for(const b of roomCenters){
                        if(connected.has(b.id)) continue;
                        const d = g.hexmap.hexDistance(a.q, a.r, b.q, b.r);
                        if(!best || d < best.d){
                            best = { a, b, d };
                        }
                    }
                }
                if(!best) break;
                edges.push(best);
                connected.add(best.b.id);
            }

            for(const edge of edges){
                const path = corridorPath([edge.a.q, edge.a.r], [edge.b.q, edge.b.r], mgr.config.windingChance);
                for(let i = 0; i < path.length; i++){
                    const [q, r] = path[i];
                    const k = key(q, r);
                    const inA = roomByKey[k] === edge.a.id;
                    const inB = roomByKey[k] === edge.b.id;
                    const prev = i > 0 ? path[i - 1] : null;
                    const next = i < path.length - 1 ? path[i + 1] : null;

                    if(inA || inB){
                        const prevInRoom = prev ? roomByKey[key(prev[0], prev[1])] === roomByKey[k] : false;
                        const nextInRoom = next ? roomByKey[key(next[0], next[1])] === roomByKey[k] : false;
                        const boundaryDoor = (!prevInRoom && prev) || (!nextInRoom && next);
                        if(boundaryDoor){
                            setTile(q, r, B.Door, 'door', mgr.config.floorHeight);
                        }
                        continue;
                    }

                    if(tileTypeMap[k] !== 'door'){
                        setTile(q, r, B.HallFloor, 'hall', mgr.config.floorHeight);
                    }
                }
            }
        };

        const placeStairs = () => {
            if(roomCenters.length === 0) return;
            if(roomCenters.length === 1){
                const c = roomCenters[0];
                setTile(c.q, c.r, B.StairsStart, 'stairs-start', mgr.config.floorHeight);
                return;
            }

            let best = null;
            for(let i = 0; i < roomCenters.length; i++){
                for(let j = i + 1; j < roomCenters.length; j++){
                    const a = roomCenters[i];
                    const b = roomCenters[j];
                    const d = g.hexmap.hexDistance(a.q, a.r, b.q, b.r);
                    if(!best || d > best.d) best = { a, b, d };
                }
            }
            if(!best) return;

            setTile(best.a.q, best.a.r, B.StairsStart, 'stairs-start', mgr.config.floorHeight);
            setTile(best.b.q, best.b.r, B.StairsEnd, 'stairs-end', mgr.config.floorHeight);
        };

        const chooseTorchEdge = (q, r) => {
            const boundaryEdges = [];
            for(let i = 0; i < edgeNeighbors.length; i++){
                const [dq, dr] = edgeNeighbors[i];
                const nType = tileTypeMap[key(q + dq, r + dr)];
                if(!isWalkableType(nType)) boundaryEdges.push(i);
            }
            if(boundaryEdges.length === 0) return null;
            return boundaryEdges[Math.floor(rand() * boundaryEdges.length)];
        };

        const placeTorches = () => {
            const minHallSpacing = 4;
            const minRoomSpacing = 6;
            const chosen = [];

            const tooClose = (q, r, minDist) => {
                for(const t of chosen){
                    if(g.hexmap.hexDistance(q, r, t.q, t.r) < minDist) return true;
                }
                return false;
            };

            const addTorch = (q, r, kind, minDist) => {
                const edge = chooseTorchEdge(q, r);
                if(edge === null) return;
                if(tooClose(q, r, minDist)) return;
                torches.push({ q, r, edge, kind });
                chosen.push({ q, r });
            };

            const corridorCandidates = [];
            const roomCandidates = [];

            for(const k in tileTypeMap){
                const type = tileTypeMap[k];
                if(!isWalkableType(type)) continue;
                const [q, r] = k.split(',').map(Number);

                let walkableN = 0;
                let boundaryN = 0;
                for(const [dq, dr] of edgeNeighbors){
                    const nType = tileTypeMap[key(q + dq, r + dr)];
                    if(isWalkableType(nType)) walkableN++;
                    else boundaryN++;
                }
                if(boundaryN === 0) continue;

                if(type === 'hall' || type === 'door'){
                    // Hall/door tiles that touch boundary are the most natural torch spots.
                    corridorCandidates.push({ q, r, weight: type === 'door' ? 3 : (walkableN <= 3 ? 2 : 1) });
                } else if(type === 'room'){
                    // Room perimeter: occasional torches to break darkness in larger rooms.
                    if(boundaryN >= 1 && walkableN >= 3){
                        roomCandidates.push({ q, r, weight: 1 });
                    }
                }
            }

            const weightedShuffle = (arr) => {
                const out = [];
                const pool = arr.slice();
                while(pool.length > 0){
                    let total = 0;
                    for(const p of pool) total += p.weight;
                    let pick = rand() * total;
                    let idx = 0;
                    for(; idx < pool.length; idx++){
                        pick -= pool[idx].weight;
                        if(pick <= 0) break;
                    }
                    out.push(pool[Math.min(idx, pool.length - 1)]);
                    pool.splice(Math.min(idx, pool.length - 1), 1);
                }
                return out;
            };

            const hallMul = Math.max(0, mgr.config.hallTorchDensityMultiplier || 0);
            const roomMul = Math.max(0, mgr.config.roomTorchDensityMultiplier || 0);
            const hallBase = Math.max(6, Math.floor(corridorCandidates.length / 12));
            const roomBase = Math.max(2, Math.floor(roomCandidates.length / 40));
            const hallBudget = Math.max(0, Math.floor(hallBase * hallMul));
            const roomBudget = Math.max(0, Math.floor(roomBase * roomMul));

            const hallOrdered = weightedShuffle(corridorCandidates);
            const roomOrdered = weightedShuffle(roomCandidates);

            for(const c of hallOrdered){
                if(torches.length >= hallBudget) break;
                addTorch(c.q, c.r, 'hall', minHallSpacing);
            }

            const torchCountBeforeRooms = torches.length;
            for(const c of roomOrdered){
                if(torches.length - torchCountBeforeRooms >= roomBudget) break;
                addTorch(c.q, c.r, 'room', minRoomSpacing);
            }
        };

        const countBoundaryWallFaces = () => {
            let faces = 0;
            for(const k in tileTypeMap){
                if(!isWalkableType(tileTypeMap[k])) continue;
                const [q, r] = k.split(',').map(Number);
                for(const [nq, nr] of g.hexmap.hexNeighbors(q, r)){
                    const nk = key(nq, nr);
                    if(!isWalkableType(tileTypeMap[nk])){
                        faces++;
                    }
                }
            }
            return faces;
        };

        const ensureConnectivity = () => {
            const roomIds = new Set(Object.values(roomByKey));
            if(roomIds.size <= 1) return;

            const roomAdj = {};
            for(const id of roomIds) roomAdj[id] = new Set();

            const isCorridorish = (type) => type === 'hall' || type === 'door' || type === 'stairs-start' || type === 'stairs-end';
            for(const k in tileTypeMap){
                if(!isCorridorish(tileTypeMap[k])) continue;
                const [q, r] = k.split(',').map(Number);
                const touchingRooms = new Set();
                for(const [nq, nr] of g.hexmap.hexNeighbors(q, r)){
                    const rid = roomByKey[key(nq, nr)];
                    if(rid !== undefined) touchingRooms.add(rid);
                }
                const arr = [...touchingRooms];
                for(let i = 0; i < arr.length; i++){
                    for(let j = i + 1; j < arr.length; j++){
                        roomAdj[arr[i]].add(arr[j]);
                        roomAdj[arr[j]].add(arr[i]);
                    }
                }
            }

            const allIds = [...roomIds];
            const seen = new Set();
            const queue = [allIds[0]];
            seen.add(allIds[0]);
            while(queue.length > 0){
                const id = queue.shift();
                for(const n of roomAdj[id]){
                    if(seen.has(n)) continue;
                    seen.add(n);
                    queue.push(n);
                }
            }

            if(seen.size === allIds.length) return;

            for(const missingId of allIds){
                if(seen.has(missingId)) continue;
                const missing = roomCenters.find((r) => r.id === missingId);
                const anchor = roomCenters.find((r) => seen.has(r.id));
                if(!missing || !anchor) continue;

                const path = corridorPath([missing.q, missing.r], [anchor.q, anchor.r], 0.02);
                for(const [q, r] of path){
                    const k = key(q, r);
                    if(roomByKey[k] !== undefined){
                        setTile(q, r, B.Door, 'door', mgr.config.floorHeight);
                    } else {
                        setTile(q, r, B.HallFloor, 'hall', mgr.config.floorHeight);
                    }
                }
                seen.add(missingId);
            }
        };

        placeRooms();
        connectRooms();
        ensureConnectivity();
        placeStairs();
        placeTorches();

        mgr.biomeMap = map;
        mgr.heightOverrides = {};
        mgr.directHeights = directHeights;
        mgr.tileTypeMap = tileTypeMap;
        mgr.lockedTiles = new Set();
        mgr.roomCenters = roomCenters;
        mgr.roomByKey = roomByKey;
        mgr.torches = torches;

        const values = Object.values(tileTypeMap);
        const floorCount = values.filter((v) => v === 'room' || v === 'hall').length;
        const corridorCount = values.filter((v) => v === 'hall').length;
        const doorCount = values.filter((v) => v === 'door').length;
        const wallCount = countBoundaryWallFaces();
        const stairsCount = values.filter((v) => v === 'stairs-start' || v === 'stairs-end').length;
        const walkableCount = values.filter((v) => isWalkableType(v)).length;

        mgr.stats = {
            roomCount: roomCenters.length,
            corridorCount,
            doorCount,
            wallCount,
            floorCount,
            stairsCount,
            torchCount: torches.length,
            walkableCount,
            tileCount: values.length,
            windingChance: mgr.config.windingChance,
        };

        return map;
    },
};
