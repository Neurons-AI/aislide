// Legacy PowerPoint 97-2003 (.ppt/.pps/.pot) text reader, ODP (OpenDocument) reader/writer,
// and an optional LibreOffice bridge for full-fidelity conversions when soffice is installed.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
import { uid } from './pptx.mjs';
const require = createRequire(import.meta.url);
const lib = (n) => { try { return require(n); } catch { const e = new Error(`Thiếu thư viện "${n}" — bấm Install.`); e.code = 'setup_required'; throw e; } };
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// ---------- .ppt (binary) -> deck: titles + bullet text per slide ----------
export function readPpt(buf) {
  const CFB = lib('cfb');
  const cf = CFB.read(buf, { type: 'buffer' });
  const ent = CFB.find(cf, 'PowerPoint Document');
  if (!ent) throw Object.assign(new Error('Tệp .ppt không có luồng PowerPoint Document.'), { code: 'bad_file' });
  const d = Buffer.from(ent.content);
  const slides = []; let cur = null; let textType = 1;
  function walk(off, end, inSlwt) {
    while (off + 8 <= end) {
      const verInst = d.readUInt16LE(off), type = d.readUInt16LE(off + 2), len = d.readUInt32LE(off + 4);
      const body = off + 8; const isContainer = (verInst & 0xf) === 0xf;
      if (body + len > d.length) break;
      if (type === 0x0FF0) { walk(body, body + len, true); } // SlideListWithText
      else if (inSlwt && type === 0x03F3) { cur = { texts: [] }; slides.push(cur); } // SlidePersistAtom
      else if (type === 0x0F9F) textType = d.readUInt32LE(body); // TextHeaderAtom
      else if ((type === 0x0FA0 || type === 0x0FA8) && inSlwt && cur) {
        const s = type === 0x0FA0 ? d.toString('utf16le', body, body + len) : d.toString('latin1', body, body + len);
        cur.texts.push({ kind: textType, s: s.replace(/\r/g, '\n').replace(/\u000b/g, '\n') });
      } else if (isContainer && type !== 0x0FF0 && inSlwt) walk(body, body + len, inSlwt);
      else if (isContainer && !inSlwt && type === 0x03E8) walk(body, body + len, false); // Document container
      off = body + len;
    }
  }
  walk(0, d.length, false);
  const out = slides.filter((s) => s.texts.length).map((s) => {
    const els = []; let y = 140;
    const title = s.texts.find((t) => t.kind === 0 || t.kind === 6);
    if (title) els.push({ id: uid(), type: 'text', ph: 'title', x: 48, y: 30, w: 864, h: 90, text: { size: 40, valign: 'middle', paras: [{ runs: [{ t: title.s.trim() }] }] } });
    for (const t of s.texts.filter((x) => x !== title)) {
      const paras = t.s.split('\n').filter((l) => l.trim()).map((l) => ({ runs: [{ t: l.replace(/^\t+/, '') }], level: (l.match(/^\t+/) || [''])[0].length, bullet: t.kind === 1 || t.kind === 5 || t.kind === 7 ? 'bullet' : undefined }));
      if (!paras.length) continue;
      const h = Math.min(380, 34 * paras.length + 20);
      els.push({ id: uid(), type: 'text', ph: t.kind === 1 ? 'body' : undefined, x: 48, y, w: 864, h, text: { size: 22, valign: 'top', paras } }); y += h + 10;
    }
    return { id: uid('s'), layout: 'Title and Content', bg: { color: '#ffffff' }, els, notes: '' };
  });
  return { deck: { title: '', w: 960, h: 540, slides: out.length ? out : [{ id: uid('s'), els: [], bg: { color: '#ffffff' } }], sections: [] }, warnings: ['Tệp PowerPoint 97-2003 (.ppt): đã lấy chữ của từng slide; hình và bố cục cũ cần LibreOffice để giữ nguyên.'] };
}

// ---------- ODP ----------
const cm = (v) => { const m = /^([\d.\-]+)(cm|mm|in|pt|px)?$/.exec(String(v || '0')); if (!m) return 0; const n = +m[1]; return { cm: n * 28.3465, mm: n * 2.83465, in: n * 72, pt: n, px: n * 0.75 }[m[2] || 'cm']; };
export async function readOdp(buf) {
  const JSZip = lib('jszip'); const { DOMParser } = lib('@xmldom/xmldom');
  const zip = await JSZip.loadAsync(buf);
  const xml = await zip.file('content.xml')?.async('string'); if (!xml) throw Object.assign(new Error('Tệp ODP hỏng (thiếu content.xml).'), { code: 'bad_file' });
  const doc = new DOMParser({ onError: () => {} }).parseFromString(xml, 'text/xml');
  const sxml = await zip.file('styles.xml')?.async('string');
  let W = 960, H = 540;
  if (sxml) { const m = /fo:page-width="([^"]+)"[^>]*fo:page-height="([^"]+)"/.exec(sxml); if (m) { W = Math.round(cm(m[1])); H = Math.round(cm(m[2])); } }
  const pages = Array.from(doc.getElementsByTagName('draw:page'));
  const slides = [];
  for (const pg of pages) {
    const els = [];
    for (const n of Array.from(pg.childNodes).filter((c) => c.nodeType === 1)) {
      const box = { id: uid(), x: cm(n.getAttribute('svg:x')), y: cm(n.getAttribute('svg:y')), w: cm(n.getAttribute('svg:width')), h: cm(n.getAttribute('svg:height')) };
      const paras = Array.from(n.getElementsByTagName('text:p')).map((p) => ({ runs: [{ t: p.textContent }], bullet: p.parentNode?.localName === 'list-item' ? 'bullet' : undefined }));
      const img = n.getElementsByTagName('draw:image')[0];
      if (img) { const href = img.getAttribute('xlink:href'); const f = href && zip.file(href); if (f) { const ext = href.split('.').pop().toLowerCase(); els.push({ ...box, type: 'image', src: `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${await f.async('base64')}` }); } continue; }
      const cls = n.getAttribute('presentation:class');
      if (n.localName === 'frame' || n.localName === 'custom-shape' || n.localName === 'rect' || n.localName === 'ellipse') {
        if (!paras.length && n.localName === 'frame') continue;
        const isShape = n.localName !== 'frame';
        els.push({ ...box, type: isShape ? 'shape' : 'text', ...(isShape ? { shape: n.localName === 'ellipse' ? 'ellipse' : 'rect', fill: '#4472C4' } : {}), ...(cls === 'title' ? { ph: 'title' } : {}), text: { size: cls === 'title' ? 40 : 22, valign: cls === 'title' || isShape ? 'middle' : 'top', paras: paras.length ? paras : [{ runs: [] }] } });
      }
    }
    const notes = pg.getElementsByTagName('presentation:notes')[0];
    slides.push({ id: uid('s'), bg: { color: '#ffffff' }, els, notes: notes ? Array.from(notes.getElementsByTagName('text:p')).map((p) => p.textContent).join('\n') : '' });
  }
  return { deck: { title: '', w: W, h: H, slides, sections: [] }, warnings: [] };
}
export async function writeOdp(deck, template = false) {
  const JSZip = lib('jszip'); const zip = new JSZip();
  const W = deck.w || 960, H = deck.h || 540; const c = (pt) => `${(pt / 28.3465).toFixed(3)}cm`;
  const mime = template ? 'application/vnd.oasis.opendocument.presentation-template' : 'application/vnd.oasis.opendocument.presentation';
  zip.file('mimetype', mime, { compression: 'STORE' });
  const auto = []; let sn = 0; const pics = [];
  const pages = (deck.slides || []).map((s, i) => {
    const bg = s.bg?.color || '#ffffff'; const dp = `dp${i}`; auto.push(`<style:style style:name="${dp}" style:family="drawing-page"><style:drawing-page-properties draw:fill="solid" draw:fill-color="${bg}"/></style:style>`);
    const shapes = (s.els || []).map((e) => {
      const g = `x="${c(e.x)}" svg:y="${c(e.y)}" svg:width="${c(e.w)}" svg:height="${c(e.h)}"`;
      const st = `gr${sn++}`;
      const tx = (e.text?.paras || []).map((p) => { const r0 = p.runs?.[0] || {}; const ps = `P${sn++}`; auto.push(`<style:style style:name="${ps}" style:family="paragraph"><style:paragraph-properties fo:text-align="${{ center: 'center', right: 'end', justify: 'justify' }[p.align] || 'start'}"/><style:text-properties fo:font-size="${r0.size || e.text.size || 18}pt" fo:color="${r0.color || e.text.color || '#1f2937'}"${r0.b ? ' fo:font-weight="bold"' : ''}${r0.i ? ' fo:font-style="italic"' : ''}/></style:style>`); return `<text:p text:style-name="${ps}">${esc((p.runs || []).map((r) => r.t).join(''))}</text:p>`; }).join('');
      if (e.type === 'image' && e.src?.startsWith('data:')) { const m = /^data:image\/(\w+);base64,(.*)$/s.exec(e.src); if (!m) return ''; const name = `Pictures/p${pics.length}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`; pics.push(name); zip.file(name, Buffer.from(m[2], 'base64')); return `<draw:frame svg:${g}><draw:image xlink:href="${name}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>`; }
      if (e.type === 'shape') { auto.push(`<style:style style:name="${st}" style:family="graphic"><style:graphic-properties draw:fill="solid" draw:fill-color="${e.fill || '#4472C4'}" draw:stroke="${e.line ? 'solid' : 'none'}"${e.line ? ` svg:stroke-color="${e.line.color}"` : ''} draw:textarea-vertical-align="middle"/></style:style>`); return `<draw:custom-shape draw:style-name="${st}" svg:${g}>${tx}<draw:enhanced-geometry draw:type="${{ ellipse: 'ellipse', roundRect: 'round-rectangle', triangle: 'isosceles-triangle', diamond: 'diamond', rightArrow: 'right-arrow', star5: 'star5' }[e.shape] || 'rectangle'}"/></draw:custom-shape>`; }
      if (e.type === 'line') return `<draw:line svg:x1="${c(e.x)}" svg:y1="${c(e.y)}" svg:x2="${c(e.x + e.w)}" svg:y2="${c(e.y + e.h)}"/>`;
      if (e.type === 'table') return `<draw:frame svg:${g}><draw:text-box>${(e.rows || []).map((r) => `<text:p>${esc(r.map((x) => x.text).join('  |  '))}</text:p>`).join('')}</draw:text-box></draw:frame>`;
      return `<draw:frame svg:${g}${e.ph === 'title' ? ' presentation:class="title"' : ''}><draw:text-box>${tx}</draw:text-box></draw:frame>`;
    }).join('');
    const notes = s.notes ? `<presentation:notes><draw:frame presentation:class="notes" svg:x="2cm" svg:y="14cm" svg:width="17cm" svg:height="10cm"><draw:text-box>${String(s.notes).split('\n').map((l) => `<text:p>${esc(l)}</text:p>`).join('')}</draw:text-box></draw:frame></presentation:notes>` : '';
    return `<draw:page draw:name="page${i + 1}" draw:style-name="${dp}" draw:master-page-name="Default">${shapes}${notes}</draw:page>`;
  }).join('');
  const NSX = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0" office:version="1.2"';
  zip.file('content.xml', `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${NSX}><office:automatic-styles>${auto.join('')}</office:automatic-styles><office:body><office:presentation>${pages}</office:presentation></office:body></office:document-content>`);
  zip.file('styles.xml', `<?xml version="1.0" encoding="UTF-8"?><office:document-styles ${NSX}><office:automatic-styles><style:page-layout style:name="PM1"><style:page-layout-properties fo:margin-top="0cm" fo:margin-bottom="0cm" fo:margin-left="0cm" fo:margin-right="0cm" fo:page-width="${c(W)}" fo:page-height="${c(H)}" style:print-orientation="landscape"/></style:page-layout></office:automatic-styles><office:master-styles><style:master-page style:name="Default" style:page-layout-name="PM1"/></office:master-styles></office:document-styles>`);
  zip.file('meta.xml', `<?xml version="1.0" encoding="UTF-8"?><office:document-meta ${NSX} xmlns:dc="http://purl.org/dc/elements/1.1/"><office:meta><dc:title>${esc(deck.title || '')}</dc:title></office:meta></office:document-meta>`);
  zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?><manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:media-type="${mime}"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>${pics.map((p) => `<manifest:file-entry manifest:full-path="${p}" manifest:media-type="image/${p.endsWith('png') ? 'png' : 'jpeg'}"/>`).join('')}</manifest:manifest>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', mimeType: mime });
}

// ---------- LibreOffice bridge (optional) ----------
export function findSoffice() {
  const c = [process.env.SOFFICE, '/Applications/LibreOffice.app/Contents/MacOS/soffice', '/usr/bin/soffice', '/usr/local/bin/soffice', '/opt/homebrew/bin/soffice', 'C:\\Program Files\\LibreOffice\\program\\soffice.exe', 'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe'].filter(Boolean);
  return c.find((p) => { try { return fss.statSync(p).isFile(); } catch { return false; } }) || null;
}
export async function soffice(buf, inExt, outFilter, outExt) {
  const bin = findSoffice(); if (!bin) return null;
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'aislide-'));
  try {
    const inp = path.join(dir, `in.${inExt}`); await fs.writeFile(inp, buf);
    await new Promise((res, rej) => execFile(bin, ['--headless', '--norestore', `-env:UserInstallation=file://${dir.replace(/\\/g, '/')}/profile`, '--convert-to', outFilter, '--outdir', dir, inp], { timeout: 120000 }, (e) => (e ? rej(e) : res())));
    return await fs.readFile(path.join(dir, `in.${outExt}`));
  } catch { return null; } finally { fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}

// ---------- Microsoft PowerPoint bridge (used when LibreOffice is absent) ----------
// macOS: AppleScript "save as"; Windows: PowerPoint COM through PowerShell. Same fidelity as PowerPoint itself.
const PP_MAC = '/Applications/Microsoft PowerPoint.app';
export function findPowerPoint() {
  if (process.platform === 'darwin') return fss.existsSync(PP_MAC) ? 'mac' : null;
  if (process.platform === 'win32') { const pf = [process.env.ProgramFiles, process.env['ProgramFiles(x86)']].filter(Boolean); for (const b of pf) for (const v of ['Office16', 'Office15', 'Office14', 'root\\Office16']) { if (fss.existsSync(path.join(b, 'Microsoft Office', v, 'POWERPNT.EXE'))) return 'win'; } }
  return null;
}
// PowerPoint save-as codes (PpSaveAsFileType). macOS AppleScript uses the same names.
const PP_FMT = { pptx: ['save as Open XML presentation', 24], ppt: ['save as presentation', 1], pps: ['save as show', 7], pot: ['save as template', 5], pptm: ['save as Open XML presentation macro enabled', 25], ppsx: ['save as Open XML show', 28], potx: ['save as Open XML template', 26] };
export async function powerpoint(buf, inExt, outExt) {
  const kind = findPowerPoint(); if (!kind || !PP_FMT[outExt]) return null;
  // PowerPoint for Mac is sandboxed: work inside ~/Library/Containers/.../Data/tmp
  const base = kind === 'mac' ? path.join(os.homedir(), 'Library/Containers/com.microsoft.Powerpoint/Data/tmp') : os.tmpdir();
  await fs.mkdir(base, { recursive: true }); const dir = await fs.mkdtemp(path.join(base, 'aislide-'));
  const inp = path.join(dir, `in.${inExt}`), outp = path.join(dir, `out.${outExt}`);
  try {
    await fs.writeFile(inp, buf);
    if (kind === 'mac') {
      const script = `with timeout of 180 seconds
tell application "Microsoft PowerPoint"
  set wasRunning to running
  open POSIX file "${inp}"
  set p to active presentation
  save p in POSIX file "${outp}" as ${PP_FMT[outExt][0]}
  close p saving no
  if not wasRunning and (count of presentations) is 0 then quit
end tell
end timeout`;
      await new Promise((res, rej) => execFile('osascript', ['-e', script], { timeout: 200000 }, (e, o, er) => (e ? rej(new Error(er || e.message)) : res())));
    } else {
      const ps = `$pp = New-Object -ComObject PowerPoint.Application; $p = $pp.Presentations.Open('${inp}', $true, $false, $false); $p.SaveAs('${outp}', ${PP_FMT[outExt][1]}); $p.Close(); if ($pp.Presentations.Count -eq 0) { $pp.Quit() }`;
      await new Promise((res, rej) => execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { timeout: 200000 }, (e, o, er) => (e ? rej(new Error(er || e.message)) : res())));
    }
    return await fs.readFile(outp);
  } catch { return null; } finally { fs.rm(dir, { recursive: true, force: true }).catch(() => {}); }
}
// best available converter: LibreOffice first (headless, no UI), then PowerPoint
export async function convertLegacy(buf, inExt, outExt) {
  const filter = outExt === 'pptx' ? 'pptx' : outExt === 'ppt' ? 'ppt:MS PowerPoint 97' : outExt === 'pps' ? 'pps:MS PowerPoint 97 AutoPlay' : outExt === 'pot' ? 'pot:MS PowerPoint 97 Vorlage' : outExt;
  return (await soffice(buf, inExt, filter, outExt)) || (await powerpoint(buf, inExt, outExt));
}
