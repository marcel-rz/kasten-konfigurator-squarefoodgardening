// Reine Berechnung: aus einer Konfiguration werden Geometrie, Materialliste,
// Zuschnitt und Bauanleitung. Alle Maße in cm.

export const DEFAULTS = {
  nx: 4, nz: 4, cell: 30,
  t: 2, h: 20, ov: 5, play: 0.1,
  grid: 'bretter',            // 'bretter' | 'schnur' | 'keins'
  stock: 250, kerf: 0.3,
  soilGap: 3,
  posts: true, ps: 5, cageH: 60, postGround: 0,
  lw: 3, lt: 2,
  net: true, netType: 'vogelschutz', mesh: 2,
  top: 'klapp',               // 'fest' | 'klapp' | 'offen'
  chain: true,
  front: 'doppeltuer',        // 'netz' | 'tuer' | 'doppeltuer'
  ground: 'rasen',            // Schlüssel aus GROUNDS
  drain: 5,                   // Drainageschicht in cm (nur wo nötig)
};

// Untergrund: was unter den Kasten kommt. soft = Pfosten können in den Boden.
export const GROUNDS = {
  rasen: { name: 'Rasen / Wiese', soft: true, color: 0x6f9e4a,
    prep: 'Grasnarbe in der Kastengröße mit dem Spaten abstechen (die Soden umgedreht unten in den Kasten legen geht auch, das gibt Nährstoffe). Fläche mit der Wasserwaage eben machen.',
    layers: ['gitter'] },
  erde: { name: 'Erde / Beet', soft: true, color: 0x7a5636,
    prep: 'Unkraut und Wurzeln entfernen, Boden lockern und eben harken.',
    layers: ['gitter'] },
  kies: { name: 'Kies / Schotter', soft: false, color: 0xb9b3a6,
    prep: 'Kies glatt ziehen und eben machen. Wühlmäuse kommen durch Kies kaum, aber Unkraut wächst durch.',
    layers: ['vlies'] },
  pflaster: { name: 'Pflaster / Platten', soft: false, color: 0xa9a49a,
    prep: 'Platten fegen. Der Kasten bleibt ohne Boden, damit Wasser über die Fugen ablaufen kann. Erde färbt Platten, das Vlies verhindert das meiste.',
    layers: ['vlies', 'drainage'] },
  beton: { name: 'Beton / Asphalt', soft: false, color: 0x9a9893,
    prep: 'Fläche fegen und auf Gefälle prüfen: Das Wasser muss zu einer Seite ablaufen können. Den Kasten nicht in eine Senke stellen, sonst steht unten Wasser.',
    layers: ['vlies', 'drainage'] },
  holz: { name: 'Holzterrasse / Balkon', soft: false, color: 0xa5764a,
    prep: 'Tragfähigkeit prüfen (Gewicht siehe Hinweise). Den Kasten auf Unterlegklötze stellen, damit der Terrassenboden darunter trocknen kann und nicht fault.',
    layers: ['folie', 'drainage', 'vlies2', 'kloetze'] },
};
export const LAYERS = {
  gitter: 'Wühlmausgitter verzinkt, Masche 13 mm',
  vlies: 'Unkrautvlies (wasserdurchlässig)',
  vlies2: 'Vlies als Trennlage über der Drainage',
  drainage: 'Blähton oder grober Kies (Drainage)',
  folie: 'Teichfolie (Wanne gegen Nässe)',
  kloetze: 'Unterlegklötze (Kunststoff/Hartholz, ca. 2 cm)',
};

export const NET_TYPES = {
  vogelschutz: { name: 'Vogelschutznetz (Kunststoff)', fix: 'Tackerklammern mit Leiste', color: 0x2f7d5b },
  volierendraht: { name: 'Volierendraht (verzinkt, Sechseck)', fix: 'Krampen / Tackerklammern', color: 0x8e959b },
  kaninchendraht: { name: 'Kaninchendraht (Viereck)', fix: 'Krampen', color: 0x7c8388 },
  insektenschutz: { name: 'Insekten- / Gemüseschutznetz', fix: 'Tackerklammern mit Leiste', color: 0xd9dcd2 },
};

const r1 = v => Math.round(v * 10) / 10;
export const fmt = v => String(r1(v)).replace('.', ',');

export function sanitize(c) {
  const o = { ...DEFAULTS, ...c };
  const clamp = (k, a, b) => { o[k] = Math.min(b, Math.max(a, Number(o[k]) || DEFAULTS[k])); };
  clamp('nx', 1, 12); clamp('nz', 1, 12); o.nx = Math.round(o.nx); o.nz = Math.round(o.nz);
  clamp('cell', 10, 100); clamp('t', 1, 6); clamp('h', 8, 80); clamp('stock', 50, 600);
  o.ov = Math.min(30, Math.max(0, Number(o.ov) || 0));
  o.play = Math.min(1, Math.max(0, Number(o.play) || 0));
  o.kerf = Math.min(1, Math.max(0, Number(o.kerf) || 0));
  o.soilGap = Math.min(o.h - 1, Math.max(0, Number(o.soilGap) || 0));
  clamp('ps', 3, 15); clamp('cageH', 20, 200); clamp('lw', 1.5, 8); clamp('lt', 1, 6); clamp('mesh', 0.5, 10);
  o.postGround = Math.min(100, Math.max(0, Number(o.postGround) || 0));
  o.posts = !!o.posts; o.chain = !!o.chain;
  if (!GROUNDS[o.ground]) o.ground = DEFAULTS.ground;
  if (!GROUNDS[o.ground].soft) o.postGround = 0;
  o.drain = Math.min(20, Math.max(0, Number(o.drain) || 0));
  o.net = o.posts && !!o.net;
  if (!NET_TYPES[o.netType]) o.netType = DEFAULTS.netType;
  if (!['bretter', 'schnur', 'keins'].includes(o.grid)) o.grid = DEFAULTS.grid;
  if (!['fest', 'klapp', 'offen'].includes(o.top)) o.top = DEFAULTS.top;
  if (!['netz', 'tuer', 'doppeltuer'].includes(o.front)) o.front = DEFAULTS.front;
  return o;
}

// Mittellinien der Bretter quer zu einer Achse
function linePositions(n, inner, c) {
  const a = [-inner / 2 - c.t / 2];
  if (c.grid === 'bretter') for (let i = 1; i < n; i++) a.push(-inner / 2 + i * c.cell + (i - 1) * c.t + c.t / 2);
  a.push(inner / 2 + c.t / 2);
  return a;
}

export function geometry(cfg) {
  const c = sanitize(cfg);
  const g = c.grid === 'bretter';
  const iX = c.nx * c.cell + (g ? (c.nx - 1) * c.t : 0);
  const iZ = c.nz * c.cell + (g ? (c.nz - 1) * c.t : 0);
  const oX = iX + 2 * c.t, oZ = iZ + 2 * c.t;
  const LX = oX + 2 * c.ov, LZ = oZ + 2 * c.ov;
  const px = linePositions(c.nx, iX, c);  // x-Positionen der Bretter in z-Richtung
  const pz = linePositions(c.nz, iZ, c);  // z-Positionen der Bretter in x-Richtung
  const cellsX = [...Array(c.nx)].map((_, i) => -iX / 2 + i * (c.cell + (g ? c.t : 0)) + c.cell / 2);
  const cellsZ = [...Array(c.nz)].map((_, j) => -iZ / 2 + j * (c.cell + (g ? c.t : 0)) + c.cell / 2);
  const ax = oX / 2 + c.ps / 2, az = oZ / 2 + c.ps / 2;
  const postLen = c.h + c.cageH + c.postGround;
  const footX = c.posts ? oX + 2 * c.ps : LX, footZ = c.posts ? oZ + 2 * c.ps : LZ;
  return { c, iX, iZ, oX, oZ, LX, LZ, px, pz, cellsX, cellsZ, ax, az, postLen, footX, footZ };
}

// Kerben eines Bretts: Abstand von linker Kante des Bretts bis Kerbanfang/-ende
function notches(L, cuts, c) {
  const w = c.t + c.play;
  return cuts.map(p => ({ from: p + L / 2 - w / 2, to: p + L / 2 + w / 2, center: p + L / 2 }));
}

// First-Fit-Decreasing auf Rohlänge
export function cutPlan(pieces, stock, kerf) {
  const list = [];
  pieces.forEach(p => { for (let i = 0; i < p.qty; i++) list.push({ len: p.len, label: p.label }); });
  list.sort((a, b) => b.len - a.len);
  const bars = [], tooLong = [];
  for (const p of list) {
    if (p.len > stock) { tooLong.push(p); continue; }
    let bar = bars.find(b => b.rest >= p.len + (b.parts.length ? kerf : 0));
    if (!bar) { bar = { parts: [], rest: stock }; bars.push(bar); }
    bar.rest -= p.len + (bar.parts.length ? kerf : 0);
    bar.parts.push(p);
  }
  return { bars, tooLong };
}

export function compute(cfg) {
  const G = geometry(cfg), c = G.c;
  const warn = [];

  // ---------- Kastenbretter ----------
  const boardsX = { label: 'Brett A (Längsrichtung)', len: G.LX, qty: G.pz.length, side: 'unten', notches: notches(G.LX, G.px, c) };
  const boardsZ = { label: 'Brett B (Querrichtung)', len: G.LZ, qty: G.px.length, side: 'oben', notches: notches(G.LZ, G.pz, c) };
  const same = Math.abs(G.LX - G.LZ) < 0.01 && boardsX.notches.length === boardsZ.notches.length;
  const boardTypes = same
    ? [{ ...boardsX, label: 'Kastenbrett (alle gleich)', qty: boardsX.qty + boardsZ.qty, side: 'beide', halfFlip: true }]
    : [boardsX, boardsZ];

  // ---------- Leisten ----------
  const laths = [];
  let doorLeaf = null, doorH = 0, lidDX = 0, lidDZ = 0;
  if (c.posts) {
    laths.push({ label: 'Querlatte vorne/hinten', len: G.oX, qty: 2 });
    laths.push({ label: 'Querlatte links/rechts', len: G.oZ, qty: 2 });
    if (c.net && c.front !== 'netz') {
      doorH = c.cageH - c.lw - 0.5;
      const leaves = c.front === 'doppeltuer' ? 2 : 1;
      const w = (G.oX - (leaves === 2 ? 1 : 0.5)) / leaves;
      doorLeaf = { leaves, w, h: doorH };
      laths.push({ label: 'Türrahmen oben/unten', len: w, qty: 2 * leaves });
      laths.push({ label: 'Türrahmen seitlich', len: doorH - 2 * c.lw, qty: 2 * leaves });
      if (leaves === 2) laths.push({ label: 'Schlagleiste Doppeltür', len: doorH, qty: 1 });
    }
    if (c.net && c.top === 'klapp') {
      lidDX = G.oX + 2 * c.ps; lidDZ = G.oZ + 2 * c.ps;
      laths.push({ label: 'Deckelrahmen vorne/hinten', len: lidDX, qty: 2 });
      laths.push({ label: 'Deckelrahmen seitlich', len: lidDZ - 2 * c.lw, qty: 2 });
    }
  }

  // ---------- Netz ----------
  let netArea = 0, netEdge = 0;
  if (c.net) {
    const hh = c.cageH - c.lw;
    const add = (w, h) => { netArea += w * h; netEdge += 2 * (w + h); };
    add(G.oX, hh); add(G.oZ, hh); add(G.oZ, hh);
    if (c.front === 'netz') add(G.oX, hh);
    else for (let i = 0; i < doorLeaf.leaves; i++) add(doorLeaf.w - 2 * c.lw, doorLeaf.h - 2 * c.lw);
    if (c.top === 'fest') add(G.oX + 2 * c.ps, G.oZ + 2 * c.ps);
    if (c.top === 'klapp') add(lidDX - 2 * c.lw, lidDZ - 2 * c.lw);
  }
  const netM2 = netArea / 10000 * 1.15;

  // ---------- Beschläge & Kleinteile ----------
  const hw = [];
  let hinges = 0;
  if (c.net && c.top === 'klapp') hinges += lidDX > 150 ? 3 : 2;
  if (doorLeaf) hinges += 2 * doorLeaf.leaves;
  if (hinges) hw.push({ label: 'Scharniere (verzinkt, ca. 40–50 mm)', qty: hinges, unit: 'Stk' });
  let chainLen = 0;
  if (c.net && c.top === 'klapp' && c.chain) {
    const d = lidDZ * 0.4, a = 100 * Math.PI / 180;
    const p = [d * Math.cos(a), d * Math.sin(a)], q = [-c.ps / 2, -(c.lw + 12)];
    chainLen = Math.ceil(Math.hypot(p[0] - q[0], p[1] - q[1]) + 5);
    hw.push({ label: `Kette ${chainLen} cm + 4 Schraubösen`, qty: 2, unit: 'Stk' });
  }
  if (doorLeaf) hw.push({ label: doorLeaf.leaves === 2 ? 'Riegel / Schubriegel für Doppeltür' : 'Riegel / Haken für Tür', qty: 1, unit: 'Stk' });
  if (c.net && c.top === 'klapp') hw.push({ label: 'Haken / Vorreiber für Deckel', qty: 1, unit: 'Stk' });

  let screws = 4; // Außenecken des Kastens
  if (c.posts) screws += 4 * 4 + 4 * 2 * 2;
  if (c.net && c.top === 'klapp') screws += 8;
  if (doorLeaf) screws += 8 * doorLeaf.leaves + (doorLeaf.leaves === 2 ? 4 : 0);
  hw.push({ label: 'Holzschrauben 4×40 (Edelstahl/verzinkt)', qty: Math.ceil(screws * 1.2 / 10) * 10, unit: 'Stk' });
  if (hinges) hw.push({ label: 'Holzschrauben 3,5×16 für Beschläge', qty: Math.ceil((hinges * 6 + 12) / 10) * 10, unit: 'Stk' });
  if (c.net) hw.push({ label: `${NET_TYPES[c.netType].fix.split(' ')[0]} (alle ~5 cm)`, qty: Math.ceil(netEdge / 5 / 50) * 50, unit: 'Stk' });
  if (c.grid === 'schnur') {
    const sl = (c.nx - 1) * (G.oZ + 10) + (c.nz - 1) * (G.oX + 10);
    hw.push({ label: 'Schnur (wetterfest)', qty: Math.ceil(sl / 100), unit: 'm' });
    hw.push({ label: 'Nägel / Schraubösen für Schnur', qty: 2 * (c.nx - 1 + c.nz - 1), unit: 'Stk' });
  }
  hw.push({ label: 'Holzleim wasserfest (D3), optional', qty: 1, unit: 'Fl.' });

  // ---------- Zuschnitt ----------
  const boardPieces = boardTypes.map(b => ({ label: b.label, len: b.len, qty: b.qty }));
  const boardCut = cutPlan(boardPieces, c.stock, c.kerf);
  const lathCut = cutPlan(laths, c.stock, c.kerf);
  const postCut = c.posts ? cutPlan([{ label: 'Pfosten', len: G.postLen, qty: 4 }], c.stock, c.kerf) : null;
  [boardCut, lathCut, postCut].forEach(p => p && p.tooLong.length &&
    warn.push(`${p.tooLong[0].label} (${fmt(p.tooLong[0].len)} cm) ist länger als die Rohlänge von ${fmt(c.stock)} cm. Längere Bretter kaufen oder stoßen.`));

  // ---------- Kennzahlen ----------
  const gr = GROUNDS[c.ground];
  const drain = gr.layers.includes('drainage') ? Math.min(c.drain, Math.max(0, c.h - c.soilGap - 5)) : 0;
  const cellArea = c.nx * c.nz * c.cell * c.cell;
  const soilL = cellArea * (c.h - c.soilGap - drain) / 1000;
  const drainL = cellArea * drain / 1000;
  const ground = [];
  const m2 = (w, d) => Math.ceil(w * d / 10000 * 1.05 * 10) / 10;
  gr.layers.forEach(k => {
    if (k === 'gitter') ground.push({ label: LAYERS.gitter, qty: m2(G.oX + 10, G.oZ + 10), unit: 'm²', note: `Zuschnitt ${fmt(G.oX + 10)} × ${fmt(G.oZ + 10)} cm` });
    if (k === 'vlies') ground.push({ label: LAYERS.vlies, qty: m2(G.oX + 20, G.oZ + 20), unit: 'm²', note: `Zuschnitt ${fmt(G.oX + 20)} × ${fmt(G.oZ + 20)} cm` });
    if (k === 'vlies2') ground.push({ label: LAYERS.vlies2, qty: m2(G.iX, G.iZ), unit: 'm²', note: 'pro Feld zuschneiden' });
    if (k === 'drainage' && drainL) ground.push({ label: LAYERS.drainage, qty: Math.ceil(drainL), unit: 'l', note: `${fmt(drain)} cm Schicht` });
    if (k === 'folie') ground.push({ label: LAYERS.folie, qty: m2(G.oX + 40, G.oZ + 40), unit: 'm²', note: `Zuschnitt ${fmt(G.oX + 40)} × ${fmt(G.oZ + 40)} cm, außen 20 cm hochgezogen` });
    if (k === 'kloetze') ground.push({ label: LAYERS.kloetze, qty: 2 * (G.px.length + G.pz.length) - 4, unit: 'Stk', note: 'unter jede Brettkreuzung am Rand' });
  });
  ground.push({ label: 'Noppenfolie für die Innenwände', qty: m2(2 * (G.iX + G.iZ), c.h), unit: 'm²', note: 'schützt das Holz vor nasser Erde' });
  const weight = Math.round(soilL * 1.3 + drainL * 0.5);
  if (!gr.soft && cfg.postGround > 0) warn.push('Auf festem Untergrund können die Pfosten nicht in den Boden. „Pfosten in den Boden“ wird ignoriert.');
  if (c.ground === 'holz') warn.push(`Gefüllt und nass wiegt der Kasten ca. ${weight} kg. Bei Balkonen unbedingt die Traglast prüfen.`);
  if (gr.layers.includes('drainage') && drain < c.drain) warn.push(`Der Kasten ist zu flach für ${fmt(c.drain)} cm Drainage. Es bleiben nur ${fmt(drain)} cm.`);
  if (gr.layers.includes('drainage') && c.h - c.soilGap - drain < 15) warn.push('Weniger als 15 cm Erde: Für Wurzelgemüse wie Karotten zu wenig.');
  const diag = Math.hypot(G.oX, G.oZ);
  const boardM = boardTypes.reduce((s, b) => s + b.len * b.qty, 0) / 100;
  if (c.posts && c.ov < c.ps) warn.push(`Der Überstand (${fmt(c.ov)} cm) ist kleiner als der Pfosten (${fmt(c.ps)} cm). Der Pfosten liegt nur teilweise an den Brettenden an.`);
  if (c.posts && c.ov === 0) warn.push('Ohne Überstand gibt es keine Ecke, in die der Pfosten passt. Stell mindestens ein paar cm Überstand ein.');
  if (c.h / c.t > 15) warn.push('Sehr hohe, dünne Bretter: Ab etwa 30 cm Höhe drückt die Erde die Wände stark nach außen. Dickere Bretter oder eine Mittelstrebe einplanen.');
  if (c.net && c.mesh > 3 && c.netType === 'vogelschutz') warn.push('Maschen über 3 cm halten kleine Vögel nicht zuverlässig ab.');
  if (doorLeaf && doorLeaf.w > 80) warn.push(`Türflügel sind ${fmt(doorLeaf.w)} cm breit, das hängt leicht durch. Eine Diagonalstrebe pro Flügel hilft.`);

  return {
    G, c, warn, boardTypes, laths, hw, doorLeaf, lidDX, lidDZ, chainLen,
    netM2, soilL, drainL, drain, ground, weight, diag, boardM, boardCut, lathCut, postCut,
    steps: instructions(G, c, { boardTypes, doorLeaf, soilL, diag, netM2, lidDX, ground, drain }),
  };
}

function instructions(G, c, d) {
  const S = [];
  const notchTxt = b => b.notches.map(n => fmt(n.from)).join(' / ');
  const w = fmt(c.t + c.play);
  S.push({ t: 'Material besorgen', d: `Kastenbretter mit ${fmt(c.t)} cm Stärke und ${fmt(c.h)} cm Breite (die Brettbreite ist die Kastenhöhe). Unbehandeltes Lärchen- oder Douglasienholz hält draußen am längsten ohne Chemie. Miss die echte Brettstärke nach: Wenn sie abweicht, trag sie oben ein, damit die Kerben stimmen.` });
  S.push({ t: 'Bretter ablängen', d: d.boardTypes.map(b => `${b.qty}× ${fmt(b.len)} cm`).join(', ') + '. Alle Bretter eines Typs gleich lang schneiden, am besten mit Anschlag.' });
  d.boardTypes.forEach(b => S.push({
    t: `Kerben anreißen: ${b.label}`,
    d: `Kerben ${w} cm breit, ${fmt(c.h / 2)} cm tief. Kerbanfang jeweils gemessen von der linken Brettkante: ${notchTxt(b)} cm. ` +
      (b.halfFlip ? 'Ein Brett sauber anreißen und als Schablone für alle anderen nehmen.' : 'Ein Brett als Schablone anreißen und auf die anderen übertragen.'),
  }));
  S.push({ t: 'Kerben sägen', d: `An beiden Rissen bis zur halben Höhe (${fmt(c.h / 2)} cm) einsägen, dazwischen 2–3 Entlastungsschnitte, dann mit dem Stechbeitel ausstemmen. Erst ein Kerbenpaar zur Probe zusammenstecken: Es soll stramm, aber ohne Hammer gehen.` });
  S.push({ t: 'Zusammenstecken', d: `Die Querbretter mit den Kerben nach oben parallel hinlegen, dann die Längsbretter mit den Kerben nach unten von oben einstecken.${d.boardTypes[0].halfFlip ? ' Da alle Bretter gleich sind, wird einfach die Hälfte umgedreht.' : ''} Rechtwinkligkeit prüfen: Beide Diagonalen der Außenwände müssen ${fmt(d.diag)} cm lang sein.` });
  S.push({ t: 'Kasten sichern', d: 'An den vier Außenecken je eine Schraube von oben durch die Verbindung, optional vorher wasserfesten Leim (D3) in die Kerben. Die Innenwände mit Noppenfolie auskleiden (Noppen zum Holz), oben ein paar cm unter der Kante festtackern.' });
  if (c.grid === 'schnur') S.push({ t: 'Raster spannen', d: `Oben an den Wänden alle ${fmt(c.cell)} cm einen Nagel oder eine Schraubenöse setzen und die Schnur in beide Richtungen spannen.` });
  if (c.posts) {
    S.push({ t: 'Pfosten setzen', d: `4 Pfosten ${fmt(c.ps)}×${fmt(c.ps)} cm auf ${fmt(G.postLen)} cm ablängen${c.postGround ? `, davon ${fmt(c.postGround)} cm in den Boden` : ''}. Jeder Pfosten kommt in die Ecke, die die überstehenden Brettenden bilden, und wird von zwei Seiten mit je 2 Schrauben angeschraubt. Mit der Wasserwaage senkrecht ausrichten.` });
    S.push({ t: 'Querlatten oben', d: `Oben zwischen den Pfosten ringsum Latten ${fmt(c.lw)}×${fmt(c.lt)} cm anschrauben: 2× ${fmt(G.oX)} cm und 2× ${fmt(G.oZ)} cm. Das macht den Käfig steif.` });
  }
  if (c.net) {
    const nt = NET_TYPES[c.netType];
    S.push({ t: 'Netz anbringen', d: `${nt.name}, Maschenweite ca. ${fmt(c.mesh)} cm, insgesamt ca. ${fmt(d.netM2)} m² inkl. 15 % Zugabe. Hinten und an den Seiten${c.front === 'netz' ? ', vorne' : ''}${c.top === 'fest' ? ' und oben' : ''} straff spannen und mit ${nt.fix} befestigen. Unten an der Oberkante der Kastenbretter, oben an den Querlatten.` });
    if (d.doorLeaf) {
      const L = d.doorLeaf;
      S.push({ t: L.leaves === 2 ? 'Doppeltür bauen' : 'Tür bauen', d: `${L.leaves === 2 ? 'Zwei Rahmen' : 'Einen Rahmen'} ${fmt(L.w)}×${fmt(L.h)} cm aus Latten bauen (Ecken verschrauben), Netz innen bespannen. ${L.leaves === 2 ? 'Jeder Flügel bekommt 2 Scharniere am vorderen Pfosten. An einen Flügel innen die Schlagleiste schrauben, sodass sie über den Mittelspalt ragt, an den anderen den Riegel.' : '2 Scharniere am linken Pfosten, Riegel rechts.'} Oben schlägt die Tür gegen die vordere Querlatte.` });
    }
    if (c.top === 'klapp') S.push({ t: 'Klappdeckel', d: `Rahmen ${fmt(d.lidDX)}×${fmt(G.oZ + 2 * c.ps)} cm aus Latten bauen und bespannen. Mit ${d.lidDX > 150 ? 3 : 2} Scharnieren an der hinteren Querlatte befestigen.${c.chain ? ' Links und rechts eine Kette vom Deckel zum hinteren Pfosten, damit er offen nicht nach hinten kippt.' : ''} Vorne ein Haken, damit Wind ihn nicht aufreißt.` });
  }
  const gr = GROUNDS[c.ground];
  S.push({ t: `Untergrund vorbereiten (${gr.name})`, d: 'Sonnigen Platz wählen. ' + gr.prep });
  const L = gr.layers, parts = [];
  if (L.includes('kloetze')) parts.push('Unterlegklötze unter die Brettkreuzungen am Rand legen');
  if (L.includes('folie')) parts.push(`Teichfolie unterlegen, den Kasten daraufstellen und die Folie außen ca. 20 cm hochziehen und antackern. An der tiefsten Ecke 2–3 kleine Löcher stechen und eine Schale darunterstellen, damit Staunässe ablaufen kann`);
  if (L.includes('gitter')) parts.push('Wühlmausgitter flach hinlegen, den Kasten genau daraufstellen und das Gitter rundum von außen an die Unterkante der Bretter tackern. Wichtig: keine Lücke an den Rändern, sonst kommen die Mäuse trotzdem rein');
  if (L.includes('vlies')) parts.push('Unkrautvlies hinlegen (rundum 10 cm größer als der Kasten) und den Kasten daraufstellen');
  if (L.includes('drainage') && d.drain) parts.push(`in jedes Feld ${fmt(d.drain)} cm Blähton oder groben Kies füllen`);
  if (L.includes('vlies2')) parts.push('darüber Vlies als Trennlage, damit die Erde nicht in die Drainage gespült wird');
  if (c.posts && c.postGround && gr.soft) parts.push(`die Pfosten ${fmt(c.postGround)} cm tief eingraben bzw. mit Einschlaghülsen setzen`);
  S.push({ t: 'Bodenaufbau', d: parts.map(p => p[0].toUpperCase() + p.slice(1) + '.').join(' ') });
  S.push({ t: 'Befüllen', d: `Ca. ${Math.round(d.soilL)} Liter Erde einfüllen (bis ${fmt(c.soilGap)} cm unter den Rand). Klassische Square-Foot-Mischung: je ein Drittel Kompost, Torfersatz (z. B. Kokos) und Vermiculit. Dann pro Feld eine Kultur pflanzen.` });
  return S;
}

export function toText(R) {
  const L = [];
  const c = R.c;
  L.push(`Square-Foot-Kasten ${c.nx}×${c.nz} Felder à ${fmt(c.cell)} cm`);
  L.push(`Grundfläche ${fmt(R.G.footX)} × ${fmt(R.G.footZ)} cm, Höhe ${fmt(c.posts ? R.G.postLen - c.postGround : c.h)} cm`);
  L.push('', 'MATERIALLISTE');
  R.boardTypes.forEach(b => L.push(`- ${b.qty}× ${b.label}: ${fmt(b.len)} × ${fmt(c.h)} × ${fmt(c.t)} cm`));
  L.push(`  -> ${R.boardCut.bars.length} Rohbretter à ${fmt(c.stock)} cm`);
  if (c.posts) L.push(`- 4× Pfosten ${fmt(c.ps)}×${fmt(c.ps)} cm, ${fmt(R.G.postLen)} cm lang`);
  R.laths.forEach(l => L.push(`- ${l.qty}× ${l.label}: ${fmt(l.len)} cm (Latte ${fmt(c.lw)}×${fmt(c.lt)})`));
  if (c.net) L.push(`- ${NET_TYPES[c.netType].name}: ca. ${fmt(R.netM2)} m²`);
  R.hw.forEach(h => L.push(`- ${h.qty} ${h.unit} ${h.label}`));
  L.push(`- Erde: ca. ${Math.round(R.soilL)} l`);
  L.push('', `UNTERGRUND: ${GROUNDS[c.ground].name}`);
  R.ground.forEach(g => L.push(`- ${g.qty} ${g.unit} ${g.label} (${g.note})`));
  L.push('', 'ZUSCHNITT / KERBEN');
  R.boardTypes.forEach(b => L.push(`${b.label} (${fmt(b.len)} cm): Kerben ${fmt(c.t + c.play)} breit, ${fmt(c.h / 2)} tief ab ` + b.notches.map(n => fmt(n.from)).join(', ') + ' cm'));
  L.push('', 'BAUANLEITUNG');
  R.steps.forEach((s, i) => L.push(`${i + 1}. ${s.t}: ${s.d}`));
  if (R.warn.length) { L.push('', 'HINWEISE'); R.warn.forEach(w => L.push('- ' + w)); }
  return L.join('\n');
}

export function toCSV(R) {
  const c = R.c, rows = [['Teil', 'Anzahl', 'Länge cm', 'Querschnitt', 'Hinweis']];
  R.boardTypes.forEach(b => rows.push([b.label, b.qty, fmt(b.len), `${fmt(c.h)}×${fmt(c.t)}`, 'Kerben ab ' + b.notches.map(n => fmt(n.from)).join(' ')]));
  if (c.posts) rows.push(['Pfosten', 4, fmt(R.G.postLen), `${fmt(c.ps)}×${fmt(c.ps)}`, '']);
  R.laths.forEach(l => rows.push([l.label, l.qty, fmt(l.len), `${fmt(c.lw)}×${fmt(c.lt)}`, '']));
  if (c.net) rows.push([NET_TYPES[c.netType].name, fmt(R.netM2) + ' m²', '', '', 'inkl. 15 % Zugabe']);
  R.hw.forEach(h => rows.push([h.label, `${h.qty} ${h.unit}`, '', '', '']));
  rows.push(['Erde', Math.round(R.soilL) + ' l', '', '', '']);
  R.ground.forEach(g => rows.push([g.label, `${g.qty} ${g.unit}`, '', '', g.note]));
  return rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
}
