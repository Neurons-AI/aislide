// DeckCraft engine (Rust -> WebAssembly) loader for the AI Slide backend.
// REPAIRING A BUG THAT POINTS HERE: the bug is almost always in the Rust source named in the
// error (engine-src/crates/<crate>/src/<file>.rs:<line>), not in this file. Read ../ENGINE-REPAIR.md,
// fix the .rs in your copy; this loader rebuilds the wasm from engine-src by itself.
// Source: github.com/xnohat/deckcraft, crate crates/wasm-core (C ABI, JSON in/out).
// Build/refresh the .wasm: projects/deckcraft/scripts/build-ai-slide-engine.sh
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.dirname(HERE);
const SHIPPED = path.join(HERE, 'engine', 'deckcraft.wasm');
const SRC = path.join(APP, 'engine-src');          // the Rust source of the engine (repairable)
const STAMP = path.join(HERE, 'engine', 'SOURCE_HASH'); // hash of engine-src the shipped wasm was built from
let inst = null; let instFrom = null;

// ---------- the engine is built from engine-src when that source changed (a repair) ----------
// Hash of every file that changes the build: crates/**/{*.rs,Cargo.toml}, Cargo.toml, Cargo.lock.
export function sourceHash(dir = SRC) {
  const h = crypto.createHash('sha256'); const files = [];
  const walk = (d, rel) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { if (e.name === 'target' || e.name.startsWith('.') || e.name === 'Cargo.lock') continue; /* cargo rewrites the lock on build: hash only what a person edits */ const p = path.join(d, e.name), r = rel ? rel + '/' + e.name : e.name; if (e.isDirectory()) walk(p, r); else if (/\.(rs|toml|lock|ttf|otf|bin)$/.test(e.name)) files.push([r, p]); } };
  walk(dir, ''); files.sort((a, b) => (a[0] < b[0] ? -1 : 1));
  for (const [r, p] of files) { h.update(r + '\0'); h.update(fs.readFileSync(p)); h.update('\0'); }
  return h.digest('hex').slice(0, 16);
}
const cacheDir = () => path.join(os.homedir(), '.cache', 'aicw-ai-slide');
function findCargo() { const c = [process.env.CARGO, path.join(os.homedir(), '.cargo', 'bin', process.platform === 'win32' ? 'cargo.exe' : 'cargo'), '/opt/homebrew/bin/cargo', '/usr/local/bin/cargo', '/usr/bin/cargo']; for (const p of c) { try { if (p && fs.statSync(p).isFile()) return p; } catch {} } const r = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['cargo'], { encoding: 'utf8' }); return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() || null : null; }

/** Build engine-src to wasm (cached by source hash). Throws with the compiler's own errors. */
export function buildFromSource({ dir = SRC, quiet = true } = {}) {
  const hash = sourceHash(dir); const out = path.join(cacheDir(), 'wasm', `deckcraft-${hash}.wasm`);
  if (fs.existsSync(out)) return { wasm: out, hash, cached: true };
  const cargo = findCargo();
  if (!cargo) { const e = new Error('engine-src changed but Rust (cargo) is not installed: install Rust from https://rustup.rs (with `rustup target add wasm32-unknown-unknown`) so AI Slide can rebuild its engine'); e.code = 'missing_runtime:cargo'; throw e; }
  const env = { ...process.env, CARGO_TARGET_DIR: path.join(cacheDir(), 'target'), CARGO_TERM_COLOR: 'never' };
  const r = spawnSync(cargo, ['build', '-p', 'deckcraft-wasm-core', '--release', '--target', 'wasm32-unknown-unknown', '--offline'], { cwd: dir, env, encoding: 'utf8', timeout: 900000, maxBuffer: 64 << 20 });
  const r2 = r.status === 0 ? r : spawnSync(cargo, ['build', '-p', 'deckcraft-wasm-core', '--release', '--target', 'wasm32-unknown-unknown'], { cwd: dir, env, encoding: 'utf8', timeout: 900000, maxBuffer: 64 << 20 });
  if (r2.status !== 0) {
    const errs = String(r2.stderr || '').split('\n').filter((l) => /^(error|warning: unused)|-->/.test(l)).slice(0, 30).join('\n');
    const e = new Error(`the engine Rust source does not compile:\n${errs || String(r2.stderr || r2.error || '').slice(-3000)}`); e.code = 'code_error'; e.stack = `${e.message}\n    at build (${path.join(dir, 'Cargo.toml')})`; throw e;
  }
  // cargo may rewrite Cargo.lock (prune unused entries): hash the source AS BUILT
  const built = sourceHash(dir); const dest = built === hash ? out : path.join(cacheDir(), 'wasm', `deckcraft-${built}.wasm`);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(path.join(env.CARGO_TARGET_DIR, 'wasm32-unknown-unknown', 'release', 'deckcraft_wasm_core.wasm'), dest);
  return { wasm: dest, hash: built, cached: false };
}
/** Which wasm to run: the shipped one when engine-src is what it was built from, else a build of engine-src. */
export function resolveWasm() {
  let stamp = ''; try { stamp = fs.readFileSync(STAMP, 'utf8').trim(); } catch {}
  if (!fs.existsSync(SRC)) return { wasm: SHIPPED, from: 'shipped' };
  const hash = sourceHash();
  if (stamp && hash === stamp && fs.existsSync(SHIPPED)) return { wasm: SHIPPED, from: 'shipped', hash };
  return { ...buildFromSource(), from: 'source' };
}
export function engineAvailable() { return fs.existsSync(SHIPPED) || fs.existsSync(SRC); }
export function engineInfo() { return instFrom; }

async function load() {
  if (inst) return inst;
  const r = resolveWasm();
  const mod = await WebAssembly.compile(fs.readFileSync(r.wasm));
  // a plain wasm32-unknown-unknown cdylib imports nothing; satisfy any stray import with a stub
  const imports = {};
  for (const imp of WebAssembly.Module.imports(mod)) { (imports[imp.module] ||= {})[imp.name] = imp.kind === 'function' ? () => 0 : new WebAssembly.Memory({ initial: 1 }); }
  inst = (await WebAssembly.instantiate(mod, imports)).exports; instFrom = r;
  return inst;
}

function put(e, bytes) { const n = bytes.length; const p = e.dc_alloc(n); new Uint8Array(e.memory.buffer, p, n).set(bytes); return [p, n]; }
function take(e) { const p = e.dc_result_ptr(), n = e.dc_result_len(); const out = Buffer.from(new Uint8Array(e.memory.buffer, p, n)); if (!e.dc_result_ok()) { const err = new Error(out.toString('utf8')); err.code = /encrypted/.test(err.message) ? 'encrypted' : 'engine_error'; throw err; } return out; }

// A Rust panic aborts the module (`unreachable` trap). Turn it into a code bug that names the Rust
// source line, so AICoworker's self-healing opens engine-src/crates/<crate>/src/<file>.rs.
function panicError(e, name, trap) {
  let text = '';
  try { e.dc_last_panic(); const p = e.dc_result_ptr(), n = e.dc_result_len(); text = Buffer.from(new Uint8Array(e.memory.buffer, p, n)).toString('utf8'); } catch {}
  inst = null; // the instance is poisoned after a trap: the next call loads a fresh one
  const m = /^(.*) @ (crates\/[^:]+):(\d+):(\d+)$/s.exec(text);
  const where = m ? path.join(SRC, m[2]) : null;
  const err = new Error(`RangeError: DeckCraft engine (Rust) panicked in ${name}: ${m ? m[1] : text || trap.message}${m ? ` at engine-src/${m[2]}:${m[3]}` : ''} — fix the Rust source in engine-src (see ENGINE-REPAIR.md); the app rebuilds the wasm by itself`);
  err.code = 'code_error';
  // The platform's repair picks the first .js/.mjs file of the stack as the file to start with:
  // that is this loader, whose header and ENGINE-REPAIR.md lead to the .rs line named here.
  err.stack = `${err.message}\n    at ${name} (${where ? `${where}:${m[3]}:${m[4]}` : path.join(SRC, 'crates', 'wasm-core', 'src', 'lib.rs')})\n    at call (${fileURLToPath(import.meta.url)}:1:1)\n    Rust source to fix: ${where ? `${where}:${m[3]}` : 'engine-src/crates/wasm-core/src/lib.rs'} — read ${path.join(APP, 'ENGINE-REPAIR.md')}`;
  return err;
}

async function call(name, ...bufs) {
  const e = await load(); const held = []; const args = [];
  for (const b of bufs) { if (typeof b === 'number') { args.push(b); continue; } const buf = typeof b === 'string' ? Buffer.from(b, 'utf8') : b; const [p, n] = put(e, buf); held.push([p, n]); args.push(p, n); }
  try { e[name](...args); return take(e); }
  catch (t) { if (t instanceof WebAssembly.RuntimeError) throw panicError(e, name, t); throw t; }
  finally { if (inst === e) for (const [p, n] of held) { try { e.dc_free(p, n); } catch {} } }
}

// System fonts are invisible inside WASM: hand the engine the font files of the families a deck
// uses (looked up once in the OS font folders, cached by family).
const FONT_DIRS = process.platform === 'darwin' ? ['/System/Library/Fonts', '/System/Library/Fonts/Supplemental', '/Library/Fonts', path.join(process.env.HOME || '', 'Library/Fonts'), '/Applications/Microsoft PowerPoint.app/Contents/Resources/DFonts']
  : process.platform === 'win32' ? [path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'), path.join(process.env.LOCALAPPDATA || '', 'Microsoft/Windows/Fonts')]
  : ['/usr/share/fonts', '/usr/local/share/fonts', path.join(process.env.HOME || '', '.fonts'), path.join(process.env.HOME || '', '.local/share/fonts')];
let fontIndex = null; const loadedFamilies = new Set();
function indexFonts() {
  if (fontIndex) return fontIndex; fontIndex = [];
  const walk = (d, depth = 0) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory() && depth < 3) walk(p, depth + 1); else if (/\.(ttf|otf|ttc)$/i.test(e.name)) fontIndex.push({ p, key: e.name.toLowerCase().replace(/[^a-z0-9]/g, '') }); } };
  FONT_DIRS.forEach((d) => walk(d)); return fontIndex;
}
export function familiesOf(pres) { const s = new Set(); JSON.stringify(pres, (k, v) => { if ((k === 'latin' || k === 'font' || k === 'typeface' || k === 'ea' || k === 'cs' || k === 'family') && typeof v === 'string' && v && !v.startsWith('+')) s.add(v); return v; }); return [...s]; }
export async function provideFonts(families) {
  const e = await load(); let n = 0;
  for (const fam of families) {
    const key = String(fam).toLowerCase().replace(/[^a-z0-9]/g, ''); if (!key || loadedFamilies.has(key)) continue; loadedFamilies.add(key);
    for (const f of indexFonts().filter((x) => x.key.startsWith(key))) { try { const buf = fs.readFileSync(f.p); if (buf.length > 40 << 20) continue; const [p, len] = put(e, buf); e.dc_add_font(p, len); e.dc_free(p, len); n++; } catch {} }
  }
  return n;
}
async function withFonts(pres) { try { await provideFonts(familiesOf(pres)); } catch {} }

export async function version() { return (await call('dc_version')).toString('utf8'); }
/** file bytes (pptx family / .deckcraft) -> { presentation, warnings } */
export async function importFile(buf) { return JSON.parse((await call('dc_import', buf)).toString('utf8')); }
/** DeckCraft Presentation object -> file bytes */
export async function exportFile(pres, ext) { return call('dc_export', JSON.stringify(pres), ext); }
/** slide index -> PNG bytes */
export async function renderPng(pres, index, width = 1280) { await withFonts(pres); return call('dc_render_png', JSON.stringify(pres), index, width); }
/** -> PDF bytes. layout 0 slides, 1 notes, 2..9 handouts */
export async function exportPdf(pres, layout = 0) { await withFonts(pres); return call('dc_export_pdf', JSON.stringify(pres), layout); }
export async function outline(text, pres = null) { return JSON.parse((await call('dc_outline', pres ? JSON.stringify(pres) : Buffer.alloc(0), text)).toString('utf8')); }
/** slide backdrop without the listed shapes (the page draws those as editable objects) */
export async function renderBackdrop(pres, index, width, skipIds) { await withFonts(pres); const sk = Buffer.alloc(skipIds.length * 4); skipIds.forEach((v, i) => sk.writeUInt32LE(v >>> 0, i * 4)); return call('dc_render_backdrop', JSON.stringify(pres), index, width, sk); }

/** test hook: makes the engine panic on purpose (self-healing smoke). */
export async function selftestPanic() { return call('dc_selftest_panic'); }
