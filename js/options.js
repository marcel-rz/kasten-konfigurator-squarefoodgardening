// Varianten für Dach und Vorderseite des Käfigs.
// Jede Variante liefert ihre Teile: Latten, Netzflächen, Beschläge, Schrauben und einen Anleitungsschritt.
// Maße in cm. G = Geometrie aus calc.geometry(), c = bereinigte Konfiguration.

const r1 = v => Math.round(v * 10) / 10;
// Netzstück: Fläche a (cm²) und Randlänge e (cm, für Tackerklammern)
const N = (w, h) => ({ a: w * h, e: 2 * (w + h) });
const f = v => String(r1(v)).replace('.', ',');

// Rahmen aus Latten mit Netz (Tür, Deckel ...)
function frame(name, w, h, c, qty = 1) {
  return {
    laths: [
      { label: `${name} oben/unten`, len: w, qty: 2 * qty },
      { label: `${name} seitlich`, len: h - 2 * c.lw, qty: 2 * qty },
    ],
    net: Array(qty).fill(N(w - 2 * c.lw, h - 2 * c.lw)),
    screws: 8 * qty,
  };
}
const merge = (...ps) => ({
  laths: ps.flatMap(p => p.laths || []), net: ps.flatMap(p => p.net || []), hw: ps.flatMap(p => p.hw || []),
  hinges: ps.reduce((s, p) => s + (p.hinges || 0), 0), screws: ps.reduce((s, p) => s + (p.screws || 0), 0),
});
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
      if (w > 80) p.warn = [`Türflügel sind ${f(w)} cm breit und hängen leicht durch. Eine Diagonalstrebe pro Flügel hilft.`];
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
      if (w > 80) p.warn = [`Die Tür ist ${f(w)} cm breit und hängt durch. Diagonalstrebe von unten am Scharnier nach oben außen einbauen oder eine Doppeltür nehmen.`];
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
      const p = merge(frame('Schiebetür', w, FH, c), {
        laths: [{ label: 'Laufleiste oben/unten (Führung)', len: W, qty: 2 }, { label: 'Abdeckleiste Führung', len: W, qty: 2 }],
        net: [N(W / 2, FH)], screws: 12,
        hw: [{ label: 'Türgriff / Holzknauf', qty: 1, unit: 'Stk' }, { label: 'Gleitband oder Kerzenwachs für die Führung', qty: 1, unit: 'Stk' }] });
      p.leaf = { w, h: FH };
      p.step = { t: 'Schiebetür bauen', d: `Die linke Hälfte der Vorderseite fest mit Netz bespannen. Oben und unten je eine Laufleiste (${f(W)} cm) vor die Pfosten schrauben und mit einer zweiten Leiste davor eine Nut bilden, in der die Tür läuft. Türrahmen ${f(w)} × ${f(FH)} cm bauen, bespannen und einsetzen. Die Führung mit Kerzenwachs einreiben, dann gleitet sie leichter.` };
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
        hw: [{ label: `Rundstab Ø 2,5 cm, ${f(W)} cm lang`, qty: 1, unit: 'Stk' }, { label: 'Klettbänder zum Hochbinden', qty: 3, unit: 'Stk' }, { label: 'Haken unten am Kasten', qty: 3, unit: 'Stk' }],
        leaf: { w: W, h: FH },
        step: { t: 'Netz-Rollo anbringen', d: `Ein Stück Netz ${f(W)} × ${f(FH + 10)} cm oben mit der Klemmleiste an die vordere Querlatte schrauben. Unten den Rundstab einwickeln und festtackern. Zum Öffnen das Netz auf den Stab aufrollen und mit den Klettbändern oben festmachen. Zu wird es unten in die Haken am Kasten eingehängt. Die einfachste und billigste Variante.` },
      };
    },
  },
  netz: {
    name: 'Netz fest', movable: false,
    parts(c, G) {
      const { W, FH } = frontGeom(c, G);
      return { net: [N(W, FH)], step: null };
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
        net: [N(DX, s), { a: DZ * rh / 2, e: DZ + 2 * s }, { a: DZ * rh / 2, e: DZ + 2 * s }], hinges: h, screws: 12,
        hw: [{ label: 'Haken / Vorreiber für Dachklappe', qty: 1, unit: 'Stk' }, { label: 'Aufstellstab oder Kette', qty: 1, unit: 'Stk' }] });
      p.lid = { DX, DZ, rh, s };
      p.step = { t: 'Satteldach', d: `An beiden Giebelseiten je zwei Sparren (${f(s)} cm, Enden schräg auf Gehrung schneiden) von den Pfosten zum First schrauben und oben die Firstlatte (${f(DX)} cm) einsetzen. Die hintere Dachfläche und die beiden Giebeldreiecke fest bespannen. Die vordere Dachfläche ist ein eigener Rahmen ${f(DX)} × ${f(s)} cm, der mit ${h} Scharnieren an der Firstlatte hängt und nach oben aufklappt. Vorteil: ${f(rh)} cm mehr Höhe in der Mitte, Regen und Schnee rutschen ab.` };
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
        hw: [{ label: `PE-Rohr Ø 20 mm für ${n} Bögen à ${f(arc + 10)} cm`, qty: Math.ceil(n * (arc + 10) / 100), unit: 'm' }, { label: 'Rohrschellen', qty: 2 * n, unit: 'Stk' }, { label: 'Kabelbinder (UV-fest)', qty: 50, unit: 'Stk' }],
        lid: { DX, DZ, rh, n, arc },
        step: { t: 'Bogendach', d: `${n} PE-Rohre à ${f(arc + 10)} cm zuschneiden, jeweils zu einem Bogen biegen und mit Rohrschellen innen an die linke und rechte Querlatte schrauben (Abstand ca. ${f(DX / (n - 1))} cm). Oben die Firstlatte mit Kabelbindern an alle Bögen binden, damit sie nicht kippen. Netz über die Bögen spannen und mit Kabelbindern befestigen, die Enden als Halbkreis zuschneiden. Vorteil: sehr stabil, billig und ${f(rh)} cm mehr Höhe in der Mitte. Zugang nur über die Vorderseite.` },
      };
    },
  },
  fest: {
    name: 'Netz fest', movable: false,
    parts(c, G) {
      const DX = G.oX + 2 * c.ps, DZ = G.oZ + 2 * c.ps;
      return { net: [N(DX, DZ)], step: null };
    },
  },
  offen: {
    name: 'Offen', movable: false,
    parts() { return { step: null }; },
  },
};

export function roofExtra(c) {
  return c.top === 'sattel' || c.top === 'tunnel' ? c.roofH : 0;
}
