/* Minimal dependency-free PDF writer for the cost estimate (Letter, Helvetica). */
window.EstimatePDF = (function () {
  const W = 612, H = 792, M = 36;
  const WIN = { '€': 128, '‚': 130, '„': 132, '…': 133, '†': 134, '‡': 135, '‰': 137, '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '™': 153 };
  function enc(s) {
    s = String(s == null ? '' : s).replace(/≈/g, '~').replace(/→/g, '->').replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/▸|▾/g, '');
    let o = '';
    for (const ch of s) {
      let c = ch.codePointAt(0);
      if (WIN[ch]) c = WIN[ch]; else if (c > 255) c = 63;
      const b = String.fromCharCode(c);
      o += (b === '(' || b === ')' || b === '\\') ? '\\' + b : b;
    }
    return o;
  }
  // Helvetica widths (per 1000 em) for common characters; others approximated
  const HW = { ' ': 278, '$': 556, ',': 278, '.': 278, '-': 333, '%': 889, '/': 278, '(': 333, ')': 333 };
  const width = (s, size, bold) => { let w = 0; for (const ch of String(s)) w += /[0-9]/.test(ch) ? 556 : (HW[ch] || (/[A-Z]/.test(ch) ? 680 : /[a-z]/.test(ch) ? 520 : 560)) * (bold && !/[0-9]/.test(ch) ? 1.04 : 1); return w * size / 1000; };
  function fit(s, size, maxW, bold) { s = String(s || ''); if (width(s, size, bold) <= maxW) return s; while (s.length > 1 && width(s + '…', size, bold) > maxW) s = s.slice(0, -1); return s + '…'; }

  function build(S, T, money) {
    const NAME = (S.title || '').trim() || 'Tinsley Barndominium — Cost Estimate';
    const pages = []; let ops = [], y;
    const gray = g => `${g} ${g} ${g}`;
    const text = (x, yy, s, size, bold, color, align) => {
      let xx = x; if (align === 'right') xx = x - width(s, size, bold); else if (align === 'center') xx = x - width(s, size, bold) / 2;
      ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${color || '0 0 0'} rg ${xx.toFixed(2)} ${(H - yy).toFixed(2)} Td (${enc(s)}) Tj ET`);
    };
    const rect = (x, yy, w, h, fill) => ops.push(`${fill} rg ${x} ${(H - yy - h).toFixed(2)} ${w} ${h} re f`);
    const line = (x1, y1, x2, y2, c, lw) => ops.push(`${c || gray(0.8)} RG ${lw || 0.5} w ${x1} ${(H - y1).toFixed(2)} m ${x2} ${(H - y2).toFixed(2)} l S`);
    const C = { item: M + 4, status: 318, low: 420, exp: 497, high: W - M - 4 };
    function newPage(first) {
      if (ops.length) pages.push(ops.join('\n'));
      ops = []; y = M;
      if (!first) {
        text(M, y + 8, NAME + ' (continued)', 9, true, gray(0.35)); y += 20;
      }
    }
    function colHead() {
      rect(M, y, W - 2 * M, 16, '0.12 0.23 0.17');
      const wc = '1 1 1';
      text(C.item, y + 11, 'ITEM', 7.5, true, wc); text(C.status, y + 11, 'STATUS', 7.5, true, wc);
      text(C.low, y + 11, 'LOW', 7.5, true, wc, 'right'); text(C.exp, y + 11, 'EXPECTED', 7.5, true, wc, 'right'); text(C.high, y + 11, 'HIGH', 7.5, true, wc, 'right');
      y += 20;
    }
    const need = h => { if (y + h > H - M - 20) { newPage(false); colHead(); } };

    newPage(true);
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    text(M, y + 14, NAME, 17, true); y += 22;
    const sub = (S.subtitle == null ? 'TB-4060 · 4,053 sf heated · Georgia · land not included' : String(S.subtitle).trim());
    const subLine = (sub ? sub + ' · ' : '') + date;
    const lines = []; let cur = '';
    subLine.split(' ').forEach(w => { if ((cur + ' ' + w).trim().length > 118 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim(); });
    if (cur) lines.push(cur);
    lines.slice(0, 4).forEach((ln, k) => text(M, y + 10 + k * 11, ln, 8.5, false, gray(0.35)));
    y += 22 + (Math.min(lines.length, 4) - 1) * 11;
    // summary boxes
    const bw = (W - 2 * M - 10) / 2, sf = Number(S.sf) || 1;
    [['OWNER-BUILDER TOTAL', T.ob], ['WITH A GENERAL CONTRACTOR', T.wg]].forEach(([lab, v], i) => {
      const x = M + i * (bw + 10);
      rect(x, y, bw, 62, '0.12 0.23 0.17');
      text(x + 12, y + 16, lab, 7.5, true, '0.85 0.9 0.87');
      text(x + 12, y + 38, money(v.exp), 20, true, '1 1 1');
      text(x + 12, y + 53, `${money(v.exp / sf)}/sf · range ${money(v.low)} – ${money(v.high)}`, 8, false, '0.85 0.9 0.87');
    });
    y += 72;
    text(M, y + 9, `Construction subtotal ${money(T.exp)}  ·  Contingency ${(S.contingency * 100).toFixed(1).replace(/\.0$/, '')}% ${money(T.exp * S.contingency)}  ·  GC fee ${(S.gc * 100).toFixed(1).replace(/\.0$/, '')}% ${money(T.ob.exp * S.gc)}`, 8.5, false, gray(0.25));
    y += 22;
    // category summary
    text(M, y + 10, 'Summary by category', 11, true); y += 18;
    S.cats.forEach((c, i) => {
      if (i % 2 === 0) rect(M, y - 2, W - 2 * M, 14, gray(0.96));
      text(C.item, y + 8.5, c.name, 9); text(C.low, y + 8.5, money(T.cats[i].low), 9, false, gray(0.4), 'right');
      text(C.exp, y + 8.5, money(T.cats[i].exp), 9, true, '0 0 0', 'right'); text(C.high, y + 8.5, money(T.cats[i].high), 9, false, gray(0.4), 'right');
      y += 14;
    });
    line(M, y + 2, W - M, y + 2, gray(0.3), 0.8); y += 6;
    const sumRow = (lab, v, bold) => { text(C.item, y + 9, lab, 9, bold); text(C.low, y + 9, money(v.low), 9, bold, gray(bold ? 0 : 0.4), 'right'); text(C.exp, y + 9, money(v.exp), 9, true, '0 0 0', 'right'); text(C.high, y + 9, money(v.high), 9, bold, gray(bold ? 0 : 0.4), 'right'); y += 14; };
    sumRow('Construction subtotal', { low: T.low, exp: T.exp, high: T.high });
    sumRow('Contingency', { low: T.low * S.contingency, exp: T.exp * S.contingency, high: T.high * S.contingency });
    sumRow('Total — owner-builder', T.ob, true);
    sumRow('General contractor fee', { low: T.ob.low * S.gc, exp: T.ob.exp * S.gc, high: T.ob.high * S.gc });
    sumRow('Total — with a general contractor', T.wg, true);
    y += 12;
    // detail
    text(M, y + 10, 'Line-item detail', 11, true); y += 18; colHead();
    S.cats.forEach((c, ci) => {
      need(40);
      rect(M, y, W - 2 * M, 15, gray(0.9));
      text(C.item, y + 10.5, c.name, 9, true); text(C.exp, y + 10.5, money(T.cats[ci].exp), 9, true, '0 0 0', 'right');
      y += 19;
      c.items.forEach(it => {
        const hasB = it.basis && String(it.basis).trim(), rh = hasB ? 22 : 14;
        need(rh);
        text(C.item, y + 8, fit(it.name, 8.5, C.status - C.item - 10), 8.5);
        if (hasB) text(C.item, y + 17, fit(it.basis, 6.8, C.status - C.item - 10), 6.8, false, gray(0.45));
        text(C.status, y + 8, it.status || 'Estimate', 7.5, false, it.status && it.status !== 'Estimate' ? '0.12 0.35 0.2' : gray(0.5));
        text(C.low, y + 8, money(+it.low || 0), 8.5, false, gray(0.4), 'right');
        text(C.exp, y + 8, money(+it.exp || 0), 8.5, true, '0 0 0', 'right');
        text(C.high, y + 8, money(+it.high || 0), 8.5, false, gray(0.4), 'right');
        line(M, y + rh - 2, W - M, y + rh - 2, gray(0.88), 0.4);
        y += rh;
      });
      y += 6;
    });
    need(40);
    y += 6;
    const foot = 'Planning estimate, not a bid. Steel building and foundation scaled from the Tyson Steel quote (10/29/2026); spray foam, septic and per-sq-ft benchmarks from 2026 cost guides. Replace with real quotes as they come in.';
    const words = foot.split(' '); let ln = '';
    words.forEach(w => { if (width(ln + ' ' + w, 7.5) > W - 2 * M) { text(M, y + 8, ln.trim(), 7.5, false, gray(0.4)); y += 11; ln = w; } else ln += ' ' + w; });
    if (ln.trim()) text(M, y + 8, ln.trim(), 7.5, false, gray(0.4));
    pages.push(ops.join('\n'));

    // assemble
    const objs = [];
    const add = s => { objs.push(s); return objs.length; };
    const cat = add('<< /Type /Catalog /Pages 2 0 R >>');
    const pagesIdx = add(null);
    const f1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    const f2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    const kids = [];
    pages.forEach((p, i) => {
      const footer = `BT /F1 7 Tf 0.5 0.5 0.5 rg ${M} 20 Td (${enc(NAME)}) Tj ET\nBT /F1 7 Tf 0.5 0.5 0.5 rg ${W - M - 40} 20 Td (${enc('Page ' + (i + 1) + ' of ' + pages.length)}) Tj ET`;
      const content = p + '\n' + footer;
      const cs = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
      kids.push(add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >> >> /Contents ${cs} 0 R >>`));
    });
    objs[pagesIdx - 1] = `<< /Type /Pages /Kids [${kids.map(k => k + ' 0 R').join(' ')}] /Count ${kids.length} >>`;
    let out = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const offs = [];
    objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const xref = out.length;
    out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    out += `trailer\n<< /Size ${objs.length + 1} /Root ${cat} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const bytes = new Uint8Array(out.length); for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 255;
    return new Blob([bytes], { type: 'application/pdf' });
  }
  return { build };
})();
