
//  g.renderer
// //core render pipeline with auto-discovery
g.renderer = {
    glowProgram:  null,
    glowFBO:      null,
    glowTexture:  null,
    glowRBO:      null,
    quadVBO:      null,
    _renderables: null,

    drawHandlers: [],

    load() {
        const gl = g.gl;

        // glow post-process shader
        g.renderer.glowProgram = g.shader.create(
            `attribute vec2 aPos;
             varying vec2 vUV;
             void main(){
                 vUV = aPos * 0.5 + 0.5;
                 gl_Position = vec4(aPos, 0.0, 1.0);
             }`,
            `precision mediump float;
             varying vec2 vUV;
             uniform sampler2D uScene;
             uniform vec2 uTexelSize;
             void main(){
                 vec4 sum = vec4(0.0);
                 sum += texture2D(uScene, vUV + vec2(-4.0,0.0)*uTexelSize*2.0) * 0.016216 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,-4.0)*uTexelSize*2.0) * 0.016216 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(-3.0,0.0)*uTexelSize*2.0) * 0.054054 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,-3.0)*uTexelSize*2.0) * 0.054054 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(-2.0,0.0)*uTexelSize*2.0) * 0.121621 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,-2.0)*uTexelSize*2.0) * 0.121621 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(-1.0,0.0)*uTexelSize*2.0) * 0.194594 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,-1.0)*uTexelSize*2.0) * 0.194594 * 0.5;
                 sum += texture2D(uScene, vUV) * 0.227027;
                 sum += texture2D(uScene, vUV + vec2(1.0,0.0)*uTexelSize*2.0) * 0.194594 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,1.0)*uTexelSize*2.0) * 0.194594 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(2.0,0.0)*uTexelSize*2.0) * 0.121621 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,2.0)*uTexelSize*2.0) * 0.121621 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(3.0,0.0)*uTexelSize*2.0) * 0.054054 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,3.0)*uTexelSize*2.0) * 0.054054 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(4.0,0.0)*uTexelSize*2.0) * 0.016216 * 0.5;
                 sum += texture2D(uScene, vUV + vec2(0.0,4.0)*uTexelSize*2.0) * 0.016216 * 0.5;
                 vec4 scene = texture2D(uScene, vUV);
                 gl_FragColor = scene + sum * 0.35;
             }`
        );

        // fullscreen quad for glow pass
        const quad = new Float32Array([-1,-1, 1,-1, -1,1, 1,1]);
        g.renderer.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, g.renderer.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

        // FBO for glow
        g.renderer.createGlowFBO();
        window.addEventListener('resize', g.renderer.createGlowFBO);

        // GL state
        gl.enable(gl.DEPTH_TEST);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.clearColor(0.067, 0.067, 0.067, 1);
    },

    // Re-scan g.renderer.* tree for objects with draw() methods.
    // Call after adding/removing renderables at runtime.
    refresh() {
        const renderables = [];
        const visited = new Set();










        function scan(obj) {
            if (visited.has(obj)) return;
            visited.add(obj);
            for (const key of Object.keys(obj)) {
                if (key.startsWith('_')) continue;
                const child = obj[key];
                if (child && typeof child === 'object' && !Array.isArray(child)) {
                    if (typeof child.draw === 'function') {
                        renderables.push(child);
                    }
                    scan(child);
                }
            }
        }
        scan(g.renderer);



        for (const h of g.renderer.drawHandlers) {
            if (typeof h === 'function') renderables.push({ draw: h });
        }




        renderables.sort((a, b) => (a.order || 0) - (b.order || 0));
        g.renderer._renderables = renderables;
    },

    createGlowFBO() {
        const gl = g.gl;
        const w = g.canvas.width, h = g.canvas.height;
        if (g.renderer.glowFBO) {
            gl.deleteFramebuffer(g.renderer.glowFBO);
            gl.deleteTexture(g.renderer.glowTexture);
            gl.deleteRenderbuffer(g.renderer.glowRBO);
        }
        g.renderer.glowFBO = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, g.renderer.glowFBO);

        g.renderer.glowTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, g.renderer.glowTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, g.renderer.glowTexture, 0);

        g.renderer.glowRBO = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, g.renderer.glowRBO);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, g.renderer.glowRBO);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    draw() {
        if (!g.renderer._renderables) g.renderer.refresh();
        const gl = g.gl;
        const renderables = g.renderer._renderables;

        // split renderables by glow opt-in
        const glowList = [];
        const directList = [];
        for (const r of renderables) {
            if (r.enabled === false) continue;
            if (r.glow === false) directList.push(r);
            else glowList.push(r);
        }

        // render glow objects to FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, g.renderer.glowFBO);
        gl.viewport(0, 0, g.canvas.width, g.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        for (const r of glowList) r.draw(gl);

        // glow composite to screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, g.canvas.width, g.canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const gp = g.renderer.glowProgram;
        gl.useProgram(gp);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, g.renderer.glowTexture);
        gl.uniform1i(gl.getUniformLocation(gp, 'uScene'), 0);
        gl.uniform2f(gl.getUniformLocation(gp, 'uTexelSize'), 1/g.canvas.width, 1/g.canvas.height);

        gl.bindBuffer(gl.ARRAY_BUFFER, g.renderer.quadVBO);
        const qPos = gl.getAttribLocation(gp, 'aPos');
        gl.enableVertexAttribArray(qPos);
        gl.vertexAttribPointer(qPos, 2, gl.FLOAT, false, 0, 0);
        gl.disable(gl.DEPTH_TEST);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.enable(gl.DEPTH_TEST);

        // render non-glow objects directly to screen
        for (const r of directList) r.draw(gl);
    },
};
g.loadHandlers.push(g.renderer.load);
