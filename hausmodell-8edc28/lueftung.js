// Zentrale Lüftung mit Wärmerückgewinnung (Tecalor-Planung 28.10.: „mit Lüftung, WRG 80 %“) – Vorschlag 02.11.2026, kein Lüftungsplan vorhanden.
// Zuluft in Wohn-, Schlaf- und Arbeitsräume, Abluft aus Bädern, WC, Küche, Speisekammer und HWR; Flure sind Überströmzone (Türen mit 1 cm Luftspalt).
// Koordinaten im Blatt des Geschosses (EG-Blatt bzw. OG-Blatt, Meter), Ventile Ø 12,5 cm an der Decke. m3h = grobe Nennlüftung, rechnet der Lüftungsbauer nach DIN 1946-6.
import * as THREE from 'three';

export const VENTILE = [
  // EG
  { fl: 'EG', raum: 'Wohnen', typ: 'zu', x: 28.4, z: 18.9, m3h: 25 }, { fl: 'EG', raum: 'Wohnen', typ: 'zu', x: 31.4, z: 16.0, m3h: 25 },
  { fl: 'EG', raum: 'Essen', typ: 'zu', x: 19.1, z: 13.4, m3h: 30 },
  { fl: 'EG', raum: 'Küche', typ: 'ab', x: 17.9, z: 10.6, m3h: 50 },
  { fl: 'EG', raum: 'Speisekammer', typ: 'ab', x: 19.6, z: 9.3, m3h: 20 },
  { fl: 'EG', raum: 'Eltern', typ: 'zu', x: 31.6, z: 9.9, m3h: 30 },
  { fl: 'EG', raum: 'Elternbad', typ: 'ab', x: 26.0, z: 9.6, m3h: 50 },
  { fl: 'EG', raum: 'Gäste-WC', typ: 'ab', x: 15.3, z: 16.9, m3h: 25 },
  { fl: 'EG', raum: 'Büro', typ: 'zu', x: 11.3, z: 16.3, m3h: 20 },
  { fl: 'EG', raum: 'Hobby', typ: 'zu', x: 14.6, z: 19.0, m3h: 25 },
  // OG
  { fl: 'OG', raum: 'Kind 3', typ: 'zu', x: 10.67, z: 10.62, m3h: 20 }, { fl: 'OG', raum: 'Kind 2', typ: 'zu', x: 18.8, z: 10.52, m3h: 20 },
  { fl: 'OG', raum: 'Kind 4', typ: 'zu', x: 10.37, z: 17.28, m3h: 20 }, { fl: 'OG', raum: 'Kind 1', typ: 'zu', x: 18.3, z: 17.93, m3h: 20 },
  { fl: 'OG', raum: 'Kinderbad Nord', typ: 'ab', x: 14.8, z: 9.9, m3h: 45 }, { fl: 'OG', raum: 'Kinderbad Süd', typ: 'ab', x: 14.8, z: 18.2, m3h: 45 },
  { fl: 'OG', raum: 'HWR', typ: 'ab', x: 24.4, z: 10.9, m3h: 35 },
  { fl: 'OG', raum: 'Spielzimmer', typ: 'zu', x: 27.5, z: 12.0, m3h: 20 }, { fl: 'OG', raum: 'Spielzimmer', typ: 'zu', x: 30.0, z: 15.0, m3h: 20 },
];

// Ventile als Decken-Tellerventile; Lüftungsgerät an der Westwand des Technikraums (EG-Blatt x 17,72–18,07, z 6,0–6,75)
export function buildVents(parent, toWorld, ys, ceil) {          // parent: { EG, OG } → Gruppe je Geschoss (zum Abheben)
  const weiss = new THREE.MeshStandardMaterial({ color: '#f6f6f4', roughness: 0.4 });
  const ring = { zu: new THREE.MeshStandardMaterial({ color: '#4f86b8', roughness: 0.5 }), ab: new THREE.MeshStandardMaterial({ color: '#d0743c', roughness: 0.5 }) };
  for (const v of VENTILE) {
    const [wx, wz] = toWorld(v.fl, v.x, v.z), y = ys[v.fl] + ceil[v.fl];
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.0625, 0.0625, 0.025, 28), weiss); t.position.set(wx, y - 0.0125, wz); parent[v.fl].add(t);
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 8, 28), ring[v.typ]); r.rotation.x = Math.PI / 2; r.position.set(wx, y - 0.004, wz); parent[v.fl].add(r);
    t.userData = { code: 'LV', name: `${v.typ === 'zu' ? 'Zuluft' : 'Abluft'} ${v.raum}, ca. ${v.m3h} m³/h (Vorschlag)` };
  }
  const [gx, gz] = toWorld('EG', 17.72, 6.0);
  const geraet = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, 0.75), weiss); geraet.position.set(gx + 0.175, ys.EG + 1.42, gz + 0.375); parent.EG.add(geraet);
  geraet.userData = { code: 'KWL', name: 'Lüftungsgerät mit Wärmerückgewinnung (Lage angenommen)' };
}
