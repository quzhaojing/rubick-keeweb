import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const RUBICK_USER_DATA = process.platform === 'darwin'
  ? path.join(os.homedir(), 'Library', 'Application Support', 'rubick')
  : path.join(process.env.APPDATA || os.homedir(), 'rubick');
const RUBICK_PLUGINS = path.join(RUBICK_USER_DATA, 'rubick-plugins-new');
const LOCAL_JSON = path.join(RUBICK_PLUGINS, 'rubick-local-plugin.json');

function runNodeScript(scriptPath) {
  const result = spawnSync(process.execPath, [scriptPath], { stdio: 'inherit' });
  if (result.status !== 0) {
    throw new Error(`Command failed: node ${scriptPath}`);
  }
}

function readPublicPackage() {
  return JSON.parse(fs.readFileSync(path.join(PUBLIC, 'package.json'), 'utf8'));
}

function syncLocalPluginEntry(publicPkg) {
  if (!fs.existsSync(LOCAL_JSON)) {
    throw new Error(`Rubick local plugin config not found: ${LOCAL_JSON}`);
  }

  const plugins = JSON.parse(fs.readFileSync(LOCAL_JSON, 'utf8'));
  const entry = { ...publicPkg, isdownload: false, isloading: false };
  const index = plugins.findIndex((plugin) => plugin.name === publicPkg.name);

  if (index >= 0) {
    plugins[index] = entry;
  } else {
    plugins.push(entry);
  }

  fs.writeFileSync(LOCAL_JSON, `${JSON.stringify(plugins, null, 2)}\n`, 'utf8');
}

function removeLegacyCopy(name) {
  const legacy = path.join(RUBICK_PLUGINS, name);
  if (fs.existsSync(legacy)) {
    fs.rmSync(legacy, { recursive: true, force: true });
  }
}

function installPackage(tgzPath, manifest) {
  if (!fs.existsSync(RUBICK_PLUGINS)) {
    throw new Error(`Rubick plugins directory not found: ${RUBICK_PLUGINS}`);
  }

  removeLegacyCopy(manifest.name);

  const installedPath = path.join(RUBICK_PLUGINS, 'node_modules', manifest.name);
  if (fs.existsSync(installedPath)) {
    fs.rmSync(installedPath, { recursive: true, force: true });
  }

  const tgzArg = tgzPath.replace(/\\/g, '/');
  const result = spawnSync(
    'npm',
    ['install', tgzArg, '--no-fund', '--no-audit'],
    { cwd: RUBICK_PLUGINS, stdio: 'inherit', shell: true }
  );
  if (result.status !== 0) {
    throw new Error('npm install failed');
  }

  return installedPath;
}

function assertInstalledPlugin(installedPath) {
  const required = ['package.json', 'index.html', 'preload.js', path.join('keeweb', 'index.html')];

  if (!fs.existsSync(installedPath)) {
    throw new Error(`Installed plugin directory not found: ${installedPath}`);
  }

  for (const rel of required) {
    const filePath = path.join(installedPath, rel);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing installed plugin file: ${filePath}`);
    }
  }
}

function main() {
  if (!fs.existsSync(path.join(PUBLIC, 'preload.js'))) {
    throw new Error('public/preload.js not found');
  }

  console.log('[rubick-keeweb] Packing plugin...');
  runNodeScript(path.join(ROOT, 'scripts', 'pack.mjs'));

  const publicPkg = readPublicPackage();
  const tgzPath = path.join(ROOT, `rubick-keeweb-${publicPkg.version}.tgz`);
  if (!fs.existsSync(tgzPath)) {
    throw new Error(`Package not found: ${tgzPath}`);
  }

  console.log('[rubick-keeweb] Installing to Rubick...');
  const installedPath = installPackage(tgzPath, publicPkg);
  assertInstalledPlugin(installedPath);

  console.log('[rubick-keeweb] Syncing rubick-local-plugin.json...');
  syncLocalPluginEntry(publicPkg);

  console.log('[rubick-keeweb] Installed:', installedPath);
  console.log('[rubick-keeweb] Restart Rubick and type: keeweb');
}

main();
