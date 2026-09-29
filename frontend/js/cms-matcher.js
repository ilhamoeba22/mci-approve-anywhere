/**
 * Module: Cek Transaksi CMS (Smart Matching Transfer Bank)
 * Author: Antigravity AI
 * Core Banking ApproveAnywhere Integration
 */

(function () {
  'use strict';

  let paramRows = null;
  let hasilRows = null;
  let matchResult = [];
  let paramFileName = '';
  let hasilFileName = '';
  let activeFilter = 'all';
  let historyBatches = [];

  function normRek(v) {
    let s = String(v || '').split('.')[0].replace(/[^\d]/g, '').trim();
    return s.replace(/^0+/, '');
  }

  function normAmt(v) {
    if (v === null || v === undefined) return 0;
    let s = String(v).replace(/,/g, '').trim();
    return Math.round(parseFloat(s) || 0);
  }

  function escHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fmtNum(n) {
    return Number(n || 0).toLocaleString('id-ID');
  }

  function formatDateHuman(val) {
    if (!val) return '-';
    const s = String(val);
    if (s.length === 14) {
      const y = s.substring(0, 4);
      const m = s.substring(4, 6);
      const d = s.substring(6, 8);
      const h = s.substring(8, 10);
      const min = s.substring(10, 12);
      return `${d}/${m}/${y} ${h}:${min}`;
    }
    return val;
  }

  // File A (Parameter) Handler
  function onFileParam(input) {
    const file = input.files[0];
    if (!file) return;
    paramFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        const sn = wb.SheetNames.find((n) => n.toUpperCase() === 'PRINT');
        if (!sn) throw new Error('Sheet "PRINT" tidak ditemukan dalam file Excel!');

        const raw = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: '' });
        let hIdx = raw.findIndex((r) => r.some((c) => String(c).toUpperCase().includes('NASABAH')));
        if (hIdx === -1) hIdx = 3;

        const head = raw[hIdx].map((h) => String(h).trim().toUpperCase());
        const iREK = raw[hIdx].findIndex(
          (h) => String(h).toUpperCase().includes('REK') && !String(h).toUpperCase().includes('IBA')
        );
        const iIBA = head.indexOf('NO REK IBA');
        const iNAS = head.findIndex((h) => h.includes('NASABAH'));
        const iTRF = head.indexOf('TRANSFER');
        const iCOD = head.indexOf('CODE');
        const iBNK = head.findIndex((h) => h.includes('TUJUAN TRANSFER') || h.includes('BANK TUJUAN'));
        const iNAM = head.findIndex((h) => h.includes('ATAS NAMA') || h.includes('NAMA TUJUAN'));
        const iNO = head.indexOf('NO');

        const rows = [];
        for (let i = hIdx + 1; i < raw.length; i++) {
          const r = raw[i];
          if (!r[iNAS] || String(r[iCOD]).trim() !== '2') continue;
          rows.push({
            no: r[iNO] || rows.length + 1,
            nasabah: String(r[iNAS]).trim(),
            rekIba: String(r[iIBA] || '').trim(),
            bank: String(r[iBNK] || '').trim(),
            namaTujuan: String(r[iNAM] || '').trim(),
            rek: normRek(r[iREK]),
            amt: normAmt(r[iTRF])
          });
        }

        paramRows = rows;
        const dz = document.getElementById('cms-dz-param');
        if (dz) dz.className = 'cms-dropzone loaded';
        document.getElementById('cms-info-param').style.display = 'block';
        document.getElementById('cms-fn-param').textContent = file.name;
        document.getElementById('cms-st-param').innerHTML = `Terdeteksi <b>${rows.length}</b> baris data (CODE 2)`;
        document.getElementById('cms-err-param').style.display = 'none';

        checkReady();
      } catch (err) {
        const dz = document.getElementById('cms-dz-param');
        if (dz) dz.className = 'cms-dropzone has-error';
        const eb = document.getElementById('cms-err-param');
        eb.textContent = err.message || err;
        eb.style.display = 'block';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // File B (Hasil Transfer) Handler
  function onFileHasil(input) {
    const file = input.files[0];
    if (!file) return;
    hasilFileName = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        let wb;

        if (file.name.toLowerCase().endsWith('.csv')) {
          const decoder = new TextDecoder('utf-8');
          let csvText = decoder.decode(data).replace(/^\uFEFF/, '');
          const lines = csvText.split(/\r?\n/).map((line) => {
            let l = line.trim();
            if (l.startsWith('"') && l.endsWith('"')) {
              l = l.substring(1, l.length - 1).replace(/""/g, '"');
            }
            return l;
          });
          wb = XLSX.read(lines.join('\n'), { type: 'string' });
        } else {
          wb = XLSX.read(new Uint8Array(data), { type: 'array' });
        }

        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

        let hIdx = raw.findIndex((r) =>
          r.some((c) => ['DESTINATION', 'AMOUNT'].includes(String(c).toUpperCase().trim()))
        );
        if (hIdx === -1) hIdx = 0;

        const head = raw[hIdx].map((h) => String(h).trim().toUpperCase());
        const iDST = head.indexOf('DESTINATION');
        const iAMT = head.indexOf('AMOUNT');

        if (iDST === -1 || iAMT === -1) {
          throw new Error('Kolom "DESTINATION" atau "AMOUNT" tidak ditemukan pada file hasil!');
        }

        const rows = [];
        for (let i = hIdx + 1; i < raw.length; i++) {
          if (!raw[i][iDST]) continue;
          rows.push({ rek: normRek(raw[i][iDST]), amt: normAmt(raw[i][iAMT]) });
        }

        hasilRows = rows;
        const dz = document.getElementById('cms-dz-hasil');
        if (dz) dz.className = 'cms-dropzone loaded';
        document.getElementById('cms-info-hasil').style.display = 'block';
        document.getElementById('cms-fn-hasil').textContent = file.name;
        document.getElementById('cms-st-hasil').innerHTML = `Terdeteksi <b>${rows.length}</b> baris data transfer`;
        document.getElementById('cms-err-hasil').style.display = 'none';

        checkReady();
      } catch (err) {
        const dz = document.getElementById('cms-dz-hasil');
        if (dz) dz.className = 'cms-dropzone has-error';
        const eb = document.getElementById('cms-err-hasil');
        eb.textContent = err.message || err;
        eb.style.display = 'block';
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function checkReady() {
    const btn = document.getElementById('cms-btn-match');
    if (btn) btn.disabled = !(paramRows && hasilRows && paramRows.length > 0);
  }

  // Run Smart Matching
  function runMatch() {
    if (!paramRows || !hasilRows) return;

    const lookup = {};
    hasilRows.forEach((h) => {
      if (!lookup[h.rek]) lookup[h.rek] = [];
      lookup[h.rek].push(h.amt);
    });

    matchResult = paramRows.map((p) => {
      const hasRek = lookup[p.rek];
      if (!hasRek) return { ...p, status: 'ERR', ket: 'Rekening Tidak Ditemukan' };
      if (hasRek.includes(p.amt)) return { ...p, status: 'OK', ket: 'Cocok Persis' };
      return {
        ...p,
        status: 'ERR',
        ket: 'Nominal Beda',
        found: [...new Set(hasRek)].map((a) => a.toLocaleString('id-ID')).join(', ')
      };
    });

    const total = matchResult.length;
    const ok = matchResult.filter((r) => r.status === 'OK').length;
    const err = total - ok;
    const pct = total > 0 ? Math.round((ok / total) * 100) : 0;

    document.getElementById('cms-s-total').textContent = total;
    document.getElementById('cms-s-ok').textContent = ok;
    document.getElementById('cms-s-err').textContent = err;
    document.getElementById('cms-s-pct').textContent = `${pct}%`;

    document.getElementById('cms-results-area').style.display = 'block';
    document.getElementById('cms-btn-reset').style.display = 'inline-flex';
    document.getElementById('cms-btn-export-temp').style.display = 'inline-flex';

    const saveBtn = document.getElementById('cms-btn-save');
    if (saveBtn) {
      saveBtn.style.display = ok > 0 ? 'inline-flex' : 'none';
      saveBtn.innerHTML = `💾 Simpan ${ok} Transaksi Cocok ke Database`;
    }

    renderTable();
    if (window.showToast) {
      window.showToast('Pencocokan Selesai', `${ok} transaksi sesuai dari total ${total} data`, 'info');
    }
  }

  function renderTable() {
    const q = (document.getElementById('cms-search-input').value || '').toLowerCase();
    const filtered = matchResult.filter((r) => {
      if (activeFilter === 'ok' && r.status !== 'OK') return false;
      if (activeFilter === 'err' && r.status !== 'ERR') return false;
      return (
        r.nasabah.toLowerCase().includes(q) ||
        r.rek.includes(q) ||
        r.bank.toLowerCase().includes(q) ||
        r.namaTujuan.toLowerCase().includes(q)
      );
    });

    const tbody = document.getElementById('cms-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding:24px; color:var(--text-muted);">Tidak ada data yang sesuai dengan filter.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (r, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td><b>${escHtml(r.nasabah)}</b></td>
        <td><code>${escHtml(r.rekIba)}</code></td>
        <td>${escHtml(r.bank)}</td>
        <td>${escHtml(r.namaTujuan)}</td>
        <td><code>${escHtml(r.rek)}</code></td>
        <td style="font-weight:700;">Rp ${fmtNum(r.amt)}</td>
        <td>
          <span class="cms-badge ${r.status === 'OK' ? 'badge-ok' : 'badge-err'}">
            ${r.status === 'OK' ? '✅ SESUAI' : '❌ TIDAK SESUAI'}
          </span>
        </td>
        <td>
          ${
            r.status === 'OK'
              ? 'Cocok Persis'
              : r.found
              ? `Beda Nominal (Hasil: <span class="cms-found-amt">${r.found}</span>)`
              : 'Rekening Tidak Ditemukan'
          }
        </td>
      </tr>
    `
      )
      .join('');
  }

  function setFilter(f) {
    activeFilter = f;
    document.querySelectorAll('.cms-fbtn').forEach((b) => {
      b.classList.toggle('active', b.dataset.f === f);
    });
    renderTable();
  }

  function resetMatch() {
    paramRows = null;
    hasilRows = null;
    matchResult = [];
    paramFileName = '';
    hasilFileName = '';
    activeFilter = 'all';

    const fParam = document.getElementById('cms-file-param');
    if (fParam) fParam.value = '';
    const fHasil = document.getElementById('cms-file-hasil');
    if (fHasil) fHasil.value = '';

    const dzP = document.getElementById('cms-dz-param');
    if (dzP) dzP.className = 'cms-dropzone';
    const dzH = document.getElementById('cms-dz-hasil');
    if (dzH) dzH.className = 'cms-dropzone';

    document.getElementById('cms-info-param').style.display = 'none';
    document.getElementById('cms-info-hasil').style.display = 'none';
    document.getElementById('cms-err-param').style.display = 'none';
    document.getElementById('cms-err-hasil').style.display = 'none';

    document.getElementById('cms-results-area').style.display = 'none';
    document.getElementById('cms-btn-reset').style.display = 'none';
    document.getElementById('cms-btn-export-temp').style.display = 'none';
    document.getElementById('cms-btn-save').style.display = 'none';
    document.getElementById('cms-btn-match').disabled = true;
  }

  // Open Save Confirmation Modal
  function openSaveModal() {
    const matchedOnly = matchResult.filter((r) => r.status === 'OK');
    if (matchedOnly.length === 0) {
      alert('Tidak ada transaksi dengan status cocok untuk disimpan.');
      return;
    }

    const modal = document.getElementById('cms-save-modal');
    document.getElementById('cms-save-count-badge').textContent = `${matchedOnly.length} Transaksi`;
    document.getElementById('cms-save-param-file').textContent = paramFileName || '-';
    document.getElementById('cms-save-hasil-file').textContent = hasilFileName || '-';
    document.getElementById('cms-save-note').value = '';

    if (modal) modal.classList.remove('hidden');
  }

  function closeSaveModal() {
    const modal = document.getElementById('cms-save-modal');
    if (modal) modal.classList.add('hidden');
  }

  // Confirm and POST to Database
  async function confirmSaveBatch() {
    const matchedOnly = matchResult.filter((r) => r.status === 'OK');
    if (matchedOnly.length === 0) return;

    const note = document.getElementById('cms-save-note').value;
    const btn = document.getElementById('cms-btn-confirm-save');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = 'Menyimpan ke Database...';

    try {
      const payload = {
        nama_file_param: paramFileName,
        nama_file_hasil: hasilFileName,
        total_parameter: matchResult.length,
        total_cocok: matchedOnly.length,
        total_tidak_cocok: matchResult.length - matchedOnly.length,
        persentase_cocok: matchResult.length > 0 ? (matchedOnly.length / matchResult.length) * 100 : 100,
        catatan: note,
        matched_items: matchedOnly
      };

      const res = await window.apiFetch('/api/cms/save-batch', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      closeSaveModal();
      if (window.showToast) {
        window.showToast(
          'Arsip Berhasil',
          `Batch No: ${res.data.batch_no} (${res.data.total_cocok} transaksi cocok tersimpan)`,
          'success'
        );
      } else {
        alert(`Berhasil disimpan! Batch No: ${res.data.batch_no}`);
      }

      // Switch to History Tab to view the newly saved batch
      switchCmsTab('history');
      loadHistory();
    } catch (err) {
      alert(`Gagal menyimpan ke database: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  // Temporary Excel Export from Match View
  function exportTempExcel() {
    if (matchResult.length === 0) return;

    const now = new Date();
    const localDate = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const fileDate = now.toISOString().split('T')[0].replace(/-/g, '');

    const data = [
      ['LAPORAN HASIL PENCOCOKAN TRANSFER BANK (CMS OPERASIONAL)'],
      ['Tanggal Verifikasi: ' + localDate],
      ['File Parameter: ' + paramFileName, 'File Hasil: ' + hasilFileName],
      []
    ];

    data.push([
      'No',
      'Nasabah',
      'Rekening Sumber (IBA)',
      'Bank Tujuan',
      'Nama Tujuan',
      'No Rekening Tujuan',
      'Nominal Parameter',
      'Status',
      'Keterangan'
    ]);

    matchResult.forEach((r, i) => {
      data.push([
        i + 1,
        r.nasabah,
        r.rekIba,
        r.bank,
        r.namaTujuan,
        r.rek,
        r.amt,
        r.status === 'OK' ? 'SESUAI' : 'TIDAK SESUAI',
        r.status === 'OK'
          ? 'Cocok Persis'
          : r.found
          ? 'Beda Nominal (Hasil: ' + r.found + ')'
          : 'Rekening Tidak Ditemukan'
      ]);
    });

    data.push([], []);
    data.push(['', 'Dibuat Oleh', '', '', 'Diperiksa Oleh', '', '', 'Mengetahui', '']);
    data.push([], [], []);
    data.push(['', '( .................... )', '', '', '( .................... )', '', '', '( .................... )', '']);

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 20 },
      { wch: 16 },
      { wch: 28 },
      { wch: 20 },
      { wch: 18 },
      { wch: 16 },
      { wch: 35 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Pencocokan');
    XLSX.writeFile(wb, `Hasil_Pencocokan_CMS_${fileDate}.xlsx`);
  }

  // Tab 2: History Load
  async function loadHistory() {
    const tbody = document.getElementById('cms-history-tbody');
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--text-muted);">Memuat riwayat arsip batch dari database...</td></tr>`;

    try {
      const res = await window.apiFetch('/api/cms/batches');
      historyBatches = res.data || [];
      renderHistoryTable();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:24px; color:var(--danger);">Error memuat riwayat: ${err.message}</td></tr>`;
    }
  }

  function renderHistoryTable() {
    const tbody = document.getElementById('cms-history-tbody');
    if (!tbody) return;

    const q = (document.getElementById('cms-history-search').value || '').toLowerCase();
    const filtered = historyBatches.filter(
      (b) =>
        b.batch_no.toLowerCase().includes(q) ||
        (b.userid || '').toLowerCase().includes(q) ||
        (b.catatan || '').toLowerCase().includes(q) ||
        (b.nama_file_param || '').toLowerCase().includes(q)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:28px; color:var(--text-muted);">Belum ada riwayat verifikasi transaksi cocok yang tersimpan.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered
      .map(
        (b, i) => `
      <tr>
        <td style="text-align:center;">${i + 1}</td>
        <td><b><code>${escHtml(b.batch_no)}</code></b></td>
        <td>${formatDateHuman(b.tgl_cek)}</td>
        <td><span class="badge" style="background:rgba(2,132,199,0.15); color:var(--primary); font-weight:700;">${escHtml(
          b.userid
        )}</span></td>
        <td>
          <div style="font-size:12px; font-weight:600;">${escHtml(b.nama_file_param || '-')}</div>
          <div style="font-size:11px; color:var(--text-muted);">${escHtml(b.nama_file_hasil || '-')}</div>
        </td>
        <td style="text-align:center;">
          <span class="badge badge-success" style="font-size:12px;">✅ ${b.total_cocok} Cocok</span>
          <div style="font-size:11px; color:var(--text-muted); margin-top:2px;">dari ${b.total_parameter} data (${Number(
          b.persentase_cocok || 0
        ).toFixed(0)}%)</div>
        </td>
        <td><span style="font-size:12px; color:var(--text-muted);">${escHtml(b.catatan || '-')}</span></td>
        <td style="text-align:center;">
          <div style="display:inline-flex; gap:6px;">
            <button class="btn btn-outline btn-sm" onclick="window.viewCmsBatchDetail(${b.id})" title="Lihat Rincian Transaksi">
              👁️ Rincian
            </button>
            <button class="btn btn-success btn-sm" onclick="window.exportCmsBatchExcel(${b.id})" title="Unduh Excel Resmi">
              ⬇ Excel
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join('');
  }

  // View Batch Detail Modal
  async function viewBatchDetail(batchId) {
    const modal = document.getElementById('cms-detail-modal');
    const content = document.getElementById('cms-detail-modal-body');
    if (!modal || !content) return;

    modal.classList.remove('hidden');
    content.innerHTML = `<div style="text-align:center; padding:32px; color:var(--text-muted);">Memuat rincian transaksi cocok dari database...</div>`;

    try {
      const res = await window.apiFetch(`/api/cms/batches/${batchId}`);
      const batch = res.data.batch;
      const items = res.data.items || [];

      let html = `
        <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius); padding:16px 20px; margin-bottom:18px;">
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; font-size:13px;">
            <div><span style="color:var(--text-muted);">No. Batch:</span> <b><code>${escHtml(batch.batch_no)}</code></b></div>
            <div><span style="color:var(--text-muted);">Waktu Verifikasi:</span> <b>${formatDateHuman(batch.tgl_cek)}</b></div>
            <div><span style="color:var(--text-muted);">Petugas/Checker:</span> <b>${escHtml(batch.userid)}</b></div>
            <div><span style="color:var(--text-muted);">Total Cocok:</span> <b style="color:var(--success);">${batch.total_cocok} Transaksi</b></div>
            <div><span style="color:var(--text-muted);">File Parameter:</span> <span>${escHtml(batch.nama_file_param || '-')}</span></div>
            <div><span style="color:var(--text-muted);">File Hasil:</span> <span>${escHtml(batch.nama_file_hasil || '-')}</span></div>
          </div>
          ${batch.catatan ? `<div style="margin-top:10px; font-size:13px;"><span style="color:var(--text-muted);">Catatan:</span> <i>"${escHtml(batch.catatan)}"</i></div>` : ''}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <h4 style="margin:0; font-size:14px; font-weight:700;">Daftar Transaksi Cocok (${items.length} Data)</h4>
          <button class="btn btn-success btn-sm" onclick="window.exportCmsBatchExcel(${batch.id})">⬇ Unduh Excel Laporan Resmi</button>
        </div>

        <div class="table-container" style="max-height:380px; overflow-y:auto;">
          <table class="data-table" style="font-size:12px;">
            <thead>
              <tr>
                <th style="width:40px; text-align:center;">No</th>
                <th>Nasabah</th>
                <th>Rek Sumber</th>
                <th>Bank Tujuan</th>
                <th>Nama Tujuan</th>
                <th>Rekening Tujuan</th>
                <th>Nominal</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (item, idx) => `
                <tr>
                  <td style="text-align:center;">${idx + 1}</td>
                  <td><b>${escHtml(item.nasabah)}</b></td>
                  <td><code>${escHtml(item.rek_iba || '-')}</code></td>
                  <td>${escHtml(item.bank_tujuan || '-')}</td>
                  <td>${escHtml(item.nama_tujuan || '-')}</td>
                  <td><code>${escHtml(item.rek_tujuan)}</code></td>
                  <td style="font-weight:700;">Rp ${fmtNum(item.nominal)}</td>
                  <td><span class="cms-badge badge-ok">✅ COCOK PERSIS</span></td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>
      `;
      content.innerHTML = html;
    } catch (err) {
      content.innerHTML = `<div style="text-align:center; padding:24px; color:var(--danger);">Gagal memuat rincian: ${err.message}</div>`;
    }
  }

  function closeDetailModal() {
    const modal = document.getElementById('cms-detail-modal');
    if (modal) modal.classList.add('hidden');
  }

  // Export Batch to Excel from Database
  async function exportBatchExcel(batchId) {
    try {
      const res = await window.apiFetch(`/api/cms/batches/${batchId}`);
      const batch = res.data.batch;
      const items = res.data.items || [];

      const data = [
        ['LAPORAN RESMI TRANSAKSI COCOK TRANSFER BANK (CMS OPERASIONAL)'],
        ['BPRS HIK MCI YOGYAKARTA'],
        [],
        ['No. Batch', batch.batch_no, '', 'Petugas Pemeriksa', batch.userid],
        ['Waktu Verifikasi', formatDateHuman(batch.tgl_cek), '', 'Total Transaksi Cocok', items.length],
        ['File Parameter', batch.nama_file_param || '-', '', 'File Hasil Transfer', batch.nama_file_hasil || '-'],
        ['Catatan Batch', batch.catatan || '-', '', '', ''],
        []
      ];

      data.push([
        'No',
        'Nama Nasabah',
        'Rekening Sumber (IBA)',
        'Bank Tujuan',
        'Nama Penerima',
        'No Rekening Tujuan',
        'Nominal Transfer',
        'Status Validasi',
        'Keterangan'
      ]);

      items.forEach((item, i) => {
        data.push([
          i + 1,
          item.nasabah,
          item.rek_iba || '',
          item.bank_tujuan || '',
          item.nama_tujuan || '',
          item.rek_tujuan,
          Number(item.nominal),
          'SESUAI (VALID)',
          item.keterangan || 'Cocok Persis'
        ]);
      });

      data.push([], []);
      data.push(['', 'Dibuat Oleh,', '', '', 'Diperiksa Oleh,', '', '', 'Mengetahui,', '']);
      data.push([], [], []);
      data.push(['', '( ' + (batch.userid || '....................') + ' )', '', '', '( .................... )', '', '', '( .................... )', '']);

      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [
        { wch: 6 },
        { wch: 28 },
        { wch: 20 },
        { wch: 16 },
        { wch: 28 },
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 25 }
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Transaksi Cocok');
      XLSX.writeFile(wb, `Laporan_Resmi_CMS_${batch.batch_no}.xlsx`);
    } catch (err) {
      alert(`Gagal mengekspor Excel: ${err.message}`);
    }
  }

  // Switch between Tab 1 (Match) and Tab 2 (History)
  function switchCmsTab(tab) {
    const tabMatchBtn = document.getElementById('cms-tab-match-btn');
    const tabHistBtn = document.getElementById('cms-tab-history-btn');
    const secMatch = document.getElementById('cms-section-match');
    const secHist = document.getElementById('cms-section-history');

    if (tab === 'history') {
      if (tabMatchBtn) tabMatchBtn.classList.remove('active');
      if (tabHistBtn) tabHistBtn.classList.add('active');
      if (secMatch) secMatch.style.display = 'none';
      if (secHist) secHist.style.display = 'block';
      loadHistory();
    } else {
      if (tabMatchBtn) tabMatchBtn.classList.add('active');
      if (tabHistBtn) tabHistBtn.classList.remove('active');
      if (secMatch) secMatch.style.display = 'block';
      if (secHist) secHist.style.display = 'none';
    }
  }

  // Expose module functions globally for HTML event handlers
  window.cmsMatcher = {
    onFileParam,
    onFileHasil,
    runMatch,
    setFilter,
    resetMatch,
    openSaveModal,
    closeSaveModal,
    confirmSaveBatch,
    exportTempExcel,
    switchCmsTab,
    loadHistory
  };

  window.viewCmsBatchDetail = viewBatchDetail;
  window.closeCmsDetailModal = closeDetailModal;
  window.exportCmsBatchExcel = exportBatchExcel;
})();
