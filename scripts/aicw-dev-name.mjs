#!/usr/bin/env node
// aicw-dev-name.mjs <app dir> — give an installed copy of the app its DEVELOPMENT name.
//
// AICoworker builds and changes an AI App only in a folder named <name>-dev (the copy installed
// from the AICW Store is <name> and is never edited). This repository holds the app under its
// release name; the install script copies it into <workspace>/skills/<name>-dev and this script
// changes the places that NAME THE APP: SKILL.md `name:`, "app": "<name>", the window id
// app-<name>, skill-assets/<name>/ and skill:<name>/. A release is made from the -dev folder by
// AICoworker's `dev_app.mjs <dir> pack`, which changes the name back.
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] || '');
const devName = path.basename(dir);
if (!process.argv[2] || !/.-dev$/.test(devName) || !fs.existsSync(path.join(dir, 'SKILL.md'))) {
  console.error('usage: aicw-dev-name.mjs <skills dir>/<name>-dev   (a folder with SKILL.md whose name ends in -dev)');
  process.exit(2);
}
const name = devName.slice(0, -4);
const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const TEXT = /\.(md|json|jsonl|mjs|cjs|js|ts|html|htm|css|py|txt|ya?ml|toml)$/i;
const SKIP = /^(node_modules|\.venv|\.git|\.aicw-dev|\.aicw-fix|dist-pack|data|logs|engine|engine-src|target)$/;
const changed = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.test(e.name)) continue;
    const full = path.join(d, e.name);
    if (e.isDirectory()) { walk(full); continue; }
    if (!TEXT.test(e.name) || fs.statSync(full).size > 4 * 1024 * 1024) continue;
    const before = fs.readFileSync(full, 'utf8');
    let after = before
      .replace(new RegExp('(skill-assets/|skill:)' + n + '(?=/)', 'g'), '$1' + devName)
      .replace(new RegExp('((?:"app"|\'app\'|\\bapp)\\s*:\\s*["\'])' + n + '(?=["\'])', 'g'), '$1' + devName)
      .replace(new RegExp('((?:"skill"|\'skill\'|\\bskill)\\s*:\\s*["\'])' + n + '(?=["\'])', 'g'), '$1' + devName);
    if (full === path.join(dir, 'SKILL.md')) {
      after = after.replace(/^(---\r?\n[\s\S]*?\r?\n---)/, (front) => front.replace(new RegExp('^(name:\\s*["\']?)' + n + '(["\']?\\s*)$', 'm'), '$1' + devName + '$2'));
      after = after.replace(new RegExp('(app-)' + n + '(?![a-z0-9-])', 'g'), '$1' + devName);
    }
    if (after !== before) { fs.writeFileSync(full, after); changed.push(path.relative(dir, full)); }
  }
};
walk(dir);
console.log(`development name "${devName}": ${changed.length ? changed.join(', ') : 'nothing to change'}`);
