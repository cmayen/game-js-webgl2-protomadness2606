
g.crosshair = {
    el:null,
    load() {
        g.css.push(`#crosshair { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); font-size:24px; pointer-events:none; color:#fff; opacity:0.4; }`);
        // <div id="crosshair">+</div>
        g.crosshair.el = document.createElement('div');
        g.crosshair.el.id = 'crosshair';
        g.crosshair.el.textContent = '+';
        document.body.appendChild(g.crosshair.el);
    }

};
g.loadHandlers.push(g.crosshair.load);
