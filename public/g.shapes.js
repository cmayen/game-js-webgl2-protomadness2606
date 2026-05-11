
g.shapes = {};

g.shapes.load=function() {
    // add a 20 sided die shape for testing to the map
    // g.map.dice20 = g.shapes.dice(20);


};
g.loadHandlers.push(g.shapes.load);

g.shapes.isoSphere = function(subdivisions = 2) {
    // create an icosahedron and then subdivide it to create a geodesic sphere
    const t = (1 + Math.sqrt(5)) / 2;

    let vertices = [
        -1,  t,  0,
         1,  t,  0,
        -1, -t,  0,
         1, -t,  0,
         0, -1,  t,
         0,  1,  t,
         0, -1, -t,
         0,  1, -t,
         t,  0, -1,
         t,  0,  1,
        -t,  0, -1,
        -t,  0,  1,
    ];

    // normalize initial vertices to unit sphere
    for (let i = 0; i < vertices.length; i += 3) {
        const len = Math.sqrt(vertices[i]*vertices[i] + vertices[i+1]*vertices[i+1] + vertices[i+2]*vertices[i+2]);
        vertices[i] /= len;
        vertices[i+1] /= len;
        vertices[i+2] /= len;
    }

    let indices = [
        [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
        [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
        [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
        [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1],
    ];

    // subdivide the triangles
    for (let i = 0; i < subdivisions; i++) {
        const newIndices = [];
        const midCache = {};

        function getMidpoint(i0, i1) {
            const key = [Math.min(i0,i1), Math.max(i0,i1)].join(',');
            if (midCache[key] !== undefined) return midCache[key];
            const v0 = vertices.slice(i0*3, i0*3+3);
            const v1 = vertices.slice(i1*3, i1*3+3);
            const mid = [
                (v0[0] + v1[0]) / 2,
                (v0[1] + v1[1]) / 2,
                (v0[2] + v1[2]) / 2,
            ];
            const len = Math.sqrt(mid[0]*mid[0] + mid[1]*mid[1] + mid[2]*mid[2]);
            midCache[key] = vertices.length / 3;
            vertices.push(mid[0]/len, mid[1]/len, mid[2]/len);
            return midCache[key];
        }

        for (const tri of indices) {
            const v0 = tri[0];
            const v1 = tri[1];
            const v2 = tri[2];

            const a = getMidpoint(v0, v1);
            const b = getMidpoint(v1, v2);
            const c = getMidpoint(v2, v0);

            newIndices.push([v0, a, c]);
            newIndices.push([v1, b, a]);
            newIndices.push([v2, c, b]);
            newIndices.push([a, b, c]);
        }
        indices = newIndices;
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices.flat()),
    };
};



g.shapes.cube = function() {
    return {
        vertices: new Float32Array([
            -1, -1, -1,  1, -1, -1,  1,  1, -1,  -1,  1, -1,
            -1, -1,  1,  1, -1,  1,  1,  1,  1,  -1,  1,  1,
        ]),
        indices: new Uint16Array([
            0,1,2,   0,2,3,
            4,5,6,   4,6,7,
            0,4,7,   0,7,3,
            1,5,6,   1,6,2,
            3,2,6,   3,6,7,
            0,1,5,   0,5,4,
        ]),
    };
};


g.shapes.cylinder = function(segments = 16) {
    const vertices = [];
    const indices = [];

    // top center vertex
    vertices.push(0, 1, 0);

    // bottom center vertex
    vertices.push(0, -1, 0);

    // circle vertices
    for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = Math.cos(angle);
        const z = Math.sin(angle);
        vertices.push(x, 1, z);   // top circle
        vertices.push(x, -1, z);  // bottom circle
    }

    // top and bottom faces
    for (let i = 0; i < segments; i++) {
        const next = (i + 1) % segments;
        indices.push(0, 2 + i*2, 2 + next*2);       // top face
        indices.push(1, 3 + next*2, 3 + i*2);       // bottom face
        indices.push(2 + i*2, 3 + i*2, 3 + next*2); // side face 1
        indices.push(2 + i*2, 3 + next*2, 2 + next*2); // side face 2
    }

    return {
        vertices: new Float32Array(vertices),
        indices: new Uint16Array(indices),
    };
};


g.shapes.plane = function() {
    return {
        vertices: new Float32Array([
            -1, 0, -1,
             1, 0, -1,
             1, 0,  1,
            -1, 0,  1,
        ]),
        indices: new Uint16Array([
            0,1,2,
            0,2,3,
        ]),
    };
};

g.shapes.dice = function(sides){
    const shapes = {
        4: {
            vertices: new Float32Array([
                0, 0, 1,
                0.9428, 0, -0.3333,
                -0.4714, 0.8165, -0.3333,
                -0.4714, -0.8165, -0.3333,
            ]),
            indices: new Uint16Array([
                0,1,2,
                0,2,3,
                0,3,1,
                1,3,2,
            ]),
        },
        6: {
            vertices: new Float32Array([
                -1, -1, -1,
                 1, -1, -1,
                 1,  1, -1,
                -1,  1, -1,
                -1, -1,  1,
                 1, -1,  1,
                 1,  1,  1,
                -1,  1,  1,
            ]),
            indices: new Uint16Array([
                0,1,2,   0,2,3,
                4,5,6,   4,6,7,
                0,4,7,   0,7,3,
                1,5,6,   1,6,2,
                3,2,6,   3,6,7,
                0,1,5,   0,5,4,
            ]),
        },
        8: g.shapes.isoSphere(1),
        12: g.shapes.isoSphere(2),
        20: g.shapes.isoSphere(3),
        10: {
            vertices: new Float32Array([
                0, 0, 1,
                0.9511, 0, 0.3090,
                0.5878, 0.8090, 0.3090,
                -0.5878, 0.8090, 0.3090,
                -0.9511, 0, 0.3090,
                -0.5878, -0.8090, 0.3090,
                0.5878, -0.8090, 0.3090,
                0.5878, 0.8090, -0.3090,
                -0.5878, 0.8090, -0.3090,
                -1.9021e-16, -1, -3.7007e-16,
            ]),
            indices: new Uint16Array([
                0,1,2,
                0,2,3,
                0,3,4,
                0,4,5,
                0,5,6,
                0,6,1,
                7,8,9,
                7,9,1,
                7,1,2,
                7,2,8,
                7,8,3,
                7,3,9,
                7,9,4,
                7,4,1,
                7,1,5,
                7,5,8,
                7,8,6,
                7,6,2,
            ]),
        },
    };
    return shapes[sides] || null;
};

