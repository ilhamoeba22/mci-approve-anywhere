// Frontend JavaScript Application for Portal Otorisasi Core Banking

let state = {
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
  currentModule: 'dashboard',
  pendingCounts: {},
  currentModuleData: [],
  selectedItem: null,
  selectedModule: null,
  pollTimer: null,
  theme: localStorage.getItem('theme') || 'light',
  sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === 'true'
};

// Module definitions mapping
const MODULES = {
  cif_perorangan: {
    title: 'CIF Perorangan Pending',
    subtitle: 'Permohonan CIF nasabah perorangan dari CBS',
    endpoint: '/api/cif/perorangan',
    idKey: 'nocif',
    icon: '👤',
    columns: [
      { key: 'nocif', label: 'No. CIF' },
      { key: 'nm', label: 'Nama Nasabah' },
      { key: 'noid', label: 'No. Identitas' },
      { key: 'kota', label: 'Kota' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'tglinp', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  cif_badanhukum: {
    title: 'CIF Badan Hukum Pending',
    subtitle: 'Permohonan CIF PT, CV, Koperasi, BMT',
    endpoint: '/api/cif/badanhukum',
    idKey: 'nocif',
    icon: '🏢',
    columns: [
      { key: 'nocif', label: 'No. CIF' },
      { key: 'nm', label: 'Nama Badan Hukum' },
      { key: 'jnsbh', label: 'Jenis BH' },
      { key: 'noid', label: 'NPWP / SIUP' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'tglinp', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  tabungan: {
    title: 'Pembukaan Tabungan Pending',
    subtitle: 'Permohonan rekening tabungan baru',
    endpoint: '/api/tabungan',
    idKey: 'notab',
    icon: '💳',
    columns: [
      { key: 'notab', label: 'No. Rekening' },
      { key: 'fnama', label: 'Nama Pemilik' },
      { key: 'nocif', label: 'No. CIF' },
      { key: 'kodeprd', label: 'Produk' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgl', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  deposito: {
    title: 'Pembukaan Deposito Pending',
    subtitle: 'Permohonan bilyet deposito baru',
    endpoint: '/api/deposito',
    idKey: 'nodep',
    icon: '💰',
    columns: [
      { key: 'nodep', label: 'No. Deposito' },
      { key: 'nobilyet', label: 'No. Bilyet' },
      { key: 'nama', label: 'Nama Deposan' },
      { key: 'nomrp', label: 'Nominal Rp', format: 'money' },
      { key: 'jkwaktu', label: 'Jk Waktu (Bln)' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgl', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  transaksi: {
    title: 'Otorisasi Transaksi Pending',
    subtitle: 'Transaksi jernal/pemindahan teller pending',
    endpoint: '/api/transaksi',
    idKey: 'custom_id',
    icon: '💸',
    columns: [
      { key: 'tgltrn', label: 'Tgl Transaksi', format: 'date' },
      { key: 'batch', label: 'Batch' },
      { key: 'notrn', label: 'No. Trn' },
      { key: 'dracc', label: 'Rekening Debit' },
      { key: 'cracc', label: 'Rekening Kredit' },
      { key: 'nominalrp', label: 'Nominal Rp', format: 'money' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgl', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  pembiayaan: {
    title: 'Otorisasi Pembiayaan Pending',
    subtitle: 'Permohonan akad pembiayaan baru',
    endpoint: '/api/pembiayaan',
    idKey: 'nokontrak',
    icon: '📄',
    columns: [
      { key: 'nokontrak', label: 'No. Kontrak' },
      { key: 'nama', label: 'Nama Debitur' },
      { key: 'nocif', label: 'No. CIF' },
      { key: 'mdlawal', label: 'Plafon Rp', format: 'money' },
      { key: 'tglakad', label: 'Tgl Akad', format: 'date' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgl', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  aset: {
    title: 'Otorisasi Aset / Inventaris',
    subtitle: 'Pengadaan & pencatatan aset kantor',
    endpoint: '/api/aset',
    idKey: 'kdaset',
    icon: '🖥️',
    columns: [
      { key: 'kdaset', label: 'Kode Aset' },
      { key: 'ket', label: 'Keterangan Aset' },
      { key: 'haper', label: 'Harga Perolehan Rp', format: 'money' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgl', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  jaminan: {
    title: 'Otorisasi Jaminan / Agunan',
    subtitle: 'Registrasi jaminan pembiayaan',
    endpoint: '/api/jaminan',
    idKey: 'noreg',
    icon: '🏠',
    columns: [
      { key: 'noreg', label: 'No. Registrasi' },
      { key: 'urut', label: 'Urut' },
      { key: 'nocif', label: 'Nama Nasabah' },
      { key: 'an', label: 'Atas Nama Agunan' },
      { key: 'dokumen', label: 'Dokumen Jaminan' },
      { key: 'jnsjamin', label: 'Jenis Agunan', format: 'agunan' },
      { key: 'jnsikat', label: 'Jenis Pengikatan', format: 'ikat' },
      { key: 'nilaiagunbi', label: 'Nilai HT Rp', format: 'money' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgljam', label: 'Tgl Input Maker', format: 'date' }
    ]
  },
  kondisi_khusus: {
    title: 'Otorisasi Kondisi Khusus',
    subtitle: 'Dispensasi & special rate (TOFSPC)',
    endpoint: '/api/kondisi-khusus',
    idKey: 'custom_id',
    icon: '⚡',
    columns: [
      { key: 'noacc', label: 'No. Rekening' },
      { key: 'urutspc', label: 'Urut' },
      { key: 'jnsspc', label: 'Jenis Spc' },
      { key: 'ket', label: 'Keterangan' },
      { key: 'tgleff', label: 'Tgl Efektif', format: 'date' },
      { key: 'inpuser', label: 'Maker' },
      { key: 'inptgljam', label: 'Tgl Input Maker', format: 'date' }
    ]
  }
};

function formatMoney(val) {
  if (val === null || val === undefined) return '-';
  const num = Number(val);
  return 'Rp ' + num.toLocaleString('id-ID');
}

function formatMakerDate(val) {
  if (!val || String(val).trim() === '') return '-';
  const str = String(val).trim();
  
  if (/^\d{14}$/.test(str)) {
    const yyyy = str.substring(0, 4);
    const mm = str.substring(4, 6);
    const dd = str.substring(6, 8);
    const hh = str.substring(8, 10);
    const mi = str.substring(10, 12);
    const ss = str.substring(12, 14);
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
  }
  
  if (/^\d{8}$/.test(str)) {
    const yyyy = str.substring(0, 4);
    const mm = str.substring(4, 6);
    const dd = str.substring(6, 8);
    return `${dd}/${mm}/${yyyy}`;
  }

  return str;
}

function formatJenisPengikatan(val) {
  if (!val || String(val).trim() === '') return '-';
  const code = String(val).trim();
  const map = {
    '01': 'Bawah Tangan',
    '11': 'Bawah Tangan',
    '02': 'Notariil',
    '12': 'Notariil',
    '03': 'SKMHT',
    '16': 'SKMHT',
    '04': 'Fiducia dan Hipotik',
    '05': 'Gadai / Blokir Saldo',
    '06': 'Hipotik',
    '13': 'Hak Tanggungan (APHT)',
    '14': 'Jaminan Fidusia',
    '99': 'Lain-lain'
  };
  return map[code] ? `${map[code]} (${code})` : code;
}

function formatJenisAgunan(val) {
  if (!val || String(val).trim() === '') return '-';
  const code = String(val).trim();
  const map = {
    '01': '01 - Giro Bank Lain',
    '02': '02 - Tabungan',
    '03': '03 - Deposito',
    '04': '04 - Kendaraan Roda 4 (Mobil)',
    '05': '05 - Kendaraan Roda 2 (Motor)',
    '06': '06 - Mesin / Peralatan Usaha',
    '07': '07 - Kendaraan Roda 2 (Motor)',
    '08': '08 - Tanah Kosong',
    '12': '12 - Cash Collateral (Deposito/Tabungan)',
    '21': '21 - Cash Collateral (Deposito)',
    '22': '22 - Logam Mulia / Emas',
    '31': '31 - Tanah / Bangunan Proses Notaris',
    '41': '41 - Tanah & Bangunan (SHM/SHGB)',
    '42': '42 - Tanah Kosong',
    '43': '43 - Properti / Perumahan Developer',
    '47': '47 - Kendaraan Roda 4 (Mobil)',
    '48': '48 - Mesin & Peralatan Usaha',
    '51': '51 - Surat Berharga / Saham',
    '52': '52 - Deposito Berjangka',
    '58': '58 - Asuransi Penjaminan',
    '60': '60 - Giro Antar Bank',
    '63': '63 - Asuransi Jiwa-Lainnya',
    '65': '65 - Saham BPRS / Surat Berharga',
    '71': '71 - Jaminan Pemerintah Pusat / Daerah',
    '72': '72 - Asuransi Pemb-Asur BUMN/BUMD',
    '74': '74 - SK Pegawai BUMN / BUMD / PNS',
    '75': '75 - Ijazah / Dokumen Personal',
    '76': '76 - Ijazah & Sertifikat Keahlian',
    '99': '99 - Lain-lain / SK'
  };
  return map[code] ? `${map[code]}` : code;
}

function formatBuktiKepemilikan(val) {
  if (!val || String(val).trim() === '') return '-';
  const code = String(val).trim();
  const map = {
    '26': 'Polis / Sertifikat Kafalah (26)',
    '01': 'SHM (Sertifikat Hak Milik) (01)',
    '02': 'SHGB (Sertifikat Hak Guna Bangunan) (02)',
    '03': 'SHGB (Sertifikat Hak Guna Bangunan) (03)',
    '04': 'BPKB Kendaraan Roda 4 (04)',
    '06': 'BPKB Kendaraan Bermotor (06)',
    '15': 'Sertifikat Penjaminan Kredit (15)',
    '18': 'Surat Keputusan (SK) (18)',
    '08': 'Bilyet Deposito / Buku Tabungan (08)',
    '16': 'Saham / Surat Berharga (16)',
    '41': 'Sertifikat Tanah Properti (41)'
  };
  return map[code] ? `${map[code]}` : `Kode Dokumen ${code}`;
}

function formatStatusKepemilikan(val) {
  if (!val || String(val).trim() === '') return '1 - Milik Sendiri';
  const code = String(val).trim();
  const map = {
    '1': '1 - Milik Sendiri',
    '01': '1 - Milik Sendiri',
    '2': '2 - Milik Pihak Ketiga / Keluarga',
    '3': '3 - Milik Perusahaan / Badan Hukum'
  };
  return map[code] ? map[code] : `${code} - Milik Sendiri`;
}

// Idle Inactivity Auto-Logout & Live Countdown Manager (15 Minutes = 900 Seconds)
let idleTimer = null;
let countdownInterval = null;
const IDLE_TIMEOUT_SECONDS = 15 * 60; // 900 seconds
let remainingSeconds = IDLE_TIMEOUT_SECONDS;

function formatCountdown(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function updateTimerDisplay() {
  const timerDisplayEl = document.getElementById('session-timer-display');
  const timerBadgeEl = document.getElementById('session-timer-badge');
  
  if (!timerDisplayEl || !timerBadgeEl) return;
  
  timerDisplayEl.textContent = formatCountdown(remainingSeconds);
  
  // Dynamic Badge Color Indicator based on remaining time
  if (remainingSeconds <= 60) {
    timerBadgeEl.className = 'session-timer-badge critical';
  } else if (remainingSeconds <= 300) { // < 5 minutes
    timerBadgeEl.className = 'session-timer-badge warning';
  } else {
    timerBadgeEl.className = 'session-timer-badge';
  }
}

function resetIdleTimer() {
  if (!state.user) return;
  
  // Reset remaining seconds back to 15:00
  remainingSeconds = IDLE_TIMEOUT_SECONDS;
  updateTimerDisplay();

  // Reset timeout timer
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (state.user) {
      if (countdownInterval) clearInterval(countdownInterval);
      showToast('Sesi Berakhir ⚠️', 'Sesi Anda telah berakhir secara otomatis karena tidak ada aktivitas selama 15 menit.', 'warning');
      logout();
    }
  }, IDLE_TIMEOUT_SECONDS * 1000);
}

function initIdleTimer() {
  // Clear any existing interval
  if (countdownInterval) clearInterval(countdownInterval);
  
  // Start live 1-second countdown interval
  countdownInterval = setInterval(() => {
    if (state.user && remainingSeconds > 0) {
      remainingSeconds--;
      updateTimerDisplay();
    }
  }, 1000);

  // User explicit activity listeners (click, keydown, touchstart, scroll) - Excludes passive mousemove
  ['click', 'keydown', 'touchstart', 'scroll'].forEach(evt => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
  });

  resetIdleTimer();
}

async function apiFetch(endpoint, options = {}, isRetry = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(state.token && { 'Authorization': `Bearer ${state.token}` }),
    ...options.headers
  };

  const response = await fetch(endpoint, {
    credentials: 'same-origin',
    ...options,
    headers
  });
  const data = await response.json();

  if (response.status === 401 && !isRetry && endpoint !== '/api/auth/login' && endpoint !== '/api/auth/refresh') {
    try {
      const refreshRes = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'same-origin' });
      const refreshData = await refreshRes.json();
      if (refreshRes.ok && refreshData.token) {
        state.token = refreshData.token;
        localStorage.setItem('token', refreshData.token);
        return await apiFetch(endpoint, options, true);
      }
    } catch (refreshErr) {}

    logout();
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
  }

  if (!response.ok) {
    throw new Error(data.message || 'Terjadi kesalahan pada server');
  }

  return data;
}

const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('theme', theme);
  document.documentElement.setAttribute('data-theme', theme);

  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');
  if (themeIcon && themeText) {
    if (theme === 'light') {
      themeIcon.textContent = '☀️';
      themeText.textContent = 'Mode Terang';
    } else {
      themeIcon.textContent = '🌙';
      themeText.textContent = 'Mode Gelap';
    }
  }
}

function toggleTheme() {
  const nextTheme = state.theme === 'light' ? 'dark' : 'light';
  applyTheme(nextTheme);
}

function applySidebar(collapsed) {
  state.sidebarCollapsed = collapsed;
  localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false');
  const sidebar = document.querySelector('.app-sidebar');
  if (sidebar) {
    sidebar.classList.toggle('collapsed', collapsed);
  }
}

function toggleSidebar() {
  const sidebar = document.querySelector('.app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (window.innerWidth <= 768) {
    if (sidebar) {
      const isOpen = sidebar.classList.toggle('mobile-open');
      if (backdrop) backdrop.classList.toggle('active', isOpen);
    }
  } else {
    applySidebar(!state.sidebarCollapsed);
  }
}

function closeMobileSidebar() {
  const sidebar = document.querySelector('.app-sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');
  if (sidebar) sidebar.classList.remove('mobile-open');
  if (backdrop) backdrop.classList.remove('active');
}

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  applySidebar(state.sidebarCollapsed);

  if (state.token && state.user) {
    showAppShell();
    loadDashboardData();
  } else {
    showLoginScreen();
  }

  const safeAddListener = (id, event, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, fn);
  };

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  safeAddListener('logout-btn', 'click', openLogoutModal);
  safeAddListener('close-logout-btn', 'click', hideLogoutModal);
  safeAddListener('cancel-logout-btn', 'click', hideLogoutModal);
  safeAddListener('confirm-logout-btn', 'click', confirmLogout);

  safeAddListener('biometric-login-btn', 'click', async () => {
    try {
      if (!window.BiometricManager) return;

      const lastUser = localStorage.getItem('last_biometric_user') || (document.getElementById('userid') ? document.getElementById('userid').value : '');
      if (!lastUser) {
        showToast('Biometrik Belum Terdaftar', 'Silakan login dengan User ID & Password 1x terlebih dahulu untuk mendaftarkan Fingerprint / FaceID.', 'warning');
        return;
      }

      showToast('Biometrik Scan', 'Silakan tempelkan sidik jari atau scan FaceID di HP Anda...', 'info');
      const bioRes = await BiometricManager.authenticate(lastUser);
      
      if (bioRes && bioRes.userId) {
        const targetDbSelect = document.getElementById('target-db-select');
        const targetDb = targetDbSelect ? targetDbSelect.value : 'BPRS_MCI_LIVE';

        showToast('Fingerprint Berhasil 👆', `Sidik jari terverifikasi untuk ${bioRes.userId}. Mengakses portal...`, 'success');

        const response = await fetch('/api/auth/biometric-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userid: bioRes.userId,
            target_db: targetDb
          })
        });

        const data = await response.json();

        if (response.ok && data.status === 'success') {
          state.user = data.user;
          state.token = data.token;
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          showAppShell();
          loadDashboardData();
          showToast('Login Biometrik Sukses', `Selamat datang kembali, ${data.user.nmuser || data.user.userid}!`, 'success');
        } else {
          showToast('Login Gagal', data.message || 'Gagal login biometrik.', 'error');
        }
      }
    } catch (bioErr) {
      showToast('Biometrik Gagal', bioErr.message || 'Verifikasi biometrik dibatalkan.', 'warning');
    }
  });

  safeAddListener('refresh-dashboard-btn', 'click', loadDashboardData);
  safeAddListener('refresh-module-btn', 'click', () => loadModuleData(state.currentModule));
  safeAddListener('refresh-audit-btn', 'click', loadAuditLogs);
  safeAddListener('export-audit-csv-btn', 'click', handleExportAuditCsv);
  safeAddListener('theme-toggle-btn', 'click', toggleTheme);
  safeAddListener('sidebar-toggle-btn', 'click', toggleSidebar);
  safeAddListener('sidebar-backdrop', 'click', closeMobileSidebar);

  ['audit-filter-user', 'audit-filter-modul', 'audit-filter-aksi', 'audit-filter-network'].forEach(id => {
    safeAddListener(id, 'change', loadAuditLogs);
  });

  safeAddListener('audit-filter-search', 'input', loadAuditLogs);
  safeAddListener('search-input', 'input', handleSearch);

  // Modals close buttons
  safeAddListener('close-detail-btn', 'click', hideDetailModal);
  safeAddListener('close-reject-btn', 'click', hideRejectModal);
  safeAddListener('cancel-reject-btn', 'click', hideRejectModal);
  safeAddListener('confirm-reject-btn', 'click', submitRejection);

  // Approve Modal event listeners
  safeAddListener('close-approve-btn', 'click', hideApproveModal);
  safeAddListener('cancel-approve-btn', 'click', hideApproveModal);
  safeAddListener('confirm-approve-btn', 'click', submitApproval);

  // Global Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'l') {
      e.preventDefault();
      toggleTheme();
    }
  });

  // Navigation Items
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const module = e.currentTarget.dataset.module;
      switchView(module);
    });
  });
});

function showToast(title, message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: '✅',
    danger: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('toast-hiding');
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

async function loadLoginDatabases() {
  const input = document.getElementById('target_db');
  if (input) input.value = 'BPRS_MCI_LIVE';
}

async function handleLogin(e) {
  e.preventDefault();
  const target_db = (document.getElementById('target_db') && document.getElementById('target_db').value) || 'BPRS_MCI_LIVE';
  const userid = document.getElementById('userid').value.trim();
  const password = document.getElementById('password').value;

  loginError.classList.add('hidden');
  const btn = document.getElementById('login-btn');
  btn.disabled = true;

  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userid, password, target_db })
    });

    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    showAppShell();
    showToast('Login Berhasil', `Selamat datang, ${data.user.nmuser || data.user.userid}! Terhubung ke Database Live.`, 'success');
  } catch (err) {
    loginError.textContent = `❌ ${err.message || 'User ID atau Password tidak sesuai'}`;
    loginError.classList.remove('hidden');
    showToast('Gagal Login', err.message || 'User ID atau Password yang Anda masukkan tidak sesuai di database', 'danger');
  } finally {
    btn.disabled = false;
  }
}

function openLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.remove('hidden');
}

function hideLogoutModal() {
  const modal = document.getElementById('logout-modal');
  if (modal) modal.classList.add('hidden');
}

function confirmLogout() {
  hideLogoutModal();
  logout();
  showToast('Logout Selesai', 'Anda telah berhasil keluar dari sesi portal otorisasi.', 'info');
}

function logout() {
  const oldToken = state.token;
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  if (state.pollTimer) clearInterval(state.pollTimer);

  if (oldToken) {
    fetch('/api/auth/logout', { 
      method: 'POST', 
      headers: { 'Authorization': `Bearer ${oldToken}` },
      credentials: 'same-origin'
    }).catch(() => {});
  }

  showLoginScreen();
}

function showLoginScreen() {
  loginScreen.classList.remove('hidden');
  appShell.classList.add('hidden');
  
  // Explicitly force hide all modals on login screen
  ['logout-modal', 'detail-modal', 'reject-modal'].forEach(id => {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  });

  loadLoginDatabases();
}

function renderDynamicNavigation(user) {
  if (!user) return;
  const level = (user.levelx || '').toUpperCase();
  const akses = (user.akses || '').toUpperCase();
  const limitldr = Number(user.limitldr || 0);
  const limitcdr = Number(user.limitcdr || 0);
  const userid = (user.userid || '').toUpperCase();
  const dept = (user.dept || '').toUpperCase();

  // Superadmin / Executive: Level A/M, full access string, or both limitldr & limitcdr > 0
  const isSuperadmin = ['A', 'M'].includes(level) || akses === 'YYYYYYYYYYYYY' || (limitldr > 0 && limitcdr > 0);
  
  // Legal Division User: Has Lending Limit (limitldr > 0) without Funding Limit (limitcdr == 0), or Legal User ID / Dept
  const isLegalUser = (limitldr > 0 && limitcdr === 0) || ['ANTO', 'TEDDY', 'LEGAL'].includes(userid) || dept.includes('LEG');
  
  // Operasional Division User: Has Funding Limit (limitcdr > 0) without Lending Limit (limitldr == 0), or Operasional Dept
  const isOperasionalUser = (limitcdr > 0 && limitldr === 0) || dept.includes('OPE');

  let isOperasionalAuthorized = false;
  let isLegalAuthorized = false;

  if (isSuperadmin) {
    isOperasionalAuthorized = true;
    isLegalAuthorized = true;
  } else if (isLegalUser) {
    isOperasionalAuthorized = false;
    isLegalAuthorized = true;
  } else if (isOperasionalUser) {
    isOperasionalAuthorized = true;
    isLegalAuthorized = false;
  } else {
    isOperasionalAuthorized = true;
    isLegalAuthorized = true;
  }

  // SISTEM & AUDIT: HANYA DITAMPILKAN UNTUK USER LEVEL A SUPERADMIN SAJA
  const isSystemAuditAuthorized = (level === 'A');

  const headerOperasional = document.getElementById('header-operasional');
  const groupOperasional = document.getElementById('group-operasional');
  const headerLegal = document.getElementById('header-legal');
  const groupLegal = document.getElementById('group-legal');
  const headerSystem = document.getElementById('header-system');
  const groupSystem = document.getElementById('group-system');

  if (headerOperasional && groupOperasional) {
    if (isOperasionalAuthorized) {
      headerOperasional.classList.remove('hidden');
      groupOperasional.classList.remove('hidden');
    } else {
      headerOperasional.classList.add('hidden');
      groupOperasional.classList.add('hidden');
    }
  }

  if (headerLegal && groupLegal) {
    if (isLegalAuthorized) {
      headerLegal.classList.remove('hidden');
      groupLegal.classList.remove('hidden');
    } else {
      headerLegal.classList.add('hidden');
      groupLegal.classList.add('hidden');
    }
  }

  if (headerSystem && groupSystem) {
    if (isSystemAuditAuthorized) {
      headerSystem.classList.remove('hidden');
      groupSystem.classList.remove('hidden');
    } else {
      headerSystem.classList.add('hidden');
      groupSystem.classList.add('hidden');
    }
  }
}

function showAppShell() {
  loginScreen.classList.add('hidden');
  appShell.classList.remove('hidden');

  document.getElementById('user-name-display').textContent = state.user.nmuser || state.user.userid;
  document.getElementById('user-level-display').textContent = `LEVEL ${state.user.levelx}`;

  document.getElementById('db-name-display').textContent = 'Connect Database Live';

  // Render division menus based on user database permissions
  renderDynamicNavigation(state.user);

  // Initialize 15-minute idle inactivity auto-logout monitor
  initIdleTimer();

  // Prompt supervisor for biometric registration if available
  if (window.BiometricManager) {
    BiometricManager.isPlatformBiometricAvailable().then(avail => {
      if (avail && !BiometricManager.hasCredential(state.user.userid)) {
        setTimeout(() => {
          if (confirm('🔒 Aktifkan Fingerprint / FaceID pada HP ini untuk Login Cepat selanjutnya?')) {
            BiometricManager.registerCredential(state.user.userid)
              .then(() => showToast('Biometrik Aktif 👆', 'Fingerprint / FaceID berhasil didaftarkan untuk login cepat!', 'success'))
              .catch(err => console.warn('[Biometric] Registration skipped:', err.message));
          }
        }, 1200);
      }
    });
  }

  // Health check to get IP & Network type
  apiFetch('/api/health').then(h => {
    const netType = h.network_type || 'LAN';
    document.getElementById('net-type').textContent = netType;
    document.getElementById('net-badge').className = `network-badge ${netType === 'EXTERNAL' ? 'ext' : ''}`;
  }).catch(() => {});

  loadDashboardData();

  if (state.pollTimer) clearInterval(state.pollTimer);
  state.pollTimer = setInterval(loadDashboardData, 30000);
}

function switchView(module) {
  state.currentModule = module;
  closeMobileSidebar();

  document.querySelectorAll('.nav-item').forEach(b => {
    b.classList.toggle('active', b.dataset.module === module);
  });

  document.getElementById('view-dashboard').classList.add('hidden');
  document.getElementById('view-module').classList.add('hidden');
  document.getElementById('view-audit').classList.add('hidden');

  if (module === 'dashboard') {
    document.getElementById('view-dashboard').classList.remove('hidden');
    loadDashboardData();
  } else if (module === 'audit') {
    document.getElementById('view-audit').classList.remove('hidden');
    loadAuditUserOptions();
    loadAuditLogs();
  } else if (module === 'tutup_kantor') {
    document.getElementById('view-module').classList.remove('hidden');
    loadTutupKantor();
  } else {
    document.getElementById('view-module').classList.remove('hidden');
    loadModuleData(module);
  }
}

async function loadDashboardData() {
  const grid = document.getElementById('stats-cards-grid');
  if (!grid) return;

  const user = state.user;
  const level = (user?.levelx || '').toUpperCase();
  const akses = (user?.akses || '').toUpperCase();
  const limitldr = Number(user?.limitldr || 0);
  const limitcdr = Number(user?.limitcdr || 0);
  const userid = (user?.userid || '').toUpperCase();
  const dept = (user?.dept || '').toUpperCase();

  const isSuperadmin = ['A', 'M'].includes(level) || akses === 'YYYYYYYYYYYYY' || (limitldr > 0 && limitcdr > 0);
  const isLegalUser = (limitldr > 0 && limitcdr === 0) || ['ANTO', 'TEDDY', 'LEGAL'].includes(userid) || dept.includes('LEG');
  const isOperasionalUser = (limitcdr > 0 && limitldr === 0) || dept.includes('OPE');

  let isOperasionalAuthorized = false;
  let isLegalAuthorized = false;

  if (isSuperadmin) {
    isOperasionalAuthorized = true;
    isLegalAuthorized = true;
  } else if (isLegalUser) {
    isOperasionalAuthorized = false;
    isLegalAuthorized = true;
  } else if (isOperasionalUser) {
    isOperasionalAuthorized = true;
    isLegalAuthorized = false;
  } else {
    isOperasionalAuthorized = true;
    isLegalAuthorized = true;
  }

  const operasionalKeys = ['cif_perorangan', 'cif_badanhukum', 'tabungan', 'deposito', 'pembiayaan', 'transaksi', 'aset', 'kondisi_khusus'];
  const legalKeys = ['jaminan'];

  // Update Hero Greeting Name
  const dashWelcomeName = document.getElementById('dash-user-name');
  if (dashWelcomeName && user) {
    dashWelcomeName.textContent = user.nmuser || user.userid;
  }

  let grandTotalPending = 0;

  // Fetch pending counts for all modules
  for (const [key, mod] of Object.entries(MODULES)) {
    try {
      const res = await apiFetch(`${mod.endpoint}/pending`);
      const total = res.total || 0;
      state.pendingCounts[key] = total;
      grandTotalPending += total;

      const badge = document.getElementById(`count-${key}`);
      if (badge) badge.textContent = total;
    } catch (err) {
      state.pendingCounts[key] = 0;
    }
  }

  // Update Total Pending KPI in Hero Banner
  const dashTotalPending = document.getElementById('dash-total-pending');
  if (dashTotalPending) {
    dashTotalPending.textContent = grandTotalPending;
  }

  let html = '';

  // 1. Render Operasional Cards Section if authorized
  if (isOperasionalAuthorized) {
    html += `
      <div class="dashboard-division-header">
        <span>💼</span> <span>DIVISI OPERASIONAL</span>
      </div>
      <div class="stats-cards-subgrid">
    `;
    for (const key of operasionalKeys) {
      const mod = MODULES[key];
      if (!mod) continue;
      const count = state.pendingCounts[key] || 0;
      const hasPending = count > 0;
      html += `
        <div class="stat-card" onclick="switchView('${key}')">
          <div class="stat-card-header">
            <div class="stat-card-left">
              <div class="stat-card-icon">${mod.icon}</div>
              <div class="card-title" style="margin:0; font-weight:700;">${mod.title}</div>
            </div>
            <div class="card-count ${hasPending ? 'has-pending' : ''}">${count}</div>
          </div>
          <div class="stat-card-footer">
            <span>Buka Modul</span>
            <span>➔</span>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  // 2. Render Legal Cards Section if authorized
  if (isLegalAuthorized) {
    html += `
      <div class="dashboard-division-header">
        <span>⚖️</span> <span>DIVISI LEGAL</span>
      </div>
      <div class="stats-cards-subgrid">
    `;
    for (const key of legalKeys) {
      const mod = MODULES[key];
      if (!mod) continue;
      const count = state.pendingCounts[key] || 0;
      const hasPending = count > 0;
      html += `
        <div class="stat-card" onclick="switchView('${key}')">
          <div class="stat-card-header">
            <div class="stat-card-left">
              <div class="stat-card-icon">${mod.icon}</div>
              <div class="card-title" style="margin:0; font-weight:700;">${mod.title}</div>
            </div>
            <div class="card-count ${hasPending ? 'has-pending' : ''}">${count}</div>
          </div>
          <div class="stat-card-footer">
            <span>Kelola Agunan</span>
            <span>➔</span>
          </div>
        </div>
      `;
    }
    html += `</div>`;
  }

  grid.innerHTML = html;
}

async function loadModuleData(moduleKey) {
  const mod = MODULES[moduleKey];
  if (!mod) return;

  document.getElementById('module-title').textContent = mod.title;
  document.getElementById('module-subtitle').textContent = mod.subtitle;
  document.getElementById('search-input').value = '';
  document.getElementById('module-alert').classList.add('hidden');

  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');

  thead.innerHTML = `
    <tr>
      ${mod.columns.map(c => `<th>${c.label}</th>`).join('')}
      <th>Aksi Otorisasi</th>
    </tr>
  `;

  tbody.innerHTML = `<tr><td colspan="${mod.columns.length + 1}" style="text-align:center; padding:24px;">Memuat data pending...</td></tr>`;

  try {
    const res = await apiFetch(`${mod.endpoint}/pending`);
    state.currentModuleData = res.data || [];
    renderTable(state.currentModuleData, moduleKey);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="${mod.columns.length + 1}" style="text-align:center; padding:24px; color:var(--danger);">Error: ${err.message}</td></tr>`;
  }
}

function renderTable(data, moduleKey) {
  const mod = MODULES[moduleKey];
  const tbody = document.getElementById('table-body');

  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${mod.columns.length + 1}" style="text-align:center; padding:24px; color:var(--text-muted);">🎉 Tidak ada permohonan pending untuk modul ini.</td></tr>`;
    return;
  }

  let html = '';
  data.forEach((row, idx) => {
    let idVal = '';
    if (moduleKey === 'transaksi') {
      idVal = `${row.tgltrn}_${row.batch}_${row.notrn}`;
    } else if (moduleKey === 'kondisi_khusus') {
      idVal = `${row.urutspc}_${row.noacc}`;
    } else if (moduleKey === 'jaminan') {
      idVal = `${row.noreg}_${row.urut || 1}`;
    } else {
      idVal = row[mod.idKey];
    }

    html += `<tr>`;
    mod.columns.forEach(c => {
      let val = row[c.key];
      if (c.format === 'money') val = formatMoney(val);
      if (c.format === 'date') val = formatMakerDate(val);
      if (c.format === 'ikat') val = formatJenisPengikatan(val);
      if (c.format === 'agunan') val = formatJenisAgunan(val);
      html += `<td>${val || '-'}</td>`;
    });

    const isRejectHidden = ['cif_perorangan', 'cif_badanhukum', 'tabungan', 'deposito', 'pembiayaan'].includes(moduleKey);

    html += `
      <td>
        <div class="table-action-btns">
          <button class="btn btn-secondary btn-sm btn-icon-only" title="Lihat Detail Data" onclick="viewDetail('${moduleKey}', ${idx})">
            <span class="btn-icon">🔍</span>
            <span class="btn-label">Detail</span>
          </button>
          <button class="btn btn-success btn-sm btn-icon-only" title="Setujui Permohonan" onclick="approveRecord('${moduleKey}', '${idVal}')">
            <span class="btn-icon">✔</span>
            <span class="btn-label">Setuju</span>
          </button>
          ${!isRejectHidden ? `
          <button class="btn btn-danger btn-sm btn-icon-only" title="Tolak Permohonan" onclick="openRejectModal('${moduleKey}', '${idVal}')">
            <span class="btn-icon">✖</span>
            <span class="btn-label">Tolak</span>
          </button>` : ''}
        </div>
      </td>
    </tr>`;
  });

  tbody.innerHTML = html;
}

function handleSearch(e) {
  const query = e.target.value.toLowerCase().trim();
  if (!query) {
    renderTable(state.currentModuleData, state.currentModule);
    return;
  }

  const filtered = state.currentModuleData.filter(row => {
    return Object.values(row).some(v => v && String(v).toLowerCase().includes(query));
  });

  renderTable(filtered, state.currentModule);
}

async function viewDetail(moduleKey, index) {
  let row = state.currentModuleData[index];
  if (!row) return;

  const mod = MODULES[moduleKey];
  document.getElementById('detail-title').textContent = `Inspeksi Detail Otorisasi — ${mod.title}`;

  let idVal = '';
  if (moduleKey === 'transaksi') {
    idVal = `${row.tgltrn}_${row.batch}_${row.notrn}`;
  } else if (moduleKey === 'kondisi_khusus') {
    idVal = `${row.urutspc}_${row.noacc}`;
  } else if (moduleKey === 'jaminan') {
    idVal = `${row.noreg}_${row.urut || 1}`;
  } else {
    idVal = row[mod.idKey];
  }

  // Fetch full record details asynchronously for all modules
  try {
    const fullRes = await apiFetch(`${mod.endpoint}/${idVal}`);
    if (fullRes && fullRes.data) {
      row = fullRes.data;
    }
  } catch (e) {
    console.warn('[Detail] Could not fetch full record, fallback to row cache:', e.message);
  }

  renderDetailDrawer(row, moduleKey, idVal);
}

function renderDetailDrawer(row, moduleKey, idVal) {
  const mod = MODULES[moduleKey];
  let primaryTitle = row.nm || row.fnama || row.nama || row.ket || row.dokumen || idVal;

  let html = `
    <div class="detail-header-banner">
      <div class="detail-header-left">
        <div class="detail-header-icon">${mod.icon}</div>
        <div class="detail-header-info">
          <h4>${primaryTitle}</h4>
          <div class="detail-sub">ID Ref / No. Kunci: <strong>${idVal}</strong></div>
        </div>
      </div>
      <div class="detail-status-pill">⏳ MENUNGGU APPROVAL</div>
    </div>
  `;

  if (moduleKey === 'cif_perorangan' || moduleKey === 'cif_badanhukum') {
    const isWni = (row.wni === 'I' || row.wni === '1' || row.wni === 'WNI' || row.wni === 'Y' || row.wni === 'ID' || row.wni === 'INDONESIA' || !row.wni);
    const isPns = (row.golcust === 'PNS' || row.lb_golcust === 'PNS' || String(row.golcustbi || '').includes('PNS'));
    const isTerkaitBank = (row.stskait === 'Y' || row.stskait === '1');
    const isPisahHarta = (row.stspisahharta === 'Y' || row.stspisahharta === '1');
    const isVip = (row.vip === 'Y' || row.vip === '1');
    const isRestricted = (row.stsrestr === 'Y' || row.stsrestr === '1');
    const isKaryawan = (row.stskaryawan === 'Y' || row.stskaryawan === '1');

    html += `
      <!-- Section 1: Identitas Utama Nasabah -->
      <div class="detail-section">
        <div class="detail-section-title">👤 Identitas Utama Nasabah (Sesuai ID & SLIK)</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nama (Sesuai ID)*</span>
            <span class="detail-field-value"><strong>${row.nm || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kewarganegaraan*</span>
            <span class="detail-field-value">
              <span class="badge ${isWni ? 'badge-success' : 'badge-warning'}">${isWni ? '🔴 WNI (Warga Negara Indonesia)' : '🔵 Asing (WNA)'}</span>
            </span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Versi SLIK*</span>
            <span class="detail-field-value"><strong>${row.namasid || row.nm || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Ibu Kandung / Wali</span>
            <span class="detail-field-value">${row.nmibu || row.namaibu || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">NIK Ibu Kandung / Wali</span>
            <span class="detail-field-value">${row.nikibu || row.noidibu || row.nikwali || row.noidwali || row.nokk || row.noid || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tempat Lahir</span>
            <span class="detail-field-value">${row.tmplhr || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tgl Lahir</span>
            <span class="detail-field-value">${formatMakerDate(row.tgllhr || '-')}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jenis Kelamin / BH</span>
            <span class="detail-field-value">${row.jnsbh ? row.jnsbh : (row.sex === 'L' || row.sex === '1' ? 'Laki-laki' : (row.sex === 'P' || row.sex === '2' ? 'Perempuan' : (row.sex || '-')))}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Agama</span>
            <span class="detail-field-value">${row.agama || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Status Perkawinan</span>
            <span class="detail-field-value">${row.stskawin || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jumlah Tanggungan</span>
            <span class="detail-field-value">${row.qtytanggungan || row.tanggungan || '0'} Orang</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Perjanjian Pisah Harta</span>
            <span class="detail-field-value">${isPisahHarta ? 'Ya' : 'Tidak'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Pendidikan Terakhir</span>
            <span class="detail-field-value">${row.kddidik || '-'}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Kontak & Identitas Legal -->
      <div class="detail-section">
        <div class="detail-section-title">🪪 Kontak & Identitas Legal</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Jenis & No. Identitas</span>
            <span class="detail-field-value"><span class="highlight-id">${row.jnsid || 'KTP'}: ${row.noid || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">NPWP / SIUP</span>
            <span class="detail-field-value">${row.npwp || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">E-mail</span>
            <span class="detail-field-value">${row.email || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. HP / Telepon</span>
            <span class="detail-field-value"><strong>${row.hp || row.telprmh || row.telpktr || '-'}</strong></span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Alamat Lengkap (Sesuai KTP)</span>
            <span class="detail-field-value">${row.alamat || '-'}, RT/RW: ${row.rtrw || '-'}, Kel. ${row.kelurahan || '-'}, Kec. ${row.kecamatan || '-'}, ${row.kota || '-'}, ${row.provinsi || ''} ${row.kdpos || ''}</span>
          </div>
        </div>
      </div>

      <!-- Section 3: Golongan Customer & Sandi Pelaporan (SLIK & OJK) -->
      <div class="detail-section" style="background: rgba(2, 132, 199, 0.06); border: 1px dashed rgba(2, 132, 199, 0.4); border-radius: 10px; padding: 16px; margin-bottom: 16px;">
        <div class="detail-section-title" style="color: var(--primary); font-size:14px; font-weight:700;">🏛️ Golongan Customer & Sandi Pelaporan (OJK & SLIK)</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Pegawai/Pensiunan PNS</span>
            <span class="detail-field-value">${isPns ? '☑️ Ya (PNS)' : '☐ Tidak'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Golongan Customer OJK (010)</span>
            <span class="detail-field-value"><span style="background:#fef08a; color:#854d0e; padding:3px 10px; border-radius:4px; font-weight:700;">${row.golcustbi || row.golcust || '9002'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Golongan Customer SLIK (32)</span>
            <span class="detail-field-value"><span style="background:#fef08a; color:#854d0e; padding:3px 10px; border-radius:4px; font-weight:700;">${row.golcustslik || row.golcustsid || 'S14'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Terkait Dengan Bank</span>
            <span class="detail-field-value">${isTerkaitBank ? '☑️ Ya (Terkait Bank)' : '☐ Tidak (Bukan Terkait Bank)'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kd Hub dg Bank (SLIK)</span>
            <span class="detail-field-value"><span style="background:#fef08a; color:#854d0e; padding:3px 10px; border-radius:4px; font-weight:700;">${row.kdhubbank || row.hubkait || 'N'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Sts Hub dg Bank (OJK)</span>
            <span class="detail-field-value">${row.stskaitsid || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Group One Obligor</span>
            <span class="detail-field-value">${row.nocifgrp || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Group Usaha</span>
            <span class="detail-field-value">${row.kdgroupusaha || '-'}</span>
          </div>
        </div>

        <div style="display:flex; gap:16px; margin-top:14px; font-size:13px; font-weight:600; border-top: 1px solid var(--border-color); padding-top: 10px; color: var(--text-main);">
          <span>${isVip ? '☑️' : '☐'} VIP</span>
          <span>${isRestricted ? '☑️' : '☐'} Restricted Data</span>
          <span>${isKaryawan ? '☑️' : '☐'} Karyawan BPRS</span>
        </div>
      </div>
    `;
  } else if (moduleKey === 'tabungan') {
    html += `
      <!-- Section 1: Informasi Rekening Tabungan -->
      <div class="detail-section">
        <div class="detail-section-title">💳 Informasi Rekening Tabungan</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">No. Rekening Tabungan</span>
            <span class="detail-field-value"><span class="highlight-id">${row.notab || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik / Nasabah</span>
            <span class="detail-field-value"><strong style="color: var(--primary); font-size: 1.05rem;">${row.fnama || row.nm || row.nama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Panggilan</span>
            <span class="detail-field-value">${row.snama || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Produk Tabungan</span>
            <span class="detail-field-value"><strong>${row.kodeprd || row.kdprd || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Saldo Awal (Setoran Awal)</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.sawalva || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Saldo Akhir</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.sahirva || row.sawalva || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Saldo Cetak Buku</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.saldobuku || row.sahirva || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Saldo Minimal Rekening</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.saldomin || 0)}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Identitas Nasabah & Cabang -->
      <div class="detail-section">
        <div class="detail-section-title">👤 Informasi Nasabah & Cabang Pembukuan</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nama Lengkap Nasabah</span>
            <span class="detail-field-value"><strong>${row.fnama || row.nm || row.nama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. CIF Nasabah</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nocif || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Cabang</span>
            <span class="detail-field-value">${row.kodecab || row.kdcab || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Lokasi Kantor</span>
            <span class="detail-field-value">${row.kodeloc || row.kdloc || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (moduleKey === 'deposito') {
    const isAro = (row.aro === 'Y' || row.aro === '1');
    html += `
      <!-- Section 1: Informasi Deposito & Bilyet -->
      <div class="detail-section">
        <div class="detail-section-title">🏦 Informasi Rekening Deposito & Bilyet</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">No. Rekening Deposito</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nodep || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. Bilyet Deposito</span>
            <span class="detail-field-value"><strong>${row.nobilyet || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Deposan / Nasabah</span>
            <span class="detail-field-value"><strong style="color: var(--primary); font-size: 1.05rem;">${row.nama || row.fnama || row.nm || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nominal Deposito (Plafon)</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.nomrp || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Produk Deposito</span>
            <span class="detail-field-value"><strong>${row.kdprd || row.kodeprd || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jangka Waktu</span>
            <span class="detail-field-value">${row.jkwaktu || '12'} Bulan</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tanggal Pembukaan</span>
            <span class="detail-field-value">${formatMakerDate(row.tglbuka || '-')}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tanggal Jatuh Tempo</span>
            <span class="detail-field-value">${formatMakerDate(row.tgljtempo || '-')}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Bagi Hasil / Nisbah (%)</span>
            <span class="detail-field-value">${row.nisbah || row.bunga || '-'} %</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Status ARO (Perpanjangan Otomatis)</span>
            <span class="detail-field-value">${isAro ? '<span class="badge badge-success">Ya (ARO)</span>' : '<span class="badge badge-secondary">Tidak</span>'}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Rekening Debet & Kredit / Pencairan -->
      <div class="detail-section" style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.3);">
        <div class="detail-section-title" style="color: var(--primary);">💳 Rekening Debet, Kredit & Bagi Hasil</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Rekening Debet (Sumber Dana Pokok)</span>
            <span class="detail-field-value"><span class="highlight-id">${row.noacpok || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rek. Debet</span>
            <span class="detail-field-value"><strong style="color: #60a5fa;">${row.nama_rek_debet || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Rekening Kredit (Deposito)</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nodep || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rek. Kredit</span>
            <span class="detail-field-value"><strong>${row.nama || row.fnama || row.nm || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Rekening Bagi Hasil / Bunga</span>
            <span class="detail-field-value"><span class="highlight-id">${row.noacbng || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rek. Bagi Hasil</span>
            <span class="detail-field-value"><strong style="color: #34d399;">${row.nama_rek_bagi_hasil || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Rekening Pencairan Pokok (Jatuh Tempo)</span>
            <span class="detail-field-value"><span class="highlight-id">${row.noacpokc || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rek. Pencairan</span>
            <span class="detail-field-value"><strong>${row.nama_rek_pencairan || '-'}</strong></span>
          </div>
        </div>
      </div>

      <!-- Section 3: Kantor & Cabang -->
      <div class="detail-section">
        <div class="detail-section-title">🏢 Informasi Nasabah, Kantor & Cabang</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nama Lengkap Nasabah</span>
            <span class="detail-field-value"><strong>${row.nama || row.fnama || row.nm || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. CIF Nasabah</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nocif || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Cabang</span>
            <span class="detail-field-value">${row.kdcab || row.kodecab || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Lokasi Kantor</span>
            <span class="detail-field-value">${row.kdloc || row.kodeloc || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (moduleKey === 'pembiayaan') {
    html += `
      <!-- Section 1: Informasi Kontrak Pembiayaan -->
      <div class="detail-section">
        <div class="detail-section-title">📜 Detail Kontrak Pembiayaan / Pinjaman</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">No. Kontrak Pembiayaan</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nokontrak || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Debitur / Nasabah</span>
            <span class="detail-field-value"><strong style="color: var(--primary); font-size: 1.05rem;">${row.nm || row.nama || row.fnama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Plafon Pembiayaan / Modal Awal</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.mdlawal || row.nomrp || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Saldo Pokok Pembiayaan</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.sahirva || row.sawalva || row.mdlawal || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jangka Waktu Angsuran</span>
            <span class="detail-field-value">${row.jkwaktu || '-'} Bulan</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tanggal Akad Pembiayaan</span>
            <span class="detail-field-value">${formatMakerDate(row.tglakad || '-')}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Produk Pembiayaan</span>
            <span class="detail-field-value"><strong>${row.kodeprd || row.kdprd || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Suku Bunga / Margin (%)</span>
            <span class="detail-field-value">${row.bunga || row.rate || '-'} %</span>
          </div>
        </div>
      </div>

      <!-- Section 2: CIF & Cabang -->
      <div class="detail-section">
        <div class="detail-section-title">👤 Informasi Debitur / Nasabah & Cabang</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nama Lengkap Debitur / Nasabah</span>
            <span class="detail-field-value"><strong>${row.nm || row.nama || row.fnama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. CIF Debitur</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nocif || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Cabang</span>
            <span class="detail-field-value">${row.kdcab || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Lokasi Kantor</span>
            <span class="detail-field-value">${row.kdloc || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (moduleKey === 'transaksi') {
    html += `
      <!-- Section 1: Detail Transaksi Keuangan -->
      <div class="detail-section">
        <div class="detail-section-title">💸 Detail Transaksi Keuangan Teller / System</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">No. Urut Transaksi</span>
            <span class="detail-field-value"><span class="highlight-id">${row.notrn || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Nasabah / Pemilik Rekening</span>
            <span class="detail-field-value"><strong style="color: var(--primary); font-size: 1.05rem;">${row.nm || row.nama || row.namanasabah || row.fnama || row.nm_nasabah || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Batch Teller</span>
            <span class="detail-field-value"><strong>${row.batch || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tanggal Transaksi</span>
            <span class="detail-field-value">${formatMakerDate(row.tgltrn || '-')}</span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Nominal Transaksi Rp</span>
            <span class="detail-field-value highlight-money" style="font-size: 1.1rem;">${formatMoney(row.nominalrp || row.nomrp || 0)}</span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Keterangan Transaksi</span>
            <span class="detail-field-value"><strong>${row.ket || row.keterangan || '-'}</strong></span>
          </div>
        </div>
      </div>

      <!-- Section 2: Informasi Rekening Debet (DR) & Kredit (CR) -->
      <div class="detail-section" style="background: rgba(59, 130, 246, 0.05); border: 1px solid rgba(59, 130, 246, 0.3);">
        <div class="detail-section-title" style="color: var(--primary);">💳 Rincian Rekening Debet (DR) & Kredit (CR)</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Rekening Debet (DR)</span>
            <span class="detail-field-value"><span class="highlight-id">${row.dracc || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rekening Debet (DR)</span>
            <span class="detail-field-value"><strong style="color: #60a5fa;">${row.nama_rek_debet || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Rekening Kredit (CR)</span>
            <span class="detail-field-value"><span class="highlight-id">${row.cracc || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rekening Kredit (CR)</span>
            <span class="detail-field-value"><strong style="color: #34d399;">${row.nama_rek_kredit || '-'}</strong></span>
          </div>
        </div>
      </div>

      <!-- Section 3: Kantor & Teller -->
      <div class="detail-section">
        <div class="detail-section-title">🏢 Otorisasi Teller & Cabang</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">User Teller (Maker)</span>
            <span class="detail-field-value"><strong>${row.inpuser || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Waktu Input Transaksi</span>
            <span class="detail-field-value">${formatMakerDate(row.inptgl || row.tgltrn || '-')}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Cabang</span>
            <span class="detail-field-value">${row.kdcab || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Lokasi Kantor</span>
            <span class="detail-field-value">${row.kdloc || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (moduleKey === 'aset') {
    html += `
      <!-- Section 1: Detail Aset & Inventaris -->
      <div class="detail-section">
        <div class="detail-section-title">🏢 Detail Aset & Inventaris Bank</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Kode Aset / Inventaris</span>
            <span class="detail-field-value"><span class="highlight-id">${row.kdaset || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama / Deskripsi Aset</span>
            <span class="detail-field-value"><strong>${row.nm || row.ket || row.nama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Harga Perolehan (Haper)</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.haper || row.nomrp || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nilai Buku / Sisa Rp</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.sahirva || row.saldobuku || row.haper || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tanggal Perolehan</span>
            <span class="detail-field-value">${formatMakerDate(row.tglbuka || '-')}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Departemen / Penguasaan</span>
            <span class="detail-field-value">${row.dept || '000'}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Cabang & Lokasi -->
      <div class="detail-section">
        <div class="detail-section-title">📍 Lokasi Penempatan Aset</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Kode Cabang</span>
            <span class="detail-field-value">${row.kdcab || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Lokasi Kantor</span>
            <span class="detail-field-value">${row.kdloc || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (moduleKey === 'jaminan') {
    html += `
      <!-- Section 1: Identitas & Legalitas Agunan (CBS Screen 1 of 2) -->
      <div class="detail-section">
        <div class="detail-section-title">🛡️ Identitas & Legalitas Agunan (CBS Screen 1)</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">No. Registrasi & No. Urut</span>
            <span class="detail-field-value"><span class="highlight-id">${row.noreg || '-'} (Urut: ${row.urut || 1})</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Debitur</span>
            <span class="detail-field-value"><strong style="color: var(--primary); font-size: 1.05rem;">${row.nocif || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jenis Agunan</span>
            <span class="detail-field-value"><strong style="color: #0284c7;">${formatJenisAgunan(row.jnsjamin)}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Bukti Kepemilikan</span>
            <span class="detail-field-value">${formatBuktiKepemilikan(row.jnsdokumen)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Dokumen No.</span>
            <span class="detail-field-value"><strong>${row.dokumen || row.ket || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Atas Nama Pemilik Agunan</span>
            <span class="detail-field-value"><strong>${row.an || row.nm || row.nama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Status Kepemilikan</span>
            <span class="detail-field-value">${formatStatusKepemilikan(row.status)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jenis Pengikatan</span>
            <span class="detail-field-value"><strong style="color: #059669; font-size: 1.05rem;">${formatJenisPengikatan(row.jnsikat)}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jaminan Diasuransikan</span>
            <span class="detail-field-value">${(row.stsasr === 'Y' || row.stsasr === '1') ? '☑️ Ya (Diasuransikan)' : '☐ Tidak'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Sandi Dati II</span>
            <span class="detail-field-value">${row.sandidati2 || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Titik Koordinat DD (Lat / Long)</span>
            <span class="detail-field-value">${row.dd_latitude || '0,0000000'}, ${row.dd_longitude || '0,0000000'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. Kontrak Pembiayaan</span>
            <span class="detail-field-value"><span class="highlight-id">${row.nokontrak || '-'}</span></span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Lokasi Agunan</span>
            <span class="detail-field-value">${row.lokasi || '-'}</span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Catatan Pelengkap Jaminan</span>
            <span class="detail-field-value">${row.catatan && row.catatan.trim() ? row.catatan : '-'}</span>
          </div>
        </div>
      </div>

      <!-- Section 2: Nilai-Nilai Agunan (Sesuai Tampilan CBS Desktop) -->
      <div class="detail-section">
        <div class="detail-section-title">💰 Nilai-Nilai Agunan (Maintenance Jaminan CBS)</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nilai Taksasi</span>
            <span class="detail-field-value highlight-money"><strong>${formatMoney(row.nomtaksasi || 0)}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nilai Pasar</span>
            <span class="detail-field-value highlight-money"><strong>${formatMoney(row.nompasar || 0)}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nilai Likuidasi</span>
            <span class="detail-field-value highlight-money"><strong>${formatMoney(row.nomlikuid || 0)}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nilai HT/NJOP</span>
            <span class="detail-field-value highlight-money"><strong style="color: #059669;">${formatMoney(row.nilaiagunbi || row.nomtaksasi || 0)}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Dapat Digunakan (%)</span>
            <span class="detail-field-value">${row.plafond !== null && row.plafond !== undefined ? Number(row.plafond).toLocaleString('id-ID') : '80'} %</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Bisa digunakan</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.akandiguna || row.nomlikuid || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Sudah Digunakan</span>
            <span class="detail-field-value highlight-money">${formatMoney(row.digunakan || 0)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tgl Masuk Agunan</span>
            <span class="detail-field-value">${formatMakerDate(row.tglmasuk || row.inptgljam)}</span>
          </div>
        </div>
      </div>

      <!-- Section 3: Penilai & Tempat Penyimpanan Dokumen -->
      <div class="detail-section">
        <div class="detail-section-title">🏢 Penilai & Tempat Penyimpanan Dokumen</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nama Penilai Intern</span>
            <span class="detail-field-value">${row.namaci || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Nama Penilai Independen</span>
            <span class="detail-field-value">${row.kdpenilai || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tgl Taksasi Awal</span>
            <span class="detail-field-value">${formatMakerDate(row.tgltaks1)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tgl Taksasi Terakhir</span>
            <span class="detail-field-value">${formatMakerDate(row.tgltaks2)}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Lokasi Penyimpanan</span>
            <span class="detail-field-value">${row.loksimpan || 'Lainnya'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Ket Lok. Penyimpanan</span>
            <span class="detail-field-value">${row.ketsimpan || '-'}</span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Catatan / Spesifikasi Objek</span>
            <span class="detail-field-value">${row.catatan || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else if (moduleKey === 'kondisi_khusus') {
    html += `
      <!-- Section 1: Detail Dispensasi & Kondisi Khusus -->
      <div class="detail-section">
        <div class="detail-section-title">⚠️ Detail Dispensasi / Kondisi Khusus (Dispensat)</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">No. Urut SPC</span>
            <span class="detail-field-value"><span class="highlight-id">${row.urutspc || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">No. Rekening Sasaran</span>
            <span class="detail-field-value"><span class="highlight-id">${row.noacc || '-'}</span></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Jenis Dispensasi</span>
            <span class="detail-field-value"><strong>${row.jnsspc || 'Dispensasi Khusus'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Tanggal Efektif</span>
            <span class="detail-field-value">${formatMakerDate(row.tgleff || row.inptgl || '-')}</span>
          </div>
          <div class="detail-field" style="grid-column: 1 / -1;">
            <span class="detail-field-label">Keterangan / Alasan Dispensasi</span>
            <span class="detail-field-value"><strong>${row.ket || row.keterangan || '-'}</strong></span>
          </div>
        </div>
      </div>

      <!-- Section 2: Rekening & Kantor -->
      <div class="detail-section">
        <div class="detail-section-title">🏢 Informasi Rekening & Cabang</div>
        <div class="detail-fields-grid">
          <div class="detail-field">
            <span class="detail-field-label">Nama Pemilik Rekening</span>
            <span class="detail-field-value"><strong>${row.nm || row.nama || row.fnama || '-'}</strong></span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Cabang</span>
            <span class="detail-field-value">${row.kdcab || '-'}</span>
          </div>
          <div class="detail-field">
            <span class="detail-field-label">Kode Lokasi Kantor</span>
            <span class="detail-field-value">${row.kdloc || '-'}</span>
          </div>
        </div>
      </div>
    `;
  } else {
    // Standard Section 1: Dynamic Attributes
    html += `
      <div class="detail-section">
        <div class="detail-section-title">📌 Informasi Utama Permohonan</div>
        <div class="detail-fields-grid">
    `;

    const humanLabels = {
      nocif: 'No. CIF Nasabah',
      nm: 'Nama Lengkap Nasabah',
      golcust: 'Golongan Customer',
      jnsbh: 'Jenis Badan Hukum',
      jnsid: 'Jenis Identitas',
      noid: 'Nomor Identitas (KTP/NPWP)',
      kota: 'Kota Domisili',
      kdloc: 'Kode Lokasi Kantor',
      kdcab: 'Kode Cabang',
      kdkas: 'Kode Kas',
      notab: 'No. Rekening Tabungan',
      fnama: 'Nama Pemilik Rekening',
      snama: 'Nama Panggilan',
      kodeprd: 'Kode Produk',
      sawalva: 'Saldo Awal Rp',
      sahirva: 'Saldo Akhir Rp',
      saldobuku: 'Saldo Cetak Buku Rp',
      saldomin: 'Saldo Minimal Rp',
      nodep: 'No. Deposito',
      nobilyet: 'No. Bilyet Deposito',
      nama: 'Nama Pemilik Deposan',
      kdprd: 'Kode Produk Deposito',
      nomrp: 'Nominal Deposito Rp',
      jkwaktu: 'Jangka Waktu (Bulan)',
      tglbuka: 'Tanggal Pembukaan',
      tgltrn: 'Tanggal Transaksi',
      batch: 'Batch Teller',
      notrn: 'No. Urut Transaksi',
      dracc: 'Rekening Debit',
      cracc: 'Rekening Kredit',
      nominalrp: 'Nominal Transaksi Rp',
      ket: 'Keterangan / Description',
      nokontrak: 'No. Kontrak Pembiayaan',
      mdlawal: 'Plafon Pembiayaan Rp',
      tglakad: 'Tanggal Akad',
      kdaset: 'Kode Aset / Inventaris',
      haper: 'Harga Perolehan Aset Rp',
      noreg: 'No. Registrasi Agunan',
      dokumen: 'Dokumen Legal Jaminan',
      nompasar: 'Nilai Pasar Agunan Rp',
      nomtaksasi: 'Nilai Taksasi Bank Rp',
      urutspc: 'Urut Kondisi Khusus',
      noacc: 'No. Rekening Sasaran',
      jnsspc: 'Jenis Dispensasi',
      tgleff: 'Tanggal Efektif',
      inpuser: 'User Input (Maker)',
      inptgl: 'Waktu Input Data',
      inptgljam: 'Waktu Input Data',
      devinp: 'Perangkat Input'
    };

    const hiddenFields = ['stsrec', 'ststrn', 'autuser', 'auttgl', 'autterm', 'chguser', 'chgtgl', 'chgterm'];

    Object.keys(row).forEach(k => {
      if (hiddenFields.includes(k)) return;
      const label = humanLabels[k] || k;
      let val = row[k];

      if (val === null || val === undefined || String(val).trim() === '') {
        val = '-';
      } else if (typeof val === 'number' && (k.includes('nom') || k.includes('haper') || k.includes('mdl') || k.includes('sal') || k.includes('mutasi'))) {
        val = `<span class="detail-field-value highlight-money">${formatMoney(val)}</span>`;
      } else if (k === 'nocif' || k === 'notab' || k === 'nodep' || k === 'nokontrak' || k === 'kdaset' || k === 'noreg') {
        val = `<span class="detail-field-value highlight-id">${val}</span>`;
      } else {
        val = `<span class="detail-field-value">${val}</span>`;
      }

      html += `
        <div class="detail-field">
          <span class="detail-field-label">${label}</span>
          ${val}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  }

  // Section 2: Audit Trail Input (Maker Info)
  html += `
    <div class="detail-section">
      <div class="detail-section-title">⏱️ Catatan Audit Pemohon (Maker)</div>
      <div class="detail-fields-grid">
        <div class="detail-field">
          <span class="detail-field-label">User ID Input (Maker)</span>
          <span class="detail-field-value"><strong>${row.inpuser || '-'}</strong></span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Waktu Input (Maker)</span>
          <span class="detail-field-value">${formatMakerDate(row.inptgl || row.tglinp || row.inptgljam || '-')}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Terminal Input</span>
          <span class="detail-field-value">${row.inpterm || row.devinp || '-'}</span>
        </div>
        <div class="detail-field">
          <span class="detail-field-label">Status Otorisasi Saat Ini</span>
          <span class="detail-field-value" style="color:var(--warning); font-weight:600;">Pending Otorisasi Supervisor</span>
        </div>
      </div>
    </div>
  `;

  document.getElementById('detail-body').innerHTML = html;

  const isRejectHidden = ['cif_perorangan', 'cif_badanhukum', 'tabungan', 'deposito', 'pembiayaan'].includes(moduleKey);

  // Add Action buttons directly inside Detail Drawer Footer!
  document.getElementById('detail-footer').innerHTML = `
    <button class="btn btn-secondary" onclick="hideDetailModal()">Tutup</button>
    ${!isRejectHidden ? `<button class="btn btn-danger" onclick="hideDetailModal(); openRejectModal('${moduleKey}', '${idVal}')">❌ Tolak Permohonan</button>` : ''}
    <button class="btn btn-success" onclick="hideDetailModal(); openApproveModal('${moduleKey}', '${idVal}')">✅ Setuju / Otorisasi Permohonan</button>
  `;

  document.getElementById('detail-modal').classList.remove('hidden');
}

function hideDetailModal() {
  document.getElementById('detail-modal').classList.add('hidden');
}

function openApproveModal(moduleKey, idVal) {
  state.selectedModule = moduleKey;
  state.selectedItem = idVal;

  const mod = MODULES[moduleKey];
  document.getElementById('approve-module-name').textContent = mod.title;
  document.getElementById('approve-ref-id').textContent = idVal;
  document.getElementById('approve-note').value = '';
  document.getElementById('approve-error').classList.add('hidden');

  let row = null;
  if (moduleKey === 'transaksi') {
    row = state.currentModuleData.find(r => `${r.tgltrn}_${r.batch}_${r.notrn}` === idVal);
  } else if (moduleKey === 'kondisi_khusus') {
    row = state.currentModuleData.find(r => `${r.urutspc}_${r.noacc}` === idVal);
  } else {
    row = state.currentModuleData.find(r => String(r[mod.idKey]) === String(idVal));
  }

  const personRow = document.getElementById('approve-person-row');
  const personName = document.getElementById('approve-person-name');
  const amountRow = document.getElementById('approve-amount-row');
  const amountVal = document.getElementById('approve-amount');

  if (row) {
    const name = row.nm || row.fnama || row.nama || row.ket || null;
    if (name) {
      personName.textContent = name;
      personRow.style.display = 'flex';
    } else {
      personRow.style.display = 'none';
    }

    const money = row.nomrp || row.mdlawal || row.haper || row.nompasar || row.nominalrp || null;
    if (money !== null && money !== undefined) {
      amountVal.textContent = formatMoney(money);
      amountRow.style.display = 'flex';
    } else {
      amountRow.style.display = 'none';
    }
  } else {
    personRow.style.display = 'none';
    amountRow.style.display = 'none';
  }

  document.getElementById('approve-modal').classList.remove('hidden');
}

function hideApproveModal() {
  document.getElementById('approve-modal').classList.add('hidden');
}

async function submitApproval() {
  const mod = MODULES[state.selectedModule];
  const btn = document.getElementById('confirm-approve-btn');
  const errorEl = document.getElementById('approve-error');
  const note = document.getElementById('approve-note').value.trim();

  btn.disabled = true;
  errorEl.classList.add('hidden');

  try {
    const res = await apiFetch(`${mod.endpoint}/${state.selectedItem}/approve`, {
      method: 'POST',
      body: JSON.stringify({ catatan: note })
    });

    hideApproveModal();
    showAlert('success', res.message);
    showToast('Otorisasi Disetujui! ✅', res.message || `Permohonan ${state.selectedItem} telah berhasil disetujui (Approved).`, 'success');
    loadModuleData(state.selectedModule);
    loadDashboardData();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    showToast('Gagal Disetujui ❌', err.message || 'Terjadi kesalahan saat menyetujui otorisasi', 'danger');
  } finally {
    btn.disabled = false;
  }
}

function approveRecord(moduleKey, idVal) {
  openApproveModal(moduleKey, idVal);
}

function openRejectModal(moduleKey, idVal) {
  state.selectedModule = moduleKey;
  state.selectedItem = idVal;

  document.getElementById('reject-ref-id').textContent = idVal;
  document.getElementById('reject-reason').value = '';
  document.getElementById('reject-error').classList.add('hidden');
  document.getElementById('reject-modal').classList.remove('hidden');
}

function hideRejectModal() {
  document.getElementById('reject-modal').classList.add('hidden');
}

function setRejectReason(text) {
  document.getElementById('reject-reason').value = text;
}

async function submitRejection() {
  const reason = document.getElementById('reject-reason').value.trim();
  const errorEl = document.getElementById('reject-error');

  if (reason.length < 5) {
    errorEl.textContent = 'Alasan penolakan minimal 5 karakter';
    errorEl.classList.remove('hidden');
    showToast('Peringatan ⚠️', 'Alasan penolakan wajib diisi minimal 5 karakter.', 'warning');
    return;
  }

  const mod = MODULES[state.selectedModule];
  const btn = document.getElementById('confirm-reject-btn');
  btn.disabled = true;

  try {
    const res = await apiFetch(`${mod.endpoint}/${state.selectedItem}/reject`, {
      method: 'POST',
      body: JSON.stringify({ catatan: reason })
    });

    hideRejectModal();
    showAlert('success', res.message);
    showToast('Penolakan Berhasil ❌', res.message || `Permohonan ${state.selectedItem} telah berhasil ditolak.`, 'danger');
    loadModuleData(state.selectedModule);
    loadDashboardData();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove('hidden');
    showToast('Gagal Menolak ⚠️', err.message || 'Terjadi kesalahan saat menolak permohonan', 'danger');
  } finally {
    btn.disabled = false;
  }
}

async function loadTutupKantor() {
  document.getElementById('module-title').textContent = 'Status Tutup Kantor Cabang';
  document.getElementById('module-subtitle').textContent = 'Monitoring status penutupan harian per lokasi';

  const thead = document.getElementById('table-head');
  const tbody = document.getElementById('table-body');

  thead.innerHTML = `
    <tr>
      <th>Kode Lokasi</th>
      <th>Status Tutup</th>
      <th>User Close</th>
      <th>Waktu Close</th>
    </tr>
  `;

  try {
    const res = await apiFetch('/api/tutup-kantor/status');
    let html = '';
    (res.data || []).forEach(row => {
      html += `<tr>
        <td>${row.kdloc || '-'}</td>
        <td><span class="user-level-badge" style="background:${row.stsclose === 'Y' ? 'var(--success)' : 'var(--warning)'}">${row.stsclose === 'Y' ? 'SUDAH TUTUP' : 'BELUM TUTUP'}</span></td>
        <td>${row.clsuser || '-'}</td>
        <td>${row.clstgl || '-'}</td>
      </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="4">Tidak ada data status tutup kantor.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" style="color:var(--danger);">Error: ${err.message}</td></tr>`;
  }
}

async function loadAuditUserOptions() {
  const select = document.getElementById('audit-filter-user');
  if (!select) return;

  try {
    const res = await apiFetch('/api/audit/users');
    if (res.status === 'success' && res.data) {
      let html = '<option value="">Semua User</option>';
      res.data.forEach(u => {
        html += `<option value="${u}">${u}</option>`;
      });
      select.innerHTML = html;
    }
  } catch (err) {
    console.error('Could not load audit users list:', err);
  }
}

async function loadAuditLogs() {
  const tbody = document.getElementById('audit-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:24px;">Memuat log audit...</td></tr>';

  const user = document.getElementById('audit-filter-user') ? document.getElementById('audit-filter-user').value : '';
  const modul = document.getElementById('audit-filter-modul') ? document.getElementById('audit-filter-modul').value : '';
  const aksi = document.getElementById('audit-filter-aksi') ? document.getElementById('audit-filter-aksi').value : '';
  const network = document.getElementById('audit-filter-network') ? document.getElementById('audit-filter-network').value : '';
  const search = document.getElementById('audit-filter-search') ? document.getElementById('audit-filter-search').value : '';

  const params = new URLSearchParams();
  if (user) params.append('userid', user);
  if (modul) params.append('modul', modul);
  if (aksi) params.append('aksi', aksi);
  if (network) params.append('akses_type', network);
  if (search) params.append('search', search);

  try {
    const res = await apiFetch(`/api/audit/logs?${params.toString()}`);
    let html = '';
    (res.data || []).forEach(r => {
      const isExt = r.akses_type === 'WEB-EXT' || r.akses_type === 'EXTERNAL';
      const aksiColor = r.aksi === 'APPROVE' ? 'var(--success)' : (r.aksi === 'REJECT' ? 'var(--danger)' : (r.aksi === 'LOGIN_FAIL' ? '#ef4444' : 'var(--accent)'));

      html += `<tr>
        <td>${formatMakerDate(r.tgl_aksi)}</td>
        <td><strong>${r.userid || '-'}</strong></td>
        <td><span class="user-level-badge" style="background:rgba(59,130,246,0.15); color:var(--accent);">${r.modul || '-'}</span></td>
        <td><span class="user-level-badge" style="background:${aksiColor}; color:#fff;">${r.aksi}</span></td>
        <td><span class="highlight-id">${r.ref_id || '-'}</span></td>
        <td>${r.ip_client || '-'} <span class="user-level-badge" style="background:${isExt ? 'rgba(245,158,11,0.2)' : 'rgba(16,185,129,0.2)'}; color:${isExt ? '#f59e0b' : 'var(--success)'}">${r.akses_type || 'WEB-LAN'}</span></td>
        <td>${r.catatan || '-'}</td>
      </tr>`;
    });
    tbody.innerHTML = html || '<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--text-muted);">Belum ada riwayat audit log sesuai filter.</td></tr>';
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:24px; color:var(--danger);">Error: ${err.message}</td></tr>`;
  }
}

function handleExportAuditCsv() {
  const user = document.getElementById('audit-filter-user') ? document.getElementById('audit-filter-user').value : '';
  const modul = document.getElementById('audit-filter-modul') ? document.getElementById('audit-filter-modul').value : '';
  const aksi = document.getElementById('audit-filter-aksi') ? document.getElementById('audit-filter-aksi').value : '';
  const network = document.getElementById('audit-filter-network') ? document.getElementById('audit-filter-network').value : '';
  const search = document.getElementById('audit-filter-search') ? document.getElementById('audit-filter-search').value : '';

  const params = new URLSearchParams();
  if (user) params.append('userid', user);
  if (modul) params.append('modul', modul);
  if (aksi) params.append('aksi', aksi);
  if (network) params.append('akses_type', network);
  if (search) params.append('search', search);

  window.open(`/api/audit/export?${params.toString()}`, '_blank');
}

function showAlert(type, message) {
  const el = document.getElementById('module-alert');
  if (el) {
    el.className = `alert alert-${type}`;
    el.textContent = message;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 5000);
  }
}
