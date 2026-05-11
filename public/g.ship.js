
g.ship = {
    vbo: null,
    ibo: null,
    indexCount: 0,
    thrusterVBO: null,

    generate() {
        const verts = [];
        const idxs = [];
        let vc = 0;

        // Flat-shaded: each face gets unique verts with face normal
        function face(p0, p1, p2, col) {
            const ux=p1[0]-p0[0], uy=p1[1]-p0[1], uz=p1[2]-p0[2];
            const vx=p2[0]-p0[0], vy=p2[1]-p0[1], vz=p2[2]-p0[2];
            let nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx;
            const l = Math.sqrt(nx*nx+ny*ny+nz*nz)||1;
            nx/=l; ny/=l; nz/=l;
            const i = vc;
            for (const p of [p0,p1,p2]) verts.push(p[0],p[1],p[2], nx,ny,nz, col[0],col[1],col[2]);
            idxs.push(i, i+1, i+2);
            vc += 3;
        }
        function quad(a,b,c,d, col) { face(a,b,c,col); face(a,c,d,col); }
        function mirror(fn) { fn(1); fn(-1); }

        // Colors
        const H  = [0.28, 0.31, 0.36]; // hull
        const HD = [0.18, 0.20, 0.25]; // hull dark
        const HL = [0.35, 0.40, 0.48]; // hull light
        const AC = [0.30, 0.50, 0.70]; // accent
        const CK = [0.10, 0.28, 0.50]; // cockpit glass
        const EN = [0.65, 0.30, 0.08]; // engine glow
        const WG = [0.22, 0.24, 0.29]; // wing
        const WD = [0.16, 0.18, 0.22]; // wing dark
        const FN = [0.24, 0.27, 0.32]; // fin

        // === NOSE → FRONT ===
        const nose = [0, 0.02, -1.4];
        const fTR  = [0.12, 0.07, -0.6];
        const fR   = [0.16, 0.00, -0.6];
        const fBR  = [0.10,-0.05, -0.6];
        const fB   = [0, -0.07, -0.6];
        const fBL  = [-0.10,-0.05, -0.6];
        const fL   = [-0.16, 0.00, -0.6];
        const fTL  = [-0.12, 0.07, -0.6];
        const fT   = [0, 0.10, -0.6];

        // Nose fan (8 tris)
        face(nose, fTR, fR, AC);
        face(nose, fR, fBR, H);
        face(nose, fBR, fB, HD);
        face(nose, fB, fBL, HD);
        face(nose, fBL, fL, H);
        face(nose, fL, fTL, AC);
        face(nose, fTL, fT, HL);
        face(nose, fT, fTR, HL);

        // === FRONT → MID ===
        const mTR  = [0.22, 0.08, -0.05];
        const mR   = [0.26, 0.00, -0.05];
        const mBR  = [0.18,-0.07, -0.05];
        const mB   = [0, -0.10, -0.05];
        const mBL  = [-0.18,-0.07, -0.05];
        const mL   = [-0.26, 0.00, -0.05];
        const mTL  = [-0.22, 0.08, -0.05];
        const mT   = [0, 0.12, -0.05];

        quad(fTR, mTR, mR, fR, H);
        quad(fR, mR, mBR, fBR, HD);
        quad(fBR, mBR, mB, fB, HD);
        quad(fB, mB, mBL, fBL, HD);
        quad(fBL, mBL, mL, fL, HD);
        quad(fL, mL, mTL, fTL, H);
        quad(fTL, mTL, mT, fT, HL);
        quad(fT, mT, mTR, fTR, HL);

        // === MID → REAR ===
        const rTR  = [0.14, 0.07, 0.45];
        const rR   = [0.18, 0.00, 0.45];
        const rBR  = [0.12,-0.05, 0.45];
        const rB   = [0, -0.07, 0.45];
        const rBL  = [-0.12,-0.05, 0.45];
        const rL   = [-0.18, 0.00, 0.45];
        const rTL  = [-0.14, 0.07, 0.45];
        const rT   = [0, 0.10, 0.45];

        quad(mTR, rTR, rR, mR, H);
        quad(mR, rR, rBR, mBR, HD);
        quad(mBR, rBR, rB, mB, HD);
        quad(mB, rB, rBL, mBL, HD);
        quad(mBL, rBL, rL, mL, HD);
        quad(mL, rL, rTL, mTL, H);
        quad(mTL, rTL, rT, mT, HL);
        quad(mT, rT, rTR, mTR, HL);

        // === ENGINE SECTION ===
        const eTR = [0.10, 0.06, 0.70];
        const eR  = [0.12, 0.00, 0.70];
        const eBR = [0.08,-0.04, 0.70];
        const eB  = [0, -0.05, 0.70];
        const eBL = [-0.08,-0.04, 0.70];
        const eL  = [-0.12, 0.00, 0.70];
        const eTL = [-0.10, 0.06, 0.70];
        const eT  = [0, 0.08, 0.70];

        quad(rTR, eTR, eR, rR, H);
        quad(rR, eR, eBR, rBR, HD);
        quad(rBR, eBR, eB, rB, HD);
        quad(rB, eB, eBL, rBL, HD);
        quad(rBL, eBL, eL, rL, HD);
        quad(rL, eL, eTL, rTL, H);
        quad(rTL, eTL, eT, rT, HL);
        quad(rT, eT, eTR, rTR, HL);

        // Engine rear cap (8 tris) - orange glow
        const ec = [0, 0.01, 0.72];
        face(eTR, eR, ec, EN);
        face(eR, eBR, ec, EN);
        face(eBR, eB, ec, EN);
        face(eB, eBL, ec, EN);
        face(eBL, eL, ec, EN);
        face(eL, eTL, ec, EN);
        face(eTL, eT, ec, EN);
        face(eT, eTR, ec, EN);

        // === COCKPIT CANOPY ===
        const ckF = [0, 0.14, -0.55];
        const ckM = [0, 0.18, -0.25];
        const ckR = [0, 0.14, 0.0];

        mirror(s => {
            const ckFL = [s*0.08, 0.09, -0.55];
            const ckML = [s*0.12, 0.10, -0.25];
            const ckRL = [s*0.10, 0.09, 0.0];
            // Canopy sides
            face(ckF, s>0?ckFL:ckM, s>0?ckM:ckFL, CK);
            face(ckFL, s>0?ckML:ckM, s>0?ckM:ckML, CK);
            face(ckM, s>0?ckML:ckR, s>0?ckR:ckML, CK);
            face(ckML, s>0?ckRL:ckR, s>0?ckR:ckRL, CK);
        });
        // Canopy top ridge
        face(ckF, ckM, [0.08, 0.09, -0.55], CK);
        face(ckF, [-0.08, 0.09, -0.55], ckM, CK);
        face(ckM, ckR, [0.10, 0.09, 0.0], CK);
        face(ckM, [-0.10, 0.09, 0.0], ckR, CK);

        // === DELTA WINGS ===
        mirror(s => {
            const wRoot1 = [s*0.22, 0.00, -0.15];
            const wRoot2 = [s*0.18, 0.00, 0.40];
            const wTip   = [s*0.70, -0.02, 0.15];
            const wTrail = [s*0.35, -0.01, 0.48];
            const wMid   = [s*0.45, -0.01, 0.05];

            // Wing top surfaces
            face(wRoot1, s>0?wMid:wTip, s>0?wTip:wMid, WG);
            face(wRoot1, s>0?wRoot2:wMid, s>0?wMid:wRoot2, WG);
            face(wMid, s>0?wTrail:wTip, s>0?wTip:wTrail, WG);
            face(wRoot2, s>0?wTrail:wMid, s>0?wMid:wTrail, WG);

            // Wing bottom surfaces (flipped normals via reversed winding)
            face(wRoot1, s>0?wTip:wMid, s>0?wMid:wTip, WD);
            face(wRoot1, s>0?wMid:wRoot2, s>0?wRoot2:wMid, WD);
            face(wMid, s>0?wTip:wTrail, s>0?wTrail:wTip, WD);
            face(wRoot2, s>0?wMid:wTrail, s>0?wTrail:wMid, WD);

            // Wing tip edge (vertical strip for thickness)
            const wTipU = [s*0.70, 0.01, 0.15];
            face(wTip, s>0?wTipU:wTrail, s>0?wTrail:wTipU, AC);
            face(wTipU, s>0?[s*0.35, 0.02, 0.48]:wTrail, s>0?wTrail:[s*0.35, 0.02, 0.48], AC);
        });

        // === VERTICAL STABILIZER (dorsal fin) ===
        const finBase1 = [0, 0.10, 0.15];
        const finBase2 = [0, 0.10, 0.55];
        const finTip1  = [0, 0.30, 0.30];
        const finTip2  = [0, 0.28, 0.55];

        mirror(s => {
            const off = s * 0.005;
            face([off,0.10,0.15], s>0?[off,0.30,0.30]:[off,0.10,0.55], s>0?[off,0.10,0.55]:[off,0.30,0.30], FN);
            face([off,0.10,0.55], s>0?[off,0.30,0.30]:[off,0.28,0.55], s>0?[off,0.28,0.55]:[off,0.30,0.30], FN);
        });

        // === VENTRAL FINS (small) ===
        mirror(s => {
            const vf1 = [s*0.10, -0.06, 0.25];
            const vf2 = [s*0.10, -0.06, 0.50];
            const vfT = [s*0.18, -0.14, 0.42];
            face(vf1, s>0?vfT:vf2, s>0?vf2:vfT, FN);
            face(vf1, s>0?vf2:vfT, s>0?vfT:vf2, FN);
        });

        // === ACCENT STRIPES (hull panels) ===
        mirror(s => {
            quad(
                [s*0.15, 0.075, -0.55],
                [s*0.20, 0.075, -0.10],
                [s*0.18, 0.085, -0.10],
                [s*0.13, 0.085, -0.55],
                AC
            );
        });

        g.ship.vbo = null;
        g.ship.ibo = null;
        g.ship.vertData = new Float32Array(verts);
        g.ship.idxData  = new Uint16Array(idxs);
        g.ship.indexCount = idxs.length;
    },
};
g.loadHandlers.push(g.ship.generate);
