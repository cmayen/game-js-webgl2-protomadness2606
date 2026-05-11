g.controller = {
    mode: 'first-person',
    godMode: false,
    pointerLocked: false,
    keys: {},

    yaw: 0,
    pitch: 0,
    lookSensitivity: 0.0022,
    minPitch: -Math.PI / 2 + 0.01,
    maxPitch: Math.PI / 2 - 0.01,

    walkSpeed: 8.0,
    sprintMultiplier: 1.75,
    flySpeedMultiplier: 1.35,
    eyeHeight: 0.55,
    crouchEyeHeight: 0.34,
    crouchTransitionSpeed: 14.0,
    crouchSpeedMultiplier: 0.6,
    jumpSpeed: 4.8,
    gravity: 18.0,
    collisionRadius: 0.12,
    wallClearance: 0.06,
    groundFollowDownSpeed: 18.0,
    groundSnapDownDistance: 0.32,
    verticalVelocity: 0,
    grounded: true,
    _jumpWasDown: false,
    _currentEyeHeight: 0.55,

    _lookDX: 0,
    _lookDY: 0,

    load(){
        g.controller._currentEyeHeight = g.controller.eyeHeight;
        g.camera.position = [0, 0, g.controller.eyeHeight];

        // Spawn at StairsStart if one was generated
        const tileTypeMap = g.hexmap.HexMapManager.tileTypeMap;
        for(const k in tileTypeMap){
            if(tileTypeMap[k] === 'stairs-start'){
                const [q, r] = k.split(',').map(Number);
                const [wx, wy] = g.hexmap.hexToWorld(q, r);
                g.camera.position[0] = wx;
                g.camera.position[1] = wy;
                break;
            }
        }

        g.controller._updateCameraTarget();
        g.rAF.updateHandlers.push(g.controller.update);

        const el = g.canvas.el;
        el.addEventListener('click', g.controller._onCanvasClick);
        document.addEventListener('mousemove', g.controller._onMouseMove);
        document.addEventListener('pointerlockchange', g.controller._onPointerLockChange);
        window.addEventListener('keydown', g.controller._onKeyDown);
        window.addEventListener('keyup', g.controller._onKeyUp);
    },

    _onCanvasClick(){
        if(document.pointerLockElement === g.canvas.el) return;
        if(g.canvas.el.requestPointerLock){
            g.canvas.el.requestPointerLock();
        }
    },

    _onPointerLockChange(){
        g.controller.pointerLocked = (document.pointerLockElement === g.canvas.el);
    },

    _onMouseMove(e){
        if(!g.controller.pointerLocked) return;
        g.controller._lookDX += e.movementX || 0;
        g.controller._lookDY += e.movementY || 0;
    },

    _onKeyDown(e){
        g.controller.keys[e.code] = true;
        if(e.code === 'KeyG' && !e.repeat){
            g.controller.godMode = !g.controller.godMode;
        }
    },

    _onKeyUp(e){
        g.controller.keys[e.code] = false;
    },

    _updateCameraTarget(){
        const cosPitch = Math.cos(g.controller.pitch);
        const dirX = Math.cos(g.controller.yaw) * cosPitch;
        const dirY = Math.sin(g.controller.yaw) * cosPitch;
        const dirZ = Math.sin(g.controller.pitch);
        g.camera.target[0] = g.camera.position[0] + dirX;
        g.camera.target[1] = g.camera.position[1] + dirY;
        g.camera.target[2] = g.camera.position[2] + dirZ;
    },

    _isWalkableType(type){
        return type === 'room' || type === 'hall' || type === 'door'
            || type === 'stairs-start' || type === 'stairs-end';
    },

    _getFloorZAt(x, y, referenceFloorZ){
        const [q, r] = g.hexmap.worldToHex(x, y);
        const tile = g.hexmap.tiles[`${q},${r}`];
        const tileFloorZ = tile ? tile.zTop : g.hexmap.baseHeight;

        if(g.hexmap.meshGen && g.hexmap.meshGen.enabled && g.hexmap.meshGen.mesh){
            return g.hexmap.meshGen.getSurfaceZAt(x, y, tileFloorZ, referenceFloorZ);
        }

        return tileFloorZ;
    },

    _buildWallSegmentsForTile(q, r, tileType){
        const [cx, cy] = g.hexmap.hexToWorld(q, r);
        const corners = [];
        for(let i = 0; i < 6; i++) corners.push(g.hexmap.hexCorner(cx, cy, i));

        const sideNeighbors = [
            [q + 1, r    ],
            [q,     r + 1],
            [q - 1, r + 1],
            [q - 1, r    ],
            [q,     r - 1],
            [q + 1, r - 1],
        ];

        const tileTypeMap = g.hexmap.HexMapManager.tileTypeMap;
        const hasOpenEdge = sideNeighbors.map(([nq, nr]) => {
            const nType = tileTypeMap[`${nq},${nr}`];
            return g.controller._isWalkableType(nType);
        });

        const cfg = g.hexmap.HexMapManager.config || {};
        const tileCanUseStraightWalls = tileType !== 'room' || !!cfg.straightWallsInRooms;
        const straightPairs = [
            [1, 2, 0, 3],
            [4, 5, 0, 3],
            [2, 3, 1, 4],
            [5, 0, 1, 4],
            [3, 4, 2, 5],
            [0, 1, 2, 5],
        ];

        const consumed = new Array(6).fill(false);
        const segments = [];

        if(tileCanUseStraightWalls){
            for(const [a, b, ax1, ax2] of straightPairs){
                if(!hasOpenEdge[a] && !hasOpenEdge[b] && hasOpenEdge[ax1] && hasOpenEdge[ax2]){
                    consumed[a] = true;
                    consumed[b] = true;
                    segments.push([corners[a], corners[(b + 1) % 6]]);
                }
            }
        }

        for(let i = 0; i < 6; i++){
            if(consumed[i] || hasOpenEdge[i]) continue;
            segments.push([corners[i], corners[(i + 1) % 6]]);
        }

        return { cx, cy, segments };
    },

    _isInsideTileWalls(x, y, q, r, tileType, clearance){
        const { cx, cy, segments } = g.controller._buildWallSegmentsForTile(q, r, tileType);
        for(const [a, b] of segments){
            const vx = b[0] - a[0];
            const vy = b[1] - a[1];
            const len = Math.hypot(vx, vy);
            if(len < 0.00001) continue;

            let nx = -vy / len;
            let ny = vx / len;

            const dc = (cx - a[0]) * nx + (cy - a[1]) * ny;
            if(dc < 0){
                nx = -nx;
                ny = -ny;
            }

            const d = (x - a[0]) * nx + (y - a[1]) * ny;
            if(d < clearance) return false;
        }
        return true;
    },

    _canOccupy(x, y){
        const [q, r] = g.hexmap.worldToHex(x, y);
        const tileType = g.hexmap.HexMapManager.tileTypeMap[`${q},${r}`];
        if(!g.controller._isWalkableType(tileType)) return false;

        const clearance = Math.max(0.0, g.controller.wallClearance || 0.0);
        if(!g.controller._isInsideTileWalls(x, y, q, r, tileType, clearance)) return false;

        // Radial probe helps prevent clipping/peeking at corners and near merged walls.
        const rad = Math.max(0.0, g.controller.collisionRadius || 0.0);
        if(rad <= 0.0001) return true;

        const probes = [
            [ rad,  0.0], [-rad,  0.0],
            [ 0.0,  rad], [ 0.0, -rad],
            [ rad * 0.7071,  rad * 0.7071],
            [-rad * 0.7071,  rad * 0.7071],
            [ rad * 0.7071, -rad * 0.7071],
            [-rad * 0.7071, -rad * 0.7071],
        ];

        for(const [ox, oy] of probes){
            const px = x + ox;
            const py = y + oy;
            const [pq, pr] = g.hexmap.worldToHex(px, py);
            const pType = g.hexmap.HexMapManager.tileTypeMap[`${pq},${pr}`];
            if(!g.controller._isWalkableType(pType)) return false;
            if(!g.controller._isInsideTileWalls(px, py, pq, pr, pType, clearance)) return false;
        }

        return true;
    },

    update(delta){
        const dt = Math.min(0.05, delta * 0.001);
        const keys = g.controller.keys;

        if(g.controller.pointerLocked){
            g.controller.yaw -= g.controller._lookDX * g.controller.lookSensitivity;
            g.controller.pitch -= g.controller._lookDY * g.controller.lookSensitivity;
            g.controller.pitch = Math.max(g.controller.minPitch, Math.min(g.controller.maxPitch, g.controller.pitch));
        }
        g.controller._lookDX = 0;
        g.controller._lookDY = 0;

        let speed = g.controller.walkSpeed;
        if(keys.ShiftLeft || keys.ShiftRight) speed *= g.controller.sprintMultiplier;
        if(g.controller.godMode) speed *= g.controller.flySpeedMultiplier;

        const wantsCrouch = !!(keys.ControlLeft || keys.ControlRight || keys.KeyC);
        if(!g.controller.godMode && wantsCrouch){
            speed *= g.controller.crouchSpeedMultiplier;
        }

        const forward2D = [Math.cos(g.controller.yaw), Math.sin(g.controller.yaw), 0];
        const right2D = [Math.sin(g.controller.yaw), -Math.cos(g.controller.yaw), 0];
        const move = [0, 0, 0];

        if(keys.KeyW) { move[0] += forward2D[0]; move[1] += forward2D[1]; }
        if(keys.KeyS) { move[0] -= forward2D[0]; move[1] -= forward2D[1]; }
        if(keys.KeyA) { move[0] -= right2D[0]; move[1] -= right2D[1]; }
        if(keys.KeyD) { move[0] += right2D[0]; move[1] += right2D[1]; }

        if(g.controller.godMode){
            if(keys.Space) move[2] += 1;
            if(keys.ControlLeft || keys.ControlRight || keys.KeyC) move[2] -= 1;
        }

        const mag = Math.hypot(move[0], move[1], move[2]);
        if(mag > 0.0001){
            move[0] /= mag;
            move[1] /= mag;
            move[2] /= mag;

            const dx = move[0] * speed * dt;
            const dy = move[1] * speed * dt;
            const newX = g.camera.position[0] + dx;
            const newY = g.camera.position[1] + dy;

            if(g.controller.godMode){
                // God mode: no horizontal collision
                g.camera.position[0] = newX;
                g.camera.position[1] = newY;
            } else if(g.controller._canOccupy(newX, newY)){
                g.camera.position[0] = newX;
                g.camera.position[1] = newY;
            } else if(g.controller._canOccupy(newX, g.camera.position[1])){
                // Slide along Y wall
                g.camera.position[0] = newX;
            } else if(g.controller._canOccupy(g.camera.position[0], newY)){
                // Slide along X wall
                g.camera.position[1] = newY;
            }

            g.camera.position[2] += move[2] * speed * dt;
        }

        if(g.controller.godMode){
            g.controller.verticalVelocity = 0;
            g.controller.grounded = false;
            g.controller._currentEyeHeight = g.controller.eyeHeight;
        } else {
            const jumpDown = !!keys.Space;
            const targetEyeHeight = wantsCrouch ? g.controller.crouchEyeHeight : g.controller.eyeHeight;
            const t = Math.min(1, g.controller.crouchTransitionSpeed * dt);
            g.controller._currentEyeHeight += (targetEyeHeight - g.controller._currentEyeHeight) * t;

            if(jumpDown && !g.controller._jumpWasDown && g.controller.grounded){
                g.controller.verticalVelocity = g.controller.jumpSpeed;
                g.controller.grounded = false;
            }

            if(!g.controller.grounded){
                g.controller.verticalVelocity -= g.controller.gravity * dt;
                g.camera.position[2] += g.controller.verticalVelocity * dt;
            }

            const referenceFloorZ = g.camera.position[2] - g.controller._currentEyeHeight;
            const floorZ = g.controller._getFloorZAt(g.camera.position[0], g.camera.position[1], referenceFloorZ);
            const minEyeZ = floorZ + g.controller._currentEyeHeight;

            if(g.camera.position[2] <= minEyeZ){
                g.camera.position[2] = minEyeZ;
                g.controller.verticalVelocity = 0;
                g.controller.grounded = true;
            } else {
                const gapAboveGround = g.camera.position[2] - minEyeZ;
                const canStickToGround = g.controller.grounded
                    && g.controller.verticalVelocity <= 0
                    && gapAboveGround <= g.controller.groundSnapDownDistance;

                if(canStickToGround){
                    const followAlpha = 1 - Math.exp(-g.controller.groundFollowDownSpeed * dt);
                    g.camera.position[2] += (minEyeZ - g.camera.position[2]) * followAlpha;
                    if(Math.abs(g.camera.position[2] - minEyeZ) < 0.0005){
                        g.camera.position[2] = minEyeZ;
                    }
                    g.controller.verticalVelocity = 0;
                    g.controller.grounded = true;
                } else {
                    g.controller.grounded = false;
                }
            }
        }
        g.controller._jumpWasDown = !!keys.Space;

        g.controller._updateCameraTarget();

        g.debug.pre.push(`cam: first-person  yaw ${g.controller.yaw.toFixed(2)}  pitch ${g.controller.pitch.toFixed(2)}`);
        g.debug.pre.push(`cam pos: ${g.camera.position[0].toFixed(2)}, ${g.camera.position[1].toFixed(2)}, ${g.camera.position[2].toFixed(2)}`);
        g.debug.pre.push(`mode: ${g.controller.godMode ? 'GOD (flight)' : 'WALK'}  pointerLock: ${g.controller.pointerLocked ? 'on' : 'off'} (click canvas)`);
        g.debug.pre.push(`movement: ${g.controller.grounded ? 'grounded' : 'air'}  eye ${g.controller._currentEyeHeight.toFixed(2)}  vZ ${g.controller.verticalVelocity.toFixed(2)}`);

        // selected tile info
        const tile = g.hexmap.targetedTile;
        if(tile){
            const biome = g.hexmap.biomes[tile.biomeIndex];
            g.debug.pre.push(`tile: (${tile.q}, ${tile.r})  ${biome ? biome.name : 'unknown'} [${tile.biomeIndex}]`);
            g.debug.pre.push(`  type: ${tile.tileType || 'unknown'}`);
            g.debug.pre.push(`  h: ${tile.h.toFixed(4)}  zTop: ${tile.zTop.toFixed(4)}`);
            g.debug.pre.push(`  world: ${tile.cx.toFixed(2)}, ${tile.cy.toFixed(2)}`);
        } else {
            g.debug.pre.push(`tile: none`);
        }

        const stats = g.hexmap.HexMapManager.stats;
        if(stats){
            g.debug.pre.push(`dungeon: rooms ${stats.roomCount}, corridors ${stats.corridorCount}, doors ${stats.doorCount}`);
            g.debug.pre.push(`  wallFaces ${stats.wallCount}, stairs ${stats.stairsCount}, torches ${stats.torchCount || 0}, walkable ${stats.walkableCount}, total ${stats.tileCount}`);
            g.debug.pre.push(`  windingChance: ${stats.windingChance.toFixed(2)}`);
        }

        g.debug.pre.push('controls: WASD move, mouse look, Shift sprint, Space jump, Ctrl/C crouch, G toggle god mode, Space/Ctrl vertical in god mode');

        g.input.clearDeltas();
    },
};
g.loadHandlers.push(g.controller.load);
