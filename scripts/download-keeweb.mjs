import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TARGET = path.join(ROOT, 'public', 'keeweb');
const MARKER = path.join(TARGET, 'index.html');
const ZIP_URL = 'https://github.com/keeweb/keeweb/archive/refs/heads/gh-pages.zip';

async function download(url, dest) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) {
    throw new Error(`Download failed (${response.status}): ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(dest, buffer);
}

function extractZip(zipPath, destDir) {
  fs.mkdirSync(destDir, { recursive: true });

  if (process.platform === 'win32') {
    const script = [
      `$zip = '${zipPath.replace(/'/g, "''")}'`,
      `$dest = '${destDir.replace(/'/g, "''")}'`,
      `$tmp = Join-Path $env:TEMP ('keeweb-gh-pages-' + [guid]::NewGuid())`,
      'Expand-Archive -Path $zip -DestinationPath $tmp -Force',
      "$src = Join-Path $tmp 'keeweb-gh-pages'",
      "Copy-Item -Path (Join-Path $src '*') -Destination $dest -Recurse -Force",
      'Remove-Item -Path $tmp -Recurse -Force'
    ].join('; ');

    const result = spawnSync(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { stdio: 'inherit' }
    );
    if (result.status !== 0) {
      throw new Error('Failed to extract KeeWeb archive on Windows');
    }
    return;
  }

  const result = spawnSync('unzip', ['-oq', zipPath, '-d', destDir], {
    stdio: 'inherit'
  });
  if (result.status !== 0) {
    throw new Error('Failed to extract KeeWeb archive. Install unzip or use Windows.');
  }

  const nested = path.join(destDir, 'keeweb-gh-pages');
  if (fs.existsSync(nested)) {
    for (const entry of fs.readdirSync(nested)) {
      fs.renameSync(path.join(nested, entry), path.join(destDir, entry));
    }
    fs.rmSync(nested, { recursive: true, force: true });
  }
}

async function main() {
  if (fs.existsSync(MARKER)) {
    console.log('[rubick-keeweb] KeeWeb assets already present.');
    return;
  }

  console.log('[rubick-keeweb] Downloading KeeWeb gh-pages bundle...');
  const zipPath = path.join(ROOT, '.cache', 'keeweb-gh-pages.zip');
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.mkdirSync(TARGET, { recursive: true });

  await download(ZIP_URL, zipPath);
  console.log('[rubick-keeweb] Extracting...');
  extractZip(zipPath, TARGET);

  if (!fs.existsSync(MARKER)) {
    throw new Error('KeeWeb index.html not found after extraction');
  }

  console.log('[rubick-keeweb] Ready: public/keeweb');
}

main().catch((error) => {
  console.error('[rubick-keeweb]', error.message);
  process.exitCode = 1;
});
