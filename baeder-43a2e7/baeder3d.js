// 3D-Modelle der Bäder Haus Montabaur, Maße 1:1 aus den Sanitärplänen v4 (sanitaer3.py).
// Koordinaten: Plan-x -> X, Plan-y -> Z, Höhe -> Y. Meter, Höhen ab fertigem Fußboden.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';

export const CEIL = 2.55;
export const OPTS = { openMirror: false };   // nur für Standbilder: eine Spiegelschranktür offen   // angenommene lichte Raumhöhe
const T = 0.004;            // Abstand Belag zur Wand

// ---------- Materialien: ein Konzept für alle Bäder ----------
function canvasTex(wPx, hPx, draw) {
  const c = document.createElement('canvas'); c.width = wPx; c.height = hPx;
  draw(c.getContext('2d'), wPx, hPx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export const PAL = {
  stone: '#d8cfc1', grout: '#bdb3a4', plaster: '#ece6dc', oak: '#b88d5f', ceramic: '#f7f5f0',
  bronze: '#8a6a48', glass: '#dfe8e6', door: '#f2efe9', ceil: '#f4f1eb',
};

const tileTex = canvasTex(768, 384, (g, w, h) => {      // eine Fliese 120 x 60 cm
  g.fillStyle = PAL.stone; g.fillRect(0, 0, w, h);
  const r = rnd(7);
  for (let i = 0; i < 2600; i++) {                      // Kalkstein-Wolken
    const a = 0.025 + r() * 0.05;
    g.fillStyle = r() < 0.5 ? `rgba(120,100,80,${a})` : `rgba(255,252,245,${a})`;
    g.beginPath(); g.ellipse(r() * w, r() * h, 2 + r() * 26, 1 + r() * 9, r() * 3, 0, 7); g.fill();
  }
  g.strokeStyle = PAL.grout; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
});
const plasterTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = PAL.plaster; g.fillRect(0, 0, w, h);
  const r = rnd(3);
  for (let i = 0; i < 1800; i++) {
    g.fillStyle = r() < 0.5 ? 'rgba(150,130,110,0.035)' : 'rgba(255,255,250,0.05)';
    g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 40, 3 + r() * 14, r() * 3, 0, 7); g.fill();
  }
});
const oakTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = PAL.oak; g.fillRect(0, 0, w, h);
  const r = rnd(11);
  for (let i = 0; i < 260; i++) {
    const y = r() * h, a = 0.05 + r() * 0.12;
    g.strokeStyle = r() < 0.6 ? `rgba(90,60,30,${a})` : `rgba(230,200,160,${a})`;
    g.lineWidth = 0.6 + r() * 2.2; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) g.lineTo(x, y + Math.sin(x / 70 + i) * 3 + (r() - 0.5) * 2);
    g.stroke();
  }
});

function tileMat(u, v) {
  const t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(u / 1.2, v / 0.6);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55, metalness: 0 });
}
const M = {
  plaster: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 }),
  ceil: new THREE.MeshStandardMaterial({ color: PAL.ceil, roughness: 1 }),
  oak: new THREE.MeshStandardMaterial({ map: oakTex, roughness: 0.7 }),
  ceramic: new THREE.MeshStandardMaterial({ color: PAL.ceramic, roughness: 0.22, side: THREE.DoubleSide }),
  mineral: new THREE.MeshStandardMaterial({ color: '#f3f0ea', roughness: 0.45, side: THREE.DoubleSide }),
  bronze: new THREE.MeshStandardMaterial({ color: '#b48d62', roughness: 0.34, metalness: 0.8 }),
  glass: new THREE.MeshStandardMaterial({ color: PAL.glass, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.18, depthWrite: false }),
  winGlass: new THREE.MeshStandardMaterial({ color: '#cfe3ee', roughness: 0.05, transparent: true, opacity: 0.25, depthWrite: false }),
  frame: new THREE.MeshStandardMaterial({ color: '#4a4a48', roughness: 0.6 }),
  mirror: new THREE.MeshStandardMaterial({ color: '#dfe3e3', roughness: 0.03, metalness: 1 }),
  door: new THREE.MeshStandardMaterial({ color: PAL.door, roughness: 0.6 }),
  led: new THREE.MeshStandardMaterial({ color: '#fff3dc', emissive: '#ffe7bd', emissiveIntensity: 2.2 }),
  shaft: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 }),
  niche: new THREE.MeshStandardMaterial({ color: '#cfc5b5', roughness: 0.7 }),
};

// ---------- Bausteine ----------
class Bath {
  constructor(id, title) {
    this.id = id; this.title = title;
    this.root = new THREE.Group();
    this.walls = [];        // {mesh, side}  side: N S W E oder null (innen)
    this.ceilings = [];
    this.views = {};
    this.bounds = [0, 0, 1, 1];
    this.marks = [];        // Lichtplan-Markierungen, nur im Standbild 'Lichtplan'
  }
  add(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = !m.material.transparent; m.receiveShadow = true; } }); this.root.add(o); return o; }
  box(x, z, w, d, y0, y1, mat) {      // Plan-Rechteck x,z,w,d, Höhe y0..y1
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, d), mat);
    m.position.set(x + w / 2, (y0 + y1) / 2, z + d / 2);
    return this.add(m);
  }
  // Wand mit Öffnungen entlang der langen Achse: [{a,b,sill,head}]
  wall(x, z, w, d, side = null, openings = []) {
    const alongX = w >= d, len = alongX ? w : d, s0 = alongX ? x : z;
    const piece = (a, b, y0, y1) => {
      if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
      const m = alongX ? this.box(a, z, b - a, d, y0, y1, M.plaster) : this.box(x, a, w, b - a, y0, y1, M.plaster);
      this.walls.push({ mesh: m, side });
    };
    const ops = openings.slice().sort((p, q) => p.a - q.a);
    let cur = s0;
    for (const o of ops) {
      piece(cur, o.a, 0, CEIL);
      piece(o.a, o.b, 0, o.sill);
      piece(o.a, o.b, o.head, CEIL);
      if (o.win) {   // Fensterglas und Rahmen in Wandmitte
        const t = alongX ? d : w, mid = (alongX ? z : x) + t / 2;
        const g = alongX ? this.box(o.a, mid - 0.01, o.b - o.a, 0.02, o.sill, o.head, M.winGlass)
                         : this.box(mid - 0.01, o.a, 0.02, o.b - o.a, o.sill, o.head, M.winGlass);
        g.castShadow = false; this.walls.push({ mesh: g, side });
        const fr = (a, b, y0, y1) => this.walls.push({ side, mesh: alongX ? this.box(a, mid - 0.035, b - a, 0.07, y0, y1, M.frame)
                                            : this.box(mid - 0.035, a, 0.07, b - a, y0, y1, M.frame) });
        fr(o.a, o.b, o.sill, o.sill + 0.06); fr(o.a, o.b, o.head - 0.06, o.head);
        fr(o.a, o.a + 0.06, o.sill, o.head); fr(o.b - 0.06, o.b, o.sill, o.head);
        // Fensterbank innen (gefliest)
        const inner = side === 'N' || side === 'W' ? (alongX ? z + d : x + w) : (alongX ? z : x);
        const sgn = side === 'N' || side === 'W' ? -1 : 1;
        const sb = alongX ? this.box(o.a, Math.min(inner, mid), o.b - o.a, Math.abs(inner - mid), o.sill - 0.02, o.sill, tileMat(o.b - o.a, 0.3))
                          : this.box(Math.min(inner, mid), o.a, Math.abs(inner - mid), o.b - o.a, o.sill - 0.02, o.sill, tileMat(0.3, o.b - o.a));
        this.walls.push({ mesh: sb, side });
        void sgn;
      }
      cur = o.b;
    }
    piece(cur, s0 + len, 0, CEIL);
  }
  win(a, b, sill = 1.0, head = 2.25) { return { a, b, sill, head, win: true }; }
  gapO(a, b) { return { a, b, sill: 0, head: 2.10 }; }
  floor(x, z, w, d) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), tileMat(w, d));
    m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0, z + d / 2); m.receiveShadow = true;
    this.root.add(m);
    const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.ceil);
    c.rotation.x = Math.PI / 2; c.position.set(x + w / 2, CEIL, z + d / 2);
    this.root.add(c); this.ceilings.push(c);
  }
  // Belag (Fliese) auf einer Wandfläche: Strecke (x1,z1)-(x2,z2), Normale in den Raum
  clad(x1, z1, x2, z2, y0, y1, nx, nz, mat) {
    const w = Math.hypot(x2 - x1, z2 - z1);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, y1 - y0), mat || tileMat(w, y1 - y0));
    m.position.set((x1 + x2) / 2 + nx * T, (y0 + y1) / 2, (z1 + z2) / 2 + nz * T);
    m.rotation.y = Math.atan2(nx, nz); m.receiveShadow = true;
    this.root.add(m); return m;
  }
  vorwand(x, z, w, d, h, tiled = true) {   // Vorwand, gefliest bis h
    const m = this.box(x, z, w, d, 0, h, M.plaster);
    this.walls.push({ mesh: m, side: null });
    if (tiled) {   // Abdeckplatte aus Fliese
      const top = new THREE.Mesh(new THREE.BoxGeometry(w + 0.004, 0.02, d + 0.004), tileMat(w, d));
      top.position.set(x + w / 2, h + 0.01, z + d / 2); this.add(top);
    }
    return m;
  }
  // Wand-WC: Achse cx/cz am Wandpunkt, dir = Richtung in den Raum
  wc(cx, cz, dir, duschWC = false, plateY = 1.08) {
    const g = new THREE.Group();
    const L = duschWC ? 0.58 : 0.54;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.30, L - 0.18), M.ceramic);
    body.position.set(0, 0.27, (L - 0.18) / 2);
    const front = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.15, 0.30, 40), M.ceramic);
    front.position.set(0, 0.27, L - 0.18);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.025, L - 0.17), M.ceramic);
    seat.position.set(0, 0.43, (L - 0.17) / 2);
    const seatF = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.025, 40), M.ceramic);
    seatF.position.set(0, 0.43, L - 0.18);
    g.add(body, front, seat, seatF);
    if (duschWC) {
      const pan = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.08, 0.20), M.ceramic);
      pan.position.set(0, 0.48, 0.10); g.add(pan);
    }
    // Drückerplatte Geberit Sigma 50, 24,6 x 16,4 cm, Unterkante ca. 1,00
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.246, 0.164, 0.012), M.bronze);
    plate.position.set(0, plateY, 0.006); g.add(plate);
    g.position.set(cx, 0, cz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  pissoir(cx, cz, dir) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.58, 0.20), M.ceramic); b.position.set(0, 0.80, 0.10);
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.15, 0.58, 40, 1, false, -Math.PI / 2, Math.PI), M.ceramic);
    f.position.set(0, 0.80, 0.20);
    const btn = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.012), M.bronze); btn.position.set(0, 1.08, 0.006);
    g.add(b, f, btn);
    g.position.set(cx, 0, cz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  // Waschtisch an einer Wand. Lokal: Wand bei z=0, Raum +z. len entlang Wand, depth, basins: Abstand ab Anfang
  vanity(ox, oz, dir, len, depth, basins, opts = {}) {
    const g = new THREE.Group();
    const top = 0.85, slab = 0.04;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.lineTo(len, 0); shape.lineTo(len, depth); shape.lineTo(0, depth); shape.closePath();
    const bw = opts.bw || 0.40, bd = opts.bd || 0.30;
    for (const b of basins) {
      const h = new THREE.Path(); h.absellipse(b, depth / 2 + 0.02, bw / 2, bd / 2, 0, Math.PI * 2, true); shape.holes.push(h);
    }
    if (opts.trough) {   // ein Rinnenbecken über fast die ganze Länge, Hähne nach `basins`
      shape.holes = [];
      const [a, e] = opts.trough, cz = depth / 2 + 0.02, r = 0.08;
      const h = new THREE.Path(); h.moveTo(a + r, cz - bd / 2); h.lineTo(e - r, cz - bd / 2); h.quadraticCurveTo(e, cz - bd / 2, e, cz - bd / 2 + r);
      h.lineTo(e, cz + bd / 2 - r); h.quadraticCurveTo(e, cz + bd / 2, e - r, cz + bd / 2); h.lineTo(a + r, cz + bd / 2);
      h.quadraticCurveTo(a, cz + bd / 2, a, cz + bd / 2 - r); h.lineTo(a, cz - bd / 2 + r); h.quadraticCurveTo(a, cz - bd / 2, a + r, cz - bd / 2);
      shape.holes.push(h);
      const tm = M.mineral.clone(); tm.side = THREE.BackSide;
      const tb = new THREE.Mesh(new THREE.BoxGeometry(e - a, 0.12, bd), tm); tb.position.set((a + e) / 2, top - 0.06, cz); g.add(tb);
    }
    const sg = new THREE.ExtrudeGeometry(shape, { depth: slab, bevelEnabled: false });
    sg.rotateX(Math.PI / 2);   // Shape in XZ-Ebene, Dicke nach unten
    const s = new THREE.Mesh(sg, M.mineral); s.position.set(0, top, 0);
    g.add(s);
    for (const b of basins) {
      if (!opts.trough) {
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.mineral);
        bowl.scale.set(bw / 2, 0.13, bd / 2); bowl.position.set(b, top, depth / 2 + 0.02); g.add(bowl);
      }
      const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.004, 20), M.bronze);
      drain.position.set(b, top - (opts.trough ? 0.118 : 0.128), depth / 2 + 0.02); g.add(drain);
      // Wandarmatur UP: Auslauf bei 1,05
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.19, 20), M.bronze);
      sp.rotation.x = Math.PI / 2; sp.position.set(b, 1.02, 0.095); g.add(sp);
      const ros = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.065, 0.01), M.bronze);
      ros.position.set(b, 1.02, 0.005); g.add(ros);
      const lev = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 12), M.bronze);
      lev.rotation.x = Math.PI / 2; lev.position.set(b + 0.07, 1.02, 0.04); g.add(lev);
    }
    // Unterschrank Eiche, schwebend
    const ch = 0.30, cy = top - slab - ch / 2, cd = depth - 0.02, t = 0.019;   // hohl, damit die Becken Platz haben
    const panel = (w, h, d, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), M.oak); m.position.set(x, y, z); g.add(m); };
    panel(len, ch, t, len / 2, cy, cd - t / 2);
    panel(t, ch, cd, t / 2, cy, cd / 2); panel(t, ch, cd, len - t / 2, cy, cd / 2);
    panel(len, t, cd, len / 2, cy - ch / 2 + t / 2, cd / 2);
    // Nachtlicht: LED unter dem schwebenden Unterschrank
    const nl = new THREE.Mesh(new THREE.BoxGeometry(len - 0.08, 0.004, 0.012), M.led); nl.position.set(len / 2, cy - ch / 2 - 0.003, cd - 0.05); g.add(nl);
    // Schubkasten-Fuge
    const fu = new THREE.Mesh(new THREE.BoxGeometry(len - 0.04, 0.004, 0.004), M.frame); fu.position.set(len / 2, cy + 0.02, cd + 0.001); g.add(fu);
    // Handtuchstangen seitlich am Unterschrank ('L' = Anfang, 'R' = Ende) oder vorn
    const rod = (L, x, y, z, rotY) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, L, 12), M.bronze); m.rotation.set(Math.PI / 2, 0, 0); if (rotY) { m.rotation.set(0, 0, Math.PI / 2); } m.position.set(x, y, z); g.add(m); };
    for (const sd of opts.sideBars || []) {
      const x = sd === 'L' ? -0.055 : len + 0.055, sx = sd === 'L' ? -0.028 : len + 0.028;
      rod(cd - 0.10, x, cy, cd / 2);
      for (const z of [0.07, cd - 0.07]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.055, 10), M.bronze); st.rotation.z = Math.PI / 2; st.position.set(sx, cy, z); g.add(st); }
    }
    if (opts.frontBar) {
      rod(len - 0.16, len / 2, cy - 0.04, cd + 0.055, true);
      for (const x of [0.10, len - 0.10]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.055, 10), M.bronze); st.rotation.x = Math.PI / 2; st.position.set(x, cy - 0.04, cd + 0.028); g.add(st); }
    }
    // Spiegelschrank bündig + Lichtleiste, Fugen zeigen die Türen
    if (opts.mirror !== false) {
      const mw = opts.mirrorLen || len, mx = opts.mirrorX ?? 0;
      const nd = Math.max(1, Math.round(mw / 0.6)), dw = mw / nd, od = opts.openDoor;
      const cw = od === undefined ? mw : od * dw;   // geschlossener Teil
      if (cw > 0) {
        const mir = new Reflector(new THREE.PlaneGeometry(cw - 0.01, 0.72), { textureWidth: 1024, textureHeight: 512, color: '#b9bdbd' });
        mir.position.set(mx + cw / 2, 1.58, 0.014); g.add(mir);
        const back = new THREE.Mesh(new THREE.BoxGeometry(cw, 0.73, 0.012), M.frame);
        back.position.set(mx + cw / 2, 1.58, 0.006); g.add(back);
      }
      if (od !== undefined) {   // Tür am rechten Rand angeschlagen, 100° offen
        const pv = new THREE.Group(); pv.position.set(mx + mw, 1.58, 0.012); pv.rotation.y = -1.75;
        const dm = new Reflector(new THREE.PlaneGeometry(dw - 0.01, 0.72), { textureWidth: 512, textureHeight: 512, color: '#b9bdbd' });
        dm.position.set(-dw / 2, 0, 0.008); pv.add(dm);
        const db = new THREE.Mesh(new THREE.BoxGeometry(dw, 0.73, 0.014), M.frame); db.position.set(-dw / 2, 0, 0); pv.add(db);
        g.add(pv);
      }
      const led = new THREE.Mesh(new THREE.BoxGeometry(mw, 0.012, 0.02), M.led);
      led.position.set(mx + mw / 2, 1.215, 0.01); g.add(led);
      const n = opts.openDoor === undefined ? nd : opts.openDoor;
      for (let i = 1; i < n; i++) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.72, 0.006), M.frame); f.position.set(mx + (mw * i) / n, 1.58, 0.016); g.add(f); }
    }
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]) ;
    // lokales x zeigt nach rechts, wenn man auf die Wand schaut -> mit Drehung abgleichen
    return this.add(g);
  }
  towel(ox, oz, dir, len, y0 = 0.35, y1 = 1.45) {   // elektrischer Handtuchwärmer
    const g = new THREE.Group();
    for (const x of [0.02, len - 0.02]) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, y1 - y0, 16), M.bronze);
      v.position.set(x, (y0 + y1) / 2, 0.06); g.add(v);
    }
    for (let y = y0 + 0.04; y < y1; y += 0.085) {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len - 0.04, 12), M.bronze);
      h.rotation.z = Math.PI / 2; h.position.set(len / 2, y, 0.06); g.add(h);
    }
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  bar(ox, oz, dir, len, y = 0.95) {   // Handtuchhalter
    const g = new THREE.Group();
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 12), M.bronze);
    h.rotation.z = Math.PI / 2; h.position.set(len / 2, y, 0.06); g.add(h);
    for (const x of [0.01, len - 0.01]) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 10), M.bronze); s.rotation.x = Math.PI / 2; s.position.set(x, y, 0.03); g.add(s); }
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  thermo(x, y, z, dir, slide = false) {    // UP-Thermostat + Handbrause, bei Kindern an einer Brausestange
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.012), M.bronze); p.position.set(0, y, 0.006);
    const k1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 20), M.bronze); k1.rotation.x = Math.PI / 2; k1.position.set(-0.04, y, 0.03);
    const k2 = k1.clone(); k2.position.x = 0.04;
    const hy = slide ? 1.45 : y + 0.25;
    const hb = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.24, 16), M.bronze); hb.position.set(0.22, hy, 0.05);
    const hh = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.05), M.bronze); hh.position.set(0.22, hy - 0.13, 0.025);
    g.add(p, k1, k2, hb, hh);
    if (slide) {
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.90, 14), M.bronze); st.position.set(0.22, 1.50, 0.03); g.add(st);
    }
    g.position.set(x, 0, z); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  // Kopfbrause aus der Wand: Wandarm, Brause Ø 25 cm auf ca. 2,15 m
  head(x, z, dir, arm = 0.40, y = 2.18, r = 0.125) {
    const g = new THREE.Group();
    const ro = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 24), M.bronze); ro.rotation.x = Math.PI / 2; ro.position.set(0, y, 0.005);
    const a = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, arm, 14), M.bronze); a.rotation.x = Math.PI / 2; a.position.set(0, y, arm / 2);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 48), M.bronze); h.position.set(0, y - 0.025, arm);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.025, 12), M.bronze); c.position.set(0, y - 0.012, arm);
    g.add(ro, a, h, c);
    g.position.set(x, 0, z); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  hooks(ox, oz, dir, n, gap = 0.18, y = 1.70) {    // Haken-Reihe, entlang der Wand nach "rechts"
    const g = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const k = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.06, 14), M.bronze); k.rotation.x = Math.PI / 2; k.position.set(i * gap, y, 0.03);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 14, 10), M.bronze); e.position.set(i * gap, y + 0.004, 0.06);
      g.add(k, e);
    }
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  paper(ox, oz, dir, y = 0.70) {      // Papierhalter mit Rolle
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.03, 0.012), M.bronze); p.position.set(0, y + 0.065, 0.006);
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.12), M.bronze); a.position.set(0.06, y + 0.065, 0.06);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.10, 28), M.ceramic); roll.rotation.z = Math.PI / 2; roll.position.set(0.0, y, 0.075);
    g.add(p, a, roll);
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  brush(ox, oz, dir, y = 0.22) {      // WC-Bürste wandhängend, nichts steht am Boden
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.012), M.bronze); p.position.set(0, y + 0.20, 0.006);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.26, 24), M.bronze); c.position.set(0, y + 0.13, 0.06);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 12), M.bronze); h.position.set(0, y + 0.33, 0.06);
    g.add(p, c, h);
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  brushUP(ox, oz, dir, y = 0.20) {   // WC-Bürste unterputz in der Vorwand: nur eine Bronzeblende, Griff oben
    const g = new THREE.Group();
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.36, 0.008), M.bronze); f.position.set(0, y + 0.18, 0.004);
    const sl = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.008, 0.004), M.frame); sl.position.set(0, y + 0.33, 0.009);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.035, 12), M.bronze); h.position.set(0, y + 0.352, 0.03);
    const hb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 8), M.bronze); hb.position.set(0, y + 0.372, 0.03);
    g.add(f, sl, h, hb);
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  paperUP(ox, oz, dir, y = 0.70) {   // Papierhalter unterputz: Rolle liegt halb in der Vorwand
    const g = new THREE.Group();
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, 0.008), M.bronze); f.position.set(0, y, 0.004);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.10, 28), M.ceramic); r.rotation.z = Math.PI / 2; r.position.set(0, y - 0.01, 0.02);
    g.add(f, r);
    g.position.set(ox, 0, oz); g.rotation.y = Math.atan2(dir[0], dir[1]);
    return this.add(g);
  }
  // Schrank aus Eiche mit Fugen für n Türen. front: Seite, zu der die Türen zeigen (N S W E)
  cab(x, z, w, d, y0, y1, front, n = 1, flap = false) {
    this.box(x, z, w, d, y0, y1, M.oak);
    const alongX = front === 'N' || front === 'S', L = alongX ? w : d;
    const fz = front === 'N' ? z - 0.002 : front === 'S' ? z + d + 0.002 : 0, fx = front === 'W' ? x - 0.002 : front === 'E' ? x + w + 0.002 : 0;
    const seam = (a, ya, yb) => {
      const m = alongX ? new THREE.Mesh(new THREE.BoxGeometry(0.004, yb - ya, 0.004), M.frame) : new THREE.Mesh(new THREE.BoxGeometry(0.004, yb - ya, 0.004), M.frame);
      m.position.set(alongX ? x + a : fx, (ya + yb) / 2, alongX ? fz : z + a); this.root.add(m);
    };
    const flapH = flap ? 0.55 : 0;
    for (let i = 1; i < n; i++) seam((L * i) / n, y0 + flapH, y1);
    if (flap) {   // Wäscheklappe unten
      const m = new THREE.Mesh(new THREE.BoxGeometry(alongX ? w - 0.01 : 0.004, 0.004, alongX ? 0.004 : d - 0.01), M.frame);
      m.position.set(alongX ? x + w / 2 : fx, y0 + flapH, alongX ? fz : z + d / 2); this.root.add(m);
    }
  }
  // Wandbild flach (Tapete/Wandmalerei): Strecke an der Wand, Normale in den Raum
  mural(x1, z1, x2, z2, y0, y1, nx, nz) {
    const w = Math.hypot(x2 - x1, z2 - z1), h = y1 - y0;
    const tex = canvasTex(1024, Math.round(1024 * h / w), (g, W, H) => {
      g.fillStyle = '#e6d6bf'; g.fillRect(0, 0, W, H);
      const hill = (col, base, amp, ph) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 8) g.lineTo(x, H * base - Math.sin(x / W * Math.PI * 1.3 + ph) * H * amp - Math.sin(x / W * 7 + ph) * H * 0.015);
        g.lineTo(W, H); g.closePath(); g.fill(); };
      g.fillStyle = '#c2683f'; g.beginPath(); g.arc(W * 0.68, H * 0.34, W * 0.13, 0, 7); g.fill();
      hill('#b9a07a', 0.62, 0.10, 0.4); hill('#8d8a63', 0.72, 0.08, 2.1); hill('#5f6b4c', 0.83, 0.06, 4.0); hill('#3f4a37', 0.93, 0.04, 1.2);
    });
    tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
    this.clad(x1, z1, x2, z2, y0, y1, nx, nz, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 })).position.add(new THREE.Vector3(nx * 0.002, 0, nz * 0.002));
  }
  rinne(x1, z1, x2, z2) {
    const alongX = Math.abs(x2 - x1) > Math.abs(z2 - z1);
    const m = alongX ? new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x2 - x1), 0.003, 0.05), M.bronze)
                     : new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.003, Math.abs(z2 - z1)), M.bronze);
    m.position.set((x1 + x2) / 2, 0.002, (z1 + z2) / 2); this.add(m);
  }
  glass(x1, z1, x2, z2, h = 2.0) {
    const w = Math.hypot(x2 - x1, z2 - z1);
    const g = new THREE.Group();
    const p = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.008), M.glass); p.position.y = h / 2; p.castShadow = false;
    const prof = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, 0.02), M.bronze); prof.position.y = 0.012;
    const prof2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, h, 0.02), M.bronze); prof2.position.set(-w / 2 + 0.01, h / 2, 0);
    g.add(p, prof, prof2);
    g.position.set((x1 + x2) / 2, 0, (z1 + z2) / 2); g.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    return this.add(g);
  }
  niche(x1, z1, x2, z2, nx, nz, y = 1.10) {     // Nische 60 x 30, Unterkante y
    this.clad(x1, z1, x2, z2, y, y + 0.30, nx, nz, M.niche).position.add(new THREE.Vector3(nx * 0.002, 0, nz * 0.002));
    this.clad(x1, z1, x2, z2, y + 0.285, y + 0.295, nx, nz, M.led).position.add(new THREE.Vector3(nx * 0.004, 0, nz * 0.004));   // LED-Leiste in der Nische
  }
  door(hx, hz, ox, oz) {               // Türblatt offen: Scharnier -> offenes Ende
    const w = Math.hypot(ox - hx, oz - hz);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, 2.05, 0.04), M.door);
    m.position.set((hx + ox) / 2, 1.025, (hz + oz) / 2); m.rotation.y = -Math.atan2(oz - hz, ox - hx);
    m.userData.cutHide = true;
    return this.add(m);
  }
  cabinet(x, z, w, d, y0, y1) { return this.box(x, z, w, d, y0, y1, M.oak); }
  spot(x, z) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 24), M.led);
    s.position.set(x, CEIL - 0.004, z); this.root.add(s); this.ceilings.push(s);
    this.mark(x, z, 0.30, '#f2b544');
  }
  mark(x, z, r, col) {          // Lichtkegel als Kreis von oben
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 40), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, depthTest: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, CEIL + 0.05, z); m.renderOrder = 10; m.visible = false;
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.05, 24), new THREE.MeshBasicMaterial({ color: '#7a4a10', depthTest: false }));
    c.rotation.x = -Math.PI / 2; c.position.set(x, CEIL + 0.06, z); c.renderOrder = 11; c.visible = false;
    this.root.add(m, c); this.marks.push(m, c);
  }
  // Deckenschiene (flach eingelassen) mit Strahlern: Strecke + Ziele [x, z, y]
  track(x1, z1, x2, z2, aims) {
    const L = Math.hypot(x2 - x1, z2 - z1), ang = -Math.atan2(z2 - z1, x2 - x1);
    const r = new THREE.Mesh(new THREE.BoxGeometry(L, 0.012, 0.035), M.frame);
    r.position.set((x1 + x2) / 2, CEIL - 0.006, (z1 + z2) / 2); r.rotation.y = ang; this.root.add(r); this.ceilings.push(r);
    aims.forEach(([ax, az, ay], i) => {
      const t = (i + 0.5) / aims.length, px = x1 + (x2 - x1) * t, pz = z1 + (z2 - z1) * t;
      const g = new THREE.Group(); g.position.set(px, CEIL - 0.07, pz);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.06, 8), M.frame); st.position.y = 0.035; g.add(st);
      const head = new THREE.Group(); head.lookAt(ax - px, ay - (CEIL - 0.07), az - pz);
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.10, 20), M.frame); c.rotation.x = Math.PI / 2; head.add(c);
      const l = new THREE.Mesh(new THREE.CircleGeometry(0.022, 20), M.led); l.position.z = 0.051; head.add(l);
      g.add(head); this.root.add(g); this.ceilings.push(g);
      this.mark(ax, az, 0.22, '#f2b544');
      const ln = new THREE.Mesh(new THREE.BoxGeometry(Math.hypot(ax - px, az - pz), 0.01, 0.012), new THREE.MeshBasicMaterial({ color: '#b07a2a', depthTest: false }));
      ln.position.set((ax + px) / 2, CEIL + 0.06, (az + pz) / 2); ln.rotation.y = -Math.atan2(az - pz, ax - px); ln.renderOrder = 11; ln.visible = false;
      this.root.add(ln); this.marks.push(ln);
    });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(L, 0.01, 0.05), new THREE.MeshBasicMaterial({ color: '#2a2722', depthTest: false }));
    tl.position.set((x1 + x2) / 2, CEIL + 0.07, (z1 + z2) / 2); tl.rotation.y = ang; tl.renderOrder = 12; tl.visible = false;
    this.root.add(tl); this.marks.push(tl);
  }
  // weicher Lichtschein auf einer Fläche (Boden unter schwebenden Möbeln, Wand)
  glow(x, z, w, d, y = 0.003) {
    const tex = canvasTex(256, 256, (g, W, H) => { const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
      gr.addColorStop(0, 'rgba(255,214,150,0.55)'); gr.addColorStop(1, 'rgba(255,214,150,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, y, z + d / 2); this.root.add(m);
  }
  // LED-Streifen unter einem schwebenden Schrank (Plan-Rechteck), mit Schein darunter
  underLight(x, z, w, d, y, floorY = 0.003) {
    this.box(x + 0.03, z + 0.03, w - 0.06, d - 0.06, y - 0.004, y, M.led);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: '#9fd0c8', transparent: true, opacity: 0.45, depthTest: false }));
    m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, CEIL + 0.04, z + d / 2); m.renderOrder = 10; m.visible = false; this.root.add(m); this.marks.push(m);
    this.glow(x - 0.15, z - 0.15, w + 0.3, d + 0.3, floorY);
  }
  view(name, pos, target, fov = 62, noDoor = false) { this.views[name] = { pos, target, fov, noDoor }; }
}

// Richtungsvektoren in den Raum (Plan): +x = [1,0], -x = [-1,0], +y = [0,1], -y = [0,-1]
const PX = [1, 0], NX = [-1, 0], PY = [0, 1], NY = [0, -1];

// =============================================================================
function elternbad() {
  const W = 3.25, H = 3.23, b = new Bath('eltern', 'Elternbad EG · 10,50 m²');
  b.bounds = [0, 0, W, H];
  b.floor(0, 0, W, H);
  b.wall(-0.24, -0.365, W + 0.24, 0.365, 'N', [b.win(0.61, 2.845, 1.00, 2.25)]);
  b.wall(-0.24, 0, 0.24, H + 0.24, 'W');
  b.wall(0, H, W + 0.115, 0.24, 'S');
  b.wall(W, -0.365, 0.115, H + 0.365, 'E', [b.gapO(1.66, 2.545)]);
  b.door(W, 2.545, W - 0.885, 2.545);
  b.wall(0, 1.54, 1.10, 0.115);                 // Wand WC / Dusche
  b.wall(1.10, 0.70, 0.115, 1.80);              // T-Wand
  if (!OPTS.openMirror) b.vorwand(1.215, 0.70, 0.15, 1.80, CEIL, false);   // Vorwand raumhoch für Spiegelschrank
  else {   // Vorwand mit offenem Fach hinter der rechten Spiegeltür
    b.vorwand(1.215, 0.70, 0.15, 1.80, 1.215, false);
    b.box(1.215, 0.70, 0.15, 1.80, 1.945, CEIL, M.plaster); b.box(1.215, 1.30, 0.15, 1.20, 1.215, 1.945, M.plaster);
    b.box(1.215, 0.70, 0.03, 0.60, 1.215, 1.945, M.oak);
    for (const [z, y, h, r] of [[0.85, 1.458, 0.16, 0.025], [0.95, 1.458, 0.12, 0.03], [1.12, 1.458, 0.18, 0.022], [0.90, 1.708, 0.10, 0.035], [1.10, 1.708, 0.14, 0.025]]) {
      const bt = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), M.ceramic); bt.position.set(1.30, y + h / 2, z); b.add(bt);
    }
    for (const y of [1.45, 1.70]) b.box(1.245, 0.72, 0.11, 0.56, y, y + 0.008, M.glass);
    b.box(1.243, 0.95, 0.004, 0.08, 1.30, 1.38, M.ceramic);   // Steckdose innen
    const fl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.004, 0.6), M.niche); fl.position.set(1.305, 1.217, 1.0); b.add(fl);
  }
  // WC
  b.vorwand(0, 1.34, 1.10, 0.20, 1.20);
  b.clad(0, 1.34, 1.10, 1.34, 0, 1.20, 0, -1);
  b.wc(0.45, 1.34, NY, true);
  // Dusche 110 x 157: Fliese raumhoch
  b.clad(0, 1.655, 0, H, 0, CEIL, 1, 0);
  b.clad(0, H, 1.10, H, 0, CEIL, 0, -1);
  b.clad(0, 1.655, 1.10, 1.655, 0, CEIL, 0, 1);
  b.clad(1.10, 1.655, 1.10, 2.50, 0, CEIL, -1, 0);
  b.clad(1.10, 2.50, 1.215, 2.50, 0, CEIL, 0, 1);
  b.niche(0, 2.30, 0, 2.90, 1, 0);
  b.rinne(0.10, 1.72, 1.00, 1.72);
  b.thermo(1.10, 1.05, 2.30, NX);
  b.head(0.55, 1.655, PY);                      // Kopfbrause aus der WC-Wand
  // Waschtisch 180 cm, 2 Becken, Achsen y 1,20 / 2,00 – Spritzschutz Fliese bis 1,20
  b.clad(1.365, 0.70, 1.365, 2.50, 0.85, 1.20, 1, 0);
  b.vanity(1.365, 2.50, PX, 1.80, 0.52, [0.50, 1.30], { sideBars: ['L', 'R'], openDoor: OPTS.openMirror ? 2 : undefined });   // Handtuchstangen seitlich am Unterschrank
  b.towel(2.00, H, NY, 0.60);
  b.cab(2.20, H - 0.35, W - 2.20, 0.35, 0.10, 2.35, 'N', 2, true);   // Hochschrank mit Wäscheklappe
  b.hooks(2.198, 2.98, NX, 2, 0.16, 1.70);                  // Bademantelhaken an der Schrankseite
  b.cab(W - 0.40, 0.03, 0.40, 1.57, 0.30, 0.80, 'W', 3);    // Sideboard schwebend, bis kurz vor die Tür
  b.cab(0, 1.24, 1.10, 0.30, 1.60, 2.35, 'N', 2);           // Hängeschrank über dem WC
  b.paper(0, 0.85, PX); b.brushUP(0.86, 1.34, NY);          // Bürste in der Vorwand
  // Licht: Spiegelschrank (Arbeitslicht), Schiene mit 4 Strahlern, Einbauspots IP65 in Dusche und am WC, indirekt unter Möbeln
  [[0.55, 0.6], [0.55, 2.6]].forEach(p => b.spot(...p));
  b.track(2.45, 0.35, 2.45, 2.95, [[3.1, 0.6, 0.7], [1.6, 1.2, 1.0], [1.6, 2.0, 1.0], [2.4, 3.1, 1.4]]);
  b.glow(1.30, 0.62, 0.70, 1.96);
  b.underLight(W - 0.40, 0.03, 0.40, 1.57, 0.30);
  b.underLight(0, 1.24, 1.10, 0.30, 1.60, 1.205);
  b.view('Blick von der Tür', [3.05, 2.10, 1.62], [1.2, 1.55, 1.15], 66);
  b.view('Blick zur Dusche', [2.3, 3.0, 1.62], [0.0, 2.2, 1.0], 70);
  b.view('Blick zum WC', [1.6, 0.15, 1.62], [0.45, 1.0, 1.15], 72);
  b.view('Nah am WC', [0.55, 0.12, 1.30], [0.55, 1.2, 0.55], 80);
  b.view('Spiegelschrank offen', [2.55, 0.30, 1.65], [1.3, 1.05, 1.55], 62);
  b.views['Spiegelschrank offen'].still = true;   // nur als Standbild
  b.view('Blick zum Sideboard', [1.7, 2.9, 1.62], [3.25, 0.7, 0.9], 66);
  b.view('Modell', [W + 1.3, -1.2, 5.8], [W / 2, H / 2, 0.4], 40);
  b.hideFrom = ['S', 'E'];
  return b;
}

// =============================================================================
function kinder964() {
  const W = 2.51, H = 4.01, b = new Bath('k964', 'Kinderbad OG · 9,64 m²');
  b.bounds = [0, 0, W, H];
  b.floor(0, 0, W, H);
  b.wall(-0.115, -0.365, W + 0.355, 0.365, 'N', [b.win(0.235, 0.995, 1.00, 2.25), b.win(1.50, 2.26, 1.00, 2.25)]);
  b.wall(-0.115, 0, 0.115, H + 0.24, 'W');
  b.wall(W, 0, 0.24, H + 0.24, 'E');
  b.wall(0, H, W, 0.24, 'S', [b.gapO(1.50, 2.385)]);
  b.door(2.385, H, 2.385, H - 0.885);
  b.wall(1.20, 0, 0.115, 1.687);
  b.wall(1.20, 1.687, 1.31, 0.115, null, [b.gapO(1.44, 2.20)]);
  b.door(2.20, 1.80, 2.20, 2.56);
  b.wall(0, 3.50, 1.155, 0.115); b.wall(1.04, 3.50, 0.115, 0.51);
  b.box(0, 3.615, 1.04, 0.395, 0, CEIL, M.shaft);
  // Dusche 120 x 140 ohne Glas, Rinne an der Außenwand
  b.clad(0, 0, 0, 1.40, 0, CEIL, 1, 0);
  b.clad(0, 0, 0.235, 0, 0, CEIL, 0, 1); b.clad(0.995, 0, 1.20, 0, 0, CEIL, 0, 1);   // Fenster bleibt frei
  b.clad(0.235, 0, 0.995, 0, 0, 1.00, 0, 1); b.clad(0.235, 0, 0.995, 0, 2.25, CEIL, 0, 1);
  b.clad(0.235, -0.18, 0.235, 0, 1.00, 2.25, 1, 0); b.clad(0.995, 0, 0.995, -0.18, 1.00, 2.25, -1, 0);   // Laibung gefliest
  b.clad(1.20, 0, 1.20, 1.687, 0, CEIL, -1, 0);
  b.rinne(0.10, 0.07, 1.10, 0.07);
  b.thermo(1.20, 1.05, 1.10, NX, true);
  b.head(1.20, 0.55, NX);
  b.niche(0, 0.50, 0, 1.10, 1, 0);
  // WC-Raum
  b.vorwand(1.315, 0, W - 1.315, 0.20, 0.95);
  b.clad(1.315, 0.20, W, 0.20, 0, 0.95, 0, 1);
  b.wc(1.90, 0.20, PY, false, 0.80);
  b.paper(2.51, 0.75, NX); b.brushUP(1.50, 0.20, PY);        // Bürste in der Vorwand
  b.spot(1.90, 0.9);
  // Handtuchwärmer am Duschausgang, 75 cm
  b.towel(0, 2.25, PX, 0.75);
  // Waschtisch 120 cm, 2 Becken, Achsen y 2,60 / 3,20
  b.vorwand(0, 2.30, 0.15, 1.20, CEIL, false);
  b.clad(0.15, 2.30, 0.15, 3.50, 0.85, 1.20, 1, 0);
  b.vanity(0.15, 3.50, PX, 1.20, 0.46, [0.30, 0.90], { bw: 0.36, bd: 0.28, frontBar: true });   // zwei Becken, Handtuchstange vorn
  b.hooks(1.155, 3.92, PX, 3, 0.15, 1.15); b.hooks(1.155, 3.92, PX, 3, 0.15, 1.65);   // Hakenwand am Eingang: Kinder unten, Erwachsene oben
  b.cab(2.21, 2.60, 0.30, 0.48, 0.15, 2.15, 'W', 1, true);   // schmaler Schrank zwischen den Türen, unten Wäscheklappe
  [[0.6, 0.7]].forEach(p => b.spot(...p));
  b.track(1.55, 2.0, 1.55, 3.75, [[0.3, 2.6, 1.0], [2.4, 2.85, 1.2], [0.3, 3.2, 1.0]]);
  b.glow(0.10, 2.22, 0.62, 1.36);
  b.view('Blick von der Tür', [2.2, 3.3, 1.62], [0.2, 2.6, 1.0], 75);
  b.view('Blick zur Dusche', [0.9, 3.3, 1.62], [0.5, 0.2, 1.1], 66);
  b.view('Blick in den WC-Raum', [1.85, 3.0, 1.62], [1.9, 0.2, 0.7], 62);
  b.view('Nah am WC', [1.9, 1.55, 1.25], [1.9, 0.4, 0.55], 80);
  b.view('Blick zur Türwand', [0.55, 2.2, 1.45], [2.5, 3.3, 1.1], 72, true);
  b.view('Modell', [W + 0.9, H + 1.0, 6.4], [W / 2, H / 2, 0.3], 44);
  b.hideFrom = ['S', 'E'];
  return b;
}

// =============================================================================
function kinder1060() {
  const W = 2.51, H = 4.50, b = new Bath('k1060', 'Kinderbad OG · 10,60 m²');
  b.bounds = [0, 0, W, H];
  b.floor(0, 0.64, W, H - 0.64); b.floor(1.155, 0, W - 1.155, 0.64);
  b.wall(-0.24, 0.64, 0.24, H - 0.64 + 0.365, 'W');
  b.wall(W, 0, 0.115, H + 0.365, 'E');
  b.wall(-0.24, H, W + 0.355, 0.365, 'S', [b.win(0.24, 1.00, 1.10, 2.25), b.win(1.51, 2.26, 1.10, 2.25)]);
  b.wall(-0.24, 0.525, 1.395, 0.115);
  b.wall(1.04, -0.115, 0.115, 0.64);
  b.box(0, -0.115, 1.04, 0.64, 0, CEIL, M.shaft);
  b.wall(1.155, -0.115, 1.355, 0.115, 'N', [b.gapO(1.50, 2.385)]);
  b.door(2.385, 0, 2.385, 0.885);
  // Dusche 115 x 115 mit Glas
  b.clad(0, 0.64, 0, 1.79, 0, CEIL, 1, 0);
  b.clad(0, 0.64, 1.155, 0.64, 0, CEIL, 0, 1);
  b.glass(0, 1.79, 1.15, 1.79);
  b.glass(1.15, 1.79, 1.15, 1.49);
  b.rinne(0.07, 0.72, 0.07, 1.72);
  b.thermo(0.90, 1.05, 0.64, PY, true);
  b.head(0.55, 0.64, PY);
  b.niche(0, 0.90, 0, 1.50, 1, 0);
  // linke Wand: durchgehende Vorwand 20 cm, raumhoch bei den Becken, 1,20 beim WC
  b.vorwand(0, 1.90, 0.20, 1.55, CEIL, false);
  b.vorwand(0, 3.45, 0.20, H - 3.45, 1.20);
  b.clad(0.20, 1.90, 0.20, 3.45, 0.85, 1.20, 1, 0);
  b.clad(0.20, 3.45, 0.20, H, 0, 1.20, 1, 0);
  b.vanity(0.20, 3.35, PX, 1.40, 0.48, [0.35, 1.05], { sideBars: ['L', 'R'] });
  b.wc(0.20, 4.05, PX);
  b.cab(0, 3.50, 0.30, 0.70, 1.60, 2.30, 'E', 2);          // Hängeschrank über dem WC
  b.paperUP(0.20, 4.36, PX); b.brushUP(0.20, 3.66, PX);     // Papier und Bürste in der Vorwand
  // Wanne 180 x 80 rechts. Fliese: Fensterwand bis zur Brüstung durchgehend, an der Wanne bis 1,80 (drei Reihen)
  const tx = W - 0.80, tz = H - 1.80;
  b.clad(W, tz, W, H, 0, 1.80, -1, 0);
  b.clad(0.20, H, W, H, 0, 1.10, 0, -1);
  b.clad(2.26, H, W, H, 1.10, 1.80, 0, -1);
  for (const [xa, xb] of [[0.24, 1.00], [1.51, 2.26]]) {   // Fensterlaibungen gefliest
    b.clad(xa, H + 0.18, xa, H, 1.10, 2.25, 1, 0); b.clad(xb, H, xb, H + 0.18, 1.10, 2.25, -1, 0);
  }
  b.tub(tx, tz, 0.80, 1.80);
  b.thermo(W, 0.75, H - 0.40, NX);
  b.niche(W, 2.95, W, 3.55, -1, 0, 0.72);                   // Nische an der Wanne
  b.towel(1.155, 0.58, PX, 0.50);                           // Handtuchwärmer direkt am Duschausgang
  b.cab(W - 0.35, 1.85, 0.35, 0.80, 0.30, 2.25, 'W', 2);    // Hochschrank hängend, 1,95 hoch
  b.bar(W - 0.33, 2.65, PY, 0.30, 0.95);                    // Wannenhandtuch an der Schrankseite
  b.hooks(W - 0.08, 1.848, NY, 2, 0.17, 1.20); b.hooks(W - 0.08, 1.848, NY, 2, 0.17, 1.65);   // Haken zur Tür hin, Kinder unten
  [[1.8, 0.4], [0.55, 1.15]].forEach(p => b.spot(...p));
  b.track(1.35, 1.95, 1.35, 4.25, [[2.3, 2.2, 1.2], [0.4, 2.7, 1.0], [2.1, 3.6, 0.6], [0.4, 4.0, 0.9]]);
  b.glow(0.14, 1.87, 0.62, 1.56);
  b.underLight(W - 0.35, 1.85, 0.35, 0.80, 0.30);
  b.underLight(0, 3.50, 0.30, 0.70, 1.60, 1.205);
  b.view('Blick von der Tür', [1.95, 0.25, 1.62], [0.4, 3.0, 1.0], 70);
  b.view('Blick zur Wanne', [0.85, 1.95, 1.62], [2.2, 4.3, 0.75], 64);
  b.view('Blick zur Dusche', [1.9, 2.9, 1.62], [0.3, 1.0, 1.05], 62);
  b.view('Nah am WC', [1.45, 3.65, 1.25], [0.3, 4.3, 0.55], 76);
  b.view('Am Duschausgang', [2.2, 1.6, 1.55], [1.1, 0.3, 1.0], 72);
  b.view('Blick zum Schrank', [0.75, 2.0, 1.55], [2.5, 2.6, 1.2], 70);
  b.view('Modell', [W + 0.9, -1.0, 6.6], [W / 2, H / 2, 0.3], 44);
  b.hideFrom = ['S', 'E'];
  return b;
}

Bath.prototype.tub = function (x, z, w, d) {
  const rimH = 0.58, t = 0.10;
  // Wannenträger gefliest
  this.box(x, z, w, t, 0, rimH - 0.03, tileMat(w, rimH));
  this.box(x, z, t, d, 0, rimH - 0.03, tileMat(d, rimH));
  this.box(x, z, w, d, 0, 0.05, tileMat(w, d));
  // Stahlwanne: Rand und Innenseiten
  const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(w, 0); shape.lineTo(w, d); shape.lineTo(0, d); shape.closePath();
  const iw = w - 0.12, id = d - 0.12, r = 0.12;
  const h = new THREE.Path(); h.moveTo(0.06 + r, 0.06); h.lineTo(0.06 + iw - r, 0.06); h.quadraticCurveTo(0.06 + iw, 0.06, 0.06 + iw, 0.06 + r);
  h.lineTo(0.06 + iw, 0.06 + id - r); h.quadraticCurveTo(0.06 + iw, 0.06 + id, 0.06 + iw - r, 0.06 + id);
  h.lineTo(0.06 + r, 0.06 + id); h.quadraticCurveTo(0.06, 0.06 + id, 0.06, 0.06 + id - r);
  h.lineTo(0.06, 0.06 + r); h.quadraticCurveTo(0.06, 0.06, 0.06 + r, 0.06); shape.holes.push(h);
  const rg = new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: false }); rg.rotateX(Math.PI / 2);
  const rim = new THREE.Mesh(rg, M.ceramic); rim.position.set(x, rimH, z); this.add(rim);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(iw, rimH - 0.08, id), M.ceramic);
  inner.material = M.ceramic; inner.position.set(x + 0.06 + iw / 2, 0.08 + (rimH - 0.08) / 2 - 0.03, z + 0.06 + id / 2);
  inner.geometry.groups.forEach(() => {});
  // nur Innenflächen sichtbar machen: Box mit BackSide
  inner.material = M.ceramic.clone(); inner.material.side = THREE.BackSide;
  this.add(inner);
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.16, 16), M.bronze);
  sp.rotation.z = Math.PI / 2; sp.position.set(x + w - 0.08, 0.65, z + d - 0.40); this.add(sp);
};

// =============================================================================
function gaestewc() {
  const W = 1.79, H = 2.14, b = new Bath('gwc', 'Gäste-WC EG · 3,82 m²');
  b.bounds = [0, 0, W, H];
  b.floor(0, 0, W, H);
  b.wall(-0.115, -0.115, W + 0.115, 0.115, 'N');
  b.wall(-0.115, 0, 0.115, H + 0.115, 'W', [b.gapO(0.125, 1.01)]);
  b.door(0, 0.125, 0.885, 0.125);
  b.wall(W, -0.115, 0.24, H + 0.23, 'E');
  b.wall(0, H, W, 0.115, 'S');
  // Vorwand unten, WC + Pissoir, Fliese bis 1,20
  b.vorwand(0, H - 0.20, W, 0.20, 1.20);
  b.clad(0, H - 0.20, W, H - 0.20, 0, 1.20, 0, -1);
  b.wc(0.45, H - 0.20, NY);
  b.pissoir(1.35, H - 0.20, NY);
  // Handwaschbecken rechts, 50 cm
  b.vorwand(W - 0.15, 0.20, 0.15, 0.75, CEIL, false);
  b.clad(W - 0.15, 0.20, W - 0.15, 0.95, 0.85, 1.20, -1, 0);
  b.vanity(W - 0.15, 0.20, NX, 0.75, 0.32, [0.375], { bw: 0.34, bd: 0.22, sideBars: ['R'] });
  b.cab(0.03, H - 0.25, 1.55, 0.25, 1.60, 2.30, 'N', 3);   // Hängeschrank über WC und Pissoir
  b.mural(0.12, 0, 1.25, 0, 0.85, 2.25, 0, 1);              // Wandbild gegenüber dem WC, flach
  b.paper(0, 1.45, PX); b.brushUP(0.90, H - 0.20, NY);
  [[0.9, 1.25]].forEach(p => b.spot(...p));
  b.track(0.45, 0.75, 0.95, 0.75, [[0.68, 0.0, 1.55]]);       // schwenkbarer Strahler aufs Wandbild
  b.glow(1.25, 0.12, 0.45, 0.91);
  b.underLight(0.03, H - 0.25, 1.55, 0.25, 1.60, 1.205);
  b.view('Blick von der Tür', [0.25, 0.55, 1.62], [1.7, 0.6, 1.1], 70);
  b.view('Blick zu WC und Pissoir', [1.2, 0.25, 1.62], [0.8, 2.1, 1.0], 72);
  b.view('Blick vom WC', [0.6, 1.35, 1.20], [0.7, 0, 1.55], 80, true);
  b.view('Modell', [-1.0, -1.0, 4.8], [W / 2, H / 2, 0.4], 42);
  b.hideFrom = ['S', 'E'];
  return b;
}

export const BATHS = { eltern: elternbad, k964: kinder964, k1060: kinder1060, gwc: gaestewc };

// ---------- Szene, Licht, Kamera ----------
export function makeRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(w, h, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

export async function makeScene(id, renderer) {
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const b = BATHS[id]();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6e0');
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(b.root);
  const [x0, z0, x1, z1] = b.bounds, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  scene.add(new THREE.HemisphereLight('#fffaf0', '#cbbfae', 0.55));
  const sun = new THREE.DirectionalLight('#fff4e2', 1.6);
  sun.position.set(cx - 3, 6, cz - 4); sun.target.position.set(cx, 0, cz);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 20 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const room = new THREE.PointLight('#ffe9cc', 2.2, 0, 2);
  room.position.set(cx, CEIL - 0.25, cz); room.castShadow = true; room.shadow.mapSize.set(1024, 1024); room.shadow.bias = -0.002;
  scene.add(room);
  return { scene, bath: b };
}

// Modus "Modell": Decke weg, Wände zur Kamera auf Sockelhöhe kappen
export function setMode(bath, mode, camPos) {
  const model = mode === 'model';
  bath.ceilings.forEach(c => (c.visible = !model));
  const [x0, z0, x1, z1] = bath.bounds, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const dx = camPos ? camPos.x - cx : 1, dz = camPos ? camPos.z - cz : 1;
  const faces = { N: dz < -0.5 * Math.abs(dx), S: dz > 0.5 * Math.abs(dx), W: dx < -0.5 * Math.abs(dz), E: dx > 0.5 * Math.abs(dz) };
  for (const w of bath.walls) {
    const cut = model && w.side && faces[w.side];
    w.mesh.visible = !cut;
  }
  bath.root.traverse(m => { if (m.userData.cutHide) m.visible = !model && !bath.noDoor; });
}

export function camFor(view, w, h) {
  const c = new THREE.PerspectiveCamera(view.fov, w / h, 0.05, 50);
  c.position.set(view.pos[0], view.pos[2], view.pos[1]);
  c.lookAt(view.target[0], view.target[2], view.target[1]);
  return c;
}

export function topCam(bath, w, h) {
  const [x0, z0, x1, z1] = bath.bounds, pad = 0.45;
  const bw = x1 - x0 + 2 * pad, bh = z1 - z0 + 2 * pad, a = w / h;
  const sw = Math.max(bw, bh * a), sh = sw / a;
  const c = new THREE.OrthographicCamera(-sw / 2, sw / 2, sh / 2, -sh / 2, 0.1, 20);
  c.position.set((x0 + x1) / 2, 8, (z0 + z1) / 2); c.up.set(0, 0, -1); c.lookAt((x0 + x1) / 2, 0, (z0 + z1) / 2);
  return c;
}
