'use strict';
// ---------------------------------------------------------------- constante
const STATUSES = ['Primit', 'Diagnostic', 'Reparație', 'Test', 'Gata', 'Predat'];
const CATS = ['Etichetă ECU', 'Primire (stare)', 'Placă față', 'Placă spate', 'Defect găsit', 'În timpul reparației', 'După reparație', 'Altele'];
const FAM = ['', 'EDC15', 'EDC16', 'EDC17', 'MED/ME (benzină)', 'Bord (cluster)', 'Altele'];
const BACKUP_METHODS = ['', 'OBD', 'Banc (bench)', 'Mod boot', 'BDM / JTAG', 'Direct pe cip', 'Nu s-a putut'];
const TABS = [['client', 'Client & modul'], ['lucrare', 'Lucrare & evaluare'], ['fisa', 'Fișa plăcii'], ['poze', 'Poze'], ['rep', 'Defecte & reparații'], ['predare', 'Predare']];

// ---------------------------------------------------------------- utilitare
const $ = (s, r = document) => r.querySelector(s);
function h(tag, props, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (v === false || v == null) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const c of kids.flat()) {
    if (c == null || c === false) continue;
    e.append(c.nodeType ? c : document.createTextNode(c));
  }
  return e;
}
function toast(msg, ms = 2200) {
  const t = h('div', { class: 'toast' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), ms);
}
function fmtDate(s) {
  if (!s) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
}
const app = $('#app');
function setHeader(title, buttons) {
  $('#title').textContent = title;
  const tb = $('#topbtns');
  tb.innerHTML = '';
  (buttons || []).forEach(b => tb.append(b));
  document.title = title + ' · Fișe ECU';
}

// ---------------------------------------------------------------- API
let loginPromise = null;
async function api(path, opt = {}) {
  const o = { method: opt.method || 'GET', headers: {}, credentials: 'same-origin' };
  if (opt.json !== undefined) { o.body = JSON.stringify(opt.json); o.headers['Content-Type'] = 'application/json'; }
  if (opt.raw) { o.body = opt.raw; o.headers['Content-Type'] = 'image/jpeg'; }
  if (opt.keepalive) o.keepalive = true;
  const r = await fetch(path, o);
  if (r.status === 401) { await showLogin(); return api(path, opt); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || ('Eroare ' + r.status));
  return j;
}
function showLogin() {
  if (loginPromise) return loginPromise;
  loginPromise = new Promise(resolve => {
    setHeader('Fișe ECU', []);
    const pin = h('input', { type: 'tel', inputmode: 'numeric', placeholder: 'PIN', autocomplete: 'off' });
    const err = h('div', { class: 'hint', style: 'color:var(--bad)' });
    const go = async () => {
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin.value }), credentials: 'same-origin' });
      if (r.ok) { loginPromise = null; resolve(); } else { err.textContent = 'PIN greșit'; pin.select(); }
    };
    pin.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    app.innerHTML = '';
    app.append(h('div', { class: 'card login' }, h('h2', {}, 'Introdu PIN-ul'), pin, h('div', { style: 'height:10px' }), h('button', { class: 'btn primary', onclick: go }, 'Deschide'), err));
    setTimeout(() => pin.focus(), 50);
  });
  return loginPromise;
}

// ---------------------------------------------------------------- autosave
let C = null, saveT = null, savedEl = null;
function setSaved(txt, ok) { if (savedEl) { savedEl.textContent = txt; savedEl.className = 'saved' + (ok ? ' ok' : ''); } }
function dirty() { setSaved('Se salvează…'); clearTimeout(saveT); saveT = setTimeout(save, 700); }
async function save() {
  clearTimeout(saveT); saveT = null;
  if (!C) return;
  try { await api('/api/cases/' + C.id, { method: 'PUT', json: { data: C.data } }); setSaved('Salvat ✓', true); }
  catch (e) { setSaved('Nesalvat: ' + e.message); }
}
async function flush() { if (saveT) await save(); }
window.addEventListener('pagehide', () => { if (saveT && C) api('/api/cases/' + C.id, { method: 'PUT', json: { data: C.data }, keepalive: true }).catch(() => {}); });
document.addEventListener('visibilitychange', () => { if (document.hidden && saveT) save(); });

// ---------------------------------------------------------------- câmpuri legate de C.data
function F(label, key, o = {}) {
  const el = h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.type || 'text'), placeholder: o.ph || '', inputmode: o.im, autocomplete: 'off', autocapitalize: o.cap || 'sentences', spellcheck: 'false' });
  if (o.rows) el.rows = o.rows;
  el.value = C.data[key] ?? '';
  el.addEventListener('input', () => { C.data[key] = el.value; dirty(); });
  return h('label', { class: 'f' }, h('span', {}, label), el);
}
function S(label, key, options) {
  const el = h('select', {}, options.map(o => h('option', { value: o }, o || '—')));
  el.value = C.data[key] ?? '';
  el.addEventListener('change', () => { C.data[key] = el.value; dirty(); });
  return h('label', { class: 'f' }, h('span', {}, label), el);
}
function K(label, getter, setter) {
  const el = h('input', { type: 'checkbox', style: 'width:22px;height:22px;min-height:0' });
  el.checked = !!getter();
  el.addEventListener('change', () => { setter(el.checked); dirty(); });
  return h('label', { class: 'f row', style: 'gap:10px;align-items:flex-start;color:var(--text)' }, el, h('span', { style: 'margin:0' }, label));
}
function card(title, ...kids) { return h('div', { class: 'card' }, title ? h('h2', {}, title) : null, ...kids); }

// ---- date implicite pentru cazuri mai vechi + setări (tarif/oră)
let SET = null;
async function loadSettings() { if (!SET) { try { SET = await api('/api/settings'); } catch (e) { SET = {}; } } return SET; }
function ensure(d) {
  d.module_type ??= ''; d.job_types ??= []; d.job_other ??= ''; d.checklist ??= [];
  d.compliance = Object.assign({ docs_checked: false, docs_note: '', lawful_use: '', lawful_note: '', declaration_signed: false, safety_validated: false }, d.compliance || {});
  d.estimate = Object.assign({ best_hours: '', best_parts: '', best_note: '', worst_hours: '', worst_parts: '', worst_note: '', scope: '', risks: '', success: '' }, d.estimate || {});
  if (d.estimate_on_report === undefined) d.estimate_on_report = true;
  return d;
}
const num = v => { const x = parseFloat(String(v ?? '').replace(',', '.')); return isFinite(x) ? x : 0; };
const rate = () => num(SET && SET.hourly_rate);
const money = n => (Math.round(n * 100) / 100).toLocaleString('ro-RO', { maximumFractionDigits: 2 }) + ' ' + ((SET && SET.currency) || 'lei');
function estTotals(e) { const r = rate(); return { best: num(e.best_hours) * r + num(e.best_parts), worst: num(e.worst_hours) * r + num(e.worst_parts) }; }
function complianceMissing() {
  const d = C.data, lv = jobLevels(d.job_types), c = d.compliance, out = [];
  if (lv.has('doc') && !c.docs_checked) out.push('verificarea actelor nu este bifată (fila Lucrare & evaluare)');
  if (lv.has('law') && !c.lawful_use) out.push('alege utilizarea legală declarată (fila Lucrare & evaluare)');
  if (lv.has('law') && !c.declaration_signed) out.push('declarația clientului de utilizare legală nu este bifată');
  if (lv.has('safety') && !c.safety_validated) out.push('validarea funcțională a sistemului de siguranță nu este bifată');
  if (lv.size && !d.signature) out.push('lipsește semnătura clientului (fila Predare)');
  return out;
}
function syncChecklist() {
  const old = C.data.checklist || [];
  const keep = new Map(old.map(i => [i.job + '|' + i.text, i.done]));
  const out = [];
  for (const k of C.data.job_types) { const j = jobByKey(k); if (!j) continue; for (const t of j.steps) out.push({ job: k, text: t, done: !!keep.get(k + '|' + t) }); }
  for (const i of old) if (i.job === 'custom') out.push(i);
  C.data.checklist = out;
}
// câmp legat de un obiect oarecare (nu doar C.data)
function FO(label, obj, key, o = {}, cb) {
  const el = h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.type || 'text'), placeholder: o.ph || '', inputmode: o.im, autocomplete: 'off', spellcheck: 'false' });
  if (o.rows) el.rows = o.rows;
  el.value = obj[key] ?? '';
  el.addEventListener('input', () => { obj[key] = el.value; dirty(); if (cb) cb(); });
  return h('label', { class: 'f' }, h('span', {}, label), el);
}

function rowsEditor(key, cols, blank) {
  const wrap = h('div');
  const draw = () => {
    wrap.innerHTML = '';
    const arr = C.data[key];
    const tb = h('table', { class: 'rows' });
    tb.append(h('thead', {}, h('tr', {}, cols.map(c => h('th', { style: `min-width:${c.w || 110}px;font-size:11px` }, c.label)), h('th', {}))));
    const body = h('tbody');
    arr.forEach((row, i) => {
      const tr = h('tr');
      cols.forEach(c => {
        let el;
        if (c.opts) {
          el = h('select', {}, c.opts.map(o => h('option', { value: o }, o || '—')));
          el.value = row[c.k] ?? '';
          el.addEventListener('change', () => { row[c.k] = el.value; dirty(); });
        } else {
          el = h('input', { type: 'text', placeholder: c.ph || '', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
          el.value = row[c.k] ?? '';
          el.addEventListener('input', () => { row[c.k] = el.value; dirty(); });
        }
        tr.append(h('td', {}, el));
      });
      tr.append(h('td', {}, h('button', { class: 'btn small danger', style: 'padding:6px 9px;min-height:40px', title: 'Șterge rândul', onclick: () => { arr.splice(i, 1); dirty(); draw(); } }, '×')));
      body.append(tr);
    });
    tb.append(body);
    wrap.append(h('div', { class: 'tablewrap' }, tb), h('div', { style: 'height:8px' }), h('button', { class: 'btn small', onclick: () => { arr.push({ ...blank }); dirty(); draw(); } }, '+ Adaugă rând'));
  };
  draw();
  return wrap;
}

// ---------------------------------------------------------------- listă
let listQ = '', listStatus = '';
async function viewList() {
  C = null; savedEl = null;
  setHeader('Fișe ECU', [h('a', { href: '#/setup' }, '⚙ Setări')]);
  app.innerHTML = '';
  const q = h('input', { type: 'search', placeholder: 'Caută: client, număr auto, ECU, VIN…', value: listQ, autocomplete: 'off', style: 'font-size:16px' });
  const chips = h('div', { class: 'chips' });
  const out = h('div');
  const draw = async () => {
    chips.innerHTML = '';
    ['', ...STATUSES].forEach(s => chips.append(h('button', { class: listStatus === s ? 'on' : '', onclick: () => { listStatus = s; draw(); } }, s || 'Toate')));
    let rows = [];
    try { rows = await api('/api/cases?q=' + encodeURIComponent(listQ) + '&status=' + encodeURIComponent(listStatus)); } catch (e) { out.textContent = e.message; return; }
    out.innerHTML = '';
    if (!rows.length) out.append(h('div', { class: 'empty' }, listQ || listStatus ? 'Nu am găsit niciun caz.' : 'Niciun caz încă. Apasă „+ Caz nou”.'));
    rows.forEach(r => out.append(h('a', { class: 'card case', href: '#/case/' + r.id },
      h('div', { class: 'row sp' }, h('span', { class: 'n' }, r.number), h('span', { class: 'badge ' + r.status }, r.status)),
      h('div', {}, [r.plate, r.vehicle].filter(Boolean).join(' · ') || h('span', { class: 'muted' }, 'fără vehicul')),
      h('div', { class: 'meta' }, [r.client_name, (moduleByKey(r.module_type) || [])[1] || r.ecu_model || r.ecu_hw, fmtDate(r.created), r.photos ? r.photos + ' poze' : ''].filter(Boolean).join(' · ')),
      (r.job_types || []).length ? h('div', { class: 'row', style: 'gap:4px;margin-top:6px' }, r.job_types.slice(0, 4).map(k => h('span', { class: 'badge' }, (jobByKey(k) || { label: k }).label.split(' (')[0].split(':')[0]))) : null
    )));
  };
  let t;
  q.addEventListener('input', () => { listQ = q.value; clearTimeout(t); t = setTimeout(draw, 250); });
  app.append(q, chips, out, h('button', { class: 'btn primary fab', onclick: newCase }, '+ Caz nou'));
  draw();
}
async function newCase() {
  try { const c = await api('/api/cases', { method: 'POST', json: {} }); location.hash = '#/case/' + c.id + '/client'; }
  catch (e) { toast(e.message); }
}

// ---------------------------------------------------------------- caz
async function viewCase(id, tab) {
  let c;
  try { c = await api('/api/cases/' + id); } catch (e) { app.textContent = e.message; return; }
  C = c; ensure(C.data); await loadSettings();
  const title = C.number + (C.data.plate ? ' · ' + C.data.plate : '');
  setHeader(title, [h('a', { href: '#/' }, '‹ Listă')]);
  app.innerHTML = '';
  savedEl = h('span', { class: 'saved ok' }, 'Salvat ✓');
  const status = h('select', { style: 'width:auto;min-height:40px' }, STATUSES.map(s => h('option', { value: s }, s)));
  status.value = C.data.status;
  status.addEventListener('change', () => {
    if (status.value === 'Predat') { const miss = complianceMissing(); if (miss.length) { toast('Nu poți marca „Predat”: ' + miss[0], 6000); status.value = C.data.status; return; } }
    C.data.status = status.value; dirty();
  });
  app.append(h('div', { class: 'row sp', style: 'margin-bottom:10px' }, h('div', { class: 'row' }, h('span', { class: 'muted' }, 'Stare:'), status), savedEl));
  const tabs = h('div', { class: 'tabs' }, TABS.map(([k, l]) => h('button', { class: k === tab ? 'on' : '', onclick: () => { location.hash = `#/case/${id}/${k}`; } }, l)));
  app.append(tabs);
  const body = h('div');
  app.append(body);
  ({ client: tabClient, lucrare: tabLucrare, fisa: tabFisa, poze: tabPoze, rep: tabRep, predare: tabPredare }[tab] || tabClient)(body);
}

function moduleSelect() {
  const groups = [...new Set(MODULES.map(m => m[2]))];
  const sel = h('select', {}, h('option', { value: '' }, '— alege tipul de modul —'), groups.map(g => h('optgroup', { label: g }, MODULES.filter(m => m[2] === g).map(m => h('option', { value: m[0] }, m[1])))));
  sel.value = C.data.module_type || '';
  const hint = h('div', { class: 'hint' });
  const upd = () => { const m = moduleByKey(sel.value); hint.textContent = m && m[3] ? 'Defecte tipice: ' + m[3] : ''; };
  sel.addEventListener('change', () => { C.data.module_type = sel.value; upd(); dirty(); });
  upd();
  return h('div', {}, h('label', { class: 'f' }, h('span', {}, 'Tip de modul'), sel), hint);
}

function tabClient(root) {
  root.append(
    card('Client', h('div', { class: 'grid c2' }, F('Nume', 'client_name', { ph: 'Nume client' }), F('Telefon', 'client_phone', { type: 'tel', im: 'tel' }))),
    card('Vehicul', h('div', { class: 'grid c3' }, F('Marcă / model / an', 'vehicle', { ph: 'ex. VW Transporter T5 2.0 TDI' }), F('Număr înmatriculare', 'plate', { cap: 'characters' }), F('VIN', 'vin', { cap: 'characters' }))),
    card('Modul / dispozitiv', moduleSelect(), h('div', { style: 'height:10px' }), h('div', { class: 'grid c2' }, F('Model (de pe etichetă)', 'ecu_model', { ph: 'ex. Bosch EDC16U1, ZF 8HP, VW RCD510' }), S('Familie / serie', 'ecu_family', FAM), F('Cod hardware (ex. Bosch 0 281 …)', 'ecu_hw', { cap: 'characters' }), F('Cod software (SW / 1037…)', 'ecu_sw', { cap: 'characters' }))),
    card('Primire', h('div', { class: 'grid' }, F('Simptom spus de client (cu cuvintele lui)', 'symptom', { area: true, rows: 3, ph: 'ex. Nu pornește; după ce se răcește pornește.' }),
      F('Starea la primire (urme de apă, deschis, modificat, conector deteriorat…)', 'visual_state', { area: true, rows: 3 }),
      K('Clientul a fost informat despre riscul de pierdere de date și de a nu reuși reparația, și este de acord.', () => C.data.data_risk_ok, v => C.data.data_risk_ok = v))),
    h('div', { class: 'row sp' }, h('span', {}), h('button', { class: 'btn primary', onclick: () => { location.hash = `#/case/${C.id}/lucrare`; } }, 'Lucrare & evaluare →'))
  );
}

function tabLucrare(root) {
  const d = C.data;
  const draw = () => {
    root.innerHTML = '';
    // --- tipuri de lucrări
    const groups = [...new Set(JOBS.map(j => j.group))];
    const jobsCard = card('Tip de lucrare cerută', h('p', { class: 'hint', style: 'margin-top:0' }, 'Poți alege mai multe. Alegerea generează lista de pași și propunerea de estimare.'),
      groups.map(g => h('div', {}, h('div', { class: 'muted', style: 'font-size:13px;margin:10px 0 4px;font-weight:600' }, g),
        JOBS.filter(j => j.group === g).map(j => {
          const el = h('input', { type: 'checkbox', style: 'width:22px;height:22px;min-height:0;flex:none' });
          el.checked = d.job_types.includes(j.k);
          el.addEventListener('change', () => {
            d.job_types = el.checked ? [...d.job_types, j.k] : d.job_types.filter(x => x !== j.k);
            syncChecklist(); dirty(); draw();
          });
          return h('label', { class: 'row', style: 'gap:10px;align-items:flex-start;padding:6px 0;flex-wrap:nowrap' }, el, h('span', {}, j.label, j.level ? h('span', { class: 'badge', style: 'margin-left:6px;background:#ffe7c2;color:#8a5a00' }, j.level === 'safety' ? 'siguranță' : j.level === 'law' ? 'legal' : 'acte') : null));
        }))),
      d.job_types.includes('other') ? FO('Descrie lucrarea', d, 'job_other', { area: true, rows: 2 }) : null);
    root.append(jobsCard);

    // --- conformitate
    const lv = jobLevels(d.job_types), c = d.compliance;
    if (lv.size) {
      const sel = h('select', {}, LAWFUL_USE.map(o => h('option', { value: o }, o || '— alege —')));
      sel.value = c.lawful_use || '';
      sel.addEventListener('change', () => { c.lawful_use = sel.value; dirty(); });
      const risks = d.job_types.map(k => jobByKey(k)).filter(j => j && j.level && j.risk).map(j => h('p', { style: 'margin:6px 0;font-size:14px' }, h('strong', {}, j.label + ': '), j.risk));
      root.append(card('Conformitate (obligatoriu înainte de predare)',
        h('p', { class: 'hint', style: 'margin-top:0' }, 'Cazul nu poate fi marcat „Predat” până nu completezi ce cere lucrarea aleasă. Aceste câmpuri apar și în fișa internă.'),
        risks,
        lv.has('doc') ? h('div', { class: 'grid', style: 'margin-top:8px' }, K('Am verificat actele vehiculului (certificat de înmatriculare, act de identitate al proprietarului, factură sau contract), iar VIN-ul din acte corespunde vehiculului.', () => c.docs_checked, v => c.docs_checked = v), FO('Ce acte ai văzut (fără a copia date inutile)', c, 'docs_note', { area: true, rows: 2 })) : null,
        lv.has('law') ? h('div', { class: 'grid', style: 'margin-top:8px' }, h('label', { class: 'f' }, h('span', {}, 'Utilizare legală declarată de client'), sel), FO('Detalii (după caz)', c, 'lawful_note', { area: true, rows: 2 }),
          K('Clientul a semnat declarația de responsabilitate: vehiculul este folosit legal și își asumă consecințele modificării.', () => c.declaration_signed, v => c.declaration_signed = v)) : null,
        lv.has('safety') ? h('div', { class: 'grid', style: 'margin-top:8px' }, K('Sistemul de siguranță a fost verificat funcțional după lucrare: fără erori, lampa se stinge, componentele sunt conforme. Nu a fost ascuns niciun defect.', () => c.safety_validated, v => c.safety_validated = v)) : null));
    }

    // --- evaluare
    const e = d.estimate;
    const totEl = h('div', { style: 'margin-top:10px;font-weight:600' });
    const upd = () => { const t = estTotals(e); totEl.innerHTML = ''; totEl.append(h('div', {}, 'Cazul favorabil: ' + money(t.best)), h('div', {}, 'Cazul nefavorabil: ' + money(t.worst)), h('div', { class: 'hint', style: 'font-weight:400' }, `Cost = ore × tarif (${rate() ? money(rate()) + '/oră' : 'tarif nesetat'}, din Setări) + piese.`)); };
    const propose = () => {
      const js = d.job_types.map(jobByKey).filter(Boolean);
      if (!js.length) { toast('Alege întâi cel puțin o lucrare.'); return; }
      const many = js.length > 1;
      e.best_hours = String(Math.round(js.reduce((a, j) => a + j.hb, 0) * 10) / 10);
      e.worst_hours = String(Math.round(js.reduce((a, j) => a + j.hw, 0) * 10) / 10);
      e.best_note = js.map(j => (many ? j.label + ': ' : '') + j.best).join('\n');
      e.worst_note = js.map(j => (many ? j.label + ': ' : '') + j.worst).join('\n');
      e.scope = js.map(j => '• ' + j.label + ' (' + j.steps.length + ' pași, vezi lista de mai jos)').join('\n');
      e.risks = js.filter(j => j.risk).map(j => '• ' + j.risk).join('\n');
      dirty(); draw();
    };
    root.append(card('Evaluare: cel mai bun și cel mai rău caz',
      h('p', { class: 'hint', style: 'margin-top:0' }, 'Orele din propunere sunt orientative. Ajustează-le după experiența ta și după complexitatea concretă a modulului.'),
      h('button', { class: 'btn small', onclick: propose }, '✨ Propune din profilul lucrărilor'),
      h('div', { style: 'height:10px' }),
      h('div', { class: 'grid c2' },
        h('div', { class: 'card', style: 'background:var(--bg);margin:0' }, h('strong', { style: 'color:var(--ok)' }, 'Cazul favorabil'),
          h('div', { class: 'grid c2', style: 'margin-top:6px' }, FO('Ore', e, 'best_hours', { type: 'text', im: 'decimal' }, upd), FO('Piese (valoare)', e, 'best_parts', { type: 'text', im: 'decimal' }, upd)),
          FO('Cum arată acest scenariu', e, 'best_note', { area: true, rows: 3 })),
        h('div', { class: 'card', style: 'background:var(--bg);margin:0' }, h('strong', { style: 'color:var(--bad)' }, 'Cazul nefavorabil'),
          h('div', { class: 'grid c2', style: 'margin-top:6px' }, FO('Ore', e, 'worst_hours', { type: 'text', im: 'decimal' }, upd), FO('Piese (valoare)', e, 'worst_parts', { type: 'text', im: 'decimal' }, upd)),
          FO('Cum arată acest scenariu', e, 'worst_note', { area: true, rows: 3 }))),
      totEl,
      h('div', { style: 'height:10px' }),
      h('div', { class: 'grid' }, FO('Șanse estimate de reușită (%)', e, 'success', { type: 'text', im: 'numeric' }), FO('Ce presupune lucrarea', e, 'scope', { area: true, rows: 3 }), FO('Riscuri și limite', e, 'risks', { area: true, rows: 3 }),
        K('Arată estimarea (interval de preț) pe raportul clientului', () => d.estimate_on_report, v => d.estimate_on_report = v))));
    upd();

    // --- lista de pași
    const items = d.checklist;
    const done = items.filter(i => i.done).length;
    const lc = card('Ce presupune lucrarea: pași' + (items.length ? ` (${done}/${items.length})` : ''));
    const byJob = new Map();
    items.forEach(i => { (byJob.get(i.job) || byJob.set(i.job, []).get(i.job)).push(i); });
    if (!items.length) lc.append(h('div', { class: 'empty' }, 'Alege lucrările de mai sus și apar pașii.'));
    for (const [k, list] of byJob) {
      const j = jobByKey(k);
      lc.append(h('div', { class: 'muted', style: 'font-size:13px;margin:10px 0 4px;font-weight:600' }, j ? j.label : 'Pași proprii'));
      list.forEach(i => lc.append(K(i.text, () => i.done, v => { i.done = v; })));
    }
    const nw = h('input', { type: 'text', placeholder: 'Adaugă un pas propriu…' });
    nw.addEventListener('keydown', ev => { if (ev.key === 'Enter' && nw.value.trim()) { d.checklist.push({ job: 'custom', text: nw.value.trim(), done: false }); dirty(); draw(); } });
    lc.append(h('div', { style: 'height:8px' }), nw);
    root.append(lc);
  };
  draw();
}

function tabFisa(root) {
  root.append(
    card('Tensiuni pe șine (valoare așteptată și măsurată)', h('p', { class: 'hint', style: 'margin-top:0' }, 'Așteptat = valoarea de pe un ECU bun, același model. „Cald” = în timpul defectului.'),
      rowsEditor('rails', [{ k: 'name', label: 'Punct de măsură', w: 104 }, { k: 'expected', label: 'Așteptat', w: 60 }, { k: 'cold', label: 'Rece', w: 60 }, { k: 'hot', label: 'Cald', w: 60 }], { name: '', expected: '', cold: '', hot: '' })),
    card('Ieșiri și funcții testate', rowsEditor('outputs', [{ k: 'name', label: 'Ieșire / funcție', w: 140 }, { k: 'status', label: 'Stare', w: 110, opts: ['', 'OK', 'Defect', 'Neverificat'] }, { k: 'note', label: 'Observații', w: 150 }], { name: '', status: '', note: '' })),
    card('Componente inspectate', rowsEditor('components', [{ k: 'ref', label: 'Ref. / zonă', w: 90 }, { k: 'type', label: 'Componentă', w: 130 }, { k: 'obs', label: 'Constatare', w: 170 }], { ref: '', type: '', obs: '' }))
  );
}

// ---- poze
let lastCat = CATS[0];
async function shrink(file, max = 1800, q = 0.85) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Nu pot citi imaginea')); i.src = url; });
    let w = img.naturalWidth, hh = img.naturalHeight;
    const s = Math.min(1, max / Math.max(w, hh));
    w = Math.round(w * s); hh = Math.round(hh * s);
    const cv = document.createElement('canvas'); cv.width = w; cv.height = hh;
    cv.getContext('2d').drawImage(img, 0, 0, w, hh);
    return await new Promise(res => cv.toBlob(res, 'image/jpeg', q));
  } finally { URL.revokeObjectURL(url); }
}
function tabPoze(root) {
  const grid = h('div', { class: 'photos' });
  const cat = h('select', {}, CATS.map(c => h('option', { value: c }, c)));
  cat.value = lastCat;
  cat.addEventListener('change', () => { lastCat = cat.value; });
  const cam = h('input', { type: 'file', accept: 'image/*', capture: 'environment', hidden: true });
  const gal = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const up = async files => {
    const list = [...files];
    for (let i = 0; i < list.length; i++) {
      toast(`Se încarcă ${i + 1}/${list.length}…`, 1500);
      try {
        const blob = await shrink(list[i]);
        const p = await api(`/api/cases/${C.id}/photos?cat=${encodeURIComponent(cat.value)}`, { method: 'POST', raw: blob });
        C.photos.push(p);
        draw();
      } catch (e) { toast('Eroare poză: ' + e.message, 4000); }
    }
  };
  cam.addEventListener('change', () => { up(cam.files); cam.value = ''; });
  gal.addEventListener('change', () => { up(gal.files); gal.value = ''; });
  const draw = () => {
    grid.innerHTML = '';
    if (!C.photos.length) grid.append(h('div', { class: 'empty', style: 'grid-column:1/-1' }, 'Nicio poză încă. Alege categoria și apasă „Fă poză”.'));
    C.photos.forEach((p, i) => {
      const sel = h('select', {}, CATS.map(c => h('option', { value: c }, c)));
      sel.value = p.cat;
      sel.addEventListener('change', () => { p.cat = sel.value; api('/api/photos/' + p.id, { method: 'PUT', json: { cat: p.cat } }); });
      const cap = h('input', { type: 'text', placeholder: 'Descriere…', value: p.caption || '' });
      cap.addEventListener('change', () => { p.caption = cap.value; api('/api/photos/' + p.id, { method: 'PUT', json: { caption: p.caption } }); });
      const chk = h('input', { type: 'checkbox' });
      chk.checked = !!p.client;
      chk.addEventListener('change', () => { p.client = chk.checked ? 1 : 0; api('/api/photos/' + p.id, { method: 'PUT', json: { client: p.client } }); });
      const img = h('img', { src: '/photos/' + p.file, loading: 'lazy', alt: p.cat, onclick: () => { const o = h('div', { class: 'overlay', onclick: () => o.remove() }, h('img', { src: '/photos/' + p.file })); document.body.append(o); } });
      grid.append(h('div', { class: 'photo' }, img, h('div', { class: 'pb' }, sel, cap,
        h('label', { class: 'chk' }, chk, 'Pe raportul clientului'),
        h('button', { class: 'btn small danger', onclick: async () => { if (!confirm('Ștergi poza?')) return; await api('/api/photos/' + p.id, { method: 'DELETE' }); C.photos.splice(i, 1); draw(); } }, 'Șterge'))));
    });
  };
  root.append(
    card('Adaugă poze', h('label', { class: 'f' }, h('span', {}, 'Categorie (se aplică pozelor următoare)'), cat),
      h('div', { style: 'height:10px' }),
      h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: () => cam.click() }, '📷 Fă poză'), h('button', { class: 'btn', onclick: () => gal.click() }, '🖼 Din galerie'), cam, gal),
      h('p', { class: 'hint' }, 'Pozele sunt reduse automat (max. 1800 px) înainte de salvare. Pe iPhone, „Fă poză” deschide camera.')),
    card('Poze din acest caz', grid)
  );
  draw();
}

// ---- defecte și reparații
function tabRep(root) {
  const entries = h('div');
  const draw = () => {
    entries.innerHTML = '';
    C.data.entries.forEach((en, i) => {
      const f = (label, k, o = {}) => {
        const el = h(o.area ? 'textarea' : 'input', { type: o.area ? null : 'text', autocomplete: 'off', spellcheck: 'false' });
        if (o.area) el.rows = 2;
        el.value = en[k] ?? '';
        el.addEventListener('input', () => { en[k] = el.value; dirty(); });
        return h('label', { class: 'f' }, h('span', {}, label), el);
      };
      const res = h('select', {}, ['', 'Rezolvat', 'Parțial', 'Nereușit', 'De verificat'].map(o => h('option', { value: o }, o || '—')));
      res.value = en.result || '';
      res.addEventListener('change', () => { en.result = res.value; dirty(); });
      entries.append(h('div', { class: 'card', style: 'background:var(--bg)' },
        h('div', { class: 'row sp' }, h('strong', {}, 'Intervenția ' + (i + 1)), h('button', { class: 'btn small danger', onclick: () => { if (confirm('Ștergi intervenția?')) { C.data.entries.splice(i, 1); dirty(); draw(); } } }, 'Șterge')),
        h('div', { class: 'grid c2', style: 'margin-top:8px' },
          f('Defect găsit', 'defect', { area: true }), f('Cauza (rădăcină)', 'cause', { area: true }),
          f('Ce am făcut', 'action', { area: true }), f('Piesă / componentă (ref., tip)', 'part'),
          h('label', { class: 'f' }, h('span', {}, 'Rezultat'), res))));
    });
    if (!C.data.entries.length) entries.append(h('div', { class: 'empty' }, 'Nicio intervenție notată.'));
  };
  draw();
  const bk = C.data.backup;
  const method = h('select', {}, BACKUP_METHODS.map(o => h('option', { value: o }, o || '—')));
  method.value = bk.method || '';
  method.addEventListener('change', () => { bk.method = method.value; dirty(); });
  const bf = (label, k, ph) => { const el = h('input', { type: 'text', placeholder: ph || '', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' }); el.value = bk[k] || ''; el.addEventListener('input', () => { bk[k] = el.value; dirty(); }); return h('label', { class: 'f' }, h('span', {}, label), el); };
  root.append(
    card('Backup ECU înainte de intervenție',
      h('div', { class: 'grid c2' }, K('Backup făcut și verificat (două citiri identice)', () => bk.done, v => bk.done = v), h('label', { class: 'f' }, h('span', {}, 'Metoda'), method),
        bf('Nume fișier / hash (SHA-256)', 'hash', 'ex. 2026-001_bench_ab12…'), bf('Observații', 'note'))),
    card('Diagnostic', F('Rezumat tehnic al diagnosticului (cauza rădăcină, ce ai exclus)', 'diagnosis', { area: true, rows: 4 })),
    card('Intervenții', entries, h('div', { style: 'height:8px' }), h('button', { class: 'btn small', onclick: () => { C.data.entries.push({ defect: '', cause: '', action: '', part: '', result: '' }); dirty(); draw(); } }, '+ Adaugă intervenție')),
    card('Note interne (nu apar pe raportul clientului)', F('Note', 'internal_notes', { area: true, rows: 3 }))
  );
}

// ---- predare
function sigPad() {
  const cv = h('canvas', { class: 'sig' });
  let g, drawing = false, rect;
  const setup = () => {
    rect = cv.getBoundingClientRect();
    if (!rect.width) return false;
    const dpr = window.devicePixelRatio || 1;
    cv.width = rect.width * dpr; cv.height = rect.height * dpr;
    g = cv.getContext('2d'); g.scale(dpr, dpr); g.lineWidth = 2.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#14325c';
    if (C.data.signature) { const i = new Image(); i.onload = () => g.drawImage(i, 0, 0, rect.width, rect.height); i.src = C.data.signature; }
    return true;
  };
  const pt = e => ({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  cv.addEventListener('pointerdown', e => { if (!g && !setup()) return; rect = cv.getBoundingClientRect(); drawing = true; cv.setPointerCapture(e.pointerId); const p = pt(e); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + .1, p.y + .1); g.stroke(); e.preventDefault(); });
  cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); g.lineTo(p.x, p.y); g.stroke(); e.preventDefault(); });
  const end = () => { if (!drawing) return; drawing = false; C.data.signature = cv.toDataURL('image/png'); dirty(); };
  cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  setTimeout(setup, 30);
  const clear = () => { if (g) { g.clearRect(0, 0, rect.width, rect.height); } C.data.signature = ''; dirty(); };
  return { cv, clear };
}
function tabPredare(root) {
  const sp = sigPad();
  const summary = F('Rezumat pentru client (limbaj simplu, ce s-a găsit și ce s-a reparat)', 'client_summary', { area: true, rows: 5 });
  const gen = () => {
    const lines = C.data.entries.filter(e => e.action).map(e => '• ' + (e.defect ? e.defect + ': ' : '') + e.action + (e.part ? ' (' + e.part + ')' : ''));
    if (!lines.length) { toast('Nu ai intervenții notate.'); return; }
    const ta = summary.querySelector('textarea');
    ta.value = (ta.value ? ta.value + '\n' : '') + lines.join('\n');
    C.data.client_summary = ta.value; dirty();
  };
  const open = type => async () => { await flush(); window.open(`/print.html?id=${C.id}&type=${type}`, '_blank'); };
  root.append(
    card('Raport pentru client', summary, h('div', { style: 'height:8px' }), h('button', { class: 'btn small', onclick: gen }, '↧ Preia din intervenții'),
      h('div', { style: 'height:10px' }),
      h('div', { class: 'grid c3' }, F('Preț (cu moneda)', 'price', { ph: 'ex. 450 lei' }), F('Garanție (zile)', 'warranty_days', { type: 'number', im: 'numeric' }), F('Data predării', 'delivered_date', { type: 'date' }))),
    card('Semnătura clientului (la predare)', sp.cv, h('div', { style: 'height:8px' }), h('button', { class: 'btn small', onclick: sp.clear }, 'Șterge semnătura')),
    card('Tipărire', h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: open('client') }, '🖨 Raport client'), h('button', { class: 'btn', onclick: open('internal') }, '🖨 Fișă internă')),
      h('p', { class: 'hint' }, 'Se deschide o pagină gata de tipărit. Pe iPhone: Partajare → Tipărește (AirPrint) sau Salvează în Fișiere ca PDF.')),
    card('', h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Ștergi definitiv cazul ' + C.number + ' și toate pozele lui?')) return; await api('/api/cases/' + C.id, { method: 'DELETE' }); C = null; location.hash = '#/'; } }, 'Șterge cazul'))
  );
}

// ---------------------------------------------------------------- setări
async function viewSetup() {
  C = null; savedEl = null;
  setHeader('Setări', [h('a', { href: '#/' }, '‹ Listă')]);
  let s, info;
  try { s = await api('/api/settings'); info = await api('/api/info'); } catch (e) { app.textContent = e.message; return; }
  const model = { ...s, pin: '' };
  const fld = (label, key, o = {}) => { const el = h(o.area ? 'textarea' : 'input', { type: o.area ? null : (o.type || 'text'), placeholder: o.ph || '', autocomplete: 'off' }); if (o.rows) el.rows = o.rows; el.value = model[key] ?? ''; el.addEventListener('input', () => { model[key] = el.value; }); return h('label', { class: 'f' }, h('span', {}, label), el); };
  app.innerHTML = '';
  app.append(
    card('Date atelier (apar pe raport)', h('div', { class: 'grid c2' }, fld('Nume atelier', 'shop_name'), fld('Contact (telefon, adresă)', 'shop_contact')),
      h('div', { style: 'height:10px' }), h('div', { class: 'grid c2' }, fld('Tarif pe oră', 'hourly_rate', { type: 'number' }), fld('Moneda', 'currency')),
      h('div', { style: 'height:10px' }), h('div', { class: 'grid c2' }, fld('Garanție implicită (zile)', 'warranty_days', { type: 'number' }), fld('PIN (gol = fără PIN)', 'pin', { type: 'tel', ph: s.pin_set ? 'PIN setat; scrie unul nou ca să-l schimbi' : 'ex. 1234' })),
      h('div', { style: 'height:10px' }), fld('Condiții de garanție (apar pe raportul clientului)', 'terms', { area: true, rows: 4 }),
      h('div', { style: 'height:10px' }), h('div', { class: 'row' }, h('button', { class: 'btn primary', onclick: async () => { const b = { shop_name: model.shop_name, shop_contact: model.shop_contact, warranty_days: model.warranty_days, terms: model.terms, hourly_rate: model.hourly_rate, currency: model.currency }; if (model.pin !== '') b.pin = model.pin; await api('/api/settings', { method: 'PUT', json: b }); SET = null; toast('Setări salvate'); } }, 'Salvează'), s.pin_set ? h('button', { class: 'btn danger', onclick: async () => { if (!confirm('Elimini PIN-ul? Oricine din rețea va putea deschide aplicația.')) return; await api('/api/settings', { method: 'PUT', json: { pin: '' } }); toast('PIN eliminat'); viewSetup(); } }, 'Elimină PIN') : null)),
    card('Acces de pe iPhone', h('p', { style: 'margin-top:0' }, 'Pe iPhone (același Wi-Fi) deschide în Safari:'), h('p', {}, h('strong', {}, info.lan)),
      h('p', { class: 'hint' }, 'Apoi Partajare → „Adaugă pe ecranul principal”, ca să o ai ca o aplicație.')),
    card('Backup', h('p', { style: 'margin-top:0' }, 'Descarcă o arhivă cu baza de date și toate pozele. Fă asta regulat și păstreaz-o în afara calculatorului.'),
      h('a', { class: 'btn primary', href: '/api/backup' }, '⬇ Descarcă backup'), h('p', { class: 'hint' }, 'Datele sunt în: ' + info.data_dir))
  );
}

// ---------------------------------------------------------------- pornire
async function route() {
  await flush();
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const [a, b, c] = parts;
  try {
    if (a === 'case' && b) await viewCase(+b, c || 'client');
    else if (a === 'setup') await viewSetup();
    else await viewList();
  } catch (e) { app.textContent = e.message; }
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
