

g.testCube={
    fillProgram: null,
    wireProgram: null,
    geometry: null,
    load(){
        g.testCube.fillProgram = g.shader.create(
            `
                attribute vec3 a_position;
                attribute vec4 a_color;
                uniform mat4 u_modelViewProjection;
                varying vec4 v_color;
                void main() {
                    v_color = a_color;
                    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
                }
            `,
            `
                precision mediump float;
                varying vec4 v_color;
                void main() {
                    gl_FragColor = v_color;
                }
            `,
        );
        g.testCube.wireProgram = g.shader.create(
            `
                attribute vec3 a_position;
                uniform mat4 u_modelViewProjection;
                void main() {
                    gl_Position = u_modelViewProjection * vec4(a_position, 1.0);
                }
            `,
            `
                precision mediump float;
                uniform vec4 u_color;
                void main() {
                    gl_FragColor = u_color;
                }
            `,
        );
        g.testCube.geometry = g.testCube.createGeometry();
        g.canvas.registerDrawHandler(g.testCube.draw);
    },
    createGeometry(){
        const positions = new Float32Array([
            -1, -1, -1,  1, -1, -1,  1,  1, -1,
            -1, -1, -1,  1,  1, -1, -1,  1, -1,
            -1, -1,  1,  1, -1,  1,  1,  1,  1,
            -1, -1,  1,  1,  1,  1, -1,  1,  1,
            -1, -1, -1, -1, -1,  1, -1,  1,  1,
            -1, -1, -1, -1,  1,  1, -1,  1, -1,
             1, -1, -1,  1, -1,  1,  1,  1,  1,
             1, -1, -1,  1,  1,  1,  1,  1, -1,
            -1, -1, -1, -1, -1,  1,  1, -1,  1,
            -1, -1, -1,  1, -1,  1,  1, -1, -1,
            -1,  1, -1, -1,  1,  1,  1,  1,  1,
            -1,  1, -1,  1,  1,  1,  1,  1, -1,
        ]);
        const faceColors = [
            [0.94, 0.32, 0.24, 0.1],
            [0.97, 0.72, 0.23, 0.1],
            [0.20, 0.69, 0.31, 0.1],
            [0.18, 0.49, 0.96, 0.1],
            [0.55, 0.35, 0.96, 0.1],
            [0.92, 0.30, 0.68, 0.1],
        ];
        const colors = new Float32Array(faceColors.flatMap((color) => [
            ...color, ...color, ...color,
            ...color, ...color, ...color,
        ]));
        const edges = new Float32Array([
            -1, -1, -1,   1, -1, -1,
             1, -1, -1,   1,  1, -1,
             1,  1, -1,  -1,  1, -1,
            -1,  1, -1,  -1, -1, -1,
            -1, -1,  1,   1, -1,  1,
             1, -1,  1,   1,  1,  1,
             1,  1,  1,  -1,  1,  1,
            -1,  1,  1,  -1, -1,  1,
            -1, -1, -1,  -1, -1,  1,
             1, -1, -1,   1, -1,  1,
             1,  1, -1,   1,  1,  1,
            -1,  1, -1,  -1,  1,  1,
        ]);
        return {
            positions: { data: positions, size: 3 },
            colors: { data: colors, size: 4 },
            edges: { data: edges, size: 3 },
            vertexCount: positions.length / 3,
            edgeVertexCount: edges.length / 3,
        };
    },
    draw(){
        const modelViewProjection = g.renderer.createModelViewProjection([0, 0, 0], [0, 0, 0]);
        g.renderer.submit({
            program: g.testCube.fillProgram,
            mode: "TRIANGLES",
            count: g.testCube.geometry.vertexCount,
            attributes: {
                a_position: g.testCube.geometry.positions,
                a_color: g.testCube.geometry.colors,
            },
            uniforms: {
                u_modelViewProjection: { type: "mat4", value: modelViewProjection },
            },
            state: {
                polygonOffset: [1, 1],
            },
        });
        g.renderer.submit({
            program: g.testCube.wireProgram,
            mode: "LINES",
            count: g.testCube.geometry.edgeVertexCount,
            attributes: {
                a_position: g.testCube.geometry.edges,
            },
            uniforms: {
                u_modelViewProjection: { type: "mat4", value: modelViewProjection },
                u_color: { type: "vec4", value: [0.96, 0.96, 0.98, 0.28] },
            },
        });
    }
};
g.loadHandlers.push(g.testCube.load);

