import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const RUBICK_PLUGINS = path.join(
  process.env.APPDATA || '',
  'rubick',
  'rubick-plugins-new'
);
const LOCAL_JSON = path.join(RUBICK_PLUGINS, 'rubick-local-plugin.json');
const LINKED = path.join(RUBICK_PLUGINS, 'node_modules', 'rubick-keeweb');

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

function linkPluginDirectory() {
  fs.mkdirSync(path.join(RUBICK_PLUGINS, 'node_modules'), { recursive: true });

  if (fs.existsSync(LINKED)) {
    const stat = fs.lstatSync(LINKED);
    if (stat.isSymbolicLink() || stat.isDirectory()) {
      fs.rmSync(LINKED, { recursive: true, force: true });
    } else {
      fs.unlinkSync(LINKED);
    }
  }

  const linkType = process.platform === 'win32' ? 'junction' : 'dir';
  fs.symlinkSync(PUBLIC, LINKED, linkType);
}

function assertLinkedPlugin() {
  const required = ['package.json', 'index.html', 'preload.js', path.join('keeweb', 'index.html')];

  if (!fs.existsSync(LINKED)) {
    throw new Error(`Linked plugin directory not found: ${LINKED}`);
  }

  let target = LINKED;
  try {
    target = fs.realpathSync(LINKED);
  } catch {
    // Keep symlink path when realpath fails.
  }

  for (const rel of required) {
    const filePath = path.join(LINKED, rel);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing linked plugin file: ${filePath} (target: ${target})`);
    }
  }
}

async function main() {
  if (!fs.existsSync(path.join(PUBLIC, 'preload.js'))) {
    throw new Error('public/preload.js not found');
  }

  console.log('[rubick-keeweb] Downloading KeeWeb assets if needed...');
  runNodeScript(path.join(ROOT, 'scripts', 'download-keeweb.mjs'));

  console.log('[rubick-keeweb] Linking plugin into Rubick...');
  linkPluginDirectory();

  const publicPkg = readPublicPackage();
  console.log('[rubick-keeweb] Syncing rubick-local-plugin.json...');
  syncLocalPluginEntry(publicPkg);
  assertLinkedPlugin();

  console.log('[rubick-keeweb] Installed. Restart Rubick and type: keeweb');
}

main().catch((error) => {
  console.error('[rubick-keeweb]', error.message);
  process.exitCode = 1;
});
