
g.math = {
    v3(x,y,z)   { return new Float32Array([x,y,z]); },
    v3add(a,b)   { return new Float32Array([a[0]+b[0],a[1]+b[1],a[2]+b[2]]); },
    v3sub(a,b)   { return new Float32Array([a[0]-b[0],a[1]-b[1],a[2]-b[2]]); },
    v3scale(a,s) { return new Float32Array([a[0]*s,a[1]*s,a[2]*s]); },
    v3dot(a,b)   { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; },
    v3cross(a,b) { return new Float32Array([a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]); },
    v3len(a)     { return Math.sqrt(a[0]*a[0]+a[1]*a[1]+a[2]*a[2]); },
    v3norm(a)    { const l=g.math.v3len(a)||1; return new Float32Array([a[0]/l,a[1]/l,a[2]/l]); },

    // mat4 column-major
    m4() { const m=new Float32Array(16); m[0]=m[5]=m[10]=m[15]=1; return m; },
    m4mul(a,b) {
        const o=new Float32Array(16);
        for(let c=0;c<4;c++) for(let r=0;r<4;r++){
            o[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
        }
        return o;
    },
    m4perspective(fov, aspect, near, far) {
        const f=1/Math.tan(fov/2), nf=1/(near-far), m=new Float32Array(16);
        m[0]=f/aspect; m[5]=f; m[10]=(far+near)*nf; m[11]=-1; m[14]=2*far*near*nf;
        return m;
    },
    m4translate(x,y,z) {
        const m=g.math.m4(); m[12]=x; m[13]=y; m[14]=z; return m;
    },
    m4rotateX(a) {
        const m=g.math.m4(), c=Math.cos(a), s=Math.sin(a);
        m[5]=c; m[6]=s; m[9]=-s; m[10]=c; return m;
    },
    m4rotateY(a) {
        const m=g.math.m4(), c=Math.cos(a), s=Math.sin(a);
        m[0]=c; m[2]=-s; m[8]=s; m[10]=c; return m;
    },
    m4rotateZ(a) {
        const m=g.math.m4(), c=Math.cos(a), s=Math.sin(a);
        m[0]=c; m[1]=s; m[4]=-s; m[5]=c; return m;
    },
    m4scale(x,y,z) {
        const m=g.math.m4(); m[0]=x; m[5]=y; m[10]=z; return m;
    },
    m4invert(a) {
        const o=new Float32Array(16);
        const a00=a[0],a01=a[1],a02=a[2],a03=a[3],
              a10=a[4],a11=a[5],a12=a[6],a13=a[7],
              a20=a[8],a21=a[9],a22=a[10],a23=a[11],
              a30=a[12],a31=a[13],a32=a[14],a33=a[15];
        const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10,
              b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12,
              b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30,
              b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32;
        let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06;
        if(!det) return g.math.m4();
        det=1/det;
        o[0]=(a11*b11-a12*b10+a13*b09)*det;
        o[1]=(a02*b10-a01*b11-a03*b09)*det;
        o[2]=(a31*b05-a32*b04+a33*b03)*det;
        o[3]=(a22*b04-a21*b05-a23*b03)*det;
        o[4]=(a12*b08-a10*b11-a13*b07)*det;
        o[5]=(a00*b11-a02*b08+a03*b07)*det;
        o[6]=(a32*b02-a30*b05-a33*b01)*det;
        o[7]=(a20*b05-a22*b02+a23*b01)*det;
        o[8]=(a10*b10-a11*b08+a13*b06)*det;
        o[9]=(a01*b08-a00*b10-a03*b06)*det;
        o[10]=(a30*b04-a31*b02+a33*b00)*det;
        o[11]=(a21*b02-a20*b04-a23*b00)*det;
        o[12]=(a11*b07-a10*b09-a12*b06)*det;
        o[13]=(a00*b09-a01*b07+a02*b06)*det;
        o[14]=(a31*b01-a30*b03-a32*b00)*det;
        o[15]=(a20*b03-a21*b01+a22*b00)*det;
        return o;
    },
    m4mulV4(m,v) {
        return new Float32Array([
            m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12]*v[3],
            m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13]*v[3],
            m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14]*v[3],
            m[3]*v[0]+m[7]*v[1]+m[11]*v[2]+m[15]*v[3],
        ]);
    },

    // quaternion helpers [x, y, z, w]
    quat(x,y,z,w) { return new Float32Array([x,y,z,w]); },
    quatIdentity() { return new Float32Array([0,0,0,1]); },
    quatFromAxisAngle(ax,ay,az,angle) {
        const ha = angle * 0.5, s = Math.sin(ha), c = Math.cos(ha);
        return new Float32Array([ax*s, ay*s, az*s, c]);
    },
    quatMul(a,b) {
        return new Float32Array([
            a[3]*b[0] + a[0]*b[3] + a[1]*b[2] - a[2]*b[1],
            a[3]*b[1] - a[0]*b[2] + a[1]*b[3] + a[2]*b[0],
            a[3]*b[2] + a[0]*b[1] - a[1]*b[0] + a[2]*b[3],
            a[3]*b[3] - a[0]*b[0] - a[1]*b[1] - a[2]*b[2],
        ]);
    },
    quatNorm(q) {
        const l = Math.sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3]) || 1;
        return new Float32Array([q[0]/l, q[1]/l, q[2]/l, q[3]/l]);
    },
    quatConjugate(q) { return new Float32Array([-q[0],-q[1],-q[2],q[3]]); },
    quatRotateVec3(q, v) {
        const qv = new Float32Array([q[0],q[1],q[2]]);
        const uv = g.math.v3cross(qv, v);
        const uuv = g.math.v3cross(qv, uv);
        return g.math.v3add(v, g.math.v3add(g.math.v3scale(uv, 2*q[3]), g.math.v3scale(uuv, 2)));
    },
    quatToMat4(q) {
        const x=q[0],y=q[1],z=q[2],w=q[3];
        const x2=x+x,y2=y+y,z2=z+z;
        const xx=x*x2,xy=x*y2,xz=x*z2;
        const yy=y*y2,yz=y*z2,zz=z*z2;
        const wx=w*x2,wy=w*y2,wz=w*z2;
        const m = new Float32Array(16);
        m[0]=1-yy-zz; m[1]=xy+wz;   m[2]=xz-wy;   m[3]=0;
        m[4]=xy-wz;   m[5]=1-xx-zz; m[6]=yz+wx;   m[7]=0;
        m[8]=xz+wy;   m[9]=yz-wx;   m[10]=1-xx-yy; m[11]=0;
        m[12]=0;       m[13]=0;      m[14]=0;       m[15]=1;
        return m;
    },
    quatSlerp(a, b, t) {
        let bx=b[0],by=b[1],bz=b[2],bw=b[3];
        let cosH = a[0]*bx + a[1]*by + a[2]*bz + a[3]*bw;
        if (cosH < 0) { bx=-bx; by=-by; bz=-bz; bw=-bw; cosH=-cosH; }
        if (cosH > 0.9999) {
            return g.math.quatNorm(new Float32Array([
                a[0]+(bx-a[0])*t, a[1]+(by-a[1])*t, a[2]+(bz-a[2])*t, a[3]+(bw-a[3])*t
            ]));
        }
        const h = Math.acos(cosH), sinH = Math.sin(h);
        const ra = Math.sin((1-t)*h)/sinH, rb = Math.sin(t*h)/sinH;
        return new Float32Array([a[0]*ra+bx*rb, a[1]*ra+by*rb, a[2]*ra+bz*rb, a[3]*ra+bw*rb]);
    },
    quatFromLookDir(dir, up0) {
        const fwd = g.math.v3norm(dir);
        const right = g.math.v3norm(g.math.v3cross(fwd, up0 || g.math.v3(0,1,0)));
        const up = g.math.v3cross(right, fwd);
        // rotation matrix → quaternion (from column vectors: right, up, -fwd)
        const m00=right[0], m01=up[0], m02=-fwd[0];
        const m10=right[1], m11=up[1], m12=-fwd[1];
        const m20=right[2], m21=up[2], m22=-fwd[2];
        const tr = m00+m11+m22;
        let q;
        if (tr > 0) {
            const s = 0.5/Math.sqrt(tr+1);
            q = new Float32Array([(m21-m12)*s, (m02-m20)*s, (m10-m01)*s, 0.25/s]);
        } else if (m00>m11 && m00>m22) {
            const s = 2*Math.sqrt(1+m00-m11-m22);
            q = new Float32Array([0.25*s, (m01+m10)/s, (m20+m02)/s, (m21-m12)/s]);
        } else if (m11>m22) {
            const s = 2*Math.sqrt(1+m11-m00-m22);
            q = new Float32Array([(m01+m10)/s, 0.25*s, (m12+m21)/s, (m02-m20)/s]);
        } else {
            const s = 2*Math.sqrt(1+m22-m00-m11);
            q = new Float32Array([(m20+m02)/s, (m12+m21)/s, 0.25*s, (m10-m01)/s]);
        }
        return g.math.quatNorm(q);
    },
};
