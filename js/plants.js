// Pflanzen für Square Foot Gardening (Richtwerte für 30 × 30 cm Felder, Klima Franken/Bayern).
// n = Pflanzen pro Feld, depth = nötige Erdtiefe, height = Wuchshöhe, cells = Felder pro Pflanze,
// look = Darstellung im 3D-Modell (0 Blattgemüse, 1 Wurzel/Zwiebel, 2 Tomate/Fruchtgemüse, 3 Kräuter/Blumen).
// Reihenfolge = Vorrang beim automatischen Pflanzplan (einfache Klassiker zuerst).
export const PLANTS = [
  { k: 'salat', name: 'Pflücksalat', n: 4, depth: 15, height: 25, when: 'Mär–Aug säen', look: 0, note: 'Wächst immer wieder nach, wenn man nur die äußeren Blätter erntet.' },
  { k: 'radieschen', name: 'Radieschen', n: 16, depth: 10, height: 15, when: 'Mär–Sep säen', look: 1, note: 'Nach 4–6 Wochen fertig, perfekt zum Anfangen.' },
  { k: 'karotte', name: 'Karotten', n: 16, depth: 25, height: 30, when: 'Mär–Jul säen', look: 1, note: 'Braucht tiefe, lockere Erde ohne Steine.' },
  { k: 'buschtomate', name: 'Buschtomate', n: 1, depth: 20, height: 80, when: 'Jungpflanze ab Mitte Mai', look: 2, note: 'Mit Stab stützen. Unter Dach geschützt vor Regen und Braunfäule.' },
  { k: 'basilikum', name: 'Basilikum', n: 4, depth: 15, height: 35, when: 'ab Mitte Mai pflanzen', look: 3, note: 'Erst nach den Eisheiligen raus, mag es warm.' },
  { k: 'kohlrabi', name: 'Kohlrabi', n: 4, depth: 15, height: 30, when: 'Mär–Jul pflanzen', look: 0, note: 'Gleichmäßig gießen, sonst platzen die Knollen.' },
  { k: 'buschbohne', name: 'Buschbohnen', n: 9, depth: 15, height: 45, when: 'Mitte Mai–Jul säen', look: 0, note: 'Frostempfindlich, verbessern den Boden mit Stickstoff.' },
  { k: 'spinat', name: 'Spinat', n: 9, depth: 15, height: 20, when: 'Mär–Apr und Aug–Sep säen', look: 0, note: 'Mag es kühl, im Hochsommer schießt er.' },
  { k: 'fruehlingszwiebel', name: 'Frühlingszwiebeln', n: 16, depth: 15, height: 35, when: 'Mär–Aug säen', look: 1, note: 'Halten Möhrenfliegen fern, gut neben Karotten.' },
  { k: 'erdbeere', name: 'Erdbeeren', n: 4, depth: 15, height: 25, when: 'Jul–Aug pflanzen', look: 0, note: 'Mehrjährig, volle Ernte ab dem 2. Jahr. Netz schützt vor Vögeln.' },
  { k: 'mangold', name: 'Mangold', n: 4, depth: 15, height: 45, when: 'Apr–Jul säen', look: 0, note: 'Robust, man erntet monatelang.' },
  { k: 'petersilie', name: 'Petersilie', n: 4, depth: 20, height: 30, when: 'Mär–Jun säen', look: 3, note: 'Keimt langsam (3–4 Wochen), Geduld.' },
  { k: 'ringelblume', name: 'Ringelblume', n: 4, depth: 15, height: 50, when: 'Apr–Mai säen', look: 3, note: 'Lockt Nützlinge an und sieht gut aus.' },
  { k: 'rotebete', name: 'Rote Bete', n: 9, depth: 20, height: 30, when: 'Apr–Jun säen', look: 1, note: 'Unkompliziert, Blätter sind auch essbar.' },
  { k: 'paprika', name: 'Paprika', n: 1, depth: 20, height: 60, when: 'Jungpflanze ab Mitte Mai', look: 2, note: 'Braucht viel Sonne und Wärme.' },
  { k: 'schnittlauch', name: 'Schnittlauch', n: 4, depth: 15, height: 30, when: 'Mär–Mai pflanzen', look: 1, note: 'Mehrjährig, kommt jedes Jahr wieder.' },
  { k: 'kapuzinerkresse', name: 'Kapuzinerkresse', n: 1, depth: 15, height: 40, when: 'ab Mitte Mai säen', look: 3, note: 'Essbare Blüten, lenkt Blattläuse von anderen Pflanzen ab.' },
  { k: 'erbse', name: 'Erbsen', n: 8, depth: 15, height: 120, when: 'Mär–Mai säen', look: 2, note: 'Braucht ein Rankgitter, am besten am hinteren Rand.' },
  { k: 'brokkoli', name: 'Brokkoli', n: 1, depth: 20, height: 60, when: 'Apr–Jun pflanzen', look: 0, note: 'Braucht viel Nährstoffe, Netz schützt vor Kohlweißling.' },
  { k: 'stabtomate', name: 'Stabtomate', n: 1, depth: 25, height: 180, when: 'Jungpflanze ab Mitte Mai', look: 2, note: 'Wird sehr hoch, nur ohne Dach oder mit hohem Käfig.' },
  { k: 'zucchini', name: 'Zucchini', n: 1, cells: 4, depth: 25, height: 70, when: 'ab Mitte Mai pflanzen', look: 0, note: 'Wird riesig: eine Pflanze braucht 2 × 2 Felder.' },
];
export const NOT_SUITABLE = 'Nicht geeignet für Square Foot Gardening: Kartoffeln, Kürbis, Mais und Rhabarber. Sie brauchen viel mehr Platz oder Tiefe.';

// Bewertung jeder Pflanze für den aktuellen Kasten
export function rate(c, soilDepth, roof) {
  const scale = (c.cell / 30) ** 2;
  const covered = c.posts && c.net && c.top !== 'offen';
  const free = covered ? c.cageH + c.soilGap + roof : Infinity;
  return PLANTS.map(p => {
    const why = [];
    let status = 'gut';
    if (soilDepth < p.depth * 0.7) { status = 'nein'; why.push(`braucht ${p.depth} cm Erde, du hast ${Math.round(soilDepth)} cm`); }
    else if (soilDepth < p.depth) { status = 'knapp'; why.push(`ideal wären ${p.depth} cm Erde`); }
    if (p.height > free * 1.15) { status = 'nein'; why.push(`wird ${p.height} cm hoch, der Käfig hat ${Math.round(free)} cm`); }
    else if (p.height > free) { if (status === 'gut') status = 'knapp'; why.push('stößt bald oben ans Netz'); }
    const cells = p.cells ? Math.max(1, Math.ceil(p.cells / scale)) : 1;
    const per = p.cells ? 1 : Math.max(1, Math.round(p.n * scale));
    return { ...p, status, why, per, cellsNeeded: cells };
  });
}

// Pflanzplan: hohe Pflanzen hinten (Norden), niedrige vorne. Eigene Auswahl in c.plan hat Vorrang.
export function makePlan(c, rated) {
  const byK = Object.fromEntries(rated.map(p => [p.k, p]));
  const one = rated.filter(p => p.cellsNeeded === 1);
  const pool = [...one.filter(p => p.status === 'gut'), ...one.filter(p => p.status === 'knapp')];
  const cells = c.nx * c.nz, pick = [];
  for (let i = 0; pool.length && pick.length < cells; i++) pick.push(pool[i % pool.length]);
  pick.sort((a, b) => b.height - a.height);
  const grid = [];
  for (let j = 0; j < c.nz; j++) {
    grid.push([]);
    for (let i = 0; i < c.nx; i++) {
      const own = c.plan && c.plan[`${i},${j}`];
      grid[j].push(own === '-' ? null : (own && byK[own]) || pick[j * c.nx + i] || null);
    }
  }
  return grid;
}
