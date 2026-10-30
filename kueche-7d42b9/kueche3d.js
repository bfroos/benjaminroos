// 3D-Modell Küche Haus Montabaur. Maße aus Elektro-Grundriss EG ZT 1-3 (20.08.2026, 1:50)
// und BEWA/PLANA-Teilelisten 7913815 (Hochschrankwand) + 7913831 (Insel), Pläne 05.10.2026.
// Koordinaten: Plan-x -> X (Osten), Plan-y -> Z (Süden), Höhe -> Y. Meter ab fertigem Fußboden.
// Ursprung: Innenecke Garagenwand / Küchenseite der Abstellraumwand.
import * as THREE from 'three';

export const CEIL = 2.85;                 // angenommen: Geschoss 3,25 − Decke 0,25 − Aufbau OG ca. 0,15
export const OPTS = { openDoor: false };  // Durchgangstür zur Speisekammer offen zeigen
const TALL = 2.21, TOP = 2.60, WH = 0.92; // Hochschrank, Oberkante Aufsatz (Kehlleiste 2598), Arbeitshöhe

function canvasTex(wPx, hPx, draw) {
  const c = document.createElement('canvas'); c.width = wPx; c.height = hPx;
  draw(c.getContext('2d'), wPx, hPx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

export const PAL = {
  stone: '#d8cfc1', grout: '#c4baab', plaster: '#ece6dc', ceil: '#f4f1eb',
  oak: '#c4a074', sand: '#d3c6b2', kaschmir: '#c9bcaa', sandgrau: '#a59b8d', granite: '#232120',
  bronze: '#b48d62',
};

const tileTex = canvasTex(768, 384, (g, w, h) => {      // Bodenfliese 120 x 60, Kalkstein hell wie in den Bädern
  g.fillStyle = PAL.stone; g.fillRect(0, 0, w, h);
  const r = rnd(7);
  for (let i = 0; i < 2600; i++) {
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
const oakTex = canvasTex(512, 512, (g, w, h) => {       // Feineiche natur, senkrechte Maserung
  g.fillStyle = PAL.oak; g.fillRect(0, 0, w, h);
  const r = rnd(11);
  for (let i = 0; i < 240; i++) {
    const x = r() * w, a = 0.04 + r() * 0.10;
    g.strokeStyle = r() < 0.6 ? `rgba(110,75,40,${a})` : `rgba(240,215,180,${a})`;
    g.lineWidth = 0.6 + r() * 2; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y / 80 + i) * 3 + (r() - 0.5) * 2, y);
    g.stroke();
  }
});
const graniteTex = canvasTex(512, 512, (g, w, h) => {   // Winning Black satiniert
  g.fillStyle = PAL.granite; g.fillRect(0, 0, w, h);
  const r = rnd(5);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = r() < 0.7 ? `rgba(0,0,0,${0.2 + r() * 0.3})` : `rgba(140,135,128,${0.15 + r() * 0.25})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3);
  }
});
const hobTex = canvasTex(512, 320, (g, w, h) => {      // Induktionsfeld mit Abzug in der Mitte
  g.fillStyle = '#0f0f10'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(160,160,160,0.35)'; g.lineWidth = 2;
  for (const [cx, cy] of [[90, 80], [90, 240], [422, 80], [422, 240]]) { g.beginPath(); g.arc(cx, cy, 58, 0, 7); g.stroke(); }
  g.fillStyle = '#232325'; g.fillRect(w / 2 - 46, 20, 92, h - 40);
  g.strokeStyle = 'rgba(90,90,95,0.9)'; g.lineWidth = 3;
  for (let y = 34; y < h - 30; y += 14) { g.beginPath(); g.moveTo(w / 2 - 38, y); g.lineTo(w / 2 + 38, y); g.stroke(); }
  g.fillStyle = 'rgba(200,200,200,0.5)'; g.font = '16px sans-serif'; g.fillText('- 6 +', w / 2 - 20, h - 6);
});

function tileMat(u, v) {
  const t = tileTex.clone(); t.needsUpdate = true; t.repeat.set(u / 1.2, v / 0.6);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 });
}
function oakMat(u, v) {
  const t = oakTex.clone(); t.needsUpdate = true; t.repeat.set(Math.max(u, 0.2) / 0.6, Math.max(v, 0.2) / 1.2);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.62 });
}
const M = {
  plaster: new THREE.MeshStandardMaterial({ map: plasterTex, roughness: 0.95 }),
  ceil: new THREE.MeshStandardMaterial({ color: PAL.ceil, roughness: 1, emissive: PAL.ceil, emissiveIntensity: 0.32 }),
  poly: new THREE.MeshPhysicalMaterial({ color: PAL.sand, roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
  kaschmir: new THREE.MeshStandardMaterial({ color: PAL.kaschmir, roughness: 0.75 }),
  sandgrau: new THREE.MeshStandardMaterial({ color: PAL.sandgrau, roughness: 0.8 }),
  korpus: new THREE.MeshStandardMaterial({ color: '#b8956a', roughness: 0.7 }),
  granite: new THREE.MeshStandardMaterial({ map: graniteTex, roughness: 0.42 }),
  blackGlass: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.08, metalness: 0.2 }),
  hob: new THREE.MeshStandardMaterial({ map: hobTex, roughness: 0.1 }),
  silgranit: new THREE.MeshStandardMaterial({ color: '#262626', roughness: 0.7, side: THREE.DoubleSide }),
  blackMetal: new THREE.MeshStandardMaterial({ color: '#1b1b1b', roughness: 0.45, metalness: 0.6 }),
  bronze: new THREE.MeshStandardMaterial({ color: PAL.bronze, roughness: 0.34, metalness: 0.8 }),
  winGlass: new THREE.MeshStandardMaterial({ color: '#cfe3ee', roughness: 0.05, transparent: true, opacity: 0.22, depthWrite: false }),
  frame: new THREE.MeshStandardMaterial({ color: '#3f3f3d', roughness: 0.6 }),
  door: new THREE.MeshStandardMaterial({ color: '#f2efe9', roughness: 0.6 }),
  led: new THREE.MeshStandardMaterial({ color: '#fff3dc', emissive: '#ffe7bd', emissiveIntensity: 2.2 }),
  white: new THREE.MeshStandardMaterial({ color: '#f1efea', roughness: 0.4 }),
  shelf: new THREE.MeshStandardMaterial({ color: '#e7e1d6', roughness: 0.8 }),
  chair: new THREE.MeshStandardMaterial({ color: '#d9cfc0', roughness: 0.85 }),
  grass: new THREE.MeshStandardMaterial({ color: '#8fa475', roughness: 1 }),
  terrace: new THREE.MeshStandardMaterial({ color: '#cdc6ba', roughness: 0.9 }),
};

class Room {
  constructor() {
    this.root = new THREE.Group();
    this.walls = []; this.ceilings = []; this.views = {}; this.marks = []; this.door = null;
    this.bounds = [-1.5, -2.2, 6.3, 6.7];
  }
  add(o) { o.traverse(m => { if (m.isMesh) { m.castShadow = !m.material.transparent; m.receiveShadow = true; } }); this.root.add(o); return o; }
  box(x, z, w, d, y0, y1, mat, parent) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, y1 - y0, d), mat);
    m.position.set(x + w / 2, (y0 + y1) / 2, z + d / 2);
    if (parent) { m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; }
    return this.add(m);
  }
  wall(x, z, w, d, side = null, openings = []) {
    const alongX = w >= d, len = alongX ? w : d, s0 = alongX ? x : z;
    const piece = (a, b, y0, y1) => {
      if (b - a < 1e-3 || y1 - y0 < 1e-3) return;
      const m = alongX ? this.box(a, z, b - a, d, y0, y1, M.plaster) : this.box(x, a, w, b - a, y0, y1, M.plaster);
      this.walls.push({ mesh: m, side });
    };
    let cur = s0;
    for (const o of openings.slice().sort((p, q) => p.a - q.a)) {
      piece(cur, o.a, 0, CEIL); piece(o.a, o.b, 0, o.sill); piece(o.a, o.b, o.head, CEIL);
      if (o.win) {
        const t = alongX ? d : w, mid = (alongX ? z : x) + t / 2;
        const g = alongX ? this.box(o.a, mid - 0.01, o.b - o.a, 0.02, o.sill, o.head, M.winGlass)
                         : this.box(mid - 0.01, o.a, 0.02, o.b - o.a, o.sill, o.head, M.winGlass);
        g.castShadow = false; this.walls.push({ mesh: g, side });
        const fr = (a, b, y0, y1) => this.walls.push({ side, mesh: alongX ? this.box(a, mid - 0.035, b - a, 0.07, y0, y1, M.frame)
                                                                         : this.box(mid - 0.035, a, 0.07, b - a, y0, y1, M.frame) });
        fr(o.a, o.b, o.sill, o.sill + 0.05); fr(o.a, o.b, o.head - 0.07, o.head);
        fr(o.a, o.a + 0.07, o.sill, o.head); fr(o.b - 0.07, o.b, o.sill, o.head);
        for (const m of o.mullions || []) fr(m - 0.035, m + 0.035, o.sill, o.head);
      }
      cur = o.b;
    }
    piece(cur, s0 + len, 0, CEIL);
  }
  win(a, b, sill, head, mullions) { return { a, b, sill, head, win: true, mullions }; }
  gapO(a, b, head = 2.10) { return { a, b, sill: 0, head }; }
  floor(x, z, w, d, ceil = true, mat) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat || tileMat(w, d));
    m.rotation.x = -Math.PI / 2; m.position.set(x + w / 2, 0, z + d / 2); m.receiveShadow = true; this.root.add(m);
    if (ceil) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(w, d), M.ceil);
      c.rotation.x = Math.PI / 2; c.position.set(x + w / 2, CEIL, z + d / 2); this.root.add(c); this.ceilings.push(c);
    }
  }
  glow(x, z, w, d, y, h = 0.012) { const m = this.box(x, z, w, d, y, y + h, M.led); m.castShadow = false; return m; }
  view(name, pos, target, fov = 62, extra = {}) { this.views[name] = { pos, target, fov, ...extra }; }
  // Markierung für den Anschlussplan: Kugel + Schild, nur im Modus "Anschlüsse"
  mark(x, z, y, kind, label) {
    const col = { E: '#d23c2c', K: '#7a3fb0', W: '#2d7fc4', A: '#6f6a62', L: '#e0a412' }[kind];
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), new THREE.MeshBasicMaterial({ color: col, depthTest: false }));
    s.position.set(x, y, z); s.renderOrder = 10; g.add(s);
    const c = document.createElement('canvas'); c.width = 128; c.height = 64; const q = c.getContext('2d');
    q.fillStyle = col; q.beginPath(); q.roundRect(4, 8, 120, 48, 12); q.fill();
    q.fillStyle = '#fff'; q.font = 'bold 32px Helvetica, Arial'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(label, 64, 33);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false }));
    sp.scale.set(0.26, 0.13, 1); sp.position.set(x, y + 0.13, z); sp.renderOrder = 11; g.add(sp);
    g.visible = false; this.root.add(g); this.marks.push(g);
  }
}

// ---------- Hochschrankwand (Teileliste 7913815): Fronten Feineiche natur, grifflos, Kehlleisten sandgrau ----------
function front(r, x, z, w, y0, y1, mat, faceZ = true) {
  const gap = 0.003;
  return faceZ ? r.box(x + gap, z, w - 2 * gap, 0.019, y0 + gap, y1 - gap, mat || oakMat(w, y1 - y0))
               : r.box(z, x + gap, 0.019, w - 2 * gap, y0 + gap, y1 - gap, mat || oakMat(w, y1 - y0));
}
function tallWall(r) {
  const D = 0.58, F = D;   // Korpustiefe, Fronten liegen bei z = 0,58 … 0,60
  const K = 0.025;
  const units = [
    { w: 0.60, t: 'vorrat' }, { w: 0.60, t: 'vorrat' }, { w: 0.60, t: 'geraete' }, { w: 0.60, t: 'kuehl' },
    { w: 0.80, t: 'tuer' }, { w: 0.55, t: 'geschirr' },
  ];
  let x = 0;
  units.forEach((u, i) => {
    if (u.t !== 'tuer') {
      r.box(x, 0, u.w, D, 0.10, TOP, M.korpus);
      r.box(x + 0.01, D - 0.07, u.w - 0.02, 0.05, 0, 0.10, oakMat(u.w, 0.1));   // Sockel
    }
    const fr = (y0, y1, m) => front(r, x, F, u.w, y0, y1, m);
    if (u.t === 'vorrat' || u.t === 'geschirr') { fr(0.10, 0.879); fr(0.879, TALL); }
    if (u.t === 'geraete') {
      fr(0.10, 0.48); fr(0.48, 0.82);
      fr(0.82, 1.42, M.blackGlass); r.box(x + 0.04, F + 0.019, u.w - 0.08, 0.012, 1.33, 1.36, M.blackMetal);   // Backofen
      fr(1.42, 1.80, M.blackGlass);                                                                         // Mikrowelle
      fr(1.80, TALL);
    }
    if (u.t === 'kuehl') { fr(0.10, 1.88); fr(1.88, TALL); }
    if (u.t === 'tuer') {
      // Durchgangstür als Schrankfront getarnt, schlägt in die Speisekammer auf
      r.box(x, 0, 0.02, D, 0, TALL, M.korpus); r.box(x + u.w - 0.02, 0, 0.02, D, 0, TALL, M.korpus);
      r.box(x, 0, u.w, D, TALL, TOP, M.korpus);
      const pivot = new THREE.Group(); pivot.position.set(x + u.w - 0.025, 0, F - 0.02);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(u.w - 0.05, TALL - 0.006, 0.04), oakMat(u.w, TALL));
      leaf.position.set(-(u.w - 0.05) / 2, TALL / 2, 0.02); leaf.castShadow = leaf.receiveShadow = true;
      pivot.add(leaf); r.root.add(pivot); r.door = pivot;
      pivot.rotation.y = OPTS.openDoor ? -1.45 : 0;
    }
    front(r, x, F, u.w, TALL, TOP);   // Aufsatz bzw. Klappe über der Tür
    x += u.w;
    if (i < units.length - 1) {                      // Kehlleiste C-Form, senkrecht, sandgrau
      r.box(x, 0, K, D - 0.03, 0, TOP, M.sandgrau);
      x += K;
    }
  });
  r.box(x, 0, 3.883 - x, F + 0.02, 0, TOP, M.sandgrau);  // Passleiste zur Treppenwand
  // Vorschlag: Kofferung bis zur Decke mit LED-Schattenfuge
  r.box(0, 0, 3.883, 0.62, TOP + 0.03, CEIL, M.plaster);
  r.glow(0.02, 0.585, 3.84, 0.02, TOP + 0.005, 0.02);
}

// ---------- Insel (Teileliste 7913831): Polymerglas Sandbeige, Wangen Kaschmir, Naturstein Winning Black ----------
export const ISL = { x: 0.76, z: 1.80, w: 2.132, d: 1.174 };
function island(r) {
  const { x, z, w, d } = ISL, x1 = x + w, z1 = z + d, top = WH - 0.033;
  r.box(x, z, 0.016, d, 0, top, M.kaschmir); r.box(x1 - 0.016, z, 0.016, d, 0, top, M.kaschmir);   // Wangen
  r.box(x + 0.016, z + 0.06, w - 0.032, d - 0.12, 0, 0.10, M.sandgrau);                              // Sockel
  r.box(x + 0.016, z + 0.02, w - 0.032, d - 0.04, 0.10, top - 0.21, M.korpus);                       // Korpus
  r.box(x + 0.616, z + 0.02, w - 0.632, d - 0.04, top - 0.21, top, M.korpus);
  r.box(x + 0.016, z + 0.50, 0.60, d - 0.52, top - 0.21, top, M.korpus);
  // Nordseite (Arbeitsseite, man schaut Richtung Garten): Spüle 60, Geschirrspüler 60, Kochfeld 90
  const xs = x + 0.016;
  const fN = (a, b, y0, y1) => r.box(xs + a + 0.003, z, b - a - 0.006, 0.02, y0 + 0.003, y1 - 0.003, M.poly);
  fN(0, 0.60, 0.10, top); fN(0.60, 1.20, 0.10, top); fN(1.20, 2.10, 0.10, 0.60); fN(1.20, 2.10, 0.60, top);
  // Südseite (zum Essplatz): Unterschränke 45 · 120 · 45, Türen
  const fS = (a, b) => r.box(xs + a + 0.003, z1 - 0.02, b - a - 0.006, 0.02, 0.103, top - 0.003, M.poly);
  fS(0, 0.45); fS(0.45, 1.05); fS(1.05, 1.65); fS(1.65, 2.10);
  // Arbeitsplatte 3,3 cm mit Ausschnitt fürs Unterbaubecken
  const bx0 = xs + 0.05, bx1 = xs + 0.55, bz0 = z + 0.08, bz1 = z + 0.48;
  const tp = (a, b, c, e) => r.box(a, c, b - a, e - c, top, WH, M.granite);
  tp(x - 0.006, x1 + 0.006, z, bz0); tp(x - 0.006, x1 + 0.006, bz1, z1);
  tp(x - 0.006, bx0, bz0, bz1); tp(bx1, x1 + 0.006, bz0, bz1);
  // BLANCO Subline 500-U, Silgranit schwarz
  r.box(bx0, bz0, bx1 - bx0, 0.01, top - 0.19, top, M.silgranit); r.box(bx0, bz1 - 0.01, bx1 - bx0, 0.01, top - 0.19, top, M.silgranit);
  r.box(bx0, bz0, 0.01, bz1 - bz0, top - 0.19, top, M.silgranit); r.box(bx1 - 0.01, bz0, 0.01, bz1 - bz0, top - 0.19, top, M.silgranit);
  r.box(bx0, bz0, bx1 - bx0, bz1 - bz0, top - 0.20, top - 0.19, M.silgranit);
  // Quooker Flex Square schwarz hinter dem Becken (Zugauslauf zeigt zur Arbeitsseite)
  const qx = (bx0 + bx1) / 2, qz = bz1 + 0.06;
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.36, 20), M.blackMetal); post.position.set(qx, WH + 0.18, qz); r.add(post);
  r.box(qx - 0.016, qz - 0.24, 0.032, 0.24, WH + 0.33, WH + 0.36, M.blackMetal);
  r.box(qx - 0.016, qz - 0.26, 0.032, 0.04, WH + 0.24, WH + 0.36, M.blackMetal);
  r.box(qx + 0.03, qz - 0.012, 0.03, 0.024, WH + 0.10, WH + 0.13, M.blackMetal);
  // Kochfeld mit Abzug (Downline Advance, 83 cm, Umluft), flächenbündig
  const hx = xs + 1.20 + 0.035, hw = 0.83;
  r.box(hx, z + 0.03, hw, 0.52, WH - 0.004, WH + 0.001, M.hob);
  // Vorschlag: versenkbarer Steckdosenturm in der Platte (Ausschnitt bei BEWA mitbestellen)
  const pop = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 24), M.blackMetal); pop.position.set(xs + 0.90, WH + 0.003, z + 0.92); r.add(pop);
}

// ---------- Vorschlag: Getränke- und Kaffeestation 91 cm an der Wand zum Eingang ----------
function station(r) {
  const x = -1.251, z0 = 1.70, w = 0.90;
  r.box(x, z0, 0.58, w, 0.10, WH - 0.033, M.korpus);
  r.box(x + 0.02, z0 + 0.01, 0.52, w - 0.02, 0, 0.10, oakMat(0.5, 0.1));
  front(r, z0, x + 0.58, 0.45, 0.10, WH - 0.033, null, false);                 // Getränkekühler (integriert)
  front(r, z0 + 0.45, x + 0.58, 0.45, 0.10, 0.50, null, false); front(r, z0 + 0.45, x + 0.58, 0.45, 0.50, WH - 0.033, null, false);
  r.box(x, z0, 0.60, w, WH - 0.033, WH, M.granite);
  r.box(x, z0, 0.35, w, 1.45, TALL, M.korpus);                                 // Oberschränke push to open
  front(r, z0, x + 0.35, 0.45, 1.45, TALL, null, false); front(r, z0 + 0.45, x + 0.35, 0.45, 1.45, TALL, null, false);
  r.glow(x + 0.02, z0 + 0.02, 0.30, w - 0.04, 1.437);
  // Kaffeemaschine als Platzhalter
  r.box(x + 0.10, z0 + 0.52, 0.30, 0.24, WH, WH + 0.36, M.blackMetal);
}

// ---------- Essplatz (Bestand, Lage nach Elektroplan F18.1) ----------
function dining(r) {
  const cx = 1.54, cz = 4.82, L = 2.40, B = 1.00;
  r.box(cx - L / 2, cz - B / 2, L, B, 0.72, 0.76, oakMat(L, B));
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) r.box(cx + dx * (L / 2 - 0.12) - 0.04, cz + dz * (B / 2 - 0.12) - 0.04, 0.08, 0.08, 0, 0.72, oakMat(0.1, 0.7));
  for (let i = 0; i < 4; i++) {
    const px = cx - L / 2 + 0.30 + i * 0.60;
    for (const s of [-1, 1]) {
      const pz = cz + s * (B / 2 + 0.12) - 0.22;
      r.box(px - 0.22, pz, 0.44, 0.44, 0.44, 0.48, M.chair);
      r.box(px - 0.22, s < 0 ? pz : pz + 0.40, 0.44, 0.04, 0.48, 0.84, M.chair);
      for (const [a, b] of [[0.02, 0.02], [0.38, 0.02], [0.02, 0.38], [0.38, 0.38]]) r.box(px - 0.22 + a, pz + b, 0.03, 0.03, 0, 0.44, M.blackMetal);
    }
  }
}

function pendant(r, x, z, yBottom, d) {
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, CEIL - yBottom - 0.16), M.blackMetal);
  cord.position.set(x, (CEIL + yBottom + 0.16) / 2, z); r.add(cord);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(d / 2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.bronze);
  shade.material = M.bronze.clone(); shade.material.side = THREE.DoubleSide;
  shade.position.set(x, yBottom, z); shade.scale.y = 0.55; r.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 8), M.led); bulb.position.set(x, yBottom + 0.02, z); r.add(bulb);
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 20), M.bronze); canopy.position.set(x, CEIL - 0.01, z); r.add(canopy);
}

function track(r, x1, z1, x2, z2, spots) {   // 48-V-Magnetschiene, eingelassen, mit Strahlern
  const len = Math.hypot(x2 - x1, z2 - z1);
  const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.02, 0.035), M.blackMetal);
  rail.position.set((x1 + x2) / 2, CEIL - 0.01, (z1 + z2) / 2); rail.rotation.y = -Math.atan2(z2 - z1, x2 - x1); r.add(rail);
  for (const [sx, sz, tx, tz, ty] of spots) {
    const g = new THREE.Group(); g.position.set(sx, CEIL - 0.02, sz);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.11, 18), M.blackMetal); c.position.y = -0.055; c.rotation.x = 0; g.add(c);
    g.lookAt(tx, ty, tz); g.rotateX(Math.PI / 2); r.add(g);
  }
}

function pantry(r) {   // Speisekammer (Abstellraum 6,47 m²) – Vorschlag Regal + Gefrierschrank
  r.floor(0, -1.78, 3.883, 1.665);
  for (const h of [0.35, 0.75, 1.15, 1.55, 1.95]) {
    r.box(0, -1.78, 0.40, 1.60, h, h + 0.02, M.shelf);
    r.box(0.40, -1.78, 2.10, 0.40, h, h + 0.02, M.shelf);
  }
  r.box(3.18, -1.74, 0.62, 0.65, 0, 1.86, M.white);   // Gefrierschrank (fehlt in der Bestellung)
}

function stair(r) {    // Treppe neben der Küche, vereinfacht (18 Stufen 18,06 / 26,89)
  const x0 = 4.123, xm = 5.25, x1 = 6.384, rise = 0.1806, run = 0.2689;
  const land = 1.45 - 9 * run;                     // Podest von -1,78 bis hier
  for (let i = 0; i < 9; i++) r.box(x0, 1.45 - (i + 1) * run, xm - x0, run, 0, (i + 1) * rise, M.shelf);
  r.box(x0, -1.78, x1 - x0, land + 1.78, 9 * rise - 0.04, 9 * rise, M.shelf);
  for (let i = 0; i < 9; i++) r.box(xm, land + i * run, x1 - xm, run, 9 * rise, 9 * rise + (i + 1) * rise, M.shelf);
  r.floor(x0, -1.78, x1 - x0, 3.468, false);
}

export function kitchen() {
  const r = new Room();
  // Böden: Küche, Erweiterung nach Westen und Süden (Essen)
  r.floor(0, 0, 3.883, 1.688);
  r.floor(-1.251, 1.688, 5.40, 4.608);
  r.floor(4.149, 1.688, 2.15, 1.75);
  r.floor(4.149, 3.438, 2.15, 2.858, false);      // Luftraum OG über dem Wohnbereich
  // Wände
  r.wall(0, -0.115, 3.883, 0.115, 'N', [r.gapO(2.482, 3.283, TALL)]);       // Abstellraum/Küche, Tür auf Küchenplanung abgestimmt
  r.wall(-0.365, -2.145, 4.73, 0.365, 'N');
  r.wall(-0.365, -2.145, 0.365, 3.593, 'W');                                 // Garagenwand
  r.wall(-1.491, 1.448, 1.491, 0.24, 'W');                                   // Wand zum Eingang (Nord)
  r.wall(-1.491, 1.688, 0.24, 4.608, 'W', [r.gapO(3.108, 4.118)]);          // Wand zum Eingang mit Durchgang
  r.wall(3.883, -1.78, 0.24, 3.468, 'E');                                    // Treppenwand
  r.wall(3.853, 1.688, 0.296, 1.75, 'E');                                    // Schalterwand unter dem Podest
  r.wall(6.384, -1.78, 0.24, 3.468, 'E');
  r.wall(-1.491, 6.296, 7.79, 0.365, 'S', [r.win(-0.512, 3.699, 0, 2.51, [0.54, 1.59, 2.64]), r.win(4.183, 6.299, 0, 2.51, [5.24])]);
  // Terrasse und Garten vor der Glasfront
  r.box(-1.6, 6.661, 8.0, 2.2, -0.02, 0, M.terrace); r.box(-6, 8.86, 18, 10, -0.03, -0.01, M.grass);
  tallWall(r); island(r); station(r); dining(r); pantry(r); stair(r);
  // Licht: zwei Pendel über der Insel (Auslass F18.2), zwei über dem Tisch (F18.1), Schiene vor der Schrankwand, LED-Fuge
  pendant(r, ISL.x + 0.62, ISL.z + ISL.d / 2, 1.62, 0.34); pendant(r, ISL.x + ISL.w - 0.62, ISL.z + ISL.d / 2, 1.62, 0.34);
  pendant(r, 0.99, 4.82, 1.55, 0.44); pendant(r, 2.09, 4.82, 1.55, 0.44);
  track(r, 0.30, 1.05, 3.60, 1.05, [[0.6, 1.05, 0.6, 0.6, 1.2], [1.55, 1.05, 1.55, 0.6, 1.1], [2.5, 1.05, 2.2, 0.6, 1.3], [3.35, 1.05, 3.6, 0.6, 1.2]]);
  // Anschlüsse (Nummern wie in der Rohbau-Liste)
  r.mark(1.55, 0.30, 2.00, 'E', 'E1'); r.mark(1.75, 0.30, 2.00, 'E', 'E2'); r.mark(2.17, 0.30, 2.05, 'E', 'E3');
  r.mark(3.60, 0.55, 0.15, 'E', 'E4'); r.mark(0.30, 0.55, 2.72, 'L', 'L3'); r.mark(1.9, 1.05, CEIL - 0.05, 'L', 'L2');
  r.mark(2.45, 2.05, 0.05, 'K', 'K1'); r.mark(1.15, 2.05, 0.05, 'E', 'E5'); r.mark(1.05, 2.20, 0.12, 'W', 'W1');
  r.mark(1.25, 2.20, 0.12, 'A', 'A1'); r.mark(1.66, 2.72, 0.05, 'E', 'E6'); r.mark(ISL.x + ISL.w / 2, 2.39, CEIL - 0.05, 'L', 'L1');
  r.mark(-1.20, 2.15, 1.10, 'E', 'E7'); r.mark(-1.20, 1.95, 0.30, 'E', 'E8'); r.mark(3.5, -1.75, 0.30, 'E', 'E9');
  // Ansichten
  r.view('Vom Essplatz', [2.9, 5.75, 1.60], [1.6, 0.3, 1.15], 62);
  r.view('Vom Eingang', [-1.05, 3.65, 1.62], [2.7, 0.6, 1.05], 66);
  r.view('An der Insel', [1.85, 0.72, 1.72], [1.75, 6.0, 0.80], 64);
  r.view('Schrankwand', [1.95, 4.05, 1.50], [1.95, 0.0, 1.35], 55);
  r.view('Zur Speisekammer', [3.55, 2.75, 1.60], [2.85, -1.3, 1.05], 60, { door: true });
  r.view('Modell', [7.4, 8.6, 6.4], [1.4, 2.0, 0.4], 40);
  return r;
}

// ---------- Szene, Licht, Kamera ----------
export function makeRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(w, h, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}

export async function makeScene(renderer) {
  const { RoomEnvironment } = await import('three/addons/environments/RoomEnvironment.js');
  const k = kitchen();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#e9e6e0');
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  scene.add(k.root);
  scene.add(new THREE.HemisphereLight('#fffaf0', '#cbbfae', 0.6));
  const sun = new THREE.DirectionalLight('#fff4e2', 2.2);      // Sonne von Süden durch die Glasfront
  sun.position.set(-2, 7, 12); sun.target.position.set(1.5, 0, 2.5);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 30 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  for (const [x, z, i] of [[1.9, 1.0, 2.2], [1.6, 4.3, 1.6], [2.9, -0.9, 0.8]]) {
    const p = new THREE.PointLight('#ffe9cc', i, 0, 2); p.position.set(x, CEIL - 0.25, z);
    if (i > 2) { p.castShadow = true; p.shadow.mapSize.set(1024, 1024); p.shadow.bias = -0.002; }
    scene.add(p);
  }
  return { scene, room: k };
}

export function setDoor(room, open) { if (room.door) room.door.rotation.y = open ? -1.45 : 0; }
export function showMarks(room, on) { room.marks.forEach(m => (m.visible = on)); }

// Modus "Modell": Decke weg, Wände zur Kamera ausblenden
export function setMode(room, mode, camPos) {
  const model = mode === 'model';
  room.ceilings.forEach(c => (c.visible = !model));
  const [x0, z0, x1, z1] = room.bounds, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const dx = camPos ? camPos.x - cx : 1, dz = camPos ? camPos.z - cz : 1;
  const faces = { N: dz < -0.5 * Math.abs(dx), S: dz > 0.5 * Math.abs(dx), W: dx < -0.5 * Math.abs(dz), E: dx > 0.5 * Math.abs(dz) };
  for (const w of room.walls) w.mesh.visible = !(model && w.side && faces[w.side]);
}

export function camFor(view, w, h) {
  const c = new THREE.PerspectiveCamera(view.fov, w / h, 0.05, 80);
  c.position.set(view.pos[0], view.pos[2], view.pos[1]);
  c.lookAt(view.target[0], view.target[2], view.target[1]);
  return c;
}

export function topCam(room, w, h) {
  const [x0, z0, x1, z1] = room.bounds, pad = 0.3;
  const bw = x1 - x0 + 2 * pad, bh = z1 - z0 + 2 * pad, a = w / h;
  const sw = Math.max(bw, bh * a), sh = sw / a;
  const c = new THREE.OrthographicCamera(-sw / 2, sw / 2, sh / 2, -sh / 2, 0.1, 20);
  c.position.set((x0 + x1) / 2, 8, (z0 + z1) / 2); c.up.set(0, 0, -1); c.lookAt((x0 + x1) / 2, 0, (z0 + z1) / 2);
  return c;
}
