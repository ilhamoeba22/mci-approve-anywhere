/**
 * PWA Install Manager — Approval Anywhere
 * Renders custom mobile install banner for Android & iOS Safari devices.
 */

(function() {
  let deferredPrompt = null;

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('[PWA] Service Worker registered with scope:', reg.scope))
        .catch(err => console.warn('[PWA] Service Worker registration failed:', err));
    });
  }

  // Detect iOS Safari
  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const isStandalone = () => {
    return (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  };

  // Render PWA Install Banner UI
  function renderInstallBanner() {
    if (isStandalone()) return; // Already installed

    const existing = document.getElementById('pwa-install-banner');
    if (existing) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.className = 'pwa-install-banner';
    
    if (isIos()) {
      banner.innerHTML = `
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">📱</div>
          <div class="pwa-banner-text">
            <strong>Install Aplikasi Approval Anywhere</strong>
            <p>Ketuk tombol <span class="pwa-share-icon">⎋</span> (Bagikan) lalu pilih <strong>"Tambahkan ke Layar Utama"</strong></p>
          </div>
          <button class="pwa-banner-close" onclick="document.getElementById('pwa-install-banner').remove()">✕</button>
        </div>
      `;
    } else {
      banner.innerHTML = `
        <div class="pwa-banner-content">
          <div class="pwa-banner-icon">📱</div>
          <div class="pwa-banner-text">
            <strong>Install Aplikasi Mobile Approval Anywhere</strong>
            <p>Dapatkan pengalaman aplikasi native di HP Anda</p>
          </div>
          <button id="pwa-install-btn" class="btn btn-primary btn-sm">Install App</button>
          <button class="pwa-banner-close" onclick="document.getElementById('pwa-install-banner').remove()">✕</button>
        </div>
      `;
    }

    document.body.appendChild(banner);

    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA] User response to install prompt:', outcome);
        deferredPrompt = null;
        banner.remove();
      });
    }
  }

  // Listen for beforeinstallprompt event on Android/Chrome
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    renderInstallBanner();
  });

  // Render iOS Safari Banner after load
  window.addEventListener('load', () => {
    if (isIos() && !isStandalone()) {
      setTimeout(renderInstallBanner, 2000);
    }
  });
})();
