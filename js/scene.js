import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { NET_TYPES, GROUNDS } from './calc.js';

const v = (a, b, c) => new THREE.Vector3(a, b, c);
const L = c => new THREE.MeshLambertMaterial({ color: c });
const M = {
  wall: L(0xb8875a), div: L(0xddb984), post: L(0x9a6c40), lath: L(0xc99a66), metal: L(0x9da3a8),
  soil: L(0x5b3a24), g1: L(0x4f9a3a), g2: L(0x77b84a), red: L(0xd8452b), yellow: L(0xf1d64a), orange: L(0xe98a2a),
};
const edgeMat = new THREE.LineBasicMaterial({ color: 0x5a3a1e });
const chainMat = new THREE.LineBasicMaterial({ color: 0x6e7378 });
const stringMat = new THREE.LineBasicMaterial({ color: 0xf2efe6 });
const sph = new THREE.SphereGeometry(1, 12, 8), cone = new THREE.ConeGeometry(1, 1, 8), cyl = new THREE.CylinderGeometry(1, 1, 1, 8);
const hingeGeo = new THREE.CylinderGeometry(0.7, 0.7, 7, 10);

export class KastenScene {
  constructor(el) {
    this.el = el;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    el.appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(40, 1, 1, 5000);
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0xb0a890, 2.2));
    const d = new THREE.DirectionalLight(0xffffff, 1.6); d.position.set(120, 260, 160); this.scene.add(d);
    this.controls = new OrbitControls(this.cam, this.renderer.domElement);
    this.controls.enableDamping = true; this.controls.maxPolarAngle = Math.PI * 0.49;
    this.view = { explode: false, lid: false, doors: false, plants: false, net: true };
    this.anim = { ex: 0, lid: 0, door: 0 };
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.firstFrame = true;
    new ResizeObserver(() => this.resize()).observe(el);
    this.resize();
    const loop = () => { this.tick(); requestAnimationFrame(loop); };
    loop();
  }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
  }

  box(g, m, w, h, d, x, y, z, edge = true) {
    if (w <= 0.01 || h <= 0.01 || d <= 0.01) return;
    const ge = new THREE.BoxGeometry(w, h, d), me = new THREE.Mesh(ge, m);
    me.position.set(x, y, z);
    if (edge) me.add(new THREE.LineSegments(new THREE.EdgesGeometry(ge), edgeMat));
    g.add(me); return me;
  }
  mesh(g, ge, m, x, y, z, sx = 1, sy = 1, sz = 1) {
    const me = new THREE.Mesh(ge, m); me.position.set(x, y, z); me.scale.set(sx, sy, sz); g.add(me); return me;
  }
  lines(g, pts, mat) { g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), mat)); }

  plant(g, type, x, y, z, s) {
    const m = this.mesh.bind(this);
    if (type === 0) { m(g, sph, M.g2, x, y + 5 * s, z, 11 * s, 6 * s, 11 * s); m(g, sph, M.g1, x, y + 8 * s, z, 7 * s, 5 * s, 7 * s); }
    else if (type === 1) { for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) m(g, cone, M.g1, x + (-10.5 + a * 7) * s, y + 5 * s, z + (-10.5 + b * 7) * s, 1.6 * s, 10 * s, 1.6 * s); }
    else if (type === 2) {
      m(g, cyl, M.g1, x, y + 15 * s, z, 0.8 * s, 30 * s, 0.8 * s);
      [[4, 12, 2], [-3, 18, -3], [2, 24, -1], [-4, 9, 3]].forEach(([a, h, b]) => m(g, sph, M.red, x + a * s, y + h * s, z + b * s, 2.6 * s, 2.6 * s, 2.6 * s));
      m(g, sph, M.g2, x, y + 22 * s, z, 9 * s, 9 * s, 9 * s);
    } else {
      for (let i = 0; i < 9; i++) m(g, sph, M.g2, x + (-8 + (i % 3) * 8) * s, y + 3 * s, z + (-8 + Math.floor(i / 3) * 8) * s, 3 * s, 3 * s, 3 * s);
      m(g, cyl, M.g1, x, y + 12 * s, z, 0.6 * s, 24 * s, 0.6 * s); m(g, sph, M.yellow, x, y + 25 * s, z, 4 * s, 1.5 * s, 4 * s);
    }
  }

  netPanel(g, a, b, mesh, mat, axis) {
    // rechteckiges Netz zwischen zwei Ecken a,b in einer Ebene (axis: welche Koordinate konstant ist)
    const P = [];
    const [u, w] = axis === 'z' ? ['x', 'y'] : axis === 'x' ? ['z', 'y'] : ['x', 'z'];
    const nu = Math.max(1, Math.round(Math.abs(b[u] - a[u]) / mesh)), nw = Math.max(1, Math.round(Math.abs(b[w] - a[w]) / mesh));
    const mk = (uu, ww) => { const p = a.clone(); p[u] = uu; p[w] = ww; return p; };
    for (let i = 0; i <= nu; i++) { const uu = a[u] + i * (b[u] - a[u]) / nu; P.push(mk(uu, a[w]), mk(uu, b[w])); }
    for (let j = 0; j <= nw; j++) { const ww = a[w] + j * (b[w] - a[w]) / nw; P.push(mk(a[u], ww), mk(b[u], ww)); }
    this.lines(g, P, mat);
  }

  leaf(g, w, h, dir, c, netMat, mesh) {
    // Türflügel, Scharnier bei x=0, Flügel erstreckt sich in Richtung dir
    const x0 = dir > 0 ? 0 : -w, lw = c.lw, lt = c.lt;
    this.box(g, M.lath, w, lw, lt, x0 + w / 2, lw / 2, 0);
    this.box(g, M.lath, w, lw, lt, x0 + w / 2, h - lw / 2, 0);
    this.box(g, M.lath, lw, h - 2 * lw, lt, x0 + lw / 2, h / 2, 0);
    this.box(g, M.lath, lw, h - 2 * lw, lt, x0 + w - lw / 2, h / 2, 0);
    this.netPanel(g, v(x0 + lw, lw, 0), v(x0 + w - lw, h - lw, 0), mesh, netMat, 'z');
    [h * 0.15, h * 0.85].forEach(y => this.mesh(g, hingeGeo, M.metal, 0, y, 0));
    this.mesh(g, sph, M.metal, dir > 0 ? w - 3 : -w + 3, h / 2, lt, 1.2, 1.2, 1.2);
  }

  update(R) {
    const { G, c } = R;
    this.scene.remove(this.root);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.parts = {}; this.chains = [];
    const H = c.h, y0 = -H / 2, t = c.t;
    const netMat = new THREE.LineBasicMaterial({ color: NET_TYPES[c.netType].color, transparent: true, opacity: 0.55 });
    const mesh = Math.max(c.mesh, 3); // Darstellung: sehr feine Netze gröber zeichnen
    this.H = H;

    // ---- Kasten ----
    const segs = (Ln, cuts) => { const s = []; let a = -Ln / 2; cuts.forEach(p => { s.push([a, p - t / 2]); a = p + t / 2; }); s.push([a, Ln / 2]); return s; };
    const xg = new THREE.Group(); this.root.add(xg); this.parts.xg = xg;
    G.pz.forEach((z, k) => {
      const m = (k === 0 || k === G.pz.length - 1) ? M.wall : M.div;
      this.box(xg, m, G.LX, H / 2, t, 0, y0 + H * 0.75, z);
      segs(G.LX, G.px).forEach(([a, b]) => this.box(xg, m, b - a, H / 2, t, (a + b) / 2, y0 + H * 0.25, z));
    });
    G.px.forEach((x, k) => {
      const m = (k === 0 || k === G.px.length - 1) ? M.wall : M.div;
      this.box(this.root, m, t, H / 2, G.LZ, x, y0 + H * 0.25, 0);
      segs(G.LZ, G.pz).forEach(([a, b]) => this.box(this.root, m, t, H / 2, b - a, x, y0 + H * 0.75, (a + b) / 2));
    });
    if (c.grid === 'schnur') {
      const P = [], yS = H / 2 + 0.2;
      for (let i = 1; i < c.nx; i++) { const x = -G.iX / 2 + i * c.cell; P.push(v(x, yS, -G.iZ / 2), v(x, yS, G.iZ / 2)); }
      for (let j = 1; j < c.nz; j++) { const z = -G.iZ / 2 + j * c.cell; P.push(v(-G.iX / 2, yS, z), v(G.iX / 2, yS, z)); }
      this.lines(this.root, P, stringMat);
    }

    // ---- Untergrund und Bodenaufbau ----
    const gr = GROUNDS[c.ground], Ls = gr.layers, gY = y0 - (Ls.includes('kloetze') ? 2 : 0);
    const gSize = Math.max(G.LX, G.LZ) * 2.6;
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(gSize, gSize), L(gr.color));
    plane.rotation.x = -Math.PI / 2; plane.position.y = gY - 0.15; this.root.add(plane);
    const tile = c.ground === 'pflaster' ? 30 : c.ground === 'holz' ? 14 : 0;
    if (tile) {
      const P = [], n = Math.floor(gSize / 2 / tile), y = gY - 0.1;
      for (let i = -n; i <= n; i++) {
        P.push(v(i * tile, y, -gSize / 2), v(i * tile, y, gSize / 2));
        if (c.ground === 'pflaster') P.push(v(-gSize / 2, y, i * tile), v(gSize / 2, y, i * tile));
      }
      this.lines(this.root, P, new THREE.LineBasicMaterial({ color: 0x5f5a50, transparent: true, opacity: 0.5 }));
    }
    const lg = new THREE.Group(); this.root.add(lg);
    if (Ls.includes('kloetze')) {
      const xs = [G.px[0], G.px[G.px.length - 1]], zs = [G.pz[0], G.pz[G.pz.length - 1]];
      const pts = new Set();
      G.px.forEach(x => zs.forEach(z => pts.add(x + '|' + z)));
      G.pz.forEach(z => xs.forEach(x => pts.add(x + '|' + z)));
      pts.forEach(k => { const [x, z] = k.split('|').map(Number); this.box(lg, M.post, 6, 2, 6, x, y0 - 1, z, false); });
    }
    if (Ls.includes('folie')) {
      const fm = L(0x2b2b2b), fw = G.oX + 0.6, fd = G.oZ + 0.6, fh = Math.min(20, H);
      this.box(lg, fm, fw, 0.2, fd, 0, y0 + 0.1, 0, false);
      this.box(lg, fm, fw, fh, 0.2, 0, y0 + fh / 2, fd / 2, false); this.box(lg, fm, fw, fh, 0.2, 0, y0 + fh / 2, -fd / 2, false);
      this.box(lg, fm, 0.2, fh, fd, fw / 2, y0 + fh / 2, 0, false); this.box(lg, fm, 0.2, fh, fd, -fw / 2, y0 + fh / 2, 0, false);
    }
    if (Ls.includes('vlies')) this.box(lg, L(0xf1f0ea), G.oX + 20, 0.25, G.oZ + 20, 0, y0 - 0.02, 0, false);
    if (Ls.includes('gitter')) {
      const P = [], w = G.oX + 10, d = G.oZ + 10, st = 4, y = y0 + 0.15;
      for (let x = -w / 2; x <= w / 2 + 0.01; x += st) P.push(v(x, y, -d / 2), v(x, y, d / 2));
      for (let z = -d / 2; z <= d / 2 + 0.01; z += st) P.push(v(-w / 2, y, z), v(w / 2, y, z));
      this.lines(lg, P, new THREE.LineBasicMaterial({ color: 0x8e959b }));
    }
    if (R.drain > 0) {
      const dm = L(0xc0703a);
      const cellsAll = c.grid === 'bretter' ? G.cellsX.flatMap(x => G.cellsZ.map(z => [x, z, c.cell, c.cell])) : [[0, 0, G.iX, G.iZ]];
      cellsAll.forEach(([x, z, w, d]) => {
        this.box(lg, dm, w, R.drain, d, x, y0 + R.drain / 2, z, false);
        if (Ls.includes('vlies2')) this.box(lg, L(0xf1f0ea), w, 0.2, d, x, y0 + R.drain + 0.1, z, false);
      });
    }

    // ---- Erde & Pflanzen ----
    const pg = new THREE.Group(); this.root.add(pg); this.parts.pg = pg;
    const ys = H / 2 - c.soilGap, ps = c.cell / 30;
    if (c.grid === 'bretter') {
      G.cellsX.forEach((x, i) => G.cellsZ.forEach((z, j) => {
        this.box(pg, M.soil, c.cell, ys - y0 - R.drain - 0.3, c.cell, x, (ys + y0 + R.drain + 0.3) / 2, z, false);
        this.plant(pg, (i * 3 + j * 5 + i * j) % 4, x, ys, z, ps);
      }));
    } else {
      this.box(pg, M.soil, G.iX, ys - y0 - R.drain - 0.3, G.iZ, 0, (ys + y0 + R.drain + 0.3) / 2, 0, false);
      G.cellsX.forEach((x, i) => G.cellsZ.forEach((z, j) => this.plant(pg, (i * 3 + j * 5 + i * j) % 4, x, ys, z, ps)));
    }

    // ---- Pfosten, Latten, Netz ----
    let topY = H / 2;
    if (c.posts) {
      const ax = G.ax, az = G.az, PH = c.h + c.cageH, yt = y0 + PH, yb = H / 2, yGround = y0 - c.postGround;
      topY = yt;
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => this.box(this.root, M.post, c.ps, PH + c.postGround, c.ps, sx * ax, (yt + yGround) / 2, sz * az));
      const ng = new THREE.Group(); this.root.add(ng); this.parts.ng = ng;
      const rx = G.oX, rz = G.oZ, lw = c.lw, lt = c.lt;
      this.box(ng, M.lath, rx, lw, lt, 0, yt - lw / 2, az);
      this.box(ng, M.lath, rx, lw, lt, 0, yt - lw / 2, -az);
      this.box(ng, M.lath, lt, lw, rz, ax, yt - lw / 2, 0);
      this.box(ng, M.lath, lt, lw, rz, -ax, yt - lw / 2, 0);
      if (c.net) {
        const ytn = yt - lw;
        this.netPanel(ng, v(-rx / 2, yb, -az), v(rx / 2, ytn, -az), mesh, netMat, 'z');
        this.netPanel(ng, v(ax, yb, -rz / 2), v(ax, ytn, rz / 2), mesh, netMat, 'x');
        this.netPanel(ng, v(-ax, yb, -rz / 2), v(-ax, ytn, rz / 2), mesh, netMat, 'x');
        if (c.front === 'netz') this.netPanel(ng, v(-rx / 2, yb, az), v(rx / 2, ytn, az), mesh, netMat, 'z');
        else if (R.doorLeaf) {
          const DL = R.doorLeaf;
          const l = new THREE.Group(); l.position.set(-rx / 2, yb, az); ng.add(l); this.leaf(l, DL.w, DL.h, 1, c, netMat, mesh);
          this.parts.doors = [{ g: l, s: -1 }];
          if (DL.leaves === 2) {
            const r = new THREE.Group(); r.position.set(rx / 2, yb, az); ng.add(r); this.leaf(r, DL.w, DL.h, -1, c, netMat, mesh);
            this.parts.doors.push({ g: r, s: 1 });
          }
        }
        if (c.top === 'fest') this.netPanel(ng, v(-ax - c.ps / 2, yt, -az - c.ps / 2), v(ax + c.ps / 2, yt, az + c.ps / 2), mesh, netMat, 'y');
        if (c.top === 'klapp') {
          const DX = R.lidDX, DZ = R.lidDZ;
          const lid = new THREE.Group(); lid.position.set(0, yt, -DZ / 2); ng.add(lid); this.parts.lid = lid;
          this.box(lid, M.lath, DX, lt, lw, 0, lt / 2, lw / 2);
          this.box(lid, M.lath, DX, lt, lw, 0, lt / 2, DZ - lw / 2);
          this.box(lid, M.lath, lw, lt, DZ - 2 * lw, -DX / 2 + lw / 2, lt / 2, DZ / 2);
          this.box(lid, M.lath, lw, lt, DZ - 2 * lw, DX / 2 - lw / 2, lt / 2, DZ / 2);
          this.netPanel(lid, v(-DX / 2 + lw, lt, lw), v(DX / 2 - lw, lt, DZ - lw), mesh, netMat, 'y');
          const nh = DX > 150 ? 3 : 2;
          for (let k = 0; k < nh; k++) {
            const x = -DX * 0.3 + k * (DX * 0.6) / (nh - 1);
            const hm = this.mesh(ng, hingeGeo, M.metal, x, yt, -DZ / 2); hm.rotation.z = Math.PI / 2;
          }
          if (c.chain) [-1, 1].forEach(s => {
            const cl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]), chainMat);
            ng.add(cl);
            this.chains.push({ cl, a: v(s * (DX / 2 - lw / 2), 0, DZ * 0.4), b: v(s * ax, yt - lw - 12, -az - c.ps / 2 - 0.2) });
          });
        }
      }
    }

    // Kamera einmalig bzw. bei Größenänderung neu ausrichten
    const span = Math.max(G.LX, G.LZ, topY - y0);
    const key = `${Math.round(G.LX)}|${Math.round(G.LZ)}|${Math.round(topY)}`;
    if (key !== this.camKey) {
      this.camKey = key;
      const target = v(0, (topY + y0) / 2 * 0.6, 0);
      const dir = this.firstFrame ? v(1, 0.85, 1.25).normalize() : this.cam.position.clone().sub(this.controls.target).normalize();
      this.controls.target.copy(target);
      const fit = Math.pow(Math.min(1, this.cam.aspect || 1), 0.9);
      this.cam.position.copy(target.clone().add(dir.multiplyScalar(span * 2.1 / fit)));
      this.firstFrame = false;
    }
  }

  tick() {
    const A = this.anim, V = this.view, P = this.parts || {};
    A.ex += ((V.explode ? 1 : 0) - A.ex) * 0.12;
    A.lid += ((V.lid ? 1.75 : 0) - A.lid) * 0.08;
    A.door += ((V.doors ? 1.6 : 0) - A.door) * 0.08;
    const off = A.ex < 0.05;
    if (P.xg) P.xg.position.y = A.ex * this.H * 1.1;
    if (P.ng) P.ng.visible = V.net && off;
    if (P.pg) P.pg.visible = V.plants && off;
    if (P.lid) {
      P.lid.rotation.x = -A.lid; P.lid.updateMatrixWorld();
      (this.chains || []).forEach(ch => {
        ch.cl.visible = A.lid > 0.4;
        const p = ch.a.clone(); P.lid.localToWorld(p); P.ng.worldToLocal(p);
        const ar = ch.cl.geometry.attributes.position;
        ar.setXYZ(0, p.x, p.y, p.z); ar.setXYZ(1, ch.b.x, ch.b.y, ch.b.z); ar.needsUpdate = true;
      });
    }
    (P.doors || []).forEach(d => { d.g.rotation.y = d.s * A.door; });
    this.controls.update();
    this.renderer.render(this.scene, this.cam);
  }
}
