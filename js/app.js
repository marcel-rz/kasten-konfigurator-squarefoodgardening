import { DEFAULTS, NET_TYPES, GROUNDS, compute, sanitize, fmt, toText, toCSV } from './calc.js';
import { KastenScene } from './scene.js';

// ---------- Formular-Schema ----------
const SCHEMA = [
  { title: 'Kasten', fields: [
    ['nx', 'Felder in der Länge', 'number', { min: 1, max: 12, step: 1 }],
    ['nz', 'Felder in der Breite', 'number', { min: 1, max: 12, step: 1 }],
    ['cell', 'Feldgröße innen', 'number', { min: 10, max: 100, step: 1 }],
    ['h', 'Kastenhöhe', 'number', { min: 8, max: 80, step: 1, hint: '= Brettbreite' }],
    ['t', 'Brettstärke', 'number', { min: 1, max: 6, step: 0.1 }],
    ['ov', 'Überstand der Bretter', 'number', { min: 0, max: 30, step: 0.5 }],
    ['grid', 'Innenraster', 'select', { options: { bretter: 'Gesteckte Bretter', schnur: 'Schnur', keins: 'Keins' } }],
    ['play', 'Kerbspiel', 'number', { min: 0, max: 1, step: 0.05, hint: 'Kerbe breiter als Brett' }],
    ['soilGap', 'Erde unter Rand', 'number', { min: 0, max: 20, step: 0.5 }],
  ]},
  { title: 'Käfig', fields: [
    ['posts', 'Eckpfosten und Käfig', 'checkbox'],
    ['ps', 'Pfostenquerschnitt', 'number', { min: 3, max: 15, step: 0.5 }],
    ['cageH', 'Käfighöhe über Kasten', 'number', { min: 20, max: 200, step: 5 }],
    ['postGround', 'Pfosten in den Boden', 'number', { min: 0, max: 100, step: 5 }],
    ['lw', 'Lattenbreite', 'number', { min: 1.5, max: 8, step: 0.5 }],
    ['lt', 'Lattenstärke', 'number', { min: 1, max: 6, step: 0.5 }],
  ]},
  { title: 'Netz, Deckel und Tür', needs: 'posts', fields: [
    ['net', 'Netz', 'checkbox'],
    ['netType', 'Netzart', 'select', { options: Object.fromEntries(Object.entries(NET_TYPES).map(([k, v]) => [k, v.name])) }],
    ['mesh', 'Maschenweite', 'number', { min: 0.5, max: 10, step: 0.1 }],
    ['top', 'Oben', 'select', { options: { klapp: 'Klappdeckel', fest: 'Netz fest', offen: 'Offen' } }],
    ['chain', 'Haltekette am Deckel', 'checkbox'],
    ['front', 'Vorderseite', 'select', { options: { doppeltuer: 'Doppeltür', tuer: 'Einzeltür', netz: 'Netz fest' } }],
  ]},
  { title: 'Untergrund', fields: [
    ['ground', 'Worauf steht der Kasten?', 'select', { options: Object.fromEntries(Object.entries(GROUNDS).map(([k, v]) => [k, v.name])) }],
    ['drain', 'Drainageschicht', 'number', { min: 0, max: 20, step: 1, hint: 'nur auf festem Boden' }],
  ]},
  { title: 'Zuschnitt', fields: [
    ['stock', 'Rohlänge Bretter/Latten', 'number', { min: 50, max: 600, step: 10 }],
    ['kerf', 'Sägeschnitt', 'number', { min: 0, max: 1, step: 0.1 }],
  ]},
];

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

function loadCfg() {
  try {
    const q = new URLSearchParams(location.search).get('k');
    if (q) return sanitize(JSON.parse(decodeURIComponent(q)));
  } catch (e) { /* ungültiger Link */ }
  try { const s = localStorage.getItem('kasten-cfg'); if (s) return sanitize(JSON.parse(s)); } catch (e) { /* kein Storage */ }
  return { ...DEFAULTS };
}
let cfg = loadCfg();

function buildForm() {
  const f = $('#controls');
  f.innerHTML = SCHEMA.map((g, gi) => `<fieldset data-g="${gi}"><legend>${g.title}</legend>` + g.fields.map(([k, label, type, o = {}]) => {
    const hint = o.hint ? `<small>${o.hint}</small>` : '';
    let input;
    if (type === 'checkbox') input = `<input type="checkbox" name="${k}" id="f-${k}">`;
    else if (type === 'select') input = `<select name="${k}" id="f-${k}">${Object.entries(o.options).map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select>`;
    else input = `<input type="number" name="${k}" id="f-${k}" min="${o.min}" max="${o.max}" step="${o.step}" inputmode="decimal">`;
    return `<div class="row" data-k="${k}"><label for="f-${k}">${label}${hint}</label>${input}</div>`;
  }).join('') + '</fieldset>').join('') +
  `<div class="actions"><button type="button" id="reset">Zurücksetzen</button></div>`;
  for (const [k, val] of Object.entries(cfg)) {
    const el = f.elements[k]; if (!el) continue;
    if (el.type === 'checkbox') el.checked = !!val; else el.value = val;
  }
  f.addEventListener('input', onInput);
  f.addEventListener('change', onInput);
  $('#reset').onclick = () => { cfg = { ...DEFAULTS }; buildForm(); render(); };
  syncDisabled();
}

function onInput(e) {
  const el = e.target; if (!el.name) return;
  if (el.type === 'checkbox') cfg[el.name] = el.checked;
  else if (el.type === 'number') { if (el.value === '') return; cfg[el.name] = parseFloat(el.value.replace(',', '.')); }
  else cfg[el.name] = el.value;
  syncDisabled();
  schedule();
}

function syncDisabled() {
  const f = $('#controls'), c = sanitize(cfg);
  f.querySelector('fieldset[data-g="2"]').disabled = !c.posts;
  ['ps', 'cageH', 'postGround', 'lw', 'lt'].forEach(k => f.elements[k].disabled = !c.posts);
  if (!GROUNDS[c.ground].soft) f.elements.postGround.disabled = true;
  f.elements.drain.disabled = !GROUNDS[c.ground].layers.includes('drainage');
  ['netType', 'mesh', 'top', 'front'].forEach(k => f.elements[k].disabled = !c.net);
  f.elements.chain.disabled = !(c.net && c.top === 'klapp');
}

let timer;
function schedule() { clearTimeout(timer); timer = setTimeout(render, 120); }

// ---------- 3D ----------
const scene = new KastenScene($('#viewer'));
const VIEW_BTNS = [['explode', 'Explosion'], ['plants', 'Erde und Pflanzen'], ['lid', 'Deckel öffnen'], ['doors', 'Türen öffnen'], ['net', 'Netz anzeigen']];
function buildToolbar() {
  $('#toolbar').innerHTML = VIEW_BTNS.map(([k, t]) => `<button type="button" data-v="${k}">${t}</button>`).join('');
  $('#toolbar').onclick = e => {
    const k = e.target.dataset.v; if (!k) return;
    scene.view[k] = !scene.view[k];
    if ((k === 'lid' || k === 'doors') && scene.view[k]) scene.view.net = true;
    markToolbar();
  };
  markToolbar();
}
function markToolbar(c = sanitize(cfg)) {
  document.querySelectorAll('#toolbar button').forEach(b => {
    const k = b.dataset.v;
    b.classList.toggle('on', !!scene.view[k]);
    b.hidden = (k === 'lid' && !(c.net && c.top === 'klapp')) || (k === 'doors' && !(c.net && c.front !== 'netz')) || (k === 'net' && !c.posts);
  });
}

// ---------- Ausgabe ----------
function boardSVG(b, c) {
  const W = 1000, scale = W / b.len, hpx = Math.max(60, c.h * scale), pad = 46, nd = c.h / 2 * scale;
  const flip = b.side === 'oben';
  let d = '';
  // Brettumriss mit Kerben als Pfad (Kerben unten oder oben)
  const yTop = pad, yBot = pad + hpx;
  const pts = [];
  const ns = b.notches.map(n => [n.from * scale, n.to * scale]);
  if (!flip) {
    pts.push([0, yTop], [W, yTop], [W, yBot]);
    [...ns].reverse().forEach(([a, e]) => pts.push([e, yBot], [e, yBot - nd], [a, yBot - nd], [a, yBot]));
    pts.push([0, yBot]);
  } else {
    pts.push([0, yTop]);
    ns.forEach(([a, e]) => pts.push([a, yTop], [a, yTop + nd], [e, yTop + nd], [e, yTop]));
    pts.push([W, yTop], [W, yBot], [0, yBot]);
  }
  d = 'M' + pts.map(p => p.map(n => n.toFixed(1)).join(',')).join(' L') + ' Z';
  const labels = b.notches.map((n, i) => {
    const x = n.from * scale, y = flip ? pad - 8 - (i % 2) * 20 : yBot + 18 + (i % 2) * 20;
    return `<line x1="${x}" x2="${x}" y1="${flip ? pad : yBot}" y2="${flip ? y + 4 : y - 12}" stroke="currentColor" stroke-width="1" opacity=".5"/><text x="${x}" y="${y}" font-size="19" text-anchor="middle" fill="currentColor">${fmt(n.from)}</text>`;
  }).join('');
  const H = hpx + 2 * pad + 16;
  return `<svg viewBox="-20 0 ${W + 40} ${H}" role="img" aria-label="${esc(b.label)} mit Kerben">
    <path d="${d}" fill="#d9b483" stroke="#5a3a1e" stroke-width="1.5"/>
    ${labels}
  </svg>`;
}

function barsHTML(plan, stock) {
  const groups = new Map();
  plan.bars.forEach(b => { const k = b.parts.map(p => p.len).join('|'); const g = groups.get(k) || { bar: b, n: 0 }; g.n++; groups.set(k, g); });
  return [...groups.values()].map(({ bar, n }) => {
    const parts = bar.parts.map(p => `<div class="p" style="width:${p.len / stock * 100}%" title="${esc(p.label)}">${fmt(p.len)}</div>`).join('');
    const rest = bar.rest > 0.5 ? `<div class="r" style="flex:1">Rest ${fmt(bar.rest)}</div>` : '';
    return `<div class="barrow"><b>${n}×</b><div class="bar">${parts}${rest}</div></div>`;
  }).join('');
}

function render() {
  const R = compute(cfg), c = R.c, G = R.G;
  try { localStorage.setItem('kasten-cfg', JSON.stringify(c)); } catch (e) { /* egal */ }
  scene.update(R);
  markToolbar(c);
  const height = c.posts ? c.h + c.cageH : c.h;
  $('#stats').innerHTML = [
    ['Grundfläche', `${fmt(G.footX)} × ${fmt(G.footZ)} cm`],
    ['Höhe', `${fmt(height)} cm`],
    ['Pflanzfläche', `${fmt(c.nx * c.nz * c.cell * c.cell / 10000)} m² · ${c.nx * c.nz} Felder`],
    ['Erde', `ca. ${Math.round(R.soilL)} l${R.drainL ? ` + ${Math.round(R.drainL)} l Drainage` : ''}`],
    ['Gewicht gefüllt', `ca. ${R.weight} kg`],
  ].map(([a, b]) => `<div class="stat"><span>${a}</span><b>${b}</b></div>`).join('');

  const matRows = [];
  R.boardTypes.forEach(b => matRows.push([b.qty + '×', b.label, `${fmt(b.len)} cm`, `${fmt(c.h)} × ${fmt(c.t)}`]));
  if (c.posts) matRows.push(['4×', 'Pfosten', `${fmt(G.postLen)} cm`, `${fmt(c.ps)} × ${fmt(c.ps)}`]);
  R.laths.forEach(l => matRows.push([l.qty + '×', l.label, `${fmt(l.len)} cm`, `${fmt(c.lw)} × ${fmt(c.lt)}`]));
  if (c.net) matRows.push([`${fmt(R.netM2)} m²`, NET_TYPES[c.netType].name + `, Masche ${fmt(c.mesh)} cm`, '', 'inkl. 15 % Zugabe']);
  R.hw.forEach(h => matRows.push([`${h.qty} ${h.unit}`, h.label, '', '']));
  matRows.push([`${Math.round(R.soilL)} l`, 'Pflanzerde (Kompost, Kokos, Vermiculit je 1/3)', '', '']);
  matRows.push(['', `Unter den Kasten (${GROUNDS[c.ground].name})`, '', '', true]);
  R.ground.forEach(g => matRows.push([`${String(g.qty).replace('.', ',')} ${g.unit}`, g.label, '', g.note]));

  const buy = [`${R.boardCut.bars.length}× Brett ${fmt(c.h)} × ${fmt(c.t)} cm à ${fmt(c.stock)} cm`];
  if (R.postCut) buy.push(`${R.postCut.bars.length}× Kantholz ${fmt(c.ps)} × ${fmt(c.ps)} cm à ${fmt(c.stock)} cm`);
  if (R.laths.length) buy.push(`${R.lathCut.bars.length}× Latte ${fmt(c.lw)} × ${fmt(c.lt)} cm à ${fmt(c.stock)} cm`);

  $('#output').innerHTML = `
    ${R.warn.length ? `<div class="warn"><b>Hinweise</b><ul>${R.warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul></div>` : ''}
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><h2 style="margin:0">Materialliste</h2>
      <div class="actions"><button type="button" id="copy">Alles kopieren</button><button type="button" id="csv">CSV</button><button type="button" id="print">Drucken</button><button type="button" id="share">Link teilen</button></div></div>
      <table style="margin-top:10px"><thead><tr><th>Menge</th><th>Teil</th><th>Länge</th><th>Maß / Hinweis</th></tr></thead>
      <tbody>${matRows.map(r => r[4] === true ? `<tr><th colspan="4" style="padding-top:14px;color:var(--ink)">${esc(r[1])}</th></tr>` : `<tr><td class="num">${esc(r[0])}</td><td>${esc(r[1])}</td><td class="num">${esc(r[2])}</td><td class="num">${esc(r[3])}</td></tr>`).join('')}</tbody></table>
      <p style="font-size:14px;margin:12px 0 0"><b>Einkaufen:</b> ${buy.map(esc).join(' · ')}</p>
    </div>
    <div class="card">
      <h2>Zuschnitt und Kerben</h2>
      <p style="font-size:14px;color:var(--muted);margin:0">Maße sind der Kerbanfang, gemessen von der linken Brettkante.</p>
      ${R.boardTypes.map(b => `<div class="board"><b>${b.qty}× ${esc(b.label)}</b> · ${fmt(b.len)} × ${fmt(c.h)} cm, Kerben ${fmt(c.t + c.play)} breit und ${fmt(c.h / 2)} tief${b.halfFlip ? ' (die Hälfte der Bretter umgedreht einbauen)' : ', Kerben ' + b.side}${boardSVG(b, c)}</div>`).join('')}
      <h3 style="font-size:15px;margin:8px 0 4px">Schnittplan Bretter (Rohlänge ${fmt(c.stock)} cm)</h3>${barsHTML(R.boardCut, c.stock)}
      ${R.postCut ? `<h3 style="font-size:15px;margin:12px 0 4px">Schnittplan Pfosten</h3>${barsHTML(R.postCut, c.stock)}` : ''}
      ${R.laths.length ? `<h3 style="font-size:15px;margin:12px 0 4px">Schnittplan Latten</h3>${barsHTML(R.lathCut, c.stock)}` : ''}
    </div>
    <div class="card">
      <h2>Bauanleitung</h2>
      <ol class="steps">${R.steps.map(s => `<li><b>${esc(s.t)}</b>${esc(s.d)}</li>`).join('')}</ol>
    </div>`;

  $('#copy').onclick = () => copy(toText(R), 'Materialliste und Anleitung kopiert');
  $('#csv').onclick = () => {
    try {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['﻿' + toCSV(R)], { type: 'text/csv' }));
      a.download = `kasten-${c.nx}x${c.nz}.csv`; a.click();
    } catch (e) { copy(toCSV(R), 'Download nicht möglich, CSV wurde kopiert'); }
  };
  $('#print').onclick = () => { try { window.print(); } catch (e) { toast('Drucken geht hier nicht. Nutz „Alles kopieren“.'); } };
  $('#share').onclick = () => {
    const url = location.origin + location.pathname + '?k=' + encodeURIComponent(JSON.stringify(c));
    copy(url, 'Link mit deiner Konfiguration kopiert');
  };
}

async function copy(text, msg) {
  try { await navigator.clipboard.writeText(text); toast(msg); }
  catch (e) {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast(msg); } catch (e2) { toast('Kopieren nicht möglich'); }
    ta.remove();
  }
}
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200); }

buildForm();
buildToolbar();
render();
