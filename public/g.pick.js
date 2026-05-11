
//  ray-cast picking for clickable stars & cubes
g.pick = {
    selectedStar: null,
    // store absolute identity of selected star to persist across tile recycling
    selectedStarId: null, // { tileAx, tileAy, tileAz, index }
    load() {
        // Click handling is now done in g.input.mousekeyb to avoid 
        // deselecting when camera rotation drag ends
    },
    // unproject screen pixel (CSS coords) to a world-space ray direction
    screenToRay(sx, sy) {
        const dpr = window.devicePixelRatio || 1;
        const nx = (sx * dpr / g.canvas.width) * 2 - 1;
        const ny = 1 - (sy * dpr / g.canvas.height) * 2;
        // clip-space point on near plane
        const invVP = g.math.m4invert(g.camera.vpMatrix);
        const world = g.math.m4mulV4(invVP, new Float32Array([nx, ny, -1, 1]));
        const w = world[3] || 1;
        const pt = g.math.v3(world[0]/w, world[1]/w, world[2]/w);
        return g.math.v3norm(g.math.v3sub(pt, g.camera.pos));
    },
    // pick at specific screen coordinates (for touch / mouse)
    pickAtScreen(sx, sy) {
        const dir = g.pick.screenToRay(sx, sy);
        g.pick.pickRay(g.camera.pos, dir);
    },
    // pick along crosshair (gamepad)
    pickAtCrosshair() {
        g.pick.pickRay(g.camera.pos, g.camera.forward());
    },
    onClick(e) {
        g.pick.pickAtScreen(e.clientX, e.clientY);
    },
    // perpendicular distance from a point to a ray (assumes dir is unit length)
    rayPointDist(origin, dir, point) {
        const v = g.math.v3sub(point, origin);
        const t = g.math.v3dot(v, dir);
        const proj = g.math.v3scale(dir, t);
        return g.math.v3len(g.math.v3sub(v, proj));
    },
    pickRay(origin, dir) {
        const maxRange = config.world.maxPickRange;
        const pickRadius = config.world.pickRadius;
            // find star with smallest angle from ray direction, within range and angular threshold
            const pickAngle = config.world.pickAngleDeg * Math.PI / 180;
        let closestStar = null;
            let minAngle = Infinity;
        for (const tile of g.map.tiles) {
            for (const star of tile.stars) {
                const toStar = g.math.v3sub(star.worldPos, g.player.pos);
                const starRange = g.math.v3len(toStar);
                if (starRange > maxRange) continue;
                    const toStarFromCam = g.math.v3sub(star.worldPos, origin);
                    const toStarFromCamLen = g.math.v3len(toStarFromCam);
                    if (toStarFromCamLen < 1e-6) continue;
                    const cosA = g.math.v3dot(dir, g.math.v3scale(toStarFromCam, 1 / toStarFromCamLen));
                    const angle = Math.acos(Math.max(-1, Math.min(1, cosA)));
                    if (angle < pickAngle && angle < minAngle) {
                        minAngle = angle;
                    closestStar = star;
                }
            }
        }
        if (closestStar) {
            if (g.pick.selectedStar && g.pick.selectedStar !== closestStar) g.pick.selectedStar.selected = false;
            closestStar.selected = !closestStar.selected;
            if (closestStar.selected) {
                g.pick.selectedStar = closestStar;
                g.pick.selectedStarId = { tileAx: closestStar.tileAx, tileAy: closestStar.tileAy, tileAz: closestStar.tileAz, index: closestStar.index };
            } else {
                g.pick.selectedStar = null;
                g.pick.selectedStarId = null;
            }
            return;
        }
        // fallback to cube picking (disabled for now)
        /*
        let closest = null;
        let minT = Infinity;
        for (const tile of g.map.tiles) {
            const t = g.pick.rayAABB(origin, dir, tile.worldPos, g.map.tileSize);
            if (t !== null && t < minT) { minT = t; closest = tile; }
        }
        if (closest) closest.onClick();
        */
    },
    rayAABB(origin, dir, center, size) {
        const half = size / 2;
        let tmin = -Infinity, tmax = Infinity;
        for (let i = 0; i < 3; i++) {
            if (Math.abs(dir[i]) < 1e-8) {
                if (origin[i] < center[i] - half || origin[i] > center[i] + half) return null;
            } else {
                let t1 = (center[i] - half - origin[i]) / dir[i];
                let t2 = (center[i] + half - origin[i]) / dir[i];
                if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
                tmin = Math.max(tmin, t1);
                tmax = Math.min(tmax, t2);
                if (tmin > tmax) return null;
            }
        }
        return tmin >= 0 ? tmin : null;
    },
    raySphere(origin, dir, center, radius) {
        const oc = g.math.v3sub(origin, center);
        const a = g.math.v3dot(dir, dir);
        const b = 2.0 * g.math.v3dot(oc, dir);
        const c = g.math.v3dot(oc, oc) - radius * radius;
        const disc = b * b - 4 * a * c;
        if (disc < 0) return null;
        const t = (-b - Math.sqrt(disc)) / (2 * a);
        return t >= 0 ? t : null;
    },
};
g.loadHandlers.push(g.pick.load);
