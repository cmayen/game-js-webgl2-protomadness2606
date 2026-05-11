// g: the messy core protoptyp[inh ] obejct ;p
const g = {
    css:[],
    canvas: null,
    gl: null,
    loadHandlers: [],
    updateHandlers: [],
    lastTime: 0,
    load() {
        console.log('g.load');
        //
        // setup the canvas and WebGL context
        g.css.push(`
            body>canvas{
                display:block;position:absolute;left:0;top:0;width:100%;height:100%;
                display:block;touch-action:none;
            }
        `);
        g.canvas = document.createElement('canvas');
        const dpr = window.devicePixelRatio || 1;
        g.canvas.width = window.innerWidth * dpr;
        g.canvas.height = window.innerHeight * dpr;
        document.body.appendChild(g.canvas);
        g.gl = g.canvas.getContext('webgl', { antialias: true, alpha: false });
        if (!g.gl) { alert('WebGL not supported'); return; }
        //
        // setup resize handler and trigger initial resize
        window.addEventListener('resize', g.resize);
        g.resize();
        //
        // loop the loadHandlers
        for (const h of g.loadHandlers) h();
        //
        // generate css from g.css array and append to document head
        if (g.css.length > 0) {
            const styleEl = document.createElement('style');
            styleEl.textContent = g.css.join('\n');
            document.head.appendChild(styleEl);
        }
        //
        // set the lastTime and start the update loop
        g.lastTime = performance.now();
        requestAnimationFrame(g.update);
    },
    resize() {
        const dpr = window.devicePixelRatio || 1;
        g.canvas.width  = window.innerWidth  * dpr;
        g.canvas.height = window.innerHeight * dpr;
        g.gl.viewport(0, 0, g.canvas.width, g.canvas.height);
    },
    update(now) {
        const deltaTime = now - g.lastTime;
        g.lastTime = now;
        for (const h of g.updateHandlers) h(deltaTime);
        requestAnimationFrame(g.update);
    },
};
window.onload = g.load;
