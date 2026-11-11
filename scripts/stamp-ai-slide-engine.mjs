// Build <app>/engine-src to wasm, install it as the app's shipped engine and stamp the source hash
// it was built from (the app only rebuilds when engine-src no longer matches that hash).
//   node scripts/stamp-ai-slide-engine.mjs <app dir>
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const app = path.resolve(process.argv[2] || '.');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(pathToFileURL(path.join(app, 'backend', 'engine.mjs')).href);
const w = E.buildFromSource({ dir: path.join(app, 'engine-src') });
const dir = path.join(app, 'backend', 'engine');
fs.mkdirSync(dir, { recursive: true });
fs.copyFileSync(w.wasm, path.join(dir, 'deckcraft.wasm'));
fs.writeFileSync(path.join(dir, 'SOURCE_HASH'), w.hash + '\n');
const git = (a) => { try { return execSync(`git -C "${root}" ${a}`, { encoding: 'utf8' }).trim(); } catch { return 'unknown'; } };
fs.writeFileSync(path.join(dir, 'ENGINE_VERSION'), `fork=${git('rev-parse --short HEAD')}\nupstream=${git('rev-parse --short upstream/main')}\nsource=${w.hash}\nbuilt=${new Date().toISOString()}\nbytes=${fs.statSync(w.wasm).size}\n`);
console.log(`engine ${w.hash} ${w.cached ? '(cached build)' : '(built)'} -> ${path.join(dir, 'deckcraft.wasm')}`);
