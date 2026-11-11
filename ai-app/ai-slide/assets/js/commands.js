/* AI Slide — commands: every ribbon button, menus, insert, file open/save/export, slideshow, AI. */
(function () {
  const S = window.Slide; const st = S.st; const $ = (q, r = document) => r.querySelector(q); const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const deck = () => st.deck, slide = () => st.deck.slides[st.cur];
  const W = () => deck().w, H = () => deck().h; const IC = () => S.IC;
  const th = () => S.theme(deck());

  // ---------------- popover menus ----------------
  S.pop = (anchor, html, onClick, opts = {}) => {
    closePop(); const p = document.createElement('div'); p.className = 'ds-pop'; p.innerHTML = html; document.body.appendChild(p);
    const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : { left: opts.x || 100, bottom: opts.y || 100, top: opts.y || 100 };
    p.style.left = Math.max(4, Math.min(innerWidth - p.offsetWidth - 6, r.left)) + 'px'; p.style.top = Math.max(4, Math.min(innerHeight - p.offsetHeight - 6, r.bottom + 2)) + 'px';
    p.addEventListener('click', (ev) => { const b = ev.target.closest('[data-v]'); if (!b) return; ev.stopPropagation(); if (!opts.keep) closePop(); onClick(b.dataset.v, b); });
    setTimeout(() => addEventListener('pointerdown', S._popAway = (e) => { if (!p.contains(e.target)) closePop(); }), 0);
    return p;
  };
  function closePop() { $$('.ds-pop').forEach((x) => x.remove()); if (S._popAway) removeEventListener('pointerdown', S._popAway); S._popAway = null; }
  S.closePop = closePop;
  const mi = (v, label, kbd = '') => `<button class="mi" data-v="${v}">${label}${kbd ? `<kbd>${kbd}</kbd>` : ''}</button>`;
  const shapeIcon = (k) => k === 'line' ? '<svg viewBox="0 0 24 24" width="24" height="24"><line x1="3" y1="21" x2="21" y2="3" stroke="currentColor" stroke-width="1.6"/></svg>' : `<svg viewBox="-1 -1 26 26" width="24" height="24"><path d="${S.geom(k, 24, 24)}" fill="none" stroke="currentColor" stroke-width="1.4" fill-rule="evenodd"/></svg>`;
  const shapeGrid = () => `<h6>Hình cơ bản, mũi tên, lưu đồ, chú thích</h6><div class="ds-grid shapes">${S.SHAPE_LIST.map(([k, l]) => `<button data-v="${k}" title="${l}">${shapeIcon(k)}</button>`).join('')}</div>`;
  const layoutCards = () => `<h6>Bố cục</h6><div class="ds-grid cards">${Object.keys(S.LAYOUTS).map((k) => `<button class="ds-card" data-v="${k}"><div class="pv" data-lay="${k}"></div>${k}</button>`).join('')}</div>`;
  function paintLayoutPreviews(p) { $$('[data-lay]', p).forEach((n) => { const s = { els: S.LAYOUTS[n.dataset.lay](W(), H()).map((e) => e), bg: null }; S.renderInto(n, s, deck(), 140, { hints: true }); n.style.height = (140 * H() / W()) + 'px'; }); }

  // ---------------- element creation ----------------
  const centerBox = (w, h) => ({ x: Math.round((W() - w) / 2), y: Math.round((H() - h) / 2), w, h });
  S.addEl = (el, select = true) => { S.push('insert'); el.id = el.id || S.uid(); slide().els.push(el); S.refresh(); if (select) S.select([el.id]); return el; };
  S.addText = (txt = '', at) => { const e = S.addEl({ type: 'text', ...(at || centerBox(360, 60)), text: { size: 20, valign: 'top', paras: String(txt).split('\n').map((l) => ({ runs: l ? [{ t: l }] : [] })) } }); if (!txt) { S.renderCanvas(); S.beginEdit(e); } return e; };
  function armInsert(make, hint) {
    S.toast(hint || 'Bấm hoặc kéo trên slide để vẽ'); $('#dsCanvas').style.cursor = 'crosshair';
    S.pendingInsert = (p0) => {
      S.pendingInsert = null; const c = $('#dsCanvas'); const ghost = document.createElement('div'); ghost.className = 'ds-marquee'; c.appendChild(ghost); const sc = S.scale() * S.PX; let box = null;
      const mv = (e) => { const p = S.pt(e); box = { x: Math.min(p.x, p0.x), y: Math.min(p.y, p0.y), w: Math.abs(p.x - p0.x), h: Math.abs(p.y - p0.y), dx: p.x - p0.x, dy: p.y - p0.y }; if (e.shiftKey) box.h = box.w; Object.assign(ghost.style, { left: box.x * sc + 'px', top: box.y * sc + 'px', width: box.w * sc + 'px', height: box.h * sc + 'px' }); };
      const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); ghost.remove(); c.style.cursor = ''; if (!box || box.w < 4) box = { x: p0.x, y: p0.y, w: 0, h: 0 }; make(box); };
      addEventListener('pointermove', mv); addEventListener('pointerup', up);
    };
  }
  S.insertShape = (k) => armInsert((b) => {
    if (k === 'line') { const w = b.w || 160, h = b.h || 0; return S.addEl({ type: 'line', x: b.x, y: b.y, w, h, flipV: b.dy < 0 ? 1 : 0, line: { color: th().fg, w: 2 } }); }
    const w = b.w || 140, h = b.h || (k === 'rightArrow' || k === 'leftArrow' ? 70 : 100);
    S.addEl({ type: 'shape', shape: k, x: b.x, y: b.y, w, h, fill: th().accents[1], line: null, text: { size: 18, valign: 'middle', paras: [{ align: 'center', runs: [] }] } });
  });
  S.insertTextBox = () => armInsert((b) => { const e = S.addEl({ type: 'text', x: b.x, y: b.y, w: b.w || 280, h: b.h || 44, text: { size: 18, valign: 'top', paras: [{ runs: [] }] } }); S.renderCanvas(); S.beginEdit(e); }, 'Bấm hoặc kéo trên slide để tạo hộp văn bản');
  function readImg(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(file); }); }
  async function shrinkImg(src, max = 2000) { const im = new Image(); im.src = src; await im.decode().catch(() => {}); const w = im.naturalWidth || 800, h = im.naturalHeight || 600; if (Math.max(w, h) <= max || /svg|gif/.test(src.slice(5, 20))) return { src, w, h }; const k = max / Math.max(w, h); const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); return { src: cv.toDataURL(/png/.test(src.slice(5, 20)) ? 'image/png' : 'image/jpeg', .9), w: cv.width, h: cv.height }; }
  S.insertImageSrc = async (raw, replace) => {
    const { src, w, h } = await shrinkImg(raw); const ph = slide().els.find((e) => e.ph === 'picture');
    if (replace) { S.push('img'); replace.src = src; delete replace.crop; return S.refresh(); }
    let box; if (ph) { const k = Math.min(ph.w / w, ph.h / h); box = { x: ph.x + (ph.w - w * k) / 2, y: ph.y + (ph.h - h * k) / 2, w: w * k, h: h * k }; slide().els = slide().els.filter((e) => e !== ph); }
    else { const k = Math.min(1, (W() * .6) / (w * .75), (H() * .7) / (h * .75)); box = centerBox(Math.round(w * .75 * k), Math.round(h * .75 * k)); }
    S.addEl({ type: 'image', src, ...box });
  };
  S.insertImageFile = async (f, replace) => S.insertImageSrc(await readImg(f), replace);
  function pickLocal(accept, multiple) { return new Promise((res) => { const i = document.createElement('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multiple; i.style.display = 'none'; document.body.appendChild(i); i.onchange = () => { res([...i.files]); i.remove(); }; i.click(); }); }
  S.pickLocal = pickLocal;
  S.insertTable = (r, c) => { const w = Math.min(W() - 80, c * 140), h = r * 36; S.addEl({ type: 'table', ...centerBox(w, h), rows: Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => ({ text: i === 0 ? `Cột ${j + 1}` : '' }))), size: 14, header: true, band: true }); };
  S.insertChart = (type) => S.addEl({ type: 'chart', ...centerBox(520, 320), chart: { type, title: 'Tiêu đề biểu đồ', labels: ['Q1', 'Q2', 'Q3', 'Q4'], series: [{ name: 'Chuỗi 1', values: [4.3, 2.5, 3.5, 4.5] }, { name: 'Chuỗi 2', values: [2.4, 4.4, 1.8, 2.8] }, ...(type === 'pie' || type === 'doughnut' ? [] : [{ name: 'Chuỗi 3', values: [2, 2, 3, 5] }])].slice(0, type === 'pie' || type === 'doughnut' ? 1 : 3) } });

  // ---------------- slides ----------------
  S.addSlide = (layout) => { S.commitEdit(); S.push('slide'); const lay = layout || (slide()?.layout && slide().layout !== 'Title Slide' ? slide().layout : 'Title and Content'); const s = S.newSlide(deck(), S.LAYOUTS[lay] ? lay : 'Title and Content'); if (slide()?.bg) s.bg = S.clone(slide().bg); deck().slides.splice(st.cur + 1, 0, s); shiftSections(st.cur + 1, 1); st.cur++; st.sel = []; S.renderAll(); };
  function shiftSections(at, d) { for (const sec of deck().sections || []) if (sec.start >= at && sec.start > 0) sec.start = Math.max(0, sec.start + d); }
  S.setLayout = (lay) => { S.push('layout'); const s = slide(); const fresh = S.LAYOUTS[lay](W(), H()); const old = s.els.filter((e) => e.ph); const keep = s.els.filter((e) => !e.ph);
    for (const f of fresh) { const o = old.find((x) => x.ph === f.ph && !x._used) || (f.ph === 'body' ? old.find((x) => x.ph === 'subtitle' && !x._used) : null); if (o) { o._used = 1; f.text.paras = o.text.paras; } }
    old.filter((o) => !o._used && (o.text?.paras || []).some((p) => p.runs.some((r) => r.t))).forEach((o) => { delete o.ph; keep.push(o); });
    fresh.forEach((f) => delete f._used); s.els = [...fresh, ...keep]; s.layout = lay; S.select([]); S.refresh(); };

  // ---------------- clipboard ----------------
  S.copy = () => { const s = S.selEls(); if (s.length) { st.clip = { kind: 'els', data: S.clone(s) }; try { navigator.clipboard.writeText(s.map((e) => (e.text?.paras || []).map((p) => p.runs.map((r) => r.t).join('')).join('\n')).join('\n')); } catch {} } else { st.clip = { kind: 'slide', data: S.clone(slide()) }; } S.toast(s.length ? `Đã sao chép ${s.length} đối tượng` : 'Đã sao chép slide'); };
  S.paste = () => { if (!st.clip) return S.toast('Bộ nhớ tạm trống'); if (st.clip.kind === 'slide') { S.push('paste'); const s = S.clone(st.clip.data); s.id = S.uid('s'); s.els.forEach((e) => (e.id = S.uid())); deck().slides.splice(st.cur + 1, 0, s); st.cur++; return S.renderAll(); } S.push('paste'); const ids = []; for (const e0 of st.clip.data) { const e = S.clone(e0); e.id = S.uid(); e.x += 12; e.y += 12; slide().els.push(e); ids.push(e.id); } st.clip.data.forEach((e) => { e.x += 12; e.y += 12; }); S.refresh(); S.select(ids); };

  // ---------------- arrange ----------------
  const zorder = (how) => { const s = slide(); const sel = S.selEls(); if (!sel.length) return; S.push('z'); for (const e of how === 'front' || how === 'fwd' ? sel.slice().reverse() : sel) { const i = s.els.indexOf(e); s.els.splice(i, 1); const j = how === 'front' ? s.els.length : how === 'back' ? 0 : how === 'fwd' ? Math.min(s.els.length, i + 1) : Math.max(0, i - 1); s.els.splice(j, 0, e); } S.refresh(); };
  const align = (how) => { const sel = S.selEls(); if (!sel.length) return; S.push('align'); const one = sel.length === 1; const bx = one ? { x: 0, y: 0, x2: W(), y2: H() } : { x: Math.min(...sel.map((e) => e.x)), y: Math.min(...sel.map((e) => e.y)), x2: Math.max(...sel.map((e) => e.x + e.w)), y2: Math.max(...sel.map((e) => e.y + e.h)) };
    if (how === 'distH' || how === 'distV') { const k = how === 'distH' ? 'x' : 'y', d = how === 'distH' ? 'w' : 'h'; const ss = sel.slice().sort((a, b) => a[k] - b[k]); const tot = ss.reduce((a, e) => a + e[d], 0); const gap = ((how === 'distH' ? bx.x2 - bx.x : bx.y2 - bx.y) - tot) / Math.max(1, ss.length - 1); let p = bx[k]; for (const e of ss) { e[k] = Math.round(p); p += e[d] + gap; } return S.refresh(); }
    for (const e of sel) { if (how === 'left') e.x = bx.x; if (how === 'center') e.x = Math.round((bx.x + bx.x2 - e.w) / 2); if (how === 'right') e.x = bx.x2 - e.w; if (how === 'top') e.y = bx.y; if (how === 'middle') e.y = Math.round((bx.y + bx.y2 - e.h) / 2); if (how === 'bottom') e.y = bx.y2 - e.h; } S.refresh(); };
  const group = () => { const sel = S.selEls(); if (sel.length < 2) return S.toast('Chọn từ 2 đối tượng để nhóm'); S.push('group'); const g = S.uid('g'); sel.forEach((e) => (e.group = g)); S.toast('Đã nhóm — bấm vào một hình sẽ chọn cả nhóm'); };
  const ungroup = () => { S.push('ungroup'); S.selEls().forEach((e) => delete e.group); S.toast('Đã bỏ nhóm'); };
  // clicking an element of a group selects the group
  const _select = S.select; S.select = (ids) => { const extra = new Set(ids); for (const id of ids) { const e = S.els().find((x) => x.id === id); if (e?.group) S.els().filter((x) => x.group === e.group).forEach((x) => extra.add(x.id)); } _select([...extra]); };

  // ---------------- styles ----------------
  const QUICK = () => { const a = th().accents; return [...a.map((c) => ({ fill: c, line: null, color: '#ffffff' })), ...a.map((c) => ({ fill: S.mix(c, .82), line: { color: c, w: 1 }, color: '#1f2937' })), ...a.map((c) => ({ fill: '#ffffff', line: { color: c, w: 2 }, color: c })), ...a.slice(0, 6).map((c) => ({ grad: [S.mix(c, .25), c], line: null, color: '#ffffff', shadow: 1 }))]; };
  const styleGrid = () => `<h6>Kiểu nhanh</h6><div class="ds-grid" style="grid-template-columns:repeat(6,44px)">${QUICK().map((q, i) => `<button class="ds-card" data-v="${i}" style="width:44px;height:30px;padding:0;background:${q.grad ? `linear-gradient(${q.grad})` : q.fill};border:${q.line ? `${q.line.w}px solid ${q.line.color}` : '1px solid transparent'};color:${q.color};${q.shadow ? 'box-shadow:1px 2px 4px rgba(0,0,0,.35)' : ''}">Abc</button>`).join('')}</div>`;
  const palette = (withNone = true) => { const a = th().accents; const rows = [a, a.map((c) => S.mix(c, .4)), a.map((c) => S.mix(c, .7)), ['#000000', '#404040', '#7f7f7f', '#bfbfbf', '#f2f2f2', '#ffffff'], ['#c00000', '#ff0000', '#ffc000', '#ffff00', '#92d050', '#00b050'], ['#00b0f0', '#0070c0', '#002060', '#7030a0', '#e8591a', '#f26b1d']]; return `<h6>Màu chủ đề & chuẩn</h6><div class="ds-grid" style="grid-template-columns:repeat(6,22px)">${rows.flat().map((c) => `<button data-v="${c}" title="${c}" style="width:22px;height:22px;border:1px solid var(--ds-line);background:${c};cursor:pointer;border-radius:3px"></button>`).join('')}</div>${withNone ? mi('none', 'Không tô') : ''}${mi('custom', 'Màu khác…')}`; };
  function colorPick(anchor, cb, withNone = true) { S.pop(anchor, palette(withNone), (v) => { if (v === 'custom') { const i = document.createElement('input'); i.type = 'color'; i.style.position = 'fixed'; i.style.opacity = 0; document.body.appendChild(i); i.oninput = () => cb(i.value); i.onchange = () => i.remove(); i.click(); } else cb(v); }); }

  // ---------------- main dispatcher ----------------
  S.cmd = async (c, btn, ev) => {
    const [k, a, b] = c.split(':'); const sel = S.selEls(); const one = sel[0];
    switch (k) {
      case 'q': return S.cmd({ home: 'file', save: 'save', undo: 'undo', redo: 'redo', play: 'showStart' }[a]);
      case 'undo': return S.undo(); case 'redo': return S.redo();
      case 'save': return st.fileName && /\.(pptx|pptm|potx|ppsx|odp)$/i.test(st.fileName) ? S.saveAs(st.fileName.split('.').pop().toLowerCase()) : S.cmd('file', null, null, 'saveas');
      // clipboard
      case 'cut': S.copy(); return S.cmd('delEl'); case 'copy': return S.copy(); case 'paste': return btn && btn.classList.contains('ds-big') && !st.clip ? S.toast('Bộ nhớ tạm trống — dùng Ctrl+V để dán ảnh/chữ từ ngoài') : S.paste();
      case 'fmtpaint': { if (!one) return S.toast('Chọn đối tượng nguồn trước'); const src = S.clone(one); S.toast('Bấm vào đối tượng để chép định dạng'); S.pendingInsert = (p, e2) => { S.pendingInsert = null; const n = e2.target.closest('.el'); const t = n && S.els().find((x) => x.id === n.dataset.id); if (!t) return; S.push('fmt'); for (const key of ['fill', 'grad', 'line', 'shadow', 'opacity']) { if (src[key] !== undefined) t[key] = S.clone(src[key]); else delete t[key]; } const r0 = src.text?.paras?.[0]?.runs?.[0]; if (r0 && t.text) for (const p of t.text.paras) for (const r of p.runs) Object.assign(r, { b: r0.b, i: r0.i, u: r0.u, color: r0.color, font: r0.font, size: r0.size }); S.refresh(); S.select([t.id]); }; return; }
      // slides
      case 'newSlide': return S.addSlide();
      case 'newSlideMenu': { if (btn?.classList.contains('ds-big') && ev && ev.offsetY < 34 && !btn.closest('[data-cmd="newSlideMenu"]').querySelector('span').contains(ev.target)) return S.addSlide(); const p = S.pop(btn, layoutCards() + `<hr>${mi('dup', 'Nhân bản slide đang chọn', 'Ctrl+D')}${mi('outline', 'Slide từ dàn ý (văn bản)…')}${mi('reuse', 'Dùng lại slide từ tệp khác…')}`, (v) => v === 'dup' ? S.cmd('dupSlide') : v === 'outline' ? S.cmd('fromOutline') : v === 'reuse' ? S.cmd('open', null, null, 'append') : S.addSlide(v)); paintLayoutPreviews(p); return; }
      case 'layoutMenu': { const p = S.pop(btn, layoutCards(), (v) => S.setLayout(v)); paintLayoutPreviews(p); return; }
      case 'resetSlide': { S.push('reset'); const lay = slide().layout && S.LAYOUTS[slide().layout] ? slide().layout : null; if (!lay) return S.toast('Slide nhập từ tệp: không có bố cục gốc để đặt lại'); const fresh = S.LAYOUTS[lay](W(), H()); for (const e of slide().els.filter((x) => x.ph)) { const f = fresh.find((x) => x.ph === e.ph && !x._u); if (f) { f._u = 1; Object.assign(e, { x: f.x, y: f.y, w: f.w, h: f.h }); delete e.rot; e.text.size = f.text.size; e.text.paras.forEach((p) => p.runs.forEach((r) => { delete r.size; delete r.color; delete r.font; })); } } return S.refresh(); }
      case 'dupSlide': { S.push('dup'); const s = S.clone(slide()); s.id = S.uid('s'); s.els.forEach((e) => (e.id = S.uid())); deck().slides.splice(st.cur + 1, 0, s); shiftSections(st.cur + 1, 1); st.cur++; return S.renderAll(); }
      case 'delSlide': { if (deck().slides.length <= 1) return S.toast('Bản trình chiếu cần ít nhất một slide'); S.push('del'); deck().slides.splice(st.cur, 1); shiftSections(st.cur + 1, -1); st.cur = Math.min(st.cur, deck().slides.length - 1); return S.renderAll(); }
      case 'hideSlide': S.push('hide'); slide().hidden = slide().hidden ? undefined : 1; S.renderThumbs(); return S.syncRibbon();
      case 'sectionMenu': return S.pop(btn, mi('add', 'Thêm phần trước slide này') + mi('rename', 'Đổi tên phần') + mi('remove', 'Xoá phần') + mi('collapse', 'Thu gọn tất cả') + mi('expand', 'Mở rộng tất cả'), (v) => {
        const secs = (deck().sections = deck().sections || []); const cur = secs.filter((s) => s.start <= st.cur).sort((a, b) => b.start - a.start)[0];
        if (v === 'add') { const n = prompt('Tên phần:', 'Phần mới'); if (!n) return; S.push('sec'); const ex = secs.find((s) => s.start === st.cur); if (ex) ex.name = n; else { if (!secs.length && st.cur > 0) secs.push({ name: 'Phần mặc định', start: 0 }); secs.push({ name: n, start: st.cur }); } }
        if (v === 'rename' && cur) { const n = prompt('Tên phần:', cur.name); if (n) { S.push('sec'); cur.name = n; } }
        if (v === 'remove' && cur) { S.push('sec'); secs.splice(secs.indexOf(cur), 1); }
        if (v === 'collapse') secs.forEach((s) => (st.closedSecs[s.name] = true)); if (v === 'expand') st.closedSecs = {};
        S.renderThumbs(); });
      // font
      case 'b': case 'i': case 'u': case 's': { const cur = one?.text?.paras?.[0]?.runs?.[0]?.[k]; return S.styleRuns((r) => { r[k] = cur ? undefined : 1; if (!r[k]) delete r[k]; }, k); }
      case 'sup': return S.styleRuns((r) => { r.sup = r.sup ? undefined : 1; delete r.sub; }, 'sup'); case 'sub': return S.styleRuns((r) => { r.sub = r.sub ? undefined : 1; delete r.sup; }, 'sub'); case 'caps': return S.styleRuns((r) => { r.caps = r.caps ? undefined : 1; }, 'caps');
      case 'grow': case 'shrink': { const d = k === 'grow' ? 1 : -1; const steps = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96, 120]; const nxt = (v) => { const i = steps.findIndex((s) => s >= v); return d > 0 ? steps[Math.min(steps.length - 1, (steps[i] === v ? i : i - 1) + 1)] : steps[Math.max(0, (i < 0 ? steps.length : i) - 1)]; }; return S.styleRuns((r, e) => { r.size = nxt(r.size || e?.text?.size || 18); }, k); }
      case 'clearfmt': return S.styleRuns((r) => { ['b', 'i', 'u', 's', 'color', 'font', 'size', 'hl', 'sup', 'sub', 'caps'].forEach((x) => delete r[x]); }, 'clear');
      case 'color': if (a) { if (a === 'color') return S.styleRuns((r) => (r.color = b), 'color'); if (a === 'hl') return S.styleRuns((r) => (r.hl = b), 'hl'); if (a === 'fill') return S.boxStyle((e) => { if (e.type === 'table') { const c2 = st.cell; if (c2 && c2.id === e.id) e.rows[c2.r][c2.c].fill = b; else e.accent = b; } else { e.fill = b; delete e.grad; } }, 'fill'); if (a === 'line') return S.boxStyle((e) => (e.line = { ...(e.line || { w: 1.5 }), color: b }), 'line'); if (a === 'penColor') return (st.penColor = b); if (a === 'cellFill') return S.boxStyle((e) => { const c2 = st.cell; if (e.type === 'table' && c2 && c2.id === e.id) e.rows[c2.r][c2.c].fill = b; }, 'cell'); return; }
        return colorPick(btn, (v) => S.styleRuns((r) => (r.color = v === 'none' ? undefined : v), 'color'), false);
      case 'hl': return colorPick(btn, (v) => S.styleRuns((r) => { if (v === 'none') delete r.hl; else r.hl = v; }, 'hl'));
      // paragraph
      case 'bullet': case 'number': return S.paraStyle((p) => { p.bullet = p.bullet === k ? 'none' : k; }, k);
      case 'indent': case 'outdent': return S.paraStyle((p) => { p.level = Math.max(0, Math.min(8, (p.level || 0) + (k === 'indent' ? 1 : -1))); }, k);
      case 'al': case 'ac': case 'ar': case 'aj': return S.paraStyle((p) => { p.align = { al: 'left', ac: 'center', ar: 'right', aj: 'justify' }[k]; }, k);
      case 'vtop': case 'vmid': case 'vbot': return S.boxStyle((e) => { if (e.text) e.text.valign = { vtop: 'top', vmid: 'middle', vbot: 'bottom' }[k]; }, k);
      case 'spacing': return S.pop(btn, ['1.0', '1.15', '1.5', '2.0', '2.5', '3.0'].map((v) => mi(v, v)).join(''), (v) => S.boxStyle((e) => { if (e.text) e.text.spacing = +v; }, 'spacing'));
      case 'columns': return S.pop(btn, [1, 2, 3].map((v) => mi(v, `${v} cột`)).join(''), (v) => S.boxStyle((e) => { if (e.text) e.text.columns = +v; }, 'cols'));
      // insert
      case 'picture': return S.pop(btn, mi('dev', 'Ảnh từ máy tính…') + mi('url', 'Ảnh từ đường link…') + mi('ai', '✨ Tạo ảnh bằng AI…'), async (v) => { if (v === 'dev') { const f = await pickLocal('image/*', true); for (const x of f) await S.insertImageFile(x); } if (v === 'url') { const u = prompt('Dán đường link ảnh (https://…):'); if (u) S.insertImageSrc(u); } if (v === 'ai') S.cmd('aiImage'); });
      case 'replacePic': { if (one?.type !== 'image') return; const f = await pickLocal('image/*'); if (f[0]) S.insertImageFile(f[0], one); return; }
      case 'shapesMenu': case 'changeShape': return S.pop(btn, shapeGrid(), (v) => k === 'changeShape' ? S.boxStyle((e) => { if (e.type === 'shape') e.shape = v; }, 'shape') : S.insertShape(v));
      case 'textbox': return S.insertTextBox();
      case 'tableMenu': { const p = S.pop(btn, `<h6 id="tgl">Chèn bảng</h6><div class="ds-tgrid">${Array.from({ length: 64 }, (_, i) => `<span data-v="${Math.floor(i / 8) + 1}x${i % 8 + 1}"></span>`).join('')}</div><hr>${mi('custom', 'Chèn bảng…')}`, (v) => { if (v === 'custom') { const r = +prompt('Số hàng:', 4), c = +prompt('Số cột:', 4); if (r && c) S.insertTable(r, c); return; } const [r, c] = v.split('x').map(Number); S.insertTable(r, c); }); p.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-v]'); if (!t || !t.dataset.v.includes('x')) return; const [r, c] = t.dataset.v.split('x').map(Number); $$('.ds-tgrid span', p).forEach((s) => { const [rr, cc] = s.dataset.v.split('x').map(Number); s.classList.toggle('on', rr <= r && cc <= c); }); $('#tgl', p).textContent = `Bảng ${c}×${r}`; }); return; }
      case 'chartMenu': return S.pop(btn, [['bar', 'Cột nhóm'], ['hbar', 'Thanh ngang'], ['line', 'Đường'], ['area', 'Vùng'], ['pie', 'Tròn'], ['doughnut', 'Vành khuyên']].map(([v, l]) => mi(v, l)).join(''), (v) => S.insertChart(v));
      case 'link': { const u = prompt('Địa chỉ liên kết (https://…):', 'https://'); if (!u || u === 'https://') return; if (st.editing) return S.styleRuns((r) => (r.link = u), 'link'); if (!sel.length) return S.addEl({ type: 'text', ...centerBox(300, 40), text: { size: 18, paras: [{ runs: [{ t: u, link: u, u: 1, color: '#0563c1' }] }] } }); return S.styleRuns((r) => { r.link = u; }, 'link'); }
      case 'symbol': return S.pop(btn, `<div class="ds-grid" style="grid-template-columns:repeat(10,26px)">${'©®™°±×÷≈≠≤≥∞√∑π€£¥₫§¶•…–—«»‹›←→↑↓↔⇒⇔✓✗★☆♥♦♣♠☀☁☂☎✉✈⚡⚠❤✔✘①②③④⑤αβγδΩ'.split('').map((ch) => `<button data-v="${ch}" style="width:26px;height:26px;border:0;background:none;cursor:pointer;font-size:16px">${ch}</button>`).join('')}</div>`, (v) => st.editing ? document.execCommand('insertText', false, v) : S.addText(v));
      case 'slideNumber': case 'dateTime': case 'headerFooter': return headerFooter();
      case 'wordart': return S.pop(btn, QUICK().slice(0, 6).map((q, i) => `<button class="mi" data-v="${i}" style="font-size:22px;font-weight:800;color:${q.fill};text-shadow:1px 2px 2px rgba(0,0,0,.25)">Chữ nghệ thuật</button>`).join(''), (v) => { const q = QUICK()[+v]; const e = S.addEl({ type: 'text', ...centerBox(560, 90), shadow: 1, text: { size: 54, valign: 'middle', paras: [{ align: 'center', runs: [{ t: 'Chữ nghệ thuật', b: 1, color: q.fill }] }] } }); });
      // drawing
      case 'quickStyles': return S.pop(btn, styleGrid(), (v) => { const q = QUICK()[+v]; S.boxStyle((e) => { if (e.type === 'image' || e.type === 'table' || e.type === 'chart') return; if (e.type === 'text') e.type = 'shape', e.shape = 'rect'; if (q.grad) { e.grad = q.grad; delete e.fill; } else { e.fill = q.fill; delete e.grad; } e.line = q.line ? { ...q.line } : null; e.shadow = q.shadow; if (e.text) e.text.paras.forEach((p) => p.runs.forEach((r) => (r.color = q.color))); }, 'qs'); });
      case 'fillMenu': return colorPick(btn, (v) => S.boxStyle((e) => { if (e.type === 'table') return void (e.accent = v === 'none' ? undefined : v); if (v === 'none') { e.fill = 'none'; delete e.grad; } else { e.fill = v; delete e.grad; if (e.type === 'text') { e.type = 'shape'; e.shape = 'rect'; } } }, 'fill'));
      case 'lineMenu': return S.pop(btn, palette() + '<hr><h6>Độ dày</h6>' + [0.75, 1, 1.5, 2.25, 3, 4.5, 6].map((w) => mi('w' + w, `${w} pt`)).join('') + '<h6>Nét</h6>' + [['solid', 'Liền'], ['dash', 'Gạch'], ['sysDot', 'Chấm'], ['dashDot', 'Gạch chấm']].map(([v, l]) => mi('d' + v, l)).join('') + mi('arrow', 'Mũi tên ở cuối (đường thẳng)'), (v) => S.boxStyle((e) => { if (v === 'none') return void (e.line = null); if (v === 'custom') return; const L = (e.line = e.line || { color: th().fg, w: 1 }); if (v[0] === '#') L.color = v; else if (v[0] === 'w') L.w = +v.slice(1); else if (v[0] === 'd') L.dash = v.slice(1) === 'solid' ? undefined : v.slice(1); else if (v === 'arrow') L.arrow = L.arrow ? undefined : 1; }, 'line'));
      case 'effectsMenu': return S.pop(btn, mi('shadow', 'Đổ bóng') + mi('noshadow', 'Không bóng') + '<hr><h6>Độ trong suốt</h6>' + [100, 80, 60, 40, 20].map((o) => mi('o' + o, `${o}%`)).join(''), (v) => S.boxStyle((e) => { if (v === 'shadow') e.shadow = 1; if (v === 'noshadow') delete e.shadow; if (v[0] === 'o') e.opacity = +v.slice(1) / 100 === 1 ? undefined : +v.slice(1) / 100; }, 'fx'));
      case 'textShadow': return S.boxStyle((e) => (e.shadow = e.shadow ? undefined : 1), 'shadow');
      case 'textOutline': return S.styleRuns((r) => (r.b = 1), 'outline');
      case 'arrangeMenu': return S.pop(btn, '<h6>Thứ tự</h6>' + mi('front', 'Đưa lên trên cùng') + mi('fwd', 'Đưa lên một lớp') + mi('bwd', 'Đưa xuống một lớp') + mi('back', 'Đưa xuống dưới cùng') + '<h6>Nhóm</h6>' + mi('group', 'Nhóm', 'Ctrl+G') + mi('ungroup', 'Bỏ nhóm', 'Ctrl+Shift+G') + '<h6>Căn</h6>' + ['left:Căn trái', 'center:Căn giữa', 'right:Căn phải', 'top:Căn trên', 'middle:Căn giữa dọc', 'bottom:Căn dưới', 'distH:Phân bố ngang', 'distV:Phân bố dọc'].map((x) => mi('a' + x.split(':')[0], x.split(':')[1])).join('') + '<h6>Xoay</h6>' + mi('r90', 'Xoay phải 90°') + mi('r-90', 'Xoay trái 90°') + mi('fh', 'Lật ngang') + mi('fv', 'Lật dọc'), arrange);
      case 'fwd': return S.pop(btn, mi('fwd', 'Đưa lên một lớp') + mi('front', 'Đưa lên trên cùng'), arrange); case 'back': return S.pop(btn, mi('bwd', 'Đưa xuống một lớp') + mi('back', 'Đưa xuống dưới cùng'), arrange);
      case 'alignMenu': return S.pop(btn, ['left:Căn trái', 'center:Căn giữa', 'right:Căn phải', 'top:Căn trên', 'middle:Căn giữa dọc', 'bottom:Căn dưới', 'distH:Phân bố ngang', 'distV:Phân bố dọc'].map((x) => mi('a' + x.split(':')[0], x.split(':')[1])).join(''), arrange);
      case 'group': return S.pop(btn, mi('group', 'Nhóm') + mi('ungroup', 'Bỏ nhóm'), arrange); case 'ungroup': return ungroup();
      case 'rotateMenu': return S.pop(btn, mi('r90', 'Xoay phải 90°') + mi('r-90', 'Xoay trái 90°') + mi('fh', 'Lật ngang') + mi('fv', 'Lật dọc'), arrange);
      case 'altText': { if (!one) return; const v = prompt('Văn bản thay thế (cho người dùng trình đọc màn hình):', one.alt || ''); if (v !== null) S.boxStyle((e) => (e.alt = v), 'alt'); return; }
      case 'delEl': { if (!sel.length) return; S.push('del'); slide().els = slide().els.filter((e) => !st.sel.includes(e.id)); st.sel = []; S.refresh(); return S.renderRibbon(); }
      case 'dupEl': { S.push('dup'); const ids = []; for (const e of sel) { const c2 = S.clone(e); c2.id = S.uid(); c2.x += 14; c2.y += 14; slide().els.push(c2); ids.push(c2.id); } S.refresh(); return S.select(ids); }
      // picture
      case 'picGray': return S.boxStyle((e) => { if (e.type === 'image') e.gray = e.gray ? undefined : 1; }, 'gray');
      case 'picRound': return S.boxStyle((e) => { if (e.type === 'image') { e.round = e.round ? undefined : 1; if (e.round) { const m = Math.min(e.w, e.h); e.w = e.h = m; } } }, 'round');
      case 'resetPic': return S.boxStyle((e) => { ['crop', 'gray', 'bright', 'contrast', 'round', 'rot', 'shadow', 'opacity'].forEach((x) => delete e[x]); }, 'reset');
      case 'corrections': return S.pop(btn, '<h6>Độ sáng / Tương phản</h6>' + [[-40, 0], [-20, 0], [0, 0], [20, 0], [40, 0], [0, -30], [0, 30], [20, 20]].map(([br, co]) => mi(`${br},${co}`, `Sáng ${br > 0 ? '+' : ''}${br}% · Tương phản ${co > 0 ? '+' : ''}${co}%`)).join(''), (v) => { const [br, co] = v.split(',').map(Number); S.boxStyle((e) => { e.bright = br || undefined; e.contrast = co || undefined; }, 'corr'); });
      case 'crop': return S.pop(btn, '<h6>Cắt xén ảnh</h6>' + mi('0,0,0,0', 'Bỏ cắt xén') + mi('sq', 'Vuông 1:1 (giữa)') + mi('169', 'Tỉ lệ 16:9 (giữa)') + mi('43', 'Tỉ lệ 4:3 (giữa)') + mi('10,10,10,10', 'Cắt 10% mỗi cạnh') + mi('custom', 'Nhập % trái, trên, phải, dưới…'), (v) => { if (one?.type !== 'image') return S.toast('Hãy chọn một ảnh'); S.push('crop'); const e = one; const ow = e.crop ? e.w / ((100 - e.crop.l - e.crop.r) / 100) : e.w, oh = e.crop ? e.h / ((100 - e.crop.t - e.crop.b) / 100) : e.h; let c2;
        if (v === 'custom') { const s = prompt('Cắt (%) trái, trên, phải, dưới:', '0,0,0,0'); if (!s) return; v = s; }
        if (['sq', '169', '43'].includes(v)) { const r = { sq: 1, 169: 16 / 9, 43: 4 / 3 }[v]; if (ow / oh > r) { const k = (100 - (oh * r) / ow * 100) / 2; c2 = { l: k, r: k, t: 0, b: 0 }; } else { const k = (100 - (ow / r) / oh * 100) / 2; c2 = { l: 0, r: 0, t: k, b: k }; } } else { const [l, t, r, b2] = v.split(',').map(Number); c2 = { l, t, r, b: b2 }; }
        e.crop = c2.l || c2.t || c2.r || c2.b ? c2 : undefined; e.w = ow * (100 - c2.l - c2.r) / 100; e.h = oh * (100 - c2.t - c2.b) / 100; S.refresh(); });
      // table
      case 'tstyle': return S.boxStyle((e) => { if (e.type === 'table') e.accent = c.slice(7); }, 'tstyle');
      case 'rowAbove': case 'rowBelow': case 'delRow': case 'colLeft': case 'colRight': case 'delCol': { const e = one; if (e?.type !== 'table') return; const cell = st.cell?.id === e.id ? st.cell : { r: e.rows.length - 1, c: e.rows[0].length - 1 }; S.push('table'); const rh = e.h / e.rows.length, cw = e.w / e.rows[0].length;
        if (k === 'rowAbove' || k === 'rowBelow') { e.rows.splice(cell.r + (k === 'rowBelow' ? 1 : 0), 0, e.rows[0].map(() => ({ text: '' }))); e.h += rh; }
        if (k === 'delRow' && e.rows.length > 1) { e.rows.splice(cell.r, 1); e.h -= rh; }
        if (k === 'colLeft' || k === 'colRight') { e.rows.forEach((r) => r.splice(cell.c + (k === 'colRight' ? 1 : 0), 0, { text: '' })); e.w = Math.min(W() - e.x, e.w + cw); }
        if (k === 'delCol' && e.rows[0].length > 1) { e.rows.forEach((r) => r.splice(cell.c, 1)); e.w -= cw; }
        return S.refresh(); }
      // chart
      case 'ctype': return S.boxStyle((e) => { if (e.type === 'chart') e.chart.type = a; }, 'ctype');
      case 'editData': return editChart(one);
      // design
      case 'theme': { S.push('theme'); const old = th(); deck().themeId = a; delete deck().theme; const t = th(); for (const s of deck().slides) { if (s.bg && (s.bg.color === old.bg || s.bg.grad)) s.bg = null; for (const e of s.els) { const i = old.accents.indexOf(e.fill); if (i >= 0) e.fill = t.accents[i]; if (e.accent) { const j = old.accents.indexOf(e.accent); if (j >= 0) e.accent = t.accents[j]; } for (const p of e.text?.paras || []) for (const r of p.runs) { if (r.color === old.fg || r.color === old.title) delete r.color; } } } return S.renderAll(); }
      case 'sizeMenu': return S.pop(btn, mi('960x540', 'Màn hình rộng (16:9)') + mi('720x540', 'Chuẩn (4:3)') + mi('960x600', '16:10') + mi('842x595', 'Giấy A4') + mi('540x960', 'Dọc 9:16 (story)') + mi('custom', 'Kích thước tuỳ chỉnh…'), (v) => { let [w, h] = v === 'custom' ? (prompt('Rộng x Cao (inch):', `${W() / 72}x${H() / 72}`) || '').split('x').map((x) => +x * 72) : v.split('x').map(Number); if (!w || !h) return; S.push('size'); const kx = w / W(), ky = h / H(); const k = Math.min(kx, ky); for (const s of deck().slides) for (const e of s.els) { e.x = e.x * kx; e.y = e.y * ky; e.w *= k; e.h *= k; e.x += (e.w / k) * (kx - k) / 2; if (e.text) e.text.size = Math.round((e.text.size || 18) * Math.max(.5, k)); } deck().w = w; deck().h = h; S.renderAll(); });
      case 'bgMenu': return S.pop(btn, palette(false) + '<hr><h6>Chuyển sắc</h6>' + th().accents.map((cc, i) => mi('g' + i, `<span style="display:inline-block;width:60px;height:14px;background:linear-gradient(90deg,${S.mix(cc, .6)},${cc})"></span>`)).join('') + mi('img', 'Ảnh nền…') + mi('reset', 'Đặt lại nền') + '<hr>' + mi('all', 'Áp dụng nền này cho tất cả slide'), async (v) => { if (v === 'all') { S.push('bg'); const b2 = slide().bg; deck().slides.forEach((s) => (s.bg = b2 ? S.clone(b2) : null)); return S.renderAll(); } S.push('bg'); if (v === 'reset') slide().bg = null; else if (v === 'img') { const f = await pickLocal('image/*'); if (!f[0]) return; slide().bg = { image: (await shrinkImg(await readImg(f[0]))).src }; } else if (v[0] === 'g') { const cc = th().accents[+v.slice(1)]; slide().bg = { grad: [S.mix(cc, .6), cc] }; } else if (v === 'custom') return; else slide().bg = { color: v }; S.refresh(); });
      case 'designIdeas': return S.designIdeas(btn);
      // transitions / animations
      case 'tr': { S.push('tr'); slide().transition = a === 'none' ? undefined : { ...(slide().transition || {}), type: a, dur: +($('[data-in="trDur"]')?.value || .7) }; S.renderThumbs(); S.syncRibbon(); if (a !== 'none') S.previewTransition(); return; }
      case 'trPreview': return S.previewTransition();
      case 'trAll': { S.push('trAll'); const t = slide().transition; deck().slides.forEach((s) => (s.transition = t ? S.clone(t) : undefined)); S.renderThumbs(); return S.toast('Đã áp dụng chuyển tiếp cho mọi slide'); }
      case 'an': { if (!sel.length) return S.toast('Chọn một đối tượng để thêm hoạt hình'); S.push('anim'); let order = Math.max(0, ...slide().els.map((e) => e.anim?.order || 0)); sel.forEach((e) => { e.anim = a === 'none' ? undefined : { ...(e.anim || {}), type: a, start: e.anim?.start || 'click', dur: e.anim?.dur || .5, order: e.anim?.order || ++order }; }); S.syncRibbon(); if (a !== 'none') S.previewAnim(sel); return; }
      case 'anPreview': return S.previewAnim(slide().els.filter((e) => e.anim));
      // show
      case 'showStart': return S.slideshow(0); case 'showCurrent': return S.slideshow(st.cur); case 'presenter': return S.slideshow(st.cur, { presenter: true }); case 'rehearse': return S.slideshow(0, { rehearse: true });
      case 'fontPicker': return S.fontPicker(btn);
      case 'recNarr': return S.recordNarration();
      case 'insAudio': { const f = await S.pickLocal('audio/*,.mp3,.m4a,.wav,.ogg,.webm'); if (!f[0]) return; const src = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f[0]); }); S.push('audio'); S.slide().els = S.slide().els.filter((e) => !(e.type === 'audio' && e.narration)); return S.addEl({ type: 'audio', src, name: f[0].name, x: S.deck().w - 60, y: S.deck().h - 60, w: 40, h: 40 }); }
      case 'clearNarr': { S.push('clearNarr'); S.deck().slides.forEach((s) => (s.els = s.els.filter((e) => !(e.type === 'audio' && e.narration)))); S.renderAll(); return S.toast('Đã xoá thuyết minh'); }
      case 'exportVideoNote': return S.exportGif();
      // review
      case 'comment': { const t = prompt('Nhận xét cho slide này:'); if (!t) return; S.push('comment'); (slide().comments = slide().comments || []).push({ by: (window.aicw?.me?.displayName) || 'Tôi', t, at: Date.now() }); return S.toast('Đã thêm nhận xét'); }
      case 'comments': { const cs = slide().comments || []; return S.pop(btn, `<h6>Nhận xét slide ${st.cur + 1}</h6>${cs.length ? cs.map((x, i) => `<div style="padding:6px 8px;max-width:280px"><b>${S.esc(x.by)}</b> <small style="color:var(--ds-muted)">${new Date(x.at).toLocaleString()}</small><div>${S.esc(x.t)}</div><button class="mi" data-v="d${i}" style="padding:2px 0;color:var(--ds-accent)">Xoá</button></div>`).join('<hr>') : '<div style="padding:8px;color:var(--ds-muted)">Chưa có nhận xét.</div>'}<hr>${mi('new', '+ Nhận xét mới')}`, (v) => { if (v === 'new') return S.cmd('comment'); S.push('c'); cs.splice(+v.slice(1), 1); }); }
      case 'spell': return S.aiRewrite('spell'); case 'translate': return S.aiRewrite('translate'); case 'aiSummary': return S.aiSummary();
      // view
      case 'vNormal': st.view = 'normal'; S.leaveSorter(); return S.renderAll();
      case 'vSorter': st.view = 'sorter'; return S.renderAll();
      case 'vNotes': st.showNotes = !st.showNotes; if (st.view !== 'normal') { st.view = 'normal'; S.leaveSorter(); } return S.renderAll();
      case 'vReading': return S.slideshow(st.cur, { reading: true });
      case 'zoomIn': st.zoom = Math.min(400, Math.round(S.scale() * 100 * 1.15)); return S.renderCanvas(); case 'zoomOut': st.zoom = Math.max(20, Math.round(S.scale() * 100 / 1.15)); return S.renderCanvas();
      case 'fitWin': st.zoom = 0; return S.renderCanvas();
      case 'zoomMenu': return S.pop(btn, [33, 50, 66, 75, 100, 150, 200, 300].map((z) => mi(z, z + '%')).join('') + mi('fit', 'Vừa cửa sổ'), (v) => { st.zoom = v === 'fit' ? 0 : +v; S.renderCanvas(); });
      case 'darkToggle': { const d = document.documentElement; const cur = d.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); d.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark'); try { aicw.setState({ ...(aicw.getState() || {}), theme: d.getAttribute('data-theme') }); } catch {} return; }
      case 'find': return findReplace(btn);
      case 'drawPen': case 'drawHi': return S.startDraw(k === 'drawHi'); case 'drawStop': return S.stopDraw();
      // file
      case 'file': return S.backstage(ev);
      case 'open': return S.pickAndOpen(ev);
      case 'exportPdf': return S.exportPdf();
      case 'fromOutline': return S.outlineDialog();
      // AI
      case 'aiPanel': return S.aiPanel();
      case 'aiImage': return S.aiImage();
    }
  };
  function arrange(v) {
    if (['front', 'fwd', 'bwd', 'back'].includes(v)) return zorder(v === 'bwd' ? 'bwd' : v);
    if (v === 'group') return group(); if (v === 'ungroup') return ungroup();
    if (v[0] === 'a') return align(v.slice(1));
    if (v === 'r90' || v === 'r-90') return S.boxStyle((e) => (e.rot = (((e.rot || 0) + (v === 'r90' ? 90 : -90)) % 360 + 360) % 360), 'rot');
    if (v === 'fh') return S.boxStyle((e) => (e.flipH = e.flipH ? undefined : 1), 'flip'); if (v === 'fv') return S.boxStyle((e) => (e.flipV = e.flipV ? undefined : 1), 'flip');
  }
  S.input = (k, v) => {
    switch (k) {
      case 'font': return S.styleRuns((r) => (r.font = v), 'font');
      case 'size': return S.styleRuns((r) => (r.size = +v), 'size');
      case 'elH': case 'elW': return S.boxStyle((e) => { const n = Math.max(.05, +v) * 72; if (k === 'elH') e.h = n; else e.w = n; }, 'size');
      case 'trDur': if (slide().transition) slide().transition.dur = +v; return;
      case 'trAfterOn': case 'trAfter': { const t = slide().transition || (slide().transition = { type: 'none' }); const on = $('[data-in="trAfterOn"]').checked; t.after = on ? +$('[data-in="trAfter"]').value : undefined; return; }
      case 'anStart': case 'anDur': case 'anPara': return S.selEls().forEach((e) => { if (!e.anim) return; if (k === 'anStart') e.anim.start = v; if (k === 'anDur') e.anim.dur = +v; if (k === 'anPara') e.anim.byPara = v ? 1 : undefined; });
      case 'loop': deck().loop = v ? 1 : undefined; return;
      case 'grid': st.grid = v; return S.renderCanvas(); case 'guides': st.guides = v; return;
      case 'penW': st.penW = +v; return;
      case 'tHeader': return S.boxStyle((e) => { if (e.type === 'table') e.header = v ? undefined : false; }, 'th');
      case 'tBand': return S.boxStyle((e) => { if (e.type === 'table') e.band = v ? undefined : false; }, 'tb');
    }
  };

  function headerFooter() {
    const d = document.createElement('div'); d.className = 'ds-aipanel'; d.style.top = '140px';
    d.innerHTML = `<b>Đầu trang & chân trang</b><label><input type="checkbox" id="hfDate"> Ngày giờ</label><label><input type="checkbox" id="hfNum" checked> Số slide</label><label><input type="checkbox" id="hfFoot"> Chân trang: <input class="ui-input" id="hfFootT" placeholder="Nội dung chân trang"></label><label><input type="checkbox" id="hfNoTitle" checked> Không hiện trên slide tiêu đề</label><div class="row"><button class="ui-btn primary sm" id="hfAll">Áp dụng tất cả</button><button class="ui-btn sm" id="hfOne">Áp dụng</button><button class="ui-btn ghost sm" id="hfX">Đóng</button></div>`;
    document.body.appendChild(d);
    const apply = (all) => { S.push('hf'); const list = all ? deck().slides : [slide()]; list.forEach((s) => { const idx = deck().slides.indexOf(s); s.els = s.els.filter((e) => !e.hf); if ($('#hfNoTitle', d).checked && s.layout === 'Title Slide') return; const col = S.theme(deck()).fg; if ($('#hfNum', d).checked) s.els.push({ id: S.uid(), hf: 'num', type: 'text', x: W() - 110, y: H() - 40, w: 90, h: 26, text: { size: 12, paras: [{ align: 'right', runs: [{ t: String(idx + 1), color: col }] }] } }); if ($('#hfDate', d).checked) s.els.push({ id: S.uid(), hf: 'date', type: 'text', x: 20, y: H() - 40, w: 160, h: 26, text: { size: 12, paras: [{ runs: [{ t: new Date().toLocaleDateString('vi-VN'), color: col }] }] } }); if ($('#hfFoot', d).checked && $('#hfFootT', d).value) s.els.push({ id: S.uid(), hf: 'foot', type: 'text', x: W() / 2 - 200, y: H() - 40, w: 400, h: 26, text: { size: 12, paras: [{ align: 'center', runs: [{ t: $('#hfFootT', d).value, color: col }] }] } }); }); d.remove(); S.renderAll(); };
    $('#hfAll', d).onclick = () => apply(true); $('#hfOne', d).onclick = () => apply(false); $('#hfX', d).onclick = () => d.remove();
  }
  function editChart(e) {
    if (e?.type !== 'chart') return S.toast('Hãy chọn một biểu đồ');
    const ch = e.chart; const d = document.createElement('div'); d.className = 'ds-aipanel'; d.style.width = 'min(560px, calc(100vw - 24px))';
    const toTsv = () => [['', ...ch.series.map((s) => s.name)].join('\t'), ...ch.labels.map((l, i) => [l, ...ch.series.map((s) => s.values[i] ?? '')].join('\t'))].join('\n');
    d.innerHTML = `<b>Sửa dữ liệu biểu đồ</b><input class="ui-input" id="chT" placeholder="Tiêu đề" value="${S.esc(ch.title || '')}"><small style="color:var(--ds-muted)">Dòng đầu = tên chuỗi, cột đầu = nhãn. Ngăn cách bằng Tab hoặc dấu phẩy — có thể dán thẳng từ Excel.</small><textarea class="ui-textarea" id="chD" style="font-family:monospace;min-height:160px">${S.esc(toTsv())}</textarea><div class="row"><button class="ui-btn primary sm" id="chOk">Cập nhật</button><button class="ui-btn ghost sm" id="chX">Đóng</button></div>`;
    document.body.appendChild(d);
    $('#chX', d).onclick = () => d.remove();
    $('#chOk', d).onclick = () => { const rows = $('#chD', d).value.trim().split('\n').map((r) => r.split(/\t|,/).map((x) => x.trim())); if (rows.length < 2) return; S.push('chart'); ch.title = $('#chT', d).value; ch.series = rows[0].slice(1).map((n, si) => ({ name: n || `Chuỗi ${si + 1}`, values: rows.slice(1).map((r) => +String(r[si + 1] || '0').replace(/[^\d.\-]/g, '') || 0) })); ch.labels = rows.slice(1).map((r) => r[0]); d.remove(); S.refresh(); };
  }
  function findReplace(btn) {
    const d = document.createElement('div'); d.className = 'ds-aipanel'; d.style.top = '70px';
    d.innerHTML = `<b>Tìm & thay thế</b><input class="ui-input" id="frF" placeholder="Tìm"><input class="ui-input" id="frR" placeholder="Thay bằng"><div class="row"><button class="ui-btn sm" id="frN">Tìm tiếp</button><button class="ui-btn primary sm" id="frA">Thay tất cả</button><button class="ui-btn ghost sm" id="frX">Đóng</button><span id="frM" class="ds-lbl"></span></div>`;
    document.body.appendChild(d); $('#frF', d).focus(); let last = -1;
    $('#frX', d).onclick = () => d.remove();
    $('#frN', d).onclick = () => { const q = $('#frF', d).value.toLowerCase(); if (!q) return; const n = deck().slides.length; for (let k = 1; k <= n; k++) { const i = (st.cur + (last === st.cur ? k : k - 1)) % n; const s = deck().slides[i]; const hit = s.els.find((e) => (e.text?.paras || []).some((p) => p.runs.map((r) => r.t).join('').toLowerCase().includes(q))); if (hit) { last = i; S.go(i); S.select([hit.id]); $('#frM', d).textContent = `Slide ${i + 1}`; return; } } $('#frM', d).textContent = 'Không thấy'; };
    $('#frA', d).onclick = () => { const q = $('#frF', d).value; if (!q) return; const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); let n = 0; S.push('replace'); for (const s of deck().slides) for (const e of s.els) { for (const p of e.text?.paras || []) for (const r of p.runs) r.t = r.t.replace(re, () => (n++, $('#frR', d).value)); for (const row of e.rows || []) for (const c of row) c.text = String(c.text).replace(re, () => (n++, $('#frR', d).value)); } $('#frM', d).textContent = `Đã thay ${n} chỗ`; S.renderAll(); };
  }
  S.ctxMenu = (ev, kind) => {
    const html = kind === 'thumb' ? mi('newSlide', 'Slide mới', 'Ctrl+M') + mi('dupSlide', 'Nhân bản slide', 'Ctrl+D') + mi('delSlide', 'Xoá slide', 'Del') + '<hr>' + mi('copy', 'Sao chép') + mi('paste', 'Dán') + '<hr>' + mi('hideSlide', slide().hidden ? 'Hiện slide' : 'Ẩn slide') + mi('sectionMenu', 'Thêm phần…') + mi('layoutMenu', 'Bố cục…')
      : kind === 'el' ? mi('cut', 'Cắt', 'Ctrl+X') + mi('copy', 'Sao chép', 'Ctrl+C') + mi('paste', 'Dán', 'Ctrl+V') + mi('dupEl', 'Nhân bản', 'Ctrl+D') + mi('delEl', 'Xoá', 'Del') + '<hr>' + mi('arr:front', 'Đưa lên trên cùng') + mi('arr:back', 'Đưa xuống dưới cùng') + mi('arr:group', 'Nhóm') + mi('arr:ungroup', 'Bỏ nhóm') + '<hr>' + mi('link', 'Liên kết…') + mi('altText', 'Văn bản thay thế…') + mi('aiRewriteSel', '✨ AI viết lại chữ')
      : mi('paste', 'Dán', 'Ctrl+V') + mi('layoutMenu', 'Bố cục…') + mi('resetSlide', 'Đặt lại slide') + mi('bgMenu', 'Định dạng nền…') + '<hr>' + mi('grid', 'Bật/tắt lưới') + mi('newSlide', 'Slide mới');
    const anchor = { getBoundingClientRect: () => ({ left: ev.clientX, bottom: ev.clientY, top: ev.clientY }) };
    S.pop(anchor, html, (v) => { if (v.startsWith('arr:')) return arrange(v.slice(4)); if (v === 'grid') { st.grid = !st.grid; return S.renderCanvas(); } if (v === 'aiRewriteSel') return S.aiRewrite('improve'); const tgt = $(`[data-cmd="${v}"]`); S.cmd(v, tgt || anchor); });
  };

  // ---------------- drawing (pen) ----------------
  S.startDraw = (hi) => { S.drawMode = { hi }; $('#dsCanvas').style.cursor = 'crosshair'; S.toast('Kéo chuột để vẽ. Bấm "Chọn" để dừng.'); };
  S.stopDraw = () => { S.drawMode = null; $('#dsCanvas').style.cursor = ''; };
  S.drawDown = (ev) => {
    const pts = [S.pt(ev)]; const c = $('#dsCanvas'); const sc = S.scale() * S.PX; const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none'); c.appendChild(svg); const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline'); const col = st.penColor || '#e8591a', w = (st.penW || 3) * (S.drawMode.hi ? 4 : 1); pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', col); pl.setAttribute('stroke-width', w * sc); pl.setAttribute('stroke-linecap', 'round'); pl.setAttribute('stroke-linejoin', 'round'); if (S.drawMode.hi) pl.setAttribute('stroke-opacity', '.4'); svg.appendChild(pl);
    const mv = (e) => { pts.push(S.pt(e)); pl.setAttribute('points', pts.map((p) => `${p.x * sc},${p.y * sc}`).join(' ')); };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); svg.remove(); if (pts.length < 2) return; const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y); const pad = w; const x0 = Math.min(...xs) - pad, y0 = Math.min(...ys) - pad, x1 = Math.max(...xs) + pad, y1 = Math.max(...ys) + pad; const s2 = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x0} ${y0} ${x1 - x0} ${y1 - y0}"><polyline points="${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${S.drawMode?.hi ? ' stroke-opacity=".4"' : ''}/></svg>`; S.addEl({ type: 'image', ink: 1, src: 'data:image/svg+xml;base64,' + btoa(s2), x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, false); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
})();
