// Varianten für Dach und Vorderseite des Käfigs.
// Jede Variante liefert ihre Teile: Latten, Netzflächen, Beschläge, Schrauben und einen Anleitungsschritt.
// Maße in cm. G = Geometrie aus calc.geometry(), c = bereinigte Konfiguration.

const r1 = v => Math.round(v * 10) / 10;
// Netzstück: Fläche a (cm²) und Randlänge e (cm, für Tackerklammern)
const N = (w, h) => ({ a: w * h, e: 2 * (w + h) });
const f = v => String(r1(v)).replace('.', ',');

// Ab dieser Rahmengröße (längste Seite in cm) kommt automatisch eine Diagonalstrebe rein
export const BRACE_AT = 70;
export const braced = (w, h) => Math.max(w, h) > BRACE_AT;

// Rahmen aus Latten mit Netz (Tür, Deckel, abnehmbares Netzfeld ...)
function frame(name, w, h, c, qty = 1) {
  const p = {
    laths: [
      { label: `${name} oben/unten`, len: w, qty: 2 * qty },
      { label: `${name} seitlich`, len: h - 2 * c.lw, qty: 2 * qty },
    ],
    net: Array(qty).fill(N(w - 2 * c.lw, h - 2 * c.lw)),
    screws: 8 * qty,
  };
  if (braced(w, h)) {
    p.laths.push({ label: `${name} Diagonalstrebe`, len: Math.hypot(w - 2 * c.lw, h - 2 * c.lw), qty });
    p.screws += 4 * qty;
    p.braced = true;
  }
  return p;
}
const BRACE_TXT = ' Weil der Rahmen groß ist, kommt eine Diagonalstrebe rein (Enden schräg zuschneiden), damit er nicht durchhängt oder sich verzieht.';
const DOOR_BRACE_TXT = ' Wegen der Breite bekommt jeder Flügel eine Diagonalstrebe: unten an der Scharnierseite anfangen und schräg nach oben zur Schlossseite. So drückt das Gewicht die Strebe zusammen und die Tür hängt nicht durch.';

// Fest stehendes Netzfeld: abnehmbar als eigener Rahmen mit Vorreibern, sonst direkt angetackert
// wall = senkrechtes Feld zwischen den Pfosten: braucht Auflage unten und Anschläge innen
export function panel(name, w, h, c, wall = true) {
  if (!c.removable) return { net: [N(w, h)] };
  const p = frame(name, w - 0.4, h - 0.4, c); // 4 mm Luft, damit nichts klemmt, wenn das Holz quillt
  p.hw = [{ label: 'Vorreiber (Drehriegel) für abnehmbare Netzrahmen', qty: Math.max(w, h) > 120 ? 6 : 4, unit: 'Stk' }];
  if (wall) {
    p.laths.push(
      { label: 'Auflageleiste unten (außen an die Kastenwand)', len: w, qty: 1 },
      { label: 'Anschlagleiste innen, waagerecht (unten und oben)', len: w, qty: 2 },
      { label: 'Anschlagleiste innen, senkrecht (an den Pfosten)', len: h - 2 * c.lw, qty: 2 },
    );
    p.screws += 14;
  }
  return p;
}
// Seiten- und Rückwand des Käfigs
export function walls(c, G) {
  const hh = c.cageH - c.lw - 0.5;
  return merge(panel('Netzrahmen hinten', G.oX, hh, c), panel('Netzrahmen links', G.oZ, hh, c), panel('Netzrahmen rechts', G.oZ, hh, c));
}
function merge(...ps) {
  const out = { laths: [], net: [], hw: [], hinges: 0, screws: 0, braced: false };
  ps.forEach(p => {
    out.laths.push(...(p.laths || [])); out.net.push(...(p.net || []));
    (p.hw || []).forEach(h => { const e = out.hw.find(x => x.label === h.label && x.unit === h.unit); if (e) e.qty += h.qty; else out.hw.push({ ...h }); });
    out.hinges += p.hinges || 0; out.screws += p.screws || 0; out.braced = out.braced || !!p.braced;
  });
  return out;
}
const hingeCount = len => (len > 150 ? 3 : 2);

// Halbe Ellipse: Bogenlänge (Ramanujan) für Tunnelbögen
function halfEllipse(a, b) {
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b))) / 2;
}

export function frontGeom(c, G) {
  const W = G.oX, FH = c.cageH - c.lw - 0.5;
  return { W, FH };
}

export const FRONTS = {
  doppeltuer: {
    name: 'Doppeltür', movable: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G), w = (W - 1) / 2;
      const p = merge(frame('Türflügel', w, FH, c, 2), { laths: [{ label: 'Schlagleiste Doppeltür', len: FH, qty: 1 }], hinges: 4, screws: 4,
        hw: [{ label: 'Schubriegel für Doppeltür', qty: 1, unit: 'Stk' }] });
      p.leaf = { w, h: FH, leaves: 2 };
      p.step = { t: 'Doppeltür bauen', d: `Zwei Rahmen ${f(w)} × ${f(FH)} cm aus Latten bauen (Ecken verschrauben) und Netz innen bespannen. Jeder Flügel bekommt 2 Scharniere am vorderen Pfosten. An einen Flügel innen die Schlagleiste schrauben, sodass sie über den Mittelspalt ragt, an den anderen den Schubriegel. Oben schlagen die Flügel gegen die vordere Querlatte.` };
      if (p.braced) p.step.d += DOOR_BRACE_TXT;
      return p;
    },
  },
  tuer: {
    name: 'Einzeltür', movable: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G), w = W - 0.5;
      const p = merge(frame('Türrahmen', w, FH, c), { hinges: 2, hw: [{ label: 'Riegel / Haken für Tür', qty: 1, unit: 'Stk' }] });
      p.leaf = { w, h: FH, leaves: 1 };
      p.step = { t: 'Tür bauen', d: `Rahmen ${f(w)} × ${f(FH)} cm aus Latten bauen und bespannen. 2 Scharniere am linken Pfosten, Riegel rechts. Oben schlägt die Tür gegen die vordere Querlatte.` };
      if (p.braced) p.step.d += DOOR_BRACE_TXT;
      return p;
    },
  },
  klapptuer: {
    name: 'Klappe nach oben', movable: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G), w = W - 0.5;
      const p = merge(frame('Klappenrahmen', w, FH, c), { hinges: hingeCount(w),
        hw: [{ label: 'Sturmhaken zum Offenhalten', qty: 2, unit: 'Stk' }, { label: 'Vorreiber unten zum Schließen', qty: 2, unit: 'Stk' }] });
      p.leaf = { w, h: FH };
      p.step = { t: 'Klappe nach oben bauen', d: `Rahmen ${f(w)} × ${f(FH)} cm bauen und bespannen. Mit ${hingeCount(w)} Scharnieren oben an die vordere Querlatte schrauben, sodass die Klappe nach außen hochschwingt. Zwei Sturmhaken halten sie offen am Dach, zwei Vorreiber halten sie unten zu. Vorteil: Man hat die ganze Breite frei und nichts steht im Weg.` };
      return p;
    },
  },
  schiebetuer: {
    name: 'Schiebetür', movable: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G), w = W / 2 + 3;
      const p = merge(frame('Schiebetür', w, FH, c), panel('Netzrahmen vorne links', W / 2, FH, c), {
        laths: [{ label: 'Laufleiste oben/unten (Führung)', len: W, qty: 2 }, { label: 'Abdeckleiste Führung', len: W, qty: 2 }],
        screws: 12,
        hw: [{ label: 'Türgriff / Holzknauf', qty: 1, unit: 'Stk' }, { label: 'Gleitband oder Kerzenwachs für die Führung', qty: 1, unit: 'Stk' }] });
      p.leaf = { w, h: FH };
      p.step = { t: 'Schiebetür bauen', d: `Die linke Hälfte der Vorderseite fest mit Netz bespannen. Oben und unten je eine Laufleiste (${f(W)} cm) vor die Pfosten schrauben und mit einer zweiten Leiste davor eine Nut bilden, in der die Tür läuft. Türrahmen ${f(w)} × ${f(FH)} cm bauen, bespannen und einsetzen. Die Führung mit Kerzenwachs einreiben, dann gleitet sie leichter.` };
      return p;
    },
  },
  schiebe2: {
    name: 'Doppel-Schiebefenster (links und rechts)', movable: true, cycle: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G), w = W / 2 + 3;
      const p = merge(frame('Schiebefenster', w, FH, c, 2), {
        laths: [{ label: 'Führungsleiste oben/unten (3 Leisten = 2 Spuren)', len: W, qty: 6 }],
        screws: 18,
        hw: [{ label: 'Griff / Holzknauf', qty: 2, unit: 'Stk' }, { label: 'Gleitband oder Kerzenwachs für die Führung', qty: 1, unit: 'Stk' }] });
      p.leaf = { w, h: FH };
      p.step = { t: 'Doppel-Schiebefenster bauen', d: `Oben und unten vor die Pfosten je drei Führungsleisten (${f(W)} cm) mit kleinem Abstand schrauben, so entstehen zwei Spuren hintereinander. Zwei Rahmen ${f(w)} × ${f(FH)} cm bauen und bespannen, einer läuft in der hinteren, einer in der vorderen Spur. Beide lassen sich ganz nach links oder ganz nach rechts schieben: So kann man wahlweise die linke oder die rechte Hälfte komplett öffnen und kommt an jedes Feld ran. In der Mitte überlappen sie 6 cm, damit keine Lücke bleibt. Zum Abnehmen das Fenster oben in die tiefe Spur heben und unten herausschwenken.` };
      return p;
    },
  },
  klappeunten: {
    name: 'Klappe nach unten (Ablage)', movable: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G), w = W - 0.5, h = hingeCount(w);
      const p = merge(frame('Klappenrahmen', w, FH, c), { hinges: h,
        hw: [{ label: `Kette ${Math.ceil(FH * 1.45)} cm + 4 Schraubösen (hält die Klappe waagerecht)`, qty: 2, unit: 'Stk' }, { label: 'Vorreiber oben zum Schließen', qty: 2, unit: 'Stk' }] });
      p.leaf = { w, h: FH };
      p.step = { t: 'Klappe nach unten bauen', d: `Rahmen ${f(w)} × ${f(FH)} cm bauen und bespannen. Mit ${h} Scharnieren unten an die Auflageleiste schrauben, sodass die Klappe nach außen herunterklappt. Zwei Ketten von der Klappe zu den Pfosten halten sie waagerecht. Dann dient sie gleich als Ablage für Werkzeug und Ernte. Oben halten zwei Vorreiber die Klappe zu.` };
      return p;
    },
  },
  rollo: {
    name: 'Netz-Rollo', movable: true,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G);
      return {
        laths: [{ label: 'Klemmleiste oben für das Rollo', len: W, qty: 1 }],
        net: [N(W, FH + 10)], screws: 6,
        hw: [{ label: `Rundstab Ø 2,5 cm, ${f(W)} cm lang`, qty: 1, unit: 'Stk' }, { label: 'Klettbänder zum Hochbinden', qty: 3, unit: 'Stk' }, { label: 'Haken unten am Kasten', qty: 3, unit: 'Stk' },
          ...(c.removable ? [{ label: 'Flügelschrauben M6 mit Einschlagmutter (Klemmleiste)', qty: 3, unit: 'Stk' }] : [])],
        leaf: { w: W, h: FH },
        step: { t: 'Netz-Rollo anbringen', d: `Ein Stück Netz ${f(W)} × ${f(FH + 10)} cm oben mit der Klemmleiste an die vordere Querlatte ${c.removable ? 'klemmen (mit Flügelschrauben, so lässt sich das Rollo ohne Werkzeug abnehmen)' : 'schrauben'}. Unten den Rundstab einwickeln und festtackern. Zum Öffnen das Netz auf den Stab aufrollen und mit den Klettbändern oben festmachen. Zu wird es unten in die Haken am Kasten eingehängt. Die einfachste und billigste Variante.` },
      };
    },
  },
  netz: {
    name: 'Netz fest', movable: false,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G);
      return { ...panel('Netzrahmen vorne', W, FH, c), step: null };
    },
  },
};

export const TOPS = {
  klapp: {
    name: 'Klappdeckel', movable: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, h = hingeCount(DX);
      const p = merge(frame('Deckelrahmen', DX, DZ, c), { hinges: h, hw: [{ label: 'Haken / Vorreiber für Deckel', qty: 1, unit: 'Stk' }] });
      if (c.chain) {
        const d = DZ * 0.4, a = 100 * Math.PI / 180;
        const pt = [d * Math.cos(a), d * Math.sin(a)], q = [-c.ps / 2, -(c.lw + 12)];
        const chainLen = Math.ceil(Math.hypot(pt[0] - q[0], pt[1] - q[1]) + 5);
        p.hw.push({ label: `Kette ${chainLen} cm + 4 Schraubösen`, qty: 2, unit: 'Stk' });
      }
      p.lid = { DX, DZ };
      p.step = { t: 'Klappdeckel', d: `Rahmen ${f(DX)} × ${f(DZ)} cm aus Latten bauen und bespannen. Mit ${h} Scharnieren an der hinteren Querlatte befestigen.${c.chain ? ' Links und rechts eine Kette vom Deckel zum hinteren Pfosten, damit er offen nicht nach hinten kippt.' : ''} Vorne ein Haken, damit Wind ihn nicht aufreißt.` };
      return p;
    },
  },
  klapp2: {
    name: 'Zwei Klappflügel', movable: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, w = DX / 2 - 0.5, h = hingeCount(DZ);
      const p = merge(frame('Flügelrahmen', w, DZ, c, 2), { hinges: 2 * h,
        hw: [{ label: 'Sturmhaken zum Offenhalten', qty: 2, unit: 'Stk' }, { label: 'Riegel in der Mitte', qty: 1, unit: 'Stk' }] });
      p.lid = { DX, DZ, w };
      p.step = { t: 'Zwei Klappflügel', d: `Zwei Rahmen ${f(w)} × ${f(DZ)} cm bauen und bespannen. Jeder Flügel kommt mit ${h} Scharnieren an die linke bzw. rechte Querlatte und klappt zur Seite auf wie ein Flügeltor. In der Mitte ein Riegel, offen hält je ein Sturmhaken. Vorteil: Man kann nur eine Hälfte öffnen und der Flügel wird halb so schwer.` };
      return p;
    },
  },
  schiebe: {
    name: 'Schiebedeckel', movable: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, d = DZ / 2;
      const p = merge(frame('Schiebedeckel', DX, d, c, 2), {
        laths: [{ label: 'Laufleiste auf den Seitenlatten', len: DZ, qty: 2 }, { label: 'Distanzleiste hinterer Deckel', len: d, qty: 2 }],
        screws: 10, hw: [{ label: 'Griff', qty: 1, unit: 'Stk' }, { label: 'Anschlagklotz', qty: 2, unit: 'Stk' }] });
      p.lid = { DX, DZ, d };
      p.step = { t: 'Schiebedeckel', d: `Zwei Rahmen ${f(DX)} × ${f(d)} cm bauen und bespannen. Der hintere Deckel wird fest auf die Pfosten geschraubt, aber mit Distanzleisten etwas höher, damit der vordere Deckel darunter durchrutschen kann. Der vordere liegt lose auf zwei Laufleisten über den Seitenlatten und wird zum Öffnen nach hinten unter den festen Deckel geschoben. Zwei Anschlagklötze verhindern, dass er vorne herausrutscht.` };
      return p;
    },
  },
  sattel: {
    name: 'Satteldach (vorne klappbar)', movable: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, rh = c.roofH, s = Math.hypot(DZ / 2, rh), h = hingeCount(DX);
      const p = merge(frame('Dachklappe', DX, s, c), {
        laths: [{ label: 'Sparren (Giebel)', len: s, qty: 4 }, { label: 'Firstlatte', len: DX, qty: 1 }],
        net: [{ a: DZ * rh / 2, e: DZ + 2 * s }, { a: DZ * rh / 2, e: DZ + 2 * s }], hinges: h, screws: 12,
        hw: [{ label: 'Haken / Vorreiber für Dachklappe', qty: 1, unit: 'Stk' }, { label: 'Aufstellstab oder Kette', qty: 1, unit: 'Stk' },
          ...(c.removable ? [{ label: 'Vorreiber zum Abnehmen des ganzen Dachs', qty: 4, unit: 'Stk' }] : [])] },
        panel('Dachfläche hinten', DX, s, c, false));
      p.lid = { DX, DZ, rh, s };
      p.step = { t: 'Satteldach', d: `An beiden Giebelseiten je zwei Sparren (${f(s)} cm, Enden schräg auf Gehrung schneiden) von den Pfosten zum First schrauben und oben die Firstlatte (${f(DX)} cm) einsetzen. Die hintere Dachfläche und die beiden Giebeldreiecke fest bespannen. Die vordere Dachfläche ist ein eigener Rahmen ${f(DX)} × ${f(s)} cm, der mit ${h} Scharnieren an der Firstlatte hängt und nach oben aufklappt. Vorteil: ${f(rh)} cm mehr Höhe in der Mitte, Regen und Schnee rutschen ab.${c.removable ? ' Die Sparren werden nicht festgeschraubt, sondern mit 4 Vorreibern auf den Pfosten gehalten. So kann man das ganze Dach abheben.' : ''}` };
      return p;
    },
  },
  sattel2: {
    name: 'Satteldach (beide Seiten klappbar)', movable: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, rh = c.roofH, s = Math.hypot(DZ / 2, rh), h = hingeCount(DX);
      const p = merge(frame('Dachklappe', DX, s, c, 2), {
        laths: [{ label: 'Sparren (Giebel)', len: s, qty: 4 }, { label: 'Firstlatte', len: DX, qty: 1 }],
        net: [{ a: DZ * rh / 2, e: DZ + 2 * s }, { a: DZ * rh / 2, e: DZ + 2 * s }], hinges: 2 * h, screws: 12,
        hw: [{ label: 'Haken / Vorreiber für Dachklappen', qty: 2, unit: 'Stk' }, { label: 'Aufstellstab oder Kette', qty: 2, unit: 'Stk' },
          ...(c.removable ? [{ label: 'Vorreiber zum Abnehmen des ganzen Dachs', qty: 4, unit: 'Stk' }] : [])] });
      p.lid = { DX, DZ, rh, s };
      p.step = { t: 'Satteldach mit zwei Klappen', d: `An beiden Giebelseiten je zwei Sparren (${f(s)} cm, Enden schräg) zum First schrauben und die Firstlatte (${f(DX)} cm) einsetzen, Giebeldreiecke bespannen. Beide Dachflächen sind eigene Rahmen ${f(DX)} × ${f(s)} cm, die jeweils mit ${h} Scharnieren an der Firstlatte hängen. So kann man vorne und hinten aufklappen und kommt von beiden Seiten an alle Felder, auch wenn der Kasten frei steht. Jede Klappe bekommt einen Aufstellstab, damit sie offen bleibt.${c.removable ? ' Das ganze Dach sitzt mit 4 Vorreibern auf den Pfosten und lässt sich abheben.' : ''}` };
      return p;
    },
  },
  schiebe2: {
    name: 'Doppel-Schiebedeckel (links und rechts)', movable: true, cycle: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, w = DX / 2 + 3;
      const p = merge(frame('Schiebedeckel', w, DZ, c, 2), {
        laths: [{ label: 'Laufleiste vorne/hinten (2 Spuren)', len: DX, qty: 6 }, { label: 'Distanzleiste obere Spur', len: DX, qty: 2 }],
        screws: 20, hw: [{ label: 'Griff', qty: 2, unit: 'Stk' }, { label: 'Anschlagklotz', qty: 4, unit: 'Stk' }] });
      p.lid = { DX, DZ, w };
      p.step = { t: 'Doppel-Schiebedeckel', d: `Auf die vordere und hintere Querlatte je drei Laufleisten (${f(DX)} cm) schrauben, die äußere Spur mit Distanzleisten etwas höher, so laufen zwei Deckel übereinander. Zwei Rahmen ${f(w)} × ${f(DZ)} cm bauen und bespannen. Jeder lässt sich nach links und rechts schieben, man kann also wahlweise die linke oder rechte Hälfte von oben öffnen. Anschlagklötze an den Enden verhindern, dass ein Deckel herausrutscht.` };
      return p;
    },
  },
  pult: {
    name: 'Pultdach (nach vorne aufklappbar)', movable: true,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, rh = c.roofH, s = Math.hypot(DZ, rh), h = hingeCount(DX);
      const p = merge(frame('Pultdachklappe', DX, s, c), {
        laths: [{ label: 'Querlatte hinten oben (Scharnierlatte)', len: DX, qty: 1 }, { label: 'Schräglatte seitlich', len: s, qty: 2 }],
        net: [{ a: DZ * rh / 2, e: DZ + rh + s }, { a: DZ * rh / 2, e: DZ + rh + s }], hinges: h, screws: 14,
        hw: [{ label: `Aufsatz-Kantholz ${f(c.ps)}×${f(c.ps)} cm, ${f(rh + 10)} cm (hinten an die Pfosten)`, qty: 2, unit: 'Stk' }, { label: 'Aufstellstab oder Kette', qty: 2, unit: 'Stk' }, { label: 'Haken / Vorreiber vorne', qty: 1, unit: 'Stk' }] });
      p.lid = { DX, DZ, rh, s };
      p.step = { t: 'Pultdach', d: `Hinten an beide Pfosten ein Aufsatz-Kantholz schrauben, sodass die Rückseite ${f(rh)} cm höher ist. Oben quer die Scharnierlatte (${f(DX)} cm) setzen und an den Seiten je eine Schräglatte von hinten oben nach vorne. Die Seitendreiecke fest bespannen. Die ganze Dachfläche ist ein Rahmen ${f(DX)} × ${f(s)} cm, der mit ${h} Scharnieren hinten hängt und nach vorne-oben aufklappt. Vorteil: Regen läuft nach vorne ab und man hat hinten mehr Platz für hohe Pflanzen wie Tomaten.` };
      return p;
    },
  },
  tunnel: {
    name: 'Bogendach (Tunnel)', movable: false,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps, rh = c.roofH;
      const n = Math.max(3, Math.ceil(DX / 60) + 1), arc = halfEllipse(DZ / 2, rh);
      return {
        laths: [{ label: 'Firstlatte (hält die Bögen)', len: DX, qty: 1 }],
        net: [N(DX, arc), { a: Math.PI * DZ / 2 * rh / 2, e: arc + DZ }, { a: Math.PI * DZ / 2 * rh / 2, e: arc + DZ }], screws: 4 * n,
        hw: [{ label: `PE-Rohr Ø 20 mm für ${n} Bögen à ${f(arc + 10)} cm`, qty: Math.ceil(n * (arc + 10) / 100), unit: 'm' }, { label: 'Rohrschellen', qty: 2 * n, unit: 'Stk' }, c.removable ? { label: 'Klettbänder (UV-fest, wiederverwendbar)', qty: 40, unit: 'Stk' } : { label: 'Kabelbinder (UV-fest)', qty: 50, unit: 'Stk' }],
        lid: { DX, DZ, rh, n, arc },
        step: { t: 'Bogendach', d: `${n} PE-Rohre à ${f(arc + 10)} cm zuschneiden, jeweils zu einem Bogen biegen und mit Rohrschellen innen an die linke und rechte Querlatte schrauben (Abstand ca. ${f(DX / (n - 1))} cm). Oben die Firstlatte mit Kabelbindern an alle Bögen binden, damit sie nicht kippen. Netz über die Bögen spannen und mit ${c.removable ? 'Klettbändern befestigen (lässt sich so jederzeit abnehmen)' : 'Kabelbindern befestigen'}, die Enden als Halbkreis zuschneiden. Vorteil: sehr stabil, billig und ${f(rh)} cm mehr Höhe in der Mitte. Zugang nur über die Vorderseite.` },
      };
    },
  },
  fest: {
    name: 'Netz fest', movable: false,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps;
      return { ...panel('Netzrahmen Dach', DX, DZ, c, false), step: null };
    },
  },
  offen: {
    name: 'Offen', movable: false,
    parts() { return { step: null }; },
  },
};

export function roofExtra(c) {
  return ['sattel', 'sattel2', 'tunnel', 'pult'].includes(c.top) ? c.roofH : 0;
}

// Hinweis auf Diagonalstreben an die Anleitung hängen (Türen haben ihren eigenen Text)
for (const [key, o] of [...Object.entries(FRONTS), ...Object.entries(TOPS)]) {
  const orig = o.parts;
  o.parts = (c, G) => {
    const p = orig(c, G);
    if (p.braced && p.step && !['doppeltuer', 'tuer'].includes(key) && !p.step.d.includes('Diagonalstrebe')) p.step = { ...p.step, d: p.step.d + BRACE_TXT };
    return p;
  };
}
