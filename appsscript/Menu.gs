/**
 * ============================================================================
 *  ARMS — Control Tower :: MENU SPREADSHEET & UTILITAS DEPLOY (Apps Script)
 * ============================================================================
 *  Berisi fungsi-fungsi yang dijalankan manual dari editor Apps Script atau
 *  dari menu spreadsheet (bila script terikat pada spreadsheet):
 *
 *    armsSetupDatabase()            -> buat semua tab database di spreadsheet aktif
 *    armsBindActiveSpreadsheet()    -> jadikan spreadsheet ini database aktif (Script Property)
 *    armsCreateDatabaseSpreadsheet()-> buat spreadsheet database baru + ikat sebagai aktif
 *    armsSelfTest()                 -> uji seluruh endpoint internal (health, sheets, drive, surat)
 *    armsSetGithubToken()           -> simpan GITHUB_TOKEN di Script Properties
 *    armsSetWebAppUrl()             -> simpan URL Web App (dipakai proxy & link "Buka")
 *    armsShowDeployInfo()           -> tampilkan info deploy + petunjuk
 * ============================================================================
 */

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('🏢 ARMS Control Tower')
      .addItem('Siapkan Spreadsheet Database (semua tab)', 'armsSetupDatabase')
      .addItem('Jadikan Spreadsheet Ini Database Aktif', 'armsBindActiveSpreadsheet')
      .addItem('Buat Spreadsheet Database Baru', 'armsCreateDatabaseSpreadsheet')
      .addSeparator()
      .addItem('Status & Self-Test Koneksi', 'armsSelfTest')
      .addItem('Info Deploy Web App', 'armsShowDeployInfo')
      .addSeparator()
      .addItem('Set GITHUB_TOKEN (Surat Tugas)', 'armsSetGithubToken')
      .addItem('Simpan URL Web App', 'armsSetWebAppUrl')
      .addToUi();
  } catch (e) {
    // Script standalone (tidak terikat spreadsheet) tidak punya UI menu.
  }
}

/** Buat/verifikasi seluruh tab database pada spreadsheet aktif. */
function armsSetupDatabase() {
  var target = resolveSpreadsheet_('');
  var result = sheetsSetupHandler_({ spreadsheetId: target.id });
  var msg = 'Spreadsheet aktif: ' + target.name + '\n' +
            'ID: ' + target.id + '\n' +
            'URL: ' + target.url + '\n\n' +
            'Tab disiapkan: ' + (result.sheets ? result.sheets.length : 0) + '\n' +
            'Tab baru dibuat: ' + (result.created && result.created.length ? result.created.join(', ') : '(tidak ada, semua sudah tersedia)');
  notify_(msg, 'Database ARMS siap');
  Logger.log(msg);
  return result;
}

/** Ikat spreadsheet yang sedang dibuka sebagai database aktif ARMS. */
function armsBindActiveSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    notify_('Fungsi ini dijalankan dari editor Apps Script yang terikat pada spreadsheet.\n' +
            'Untuk script standalone, jalankan armsCreateDatabaseSpreadsheet() atau isi Script Property ARMS_SPREADSHEET_ID manual.',
            'Tidak ada spreadsheet aktif');
    return null;
  }
  scriptProps_().setProperty('ARMS_SPREADSHEET_ID', ss.getId());
  var msg = 'Spreadsheet "' + ss.getName() + '" sekarang menjadi database aktif ARMS.\nID: ' + ss.getId();
  notify_(msg, 'Database aktif diperbarui');
  Logger.log(msg);
  return { success: true, spreadsheetId: ss.getId(), name: ss.getName() };
}

/** Buat spreadsheet database baru, ikat sebagai aktif, lalu buka. */
function armsCreateDatabaseSpreadsheet() {
  var name = 'ARMS_Control_Tower_Database_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMM');
  var ss = SpreadsheetApp.create(name);
  scriptProps_().setProperty('ARMS_SPREADSHEET_ID', ss.getId());
  scriptProps_().setProperty('ARMS_SPREADSHEET_NAME', ss.getName());
  sheetsSetupHandler_({ spreadsheetId: ss.getId() });
  var url = ss.getUrl();
  notify_('Spreadsheet baru dibuat & dijadikan database aktif:\n' + name + '\n' + url, 'Spreadsheet ARMS dibuat');
  try { SpreadsheetApp.openByUrl(url); } catch (e) {}
  Logger.log(url);
  return { success: true, spreadsheetId: ss.getId(), name: name, url: url };
}

/** Self-test seluruh handler internal (tanpa HTTP) + status Drive. */
function armsSelfTest() {
  var lines = [];
  var push = function (label, fn) {
    try {
      var res = fn();
      var ok = res && (res.success === true || res.status === 'ok' || res.configured === true);
      lines.push((ok ? '✅ ' : '⚠️ ') + label + ' → ' + (ok ? 'OK' : (res && res.error ? res.error : 'periksa hasil')));
      return res;
    } catch (e) {
      lines.push('❌ ' + label + ' → ' + errorMessage_(e));
      return null;
    }
  };

  push('HEALTH', function () { return healthHandler_({}); });
  var runtime = push('RUNTIME_INFO', function () { return runtimeInfoHandler_({}); });
  push('SHEETS_SETUP', function () { return sheetsSetupHandler_({ spreadsheetId: runtime ? runtime.spreadsheetId : '' }); });
  push('SHEETS_FETCH', function () { return sheetsFetchHandler_({ spreadsheetId: runtime ? runtime.spreadsheetId : '' }); });
  push('DRIVE_STATUS', function () { return driveStatusHandler_({}); });
  push('SURAT_OPEN_GENERATOR', function () {
    return suratOpenGeneratorHandler_({ debtor: { debtorName: 'TEST' }, personnel: { fullName: 'TEST' } });
  });
  lines.push((githubToken_() ? '✅ ' : '⚠️ ') + 'GITHUB_TOKEN → ' + (githubToken_() ? 'tersedia' : 'belum diset (fitur create-issue nonaktif)'));

  var report = 'ARMS Control Tower — Self Test Apps Script\n' +
    'Versi API: ' + ARMS_API_VERSION + '\n' +
    'Waktu: ' + new Date().toLocaleString() + '\n\n' + lines.join('\n');
  notify_(report, 'Hasil Self-Test ARMS');
  Logger.log(report);
  return report;
}

/** Simpan GITHUB_TOKEN ke Script Properties (dipakai /api/surat/create-issue). */
function armsSetGithubToken() {
  var ui = safeUi_();
  if (!ui) {
    Logger.log('Jalankan manual: scriptProps_().setProperty("GITHUB_TOKEN", "<token>")');
    return null;
  }
  var response = ui.prompt('GITHUB_TOKEN', 'Masukkan Personal Access Token GitHub (repo scope) untuk fitur sinkronisasi Surat Tugas:', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  var token = String(response.getResponseText() || '').trim();
  if (!token) return null;
  scriptProps_().setProperty('GITHUB_TOKEN', token);
  ui.alert('GITHUB_TOKEN tersimpan di Script Properties.');
  return { success: true };
}

/** Simpan URL Web App hasil Deploy (dipakai proxy & tombol "Buka"). */
function armsSetWebAppUrl() {
  var ui = safeUi_();
  if (!ui) {
    Logger.log('Jalankan manual: scriptProps_().setProperty("ARMS_WEB_APP_URL", "<url /exec>")');
    return null;
  }
  var response = ui.prompt('URL Web App ARMS', 'Tempel URL deployment Web App (berakhiran /exec):', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return null;
  var url = String(response.getResponseText() || '').trim();
  if (!url) return null;
  scriptProps_().setProperty('ARMS_WEB_APP_URL', url);
  ui.alert('URL Web App tersimpan:\n' + url);
  return { success: true, url: url };
}

/** Info deploy: spreadsheet aktif, akun, URL web app, petunjuk singkat. */
function armsShowDeployInfo() {
  var target = resolveSpreadsheet_('');
  var props = scriptProps_();
  var info = [
    'ARMS — Control Tower (Google Apps Script)',
    'Versi API: ' + ARMS_API_VERSION,
    '',
    'Spreadsheet aktif : ' + target.name,
    'ID                : ' + target.id,
    'Sumber resolusi   : ' + target.source,
    'URL               : ' + target.url,
    'Akun deploy       : ' + driveUserEmail_(),
    'Script ID         : ' + safeScriptId_(),
    'ARMS_WEB_APP_URL  : ' + (props.getProperty('ARMS_WEB_APP_URL') || '(belum diset — jalankan armsSetWebAppUrl)'),
    'GITHUB_TOKEN      : ' + (githubToken_() ? 'tersedia' : 'belum diset'),
    '',
    'Langkah deploy:',
    '1) Deploy → New deployment → Type: Web app',
    '2) Execute as: Me  |  Who has access: Anyone',
    '3) Salin URL /exec, jalankan armsSetWebAppUrl() atau isi di Pengaturan aplikasi',
    '4) Di aplikasi: Settings → Pengaturan Sistem & Google Sheets → Simpan'
  ].join('\n');
  notify_(info, 'Info Deploy ARMS');
  Logger.log(info);
  return info;
}

/* ---------------------------------------------------------------- helpers */

function safeUi_() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    return null;
  }
}

function notify_(message, title) {
  var ui = safeUi_();
  if (ui) {
    try {
      ui.alert(title || 'ARMS Control Tower', String(message), ui.ButtonSet.OK);
      return;
    } catch (e) { /* fallback ke Logger */ }
  }
  Logger.log((title ? title + '\n' : '') + message);
}
