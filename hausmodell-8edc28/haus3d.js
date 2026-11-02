// Gesamtmodell Haus Montabaur (02.11.2026): Garten, Fassade, alle Räume, Küche und Bäder in einer Szene.
// Welt-Koordinaten = Gartenplan: x nach Osten, z nach Süden, Ursprung Garagen-Westwand/Nordkante, y = Höhe über Gelände.
// Die Teilmodelle bleiben, wie sie sind (raum3d.js, kueche3d.js, baeder3d.js, garten3d.js); hier werden sie nur verschoben.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as R3 from './raum3d.js?v=7';
import * as K3 from './kueche3d.js?v=4';
import * as B3 from './baeder3d.js?v=3';
import { buildGarden } from './garten3d.js?v=7';

export const EG_Y = 0.10;                          // Fußboden EG über Gelände (Terrasse liegt bei +0,16 → bündig genug)
export const OG_Y = EG_Y + R3.CEIL.EG + 0.30;      // 3,25 = OK FFB OG laut Bauantrag
// EG-Blatt (Plan-Meter der Elektro-Grundrisse) → Garten: Garagentor und Haustür liegen damit genau auf dem Gartenplan.
// OG-Blatt → EG-Blatt: x + 1,012, z − 0,644 (Ost- und Nordwand aus waende.json).
const T = { EG: [-11.70, -5.19], OG: [1.012 - 11.70, -0.644 - 5.19] };
export const toWorld = (fl, x, z) => [x + T[fl][0], z + T[fl][1]];
// Kinderzimmer sind in eigenen Raum-Metern gebaut: Lage der Innenecke Nordwest im OG-Blatt (aus den Wandlücken der Türen)
const KIDPOS = { kind3: [9.07, 9.12], kind2: [16.2, 9.12], kind4: [9.07, 14.88], kind1: [16.2, 15.03] };
// Bäder (sanitaer3.py, Ursprung Innenecke Nordwest) und Küche (Ursprung Innenecke Garagenwand/Abstellraumwand)
const BATHPOS = { eltern: ['EG', 24.295, 8.476], gwc: ['EG', 14.432, 15.485], k964: ['OG', 13.57, 9.12], k1060: ['OG', 13.57, 14.63] };
const KUECHE = ['EG', 17.714, 10.256];
const ROOMNAME = { eltern: 'Elternbad', gwc: 'Gäste-WC', k964: 'Kinderbad OG (9,64 m²)', k1060: 'Kinderbad OG (10,60 m²)' };

function stripLights(o) {
  const out = []; o.traverse(c => { if (c.isLight) out.push(c); }); out.forEach(l => l.parent.remove(l));
}
const viewWorld = (v, fl, ox, oz) => {
  if (!v) return null;
  const y = fl === 'OG' ? OG_Y : EG_Y, [px, pz] = toWorld(fl, v.pos[0] + ox, v.pos[1] + oz), [tx, tz] = toWorld(fl, v.target[0] + ox, v.target[1] + oz);
  return { pos: [px, v.pos[2] + y, pz], target: [tx, v.target[2] + y, tz], fov: v.fov || 66 };
};

export function buildHouse(scene) {
  R3.OPTS.haus = true; R3.OPTS.tuerenOffen = true;   // doppelte Galerie/Rutsche/Kamin weglassen, Zimmertüren offen (und unten ganz entfernt)
  const rooms = [], parts = [];                    // parts: { fl, obj, ceilings:Set }
  // ---------- Räume aus raum3d.js
  for (const id of R3.ROOM_IDS) {
    const info = R3.roomInfo(id), b = R3.buildRoom(null, id), [ox, oz] = KIDPOS[id] || [0, 0], fl = info.fl;
    const [wx, wz] = toWorld(fl, ox, oz);
    b.group.position.set(wx, fl === 'OG' ? OG_Y : EG_Y, wz);
    stripLights(b.group); scene.add(b.group);
    parts.push({ fl, obj: b.group, ceilings: new Set(b.ceilings) });
    rooms.push({ id, name: info.name, fl, view: viewWorld(info.view, fl, ox, oz),
      rects: info.rects.map(r => [...toWorld(fl, r[0] + ox, r[1] + oz), ...toWorld(fl, r[2] + ox, r[3] + oz)]) });
  }
  // ---------- Bäder
  for (const [id, [fl, sx, sz]] of Object.entries(BATHPOS)) {
    const b = B3.BATHS[id](), [wx, wz] = toWorld(fl, sx, sz);
    b.root.position.set(wx, fl === 'OG' ? OG_Y : EG_Y, wz);
    b.root.traverse(m => { if (m.userData.cutHide) m.visible = false; });   // 02.11.: Badtüren weg, damit man frei durchgeht
    b.marks.forEach(m => (m.visible = false));
    stripLights(b.root); scene.add(b.root);
    parts.push({ fl, obj: b.root, ceilings: new Set(b.ceilings) });
    const [x0, z0, x1, z1] = b.bounds;
    rooms.push({ id: 'bad_' + id, name: ROOMNAME[id], fl, view: viewWorld(b.views['Blick von der Tür'], fl, sx, sz),
      rects: [[...toWorld(fl, sx + x0, sz + z0), ...toWorld(fl, sx + x1, sz + z1)]] });
  }
  // ---------- Küche mit Speisekammer (ohne Essplatz und Treppe, die kommen aus dem Raummodell)
  {
    K3.OPTS.haus = true;
    const r = K3.kitchen(), [fl, sx, sz] = KUECHE, [wx, wz] = toWorld(fl, sx, sz);
    r.root.position.set(wx, EG_Y, wz); r.marks.forEach(m => (m.visible = false));
    stripLights(r.root); scene.add(r.root);
    parts.push({ fl, obj: r.root, ceilings: new Set(r.ceilings) });
    rooms.push({ id: 'kueche', name: 'Küche und Speisekammer', fl, view: viewWorld(r.views['Vom Eingang'], fl, sx, sz),
      rects: [[...toWorld(fl, sx, sz), ...toWorld(fl, sx + 3.88, sz + 1.69)], [...toWorld(fl, sx, sz - 2.15), ...toWorld(fl, sx + 3.88, sz)]] });
  }
  // ---------- Garten und Fassade
  const garden = new THREE.Group(); scene.add(garden);
  const G = buildGarden(garden);

  // ---------- Zusammenfassen: gleiche Materialien je Ebene in wenige Meshes, sonst sind es zehntausende Zeichenaufrufe
  scene.updateMatrixWorld(true);
  const buckets = {};                              // key → Map(material → [geometry])
  const keep = [];                                 // Linien, Sprites, Instanzen: einzeln behalten
  const box3 = new THREE.Box3();
  const visibleChain = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const doors = [];                                // Türen bleiben einzeln, damit sie sich drehen lassen
  const mirror = new THREE.MeshStandardMaterial({ color: '#c6d0d3', roughness: 0.12, metalness: 0.25, envMapIntensity: 1.4, side: THREE.DoubleSide });   // hell statt Vollmetall: Vollmetall spiegelt hier nur Dunkles
  const inDoor = o => { for (let p = o; p; p = p.parent) if (p.userData.door) return true; return false; };
  for (const { fl, obj, ceilings } of parts) {
    const ceilMeshes = new Set(); ceilings.forEach(c => c && c.traverse(m => ceilMeshes.add(m)));
    const mine = [];
    obj.traverse(m => { if (m.userData.door) mine.push(m); });
    obj.traverse(m => {
      if (!visibleChain(m) || inDoor(m)) return;
      if (m.isMesh && m.material && m.material.type === 'ShaderMaterial' && m.material.uniforms && m.material.uniforms.tDiffuse) m.material = mirror;
      if (m.isMesh && m.material && m.material.metalness > 0.9 && m.material.roughness < 0.1) m.material = mirror;   // Vollmetall-Spiegel (MAT.mirror) wirkt hier ebenfalls schwarz   // Reflector-Spiegel: im Gesamtmodell als Metallspiegel (sonst schwarz)
      if (m.isLine || m.isSprite || m.isInstancedMesh || m.isPoints) { keep.push({ fl, m }); return; }
      if (!m.isMesh || Array.isArray(m.material)) return;
      let cat = 'body';
      if (ceilMeshes.has(m)) cat = 'ceil';
      else if (fl === 'EG') { box3.setFromObject(m); if (box3.min.y > EG_Y + R3.CEIL.EG - 0.05) cat = 'upper'; }   // Galerie, Brüstungen im OG
      let g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.applyMatrix4(m.matrixWorld);
      const key = fl + '|' + cat; (buckets[key] ||= new Map());
      const list = buckets[key].get(m.material) || []; list.push(g); buckets[key].set(m.material, list);
    });
    for (const d of mine) {
      if (!d.userData.door.cab) { d.parent.remove(d); continue; }   // 02.11.: alle Türblätter weg (Zimmer, Haustür innen, Speisekammer, Geheimtür), damit man frei durchgeht; Schranktüren bleiben
      scene.attach(d); d.userData.fl = fl; doors.push(d);
    }
    obj.parent.remove(obj);
  }
  const layers = {};                               // 'EG|body' → Group
  for (const [key, map] of Object.entries(buckets)) {
    const grp = new THREE.Group(); grp.name = key; layers[key] = grp; scene.add(grp);
    for (const [mat, geos] of map) {
      const merged = mergeGeometries(geos, false); if (!merged) continue;
      const me = new THREE.Mesh(merged, mat); me.castShadow = !mat.transparent; me.receiveShadow = true; me.matrixAutoUpdate = false; grp.add(me);
      geos.forEach(g => g.dispose());
    }
  }
  for (const { fl, m } of keep) {
    const key = fl + '|body', grp = layers[key] || (layers[key] = Object.assign(new THREE.Group(), { name: key }));
    if (!grp.parent) scene.add(grp);
    const w = m.matrixWorld.clone();             // stammt noch aus scene.updateMatrixWorld oben
    if (m.parent) m.parent.remove(m); w.decompose(m.position, m.quaternion, m.scale); grp.add(m);
  }
  for (const d of doors) { const key = d.userData.fl + '|body'; (layers[key] || scene).attach(d); d.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); }
  return { rooms, layers, garden, G, doors };
}

// Raum an einem Punkt finden (für Antippen und Rundgang)
export function roomAt(rooms, fl, x, z) {             // bei Überlappung (Küche im offenen Wohnbereich) gewinnt der kleinere Raum
  const fl2 = ([a, b, c, d]) => Math.abs((c - a) * (d - b)), area = r => r.rects.reduce((s, q) => s + fl2(q), 0);
  return rooms.filter(r => r.fl === fl && r.rects.some(([a, b, c, d]) => x >= Math.min(a, c) && x <= Math.max(a, c) && z >= Math.min(b, d) && z <= Math.max(b, d)))
    .sort((p, q) => area(p) - area(q))[0];
}
export function insidePoly(pts, x, z) {
  let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > z) !== (yj > z) && x < (xj - xi) * (z - yi) / (yj - yi) + xi) c = !c; } return c;
}
