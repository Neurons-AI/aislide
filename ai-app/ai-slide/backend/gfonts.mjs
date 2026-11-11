// Google Fonts for AI Slide: the catalog (1,900+ families) and on-demand download of the font
// files, cached on this computer (~/.cache/aicw-ai-slide/fonts) so every font is fetched once.
// The page shows a font as soon as it is picked; the engine (render, PDF, backdrop) gets the same
// files, so what you see is what you export.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CACHE = path.join(process.env.AICW_AI_SLIDE_CACHE || path.join(os.homedir(), '.cache', 'aicw-ai-slide'), 'fonts');
const UA_TTF = 'Mozilla/4.0'; // old UA -> Google serves plain .ttf
const WEIGHTS = ['400', '700', '400i', '700i'];
let catalog = null;

// a real TrueType/OpenType file (Google may answer an old client with EOT/WOFF2)
const isFont = (b) => b.length > 12 && ['00010000', '4f54544f', '74727565', '74746366'].includes(b.subarray(0, 4).toString('hex'));
const slug = (f) => String(f).toLowerCase().replace(/[^a-z0-9]+/g, '-');
async function fetchBuf(url, ua) { const r = await fetch(url, { headers: ua ? { 'User-Agent': ua } : {}, signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error(`Google Fonts HTTP ${r.status}`); return Buffer.from(await r.arrayBuffer()); }

/** Full catalog: [{family, category, vi, popularity}] — cached on disk for 7 days. */
export async function list() {
  if (catalog) return catalog;
  const file = path.join(CACHE, 'catalog.json');
  try { const st = await fs.stat(file); if (Date.now() - st.mtimeMs < 7 * 864e5) return (catalog = JSON.parse(await fs.readFile(file, 'utf8'))); } catch {}
  try {
    let s = (await fetchBuf('https://fonts.google.com/metadata/fonts')).toString('utf8'); s = s.slice(s.indexOf('{'));
    const d = JSON.parse(s);
    catalog = d.familyMetadataList.map((f) => ({ family: f.family, category: f.category, vi: (f.subsets || []).includes('vietnamese'), popularity: f.popularity, styles: Object.keys(f.fonts || {}) }))
      .sort((a, b) => a.popularity - b.popularity);
    await fs.mkdir(CACHE, { recursive: true }); await fs.writeFile(file, JSON.stringify(catalog));
    return catalog;
  } catch (e) {
    try { return (catalog = JSON.parse(await fs.readFile(file, 'utf8'))); } catch { throw new Error('Không tải được danh sách Google Fonts (cần Internet): ' + e.message); }
  }
}
export async function isGoogleFont(family) { try { const l = await list(); const k = String(family).toLowerCase(); return l.some((f) => f.family.toLowerCase() === k); } catch { return false; } }

/** Download regular/bold/italic files of a family (whatever exists). Returns local paths. */
export async function ensure(family) {
  const dir = path.join(CACHE, slug(family)); const done = path.join(dir, '.ok');
  if (fss.existsSync(done)) {
    const have = (await fs.readdir(dir)).filter((f) => f.endsWith('.ttf')).map((f) => path.join(dir, f));
    if (have.length && have.every((p) => { try { const fd = fss.openSync(p, 'r'); const b = Buffer.alloc(16); fss.readSync(fd, b, 0, 16, 0); fss.closeSync(fd); return isFont(b); } catch { return false; } })) return have;
    await fs.rm(dir, { recursive: true, force: true }); // a bad cache: fetch again
  }
  const meta = (await list()).find((f) => f.family.toLowerCase() === String(family).toLowerCase());
  if (!meta) throw Object.assign(new Error(`"${family}" không có trên Google Fonts`), { code: 'not_found' });
  const want = WEIGHTS.filter((w) => meta.styles.includes(w)); if (!want.length) want.push(meta.styles[0]);
  const spec = want.map((w) => `${w.endsWith('i') ? 1 : 0},${parseInt(w, 10)}`).sort().join(';');
  const css = (await fetchBuf(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(meta.family).replace(/%20/g, '+')}:ital,wght@${spec}&display=swap`, UA_TTF)).toString('utf8');
  await fs.mkdir(dir, { recursive: true }); const out = [];
  for (const block of css.split('@font-face').slice(1)) {
    const style = /font-style:\s*(\w+)/.exec(block)?.[1], weight = /font-weight:\s*(\d+)/.exec(block)?.[1], url = /url\((https:[^)]+)\)/.exec(block)?.[1];
    if (!weight || !url) continue;
    const p = path.join(dir, `${weight}${style === 'italic' ? 'i' : ''}.ttf`);
    if (!fss.existsSync(p)) { const b = await fetchBuf(url); if (!isFont(b)) continue; await fs.writeFile(p, b); } out.push(p);
  }
  if (!out.length) throw new Error(`Không tải được font "${family}"`);
  await fs.writeFile(done, meta.family); return out;
}

/** Font files as data URLs for the page's @font-face (weight/style per file). */
export async function faces(family) {
  const files = await ensure(family);
  return Promise.all(files.map(async (p) => { const n = path.basename(p, '.ttf'); return { weight: parseInt(n, 10), style: n.endsWith('i') ? 'italic' : 'normal', data: 'data:font/ttf;base64,' + (await fs.readFile(p)).toString('base64') }; }));
}

/** Local file paths of any Google family already downloaded (for the engine). */
export function cachedFiles(family) {
  const dir = path.join(CACHE, slug(family)); if (!fss.existsSync(path.join(dir, '.ok'))) return [];
  return fss.readdirSync(dir).filter((f) => f.endsWith('.ttf')).map((f) => path.join(dir, f)).filter((p) => isFont(fss.readFileSync(p).subarray(0, 16)));
}
