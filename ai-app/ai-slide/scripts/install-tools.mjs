// Setup step of AI Slide — prepares everything the app needs to work AND to repair itself, with no
// action from the user and no admin rights:
//   1. Rust (rustup, per user) + the wasm32 target  -> AICoworker can fix a bug in the Rust engine
//      and the app rebuilds deckcraft.wasm from engine-src/ by itself.
//   2. A warm build of the engine (cache keyed by source hash) -> the first repair builds in
//      seconds, and it proves the toolchain works on this computer.
//   3. LibreOffice (per user) -> open/save PowerPoint 97-2003 .ppt/.pps/.pot with full fidelity.
// Every step is idempotent (skips what is already there) and never fails the app's setup: the app
// runs without them (shipped engine, .pptx family); it reports what is missing in the log.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const win = process.platform === 'win32', mac = process.platform === 'darwin';
const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64';
const log = (s) => console.log(`[ai-slide setup] ${s}`);
const run = (cmd, args, opt = {}) => spawnSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 1800000, ...opt });
const which = (n) => { const r = run(win ? 'where' : 'which', [n]); return r.status === 0 ? r.stdout.split(/\r?\n/)[0].trim() : null; };
const only = new Set(process.argv.slice(2).filter((a) => !a.startsWith('--')));
const want = (k) => !only.size || only.has(k);

async function download(url, to) {
  log(`downloading ${url}`);
  const res = await fetch(url, { redirect: 'follow' }); if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.writeFileSync(to, Buffer.from(await res.arrayBuffer())); if (!win) fs.chmodSync(to, 0o755);
  return to;
}

// ---------------------------------------------------------------- Rust
const cargoBin = path.join(process.env.CARGO_HOME || path.join(os.homedir(), '.cargo'), 'bin');
const rexe = (n) => path.join(cargoBin, win ? `${n}.exe` : n);
const rfind = (n) => (fs.existsSync(rexe(n)) ? rexe(n) : which(n));
async function rust() {
  let rustup = rfind('rustup');
  if (!rustup || !rfind('cargo')) {
    log('Rust: not found — installing rustup (per user)…');
    const url = win ? `https://static.rust-lang.org/rustup/dist/${arch}-pc-windows-msvc/rustup-init.exe`
      : mac ? `https://static.rust-lang.org/rustup/dist/${arch}-apple-darwin/rustup-init`
      : `https://static.rust-lang.org/rustup/dist/${arch}-unknown-linux-gnu/rustup-init`;
    const init = await download(url, path.join(os.tmpdir(), 'aislide-setup', win ? 'rustup-init.exe' : 'rustup-init'));
    // Windows: the GNU host needs no Visual Studio build tools, which a non-tech user will not have.
    const args = ['-y', '--no-modify-path', '--profile', 'minimal', '--default-toolchain', 'stable', '--target', 'wasm32-unknown-unknown'];
    if (win) args.push('--default-host', `${arch}-pc-windows-gnu`);
    const r = run(init, args, { stdio: 'inherit' }); if (r.status !== 0) throw new Error('rustup-init failed');
    rustup = rexe('rustup');
  }
  const env = { ...process.env, PATH: `${cargoBin}${path.delimiter}${process.env.PATH}` };
  const v = run(rfind('rustc') || rexe('rustc'), ['--version'], { env }).stdout || '';
  const minor = +(/rustc 1\.(\d+)/.exec(v)?.[1] || 0);
  if (minor && minor < 95) { log(`Rust ${v.trim()} is older than the engine needs (1.95) — updating stable…`); run(rustup, ['update', 'stable', '--no-self-update'], { env, stdio: 'inherit' }); }
  if (!/wasm32-unknown-unknown/.test(run(rustup, ['target', 'list', '--installed'], { env }).stdout || '')) {
    log('Rust: adding target wasm32-unknown-unknown…');
    if (run(rustup, ['target', 'add', 'wasm32-unknown-unknown'], { env, stdio: 'inherit' }).status !== 0) throw new Error('rustup target add wasm32 failed');
  }
  log(`Rust: ready (${(run(rfind('rustc') || rexe('rustc'), ['--version'], { env }).stdout || '').trim()})`);
  process.env.PATH = env.PATH;
}

async function warmEngine() {
  const { buildFromSource, sourceHash } = await import('../backend/engine.mjs');
  log(`engine: building from engine-src (first time ~2 min, then cached)…`);
  const t = Date.now(); const r = buildFromSource({ quiet: true });
  log(`engine: build OK ${r.hash} in ${Math.round((Date.now() - t) / 1000)} s${r.hash === sourceHash() ? '' : ' (source changed during build)'}`);
}

// ---------------------------------------------------------------- LibreOffice
async function libreoffice() {
  const { findSoffice } = await import('../backend/legacy.mjs');
  if (findSoffice()) { log(`LibreOffice: found ${findSoffice()}`); return; }
  const ver = await latestLibreOffice();
  const base = `https://download.documentfoundation.org/libreoffice/stable/${ver}`;
  if (mac) {
    const dmg = await download(`${base}/mac/${arch}/LibreOffice_${ver}_MacOS_${arch}.dmg`, path.join(os.tmpdir(), 'aislide-setup', 'LibreOffice.dmg'));
    const mnt = path.join(os.tmpdir(), 'aislide-setup', 'lo-mnt');
    fs.mkdirSync(mnt, { recursive: true });
    if (run('hdiutil', ['attach', '-nobrowse', '-readonly', '-mountpoint', mnt, dmg]).status !== 0) throw new Error('hdiutil attach failed');
    try {
      const dest = path.join(os.homedir(), 'Applications'); fs.mkdirSync(dest, { recursive: true });
      if (run('ditto', [path.join(mnt, 'LibreOffice.app'), path.join(dest, 'LibreOffice.app')]).status !== 0) throw new Error('copy LibreOffice.app failed');
      run('xattr', ['-dr', 'com.apple.quarantine', path.join(dest, 'LibreOffice.app')]);
    } finally { run('hdiutil', ['detach', mnt, '-quiet']); }
  } else if (win) {
    const msi = await download(`${base}/win/${process.arch === 'arm64' ? 'aarch64' : 'x86_64'}/LibreOffice_${ver}_Win_${process.arch === 'arm64' ? 'aarch64' : 'x86-64'}.msi`, path.join(os.tmpdir(), 'aislide-setup', 'LibreOffice.msi'));
    const dest = path.join(process.env.LOCALAPPDATA || os.homedir(), 'AICoworker', 'tools', 'LibreOffice');
    // administrative install = extract files, no admin rights, no system changes
    if (run('msiexec', ['/a', msi, '/qn', `TARGETDIR=${dest}`]).status !== 0) throw new Error('msiexec /a failed');
  } else {
    const dest = path.join(os.homedir(), '.local', 'share', 'aicoworker', 'tools'); fs.mkdirSync(dest, { recursive: true });
    await download(`https://appimages.libreitalia.org/LibreOffice-fresh.basic-${arch}.AppImage`, path.join(dest, 'libreoffice.AppImage'));
  }
  const found = (await import(`../backend/legacy.mjs?x=${Date.now()}`)).findSoffice();
  if (!found) throw new Error('installed, but soffice was not found');
  log(`LibreOffice: ready ${found}`);
}
async function latestLibreOffice() {
  try { const html = await (await fetch('https://download.documentfoundation.org/libreoffice/stable/')).text(); const v = [...html.matchAll(/href="(\d+\.\d+\.\d+)\/"/g)].map((m) => m[1]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })); if (v.length) return v[v.length - 1]; } catch {}
  return '26.8.2';
}

// ---------------------------------------------------------------- main
const steps = [['rust', 'Rust (to repair the engine)', rust], ['engine', 'engine build', warmEngine], ['libreoffice', 'LibreOffice (.ppt 97-2003)', libreoffice]];
let failed = 0;
for (const [k, label, fn] of steps) {
  if (!want(k)) continue;
  if (k === 'engine' && !rfind('cargo')) { log('engine: skipped (no Rust)'); continue; }
  try { await fn(); } catch (e) { failed++; log(`WARNING ${label}: ${e.message}`); }
}
log(failed ? `done with ${failed} warning(s) — the app works; the missing part is retried at the next setup` : 'all set: the app can open every PowerPoint format and repair its own engine');
process.exit(0);
