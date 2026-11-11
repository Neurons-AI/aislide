import { metafileToDataUrl } from './emf.mjs';
import { chartXml, chartXlsx } from './chartxml.mjs';
// PPTX family reader/writer (pptx, pptm, potx, potm, ppsx, ppsm) for the AI Slide deck model.
// Units: 1 deck unit = 1 pt = 12700 EMU. Text = paragraphs of runs. No DOM needed.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const lib = (n) => { try { return require(n); } catch { const e = new Error(`Thiếu thư viện "${n}" — bấm Install trong màn hình khởi động của app.`); e.code = 'setup_required'; throw e; } };

export const EMU = 12700;
// speaker icon used for audio objects (PowerPoint shows a picture for every media object)
const AUDIO_ICON = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="96" height="96"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#E8591A"/><path d="M16 8a5 5 0 010 8M18.5 5.5a8.5 8.5 0 010 13" fill="none" stroke="#E8591A" stroke-width="2" stroke-linecap="round"/></svg>').toString('base64');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const hex = (c, d = '000000') => { c = String(c || '').replace('#', ''); if (/^[0-9a-f]{3}$/i.test(c)) c = c.split('').map((x) => x + x).join(''); return /^[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : d; };
let _id = 0; export const uid = (p = 'e') => `${p}${Date.now().toString(36)}${(_id++).toString(36)}`;

// ---------------- shared helpers ----------------
export const SHAPES = ['rect', 'roundRect', 'ellipse', 'triangle', 'rtTriangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'parallelogram', 'trapezoid', 'rightArrow', 'leftArrow', 'upArrow', 'downArrow', 'leftRightArrow', 'chevron', 'homePlate', 'star5', 'star6', 'heart', 'cloud', 'wedgeRectCallout', 'wedgeRoundRectCallout', 'plus', 'donut', 'can', 'cube', 'flowChartProcess', 'flowChartDecision', 'flowChartTerminator', 'line'];

function kids(n, name) { const out = []; if (!n) return out; for (let c = n.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && (name === undefined || c.localName === name)) out.push(c); return out; }
function kid(n, name) { return kids(n, name)[0] || null; }
function path(n, ...names) { for (const nm of names) { n = kid(n, nm); if (!n) return null; } return n; }
const at = (n, a) => (n ? n.getAttribute(a) : null) || null;

// ---------------- READ ----------------
export async function readPptx(buf) {
  const JSZip = lib('jszip'); const { DOMParser } = lib('@xmldom/xmldom');
  const zip = await JSZip.loadAsync(buf);
  const parse = async (p) => { const f = zip.file(p); if (!f) return null; return new DOMParser({ onError: () => {} }).parseFromString(await f.async('string'), 'text/xml'); };
  const rels = async (p) => { const d = p.split('/'); const fn = d.pop(); const doc = await parse(`${d.join('/')}/_rels/${fn}.rels`); const m = {}; if (!doc) return m; for (const r of kids(doc.documentElement, 'Relationship')) { const t = at(r, 'Target'); m[at(r, 'Id')] = { type: (at(r, 'Type') || '').split('/').pop(), target: at(r, 'TargetMode') === 'External' ? t : resolve(d.join('/'), t), ext: at(r, 'TargetMode') === 'External' }; } return m; };
  const resolve = (base, t) => { if (t.startsWith('/')) return t.slice(1); const parts = base.split('/').filter(Boolean); for (const s of t.split('/')) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); } return parts.join('/'); };
  const warnings = [];
  const pres = await parse('ppt/presentation.xml');
  if (!pres) throw Object.assign(new Error('Tệp không phải bản trình chiếu PowerPoint hợp lệ.'), { code: 'bad_file' });
  const P = pres.documentElement; const sz = kid(P, 'sldSz');
  const W = Math.round(+at(sz, 'cx') / EMU) || 960, H = Math.round(+at(sz, 'cy') / EMU) || 540;
  const prel = await rels('ppt/presentation.xml');
  // theme
  let theme = { colors: {}, major: 'Calibri', minor: 'Calibri' };
  const themeRel = Object.values(prel).find((r) => r.type === 'theme');
  const masterIds = kids(kid(P, 'sldMasterIdLst'), 'sldMasterId').map((m) => prel[at(m, 'r:id')]).filter(Boolean);
  async function loadTheme(p) {
    const t = await parse(p); if (!t) return;
    const cs = path(t.documentElement, 'themeElements', 'clrScheme');
    for (const c of kids(cs)) { const v = kid(c); theme.colors[c.localName] = v ? (at(v, 'val') && v.localName === 'srgbClr' ? at(v, 'val') : at(v, 'lastClr') || at(v, 'val')) : null; }
    const fs = path(t.documentElement, 'themeElements', 'fontScheme');
    theme.major = at(path(fs, 'majorFont', 'latin'), 'typeface') || theme.major; theme.minor = at(path(fs, 'minorFont', 'latin'), 'typeface') || theme.minor;
  }
  if (themeRel) await loadTheme(themeRel.target);
  const schemeMap = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' };
  const color = (fillNode) => {
    if (!fillNode) return null; const c = kid(fillNode); if (!c) return null;
    let v = null;
    if (c.localName === 'srgbClr') v = at(c, 'val');
    else if (c.localName === 'schemeClr') { const k = at(c, 'val'); v = theme.colors[schemeMap[k] || k]; }
    else if (c.localName === 'sysClr') v = at(c, 'lastClr') || (at(c, 'val') === 'window' ? 'FFFFFF' : '000000');
    else if (c.localName === 'prstClr') v = { black: '000000', white: 'FFFFFF', red: 'FF0000', blue: '0000FF', green: '00B050' }[at(c, 'val')] || null;
    if (!v) return null;
    let [r, g, b] = [0, 2, 4].map((i) => parseInt(v.substr(i, 2), 16));
    const lm = kid(c, 'lumMod'), lo = kid(c, 'lumOff'), sh = kid(c, 'shade'), ti = kid(c, 'tint');
    const f = (n) => +at(n, 'val') / 100000;
    if (lm || lo) { const m = lm ? f(lm) : 1, o = lo ? f(lo) : 0; [r, g, b] = [r, g, b].map((x) => Math.min(255, Math.round(x * m + 255 * o))); }
    if (sh) [r, g, b] = [r, g, b].map((x) => Math.round(x * f(sh)));
    if (ti) [r, g, b] = [r, g, b].map((x) => Math.round(255 - (255 - x) * f(ti)));
    const a = kid(c, 'alpha');
    return { c: '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join(''), a: a ? f(a) : 1 };
  };
  const media = async (p) => { const f = zip.file(p); if (!f) return null; const ext = p.split('.').pop().toLowerCase(); const mime = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp', webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff' }[ext]; if (!mime) { if (ext === 'emf' || ext === 'wmf') { const u = metafileToDataUrl(await f.async('nodebuffer'), ext); if (u) return u; warnings.push('Một hình EMF/WMF bị hỏng — đã bỏ qua.'); } return null; } return `data:${mime};base64,${await f.async('base64')}`; };

  function xfrm(spPr) { const x = kid(spPr, 'xfrm'); if (!x) return null; const o = kid(x, 'off'), e = kid(x, 'ext'); return { x: +at(o, 'x') / EMU, y: +at(o, 'y') / EMU, w: +at(e, 'cx') / EMU, h: +at(e, 'cy') / EMU, rot: (+at(x, 'rot') || 0) / 60000, flipH: at(x, 'flipH') === '1', flipV: at(x, 'flipV') === '1' }; }
  function readText(txBody, defSize) {
    if (!txBody) return null;
    const bp = kid(txBody, 'bodyPr');
    const anchor = { t: 'top', ctr: 'middle', b: 'bottom' }[at(bp, 'anchor')] || null;
    const paras = kids(txBody, 'p').map((p) => {
      const pPr = kid(p, 'pPr'); const lvl = +at(pPr, 'lvl') || 0;
      const para = { runs: [], align: { ctr: 'center', r: 'right', just: 'justify', l: 'left' }[at(pPr, 'algn')] || undefined, level: lvl };
      if (kid(pPr, 'buChar')) para.bullet = 'bullet'; else if (kid(pPr, 'buAutoNum')) para.bullet = 'number'; else if (kid(pPr, 'buNone')) para.bullet = 'none';
      for (const r of kids(p)) {
        if (r.localName !== 'r' && r.localName !== 'fld' && r.localName !== 'br') continue;
        if (r.localName === 'br') { para.runs.push({ t: '\n' }); continue; }
        const rPr = kid(r, 'rPr'); const t = kid(r, 't'); const run = { t: t ? t.textContent : '' };
        if (at(rPr, 'b') === '1') run.b = 1; if (at(rPr, 'i') === '1') run.i = 1;
        if (at(rPr, 'u') && at(rPr, 'u') !== 'none') run.u = 1; if (at(rPr, 'strike') && at(rPr, 'strike') !== 'noStrike') run.s = 1;
        if (at(rPr, 'sz')) run.size = +at(rPr, 'sz') / 100;
        const c = color(kid(rPr, 'solidFill')); if (c) run.color = c.c;
        const lf = at(kid(rPr, 'latin'), 'typeface'); if (lf && !lf.startsWith('+')) run.font = lf;
        const hl = kid(rPr, 'hlinkClick'); if (hl) run.link = at(hl, 'r:id');
        para.runs.push(run);
      }
      return para;
    });
    if (!paras.some((p) => p.runs.some((r) => r.t))) return { paras: paras.length ? paras : [{ runs: [] }], valign: anchor, empty: true };
    return { paras, valign: anchor };
  }
  // placeholder geometry inheritance
  const type0 = (ph) => { const t = at(ph, 'type') || 'body'; return t === 'ctrTitle' ? 'title' : t === 'subTitle' ? 'body' : t; };
  function phIndex(spTree) { const m = {}; for (const sp of kids(spTree)) { const ph = path(sp, 'nvSpPr', 'nvPr', 'ph'); if (!ph) continue; const xf = xfrm(kid(sp, 'spPr')); const tx = kid(sp, 'txBody'); const lvl1 = path(tx, 'lstStyle', 'lvl1pPr', 'defRPr'); const info = { type: type0(ph), xf, size: lvl1 && at(lvl1, 'sz') ? +at(lvl1, 'sz') / 100 : null, anchor: at(kid(tx, 'bodyPr'), 'anchor') }; const type = at(ph, 'type') || 'body'; if (at(ph, 'idx')) m['i' + at(ph, 'idx')] = info; if (!m[type]) m[type] = info; } return m; }
  async function bgOf(cSld, relmap) {
    const bg = kid(cSld, 'bg'); if (!bg) return null; const pr = kid(bg, 'bgPr');
    if (pr) { const sf = kid(pr, 'solidFill'); if (sf) return { color: color(sf)?.c }; const gf = kid(pr, 'gradFill'); if (gf) { const st = kids(kid(gf, 'gsLst'), 'gs').map((g) => color(g)?.c).filter(Boolean); if (st.length) return { color: st[0], grad: st }; } const bf = kid(pr, 'blipFill'); if (bf) { const id = at(kid(bf, 'blip'), 'r:embed'); if (relmap[id]) return { image: await media(relmap[id].target) }; } }
    const ref = kid(bg, 'bgRef'); if (ref) { const c = color(ref); if (c) return { color: c.c }; }
    return null;
  }
  const masterCache = {};
  async function layoutInfo(layoutPath) {
    if (masterCache[layoutPath]) return masterCache[layoutPath];
    const ld = await parse(layoutPath); const lrels = await rels(layoutPath);
    const mRel = Object.values(lrels).find((r) => r.type === 'slideMaster');
    let master = {}, mbg = null, mEls = [];
    if (mRel) { if (!masterCache[mRel.target]) { const md = await parse(mRel.target); const mrels = await rels(mRel.target); const mc = kid(md.documentElement, 'cSld'); const tst = path(md.documentElement, 'txStyles'); const ts = { title: +at(path(tst, 'titleStyle', 'lvl1pPr', 'defRPr'), 'sz') / 100 || 44, body: +at(path(tst, 'bodyStyle', 'lvl1pPr', 'defRPr'), 'sz') / 100 || 28 }; masterCache[mRel.target] = { ph: phIndex(kid(mc, 'spTree')), bg: await bgOf(mc, mrels), ts, els: await shapes(kid(mc, 'spTree'), mrels, {}, ts, true) }; } ({ ph: master, bg: mbg, els: mEls } = masterCache[mRel.target]); }
    const lc = kid(ld?.documentElement, 'cSld');
    const ts = mRel ? masterCache[mRel.target].ts : { title: 44, body: 28 };
    const lph = phIndex(kid(lc, 'spTree')); const mph = { ...master }; for (const [k, v] of Object.entries(lph)) { const base = master[k] || (k.startsWith('i') ? null : null); mph[k] = { xf: v.xf || base?.xf || null, size: v.size || base?.size || null, anchor: v.anchor || base?.anchor || null }; if (!mph[k].xf && v.type) mph[k].xf = master[v.type]?.xf || null; }
    const info = { ph: mph, master, bg: (await bgOf(lc, lrels)) || mbg, ts, name: at(lc, 'name') || '', decor: [...mEls, ...(await shapes(kid(lc, 'spTree'), lrels, {}, ts, true))] };
    masterCache[layoutPath] = info; return info;
  }
  async function shapes(tree, relmap, ph, ts, decorOnly, gx) {
    const out = [];
    for (const n of kids(tree)) {
      const ln = n.localName;
      if (ln === 'AlternateContent') { const alt = kids(n).find((c) => c.localName === 'Choice' && kids(c).some((k) => ['sp', 'pic', 'grpSp', 'graphicFrame', 'cxnSp'].includes(k.localName))) || kid(n, 'Fallback'); if (alt) out.push(...await shapes(alt, relmap, ph, ts, decorOnly, gx)); continue; }
      if (ln === 'grpSp') {
        const g = kid(kid(n, 'grpSpPr'), 'xfrm'); let tx = gx;
        if (g) { const o = kid(g, 'off'), e = kid(g, 'ext'), co = kid(g, 'chOff'), ce = kid(g, 'chExt'); const sx = (+at(e, 'cx') || 1) / (+at(ce, 'cx') || 1), sy = (+at(e, 'cy') || 1) / (+at(ce, 'cy') || 1); const inner = { ox: +at(o, 'x') / EMU, oy: +at(o, 'y') / EMU, cx: +at(co, 'x') / EMU, cy: +at(co, 'y') / EMU, sx, sy }; tx = (b) => { const r = { ...b, x: inner.ox + (b.x - inner.cx) * sx, y: inner.oy + (b.y - inner.cy) * sy, w: b.w * sx, h: b.h * sy }; return gx ? gx(r) : r; }; }
        out.push(...await shapes(n, relmap, ph, ts, decorOnly, tx)); continue;
      }
      const nv = kid(n, 'nvSpPr') || kid(n, 'nvPicPr') || kid(n, 'nvGraphicFramePr') || kid(n, 'nvCxnSpPr');
      const phN = nv ? path(nv, 'nvPr', 'ph') : null;
      if (decorOnly && phN) continue;
      const spPr = kid(n, 'spPr');
      let box = xfrm(spPr) || (ln === 'graphicFrame' ? (() => { const x = kid(n, 'xfrm'); if (!x) return null; const o = kid(x, 'off'), e = kid(x, 'ext'); return { x: +at(o, 'x') / EMU, y: +at(o, 'y') / EMU, w: +at(e, 'cx') / EMU, h: +at(e, 'cy') / EMU, rot: 0 }; })() : null);
      let phType = null, inh = null;
      if (phN) { phType = at(phN, 'type') || 'body'; inh = (at(phN, 'idx') && ph['i' + at(phN, 'idx')]) || ph[phType] || (phType === 'ctrTitle' ? ph.title : null) || (phType === 'subTitle' ? ph.body : null) || null; if (!box && inh) box = inh.xf; }
      if (!box && phType) { const t = /title/i.test(phType) ? (phType === 'ctrTitle' ? [.075, .31, .85, .21] : [.0688, .04, .8625, .18]) : phType === 'subTitle' ? [.15, .56, .7, .25] : /dt|ftr|sldNum/.test(phType) ? null : [.0688, .25, .8625, .66]; if (t) box = { x: t[0] * W, y: t[1] * H, w: t[2] * W, h: t[3] * H }; }
      if (!box && !phN && kid(n, 'txBody') && !decorOnly) { const prev = out[out.length - 1]; box = { x: .0688 * W, y: prev ? Math.min(H * .8, prev.y + prev.h + 8) : .25 * H, w: .8625 * W, h: .3 * H }; }
      if (!box) continue;
      if (gx) box = gx(box);
      const el = { id: uid(), x: r1(box.x), y: r1(box.y), w: r1(box.w), h: r1(box.h) };
      if (box.rot) el.rot = r1(box.rot); if (box.flipH) el.flipH = 1; if (box.flipV) el.flipV = 1;
      if (ln === 'pic' && nv && (path(nv, 'nvPr', 'audioFile') || nv.getElementsByTagName('p14:media')[0])) {
        const mid = at(nv.getElementsByTagName('p14:media')[0], 'r:embed') || at(path(nv, 'nvPr', 'audioFile'), 'r:link'); const rr = relmap[mid];
        const f = rr && zip.file(rr.target); if (f) { const ext = rr.target.split('.').pop().toLowerCase(); const mime = { m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', mp4: 'audio/mp4', wma: 'audio/x-ms-wma' }[ext] || 'audio/mpeg'; Object.assign(el, { type: 'audio', name: at(path(nv, 'cNvPr'), 'name') || 'Audio', src: `data:${mime};base64,${await f.async('base64')}` }); out.push(el); continue; }
      }
      if (ln === 'pic') {
        const id = at(path(n, 'blipFill', 'blip'), 'r:embed'); const src = relmap[id] ? await media(relmap[id].target) : null; if (!src) continue;
        Object.assign(el, { type: 'image', src }); out.push(el); continue;
      }
      if (ln === 'graphicFrame') {
        const tbl = path(n, 'graphic', 'graphicData', 'tbl');
        if (tbl) {
          const rows = kids(tbl, 'tr').map((tr) => kids(tr, 'tc').map((tc) => { const t = readText(kid(tc, 'txBody')); const fill = color(kid(kid(tc, 'tcPr'), 'solidFill')); return { text: t ? t.paras.map((p) => p.runs.map((r) => r.t).join('')).join('\n') : '', ...(fill ? { fill: fill.c } : {}), ...(t && t.paras[0]?.runs[0]?.b ? { b: 1 } : {}) }; }));
          Object.assign(el, { type: 'table', rows, style: 'medium2' }); out.push(el); continue;
        }
        const gd = path(n, 'graphic', 'graphicData');
        if (gd && kid(gd, 'chart')) { const id = at(kid(gd, 'chart'), 'r:id'); const ch = relmap[id] ? await readChart(relmap[id].target) : null; if (ch) { Object.assign(el, { type: 'chart', chart: ch }); out.push(el); continue; } }
        const dm = gd && kid(gd, 'relIds');
        if (dm) { const drawRel = Object.values(relmap).find((r) => /diagramDrawing/.test(r.type) && r.dataRel === at(dm, 'r:dm')) || Object.values(relmap).find((r) => /diagramDrawing/.test(r.type) && !r.used);
          if (drawRel) { drawRel.used = 1; const dd = await parse(drawRel.target); const drels = await rels(drawRel.target); const tree = dd && dd.getElementsByTagName('dsp:spTree')[0]; if (tree) { const ox = el.x, oy = el.y; const sub = await shapes(tree, drels, {}, ts, false, (b) => ({ ...b, x: b.x + ox, y: b.y + oy })); if (sub.length) { const gid = uid(); sub.forEach((x) => (x.group = gid)); out.push(...sub); continue; } } }
          const dataRel = relmap[at(dm, 'r:dm')]; if (dataRel) { const ddoc = await parse(dataRel.target); const ts2 = ddoc ? Array.from(ddoc.getElementsByTagName('a:t')).map((t) => t.textContent).filter(Boolean) : []; if (ts2.length) { const k = ts2.length, gid = uid(), gap = 10, w = (el.w - gap * (k - 1)) / k; ts2.forEach((t, i) => out.push({ id: uid(), group: gid, type: 'shape', shape: 'roundRect', x: r1(el.x + i * (w + gap)), y: el.y, w: r1(w), h: el.h, fill: '#4472c4', text: { size: 16, valign: 'middle', paras: [{ align: 'center', runs: [{ t, color: '#ffffff' }] }] } })); continue; } } }
        const ole = gd && (kid(gd, 'oleObj') || gd.getElementsByTagName('p:oleObj')[0]);
        if (ole) { const pic = ole.getElementsByTagName('p:pic')[0]; const id = pic && at(pic.getElementsByTagName('a:blip')[0], 'r:embed'); const src = id && relmap[id] ? await media(relmap[id].target) : null; if (src) { Object.assign(el, { type: 'image', src }); out.push(el); continue; } }
        continue;
      }
      // sp / cxnSp
      const geom = at(kid(spPr, 'prstGeom'), 'prst') || (kid(spPr, 'custGeom') ? 'rect' : 'rect');
      const style = kid(n, 'style');
      let fill = null; const sf = kid(spPr, 'solidFill'), gf = kid(spPr, 'gradFill');
      if (kid(spPr, 'noFill')) fill = 'none'; else if (sf) { const c = color(sf); fill = c?.c; if (c && c.a < 1) el.opacity = r1(c.a); } else if (gf) { const st = kids(kid(gf, 'gsLst'), 'gs').map((g) => color(g)?.c).filter(Boolean); fill = st[0]; if (st.length > 1) el.grad = st; } else if (style && !phN) { const c = color(kid(style, 'fillRef')); if (c) fill = c.c; }
      const lnN = kid(spPr, 'ln'); let line = null;
      if (lnN && kid(lnN, 'noFill')) line = null; else if (lnN && kid(lnN, 'solidFill')) line = { color: color(kid(lnN, 'solidFill'))?.c, w: (+at(lnN, 'w') || 12700) / EMU }; else if (style && !phN && !(lnN && kid(lnN, 'noFill'))) { const c = color(kid(style, 'lnRef')); if (c) line = { color: c.c, w: 1 }; }
      if (line && lnN) { const d = at(kid(lnN, 'prstDash'), 'val'); if (d && d !== 'solid') line.dash = d; if (kid(lnN, 'tailEnd') && at(kid(lnN, 'tailEnd'), 'type') !== 'none') line.arrow = 1; }
      const txt = readText(kid(n, 'txBody'));
      if (decorOnly && (!txt || txt.empty) && fill === null && !line) continue;
      const isText = (geom === 'rect' && (fill === null || fill === 'none') && !line) || phType;
      el.type = ln === 'cxnSp' || geom === 'line' || geom.startsWith('straightConnector') || geom.startsWith('bentConnector') ? 'line' : isText ? 'text' : 'shape';
      if (el.type === 'shape') el.shape = SHAPES.includes(geom) ? geom : 'rect';
      if (fill && fill !== 'none') el.fill = fill; if (line) el.line = line;
      if (phType) { el.ph = phType === 'ctrTitle' ? 'title' : phType === 'subTitle' ? 'subtitle' : phType; if (['dt', 'ftr', 'sldNum'].includes(phType) && (!txt || txt.empty)) continue; }
      if (txt) {
        const def = phType && /title/i.test(phType) ? (inh?.size || ts.title) : phType ? (inh?.size || (phType === 'body' || phType === 'obj' ? ts.body : 18)) : 18;
        if (!txt.empty || el.type !== 'line') { el.text = { paras: txt.paras, valign: txt.valign || (inh?.anchor ? { t: 'top', ctr: 'middle', b: 'bottom' }[inh.anchor] : (el.type === 'shape' ? 'middle' : (phType && /title/i.test(phType) ? 'middle' : 'top'))), size: def }; if (txt.empty && phType) { el.text.paras = [{ runs: [] }]; el.placeholder = 1; } }
        if (phType === 'body' || phType === 'obj') for (const p of el.text?.paras || []) if (!p.bullet) p.bullet = 'bullet';
        if (phType && /title/i.test(phType) && el.text) el.text.font = theme.major;
      }
      if (decorOnly) el.locked = 1;
      if (el.type === 'text' && txt?.empty && phType) continue; // empty placeholder: PowerPoint shows prompt only in edit mode
      out.push(el);
    }
    return out;
  }
  async function readChart(p) {
    const d = await parse(p); if (!d) return null;
    const pa = path(d.documentElement, 'chart', 'plotArea'); if (!pa) return null;
    const node = kids(pa).find((k) => /Chart$/.test(k.localName)); if (!node) return null;
    const type = { barChart: at(kid(node, 'barDir'), 'val') === 'bar' ? 'hbar' : 'bar', bar3DChart: 'bar', lineChart: 'line', line3DChart: 'line', pieChart: 'pie', pie3DChart: 'pie', doughnutChart: 'doughnut', areaChart: 'area', scatterChart: 'line' }[node.localName] || 'bar';
    const pts = (n) => { const c = n && (kid(n, 'strRef') ? path(n, 'strRef', 'strCache') : kid(n, 'numRef') ? path(n, 'numRef', 'numCache') : kid(n, 'strLit') || kid(n, 'numLit')); return c ? kids(c, 'pt').sort((a, b) => +at(a, 'idx') - +at(b, 'idx')).map((x) => kid(x, 'v')?.textContent ?? '') : []; };
    const series = kids(node, 'ser').map((s) => ({ name: pts(kid(s, 'tx'))[0] || 'Chuỗi', values: pts(kid(s, 'val') || kid(s, 'yVal')).map(Number), labels: pts(kid(s, 'cat') || kid(s, 'xVal')) }));
    if (!series.length) return null;
    const title = path(d.documentElement, 'chart', 'title') ? Array.from(path(d.documentElement, 'chart', 'title').getElementsByTagName('a:t')).map((x) => x.textContent).join('') : '';
    return { type, title, labels: series[0].labels, series: series.map(({ name, values }) => ({ name, values })) };
  }

  const slides = []; const sections = [];
  const sldIds = kids(kid(P, 'sldIdLst'), 'sldId');
  const idToIndex = {}; sldIds.forEach((s, i) => { idToIndex[at(s, 'id')] = i; });
  const ext = Array.from(pres.getElementsByTagName('p14:section'));
  for (const s of ext) { const first = s.getElementsByTagName('p14:sldId')[0]; if (first) sections.push({ name: at(s, 'name'), start: idToIndex[at(first, 'id')] ?? 0 }); }
  // Damaged/minimal files (no sldIdLst): read ppt/slides/slideN.xml in number order, like PowerPoint's repair.
  let slideTargets = sldIds.map((s) => prel[at(s, 'r:id')]).filter(Boolean);
  if (!slideTargets.length) { slideTargets = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f)).sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]).map((target) => ({ target })); if (slideTargets.length) warnings.push('Tệp thiếu danh sách slide — đã khôi phục ' + slideTargets.length + ' slide.'); }
  for (const r of slideTargets) {
    const sd = await parse(r.target); if (!sd) continue;
    const srel = await rels(r.target);
    const lay = Object.values(srel).find((x) => x.type === 'slideLayout');
    const li = lay ? await layoutInfo(lay.target) : { ph: {}, bg: null, ts: { title: 44, body: 28 }, decor: [] };
    const cSld = kid(sd.documentElement, 'cSld');
    const slide = { id: uid('s'), layout: li.name || 'custom', els: [], notes: '' };
    const showMaster = at(sd.documentElement, 'showMasterSp') !== '0';
    if (at(sd.documentElement, 'show') === '0') slide.hidden = 1;
    slide.bg = (await bgOf(cSld, srel)) || li.bg || { color: '#ffffff' };
    slide.els = [...(showMaster ? li.decor.map((e) => ({ ...e, id: uid() })) : []), ...await shapes(kid(cSld, 'spTree'), srel, li.ph, li.ts)];
    const tr = kids(sd.documentElement).find((k) => k.localName === 'transition') || Array.from(sd.getElementsByTagName('p:transition'))[0];
    if (tr) { const t = kid(tr); slide.transition = { type: t ? ({ fade: 'fade', push: 'push', wipe: 'wipe', cut: 'none', split: 'split', cover: 'cover', zoom: 'zoom', morph: 'fade', randomBar: 'fade' }[t.localName] || 'fade') : 'fade' }; }
    const nRel = Object.values(srel).find((x) => x.type === 'notesSlide');
    if (nRel) { const nd = await parse(nRel.target); if (nd) { for (const sp of Array.from(nd.getElementsByTagName('p:sp'))) { const ph = sp.getElementsByTagName('p:ph')[0]; if (ph && at(ph, 'type') === 'body') { slide.notes = Array.from(sp.getElementsByTagName('a:p')).map((p) => Array.from(p.getElementsByTagName('a:t')).map((t) => t.textContent).join('')).join('\n').trim(); } } } }
    // hyperlinks: resolve rid
    for (const e of slide.els) for (const p of e.text?.paras || []) for (const run of p.runs) if (run.link) { const rr = srel[run.link]; if (rr && rr.ext) run.link = rr.target; else delete run.link; }
    slides.push(slide);
  }
  const core = await parse('docProps/core.xml');
  const title = core ? (core.getElementsByTagName('dc:title')[0]?.textContent || '') : '';
  return { deck: { title, w: W, h: H, theme: { name: 'Imported', font: theme.minor, headFont: theme.major, colors: theme.colors }, slides, sections }, warnings: [...new Set(warnings)].slice(0, 6) };
}
const r1 = (n) => Math.round(n * 10) / 10;

// ---------------- WRITE ----------------
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const E = (n) => Math.round((+n || 0) * EMU);
const RT = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CT_MAIN = { pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml', pptm: 'application/vnd.ms-powerpoint.presentation.macroEnabled.main+xml', potx: 'application/vnd.openxmlformats-officedocument.presentationml.template.main+xml', potm: 'application/vnd.ms-powerpoint.template.macroEnabled.main+xml', ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow.main+xml', ppsm: 'application/vnd.ms-powerpoint.slideshow.macroEnabled.main+xml' };

function runXml(r, base) {
  const a = [`lang="vi-VN"`]; const sz = r.size || base.size; if (sz) a.push(`sz="${Math.round(sz * 100)}"`);
  if (r.b) a.push('b="1"'); if (r.i) a.push('i="1"'); if (r.u) a.push('u="sng"'); if (r.s) a.push('strike="sngStrike"');
  let inner = ''; const c = r.color || base.color; if (c) inner += `<a:solidFill><a:srgbClr val="${hex(c)}"/></a:solidFill>`;
  const f = r.font || base.font; if (f) inner += `<a:latin typeface="${esc(f)}"/><a:cs typeface="${esc(f)}"/>`;
  if (r.link && base.linkRid) inner += `<a:hlinkClick r:id="${base.linkRid(r.link)}"/>`;
  return `<a:r><a:rPr ${a.join(' ')} dirty="0">${inner}</a:rPr><a:t>${esc(r.t)}</a:t></a:r>`;
}
function txBody(text, tag = 'p:txBody', base = {}) {
  const t = text || { paras: [{ runs: [] }] };
  const anchor = { top: 't', middle: 'ctr', bottom: 'b' }[t.valign] || 't';
  const b = { size: t.size, color: t.color, font: t.font, linkRid: base.linkRid };
  const ps = (t.paras?.length ? t.paras : [{ runs: [] }]).map((p) => {
    const al = { center: 'ctr', right: 'r', justify: 'just', left: 'l' }[p.align] || 'l';
    const lvl = p.level || 0; let bu = '<a:buNone/>';
    if (p.bullet === 'bullet') bu = `<a:buFont typeface="Arial"/><a:buChar char="${lvl % 2 ? '–' : '•'}"/>`; else if (p.bullet === 'number') bu = '<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>';
    const ind = p.bullet && p.bullet !== 'none' ? ` marL="${342900 + lvl * 457200}" indent="-342900"` : (lvl ? ` marL="${lvl * 457200}"` : '');
    const runs = []; for (const r of p.runs || []) { const parts = String(r.t ?? '').split('\n'); parts.forEach((s, i) => { if (i) runs.push('<a:br/>'); if (s) runs.push(runXml({ ...r, t: s }, b)); }); }
    const end = `<a:endParaRPr lang="vi-VN"${b.size ? ` sz="${Math.round((p.runs?.[0]?.size || b.size) * 100)}"` : ''} dirty="0"/>`;
    return `<a:p><a:pPr lvl="${lvl}" algn="${al}"${ind}>${bu}</a:pPr>${runs.join('')}${end}</a:p>`;
  }).join('');
  const fit = t.autofit === 'shrink' ? '<a:normAutofit/>' : t.autofit === 'none' ? '' : '';
  return `<${tag}><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" rtlCol="0" anchor="${anchor}">${fit}</a:bodyPr><a:lstStyle/>${ps}</${tag}>`;
}
const xf = (e, tag = 'a:xfrm') => `<${tag}${e.rot ? ` rot="${Math.round(e.rot * 60000)}"` : ''}${e.flipH ? ' flipH="1"' : ''}${e.flipV ? ' flipV="1"' : ''}><a:off x="${E(e.x)}" y="${E(e.y)}"/><a:ext cx="${E(Math.max(e.w, 0.1))}" cy="${E(Math.max(e.h, 0.1))}"/></${tag}>`;
const fillXml = (e) => e.grad && e.grad.length > 1 ? `<a:gradFill rotWithShape="1"><a:gsLst>${e.grad.map((c, i) => `<a:gs pos="${Math.round(i / (e.grad.length - 1) * 100000)}"><a:srgbClr val="${hex(c)}"/></a:gs>`).join('')}</a:gsLst><a:lin ang="5400000" scaled="0"/></a:gradFill>` : e.fill && e.fill !== 'none' ? `<a:solidFill><a:srgbClr val="${hex(e.fill)}">${e.opacity != null && e.opacity < 1 ? `<a:alpha val="${Math.round(e.opacity * 100000)}"/>` : ''}</a:srgbClr></a:solidFill>` : '<a:noFill/>';
const lineXml = (l) => l && l.color ? `<a:ln w="${E(l.w || 1)}"><a:solidFill><a:srgbClr val="${hex(l.color)}"/></a:solidFill>${l.dash ? `<a:prstDash val="${esc(l.dash)}"/>` : ''}${l.arrow ? '<a:tailEnd type="triangle"/>' : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>';

function dataUrl(src) { const m = /^data:([^;,]+)(?:;[^;,=]+=[^;,]*)*(;base64)?,(.*)$/s.exec(src || ''); if (!m) return null; const ext = { 'image/png': 'png', 'image/jpeg': 'jpeg', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/bmp': 'bmp', 'image/webp': 'png', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/webm': 'webm', 'audio/ogg': 'ogg' }[m[1].split(';')[0]] || 'png'; return { ext, data: m[2] ? Buffer.from(m[3], 'base64') : Buffer.from(decodeURIComponent(m[3]), 'utf8') }; }

export async function writePptx(deck, format = 'pptx') {
  const JSZip = lib('jszip');
  const zip = new JSZip();
  const W = deck.w || 960, H = deck.h || 540;
  const slides = deck.slides?.length ? deck.slides : [{ els: [] }];
  const font = deck.theme?.font || 'Calibri', head = deck.theme?.headFont || font;
  const media = []; const ctExt = new Set(); let chartN = 0;
  const ct = [`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`, `<Default Extension="xml" ContentType="application/xml"/>`,
    `<Override PartName="/ppt/presentation.xml" ContentType="${CT_MAIN[format] || CT_MAIN.pptx}"/>`,
    `<Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>`,
    `<Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>`,
    `<Override PartName="/ppt/notesMasters/notesMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesMaster+xml"/>`,
    `<Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,
    `<Override PartName="/ppt/theme/theme2.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>`,
    `<Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/>`,
    `<Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/>`,
    `<Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>`,
    `<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`,
    `<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>`];
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/officeDocument" Target="ppt/presentation.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${RT}/extended-properties" Target="docProps/app.xml"/></Relationships>`);
  const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
  zip.file('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(deck.title || 'Bản trình chiếu')}</dc:title><dc:creator>AI Slide</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified></cp:coreProperties>`);
  zip.file('docProps/app.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>AI Slide</Application><Slides>${slides.length}</Slides></Properties>`);
  const tc = deck.theme?.colors || {};
  const theme = (n) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${esc(deck.theme?.name || 'AI Slide')}"><a:themeElements><a:clrScheme name="AI Slide"><a:dk1><a:srgbClr val="${hex(tc.dk1, '000000')}"/></a:dk1><a:lt1><a:srgbClr val="${hex(tc.lt1, 'FFFFFF')}"/></a:lt1><a:dk2><a:srgbClr val="${hex(tc.dk2, '1F2937')}"/></a:dk2><a:lt2><a:srgbClr val="${hex(tc.lt2, 'E7E6E6')}"/></a:lt2>${[1, 2, 3, 4, 5, 6].map((i) => `<a:accent${i}><a:srgbClr val="${hex(tc['accent' + i], ['F26B1D', '2F6FD6', '8E5BD8', '2E9D6A', 'E0A100', 'D6455D'][i - 1])}"/></a:accent${i}>`).join('')}<a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="AI Slide"><a:majorFont><a:latin typeface="${esc(head)}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="${esc(font)}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Office"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="6350"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;
  zip.file('ppt/theme/theme1.xml', theme(1)); zip.file('ppt/theme/theme2.xml', theme(2));
  const emptyTree = `<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>`;
  const clrMap = '<p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>';
  const lvl = (sz) => [1, 2, 3, 4, 5].map((i) => `<a:lvl${i}pPr marL="${(i - 1) * 457200}" algn="l"><a:defRPr sz="${sz}"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl${i}pPr>`).join('');
  zip.file('ppt/slideMasters/slideMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${emptyTree}</p:spTree></p:cSld>${clrMap}<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr algn="l"><a:defRPr sz="4400"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mj-lt"/></a:defRPr></a:lvl1pPr></p:titleStyle><p:bodyStyle>${lvl(2400)}</p:bodyStyle><p:otherStyle>${lvl(1800)}</p:otherStyle></p:txStyles></p:sldMaster>`);
  zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/><Relationship Id="rId2" Type="${RT}/theme" Target="../theme/theme1.xml"/></Relationships>`);
  zip.file('ppt/slideLayouts/slideLayout1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sldLayout ${NS} preserve="1"><p:cSld name="Blank"><p:spTree>${emptyTree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`);
  zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/slideMaster" Target="../slideMasters/slideMaster1.xml"/></Relationships>`);
  zip.file('ppt/notesMasters/notesMaster1.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notesMaster ${NS}><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${emptyTree}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="685800" y="4400550"/><a:ext cx="5486400" cy="3600450"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr><p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="vi-VN"/></a:p></p:txBody></p:sp></p:spTree></p:cSld>${clrMap}<p:notesStyle>${lvl(1200)}</p:notesStyle></p:notesMaster>`);
  zip.file('ppt/notesMasters/_rels/notesMaster1.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/theme" Target="../theme/theme2.xml"/></Relationships>`);
  zip.file('ppt/presProps.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentationPr ${NS}/>`);
  zip.file('ppt/viewProps.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:viewPr ${NS}><p:normalViewPr><p:restoredLeft sz="15620"/><p:restoredTop sz="94660"/></p:normalViewPr><p:gridSpacing cx="76200" cy="76200"/></p:viewPr>`);
  zip.file('ppt/tableStyles.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`);

  const sldIds = []; const presRels = [`<Relationship Id="rId1" Type="${RT}/slideMaster" Target="slideMasters/slideMaster1.xml"/>`, `<Relationship Id="rId2" Type="${RT}/notesMaster" Target="notesMasters/notesMaster1.xml"/>`, `<Relationship Id="rId3" Type="${RT}/presProps" Target="presProps.xml"/>`, `<Relationship Id="rId4" Type="${RT}/viewProps" Target="viewProps.xml"/>`, `<Relationship Id="rId5" Type="${RT}/theme" Target="theme/theme1.xml"/>`, `<Relationship Id="rId6" Type="${RT}/tableStyles" Target="tableStyles.xml"/>`];
  for (let i = 0; i < slides.length; i++) { const s = slides[i];
    const n = i + 1; const srels = [`<Relationship Id="rId1" Type="${RT}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>`, `<Relationship Id="rId2" Type="${RT}/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/>`];
    let rid = 3; const linkMap = {}; const linkRid = (url) => { if (!linkMap[url]) { linkMap[url] = `rId${rid++}`; srels.push(`<Relationship Id="${linkMap[url]}" Type="${RT}/hyperlink" Target="${esc(url)}" TargetMode="External"/>`); } return linkMap[url]; };
    const addMedia = (src) => { const d = dataUrl(src); if (!d) return null; const name = `image${media.length + 1}.${d.ext}`; media.push(name); ctExt.add(d.ext); zip.file(`ppt/media/${name}`, d.data); const r = `rId${rid++}`; srels.push(`<Relationship Id="${r}" Type="${RT}/image" Target="../media/${name}"/>`); return r; };
    let sid = 2; const parts = []; const audioIds = [];
    for (const e of s.els || []) {
      const id = sid++; const nm = esc(`${e.type || 'shape'} ${id}`);
      if (e.type === 'chart' && e.chart) {
        const k = ++chartN; const r = `rId${rid++}`; srels.push(`<Relationship Id="${r}" Type="${RT}/chart" Target="../charts/chart${k}.xml"/>`);
        const pal = [tc.accent1, tc.accent2, tc.accent3, tc.accent4, tc.accent5, tc.accent6].filter(Boolean).map((c) => hex(c));
        const PAL6 = ['4472C4', 'ED7D31', 'A5A5A5', 'FFC000', '5B9BD5', '70AD47']; zip.file(`ppt/charts/chart${k}.xml`, chartXml(e.chart, [...new Set([...pal, ...PAL6])]));
        zip.file(`ppt/embeddings/Microsoft_Excel_Worksheet${k}.xlsx`, await chartXlsx(e.chart));
        zip.file(`ppt/charts/_rels/chart${k}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/package" Target="../embeddings/Microsoft_Excel_Worksheet${k}.xlsx"/></Relationships>`);
        ct.push(`<Override PartName="/ppt/charts/chart${k}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`); ctExt.add('xlsx');
        parts.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${nm}"/><p:cNvGraphicFramePr/><p:nvPr/></p:nvGraphicFramePr>${xf(e, 'p:xfrm')}<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="${r}"/></a:graphicData></a:graphic></p:graphicFrame>`);
        continue;
      }
      if (e.type === 'audio' && e.src) {
        const d = dataUrl(e.src); if (!d) continue; const name = `media${media.length + 1}.${d.ext}`; media.push(name); ctExt.add(d.ext); zip.file(`ppt/media/${name}`, d.data);
        const ra = `rId${rid++}`, rm = `rId${rid++}`; srels.push(`<Relationship Id="${ra}" Type="${RT}/audio" Target="../media/${name}"/>`, `<Relationship Id="${rm}" Type="http://schemas.microsoft.com/office/2007/relationships/media" Target="../media/${name}"/>`);
        const icon = addMedia(AUDIO_ICON);
        parts.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${esc(e.name || 'Narration')}"><a:hlinkClick r:id="" action="ppaction://media"/></p:cNvPr><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr><a:audioFile r:link="${ra}"/><p:extLst><p:ext uri="{DAA4B4D4-6D71-4841-9C94-3DA1E6FA6E7A}"><p14:media xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main" r:embed="${rm}"/></p:ext></p:extLst></p:nvPr></p:nvPicPr><p:blipFill><a:blip r:embed="${icon}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xf(e)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`);
        audioIds.push({ id, auto: e.autoplay !== false }); continue;
      }
      if (e.type === 'image' || (e.type === 'chart' && e.png)) {
        const r = addMedia(e.type === 'chart' ? e.png : e.src); if (!r) continue;
        const crop = e.crop ? `<a:srcRect l="${Math.round(e.crop.l * 1000)}" t="${Math.round(e.crop.t * 1000)}" r="${Math.round(e.crop.r * 1000)}" b="${Math.round(e.crop.b * 1000)}"/>` : '';
        parts.push(`<p:pic><p:nvPicPr><p:cNvPr id="${id}" name="${nm}"${e.alt ? ` descr="${esc(e.alt)}"` : ''}/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${r}"/>${crop}<a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr>${xf(e)}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${e.line ? lineXml(e.line) : ''}</p:spPr></p:pic>`);
      } else if (e.type === 'chart') { continue;
      } else if (e.type === 'table') {
        const rows = e.rows || [[{ text: '' }]]; const cols = Math.max(...rows.map((r) => r.length)); const cw = E(e.w / cols), rh = E(e.h / rows.length);
        const acc = hex(e.accent || tc.accent1, '2F6FD6');
        const trs = rows.map((r, ri) => `<a:tr h="${rh}">${Array.from({ length: cols }, (_, ci) => { const c = r[ci] || { text: '' }; const head = ri === 0 && e.header !== false; const f = c.fill ? hex(c.fill) : head ? acc : ri % 2 ? 'FFFFFF' : 'E9EEF7'; const txt = { paras: String(c.text ?? '').split('\n').map((l) => ({ runs: [{ t: l, b: head || c.b ? 1 : 0, color: head ? '#FFFFFF' : (c.color || '#1F2937') }] })), size: e.size || 14 }; return `<a:tc>${txBody(txt, 'a:txBody').replace(/anchor="t"/, 'anchor="ctr"')}<a:tcPr><a:lnL w="6350"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:lnL><a:lnR w="6350"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:lnR><a:lnT w="6350"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:lnT><a:lnB w="6350"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:lnB><a:solidFill><a:srgbClr val="${f}"/></a:solidFill></a:tcPr></a:tc>`; }).join('')}</a:tr>`).join('');
        parts.push(`<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${id}" name="${nm}"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr>${xf(e, 'p:xfrm')}<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${Array.from({ length: cols }, () => `<a:gridCol w="${cw}"/>`).join('')}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`);
      } else if (e.type === 'line') {
        parts.push(`<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${id}" name="${nm}"/><p:cNvCxnSpPr/><p:nvPr/></p:nvCxnSpPr><p:spPr>${xf(e)}<a:prstGeom prst="line"><a:avLst/></a:prstGeom>${lineXml(e.line || { color: '#1F2937', w: 2 })}</p:spPr></p:cxnSp>`);
      } else {
        const geom = e.type === 'shape' ? (SHAPES.includes(e.shape) ? e.shape : 'rect') : 'rect';
        const ph = e.ph === 'title' ? '<p:ph type="title"/>' : '';
        parts.push(`<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${nm}"/><p:cNvSpPr${e.type === 'text' ? ' txBox="1"' : ''}/><p:nvPr>${ph}</p:nvPr></p:nvSpPr><p:spPr>${xf(e)}<a:prstGeom prst="${geom}"><a:avLst/></a:prstGeom>${fillXml(e)}${lineXml(e.line)}</p:spPr>${txBody(e.text ? { ...e.text, valign: e.text.valign || (e.type === 'shape' ? 'middle' : 'top') } : { paras: [{ runs: [] }], valign: 'middle' }, 'p:txBody', { linkRid }).replace(/<a:pPr lvl="0" algn="l"/g, e.type === 'shape' && !(e.text?.paras || []).some((p) => p.align) ? '<a:pPr lvl="0" algn="ctr"' : '$&')}</p:sp>`);
      }
    }
    const bg = s.bg || {}; let bgXml = '';
    if (bg.image) { const r = addMedia(bg.image); if (r) bgXml = `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${r}"/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>`; }
    else if (bg.grad && bg.grad.length > 1) bgXml = `<p:bg><p:bgPr>${fillXml({ grad: bg.grad })}<a:effectLst/></p:bgPr></p:bg>`;
    else if (bg.color) bgXml = `<p:bg><p:bgPr><a:solidFill><a:srgbClr val="${hex(bg.color, 'FFFFFF')}"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>`;
    const trMap = { fade: '<p:fade/>', push: '<p:push dir="u"/>', wipe: '<p:wipe dir="r"/>', split: '<p:split orient="vert" dir="out"/>', cover: '<p:cover dir="l"/>', zoom: '<p:zoom/>', none: '' };
    const tr = s.transition && s.transition.type && s.transition.type !== 'none' ? `<p:transition spd="med"${s.transition.after ? ` advTm="${Math.round(s.transition.after * 1000)}"` : ''}>${trMap[s.transition.type] || '<p:fade/>'}</p:transition>` : '';
    const auto = audioIds.filter((a) => a.auto); let ctn = 2;
    const timing = auto.length ? `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>${auto.map((a) => `<p:audio><p:cMediaNode vol="80000"><p:cTn id="${ctn++}" fill="hold" display="0"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:endCondLst><p:cond evt="onStopAudio" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:endCondLst></p:cTn><p:tgtEl><p:spTgt spid="${a.id}"/></p:tgtEl></p:cMediaNode></p:audio>`).join('')}</p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>` : '';
    zip.file(`ppt/slides/slide${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:sld ${NS}${s.hidden ? ' show="0"' : ''}><p:cSld>${bgXml}<p:spTree>${emptyTree}${parts.join('')}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>${tr}${timing}</p:sld>`);
    zip.file(`ppt/slides/_rels/slide${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${srels.join('')}</Relationships>`);
    const notesTxt = { paras: String(s.notes || '').split('\n').map((l) => ({ runs: l ? [{ t: l }] : [] })) };
    zip.file(`ppt/notesSlides/notesSlide${n}.xml`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:notes ${NS}><p:cSld><p:spTree>${emptyTree}<p:sp><p:nvSpPr><p:cNvPr id="2" name="Notes Placeholder 1"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>${txBody(notesTxt)}</p:sp></p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>`);
    zip.file(`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${RT}/notesMaster" Target="../notesMasters/notesMaster1.xml"/><Relationship Id="rId2" Type="${RT}/slide" Target="../slides/slide${n}.xml"/></Relationships>`);
    ct.push(`<Override PartName="/ppt/slides/slide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`, `<Override PartName="/ppt/notesSlides/notesSlide${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.notesSlide+xml"/>`);
    presRels.push(`<Relationship Id="rId${100 + n}" Type="${RT}/slide" Target="slides/slide${n}.xml"/>`);
    sldIds.push(`<p:sldId id="${255 + n}" r:id="rId${100 + n}"/>`);
  }
  for (const x of ctExt) ct.push(`<Default Extension="${x}" ContentType="${{ png: 'image/png', jpeg: 'image/jpeg', jpg: 'image/jpeg', gif: 'image/gif', svg: 'image/svg+xml', bmp: 'image/bmp', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', m4a: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', webm: 'audio/webm', ogg: 'audio/ogg', mp4: 'video/mp4' }[x] || 'application/octet-stream'}"/>`);
  const secs = (deck.sections || []).filter((x) => x.name);
  const secXml = secs.length ? `<p:extLst><p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}"><p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">${secs.map((sec, k) => { const end = k + 1 < secs.length ? secs[k + 1].start : slides.length; const ids = []; for (let j = sec.start; j < end; j++) ids.push(`<p14:sldId id="${256 + j}"/>`); return `<p14:section name="${esc(sec.name)}" id="{${uuid()}}"><p14:sldIdLst>${ids.join('')}</p14:sldIdLst></p14:section>`; }).join('')}</p14:sectionLst></p:ext></p:extLst>` : '';
  zip.file('ppt/presentation.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${sldIds.join('')}</p:sldIdLst><p:sldSz cx="${E(W)}" cy="${E(H)}"/><p:notesSz cx="6858000" cy="9144000"/><p:defaultTextStyle>${lvl(1800)}</p:defaultTextStyle>${secXml}</p:presentation>`);
  zip.file('ppt/_rels/presentation.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${presRels.join('')}</Relationships>`);
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
function uuid() { return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16).toUpperCase(); }); }
