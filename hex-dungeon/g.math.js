g.math = {
    mat4Identity(){
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
    },
    mat4Multiply(a, b){
        const out = new Float32Array(16);
        for(let column = 0; column < 4; column++){
            for(let row = 0; row < 4; row++){
                out[column * 4 + row] =
                    a[0 * 4 + row] * b[column * 4 + 0] +
                    a[1 * 4 + row] * b[column * 4 + 1] +
                    a[2 * 4 + row] * b[column * 4 + 2] +
                    a[3 * 4 + row] * b[column * 4 + 3];
            }
        }
        return out;
    },
    mat4Perspective(fovRadians, aspect, near, far){
        const f = 1 / Math.tan(fovRadians / 2);
        const rangeInverse = 1 / (near - far);
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (near + far) * rangeInverse, -1,
            0, 0, near * far * rangeInverse * 2, 0,
        ]);
    },
    vec3Normalize(vector){
        const length = Math.hypot(vector[0], vector[1], vector[2]);
        if(length === 0){
            return [0, 0, 0];
        }
        return [vector[0] / length, vector[1] / length, vector[2] / length];
    },
    vec3Subtract(a, b){
        return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    },
    vec3Cross(a, b){
        return [
            a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0],
        ];
    },
    vec3Dot(a, b){
        return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    },
    mat4LookAt(eye, target, up){
        const zAxis = g.math.vec3Normalize(g.math.vec3Subtract(eye, target));
        const xAxis = g.math.vec3Normalize(g.math.vec3Cross(up, zAxis));
        const yAxis = g.math.vec3Cross(zAxis, xAxis);
        return new Float32Array([
            xAxis[0], yAxis[0], zAxis[0], 0,
            xAxis[1], yAxis[1], zAxis[1], 0,
            xAxis[2], yAxis[2], zAxis[2], 0,
            -g.math.vec3Dot(xAxis, eye), -g.math.vec3Dot(yAxis, eye), -g.math.vec3Dot(zAxis, eye), 1,
        ]);
    },
    mat4Translation(x, y, z){
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1,
        ]);
    },
    mat4RotationX(angle){
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            1, 0, 0, 0,
            0, c, s, 0,
            0, -s, c, 0,
            0, 0, 0, 1,
        ]);
    },
    mat4RotationY(angle){
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c, 0, -s, 0,
            0, 1, 0, 0,
            s, 0, c, 0,
            0, 0, 0, 1,
        ]);
    },
    mat4RotationZ(angle){
        const c = Math.cos(angle);
        const s = Math.sin(angle);
        return new Float32Array([
            c, s, 0, 0,
            -s, c, 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1,
        ]);
    },
    mat4Compose(position, rotation){
        const translation = g.math.mat4Translation(position[0], position[1], position[2]);
        const rotationX = g.math.mat4RotationX(rotation[0]);
        const rotationY = g.math.mat4RotationY(rotation[1]);
        const rotationZ = g.math.mat4RotationZ(rotation[2]);
        const rotationMatrix = g.math.mat4Multiply(rotationZ, g.math.mat4Multiply(rotationY, rotationX));
        return g.math.mat4Multiply(translation, rotationMatrix);
    },
    mat4Inverse(m){
        const out = new Float32Array(16);
        const m00=m[0],m01=m[1],m02=m[2],m03=m[3];
        const m10=m[4],m11=m[5],m12=m[6],m13=m[7];
        const m20=m[8],m21=m[9],m22=m[10],m23=m[11];
        const m30=m[12],m31=m[13],m32=m[14],m33=m[15];
        const b00=m00*m11-m01*m10, b01=m00*m12-m02*m10;
        const b02=m00*m13-m03*m10, b03=m01*m12-m02*m11;
        const b04=m01*m13-m03*m11, b05=m02*m13-m03*m12;
        const b06=m20*m31-m21*m30, b07=m20*m32-m22*m30;
        const b08=m20*m33-m23*m30, b09=m21*m32-m22*m31;
        const b10=m21*m33-m23*m31, b11=m22*m33-m23*m32;
        let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
        if(!det) return null;
        det=1.0/det;
        out[0]=(m11*b11-m12*b10+m13*b09)*det;
        out[1]=(m02*b10-m01*b11-m03*b09)*det;
        out[2]=(m31*b05-m32*b04+m33*b03)*det;
        out[3]=(m22*b04-m21*b05-m23*b03)*det;
        out[4]=(m12*b08-m10*b11-m13*b07)*det;
        out[5]=(m00*b11-m02*b08+m03*b07)*det;
        out[6]=(m32*b02-m30*b05-m33*b01)*det;
        out[7]=(m20*b05-m22*b02+m23*b01)*det;
        out[8]=(m10*b10-m11*b08+m13*b06)*det;
        out[9]=(m01*b08-m00*b10-m03*b06)*det;
        out[10]=(m30*b04-m31*b02+m33*b00)*det;
        out[11]=(m21*b02-m20*b04-m23*b00)*det;
        out[12]=(m11*b07-m10*b09-m12*b06)*det;
        out[13]=(m00*b09-m01*b07+m02*b06)*det;
        out[14]=(m31*b01-m30*b03-m32*b00)*det;
        out[15]=(m20*b03-m21*b01+m22*b00)*det;
        return out;
    },
    vec4TransformMat4(v, m){
        return [
            m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],
            m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],
            m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],
            m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3],
        ];
    },
};