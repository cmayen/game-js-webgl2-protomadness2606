
//  g.map 3×3×3 grid of tiles with infinite recycling
g.map = {
    tiles: [],
    tileSize: config.world.tileSize,
    gridOrigin: { x:0, y:0, z:0 },
    pos: g.math.v3(0, 1.6, 5),

    palette: [
        new Float32Array([0.906, 0.298, 0.235]),  // #e74c3c
        new Float32Array([0.204, 0.596, 0.859]),  // #3498db
        new Float32Array([0.180, 0.800, 0.443]),  // #2ecc71
        new Float32Array([0.945, 0.769, 0.059]),  // #f1c40f
        new Float32Array([0.608, 0.349, 0.714]),  // #9b59b6
        new Float32Array([0.902, 0.494, 0.133]),  // #e67e22
    ],

    load() {
        console.log("g.map.load");
        for (let z = -1; z <= 1; z++) {
            for (let y = -1; y <= 1; y++) {
                for (let x = -1; x <= 1; x++) {
                    const tile = {
                        gx: x, gy: y, gz: z,
                        ax: x, ay: y, az: z,
                        worldPos: g.math.v3(0, 0, 0),
                        color: g.map.tileColor(x, y, z),
                        selected: false,
                        stars: [],
                        onClick() {
                            tile.selected = !tile.selected;
                        },
                    };
                    g.map.generateStars(tile);
                    g.map.tiles.push(tile);
                }
            }
        }
        g.map.updateWorldPositions();
    },

    // deterministic seeded PRNG for star generation
    seedRng(ax, ay, az) {
        let s = ((ax * 73856093) ^ (ay * 19349663) ^ (az * 83492791)) & 0x7fffffff;
        return function() {
            s = (s * 1103515245 + 12345) & 0x7fffffff;
            return s / 0x7fffffff;
        };
    },

    tileColor(ax, ay, az) {
        let h = ((ax * 73856093) ^ (ay * 19349663) ^ (az * 83492791)) & 0x7fffffff;
        return g.map.palette[h % g.map.palette.length];
    },

    generateStars(tile) {
        const rng = g.map.seedRng(tile.ax, tile.ay, tile.az);
        const half = g.map.tileSize / 2;
        tile.stars = [];
        for (let i = 0; i < config.world.starsPerTile; i++) {
            const lx = (rng() - 0.5) * g.map.tileSize * 0.9;
            const ly = (rng() - 0.5) * g.map.tileSize * 0.9;
            const lz = (rng() - 0.5) * g.map.tileSize * 0.9;
            const seed = ((tile.ax * 73856093) ^ (tile.ay * 19349663) ^ (tile.az * 83492791) ^ (i * 2654435761)) & 0x7fffffff;
            const col = g.map.palette[seed % g.map.palette.length];
            tile.stars.push({
                index: i,
                seed: seed,
                localPos: g.math.v3(lx, ly, lz),
                worldPos: g.math.v3(
                    tile.ax * g.map.tileSize + lx,
                    tile.ay * g.map.tileSize + ly,
                    tile.az * g.map.tileSize + lz
                ),
                color: col,
                selected: false,
                tileAx: tile.ax, tileAy: tile.ay, tileAz: tile.az,
            });
        }
    },

    updateWorldPositions() {
        for (const t of g.map.tiles) {
            t.worldPos[0] = t.ax * g.map.tileSize;
            t.worldPos[1] = t.ay * g.map.tileSize;
            t.worldPos[2] = t.az * g.map.tileSize;
        }
    },

    update(dt) {
        g.map.pos[0] = g.player.pos[0];
        g.map.pos[1] = g.player.pos[1];
        g.map.pos[2] = g.player.pos[2];

        const cx = Math.round(g.map.pos[0] / g.map.tileSize);
        const cy = Math.round(g.map.pos[1] / g.map.tileSize);
        const cz = Math.round(g.map.pos[2] / g.map.tileSize);



        if (cx !== g.map.gridOrigin.x || cy !== g.map.gridOrigin.y || cz !== g.map.gridOrigin.z) {
            g.map.gridOrigin.x = cx;
            g.map.gridOrigin.y = cy;
            g.map.gridOrigin.z = cz;
            for (const t of g.map.tiles) {
                t.ax = cx + t.gx;
                t.ay = cy + t.gy;
                t.az = cz + t.gz;
                t.color = g.map.tileColor(t.ax, t.ay, t.az);
                t.selected = false;
                g.map.generateStars(t);
            }
            g.map.updateWorldPositions();



            // re-link or clear selected star after tile recycling
            if (g.pick.selectedStarId) {
                const sid = g.pick.selectedStarId;
                let found = false;
                for (const t of g.map.tiles) {
                    if (t.ax === sid.tileAx && t.ay === sid.tileAy && t.az === sid.tileAz) {
                        const star = t.stars[sid.index];
                        if (star) {
                            star.selected = true;
                            g.pick.selectedStar = star;
                            found = true;
                        }
                        break;
                    }
                }
                if (!found) {
                    // tile was recycled out of range, clear selection
                    g.pick.selectedStar = null;
                    g.pick.selectedStarId = null;
                }
            }
            
        }
    },
};
g.loadHandlers.push(g.map.load);



g.map.addRenderObject = function(renderList, tile) {
    renderList.push({
        type: 'cube',
        pos: tile.worldPos,
        scale: [g.map.tileSize * 0.95, g.map.tileSize * 0.95, g.map.tileSize * 0.95],
        color: tile.selected ? [1,1,1] : tile.color,
    });
    for (const s of tile.stars) {
        renderList.push({
            type: 'sphere',
            pos: s.worldPos,
            scale: [0.2, 0.2, 0.2],
            color: s.selected ? [1,1,1] : s.color,
        });
    }
};