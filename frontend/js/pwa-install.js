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
    const ua = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(ua);
  };

  // Detect if App is already running in Standalone Display Mode
  const isStandalone = () => {
    return (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  };

  // Detect Mobile User Agent
  const isMobile = () => {
    const ua = window.navigator.userAgent.toLowerCase();
    return /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/.test(ua);
  };

  // Render PWA Install Banner UI (STRICTLY MOBILE & TABLET ONLY)
  function renderInstallBanner() {
    if (isStandalone() || !isMobile()) return; // Do not render on desktop/laptop or inside installed standalone app

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
            <p>Ketuk tombol <span class="pwa-share-icon">⎋</span> (Bagikan) di Safari ➔ pilih <strong>"Tambahkan ke Layar Utama"</strong></p>
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
            <p>Pasang di HP Android Anda untuk otorisasi cepat</p>
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
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] User response to install prompt:', outcome);
          deferredPrompt = null;
          banner.remove();
        } else {
          alert('📱 Cara Instal di Android:\n\n1. Ketuk menu 3 titik (⋮) di kanan atas Chrome\n2. Pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama"\n3. Aplikasi akan otomatis muncul di menu HP Anda!');
        }
      });
    }
  }

  // Global window handle to trigger install
  window.triggerPwaInstall = function() {
    if (isStandalone()) {
      alert('Aplikasi Approval Anywhere sudah terinstal di HP Anda!');
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else if (isIos()) {
      alert('📱 Cara Instal di iPhone / iOS:\n\n1. Ketuk tombol Bagikan (⎋) di Safari\n2. Pilih "Tambahkan ke Layar Utama"\n3. Tekan Tambah di kanan atas!');
    } else {
      alert('📱 Cara Instal di Android:\n\n1. Ketuk menu 3 titik (⋮) di kanan atas Chrome\n2. Pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama"\n3. Aplikasi akan otomatis muncul di menu HP Anda!');
    }
  };

  // Listen for beforeinstallprompt event on Android/Chrome
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    renderInstallBanner();
  });

  // Manage Standalone PWA vs Browser UI Toggling
  window.addEventListener('load', () => {
    const manualBtn = document.getElementById('manual-pwa-install-btn');
    const bioBtn = document.getElementById('biometric-login-btn');

    if (isStandalone()) {
      // User is INSIDE the Installed PWA App:
      if (manualBtn) manualBtn.classList.add('hidden');
      if (bioBtn && isMobile() && window.BiometricManager && BiometricManager.isSupported()) {
        bioBtn.classList.remove('hidden');
      } else if (bioBtn) {
        bioBtn.classList.add('hidden');
      }
    } else {
      // User is in normal browser mode:
      if (isMobile()) {
        setTimeout(renderInstallBanner, 1000);
        if (manualBtn) {
          manualBtn.classList.remove('hidden');
          manualBtn.addEventListener('click', window.triggerPwaInstall);
        }
        if (bioBtn && window.BiometricManager && BiometricManager.isSupported()) {
          bioBtn.classList.remove('hidden');
        }
      } else {
        // Desktop / Laptop (Screen > 1024px)
        if (manualBtn) manualBtn.classList.add('hidden');
        if (bioBtn) bioBtn.classList.add('hidden');
      }
    }
  });
})();
