// Adapter between the DeckCraft model (Rust engine, kept as the master copy) and the AI Slide
// editor deck. Import: DeckCraft -> editor elements (each keeps `dc` = the DeckCraft shape id).
// Save: editor edits are merged back INTO the original DeckCraft shapes by id, so everything the
// editor does not model (masters, theme, SmartArt, effects, 3-D, ink, kept XML…) survives untouched.
const PT = 1; // DeckCraft units are points, like the editor
const hex2 = (n) => n.toString(16).padStart(2, '0');
const rgbHex = (c) => (c ? '#' + hex2(c.r) + hex2(c.g) + hex2(c.b) : null);
const hexRgb = (h) => { const m = /^#?([0-9a-f]{6})/i.exec(h || ''); if (!m) return null; const v = parseInt(m[1], 16); return { r: v >> 16, g: (v >> 8) & 255, b: v & 255, a: 255 }; };
const MOD = { lumMod: (c, v) => scale(c, v), lumOff: (c, v) => add(c, v), tint: (c, v) => mixTo(c, 255, 1 - v), shade: (c, v) => scale(c, v), alpha: (c) => c };
function scale(c, v) { return { ...c, r: Math.round(c.r * v), g: Math.round(c.g * v), b: Math.round(c.b * v) }; }
function add(c, v) { const k = Math.round(v * 255); return { ...c, r: Math.min(255, c.r + k), g: Math.min(255, c.g + k), b: Math.min(255, c.b + k) }; }
function mixTo(c, t, f) { return { ...c, r: Math.round(c.r + (t - c.r) * f), g: Math.round(c.g + (t - c.g) * f), b: Math.round(c.b + (t - c.b) * f) }; }

// ---------- colour resolution (theme + colour map) ----------
function themeOf(P, slide) {
  const lay = findLayout(P, slide?.layout); const m = lay?.master || P.masters?.[0];
  const th = m?.theme || {}; const cs = th.colors || {}; const map = Object.fromEntries((slide?.colorMap || lay?.layout?.colorMap || m?.colorMap || []).map(([a, b]) => [a, b]));
  return { th, cs, map, fonts: th.fonts || {} };
}
function findLayout(P, id) { for (const m of P.masters || []) for (const l of m.layouts || []) if (l.id === id) return { master: m, layout: l }; return P.masters?.[0] ? { master: P.masters[0], layout: P.masters[0].layouts?.[0] } : null; }
function slotRgb(T, slot) {
  const alias = { bg1: 'lt1', tx1: 'dk1', bg2: 'lt2', tx2: 'dk2' }; let s = slot;
  if (alias[s]) s = T.map[s] ? (alias[T.map[s]] || T.map[s]) : alias[s];
  const v = T.cs[s] || T.cs[camel(s)]; return v && (v.r !== undefined ? v : v.rgb || v.last) || null;
}
const camel = (s) => s.replace(/(\d)/, '$1');
export function colorOf(T, c) {
  if (!c) return null; const b = c.base || c; let rgb = null;
  if (b.kind === 'rgb') rgb = b.rgb; else if (b.kind === 'scheme') rgb = slotRgb(T, b.slot); else if (b.kind === 'system') rgb = b.last; else if (b.kind === 'preset') rgb = hexRgb(PRESET[b.name] || '#000000');
  if (!rgb) return null; for (const m of c.mods || []) { const k = m.kind || Object.keys(m)[0]; const v = m.v ?? m.val ?? m[k]; if (MOD[k] && typeof v === 'number') rgb = MOD[k](rgb, v); }
  return rgbHex(rgb);
}
const PRESET = { black: '#000000', white: '#ffffff', red: '#ff0000', green: '#008000', blue: '#0000ff', yellow: '#ffff00', gray: '#808080', orange: '#ffa500' };
function fillOf(T, f) { if (!f) return undefined; if (f.kind === 'none') return 'none'; if (f.kind === 'solid') return colorOf(T, f.color); if (f.kind === 'gradient') return colorOf(T, f.stops?.[0]?.color); return undefined; }
const solid = (hex) => { const c = hexRgb(hex); return c ? { kind: 'solid', color: { base: { kind: 'rgb', rgb: c } } } : { kind: 'none' }; };

// ---------- DeckCraft -> editor ----------
const ALIGN = { left: 'left', center: 'center', right: 'right', justify: 'justify', justLow: 'justify', distributed: 'justify' };
const ANCHOR = { top: 'top', middle: 'middle', bottom: 'bottom' };
const PRESET_SHAPES = new Set(['rect', 'roundRect', 'ellipse', 'triangle', 'rtTriangle', 'diamond', 'pentagon', 'hexagon', 'octagon', 'parallelogram', 'trapezoid', 'star5', 'star6', 'star8', 'rightArrow', 'leftArrow', 'upArrow', 'downArrow', 'leftRightArrow', 'chevron', 'homePlate', 'heart', 'cloud', 'wedgeRectCallout', 'wedgeRoundRectCallout', 'wedgeEllipseCallout', 'plus', 'donut', 'can', 'cube', 'lightningBolt', 'sun', 'moon', 'smileyFace', 'flowChartProcess', 'flowChartDecision', 'flowChartTerminator', 'flowChartDocument', 'flowChartInputOutput', 'snip1Rect', 'round1Rect', 'round2SameRect', 'frame', 'arc', 'blockArc', 'bracePair', 'bracketPair', 'line']);
function runOut(T, r, fonts) {
  const p = r.props || {}; const o = { t: r.kind === 'break' ? '\n' : (r.text || '') };
  if (p.bold) o.b = 1; if (p.italic) o.i = 1; if (p.underline && p.underline !== 'none') o.u = 1; if (p.strike && p.strike !== 'none') o.s = 1;
  if (p.size) o.size = p.size; if (p.font) o.font = p.font.startsWith('+') ? (p.font.startsWith('+mj') ? fonts.major?.latin : fonts.minor?.latin) || undefined : p.font;
  const c = fillOf(T, p.fill); if (c && c !== 'none') o.color = c; if (p.highlight) o.hl = colorOf(T, p.highlight);
  if (p.baseline > 0) o.sup = 1; if (p.baseline < 0) o.sub = 1; if (p.caps === 'all') o.caps = 1;
  if (p.link?.action?.kind === 'url') o.link = p.link.action.url;
  Object.keys(o).forEach((k) => o[k] === undefined && delete o[k]); return o;
}
function textOut(T, tb, fonts) {
  if (!tb) return null; const b = tb.body || {};
  const paras = (tb.paragraphs || []).map((p) => {
    const pp = p.props || {}; const o = { runs: (p.runs || []).map((r) => runOut(T, r, fonts)) };
    if (pp.align && ALIGN[pp.align]) o.align = ALIGN[pp.align]; if (p.level) o.level = p.level;
    const bu = pp.bullet; if (bu?.kind === 'char') o.bullet = 'bullet'; else if (bu?.kind === 'autoNum') o.bullet = 'number';
    if (!o.runs.length && p.endProps?.size) o.runs = [{ t: '', size: p.endProps.size }];
    return o;
  });
  const sizes = paras.flatMap((p) => p.runs.map((r) => r.size)).filter(Boolean);
  return { size: sizes[0] || 18, valign: ANCHOR[b.anchor] || undefined, paras: paras.length ? paras : [{ runs: [] }] };
}
function xf(s, gx) { const x = s.xfrm || { x: 0, y: 0, w: 0, h: 0 }; let r = { x: x.x * PT, y: x.y * PT, w: x.w * PT, h: x.h * PT, rot: x.rot || 0, flipH: !!x.flipH, flipV: !!x.flipV }; if (gx) r = gx(r); return r; }
function elementsOf(P, slide, media) {
  const T = themeOf(P, slide); const fonts = T.fonts; const out = [];
  const walk = (shapes, gx, group) => {
    for (const s of shapes || []) {
      const k = s.kind || { type: 'shape' }; const box = xf(s, gx);
      const base = { id: 'dc' + s.id, dc: s.id, x: r1(box.x), y: r1(box.y), w: r1(box.w), h: r1(box.h) };
      if (box.rot) base.rot = r1(box.rot); if (box.flipH) base.flipH = 1; if (box.flipV) base.flipV = 1; if (s.hidden) continue; if (s.locked) base.locked = 1; if (group) base.group = group; if (s.descr) base.alt = s.descr;
      if (s.ph) base.ph = { title: 'title', ctrTitle: 'title', subTitle: 'subtitle' }[s.ph.kind] || 'body';
      const done = (el) => { el.osig = JSON.stringify([el.x, el.y, el.w, el.h, el.rot || 0, el.flipH || 0, el.flipV || 0, el.fill || null, el.line || null, el.shape || null, el.locked || 0, el.alt || '']); el.dsig = dsig(el); return el; };
      if (k.type === 'group') {
        const ch = k.child || { x: 0, y: 0, w: box.w || 1, h: box.h || 1 }; const sx = box.w / (ch.w || 1), sy = box.h / (ch.h || 1);
        walk(k.children, (b) => ({ ...b, x: box.x + (b.x - ch.x) * sx, y: box.y + (b.y - ch.y) * sy, w: b.w * sx, h: b.h * sy }), base.group || 'g' + s.id); continue;
      }
      if (k.type === 'picture') { const m = media[k.fill?.media]; if (m) out.push(done({ ...base, type: 'image', src: m, ...(k.fill.crop && k.fill.crop.some(Boolean) ? { crop: { l: k.fill.crop[0] * 100, t: k.fill.crop[1] * 100, r: k.fill.crop[2] * 100, b: k.fill.crop[3] * 100 } } : {}) })); else out.push(done({ ...base, type: 'engine', label: s.name })); continue; }
      if (k.type === 'table') {
        const rows = (k.rows || []).map((row) => (row.cells || []).map((c) => { const t = textOut(T, c.text, fonts); const f = fillOf(T, c.fill); return { text: (t?.paras || []).map((p) => p.runs.map((r) => r.t).join('')).join('\n'), ...(f && f !== 'none' ? { fill: f } : {}) }; }));
        out.push(done({ ...base, type: 'table', rows, header: !!k.firstRow, band: !!k.bandRow })); continue;
      }
      if (k.type === 'chart') {
        const map = { column: 'bar', stackedColumn: 'bar', percentColumn: 'bar', bar: 'hbar', stackedBar: 'hbar', percentBar: 'hbar', line: 'line', lineMarkers: 'line', stackedLine: 'line', area: 'area', stackedArea: 'area', pie: 'pie', doughnut: 'doughnut' };
        out.push(done({ ...base, type: 'chart', chart: { type: map[k.kind] || 'bar', engineKind: k.kind, title: k.title || '', labels: k.categories || [], series: (k.series || []).map((x) => ({ name: x.name, values: (x.values || []).map((v) => v ?? 0) })) } })); continue;
      }
      if (k.type === 'media') { out.push(done({ ...base, type: k.video ? 'engine' : 'audio', name: s.name, src: media[k.media] || undefined, label: s.name })); continue; }
      if (k.type === 'connector' || s.geom?.name === 'line') { const ln = s.line || {}; out.push(done({ ...base, type: 'line', line: { color: fillOf(T, ln.fill) || '#1f2937', w: ln.width || 1 } })); continue; }
      if (k.type !== 'shape') { out.push(done({ ...base, type: 'engine', label: s.name || k.type })); continue; } // opaque/ink/3D: drawn by the engine, kept verbatim
      const geom = s.geom?.kind === 'preset' ? s.geom.name : 'custom'; const fill = fillOf(T, s.fill); const ln = s.line ? { color: fillOf(T, s.line.fill), w: s.line.width ?? 1 } : null;
      const text = textOut(T, s.text, fonts); const isText = s.textBox || s.ph || (geom === 'rect' && (!fill || fill === 'none') && (!ln || !ln.color || ln.color === 'none'));
      const el = { ...base, type: isText ? 'text' : geom === 'custom' || !PRESET_SHAPES.has(geom) ? 'engine' : 'shape' };
      if (el.type === 'shape') el.shape = geom; if (fill && fill !== 'none' && el.type !== 'text') el.fill = fill; if (fill && fill !== 'none' && el.type === 'text') el.fill = fill;
      if (ln && ln.color && ln.color !== 'none' && ln.w > 0) el.line = { color: ln.color, w: ln.w };
      if (text) { el.text = text; el.tsig = sig(text); } if (el.type === 'engine') el.label = s.name;
      out.push(done(el));
    }
  };
  walk(slide.shapes);
  return out;
}
const r1 = (v) => Math.round((v || 0) * 10) / 10;
const TR = { fade: 'fade', push: 'push', wipe: 'wipe', split: 'split', cover: 'cover', zoom: 'zoom', none: 'none', cut: 'none', uncover: 'cover', reveal: 'fade', dissolve: 'fade', morph: 'fade' };

/** engine `{presentation, mediaData}` -> editor deck (+ the master copy to keep) */
export function toDeck(res, title = '') {
  const P = res.presentation; const media = {};
  for (const m of P.media || []) { const b = res.mediaData?.[String(m.id)]; if (b) media[m.id] = `data:${m.contentType || 'application/octet-stream'};base64,${b}`; }
  const W = P.slideSize?.width || 960, H = P.slideSize?.height || 540;
  const slides = P.slides.map((s) => ({
    dc: s.id, hidden: s.hidden || undefined, els: elementsOf(P, s, media),
    notes: (s.notes?.paragraphs || []).map((p) => (p.runs || []).map((r) => r.text || '').join('')).join('\n').trim(),
    transition: s.transition && s.transition.kind !== 'none' ? { type: TR[s.transition.kind] || 'fade', engineKind: s.transition.kind, dur: (s.transition.durationMs || 700) / 1000, ...(s.transition.advanceAfterMs ? { after: s.transition.advanceAfterMs / 1000 } : {}) } : undefined,
    bgImage: 'engine', // the editor shows the engine-rendered backdrop (master + layout + background)
  }));
  const T = themeOf(P, P.slides[0]); const accents = ['accent1', 'accent2', 'accent3', 'accent4', 'accent5', 'accent6'].map((a) => colorOf(T, { base: { kind: 'scheme', slot: a } })).filter(Boolean);
  const sections = (P.sections || []).map((sec) => ({ name: sec.name, start: Math.max(0, P.slides.findIndex((s) => s.id === sec.slides?.[0])) }));
  return { title: P.props?.title || title, w: W, h: H, engine: true, sections, theme: { name: T.th.name || 'Imported', font: T.fonts.minor?.latin, headFont: T.fonts.major?.latin, colors: { accent: accents } }, slides };
}

// ---------- editor -> DeckCraft (merge into the master copy) ----------
function runIn(r, base = {}) {
  const p = { ...base };
  if (r.b !== undefined) p.bold = !!r.b; if (r.i !== undefined) p.italic = !!r.i; if (r.u !== undefined) p.underline = r.u ? 'sng' : 'none'; if (r.s !== undefined) p.strike = r.s ? 'single' : 'none';
  if (r.size) p.size = r.size; if (r.font) { p.font = r.font; p.fontEa = r.font; p.fontCs = r.font; } if (r.color) p.fill = solid(r.color); if (r.hl) { const c = hexRgb(r.hl); if (c) p.highlight = { base: { kind: 'rgb', rgb: c } }; }
  if (r.sup) p.baseline = 30; if (r.sub) p.baseline = -25; if (r.caps) p.caps = 'all';
  if (r.link) p.link = { action: { kind: 'url', url: r.link }, tooltip: '' };
  if (r.t === '\n') return { text: '', kind: 'break', props: p };
  return { text: r.t || '', props: p };
}
const ALIGN_IN = { left: 'left', center: 'center', right: 'right', justify: 'justify' };
function textIn(t, orig) {
  // keep each paragraph's original props/def props, overwrite what the editor shows
  const op = orig?.paragraphs || [];
  const paragraphs = (t.paras || []).map((p, i) => {
    const o = op[i] || op[op.length - 1] || {}; const props = { ...(o.props || {}) };
    if (p.align) props.align = ALIGN_IN[p.align] || props.align;
    if (p.bullet === 'bullet') props.bullet = props.bullet?.kind === 'char' ? props.bullet : { kind: 'char', char: '•' };
    else if (p.bullet === 'number') props.bullet = props.bullet?.kind === 'autoNum' ? props.bullet : { kind: 'autoNum', scheme: 'arabicPeriod', startAt: 1 };
    else if (p.bullet === undefined && o.props?.bullet && orig) props.bullet = o.props.bullet; else if (p.bullet === null || p.bullet === 'none') props.bullet = { kind: 'none' };
    const baseRun = o.runs?.[0]?.props || {};
    const runs = (p.runs || []).filter((r) => r.t !== undefined).map((r, k) => runIn({ ...(t.size && !r.size && !(o.runs?.[k] || o.runs?.[0])?.props?.size ? { size: t.size } : {}), ...(t.color && !r.color ? { color: t.color } : {}), ...(t.font && !r.font ? { font: t.font } : {}), ...r }, (o.runs?.[k] || o.runs?.[0])?.props || baseRun));
    return { level: p.level || 0, props, runs, defProps: o.defProps || {}, endProps: o.endProps || (t.size ? { size: t.size } : {}) };
  });
  const body = { ...(orig?.body || {}) }; if (t.valign) body.anchor = t.valign;
  return { body, ...(orig?.listStyle ? { listStyle: orig.listStyle } : {}), paragraphs };
}
const CHART_IN = { bar: 'column', hbar: 'bar', line: 'lineMarkers', area: 'area', pie: 'pie', doughnut: 'doughnut' };

/** merge the edited editor deck into the master copy -> new `{presentation, mediaData}` */
export function fromDeck(deck, master) {
  const res = master ? JSON.parse(JSON.stringify(master)) : blank(deck);
  const P = res.presentation; const mediaData = res.mediaData || (res.mediaData = {});
  const alloc = () => (P.nextId = Math.max(P.nextId || 1000, 1000) + 1);
  const bySlide = new Map(); const index = (m, shapes, parent) => { for (const s of shapes || []) { m.set(s.id, { s, parent }); if (s.kind?.type === 'group') index(m, s.kind.children, s); } };
  for (const s of P.slides) { const m = new Map(); index(m, s.shapes, null); bySlide.set(s.id, m); }
  let byId = new Map();
  const mediaId = (src) => { const m = /^data:([^;,]+)[^,]*,(.*)$/s.exec(src || ''); if (!m) return null; const b64 = m[2]; for (const [id, v] of Object.entries(mediaData)) if (v === b64) return +id; const id = alloc(); const ext = (m[1].split('/')[1] || 'bin').replace('jpeg', 'jpg').replace('svg+xml', 'svg').replace('x-m4a', 'm4a').replace('mp4', 'm4a'); P.media.push({ id, name: `media${id}.${ext}`, contentType: m[1], link: null }); mediaData[String(id)] = b64; return id; };
  const oldSlides = new Map(P.slides.map((s) => [s.id, s]));
  const defaultLayout = P.masters?.[0]?.layouts?.find((l) => /blank|trống/i.test(l.name || ''))?.id ?? P.masters?.[0]?.layouts?.[0]?.id ?? 0;
  P.slides = deck.slides.map((ds) => {
    const old = ds.dc != null ? oldSlides.get(ds.dc) : null; const s = old ? { ...old } : { id: alloc(), layout: defaultLayout, name: '', shapes: [], background: null, hidden: false, showMasterShapes: true, transition: null, animations: [], notes: { body: {}, paragraphs: [] }, comments: [] };
    byId = (old && bySlide.get(old.id)) || (ds.from != null && bySlide.get(ds.from)) || new Map();
    s.hidden = !!ds.hidden;
    if (ds.bg && ds.bg.color && ds.bgImage !== 'engine') s.background = { kind: 'fill', fill: solid(ds.bg.color) };
    const oldNotes = (old?.notes?.paragraphs || []).map((p) => (p.runs || []).map((r) => r.text || '').join('')).join('\n').trim();
    if (!old || oldNotes !== String(ds.notes || '').trim()) s.notes = { ...(s.notes || { body: {} }), paragraphs: String(ds.notes || '').split('\n').map((l) => ({ level: 0, runs: l ? [{ text: l }] : [] })) };
    const tr = ds.transition; s.transition = tr && tr.type !== 'none' ? { ...(s.transition || {}), kind: tr.engineKind && TR[tr.engineKind] === tr.type ? tr.engineKind : tr.type, option: s.transition?.option || '', durationMs: Math.round((tr.dur || 0.7) * 1000), advanceOnClick: true, advanceAfterMs: tr.after ? Math.round(tr.after * 1000) : null } : null;
    // shapes: keep editor order; untouched originals not shown as elements (hidden ones) are kept
    const kept = new Set(); const shapes = [];
    const hiddenOrig = (old?.shapes || []).filter((x) => x.hidden);
    const groups = new Map();
    for (const e of ds.els || []) {
      const hit = e.dc != null ? byId.get(e.dc) : null; let s0 = hit ? JSON.parse(JSON.stringify(hit.s)) : null;
      if (hit?.parent) { // child of a group in the original: keep the group, update the child in place
        const gid = hit.parent.id; if (!groups.has(gid)) { const g = JSON.parse(JSON.stringify(hit.parent)); g.kind.children = []; groups.set(gid, g); shapes.push(g); }
        const g = groups.get(gid); const ch = g.kind.child || { x: 0, y: 0, w: 1, h: 1 }; const gb = g.xfrm || { x: 0, y: 0, w: 1, h: 1 }; const sx = gb.w / (ch.w || 1), sy = gb.h / (ch.h || 1);
        const local = { ...e, x: ch.x + (e.x - gb.x) / (sx || 1), y: ch.y + (e.y - gb.y) / (sy || 1), w: e.w / (sx || 1), h: e.h / (sy || 1) };
        g.kind.children.push(apply(s0, local)); kept.add(e.dc); continue;
      }
      shapes.push(apply(s0, e)); if (e.dc != null) kept.add(e.dc);
    }
    s.shapes = [...hiddenOrig, ...shapes];
    s.animations = (s.animations || []).filter((a) => shapes.some((x) => x.id === a.shape) || hiddenOrig.some((x) => x.id === a.shape));
    for (const e of ds.els || []) if (e.anim && e.anim.type !== 'none') { const sid = e.dc ?? e._newId; if (sid == null || s.animations.some((a) => a.shape === sid)) continue; const fx = { appear: ['entrance', 'appear'], fade: ['entrance', 'fade'], fly: ['entrance', 'fly'], zoom: ['entrance', 'zoom'], wipe: ['entrance', 'wipe'], float: ['entrance', 'float'], pulse: ['emphasis', 'pulse'], spin: ['emphasis', 'spin'], fadeOut: ['exit', 'fade'] }[e.anim.type] || ['entrance', 'fade']; s.animations.push({ shape: sid, class: fx[0], effect: fx[1], option: '', start: { click: 'onClick', with: 'withPrevious', after: 'afterPrevious' }[e.anim.start || 'click'], durationMs: Math.round((e.anim.dur || 0.5) * 1000), delayMs: 0, repeat: 1, rewind: false, textBuild: e.anim.byPara ? 'byParagraph' : 'asOne' }); }
    return s;
  });
  // sections
  if (deck.sections) P.sections = deck.sections.map((sec, i) => { const end = deck.sections[i + 1]?.start ?? P.slides.length; return { ...(P.sections?.find((x) => x.name === sec.name) || {}), name: sec.name, slides: P.slides.slice(sec.start, end).map((s) => s.id) }; });
  if (deck.title) P.props = { ...(P.props || {}), title: deck.title };
  return res;

  function apply(s0, e) {
    if (s0 && e.osig && !e.dirty && e.osig === JSON.stringify([e.x, e.y, e.w, e.h, e.rot || 0, e.flipH || 0, e.flipV || 0, e.fill || null, e.line || null, e.shape || null, e.locked || 0, e.alt || '']) && (!e.text || e.tsig === sig(e.text)) && e.dsig === dsig(e)) return s0;
    const isNew = !s0; const s = s0 || { id: alloc(), name: e.name || `${e.type} ${P.nextId}`, xfrm: null, kind: { type: 'shape' }, geom: { kind: 'preset', name: 'rect' }, ph: null, fill: null, line: null, effects: null, style: null, text: null, hidden: false, locked: false, textBox: false, descr: '', title: '', decorative: false, click: null, hover: null };
    if (isNew) e._newId = s.id;
    s.xfrm = { ...(s.xfrm || {}), x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot || 0, flipH: !!e.flipH, flipV: !!e.flipV };
    if (e.alt !== undefined) s.descr = e.alt || ''; s.locked = !!e.locked;
    if (e.type === 'engine') return s; // drawn by the engine; only moved/resized
    if (e.type === 'image' && s0 && e.isig && JSON.stringify([e.x, e.y, e.w, e.h, e.rot || 0, e.flipH || 0, e.flipV || 0]) === JSON.stringify([s0.xfrm?.x, s0.xfrm?.y, s0.xfrm?.w, s0.xfrm?.h, s0.xfrm?.rot || 0, s0.xfrm?.flipH ? 1 : 0, s0.xfrm?.flipV ? 1 : 0].map((v, i) => (i < 4 ? r1(v) : v))) && !e.crop && !e.gray && !e.bright && !e.contrast && !e.round && !e.line) return s0;
    if (e.type === 'image') { const id = mediaId(e.src); if (id != null) { const fill = s.kind?.type === 'picture' ? s.kind.fill : { mode: { kind: 'stretch', fill_rect: [0, 0, 0, 0] }, adjust: { brightness: 0, contrast: 0, grayscale: false, sharpen: 0 }, crop: [0, 0, 0, 0], alpha: null }; fill.media = id; if (e.crop) fill.crop = [e.crop.l / 100, e.crop.t / 100, e.crop.r / 100, e.crop.b / 100]; if (fill.adjust) { fill.adjust.grayscale = !!e.gray; fill.adjust.brightness = (e.bright || 0) / 100; fill.adjust.contrast = (e.contrast || 0) / 100; } s.kind = { type: 'picture', fill }; } if (e.round) s.geom = { kind: 'preset', name: 'ellipse' }; if (e.line?.color) s.line = { ...(s.line || {}), fill: solid(e.line.color), width: e.line.w || 1 }; return s; }
    if (e.type === 'audio') { const id = mediaId(e.src); if (id != null) s.kind = { ...(s.kind?.type === 'media' ? s.kind : { type: 'media', video: false, poster: null, autoplay: true, volume: 0.8, crop: [0, 0, 0, 0], bookmarks: [], durationMs: 0, fadeInMs: 0, fadeOutMs: 0, fullScreen: false, height: 0, width: 0, hideWhileNotPlaying: false, loopPlay: false, playAcrossSlides: false, rewind: false, trimEndMs: 0, trimStartMs: 0 }), media: id, autoplay: e.autoplay !== false }; s.name = e.name || s.name || 'Audio'; s.click = { action: { kind: 'playMedia' }, highlightClick: false, tooltip: '' }; return s; }
    if (e.type === 'table') {
      const t = s.kind?.type === 'table' ? s.kind : { type: 'table', cols: [], rows: [], style: '{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}', firstRow: true, bandRow: true, firstCol: false, lastCol: false, lastRow: false, bandCol: false };
      const rows = e.rows || [[{ text: '' }]]; const nc = Math.max(...rows.map((r) => r.length)); const cw = e.w / nc, rh = e.h / rows.length;
      if (t.cols.length !== nc) t.cols = Array.from({ length: nc }, (_, i) => t.cols[i] || cw); else { const sum = t.cols.reduce((a, b) => a + b, 0) || 1; t.cols = t.cols.map((c) => (c * e.w) / sum); }
      t.rows = rows.map((r, ri) => { const orow = t.rows[ri]; return { ...(orow || {}), height: orow?.height || rh, cells: Array.from({ length: nc }, (_, ci) => { const oc = orow?.cells?.[ci]; const c = r[ci] || { text: '' }; const cell = oc ? { ...oc } : { gridSpan: 1, rowSpan: 1, hMerge: false, vMerge: false, borders: [null, null, null, null] }; const otext = oc?.text; const otxt = otext ? (otext.paragraphs || []).map((p) => (p.runs || []).map((x) => x.text).join('')).join('\n') : null; if (otxt !== c.text) cell.text = textIn({ paras: String(c.text || '').split('\n').map((l) => ({ runs: [{ t: l, ...(c.b ? { b: 1 } : {}), ...(c.color ? { color: c.color } : {}) }] })) }, otext); if (c.fill) cell.fill = solid(c.fill); return cell; }) }; });
      t.firstRow = e.header !== false; t.bandRow = e.band !== false; s.kind = t; return s;
    }
    if (e.type === 'chart') {
      const ch = e.chart; const old = s.kind?.type === 'chart' ? s.kind : { type: 'chart', legend: 'b', gridlines: true, dataLabels: false, style: 2, palette: '', holeSize: 0.5, gapWidth: 1.5, overlap: 0, axisTitles: [null, null] };
      const keepKind = ch.engineKind && CHART_IN[ch.type] && (old.kind === ch.engineKind) ? ch.engineKind : CHART_IN[ch.type] || 'column';
      const series = ch.series.map((x, i) => ({ ...(old.series?.[i] || {}), name: x.name, values: x.values.map((v) => (v === '' || v == null ? null : +v)) }));
      s.kind = { ...old, type: 'chart', kind: keepKind, title: ch.title || null, categories: ch.labels, series, kept: old.kind === keepKind && sameData(old, ch) ? old.kept : { rels: [], parts: [] } };
      return s;
    }
    if (e.type === 'line') { s.kind = s.kind?.type === 'connector' ? s.kind : { type: 'connector', start: null, end: null }; s.geom = { kind: 'preset', name: 'line' }; s.line = { ...(s.line || {}), fill: solid(e.line?.color || '#1f2937'), width: e.line?.w || 1, ...(e.line?.arrow ? { tail: { kind: 'triangle' } } : {}), ...(e.line?.dash ? { dash: { kind: 'preset', name: e.line.dash } } : {}) }; return s; }
    // text / shape
    if (e.type === 'shape') { const want = e.shape || 'rect'; if (s.geom?.kind !== 'preset' || s.geom.name !== want) s.geom = { kind: 'preset', name: want }; }
    if (e.type === 'text' && isNew) s.textBox = true;
    if (e.fill !== undefined) s.fill = e.fill && e.fill !== 'none' ? solid(e.fill) : (e.type === 'shape' ? s.fill : (s0 ? s.fill : { kind: 'none' }));
    if (e.grad && e.grad.length > 1) s.fill = { kind: 'gradient', stops: e.grad.map((c, i) => ({ pos: i / (e.grad.length - 1), color: { base: { kind: 'rgb', rgb: hexRgb(c) } } })), shape: { kind: 'linear', angle: e.gradDir === 'v' ? 90 : 0, scaled: false }, rotateWithShape: true };
    if (e.line?.color) s.line = { ...(s.line || {}), fill: solid(e.line.color), width: e.line.w || 1 }; else if (e.line === null && isNew) s.line = { fill: { kind: 'none' } };
    if (e.text && (!s0 || !s.text || e.tsig !== sig(e.text))) s.text = textIn(e.text, s.text);
    if (e.opacity != null && s.fill?.kind === 'solid') s.fill.color.mods = [{ kind: 'alpha', v: e.opacity }];
    return s;
  }
}
function dsig(e) { return JSON.stringify([e.type, e.src ? e.src.length + ':' + e.src.slice(-40) : '', e.rows || null, e.chart || null, e.crop || null, e.gray || 0, e.bright || 0, e.contrast || 0, e.round || 0, e.header ?? null, e.band ?? null, e.anim || null]); }
export function sig(t) { return JSON.stringify([t.valign || null, (t.paras || []).map((p) => [p.align || null, p.bullet || null, p.level || 0, (p.runs || []).map((r) => [r.t, r.b || 0, r.i || 0, r.u || 0, r.s || 0, r.size || 0, r.font || '', r.color || '', r.hl || '', r.sup || 0, r.sub || 0, r.caps || 0, r.link || ''])])]); }
function plain(t) { return (t.paras || []).map((p) => (p.runs || []).map((r) => r.t).join('')); }
function styleChanged(t) { return (t.paras || []).some((p) => p._dirty || (p.runs || []).some((r) => r._dirty)) || t._dirty; }
function sameData(old, ch) { return JSON.stringify(old.categories) === JSON.stringify(ch.labels) && JSON.stringify((old.series || []).map((s) => [s.name, (s.values || []).map((v) => v ?? 0)])) === JSON.stringify(ch.series.map((s) => [s.name, s.values.map((v) => +v || 0)])) && (old.title || '') === (ch.title || ''); }
function blank(deck) { return { presentation: { slideSize: { width: deck.w || 960, height: deck.h || 540 }, slides: [], masters: [], media: [], sections: [], nextId: 1000 }, mediaData: {} }; }
