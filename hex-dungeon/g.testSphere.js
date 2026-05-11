

g.testSphere={
    program: null,
    geometry: null,
    load(){
        g.testSphere.program = g.shader.create(
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
        g.testSphere.geometry = g.testSphere.createGeometry();
        g.canvas.registerDrawHandler(g.testSphere.draw);
    },
    createGeometry(){
        const vertices = [];
        const latitudeSegments = 16;
        const longitudeSegments = 24;

        for(let latitude = 0; latitude < latitudeSegments; latitude++){
            const theta0 = latitude / latitudeSegments * Math.PI;
            const theta1 = (latitude + 1) / latitudeSegments * Math.PI;

            for(let longitude = 0; longitude < longitudeSegments; longitude++){
                const phi0 = longitude / longitudeSegments * Math.PI * 2;
                const phi1 = (longitude + 1) / longitudeSegments * Math.PI * 2;
                const pointA = g.testSphere.getPoint(theta0, phi0);
                const pointB = g.testSphere.getPoint(theta1, phi0);
                const pointC = g.testSphere.getPoint(theta1, phi1);
                const pointD = g.testSphere.getPoint(theta0, phi1);

                vertices.push(
                    pointA[0], pointA[1], pointA[2],
                    pointB[0], pointB[1], pointB[2],
                    pointC[0], pointC[1], pointC[2],
                    pointA[0], pointA[1], pointA[2],
                    pointC[0], pointC[1], pointC[2],
                    pointD[0], pointD[1], pointD[2],
                );
            }
        }

        const positions = new Float32Array(vertices);
        return {
            positions: { data: positions, size: 3 },
            vertexCount: positions.length / 3,
        };
    },
    getPoint(theta, phi){
        const sinTheta = Math.sin(theta);
        return [
            Math.cos(phi) * sinTheta,
            Math.cos(theta),
            Math.sin(phi) * sinTheta,
        ];
    },
    draw(){
        g.renderer.submit({
            program: g.testSphere.program,
            mode: "TRIANGLES",
            count: g.testSphere.geometry.vertexCount,
            attributes: {
                a_position: g.testSphere.geometry.positions,
            },
            uniforms: {
                u_modelViewProjection: { type: "mat4", value: g.renderer.createModelViewProjection([2.75, 0, 0], [0, 0, 0]) },
                u_color: { type: "vec4", value: [0.84, 0.86, 0.91, 1.0] },
            },
        });
    }
};
g.loadHandlers.push(g.testSphere.load);

