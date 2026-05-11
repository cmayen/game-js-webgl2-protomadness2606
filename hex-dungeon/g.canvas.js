
g.canvas = {
    el: null,
    gl: null,
    drawHandlers: [],
    renderList: [],
    load(){
        g.canvas.el = document.createElement("canvas");
        g.canvas.el.style.width = "100vw";
        g.canvas.el.style.height = "100vh";
        g.canvas.el.style.display = "block";
        document.body.appendChild(g.canvas.el);
        g.canvas.gl = g.canvas.el.getContext('webgl', { antialias: true, alpha: false });
        if (!g.canvas.gl) { alert('WebGL not supported'); return; }

        g.canvas.resize();
        g.rAF.updateHandlers.push(g.canvas.renderFrame);
    },
    resize(){
        if(!g.canvas.gl || !g.canvas.el){
            return;
        }
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(window.innerWidth * dpr);
        const height = Math.floor(window.innerHeight * dpr);
        if(g.canvas.el.width !== width || g.canvas.el.height !== height){
            g.canvas.el.width = width;
            g.canvas.el.height = height;
        }
        g.canvas.gl.viewport(0, 0, width, height);
    },
    registerDrawHandler(handler){
        g.canvas.drawHandlers.push(handler);
    },
    renderFrame(delta){
        if(!g.canvas.gl){
            return;
        }
        g.canvas.resize();
        g.canvas.renderList.length = 0;
        for(const handler of g.canvas.drawHandlers){
            handler(delta);
        }
        g.renderer.beginFrame();
        g.renderer.renderItems(g.canvas.renderList);
    },
};
g.loadHandlers.push(g.canvas.load);
