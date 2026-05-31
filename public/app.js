(function () {
  const setupPanel = document.getElementById('setup-panel');

  function bootstrap() {
    const checkInstalled =
      typeof window.isKeeWebInstalled === 'function'
        ? window.isKeeWebInstalled()
        : true;

    if (checkInstalled) {
      window.location.replace('./keeweb/index.html');
      return;
    }

    setupPanel.classList.add('visible');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
