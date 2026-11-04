(function () {
  const ORIGINAL = JSON.parse(document.getElementById('state').textContent);
  let S = JSON.parse(JSON.stringify(ORIGINAL));
  let readOnly = false;
  const LS = 'barndo-cost-estimate-v1';
  try { const d = JSON.parse(localStorage.getItem(LS) || 'null'); if (d && d.cats) S = d; } catch (e) {}
  const $ = (s, el = document) => el.querySelector(s);
  const money = n => (n < 0 ? '-' : '') + '$' + Math.round(Math.abs(n)).toLocaleString('en-US');
  const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) ? n : 0; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const open = new Set();
  const DEF_TITLE = 'Tinsley Barndominium — Cost Estimate';
  const DEF_SUB = 'TB-4060 · 4,053 sf heated · Georgia · land not included';
  const subtitle = () => S.subtitle == null ? DEF_SUB : S.subtitle;
  const fitSub = () => ['#title', '#subtitle'].forEach(sel => { const t = $(sel); t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; });
  const title = () => (S.title || '').trim() || DEF_TITLE;
  const fileSafe = t => t.replace(/[—–]/g, '-').replace(/[^A-Za-z0-9 _-]+/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') || 'Cost-Estimate';

  // ---- Auto low/high: each item keeps a spread (low ÷ expected, high ÷ expected).
  // Changing Expected moves Low and High with it; editing Low or High by hand sets a new spread.
  const DEF_LR = 0.75, DEF_HR = 1.45, FIXED = ['Contracted', 'Paid'];
  const roundNice = n => n >= 1000 ? Math.round(n / 100) * 100 : Math.round(n / 10) * 10;
  const sane = o => o && num(o.exp) > 0 && num(o.low) <= num(o.exp) && num(o.exp) <= num(o.high);
  function origFor(ci, ii, it) {
    for (const c of ORIGINAL.cats) for (const o of c.items) if (o.name === it.name) return o;
    const c = ORIGINAL.cats[ci]; return c && c.items[ii];
  }
  // Spread comes from the starting estimate, unless the user set low/high by hand (it.manual).
  function spread(it, ci, ii) {
    if (it.manual && isFinite(it.lr) && isFinite(it.hr)) return [it.lr, it.hr];
    const o = origFor(ci, ii, it);
    return sane(o) ? [num(o.low) / num(o.exp), num(o.high) / num(o.exp)] : [DEF_LR, DEF_HR];
  }
  function applyRange(it, ci, ii) {
    const [lr, hr] = spread(it, ci, ii); it.lr = lr; it.hr = hr;
    const e = num(it.exp);
    if (FIXED.includes(it.status)) { it.low = e; it.high = e; return; }
    it.low = roundNice(e * lr); it.high = roundNice(e * hr);
  }
  // Recompute low/high for every line from its spread (fixes lines edited before this feature).
  S.cats.forEach((c, ci) => c.items.forEach((it, ii) => applyRange(it, ci, ii)));

  function totals() {
    const t = { low: 0, exp: 0, high: 0, cats: [] };
    S.cats.forEach(c => { const ct = { low: 0, exp: 0, high: 0 }; c.items.forEach(i => { ct.low += num(i.low); ct.exp += num(i.exp); ct.high += num(i.high); }); t.cats.push(ct); t.low += ct.low; t.exp += ct.exp; t.high += ct.high; });
    const k = 1 + num(S.contingency), g = 1 + num(S.gc);
    t.ob = { low: t.low * k, exp: t.exp * k, high: t.high * k };
    t.wg = { low: t.ob.low * g, exp: t.ob.exp * g, high: t.ob.high * g };
    return t;
  }

  function renderTotals() {
    const t = totals(), sf = num(S.sf) || 1;
    const hasGC = num(S.gc) > 0;
    $('#tot').innerHTML = `
      <div class="big ${hasGC ? '' : 'one'}"><div><span class="lbl">Owner-builder total</span><b>${money(t.ob.exp)}</b><span class="sub">${money(t.ob.exp / sf)}/sf · range ${money(t.ob.low)}–${money(t.ob.high)}</span></div>
      ${hasGC ? `<div><span class="lbl">With a general contractor</span><b>${money(t.wg.exp)}</b><span class="sub">${money(t.wg.exp / sf)}/sf · range ${money(t.wg.low)}–${money(t.wg.high)}</span></div>` : ''}</div>
      <div class="mini">Construction subtotal ${money(t.exp)} · contingency ${money(t.exp * num(S.contingency))}${hasGC ? ` · GC fee ${money(t.ob.exp * num(S.gc))}` : ''}</div>`;
    S.cats.forEach((c, ci) => { const el = document.getElementById('ct' + ci); if (el) el.textContent = money(t.cats[ci].exp); });
  }

  function itemRow(ci, ii, it) {
    const o = open.has(ci + '-' + ii);
    return `<div class="item ${o ? 'open' : ''}" data-ci="${ci}" data-ii="${ii}">
      <div class="row">
        <button class="tog" data-act="tog" aria-label="Details">${o ? '▾' : '▸'}</button>
        <div class="nm">${esc(it.name)}${it.status && it.status !== 'Estimate' ? `<span class="tag ${it.status}">${esc(it.status)}</span>` : ''}</div>
        <input class="price" inputmode="decimal" data-f="exp" value="${esc(money(num(it.exp)))}" ${readOnly ? 'disabled' : ''}>
      </div>
      ${o ? `<div class="det">
        <label>Item<input data-f="name" value="${esc(it.name)}" ${readOnly ? 'disabled' : ''}></label>
        <label>Basis / quantity<input data-f="basis" value="${esc(it.basis)}" ${readOnly ? 'disabled' : ''}></label>
        <div class="three"><label>Low<input inputmode="decimal" data-f="low" value="${esc(money(num(it.low)))}" ${readOnly ? 'disabled' : ''}></label>
        <label>Expected<input inputmode="decimal" data-f="exp2" value="${esc(money(num(it.exp)))}" ${readOnly ? 'disabled' : ''}></label>
        <label>High<input inputmode="decimal" data-f="high" value="${esc(money(num(it.high)))}" ${readOnly ? 'disabled' : ''}></label></div>
        <div class="hint">Low and high follow Expected automatically. Change either one to set a new spread for this item.${FIXED.includes(it.status) ? ' ' + esc(it.status) + ' items lock low and high to Expected.' : ''}</div>
        <label>Status<select data-f="status" ${readOnly ? 'disabled' : ''}>${['Estimate', 'Quoted', 'Contracted', 'Paid'].map(s => `<option ${s === it.status ? 'selected' : ''}>${s}</option>`).join('')}</select></label>
        <label>Notes<textarea data-f="note" rows="2" ${readOnly ? 'disabled' : ''}>${esc(it.note)}</textarea></label>
        ${readOnly ? '' : `<button class="del" data-act="del">Delete item</button>`}
      </div>` : ''}
    </div>`;
  }

  function render() {
    const t = totals();
    $('#cats').innerHTML = S.cats.map((c, ci) => `
      <section class="cat" data-ci="${ci}">
        <div class="ch"><h2>${esc(c.name)}</h2><span id="ct${ci}" class="cst">${money(t.cats[ci].exp)}</span></div>
        ${c.items.map((it, ii) => itemRow(ci, ii, it)).join('')}
        ${readOnly ? '' : `<button class="add" data-act="add">+ Add item</button>`}
      </section>`).join('');
    $('#title').value = title(); $('#title').disabled = readOnly; document.title = title();
    $('#subtitle').value = subtitle(); $('#subtitle').disabled = readOnly; fitSub();
    $('#cont').value = (num(S.contingency) * 100).toFixed(1).replace(/\.0$/, '');
    $('#gc').value = (num(S.gc) * 100).toFixed(1).replace(/\.0$/, '');
    $('#sf').value = num(S.sf).toLocaleString('en-US');
    ['#cont', '#gc', '#sf'].forEach(s => $(s).disabled = readOnly);
    renderTotals();
  }

  function status(msg, cls) { const el = $('#status'); el.textContent = msg; el.className = 'status ' + (cls || ''); }

  function changed() {
    S.savedAt = new Date().toISOString();
    try { localStorage.setItem(LS, JSON.stringify(S)); status('Saved on this device · ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })); }
    catch (e) { status('Could not save — use Export to keep a copy', 'warn'); }
    renderTotals();
  }
  function download(name, text, type) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function csv() {
    const q = v => '"' + String(v == null ? '' : typeof v === 'number' ? Math.round(v * 100) / 100 : v).replace(/"/g, '""') + '"';
    const rows = [['Category', 'Item', 'Basis', 'Low', 'Expected', 'High', 'Status', 'Notes']];
    S.cats.forEach(c => c.items.forEach(i => rows.push([c.name, i.name, i.basis, num(i.low), num(i.exp), num(i.high), i.status, i.note])));
    const t = totals();
    rows.push([], ['', 'Construction subtotal', '', t.low, t.exp, t.high], ['', 'Contingency ' + (num(S.contingency) * 100) + '%', '', t.low * num(S.contingency), t.exp * num(S.contingency), t.high * num(S.contingency)],
      ['', 'Total owner-builder', '', t.ob.low, t.ob.exp, t.ob.high]);
    if (num(S.gc) > 0) rows.push(['', 'GC fee ' + (num(S.gc) * 100) + '%', '', t.ob.low * num(S.gc), t.ob.exp * num(S.gc), t.ob.high * num(S.gc)], ['', 'Total with GC', '', t.wg.low, t.wg.exp, t.wg.high]);
    return rows.map(r => r.map(q).join(',')).join('\n');
  }
  const stamp = () => new Date().toISOString().slice(0, 10);
  $('#exp').addEventListener('click', () => download(fileSafe(title()) + '-' + stamp() + '.json', JSON.stringify(S, null, 2), 'application/json'));
  $('#csv').addEventListener('click', () => download(fileSafe(title()) + '-' + stamp() + '.csv', csv(), 'text/csv'));
  $('#pdf').addEventListener('click', () => {
    try {
      const blob = window.EstimatePDF.build(S, totals(), money);
      const name = fileSafe(title()) + '-' + stamp() + '.pdf';
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
      status('PDF created: ' + name);
    } catch (e) { status('Could not create the PDF', 'warn'); }
  });
  $('#imp').addEventListener('change', e => {
    const f = e.target.files[0]; if (!f) return;
    f.text().then(t => { const d = JSON.parse(t); if (!d || !d.cats) throw 0; S = d; open.clear(); render(); changed(); status('Imported ' + f.name); })
      .catch(() => status('That file is not an estimate export', 'warn')).finally(() => { e.target.value = ''; });
  });

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const sec = b.closest('.cat'), ci = +sec.dataset.ci, itEl = b.closest('.item');
    if (b.dataset.act === 'tog') { const k = ci + '-' + itEl.dataset.ii; open.has(k) ? open.delete(k) : open.add(k); render(); }
    if (b.dataset.act === 'add') { S.cats[ci].items.push({ name: 'New item', basis: '', low: 0, exp: 0, high: 0, note: '', status: 'Estimate' }); open.add(ci + '-' + (S.cats[ci].items.length - 1)); render(); changed(); }
    if (b.dataset.act === 'del') { const ii = +itEl.dataset.ii; if (b.dataset.confirm) { S.cats[ci].items.splice(ii, 1); open.clear(); render(); changed(); } else { b.dataset.confirm = 1; b.textContent = 'Tap again to delete'; } }
  });
  document.addEventListener('focusin', e => { const i = e.target; if (i.matches('input[inputmode="decimal"]')) { i.value = String(num(i.value) || ''); setTimeout(() => i.select && i.select(), 0); } });
  document.addEventListener('input', e => {
    const i = e.target, f = i.dataset.f, itEl = i.closest('.item');
    if (itEl && f) {
      const it = S.cats[+itEl.closest('.cat').dataset.ci].items[+itEl.dataset.ii];
      const ci = +itEl.closest('.cat').dataset.ci, ii = +itEl.dataset.ii;
      if (f === 'exp' || f === 'exp2') {
        it.exp = num(i.value); applyRange(it, ci, ii);
        itEl.querySelectorAll('input[data-f="low"],input[data-f="high"],input[data-f="exp"],input[data-f="exp2"]').forEach(x => {
          if (x !== i) x.value = money(num(x.dataset.f === 'exp2' ? it.exp : it[x.dataset.f]));
        });
      } else if (f === 'low' || f === 'high') {
        it[f] = num(i.value);
        if (num(it.exp) > 0) { const e = num(it.exp); it.lr = num(it.low) / e; it.hr = num(it.high) / e; it.manual = true; }
      } else it[f] = i.value;
      if (f === 'status') { applyRange(it, ci, ii); }
      if (f === 'name') itEl.querySelector('.nm').firstChild.textContent = i.value;
      changed();
    }
    if (i.id === 'subtitle') { S.subtitle = i.value.replace(/\n+/g, ' '); fitSub(); changed(); }
    if (i.id === 'title') { S.title = i.value.replace(/\n+/g, ' '); fitSub(); document.title = title(); changed(); }
    if (i.id === 'cont') { S.contingency = num(i.value) / 100; changed(); }
    if (i.id === 'gc') { S.gc = num(i.value) / 100; changed(); }
    if (i.id === 'sf') { S.sf = num(i.value); changed(); }
  });
  document.addEventListener('change', e => { const i = e.target; if (i.matches('select[data-f], input[data-f="exp"], input[data-f="exp2"]')) render(); });
  document.addEventListener('focusout', e => { const i = e.target; if (i.id === 'title' && !i.value.trim()) { S.title = ''; i.value = title(); changed(); } if (i.matches('input[inputmode="decimal"]')) i.value = money(num(i.value)); });
  $('#reset').addEventListener('click', e => { const b = e.currentTarget; if (b.dataset.confirm) { S = JSON.parse(JSON.stringify(ORIGINAL)); open.clear(); render(); changed(); b.textContent = 'Reset to starting estimate'; delete b.dataset.confirm; } else { b.dataset.confirm = 1; b.textContent = 'Tap again — this erases your edits'; } });

  window.addEventListener('resize', fitSub);
  document.addEventListener('keydown', e => { if ((e.target.id === 'subtitle' || e.target.id === 'title') && e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
  render();
  status(S.savedAt ? 'Saved on this device' : 'Edits save automatically on this device');
})();
