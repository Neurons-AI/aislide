// Backend of AI Slide: opens and saves every PowerPoint format, builds PDFs, keeps drafts.
// The page edits the deck (JSON); this file converts files <-> deck. No model here.
import fs from 'node:fs/promises';
import path from 'node:path';
import { readPptx, writePptx } from './pptx.mjs';
import * as engine from './engine.mjs';
import * as gfonts from './gfonts.mjs';
// A Rust panic / failed engine build is a CODE bug: the user still gets a result (fallback), and the
// page calls `reportEngineBug`, which re-raises it so AICoworker's bug ledger + self-healing see it.
let lastEngineBug = null;
const noteEngine = (e) => { if (e && e.code === 'code_error') { lastEngineBug = e; return true; } return false; };
import { toDeck, fromDeck } from './dcmodel.mjs';
import { readPpt, readOdp, writeOdp, soffice, findSoffice, convertLegacy } from './legacy.mjs';

// The DeckCraft engine (Rust->WASM, github.com/xnohat/deckcraft) is the primary file engine:
// it opens the PowerPoint family with full fidelity and keeps the whole document model (masters,
// themes, SmartArt, effects…) as the "master copy" in the user's data folder. The page edits a
// lighter deck; saving merges the edits back into the master copy and the engine writes the file.
// The JS reader/writer (pptx.mjs) is the fallback when the engine is missing or fails.
const masterPath = (ctx, key) => path.join(ctx.userDataDir, 'engine', String(key || 'current').replace(/[^\w.-]/g, '_') + '.json');
async function loadMaster(ctx, key) { try { return JSON.parse(await fs.readFile(masterPath(ctx, key), 'utf8')); } catch { return null; } }
async function storeMaster(ctx, key, res) { await fs.mkdir(path.dirname(masterPath(ctx, key)), { recursive: true }); await fs.writeFile(masterPath(ctx, key), JSON.stringify(res)); }
// fresh per-user scratch folder for LibreOffice conversions
async function scratch(ctx) { if (!ctx?.userDataDir) return undefined; const base = path.join(ctx.userDataDir, 'convert'); await fs.mkdir(base, { recursive: true }); return fs.mkdtemp(path.join(base, 'c-')); }
const newKey = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const ENGINE_EXT = ['pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm', 'deckcraft'];
async function engineOpen(buf, ext, ctx) {
  if (!engine.engineAvailable()) return null;
  let src = buf, e2 = ext;
  if (['ppt', 'pps', 'pot', 'odp', 'otp'].includes(ext) || (buf.readUInt32LE(0) === 0xe011cfd0 && !ENGINE_EXT.includes(ext))) { src = await convertLegacy(buf, ext, 'pptx', await scratch(ctx)); e2 = 'pptx'; if (!src) return null; }
  if (!ENGINE_EXT.includes(e2) && !(src[0] === 0x50 && src[1] === 0x4b)) return null;
  const res = await engine.importFile(src); const key = newKey(); await storeMaster(ctx, key, res);
  const deck = toDeck(res); deck.engineKey = key; return { deck, warnings: (res.warnings || []).slice(0, 4) };
}
const bad = (m, code = 'bad_args') => Object.assign(new Error(m), { code });
const OOXML = ['pptx', 'pptm', 'potx', 'potm', 'ppsx', 'ppsm'];
const MIME_EXTRA = { deckcraft: 'application/zip' };
const LEGACY = ['ppt', 'pps', 'pot'];
const MIME = {
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', pptm: 'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
  potx: 'application/vnd.openxmlformats-officedocument.presentationml.template', potm: 'application/vnd.ms-powerpoint.template.macroEnabled.12',
  ppsx: 'application/vnd.openxmlformats-officedocument.presentationml.slideshow', ppsm: 'application/vnd.ms-powerpoint.slideshow.macroEnabled.12',
  ppt: 'application/vnd.ms-powerpoint', pps: 'application/vnd.ms-powerpoint', pot: 'application/vnd.ms-powerpoint',
  odp: 'application/vnd.oasis.opendocument.presentation', otp: 'application/vnd.oasis.opendocument.presentation-template',
  pdf: 'application/pdf', json: 'application/json', txt: 'text/plain', rtf: 'application/rtf', png: 'image/png', jpg: 'image/jpeg',
};

async function convert(buf, name, ctx = {}) {
  const ext = String(name).split('.').pop().toLowerCase();
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; const isCfb = buf.readUInt32LE(0) === 0xe011cfd0;
  if (OOXML.includes(ext) || (isZip && !['odp', 'otp'].includes(ext))) {
    if (isCfb) throw bad('Tệp được bảo vệ bằng mật khẩu — hãy bỏ mật khẩu trong PowerPoint rồi mở lại.', 'encrypted');
    return readPptx(buf);
  }
  if (['odp', 'otp'].includes(ext)) return readOdp(buf);
  if (LEGACY.includes(ext) || isCfb) {
    const conv = await convertLegacy(buf, ext === 'pps' || ext === 'pot' ? 'ppt' : ext, 'pptx', await scratch(ctx));
    if (conv) return readPptx(conv);
    return readPpt(buf);
  }
  if (ext === 'json') return { deck: JSON.parse(buf.toString('utf8')), warnings: [] };
  if (['txt', 'md'].includes(ext)) return { deck: outlineToDeck(buf.toString('utf8')), warnings: ['Đã tạo slide từ dàn ý (mỗi dòng không thụt lề = 1 slide).'] };
  throw bad(`Chưa hỗ trợ định dạng .${ext}`, 'unsupported');
}

// Outline: non-indented line = new slide title, indented / "-" lines = bullets.
function outlineToDeck(text) {
  const slides = []; let cur = null; let n = 0;
  for (const raw of String(text).replace(/\r/g, '').split('\n')) {
    if (!raw.trim()) continue;
    const ind = /^(\s+|[-*•]\s)/.test(raw); const t = raw.replace(/^[\s\-*•#]+/, '').trim();
    if (!ind || !cur) { cur = { title: t, bullets: [] }; slides.push(cur); } else cur.bullets.push({ t, level: Math.min(4, Math.floor((raw.match(/^\s*/)[0].length) / 2)) });
  }
  return { title: slides[0]?.title || '', w: 960, h: 540, sections: [], slides: slides.map((s) => ({ id: `s${n++}`, bg: { color: '#ffffff' }, notes: '', els: [
    { id: `t${n}`, type: 'text', ph: 'title', x: 60, y: 36, w: 840, h: 90, text: { size: 40, valign: 'middle', paras: [{ runs: [{ t: s.title }] }] } },
    ...(s.bullets.length ? [{ id: `b${n}`, type: 'text', ph: 'body', x: 60, y: 140, w: 840, h: 360, text: { size: 24, valign: 'top', paras: s.bullets.map((b) => ({ runs: [{ t: b.t }], level: b.level, bullet: 'bullet' })) } }] : []),
  ] })) };
}

// Minimal PDF of full-page JPEG images (one per slide), page size = slide size in pt.
function imagesToPdf(images, w, h) {
  const objs = []; const add = (s) => { objs.push(s); return objs.length; };
  const pages = []; const catalog = add(null); const pagesId = add(null);
  for (const img of images) {
    const m = /^data:image\/jpeg;base64,(.*)$/s.exec(img); if (!m) throw bad('Ảnh slide phải là JPEG.');
    const jpg = Buffer.from(m[1], 'base64'); let iw = 1600, ih = 900;
    for (let i = 2; i < jpg.length - 9;) { if (jpg[i] !== 0xff) { i++; continue; } const mk = jpg[i + 1]; const len = jpg.readUInt16BE(i + 2); if (mk >= 0xc0 && mk <= 0xc3) { ih = jpg.readUInt16BE(i + 5); iw = jpg.readUInt16BE(i + 7); break; } i += 2 + len; }
    const im = add(Buffer.concat([Buffer.from(`<< /Type /XObject /Subtype /Image /Width ${iw} /Height ${ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n`), jpg, Buffer.from('\nendstream')]));
    const content = `q ${w} 0 0 ${h} 0 0 cm /Im0 Do Q`;
    const cs = add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    pages.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${w} ${h}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cs} 0 R >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${pages.map((p) => `${p} 0 R`).join(' ')}] /Count ${pages.length} >>`;
  const chunks = [Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary')]; const offs = []; let len = chunks[0].length;
  objs.forEach((o, i) => { const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`), Buffer.isBuffer(o) ? o : Buffer.from(o, 'binary'), Buffer.from('\nendobj\n')]); offs.push(len); chunks.push(b); len += b.length; });
  const xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${len}\n%%EOF`;
  chunks.push(Buffer.from(xref)); return Buffer.concat(chunks);
}

function deckToOutline(deck) {
  return (deck.slides || []).map((s, i) => { const lines = []; for (const e of s.els || []) for (const p of e.text?.paras || []) { const t = (p.runs || []).map((r) => r.t).join(''); if (t.trim()) lines.push(e.ph === 'title' ? t : `${'  '.repeat((p.level || 0) + 1)}- ${t}`); } if (!lines.length) lines.push(`Slide ${i + 1}`); return lines.join('\n'); }).join('\n\n');
}

const clean = (t) => String(t || 'Bản trình chiếu').replace(/[\\/:*?"<>|]+/g, '_').slice(0, 80);

export const commands = {
  async openFile({ fileId, name }, ctx) {
    const p = await ctx.files.path(fileId);
    if (!p) throw bad('Không tìm thấy tệp vừa tải lên.', 'not_found');
    const buf = await fs.readFile(p); const fname = name || path.basename(p);
    const ext = fname.split('.').pop().toLowerCase(); let r = null;
    if (!['txt', 'md', 'json'].includes(ext)) { try { r = await engineOpen(buf, ext, ctx); } catch (e) { noteEngine(e); if (e.code === 'encrypted') throw bad('Tệp được bảo vệ bằng mật khẩu — hãy bỏ mật khẩu trong PowerPoint rồi mở lại.', 'encrypted'); } }
    if (!r) r = await convert(buf, fname, ctx);
    r.deck.title = r.deck.title || fname.replace(/\.[^.]+$/, '');
    await remember(ctx, fname);
    return { name: fname, deck: r.deck, warnings: r.warnings || [], ...(lastEngineBug ? { engineBug: true } : {}) };
  },

  /** Re-raise the last engine code bug (Rust panic / compile error) so the platform records it. */
  async reportEngineBug() {
    const e = lastEngineBug; lastEngineBug = null;
    if (e) throw e;
    return { ok: true };
  },

  async fromOutline({ text, title }) {
    if (!String(text || '').trim()) throw bad('Dàn ý trống.');
    const deck = outlineToDeck(text); if (title) deck.title = title; return { deck };
  },

  async save({ format, deck, images }, ctx) {
    if (!deck || !Array.isArray(deck.slides)) throw bad('Thiếu nội dung bản trình chiếu.');
    const base = clean(deck.title); let data; let ext = format; const warnings = [];
    let pptxBuf = null;
    const viaEngine = async (fmt) => { if (!engine.engineAvailable()) return null; try { const master = deck.engineKey ? await loadMaster(ctx, deck.engineKey) : null; const res = fromDeck(deck, master); const out = await engine.exportFile(res, fmt); if (deck.engineKey) await storeMaster(ctx, deck.engineKey, res); return out; } catch (e) { noteEngine(e); warnings.push('Engine: ' + String(e.message || e).slice(0, 160) + ' — đã dùng bộ ghi dự phòng.'); return null; } };
    if (OOXML.includes(format)) data = (await viaEngine(format)) || (await writePptx(deck, format));
    else if (format === 'deckcraft') data = await viaEngine('deckcraft');
    else if (format === 'pdf' && engine.engineAvailable() && !images?.length) { const master = deck.engineKey ? await loadMaster(ctx, deck.engineKey) : null; data = await engine.exportPdf(fromDeck(deck, master), 0); }
    else if (LEGACY.includes(format) || format === 'odp' || format === 'otp') {
      pptxBuf = (await viaEngine('pptx')) || (await writePptx(deck, 'pptx'));
      const x = pptxBuf; data = await convertLegacy(x, 'pptx', format, await scratch(ctx));
      if (!data && (format === 'odp' || format === 'otp')) data = await writeOdp(deck, format === 'otp');
      if (!data) { data = x; ext = 'pptx'; warnings.push(`Chưa có LibreOffice (bước cài của app sẽ tự cài) để ghi .${format} (97-2003) — đã lưu .pptx, mọi bản PowerPoint từ 2007 đều mở được.`); }
    }
    else if (format === 'pdf') { if (!images?.length) throw bad('Thiếu ảnh các slide để xuất PDF.'); data = imagesToPdf(images, deck.w || 960, deck.h || 540); }
    else if (format === 'txt' || format === 'rtf') { const o = deckToOutline(deck); data = Buffer.from(format === 'txt' ? o : `{\\rtf1\\ansi\\uc1 ${o.replace(/[\\{}]/g, (c) => '\\' + c).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0)}?`).replace(/\n/g, '\\par\n')}}`, 'utf8'); }
    else if (format === 'json') data = Buffer.from(JSON.stringify(deck), 'utf8');
    else throw bad(`Định dạng không hỗ trợ: ${format}`);
    const name = `${base}.${ext}`;
    if (!data) throw bad(`Không ghi được .${format}`, 'failed');
    const f = await ctx.files.put({ name, data, mime: MIME[ext] || MIME_EXTRA[ext] });
    await remember(ctx, name);
    return { id: f.id, url: f.url, name, bytes: data.length, warnings, ...(lastEngineBug ? { engineBug: true } : {}) };
  },

  async renderBackdrop({ engineKey, deck, index, width, skip }, ctx) {
    const master = engineKey ? await loadMaster(ctx, engineKey) : null; if (!master) return { png: '', missing: true }; // original gone (cleared data): the page draws without the engine backdrop
    const res = deck ? fromDeck(deck, master) : master;
    const png = await engine.renderBackdrop(res, index | 0, Math.min(3840, Math.max(64, width | 0 || 1280)), (skip || []).map(Number));
    return { png: 'data:image/png;base64,' + png.toString('base64') };
  },

  // Google Fonts: catalog for the font picker, and the files of one family for the page
  async fontList({ query, vi, limit }) { const all = await gfonts.list(); const q = String(query || '').toLowerCase(); let r = all.filter((f) => (!q || f.family.toLowerCase().includes(q)) && (!vi || f.vi)); return { total: r.length, items: r.slice(0, Math.min(5000, limit || 200)).map(({ family, category, vi: v }) => ({ family, category, vi: v })) }; },
  async fontFaces({ family }) { return { family, faces: await gfonts.faces(family) }; },
  async capabilities() { return { soffice: !!findSoffice(), converter: findSoffice() ? 'libreoffice' : null, read: [...OOXML, ...LEGACY, 'odp', 'otp', 'txt', 'md', 'json'], write: [...OOXML, ...LEGACY, 'odp', 'otp', 'pdf', 'png', 'jpg', 'txt', 'rtf'] }; },

  async recent(_a, ctx) { return { items: (await ctx.store.user.get('recent')) || [] }; },

  async saveDraft({ deck }, ctx) {
    if (!deck || !Array.isArray(deck.slides)) throw bad('Thiếu nội dung.');
    const s = JSON.stringify(deck); if (s.length > 25_000_000) throw bad('Bản trình chiếu quá lớn để tự lưu (>25 MB).', 'too_large');
    await fs.mkdir(ctx.userDataDir, { recursive: true });
    await fs.writeFile(path.join(ctx.userDataDir, 'draft.json'), s);
    await ctx.store.user.set('draftMeta', { title: deck.title || '', at: Date.now(), slides: deck.slides.length });
    return { ok: true, at: Date.now() };
  },

  async loadDraft(_a, ctx) {
    try { return { deck: JSON.parse(await fs.readFile(path.join(ctx.userDataDir, 'draft.json'), 'utf8')) }; } catch { return { deck: null }; }
  },
};

async function remember(ctx, name) {
  const list = ((await ctx.store.user.get('recent')) || []).filter((x) => x.name !== name);
  list.unshift({ name, at: Date.now() });
  await ctx.store.user.set('recent', list.slice(0, 12));
}

export const _test = { convert, outlineToDeck, imagesToPdf };
