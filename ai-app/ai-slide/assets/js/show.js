/* AI Slide — slideshow (transitions, animations, presenter view, pen, rehearse), File backstage, export, AI. */
(function () {
  const S = window.Slide; const st = S.st; const $ = (q, r = document) => r.querySelector(q); const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const deck = () => st.deck, slide = () => st.deck.slides[st.cur];

  // ---------------- animations ----------------
  const KF = {
    appear: [[{ opacity: 0 }, { opacity: 1 }], 1], fade: [[{ opacity: 0 }, { opacity: 1 }]], fly: [[{ transform: 'translateY(120%)', opacity: 0 }, { transform: 'none', opacity: 1 }]],
    zoom: [[{ transform: 'scale(.3)', opacity: 0 }, { transform: 'none', opacity: 1 }]], wipe: [[{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }]], float: [[{ transform: 'translateY(30px)', opacity: 0 }, { transform: 'none', opacity: 1 }]],
    pulse: [[{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }]], spin: [[{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }]], fadeOut: [[{ opacity: 1 }, { opacity: 0 }]],
  };
  const isEntrance = (t) => !['pulse', 'spin', 'fadeOut'].includes(t);
  function animate(node, a) { const [kf, instant] = KF[a.type] || KF.fade; return node.animate(kf, { duration: instant ? 1 : (a.dur || .5) * 1000, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'both' }).finished.catch(() => {}); }
  S.previewAnim = (list) => { for (const e of list.sort((a, b) => (a.anim?.order || 0) - (b.anim?.order || 0))) { const n = $(`#dsCanvas .el[data-id="${e.id}"]`); if (n && e.anim) animate(n, e.anim); } };
  // build steps: each click group = list of {id, anim}
  function steps(s) { const an = s.els.filter((e) => e.anim).sort((a, b) => a.anim.order - b.anim.order); const out = []; for (const e of an) { if (!out.length || e.anim.start === 'click') out.push([]); out[out.length - 1].push(e); } return out; }

  // ---------------- transitions ----------------
  function transition(stage, oldNode, newNode, t) {
    const d = (t?.dur || .7) * 1000; const ty = t?.type || 'none';
    if (!oldNode || ty === 'none') { oldNode?.remove(); return Promise.resolve(); }
    const A = { fade: [[{ opacity: 0 }, { opacity: 1 }], null], push: [[{ transform: 'translateY(100%)' }, { transform: 'none' }], [{ transform: 'none' }, { transform: 'translateY(-100%)' }]], wipe: [[{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], null], split: [[{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0 0 0)' }], null], cover: [[{ transform: 'translateX(100%)' }, { transform: 'none' }], null], zoom: [[{ transform: 'scale(.4)', opacity: 0 }, { transform: 'none', opacity: 1 }], [{ opacity: 1 }, { opacity: 0 }]] }[ty] || [[{ opacity: 0 }, { opacity: 1 }], null];
    newNode.style.zIndex = 2; const p = [newNode.animate(A[0], { duration: d, easing: 'ease-in-out', fill: 'both' }).finished]; if (A[1]) p.push(oldNode.animate(A[1], { duration: d, easing: 'ease-in-out', fill: 'both' }).finished);
    return Promise.all(p).catch(() => {}).then(() => oldNode.remove());
  }
  S.previewTransition = () => { const c = $('#dsCanvas'); const sl = c.querySelector('.sl'); if (!sl) return; const ghost = document.createElement('div'); ghost.style.cssText = `position:absolute;inset:0;background:${S.mix('#888888', .7)};z-index:1`; c.prepend(ghost); sl.style.zIndex = 2; transition(c, ghost, sl, slide().transition); };

  // ---------------- slideshow ----------------
  S.slideshow = async (start = 0, opt = {}) => {
    S.commitEdit(); const visible = deck().slides.map((s, i) => i).filter((i) => !deck().slides[i].hidden || i === start); if (!visible.length) return;
    let pos = Math.max(0, visible.indexOf(start)); if (pos < 0) pos = 0; let step = 0; let timer = null; const t0 = Date.now(); const times = {}; let slideT0 = Date.now();
    const box = document.createElement('div'); box.className = opt.presenter ? 'ds-pv' : 'ds-show'; document.body.appendChild(box); S.showing = true;
    if (!opt.reading && !opt.presenter) try { await box.requestFullscreen?.(); } catch {}
    let stage, nextBox, notesBox, timerBox;
    if (opt.presenter) {
      box.innerHTML = `<div class="timer" id="pvTime">00:00</div><div style="text-align:right"><button class="ui-btn sm" data-a="end">Kết thúc trình chiếu</button></div><div style="display:grid;place-items:center;background:#000;border-radius:8px;overflow:hidden" id="pvStage"><div class="stage"></div></div><div style="display:grid;grid-template-rows:auto 1fr;gap:12px;min-height:0"><div><div style="opacity:.6;margin-bottom:6px">Tiếp theo</div><div id="pvNext" style="background:#000;border-radius:6px;overflow:hidden"></div></div><div class="notes" id="pvNotes"></div></div><div style="grid-column:1/-1;display:flex;gap:8px;align-items:center"><button class="ui-btn sm" data-a="prev">◀ Trước</button><button class="ui-btn primary sm" data-a="next">Tiếp ▶</button><span id="pvNo" style="opacity:.7"></span></div>`;
      stage = $('#pvStage .stage', box); nextBox = $('#pvNext', box); notesBox = $('#pvNotes', box); timerBox = $('#pvTime', box);
    } else { box.innerHTML = `<div class="stage"></div><div class="bar"><button data-a="prev" title="Trước">◀</button><button data-a="next" title="Tiếp">▶</button><button data-a="pen" title="Bút">✎</button><button data-a="black" title="Màn hình đen (B)">■</button><button data-a="end" title="Kết thúc (Esc)">✕</button></div>${opt.rehearse ? '<div id="rhT" style="position:absolute;top:10px;left:12px;color:#fff;background:rgba(0,0,0,.5);padding:4px 10px;border-radius:6px;font-variant-numeric:tabular-nums"></div>' : ''}`; stage = $('.stage', box); }
    const fit = () => { const host = opt.presenter ? $('#pvStage', box) : box; const r = host.getBoundingClientRect(); const k = Math.min(r.width / deck().w, r.height / deck().h) / S.PX; return deck().w * S.PX * k; };
    let pen = null;
    async function show(dir) {
      S._showIndex = visible[pos]; if (S._onShowSlide) S._onShowSlide(visible[pos]);
      const s = deck().slides[visible[pos]]; const old = stage.firstElementChild; const n = document.createElement('div'); n.style.cssText = 'position:absolute;inset:0'; stage.appendChild(n);
      const pw = fit(); S.renderInto(n, s, deck(), pw); stage.style.width = pw + 'px'; stage.style.height = (pw * deck().h / deck().w) + 'px';
      // pre-hide entrance animations
      step = 0; for (const e of s.els) if (e.anim && isEntrance(e.anim.type)) { const node = n.querySelector(`.el[data-id="${e.id}"]`); if (node) node.style.opacity = 0; }
      if (dir !== 'back') await transition(stage, old, n, s.transition); else old?.remove();
      if (dir === 'back') { for (const e of s.els) { const node = n.querySelector(`.el[data-id="${e.id}"]`); if (node) node.style.opacity = ''; } step = steps(s).length; }
      $$('a', n).forEach((a) => { a.target = '_blank'; a.onclick = (ev) => { ev.preventDefault(); ev.stopPropagation(); try { aicw.openUrl(a.href); } catch (_) {} }; });
      // run "after previous" groups that start the slide
      if (opt.presenter) { const nx = deck().slides[visible[pos + 1]]; nextBox.innerHTML = ''; if (nx) { const d = document.createElement('div'); nextBox.appendChild(d); S.renderInto(d, nx, deck(), nextBox.clientWidth || 300); } else nextBox.innerHTML = '<div style="padding:30px;text-align:center;opacity:.6">Kết thúc</div>'; notesBox.textContent = s.notes || '(Không có ghi chú)'; $('#pvNo', box).textContent = `Slide ${visible[pos] + 1} / ${deck().slides.length}`; }
      S._showAudio?.forEach((a) => a.pause()); S._showAudio = opt.narrate ? [] : s.els.filter((e) => e.type === 'audio' && e.src && e.autoplay !== false).map((e) => { const a = new Audio(e.src); a.play().catch(() => {}); return a; });
      slideT0 = Date.now(); clearTimeout(timer); if (s.transition?.after && !opt.rehearse) timer = setTimeout(() => next(), s.transition.after * 1000);
      if (s.els.some((e) => e.anim && e.anim.start !== 'click' && steps(s)[0]?.[0] === e)) await playStep();
    }
    async function playStep() { const s = deck().slides[visible[pos]]; const g = steps(s)[step]; if (!g) return false; step++; const n = stage.lastElementChild; let prev = Promise.resolve(); for (const e of g) { const node = n.querySelector(`.el[data-id="${e.id}"]`); if (!node) continue; if (e.anim.start === 'after') await prev; node.style.opacity = ''; prev = animate(node, e.anim); } return true; }
    async function next() { const s = deck().slides[visible[pos]]; if (step < steps(s).length) return playStep(); if (opt.rehearse) times[visible[pos]] = Math.round((Date.now() - slideT0) / 1000); if (pos + 1 >= visible.length) { if (deck().loop) { pos = 0; return show(); } return end(); } pos++; return show(); }
    function prev() { if (pos <= 0) return; pos--; show('back'); }
    function end() {
      if (S._onShowEnd) setTimeout(() => S._onShowEnd && S._onShowEnd(), 0);
      clearTimeout(timer); clearInterval(tick); S.showing = false; S._showAudio?.forEach((a) => a.pause()); S._showAudio = []; removeEventListener('keydown', key, true); try { if (document.fullscreenElement) document.exitFullscreen(); } catch {} box.remove();
      if (opt.rehearse && Object.keys(times).length && confirm(`Tổng thời gian ${fmt(Date.now() - t0)}. Lưu thời gian từng slide để tự chuyển khi trình chiếu?`)) { S.push('rehearse'); for (const [i, sec] of Object.entries(times)) deck().slides[i].transition = { ...(deck().slides[i].transition || { type: 'fade' }), after: sec }; S.renderAll(); }
      if (!opt.reading) S.go(visible[pos] ?? st.cur);
    }
    const fmt = (ms) => { const s = Math.floor(ms / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
    const tick = setInterval(() => { if (timerBox) timerBox.textContent = fmt(Date.now() - t0); const r = $('#rhT', box); if (r) r.textContent = `${fmt(Date.now() - slideT0)} · tổng ${fmt(Date.now() - t0)}`; }, 500);
    function togglePen() { if (pen) { pen.remove(); pen = null; return; } pen = document.createElement('canvas'); pen.className = 'pen'; pen.width = stage.clientWidth; pen.height = stage.clientHeight; stage.appendChild(pen); const g = pen.getContext('2d'); g.strokeStyle = '#ff2d55'; g.lineWidth = 3; g.lineCap = 'round'; let down = false; pen.onpointerdown = (e) => { down = true; g.beginPath(); g.moveTo(e.offsetX, e.offsetY); e.stopPropagation(); }; pen.onpointermove = (e) => { if (down) { g.lineTo(e.offsetX, e.offsetY); g.stroke(); } }; pen.onpointerup = () => (down = false); }
    function key(e) { const k = e.key; if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter', 'n'].includes(k)) { e.preventDefault(); next(); } else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace', 'p'].includes(k)) { e.preventDefault(); prev(); } else if (k === 'Escape') { e.preventDefault(); end(); } else if (k === 'Home') { pos = 0; show(); } else if (k === 'End') { pos = visible.length - 1; show(); } else if (k === 'b' || k === '.') { stage.style.visibility = stage.style.visibility === 'hidden' ? '' : 'hidden'; } else if (k === 'w' || k === ',') { stage.style.filter = stage.style.filter ? '' : 'brightness(0) invert(1)'; } else if (/^\d$/.test(k)) { /* number jump */ } e.stopPropagation(); }
    addEventListener('keydown', key, true);
    box.addEventListener('click', (e) => { const a = e.target.closest('[data-a]'); if (a) { e.stopPropagation(); const v = a.dataset.a; if (v === 'next') next(); if (v === 'prev') prev(); if (v === 'end') end(); if (v === 'pen') togglePen(); if (v === 'black') stage.style.visibility = stage.style.visibility === 'hidden' ? '' : 'hidden'; return; } if (pen || opt.presenter) return; if (e.target.closest('a')) return; next(); });
    box.addEventListener('contextmenu', (e) => { e.preventDefault(); prev(); });
    let hideT; box.addEventListener('pointermove', () => { box.classList.add('cur'); clearTimeout(hideT); hideT = setTimeout(() => box.classList.remove('cur'), 1800); });
    addEventListener('resize', () => S.showing && show('back'), { once: true });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && S.showing && !opt.presenter && !opt.reading) end(); }, { once: true });
    show();
  };

  // ---------------- File backstage ----------------
  const FORMATS = [
    ['pptx', 'Bản trình chiếu PowerPoint', '.pptx — mặc định, mở được trên mọi PowerPoint 2007+, Keynote, Google Slides'],
    ['ppsx', 'Trình chiếu PowerPoint', '.ppsx — mở ra là chạy trình chiếu luôn'],
    ['potx', 'Mẫu PowerPoint', '.potx — dùng làm mẫu cho bản trình chiếu mới'],
    ['pptm', 'PowerPoint có macro', '.pptm'], ['ppsm', 'Trình chiếu có macro', '.ppsm'], ['potm', 'Mẫu có macro', '.potm'],
    ['ppt', 'PowerPoint 97-2003', '.ppt — cần LibreOffice trên máy, nếu không sẽ lưu .pptx'], ['pps', 'Trình chiếu 97-2003', '.pps'], ['pot', 'Mẫu 97-2003', '.pot'],
    ['odp', 'OpenDocument Presentation', '.odp — LibreOffice Impress'], ['otp', 'Mẫu OpenDocument', '.otp'],
    ['pdf', 'PDF', '.pdf — mỗi slide một trang'], ['png', 'Ảnh PNG', '.png — từng slide, tải về từng ảnh'], ['jpg', 'Ảnh JPEG', '.jpg — từng slide'],
    ['gif', 'GIF động', '.gif — cả bản trình chiếu thành ảnh động'], ['rtf', 'Dàn ý RTF', '.rtf — chỉ phần chữ'], ['txt', 'Dàn ý văn bản', '.txt'],
  ];
  const ACCEPT = '.pptx,.pptm,.potx,.potm,.ppsx,.ppsm,.ppt,.pps,.pot,.odp,.otp,.txt,.md,.json';
  S.backstage = (ev, page) => {
    S.commitEdit(); $('.ds-back')?.remove(); const b = document.createElement('div'); b.className = 'ds-back'; document.body.appendChild(b);
    const nav = [['new', 'Mới'], ['opn', 'Mở'], ['save', 'Lưu'], ['saveas', 'Lưu thành'], ['export', 'Xuất'], ['print', 'In'], ['info', 'Thông tin']];
    b.innerHTML = `<nav><button data-p="back" style="font-size:20px!important">←</button>${nav.map(([k, l]) => `<button data-p="${k}">${l}</button>`).join('')}</nav><section id="bsBody"></section>`;
    const body = $('#bsBody', b);
    const render = async (p) => {
      $$('nav button', b).forEach((x) => x.classList.toggle('on', x.dataset.p === p));
      if (p === 'back') return b.remove();
      if (p === 'save') { b.remove(); return S.cmd('save'); }
      if (p === 'print') { b.remove(); return S.print(); }
      if (p === 'new') { body.innerHTML = `<h2>Mới</h2><div class="ds-grid cards" style="grid-template-columns:repeat(auto-fill,minmax(180px,1fr))">${S.THEMES.map((t) => `<button class="ds-card" data-new="${t.id}"><div class="pv" style="height:100px;background:${t.grad ? `linear-gradient(${t.grad})` : t.bg};font-family:${t.head}"><div style="position:absolute;inset:0;display:grid;place-items:center;color:${t.title};font-size:20px">${t.name}</div><div style="position:absolute;left:0;right:0;bottom:0;height:5px;background:linear-gradient(90deg,${t.accents.join(',')})"></div></div>${t.name}</button>`).join('')}</div><h2 style="margin-top:26px">✨ Tạo bằng AI</h2><button class="ui-btn primary" data-ai>Tạo bản trình chiếu từ chủ đề…</button>`;
        body.onclick = async (e) => { const n = e.target.closest('[data-new]'); if (n) { if (st.dirty && !confirm('Bỏ bản đang soạn (đã tự lưu nháp) và tạo bản mới?')) return; const d = S.newDeck(); d.themeId = n.dataset.new; S.load(d, ''); b.remove(); } if (e.target.closest('[data-ai]')) { b.remove(); S.aiPanel(); } }; return; }
      if (p === 'opn') { let recent = []; try { recent = (await aicw.call('recent')).items || []; } catch {} body.innerHTML = `<h2>Mở</h2><div class="ds-drop" id="bsDrop">Kéo thả tệp PowerPoint vào đây<br><small>.pptx .pptm .ppsx .ppsm .potx .potm .ppt .pps .pot .odp .otp · dàn ý .txt .md</small><br><br><button class="ui-btn primary" id="bsPick">Chọn tệp…</button></div>${recent.length ? `<h6 style="color:var(--ds-muted)">GẦN ĐÂY (đã mở/lưu)</h6><ul class="ui-list">${recent.map((r) => `<li>${S.esc(r.name)} <small style="color:var(--ds-muted)">· ${new Date(r.at).toLocaleString()}</small></li>`).join('')}</ul>` : ''}`;
        $('#bsPick', body).onclick = () => S.pickAndOpen(null, () => b.remove()); const dz = $('#bsDrop', body); dz.ondragover = (e) => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over'); dz.ondrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) { b.remove(); S.openFile(f); } }; return; }
      if (p === 'saveas' || p === 'export') {
        const caps = await aicw.call('capabilities').catch(() => ({}));
        body.innerHTML = `<h2>${p === 'saveas' ? 'Lưu thành' : 'Xuất'}</h2><div style="margin-bottom:12px"><label class="ds-lbl">Tên tệp </label><input class="ui-input" id="bsName" style="max-width:360px" value="${S.esc(deck().title || 'Bản trình chiếu')}"></div><div class="ds-fmt">${FORMATS.filter(([k]) => p === 'saveas' ? !['png', 'jpg', 'gif', 'pdf', 'txt', 'rtf'].includes(k) : ['pdf', 'png', 'jpg', 'gif', 'rtf', 'txt', 'pptx', 'odp'].includes(k)).map(([k, l, d]) => `<button data-fmt="${k}"><span class="ext">.${k}</span><span>${l}<small>${d}${['ppt', 'pps', 'pot'].includes(k) && !caps.soffice ? ' ⚠️ máy này chưa có LibreOffice' : ''}</small></span></button>`).join('')}</div>`;
        body.onclick = async (e) => { const f = e.target.closest('[data-fmt]'); if (!f) return; const nm = $('#bsName', body).value.trim(); if (nm) deck().title = nm; b.remove(); await S.saveAs(f.dataset.fmt); }; return; }
      if (p === 'info') { const n = deck().slides.length; const words = deck().slides.reduce((a, s) => a + s.els.reduce((x, e) => x + (e.text?.paras || []).reduce((y, pp) => y + pp.runs.map((r) => r.t).join('').split(/\s+/).filter(Boolean).length, 0), 0), 0); body.innerHTML = `<h2>Thông tin</h2><div class="ui-grid cols-3"><div class="ui-kpi"><div class="ui-kpi-label">Số slide</div><div class="ui-kpi-value">${n}</div></div><div class="ui-kpi"><div class="ui-kpi-label">Số từ</div><div class="ui-kpi-value">${words}</div></div><div class="ui-kpi"><div class="ui-kpi-label">Kích thước</div><div class="ui-kpi-value">${(deck().w / 72).toFixed(2)}×${(deck().h / 72).toFixed(2)}"</div></div></div><p style="color:var(--ds-muted)">Tệp: ${S.esc(st.fileName || '(chưa lưu)')} · Chủ đề: ${S.esc(S.theme(deck()).name)}</p>`; return; }
    };
    b.addEventListener('click', (e) => { const n = e.target.closest('[data-p]'); if (n) render(n.dataset.p); });
    b.addEventListener('keydown', (e) => { if (e.key === 'Escape') b.remove(); });
    render(page && page !== 'opn' && page !== 'o' + 'pen' ? page : 'opn');
  };
  S.pickAndOpen = async (_ev, done) => { const f = await S.pickLocal(ACCEPT); if (f[0]) { done && done(); S.openFile(f[0]); } };
  S.openFile = async (file, append) => {
    S.toast(`Đang mở ${file.name}…`, 1500);
    try {
      const up = await aicw.files.upload(file); const r = await aicw.call('openFile', { fileId: up.id, name: file.name }); S.engineBug(r);
      if (append) { S.push('reuse'); r.deck.slides.forEach((s) => deck().slides.push(s)); S.renderAll(); return S.toast(`Đã thêm ${r.deck.slides.length} slide`); }
      S.load(r.deck, file.name); if (r.warnings?.length) S.toast(r.warnings.join(' · '), 5000);
    } catch (e) { S.toast('Không mở được: ' + (e.message || e), 5000); }
  };
  // Engine decks: the DeckCraft engine draws each slide's backdrop (background, master/layout art and
  // every shape the editor cannot edit natively); the editor draws editable shapes on top.
  const editableIds = (sl) => sl.els.filter((e) => e.dc != null && e.type !== 'engine').map((e) => e.dc);
  S.refreshBackdrop = async (i, withEdits) => {
    const d = S.deck(); const sl = d.slides[i]; if (!d.engineKey || !sl) return;
    try {
      const args = { engineKey: d.engineKey, index: i, width: 1600, skip: editableIds(sl) };
      if (withEdits) args.deck = { ...d, slides: d.slides.map((x, k) => (k === i ? x : { dc: x.dc, els: x.els.filter((e) => e.dc != null).map((e) => ({ dc: e.dc, osig: e.osig, dsig: e.dsig, tsig: e.tsig, type: e.type, x: e.x, y: e.y, w: e.w, h: e.h })) })).map((x) => ({ ...x, backdrop: undefined })) };
      const r = await aicw.call('renderBackdrop', args); sl.backdrop = r.png;
      if (S.st.cur === i) S.renderCanvas(); S.renderThumb(i);
    } catch (e) { console.warn('backdrop', e); }
  };
  S.loadBackdrops = async () => { const d = S.deck(); if (!d.engineKey) return; const order = [S.st.cur, ...d.slides.map((_, i) => i).filter((i) => i !== S.st.cur)]; for (const i of order) { if (S.deck() !== d) return; await S.refreshBackdrop(i); } };
  S.load = (d, name) => { setTimeout(() => S.loadBackdrops(), 0); d.slides = d.slides?.length ? d.slides : [S.newSlide(d, 'Title Slide')]; d.w = d.w || 960; d.h = d.h || 540; d.sections = d.sections || []; if (!d.themeId) d.themeId = d.theme ? undefined : 'office'; st.deck = d; st.cur = 0; st.sel = []; st.undo = []; st.redo = []; st.fileName = name || ''; st.dirty = false; st.view = 'normal'; S.leaveSorter(); S.renderAll(); S.autosave(); };
  async function slideImages(type = 'image/jpeg', px = 1600) { const out = []; for (let i = 0; i < deck().slides.length; i++) { if (deck().slides[i].hidden && type === 'image/jpeg') continue; out.push(await S.rasterize(deck().slides[i], deck(), px, type, .9)); } return out; }
  S.saveAs = async (fmt) => {
    S.commitEdit(); const title = deck().title || 'Bản trình chiếu';
    try {
      if (fmt === 'png' || fmt === 'jpg') { const mime = fmt === 'png' ? 'image/png' : 'image/jpeg'; const imgs = []; for (let i = 0; i < deck().slides.length; i++) imgs.push(await S.rasterize(deck().slides[i], deck(), 1920, mime)); for (let i = 0; i < imgs.length; i++) { const blob = await (await fetch(imgs[i])).blob(); await aicw.download(`${title} - Slide ${i + 1}.${fmt}`, blob); } return S.toast(`Đã xuất ${imgs.length} ảnh`); }
      if (fmt === 'gif') return S.exportGif();
      S.toast(fmt === 'pdf' ? 'Đang dựng PDF…' : 'Đang lưu…', 1500);
      const args = { format: fmt, deck: exportDeck() }; if (fmt === 'pdf') args.images = await slideImages();
      // charts are written as native, editable PowerPoint charts by the backend
      const r = await aicw.call('save', args); S.engineBug(r);
      st.fileName = r.name; st.dirty = false; $('#dsSaved').textContent = 'Đã lưu ' + new Date().toLocaleTimeString();
      if (r.warnings?.length) S.toast(r.warnings.join(' '), 6000);
      try { await aicw.files.download(r.id); } catch { aicw.openUrl(r.url); }
      S.toast(`Đã lưu ${r.name}`);
    } catch (e) { S.toast('Lưu lỗi: ' + (e.message || e), 6000); }
  };
  // PowerPoint charts are written as pictures of the chart (PNG) so every viewer shows them identically.
  async function rasterCharts(d) { for (const s of d.slides) for (const e of s.els) if (e.type === 'chart') { const tmp = { els: [{ ...e, x: 0, y: 0 }], bg: { color: '#ffffff' } }; e.png = await S.rasterize(tmp, { ...d, w: e.w, h: e.h }, Math.round(e.w * 3), 'image/png'); } }
  function exportDeck() { const d = S.clone(deck()); const t = S.theme(d); d.theme = { name: t.name, font: t.font, headFont: t.head, colors: Object.fromEntries([['dk1', t.fg], ['lt1', t.bg], ['dk2', t.title], ['lt2', '#e7e6e6'], ...t.accents.map((c, i) => ['accent' + (i + 1), c])].map(([k, v]) => [k, v.replace('#', '')])) };
    for (const s of d.slides) { if (!s.bg) s.bg = t.grad ? { grad: t.grad } : { color: t.bg }; s.els = s.els.filter((e) => !(e.ph && !(e.text?.paras || []).some((p) => p.runs.some((r) => r.t))) || e.type === 'image'); for (const e of s.els) { if (e.text) { const base = e.type === 'shape' ? (e.fill && /^#(f|e)/i.test(e.fill) ? '#1f2937' : '#ffffff') : e.ph === 'title' ? t.title : t.fg; e.text.color = e.text.color || base; e.text.font = e.text.font || (e.ph === 'title' ? t.head : t.font); } if (e.type === 'table' && !e.accent) e.accent = t.accents[1]; if (e.type === 'line' && !e.line) e.line = { color: t.fg, w: 2 }; } }
    return d; }
  S.exportPdf = () => S.saveAs('pdf');
  S.print = async () => { S.toast('Đang chuẩn bị bản in…'); const imgs = await slideImages('image/jpeg', 1600); return S.saveAs('pdf'); w.document.write(`<title>${S.esc(deck().title)}</title><style>@page{size:${deck().w}pt ${deck().h}pt;margin:0}body{margin:0}img{width:100vw;display:block;page-break-after:always}</style>${imgs.map((i) => `<img src="${i}">`).join('')}<script>onload=()=>print()<\/script>`); w.document.close(); };
  S.exportGif = async () => {
    S.toast('Đang tạo GIF động…'); const px = 640; const imgs = []; for (const s of deck().slides) if (!s.hidden) imgs.push(await S.rasterize(s, deck(), px, 'image/png'));
    const h = Math.round(px * deck().h / deck().w); const frames = []; for (const src of imgs) { const im = new Image(); im.src = src; await im.decode(); const cv = document.createElement('canvas'); cv.width = px; cv.height = h; const g = cv.getContext('2d'); g.drawImage(im, 0, 0); frames.push(g.getImageData(0, 0, px, h).data); }
    const gif = encodeGif(frames, px, h, 250); await aicw.download(`${deck().title || 'slides'}.gif`, new Blob([gif], { type: 'image/gif' })); S.toast('Đã xuất GIF');
  };
  // tiny GIF encoder (uniform 6x6x6 palette + LZW) — no library needed
  function encodeGif(frames, w, h, delayCs) {
    const out = []; const b = (...x) => out.push(...x); const w16 = (v) => b(v & 255, v >> 8);
    b(...'GIF89a'.split('').map((c) => c.charCodeAt(0))); w16(w); w16(h); b(0xf7, 0, 0);
    for (let i = 0; i < 256; i++) { if (i < 216) b(Math.floor(i / 36) * 51, Math.floor(i / 6) % 6 * 51, i % 6 * 51); else b(0, 0, 0); }
    b(0x21, 0xff, 11, ...'NETSCAPE2.0'.split('').map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
    for (const px of frames) {
      b(0x21, 0xf9, 4, 0, delayCs & 255, delayCs >> 8, 0, 0); b(0x2c); w16(0); w16(0); w16(w); w16(h); b(0);
      const idx = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) idx[i] = Math.round(px[i * 4] / 51) * 36 + Math.round(px[i * 4 + 1] / 51) * 6 + Math.round(px[i * 4 + 2] / 51);
      const minCode = 8; b(minCode); const clear = 256, eoi = 257; let size = 9, next = 258; let dict = new Map(); const bytes = []; let cur = 0, nb = 0;
      const emit = (code) => { cur |= code << nb; nb += size; while (nb >= 8) { bytes.push(cur & 255); cur >>= 8; nb -= 8; } };
      emit(clear); let prefix = idx[0];
      for (let i = 1; i < idx.length; i++) { const k = idx[i]; const key = prefix * 256 + k; const v = dict.get(key); if (v !== undefined) { prefix = v; continue; } emit(prefix); if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; } else { emit(clear); dict = new Map(); size = 9; next = 258; } prefix = k; }
      emit(prefix); emit(eoi); if (nb > 0) bytes.push(cur & 255);
      for (let i = 0; i < bytes.length; i += 255) { const ch = bytes.slice(i, i + 255); b(ch.length, ...ch); } b(0);
    }
    b(0x3b); return new Uint8Array(out);
  }
  // the engine hit a code bug but the user got a fallback result: tell the platform (bug ledger -> self-healing)
  S.engineBug = (r) => { if (r && r.engineBug) aicw.call('reportEngineBug').catch(() => {}); };
  S.autosave = async () => { try { await aicw.call('saveDraft', { deck: deck() }); const s = $('#dsSaved'); if (s) s.textContent = 'Đã tự lưu ' + new Date().toLocaleTimeString(); } catch {} };
  S.outlineDialog = () => { const d = aiBox('Slide từ dàn ý', `<small style="color:var(--ds-muted)">Mỗi dòng không thụt lề = một slide mới (tiêu đề); dòng bắt đầu bằng "-" hoặc thụt lề = gạch đầu dòng.</small><textarea class="ui-textarea" id="olT" style="min-height:180px" placeholder="Giới thiệu&#10;- Chúng tôi là ai&#10;- Sứ mệnh&#10;Sản phẩm&#10;- Tính năng chính"></textarea><div class="row"><button class="ui-btn primary sm" id="olGo">Thêm vào bản trình chiếu</button><button class="ui-btn ghost sm" data-x>Đóng</button></div>`); $('#olGo', d).onclick = async () => { const r = await aicw.call('fromOutline', { text: $('#olT', d).value }); S.push('outline'); applyGenerated(r.deck.slides.map((s) => ({ title: s.els[0]?.text.paras[0].runs[0]?.t || '', bullets: (s.els[1]?.text.paras || []).map((p) => p.runs[0]?.t || '') })), true); d.remove(); }; };

  // ---------------- AI ----------------
  function aiBox(title, inner) { $('.ds-aipanel')?.remove(); const d = document.createElement('div'); d.className = 'ds-aipanel'; d.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><b>${title}</b><button class="ds-ico" data-x>✕</button></div>${inner}`; document.body.appendChild(d); d.addEventListener('click', (e) => { if (e.target.closest('[data-x]')) d.remove(); }); return d; }
  const hasAI = () => { try { return aicw.has('ai'); } catch { return false; } };
  const needAI = () => { if (!hasAI()) { S.toast('Tính năng này cần mô hình AI — chọn một mô hình ở nút chọn mô hình góc trên.', 5000); return true; } return false; };
  async function llmJson(prompt, schemaHint) {
    const r = await aicw.llm({ messages: [{ role: 'system', content: 'You are a presentation designer. Reply with ONLY valid JSON, no prose, no code fences.' }, { role: 'user', content: prompt + '\n\nJSON shape: ' + schemaHint }], json: true });
    if (r.json) return r.json; const t = String(r.text || '').replace(/^```(json)?|```$/gm, '').trim(); const m = t.match(/[\[{][\s\S]*[\]}]/); return JSON.parse(m ? m[0] : t);
  }
  function deckOutline() { return deck().slides.map((s, i) => `Slide ${i + 1}: ` + s.els.map((e) => (e.text?.paras || []).map((p) => p.runs.map((r) => r.t).join('')).join(' / ')).filter(Boolean).join(' | ')).join('\n'); }
  // turn [{title, bullets, notes, layout, visual}] into real slides with the current theme
  function applyGenerated(items, append) {
    const t = S.theme(deck()); const Wd = deck().w, Hd = deck().h; const out = [];
    items.forEach((it, i) => {
      const lay = i === 0 && !append ? 'Title Slide' : it.layout === 'section' ? 'Section Header' : it.layout === 'two' && (it.bullets || []).length > 3 ? 'Two Content' : it.layout === 'quote' ? 'Quote' : 'Title and Content';
      const s = S.newSlide(deck(), lay); s.notes = it.notes || '';
      const ti = s.els.find((e) => e.ph === 'title'); if (ti) ti.text.paras = [{ ...ti.text.paras[0], runs: [{ t: it.title || '' }] }];
      const sub = s.els.find((e) => e.ph === 'subtitle'); const bodies = s.els.filter((e) => e.ph === 'body');
      const bl = (it.bullets || []).map((x) => (typeof x === 'string' ? { t: x, level: 0 } : { t: x.text || x.t || '', level: x.level || 0 }));
      if (lay === 'Title Slide' || lay === 'Section Header' || lay === 'Quote') { if (sub) sub.text.paras = [{ ...sub.text.paras[0], runs: [{ t: it.subtitle || bl.map((b) => b.t).join(' · ') }] }]; }
      else if (bodies.length === 2) { const h = Math.ceil(bl.length / 2); [bl.slice(0, h), bl.slice(h)].forEach((part, k) => (bodies[k].text.paras = part.map((b) => ({ bullet: 'bullet', level: b.level, runs: [{ t: b.t }] })))); }
      else if (bodies[0]) { bodies[0].text.paras = bl.length ? bl.map((b) => ({ bullet: 'bullet', level: b.level, runs: [{ t: b.t }] })) : [{ runs: [] }]; if (bl.length > 6) bodies[0].text.size = 20; }
      // a small accent so generated decks are not plain
      if (lay === 'Title Slide') s.els.push({ id: S.uid(), type: 'shape', shape: 'rect', x: 0, y: Hd - 14, w: Wd, h: 14, grad: [t.accents[0], t.accents[1], t.accents[2]], gradDir: 'h', line: null });
      else if (lay === 'Section Header') s.bg = { color: t.accents[1] }, s.els.forEach((e) => e.text && e.text.paras.forEach((p) => p.runs.forEach((r) => (r.color = '#ffffff'))));
      else s.els.push({ id: S.uid(), type: 'shape', shape: 'rect', x: Wd * .06, y: Hd * .225, w: 64, h: 4, fill: t.accents[0], line: null });
      s.transition = { type: 'fade', dur: .6 }; out.push(s);
    });
    if (append) deck().slides.splice(st.cur + 1, 0, ...out), st.cur++; else { deck().slides = out; st.cur = 0; }
    S.renderAll();
  }
  S.aiPanel = () => {
    const d = aiBox('✨ AI Slide', `<div class="ui-tabs pills" style="display:flex;gap:4px"><button class="ui-tab active" data-m="gen">Tạo bản trình chiếu</button><button class="ui-tab" data-m="slide">Thêm slide</button><button class="ui-tab" data-m="edit">Sửa chữ</button></div>
      <div data-pane="gen"><textarea class="ui-textarea" id="aiTopic" placeholder="Chủ đề, ví dụ: Giới thiệu sản phẩm AI Coworker cho khách hàng doanh nghiệp, 8 slide, giọng chuyên nghiệp"></textarea><div class="row"><label class="ds-lbl">Số slide <input class="ds-num" type="number" id="aiN" value="8" min="3" max="25"></label><label class="ds-lbl">Ngôn ngữ <select class="ds-sel" style="width:110px" id="aiLang"><option>Tiếng Việt</option><option>English</option></select></label><label class="ds-lbl"><input type="checkbox" id="aiNotes" checked> Ghi chú người nói</label></div><button class="ui-btn primary" id="aiGo">Tạo</button></div>
      <div data-pane="slide" hidden><textarea class="ui-textarea" id="aiOne" placeholder="Nội dung slide cần thêm, ví dụ: So sánh 3 gói giá Basic/Pro/Team"></textarea><button class="ui-btn primary" id="aiOneGo">Thêm slide sau slide hiện tại</button></div>
      <div data-pane="edit" hidden><small style="color:var(--ds-muted)">Chọn hộp chữ trên slide (hoặc không chọn gì = cả slide), rồi:</small><div class="row">${[['improve', 'Viết hay hơn'], ['shorter', 'Ngắn gọn hơn'], ['longer', 'Chi tiết hơn'], ['spell', 'Sửa chính tả'], ['translate', 'Dịch Anh ↔ Việt'], ['notes', 'Viết ghi chú người nói']].map(([k, l]) => `<button class="ui-btn sm" data-rw="${k}">${l}</button>`).join('')}</div></div>
      <div id="aiStat" class="ds-lbl"></div>`);
    d.addEventListener('click', (e) => { const m = e.target.closest('[data-m]'); if (m) { $$('[data-m]', d).forEach((x) => x.classList.toggle('active', x === m)); $$('[data-pane]', d).forEach((p) => (p.hidden = p.dataset.pane !== m.dataset.m)); } const rw = e.target.closest('[data-rw]'); if (rw) S.aiRewrite(rw.dataset.rw); });
    $('#aiGo', d).onclick = async () => {
      if (needAI()) return; const topic = $('#aiTopic', d).value.trim(); if (!topic) return; const n = +$('#aiN', d).value || 8; const lang = $('#aiLang', d).value;
      $('#aiStat', d).textContent = 'AI đang viết dàn ý… (xem tiến trình trong chat của app)'; $('#aiGo', d).disabled = true;
      try {
        const j = await llmJson(`Create a ${n}-slide presentation about: ${topic}\nWrite in ${lang}. First slide is the title slide (title + subtitle). Use "section" layout for at most 1-2 divider slides, "two" for comparisons. 3-6 concise bullets per content slide (max ~12 words each).${$('#aiNotes', d).checked ? ' Add 2-4 sentence speaker notes per slide.' : ''}`, '{"title":"deck title","slides":[{"layout":"title|content|two|section|quote","title":"...","subtitle":"...","bullets":["..."],"notes":"..."}]}');
        const items = (j.slides || j).slice(0, 30); if (!items.length) throw new Error('AI không trả về slide nào'); S.push('ai'); if (j.title) deck().title = j.title; applyGenerated(items, false); d.remove(); S.toast(`AI đã tạo ${items.length} slide`);
      } catch (e) { $('#aiStat', d).textContent = 'Lỗi: ' + (e.message || e); } finally { const g = $('#aiGo', d); if (g) g.disabled = false; }
    };
    $('#aiOneGo', d).onclick = async () => { if (needAI()) return; const q = $('#aiOne', d).value.trim(); if (!q) return; $('#aiStat', d).textContent = 'AI đang viết…'; try { const j = await llmJson(`Context of the deck:\n${deckOutline().slice(0, 4000)}\n\nWrite ONE new slide: ${q}. Same language as the deck.`, '{"layout":"content|two|quote","title":"...","bullets":["..."],"notes":"..."}'); S.push('ai1'); applyGenerated([j.slides ? j.slides[0] : j], true); $('#aiStat', d).textContent = 'Đã thêm.'; } catch (e) { $('#aiStat', d).textContent = 'Lỗi: ' + (e.message || e); } };
  };
  S.aiRewrite = async (mode) => {
    if (needAI()) return; S.commitEdit(); const targets = (S.selEls().length ? S.selEls() : slide().els).filter((e) => e.text && e.text.paras.some((p) => p.runs.some((r) => r.t)));
    if (mode === 'notes') { S.toast('AI đang viết ghi chú…'); try { const j = await llmJson(`Slide content:\n${slide().els.map((e) => (e.text?.paras || []).map((p) => p.runs.map((r) => r.t).join('')).join('\n')).join('\n')}\n\nWrite 3-5 sentences of natural speaker notes for presenting this slide, same language.`, '{"notes":"..."}'); S.push('notes'); slide().notes = j.notes || ''; S.renderAll(); return S.toast('Đã viết ghi chú'); } catch (e) { return S.toast('Lỗi AI: ' + e.message); } }
    if (!targets.length) return S.toast('Slide này chưa có chữ để sửa');
    const blocks = targets.map((e) => e.text.paras.map((p) => p.runs.map((r) => r.t).join('')));
    const how = { improve: 'Rewrite to be clearer and more compelling for a presentation, keep meaning and language.', shorter: 'Make each line shorter and punchier, keep language.', longer: 'Expand slightly with more concrete detail, keep language.', spell: 'Fix spelling, grammar and Vietnamese diacritics only. Change nothing else.', translate: 'Translate: Vietnamese -> English, any other -> Vietnamese.' }[mode];
    S.toast('AI đang xử lý…');
    try { const j = await llmJson(`${how}\nKeep the SAME number of blocks and the SAME number of lines in each block.\nBlocks:\n${JSON.stringify(blocks)}`, '{"blocks":[["line", "..."]]}'); const nb = j.blocks || j; if (!Array.isArray(nb) || nb.length !== blocks.length) throw new Error('AI trả về sai cấu trúc');
      S.push('rewrite'); targets.forEach((e, i) => { const lines = nb[i] || []; e.text.paras = e.text.paras.map((p, k) => ({ ...p, runs: [{ ...(p.runs[0] || {}), t: String(lines[k] ?? p.runs.map((r) => r.t).join('')) }] })); for (let k = e.text.paras.length; k < lines.length; k++) e.text.paras.push({ ...e.text.paras[e.text.paras.length - 1], runs: [{ t: lines[k] }] }); }); S.refresh(); S.toast('Xong'); } catch (e) { S.toast('Lỗi AI: ' + (e.message || e), 5000); }
  };
  S.aiSummary = async () => { if (needAI()) return; S.toast('AI đang tóm tắt…'); try { const r = await aicw.llm(`Tóm tắt bản trình chiếu sau trong 5 gạch đầu dòng, cùng ngôn ngữ với nội dung:\n${deckOutline().slice(0, 8000)}`); aiBox('Tóm tắt', `<div style="white-space:pre-wrap;user-select:text;max-height:50vh;overflow:auto">${S.esc(r.text)}</div><div class="row"><button class="ui-btn sm" id="smAdd">Thêm thành slide tóm tắt</button></div>`); $('#smAdd').onclick = () => { S.push('sum'); applyGenerated([{ title: 'Tóm tắt', bullets: r.text.split('\n').map((l) => l.replace(/^[\s\-*•\d.]+/, '').trim()).filter(Boolean).slice(0, 7) }], true); $('.ds-aipanel')?.remove(); }; } catch (e) { S.toast('Lỗi AI: ' + e.message); } };
  S.aiImage = () => { const d = aiBox('✨ Tạo ảnh bằng AI', `<div id="imPick"></div><textarea class="ui-textarea" id="imP" placeholder="Mô tả ảnh, ví dụ: văn phòng hiện đại tông cam, ánh sáng tự nhiên, phong cách ảnh chụp"></textarea><div class="row"><select class="ds-sel" id="imS"><option value="landscape">Ngang 16:9</option><option value="square">Vuông</option><option value="portrait">Dọc</option></select><button class="ui-btn primary sm" id="imGo">Tạo ảnh</button></div><div id="imSt" class="ds-lbl"></div>`); const pk = document.getElementById('ds-media-picker'); if (pk) { pk.style.display = ''; $('#imPick', d).appendChild(pk); new MutationObserver((m, o) => { if (!d.isConnected) { pk.style.display = 'none'; document.body.appendChild(pk); o.disconnect(); } }).observe(document.body, { childList: true });}
    $('#imGo', d).onclick = async () => { const p = $('#imP', d).value.trim(); if (!p) return; $('#imSt', d).textContent = 'Đang tạo ảnh…'; try { const r = await aicw.image({ prompt: p, shape: $('#imS', d).value, engine: window.AicwApp?.mediaEngine ? AicwApp.mediaEngine('image') : undefined }); const f = r.files?.[0]; if (!f) throw new Error('Không nhận được ảnh'); const blob = await (await fetch(f.url)).blob(); const src = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); }); await S.insertImageSrc(src); $('#imSt', d).textContent = r.quota != null ? `Xong · còn ${r.quota}% hạn mức` : 'Xong'; } catch (e) { $('#imSt', d).textContent = 'Lỗi: ' + (e.message || e); } }; };
  // Design Ideas: code-made alternative layouts of the current slide (no model needed)
  S.designIdeas = (btn) => {
    const s = slide(); const t = S.theme(deck()); const Wd = deck().w, Hd = deck().h;
    const title = s.els.find((e) => e.ph === 'title') || s.els.find((e) => e.text); const body = s.els.filter((e) => e !== title && e.text && e.type === 'text'); const pics = s.els.filter((e) => e.type === 'image');
    const tTxt = title ? S.clone(title.text) : { size: 40, paras: [{ runs: [{ t: 'Tiêu đề' }] }] }; const bTxt = body[0] ? S.clone(body[0].text) : null;
    const T = (o) => ({ id: S.uid(), type: 'text', ph: 'title', ...o }); const B = (o) => ({ id: S.uid(), type: 'text', ph: 'body', ...o });
    const ideas = [
      () => ({ bg: { color: t.accents[1] }, els: [T({ x: Wd * .07, y: Hd * .1, w: Wd * .86, h: Hd * .2, text: { ...tTxt, color: '#fff', valign: 'middle' } }), ...(bTxt ? [B({ x: Wd * .07, y: Hd * .34, w: Wd * .86, h: Hd * .56, text: { ...bTxt, color: '#ffffff' } })] : [])] }),
      () => ({ bg: { color: t.bg }, els: [{ id: S.uid(), type: 'shape', shape: 'rect', x: 0, y: 0, w: Wd * .36, h: Hd, fill: t.accents[0] }, T({ x: Wd * .03, y: Hd * .1, w: Wd * .3, h: Hd * .8, text: { ...tTxt, color: '#fff', valign: 'middle', size: Math.min(36, tTxt.size || 36) } }), ...(bTxt ? [B({ x: Wd * .41, y: Hd * .1, w: Wd * .54, h: Hd * .8, text: { ...bTxt, valign: 'middle' } })] : [])] }),
      () => ({ bg: { grad: [S.mix(t.accents[2], .1), t.accents[1]] }, els: [T({ x: Wd * .1, y: Hd * .08, w: Wd * .8, h: Hd * .2, text: { ...tTxt, color: '#fff', valign: 'middle', paras: tTxt.paras.map((p) => ({ ...p, align: 'center' })) } }), ...(bTxt ? [{ id: S.uid(), type: 'shape', shape: 'roundRect', x: Wd * .1, y: Hd * .33, w: Wd * .8, h: Hd * .58, fill: '#ffffff', shadow: 1, text: { ...bTxt, valign: 'middle', color: '#1f2937' } }] : [])] }),
      () => { const items = (bTxt?.paras || []).filter((p) => p.runs.some((r) => r.t)).slice(0, 4); const n = Math.max(1, items.length); const gw = (Wd * .86 - (n - 1) * 16) / n; return { bg: { color: t.bg }, els: [T({ x: Wd * .07, y: Hd * .07, w: Wd * .86, h: Hd * .18, text: { ...tTxt, valign: 'middle' } }), ...items.map((p, i) => ({ id: S.uid(), type: 'shape', shape: 'roundRect', x: Wd * .07 + i * (gw + 16), y: Hd * .35, w: gw, h: Hd * .48, fill: t.accents[i % 6], text: { size: n > 3 ? 16 : 20, valign: 'middle', paras: [{ align: 'center', runs: [{ t: p.runs.map((r) => r.t).join(''), color: '#ffffff', b: 1 }] }] } }))] }; },
      () => ({ bg: { color: '#111111' }, els: [T({ x: Wd * .08, y: Hd * .3, w: Wd * .84, h: Hd * .3, text: { ...tTxt, color: '#ffffff', size: Math.max(44, tTxt.size || 44), valign: 'middle', paras: tTxt.paras.map((p) => ({ ...p, align: 'center' })) } }), { id: S.uid(), type: 'shape', shape: 'rect', x: Wd / 2 - 40, y: Hd * .64, w: 80, h: 4, fill: t.accents[0] }] }),
      () => ({ bg: { color: t.bg }, els: [...(pics[0] ? [{ ...S.clone(pics[0]), id: S.uid(), x: Wd * .52, y: 0, w: Wd * .48, h: Hd, crop: undefined }] : [{ id: S.uid(), type: 'shape', shape: 'rect', x: Wd * .52, y: 0, w: Wd * .48, h: Hd, grad: [t.accents[0], t.accents[2]] }]), T({ x: Wd * .05, y: Hd * .1, w: Wd * .43, h: Hd * .25, text: { ...tTxt, valign: 'bottom' } }), ...(bTxt ? [B({ x: Wd * .05, y: Hd * .4, w: Wd * .43, h: Hd * .5, text: bTxt })] : [])] }),
    ];
    const p = S.pop(btn, `<h6>Ý tưởng thiết kế cho slide ${st.cur + 1}</h6><div class="ds-grid" style="grid-template-columns:repeat(2,200px);gap:8px">${ideas.map((_, i) => `<button class="ds-card" data-v="${i}" style="padding:3px"><div class="pv" data-idea="${i}" style="height:${200 * Hd / Wd}px"></div></button>`).join('')}</div>`, (v) => { S.push('idea'); const r = ideas[+v](); const keep = s.els.filter((e) => e !== title && !body.includes(e) && !(e.type === 'image' && r.els.some((x) => x.src === e.src)) && e.type !== 'text' && !(e.type === 'shape' && !e.text)); s.bg = r.bg; s.els = [...r.els, ...keep]; S.select([]); S.refresh(); });
    $$('[data-idea]', p).forEach((n) => { const r = ideas[+n.dataset.idea](); S.renderInto(n, { ...r }, deck(), 200); });
  };
})();

;(function () {
  const S = window.Slide;
  S.recordNarration = async () => {
    let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { return S.toast('Không mở được micro: ' + (e.message || e) + ' — hãy cho phép AICoworker dùng micro trong Cài đặt hệ thống.', 6000); }
    const mime = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || '';
    const deck = S.deck(); const clips = {}; let rec = null, chunks = [], cur = null, t0 = 0;
    const startClip = (i) => { cur = i; chunks = []; t0 = Date.now(); rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); rec.ondataavailable = (e) => e.data.size && chunks.push(e.data); rec.start(); };
    const stopClip = () => new Promise((res) => { if (!rec || rec.state === 'inactive') return res(); const i = cur, dur = (Date.now() - t0) / 1000; rec.onstop = async () => { const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' }); const src = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); }); clips[i] = { src, dur }; res(); }; rec.stop(); });
    S.toast('🎙 Đang ghi — nói thuyết minh cho từng slide, bấm → để sang slide, Esc để kết thúc', 5000);
    // hook slide changes of the slideshow
    const obs = { disconnect() {} };
    S._onShowSlide = async (i) => { if (i !== cur) { await stopClip(); startClip(i); } };
    S._onShowEnd = async () => {
      await stopClip(); stream.getTracks().forEach((t) => t.stop()); obs.disconnect(); S._onShowSlide = S._onShowEnd = null;
      const keys = Object.keys(clips); if (!keys.length) return;
      S.push('narration');
      for (const k of keys) { const s = deck.slides[+k]; s.els = s.els.filter((e) => !(e.type === 'audio' && e.narration)); s.els.push({ id: S.uid(), type: 'audio', narration: 1, name: 'Thuyết minh', src: clips[k].src, x: deck.w - 52, y: deck.h - 52, w: 36, h: 36 }); s.transition = { ...(s.transition || { type: 'fade', dur: .6 }), after: Math.max(1, Math.round(clips[k].dur)) }; }
      S.renderAll(); S.toast(`Đã ghi thuyết minh cho ${keys.length} slide — trình chiếu sẽ tự phát và tự chuyển slide.`, 5000);
    };
    S.slideshow(S.st.cur, { rehearse: false, narrate: true });
  };
})();
