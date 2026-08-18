const fs = require('fs');
const os = require('os');
const path = require('path');

function getPluginDir() {
  if (typeof __dirname === 'string' && __dirname) {
    return __dirname;
  }

  if (window.location && window.location.protocol === 'file:') {
    let filePath = decodeURIComponent(window.location.pathname);
    if (/^\/[A-Za-z]:\//.test(filePath)) {
      filePath = filePath.slice(1);
    }
    return path.dirname(filePath);
  }

  return __dirname;
}

window.isKeeWebInstalled = function isKeeWebInstalled() {
  return fs.existsSync(path.join(getPluginDir(), 'keeweb', 'index.html'));
};

/**
 * KeeWeb gh-pages uses the desktop launcher when process.versions.electron exists.
 * Rubick lacks KeeWeb desktop main process APIs, so patch require('electron').
 */
(function installKeeWebElectronShim() {
  if (!process.versions || !process.versions.electron) return;
  if (window.__rubickKeeWebElectronShimInstalled) return;

  try {
    const { shell, clipboard, ipcRenderer } = require('electron');
    const remote = require('@electron/remote');
    const { app, dialog, BrowserWindow } = remote;
    const configDir = path.join(app.getPath('userData'), 'rubick-keeweb');

    function configPath(name) {
      return path.join(configDir, `${name}.json`);
    }

    function getMainWindow() {
      return BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
    }

    const keewebApp = {
      getPath: (name) => app.getPath(name),
      on() {},
      setAboutPanelOptions() {},
      setHookBeforeQuitEvent() {},
      minimizeApp() {},
      quit() {},
      hide() {},
      minimizeThenHideIfInTray() {},
      restartAndUpdate() {},
      setGlobalShortcuts() {},
      showAndFocusMainWindow() {
        const win = getMainWindow();
        if (win) {
          win.show();
          win.focus();
        }
      },
      getMainWindow,
      loadConfig(name) {
        return new Promise((resolve) => {
          fs.readFile(configPath(name), 'utf8', (err, data) => {
            if (err && err.code === 'ENOENT') resolve(null);
            else if (err) resolve(null);
            else resolve(data);
          });
        });
      },
      saveConfig(name, data) {
        return new Promise((resolve, reject) => {
          fs.mkdir(configDir, { recursive: true }, (mkdirErr) => {
            if (mkdirErr) return reject(mkdirErr);
            fs.writeFile(configPath(name), data, 'utf8', (writeErr) => {
              if (writeErr) reject(writeErr);
              else resolve();
            });
          });
        });
      },
    };

    const electronModule = {
      app: keewebApp,
      dialog,
      shell,
      clipboard,
      ipcRenderer,
    };

    const electronShim = {
      remote: {
        app: keewebApp,
        BrowserWindow,
        getCurrentWindow: getMainWindow,
        require(mod) {
          if (mod === 'electron') return electronModule;
          return require(mod);
        },
      },
      shell: {
        openExternal(url) {
          if (window.rubick && typeof window.rubick.shellOpenExternal === 'function') {
            window.rubick.shellOpenExternal(url);
            return;
          }
          shell.openExternal(url);
        },
      },
      clipboard,
      ipcRenderer,
    };

    if (typeof window.require !== 'function') return;

    const originalRequire = window.require;
    window.require = function patchedRequire(id) {
      if (id === 'electron') return electronShim;
      return originalRequire.apply(this, arguments);
    };

    window.__rubickKeeWebElectronShimInstalled = true;
  } catch (error) {
    console.error('[rubick-keeweb] electron shim failed, using fallback:', error);
    installFallbackElectronShim();
  }

  function installFallbackElectronShim() {
    if (window.__rubickKeeWebElectronShimInstalled) return;
    if (typeof window.require !== 'function') return;

    const fallbackUserData = process.platform === 'darwin'
      ? path.join(os.homedir(), 'Library', 'Application Support', 'rubick')
      : path.join(process.env.APPDATA || os.homedir(), 'rubick');
    const userData =
      (window.rubick && window.rubick.getPath && window.rubick.getPath('userData')) ||
      fallbackUserData;
    const configDir = path.join(userData, 'rubick-keeweb');

    const keewebApp = {
      getPath: (name) => {
        if (window.rubick && window.rubick.getPath) {
          return window.rubick.getPath(name);
        }
        if (name === 'userData') return userData;
        if (name === 'temp') return path.join(userData, 'temp');
        if (name === 'documents') return path.join(userData, 'documents');
        return userData;
      },
      on() {},
      setAboutPanelOptions() {},
      setHookBeforeQuitEvent() {},
      minimizeApp() {},
      quit() {},
      hide() {},
      minimizeThenHideIfInTray() {},
      restartAndUpdate() {},
      setGlobalShortcuts() {},
      showAndFocusMainWindow() {},
      getMainWindow: () => ({
        minimize() {},
        maximize() {},
        restore() {},
        isMaximized: () => false,
        webContents: {
          openDevTools() {},
          session: { resolveProxy: () => Promise.resolve('DIRECT') },
        },
      }),
      loadConfig(name) {
        return new Promise((resolve) => {
          fs.readFile(path.join(configDir, `${name}.json`), 'utf8', (err, data) => {
            if (err) resolve(null);
            else resolve(data);
          });
        });
      },
      saveConfig(name, data) {
        return new Promise((resolve, reject) => {
          fs.mkdir(configDir, { recursive: true }, (mkdirErr) => {
            if (mkdirErr) return reject(mkdirErr);
            fs.writeFile(path.join(configDir, `${name}.json`), data, 'utf8', (writeErr) => {
              if (writeErr) reject(writeErr);
              else resolve();
            });
          });
        });
      },
    };

    const electronModule = {
      app: keewebApp,
      dialog: {
        showSaveDialog: (opts) =>
          Promise.resolve({
            filePath:
              window.rubick && window.rubick.showSaveDialog
                ? window.rubick.showSaveDialog(opts)
                : undefined,
          }),
        showOpenDialog: (opts) =>
          Promise.resolve({
            filePaths:
              window.rubick && window.rubick.showOpenDialog
                ? window.rubick.showOpenDialog(opts)
                : [],
          }),
      },
      shell: {
        openExternal(url) {
          if (window.rubick && window.rubick.shellOpenExternal) {
            window.rubick.shellOpenExternal(url);
          }
        },
      },
      clipboard: {
        writeText(text) {
          if (window.rubick && window.rubick.copyText) window.rubick.copyText(text);
        },
        readText() {
          return '';
        },
        clear() {},
      },
      ipcRenderer: { on() {}, invoke: () => Promise.resolve({}) },
    };

    const electronShim = {
      remote: {
        app: keewebApp,
        BrowserWindow: { getFocusedWindow: () => null, getAllWindows: () => [] },
        getCurrentWindow: () => electronModule.app.getMainWindow(),
        require(mod) {
          if (mod === 'electron') return electronModule;
          return require(mod);
        },
      },
      shell: electronModule.shell,
      clipboard: electronModule.clipboard,
      ipcRenderer: electronModule.ipcRenderer,
    };

    const originalRequire = window.require;
    window.require = function patchedRequire(id) {
      if (id === 'electron') return electronShim;
      return originalRequire.apply(this, arguments);
    };
    window.__rubickKeeWebElectronShimInstalled = true;
  }
})();

const KEEWEB_ENTRY = './keeweb/index.html';

window.__rubickKeewebPendingFiles = window.__rubickKeewebPendingFiles || [];

const PANEL_HEIGHT_RATIO = 0.58;
const PANEL_MIN_HEIGHT = 480;
const PANEL_MAX_HEIGHT = 620;

function expandPanel() {
  if (!window.rubick) return;
  const height = Math.min(
    PANEL_MAX_HEIGHT,
    Math.max(PANEL_MIN_HEIGHT, Math.floor(screen.availHeight * PANEL_HEIGHT_RATIO))
  );
  window.rubick.setExpendHeight(height);
  if (typeof window.rubick.removeSubInput === 'function') {
    window.rubick.removeSubInput();
  }
}

function collectKdbxPaths(payload) {
  if (!payload) return [];
  const items = Array.isArray(payload) ? payload : [payload];
  return items
    .map((item) => (typeof item === 'string' ? item : item && item.path))
    .filter((filePath) => filePath && /\.kdbx?$/i.test(filePath));
}

function queueKdbxPaths(paths) {
  if (!paths.length) return;
  window.__rubickKeewebPendingFiles.push(...paths);
  window.tryOpenPendingFiles();
}

function onPluginContext(ctx) {
  expandPanel();
  queueKdbxPaths(collectKdbxPaths(ctx && ctx.payload));

  if (!isKeeWebPage() && window.isKeeWebInstalled()) {
    window.location.replace(KEEWEB_ENTRY);
  }
}

function isKeeWebPage() {
  return /\/keeweb\/index\.html$/i.test(window.location.pathname);
}

function registerRubickHooks() {
  if (!window.rubick || window.__rubickKeewebHooksRegistered) return;
  window.__rubickKeewebHooksRegistered = true;
  window.rubick.onPluginReady(onPluginContext);
  window.rubick.onPluginEnter(onPluginContext);
}

window.tryOpenPendingFiles = function tryOpenPendingFiles() {
  const pending = window.__rubickKeewebPendingFiles;
  if (!pending || !pending.length) return false;
  if (!openKdbxByPath(pending)) return false;
  window.__rubickKeewebPendingFiles = [];
  return true;
};

function openKdbxByPath(filePaths) {
  if (!window.launcherOpen) return openKdbxByDrop(filePaths);

  filePaths.forEach((filePath) => {
    try {
      window.launcherOpen({
        storage: 'file',
        path: filePath,
        name: path.basename(filePath),
      });
    } catch (error) {
      console.error('[rubick-keeweb] launcherOpen failed:', filePath, error);
    }
  });
  return filePaths.length > 0;
}

function openKdbxByDrop(filePaths) {
  const files = filePaths.map(createFileFromPath).filter(Boolean);
  if (!files.length) return false;

  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));

  const target = document.body || document.documentElement;
  if (!target) return false;

  const eventInit = {
    bubbles: true,
    cancelable: true,
    dataTransfer,
  };

  target.dispatchEvent(new DragEvent('dragenter', eventInit));
  target.dispatchEvent(new DragEvent('dragover', eventInit));
  target.dispatchEvent(new DragEvent('drop', eventInit));
  return true;
}

function createFileFromPath(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const name = path.basename(filePath);
    return new File([buffer], name, {
      type: 'application/octet-stream',
      lastModified: fs.statSync(filePath).mtimeMs,
    });
  } catch (error) {
    console.error('[rubick-keeweb] failed to read file:', filePath, error);
    return null;
  }
}

function startKeeWebPendingRetry() {
  if (!isKeeWebPage()) return;
  expandPanel();
  let attempts = 0;
  const timer = setInterval(() => {
    attempts += 1;
    if (window.tryOpenPendingFiles() || attempts >= 40) {
      clearInterval(timer);
    }
  }, 250);
}

registerRubickHooks();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startKeeWebPendingRetry);
} else {
  startKeeWebPendingRetry();
}
