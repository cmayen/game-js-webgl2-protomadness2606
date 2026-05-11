g.hexmap.miniMap = {
    // Canvas elements
    canvas: null,
    ctx: null,
    
    // Dimensions
    width: 150,
    height: 150,
    padding: 10,
    
    // Fog of war
    visitedTiles: new Set(),  // keyed by "q,r"
    visibilityRadius: 3.0,    // distance to mark tiles as visited
    
    // Minimap viewport (pan offset)
    offsetX: 0,
    offsetY: 0,
    
    // Dragging state
    dragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragStartOffsetX: 0,
    dragStartOffsetY: 0,
    
    // Scale and colors
    tileRadius: 0.4,           // visual size of each hex on minimap
    exploredColor: '#D4D0C0',  // light brownish (explored biome tiles)
    wallColor: '#7A7C86',      // medium gray (walls)
    unexploredColor: '#3A3A3A', // dark gray (unexplored)
    playerColor: '#FFFF00',    // yellow for player
    playerArrowColor: '#FFFF00',
    
    load() {
        // Create overlay canvas for minimap
        g.hexmap.miniMap.canvas = document.createElement('canvas');
        g.hexmap.miniMap.canvas.width = g.hexmap.miniMap.width;
        g.hexmap.miniMap.canvas.height = g.hexmap.miniMap.height;
        g.hexmap.miniMap.canvas.style.position = 'fixed';
        g.hexmap.miniMap.canvas.style.top = g.hexmap.miniMap.padding + 'px';
        g.hexmap.miniMap.canvas.style.right = g.hexmap.miniMap.padding + 'px';
        g.hexmap.miniMap.canvas.style.border = '2px solid #444';
        g.hexmap.miniMap.canvas.style.backgroundColor = '#0A0A0A';
        g.hexmap.miniMap.canvas.style.borderRadius = '4px';
        g.hexmap.miniMap.canvas.style.zIndex = '1000';
        g.hexmap.miniMap.canvas.style.cursor = 'grab';
        
        document.body.appendChild(g.hexmap.miniMap.canvas);
        g.hexmap.miniMap.ctx = g.hexmap.miniMap.canvas.getContext('2d');
        
        // Initial visited tile pass - mark starting area as visited
        g.hexmap.miniMap._updateVisitedTiles();
        
        // Register frame update
        g.rAF.updateHandlers.push(g.hexmap.miniMap.update);
        
        // Register draw handler
        g.canvas.registerDrawHandler(g.hexmap.miniMap.draw);
        
        // Add mouse event listeners for dragging
        g.hexmap.miniMap.canvas.addEventListener('mousedown', g.hexmap.miniMap._onCanvasMouseDown);
        document.addEventListener('mousemove', g.hexmap.miniMap._onCanvasMouseMove);
        document.addEventListener('mouseup', g.hexmap.miniMap._onCanvasMouseUp);
    },
    
    update() {
        // Update visited tiles based on player position
        g.hexmap.miniMap._updateVisitedTiles();
    },
    
    draw() {
        // Render minimap to 2D canvas
        const ctx = g.hexmap.miniMap.ctx;
        const w = g.hexmap.miniMap.width;
        const h = g.hexmap.miniMap.height;
        
        // Clear canvas
        ctx.fillStyle = '#0A0A0A';
        ctx.fillRect(0, 0, w, h);
        
        // Get player position in world coords
        const playerX = g.camera.position[0];
        const playerY = g.camera.position[1];
        const mapCenterX = w / 2;
        const mapCenterY = h / 2;
        
        // Draw tiles
        const tiles = g.hexmap.tiles;
        for (const key in tiles) {
            const tile = tiles[key];
            const [q, r] = key.split(',').map(Number);
            const [wx, wy] = g.hexmap.hexToWorld(q, r);
            
            // Convert world coords to minimap coords (player at center)
            const mapX = mapCenterX + (wx - playerX) * (g.hexmap.miniMap.tileRadius * 2);
            const mapY = mapCenterY - (wy - playerY) * (g.hexmap.miniMap.tileRadius * 2); // Y is inverted
            
            // Only draw if within minimap bounds (with some margin)
            const margin = 30;
            if (mapX < -margin || mapX > w + margin || mapY < -margin || mapY > h + margin) {
                continue;
            }
            
            // Determine color based on tile type and explored state
            const isVisited = g.hexmap.miniMap.visitedTiles.has(key);
            let color = g.hexmap.miniMap.unexploredColor;
            
            if (isVisited) {
                // Use biome color
                const biomeIndex = tile.biomeIndex;
                if (biomeIndex === g.hexmap.BIOME.Wall) {
                    color = g.hexmap.miniMap.wallColor;
                } else {
                    color = g.hexmap.miniMap.exploredColor;
                }
            }
            
            // Draw hexagon
            g.hexmap.miniMap._drawHexagon(ctx, mapX, mapY, g.hexmap.miniMap.tileRadius, color);
        }
        
        // Draw player indicator (arrow)
        ctx.save();
        ctx.fillStyle = g.hexmap.miniMap.playerColor;
        ctx.strokeStyle = g.hexmap.miniMap.playerArrowColor;
        ctx.lineWidth = 2;
        
        // Draw a triangle pointing in the direction of yaw
        const arrowSize = 8;
        const playerYaw = g.controller.yaw;
        
        // Rotate and draw arrow
        ctx.translate(mapCenterX, mapCenterY);
        ctx.rotate(playerYaw);
        
        // Draw arrow/triangle
        ctx.beginPath();
        ctx.moveTo(0, -arrowSize);
        ctx.lineTo(arrowSize * 0.6, arrowSize * 0.5);
        ctx.lineTo(-arrowSize * 0.6, arrowSize * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.restore();
    },
    
    _drawHexagon(ctx, x, y, radius, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i;
            const hx = x + radius * Math.cos(angle);
            const hy = y + radius * Math.sin(angle);
            if (i === 0) {
                ctx.moveTo(hx, hy);
            } else {
                ctx.lineTo(hx, hy);
            }
        }
        ctx.closePath();
        ctx.fill();
    },
    
    _updateVisitedTiles() {
        const playerX = g.camera.position[0];
        const playerY = g.camera.position[1];
        const radius = g.hexmap.miniMap.visibilityRadius;
        
        // Check all tiles and mark as visited if within visibility radius
        const tiles = g.hexmap.tiles;
        for (const key in tiles) {
            const [q, r] = key.split(',').map(Number);
            const [wx, wy] = g.hexmap.hexToWorld(q, r);
            
            const dx = wx - playerX;
            const dy = wy - playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < radius) {
                g.hexmap.miniMap.visitedTiles.add(key);
            }
        }
    },
    
    _onCanvasMouseDown(e) {
        const rect = g.hexmap.miniMap.canvas.getBoundingClientRect();
        g.hexmap.miniMap.dragging = true;
        g.hexmap.miniMap.dragStartX = e.clientX;
        g.hexmap.miniMap.dragStartY = e.clientY;
        g.hexmap.miniMap.dragStartOffsetX = g.hexmap.miniMap.offsetX;
        g.hexmap.miniMap.dragStartOffsetY = g.hexmap.miniMap.offsetY;
        g.hexmap.miniMap.canvas.style.cursor = 'grabbing';
    },
    
    _onCanvasMouseMove(e) {
        if (!g.hexmap.miniMap.dragging) return;
        
        const dx = e.clientX - g.hexmap.miniMap.dragStartX;
        const dy = e.clientY - g.hexmap.miniMap.dragStartY;
        
        // Apply drag offset (scaled down to make dragging feel natural)
        g.hexmap.miniMap.offsetX = g.hexmap.miniMap.dragStartOffsetX + dx * 0.02;
        g.hexmap.miniMap.offsetY = g.hexmap.miniMap.dragStartOffsetY + dy * 0.02;
    },
    
    _onCanvasMouseUp(e) {
        g.hexmap.miniMap.dragging = false;
        g.hexmap.miniMap.canvas.style.cursor = 'grab';
    },
};

g.loadHandlers.push(g.hexmap.miniMap.load);
