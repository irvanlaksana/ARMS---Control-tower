/**
 * ============================================================================
 *  ARMS — Control Tower :: GOOGLE APPS SCRIPT BACKEND (Web App)
 * ============================================================================
 *  Berkas utama deploy Google Apps Script. Semua fitur & fungsi yang sebelumnya
 *  berjalan di server Node/Express (`server.ts`, `api/*.ts`, `netlify/functions`)
 *  dipindahkan ke sini TANPA mengubah perilakunya:
 *
 *    GET  /api/health              -> action HEALTH
 *    GET  /api/runtime             -> action RUNTIME_INFO
 *    POST /api/sheets/setup        -> action SHEETS_SETUP
 *    POST /api/sheets/sync         -> action SHEETS_SYNC
 *    POST /api/sheets/fetch        -> action SHEETS_FETCH
 *    POST /api/gas/proxy           -> action GAS_PROXY / GET_ALL_DATA
 *    GET  /api/drive/status        -> action DRIVE_STATUS
 *    GET  /api/drive/file          -> action DRIVE_FILE (proxy preview media)
 *    POST /api/drive/upload        -> action DRIVE_UPLOAD
 *    POST /api/drive/create-folder -> action DRIVE_CREATE_FOLDER
 *    POST /api/drive/ensure-path   -> action DRIVE_ENSURE_PATH
 *    POST /api/surat/create-issue  -> action SURAT_CREATE_ISSUE
 *    POST /api/surat/open-generator-> action SURAT_OPEN_GENERATOR
 *    POST /api/settings/save       -> action SETTINGS_SAVE
 *    POST /api/settings/load       -> action SETTINGS_LOAD
 *
 *  Penyimpanan:
 *   - SEMUA data & pengaturan (termasuk Branding Profile dan konfigurasi
 *     Google Drive) disimpan pada SPREADSHEET AKTIF yang dipakai deploy ini.
 *   - Berkas fisik (KTP, SPPI, SKP, dokumen) tetap di Google Drive, tetapi
 *     diakses memakai DriveApp sebagai user deploy — tidak perlu Service
 *     Account maupun GOOGLE_SERVICE_ACCOUNT_JSON.
 *
 *  Deploy: lihat appsscript/README.md atau docs/DEPLOY_GOOGLE_APPS_SCRIPT.md
 * ============================================================================
 */

var ARMS_API_VERSION = '2.0.0-gas';
var ARMS_PROVIDER = 'google-apps-script';

/** Peta path REST (dipakai frontend) -> action internal Apps Script. */
var PATH_ACTION_MAP_ = {
  '/api/health': 'HEALTH',
  '/api/runtime': 'RUNTIME_INFO',
  '/api/sheets/setup': 'SHEETS_SETUP',
  '/api/sheets/sync': 'SHEETS_SYNC',
  '/api/sheets/fetch': 'SHEETS_FETCH',
  '/api/gas/proxy': 'GAS_PROXY',
  '/api/drive/status': 'DRIVE_STATUS',
  '/api/drive/file': 'DRIVE_FILE',
  '/api/drive/upload': 'DRIVE_UPLOAD',
  '/api/drive/create-folder': 'DRIVE_CREATE_FOLDER',
  '/api/drive/ensure-path': 'DRIVE_ENSURE_PATH',
  '/api/surat/create-issue': 'SURAT_CREATE_ISSUE',
  '/api/surat/open-generator': 'SURAT_OPEN_GENERATOR',
  '/api/settings/save': 'SETTINGS_SAVE',
  '/api/settings/load': 'SETTINGS_LOAD'
};

/** Alias action lama agar klien/legacy tetap jalan. */
var ACTION_ALIASES_ = {
  'PING': 'HEALTH',
  'SETUP': 'SHEETS_SETUP',
  'SHEET_SETUP': 'SHEETS_SETUP',
  'SYNC': 'SHEETS_SYNC',
  'PUSH': 'SHEETS_SYNC',
  'PUSH_ALL': 'SHEETS_SYNC',
  'PUSH_DATA': 'SHEETS_SYNC',
  'FETCH': 'SHEETS_FETCH',
  'PULL': 'SHEETS_FETCH',
  'GET_DATA': 'GET_ALL_DATA',
  'FETCH_ALL_DATA': 'GET_ALL_DATA',
  'GETALLDATA': 'GET_ALL_DATA',
  'CREATE_FOLDER': 'DRIVE_CREATE_FOLDER',
  'ENSURE_PATH': 'DRIVE_ENSURE_PATH',
  'UPLOAD': 'DRIVE_UPLOAD',
  'STATUS': 'DRIVE_STATUS',
  'FILE': 'DRIVE_FILE',
  'GET_FILE': 'DRIVE_FILE',
  'DRIVE_GET_FILE': 'DRIVE_FILE',
  'SAVE_SETTINGS': 'SETTINGS_SAVE',
  'LOAD_SETTINGS': 'SETTINGS_LOAD',
  'SETTINGS': 'SETTINGS_LOAD'
};

/** Tabel router: action -> handler. */
var ACTION_HANDLERS_ = {
  'HEALTH': healthHandler_,
  'RUNTIME_INFO': runtimeInfoHandler_,
  'SHEETS_SETUP': sheetsSetupHandler_,
  'SHEETS_SYNC': sheetsSyncHandler_,
  'SHEETS_FETCH': sheetsFetchHandler_,
  'GAS_PROXY': gasProxyHandler_,
  'GET_ALL_DATA': getAllDataHandler_,
  'DRIVE_STATUS': driveStatusHandler_,
  'DRIVE_FILE': driveFileHandler_,
  'DRIVE_UPLOAD': driveUploadHandler_,
  'DRIVE_CREATE_FOLDER': driveCreateFolderHandler_,
  'DRIVE_ENSURE_PATH': driveEnsurePathHandler_,
  'SURAT_CREATE_ISSUE': suratCreateIssueHandler_,
  'SURAT_OPEN_GENERATOR': suratOpenGeneratorHandler_,
  'SETTINGS_SAVE': settingsSaveHandler_,
  'SETTINGS_LOAD': settingsLoadHandler_
};

/* ======================================================================== *
 *  ENTRY POINT WEB APP
 * ======================================================================== */

/**
 * GET tanpa parameter `action`  -> tampilkan aplikasi ARMS (HtmlService).
 * GET dengan `?action=...`      -> respon JSON (dipakai fetch lintas origin).
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var action = String(params.action || actionFromPath_(params.path || params.url || '') || '').toUpperCase();
  if (action) {
    return jsonResponse_(handleApiRequest({ action: action, payload: params }));
  }
  return renderApp_();
}

/** POST JSON -> router action. Body boleh `{action, payload}` atau flat. */
function doPost(e) {
  var body = {};
  var raw = '';
  try {
    raw = (e && e.postData && e.postData.contents) ? String(e.postData.contents) : '';
    body = raw ? JSON.parse(raw) : {};
    if (body === null) body = {};
  } catch (err) {
    return jsonResponse_(fail_('Body JSON tidak valid: ' + errorMessage_(err), 400));
  }

  var params = (e && e.parameter) ? e.parameter : {};
  var action = String(
    body.action || params.action ||
    actionFromPath_(body.path || params.path || '') ||
    actionFromPath_(body.webAppUrl || '') ||
    ''
  ).toUpperCase();

  if (!action) {
    // Tanpa action: anggap permintaan tampilan aplikasi (mis. opened via POST).
    return renderApp_();
  }
  return jsonResponse_(handleApiRequest({ action: action, payload: body }));
}

/**
 * Dipanggil langsung dari browser lewat `google.script.run.handleApiRequest(...)`
 * saat aplikasi dijalankan di dalam Web App Apps Script (tanpa HTTP/CORS).
 * @param {{action:string, payload:Object}} request
 * @return {Object} JSON-safe
 */
function handleApiRequest(request) {
  var started = new Date().getTime();
  var req = normalizeRequest_(request);
  var action = String(req.action || '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  action = ACTION_ALIASES_[action] || action;

  if (!action) return fail_('Parameter "action" wajib diisi.', 400);

  var handler = ACTION_HANDLERS_[action];
  if (!handler) {
    return fail_(
      'Action tidak dikenal: "' + req.action + '". Action yang tersedia: ' +
      Object.keys(ACTION_HANDLERS_).join(', '), 404
    );
  }

  try {
    var result = handler(req);
    return decorateResult_(result, action, started);
  } catch (err) {
    var msg = errorMessage_(err);
    Logger.log('[ARMS] action %s gagal: %s', action, msg);
    return fail_(msg, errorStatus_(err), action);
  }
}

/* ======================================================================== *
 *  HTML / UI
 * ======================================================================== */

/** Render aplikasi ARMS (bundle hasil `npm run gas:build`). */
function renderApp_() {
  try {
    var tpl = HtmlService.createTemplateFromFile('Index');
    tpl.armsVersion = ARMS_API_VERSION;
    tpl.armsScriptId = safeScriptId_();
    return tpl
      .evaluate()
      .setTitle('ARMS — Control Tower (Agency Recovery Management System)')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    return HtmlService.createHtmlOutput(fallbackPageHtml_(errorMessage_(err)))
      .setTitle('ARMS — Control Tower')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
}

/** Dipakai Index.html: `<?!= include('Bundle01') ?>`. */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function safeScriptId_() {
  try {
    return ScriptApp.getScriptId();
  } catch (e) {
    return '';
  }
}

/** Halaman petunjuk bila bundle frontend belum di-push ke project Apps Script. */
function fallbackPageHtml_(reason) {
  return [
    '<!DOCTYPE html><html lang="id"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>ARMS — Control Tower</title>',
    '<style>body{margin:0;background:#020617;color:#e2e8f0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:32px}',
    '.card{max-width:760px;margin:0 auto;background:#0f172a;border:1px solid #1e293b;border-radius:16px;padding:24px}',
    'h1{font-size:20px;margin:0 0 8px}code{background:#020617;border:1px solid #1e293b;border-radius:6px;padding:2px 6px;color:#6ee7b7}',
    'ol{line-height:1.9;font-size:14px;color:#cbd5e1}.err{color:#fca5a5;font-size:13px;margin-top:16px}</style></head>',
    '<body><div class="card">',
    '<h1>🏢 ARMS — Control Tower (Google Apps Script)</h1>',
    '<p style="font-size:13px;color:#94a3b8">Backend Apps Script sudah aktif, tetapi berkas tampilan (<code>Index.html</code> + <code>BundleNN.html</code>) belum ada di project ini.</p>',
    '<ol>',
    '<li>Di komputer, jalankan <code>npm run gas:build</code> (membangun SPA menjadi bundle HTML di <code>appsscript/dist/</code>).</li>',
    '<li>Lalu jalankan <code>npm run gas:push</code> (clasp push) supaya seluruh berkas — termasuk bundle — terkirim ke project Apps Script ini.</li>',
    '<li>Buka kembali URL Web App (Deploy &rarr; Manage deployments) dan refresh.</li>',
    '</ol>',
    '<p style="font-size:13px;color:#94a3b8">Backend tetap dapat dipakai aplikasi ARMS yang di-host terpisah melalui URL Web App ini (mode <em>GAS Web App URL</em> di Pengaturan).</p>',
    '<div class="err">Detail: ' + String(reason || '').replace(/</g, '&lt;').slice(0, 400) + '</div>',
    '</div></body></html>'
  ].join('');
}

/* ======================================================================== *
 *  UTIL ROUTER
 * ======================================================================== */

function actionFromPath_(path) {
  var raw = String(path || '');
  if (!raw) return '';
  var idx = raw.indexOf('/api/');
  if (idx === -1) return '';
  var clean = raw.slice(idx).split('?')[0].split('#')[0].replace(/\/+$/, '');
  return PATH_ACTION_MAP_[clean] || '';
}

/**
 * Gabungkan body + payload (bisa bersarang) menjadi satu object datar sehingga
 * handler cukup membaca `req.spreadsheetId`, `req.data`, `req.tabs`, dst.
 * Action terluar selalu menang untuk routing; action dari payload disimpan
 * sebagai `innerAction` (dipakai GAS_PROXY untuk meneruskan permintaan lama).
 */
function normalizeRequest_(request) {
  var out = {};
  var src = request || {};
  copyProps_(src, out);

  var outerAction = src.action;
  var cursor = src.payload;
  var depth = 0;
  while (cursor && typeof cursor === 'object' && depth < 4) {
    copyProps_(cursor, out);
    cursor = cursor.payload;
    depth++;
  }
  if (src.body && typeof src.body === 'object' && !out.data) copyProps_(src.body, out);

  if (outerAction) {
    if (out.action && out.action !== outerAction) out.innerAction = out.action;
    out.action = outerAction;
  }
  return out;
}

function copyProps_(from, to) {
  for (var key in from) {
    if (Object.prototype.hasOwnProperty.call(from, key)) to[key] = from[key];
  }
  return to;
}

function decorateResult_(result, action, started) {
  var out = (result && typeof result === 'object') ? result : { success: true, result: result };
  if (typeof out.success === 'undefined') out.success = true;
  out.provider = ARMS_PROVIDER;
  out.action = action;
  out.durationMs = new Date().getTime() - started;
  return out;
}

function fail_(message, status, action) {
  var out = {
    success: false,
    error: String(message || 'Terjadi kesalahan pada Apps Script ARMS.'),
    httpStatus: Number(status || 500),
    provider: ARMS_PROVIDER
  };
  if (action) out.action = action;
  return out;
}

function jsonResponse_(obj) {
  var text;
  try {
    text = JSON.stringify(obj === undefined || obj === null ? {} : obj);
  } catch (err) {
    text = JSON.stringify({ success: false, error: 'Respon tidak dapat diserialisasi: ' + errorMessage_(err) });
  }
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

function errorMessage_(err) {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  return String(err.message || err.toString ? err.toString() : err);
}

/** Terjemahkan error Google menjadi status HTTP yang sama dengan server.ts. */
function errorStatus_(err) {
  var msg = errorMessage_(err).toLowerCase();
  if (msg.indexOf('missing') === 0 || msg.indexOf('wajib') !== -1) return 400;
  if (msg.indexOf('not found') !== -1 || msg.indexOf('tidak ditemukan') !== -1) return 404;
  if (msg.indexOf('permission') !== -1 || msg.indexOf('izin') !== -1) return 403;
  return 500;
}
