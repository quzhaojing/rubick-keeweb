import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const DIST = path.join(ROOT, 'dist');

function rimraf(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(src, dest, { skip = new Set() } = {}) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath, { skip });
    else fs.copyFileSync(srcPath, destPath);
  }
}

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${scriptPath}`);
  }
}

function main() {
  console.log('[rubick-keeweb] Ensuring KeeWeb assets...');
  runNodeScript(path.join(ROOT, 'scripts', 'download-keeweb.mjs'));

  console.log('[rubick-keeweb] Building dist/...');
  rimraf(DIST);
  copyDir(PUBLIC, DIST, { skip: new Set(['node_modules']) });

  const manifest = JSON.parse(fs.readFileSync(path.join(DIST, 'package.json'), 'utf8'));
  manifest.files = ['index.html', 'app.js', 'preload.js', 'keeweb', 'keeweb-config.example.json'];
  fs.writeFileSync(path.join(DIST, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  console.log('[rubick-keeweb] Creating npm package...');
  const result = spawnSync('npm', ['pack', '--pack-destination', ROOT], {
    cwd: DIST,
    encoding: 'utf8',
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || 'npm pack failed');
  }

  const tgzName = result.stdout.trim();
  const tgzPath = path.join(ROOT, tgzName);
  if (!fs.existsSync(tgzPath)) {
    throw new Error(`Package not found after npm pack: ${tgzPath}`);
  }

  console.log('[rubick-keeweb] Pack complete:', tgzPath);
  return { manifest, tgzPath };
}

try {
  main();
} catch (error) {
  console.error('[rubick-keeweb]', error.message);
  process.exitCode = 1;
}
