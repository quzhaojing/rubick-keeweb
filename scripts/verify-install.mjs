/**
 * Quick sanity checks for local Rubick plugin install.
 * Run: node scripts/verify-install.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const RUBICK_PLUGINS = path.join(
  process.env.APPDATA || '',
  'rubick',
  'rubick-plugins-new'
);
const LINKED = path.join(RUBICK_PLUGINS, 'node_modules', 'rubick-keeweb');
const LOCAL_JSON = path.join(RUBICK_PLUGINS, 'rubick-local-plugin.json');

const checks = [
  ['public/package.json', fs.existsSync(path.join(PUBLIC, 'package.json'))],
  ['public/index.html', fs.existsSync(path.join(PUBLIC, 'index.html'))],
  ['public/preload.js', fs.existsSync(path.join(PUBLIC, 'preload.js'))],
  ['KeeWeb index.html', fs.existsSync(path.join(PUBLIC, 'keeweb', 'index.html'))],
  ['Rubick plugins dir', fs.existsSync(RUBICK_PLUGINS)],
  ['npm link target', fs.existsSync(LINKED)],
  ['linked KeeWeb assets', fs.existsSync(path.join(LINKED, 'keeweb', 'index.html'))],
  [
    'rubick-local-plugin.json entry',
    fs.existsSync(LOCAL_JSON) &&
      fs.readFileSync(LOCAL_JSON, 'utf8').includes('"name": "rubick-keeweb"')
  ]
];

let failed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'OK' : 'FAIL'}  ${name}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.log('\nSome checks failed. Run: npm run link');
  process.exitCode = 1;
} else {
  console.log('\nPlugin install looks good. In Rubick, type: keeweb');
}
