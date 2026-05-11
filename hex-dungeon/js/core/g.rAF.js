
g.rAF = {
    lastTime: 0,
    fps: 0,
    fpsAverage: 0,
    fpsA: [],
    updateHandlers: [],
    load(){
        g.rAF.lastTime = performance.now();
        requestAnimationFrame(g.rAF.update);
    },
    update(time){
        let delta = time - g.rAF.lastTime;
        g.rAF.lastTime = time;
        g.rAF.fps = 1000 / delta;
        g.rAF.fpsA.push(g.rAF.fps);
        if(g.rAF.fpsA.length > 60){ g.rAF.fpsA.shift(); }
        g.rAF.fpsAverage = g.rAF.fpsA.reduce((a,b) => a+b, 0) / g.rAF.fpsA.length;
        // Push the current FPS info to the debug pre output 
        // for this frame
        g.debug.pre.push(`FPS: ${g.rAF.fps.toFixed(1)} (avg: ${g.rAF.fpsAverage.toFixed(1)}) ${delta.toFixed(2)}ms`);
        // Call all registered update handlers for this 
        // frame, passing the delta time
        for(let handler of g.rAF.updateHandlers){
            handler(delta);
        }
        // Call the debug update to refresh the debug output 
        // with the latest FPS info and any other debug info 
        // pushed during this frame
        g.debug.update(delta);
        //g.debug.pre.push(`FPS: ${g.rAF.fps.toFixed(1)} (avg: ${g.rAF.fpsAverage.toFixed(1)})`);
        requestAnimationFrame(g.rAF.update);
    },
};
g.loadHandlers.push(g.rAF.load);

