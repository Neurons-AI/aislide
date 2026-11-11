/* AI Slide — deck model helpers, themes, layouts, shape geometry and the slide renderer. */
(function () {
  const S = (window.Slide = window.Slide || {});
  let n = 0; S.uid = (p = 'e') => p + Date.now().toString(36) + (n++).toString(36);
  S.esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  S.clone = (o) => JSON.parse(JSON.stringify(o));

  // ---------- themes (colour + font schemes, like DeckCraft's eight originals) ----------
  S.THEMES = [
    { id: 'office', name: 'Office', bg: '#ffffff', fg: '#1f2937', title: '#111827', accents: ['#f26b1d', '#2f6fd6', '#8e5bd8', '#2e9d6a', '#e0a100', '#d6455d'], font: 'Inter', head: 'Inter' },
    { id: 'aurora', name: 'Aurora', bg: '#0f172a', fg: '#dbe4f3', title: '#ffffff', accents: ['#22d3ee', '#a78bfa', '#34d399', '#f472b6', '#facc15', '#60a5fa'], font: 'Inter', head: 'Inter', grad: ['#0f172a', '#1e293b'] },
    { id: 'ember', name: 'Ember', bg: '#fff7ed', fg: '#3b2414', title: '#9a3412', accents: ['#ea580c', '#b45309', '#dc2626', '#65a30d', '#0e7490', '#7c3aed'], font: 'Georgia', head: 'Georgia' },
    { id: 'slate', name: 'Slate', bg: '#f1f5f9', fg: '#1e293b', title: '#0f172a', accents: ['#334155', '#0284c7', '#0d9488', '#e11d48', '#ca8a04', '#7c3aed'], font: 'Segoe UI', head: 'Segoe UI' },
    { id: 'forest', name: 'Forest', bg: '#f3f7f2', fg: '#1d3124', title: '#14532d', accents: ['#15803d', '#a16207', '#0f766e', '#b91c1c', '#4d7c0f', '#1d4ed8'], font: 'Calibri', head: 'Cambria' },
    { id: 'mono', name: 'Monochrome', bg: '#ffffff', fg: '#262626', title: '#000000', accents: ['#000000', '#525252', '#a3a3a3', '#e8591a', '#404040', '#737373'], font: 'Helvetica', head: 'Helvetica' },
    { id: 'berry', name: 'Berry', bg: '#fdf2f8', fg: '#3f1d38', title: '#831843', accents: ['#db2777', '#9333ea', '#f59e0b', '#0891b2', '#16a34a', '#e11d48'], font: 'Trebuchet MS', head: 'Trebuchet MS' },
    { id: 'night', name: 'Midnight', bg: '#111111', fg: '#e5e5e5', title: '#ffffff', accents: ['#f26b1d', '#38bdf8', '#a3e635', '#f472b6', '#fbbf24', '#818cf8'], font: 'Inter', head: 'Inter' },
  ];
  S.theme = (deck) => S.THEMES.find((t) => t.id === deck.themeId) || Object.assign({}, S.THEMES[0], deck.theme?.colors ? { accents: [1, 2, 3, 4, 5, 6].map((i) => '#' + (deck.theme.colors['accent' + i] || '2f6fd6')).map((c) => c.replace('##', '#')) } : {});

  // ---------- layouts (eleven like PowerPoint) ----------
  const T = (o) => Object.assign({ id: S.uid(), type: 'text' }, o);
  S.LAYOUTS = {
    'Title Slide': (W, H) => [T({ ph: 'title', x: W * .1, y: H * .3, w: W * .8, h: H * .22, text: { size: 48, valign: 'bottom', paras: [{ align: 'center', runs: [] }] } }), T({ ph: 'subtitle', x: W * .15, y: H * .55, w: W * .7, h: H * .14, text: { size: 22, valign: 'top', paras: [{ align: 'center', runs: [] }] } })],
    'Title and Content': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .06, w: W * .88, h: H * .17, text: { size: 40, valign: 'middle', paras: [{ runs: [] }] } }), T({ ph: 'body', x: W * .06, y: H * .27, w: W * .88, h: H * .64, text: { size: 24, valign: 'top', paras: [{ bullet: 'bullet', runs: [] }] } })],
    'Section Header': (W, H) => [T({ ph: 'title', x: W * .07, y: H * .3, w: W * .86, h: H * .25, text: { size: 48, valign: 'bottom', paras: [{ runs: [] }] } }), T({ ph: 'subtitle', x: W * .07, y: H * .57, w: W * .86, h: H * .12, text: { size: 20, valign: 'top', paras: [{ runs: [] }] } })],
    'Two Content': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .06, w: W * .88, h: H * .17, text: { size: 40, valign: 'middle', paras: [{ runs: [] }] } }), T({ ph: 'body', x: W * .06, y: H * .27, w: W * .43, h: H * .64, text: { size: 22, valign: 'top', paras: [{ bullet: 'bullet', runs: [] }] } }), T({ ph: 'body', x: W * .51, y: H * .27, w: W * .43, h: H * .64, text: { size: 22, valign: 'top', paras: [{ bullet: 'bullet', runs: [] }] } })],
    'Comparison': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .05, w: W * .88, h: H * .15, text: { size: 36, valign: 'middle', paras: [{ runs: [] }] } }), T({ ph: 'subtitle', x: W * .06, y: H * .22, w: W * .43, h: H * .09, text: { size: 22, valign: 'bottom', paras: [{ runs: [{ t: '', b: 1 }] }] } }), T({ ph: 'body', x: W * .06, y: H * .32, w: W * .43, h: H * .6, text: { size: 20, valign: 'top', paras: [{ bullet: 'bullet', runs: [] }] } }), T({ ph: 'subtitle', x: W * .51, y: H * .22, w: W * .43, h: H * .09, text: { size: 22, valign: 'bottom', paras: [{ runs: [{ t: '', b: 1 }] }] } }), T({ ph: 'body', x: W * .51, y: H * .32, w: W * .43, h: H * .6, text: { size: 20, valign: 'top', paras: [{ bullet: 'bullet', runs: [] }] } })],
    'Title Only': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .06, w: W * .88, h: H * .17, text: { size: 40, valign: 'middle', paras: [{ runs: [] }] } })],
    'Blank': () => [],
    'Content with Caption': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .08, w: W * .32, h: H * .2, text: { size: 28, valign: 'bottom', paras: [{ runs: [] }] } }), T({ ph: 'body', x: W * .42, y: H * .08, w: W * .52, h: H * .82, text: { size: 22, valign: 'top', paras: [{ bullet: 'bullet', runs: [] }] } }), T({ ph: 'subtitle', x: W * .06, y: H * .3, w: W * .32, h: H * .58, text: { size: 16, valign: 'top', paras: [{ runs: [] }] } })],
    'Picture with Caption': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .08, w: W * .32, h: H * .2, text: { size: 28, valign: 'bottom', paras: [{ runs: [] }] } }), T({ ph: 'picture', x: W * .42, y: H * .08, w: W * .52, h: H * .82, text: { size: 18, valign: 'middle', paras: [{ align: 'center', runs: [] }] } }), T({ ph: 'subtitle', x: W * .06, y: H * .3, w: W * .32, h: H * .58, text: { size: 16, valign: 'top', paras: [{ runs: [] }] } })],
    'Title and Vertical Text': (W, H) => [T({ ph: 'title', x: W * .06, y: H * .06, w: W * .88, h: H * .17, text: { size: 40, valign: 'middle', paras: [{ runs: [] }] } }), T({ ph: 'body', x: W * .06, y: H * .27, w: W * .88, h: H * .64, text: { size: 24, valign: 'top', vertical: 1, paras: [{ bullet: 'bullet', runs: [] }] } })],
    'Quote': (W, H) => [T({ ph: 'title', x: W * .12, y: H * .22, w: W * .76, h: H * .4, text: { size: 34, valign: 'middle', paras: [{ align: 'center', runs: [{ t: '', i: 1 }] }] } }), T({ ph: 'subtitle', x: W * .12, y: H * .66, w: W * .76, h: H * .1, text: { size: 18, valign: 'top', paras: [{ align: 'center', runs: [] }] } })],
  };
  S.PH_HINT = { title: 'Bấm để thêm tiêu đề', subtitle: 'Bấm để thêm phụ đề', body: 'Bấm để thêm văn bản', picture: 'Bấm biểu tượng để thêm ảnh' };
  S.newSlide = (deck, layout = 'Title and Content') => ({ id: S.uid('s'), layout, bg: null, notes: '', els: (S.LAYOUTS[layout] || S.LAYOUTS.Blank)(deck.w, deck.h) });
  S.newDeck = (title = 'Bản trình chiếu 1') => { const d = { title, w: 960, h: 540, themeId: 'office', slides: [], sections: [] }; d.slides.push(S.newSlide(d, 'Title Slide')); return d; };

  // ---------- shape geometry: SVG path in a w×h box ----------
  S.SHAPE_LIST = [['rect', 'Hình chữ nhật'], ['roundRect', 'Chữ nhật bo góc'], ['ellipse', 'Hình elip'], ['triangle', 'Tam giác'], ['rtTriangle', 'Tam giác vuông'], ['diamond', 'Hình thoi'], ['parallelogram', 'Hình bình hành'], ['trapezoid', 'Hình thang'], ['pentagon', 'Ngũ giác'], ['hexagon', 'Lục giác'], ['octagon', 'Bát giác'], ['plus', 'Dấu cộng'], ['donut', 'Vành khuyên'], ['can', 'Hình trụ'], ['cube', 'Khối lập phương'], ['heart', 'Trái tim'], ['star5', 'Sao 5 cánh'], ['star6', 'Sao 6 cánh'], ['cloud', 'Đám mây'], ['rightArrow', 'Mũi tên phải'], ['leftArrow', 'Mũi tên trái'], ['upArrow', 'Mũi tên lên'], ['downArrow', 'Mũi tên xuống'], ['leftRightArrow', 'Mũi tên hai chiều'], ['chevron', 'Chevron'], ['homePlate', 'Mũi tên khối'], ['wedgeRectCallout', 'Chú thích'], ['wedgeRoundRectCallout', 'Chú thích bo góc'], ['flowChartProcess', 'Lưu đồ: Xử lý'], ['flowChartDecision', 'Lưu đồ: Quyết định'], ['flowChartTerminator', 'Lưu đồ: Kết thúc'], ['line', 'Đường thẳng']];
  const poly = (pts) => 'M' + pts.map((p) => p.join(',')).join('L') + 'Z';
  const star = (w, h, k, inner) => { const pts = []; for (let i = 0; i < k * 2; i++) { const a = -Math.PI / 2 + i * Math.PI / k, r = i % 2 ? inner : 1; pts.push([w / 2 + Math.cos(a) * r * w / 2, h / 2 + Math.sin(a) * r * h / 2]); } return poly(pts); };
  const ngon = (w, h, k, off = -Math.PI / 2) => { const pts = []; for (let i = 0; i < k; i++) { const a = off + i * 2 * Math.PI / k; pts.push([w / 2 + Math.cos(a) * w / 2, h / 2 + Math.sin(a) * h / 2]); } return poly(pts); };
  S.geom = (shape, w, h) => {
    const m = Math.min(w, h);
    switch (shape) {
      case 'roundRect': { const r = m * .16; return `M${r},0H${w - r}Q${w},0 ${w},${r}V${h - r}Q${w},${h} ${w - r},${h}H${r}Q0,${h} 0,${h - r}V${r}Q0,0 ${r},0Z`; }
      case 'ellipse': return `M0,${h / 2}A${w / 2},${h / 2} 0 1 0 ${w},${h / 2}A${w / 2},${h / 2} 0 1 0 0,${h / 2}Z`;
      case 'triangle': return poly([[w / 2, 0], [w, h], [0, h]]);
      case 'rtTriangle': return poly([[0, 0], [w, h], [0, h]]);
      case 'diamond': case 'flowChartDecision': return poly([[w / 2, 0], [w, h / 2], [w / 2, h], [0, h / 2]]);
      case 'parallelogram': return poly([[w * .25, 0], [w, 0], [w * .75, h], [0, h]]);
      case 'trapezoid': return poly([[w * .2, 0], [w * .8, 0], [w, h], [0, h]]);
      case 'pentagon': return ngon(w, h, 5);
      case 'hexagon': return poly([[w * .25, 0], [w * .75, 0], [w, h / 2], [w * .75, h], [w * .25, h], [0, h / 2]]);
      case 'octagon': { const a = w * .29, b = h * .29; return poly([[a, 0], [w - a, 0], [w, b], [w, h - b], [w - a, h], [a, h], [0, h - b], [0, b]]); }
      case 'plus': { const a = w * .3, b = h * .3; return poly([[a, 0], [w - a, 0], [w - a, b], [w, b], [w, h - b], [w - a, h - b], [w - a, h], [a, h], [a, h - b], [0, h - b], [0, b], [a, b]]); }
      case 'donut': { const i = .55; return `M0,${h / 2}A${w / 2},${h / 2} 0 1 0 ${w},${h / 2}A${w / 2},${h / 2} 0 1 0 0,${h / 2}ZM${w / 2 - w / 2 * i},${h / 2}A${w / 2 * i},${h / 2 * i} 0 1 1 ${w / 2 + w / 2 * i},${h / 2}A${w / 2 * i},${h / 2 * i} 0 1 1 ${w / 2 - w / 2 * i},${h / 2}Z`; }
      case 'can': { const e = h * .12; return `M0,${e}A${w / 2},${e} 0 0 1 ${w},${e}V${h - e}A${w / 2},${e} 0 0 1 0,${h - e}ZM0,${e}A${w / 2},${e} 0 0 0 ${w},${e}`; }
      case 'cube': { const d = m * .22; return `M0,${d}L${d},0H${w}V${h - d}L${w - d},${h}H0ZM0,${d}H${w - d}V${h}M${w - d},${d}L${w},0`; }
      case 'heart': return `M${w / 2},${h * .3}C${w / 2},${h * .05} ${w * .05},0 ${w * .05},${h * .32}C${w * .05},${h * .6} ${w / 2},${h * .78} ${w / 2},${h}C${w / 2},${h * .78} ${w * .95},${h * .6} ${w * .95},${h * .32}C${w * .95},0 ${w / 2},${h * .05} ${w / 2},${h * .3}Z`;
      case 'star5': return star(w, h, 5, .42);
      case 'star6': return star(w, h, 6, .55);
      case 'cloud': return `M${w * .25},${h * .85}C${w * .02},${h * .85} 0,${h * .5} ${w * .2},${h * .45}C${w * .15},${h * .15} ${w * .45},${h * .05} ${w * .55},${h * .25}C${w * .65},${h * .02} ${w * .95},${h * .1} ${w * .85},${h * .4}C${w * 1.02},${h * .5} ${w},${h * .85} ${w * .78},${h * .85}Z`;
      case 'rightArrow': return poly([[0, h * .25], [w * .62, h * .25], [w * .62, 0], [w, h / 2], [w * .62, h], [w * .62, h * .75], [0, h * .75]]);
      case 'leftArrow': return poly([[w, h * .25], [w * .38, h * .25], [w * .38, 0], [0, h / 2], [w * .38, h], [w * .38, h * .75], [w, h * .75]]);
      case 'upArrow': return poly([[w * .25, h], [w * .25, h * .38], [0, h * .38], [w / 2, 0], [w, h * .38], [w * .75, h * .38], [w * .75, h]]);
      case 'downArrow': return poly([[w * .25, 0], [w * .25, h * .62], [0, h * .62], [w / 2, h], [w, h * .62], [w * .75, h * .62], [w * .75, 0]]);
      case 'leftRightArrow': return poly([[0, h / 2], [w * .22, 0], [w * .22, h * .25], [w * .78, h * .25], [w * .78, 0], [w, h / 2], [w * .78, h], [w * .78, h * .75], [w * .22, h * .75], [w * .22, h]]);
      case 'chevron': return poly([[0, 0], [w * .75, 0], [w, h / 2], [w * .75, h], [0, h], [w * .25, h / 2]]);
      case 'homePlate': return poly([[0, 0], [w * .8, 0], [w, h / 2], [w * .8, h], [0, h]]);
      case 'wedgeRectCallout': return poly([[0, 0], [w, 0], [w, h * .75], [w * .42, h * .75], [w * .2, h], [w * .25, h * .75], [0, h * .75]]);
      case 'wedgeRoundRectCallout': { const r = m * .12, b = h * .75; return `M${r},0H${w - r}Q${w},0 ${w},${r}V${b - r}Q${w},${b} ${w - r},${b}H${w * .42}L${w * .2},${h}L${w * .25},${b}H${r}Q0,${b} 0,${b - r}V${r}Q0,0 ${r},0Z`; }
      case 'flowChartTerminator': { const r = h / 2; return `M${r},0H${w - r}A${r},${r} 0 0 1 ${w - r},${h}H${r}A${r},${r} 0 0 1 ${r},0Z`; }
      default: return `M0,0H${w}V${h}H0Z`;
    }
  };

  // ---------- rendering ----------
  const valignCss = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
  S.runCss = (r, t, base) => {
    const c = []; const size = r.size || t.size || base.size || 18;
    c.push(`font-size:${size}pt`); if (r.b) c.push('font-weight:700'); if (r.i) c.push('font-style:italic');
    const deco = [r.u && 'underline', r.s && 'line-through'].filter(Boolean).join(' '); if (deco) c.push(`text-decoration:${deco}`);
    if (r.color || t.color || base.color) c.push(`color:${r.color || t.color || base.color}`);
    if (r.font || t.font) c.push(`font-family:'${r.font || t.font}'`);
    if (r.hl) c.push(`background:${r.hl}`); if (r.sup) c.push('vertical-align:super;font-size:' + size * .65 + 'pt'); if (r.sub) c.push('vertical-align:sub;font-size:' + size * .65 + 'pt');
    if (r.caps) c.push('text-transform:uppercase');
    return c.join(';');
  };
  S.textHtml = (el, deck, opts = {}) => {
    const t = el.text || { paras: [{ runs: [] }] }; const th = S.theme(deck);
    const base = { color: el.type === 'shape' ? '#ffffff' : (el.ph === 'title' ? th.title : th.fg), size: t.size || 18 };
    if (el.type === 'shape' && el.fill && /^#(f|e)[0-9a-f]{5}$/i.test(el.fill)) base.color = '#1f2937';
    const counters = [];
    const empty = !(t.paras || []).some((p) => (p.runs || []).some((r) => r.t));
    if (empty && el.ph && opts.hints) return `<p class="ph-hint" style="font-size:${base.size}pt;text-align:${t.paras?.[0]?.align || 'left'}">${S.esc(S.PH_HINT[el.ph] || S.PH_HINT.body)}</p>`;
    return (t.paras || []).map((p) => {
      const lvl = p.level || 0; let pre = '';
      if (p.bullet === 'bullet') pre = lvl % 2 ? '– ' : '• ';
      else if (p.bullet === 'number') { counters[lvl] = (counters[lvl] || 0) + 1; counters.length = lvl + 1; pre = counters[lvl] + '. '; } else counters.length = 0;
      const ind = (p.bullet && p.bullet !== 'none') ? `padding-left:${27 + lvl * 36}pt;text-indent:-18pt` : lvl ? `padding-left:${lvl * 36}pt` : '';
      const first = p.runs?.[0] || {};
      const body = (p.runs || []).map((r) => { const inner = S.esc(r.t); const span = `<span style="${S.runCss(r, t, base)}">${inner}</span>`; return r.link ? `<a href="${S.esc(r.link)}" style="color:inherit">${span}</a>` : span; }).join('') || '<br>';
      return `<p data-b="${p.bullet || ''}" data-l="${lvl}" data-a="${p.align || ''}" style="text-align:${p.align || 'left'};${ind};font-size:${first.size || base.size}pt;line-height:${p.spacing || t.spacing || 1.15};margin-bottom:${p.after ?? (el.ph === 'body' ? 6 : 0)}pt;color:${first.color || t.color || base.color}">${pre ? `<span data-bu contenteditable="false" style="${S.runCss(first, t, base)};font-weight:400;font-style:normal;text-decoration:none">${pre}</span>` : ''}${body}</p>`;
    }).join('');
  };
  function fillOf(el) {
    if (el.grad && el.grad.length > 1) return { grad: el.grad };
    return { solid: el.fill && el.fill !== 'none' ? el.fill : 'none' };
  }
  S.elHtml = (el, deck, opts = {}) => {
    const th = S.theme(deck);
    const tf = []; if (el.rot) tf.push(`rotate(${el.rot}deg)`); if (el.flipH) tf.push('scaleX(-1)'); if (el.flipV) tf.push('scaleY(-1)');
    const st = `left:${el.x}pt;top:${el.y}pt;width:${el.w}pt;height:${el.h}pt;${tf.length ? `transform:${tf.join(' ')};` : ''}${el.opacity != null ? `opacity:${el.opacity};` : ''}${el.shadow ? 'filter:drop-shadow(2pt 3pt 4pt rgba(0,0,0,.35));' : ''}`;
    let inner = '';
    const textBlock = () => { const t = el.text || {}; const inv = el.flipH || el.flipV ? `transform:${el.flipH ? 'scaleX(-1)' : ''} ${el.flipV ? 'scaleY(-1)' : ''};` : ''; return `<div class="tx" data-tx style="justify-content:${valignCss[t.valign] || (el.type === 'shape' ? 'center' : 'flex-start')};${t.vertical ? 'writing-mode:vertical-rl;' : ''}${t.columns > 1 ? `column-count:${t.columns};display:block;` : ''}${inv}">${S.textHtml(el, deck, opts)}</div>`; };
    if (el.type === 'engine') {
      // drawn by the DeckCraft engine into the backdrop; here only a hit box to select/move it
      inner = opts.hints ? `<div class="ds-engine" title="${S.esc(el.label || '')}" style="position:absolute;inset:0"></div>` : '';
      if (el.moved && el.png) inner = `<img src="${el.png}" style="position:absolute;inset:0;width:100%;height:100%">`;
    } else if (el.type === 'audio') {
      inner = `<div class="ds-audio" style="position:absolute;inset:0;display:grid;place-items:center" title="${S.esc(el.name || 'Audio')}"><svg viewBox="0 0 24 24" style="width:100%;height:100%"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#E8591A"/><path d="M16 8a5 5 0 010 8M18.5 5.5a8.5 8.5 0 010 13" fill="none" stroke="#E8591A" stroke-width="2" stroke-linecap="round"/></svg></div>`;
      if (opts.show) return '';
    } else if (el.type === 'image') {
      const crop = el.crop; const imgSt = crop ? `left:${-crop.l / (100 - crop.l - crop.r) * 100}%;top:${-crop.t / (100 - crop.t - crop.b) * 100}%;width:${10000 / (100 - crop.l - crop.r)}%;height:${10000 / (100 - crop.t - crop.b)}%` : '';
      const flt = [el.bright ? `brightness(${1 + el.bright / 100})` : '', el.contrast ? `contrast(${1 + el.contrast / 100})` : '', el.gray ? 'grayscale(1)' : ''].filter(Boolean).join(' ');
      inner = `<div style="position:absolute;inset:0;overflow:hidden;${el.round ? 'border-radius:50%;' : ''}${el.line?.color ? `outline:${el.line.w || 1}pt solid ${el.line.color};outline-offset:-${(el.line.w || 1) / 2}pt;` : ''}"><img src="${S.esc(el.src)}" alt="${S.esc(el.alt || '')}" draggable="false" style="${imgSt};${flt ? `filter:${flt}` : ''}"></div>`;
    } else if (el.type === 'shape' || el.type === 'line') {
      const w = el.w, h = el.h; const f = fillOf(el); const gid = 'g' + el.id;
      const line = el.line || (el.type === 'line' ? { color: th.fg, w: 2 } : null);
      const dash = line?.dash ? ({ dash: '8 5', sysDash: '4 3', dot: '1.5 3', sysDot: '1.5 3', lgDash: '14 6', dashDot: '8 4 2 4' }[line.dash] || '6 4') : '';
      if (el.type === 'line' || el.shape === 'line') {
        inner = `<svg class="geo" viewBox="0 0 ${w || 1} ${h || 1}" preserveAspectRatio="none"><defs><marker id="m${el.id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0L10,5L0,10z" fill="${line.color}"/></marker></defs><line x1="0" y1="${el.flipV ? h : 0}" x2="${w}" y2="${el.flipV ? 0 : h}" stroke="${line.color}" stroke-width="${line.w || 2}" ${dash ? `stroke-dasharray="${dash}"` : ''} vector-effect="non-scaling-stroke" ${line.arrow ? `marker-end="url(#m${el.id})"` : ''}/></svg>`;
      } else {
        const fill = f.grad ? `url(#${gid})` : f.solid;
        inner = `<svg class="geo" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${f.grad ? `<defs><linearGradient id="${gid}" x1="0" y1="0" x2="${el.gradDir === 'h' ? 1 : 0}" y2="${el.gradDir === 'h' ? 0 : 1}">${f.grad.map((c, i) => `<stop offset="${i / (f.grad.length - 1)}" stop-color="${c}"/>`).join('')}</linearGradient></defs>` : ''}<path d="${S.geom(el.shape, w, h)}" fill="${fill}" fill-rule="evenodd" ${line?.color ? `stroke="${line.color}" stroke-width="${line.w || 1}" ${dash ? `stroke-dasharray="${dash}"` : ''}` : ''}/></svg>` + textBlock();
      }
    } else if (el.type === 'table') {
      const acc = el.accent || th.accents[1]; const sz = el.size || 14;
      inner = `<table style="font-size:${sz}pt">${(el.rows || []).map((r, ri) => `<tr>${r.map((c, ci) => { const head = ri === 0 && el.header !== false; const bg = c.fill || (head ? acc : (el.band === false ? '#ffffff' : ri % 2 ? color(acc, .82) : color(acc, .92))); return `<td data-r="${ri}" data-c="${ci}" style="background:${bg};color:${c.color || (head ? '#fff' : '#1f2937')};${head || c.b ? 'font-weight:700;' : ''}text-align:${c.align || 'left'}">${S.esc(c.text)}</td>`; }).join('')}</tr>`).join('')}</table>`;
    } else if (el.type === 'chart') {
      inner = `<div style="position:absolute;inset:0">${S.chartSvg(el, deck)}</div>`;
    } else {
      const f = fillOf(el); const bg = f.grad ? `background:linear-gradient(${f.grad.join(',')});` : f.solid !== 'none' ? `background:${f.solid};` : '';
      inner = `<div style="position:absolute;inset:0;${bg}${el.line?.color ? `border:${el.line.w || 1}pt solid ${el.line.color};` : ''}"></div>` + textBlock();
    }
    return `<div class="el" data-id="${el.id}" style="${st}">${inner}</div>`;
  };
  function color(hex, mixWhite) { const c = hex.replace('#', ''); const v = [0, 2, 4].map((i) => parseInt(c.substr(i, 2), 16)); return '#' + v.map((x) => Math.round(x + (255 - x) * mixWhite).toString(16).padStart(2, '0')).join(''); }
  S.mix = color;
  S.bgCss = (slide, deck) => {
    const th = S.theme(deck); const bg = slide.bg || (th.grad ? { grad: th.grad } : { color: th.bg });
    if (bg.image) return `background:url("${bg.image}") center/cover;`;
    if (bg.grad) return `background:linear-gradient(${bg.dir || '160deg'},${bg.grad.join(',')});`;
    return `background:${bg.color || '#fff'};`;
  };
  S.slideHtml = (slide, deck, opts = {}) => `<div class="sl" style="width:${deck.w}pt;height:${deck.h}pt;${slide.backdrop ? `background:#fff url(${slide.backdrop}) 0 0/100% 100% no-repeat;` : S.bgCss(slide, deck)}font-family:'${S.theme(deck).font}',Inter,system-ui,sans-serif;transform:scale(${opts.scale || 1})">${(slide.els || []).map((e) => S.elHtml(e, deck, opts)).join('')}</div>`;
  // pt -> px: browsers use 96dpi, 1pt = 4/3 px. The canvas holds the slide at `scale` (px per pt).
  S.PX = 4 / 3;
  S.renderInto = (node, slide, deck, pxWidth, opts = {}) => {
    const scale = pxWidth / (deck.w * S.PX);
    node.style.width = pxWidth + 'px'; node.style.height = (deck.h * S.PX * scale) + 'px';
    node.innerHTML = S.slideHtml(slide, deck, { ...opts, scale });
    return scale;
  };

  // ---------- charts (SVG, theme colours) ----------
  S.chartSvg = (el, deck) => {
    const ch = el.chart || {}; const W = el.w, H = el.h; const th = S.theme(deck); const pal = th.accents; const fg = th.fg;
    const labels = ch.labels || []; const ser = ch.series || [];
    const top = ch.title ? 26 : 10, bottom = 38, left = 36, right = 10; const pw = W - left - right, ph = H - top - bottom;
    let s = `<svg viewBox="0 0 ${W} ${H}" width="100%" height="100%" style="font-family:inherit">`;
    if (ch.title) s += `<text x="${W / 2}" y="17" text-anchor="middle" font-size="13" fill="${fg}" font-weight="600">${S.esc(ch.title)}</text>`;
    if (ch.type === 'pie' || ch.type === 'doughnut') {
      const vals = ser[0]?.values || []; const tot = vals.reduce((a, b) => a + (+b || 0), 0) || 1; const cx = W / 2 - 50, cy = top + ph / 2 + 10, r = Math.min(pw - 100, ph + 20) / 2; let a0 = -Math.PI / 2;
      vals.forEach((v, i) => { const a1 = a0 + (v / tot) * Math.PI * 2; const big = a1 - a0 > Math.PI ? 1 : 0; s += `<path d="M${cx},${cy}L${cx + r * Math.cos(a0)},${cy + r * Math.sin(a0)}A${r},${r} 0 ${big} 1 ${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}Z" fill="${pal[i % 6]}" stroke="#fff" stroke-width="1"/>`; a0 = a1; });
      if (ch.type === 'doughnut') s += `<circle cx="${cx}" cy="${cy}" r="${r * .55}" fill="#fff"/>`;
      labels.forEach((l, i) => { s += `<rect x="${W - 110}" y="${top + 6 + i * 16}" width="9" height="9" fill="${pal[i % 6]}"/><text x="${W - 96}" y="${top + 14 + i * 16}" font-size="10" fill="${fg}">${S.esc(l)} (${Math.round((vals[i] || 0) / tot * 100)}%)</text>`; });
      return s + '</svg>';
    }
    const all = ser.flatMap((x) => x.values.map(Number)); const max = Math.max(1, ...all) * 1.1, min = Math.min(0, ...all);
    const yv = (v) => top + ph - ((v - min) / (max - min)) * ph;
    for (let i = 0; i <= 4; i++) { const v = min + (max - min) * i / 4; const y = yv(v); s += `<line x1="${left}" x2="${W - right}" y1="${y}" y2="${y}" stroke="${fg}" stroke-opacity=".12"/><text x="${left - 4}" y="${y + 3}" font-size="9" text-anchor="end" fill="${fg}" fill-opacity=".7">${Math.round(v * 10) / 10}</text>`; }
    const n = labels.length || 1; const gw = pw / n;
    if (ch.type === 'line' || ch.type === 'area') {
      ser.forEach((x, si) => { const pts = x.values.map((v, i) => [left + gw * i + gw / 2, yv(+v)]); if (ch.type === 'area') s += `<path d="M${pts[0]?.[0]},${yv(min)}L${pts.map((p) => p.join(',')).join('L')}L${pts[pts.length - 1]?.[0]},${yv(min)}Z" fill="${pal[si % 6]}" fill-opacity=".3"/>`; s += `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" stroke="${pal[si % 6]}" stroke-width="2.4"/>${pts.map((p) => `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${pal[si % 6]}"/>`).join('')}`; });
    } else if (ch.type === 'hbar') {
      const gh = ph / n; const bh = gh * .7 / ser.length; const xv = (v) => left + (v - min) / (max - min) * pw;
      ser.forEach((x, si) => x.values.forEach((v, i) => { s += `<rect x="${xv(0)}" y="${top + gh * i + gh * .15 + bh * si}" width="${Math.max(0, xv(+v) - xv(0))}" height="${bh}" fill="${pal[si % 6]}"/>`; }));
    } else {
      const bw = gw * .7 / Math.max(1, ser.length);
      ser.forEach((x, si) => x.values.forEach((v, i) => { const y = yv(Math.max(0, +v)), y0 = yv(Math.min(0, +v)); s += `<rect x="${left + gw * i + gw * .15 + bw * si}" y="${y}" width="${bw - 1}" height="${Math.max(0, y0 - y)}" fill="${pal[si % 6]}" rx="1"/>`; }));
    }
    if (ch.type !== 'hbar') labels.forEach((l, i) => { s += `<text x="${left + gw * i + gw / 2}" y="${top + ph + 13}" font-size="9.5" text-anchor="middle" fill="${fg}" fill-opacity=".8">${S.esc(l)}</text>`; });
    let lx = left; ser.forEach((x, si) => { s += `<rect x="${lx}" y="${H - 13}" width="9" height="9" fill="${pal[si % 6]}"/><text x="${lx + 13}" y="${H - 5}" font-size="10" fill="${fg}">${S.esc(x.name)}</text>`; lx += 24 + String(x.name).length * 6; });
    return s + '</svg>';
  };

  // ---------- rasterise a slide (for thumbnails export, PNG/JPEG/PDF) ----------
  S.rasterize = async (slide, deck, pxW = 1920, type = 'image/png', quality = .92) => {
    const scale = pxW / (deck.w * S.PX); const pxH = Math.round(deck.h * S.PX * scale);
    const css = '.sl{position:absolute;left:0;top:0;transform-origin:0 0;overflow:hidden}.el{position:absolute;box-sizing:border-box}.el .tx{position:absolute;inset:0;padding:3.6pt 7.2pt;display:flex;flex-direction:column;overflow:hidden;word-wrap:break-word;white-space:pre-wrap;line-height:1.2}.el .tx p{margin:0;min-height:1em}.el svg.geo{position:absolute;inset:0;width:100%;height:100%;overflow:visible}.el img{position:absolute;inset:0;width:100%;height:100%}.el table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed}.el td{border:1px solid #fff;padding:2pt 5pt;vertical-align:middle;white-space:pre-wrap}';
    const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${pxW}px;height:${pxH}px;position:relative;overflow:hidden"><style>${css}</style>${S.slideHtml(slide, deck, { scale })}</div>`;
    const xhtml = new XMLSerializer().serializeToString(new DOMParser().parseFromString(html, 'text/html').body.firstChild);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${pxW}" height="${pxH}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
    const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await img.decode().catch(() => new Promise((r) => { img.onload = r; img.onerror = r; }));
    const cv = document.createElement('canvas'); cv.width = pxW; cv.height = pxH; const g = cv.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, pxW, pxH); try { g.drawImage(img, 0, 0); } catch (e) { /* tainted */ }
    return cv.toDataURL(type, quality);
  };
})();
