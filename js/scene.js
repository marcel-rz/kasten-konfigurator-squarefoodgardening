import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { NET_TYPES, GROUNDS } from './calc.js';
import { braced } from './options.js';

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
    this.labels = new CSS2DRenderer();
    Object.assign(this.labels.domElement.style, { position: 'absolute', top: '0', left: '0', pointerEvents: 'none' });
    el.appendChild(this.labels.domElement);
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
    this.renderer.setSize(w, h); this.labels.setSize(w, h); this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
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
    // Diagonalstrebe: unten an der Scharnierseite nach oben zur Schlossseite
    if (braced(w, h)) this.beam(g, v(dir * lw, lw, 0), v(dir * (w - lw), h - lw, 0), c);
    [h * 0.15, h * 0.85].forEach(y => this.mesh(g, hingeGeo, M.metal, 0, y, 0));
    this.mesh(g, sph, M.metal, dir > 0 ? w - 3 : -w + 3, h / 2, lt, 1.2, 1.2, 1.2);
  }

  // Rahmen aus Latten mit Netz, senkrecht in der XY-Ebene (z = 0)
  vFrame(g, x0, x1, y0, y1, c, netMat, mesh) {
    const lw = c.lw, lt = c.lt, w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2;
    this.box(g, M.lath, w, lw, lt, cx, y0 + lw / 2, 0); this.box(g, M.lath, w, lw, lt, cx, y1 - lw / 2, 0);
    this.box(g, M.lath, lw, h - 2 * lw, lt, x0 + lw / 2, (y0 + y1) / 2, 0); this.box(g, M.lath, lw, h - 2 * lw, lt, x1 - lw / 2, (y0 + y1) / 2, 0);
    this.netPanel(g, v(x0 + lw, y0 + lw, 0), v(x1 - lw, y1 - lw, 0), mesh, netMat, 'z');
    if (braced(w, h)) this.beam(g, v(x0 + lw, y0 + lw, 0), v(x1 - lw, y1 - lw, 0), c);
  }
  // Rahmen aus Latten mit Netz, waagerecht in der XZ-Ebene (y = 0)
  hFrame(g, x0, x1, z0, z1, c, netMat, mesh) {
    const lw = c.lw, lt = c.lt, w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    this.box(g, M.lath, w, lt, lw, cx, lt / 2, z0 + lw / 2); this.box(g, M.lath, w, lt, lw, cx, lt / 2, z1 - lw / 2);
    this.box(g, M.lath, lw, lt, d - 2 * lw, x0 + lw / 2, lt / 2, cz); this.box(g, M.lath, lw, lt, d - 2 * lw, x1 - lw / 2, lt / 2, cz);
    this.netPanel(g, v(x0 + lw, lt, z0 + lw), v(x1 - lw, lt, z1 - lw), mesh, netMat, 'y');
    if (braced(w, d)) { const b = this.beam(g, v(x0 + lw, lt / 2, z0 + lw), v(x1 - lw, lt / 2, z1 - lw), c); }
  }
  hinge(g, x, y, z, axis) {
    const m = this.mesh(g, hingeGeo, M.metal, x, y, z);
    if (axis === 'x') m.rotation.z = Math.PI / 2;
    if (axis === 'z') m.rotation.x = Math.PI / 2;
  }
  // Latte zwischen zwei Punkten
  beam(g, a, b, c) {
    const len = a.distanceTo(b), me = this.box(g, M.lath, c.lw, len, c.lt, 0, 0, 0);
    me.position.copy(a.clone().add(b).multiplyScalar(0.5));
    me.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
  }

  buildFront(ng, R, c, G, geo, netMat, mesh) {
    const { rx, yb, ytn, az } = geo, F = R.frontP, mv = this.movers;
    const fixedFront = (x0, x1) => {
      if (!c.removable) { this.netPanel(ng, v(x0, yb, az), v(x1, ytn, az), mesh, netMat, 'z'); return; }
      const g = new THREE.Group(); g.position.z = az; ng.add(g); this.vFrame(g, x0, x1, yb, ytn, c, netMat, mesh);
    };
    if (c.front === 'netz') { fixedFront(-rx / 2, rx / 2); return; }
    const L = F.leaf;
    if (c.front === 'doppeltuer' || c.front === 'tuer') {
      const l = new THREE.Group(); l.position.set(-rx / 2, yb, az); ng.add(l); this.leaf(l, L.w, L.h, 1, c, netMat, mesh);
      mv.push({ k: 'front', f: t => { l.rotation.y = -t * 1.6; } });
      if (L.leaves === 2) {
        const r = new THREE.Group(); r.position.set(rx / 2, yb, az); ng.add(r); this.leaf(r, L.w, L.h, -1, c, netMat, mesh);
        mv.push({ k: 'front', f: t => { r.rotation.y = t * 1.6; } });
      }
    }
    if (c.front === 'klapptuer') {
      const g = new THREE.Group(); g.position.set(0, yb + L.h, az + c.lt); ng.add(g);
      this.vFrame(g, -L.w / 2, L.w / 2, -L.h, 0, c, netMat, mesh);
      [-0.3, 0.3].forEach(k => this.hinge(g, k * L.w, 0, 0, 'x'));
      mv.push({ k: 'front', f: t => { g.rotation.x = -t * 1.35; } });
    }
    if (c.front === 'schiebetuer') {
      fixedFront(-rx / 2, 0);
      [yb + 0.5, ytn - 0.5].forEach(y => this.box(ng, M.lath, rx, 1, c.lt, 0, y, az + c.lt * 1.8));
      const g = new THREE.Group(); g.position.set(rx / 2 - L.w, yb, az + c.lt); ng.add(g);
      this.vFrame(g, 0, L.w, 0, L.h, c, netMat, mesh);
      this.mesh(g, sph, M.metal, 4, L.h / 2, c.lt, 1.3, 1.3, 1.3);
      const x0 = rx / 2 - L.w;
      mv.push({ k: 'front', f: t => { g.position.x = x0 - t * (L.w - 4); } });
    }
    if (c.front === 'rollo') {
      const g = new THREE.Group(); g.position.set(0, ytn, az + 0.6); ng.add(g);
      const P = [], nu = Math.round(rx / mesh), nv = 14;
      for (let i = 0; i <= nu; i++) { const x = -rx / 2 + i * rx / nu; P.push(v(x, 0, 0), v(x, -1, 0)); }
      for (let j = 0; j <= nv; j++) P.push(v(-rx / 2, -j / nv, 0), v(rx / 2, -j / nv, 0));
      this.lines(g, P, netMat);
      const rod = this.mesh(ng, cyl, M.lath, 0, yb, az + 1.5, 1.4, rx, 1.4); rod.rotation.z = Math.PI / 2;
      const H0 = L.h;
      mv.push({ k: 'front', f: t => { const h = Math.max(3, H0 * (1 - t * 0.94)); g.scale.y = h; rod.position.y = ytn - h; rod.scale.x = 1.4 + t * 2.5; rod.scale.z = 1.4 + t * 2.5; } });
    }
  }

  buildTop(ng, R, c, G, geo, netMat, mesh) {
    const { ax, az, yt } = geo, T = R.topP, mv = this.movers, lw = c.lw;
    const DX = 2 * ax + c.ps, DZ = 2 * az + c.ps;
    if (c.top === 'offen') return;
    if (c.top === 'fest') {
      if (!c.removable) { this.netPanel(ng, v(-DX / 2, yt, -DZ / 2), v(DX / 2, yt, DZ / 2), mesh, netMat, 'y'); return; }
      const g = new THREE.Group(); g.position.y = yt; ng.add(g); this.hFrame(g, -DX / 2, DX / 2, -DZ / 2, DZ / 2, c, netMat, mesh); return;
    }
    if (c.top === 'klapp') {
      const lid = new THREE.Group(); lid.position.set(0, yt, -DZ / 2); ng.add(lid);
      this.hFrame(lid, -DX / 2, DX / 2, 0, DZ, c, netMat, mesh);
      const nh = DX > 150 ? 3 : 2;
      for (let k = 0; k < nh; k++) this.hinge(ng, -DX * 0.3 + k * (DX * 0.6) / (nh - 1), yt, -DZ / 2, 'x');
      const chains = [];
      if (c.chain) [-1, 1].forEach(sx => {
        const cl = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v(0, 0, 0), v(0, 0, 0)]), chainMat);
        ng.add(cl); chains.push({ cl, a: v(sx * (DX / 2 - lw / 2), 0, DZ * 0.4), b: v(sx * ax, yt - lw - 12, -az - c.ps / 2 - 0.2) });
      });
      mv.push({ k: 'top', f: t => {
        lid.rotation.x = -t * 1.75; lid.updateMatrixWorld();
        chains.forEach(ch => {
          ch.cl.visible = t > 0.25;
          const p = ch.a.clone(); lid.localToWorld(p); ng.worldToLocal(p);
          const ar = ch.cl.geometry.attributes.position; ar.setXYZ(0, p.x, p.y, p.z); ar.setXYZ(1, ch.b.x, ch.b.y, ch.b.z); ar.needsUpdate = true;
        });
      } });
    }
    if (c.top === 'klapp2') {
      const w = T.lid.w;
      [-1, 1].forEach(sx => {
        const g = new THREE.Group(); g.position.set(sx * DX / 2, yt, 0); ng.add(g);
        if (sx < 0) this.hFrame(g, 0, w, -DZ / 2, DZ / 2, c, netMat, mesh); else this.hFrame(g, -w, 0, -DZ / 2, DZ / 2, c, netMat, mesh);
        [-0.3, 0.3].forEach(k => this.hinge(ng, sx * DX / 2, yt, k * DZ, 'z'));
        mv.push({ k: 'top', f: t => { g.rotation.z = -sx * t * 1.6; } });
      });
    }
    if (c.top === 'schiebe') {
      const d = T.lid.d, raise = c.lt + 0.6;
      const back = new THREE.Group(); back.position.set(0, yt + raise, 0); ng.add(back);
      this.hFrame(back, -DX / 2, DX / 2, -DZ / 2, -DZ / 2 + d, c, netMat, mesh);
      [-1, 1].forEach(sx => this.box(ng, M.lath, lw, raise, d, sx * (DX / 2 - lw / 2), yt + raise / 2, -DZ / 2 + d / 2));
      const front = new THREE.Group(); front.position.set(0, yt, 0); ng.add(front);
      this.hFrame(front, -DX / 2 + lw + 0.3, DX / 2 - lw - 0.3, DZ / 2 - d, DZ / 2, c, netMat, mesh);
      this.mesh(front, sph, M.metal, 0, c.lt + 1, DZ / 2 - 4, 1.3, 1.3, 1.3);
      mv.push({ k: 'top', f: t => { front.position.z = -t * (d - 4); } });
    }
    if (c.top === 'sattel') {
      const { rh, s } = T.lid, al = Math.atan2(rh, DZ / 2), yr = yt + rh;
      [-1, 1].forEach(sx => {
        const x = sx * (DX / 2 - lw / 2);
        this.beam(ng, v(x, yt, -DZ / 2), v(x, yr, 0), c); this.beam(ng, v(x, yt, DZ / 2), v(x, yr, 0), c);
        // Giebeldreieck mit Netz
        const P = [], nz = Math.round(DZ / mesh);
        for (let i = 1; i < nz; i++) { const z = -DZ / 2 + i * DZ / nz, top = yt + rh * (1 - Math.abs(z) / (DZ / 2)); P.push(v(x, yt, z), v(x, top, z)); }
        const ny = Math.round(rh / mesh);
        for (let j = 1; j < ny; j++) { const y = yt + j * rh / ny, half = DZ / 2 * (1 - j / ny); P.push(v(x, y, -half), v(x, y, half)); }
        this.lines(ng, P, netMat);
      });
      this.box(ng, M.lath, DX, lw, c.lt, 0, yr - lw / 2, 0);
      const backG = new THREE.Group(); backG.position.set(0, yr, 0); backG.rotation.x = -al; ng.add(backG);
      if (c.removable) this.hFrame(backG, -DX / 2, DX / 2, -s, 0, c, netMat, mesh);
      else this.netPanel(backG, v(-DX / 2, 0, -s), v(DX / 2, 0, 0), mesh, netMat, 'y');
      const flap = new THREE.Group(); flap.position.set(0, yr, 0); ng.add(flap);
      this.hFrame(flap, -DX / 2, DX / 2, 0, s, c, netMat, mesh);
      const nh = DX > 150 ? 3 : 2;
      for (let k = 0; k < nh; k++) this.hinge(ng, -DX * 0.3 + k * (DX * 0.6) / (nh - 1), yr, 0, 'x');
      mv.push({ k: 'top', f: t => { flap.rotation.x = al - t * (al + 1.25); } });
    }
    if (c.top === 'tunnel') {
      const { rh, n } = T.lid, a = DZ / 2;
      const pt = (x, u) => { const ang = Math.PI * u; return v(x, yt + rh * Math.sin(ang), -a * Math.cos(ang)); };
      for (let k = 0; k < n; k++) {
        const x = -DX / 2 + lw + k * (DX - 2 * lw) / (n - 1), pts = [];
        for (let j = 0; j <= 24; j++) pts.push(pt(x, j / 24));
        ng.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 1, 8, false), L(0x3d3d3d)));
      }
      this.box(ng, M.lath, DX, c.lt, lw, 0, yt + rh + c.lt / 2 + 1, 0);
      const P = [], nu = Math.round(DX / mesh), nv = Math.round(Math.PI * Math.hypot(a, rh) / 1.4 / mesh);
      for (let i = 0; i <= nu; i++) { const x = -DX / 2 + i * DX / nu; for (let j = 0; j < nv; j++) P.push(pt(x, j / nv), pt(x, (j + 1) / nv)); }
      for (let j = 0; j <= nv; j++) P.push(pt(-DX / 2, j / nv), pt(DX / 2, j / nv));
      [-DX / 2, DX / 2].forEach(x => {
        const nz = Math.round(DZ / mesh);
        for (let i = 1; i < nz; i++) { const z = -a + i * DZ / nz, top = yt + rh * Math.sqrt(Math.max(0, 1 - (z / a) ** 2)); P.push(v(x, yt, z), v(x, top, z)); }
      });
      this.lines(ng, P, netMat);
    }
  }

  update(R) {
    const { G, c } = R;
    this.root.traverse(o => { if (o.isCSS2DObject && o.element.parentNode) o.element.parentNode.removeChild(o.element); });
    this.scene.remove(this.root);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.parts = {}; this.movers = []; this.removables = []; this.removableMode = !!R.c.removable;
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
    const gSize = Math.max(G.LX, G.LZ) * 2.6, nBefore = this.root.children.length;
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
    const groundObjs = new Set(this.root.children.slice(nBefore));
    // Jede Bodenschicht ist eine eigene Gruppe, damit die Explosionsansicht sie auseinanderziehen kann
    const lg = new THREE.Group(); this.root.add(lg); this.parts.lg = lg;
    this.stack = [];
    const layer = (label, build) => {
      const g = new THREE.Group(); lg.add(g); build(g);
      const el = document.createElement('div'); el.className = 'lbl'; el.textContent = label;
      const lab = new CSS2DObject(el); lab.position.set(G.LX / 2 + 8, y0, -G.LZ / 4); g.add(lab);
      this.stack.push({ g, lab });
    };
    if (Ls.includes('kloetze')) layer('Unterlegklötze', g => {
      const xs = [G.px[0], G.px[G.px.length - 1]], zs = [G.pz[0], G.pz[G.pz.length - 1]];
      const pts = new Set();
      G.px.forEach(x => zs.forEach(z => pts.add(x + '|' + z)));
      G.pz.forEach(z => xs.forEach(x => pts.add(x + '|' + z)));
      pts.forEach(k => { const [x, z] = k.split('|').map(Number); this.box(g, M.post, 6, 2, 6, x, y0 - 1, z, false); });
    });
    if (Ls.includes('folie')) layer('Teichfolie als Wanne', g => {
      const fm = L(0x2b2b2b), fw = G.oX + 0.6, fd = G.oZ + 0.6, fh = Math.min(20, H);
      this.box(g, fm, fw, 0.2, fd, 0, y0 + 0.1, 0, false);
      this.box(g, fm, fw, fh, 0.2, 0, y0 + fh / 2, fd / 2, false); this.box(g, fm, fw, fh, 0.2, 0, y0 + fh / 2, -fd / 2, false);
      this.box(g, fm, 0.2, fh, fd, fw / 2, y0 + fh / 2, 0, false); this.box(g, fm, 0.2, fh, fd, -fw / 2, y0 + fh / 2, 0, false);
    });
    if (Ls.includes('vlies')) layer('Unkrautvlies', g => this.box(g, L(0xf1f0ea), G.oX + 20, 0.25, G.oZ + 20, 0, y0 - 0.02, 0, false));
    if (Ls.includes('gitter')) layer('Wühlmausgitter', g => {
      const P = [], w = G.oX + 10, d = G.oZ + 10, st = 4, y = y0 + 0.15;
      for (let x = -w / 2; x <= w / 2 + 0.01; x += st) P.push(v(x, y, -d / 2), v(x, y, d / 2));
      for (let z = -d / 2; z <= d / 2 + 0.01; z += st) P.push(v(-w / 2, y, z), v(w / 2, y, z));
      this.lines(g, P, new THREE.LineBasicMaterial({ color: 0x8e959b }));
    });
    const cellsAll = c.grid === 'bretter' ? G.cellsX.flatMap(x => G.cellsZ.map(z => [x, z, c.cell, c.cell])) : [[0, 0, G.iX, G.iZ]];
    if (R.drain > 0) layer(`Drainage ${String(R.drain).replace('.', ',')} cm (Blähton)`, g => {
      cellsAll.forEach(([x, z, w, d]) => this.box(g, L(0xc0703a), w, R.drain, d, x, y0 + R.drain / 2, z, false));
    });
    if (R.drain > 0 && Ls.includes('vlies2')) layer('Vlies als Trennlage', g => {
      cellsAll.forEach(([x, z, w, d]) => this.box(g, L(0xf1f0ea), w, 0.2, d, x, y0 + R.drain + 0.1, z, false));
    });
    const soilH = H - c.soilGap - R.drain;
    layer(`Pflanzerde ${Math.round(soilH)} cm`, g => {
      cellsAll.forEach(([x, z, w, d]) => this.box(g, M.soil, w, soilH - 0.3, d, x, y0 + R.drain + 0.3 + (soilH - 0.3) / 2, z, false));
      this.parts.soilEx = g;
    });
    {
      const el = document.createElement('div'); el.className = 'lbl lbl-ground'; el.textContent = 'Untergrund: ' + gr.name;
      const lab = new CSS2DObject(el); lab.position.set(G.LX / 2 + 8, gY, -G.LZ / 4); this.root.add(lab); this.groundLab = lab;
    }

    // ---- Erde & Pflanzen ----
    const pg = new THREE.Group(); this.root.add(pg); this.parts.pg = pg;
    const ys = H / 2 - c.soilGap, ps = c.cell / 30;
    if (c.grid === 'bretter') {
      G.cellsX.forEach((x, i) => G.cellsZ.forEach((z, j) => {
        const pl = R.plan[j] && R.plan[j][i]; if (pl) this.plant(pg, pl.look, x, ys, z, ps);
      }));
    } else {
      G.cellsX.forEach((x, i) => G.cellsZ.forEach((z, j) => { const pl = R.plan[j] && R.plan[j][i]; if (pl) this.plant(pg, pl.look, x, ys, z, ps); }));
    }

    // ---- Pfosten, Latten, Netz ----
    let topY = H / 2;
    if (c.posts) {
      const ax = G.ax, az = G.az, PH = c.h + c.cageH, yt = y0 + PH, yb = H / 2, yGround = y0 - c.postGround;
      topY = yt + R.roof;
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => this.box(this.root, M.post, c.ps, PH + c.postGround, c.ps, sx * ax, (yt + yGround) / 2, sz * az));
      const ng = new THREE.Group(); this.root.add(ng); this.parts.ng = ng;
      const rx = G.oX, rz = G.oZ, lw = c.lw, lt = c.lt;
      this.box(ng, M.lath, rx, lw, lt, 0, yt - lw / 2, az);
      this.box(ng, M.lath, rx, lw, lt, 0, yt - lw / 2, -az);
      this.box(ng, M.lath, lt, lw, rz, ax, yt - lw / 2, 0);
      this.box(ng, M.lath, lt, lw, rz, -ax, yt - lw / 2, 0);
      // Kopfbänder in den oberen Ecken
      const kb = 18, ip = c.ps / 2;
      [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(([sx, sz]) => {
        this.beam(ng, v(sx * (ax - ip), yt - lw - kb, sz * az), v(sx * (ax - ip - kb), yt - lw, sz * az), c);
        this.beam(ng, v(sx * ax, yt - lw - kb, sz * (az - ip)), v(sx * ax, yt - lw, sz * (az - ip - kb)), c);
      });
      if (c.net) {
        const ytn = yt - lw;
        // Jede Seite in eine eigene Gruppe, damit sie beim Abnehmen nach außen wandern kann
        this.removables = [];
        const cont = dir => { const g = new THREE.Group(); ng.add(g); this.removables.push({ g, dir }); return g; };
        const cB = cont(v(0, 0, -1)), cL = cont(v(-1, 0, 0)), cR = cont(v(1, 0, 0)), cF = cont(v(0, 0, 1)), cT = cont(v(0, 1, 0));
        if (c.removable) {
          const gb = new THREE.Group(); gb.position.z = -az; cB.add(gb); this.vFrame(gb, -rx / 2, rx / 2, yb, ytn, c, netMat, mesh);
          [[cL, -1], [cR, 1]].forEach(([cc, sx]) => {
            const g = new THREE.Group(); g.position.x = sx * ax; g.rotation.y = Math.PI / 2; cc.add(g);
            this.vFrame(g, -rz / 2, rz / 2, yb, ytn, c, netMat, mesh);
          });
        } else {
          this.netPanel(cB, v(-rx / 2, yb, -az), v(rx / 2, ytn, -az), mesh, netMat, 'z');
          this.netPanel(cR, v(ax, yb, -rz / 2), v(ax, ytn, rz / 2), mesh, netMat, 'x');
          this.netPanel(cL, v(-ax, yb, -rz / 2), v(-ax, ytn, rz / 2), mesh, netMat, 'x');
        }
        const geo = { rx, yb, ytn, az, ax, yt };
        this.buildFront(cF, R, c, G, geo, netMat, mesh);
        this.buildTop(cT, R, c, G, geo, netMat, mesh);
      }
    }

    // Alles, was zum Kasten gehört, in eine Gruppe, die in der Explosionsansicht nach oben fährt
    const boxG = new THREE.Group();
    [...this.root.children].forEach(o => { if (!groundObjs.has(o) && o !== lg && o !== this.groundLab) boxG.add(o); });
    this.root.add(boxG); this.parts.boxG = boxG;
    { const el = document.createElement('div'); el.className = 'lbl lbl-ground'; el.textContent = 'Kasten';
      this.boxLab = new CSS2DObject(el); this.boxLab.position.set(G.LX / 2 + 8, y0 + H / 2, -G.LZ / 4); boxG.add(this.boxLab); }

    // Kamera einmalig bzw. bei Größenänderung neu ausrichten
    const gTop = topY;
    const key = `${Math.round(G.LX)}|${Math.round(G.LZ)}|${Math.round(gTop)}|${this.cam.aspect.toFixed(2)}`;
    if (key !== this.camKey) {
      this.camKey = key;
      // Kamera so weit weg, dass die Bounding-Sphere ins Bild passt
      const r = 0.5 * Math.hypot(G.LX, G.LZ, gTop - y0);
      const vf = this.cam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * this.cam.aspect);
      const k = this.cam.aspect >= 1.3 ? 0.92 : this.cam.aspect <= 0.9 ? 1.12 : 1.05;
      const dist = r / Math.sin(Math.min(vf, hf) / 2) * k;
      const target = v(0, (gTop + y0) / 2 - (gTop - y0) * 0.08, 0);
      const dir = this.firstFrame ? v(1, 0.8, 1.3).normalize() : this.cam.position.clone().sub(this.controls.target).normalize();
      this.controls.target.copy(target);
      this.cam.position.copy(target.clone().add(dir.multiplyScalar(dist)));
      this.firstFrame = false;
      this.lastUp = 0; this.lastBack = 0;
    }
  }

  tick() {
    const A = this.anim, V = this.view, P = this.parts || {};
    A.ex += ((V.explode ? 1 : 0) - A.ex) * 0.12;
    A.lid += ((V.lid ? 1 : 0) - A.lid) * 0.08;
    A.door += ((V.doors ? 1 : 0) - A.door) * 0.08;
    A.rem = (A.rem || 0) + ((V.net ? 0 : 1) - (A.rem || 0)) * 0.08;
    const off = A.ex < 0.05;
    if (P.xg) P.xg.position.y = A.ex * this.H * 1.1;
    if (P.ng) P.ng.visible = (this.removableMode || V.net) && off;
    (this.removables || []).forEach(r => {
      const d = this.removableMode ? A.rem : 0;
      r.g.position.copy(r.dir).multiplyScalar(d * 55); r.g.visible = d < 0.96;
    });
    if (P.pg) P.pg.visible = V.plants && off;
    const gap = Math.max(22, this.H * 1.2), st = this.stack || [];
    st.forEach((l, i) => { l.g.position.y = A.ex * (i + 1) * gap; l.lab.visible = A.ex > 0.6; });
    if (this.groundLab) this.groundLab.visible = A.ex > 0.6;
    if (this.boxLab) this.boxLab.visible = A.ex > 0.6;
    if (P.soilEx) P.soilEx.visible = V.plants || !off;
    if (P.boxG) P.boxG.position.y = A.ex * (st.length + 1) * gap;
    // Kamera beim Auseinanderziehen mitführen
    const stackH = (st.length + 1) * gap + this.H * 1.1;
    const up = A.ex * stackH * 0.5, back = A.ex * stackH * 0.8;
    const dUp = up - (this.lastUp || 0), dBack = back - (this.lastBack || 0);
    if (Math.abs(dUp) > 1e-4 || Math.abs(dBack) > 1e-4) {
      const dir = this.cam.position.clone().sub(this.controls.target).normalize();
      this.controls.target.y += dUp; this.cam.position.y += dUp; this.cam.position.addScaledVector(dir, dBack);
      this.lastUp = up; this.lastBack = back;
    }
    (this.movers || []).forEach(m => m.f(m.k === 'top' ? A.lid : A.door));
    this.controls.update();
    this.renderer.render(this.scene, this.cam);
    this.labels.render(this.scene, this.cam);
  }
}
