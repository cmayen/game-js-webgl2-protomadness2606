
// ============================================================
//  g.shader — compile & link helpers
// ============================================================
g.shader = {
    compile(src, type) {
        const gl = g.canvas.gl;
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(s)); gl.deleteShader(s); return null;
        }
        return s;
    },
    link(vs, fs) {
        const gl = g.canvas.gl;
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(p)); return null;
        }
        return p;
    },
    create(vsSrc, fsSrc) {
        const vs = g.shader.compile(vsSrc, g.canvas.gl.VERTEX_SHADER);
        const fs = g.shader.compile(fsSrc, g.canvas.gl.FRAGMENT_SHADER);
        return g.shader.link(vs, fs);
    },
};
