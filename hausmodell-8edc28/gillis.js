// 26.11.2026: Vorschläge der Innenarchitektin (Frau Gillis, Besprechung mit Herrn Reser) – Außenteile und Infoschilder.
// Die Innenteile stehen in raum3d.js (GILLIS je Raum). Alles hier ist Vorschlag, nicht beschlossen.
import * as THREE from 'three';

const m = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5, ...o });
function quader(g, x0, y0, z0, x1, y1, z1, mat) { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), mat); b.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); b.castShadow = b.receiveShadow = true; g.add(b); return b; }

// Welt-Koordinaten (Gartenplan): Garagen-Westwand x = 0, Garagentor z 0,94–6,20, Flurfenster z 7,40–8,26, Haustür z 8,26–9,15
export function buildGillisAussen() {
  const g = new THREE.Group(); g.userData.variante = 'gillis';
  const anth = m('#3c3f41', { roughness: 0.45 }), schwarz = m('#1d1d1c', { roughness: 0.4 });
  // Briefkasten mit Klingel und Kamera, unter Putz in der gedämmten Wand zwischen Garagentor und Flurfenster
  quader(g, -0.03, 0.95, 6.50, 0.0, 1.40, 7.15, anth);
  quader(g, -0.035, 1.30, 6.54, -0.028, 1.33, 6.86, schwarz);                 // Einwurfschlitz
  const kam = new THREE.Mesh(new THREE.CircleGeometry(0.018, 16), m('#0d0d0d', { roughness: 0.1 })); kam.rotation.y = -Math.PI / 2; kam.position.set(-0.036, 1.32, 7.03); g.add(kam);
  quader(g, -0.036, 1.12, 6.99, -0.03, 1.24, 7.07, m('#2a2a2a'));              // Klingeltaster/Display
  // Wandleuchte Up & Down über dem Briefkasten
  const wl = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 24), schwarz); wl.rotation.z = Math.PI / 2; wl.position.set(-0.08, 2.05, 6.82); g.add(wl);
  const glow = new THREE.MeshStandardMaterial({ color: '#ffe3b0', emissive: '#ffd090', emissiveIntensity: 2 });
  for (const dy of [0.085, -0.085]) { const d = new THREE.Mesh(new THREE.CircleGeometry(0.045, 20), glow); d.rotation.x = dy > 0 ? -Math.PI / 2 : Math.PI / 2; d.position.set(-0.08, 2.05 + dy, 6.82); g.add(d); }
  // Paketbox vorne an der Garage (Nordseite, wo die Mülltonnen geplant waren), Platz für einen Fahrradunterstand daneben
  quader(g, 0.25, 0, -0.62, 1.05, 1.15, -0.02, anth);
  quader(g, 0.30, 0.65, -0.625, 1.00, 0.67, -0.62, schwarz);
  quader(g, 0.85, 0.85, -0.63, 0.95, 0.95, -0.62, m('#2a2a2a'));              // Codeschloss
  // Sauberlauf auf dem Podest vor der Haustür
  quader(g, -1.05, 0.0, 8.30, -0.10, 0.17, 9.10, m('#5a5856', { roughness: 0.95 }));
  return g;
}

// Infoschilder: fl 'A' = außen (Welt-Koordinaten), sonst Blatt-Meter des Geschosses. y über Fußboden.
export const GILLIS_INFO = [
  { fl: 'A', x: -0.3, z: 6.8, y: 2.4, name: 'Eingang: Leuchte + Briefkasten', text: 'Zusätzliche Wandleuchte (Up & Down) und ein Briefkasten-Element unter Putz mit Klingel, Kamera und Hausnummer, alles zusammen geplant. Dort hochwertigere Dämmung gegen Wärmebrücke. Sprechanlage laut Elektroplan Busch-Welcome mit Panel auf den Etagen. Seitenfenster: Spiegelglas oder Folie mit Verlauf, Oberlicht geht nicht (Sturz zu niedrig).' },
  { fl: 'A', x: 0.65, z: -0.9, y: 1.6, name: 'Paketbox an der Garage', text: '12 cm Wandtiefe reichen am Eingang nicht. Paketbox deshalb vorne an der Garage, wo die Mülltonnen geplant waren, daneben eventuell Fahrradhäuschen. Sauberlauf auf dem Podest vor der Haustür.' },
  { fl: 'EG', x: 14.0, z: 13.2, y: 2.4, name: 'Flur: Decke bis hinten abhängen', text: 'Decke 10 cm abgehängt bis ganz hinten (sonst Bruch in den Einbaumöbeln), Aufbaustrahler nach der neuen Geometrie. Garderobe raumhoch vom Schreiner, Hidden Door zu Büro + WC, Sitzbank mit Motivtapete statt Akustikpaneel und LED unter dem Oberschrank (im Modell), raumhohe Glastür zum Wohnbereich. Die abgehängte Decke sieht man im Rundgang.' },
  { fl: 'EG', x: 15.3, z: 17.0, y: 2.6, name: 'Gäste-WC: Oberlicht', text: 'Oberlicht zum Hobbyraum für Tageslicht. Decke 10 cm abgehängt (Rohre), Vorwand nur wo Rohre laufen, Travertin nur an der Vorwand, Motivwand gegenüber dem WC, Schrank in Vorwandtiefe mit Licht darunter, Papierhalter an die Wand (das war im Modell schon so). Leitungsführung mit Herrn Reser abstimmen. Tür sitzt jetzt richtig (27.11. korrigiert).' },
  { fl: 'EG', x: 19.3, z: 15.05, y: 1.6, name: 'Esstisch mittig zum Fenster', text: 'Esstisch und Leuchte mittig zur Hebeschiebetür (+21 cm nach Osten). 4 Aufbaustrahler über den Küchenschränken statt Schiene, Insel in gebrochenem Weiß, nur die Schrankwand in Holz. 2 Leuchten über der Insel (sind im Modell), Kühlschrank in Trockenbau mit Hängeschrank (ist im Modell). Lüftungsauslass liegt, wo ein Strahler geplant war: Deckenraster mit Lüftung und Rauchmeldern abstimmen. Küchenbauer muss aufmessen (Plan 4,10 m, gemessen ca. 3,885 m).' },
  { fl: 'EG', x: 21.6, z: 12.65, y: 2.4, name: 'Durchgang Küche → Wohnen', text: 'Aufbaustrahler entlang des Durchgangs, mittig auf die Abkofferung der Lüftungsrohre (links). Kein LED-Band, keine Einbaustrahler. Zwei Wandleuchten links an der Wand (neu im Modell), hängendes Sideboard bleibt.' },
  { fl: 'EG', x: 30.35, z: 16.95, y: 2.4, name: 'Wohnen: 13 Aufbaustrahler', text: 'Gillis-Rechnung: 1 Spot je 2,5 m² bzw. 150 lm/m² ≈ 6.000 lm → 13 Strahler à 450 lm. Bisher 4 Auslässe ohne Bezug zur Möblierung. Alternative: schwarzes Schienensystem (kein neues Bohren). Kosten bei Herrn Zendeli erfragen.' },
  { fl: 'EG', x: 32.4, z: 19.3, y: 0.8, name: 'Schaltbare Steckdose Stehleuchte', text: 'Schaltbare Steckdose hinten für eine Steh- oder Tischleuchte (Akzentlicht am Abend).' },
  { fl: 'EG', x: 27.1, z: 19.6, y: 0.8, name: 'Schaltbare Steckdose Weihnachtsbaum', text: 'Schaltbare Steckdose in der Ecke für den Weihnachtsbaum, damit er per Schalter angeht.' },
  { fl: 'EG', x: 26.8, z: 14.6, y: 1.9, name: 'Eckkamin statt Tunnelkamin', text: 'Spalt reicht nicht für einen Tunnelkamin (ab ca. 95 cm). Vorschlag: Eckkamin, Durchgang max. 55 cm bleibt, seitlich Schlitz als Holzlager. Rauchrohr kann neu angebohrt werden. Kaminbauer (Quedlich) einbinden.' },
  { fl: 'EG', x: 30.8, z: 10.2, y: 2.4, name: 'Schlafzimmer: Licht vor dem Schrank', text: 'Zusätzliche (richtbare) Aufbaustrahler vor dem Schrank und am Eingang. Schminkecke unter dem Nordfenster mit Hocker und Wandleuchte.' },
  { fl: 'EG', x: 24.15, z: 15.5, y: 3.4, name: 'Galerie: Kugel-Hängeleuchte?', text: 'Vorschlag mit Fragezeichen: Kaskade aus Glaskugeln im Luftraum. Braucht einen Deckenauslass genau über dem Luftraum. Aufbauleuchten an der Galerie entlang der Brüstung neu gesetzt.' },
  { fl: 'OG', x: 14.8, z: 16.4, y: 1.9, name: 'Kinderbad (10,60 m²)', text: 'Wand an der Dusche verlängern, dahinter Heizkörper nah an der Dusche. Wand an der Dusche ist verlängert, der Heizkörper sitzt dahinter nah an der Dusche (war schon so). Neu im Modell: eine feste, durchgehende Glasscheibe (Ausstieg zur Raummitte) und ein Lowboard statt des Hochschranks. Nur als Text: ebenerdige Duschtasse statt Rinne, Nische mit Metallprofil, Spiegel bis zur Dusche, Fliesen beige 60 × 60.' },
  { fl: 'OG', x: 14.8, z: 10.6, y: 1.9, name: 'Kinderbad (9,64 m²)', text: 'Duschkopf an der Wand statt mittig (Spritzwasser) und Doppelwaschbecken mit Schrank waren im Modell schon so. Neu: Heizkörper 60 statt 75 cm, offen zum Einfädeln. Bürstenschrank entfällt (Klobürste aufputz). Wandmontage des Duschkopfs vor Ort festlegen.' },
  { fl: 'OG', x: 23.2, z: 13.6, y: 2.0, name: 'Galerie: Aufbaustrahler', text: 'Aufbaustrahler entlang der Galerie-Brüstung statt der versetzten Bestandsspots.' },
];
