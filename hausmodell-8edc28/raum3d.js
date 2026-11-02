// 3D-Modell der Räume Haus Montabaur, Fassung 2 (31.10.2026).
// Jeder Raum ist aus eigenen Rechtecken gebaut (keine Wandstücke der Nachbarräume mehr),
// mit echten Fenstern, Türen, Stürzen, Sockelleisten und gerafften Vorhängen.
// Koordinaten: Plan-x → X (Osten), Plan-y → Z (Süden), Höhe → Y, Meter ab fertigem Fußboden.
// Plan-Meter = pt / 56,69 der Elektro-Grundrisse vom 20.08.2026. Kinderzimmer in eigenen
// Raum-Metern (Ursprung oben links), aus den Möblierungsplänen vom 22.09.2026.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const CEIL = { EG: 2.85, OG: 2.55 };   // angenommen (EG wie Küche, OG wie Bäder)
// Gesamtmodell (haus3d.js): haus = doppelte Teile weglassen (Galerie/Rutsche aus dem OG-Flur, Kamin aus dem Essbereich), tuerenOffen = Zimmertüren offen
export const OPTS = { haus: false, tuerenOffen: false };
const T = 0.16;                                // Wandstärke nach außen
const SLAB = 0.3;                              // Decke zwischen EG und OG

// Texturen ----------------------------------------------------------------------
function canvasTex(wPx, hPx, draw) {
  const c = document.createElement('canvas'); c.width = wPx; c.height = hPx;
  draw(c.getContext('2d'), wPx, hPx);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function rnd(seed) { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
const herringTex = canvasTex(512, 512, (g, w, h) => {      // Fischgrät Eiche, 1,2 m je Kachel
  g.fillStyle = '#b48a5a'; g.fillRect(0, 0, w, h);
  const r = rnd(19), L = 120, B = 30;
  for (let row = -4; row < 22; row++) for (let col = -3; col < 7; col++) for (const s of [0, 1]) {
    const x0 = col * 2 * B * 2.83 + s * B * 1.414, y0 = row * B * 1.414 * 2 + s * B * 1.414 + col * 0;
    g.save(); g.translate(x0, y0); g.rotate(s ? -Math.PI / 4 : Math.PI / 4);
    const tone = 0.86 + r() * 0.22; g.fillStyle = `rgb(${190 * tone | 0},${146 * tone | 0},${98 * tone | 0})`;
    g.fillRect(0, 0, L, B); g.strokeStyle = 'rgba(70,48,25,0.4)'; g.lineWidth = 1; g.strokeRect(0, 0, L, B);
    for (let k = 0; k < 4; k++) { g.strokeStyle = `rgba(110,75,40,${0.06 + r() * 0.08})`; g.beginPath(); const yy = 4 + r() * (B - 8); g.moveTo(2, yy); g.lineTo(L - 2, yy + r() * 3 - 1.5); g.stroke(); }
    g.restore();
  }
});
const plankTex = canvasTex(512, 512, (g, w, h) => {       // Landhausdiele hell, für die Kinderzimmer
  const r = rnd(31), B = 512 / 6;
  for (let i = 0; i < 6; i++) {
    let y = 0; const off = r() * 400;
    for (let k = 0; k < 3; k++) {
      const len = k === 0 ? off % 300 + 100 : 380; const tone = 0.9 + r() * 0.14;
      g.fillStyle = `rgb(${214 * tone | 0},${186 * tone | 0},${146 * tone | 0})`; g.fillRect(i * B, y, B, len);
      for (let s = 0; s < 9; s++) { g.strokeStyle = `rgba(120,85,45,${0.05 + r() * 0.07})`; g.beginPath(); const xx = i * B + 4 + r() * (B - 8); g.moveTo(xx, y); g.lineTo(xx + r() * 4 - 2, y + len); g.stroke(); }
      g.strokeStyle = 'rgba(90,65,35,0.45)'; g.strokeRect(i * B + 0.5, y + 0.5, B - 1, len - 1); y += len;
    }
  }
});
const turfTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#4f8a3c'; g.fillRect(0, 0, w, h);
  const r = rnd(4);
  for (let i = 0; i < 7000; i++) { g.fillStyle = r() < 0.5 ? 'rgba(30,70,20,0.35)' : 'rgba(140,190,90,0.3)'; g.fillRect(r() * w, r() * h, 1, 2 + r() * 3); }
});
const tileTex = canvasTex(256, 256, (g, w, h) => {        // Feinsteinzeug 60 × 60, Sand
  g.fillStyle = '#d6cdbf'; g.fillRect(0, 0, w, h);
  const r = rnd(7); for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '120,110,95' : '250,245,235'},0.12)`; g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  g.strokeStyle = '#b9ae9d'; g.lineWidth = 2; g.strokeRect(1, 1, w - 2, h - 2);
});
const betonTex = canvasTex(256, 256, (g, w, h) => {      // Garage: Beton geschliffen, hellgrau
  g.fillStyle = '#bdbab4'; g.fillRect(0, 0, w, h);
  const r = rnd(9); for (let i = 0; i < 3500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,88,84' : '245,243,238'},0.10)`; g.fillRect(r() * w, r() * h, 1.2 + r() * 2, 1.2 + r() * 2); }
  g.strokeStyle = 'rgba(120,116,110,0.5)'; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, h - 1);
});
const woodTex = (base, seed) => canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = rnd(seed);
  for (let i = 0; i < 120; i++) {
    const x = r() * w; g.strokeStyle = r() < 0.6 ? `rgba(90,60,30,${0.05 + r() * 0.1})` : `rgba(240,215,180,${0.05 + r() * 0.08})`;
    g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); g.moveTo(x, 0);
    for (let y = 0; y <= h; y += 32) g.lineTo(x + Math.sin(y / 70 + i) * 2, y); g.stroke();
  }
});
const linenTex = canvasTex(128, 128, (g, w, h) => {
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const r = rnd(3); for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(150,140,125,${r() * 0.12})`; g.fillRect(r() * w, r() * h, r() < 0.5 ? 6 : 1, r() < 0.5 ? 1 : 6); }
});
const ART = [
  ['#efe7da', [['#c8a37a', 170, 150, 150, 90, 0.3], ['#5f6f68', 340, 110, 120, 70, -0.4]], '#2e2a26'],
  ['#f2ece2', [['#b5653f', 150, 120, 110, 110, 0], ['#d8b56a', 330, 150, 140, 80, 0.2]], null],
  ['#e9ecef', [['#3d5a73', 256, 128, 200, 60, -0.15], ['#9fb3c0', 180, 90, 90, 40, 0.3]], null],
  ['#f4efe6', [['#8a9a7b', 130, 140, 100, 100, 0], ['#e0b25b', 300, 110, 70, 70, 0], ['#c2694a', 400, 170, 60, 60, 0]], null],
];
const artTex = ART.map(([bg, blobs, line]) => canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  for (const [c, x, y, rx, ry, rot] of blobs) { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fill(); }
  if (line) { g.fillStyle = line; g.fillRect(250, 30, 6, 200); }
}));

// Materialien --------------------------------------------------------------------
const M = {};
function mat(key, make) { return M[key] || (M[key] = make()); }
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
const MAT = {
  plaster: () => mat('plaster', () => std('#ece6dc', { roughness: 0.95 })),
  ceil: () => mat('ceil', () => std('#f4f1eb', { roughness: 1, emissive: '#2a2824', emissiveIntensity: 0.25 })),
  skirt: () => mat('skirt', () => std('#f3f0ea', { roughness: 0.5 })),
  col: (c, r = 0.6) => mat('c' + c + r, () => std(c, { roughness: r })),
  oak: () => mat('oak', () => std('#ffffff', { map: woodTex('#c9a476', 11) })),
  oakL: () => mat('oakL', () => std('#ffffff', { map: woodTex('#dcc097', 12) })),
  walnut: () => mat('walnut', () => std('#ffffff', { map: woodTex('#7a5434', 13) })),
  hemlock: () => mat('hemlock', () => std('#ffffff', { map: woodTex('#d6ad7c', 21) })),
  black: () => mat('black', () => std('#1d1c1b', { roughness: 0.5 })),
  frame: () => mat('frame', () => std('#3a3c3e', { roughness: 0.45, metalness: 0.3 })),
  white: () => mat('white', () => std('#f7f7f5', { roughness: 0.4 })),
  steel: () => mat('steel', () => std('#c9cdd0', { metalness: 0.8, roughness: 0.35 })),
  brass: () => mat('brass', () => std('#b8955a', { metalness: 0.8, roughness: 0.35 })),
  concrete: () => mat('concrete', () => std('#a8a39b', { roughness: 0.95 })),
  fabric: (c) => mat('fab' + c, () => std(c, { roughness: 1, map: linenTex })),
  curtain: () => mat('curtain', () => std('#ece4d6', { roughness: 1, transparent: true, opacity: 0.93, side: THREE.DoubleSide, map: linenTex })),
  glass: () => mat('glass', () => new THREE.MeshPhysicalMaterial({ color: '#dcebf0', transparent: true, opacity: 0.18, roughness: 0.05, side: THREE.DoubleSide, depthWrite: false })),
  mirror: () => mat('mirror', () => std('#cfd8dc', { metalness: 0.95, roughness: 0.05 })),
  glow: (c = '#fff1d0', i = 1.6) => mat('glow' + c + i, () => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i })),
  leaf: (k) => mat('leaf' + k, () => std(['#4c6b3c', '#5d7d45', '#3f5c35'][k % 3], { roughness: 0.9 })),
};

// Grundformen --------------------------------------------------------------------
function box(w, h, d, m, x, y, z, cast = true) {
  const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  me.position.set(x, y, z); me.castShadow = cast; me.receiveShadow = true; return me;
}
function boxA(g, x0, y0, z0, x1, y1, z1, m, cast = true) {      // Quader über zwei Ecken
  if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return null;
  const me = box(x1 - x0, y1 - y0, z1 - z0, m, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, cast); g.add(me); return me;
}
const tagLP = (me, o) => { if (me) me.userData.lp = { t: 'profil', ...o }; return me; };   // feste LED-Profile für den Lichtplan
function rbox(w, h, d, r, m, x, y, z) {                          // gerundeter Quader für Polster
  const me = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2) - 1e-3), m);
  me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}
function cyl(rt, rb, h, m, x, y, z, seg = 20) {
  const me = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); me.position.set(x, y, z); me.castShadow = true; me.receiveShadow = true; return me;
}
// Ein Möbel wird lokal gebaut: mittig um (0,0), Breite W entlang X, Tiefe D entlang Z, Vorderseite nach +Z.
// put() dreht es so, dass die Vorderseite in Himmelsrichtung f zeigt, und setzt es in den Plan-Rahmen x,z,w,d.
const ROT = { S: 0, N: Math.PI, E: Math.PI / 2, W: -Math.PI / 2 };
function put(g, obj, x, z, w, d, f, y = 0) {
  obj.rotation.y = ROT[f]; obj.position.set(x + w / 2, y, z + d / 2); g.add(obj); return obj;
}
const LW = (w, d, f) => (f === 'E' || f === 'W') ? [d, w] : [w, d];   // Plan-Maß → lokale Breite/Tiefe

// Möbel ---------------------------------------------------------------------------
let CAB_ID = 0;
function Cab(W, D, H, front, o = {}) {        // Schrank: Korpus, Sockel, Fronten mit 3-mm-Fugen, Griff
  // Seit 02.11. hohl mit Einteilung (Kleiderstange, Böden, Schubkästen); die Türen drehen sich, im Gesamtmodell per Klick
  const g = new THREE.Group(), y0 = o.y0 || 0, pl = o.plinth ?? (y0 > 0 ? 0 : 0.08);
  const fm = typeof front === 'string' ? MAT.col(front, 0.55) : front, body = o.body || fm;
  if (pl > 0) boxA(g, -W / 2 + 0.01, 0, -D / 2, W / 2 - 0.01, pl, D / 2 - 0.05, MAT.col('#3b3733', 0.8));
  const n = Math.max(1, Math.round(W / (o.door || 0.5))), fw = W / n, rows = o.rows || 1, fh = (H - pl) / rows;
  const hohl = rows === 1 && D >= 0.3 && H - pl >= 0.6 && o.inner !== false, cid = ++CAB_ID;
  if (hohl) innen(g, W, D, y0 + pl, y0 + H, n, fw, body, o);
  else boxA(g, -W / 2, y0 + pl, -D / 2, W / 2, y0 + H, D / 2 - 0.02, body);
  for (let i = 0; i < n; i++) for (let r = 0; r < rows; r++) {
    const x0 = -W / 2 + i * fw + 0.0015, x1 = x0 + fw - 0.003, ya = y0 + pl + r * fh + 0.0015, yb = ya + fh - 0.003;
    let T2 = g, dx = 0, dz = 0;
    if (hohl) {                                   // Paare schlagen nach außen auf
      const links = n === 1 || i % 2 === 0, hx = links ? x0 : x1;
      T2 = new THREE.Group(); T2.position.set(hx, 0, D / 2); T2.userData.door = { cab: cid, max: links ? -1.75 : 1.75, open: false }; g.add(T2); dx = hx; dz = D / 2;
    }
    const B = (a, ya_, za, b, yb_, zb, m, c) => boxA(T2, a - dx, ya_, za - dz, b - dx, yb_, zb - dz, m, c);
    B(x0, ya, D / 2 - 0.02, x1, yb, D / 2, fm);
    if (o.handle === 'bar') { const hx = (i % 2 === 0 && n > 1) ? x1 - 0.04 : x0 + 0.04; const hh = Math.min(0.3, fh * 0.3); B(hx - 0.006, Math.min(yb - 0.1, Math.max(ya + 0.05, 1.05 - hh / 2)), D / 2, hx + 0.006, Math.min(yb - 0.05, Math.max(ya + 0.05 + hh, 1.05 + hh / 2)), D / 2 + 0.025, o.hm || MAT.brass()); }
    if (o.handle === 'knob') T2.add(cyl(0.018, 0.018, 0.025, o.hm || MAT.oak(), ((i % 2 === 0 && n > 1) ? x1 - 0.05 : x0 + 0.05) - dx, rows > 1 ? yb - 0.08 : Math.min(yb - 0.1, 0.95), D / 2 + 0.012 - dz).rotateX(Math.PI / 2));
    if (o.handle === 'grip' && r === rows - 1) B(x0, yb - 0.025, D / 2 - 0.004, x1, yb - 0.005, D / 2 + 0.001, MAT.col('#2d2a26', 0.8), false);
  }
  if (o.led) boxA(g, -W / 2 + 0.05, y0 - 0.012, -D / 2 + 0.05, W / 2 - 0.05, y0 - 0.002, D / 2 - 0.1, MAT.glow('#ffd9a0', 1.2), false);
  return g;
}
// Einteilung: o.inner = 'kleid' (Stange + Hutboden + 2 Schubkästen), 'regal' (Böden alle 36 cm), 'schuh' (Böden alle 20 cm);
// ohne Angabe: hoch und mind. 50 cm tief → abwechselnd Kleid/Regal, sonst Regal
function innen(g, W, D, ya, yb, n, fw, body, o) {
  const im = MAT.col('#efe9df', 0.7), t = 0.018, zb = -D / 2, zf = D / 2 - 0.022;
  boxA(g, -W / 2, ya, zb, W / 2, yb, zb + 0.008, im);                                   // Rückwand
  boxA(g, -W / 2, ya, zb, -W / 2 + t, yb, zf, body); boxA(g, W / 2 - t, ya, zb, W / 2, yb, zf, body);   // Seiten
  boxA(g, -W / 2, ya, zb, W / 2, ya + t, zf, im); boxA(g, -W / 2, yb - t, zb, W / 2, yb, zf, body);      // Boden, Deckel
  const step = n === 1 ? 1 : 2, H = yb - ya, cols = ['#d8cfc0', '#7d8a74', '#c9a06a', '#5f7d8c', '#efe6d6', '#a9573c', '#3b3733'];
  for (let i = 0, k = 0; i < n; i += step, k++) {
    const a = -W / 2 + i * fw + (i === 0 ? t : t / 2), b = Math.min(W / 2, -W / 2 + (i + step) * fw) - (i + step >= n ? t : t / 2);
    if (i > 0) boxA(g, a - t, ya, zb, a, yb, zf, im);                                   // Mittelwand
    const art = o.inner || (H > 1.7 && D >= 0.5 ? (k % 2 === 0 ? 'kleid' : 'regal') : H > 1.7 && D < 0.45 && o.schuh ? 'schuh' : 'regal');
    if (art === 'kleid' && H > 1.5) {
      const hb = yb - 0.34; boxA(g, a, hb, zb, b, hb + t, zf, im);                      // Hutboden
      const st = cyl(0.012, 0.012, b - a - 0.01, MAT.steel(), (a + b) / 2, hb - 0.06, 0, 10); st.rotation.z = Math.PI / 2; g.add(st);
      const nG = Math.max(2, Math.floor((b - a) / 0.09));
      for (let j = 0; j < nG; j++) { const gx = a + 0.05 + j * (b - a - 0.1) / Math.max(1, nG - 1), len = 0.75 + ((j * 37) % 5) * 0.08;
        boxA(g, gx - 0.012, hb - 0.08 - len, -D / 2 + 0.08, gx + 0.012, hb - 0.08, D / 2 - 0.1, MAT.fabric(cols[(j + k) % cols.length]), false); }
      for (let j = 0; j < 2; j++) { const y = ya + 0.02 + j * 0.22; boxA(g, a + 0.01, y, zb + 0.02, b - 0.01, y + 0.2, zf - 0.01, MAT.col('#e6ddcf', 0.6)); boxA(g, (a + b) / 2 - 0.08, y + 0.15, zf - 0.012, (a + b) / 2 + 0.08, y + 0.165, zf - 0.006, MAT.steel(), false); }
    } else {
      const d = art === 'schuh' ? 0.2 : 0.36;
      for (let y = ya + d; y < yb - 0.12; y += d) {
        boxA(g, a, y, zb, b, y + t, zf - 0.01, im);
        const nS = Math.floor((b - a) / 0.28);
        for (let j = 0; j < nS; j++) if ((j + Math.round(y * 7) + k) % 3 !== 0) {     // gefaltete Stapel bzw. Schuhpaare
          const sx = a + 0.03 + j * 0.28, hh = art === 'schuh' ? 0.1 : 0.08 + ((j + k) % 3) * 0.05;
          boxA(g, sx, y + t, -D / 2 + 0.06, sx + 0.22, y + t + hh, Math.min(D / 2 - 0.08, -D / 2 + 0.06 + (art === 'schuh' ? 0.28 : 0.3)), MAT.fabric(cols[(j * 3 + k) % cols.length]), false);
        }
      }
    }
  }
}
function books(g, x0, x1, y, z0, z1, seed) {            // Bücherreihe entlang X, auf Höhe y, Tiefe z0..z1
  const r = rnd(seed), cols = ['#8c3b2f', '#2f4858', '#d9c7a7', '#556b2f', '#b5835a', '#1f1f1f', '#e8e2d6', '#6d4c7d'];
  let x = x0;
  while (x < x1 - 0.03) {
    if (r() < 0.12) { x += 0.08 + r() * 0.12; continue; }
    const t = 0.02 + r() * 0.035, h = 0.18 + r() * 0.12, dd = (z1 - z0) * (0.7 + r() * 0.25);
    if (x + t > x1) break;
    boxA(g, x, y, z1 - dd, x + t, y + h, z1, MAT.col(cols[(r() * cols.length) | 0], 0.8)); x += t + 0.002;
  }
}
function Shelf(W, D, H, n, m, seed = 5, o = {}) {        // offenes Regal mit Büchern und Deko
  const g = new THREE.Group(), y0 = o.y0 || 0, t = 0.025;
  boxA(g, -W / 2, y0, -D / 2, W / 2, y0 + H, -D / 2 + 0.015, m);
  for (const sx of [-W / 2, W / 2 - t]) boxA(g, sx, y0, -D / 2, sx + t, y0 + H, D / 2, m);
  for (let i = 0; i <= n; i++) {
    const y = y0 + (H - t) * i / n; boxA(g, -W / 2, y, -D / 2, W / 2, y + t, D / 2, m);
    if (i < n) {
      const r = rnd(seed + i);
      if (r() < 0.75) books(g, -W / 2 + t + 0.02, W / 2 - t - 0.2 - r() * 0.2, y + t, -D / 2 + 0.02, D / 2 - 0.03, seed * 7 + i);
      if (r() < 0.6) g.add(vase(W / 2 - t - 0.12, y + t, 0, 0.05 + r() * 0.03, 0.12 + r() * 0.12, ['#e9e2d6', '#3b3733', '#a9573c'][i % 3]));
    }
  }
  if (o.led) for (let i = 1; i <= n; i++) boxA(g, -W / 2 + t, y0 + (H - t) * i / n - 0.006, D / 2 - 0.05, W / 2 - t, y0 + (H - t) * i / n, D / 2 - 0.03, MAT.glow('#ffd9a0', 1.4), false);
  return g;
}
function vase(x, y, z, r, h, c) {
  const pts = [[0, 0], [r * 0.8, 0], [r, h * 0.3], [r * 0.9, h * 0.7], [r * 0.45, h * 0.92], [r * 0.5, h]].map(([a, b]) => new THREE.Vector2(a, b));
  const me = new THREE.Mesh(new THREE.LatheGeometry(pts, 20), MAT.col(c, 0.5)); me.position.set(x, y, z); me.castShadow = true; return me;
}
function Plant(h = 1.2, pot = '#d8cfc2', seed = 1) {     // Kübelpflanze: Topf, Stämmchen, Blätter
  const g = new THREE.Group(), r = rnd(seed), pr = 0.17 + h * 0.04;
  g.add(cyl(pr, pr * 0.8, 0.38, MAT.col(pot, 0.8), 0, 0.19, 0, 24));
  g.add(cyl(pr * 0.95, pr * 0.95, 0.02, MAT.col('#3b2c22', 1), 0, 0.37, 0));
  for (let i = 0; i < 3; i++) { const a = r() * 6.28; const s = cyl(0.012, 0.016, h * 0.6, MAT.col('#5a4632', 0.9), Math.cos(a) * 0.03, 0.38 + h * 0.3, Math.sin(a) * 0.03, 6); s.rotation.z = (r() - 0.5) * 0.3; g.add(s); }
  for (let i = 0; i < 26; i++) {
    const a = r() * 6.28, rr = (0.1 + r() * 0.3) * (0.6 + h * 0.3), y = 0.45 + h * (0.35 + r() * 0.62);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.06 + r() * 0.07 + h * 0.03, 8, 6), MAT.leaf(i));
    l.scale.set(1.6, 0.35, 1); l.rotation.set(r() * 0.8, a, r() * 0.8); l.position.set(Math.cos(a) * rr, y, Math.sin(a) * rr); l.castShadow = true; g.add(l);
  }
  return g;
}
function Rug(W, D, c, border) {
  const g = new THREE.Group();
  g.add(rbox(W, 0.014, D, 0.006, MAT.fabric(c), 0, 0.007, 0));
  if (border) for (const s of [-1, 1]) { g.add(box(W - 0.1, 0.002, 0.03, MAT.fabric(border), 0, 0.0145, s * (D / 2 - 0.08), false)); g.add(box(0.03, 0.002, D - 0.1, MAT.fabric(border), s * (W / 2 - 0.08), 0.0145, 0, false)); }
  return g;
}
function Desk(W, D, top, leg, o = {}) {
  const g = new THREE.Group(), h = o.h || 0.75;
  boxA(g, -W / 2, h - 0.03, -D / 2, W / 2, h, D / 2, top);
  if (o.wall) boxA(g, -W / 2, h - 0.2, -D / 2, W / 2, h - 0.03, -D / 2 + 0.3, top);     // Wandtisch mit Schubkasten
  else for (const sx of [-1, 1]) { boxA(g, sx * W / 2 - (sx > 0 ? 0.04 : 0), 0, -D / 2 + 0.04, sx * W / 2 + (sx < 0 ? 0.04 : 0), h - 0.03, D / 2 - 0.04, leg); }
  if (o.monitor) { boxA(g, -0.3, h + 0.18, -D / 2 + 0.12, 0.3, h + 0.53, -D / 2 + 0.14, MAT.black()); boxA(g, -0.29, h + 0.19, -D / 2 + 0.141, 0.29, h + 0.52, -D / 2 + 0.143, MAT.col('#26313a', 0.2)); boxA(g, -0.02, h, -D / 2 + 0.1, 0.02, h + 0.2, -D / 2 + 0.13, MAT.steel()); boxA(g, -0.1, h, -D / 2 + 0.06, 0.1, h + 0.008, -D / 2 + 0.2, MAT.steel()); boxA(g, -0.22, h, 0.05, 0.22, h + 0.012, 0.19, MAT.col('#2b2b2b', 0.6)); }
  if (o.laptop) { boxA(g, -0.17, h, -0.05, 0.17, h + 0.012, 0.18, MAT.col('#b9bcc0', 0.35)); const s = box(0.34, 0.22, 0.008, MAT.col('#2a2d31', 0.3), 0, h + 0.11, -0.06); s.rotation.x = -0.25; g.add(s); }
  if (o.lamp) g.add(TableLamp(o.lamp, W / 2 - 0.15, h, -D / 2 + 0.15));
  return g;
}
function LiftDesk(W, D, top) {                  // höhenverstellbarer Schreibtisch: zwei Hubsäulen, Fußausleger, Bedienteil
  const g = new THREE.Group(), h = 0.75, b = MAT.black();
  boxA(g, -W / 2, h - 0.03, -D / 2, W / 2, h, D / 2, top);
  for (const sx of [-1, 1]) { const x = sx * (W / 2 - 0.12); boxA(g, x - 0.04, 0.04, -0.04, x + 0.04, h - 0.06, 0.04, b); boxA(g, x - 0.035, 0, -D / 2 + 0.06, x + 0.035, 0.04, D / 2 - 0.06, b); boxA(g, x - 0.03, h - 0.06, -D / 2 + 0.05, x + 0.03, h - 0.03, D / 2 - 0.05, b); }
  boxA(g, -W / 2 + 0.12, h - 0.1, -0.03, W / 2 - 0.12, h - 0.05, 0.03, b);
  boxA(g, W / 2 - 0.3, h - 0.045, D / 2 - 0.02, W / 2 - 0.15, h - 0.01, D / 2 + 0.01, MAT.col('#2b2b2b', 0.4));
  // Monitor am Schwenkarm, Tastatur
  boxA(g, -0.3, h + 0.2, -D / 2 + 0.16, 0.3, h + 0.55, -D / 2 + 0.18, b); boxA(g, -0.29, h + 0.21, -D / 2 + 0.181, 0.29, h + 0.54, -D / 2 + 0.183, MAT.col('#26313a', 0.2));
  boxA(g, -0.02, h, -D / 2 + 0.04, 0.02, h + 0.38, -D / 2 + 0.08, MAT.steel()); boxA(g, -0.02, h + 0.34, -D / 2 + 0.06, 0.02, h + 0.38, -D / 2 + 0.17, MAT.steel());
  boxA(g, -0.22, h, 0.05, 0.22, h + 0.012, 0.19, MAT.col('#2b2b2b', 0.6));
  g.add(TableLamp('#1d1c1b', W / 2 - 0.15, h, -D / 2 + 0.15));
  return g;
}
function TableLamp(c, x, y, z) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.userData.lp = { t: 'tisch' };
  g.add(cyl(0.06, 0.07, 0.03, MAT.col(c, 0.5), 0, 0.015, 0)); g.add(cyl(0.008, 0.008, 0.3, MAT.brass(), 0, 0.18, 0, 8));
  const sh = cyl(0.09, 0.13, 0.15, MAT.fabric('#efe6d6'), 0, 0.38, 0, 24); sh.material = new THREE.MeshStandardMaterial({ color: '#f3e7cf', emissive: '#ffcf86', emissiveIntensity: 0.55, side: THREE.DoubleSide }); g.add(sh);
  return g;
}
function OfficeChair(c) {                       // Drehstuhl, Sitzfläche vorne nach +Z
  const g = new THREE.Group(), m = MAT.fabric(c), b = MAT.black();
  g.add(rbox(0.5, 0.08, 0.48, 0.03, m, 0, 0.48, 0.02));
  const back = rbox(0.46, 0.55, 0.07, 0.03, m, 0, 0.84, -0.23); back.rotation.x = -0.08; g.add(back);
  for (const s of [-1, 1]) { boxA(g, s * 0.26 - 0.02, 0.5, -0.16, s * 0.26 + 0.02, 0.68, 0.12, b); boxA(g, s * 0.26 - 0.03, 0.68, -0.14, s * 0.26 + 0.03, 0.7, 0.14, b); }
  g.add(cyl(0.025, 0.025, 0.36, MAT.steel(), 0, 0.27, 0, 10));
  for (let i = 0; i < 5; i++) { const a = i * 1.2566; const arm = box(0.3, 0.025, 0.04, b, Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15); arm.rotation.y = -a; g.add(arm); g.add(cyl(0.025, 0.025, 0.03, b, Math.cos(a) * 0.3, 0.03, Math.sin(a) * 0.3, 8)); }
  return g;
}
function DiningChair(c, wood) {
  const g = new THREE.Group(), m = wood || MAT.oak();
  for (const [a, b] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) boxA(g, a - 0.015, 0, b - 0.015, a + 0.015, 0.45, b + 0.015, m);
  g.add(rbox(0.46, 0.05, 0.46, 0.02, MAT.fabric(c), 0, 0.47, 0));
  boxA(g, -0.2, 0.45, -0.22, -0.17, 0.82, -0.19, m); boxA(g, 0.17, 0.45, -0.22, 0.2, 0.82, -0.19, m);
  const b = rbox(0.42, 0.18, 0.03, 0.012, m, 0, 0.74, -0.21); b.rotation.x = -0.1; g.add(b);
  return g;
}
function Sofa(W, D, c, o = {}) {                 // Polstersofa mit Rücken (−Z), Armlehnen, Kissen und Füßen
  const g = new THREE.Group(), m = MAT.fabric(c), dark = MAT.fabric(o.dark || shade(c, 0.85));
  const armL = o.armL ?? true, armR = o.armR ?? true, aw = 0.17, bd = 0.22;
  for (const [a, b] of [[-W / 2 + 0.06, -D / 2 + 0.06], [W / 2 - 0.06, -D / 2 + 0.06], [-W / 2 + 0.06, D / 2 - 0.06], [W / 2 - 0.06, D / 2 - 0.06]]) g.add(cyl(0.018, 0.014, 0.1, o.legs || MAT.oak(), a, 0.05, b, 10));
  g.add(rbox(W, 0.22, D, 0.03, dark, 0, 0.21, 0));
  g.add(rbox(W, 0.5, bd, 0.06, m, 0, 0.55, -D / 2 + bd / 2));
  const x0 = -W / 2 + (armL ? aw : 0), x1 = W / 2 - (armR ? aw : 0);
  if (armL) g.add(rbox(aw, 0.36, D, 0.06, m, -W / 2 + aw / 2, 0.46, 0));
  if (armR) g.add(rbox(aw, 0.36, D, 0.06, m, W / 2 - aw / 2, 0.46, 0));
  const n = Math.max(1, Math.round((x1 - x0) / (o.seat || 0.75))), sw = (x1 - x0) / n;
  for (let i = 0; i < n; i++) {
    const cx = x0 + sw * (i + 0.5);
    g.add(rbox(sw - 0.012, 0.15, D - bd - 0.02, 0.05, m, cx, 0.395, bd / 2 + 0.005));
    const bc = rbox(sw - 0.03, 0.42, 0.16, 0.07, m, cx, 0.7, -D / 2 + bd + 0.06); bc.rotation.x = -0.14; g.add(bc);
  }
  const pc = o.pillows || [];
  pc.forEach((pcol, i) => { const side = i % 2 ? 1 : -1, px = side * ((x1 - x0) / 2 - 0.25) + (x0 + x1) / 2; const p = rbox(0.44, 0.42, 0.13, 0.06, MAT.fabric(pcol), px - side * 0.05 * (i >> 1) * 4, 0.66, -D / 2 + bd + 0.2 + (i >> 1) * 0.04); p.rotation.set(-0.25, side * 0.25, side * 0.12); g.add(p); });
  if (o.throw) { const t = rbox(0.5, 0.03, D - bd + 0.05, 0.012, MAT.fabric(o.throw), x1 - 0.35, 0.48, bd / 2); g.add(t); }
  return g;
}
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }
function Armchair(W, D, c, legs) { return Sofa(W, D, c, { seat: W, legs, pillows: [] }); }
function Bed(W, D, o = {}) {                    // Bett: Kopfteil bei −Z, Fußende +Z; W = Breite, D = Länge
  const g = new THREE.Group(), fr = MAT.fabric(o.frame || '#c9bca8'), hbH = o.hbH || 1.1, hbW = o.hbW || W + 0.1;
  boxA(g, -W / 2 + 0.08, 0, -D / 2 + 0.08, W / 2 - 0.08, 0.06, D / 2 - 0.08, MAT.col('#2d2a26', 0.9));
  g.add(rbox(W, 0.28, D, 0.04, fr, 0, 0.2, 0));
  g.add(rbox(W - 0.06, 0.2, D - 0.08, 0.06, MAT.fabric('#f6f3ee'), 0, 0.44, 0.02));
  g.add(rbox(W + 0.02, 0.09, D * 0.68, 0.04, MAT.fabric(o.duvet || '#ebe5da'), 0, 0.56, D / 2 - D * 0.34 + 0.01));
  g.add(rbox(W + 0.06, 0.03, 0.55, 0.012, MAT.fabric(o.throw || '#a9846a'), 0, 0.615, D / 2 - 0.36));
  const np = W > 1.2 ? 2 : 1;
  for (let i = 0; i < np; i++) { const px = np === 1 ? 0 : (i ? 1 : -1) * W / 4; const p = rbox(np === 1 ? 0.7 : W / 2 - 0.08, 0.14, 0.4, 0.06, MAT.fabric('#ffffff'), px, 0.6, -D / 2 + 0.3); p.rotation.x = 0.35; g.add(p);
    if (o.cushion) { const c = rbox(0.4, 0.3, 0.1, 0.05, MAT.fabric(o.cushion), px * 0.8, 0.7, -D / 2 + 0.5); c.rotation.x = -0.3; g.add(c); } }
  g.add(rbox(hbW, hbH, 0.1, 0.04, MAT.fabric(o.head || o.frame || '#c9bca8'), 0, hbH / 2 + 0.06, -D / 2 - 0.05));
  if (o.quilted) for (let i = 1; i < Math.round(hbW / 0.3); i++) boxA(g, -hbW / 2 + i * hbW / Math.round(hbW / 0.3) - 0.004, 0.12, -D / 2 - 0.002, -hbW / 2 + i * hbW / Math.round(hbW / 0.3) + 0.004, hbH, -D / 2 + 0.002, MAT.fabric(shade(o.head || o.frame || '#c9bca8', 0.8)), false);
  return g;
}
function Nightstand(W, D, front, o = {}) {
  const g = Cab(W, D, o.h || 0.32, front, { y0: o.y0 ?? 0.3, door: W, handle: 'grip', led: o.led });
  if (o.lamp) g.add(TableLamp(o.lamp, -W / 2 + 0.15, (o.y0 ?? 0.3) + (o.h || 0.32), 0));
  if (o.books) books(g, 0.0, W / 2 - 0.04, (o.y0 ?? 0.3) + (o.h || 0.32), -0.08, 0.06, 77);
  return g;
}
function Beanbag(r, c) {
  const g = new THREE.Group(), s = new THREE.Mesh(new THREE.SphereGeometry(r, 28, 18), MAT.fabric(c));
  s.scale.set(1, 0.62, 1); s.position.y = r * 0.55; s.castShadow = true; g.add(s);
  const d = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 20, 12), MAT.fabric(shade(c, 0.9))); d.scale.set(1, 0.35, 1); d.position.set(0, r * 0.92, -r * 0.15); g.add(d);
  return g;
}
function TV(W) {                                 // Fernseher, schmal, Bildfläche nach +Z
  const g = new THREE.Group(), H = W * 0.5625;
  boxA(g, -W / 2, -H / 2, -0.03, W / 2, H / 2, 0, MAT.black());
  boxA(g, -W / 2 + 0.01, -H / 2 + 0.01, 0.0005, W / 2 - 0.01, H / 2 - 0.01, 0.002, MAT.col('#1f2a33', 0.15), false);
  return g;
}
function Lamellas(W, H, m, o = {}) {             // Akustik-Lamellen auf Filz: echte Leisten, 2,7 cm Raster
  const g = new THREE.Group();
  boxA(g, -W / 2, 0, -0.02, W / 2, H, -0.008, MAT.col('#2b2622', 1));
  const n = Math.floor(W / 0.027);
  for (let i = 0; i < n; i++) { const x = -W / 2 + 0.0035 + i * 0.027; boxA(g, x, 0, -0.008, x + 0.02, H, 0.012, m || MAT.oak(), false); }
  if (o.led) boxA(g, -W / 2, H - 0.01, 0.012, W / 2, H, 0.03, MAT.glow('#ffd9a0', 1.4), false);
  return g;
}
function Picture(W, H, i, frameM) {
  const g = new THREE.Group();
  boxA(g, -W / 2, -H / 2, -0.03, W / 2, H / 2, 0, frameM || MAT.col('#2d2a26', 0.6));
  const p = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, H - 0.08), std('#ffffff', { map: artTex[i % artTex.length], roughness: 0.9 })); p.position.z = 0.002; g.add(p);
  return g;
}
function FloorLamp(c = '#1d1c1b') {               // Bogenleuchte mit Marmorfuß
  const g = new THREE.Group(); g.userData.lp = { t: 'steh' };
  g.add(cyl(0.16, 0.18, 0.06, MAT.col('#e8e3db', 0.3), 0, 0.03, 0, 24));
  const curve = new THREE.CatmullRomCurve3([[0, 0.06, 0], [0, 1.2, 0], [0.15, 1.85, 0], [0.55, 2.0, 0], [0.85, 1.85, 0]].map(p => new THREE.Vector3(...p)));
  const arc = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.012, 8), MAT.col(c, 0.4)); arc.castShadow = true; g.add(arc);
  const sh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 10, 0, 6.29, 0, 1.4), new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide, roughness: 0.4 })); sh.position.set(0.85, 1.72, 0); g.add(sh);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), MAT.glow('#fff1d0', 2)); bulb.position.set(0.85, 1.7, 0); g.add(bulb);
  return g;
}
function Pendant(g, x, z, C, kind, L, o = {}) {   // Leuchten von der Decke
  const drop = o.drop || 0.75, y = C - drop, mk = o.color || '#1d1c1b';
  g.add(box(0.008, drop - 0.1, 0.008, MAT.black(), x, C - (drop - 0.1) / 2, z, false));
  const cp = cyl(0.05, 0.05, 0.02, MAT.white(), x, C - 0.01, z); cp.userData.lp = { t: 'pendel', kind, drop, len: o.len }; g.add(cp);
  if (kind === 'globe') { const s = new THREE.Mesh(new THREE.SphereGeometry(o.r || 0.17, 24, 14), MAT.glow('#fff4dc', 1.1)); s.position.set(x, y, z); g.add(s); }
  else if (kind === 'dome') { const s = new THREE.Mesh(new THREE.SphereGeometry(o.r || 0.2, 24, 12, 0, 6.29, 0, 1.45), new THREE.MeshStandardMaterial({ color: mk, side: THREE.DoubleSide, roughness: 0.45 })); s.position.set(x, y + 0.05, z); s.castShadow = true; g.add(s); const b = new THREE.Mesh(new THREE.CircleGeometry((o.r || 0.2) * 0.9, 24), MAT.glow('#ffe8c0', 1.6)); b.rotation.x = Math.PI / 2; b.position.set(x, y + 0.03, z); g.add(b); }
  else if (kind === 'drum') { const s = cyl(o.r || 0.35, o.r || 0.35, 0.28, new THREE.MeshStandardMaterial({ color: '#efe6d6', emissive: '#ffd59a', emissiveIntensity: 0.5, side: THREE.DoubleSide, map: linenTex }), x, y, z, 32); s.material.side = THREE.DoubleSide; g.add(s); const b = new THREE.Mesh(new THREE.CircleGeometry((o.r || 0.35) * 0.98, 32), MAT.glow('#fff1d0', 1.4)); b.rotation.x = Math.PI / 2; b.position.set(x, y - 0.12, z); g.add(b); }
  else if (kind === 'linear') { const len = o.len || 1.6; g.add(box(len, 0.04, 0.06, MAT.black(), x, y, z)); g.add(box(len - 0.04, 0.005, 0.04, MAT.glow('#fff1d0', 1.8), x, y - 0.022, z, false)); g.add(box(0.008, drop - 0.1, 0.008, MAT.black(), x + len / 2 - 0.1, C - (drop - 0.1) / 2, z, false)); }
  if (L && L.n < 5) { const p = new THREE.PointLight('#ffe2b8', o.strong ? 3 : 1.5, 6, 2); p.position.set(x, y - 0.15, z); g.add(p); L.n++; }
}
function Sconce(g, side, line, at, y, o = {}) {   // Wandleuchte: Licht nach oben und unten
  const f = { N: 'S', S: 'N', W: 'E', E: 'W' }[side], along = side === 'N' || side === 'S', w = o.w || 0.1;
  const s = new THREE.Group(); s.userData.lp = { t: 'wand', side };
  boxA(s, -w / 2, -0.12, 0, w / 2, 0.12, 0.09, MAT.col(o.c || '#2d2a26', 0.4));
  boxA(s, -w / 2 + 0.01, 0.12, 0.01, w / 2 - 0.01, 0.125, 0.08, MAT.glow('#ffe2b0', 2)); boxA(s, -w / 2 + 0.01, -0.125, 0.01, w / 2 - 0.01, -0.12, 0.08, MAT.glow('#ffe2b0', 2));
  const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: '#ffe2b0', transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.set(0, 0.37, 0.03); cone.rotation.x = Math.PI; s.add(cone); const c2 = cone.clone(); c2.position.y = -0.37; c2.rotation.x = 0; s.add(c2);
  put(g, s, along ? at : line, along ? line : at, 0, 0, f, y);
}
const ribTex = canvasTex(64, 64, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#2f2d2b' : '#4a4643'; g.fillRect(0, i * 8, w, 8); } });
function Doormat(g, x0, z0, x1, z1) {               // eingelassene Sauberlaufmatte, bündig im Boden, Alurahmen
  const t = std('#ffffff', { map: ribTex.clone(), roughness: 1 }); t.map.repeat.set(1, (z1 - z0) / 0.06); t.map.needsUpdate = true;
  boxA(g, x0, 0, z0, x1, 0.003, z1, MAT.steel(), false); boxA(g, x0 + 0.02, 0, z0 + 0.02, x1 - 0.02, 0.004, z1 - 0.02, t, false);
}
function Spot(g, x, z, C) {                       // Einbaustrahler
  g.add(cyl(0.045, 0.045, 0.004, MAT.col('#d9d4cc', 0.5), x, C - 0.002, z, 16));
  const d = new THREE.Mesh(new THREE.CircleGeometry(0.03, 16), MAT.glow('#fff4dc', 2.2)); d.rotation.x = Math.PI / 2; d.position.set(x, C - 0.005, z); d.userData.lp = { t: 'spot' }; g.add(d);
}
// Vorhang: Schiene in einer Schattenfuge in der Decke, Stoff in Falten an beiden Enden zusammengeschoben.
function Curtain(g, side, a0, a1, line, C, o = {}) {
  const along = side === 'N' || side === 'S', off = (side === 'N' || side === 'W') ? 0.09 : -0.09, L = line + off;
  const fuge = MAT.col('#4a4640', 1);
  if (along) g.add(box(a1 - a0 + 0.1, 0.004, 0.05, fuge, (a0 + a1) / 2, C - 0.001, L, false));
  else g.add(box(0.05, 0.004, a1 - a0 + 0.1, fuge, L, C - 0.001, (a0 + a1) / 2, false));
  const pw = o.closed ? (a1 - a0) / 2 : Math.min(0.55, Math.max(0.28, (a1 - a0) * 0.13)), H = C - 0.025;
  for (const [s0, s1] of [[a0 - 0.05, a0 - 0.05 + pw], [a1 + 0.05 - pw, a1 + 0.05]]) {
    const n = Math.max(6, Math.round((s1 - s0) / 0.06)), geo = new THREE.PlaneGeometry(1, H, n * 2, 1), pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) { const u = pos.getX(i) + 0.5; pos.setX(i, s0 + u * (s1 - s0)); pos.setZ(i, Math.sin(u * n * Math.PI) * 0.045); }
    geo.computeVertexNormals();
    const me = new THREE.Mesh(geo, MAT.curtain()); me.castShadow = true; me.receiveShadow = true;
    if (along) me.position.set(0, H / 2 + 0.012, L); else { me.rotation.y = Math.PI / 2; me.position.set(L, H / 2 + 0.012, 0); geo.scale(-1, 1, 1); }
    g.add(me);
  }
}
function helixSlide(g, cx, cz, top, y0 = 0) {      // Röhrenrutsche Ø 80: Einstiegsmulde an der Galeriekante, 270° Wendel, offener Auslauf nach Westen
  // 02.11.: Einstieg beginnt bündig an der Galeriekante (z 14,60) als offene Mulde, kein Tor, keine Stangen zur Decke;
  // Auslauf als geneigte Halbschale mit Endwulst auf zwei Stützen, Matte davor
  const G = new THREE.Group(); G.userData.keep = true; g.add(G); g = G;
  const r = 0.8, yT = y0 + top, ex = cx - 1.2, ez = cz - 0.62, zE0 = 14.60, zE1 = 14.98;
  const pts = [new THREE.Vector3(ex, yT, zE1), new THREE.Vector3(ex + 0.12, yT - 0.05, zE1 + 0.16)];
  for (let i = 1; i <= 60; i++) { const t = i / 60, th = Math.PI - t * 1.5 * Math.PI; pts.push(new THREE.Vector3(cx + r * Math.cos(th), yT - 0.1 - t * (top - 0.1 - 0.7), cz + r * Math.sin(th))); }
  pts.push(new THREE.Vector3(cx - 0.6, y0 + 0.6, ez), new THREE.Vector3(ex, y0 + 0.52, ez));
  const curve = new THREE.CatmullRomCurve3(pts), tm = new THREE.MeshStandardMaterial({ color: '#d9dcdf', metalness: 0.6, roughness: 0.28, side: THREE.DoubleSide });
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 240, 0.41, 28, false), tm); tube.castShadow = true; g.add(tube);
  for (let i = 3; i < 64; i += 7) { const p = curve.getPoint(i / 64); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.415, 0.012, 6, 28), MAT.steel()); ring.position.copy(p); ring.lookAt(curve.getPoint(i / 64 + 0.01)); g.add(ring); }
  for (const u of [0, 1]) { const p = curve.getPoint(u), q = curve.getPoint(u ? 0.995 : 0.005); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.035, 10, 32), MAT.col('#e8730c', 0.5)); ring.position.copy(p); ring.lookAt(q); g.add(ring); }
  const half = (rIn, rOut) => { const s = new THREE.Shape(); s.absarc(0, 0, rOut, Math.PI, 2 * Math.PI, false); s.absarc(0, 0, rIn, 2 * Math.PI, Math.PI, true); return s; };
  // Einstiegsmulde: offene Halbschale von der Galeriekante bis zur Röhre, Oberkante bündig mit dem Galerieboden
  const mu = new THREE.Mesh(new THREE.ExtrudeGeometry(half(0.395, 0.42), { depth: zE1 - zE0, bevelEnabled: false, curveSegments: 24 }), tm);
  mu.position.set(ex, yT, zE0); g.add(mu);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.03, 8, 24, Math.PI), MAT.col('#e8730c', 0.5)); lip.rotation.z = Math.PI; lip.position.set(ex, yT, zE0 + 0.01); g.add(lip);
  // Auslauf: Halbschale 1,3 m, fällt von 0,52 auf 0,36 m, Endwulst, zwei Stützen, Matte
  const L = 1.3, drop = 0.16, ang = Math.atan2(drop, L), au = new THREE.Group(); au.position.set(ex, y0 + 0.52, ez); au.rotation.z = ang; g.add(au);
  const sh = new THREE.Mesh(new THREE.ExtrudeGeometry(half(0.395, 0.42), { depth: L, bevelEnabled: false, curveSegments: 24 }), tm); sh.rotation.y = -Math.PI / 2; au.add(sh); sh.castShadow = true;
  const endw = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.03, 8, 24, Math.PI), MAT.col('#e8730c', 0.5)); endw.rotation.set(0, Math.PI / 2, Math.PI); endw.position.set(-L, 0, 0); au.add(endw);
  for (const d of [0.25, L - 0.2]) { const xx = ex - d * Math.cos(ang), yy = y0 + 0.52 - d * Math.sin(ang) - 0.42;
    boxA(g, xx - 0.03, y0, ez - 0.32, xx + 0.03, yy, ez - 0.26, MAT.steel()); boxA(g, xx - 0.03, y0, ez + 0.26, xx + 0.03, yy, ez + 0.32, MAT.steel()); boxA(g, xx - 0.03, yy - 0.04, ez - 0.32, xx + 0.03, yy, ez + 0.32, MAT.steel()); }
  g.add(cyl(0.06, 0.06, top - 0.45, MAT.steel(), cx, y0 + (top - 0.45) / 2, cz, 12));                // Mittelsäule bis unter die oberste Windung
  g.add(rbox(1.3, 0.06, 1.1, 0.03, MAT.fabric('#3b6fa0'), ex - L - 0.7, y0 + 0.03, ez));
}
// Galerie im OG zwischen Treppenloch und Luftraum (EG-Blattmaße, y = Oberkante Rohdecke): Deckenkanten, Glasgeländer,
// Lücke für den Rutscheneinstieg mit zwei Haltegriffen; gemeinsam für Essbereich (EG) und OG-Flur
function galerie(g, C) {
  const y = C + SLAB, pm = MAT.col('#e9e2d6', 0.95);
  boxA(g, 21.85, C, 14.45, 26.43, y, 14.6, pm); boxA(g, 21.7, C, 14.45, 21.85, y, 16.57, pm); boxA(g, 21.85, C, 12.3, 24.1, y, 12.45, pm);
  const rail = (x0, z0, x1, z1) => { boxA(g, x0, y, z0, x1, y + 1.0, z1, MAT.glass(), false); boxA(g, x0 - 0.02, y + 1.0, z0 - 0.02, x1 + 0.02, y + 1.04, z1 + 0.02, MAT.oak()); };
  rail(21.85, 14.44, 22.85, 14.46); rail(23.75, 14.44, 26.43, 14.46); rail(21.68, 14.45, 21.7, 16.57); rail(21.9, 12.44, 22.95, 12.46);
  for (const x of [22.85, 23.75]) { boxA(g, x - 0.025, y, 14.43, x + 0.025, y + 1.1, 14.48, MAT.steel()); g.add(cyl(0.03, 0.03, 0.04, MAT.col('#e8730c', 0.5), x, y + 1.12, 14.455, 12)); }
  helixSlide(g, 24.55, 15.2, C + SLAB + 0.41);
}
// Raumhülle: Böden, Decken, Wände mit Öffnungen -------------------------------------
// S = { rects, open: [{s, a:[von,bis], t, sill, head, at}], voids, tall, floor, solids }
// t: 'win' Fenster, 'ftc' bodentief, 'door' Tür, 'front' Haustür, 'gdoor' Glastür, 'open' Durchgang, 'none' ohne alles
function shell(g, S, C, built) {
  const inside = (x, z) => S.rects.some(r => x > r[0] && x < r[2] && z > r[1] && z < r[3]);
  const xs = new Set(), zs = new Set();
  for (const r of [...S.rects, ...(S.voids || [])]) { xs.add(+r[0].toFixed(3)); xs.add(+r[2].toFixed(3)); zs.add(+r[1].toFixed(3)); zs.add(+r[3].toFixed(3)); }
  const X = [...xs].sort((a, b) => a - b), Z = [...zs].sort((a, b) => a - b);
  const inVoid = (x, z) => (S.voids || []).some(v => x > v[0] && x < v[2] && z > v[1] && z < v[3]);
  const fm = S.floor === 'beton' ? betonTex : S.floor === 'turf' ? turfTex : S.floor === 'tile' ? tileTex : S.floor === 'plank' ? plankTex : herringTex;
  const floorMat = std('#ffffff', { map: fm, roughness: S.floor === 'tile' ? 0.4 : 0.7 }), fs = S.floor === 'beton' ? 3.0 : S.floor === 'tile' ? 0.6 : S.floor === 'turf' ? 1 : S.floor === 'plank' ? 1.6 : 1.2;
  const runs = {};
  for (let i = 0; i < X.length - 1; i++) for (let j = 0; j < Z.length - 1; j++) {
    const x0 = X[i], x1 = X[i + 1], z0 = Z[j], z1 = Z[j + 1], mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
    if (!inside(mx, mz)) continue;
    const vo = inVoid(mx, mz);
    if (!(vo && S.fl === 'OG')) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), floorMat); f.rotation.x = -Math.PI / 2; f.position.set(mx, 0, mz); f.receiveShadow = true;
      const uv = f.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, (x0 + uv.getX(k) * (x1 - x0)) / fs, -(z0 + (1 - uv.getY(k)) * (z1 - z0)) / fs);
      g.add(f);
    }
    const cH = vo && S.fl === 'EG' ? C + SLAB + CEIL.OG : C;
    const c = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), MAT.ceil()); c.rotation.x = Math.PI / 2; c.position.set(mx, cH, mz); g.add(c); built.ceilings.push(c);
    const ec = (key, a, b) => (runs[key] = runs[key] || []).push([a, b]);
    if (!inside(mx, z0 - 0.01)) ec(`N|${z0}`, x0, x1);
    if (!inside(mx, z1 + 0.01)) ec(`S|${z1}`, x0, x1);
    if (!inside(x0 - 0.01, mz)) ec(`W|${x0}`, z0, z1);
    if (!inside(x1 + 0.01, mz)) ec(`E|${x1}`, z0, z1);
  }
  for (const key in runs) {
    const [side, ls] = key.split('|'), line = +ls, segs = runs[key].sort((a, b) => a[0] - b[0]), merged = [];
    for (const s of segs) { const m = merged[merged.length - 1]; if (m && Math.abs(m[1] - s[0]) < 1e-6) m[1] = s[1]; else merged.push([...s]); }
    for (const [a0, a1] of merged) wallRun(g, S, side, line, a0, a1, C, built);
  }
  for (const s of S.solids || []) boxA(g, s[0], 0, s[1], s[2], C, s[3], MAT.col(S.paint || '#ece6dc', 0.95));
}
function wallRun(g, S, side, line, a0, a1, C, built) {
  const along = side === 'N' || side === 'S', out = (side === 'N' || side === 'W') ? -1 : 1;
  const grp = new THREE.Group(); g.add(grp);
  const ac = (S.wacc || []).find(q => q.s === side && Math.abs(q.at - line) < 0.12 && (!q.a || (a1 > q.a[0] + 0.01 && a0 < q.a[1] - 0.01)));
  const pm = MAT.col(ac ? ac.c : (S.paint || '#ece6dc'), 0.95);
  const n = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[side];
  built.walls.push({ grp, n, mid: along ? [(a0 + a1) / 2, line] : [line, (a0 + a1) / 2], side, line, a0, a1 });
  const ops = (S.open || []).filter(o => o.s === side && o.a[1] > a0 + 0.01 && o.a[0] < a1 - 0.01 && (o.at === undefined || Math.abs(o.at - line) < 0.12))
    .map(o => ({ ...o, a: [Math.max(o.a[0], a0), Math.min(o.a[1], a1)] })).sort((p, q) => p.a[0] - q.a[0]);
  const Hof = (u0, u1) => {                       // höhere Wand am Luftraum
    if (S.fl !== 'EG' || !S.voids) return C;
    const m = (u0 + u1) / 2;
    return S.voids.some(v => along ? (m > v[0] - 0.01 && m < v[2] + 0.01 && Math.abs(line - (side === 'N' ? v[1] : v[3])) < 0.25 || (line > v[1] && line < v[3] && m > v[0] && m < v[2]))
      : (m > v[1] - 0.01 && m < v[3] + 0.01 && Math.abs(line - (side === 'W' ? v[0] : v[2])) < 0.25)) ? C + SLAB + CEIL.OG : C;
  };
  // Teilt den Lauf zusätzlich an den Luftraum-Kanten, damit nur der Teil am Luftraum hoch wird
  const cuts = new Set([a0, a1]);
  for (const v of S.voids || []) for (const c of along ? [v[0], v[2]] : [v[1], v[3]]) if (c > a0 && c < a1) cuts.add(c);
  for (const o of ops) { cuts.add(o.a[0]); cuts.add(o.a[1]); }
  const P = [...cuts].sort((a, b) => a - b);
  const slab = (u0, u1, y0, y1, m = pm, dIn = 0, dOut = T) => {     // Wandstück zwischen u0..u1, y0..y1
    const w0 = line - (out < 0 ? dOut : -dIn), w1 = line + (out > 0 ? dOut : -dIn);
    const lo = Math.min(w0, w1), hi = Math.max(w0, w1);
    return along ? boxA(grp, u0, y0, lo, u1, y1, hi, m) : boxA(grp, lo, y0, u0, hi, y1, u1, m);
  };
  const inner = (u0, u1, y0, y1, depth, m, cast = false) => {   // flach auf der Raumseite
    const lo = out < 0 ? line : line - depth, hi = out < 0 ? line + depth : line;
    return along ? boxA(grp, u0, y0, lo, u1, y1, hi, m, cast) : boxA(grp, lo, y0, u0, hi, y1, u1, m, cast);
  };
  const recess = (u0, u1, y0, y1, d0, d1, m, cast = false) => {  // Teil in der Wandtiefe (d0..d1 ab Innenkante nach außen)
    const p0 = line + out * d0, p1 = line + out * d1, lo = Math.min(p0, p1), hi = Math.max(p0, p1);
    return along ? boxA(grp, u0, y0, lo, u1, y1, hi, m, cast) : boxA(grp, lo, y0, u0, hi, y1, u1, m, cast);
  };
  for (let i = 0; i < P.length - 1; i++) {
    const u0 = P[i], u1 = P[i + 1], H = Hof(u0, u1);
    if (u1 - u0 < 0.005) continue;
    const o = ops.find(q => q.a[0] < u0 + 1e-6 && q.a[1] > u1 - 1e-6);
    const dado = (y1) => { if (S.dado && !ac) { const h = Math.min(S.dado.h, y1); inner(u0, u1, 0.07, h, 0.004, MAT.col(S.dado.c, 0.9)); if (h === S.dado.h) inner(u0, u1, h, h + 0.025, 0.012, MAT.skirt()); } };
    if (!o) { slab(u0, u1, 0, H); inner(u0, u1, 0, 0.07, 0.014, MAT.skirt()); dado(H); continue; }
    const t = o.t;
    if (t === 'none') continue;
    const head = o.head ?? (t === 'ftc' ? H : t === 'win' ? Math.min(2.3, H - 0.2) : t === 'open' ? H : 2.1);
    const sill = o.sill ?? (t === 'win' ? 0.9 : 0);
    if (head < H - 0.005) slab(u0, u1, head, H);
    if (sill > 0.005) { slab(u0, u1, 0, sill); inner(u0, u1, 0, 0.07, 0.014, MAT.skirt()); dado(sill - 0.03); }
    if (t === 'open') continue;
    const fr = MAT.frame(), pf = 0.06;
    if (t === 'win' || t === 'ftc') {
      recess(u0, u1, head - pf, head, 0.06, 0.13, fr); recess(u0, u1, sill, sill + pf, 0.06, 0.13, fr);
      recess(u0, u0 + pf, sill, head, 0.06, 0.13, fr); recess(u1 - pf, u1, sill, head, 0.06, 0.13, fr);
      const nm = Math.max(0, Math.round((u1 - u0) / (o.pane || 1.4)) - 1);
      for (let k = 1; k <= nm; k++) { const um = u0 + (u1 - u0) * k / (nm + 1); recess(um - pf / 2, um + pf / 2, sill, head, 0.06, 0.13, fr); }
      recess(u0, u1, sill, head, 0.09, 0.1, MAT.glass());
      if (sill > 0.3) recess(u0 - 0.03, u1 + 0.03, sill - 0.02, sill, -0.04, 0.07, MAT.col('#e9e4dc', 0.35), true);   // Fensterbank innen
      else recess(u0, u1, 0, 0.012, 0, 0.06, MAT.col('#8d877e', 0.6));
    } else {
      const lw = 0.05;                              // Zarge und Verkleidung
      recess(u0, u0 + 0.02, 0, head, -0.012, T + 0.012, MAT.white()); recess(u1 - 0.02, u1, 0, head, -0.012, T + 0.012, MAT.white());
      recess(u0, u1, head - 0.02, head, -0.012, T + 0.012, MAT.white());
      inner(u0 - lw, u0, 0, head + lw, 0.012, MAT.white()); inner(u1, u1 + lw, 0, head + lw, 0.012, MAT.white()); inner(u0 - lw, u1 + lw, head, head + lw, 0.012, MAT.white());
      if (t === 'door' || t === 'front') {
        // Türblatt an einem Drehpunkt (Band gegenüber dem Griff), schlägt in den Raum auf; im Gesamtmodell per Klick auf/zu
        const lm = t === 'front' ? MAT.walnut() : MAT.white(), dir = o.hinge === 'b' ? -1 : 1, hu = o.hinge === 'b' ? u1 - 0.02 : u0 + 0.02, w = u1 - u0 - 0.04;
        const dp = line + out * 0.055, piv = new THREE.Group(); grp.add(piv);
        if (along) piv.position.set(hu, 0, dp); else piv.position.set(dp, 0, hu);
        const leaf = (a0, b0, y0, y1, c0, c1, m) => along ? boxA(piv, Math.min(a0 * dir, b0 * dir), y0, c0, Math.max(a0 * dir, b0 * dir), y1, c1, m, true)
          : boxA(piv, c0, y0, Math.min(a0 * dir, b0 * dir), c1, y1, Math.max(a0 * dir, b0 * dir), m, true);
        leaf(0, w, 0.008, head - 0.02, -0.02, 0.02, lm);
        if (t === 'front') { leaf(w - 0.085, w - 0.06, 0.6, 1.6, -0.06, -0.02, MAT.steel()); leaf(w - 0.085, w - 0.06, 0.6, 1.6, 0.02, 0.06, MAT.steel()); }
        else for (const c of [-1, 1]) { leaf(w - 0.13, w - 0.01, 1.03, 1.05, c < 0 ? -0.05 : 0.03, c < 0 ? -0.03 : 0.05, MAT.steel()); }
        const max = (along ? out : -out) * dir * 1.65;
        piv.userData.door = { max, open: !!OPTS.tuerenOffen, front: t === 'front' }; piv.rotation.y = OPTS.tuerenOffen ? max : 0;
      } else if (t === 'gdoor') {
        recess(u0 + 0.02, u1 - 0.02, 0.008, head - 0.02, 0.05, 0.06, MAT.glass());
        for (const [p, q] of [[u0 + 0.02, u0 + 0.07], [u1 - 0.07, u1 - 0.02]]) recess(p, q, 0.008, head - 0.02, 0.045, 0.065, MAT.black());
        recess(u0 + 0.02, u1 - 0.02, head - 0.07, head - 0.02, 0.045, 0.065, MAT.black()); recess(u0 + 0.02, u1 - 0.02, 0.008, 0.08, 0.045, 0.065, MAT.black());
      }
    }
  }
}
// Vorhang an die passende Wandgruppe hängen (verschwindet mit ihr in der Ansicht von oben)
function wallGroup(built, side, at) {
  let best = null, bd = 1e9;
  for (const w of built.walls) if (w.side === side) { const d = Math.abs(w.line - at); if (d < bd) { bd = d; best = w; } }
  return best ? best.grp : built.group;
}

// Räume -------------------------------------------------------------------------------
const SAGE = '#8a9a7b', CASH = '#e4dbcd', OAKF = MAT.oak;
const ROOMS = {
  buero: {
    name: 'Büro (Benjamin)', fl: 'EG', paint: '#e2dacb', rects: [[10.47, 14.73, 13.10, 17.57]],
    open: [{ s: 'W', a: [14.95, 16.25], t: 'win', sill: 0.55, head: 2.45 }, { s: 'E', a: [15.56, 16.45], t: 'door' }],
    view: { pos: [12.9, 16.8, 1.6], target: [10.9, 14.9, 1.15], fov: 68 }, dir: [0.6, 1],
    build(g, b, L, C) {
      put(g, Lamellas(2.4, C, MAT.walnut()), 10.5, 14.73, 2.4, 0.04, 'S');
      put(g, LiftDesk(1.6, 0.8, MAT.black()), 10.85, 14.77, 1.6, 0.8, 'S');            // Sitzen 0,72–Stehen 1,25 m
      for (let i = 0; i < 4; i++) {                // Nussbaum-Hängeschränke ab 1,95 m: unten offen mit Büchern, oben zu (Platz für Stehhöhe)
        const x = 10.9 + i * 0.39;
        put(g, Shelf(0.37, 0.32, 0.37, 1, MAT.walnut(), 11 + i, { led: true }), x, 14.77, 0.37, 0.32, 'S', 1.95);
        put(g, Cab(0.37, 0.32, 0.37, MAT.walnut(), { y0: 2.32, door: 0.37, handle: 'grip' }), x, 14.77, 0.37, 0.32, 'S');
      }
      put(g, OfficeChair('#b23a2e'), 11.4, 15.7, 0.5, 0.5, 'N');
      put(g, Cab(2.4, 0.6, C - 0.02, '#7f8c86', { door: 0.6, handle: 'grip' }), 10.47, 16.97, 2.4, 0.6, 'N');
      put(g, Rug(1.6, 1.2, '#d6c9b3', '#8f8576'), 10.9, 15.6, 1.6, 1.2, 'S');
      put(g, Plant(1.3, '#e9e2d6', 3), 12.6, 14.95, 0.4, 0.4, 'S');
      put(g, Picture(0.6, 0.8, 2), 13.1, 16.6, 0.03, 0.6, 'W', 1.55);
      Pendant(g, 11.65, 15.25, C, 'dome', L, { r: 0.22, drop: 0.8, strong: true }); Spot(g, 12.55, 15.05, C); Spot(g, 10.75, 16.65, C); Spot(g, 12.4, 16.6, C);
      Curtain(wallGroup(b, 'W', 10.47), 'W', 14.95, 16.25, 10.47, C);
    },
  },
  hobby: {
    name: 'Hobbyraum: Wellness und Ingas Büro', fl: 'EG', paint: '#e8e0d2', wacc: [{ s: 'W', at: 10.48, c: '#b7a48e' }], rects: [[10.48, 17.70, 16.24, 21.30]],
    open: [{ s: 'S', a: [10.6, 16.1], t: 'ftc', pane: 1.4 }, { s: 'N', a: [13.33, 14.2], t: 'door' }],
    view: { pos: [16.0, 18.45, 1.6], target: [11.2, 20.4, 0.95], fov: 68 }, dir: [0.4, 1],
    build(g, b, L, C) {
      // Infrarotkabine 4 Personen in der Südwestecke: Glasfront nach Süden (Blick in den Garten), Glastür nach Osten
      const sx = 10.5, sz = 19.6, sw = 1.6, sd = 1.68, sh = 2.0, hm = MAT.hemlock(), z2 = sz + sd;
      boxA(g, sx, 0, sz, sx + sw, sh, sz + 0.05, hm); boxA(g, sx, 0, sz, sx + 0.05, sh, z2, hm); boxA(g, sx, sh, sz, sx + sw, sh + 0.06, z2, hm);
      boxA(g, sx + sw - 0.05, 0, sz, sx + sw, sh, sz + 0.25, hm); boxA(g, sx + sw - 0.05, 0, z2 - 0.5, sx + sw, sh, z2, hm);
      boxA(g, sx + 0.05, 0, z2 - 0.05, sx + sw, 0.12, z2, hm); boxA(g, sx + 0.05, sh - 0.1, z2 - 0.05, sx + sw, sh, z2, hm);
      boxA(g, sx + 0.05, 0.12, z2 - 0.035, sx + sw - 0.05, sh - 0.1, z2 - 0.025, MAT.glass(), false);
      boxA(g, sx + sw - 0.04, 0.02, sz + 0.25, sx + sw - 0.02, sh - 0.05, z2 - 0.5, MAT.glass(), false);
      boxA(g, sx + sw - 0.02, 0.9, z2 - 0.56, sx + sw + 0.01, 1.3, z2 - 0.53, MAT.hemlock());
      boxA(g, sx + 0.05, 0.42, sz + 0.05, sx + sw - 0.05, 0.47, sz + 0.55, hm); boxA(g, sx + 0.05, 0, sz + 0.5, sx + sw - 0.05, 0.42, sz + 0.53, hm);   // Bank mit Blick nach Süden
      boxA(g, sx + 0.25, 0.6, sz + 0.06, sx + sw - 0.25, 1.7, sz + 0.08, MAT.glow('#ff9a5a', 0.9), false);
      boxA(g, sx + 0.2, 0.48, sz + 0.1, sx + 0.6, 0.55, sz + 0.5, MAT.fabric('#f4efe6'));
      const p = new THREE.PointLight('#ffb070', 0.8, 2.5, 2); p.position.set(sx + 0.8, 1.2, sz + 0.8); g.add(p);
      // Druckkammer Dremenia Comfort an der Nordwand, Sichtfenster nach Süden zum Fenster
      const cap = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 0.55, 10, 28), std('#f4f4f1', { roughness: 0.35 }));
      cap.rotation.z = Math.PI / 2; cap.position.set(11.375, 0.72, 18.4); cap.castShadow = true; g.add(cap);
      for (const dx of [-0.3, 0.05, 0.4]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), MAT.col('#2a3640', 0.15)); w.position.set(11.375 + dx, 0.9, 18.4 + 0.52); w.rotation.x = -0.35; g.add(w); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.04, 10, 32), MAT.col('#9aa3aa', 0.3)); ring.rotation.y = Math.PI / 2; ring.position.set(12.2, 0.72, 18.4); g.add(ring);
      for (const dx of [0.35, 1.3]) boxA(g, 10.55 + dx - 0.15, 0, 18.05, 10.55 + dx + 0.15, 0.2, 18.75, MAT.col('#d0d0cc', 0.4));
      boxA(g, 10.55, 0, 17.74, 11.0, 0.5, 17.98, MAT.white());                 // Kompressor-Box (oder in Garage, je nach Schlauchlänge)
      put(g, Rug(1.0, 0.6, '#c9bca8', null), 11.9, 19.0, 0.6, 1.0, 'E');
      boxA(g, 12.55, 0, 19.7, 12.85, 0.45, 20.1, MAT.hemlock()); g.add(rbox(0.6, 0.05, 0.25, 0.02, MAT.fabric('#f4efe6'), 12.7, 0.47, 19.9));
      // Holz-Raumteiler: senkrechte Eichenleisten mit Luft dazwischen, deckenhoch
      for (let z = 18.82; z < 20.86 - 0.03; z += 0.075) boxA(g, 12.94, 0, z, 13.04, C, z + 0.04, MAT.oak());
      boxA(g, 12.92, C - 0.04, 18.82, 13.06, C, 20.86, MAT.oak()); boxA(g, 12.92, 0, 18.82, 13.06, 0.04, 20.86, MAT.oak());
      // Ingas Büro
      put(g, Cab(1.76, 0.45, C - 0.02, MAT.oakL(), { door: 0.44, handle: 'grip' }), 14.45, 17.71, 1.76, 0.45, 'S');
      put(g, Desk(1.6, 0.8, MAT.oak(), MAT.col('#2d2a26'), { laptop: true, lamp: '#8a9a7b' }), 15.42, 19.1, 0.8, 1.6, 'W');
      put(g, OfficeChair('#6f7d6a'), 14.75, 19.65, 0.5, 0.5, 'E');
      put(g, Shelf(1.2, 0.25, 0.7, 2, MAT.oak(), 21), 16.0, 19.3, 0.24, 1.2, 'W', 1.45);
      put(g, Sofa(2.0, 0.9, '#8f9a8c', { pillows: ['#d8b56a', '#efe6d6'], throw: '#c9bca8' }), 13.07, 19.0, 0.9, 2.0, 'E');
      put(g, Rug(1.4, 1.9, '#d9cdb8', '#a9846a'), 14.0, 19.0, 1.4, 1.9, 'S');
      put(g, Plant(1.4, '#3b3733', 5), 15.6, 20.75, 0.4, 0.4, 'S');
      Pendant(g, 13.55, 18.7, C, 'globe', L, { r: 0.16 }); Pendant(g, 14.6, 20.85, C, 'globe', L, { r: 0.16 });
      Spot(g, 11.3, 18.4, C); Spot(g, 12.4, 20.4, C); Spot(g, 15.8, 19.9, C);
      Curtain(wallGroup(b, 'S', 21.30), 'S', 10.6, 16.1, 21.30, C);
    },
  },
  flur_eg: {
    name: 'Eingang und Flur EG', fl: 'EG', paint: '#e9e2d6', wacc: [{ s: 'S', at: 14.40, a: [11.97, 13.24], c: '#b48a6a' }],
    rects: [[11.97, 11.95, 16.20, 14.40], [13.24, 14.40, 14.32, 17.54], [14.32, 14.40, 16.20, 15.37]],
    open: [{ s: 'W', a: [12.51, 13.40], t: 'ftc', head: 2.75 }, { s: 'W', a: [13.40, 14.29], t: 'front', head: 2.75, hinge: 'b', at: 11.97 }, { s: 'N', a: [14.87, 15.76], t: 'none', at: 11.95 },
      { s: 'E', a: [13.4, 14.38], t: 'gdoor', head: 2.3 }, { s: 'W', a: [15.56, 16.45], t: 'door', at: 13.24 },
      { s: 'S', a: [13.33, 14.2], t: 'door', at: 17.54 }, { s: 'E', a: [16.3, 17.1], t: 'door', at: 14.32 }],
    view: { pos: [15.95, 13.25, 1.62], target: [12.0, 13.7, 1.2], fov: 70 }, dir: [0.5, 1],
    build(g, b, L, C) {
      const OLV = '#7f8a73';                       // Schrankwand links in Olivgrün, rechts Eiche
      // 02.11.: Schrankwand mit Sitznische statt Bank davor (sonst gehen die Türen nicht auf). Haustür 2,75 hoch schlägt bis z 13,40 auf, die Nische endet bei 12,55.
      put(g, Cab(0.48, 0.6, C - 0.02, OLV, { door: 0.48, handle: 'grip', inner: 'schuh' }), 11.97, 11.95, 0.48, 0.6, 'S');          // Schuhe
      boxA(g, 12.45, 0, 11.95, 14.37, 0.42, 12.55, MAT.col(OLV, 0.55));                                                            // Sitzbank in der Nische
      for (let i = 0; i < 3; i++) boxA(g, 12.46 + i * 0.64, 0.1, 12.55, 13.09 + i * 0.64, 0.4, 12.56, MAT.col(OLV, 0.5));            // drei Schubkästen (Schuhe für jeden Tag)
      g.add(rbox(1.88, 0.06, 0.5, 0.02, MAT.fabric('#c9a06a'), 13.41, 0.45, 12.28));
      for (let x = 12.47; x < 14.36; x += 0.12) boxA(g, x, 0.48, 11.95, x + 0.09, 1.95, 11.98, MAT.oak());                          // Lamellen-Rückwand
      for (let i = 0; i < 5; i++) g.add(cyl(0.015, 0.015, 0.08, MAT.brass(), 12.65 + i * 0.38, 1.65, 12.02, 8).rotateX(Math.PI / 2));   // Haken
      put(g, Cab(1.92, 0.6, C - 0.02 - 1.95, OLV, { y0: 1.95, door: 0.48, handle: 'grip', led: true, inner: 'regal' }), 12.45, 11.95, 1.92, 0.6, 'S');   // Oberschrank, Licht darunter
      put(g, Cab(0.48, 0.6, C - 0.02, OLV, { door: 0.48, handle: 'grip', inner: 'kleid' }), 14.37, 11.95, 0.48, 0.6, 'S');           // Jacken
      // Geheimtür Garage: Schrankfront als Tür, dahinter 60 cm Laibung bis zur T30-Tür in der Garagenwand; schlägt in den Flur auf
      boxA(g, 14.85, 0, 11.95, 14.87, C - 0.02, 12.55, MAT.col(OLV, 0.55)); boxA(g, 15.755, 0, 11.95, 15.775, C - 0.02, 12.55, MAT.col(OLV, 0.55));
      boxA(g, 14.85, 2.2, 11.95, 15.775, C - 0.02, 12.55, MAT.col(OLV, 0.55));
      { const pv = new THREE.Group(); pv.position.set(14.875, 0, 12.55); g.add(pv); boxA(pv, 0, 0.08, -0.02, 0.875, 2.195, 0, MAT.col(OLV, 0.55), true);
        boxA(pv, 0, 2.17, -0.004, 0.875, 2.19, 0.001, MAT.col('#2d2a26', 0.8), false); pv.userData.door = { max: -1.6, open: false }; }
      put(g, Cab(0.43, 0.6, C - 0.02, OLV, { door: 0.43, handle: 'grip', inner: 'regal' }), 15.77, 11.95, 0.43, 0.6, 'S');
      put(g, Cab(1.78, 0.97, C - 0.02, MAT.oak(), { door: 0.45, handle: 'grip' }), 14.42, 14.4, 1.78, 0.97, 'N');
      // Geheimtür zum Flur: Schrankfront, angelehnt offen
      boxA(g, 13.24, 2.1, 14.4, 14.32, C, 14.7, MAT.oak());
      const dg = new THREE.Group(); dg.position.set(13.26, 0, 14.42); dg.rotation.y = 1.1; dg.userData.door = { max: 1.1, open: true }; g.add(dg);   // als Tür markiert: das Gesamtmodell lässt sie weg
      boxA(dg, 0, 0.01, -0.02, 1.0, 2.08, 0.0, MAT.oak()); boxA(dg, 0.95, 2.05, -0.02, 1.0, 2.075, 0.002, MAT.col('#2d2a26', 0.8));
      Doormat(g, 11.98, 13.25, 13.18, 14.29);      // eingelassene Matte vor der Haustür
      boxA(g, 12.6, 0.85, 14.27, 13.22, 0.88, 14.4, MAT.oak());               // Ablage mit Spiegel
      const mr = new THREE.Mesh(new THREE.CircleGeometry(0.32, 40), MAT.mirror()); mr.rotation.y = Math.PI; mr.position.set(12.91, 1.45, 14.395); g.add(mr);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.325, 0.012, 8, 40), MAT.brass()); rim.position.set(12.91, 1.45, 14.39); g.add(rim);
      g.add(vase(12.75, 0.88, 14.33, 0.05, 0.22, '#3b3733'));
      put(g, Picture(0.7, 0.5, 1), 14.32, 15.6, 0.03, 0.7, 'W', 1.55);
      for (const [x, z] of [[12.5, 13.25], [13.5, 13.25], [14.5, 13.25], [15.5, 13.25], [13.78, 15.2], [13.78, 16.4]]) Spot(g, x, z, C);
      tagLP(boxA(g, 12.1, C - 0.06, 12.56, 16.15, C - 0.04, 12.6, MAT.glow('#ffd9a0', 1.4), false), { name: 'Lichtfuge über der Schrankwand' });   // Lichtfuge über den Fronten
      const p = new THREE.PointLight('#ffe2b8', 1.6, 6, 2); p.position.set(14.0, 2.4, 13.3); g.add(p);
    },
  },
  garage: {
    name: 'Garage', fl: 'EG', floor: 'beton', paint: '#e6e3dd', rects: [[11.84, 5.44, 17.35, 11.71]],
    open: [{ s: 'W', a: [6.15, 11.41], t: 'none' }, { s: 'E', a: [6.19, 7.08], t: 'door' }, { s: 'S', a: [14.87, 15.76], t: 'door', hinge: 'b' }],
    view: { pos: [11.95, 8.66, 1.8], target: [17.3, 8.75, 1.25], fov: 70 }, dir: [-0.7, 1],
    build(g, b, L, C) {
      const grey = '#bfb8ac';
      // Sektionaltor 5,26 m, Lauf unter der Decke bis 2,55 m ins Innere: dort nichts an die Decke hängen
      boxA(g, 11.84 - T, 2.25, 6.15, 11.84, C, 11.41, MAT.col('#e6e3dd', 0.95));
      boxA(g, 11.84, 0, 6.15, 11.89, 2.25, 11.41, MAT.col('#4a4d50', 0.5));
      for (let y = 0.5; y < 2.2; y += 0.5) boxA(g, 11.89, y - 0.01, 6.17, 11.895, y + 0.01, 11.39, MAT.col('#2f3133', 0.5), false);
      for (const z of [6.2, 11.36]) boxA(g, 11.9, 2.28, z - 0.02, 14.4, 2.33, z + 0.02, MAT.steel());
      boxA(g, 11.9, 2.6, 8.76, 14.4, 2.66, 8.8, MAT.steel()); boxA(g, 14.1, 2.5, 8.6, 14.5, 2.75, 8.96, MAT.col('#3a3c3e', 0.5));
      // Platz für zwei Autos (02.11.: ohne Autos gezeigt), Radstopps an der Ostwand
      for (const z of [6.8, 7.75, 9.55, 10.5]) boxA(g, 16.9, 0, z - 0.15, 17.0, 0.1, z + 0.15, MAT.col('#c9a227', 0.6));
      // Ostwand: Hängeschränke über den Motorhauben (ab 1,30 m), 45 cm tief
      put(g, Cab(4.1, 0.45, 1.5, grey, { y0: 1.3, door: 0.59, handle: 'grip', led: true }), 16.9, 7.21, 0.45, 4.1, 'W');
      // Ecke Südost: Hochschrank 1,40 × 0,40 (Putzzeug, Getränke, Werkzeug)
      put(g, Cab(1.4, 0.4, C - 0.02, grey, { door: 0.47, handle: 'grip' }), 15.95, 11.31, 1.4, 0.4, 'N');
      // Deckenregale über den Motorhauben, Unterkante 2,15 m, hinter dem Torlauf
      for (const [z0, z1] of [[6.35, 8.15], [9.1, 10.9]]) {
        boxA(g, 14.75, 2.13, z0, 16.75, 2.16, z1, MAT.col('#8d9093', 0.5));
        for (const [x, z] of [[14.77, z0 + 0.02], [16.73, z0 + 0.02], [14.77, z1 - 0.02], [16.73, z1 - 0.02]]) boxA(g, x - 0.015, 2.16, z - 0.015, x + 0.015, C, z + 0.015, MAT.steel());
        for (let i = 0; i < 6; i++) { const bxx = 14.85 + (i % 3) * 0.62, bzz = z0 + 0.1 + Math.floor(i / 3) * 0.85; boxA(g, bxx, 2.16, bzz, bxx + 0.56, 2.5, bzz + 0.75, MAT.col(['#e9e4da', '#5f7d8c', '#d8cfc0'][i % 3], 0.7)); }
      }
      // Nordwand: Wallbox, Lochwand für Werkzeug; Wallbox 2 an der Ostwand zwischen den Autos
      boxA(g, 15.9, 1.0, 5.44, 16.25, 1.45, 5.56, MAT.white()); boxA(g, 16.0, 1.3, 5.56, 16.15, 1.36, 5.565, MAT.glow('#7ad3a0', 1.2), false);
      boxA(g, 17.23, 0.7, 8.45, 17.35, 1.15, 8.8, MAT.white()); boxA(g, 17.225, 1.0, 8.55, 17.23, 1.06, 8.7, MAT.glow('#7ad3a0', 1.2), false);
      boxA(g, 12.6, 1.05, 5.44, 14.2, 2.0, 5.47, MAT.col('#c8c3b8', 0.8));
      for (let i = 0; i < 7; i++) boxA(g, 12.75 + i * 0.2, 1.3 + (i % 3) * 0.15, 5.47, 12.79 + i * 0.2, 1.65 + (i % 3) * 0.15, 5.5, MAT.col(i % 2 ? '#c0392b' : '#2d2a26', 0.6));
      // Licht: drei Lichtleisten IP65 an der Decke, über Bewegungsmelder
      for (const x of [13.1, 15.8]) for (const z of [7.3, 10.05]) { const m = boxA(g, x - 0.6, C - 0.05, z - 0.04, x + 0.6, C - 0.01, z + 0.04, MAT.glow('#fff6e6', 1.6), false); if (m) m.userData.lp = { t: 'spot' }; }
      const p = new THREE.PointLight('#fff4e2', 1.8, 9, 2); p.position.set(14.6, 2.6, 8.6); g.add(p);
    },
  },
  eltern: {
    name: 'Elternschlafzimmer', fl: 'EG', paint: '#e7dfd2', wacc: [{ s: 'S', at: 13.25, c: '#7d6e63' }], rects: [[28.875, 8.47, 32.72, 13.25], [27.66, 8.47, 28.875, 11.70]],   // 02.11.: „Pfeiler“ x 28,81–29,11 war ein Schalterblock im Elektroplan, keine Wand
    open: [{ s: 'E', a: [10.05, 12.30], t: 'ftc', pane: 1.2 }, { s: 'N', a: [27.98, 28.75], t: 'win', sill: 0.9 },
      { s: 'W', a: [10.14, 11.03], t: 'door', hinge: 'b' }, { s: 'S', a: [27.85, 28.74], t: 'door', at: 11.70 }],
    view: { pos: [28.25, 9.0, 1.62], target: [31.0, 12.3, 0.7], fov: 70 }, dir: [-0.5, -1],
    build(g, b, L, C) {
      put(g, Cab(3.77, 0.6, C - 0.02, '#e2d8c8', { door: 0.63, handle: 'bar' }), 28.95, 8.48, 3.77, 0.6, 'S');
      // Bett 2,00 × 2,10 mittig zwischen versetzter GK-Wand (x 28,875) und Ostwand: je 92 cm frei
      // (vorher 2,20 breit und GK-Wand bei x 29,215: links nur 47 cm)
      const bx = 30.80 - 1.0, bz = 13.19 - 2.1;
      put(g, (() => { const p = new THREE.Group(); for (let i = 0; i < 8; i++) p.add(rbox(0.37, 1.15, 0.06, 0.02, MAT.fabric('#d9ccb6'), -1.5 + i * 0.375 + 0.1875, 0.95, 0)); return p; })(), bx - 0.5, 13.19, 3.0, 0.06, 'N');
      put(g, Bed(2.0, 2.1, { frame: '#cdbfa8', head: '#cdbfa8', hbH: 0.01, duvet: '#efe9df', throw: '#7d8a74', cushion: '#c9a06a' }), bx, bz, 2.0, 2.1, 'N');
      boxA(g, bx + 0.25, 0.1, bz - 0.001, bx + 1.75, 0.106, bz + 0.002, MAT.col('#8f8576', 0.8), false);   // Fuge Bettkasten (Lift)
      // Nachttische schwebend an der Wand, 40 × 35, Boden darunter frei
      put(g, Nightstand(0.4, 0.35, MAT.walnut(), { lamp: null, books: true, y0: 0.35 }), bx - 0.45, 12.84, 0.4, 0.35, 'N');
      put(g, Nightstand(0.4, 0.35, MAT.walnut(), { y0: 0.35 }), bx + 2.05, 12.84, 0.4, 0.35, 'N');
      Pendant(g, bx - 0.25, 12.95, C, 'globe', L, { r: 0.1, drop: 1.9 }); Pendant(g, bx + 2.25, 12.95, C, 'globe', L, { r: 0.1, drop: 1.9 });
      put(g, Rbench(1.4, 0.4, '#8f8576'), bx + 0.3, bz - 0.47, 1.4, 0.4, 'N');
      const tv = TV(1.1); put(g, tv, 27.66, 8.85, 0.03, 1.1, 'E', 1.35);
      boxA(g, 27.66, 1.3, 9.35, 27.72, 1.4, 9.45, MAT.black());
      put(g, Rug(2.6, 2.5, '#ddd2c0', '#b9ab95'), bx - 0.3, 10.45, 2.6, 2.5, 'S');
      Spot(g, 28.25, 9.3, C); Spot(g, 28.25, 11.0, C); Spot(g, 30.8, 9.6, C); Spot(g, 30.8, 11.6, C);
      const p = new THREE.PointLight('#ffe2b8', 1.4, 6, 2); p.position.set(30.5, 2.3, 10.8); g.add(p);
      Curtain(wallGroup(b, 'E', 32.72), 'E', 10.05, 12.30, 32.72, C); Curtain(wallGroup(b, 'N', 8.47), 'N', 27.98, 28.75, 8.47, C);
    },
  },
  wohnen: {
    name: 'Wohnzimmer', fl: 'EG', paint: '#e8e1d5', wacc: [{ s: 'N', at: 13.29, a: [29.0, 32.4], c: '#5b4a3e' }],
    rects: [[26.71, 13.29, 28.7, 19.95], [28.7, 13.82, 32.73, 19.95], [29.0, 13.29, 32.4, 13.82]],
    open: [{ s: 'S', a: [26.71, 32.73], t: 'ftc', pane: 1.5 }, { s: 'W', a: [17.75, 19.95], t: 'ftc', pane: 1.1 }, { s: 'W', a: [13.29, 15.18], t: 'none' }, { s: 'N', a: [26.71, 28.7], t: 'none', at: 13.29 }],
    view: { pos: [27.05, 18.9, 1.6], target: [32.2, 15.3, 1.05], fov: 66 }, dir: [-0.6, 1],
    build(g, b, L, C) {
      // Nischenschrank Nussbaum: unten zu, Mitte offen mit Licht, oben zu
      put(g, Cab(3.4, 0.45, 0.62, MAT.walnut(), { door: 0.85, handle: 'grip' }), 29.0, 13.3, 3.4, 0.45, 'S');           // Nischenschrank: unten zu,
      put(g, Shelf(3.4, 0.4, 1.4, 3, MAT.walnut(), 31, { led: true }), 29.0, 13.3, 3.4, 0.4, 'S', 0.62);                // Mitte offen mit Licht,
      put(g, Cab(3.4, 0.45, C - 2.02 - 0.02, MAT.walnut(), { y0: 2.02, door: 0.85, handle: 'none' }), 29.0, 13.3, 3.4, 0.45, 'S');   // oben zu
      Sconce(g, 'N', 13.82, 28.85, 1.75, { w: 0.08 }); Sconce(g, 'N', 13.82, 32.57, 1.75, { w: 0.08 });               // Wandleuchten an den Nischenpfeilern
      Sconce(g, 'E', 32.73, 15.45, 1.75); Sconce(g, 'E', 32.73, 18.55, 1.75);                                      // und neben dem Bild
      kamin(g, C, 26.38, 13.4, 0.62, 1.75);
      put(g, Cab(2.4, 0.45, 0.42, MAT.walnut(), { y0: 0.22, door: 0.6, handle: 'grip', led: true }), 26.71, 15.3, 0.45, 2.4, 'E');
      put(g, TV(1.4), 26.71, 15.85, 0.03, 1.4, 'E', 1.3);
      put(g, Picture(2.4, 1.1, 0), 32.7, 15.8, 0.03, 2.4, 'W', 1.55);
      put(g, Sofa(3.8, 1.0, '#a39b8f', { armL: true, armR: false, pillows: ['#d8b56a', '#efe6d6', '#7d8a74'], throw: '#c9bca8' }), 31.55, 15.1, 1.0, 3.8, 'W');
      put(g, Sofa(1.8, 1.0, '#a39b8f', { armL: false, armR: true, pillows: ['#efe6d6'] }), 29.75, 17.9, 1.8, 1.0, 'N');
      put(g, Rug(3.0, 3.9, '#ddd2c0', '#a9846a'), 28.7, 14.9, 3.0, 3.9, 'S');
      // Couchtisch Eiche, rund, mit Büchern und Vase
      g.add(cyl(0.6, 0.6, 0.04, MAT.oak(), 30.3, 0.36, 16.4, 40)); g.add(cyl(0.45, 0.5, 0.34, MAT.oak(), 30.3, 0.17, 16.4, 40));
      books(g, 30.0, 30.3, 0.38, 16.2, 16.45, 5); g.add(vase(30.5, 0.38, 16.55, 0.07, 0.28, '#3b3733'));
      put(g, Armchair(0.9, 0.9, '#7d8a74', MAT.walnut()), 27.9, 18.6, 0.9, 0.9, 'N');
      put(g, FloorLamp('#2d2a26'), 27.1, 19.55, 0.1, 0.1, 'S');
      put(g, Plant(1.8, '#d8cfc2', 6), 32.25, 19.45, 0.4, 0.4, 'S');
      Pendant(g, 30.3, 16.4, C, 'drum', L, { r: 0.42, drop: 0.9, strong: true });
      Spot(g, 27.45, 15.05, C); Spot(g, 27.45, 17.7, C); Spot(g, 31.85, 18.9, C);
      tagLP(boxA(g, 29.05, C - 0.03, 13.35, 32.35, C - 0.02, 13.4, MAT.glow('#ffd9a0', 1.4), false), { name: 'LED-Profil in der Nischendecke' });
      Curtain(wallGroup(b, 'S', 19.95), 'S', 26.71, 32.73, 19.95, C); Curtain(wallGroup(b, 'W', 26.71), 'W', 17.75, 19.95, 26.71, C);
    },
  },
  flur_eltern: {
    // 02.11.: fehlte im Modell (Gras im Boden). Laut EG-Plan offener Gang zwischen Essen/Wohnen und Elternzimmertür, Südwand Elternbad z 11,95
    name: 'Flur zum Elternzimmer', fl: 'EG', paint: '#e9e2d6', rects: [[26.43, 11.946, 28.875, 13.29], [27.83, 11.70, 28.74, 11.946]],   // zweites Rechteck = Laibung der Elternzimmertür
    open: [{ s: 'W', a: [11.946, 13.29], t: 'none' }, { s: 'S', a: [26.43, 28.875], t: 'none' }, { s: 'N', a: [27.83, 28.74], t: 'none', at: 11.70 }],
    view: { pos: [26.75, 12.95, 1.62], target: [28.6, 11.2, 1.3], fov: 70 }, dir: [0, 1],
    build(g, b, L, C) {
      put(g, Picture(0.9, 0.6, 2, MAT.oak()), 26.9, 11.946, 0.9, 0.03, 'S', 1.5);
      Spot(g, 27.2, 12.6, C); Spot(g, 28.3, 12.6, C);
    },
  },
  technik: {
    // 02.11.: Technikraum „Abstr. 9,53 m²“ nördlich der Speisekammer, Tür zur Garage und Außentür nach Osten. Geräte als Platzhalter
    // („Heizung, Klima, Lüftung nach Angaben der Installationsfirma“); Größen geschätzt, nicht geplant.
    name: 'Technikraum', fl: 'EG', floor: 'tile', paint: '#ebe8e2', rects: [[17.713, 5.569, 21.463, 8.111]],
    open: [{ s: 'W', a: [6.193, 7.079], t: 'none' }, { s: 'E', a: [6.217, 7.102], t: 'door', hinge: 'b' }],
    view: { pos: [18.1, 7.7, 1.62], target: [21.2, 6.0, 1.1], fov: 72 }, dir: [0, 1],
    build(g, b, L, C) {
      const gr = MAT.col('#c9cbc8', 0.6), dk = MAT.col('#4a4d50', 0.6), wh = MAT.white();
      boxA(g, 17.9, 1.3, 5.57, 19.1, 2.1, 6.05, wh); boxA(g, 18.05, 1.55, 6.05, 18.95, 1.85, 6.06, dk, false);   // Lüftungsgerät an der Nordwand
      for (const x of [18.2, 18.8]) boxA(g, x - 0.08, 2.1, 5.65, x + 0.08, C, 5.81, MAT.col('#d7dadb', 0.4));    // Lüftungskanäle
      g.add(cyl(0.33, 0.33, 1.9, gr, 20.85, 0.95, 6.05, 28)); g.add(cyl(0.33, 0.33, 0.04, dk, 20.85, 1.92, 6.05, 28));   // Warmwasser-/Pufferspeicher
      boxA(g, 19.55, 0.9, 5.57, 20.3, 1.75, 5.95, wh); boxA(g, 19.6, 0.4, 5.57, 20.25, 0.85, 5.75, MAT.steel());  // Wärmepumpe Innenteil, Heizkreisverteiler
      boxA(g, 17.9, 0.3, 7.85, 19.1, 2.1, 8.111, MAT.col('#e9e9e6', 0.5)); boxA(g, 18.49, 0.3, 7.84, 18.51, 2.1, 7.85, dk, false);   // Zählerschrank
      boxA(g, 19.4, 0, 7.8, 20.2, 1.2, 8.111, dk); boxA(g, 20.4, 1.0, 7.95, 20.95, 1.65, 8.111, wh);                // Batteriespeicher, Wechselrichter
      Spot(g, 18.8, 6.8, C); Spot(g, 20.4, 6.8, C);
    },
  },
  rutsche: {
    name: 'Treppe, Rutsche und Luftraum', fl: 'EG', rects: [[16.46, 11.86, 26.43, 16.57], [21.85, 8.42, 24.10, 11.86]],
    paint: '#e9e2d6', voids: [[21.85, 14.45, 26.43, 16.57], [21.85, 8.42, 24.10, 12.45]],
    // 02.11.: Südfront laut EG-Plan zwei Hebeschiebetüren 4,21 × 2,51 m, dazwischen Stütze x 21,41–21,90; am Luftraum darüber Betonsturz bis 3,30 und Oberlicht (Schnitt A-A)
    open: [{ s: 'S', a: [17.203, 21.413], t: 'ftc', head: 2.51, pane: 1.4 }, { s: 'S', a: [21.897, 26.107], t: 'ftc', pane: 1.4 }, { s: 'W', a: [13.4, 14.4], t: 'gdoor', head: 2.3 },
      { s: 'N', a: [17.71, 21.56], t: 'none', at: 11.86 }, { s: 'E', a: [11.86, 15.15], t: 'none', at: 26.43 }],   // 02.11.: offen zum Flur Eltern
    view: { pos: [17.3, 13.0, 1.65], target: [24.4, 15.0, 1.9], fov: 70 }, dir: [-0.3, 1],
    build(g, b, L, C) {
      stairs(g, 21.85, 8.42, 24.10, 11.86, C);
      if (!OPTS.haus) kamin(g, C, 26.38, 13.4, 0.62, 1.75);   // im Gesamtmodell kommt der Kamin aus dem Wohnzimmer
      // Esstisch Eiche 2,40 mit acht Stühlen und langer Pendelleuchte
      const tx = 17.9, tz = 14.55;
      boxA(g, tx, 0.72, tz, tx + 2.4, 0.76, tz + 1.0, MAT.oak());
      for (const dx of [0.35, 2.05]) { boxA(g, tx + dx - 0.04, 0, tz + 0.15, tx + dx + 0.04, 0.72, tz + 0.85, MAT.oak()); }
      boxA(g, tx + 0.35, 0.05, tz + 0.46, tx + 2.05, 0.1, tz + 0.54, MAT.oak());
      for (let i = 0; i < 3; i++) { put(g, DiningChair('#c9bca8'), tx + 0.3 + i * 0.75, tz - 0.55, 0.5, 0.5, 'S'); put(g, DiningChair('#c9bca8'), tx + 0.3 + i * 0.75, tz + 1.05, 0.5, 0.5, 'N'); }
      put(g, DiningChair('#c9bca8'), tx - 0.55, tz + 0.25, 0.5, 0.5, 'E'); put(g, DiningChair('#c9bca8'), tx + 2.45, tz + 0.25, 0.5, 0.5, 'W');
      g.add(vase(tx + 1.2, 0.76, tz + 0.5, 0.08, 0.3, '#e9e2d6'));
      Pendant(g, tx + 1.2, tz + 0.5, C, 'linear', L, { len: 1.7, drop: 1.25, strong: true });
      put(g, Cab(2.1, 0.45, 0.62, MAT.oak(), { y0: 0.12, door: 0.7, handle: 'grip', led: true }), 24.25, 11.93, 2.1, 0.45, 'S');
      put(g, Picture(1.2, 0.8, 1), 24.7, 11.86, 1.2, 0.03, 'S', 1.6);
      g.add(vase(24.5, 0.74, 12.15, 0.06, 0.32, '#a9573c')); put(g, Plant(0.5, '#e9e2d6', 7), 25.7, 11.98, 0.3, 0.3, 'S', 0.74);
      put(g, Plant(1.7, '#3b3733', 11), 16.75, 16.05, 0.4, 0.4, 'S');
      Spot(g, 18.0, 12.6, C); Spot(g, 20.0, 12.6, C); Spot(g, 25.2, 12.6, C);
      galerie(g, C); const y = C + SLAB;
      boxA(g, 21.897, 2.51, 16.57, 26.107, 3.30, 16.57 + T, MAT.col('#d8d3ca', 0.9));                     // Betonsturz zwischen Schiebetür und Oberlicht
      boxA(g, 21.897, 2.51, 16.56, 26.107, 3.30, 16.57, MAT.col('#e9e2d6', 0.95));
      b.ceilings.push(boxA(g, 21.85, y + CEIL.OG - 0.01, 12.45, 26.43, y + CEIL.OG, 14.45, MAT.ceil(), false));
      const p = new THREE.PointLight('#fff4e2', 1.4, 9, 2); p.position.set(24.0, 4.6, 15.0); g.add(p);
      Curtain(wallGroup(b, 'S', 16.57), 'S', 17.5, 21.8, 16.57, C);
    },
  },
  flur_og: {
    name: 'Kinderflur OG mit Schranknischen', fl: 'OG', paint: '#ece6dc', dado: { h: 1.1, c: '#cdd5c6' },
    rects: [[8.9, 13.33, 20.85, 14.55], [13.57, 12.73, 14.61, 13.33], [13.57, 14.55, 14.61, 15.15],
      [11.41, 14.55, 13.46, 15.02], [16.2, 14.55, 17.28, 15.02], [18.66, 14.55, 20.58, 15.02], [20.85, 13.09, 25.45, 15.09], [23.2, 12.37, 25.45, 13.09]],
    // Empore und Türen am 02.11. auf OG-Blattmaße korrigiert (vorher teils EG-Maße: Treppenloch 1 m, Empore 0,64 m daneben).
    // OG-Blatt → EG-Blatt: x + 1,012, z − 0,644 (Ostwand und Nordwand aus waende.json).
    open: [{ s: 'N', a: [10.67, 11.54], t: 'door', at: 13.33 }, { s: 'N', a: [15.07, 15.95], t: 'door', at: 13.33 }, { s: 'N', a: [18.18, 19.05], t: 'door', at: 13.33 },
      { s: 'S', a: [10.28, 11.15], t: 'door', at: 14.55 }, { s: 'S', a: [15.07, 15.95], t: 'door', at: 14.55 }, { s: 'S', a: [17.50, 18.37], t: 'door', at: 14.55 },
      { s: 'S', a: [20.85, 25.45], t: 'none', at: 15.09 }, { s: 'N', a: [20.89, 23.09], t: 'none', at: 13.09 }, { s: 'N', a: [24.46, 25.33], t: 'door', at: 12.37 }, { s: 'E', a: [12.65, 13.67], t: 'door', at: 25.45 },
      { s: 'W', a: [13.48, 14.48], t: 'ftc', pane: 1.2 }],   // Flurende West: bodentief (OG-Plan, Ansicht West 2,70 hoch)
    view: { pos: [20.95, 13.25, 1.6], target: [24.2, 15.6, 0.2], fov: 70 }, dir: [0.1, 1], zoom: 0.62,
    build(g, b, L, C) {
      const pax = (x, z, w, d, f) => put(g, Cab(LW(w, d, f)[0], LW(w, d, f)[1], C - 0.02, '#f2efe9', { door: 0.5, handle: 'knob' }), x, z, w, d, f);
      pax(11.41, 14.62, 2.05, 0.4, 'N'); pax(13.59, 12.76, 1.0, 0.57, 'S'); pax(13.59, 14.57, 1.0, 0.58, 'N'); pax(16.2, 14.62, 1.08, 0.4, 'N'); pax(18.66, 14.62, 1.92, 0.4, 'N');
      put(g, Rug(10.6, 0.8, '#d9cdb8', '#8a9a7b'), 9.3, 13.54, 10.6, 0.8, 'S');
      for (const [x, i] of [[11.6, 0], [12.5, 3], [14.95, 2], [17.8, 1]]) put(g, Picture(0.5, 0.4, i, MAT.oak()), x, 13.33, 0.5, 0.03, 'S', 1.5);
      for (const [x, z] of [[9.9, 13.95], [12.4, 14.1], [14.1, 13.9], [16.7, 14.1], [19.6, 14.1], [22.0, 13.5], [24.4, 13.5]]) Spot(g, x, z, C);
      const p = new THREE.PointLight('#ffe2b8', 1.5, 7, 2); p.position.set(14.5, 2.2, 13.9); g.add(p);
      const p2 = new THREE.PointLight('#ffe2b8', 1.3, 7, 2); p2.position.set(22.5, 2.2, 13.4); g.add(p2);
      for (const x of [11.0, 13.0, 17.75]) Sconce(g, 'N', 13.33, x, 1.85);
      // Galerie, Treppe, Rutsche und Blick in den Luftraum: dieselben Teile wie im Essbereich, aus EG-Maßen ins OG-Blatt verschoben
      // (x − 1,012, z + 0,644). Im Gesamtmodell kommen sie nur einmal aus dem Essbereich.
      if (!OPTS.haus) {
        const sub = new THREE.Group(); sub.position.set(-1.012, -(CEIL.EG + SLAB), 0.644); sub.userData.keep = true; g.add(sub);
        galerie(sub, CEIL.EG); stairs(sub, 21.85, 8.42, 24.10, 11.86, CEIL.EG);
        boxA(sub, 21.85, -0.02, 14.45, 26.43, 0, 16.57, std('#ffffff', { map: herringTex }), false);
      }
    },
  },
  hwr: {
    name: 'Hauswirtschaftsraum', fl: 'OG', floor: 'tile', paint: '#ebe6dc', rects: [[23.19, 9.13, 25.46, 12.26]],
    open: [{ s: 'N', a: [23.95, 24.75], t: 'win', sill: 1.0, head: 2.2 }, { s: 'S', a: [24.46, 25.33], t: 'door' }],
    view: { pos: [25.2, 12.05, 1.65], target: [23.3, 10.4, 1.1], fov: 74 }, dir: [0.8, 1],
    build(g, b, L, C) {
      const oak = MAT.oak(), x = 23.2, D = 0.65;
      // Waschturm von Nord nach Süd: Putz 0,50 · Turm 1 · Körbe 0,45 · Turm 2 · Becken 0,65, oben durchgehend Schränke
      put(g, Cab(0.5, 0.6, 2.0, oak, { door: 0.5, handle: 'grip' }), x, 9.15, 0.6, 0.5, 'E');
      for (const z of [9.66, 10.83]) {
        put(g, Cab(0.7, D, 0.3, oak, { door: 0.7, handle: 'grip' }), x, z, D, 0.7, 'E');
        for (const [y, c] of [[0.3, '#f4f4f2'], [1.15, '#f4f4f2']]) {
          boxA(g, x + 0.02, y, z + 0.03, x + 0.62, y + 0.85, z + 0.67, MAT.col(c, 0.35));
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.025, 10, 32), MAT.steel()); ring.rotation.y = Math.PI / 2; ring.position.set(x + 0.625, y + 0.45, z + 0.35); g.add(ring);
          const gl = new THREE.Mesh(new THREE.CircleGeometry(0.18, 32), MAT.col('#3a4650', 0.15)); gl.rotation.y = Math.PI / 2; gl.position.set(x + 0.622, y + 0.45, z + 0.35); g.add(gl);
          boxA(g, x + 0.62, y + 0.72, z + 0.06, x + 0.625, y + 0.8, z + 0.3, MAT.col('#c9ccd0', 0.4));
        }
        boxA(g, x, 1.15 - 0.02, z, x + D, 1.15, z + 0.7, oak); boxA(g, x, 2.0, z, x + D, 2.02, z + 0.7, oak);
        boxA(g, x, 0, z - 0.005, x + D, 2.0, z, oak); boxA(g, x, 0, z + 0.7, x + D, 2.0, z + 0.705, oak);
      }
      const kz = 10.37;                               // offene Fächer mit Körben
      boxA(g, x, 0, kz, x + 0.6, 2.0, kz + 0.01, oak); boxA(g, x, 0, kz + 0.44, x + 0.6, 2.0, kz + 0.45, oak);
      for (let i = 0; i < 5; i++) { const y = 0.08 + i * 0.38; boxA(g, x, y, kz, x + 0.6, y + 0.02, kz + 0.45, oak); g.add(rbox(0.5, 0.26, 0.38, 0.03, MAT.fabric(['#c9b28c', '#9aa38f', '#c9b28c', '#d9cdb8', '#9aa38f'][i]), x + 0.33, y + 0.15, kz + 0.225)); }
      put(g, Cab(0.65, D, 0.88, oak, { door: 0.65, handle: 'grip' }), x, 11.54, D, 0.65, 'E');
      boxA(g, x, 0.88, 11.54, x + D, 0.92, 12.19, MAT.col('#2b2a28', 0.4));
      boxA(g, x + 0.12, 0.86, 11.64, x + 0.52, 0.921, 12.09, MAT.col('#d9d6d0', 0.3));
      g.add(cyl(0.012, 0.012, 0.3, MAT.steel(), x + 0.08, 1.07, 11.865, 8)); boxA(g, x + 0.08, 1.2, 11.86, x + 0.26, 1.215, 11.875, MAT.steel());
      put(g, Cab(3.04, 0.4, C - 2.02 - 0.01, oak, { y0: 2.02, door: 0.5, handle: 'grip', led: true }), x, 9.15, 0.4, 3.04, 'E');
      // Zwei Wandtrockner, einer ausgeklappt mit Wäsche
      for (const [z, open] of [[9.3, true], [10.4, false]]) {
        boxA(g, 25.4, 1.35, z, 25.46, 1.85, z + 1.0, MAT.white());
        if (open) {
          for (let i = 0; i < 7; i++) { const zz = z + 0.08 + i * 0.14; const bar = cyl(0.006, 0.006, 0.55, MAT.steel(), 25.13, 1.62, zz, 6); bar.rotation.z = Math.PI / 2; g.add(bar); }
          boxA(g, 24.85, 1.6, z + 0.03, 25.4, 1.63, z + 0.06, MAT.white()); boxA(g, 24.85, 1.6, z + 0.94, 25.4, 1.63, z + 0.97, MAT.white());
          for (const [zz, c, l] of [[z + 0.22, '#8fb3c9', 0.45], [z + 0.5, '#f4efe6', 0.6], [z + 0.78, '#c97b63', 0.35]]) boxA(g, 24.95, 1.62 - l, zz - 0.004, 25.3, 1.62, zz + 0.004, MAT.fabric(c), true);
        }
      }
      g.add(cyl(0.2, 0.17, 0.42, MAT.fabric('#c9b28c'), 24.9, 0.21, 11.75, 20));
      Spot(g, 24.3, 9.8, C); Spot(g, 24.3, 11.3, C); tagLP(boxA(g, 23.25, 2.0, 9.2, 23.27, 2.01, 12.15, MAT.glow('#ffd9a0', 1.2), false), { name: 'LED unter den Oberschränken' });
      const p = new THREE.PointLight('#fff1dc', 1.6, 6, 2); p.position.set(24.5, 2.2, 10.7); g.add(p);
    },
  },
  spiel: {
    name: 'Großer Spielraum: kleine Turnhalle', fl: 'OG', floor: 'turf', paint: '#eef0ee', dado: { h: 1.2, c: '#9fb4c4' }, rects: [[25.69, 9.15, 31.68, 17.15]],
    open: [{ s: 'N', a: [25.9, 27.6], t: 'win', sill: 0.9, head: 2.2 }, { s: 'N', a: [28.4, 31.1], t: 'win', sill: 0.9, head: 2.2 },
      { s: 'S', a: [25.75, 26.45], t: 'gdoor', head: 2.3 }, { s: 'S', a: [26.6, 31.5], t: 'ftc', pane: 1.25 }, { s: 'W', a: [12.65, 13.67], t: 'door' }],
    view: { pos: [29.9, 16.85, 1.65], target: [27.0, 10.5, 0.9], fov: 70 }, dir: [0.6, 1],
    build(g, b, L, C) {
      // Kletterwand mit Griffen, Matte davor
      boxA(g, 25.69, 0, 9.4, 25.73, C - 0.08, 12.5, MAT.col('#e6dccb', 0.8));
      const r = rnd(9), hc = ['#e25b45', '#f2b134', '#3c8dbc', '#6fbf73', '#8e5ea2'];
      for (let i = 0; i < 70; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.035 + r() * 0.035, 10, 8), MAT.col(hc[i % 5], 0.6)); s.scale.set(0.6, 1, 1.3); s.position.set(25.735, 0.25 + r() * (C - 0.45), 9.5 + r() * 2.9); s.castShadow = true; g.add(s); }
      g.add(rbox(1.6, 0.22, 3.1, 0.05, MAT.fabric('#3b6fa0'), 26.55, 0.11, 10.95));
      // Mobile Tore mit Netz
      for (const [z, f] of [[9.45, 1], [16.25, -1]]) {
        const zb = f > 0 ? z : z + 0.6, zf = f > 0 ? z + 0.6 : z;
        for (const dx of [0, 1.2]) { g.add(cyl(0.025, 0.025, 0.8, MAT.white(), 28.08 + dx, 0.4, zf, 10)); boxA(g, 28.08 + dx - 0.02, 0, Math.min(zb, zf), 28.08 + dx + 0.02, 0.04, Math.max(zb, zf), MAT.white()); }
        const bar = cyl(0.025, 0.025, 1.2, MAT.white(), 28.68, 0.8, zf, 10); bar.rotation.z = Math.PI / 2; g.add(bar);
        const net = std('#ffffff', { transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        boxA(g, 28.08, 0, Math.min(zb, zf), 29.28, 0.8, Math.max(zb, zf), net, false);
      }
      // Hangelweg: von der Kletterwand (oben) quer durch den Raum zur Sprossenwand an der Ostwand, dort wieder runter
      const y = C - 0.25, za = 10.75, zb = 11.25;
      for (const z of [za, zb]) boxA(g, 25.75, y - 0.02, z - 0.02, 31.62, y + 0.02, z + 0.02, MAT.steel());
      for (let x = 26.0; x < 31.5; x += 0.35) { const rr = cyl(0.016, 0.016, 0.5, MAT.col('#d8a53a', 0.5), x, y, (za + zb) / 2, 8); rr.rotation.x = Math.PI / 2; g.add(rr); }
      for (const x of [27.6, 29.6, 31.4]) for (const z of [za, zb]) boxA(g, x - 0.01, y, z - 0.01, x + 0.01, C, z + 0.01, MAT.steel());
      for (const z of [10.55, 11.45]) boxA(g, 31.6, 0, z - 0.02, 31.65, y + 0.05, z + 0.02, MAT.oak());
      for (let yy = 0.15; yy < y; yy += 0.15) { const rr = cyl(0.015, 0.015, 0.9, MAT.oak(), 31.62, yy, 11.0, 8); rr.rotation.x = Math.PI / 2; g.add(rr); }
      g.add(rbox(4.1, 0.2, 1.0, 0.05, MAT.fabric('#3b6fa0'), 29.55, 0.1, 11.0));
      // Basketballkorb mobil
      g.add(rbox(0.6, 0.15, 0.9, 0.04, MAT.black(), 31.15, 0.075, 16.55)); g.add(cyl(0.04, 0.04, 2.1, MAT.steel(), 31.15, 1.05, 16.8, 10));
      boxA(g, 30.7, 1.85, 16.62, 31.6, 2.35, 16.65, MAT.glass(), false); boxA(g, 30.7, 1.85, 16.6, 31.6, 1.88, 16.66, MAT.col('#e8730c'));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 24), MAT.col('#e8730c', 0.5)); ring.rotation.x = Math.PI / 2; ring.position.set(31.15, 1.95, 16.38); g.add(ring);
      // Tennisnetz quer durch den Raum
      for (const x of [25.75, 31.62]) g.add(cyl(0.025, 0.025, 1.0, MAT.white(), x, 0.5, 13.17, 10));
      boxA(g, 25.75, 0.12, 13.165, 31.62, 0.9, 13.175, std('#2b6cb0', { transparent: true, opacity: 0.4, side: THREE.DoubleSide }), false);
      boxA(g, 25.75, 0.9, 13.15, 31.62, 0.95, 13.19, MAT.white());
      // Ballregal
      put(g, Cab(1.95, 0.4, 0.01, MAT.oak(), { plinth: 0 }), 25.7, 13.95, 0.4, 1.95, 'E');
      for (let i = 0; i <= 3; i++) boxA(g, 25.7, i * 0.48, 13.95, 26.1, i * 0.48 + 0.025, 15.9, MAT.oak());
      for (const z of [13.95, 14.92, 15.875]) boxA(g, 25.7, 0, z, 26.1, 1.47, z + 0.025, MAT.oak());
      const bc = ['#e25b45', '#f2b134', '#3c8dbc', '#ffffff', '#6fbf73', '#e8730c'];
      for (let i = 0; i < 12; i++) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.1 + (i % 3) * 0.02, 16, 12), MAT.col(bc[i % 6], 0.5)); s.position.set(25.92, 0.15 + Math.floor(i / 4) * 0.48, 14.15 + (i % 4) * 0.42); s.castShadow = true; g.add(s); }
      for (const [x, z, c] of [[28.2, 14.4, 0], [29.6, 11.6, 1], [27.4, 15.6, 2]]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), MAT.col(bc[c], 0.5)); s.position.set(x, 0.11, z); s.castShadow = true; g.add(s); }
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) Spot(g, 26.8 + i * 1.9, 12.0 + j * 3.4, C);   // nicht im Streifen der Hangelstangen (z 10,75–11,25)
      for (const [x, z] of [[27.5, 11.2], [29.6, 15.0]]) { const p = new THREE.PointLight('#fff1dc', 1.5, 7, 2); p.position.set(x, 2.2, z); g.add(p); }
      Curtain(wallGroup(b, 'N', 9.15), 'N', 25.75, 31.65, 9.15, C); Curtain(wallGroup(b, 'S', 17.15), 'S', 25.75, 31.6, 17.15, C);
    },
  },
};
// Kinderzimmer (Raum-Meter, Ursprung oben links) ---------------------------------------
function kidsRoom(g, b, L, C, k) {
  const sage = MAT.col(SAGE, 0.6), oak = MAT.oakL();
  put(g, Rug(...k.rug.slice(2), k.rugC, null), ...k.rug, 'S');
  const [bx, bz, bw, bd, bf] = k.bed, [bW, bD] = LW(bw, bd, bf);
  put(g, Bed(bW, bD, { frame: '#d6cab6', head: '#c7b9a3', hbH: k.hbH || 0.01, duvet: k.duvet, throw: k.accent, cushion: k.accent2 }), bx, bz, bw, bd, bf);
  if (k.head) { const [hx, hz, hw, hd, hf, hh] = k.head; const [W] = LW(hw, hd, hf); const p = new THREE.Group(); const n = Math.max(2, Math.round(W / 0.38)); for (let i = 0; i < n; i++) p.add(rbox(W / n - 0.012, hh, 0.07, 0.025, MAT.fabric('#c7b9a3'), -W / 2 + (i + 0.5) * W / n, 0.08 + hh / 2, 0)); put(g, p, hx, hz, hw, hd, hf); }
  if (k.lamBed) { const [lx, lz, lw, ld, lf] = k.lamBed; put(g, Lamellas(LW(lw, ld, lf)[0], C, oak, { led: true }), lx, lz, lw, ld, lf); }
  { const [nx, nz, nw, nd, nf] = k.nt; put(g, Nightstand(LW(nw, nd, nf)[0], LW(nw, nd, nf)[1], sage, { lamp: k.accent, led: true }), nx, nz, nw, nd, nf); }
  { const [tx, tz, tw, td, tf] = k.tvLam; put(g, Lamellas(LW(tw, td, tf)[0], C, oak, { led: true }), tx, tz, tw, td, tf); }
  { const [lx, lz, lw, ld, lf] = k.low; const [W, D] = LW(lw, ld, lf); put(g, Cab(W, D, 0.4, sage, { y0: 0.25, door: W / 2, handle: 'grip', led: true }), lx, lz, lw, ld, lf); put(g, TV(1.0), ...k.tv, lf, 1.25); }
  { const [wx, wz, ww, wd, wf] = k.ward; const [W, D] = LW(ww, wd, wf); put(g, Cab(W, D, C - 0.02, sage, { door: W / Math.max(2, Math.round(W / 0.55)), handle: 'knob', hm: MAT.oak() }), wx, wz, ww, wd, wf); }
  { const [dx, dz, dw, dd, df] = k.desk; const [W, D] = LW(dw, dd, df); put(g, Desk(W, D, oak, sage, { wall: true, lamp: k.accent, laptop: true }), dx, dz, dw, dd, df);
    if (k.deskShelf) for (const y of [1.35, 1.75]) { const s = new THREE.Group(); boxA(s, -W / 2, 0, -D / 2, W / 2, 0.025, -D / 2 + 0.25, oak); books(s, -W / 2 + 0.05, W / 2 - 0.3, 0.025, -D / 2 + 0.02, -D / 2 + 0.22, (y * 100) | 0); s.add(Plant(0.2, '#e9e2d6', 4).translateX(W / 2 - 0.15).translateZ(-D / 2 + 0.12)); s.children[s.children.length - 1].scale.set(0.45, 0.45, 0.45); put(g, s, dx, dz, dw, dd, df, y); } }
  put(g, OfficeChair(k.accent), k.chair[0] - 0.25, k.chair[1] - 0.25, 0.5, 0.5, k.chair[2]);
  const bb = Beanbag(k.bean[2], k.accent2); bb.position.set(k.bean[0], 0, k.bean[1]); g.add(bb);
  put(g, Picture(0.5, 0.65, k.art), ...k.pic, 1.45);
  // Lichtvoute rundum und Spots
  for (const w of b.walls) { const along = w.side === 'N' || w.side === 'S', i = (w.side === 'N' || w.side === 'W') ? 0.03 : -0.03;
    if (along) tagLP(boxA(g, w.a0 + 0.05, C - 0.07, w.line + i - 0.006, w.a1 - 0.05, C - 0.06, w.line + i + 0.006, MAT.glow('#ffd9a0', 1.5), false), { name: 'Lichtvoute rundum' });
    else tagLP(boxA(g, w.line + i - 0.006, C - 0.07, w.a0 + 0.05, w.line + i + 0.006, C - 0.06, w.a1 - 0.05, MAT.glow('#ffd9a0', 1.5), false), { name: 'Lichtvoute rundum' }); }
  for (const [x, z] of k.spots) Spot(g, x, z, C);
  const p = new THREE.PointLight('#ffe8c8', 1.8, 7, 2); p.position.set(b.center[0], 2.1, b.center[1]); g.add(p);
  for (const c of k.curt) Curtain(wallGroup(b, c[0], c[3]), ...c, C);
}
const KIDS = {
  kind1: { wacc: [{ s: 'N', at: 0, c: '#d9dfcf' }], name: 'Kinderzimmer 1', rects: [[0, 0, 4.39, 2.16], [0, 2.16, 4.26, 4.10]],
    open: [{ s: 'S', a: [0.79, 3.47], t: 'ftc', pane: 1.35 }, { s: 'N', a: [1.30, 2.17], t: 'door' }],
    rug: [0.80, 1.00, 2.70, 2.40], rugC: '#e6dccb', bed: [2.39, 0.55, 2.00, 1.40, 'W'], lamBed: [4.32, 0.05, 0.07, 2.06, 'W'], nt: [3.87, 0.08, 0.45, 0.40, 'S'],
    tvLam: [0, 0.35, 0.06, 1.95, 'E'], low: [0.06, 0.75, 0.40, 1.20, 'E'], tv: [0.06, 0.85, 0.03, 1.0], ward: [0, 2.35, 0.60, 1.75, 'E'],
    desk: [3.66, 2.40, 0.60, 1.60, 'W'], deskShelf: true, chair: [3.26, 3.20, 'E'], bean: [1.30, 3.30, 0.42], pic: [0.4, 0.0, 0.5, 0.03, 'S'],
    duvet: '#eef0ea', accent: '#d8a53a', accent2: '#7d8a74', art: 3, spots: [[1.2, 1.2], [3.2, 1.2], [1.2, 3.2], [3.2, 3.2]], curt: [['S', 0.79, 3.47, 4.10]],
    view: { pos: [1.75, 0.45, 1.5], target: [3.0, 2.6, 0.8], fov: 74 }, dir: [-0.3, 1] },
  kind2: { wacc: [{ s: 'N', at: 0, c: '#c6d2db' }], name: 'Kinderzimmer 2', rects: [[0, 0, 4.5, 4.0]],
    open: [{ s: 'N', a: [0.94, 3.79], t: 'win', sill: 0.9, head: 2.25 }, { s: 'S', a: [1.98, 2.85], t: 'door' }],
    rug: [0.30, 2.20, 3.30, 1.20], rugC: '#dfe4e8', bed: [0, 0.08, 1.40, 2.00, 'S'], head: [0, 0, 2.30, 0.07, 'S', 0.78], nt: [1.45, 0.08, 0.45, 0.30, 'S'],
    tvLam: [0.05, 3.94, 1.85, 0.06, 'N'], low: [0.37, 3.54, 1.20, 0.40, 'N'], tv: [0.47, 3.90, 1.0, 0.03], ward: [3.90, 1.70, 0.60, 2.30, 'W'],
    desk: [3.90, 0.05, 0.60, 1.60, 'W'], deskShelf: false, chair: [3.50, 0.85, 'E'], bean: [3.05, 2.85, 0.42], pic: [0.0, 1.0, 0.03, 0.5, 'E'],
    duvet: '#e9eef2', accent: '#5f7f99', accent2: '#c9a06a', art: 2, spots: [[1.1, 1.0], [3.3, 1.0], [1.1, 3.0], [3.3, 3.0]], curt: [['N', 0.94, 3.79, 0]],
    view: { pos: [2.4, 3.7, 1.5], target: [2.3, 0.4, 0.85], fov: 76 }, dir: [0.4, 1] },
  kind3: { wacc: [{ s: 'N', at: 0, c: '#e1c3b0' }], name: 'Kinderzimmer 3', rects: [[0, 0, 4.37, 4.02]],
    open: [{ s: 'N', a: [0.12, 1.68], t: 'win', sill: 0.9, head: 2.25 }, { s: 'W', a: [0.12, 1.70], t: 'win', sill: 0.9, head: 2.25 }, { s: 'S', a: [1.60, 2.47], t: 'door' }],
    rug: [0.85, 1.0, 2.0, 2.3], rugC: '#eadfd3', bed: [2.97, 0.08, 1.40, 2.0, 'S'], head: [2.45, 0, 1.92, 0.07, 'S', 1.05], nt: [2.50, 0.08, 0.45, 0.30, 'S'],
    tvLam: [2.60, 3.96, 1.75, 0.06, 'N'], low: [2.87, 3.56, 1.20, 0.40, 'N'], tv: [2.97, 3.92, 1.0, 0.03], ward: [0, 1.80, 0.60, 2.15, 'E'],
    desk: [0.05, 0.10, 0.60, 1.60, 'E'], deskShelf: false, chair: [1.0, 0.90, 'W'], bean: [1.50, 2.75, 0.42], pic: [4.34, 2.4, 0.03, 0.5, 'W'],
    duvet: '#f2ebe4', accent: '#b5653f', accent2: '#8a9a7b', art: 1, spots: [[1.1, 1.0], [3.3, 1.0], [1.1, 3.0], [3.3, 3.0]], curt: [['N', 0.12, 1.68, 0], ['W', 0.12, 1.70, 0]],
    view: { pos: [2.05, 3.7, 1.5], target: [2.0, 0.4, 0.85], fov: 76 }, dir: [0.4, 1] },
  kind4: { wacc: [{ s: 'S', at: 4.25, c: '#e8d6a8' }], name: 'Kinderzimmer 4', rects: [[0, 0, 2.35, 4.25], [2.35, 0.16, 4.25, 4.25]],
    open: [{ s: 'S', a: [0.12, 1.90], t: 'win', sill: 0.9, head: 2.25 }, { s: 'W', a: [2.79, 4.13], t: 'win', sill: 0.9, head: 2.25 }, { s: 'N', a: [1.21, 2.08], t: 'door' }],
    rug: [0.85, 0.96, 2.0, 2.3], rugC: '#efe4cc', bed: [2.85, 2.17, 1.40, 2.0, 'N'], head: [2.33, 4.18, 1.92, 0.07, 'N', 1.05], nt: [2.38, 3.87, 0.45, 0.30, 'N'],
    tvLam: [2.45, 0.16, 1.75, 0.06, 'S'], low: [2.70, 0.22, 1.25, 0.40, 'S'], tv: [2.82, 0.24, 1.0, 0.03], ward: [0, 0.06, 0.60, 2.40, 'E'],
    desk: [0.05, 2.61, 0.60, 1.60, 'E'], deskShelf: false, chair: [1.0, 3.43, 'W'], bean: [1.60, 1.56, 0.42], pic: [4.22, 1.6, 0.03, 0.5, 'W'],
    duvet: '#f3eee2', accent: '#c99a3a', accent2: '#5f7f99', art: 0, spots: [[1.1, 1.1], [3.2, 1.1], [1.1, 3.2], [3.2, 3.2]], curt: [['S', 0.12, 1.90, 4.25], ['W', 2.79, 4.13, 0]],
    view: { pos: [1.65, 0.45, 1.5], target: [3.0, 3.4, 0.8], fov: 76 }, dir: [-0.4, -1] },
};
for (const id in KIDS) ROOMS[id] = { ...KIDS[id], fl: 'OG', floor: 'plank', build(g, b, L, C) { kidsRoom(g, b, L, C, KIDS[id]); } };

function Car(Lg, W, c) {                          // Auto vereinfacht, Front nach +Z
  const g = new THREE.Group(), lack = mat('car' + c, () => std(c, { metalness: 0.5, roughness: 0.3 })), win = MAT.col('#56636d', 0.12);
  g.add(rbox(W, 0.5, Lg, 0.09, lack, 0, 0.6, 0));                                     // Karosserie unten
  g.add(rbox(W - 0.06, 0.16, Lg * 0.34, 0.08, lack, 0, 0.88, Lg * 0.3));            // Motorhaube leicht erhöht
  g.add(rbox(W - 0.26, 0.46, Lg * 0.5, 0.1, win, 0, 1.08, -Lg * 0.08));             // Fensterband
  g.add(rbox(W - 0.32, 0.07, Lg * 0.4, 0.05, lack, 0, 1.33, -Lg * 0.09));           // Dach
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const w = cyl(0.34, 0.34, 0.24, MAT.col('#1b1b1b', 0.8), sx * (W / 2 - 0.13), 0.34, sz * (Lg / 2 - 0.8), 24); w.rotation.z = Math.PI / 2; g.add(w);
    const r = cyl(0.2, 0.2, 0.25, MAT.steel(), sx * (W / 2 - 0.13), 0.34, sz * (Lg / 2 - 0.8), 16); r.rotation.z = Math.PI / 2; g.add(r); }
  boxA(g, -W / 2 + 0.12, 0.7, Lg / 2 - 0.03, -W / 2 + 0.45, 0.76, Lg / 2 + 0.005, MAT.glow('#f4f1e8', 1.0), false); boxA(g, W / 2 - 0.45, 0.7, Lg / 2 - 0.03, W / 2 - 0.12, 0.76, Lg / 2 + 0.005, MAT.glow('#f4f1e8', 1.0), false);
  boxA(g, -W / 2 + 0.1, 0.74, -Lg / 2 - 0.005, W / 2 - 0.1, 0.79, -Lg / 2 + 0.03, MAT.glow('#c0392b', 0.8), false);
  return g;
}
function Rbench(W, D, c) {                       // Polsterbank am Bettende
  const g = new THREE.Group();
  for (const sx of [-1, 1]) boxA(g, sx * W / 2 - (sx > 0 ? 0.04 : 0), 0, -D / 2, sx * W / 2 + (sx < 0 ? 0.04 : 0), 0.4, D / 2, MAT.walnut());
  g.add(rbox(W, 0.1, D, 0.04, MAT.fabric(c), 0, 0.45, 0));
  return g;
}
function kamin(g, C, x, z, w, d) {               // Tunnelkamin in der Wand Essen/Wohnen, von beiden Seiten sichtbar
  const m = MAT.col('#3a3633', 0.85);
  boxA(g, x, 0, z, x + w, 0.45, z + d, m); boxA(g, x, 1.05, z, x + w, C, z + d, m);
  boxA(g, x, 0.45, z, x + w, 1.05, z + 0.12, m); boxA(g, x, 0.45, z + d - 0.12, x + w, 1.05, z + d, m);
  boxA(g, x + 0.04, 0.45, z + 0.12, x + w - 0.04, 0.5, z + d - 0.12, MAT.col('#1a1817', 0.9));
  const fire = new THREE.MeshStandardMaterial({ color: '#2a1a10', emissive: '#ff7a2a', emissiveIntensity: 1.8 });
  for (let i = 0; i < 5; i++) { const f = new THREE.Mesh(new THREE.ConeGeometry(0.06 + (i % 2) * 0.03, 0.25 + (i % 3) * 0.08, 8), fire); f.position.set(x + w / 2, 0.62 + (i % 3) * 0.03, z + 0.3 + i * (d - 0.6) / 4); g.add(f); }
  for (const xx of [x - 0.001, x + w + 0.001]) boxA(g, xx - 0.002, 0.45, z + 0.12, xx + 0.002, 1.05, z + d - 0.12, MAT.glass(), false);
  boxA(g, x - 0.2, 0, z - 0.1, x + w + 0.2, 0.06, z + d + 0.1, MAT.col('#4a4541', 0.7));
  const p = new THREE.PointLight('#ff9a50', 1.4, 4, 2); p.position.set(x + w + 0.4, 0.8, z + d / 2); g.add(p);
}
function stairs(g, x0, z0, x1, z1, C) {           // Betonblock mit Eichenauflagen (links Stufen, rechts Sitzstufen), Podest im Norden,
  const w = x1 - x0, half = w / 2, con = MAT.concrete(), oak = MAT.oak(), zt = z1 - 1.8;   // Holzlauf rechts zurück nach Süden hoch zur Galerie
  for (let i = 0; i < 6; i++) { const h = 0.18 * (i + 1), zz = z1 - 0.3 * i; boxA(g, x0, 0, zz - 0.3, x0 + half, h - 0.03, zz, con); boxA(g, x0, h - 0.03, zz - 0.32, x0 + half, h, zz, oak); tagLP(boxA(g, x0 + 0.02, h - 0.045, zz - 0.006, x0 + half - 0.02, h - 0.035, zz, MAT.glow('#ffd9a0', 1.2), false), { name: 'Stufenlicht' }); }
  for (let i = 0; i < 3; i++) { const h = 0.36 * (i + 1), zz = z1 - 0.6 * i; boxA(g, x0 + half, 0, zz - 0.6, x1, h - 0.03, zz, con); boxA(g, x0 + half, h - 0.03, zz - 0.62, x1, h, zz, oak); }
  g.add(rbox(0.5, 0.08, 0.45, 0.03, MAT.fabric('#c9a06a'), x0 + half + 0.4, 0.4, z1 - 0.3)); g.add(rbox(0.5, 0.08, 0.45, 0.03, MAT.fabric('#7d8a74'), x0 + half + 0.75, 0.76, z1 - 0.9));
  boxA(g, x0, 0, z0, x1, 1.05, zt, con); boxA(g, x0, 1.05, z0, x1, 1.08, zt, oak);          // Podest
  const n = 12, rise = (C + SLAB - 1.08) / n, run = 0.268, za = 12.45 - (n - 1) * run, xa = x0 + half;
  for (let i = 0; i < n - 1; i++) { const h = 1.08 + rise * (i + 1), zz = za + i * run; boxA(g, xa + 0.04, h - 0.05, zz, x1 - 0.02, h, zz + run + 0.02, oak); }
  const len = Math.hypot((n - 1) * run, C + SLAB - 1.08), ang = Math.atan2(C + SLAB - 1.08, (n - 1) * run);
  for (const xx of [xa, x1 - 0.04]) { const st = box(0.04, 0.22, len, MAT.black(), xx + 0.02, 1.08 + (C + SLAB - 1.08) / 2 - 0.12, za + (n - 1) * run / 2); st.rotation.x = -ang; g.add(st); }
  const gl = box(0.012, 0.9, len, MAT.glass(), xa + 0.01, 1.08 + (C + SLAB - 1.08) / 2 + 0.45, za + (n - 1) * run / 2, false); gl.rotation.x = -ang; g.add(gl);
  const hr = box(0.05, 0.04, len, MAT.oak(), xa + 0.01, 1.08 + (C + SLAB - 1.08) / 2 + 0.92, za + (n - 1) * run / 2); hr.rotation.x = -ang; g.add(hr);
  const lh = (z) => Math.min(1.08, 0.18 * Math.ceil((z1 - z) / 0.3));
  for (const z of [11.0, 10.4, 9.6, 8.9]) Sconce(g, 'W', x0, z, lh(z) + 1.0);   // Wandleuchten entlang der Treppe (Elektroplan)
}
// Raum bauen ---------------------------------------------------------------------------
export function buildRoom(_data, rid) {
  const R = ROOMS[rid], C = CEIL[R.fl];
  const xs = R.rects.flatMap(r => [r[0], r[2]]), zs = R.rects.flatMap(r => [r[1], r[3]]);
  const bx0 = Math.min(...xs), bx1 = Math.max(...xs), bz0 = Math.min(...zs), bz1 = Math.max(...zs);
  const g = new THREE.Group(), built = { group: g, walls: [], ceilings: [], room: { id: rid, name: R.name, fl: R.fl }, C, center: [(bx0 + bx1) / 2, (bz0 + bz1) / 2], size: [bx1 - bx0, bz1 - bz0] };
  shell(g, R, C, built);
  R.build(g, built, { n: 0 }, C);
  // Hohe Möbel und Wandteile direkt an einer Wand gehören zu ihr: in der Ansicht von oben verschwinden sie mit
  const wallSet = new Set(built.walls.map(w => w.grp)), bb = new THREE.Box3();
  for (const w of built.walls) w.extra = [];
  for (const c of g.children) {
    if (wallSet.has(c) || built.ceilings.includes(c) || c.isLight || c.userData.keep) continue;
    bb.setFromObject(c); if (bb.isEmpty() || bb.max.y - Math.max(bb.min.y, 0) < 1.3 || bb.min.y < -0.5) continue;
    let best = null, bo = 0.05;                   // die Wand, an der das Teil am längsten entlangläuft
    for (const w of built.walls) {
      const along = w.side === 'N' || w.side === 'S', [p0, p1] = along ? [bb.min.z, bb.max.z] : [bb.min.x, bb.max.x], [u0, u1] = along ? [bb.min.x, bb.max.x] : [bb.min.z, bb.max.z];
      const dist = (w.side === 'N' || w.side === 'W') ? p0 - w.line : w.line - p1, ov = Math.min(u1, w.a1) - Math.max(u0, w.a0);
      if (dist > -0.05 && dist < 0.75 && ov > bo) { best = w; bo = ov; }
    }
    if (best) best.extra.push(c);
  }
  return built;
}
export const ROOM_IDS = Object.keys(ROOMS);
export function roomInfo(rid) { const R = ROOMS[rid]; return { name: R.name, fl: R.fl, rects: R.rects, voids: R.voids || [], view: R.view }; }   // für das Gesamtmodell
// Lichtplan: alle Leuchten eines Raums mit Lage, Höhe und Länge, dazu Grundriss, Wände und Türen
export function lightPoints(rid) {
  const R = ROOMS[rid], b = buildRoom(null, rid), out = [], bb = new THREE.Box3();
  b.group.updateMatrixWorld(true);
  b.group.traverse(o => {
    let lp = o.userData.lp;
    if (!lp && o.isMesh && o.material && o.material.emissive && o.material.color.getHexString() === 'ffd9a0') lp = { t: 'led' };
    if (!lp) return;
    bb.setFromObject(o); const c = bb.getCenter(new THREE.Vector3()), sz = bb.getSize(new THREE.Vector3());
    if (lp.t === 'steh' || lp.t === 'tisch') o.getWorldPosition(c);   // Fuß der Leuchte, dort kommt die Steckdose hin
    out.push({ ...lp, x: +c.x.toFixed(3), z: +c.z.toFixed(3), y: +c.y.toFixed(3), y1: +bb.max.y.toFixed(3), x0: +bb.min.x.toFixed(3), x1: +bb.max.x.toFixed(3), z0: +bb.min.z.toFixed(3), z1: +bb.max.z.toFixed(3), sx: +sz.x.toFixed(3), sz: +sz.z.toFixed(3) });
  });
  return { id: rid, name: R.name, fl: R.fl, C: b.C, rects: R.rects, voids: R.voids || [], open: R.open || [], walls: b.walls.map(w => ({ side: w.side, line: w.line, a0: w.a0, a1: w.a1 })), lights: out };
}

export function makeRenderer(canvas, w, h) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(w, h, false);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
  r.outputColorSpace = THREE.SRGBColorSpace;
  return r;
}
export function makeScene(built) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#e9eef0');
  scene.add(built.group);
  scene.add(new THREE.HemisphereLight('#fffaf0', '#cbbfae', 0.95));
  const [cx, cz] = built.center, s = Math.max(...built.size) + 2;
  const sun = new THREE.DirectionalLight('#fff4e2', 1.6);
  sun.position.set(cx - 3, 9, cz + 8); sun.target.position.set(cx, 0, cz); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -s, right: s, top: s, bottom: -s, near: 1, far: 40 });
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  return scene;
}
// Ansicht: 'model' = schräg von oben ohne Decke und ohne die Wände zur Kamera, 'eye' = Augenhöhe
export function setMode(built, mode, camPos) {
  const model = mode === 'model';
  built.ceilings.forEach(c => (c.visible = !model));
  for (const w of built.walls) {
    const dx = camPos.x - w.mid[0], dz = camPos.z - w.mid[1];
    w.grp.visible = !(model && dx * w.n[0] + dz * w.n[1] > 0.3);
  }
  for (const w of built.walls) for (const c of w.extra || []) c.visible = true;
  for (const w of built.walls) if (!w.grp.visible) for (const c of w.extra || []) c.visible = false;
}
export const VIEWS = Object.fromEntries(Object.entries(ROOMS).map(([k, r]) => [k, r.view]));
export function eyeCam(rid, w, h) {
  const v = VIEWS[rid], c = new THREE.PerspectiveCamera(v.fov, w / h, 0.05, 80);
  c.position.set(v.pos[0], v.pos[2], v.pos[1]); c.lookAt(v.target[0], v.target[2], v.target[1]); return c;
}
export function modelCam(built, w, h) {
  const [cx, cz] = built.center, [sw, sd] = built.size, s = Math.max(sw * 0.8, sd, 3.6) * (ROOMS[built.room.id].zoom || 1);
  const [dx, dz] = ROOMS[built.room.id].dir || [0.5, 1];
  const c = new THREE.PerspectiveCamera(40, w / h, 0.1, 120);
  c.position.set(cx + dx * s * 0.55, s * 1.7 + 1.5, cz + dz * s * 0.9); c.lookAt(cx, 0.4, cz); return c;
}
