#!/usr/bin/env node
// Build engine-src (this copy) to wasm and run the engine smoke: open → re-export a PPTX, panic hook works.
//   node scripts/engine-check.mjs [--test]   (--test also runs `cargo test` for the crates you changed)
import path from 'node:path'; import fs from 'node:fs'; import { spawnSync } from 'node:child_process'; import { fileURLToPath, pathToFileURL } from 'node:url';
const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(pathToFileURL(path.join(APP, 'backend', 'engine.mjs')).href);
const t0 = Date.now(); const w = E.resolveWasm();
console.log(`engine: ${w.from}${w.hash ? ' ' + w.hash : ''}${w.cached === false ? ' (built ' + Math.round((Date.now() - t0) / 1000) + 's)' : ''}`);
const fx = ['chart.pptx', 'sample.pptx', 'template.pptx'].map((f) => path.join(APP, 'tests', 'fixtures', f)).filter((f) => fs.existsSync(f));
for (const f of fx) { const r = await E.importFile(fs.readFileSync(f)); const out = await E.exportFile(r, 'pptx'); const again = await E.importFile(out); if (again.presentation.slides.length !== r.presentation.slides.length) throw new Error(`${path.basename(f)}: slide count changed on round-trip`); console.log(`ok ${path.basename(f)}: ${r.presentation.slides.length} slides, round-trip ${out.length} bytes`); }
try { await E.selftestPanic(); throw new Error('panic hook: no panic'); } catch (e) { if (e.code !== 'code_error' || !/engine-src\/crates\//.test(e.stack)) throw new Error('panic hook does not name the Rust source: ' + e.message); console.log('ok panic → code_error with Rust location'); }
if (process.argv.includes('--test')) { const r = spawnSync('cargo', ['test', '--workspace', '--exclude', 'deckcraft-wasm-core', '-q'], { cwd: path.join(APP, 'engine-src'), stdio: 'inherit', env: { ...process.env, CARGO_TARGET_DIR: path.join(process.env.HOME || '', '.cache', 'aicw-ai-slide', 'target-test') } }); if (r.status !== 0) process.exit(r.status || 1); }
console.log('ENGINE OK');
