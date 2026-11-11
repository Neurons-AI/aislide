/* AI Slide — Google Fonts: searchable picker in the ribbon, @font-face loaded on demand,
   every font a deck uses is fetched automatically (backend caches the files once per computer). */
(function () {
  const S = window.Slide; const $ = (q, r = document) => r.querySelector(q);
  const T = (s) => (S.T ? S.T(s) : s);
  // fonts every computer has (or that Office maps): shown under "Trên máy này", never fetched
  const SYSTEM = ['Arial', 'Calibri', 'Cambria', 'Courier New', 'Georgia', 'Helvetica', 'Segoe UI', 'Tahoma', 'Times New Roman', 'Trebuchet MS', 'Verdana', 'Comic Sans MS', 'Aptos', 'Aptos Display', 'Calibri Light'];
  const RECENT_KEY = 'fontRecent';
  const loaded = new Map(); // family -> Promise
  let catalog = null; let catalogP = null;

  S.fontCatalog = () => catalogP || (catalogP = aicw.call('fontList', { limit: 5000 }).then((r) => (catalog = r.items)).catch(() => (catalog = [])));
  // Load one Google family into the page (no-op for system fonts / already loaded / not on Google)
  S.loadFont = (family) => {
    if (!family || SYSTEM.some((f) => f.toLowerCase() === String(family).toLowerCase())) return Promise.resolve(false);
    if (loaded.has(family)) return loaded.get(family);
    const p = aicw.call('fontFaces', { family }).then(async (r) => {
      for (const f of r.faces) { const ff = new FontFace(family, `url(${f.data})`, { weight: String(f.weight), style: f.style }); await ff.load(); document.fonts.add(ff); }
      return true;
    }).catch(() => false);
    loaded.set(family, p); return p;
  };
  // every font named in the deck (runs, boxes, theme): load them, then redraw once
  S.loadDeckFonts = async (deck) => {
    const fams = new Set(); const t = S.theme(deck); [t.font, t.head].forEach((f) => f && fams.add(f));
    for (const s of deck.slides || []) for (const e of s.els || []) { if (e.text?.font) fams.add(e.text.font); for (const p of e.text?.paras || []) for (const r of p.runs || []) if (r.font) fams.add(r.font); }
    const res = await Promise.all([...fams].map((f) => S.loadFont(f))); if (res.some(Boolean)) { S.renderThumbs?.(); S.renderCanvas?.(); }
  };
  const recent = () => { try { return (aicw.getState?.() || {})[RECENT_KEY] || []; } catch { return []; } };
  const pushRecent = (f) => { try { const st = aicw.getState?.() || {}; st[RECENT_KEY] = [f, ...recent().filter((x) => x !== f)].slice(0, 8); aicw.setState?.(st); } catch {} };

  // The ribbon control: looks like a select, opens the picker
  S.fontControl = () => `<button class="ds-sel ds-fontbtn" data-cmd="fontPicker" title="${T('Phông chữ')}" data-in="font"><span id="dsFontName">Inter</span><i>▾</i></button>`;
  S.setFontControl = (name) => { const n = $('#dsFontName'); if (n) { n.textContent = name; n.style.fontFamily = `'${name}'`; S.loadFont(name); } };

  S.fontPicker = async (anchor) => {
    $('.ds-fontpick')?.remove();
    const keepSel = (S.st?.sel || []).slice(); const keepEdit = S.st?.editing; // the picker must not lose what the font applies to
    const box = document.createElement('div'); box.className = 'ds-pop ds-fontpick';
    box.innerHTML = `<input class="ui-input" id="fpQ" placeholder="${T('Tìm phông chữ Google…')}" autocomplete="off"><label class="ds-lbl" style="display:flex;gap:6px;align-items:center;margin:6px 2px"><input type="checkbox" id="fpVi" checked> ${T('Chỉ phông có tiếng Việt')}</label><div class="fp-list" id="fpList"><div class="ds-lbl" style="padding:10px">${T('Đang tải danh sách Google Fonts…')}</div></div>`;
    document.body.appendChild(box);
    const r = anchor.getBoundingClientRect(); Object.assign(box.style, { left: Math.max(4, Math.min(r.left, innerWidth - 300)) + 'px', top: r.bottom + 4 + 'px' });
    const q = $('#fpQ', box), vi = $('#fpVi', box), list = $('#fpList', box);
    // preview only the fonts on screen: load faces lazily as rows scroll into view
    const io = new IntersectionObserver((ents) => { for (const en of ents) if (en.isIntersecting) { const f = en.target.dataset.font; io.unobserve(en.target); if (en.target.dataset.g) S.loadFont(f); } }, { root: list });
    const row = (f, g) => `<button class="fp-row" data-font="${S.esc(f.family || f)}"${g ? ' data-g="1"' : ''} style="font-family:'${S.esc(f.family || f)}',system-ui"><span>${S.esc(f.family || f)}</span>${f.category ? `<small>${S.esc(f.category)}</small>` : ''}</button>`;
    const draw = () => {
      const s = q.value.trim().toLowerCase(); const items = (catalog || []).filter((f) => (!vi.checked || f.vi) && (!s || f.family.toLowerCase().includes(s)));
      const sys = SYSTEM.filter((f) => !s || f.toLowerCase().includes(s)); const rec = recent().filter((f) => !s || f.toLowerCase().includes(s));
      list.innerHTML = (rec.length ? `<h6>${T('Gần đây')}</h6>` + rec.map((f) => row(f, !SYSTEM.includes(f))).join('') : '') + (sys.length ? `<h6>${T('Trên máy này')}</h6>` + sys.map((f) => row(f, 0)).join('') : '') + `<h6>Google Fonts${catalog ? ` (${items.length})` : ''}</h6>` + (catalog ? items.slice(0, 300).map((f) => row(f, 1)).join('') || `<div class="ds-lbl" style="padding:8px">${T('Không tìm thấy')}</div>` : `<div class="ds-lbl" style="padding:8px">${T('Đang tải…')}</div>`);
      list.querySelectorAll('.fp-row').forEach((n) => io.observe(n));
    };
    draw(); q.focus(); S.fontCatalog().then(draw);
    q.addEventListener('input', draw); vi.addEventListener('change', draw);
    list.addEventListener('click', async (e) => { const b = e.target.closest('.fp-row'); if (!b) return; const f = b.dataset.font; close(); S.setFontControl(f); pushRecent(f); await S.loadFont(f); if (!keepEdit && keepSel.length && !(S.st.sel || []).length) S.st.sel = keepSel; S.input('font', f); S.syncRibbon?.(); });
    q.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); if (e.key === 'Enter') { const first = list.querySelector('.fp-row'); first?.click(); } e.stopPropagation(); });
    const off = (e) => { if (!box.contains(e.target) && !e.target.closest('[data-cmd="fontPicker"]')) close(); };
    function close() { io.disconnect(); box.remove(); document.removeEventListener('pointerdown', off, true); }
    setTimeout(() => document.addEventListener('pointerdown', off, true));
  };
})();
