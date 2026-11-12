/* AI Slide — editor: state, undo, ribbon, thumbnails, canvas selection/move/resize/rotate, text editing. */
(function () {
  const S = window.Slide; const $ = (q, r = document) => r.querySelector(q); const $$ = (q, r = document) => Array.from(r.querySelectorAll(q));
  const I = (d) => `<svg viewBox="0 0 24 24">${d}</svg>`;
  const IC = {
    home: I('<path d="M3 11l9-7 9 7v9H3z"/><path d="M9 20v-6h6v6"/>'), save: I('<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>'), undo: I('<path d="M9 7L4 12l5 5"/><path d="M4 12h11a5 5 0 010 10h-3"/>'), redo: I('<path d="M15 7l5 5-5 5"/><path d="M20 12H9a5 5 0 000 10h3"/>'), play: I('<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M10 9l5 2-5 2z"/>'),
    paste: I('<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2"/><path d="M9 10h6M9 14h6"/>'), cut: I('<circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8 16L18 3M16 16L6 3"/>'), copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>'), brush: I('<path d="M4 20c2 0 4-1 4-4l9-9-3-3-9 9c-3 0-4 2-4 4"/>'),
    newslide: I('<rect x="3" y="5" width="15" height="11" rx="1.5"/><circle cx="18" cy="17" r="4" fill="#2e9d6a" stroke="#2e9d6a"/><path d="M18 15v4M16 17h4" stroke="#fff"/>'), layout: I('<rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 9h18M10 9v11"/>'), reset: I('<path d="M4 4v6h6"/><path d="M5 10a8 8 0 112 7"/>'), section: I('<rect x="3" y="4" width="8" height="6" rx="1"/><rect x="13" y="14" width="8" height="6" rx="1"/><path d="M7 10v7h6"/>'),
    picture: I('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-6-6-9 9"/>'), shapes: I('<rect x="3" y="11" width="9" height="9" rx="1"/><circle cx="16" cy="8" r="5"/>'), textbox: I('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M8 8h8M12 8v9"/>'), arrange: I('<rect x="3" y="3" width="11" height="11" rx="1"/><rect x="10" y="10" width="11" height="11" rx="1" fill="currentColor" fill-opacity=".15"/>'), styles: I('<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/>'),
    table: I('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16"/>'), chart: I('<path d="M4 20V10M10 20V4M16 20v-8M21 20H3"/>'), bulb: I('<path d="M9 18h6M10 21h4M12 3a6 6 0 00-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0012 3z"/>'), link: I('<path d="M10 14a4 4 0 006 0l3-3a4 4 0 00-6-6l-1 1"/><path d="M14 10a4 4 0 00-6 0l-3 3a4 4 0 006 6l1-1"/>'), sym: I('<path d="M6 19h4v-3a6 6 0 114 0v3h4"/>'), header: I('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M7 18h10"/>'), wordart: I('<path d="M4 18L9 5l5 13M6 13h6M16 9v9M16 12a3 3 0 016 0v6"/>'),
    theme: I('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/><path d="M12 21a3 3 0 010-6h2"/>'), size: I('<rect x="3" y="6" width="18" height="12" rx="1"/><path d="M7 10v4M17 10v4"/>'), bg: I('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 15l5-4 4 3 4-5 5 5"/>'),
    fade: I('<rect x="3" y="5" width="18" height="14" rx="1" fill="currentColor" fill-opacity=".2"/>'), push: I('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 9v6M9 12l3-3 3 3"/>'), wipe: I('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14"/>'), none: I('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M5 17L19 7"/>'), split: I('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M8 12h-4M16 12h4M10 9l-3 3 3 3M14 9l3 3-3 3"/>'), cover: I('<rect x="3" y="5" width="18" height="14" rx="1"/><rect x="3" y="5" width="9" height="14" fill="currentColor" fill-opacity=".25"/>'), zoom: I('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>'),
    start: I('<path d="M7 5l12 7-12 7z"/>'), current: I('<rect x="3" y="5" width="13" height="10" rx="1"/><path d="M15 14l6 3-6 3z"/>'), presenter: I('<rect x="3" y="4" width="12" height="9" rx="1"/><rect x="16" y="4" width="5" height="9" rx="1"/><path d="M9 13v4M5 21h8"/>'), hide: I('<path d="M3 3l18 18M10.5 6.2A10 10 0 0122 12a13 13 0 01-3 3.6M6.6 6.6A13 13 0 002 12a10 10 0 0010 6 9 9 0 004-1"/>'), timer: I('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>'),
    comment: I('<path d="M4 5h16v11H9l-5 4z"/>'), spell: I('<path d="M4 15L8 5l4 10M5.5 11h5M14 15l3 3 5-7"/>'), notes: I('<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M8 8h8M8 12h8M8 16h5"/>'), normal: I('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M8 4v16"/>'), sorter: I('<rect x="3" y="4" width="8" height="7" rx="1"/><rect x="13" y="4" width="8" height="7" rx="1"/><rect x="3" y="13" width="8" height="7" rx="1"/><rect x="13" y="13" width="8" height="7" rx="1"/>'), reading: I('<path d="M3 5h7a3 3 0 013 3v12a2 2 0 00-2-2H3zM21 5h-7a3 3 0 00-3 3"/>'), grid: I('<path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>'), ruler: I('<rect x="2" y="8" width="20" height="8" rx="1"/><path d="M6 8v3M10 8v4M14 8v3M18 8v4"/>'), fit: I('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
    search: I('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4-4"/>'), palette: I('<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="16" cy="10" r="1" fill="currentColor"/>'), spark: I('<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>'),
    fwd: I('<rect x="8" y="8" width="12" height="12" rx="1" fill="currentColor" fill-opacity=".2"/><path d="M4 16V4h12"/>'), back: I('<rect x="4" y="4" width="12" height="12" rx="1" fill="currentColor" fill-opacity=".2"/><path d="M20 8v12H8"/>'), group: I('<rect x="3" y="3" width="18" height="18" rx="1" stroke-dasharray="3 2"/><rect x="6" y="6" width="6" height="6"/><rect x="12" y="12" width="6" height="6"/>'), rotate: I('<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 4v7h-7"/>'), align: I('<path d="M4 3v18"/><rect x="7" y="6" width="12" height="4"/><rect x="7" y="14" width="7" height="4"/>'), pane: I('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M15 4v16"/>'), alt: I('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M7 15l3-7 3 7M8 13h4M16 9v6"/>'), crop: I('<path d="M6 2v16h16M2 6h16v16"/>'), del: I('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'), dup: I('<rect x="8" y="8" width="12" height="12" rx="1"/><rect x="4" y="4" width="12" height="12" rx="1"/>'), plus: I('<path d="M12 5v14M5 12h14"/>'), present: I('<path d="M7 5l12 7-12 7z"/>'),
  };
  S.IC = IC;

  // ---------------- state ----------------
  const st = (S.st = { deck: S.newDeck(), cur: 0, sel: [], undo: [], redo: [], tab: 'home', zoom: 0, editing: null, clip: null, dirty: false, view: 'normal', showNotes: true, closedSecs: {}, fileName: '' });
  const deck = () => st.deck; const slide = () => st.deck.slides[st.cur];
  const els = () => slide()?.els || []; const selEls = () => els().filter((e) => st.sel.includes(e.id));
  S.push = (label) => { st.undo.push(JSON.stringify({ d: st.deck, c: st.cur })); if (st.undo.length > 120) st.undo.shift(); st.redo = []; st.dirty = true; scheduleSave(); };
  S.undo = () => { if (!st.undo.length) return; commitEdit(); st.redo.push(JSON.stringify({ d: st.deck, c: st.cur })); const o = JSON.parse(st.undo.pop()); st.deck = o.d; st.cur = Math.min(o.c, st.deck.slides.length - 1); st.sel = []; renderAll(); };
  S.redo = () => { if (!st.redo.length) return; st.undo.push(JSON.stringify({ d: st.deck, c: st.cur })); const o = JSON.parse(st.redo.pop()); st.deck = o.d; st.cur = Math.min(o.c, st.deck.slides.length - 1); st.sel = []; renderAll(); };
  let saveT; function scheduleSave() { clearTimeout(saveT); saveT = setTimeout(() => S.autosave && S.autosave(), 1500); }
  S.toast = (t, ms = 2400) => { const d = document.createElement('div'); d.className = 'ds-toast'; d.textContent = S.T ? S.T(String(t)) : t; document.body.appendChild(d); setTimeout(() => d.remove(), ms); };

  // ---------------- ribbon definition ----------------
  const big = (id, ic, label, opt = {}) => `<button class="ds-big" data-cmd="${id}" title="${(opt.title || label).replace(/<br>/g, " ")}">${IC[ic] || ''}<span>${label}${opt.dd ? ' ▾' : ''}</span></button>`;
  const sm = (id, ic, label, opt = {}) => `<button class="ds-sm${opt.icon ? ' icon' : ''}" data-cmd="${id}" title="${(opt.title || label).replace(/<br>/g, " ")}">${ic ? (IC[ic] || ic) : ''}${opt.icon ? '' : `<span>${label}${opt.dd ? ' ▾' : ''}</span>`}</button>`;
  const grp = (...x) => `<div class="ds-grp">${x.join('')}</div>`; const col = (...x) => `<div class="ds-col">${x.join('')}</div>`; const row = (...x) => `<div class="ds-row">${x.join('')}</div>`;
  const FONTS = ['Inter', 'Calibri', 'Arial', 'Helvetica', 'Segoe UI', 'Times New Roman', 'Georgia', 'Cambria', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Roboto', 'Be Vietnam Pro', 'Montserrat', 'Comic Sans MS'];
  const SIZES = [8, 9, 10, 10.5, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96];
  const color = (cmd, ic, title, def) => `<span class="ds-color" title="${title}"><button class="ds-sm icon" data-cmd="${cmd}">${ic}</button><span class="ds-swatch" style="background:${def}"></span><input type="color" data-color="${cmd}" value="${def}"></span>`;
  const fontGroup = () => grp(col(row(S.fontControl(), `<select class="ds-num" data-in="size" title="Cỡ chữ">${SIZES.map((s) => `<option>${s}</option>`).join('')}</select>`, sm('grow', 'A⁺', '', { icon: 1, title: 'Tăng cỡ chữ (Ctrl+])' }), sm('shrink', 'A⁻', '', { icon: 1, title: 'Giảm cỡ chữ (Ctrl+[)' }), sm('clearfmt', 'A̸', '', { icon: 1, title: 'Xoá định dạng' })),
    row(sm('b', '<b>B</b>', '', { icon: 1, title: 'Đậm (Ctrl+B)' }), sm('i', '<i>I</i>', '', { icon: 1, title: 'Nghiêng (Ctrl+I)' }), sm('u', '<u>U</u>', '', { icon: 1, title: 'Gạch chân (Ctrl+U)' }), sm('s', '<s>ab</s>', '', { icon: 1, title: 'Gạch ngang' }), sm('sup', 'x²', '', { icon: 1, title: 'Chỉ số trên' }), sm('sub', 'x₂', '', { icon: 1, title: 'Chỉ số dưới' }), sm('caps', 'Aa', '', { icon: 1, title: 'Chữ hoa' }), color('hl', '<span style="background:#ff0;padding:0 2px">ab</span>', 'Màu nền chữ', '#ffff00'), color('color', '<b style="font-size:14px">A</b>', 'Màu chữ', '#e8591a'))));
  const paraGroup = () => grp(col(row(sm('bullet', '☰•', '', { icon: 1, title: 'Gạch đầu dòng' }), sm('number', '1≡', '', { icon: 1, title: 'Đánh số' }), sm('outdent', '⇤', '', { icon: 1, title: 'Giảm mức' }), sm('indent', '⇥', '', { icon: 1, title: 'Tăng mức' }), sm('spacing', '↕', '', { icon: 1, title: 'Giãn dòng' }), sm('columns', '▥', '', { icon: 1, title: 'Cột' })),
    row(sm('al', '⯇≡', '', { icon: 1, title: 'Căn trái' }), sm('ac', '≡', '', { icon: 1, title: 'Căn giữa' }), sm('ar', '≡⯈', '', { icon: 1, title: 'Căn phải' }), sm('aj', '☰', '', { icon: 1, title: 'Căn đều' }), sm('vtop', '⤒', '', { icon: 1, title: 'Căn trên' }), sm('vmid', '⇳', '', { icon: 1, title: 'Căn giữa dọc' }), sm('vbot', '⤓', '', { icon: 1, title: 'Căn dưới' }))));
  const drawGroup = () => grp(big('shapesMenu', 'shapes', 'Hình', { dd: 1 }), big('textbox', 'textbox', 'Hộp văn bản'), big('arrangeMenu', 'arrange', 'Sắp xếp', { dd: 1 }), big('quickStyles', 'styles', 'Kiểu nhanh', { dd: 1 }), col(`<span class="ds-color">${sm('fillMenu', 'brush', 'Tô hình', { dd: 1 })}<input type="color" data-color="fill" value="#2f6fd6" style="width:20px;left:auto;right:0"></span>`, `<span class="ds-color">${sm('lineMenu', '✎', 'Viền hình', { dd: 1 })}<input type="color" data-color="line" value="#1f2937" style="width:20px;left:auto;right:0"></span>`, sm('effectsMenu', '◪', 'Hiệu ứng', { dd: 1 })));
  const RIB = {
    home: () => grp(big('paste', 'paste', 'Dán', { dd: 1 }), col(sm('cut', 'cut', 'Cắt'), sm('copy', 'copy', 'Sao chép'), sm('fmtpaint', 'brush', 'Định dạng'))) + grp(big('newSlideMenu', 'newslide', 'Slide mới', { dd: 1 }), col(sm('layoutMenu', 'layout', 'Bố cục', { dd: 1 }), sm('resetSlide', 'reset', 'Đặt lại'), sm('sectionMenu', 'section', 'Phần', { dd: 1 }))) + fontGroup() + paraGroup() + grp(big('picture', 'picture', 'Ảnh')) + drawGroup() + grp(big('designIdeas', 'bulb', 'Ý tưởng<br>thiết kế')),
    insert: () => grp(big('newSlideMenu', 'newslide', 'Slide mới', { dd: 1 })) + grp(big('tableMenu', 'table', 'Bảng', { dd: 1 })) + grp(big('picture', 'picture', 'Ảnh'), big('aiImage', 'spark', 'Ảnh AI')) + grp(big('shapesMenu', 'shapes', 'Hình', { dd: 1 }), big('chartMenu', 'chart', 'Biểu đồ', { dd: 1 })) + grp(big('link', 'link', 'Liên kết')) + grp(big('textbox', 'textbox', 'Hộp văn bản'), big('headerFooter', 'header', 'Đầu & chân<br>trang'), big('wordart', 'wordart', 'WordArt', { dd: 1 })) + grp(big('symbol', 'sym', 'Ký hiệu'), big('slideNumber', 'header', 'Số slide'), big('dateTime', 'timer', 'Ngày giờ')),
    draw: () => grp(sm('drawPen', '✎', 'Bút', {}), sm('drawHi', '▬', 'Bút dạ', {}), sm('drawStop', '⌖', 'Chọn')) + grp(color('penColor', IC.brush, 'Màu bút', '#e8591a'), `<span class="ds-lbl">Nét</span><input type="range" min="1" max="20" value="3" data-in="penW">`) + grp(big('shapesMenu', 'shapes', 'Hình', { dd: 1 })) + grp(`<span class="ds-lbl" style="max-width:220px">Kéo chuột trên slide để vẽ tự do. Nét vẽ được lưu như một hình ảnh trên slide.</span>`),
    design: () => grp(...S.THEMES.map((t) => `<button class="ds-card" data-cmd="theme:${t.id}" title="${t.name}" style="width:96px;padding:3px"><div class="pv" style="height:52px;background:${t.grad ? `linear-gradient(${t.grad})` : t.bg};font-family:${t.head}"><div style="position:absolute;left:8px;top:8px;color:${t.title};font-weight:600;font-size:13px">Aa</div><div style="position:absolute;left:8px;bottom:7px;display:flex;gap:2px">${t.accents.slice(0, 4).map((c) => `<i style="width:12px;height:6px;background:${c}"></i>`).join('')}</div></div>${t.name}</button>`)) + grp(big('sizeMenu', 'size', 'Kích thước<br>slide', { dd: 1 }), big('bgMenu', 'bg', 'Định dạng<br>nền', { dd: 1 }), big('designIdeas', 'bulb', 'Ý tưởng<br>thiết kế')),
    transitions: () => grp(big('trPreview', 'play', 'Xem trước')) + grp(...['none', 'fade', 'push', 'wipe', 'split', 'cover', 'zoom'].map((t) => big('tr:' + t, t, { none: 'Không', fade: 'Mờ dần', push: 'Đẩy', wipe: 'Lau', split: 'Tách', cover: 'Che', zoom: 'Phóng' }[t]))) + grp(col(row('<span class="ds-lbl">Thời lượng (giây)</span>', '<input class="ds-num" type="number" step="0.25" min="0.1" value="0.7" data-in="trDur">'), row('<label class="ds-lbl"><input type="checkbox" data-in="trAfterOn"> Tự chuyển sau</label>', '<input class="ds-num" type="number" step="1" min="0" value="5" data-in="trAfter">'), sm('trAll', 'copy', 'Áp dụng cho tất cả'))),
    animations: () => grp(big('anPreview', 'play', 'Xem trước')) + grp(...[['none', 'Không'], ['appear', 'Xuất hiện'], ['fade', 'Mờ dần'], ['fly', 'Bay vào'], ['zoom', 'Phóng to'], ['wipe', 'Lau'], ['float', 'Trôi lên'], ['pulse', 'Nhịp (nhấn mạnh)'], ['spin', 'Xoay (nhấn mạnh)'], ['fadeOut', 'Mờ đi (thoát)']].map(([k, l]) => `<button class="ds-big" data-cmd="an:${k}" title="${l}">${IC.spark}<span>${l}</span></button>`)) + grp(col(row('<span class="ds-lbl">Bắt đầu</span>', '<select class="ds-sel" style="width:110px" data-in="anStart"><option value="click">Khi bấm</option><option value="with">Cùng lúc</option><option value="after">Sau đó</option></select>'), row('<span class="ds-lbl">Thời lượng</span>', '<input class="ds-num" type="number" step="0.25" min="0.1" value="0.5" data-in="anDur">'), row('<label class="ds-lbl"><input type="checkbox" data-in="anPara"> Theo từng đoạn</label>'))),
    show: () => grp(big('showStart', 'start', 'Từ đầu'), big('showCurrent', 'current', 'Từ slide<br>hiện tại'), big('presenter', 'presenter', 'Chế độ<br>người trình bày')) + grp(big('hideSlide', 'hide', 'Ẩn slide'), big('rehearse', 'timer', 'Diễn tập<br>bấm giờ')) + grp(`<label class="ds-lbl"><input type="checkbox" data-in="loop"> Lặp lại đến khi bấm Esc</label>`),
    record: () => grp(big('recNarr', 'current', 'Ghi âm<br>thuyết minh'), big('rehearse', 'timer', 'Diễn tập<br>bấm giờ'), big('clearNarr', 'del', 'Xoá<br>thuyết minh')) + grp(big('insAudio', 'play', 'Chèn<br>âm thanh')) + grp(big('exportVideoNote', 'play', 'Xuất GIF<br>động')),
    review: () => grp(big('spell', 'spell', 'Chính tả<br>(AI)'), big('translate', 'spark', 'Dịch<br>(AI)')) + grp(big('comment', 'comment', 'Nhận xét<br>mới'), big('comments', 'comment', 'Hiện<br>nhận xét')) + grp(big('aiSummary', 'spark', 'Tóm tắt<br>bản trình chiếu')),
    view: () => grp(big('vNormal', 'normal', 'Thường'), big('vSorter', 'sorter', 'Sắp xếp<br>slide'), big('vNotes', 'notes', 'Ghi chú'), big('vReading', 'reading', 'Đọc')) + grp(col(`<label class="ds-sm"><input type="checkbox" data-in="grid"> Lưới</label>`, `<label class="ds-sm"><input type="checkbox" data-in="guides" checked> Đường gióng</label>`)) + grp(big('zoomMenu', 'zoom', 'Thu phóng'), big('fitWin', 'fit', 'Vừa cửa sổ')) + grp(big('darkToggle', 'palette', 'Sáng / Tối')),
    shapeFormat: () => grp(big('shapesMenu', 'shapes', 'Hình', { dd: 1 }), big('textbox', 'textbox', 'Hộp<br>văn bản'), big('changeShape', 'styles', 'Đổi hình', { dd: 1 })) + grp(big('quickStyles', 'styles', 'Kiểu<br>hình', { dd: 1 }), col(`<span class="ds-color">${sm('fillMenu', 'brush', 'Tô hình', { dd: 1 })}<input type="color" data-color="fill" value="#2f6fd6" style="width:20px;left:auto;right:0"></span>`, `<span class="ds-color">${sm('lineMenu', '✎', 'Viền hình', { dd: 1 })}<input type="color" data-color="line" value="#1f2937" style="width:20px;left:auto;right:0"></span>`, sm('effectsMenu', '◪', 'Hiệu ứng hình', { dd: 1 }))) + grp(col(color('color', '<b>A</b>', 'Màu chữ', '#ffffff'), sm('textOutline', 'A', 'Viền chữ'), sm('textShadow', 'A', 'Bóng chữ'))) + grp(big('altText', 'alt', 'Văn bản<br>thay thế')) + grp(big('fwd', 'fwd', 'Đưa lên', { dd: 1 }), big('back', 'back', 'Đưa xuống', { dd: 1 }), big('alignMenu', 'align', 'Căn chỉnh', { dd: 1 }), col(sm('group', 'group', 'Nhóm', { dd: 1 }), sm('rotateMenu', 'rotate', 'Xoay', { dd: 1 }))) + grp(col(row('<span class="ds-lbl">Cao:</span>', '<input class="ds-num" type="number" step="0.01" data-in="elH">', '<span class="ds-lbl">"</span>'), row('<span class="ds-lbl">Rộng:</span>', '<input class="ds-num" type="number" step="0.01" data-in="elW">', '<span class="ds-lbl">"</span>'))),
    pictureFormat: () => grp(big('corrections', 'bg', 'Hiệu chỉnh', { dd: 1 }), big('picGray', 'palette', 'Đen trắng'), big('picRound', 'shapes', 'Cắt tròn'), big('crop', 'crop', 'Cắt xén', { dd: 1 }), big('replacePic', 'picture', 'Đổi ảnh'), big('resetPic', 'reset', 'Đặt lại ảnh')) + grp(`<span class="ds-color">${sm('lineMenu', '✎', 'Viền ảnh', { dd: 1 })}<input type="color" data-color="line" value="#1f2937" style="width:20px;left:auto;right:0"></span>`, sm('effectsMenu', '◪', 'Hiệu ứng', { dd: 1 })) + grp(big('altText', 'alt', 'Văn bản<br>thay thế')) + grp(big('fwd', 'fwd', 'Đưa lên'), big('back', 'back', 'Đưa xuống'), big('alignMenu', 'align', 'Căn chỉnh', { dd: 1 })),
    tableDesign: () => grp(col('<label class="ds-sm"><input type="checkbox" data-in="tHeader" checked> Hàng tiêu đề</label>', '<label class="ds-sm"><input type="checkbox" data-in="tBand" checked> Hàng xen màu</label>')) + grp(...S.theme(deck()).accents.map((c, i) => `<button class="ds-card" data-cmd="tstyle:${c}" style="width:58px;padding:3px"><div class="pv" style="height:38px;display:grid;grid-template-rows:repeat(4,1fr)"><i style="background:${c}"></i><i style="background:${S.mix(c, .82)}"></i><i style="background:${S.mix(c, .92)}"></i><i style="background:${S.mix(c, .82)}"></i></div></button>`)) + grp(col(sm('rowAbove', 'plus', 'Chèn hàng trên'), sm('rowBelow', 'plus', 'Chèn hàng dưới'), sm('delRow', 'del', 'Xoá hàng')), col(sm('colLeft', 'plus', 'Chèn cột trái'), sm('colRight', 'plus', 'Chèn cột phải'), sm('delCol', 'del', 'Xoá cột'))) + grp(color('cellFill', IC.brush, 'Tô ô', '#e8591a')),
    chartDesign: () => grp(...[['bar', 'Cột'], ['hbar', 'Thanh'], ['line', 'Đường'], ['area', 'Vùng'], ['pie', 'Tròn'], ['doughnut', 'Vành khuyên']].map(([k, l]) => big('ctype:' + k, 'chart', l))) + grp(big('editData', 'table', 'Sửa dữ liệu')),
  };
  const TABS = [['file', 'Tệp'], ['home', 'Trang đầu'], ['insert', 'Chèn'], ['draw', 'Vẽ'], ['design', 'Thiết kế'], ['transitions', 'Chuyển tiếp'], ['animations', 'Hoạt hình'], ['show', 'Trình chiếu'], ['record', 'Ghi'], ['review', 'Xem lại'], ['view', 'Xem']];
  function ctxTab() { const s = selEls(); if (s.length !== 1) return s.length > 1 ? ['shapeFormat', 'Định dạng hình'] : null; const t = s[0].type; return t === 'image' ? ['pictureFormat', 'Định dạng ảnh'] : t === 'table' ? ['tableDesign', 'Thiết kế bảng'] : t === 'chart' ? ['chartDesign', 'Thiết kế biểu đồ'] : ['shapeFormat', 'Định dạng hình']; }


  // ---------- ribbon fitting: collapse groups from the right into dropdown buttons; arrows as last resort ----------
  let grpPop = null; let grpHome = null;
  function closeGrpPop() { if (!grpPop) return; const g = grpHome; while (grpPop.firstChild) g.appendChild(grpPop.firstChild); grpPop.remove(); grpPop = null; grpHome = null; }
  S.closeGrpPop = closeGrpPop;
  function grpLabel(g) { const T = (x) => (S.T ? S.T(x) : x);
    if (g.querySelector('[data-in="font"]')) return T('Phông chữ'); if (g.querySelector('[data-cmd="bullet"]')) return T('Đoạn văn'); if (g.querySelector('[data-cmd="paste"]')) return T('Bảng tạm'); if (g.querySelector('[data-cmd^="theme:"]')) return T('Chủ đề'); if (g.querySelector('[data-cmd^="tr:"]')) return T('Chuyển tiếp'); if (g.querySelector('[data-cmd^="an:"]')) return T('Hoạt hình');
    return grpLabel0(g); }
  function grpLabel0(g) { const b = g.querySelector('.ds-big span, .ds-sm span'); const t = (b?.textContent || '').replace(/▾/g, '').trim(); return t || (g.querySelector('select') ? (S.T ? S.T('Phông chữ') : 'Phông chữ') : '…'); }
  function grpIcon(g) { if (g.querySelector('[data-in="font"]')) return '<svg viewBox="0 0 24 24"><path d="M5 19L11 5l6 14M7.5 14h7"/></svg>'; if (g.querySelector('[data-cmd="bullet"]')) return '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 11h16M4 16h10"/></svg>'; const sv = g.querySelector('svg'); return sv ? sv.outerHTML : '<svg viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'; }
  function fitRibbon() {
    const r = $('#dsRibbon'); if (!r) return; $$('.ds-rarrow', r).forEach((x) => x.remove()); r.scrollLeft = 0;
    const groups = $$(':scope > .ds-grp', r);
    groups.forEach((g) => { g.classList.remove('cz'); if (!g.querySelector(':scope > .ds-czbtn')) { const b = document.createElement('button'); b.className = 'ds-big ds-czbtn'; b.innerHTML = grpIcon(g) + `<span>${S.esc ? S.esc(grpLabel(g)) : grpLabel(g)} ▾</span>`; b.title = grpLabel(g); b.addEventListener('click', (e) => { e.stopPropagation(); openGrpPop(g, b); }); g.prepend(b); } });
    for (let i = groups.length - 1; i > 0 && r.scrollWidth > r.clientWidth + 1; i--) groups[i].classList.add('cz');
    if (r.scrollWidth > r.clientWidth + 1) { // even collapsed it does not fit: page with arrows, no scrollbar
      const mk = (cls, txt, d) => { const a = document.createElement('button'); a.className = 'ds-rarrow ' + cls; a.textContent = txt; a.onclick = () => { r.scrollBy({ left: d * r.clientWidth * 0.7, behavior: 'smooth' }); setTimeout(upd, 350); }; r.appendChild(a); return a; };
      const L = mk('l', '‹', -1), R = mk('r', '›', 1);
      const upd = () => { L.style.left = r.scrollLeft + 'px'; R.style.right = -r.scrollLeft + 'px'; L.hidden = r.scrollLeft <= 0; R.hidden = r.scrollLeft + r.clientWidth >= r.scrollWidth - 1; };
      upd();
    }
  }
  function openGrpPop(g, btn) {
    const same = grpHome === g; closeGrpPop(); if (same) return;
    grpPop = document.createElement('div'); grpPop.className = 'ds-grp-pop'; grpHome = g;
    [...g.children].filter((c) => !c.classList.contains('ds-czbtn')).forEach((c) => grpPop.appendChild(c));
    $('#ds').appendChild(grpPop); const b = btn.getBoundingClientRect(); const w = grpPop.offsetWidth;
    grpPop.style.top = b.bottom + 4 + 'px'; grpPop.style.left = Math.max(8, Math.min(b.left, innerWidth - w - 8)) + 'px';
    syncRibbon();
  }
  document.addEventListener('pointerdown', (e) => { if (grpPop && !grpPop.contains(e.target) && !e.target.closest('.ds-czbtn') && !e.target.closest('.ds-pop')) closeGrpPop(); }, true);
  addEventListener('resize', () => { clearTimeout(S._rf); S._rf = setTimeout(() => { closeGrpPop(); fitRibbon(); }, 80); });

  // ---------------- layout skeleton ----------------
  S.mount = (root) => {
    root.innerHTML = `<div id="ds">
      <div class="ds-top"><div class="ds-qat">${['home:Trang chủ (Tệp)', 'save:Lưu (Ctrl+S)', 'undo:Hoàn tác (Ctrl+Z)', 'redo:Làm lại (Ctrl+Y)', 'play:Trình chiếu từ đầu (F5)'].map((x) => { const [k, t] = x.split(':'); return `<button class="ds-ico" data-cmd="q:${k}" title="${t}">${IC[k]}</button>`; }).join('')}</div>
        <div class="ds-title" contenteditable="true" spellcheck="false" id="dsTitle"></div>
        <div class="ds-right"><div class="ds-model" data-model-picker title="Mô hình AI"></div><button class="ds-ai" data-cmd="aiPanel">${IC.spark.replace('<svg', '<svg style="width:15px;height:15px"')}AI</button><button class="ds-ico" data-cmd="darkToggle" title="Giao diện sáng/tối">${IC.palette}</button><button class="ds-ico" data-cmd="comments" title="Nhận xét">${IC.comment}</button><button class="ds-present" data-cmd="showStart">Trình chiếu</button><button class="ds-ico" data-cmd="find" title="Tìm (Ctrl+F)">${IC.search}</button></div></div>
      <div class="ds-tabs" id="dsTabs"></div>
      <div class="ds-ribbon" id="dsRibbon"></div>
      <div class="ds-main" id="dsMain"><div class="ds-thumbs" id="dsThumbs"></div><div class="ds-stage-wrap"><div class="ds-stage" id="dsStage"><div class="ds-canvas" id="dsCanvas"></div></div><div class="ds-notes" id="dsNotesWrap"><div contenteditable="true" id="dsNotes" data-ph="Bấm để thêm ghi chú"></div></div></div></div>
      <div class="ds-status"><span id="dsSlideNo"></span><span>Tiếng Việt</span><span id="dsSaved"></span><span id="dsFontStatus" class="ds-fontstatus" hidden></span><span class="sp"></span><button class="ds-sm" data-cmd="vNotes">${IC.notes}<span>Ghi chú</span></button><button class="ds-sm" data-cmd="comments">${IC.comment}<span>Nhận xét</span></button><button class="ds-sm icon" data-cmd="vNormal" title="Thường">${IC.normal}</button><button class="ds-sm icon" data-cmd="vSorter" title="Sắp xếp slide">${IC.sorter}</button><button class="ds-sm icon" data-cmd="vReading" title="Đọc">${IC.reading}</button><button class="ds-sm icon" data-cmd="showCurrent" title="Trình chiếu">${IC.present}</button><button class="ds-sm icon" data-cmd="zoomOut">−</button><input type="range" min="20" max="400" id="dsZoom"><button class="ds-sm icon" data-cmd="zoomIn">+</button><span id="dsZoomPct" style="min-width:40px"></span><button class="ds-sm icon" data-cmd="fitWin" title="Vừa cửa sổ">${IC.fit}</button></div>
    </div>`;
    wire();
  };

  // ---------------- rendering ----------------
  function renderTabs() {
    const c = ctxTab(); if (!c && !RIB[st.tab]) st.tab = 'home';
    if (c === null && /Format|Design$/.test(st.tab) && st.tab !== 'design') st.tab = 'home';
    $('#dsTabs').innerHTML = TABS.map(([k, l]) => `<button class="ds-tab${k === 'file' ? '' : ''}${st.tab === k ? ' on' : ''}" data-tab="${k}">${l}</button>`).join('') + (c ? `<button class="ds-tab ctx${st.tab === c[0] ? ' on' : ''}" data-tab="${c[0]}">${c[1]}</button>` : '');
  }
  function renderRibbon() { closeGrpPop(); $('#dsRibbon').innerHTML = (RIB[st.tab] || RIB.home)(); fitRibbon(); syncRibbon(); if (window.AicwApp?.mount) try { AicwApp.mount(document.querySelector('.ds-top')); } catch {} }
  S.renderRibbon = () => { renderTabs(); renderRibbon(); };
  function sectionOf(i) { const secs = deck().sections || []; let s = null; for (const x of secs) if (x.start <= i) s = x; return s; }
  function renderThumbs() {
    const box = $('#dsThumbs'); const secs = (deck().sections || []).slice().sort((a, b) => a.start - b.start); let html = '';
    const tw = Math.max(80, box.clientWidth - 36 || 160);
    deck().slides.forEach((s, i) => {
      const sec = secs.find((x) => x.start === i);
      if (sec) { const cnt = (secs[secs.indexOf(sec) + 1]?.start ?? deck().slides.length) - sec.start; html += `<div class="ds-sec${st.closedSecs[sec.name] ? ' closed' : ''}" data-sec="${S.esc(sec.name)}"><span class="car">▼</span>${S.esc(sec.name)} (${cnt})</div>`; }
      const cs = sectionOf(i); if (cs && st.closedSecs[cs.name]) return;
      html += `<div class="ds-th${i === st.cur ? ' on' : ''}${s.hidden ? ' hid' : ''}" data-i="${i}" draggable="true"><div class="n">${i + 1}${s.transition && s.transition.type !== 'none' ? '<i>★</i>' : ''}</div><div class="box" data-thumb="${i}"></div></div>`;
    });
    box.innerHTML = html;
    $$('[data-thumb]', box).forEach((n) => S.renderInto(n, deck().slides[+n.dataset.thumb], deck(), tw));
    const on = $('.ds-th.on', box); if (on) on.scrollIntoView({ block: 'nearest' });
  }
  S.renderThumb = (i) => { const n = $(`[data-thumb="${i}"]`); if (n) S.renderInto(n, deck().slides[i], deck(), n.clientWidth || 160); };
  function fitScale() { const stg = $('#dsStage'); const w = stg.clientWidth - 56, h = stg.clientHeight - 56; return Math.max(.1, Math.min(w / (deck().w * S.PX), h / (deck().h * S.PX))); }
  S.scale = () => (st.zoom ? st.zoom / 100 : fitScale());
  function renderCanvas() {
    const c = $('#dsCanvas'); if (!slide()) return; const sc = S.scale();
    S.renderInto(c, slide(), deck(), deck().w * S.PX * sc, { hints: true });
    if (st.grid) c.querySelector('.sl').style.backgroundImage += `,linear-gradient(rgba(0,0,0,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.08) 1px,transparent 1px)`, c.querySelector('.sl').style.backgroundSize = 'auto,36pt 36pt,36pt 36pt';
    if (st.editing) { const e = els().find((x) => x.id === st.editing); if (e) beginEdit(e, true); else st.editing = null; }
    drawSel(); $('#dsZoom').value = Math.round(sc * 100); $('#dsZoomPct').textContent = Math.round(sc * 100) + '%';
  }
  function renderStatus() { $('#dsSlideNo').textContent = `Slide ${st.cur + 1} / ${deck().slides.length}`; }
  function renderNotes() { const n = $('#dsNotes'); if (document.activeElement !== n) n.textContent = slide()?.notes || ''; $('#dsNotesWrap').hidden = !st.showNotes; }
  function renderTitle() { const t = $('#dsTitle'); if (document.activeElement !== t) t.textContent = deck().title || 'Bản trình chiếu'; }
  function renderAll() { $('#dsMain').classList.toggle('sorter', st.view === 'sorter'); renderTabs(); renderRibbon(); renderTitle(); if (st.view === 'sorter') return renderSorter(); renderThumbs(); renderCanvas(); renderNotes(); renderStatus(); }
  S.renderAll = renderAll;
  S.refresh = () => { renderCanvas(); S.renderThumb(st.cur); renderStatus(); renderTabs(); syncRibbon(); };
  function renderSorter() {
    const stg = $('#dsStage'); const c = $('#dsCanvas'); c.style.width = '100%'; c.style.height = 'auto'; c.style.background = 'none'; c.style.boxShadow = 'none';
    stg.style.placeItems = 'start';
    c.innerHTML = `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:22px;padding:6px">${deck().slides.map((s, i) => `<div class="ds-th${i === st.cur ? ' on' : ''}" data-i="${i}" draggable="true" style="display:block"><div class="box" data-sort="${i}"></div><div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--ds-muted);padding:4px 2px"><span>${i + 1}</span><span>${s.transition && s.transition.type !== 'none' ? '★ ' + s.transition.type : ''}</span></div></div>`).join('')}</div>`;
    $$('[data-sort]', c).forEach((n) => S.renderInto(n, deck().slides[+n.dataset.sort], deck(), n.clientWidth || 220));
    renderStatus();
  }
  function leaveSorter() { const c = $('#dsCanvas'); c.style.background = ''; c.style.boxShadow = ''; $('#dsStage').style.placeItems = ''; }

  // ---------------- selection overlay ----------------
  function drawSel() {
    const c = $('#dsCanvas'); $$('.ds-sel-box,.ds-guide', c).forEach((x) => x.remove()); const sc = S.scale() * S.PX;
    for (const e of selEls()) {
      const b = document.createElement('div'); b.className = 'ds-sel-box'; b.dataset.for = e.id;
      Object.assign(b.style, { left: e.x * sc + 'px', top: e.y * sc + 'px', width: e.w * sc + 'px', height: e.h * sc + 'px', transform: e.rot ? `rotate(${e.rot}deg)` : '' });
      if (st.editing === e.id) b.style.border = '1px dashed #8a8a8a';
      if (selEls().length === 1 && !e.locked) { const hs = e.type === 'line' ? ['nw', 'se'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']; const pos = { nw: [0, 0], n: [50, 0], ne: [100, 0], e: [100, 50], se: [100, 100], s: [50, 100], sw: [0, 100], w: [0, 50] }; for (const h of hs) { const d = document.createElement('div'); d.className = 'ds-h'; d.dataset.h = h; d.style.left = pos[h][0] + '%'; d.style.top = pos[h][1] + '%'; d.style.cursor = h + '-resize'; b.appendChild(d); } if (e.type !== 'line') { const r = document.createElement('div'); r.className = 'ds-h rot'; r.dataset.h = 'rot'; r.style.left = '50%'; r.style.top = '-24px'; b.appendChild(r); } }
      c.appendChild(b);
    }
  }
  S.select = (ids) => { commitEdit(); st.sel = ids; drawSel(); const before = st.tab; renderTabs(); const c = ctxTab(); if (ids.length === 1 && c && !['insert', 'design', 'transitions', 'animations', 'show', 'review', 'view', 'draw', 'record'].includes(st.tab)) st.tab = st.tab === 'home' ? 'home' : c[0]; if (before !== st.tab || true) { renderTabs(); renderRibbon(); } };

  // ---------------- text editing ----------------
  function beginEdit(e, silent) {
    const node = $(`#dsCanvas .el[data-id="${e.id}"] [data-tx]`); if (!node) return;
    st.editing = e.id; if (!silent) { st.sel = [e.id]; drawSel(); }
    if (!(e.text?.paras || []).some((p) => (p.runs || []).some((r) => r.t))) node.innerHTML = S.textHtml({ ...e, text: { ...e.text, paras: [{ ...(e.text?.paras?.[0] || {}), runs: [{ t: '' }] }] } }, deck(), {}).replace('<br>', '<span style="">​</span>');
    node.contentEditable = 'true'; node.classList.add('editing'); node.spellcheck = true;
    if (!silent) { node.focus(); const sel = getSelection(); const r = document.createRange(); r.selectNodeContents(node); r.collapse(false); sel.removeAllRanges(); sel.addRange(r); }
  }
  // Parse the edited DOM back into paragraphs of runs.
  function domToParas(node, prev) {
    const paras = []; const blocks = $$(':scope > p, :scope > div', node); const list = blocks.length ? blocks : [node];
    for (const p of list) {
      const para = { runs: [] }; if (p.dataset.b) para.bullet = p.dataset.b; if (+p.dataset.l) para.level = +p.dataset.l; if (p.dataset.a) para.align = p.dataset.a; else if (p.style.textAlign && p.style.textAlign !== 'left') para.align = p.style.textAlign;
      const walk = (n, inh) => {
        if (n.nodeType === 3) { const t = n.textContent.replace(/\u200b/g, ''); if (t) para.runs.push({ ...inh, t }); return; }
        if (n.nodeType !== 1 || n.hasAttribute('data-bu')) return; if (n.tagName === 'BR') { if (n.nextSibling) para.runs.push({ ...inh, t: '\n' }); return; }
        const s = n.style; const r = { ...inh };
        if (n.tagName === 'B' || n.tagName === 'STRONG' || +s.fontWeight >= 600 || s.fontWeight === 'bold') r.b = 1; if (s.fontWeight === '400' || s.fontWeight === 'normal') delete r.b;
        if (n.tagName === 'I' || n.tagName === 'EM' || s.fontStyle === 'italic') r.i = 1; if (s.fontStyle === 'normal') delete r.i;
        const td = s.textDecoration || s.textDecorationLine || ''; if (n.tagName === 'U' || /underline/.test(td)) r.u = 1; if (n.tagName === 'S' || n.tagName === 'STRIKE' || /line-through/.test(td)) r.s = 1;
        if (s.fontSize) { const m = /([\d.]+)(pt|px)/.exec(s.fontSize); if (m) r.size = Math.round((m[2] === 'px' ? +m[1] * .75 : +m[1]) * 2) / 2; }
        if (s.color) r.color = rgbHex(s.color); if (s.fontFamily) r.font = s.fontFamily.replace(/['"]/g, '').split(',')[0].trim();
        if (s.backgroundColor) r.hl = rgbHex(s.backgroundColor); if (/super/.test(s.verticalAlign)) r.sup = 1; if (/sub/.test(s.verticalAlign)) r.sub = 1; if (s.textTransform === 'uppercase') r.caps = 1;
        if (n.tagName === 'A') r.link = n.getAttribute('href');
        if (n.tagName === 'FONT') { if (n.color) r.color = n.color; if (n.face) r.font = n.face; }
        for (const k of n.childNodes) walk(k, r);
      };
      for (const k of p.childNodes) walk(k, {});
      // drop size equal to box default so later box-level size changes still apply
      paras.push(para);
    }
    // merge adjacent identical runs
    for (const p of paras) { const out = []; for (const r of p.runs) { const l = out[out.length - 1]; const k = (x) => JSON.stringify({ ...x, t: 0 }); if (l && k(l) === k(r)) l.t += r.t; else out.push(r); } p.runs = out; }
    return paras.length ? paras : [{ runs: [] }];
  }
  function rgbHex(c) { const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/.exec(c); if (!m) return c; if (m[4] === '0') return undefined; return '#' + [m[1], m[2], m[3]].map((x) => (+x).toString(16).padStart(2, '0')).join(''); }
  function commitEdit() {
    if (!st.editing) return; const e = els().find((x) => x.id === st.editing); const node = $(`#dsCanvas .el[data-id="${st.editing}"] [data-tx]`); st.editing = null;
    if (!e || !node) return; const paras = domToParas(node);
    for (const p of paras) for (const r of p.runs) { Object.keys(r).forEach((k) => r[k] === undefined && delete r[k]); if (r.size === e.text?.size) delete r.size; }
    const before = JSON.stringify(e.text?.paras); if (before !== JSON.stringify(paras)) { S.push('text'); e.text = { ...(e.text || { size: 18 }), paras }; }
    node.contentEditable = 'false'; S.renderThumb(st.cur); renderCanvas();
  }
  S.commitEdit = commitEdit;
  // apply a run style: inside an edit with a selection -> execCommand-like span wrap; else -> whole boxes
  S.styleRuns = (fn, label) => {
    if (st.editing) {
      const sel = getSelection(); if (sel.rangeCount && !sel.isCollapsed) {
        const node = $(`#dsCanvas .el[data-id="${st.editing}"] [data-tx]`); const marker = 'ds' + Date.now(); document.execCommand('styleWithCSS', false, true); document.execCommand('fontName', false, marker);
        $$(`font[face="${marker}"], span[style*="${marker}"]`, node).forEach((f) => { const sp = document.createElement('span'); const r = {}; fn(r); if (r.b !== undefined) sp.style.fontWeight = r.b ? '700' : '400'; if (r.i !== undefined) sp.style.fontStyle = r.i ? 'italic' : 'normal'; const dec = []; if (r.u) dec.push('underline'); if (r.s) dec.push('line-through'); if (r.u !== undefined || r.s !== undefined) sp.style.textDecoration = dec.join(' ') || 'none'; if (r.size) sp.style.fontSize = r.size + 'pt'; if (r.color) sp.style.color = r.color; if (r.font) sp.style.fontFamily = r.font; if (r.hl) sp.style.backgroundColor = r.hl; if (r.sup) sp.style.verticalAlign = 'super'; if (r.sub) sp.style.verticalAlign = 'sub'; if (r.caps) sp.style.textTransform = 'uppercase'; while (f.firstChild) sp.appendChild(f.firstChild); f.replaceWith(sp); $$('[style*="font-family"]', sp).forEach((x) => { if (x.style.fontFamily.includes(marker)) x.style.fontFamily = ''; }); });
        return;
      }
      commitEdit();
    }
    const t = selEls().filter((e) => e.text); if (!t.length) return S.toast('Hãy chọn một hộp văn bản hoặc hình trước.'); S.push(label);
    for (const e of t) { const probe = {}; fn(probe, e); for (const p of e.text.paras) { if (!p.runs.length) p.runs.push({ t: '' }); for (const r of p.runs) fn(r, e); } if (probe.size) e.text.size = probe.size; }
    S.refresh();
  };
  S.paraStyle = (fn, label) => { const id = st.editing; if (id) commitEdit(); const t = (id ? els().filter((e) => e.id === id) : selEls()).filter((e) => e.text); if (!t.length) return S.toast('Hãy chọn một hộp văn bản trước.'); S.push(label); for (const e of t) { e.text.paras.forEach((p) => fn(p, e)); fn.box && fn.box(e); } S.refresh(); if (id) { st.sel = [id]; beginEdit(els().find((x) => x.id === id)); } };
  S.boxStyle = (fn, label) => { if (st.editing) commitEdit(); const t = selEls(); if (!t.length) return S.toast('Hãy chọn một đối tượng trước.'); S.push(label); t.forEach(fn); S.refresh(); };
  function syncRibbon() {
    const e = selEls()[0]; const r = e?.text?.paras?.[0]?.runs?.[0] || {}; const f = $('[data-in="font"]'), z = $('[data-in="size"]');
    if (f) S.setFontControl(r.font || e?.text?.font || S.theme(deck()).font); if (z) { const v = r.size || e?.text?.size || 18; if (![...z.options].some((o) => +o.value === v)) z.insertAdjacentHTML('afterbegin', `<option>${v}</option>`); z.value = v; }
    const bmap = { b: r.b, i: r.i, u: r.u, s: r.s }; for (const k in bmap) $(`[data-cmd="${k}"]`)?.classList.toggle('on', !!bmap[k]);
    const h = $('[data-in="elH"]'), w = $('[data-in="elW"]'); if (h && e) { h.value = (e.h / 72).toFixed(2); w.value = (e.w / 72).toFixed(2); }
    const tr = slide()?.transition; $$('[data-cmd^="tr:"]').forEach((b) => b.classList.toggle('on', b.dataset.cmd === 'tr:' + (tr?.type || 'none')));
    if ($('[data-in="trDur"]') && tr) { $('[data-in="trDur"]').value = tr.dur || .7; $('[data-in="trAfterOn"]').checked = !!tr.after; $('[data-in="trAfter"]').value = tr.after || 5; }
    const an = e?.anim; $$('[data-cmd^="an:"]').forEach((b) => b.classList.toggle('on', b.dataset.cmd === 'an:' + (an?.type || 'none')));
    if ($('[data-in="anStart"]') && an) { $('[data-in="anStart"]').value = an.start || 'click'; $('[data-in="anDur"]').value = an.dur || .5; $('[data-in="anPara"]').checked = !!an.byPara; }
    $('[data-cmd="hideSlide"]')?.classList.toggle('on', !!slide()?.hidden);
    if ($('[data-in="grid"]')) $('[data-in="grid"]').checked = !!st.grid; if ($('[data-in="guides"]')) $('[data-in="guides"]').checked = st.guides !== false; if ($('[data-in="loop"]')) $('[data-in="loop"]').checked = !!deck().loop;
    if ($('[data-in="tHeader"]') && e?.type === 'table') { $('[data-in="tHeader"]').checked = e.header !== false; $('[data-in="tBand"]').checked = e.band !== false; }
  }

  // ---------------- canvas mouse ----------------
  function ptFromEvent(ev) { const r = $('#dsCanvas').getBoundingClientRect(); const sc = S.scale() * S.PX; return { x: (ev.clientX - r.left) / sc, y: (ev.clientY - r.top) / sc }; }
  S.pt = ptFromEvent;
  function hitEl(ev) { const n = ev.target.closest('.el'); if (!n) return null; return els().find((e) => e.id === n.dataset.id); }
  function onCanvasDown(ev) {
    if (ev.button !== 0) return; if (S.drawMode) return S.drawDown(ev);
    if (S.pendingInsert) { const p = ptFromEvent(ev); return S.pendingInsert(p, ev); }
    const h = ev.target.closest('.ds-h'); const p0 = ptFromEvent(ev);
    if (h) return startDrag(ev, h.dataset.h, p0);
    const tdNode = ev.target.closest('td'); let e = hitEl(ev);
    if (e && e.locked) e = null;
    if (st.editing && e && e.id === st.editing) return; // caret placement inside edit
    if (e && e.type === 'table' && tdNode && st.sel.includes(e.id)) { return editCell(e, tdNode); }
    if (!e) { commitEdit(); if (!ev.shiftKey) S.select([]); return startMarquee(ev, p0); }
    if (ev.shiftKey || ev.ctrlKey || ev.metaKey) { S.select(st.sel.includes(e.id) ? st.sel.filter((x) => x !== e.id) : [...st.sel, e.id]); return; }
    if (!st.sel.includes(e.id)) S.select([e.id]);
    startDrag(ev, 'move', p0);
  }
  function editCell(e, td) { const r = +td.dataset.r, c = +td.dataset.c; td.contentEditable = 'true'; td.focus(); document.execCommand('selectAll'); td.addEventListener('blur', () => { const v = td.innerText.replace(/\n$/, ''); if (v !== e.rows[r][c].text) { S.push('cell'); e.rows[r][c].text = v; } st.cell = { id: e.id, r, c }; S.renderThumb(st.cur); }, { once: true }); td.addEventListener('keydown', (k) => { if (k.key === 'Tab') { k.preventDefault(); td.blur(); const nx = td.nextElementSibling || td.parentElement.nextElementSibling?.firstElementChild; renderCanvas(); if (nx) { const n2 = $(`#dsCanvas .el[data-id="${e.id}"] td[data-r="${nx.dataset.r}"][data-c="${nx.dataset.c}"]`); if (n2) editCell(e, n2); } } if (k.key === 'Escape') td.blur(); k.stopPropagation(); }); st.cell = { id: e.id, r, c }; }
  function startMarquee(ev, p0) {
    const c = $('#dsCanvas'); const m = document.createElement('div'); m.className = 'ds-marquee'; c.appendChild(m); const sc = S.scale() * S.PX;
    const mv = (e2) => { const p = ptFromEvent(e2); const x = Math.min(p.x, p0.x), y = Math.min(p.y, p0.y), w = Math.abs(p.x - p0.x), h = Math.abs(p.y - p0.y); Object.assign(m.style, { left: x * sc + 'px', top: y * sc + 'px', width: w * sc + 'px', height: h * sc + 'px' }); m.box = { x, y, w, h }; };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); const b = m.box; m.remove(); if (b && b.w > 3) S.select(els().filter((e) => !e.locked && e.x >= b.x && e.y >= b.y && e.x + e.w <= b.x + b.w && e.y + e.h <= b.y + b.h).map((e) => e.id)); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function startDrag(ev, mode, p0) {
    const sel = selEls().filter((e) => !e.locked); if (!sel.length) return; const orig = sel.map((e) => ({ ...e })); let moved = false; const W = deck().w, H = deck().h;
    const e0 = orig[0]; const cx = e0.x + e0.w / 2, cy = e0.y + e0.h / 2;
    const mv = (e2) => {
      const p = ptFromEvent(e2); let dx = p.x - p0.x, dy = p.y - p0.y; if (!moved && Math.abs(dx) + Math.abs(dy) < 2) return; if (!moved) { S.push(mode); moved = true; }
      if (mode === 'move') {
        if (e2.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
        // smart guides: snap to slide centre/edges and other objects
        const g = []; if (st.guides !== false) { const bb = { x: e0.x + dx, y: e0.y + dy, w: e0.w, h: e0.h }; const others = els().filter((x) => !st.sel.includes(x.id)); const xs = [0, W / 2, W, ...others.flatMap((o) => [o.x, o.x + o.w / 2, o.x + o.w])], ys = [0, H / 2, H, ...others.flatMap((o) => [o.y, o.y + o.h / 2, o.y + o.h])];
          for (const [k, arr, set] of [['x', xs, (v) => (dx += v)], ['y', ys, (v) => (dy += v)]]) { const pts = k === 'x' ? [bb.x, bb.x + bb.w / 2, bb.x + bb.w] : [bb.y, bb.y + bb.h / 2, bb.y + bb.h]; let best = null; for (const a of arr) for (const q of pts) { const d = a - q; if (Math.abs(d) < 5 / S.scale() && (!best || Math.abs(d) < Math.abs(best.d))) best = { d, a }; } if (best) { set(best.d); g.push([k, best.a]); } } }
        sel.forEach((e, i) => { e.x = Math.round((orig[i].x + dx) * 10) / 10; e.y = Math.round((orig[i].y + dy) * 10) / 10; });
        showGuides(g);
      } else if (mode === 'rot') {
        let a = Math.atan2(p.y - cy, p.x - cx) * 180 / Math.PI + 90; if (e2.shiftKey) a = Math.round(a / 15) * 15; sel[0].rot = Math.round(((a % 360) + 360) % 360);
      } else {
        const e = sel[0], o = orig[0]; let { x, y, w, h } = o;
        if (mode.includes('e')) w = o.w + dx; if (mode.includes('s')) h = o.h + dy; if (mode.includes('w')) { x = o.x + dx; w = o.w - dx; } if (mode.includes('n')) { y = o.y + dy; h = o.h - dy; }
        if ((e2.shiftKey || e.type === 'image') && mode.length === 2 && e.type !== 'line') { const r = o.w / o.h; if (Math.abs(w / o.w) > Math.abs(h / o.h)) { const nh = w / r; if (mode.includes('n')) y = o.y + o.h - nh; h = nh; } else { const nw = h * r; if (mode.includes('w')) x = o.x + o.w - nw; w = nw; } }
        if (e.type === 'line') { if (w < 0) { e.flipH = !o.flipH; } }
        Object.assign(e, { x: Math.round(Math.min(x, x + w) * 10) / 10, y: Math.round(Math.min(y, y + h) * 10) / 10, w: Math.max(e.type === 'line' ? 0 : 4, Math.round(Math.abs(w) * 10) / 10), h: Math.max(e.type === 'line' ? 0 : 4, Math.round(Math.abs(h) * 10) / 10) });
        if (e.type === 'line') e.flipV = (h < 0) !== !!o.flipV;
      }
      renderCanvas();
    };
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); showGuides([]); if (moved) { S.renderThumb(st.cur); syncRibbon(); if (sel.some((e) => e.type === 'engine')) S.refreshBackdrop && S.refreshBackdrop(st.cur, true); } };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  }
  function showGuides(g) { const c = $('#dsCanvas'); $$('.ds-guide', c).forEach((x) => x.remove()); const sc = S.scale() * S.PX; for (const [k, v] of g) { const d = document.createElement('div'); d.className = 'ds-guide'; if (k === 'x') Object.assign(d.style, { left: v * sc + 'px', top: 0, width: '1px', height: '100%' }); else Object.assign(d.style, { top: v * sc + 'px', left: 0, height: '1px', width: '100%' }); c.appendChild(d); } }

  // ---------------- wiring ----------------
  function wire() {
    const root = $('#ds');
    root.addEventListener('click', (ev) => { const b = ev.target.closest('[data-cmd]'); if (b && !b.closest('.ds-pop')) { ev.preventDefault(); S.cmd(b.dataset.cmd, b, ev); } const t = ev.target.closest('[data-tab]'); if (t) { commitEdit(); if (t.dataset.tab === 'file') return S.cmd('file'); st.tab = t.dataset.tab; renderTabs(); renderRibbon(); } });
    root.addEventListener('mousedown', (ev) => { if (ev.target.closest('.ds-ribbon .ds-sm, .ds-ribbon .ds-big') && st.editing) ev.preventDefault(); });
    root.addEventListener('change', (ev) => { const i = ev.target.closest('[data-in]'); if (i) S.input(i.dataset.in, i.type === 'checkbox' ? i.checked : i.value, i); const c = ev.target.closest('[data-color]'); if (c) { const sw = c.parentElement.querySelector('.ds-swatch'); if (sw) sw.style.background = c.value; S.cmd('color:' + c.dataset.color + ':' + c.value); } });
    $('#dsCanvas').addEventListener('pointerdown', onCanvasDown);
    $('#dsCanvas').addEventListener('dblclick', (ev) => { const e = hitEl(ev); if (!e || e.locked) return; if (e.type === 'image' && e.ph === undefined) return S.cmd('crop'); if (e.type === 'chart') return S.cmd('editData'); if (e.type === 'table') return; if (e.type === 'line') return; if (!e.text) e.text = { size: 18, valign: 'middle', paras: [{ align: 'center', runs: [] }] }, renderCanvas(); beginEdit(e); });
    $('#dsCanvas').addEventListener('contextmenu', (ev) => { ev.preventDefault(); const e = hitEl(ev); if (e && !st.sel.includes(e.id)) S.select([e.id]); S.ctxMenu(ev, e ? 'el' : 'slide'); });
    $('#dsStage').addEventListener('pointerdown', (ev) => { if (ev.target.id === 'dsStage') { commitEdit(); S.select([]); } });
    // thumbnails
    const th = $('#dsThumbs');
    th.addEventListener('click', (ev) => { const s = ev.target.closest('[data-sec]'); if (s) { st.closedSecs[s.dataset.sec] = !st.closedSecs[s.dataset.sec]; renderThumbs(); return; } const t = ev.target.closest('.ds-th'); if (t) S.go(+t.dataset.i); });
    th.addEventListener('contextmenu', (ev) => { const t = ev.target.closest('.ds-th'); if (t) { ev.preventDefault(); S.go(+t.dataset.i); S.ctxMenu(ev, 'thumb'); } });
    const dnd = (cont) => { let from = null; cont.addEventListener('dragstart', (ev) => { const t = ev.target.closest('.ds-th'); if (t) { from = +t.dataset.i; ev.dataTransfer.effectAllowed = 'move'; } }); cont.addEventListener('dragover', (ev) => { if (from === null) return; ev.preventDefault(); $$('.drop-before', cont).forEach((x) => x.classList.remove('drop-before')); ev.target.closest('.ds-th')?.classList.add('drop-before'); }); cont.addEventListener('drop', (ev) => { ev.preventDefault(); const t = ev.target.closest('.ds-th'); let to = t ? +t.dataset.i : deck().slides.length; if (from !== null && to !== from) S.moveSlide(from, to > from ? to - 1 : to); from = null; }); cont.addEventListener('dragend', () => { from = null; $$('.drop-before', cont).forEach((x) => x.classList.remove('drop-before')); }); };
    dnd(th); dnd($('#dsCanvas'));
    $('#dsCanvas').addEventListener('click', (ev) => { if (st.view !== 'sorter') return; const t = ev.target.closest('.ds-th'); if (t) { st.cur = +t.dataset.i; renderSorter(); } });
    $('#dsCanvas').addEventListener('dblclick', (ev) => { if (st.view !== 'sorter') return; const t = ev.target.closest('.ds-th'); if (t) { st.cur = +t.dataset.i; S.cmd('vNormal'); } });
    th.addEventListener('keydown', (ev) => { if (ev.key === 'Delete' || ev.key === 'Backspace') S.cmd('delSlide'); });
    th.tabIndex = 0;
    $('#dsNotes').addEventListener('input', () => { slide().notes = $('#dsNotes').innerText.replace(/\n$/, ''); st.dirty = true; scheduleSave(); });
    $('#dsTitle').addEventListener('blur', () => { const t = $('#dsTitle').textContent.trim(); if (t && t !== deck().title) { deck().title = t; st.dirty = true; scheduleSave(); } });
    $('#dsTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } });
    $('#dsZoom').addEventListener('input', (e) => { st.zoom = +e.target.value; renderCanvas(); });
    addEventListener('resize', () => { clearTimeout(S._rz); S._rz = setTimeout(() => { if (st.view === 'sorter') renderSorter(); else { renderCanvas(); renderThumbs(); } }, 120); });
    document.addEventListener('keydown', onKey);
    document.addEventListener('paste', onPaste);
    $('#dsCanvas').addEventListener('input', () => { st.dirty = true; });
    const stg = $('#dsStage'); stg.addEventListener('dragover', (e) => { if (e.dataTransfer.types.includes('Files')) e.preventDefault(); }); stg.addEventListener('drop', (e) => { if (!e.dataTransfer.files.length) return; e.preventDefault(); const f = e.dataTransfer.files[0]; if (/^image\//.test(f.type)) S.insertImageFile(f); else S.openFile(f); });
    stg.addEventListener('wheel', (e) => { if (e.ctrlKey || e.metaKey) { e.preventDefault(); st.zoom = Math.max(20, Math.min(400, Math.round(S.scale() * 100 * (e.deltaY < 0 ? 1.1 : .9)))); renderCanvas(); } }, { passive: false });
  }
  function onPaste(ev) {
    if (st.editing) { const t = ev.clipboardData.getData('text/plain'); if (t) { ev.preventDefault(); document.execCommand('insertText', false, t); } return; }
    if (ev.target.closest('input,textarea,[contenteditable="true"]')) return;
    const f = [...ev.clipboardData.files].find((x) => /^image\//.test(x.type)); if (f) { ev.preventDefault(); return S.insertImageFile(f); }
    const txt = ev.clipboardData.getData('text/plain'); if (txt && !st.clip) { ev.preventDefault(); S.addText(txt); return; }
    if (st.clip) { ev.preventDefault(); S.cmd('paste'); }
  }
  function onKey(ev) {
    if (S.showing) return; const mod = ev.ctrlKey || ev.metaKey; const k = ev.key.toLowerCase();
    const inField = ev.target.closest('input,select,textarea,.ds-title,#dsNotes,td[contenteditable="true"],.ds-aipanel,.ds-pop');
    if (ev.key === 'F5') { ev.preventDefault(); return S.cmd(ev.shiftKey ? 'showCurrent' : 'showStart'); }
    if (mod && k === 's') { ev.preventDefault(); return S.cmd('q:save'); }
    if (mod && k === 'o') { ev.preventDefault(); return S.cmd('open'); }
    if (mod && k === 'p') { ev.preventDefault(); return S.cmd('exportPdf'); }
    if (inField) return;
    if (st.editing) {
      if (mod && ['b', 'i', 'u'].includes(k)) { ev.preventDefault(); return S.cmd(k); }
      if (mod && (ev.key === ']' || ev.key === '[')) { ev.preventDefault(); return S.cmd(ev.key === ']' ? 'grow' : 'shrink'); }
      if (ev.key === 'Escape') { const id = st.editing; commitEdit(); S.select([id]); }
      if (ev.key === 'Tab') { ev.preventDefault(); S.cmd(ev.shiftKey ? 'outdent' : 'indent'); }
      return;
    }
    if (mod && k === 'z') { ev.preventDefault(); return ev.shiftKey ? S.redo() : S.undo(); }
    if (mod && k === 'y') { ev.preventDefault(); return S.redo(); }
    if (mod && k === 'c') { ev.preventDefault(); return S.cmd('copy'); }
    if (mod && k === 'x') { ev.preventDefault(); return S.cmd('cut'); }
    if (mod && k === 'd') { ev.preventDefault(); return S.cmd(st.sel.length ? 'dupEl' : 'dupSlide'); }
    if (mod && k === 'a') { ev.preventDefault(); return S.select(els().filter((e) => !e.locked).map((e) => e.id)); }
    if (mod && k === 'm') { ev.preventDefault(); return S.cmd('newSlide'); }
    if (mod && k === 'g') { ev.preventDefault(); return S.cmd(ev.shiftKey ? 'ungroup' : 'group'); }
    if (mod && ['b', 'i', 'u'].includes(k)) { ev.preventDefault(); return S.cmd(k); }
    if (mod && (ev.key === '=' || ev.key === '+')) { ev.preventDefault(); return S.cmd('zoomIn'); }
    if (mod && ev.key === '-') { ev.preventDefault(); return S.cmd('zoomOut'); }
    if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); return st.sel.length ? S.cmd('delEl') : S.cmd('delSlide'); }
    if (ev.key === 'Escape') return S.select([]);
    if (ev.key.startsWith('Arrow')) {
      ev.preventDefault();
      if (!st.sel.length) { return S.go(st.cur + (ev.key === 'ArrowDown' || ev.key === 'ArrowRight' ? 1 : -1)); }
      const d = ev.shiftKey ? 10 : 1; S.push('nudge'); for (const e of selEls()) { if (ev.key === 'ArrowLeft') e.x -= d; if (ev.key === 'ArrowRight') e.x += d; if (ev.key === 'ArrowUp') e.y -= d; if (ev.key === 'ArrowDown') e.y += d; } return S.refresh();
    }
    if (ev.key === 'PageDown') return S.go(st.cur + 1); if (ev.key === 'PageUp') return S.go(st.cur - 1);
    if ((ev.key === 'Enter' || ev.key === 'F2') && st.sel.length === 1) { const e = selEls()[0]; if (e.text || e.type === 'shape') { ev.preventDefault(); if (!e.text) e.text = { size: 18, valign: 'middle', paras: [{ align: 'center', runs: [] }] }; renderCanvas(); beginEdit(e); } return; }
    if (st.sel.length === 1 && ev.key.length === 1 && !mod) { const e = selEls()[0]; if (e.text || e.type === 'shape') { if (!e.text) e.text = { size: 18, valign: 'middle', paras: [{ align: 'center', runs: [] }] }; S.push('type'); e.text.paras = [{ ...(e.text.paras[0] || {}), runs: [{ t: '' }] }]; renderCanvas(); beginEdit(e); } }
  }
  S.go = (i) => { commitEdit(); i = Math.max(0, Math.min(deck().slides.length - 1, i)); st.cur = i; st.sel = []; if (st.view === 'sorter') return renderSorter(); renderThumbs(); renderCanvas(); renderNotes(); renderStatus(); renderTabs(); renderRibbon(); };
  S.moveSlide = (from, to) => { S.push('move'); const [s] = deck().slides.splice(from, 1); deck().slides.splice(to, 0, s); for (const sec of deck().sections || []) { /* keep section starts index-based */ } st.cur = to; st.view === 'sorter' ? renderSorter() : renderAll(); };
  S.leaveSorter = leaveSorter; S.beginEdit = beginEdit; S.selEls = selEls; S.els = els; S.slide = slide; S.deck = deck; S.renderThumbs = renderThumbs; S.renderCanvas = renderCanvas; S.syncRibbon = syncRibbon;
})();
