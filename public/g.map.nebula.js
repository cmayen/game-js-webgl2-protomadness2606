
// started on this, it brings phone gpu to it's knees, sooo. yeah

g.map.nebula = {
    visibleTiles: [],
    _tileMeta: {},
    _frame: 0,

    load() {
        g.map.nebula.syncTiles();
    },

    update() {
        const neb = config.world.nebula;
        if (!neb || !neb.enabled) {
            g.map.nebula.visibleTiles.length = 0;
            if (g.renderer && g.renderer.map && g.renderer.map.nebula) {
                g.renderer.map.nebula.glow = false;
            }
            return;
        }

        g.map.nebula.syncTiles();

        if (g.renderer && g.renderer.map && g.renderer.map.nebula) {
            g.renderer.map.nebula.glow = neb.bloom > 0.001;
        }
    },

    clampInt(v, lo, hi) {
        const n = v | 0;
        if (n < lo) return lo;
        if (n > hi) return hi;
        return n;
    },

    seedFromTile(ax, ay, az) {
        const neb = config.world.nebula;
        let s = ((ax * 73856093) ^ (ay * 19349663) ^ (az * 83492791) ^ (neb.seed * 2654435761)) >>> 0;
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        return s >>> 0;
    },

    tileKey(ax, ay, az) {
        return ax + ',' + ay + ',' + az;
    },

    getTierSettings() {
        const neb = config.world.nebula;
        const complexity = g.map.nebula.clampInt(neb.complexity, 0, 3);
        const shaderQuality = g.map.nebula.clampInt(neb.shaderQuality, 0, 2);

        const slicesByComplexity = [0.65, 0.85, 1.1, 1.35];
        const octavesByComplexity = [2, 2, 3, 4];
        const qualityOctaveAdd = [0, 0, 0];
        const noiseScaleBase = [1.55, 1.85, 2.2, 2.5];

        const slices = Math.max(3, Math.floor(neb.sliceCountBase * slicesByComplexity[complexity] + shaderQuality * 1.5));
        const octaves = Math.min(6, octavesByComplexity[complexity] + qualityOctaveAdd[shaderQuality]);
        const planeScale = 0.78 + complexity * 0.12 + shaderQuality * 0.03;
        const noiseScale = noiseScaleBase[complexity] + shaderQuality * 0.25;

        return {
            complexity: complexity,
            shaderQuality: shaderQuality,
            slices: slices,
            octaves: octaves,
            planeScale: planeScale,
            noiseScale: noiseScale,
        };
    },

    syncTiles() {
        if (!g.map || !g.map.tiles || g.map.tiles.length === 0) return;

        const self = g.map.nebula;
        const visible = self.visibleTiles;
        visible.length = 0;
        self._frame++;

        for (let i = 0; i < g.map.tiles.length; i++) {
            const tile = g.map.tiles[i];
            const key = self.tileKey(tile.ax, tile.ay, tile.az);
            let meta = self._tileMeta[key];

            if (!meta) {
                const seedU = self.seedFromTile(tile.ax, tile.ay, tile.az);
                const seedN = seedU / 4294967295;
                meta = {
                    key: key,
                    seed: seedN * 1000.0,
                    phaseShift: (seedN * 2.0 - 1.0),
                    frame: self._frame,
                };
                self._tileMeta[key] = meta;
            } else {
                meta.frame = self._frame;
            }

            visible.push({
                tile: tile,
                seed: meta.seed,
                phaseShift: meta.phaseShift,
            });
        }

        const staleKeys = Object.keys(self._tileMeta);
        for (let k = 0; k < staleKeys.length; k++) {
            const key = staleKeys[k];
            if (self._tileMeta[key].frame !== self._frame) {
                delete self._tileMeta[key];
            }
        }
    },
};
g.loadHandlers.push(g.map.nebula.load);
g.updateHandlers.push(g.map.nebula.update);
