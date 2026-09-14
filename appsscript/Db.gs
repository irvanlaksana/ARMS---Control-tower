/**
 * ============================================================================
 *  ARMS — Control Tower :: LAPISAN DATABASE SPREADSHEET AKTIF (Apps Script)
 * ============================================================================
 *  Semua data & pengaturan ARMS disimpan pada SPREADSHEET AKTIF yang dipakai
 *  deploy saat ini. Urutan resolusi spreadsheet:
 *
 *    1. `spreadsheetId` / URL yang dikirim permintaan (bila berupa ID Google sah)
 *    2. Script Property  ARMS_SPREADSHEET_ID  (di-set lewat menu "Jadikan
 *       Spreadsheet Ini sebagai Database Aktif")
 *    3. Spreadsheet tempat script ini terikat (container-bound)
 *    4. Pencarian berdasarkan nama (mis. "arms-control-tower")
 *    5. Membuat spreadsheet baru otomatis (sekali saja) lalu menyimpan ID-nya
 *
 *  Dengan begitu seluruh fitur push/pull/setup spreadsheet yang ada tetap jalan,
 *  hanya media penyimpanannya yang dipindah ke spreadsheet aktif.
 * ============================================================================
 */

/** Peta collection ARMS -> nama tab spreadsheet (identik dengan server.ts). */
var DEFAULT_TABS_ = {
  users: 'Users',
  clients: 'Clients',
  personnel: 'Personnel',
  services: 'Services',
  fees: 'Fees',
  contracts: 'Contracts',
  leads: 'Leads',
  customers: 'Customers',
  cases: 'Cases',
  assignments: 'Assignments',
  sks: 'SK',
  lawyerNotices: 'Lawyer_Notices',
  commLogs: 'Communication_Log',
  assets: 'Assets',
  collections: 'Collections',
  assetRecoveries: 'Asset_Recoveries',
  payments: 'Payments',
  danaTalangan: 'Funding',
  expenses: 'Expenses',
  settlements: 'Settlements',
  ledger: 'Ledger',
  cashAccounts: 'Cash',
  pettyCash: 'Petty_Cash',
  workingCapital: 'Working_Capital',
  documents: 'Documents',
  driveFolders: 'Drive_Folders',
  approvals: 'Approvals',
  notifications: 'Notifications',
  auditLogs: 'Audit_Log',
  settings: 'Settings'
};

var SETTINGS_TAB_ = 'Settings';
var BLOB_TAB_ = 'Blob_Store';
var SETTINGS_HEADERS_ = ['key', 'value', 'updatedAt', 'note'];
var BLOB_HEADERS_ = ['blobId', 'chunk', 'value'];

/** Batas aman karakter per sel Google Sheets (limit resmi 50.000). */
var CELL_SAFE_LIMIT_ = 40000;
var CHUNK_SUFFIX_ = '__chunk';
var BLOB_PREFIX_ = '@@arms_blob:';
var WRITE_BATCH_ROWS_ = 300;

/* ======================================================================== *
 *  RESOLUSI SPREADSHEET AKTIF
 * ======================================================================== */

function scriptProps_() {
  return PropertiesService.getScriptProperties();
}

/** Ambil ID Google Spreadsheet dari ID mentah atau URL. */
function extractSheetId_(raw) {
  var s = String(raw || '').trim();
  if (!s) return '';
  var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  m = s.match(/[?&]id=([a-zA-Z0-9-_]{20,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s)) return s;
  return '';
}

/**
 * Resolusi spreadsheet aktif untuk deploy ini.
 * @param {string} requested ID / URL / nama workbook dari permintaan.
 * @return {{ss:Spreadsheet, id:string, name:string, url:string, source:string}}
 */
function resolveSpreadsheet_(requested) {
  var props = scriptProps_();
  var label = String(requested || '').trim();
  var attempts = [];

  var explicitId = extractSheetId_(label);
  if (explicitId) attempts.push({ id: explicitId, source: 'request' });

  var propId = props.getProperty('ARMS_SPREADSHEET_ID');
  if (propId) attempts.push({ id: propId, source: 'script-property' });

  try {
    var bound = SpreadsheetApp.getActiveSpreadsheet();
    if (bound) attempts.push({ id: bound.getId(), source: 'container-bound' });
  } catch (e) { /* standalone script */ }

  for (var i = 0; i < attempts.length; i++) {
    try {
      var ss = SpreadsheetApp.openById(attempts[i].id);
      if (ss) return describeSpreadsheet_(ss, attempts[i].source);
    } catch (e) { /* coba kandidat berikutnya */ }
  }

  // Cari berdasarkan nama (kompatibel dengan "nama workbook lokal" versi CSV).
  if (label) {
    try {
      var it = DriveApp.getFilesByName(label);
      while (it.hasNext()) {
        var file = it.next();
        if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
          var found = SpreadsheetApp.openById(file.getId());
          if (found) {
            props.setProperty('ARMS_SPREADSHEET_ID', found.getId());
            return describeSpreadsheet_(found, 'searched-by-name');
          }
        }
      }
    } catch (e) { /* lanjut ke pembuatan otomatis */ }
  }

  // Buat spreadsheet database baru (sekali) dan ingat ID-nya.
  var newName = label && !extractSheetId_(label) ? label : (props.getProperty('ARMS_SPREADSHEET_NAME') || 'ARMS_Control_Tower_Database');
  var created = SpreadsheetApp.create(newName);
  props.setProperty('ARMS_SPREADSHEET_ID', created.getId());
  return describeSpreadsheet_(created, 'created');
}

function describeSpreadsheet_(ss, source) {
  var id = ss.getId();
  return {
    ss: ss,
    id: id,
    name: ss.getName(),
    url: 'https://docs.google.com/spreadsheets/d/' + id + '/edit',
    source: source || 'unknown'
  };
}

/* ======================================================================== *
 *  TAB / SHEET
 * ======================================================================== */

function sanitizeTabName_(name) {
  return String(name || '')
    .replace(/[\[\]:*?\/\\']/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 90);
}

/** Gabungkan tab default dengan konfigurasi tab dari Pengaturan aplikasi. */
function getTabMap_(tabs) {
  var map = {};
  copyProps_(DEFAULT_TABS_, map);
  if (tabs && typeof tabs === 'object') {
    for (var key in tabs) {
      if (!Object.prototype.hasOwnProperty.call(tabs, key)) continue;
      var name = sanitizeTabName_(tabs[key]);
      if (name) map[key] = name;
    }
  }
  return map;
}

function getSheetOrNull_(ss, tabName) {
  try {
    return ss.getSheetByName(tabName);
  } catch (e) {
    return null;
  }
}

function ensureSheet_(ss, tabName) {
  var name = sanitizeTabName_(tabName);
  var sheet = getSheetOrNull_(ss, name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    try { sheet.setFrozenRows(1); } catch (e) {}
  }
  return sheet;
}

function ensureSheets_(ss, tabNames) {
  var created = [];
  var seen = {};
  for (var i = 0; i < tabNames.length; i++) {
    var name = sanitizeTabName_(tabNames[i]);
    if (!name || seen[name]) continue;
    seen[name] = true;
    if (!getSheetOrNull_(ss, name)) {
      ensureSheet_(ss, name);
      created.push(name);
    }
  }
  return created;
}

/** Ubah nilai sel menjadi string aman untuk Sheets. */
function cellToString_(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try { return JSON.stringify(value); } catch (e) { return String(value); }
  }
  return String(value);
}

/** Kembalikan nilai sel ke tipe aslinya (boolean / angka / object JSON). */
function parseCellValue_(value) {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') return value;
  var text = value.trim();
  if (text === 'true') return true;
  if (text === 'false') return false;
  if (/^[\{\[]/.test(text)) {
    try { return JSON.parse(text); } catch (e) { return value; }
  }
  return value;
}

function uniqueValues_(list) {
  var out = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var v = list[i];
    if (v && !seen[v]) { seen[v] = true; out.push(v); }
  }
  return out;
}

/** Baca sebuah tab menjadi array of object (baris pertama = header). */
function readTabAsObjects_(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return [];
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = (values.shift() || []).map(function (h) { return String(h === null || h === undefined ? '' : h).trim(); });
  if (!headers.length) return [];

  var blobMap = null;
  var rows = [];
  for (var r = 0; r < values.length; r++) {
    var row = values[r];
    var isEmpty = true;
    for (var c = 0; c < row.length; c++) { if (row[c] !== '' && row[c] !== null) { isEmpty = false; break; } }
    if (isEmpty) continue;

    var obj = {};
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (!header) continue;
      var raw = i < row.length ? row[i] : '';
      var text = cellToString_(raw);
      if (text.indexOf(BLOB_PREFIX_) === 0) {
        if (blobMap === null) blobMap = loadBlobMap_(sheet.getParent());
        text = blobMap[text.slice(BLOB_PREFIX_.length)] || '';
      }
      obj[header] = parseCellValue_(text);
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Tulis array of object ke sebuah tab (menggantikan isi lama).
 * Nilai yang lebih panjang dari batas sel disimpan ke tab Blob_Store.
 */
function writeTabFromObjects_(ss, tabName, records) {
  var sheet = ensureSheet_(ss, tabName);
  var list = Array.isArray(records) ? records : [];

  if (!list.length) {
    try { sheet.clear(); } catch (e) { sheet.clearContents(); }
    return { rows: 0, columns: 0 };
  }

  // Header = gabungan seluruh key (urutan kemunculan pertama).
  var headers = [];
  var seen = {};
  for (var i = 0; i < list.length; i++) {
    var rec = list[i] || {};
    for (var key in rec) {
      if (!Object.prototype.hasOwnProperty.call(rec, key)) continue;
      if (!seen[key]) { seen[key] = true; headers.push(key); }
    }
  }
  if (!headers.length) headers = ['value'];

  var blobs = {};
  var blobSeq = 0;
  var values = [headers.slice()];
  for (var r = 0; r < list.length; r++) {
    var row = [];
    var record = list[r] || {};
    for (var c = 0; c < headers.length; c++) {
      var text = cellToString_(record[headers[c]]);
      if (text.length > CELL_SAFE_LIMIT_) {
        var blobId = 'BLB-' + new Date().getTime().toString(36) + '-' + (++blobSeq);
        blobs[blobId] = text;
        text = BLOB_PREFIX_ + blobId;
      }
      row.push(text);
    }
    values.push(row);
  }

  try { sheet.clear(); } catch (e) { sheet.clearContents(); }
  try { sheet.setFrozenRows(1); } catch (e) {}

  var totalCols = headers.length;
  for (var start = 0; start < values.length; start += WRITE_BATCH_ROWS_) {
    var batch = values.slice(start, start + WRITE_BATCH_ROWS_);
    sheet.getRange(start + 1, 1, batch.length, totalCols).setValues(batch);
  }

  if (Object.keys(blobs).length) persistBlobs_(ss, blobs);

  return { rows: list.length, columns: totalCols, blobs: Object.keys(blobs).length };
}

/* ======================================================================== *
 *  BLOB STORE (nilai panjang: foto base64, JSON besar, dsb.)
 * ======================================================================== */

function persistBlobs_(ss, blobs) {
  var sheet = ensureSheet_(ss, BLOB_TAB_);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, BLOB_HEADERS_.length).setValues([BLOB_HEADERS_]);
    try { sheet.setFrozenRows(1); } catch (e) {}
  }
  var rows = [];
  for (var blobId in blobs) {
    if (!Object.prototype.hasOwnProperty.call(blobs, blobId)) continue;
    var text = String(blobs[blobId]);
    for (var i = 0, chunk = 0; i < text.length; i += CELL_SAFE_LIMIT_, chunk++) {
      rows.push([blobId, chunk, text.substr(i, CELL_SAFE_LIMIT_)]);
    }
  }
  if (!rows.length) return;
  for (var start = 0; start < rows.length; start += 50) {
    var batch = rows.slice(start, start + 50);
    sheet.getRange(sheet.getLastRow() + 1, 1, batch.length, BLOB_HEADERS_.length).setValues(batch);
  }
}

function loadBlobMap_(ss) {
  var map = {};
  var sheet = getSheetOrNull_(ss, BLOB_TAB_);
  if (!sheet) return map;
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return map;
  var values = sheet.getRange(2, 1, lastRow - 1, BLOB_HEADERS_.length).getValues();
  for (var i = 0; i < values.length; i++) {
    var id = String(values[i][0] || '');
    if (!id) continue;
    map[id] = (map[id] || '') + String(values[i][2] === null || values[i][2] === undefined ? '' : values[i][2]);
  }
  return map;
}

/* ======================================================================== *
 *  SETTINGS (Branding Profile + konfigurasi GDrive) -> TAB Settings
 * ======================================================================== */

/** Object settings -> baris key/value (nilai panjang dipecah jadi __chunkN). */
function settingsToRows_(settings) {
  var now = new Date().toISOString();
  var rows = [];
  var obj = settings || {};
  for (var key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    var text = cellToString_(obj[key]);
    if (text.length <= CELL_SAFE_LIMIT_) {
      rows.push([key, text, now, typeof obj[key] === 'object' && obj[key] !== null ? 'json' : typeof obj[key]]);
      continue;
    }
    var total = Math.ceil(text.length / CELL_SAFE_LIMIT_);
    for (var i = 0; i < total; i++) {
      var chunkKey = i === 0 ? key : key + CHUNK_SUFFIX_ + (i + 1);
      rows.push([chunkKey, text.substr(i * CELL_SAFE_LIMIT_, CELL_SAFE_LIMIT_), now, 'chunk ' + (i + 1) + '/' + total + ' of ' + key]);
    }
  }
  return rows;
}

/** Baris key/value tab Settings -> object settings (chunk digabung & diparse). */
function settingsObjectFromRows_(rows) {
  var merged = {};
  var order = [];
  for (var i = 0; i < (rows || []).length; i++) {
    var row = rows[i] || {};
    var key = String(row.key === undefined || row.key === null ? '' : row.key).trim();
    if (!key) continue;
    var value = cellToString_(row.value);
    var base = key.split(CHUNK_SUFFIX_)[0];
    var isChunk = key.indexOf(CHUNK_SUFFIX_) !== -1;
    if (isChunk) {
      merged[base] = String(merged[base] === undefined ? '' : merged[base]) + value;
    } else {
      if (merged[base] === undefined) order.push(base);
      merged[base] = value;
    }
  }
  var out = {};
  for (var k = 0; k < order.length; k++) {
    var name = order[k];
    out[name] = parseSettingsValue_(name, merged[name]);
  }
  return out;
}

var SETTINGS_JSON_KEYS_ = ['databaseConfig', 'workflowConfig', 'bankBalances'];
var SETTINGS_BOOL_KEYS_ = ['autoSyncWithGoogleSheets'];
var SETTINGS_NUM_KEYS_ = ['defaultFeePercent', 'defaultCompanyCommissionSplitPercent'];

function parseSettingsValue_(key, rawValue) {
  var text = rawValue === undefined || rawValue === null ? '' : String(rawValue);
  if (SETTINGS_BOOL_KEYS_.indexOf(key) !== -1) return text === 'true' || text === '1';
  if (SETTINGS_NUM_KEYS_.indexOf(key) !== -1) {
    var num = Number(text);
    return isNaN(num) ? 0 : num;
  }
  if (SETTINGS_JSON_KEYS_.indexOf(key) !== -1 || /^[\{\[]/.test(text)) {
    try { return JSON.parse(text); } catch (e) { return text; }
  }
  return text;
}

function writeSettingsTab_(ss, tabName, settings) {
  var sheet = ensureSheet_(ss, tabName || SETTINGS_TAB_);
  var rows = settingsToRows_(settings);
  try { sheet.clear(); } catch (e) { sheet.clearContents(); }
  try { sheet.setFrozenRows(1); } catch (e) {}
  var values = [SETTINGS_HEADERS_.slice()].concat(rows);
  for (var start = 0; start < values.length; start += WRITE_BATCH_ROWS_) {
    var batch = values.slice(start, start + WRITE_BATCH_ROWS_);
    sheet.getRange(start + 1, 1, batch.length, SETTINGS_HEADERS_.length).setValues(batch);
  }
  return rows.length;
}

/** Tulis sebagian settings (merge dengan yang sudah ada di tab Settings). */
function mergeSettingsIntoTab_(ss, tabName, patch) {
  var sheet = ensureSheet_(ss, tabName || SETTINGS_TAB_);
  var existing = settingsObjectFromRows_(readSettingsRawRows_(sheet));
  var combined = {};
  copyProps_(existing, combined);
  copyProps_(patch || {}, combined);
  return { count: writeSettingsTab_(ss, tabName || SETTINGS_TAB_, combined), settings: combined };
}

function readSettingsRawRows_(sheet) {
  if (!sheet) return [];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var lastCol = Math.max(sheet.getLastColumn(), SETTINGS_HEADERS_.length);
  var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = (values.shift() || []).map(function (h) { return String(h || '').trim(); });
  var keyIdx = headers.indexOf('key');
  var valIdx = headers.indexOf('value');
  if (keyIdx === -1) keyIdx = 0;
  if (valIdx === -1) valIdx = 1;
  var out = [];
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var key = String(row[keyIdx] === null || row[keyIdx] === undefined ? '' : row[keyIdx]).trim();
    if (!key) continue;
    out.push({ key: key, value: cellToString_(row[valIdx]) });
  }
  return out;
}

function readSettingsObject_(ss, tabName) {
  return settingsObjectFromRows_(readSettingsRawRows_(getSheetOrNull_(ss, tabName || SETTINGS_TAB_)));
}

/* ======================================================================== *
 *  HANDLER: HEALTH / RUNTIME / SHEETS / SETTINGS / GAS PROXY
 * ======================================================================== */

function healthHandler_(req) {
  var target = null;
  var err = '';
  try {
    target = resolveSpreadsheet_(req && (req.spreadsheetId || req.googleSpreadsheetId));
  } catch (e) {
    err = errorMessage_(e);
  }
  return {
    status: 'ok',
    success: !err,
    system: 'ARMS - Control Tower Agency DC',
    database: 'Google Apps Script + Spreadsheet Aktif',
    storage: 'Google Drive (DriveApp - akun deploy)',
    provider: ARMS_PROVIDER,
    version: ARMS_API_VERSION,
    supabaseConfigured: false,
    spreadsheetId: target ? target.id : '',
    spreadsheetName: target ? target.name : '',
    spreadsheetUrl: target ? target.url : '',
    spreadsheetSource: target ? target.source : '',
    error: err || undefined,
    timestamp: new Date().toISOString()
  };
}

function runtimeInfoHandler_(req) {
  var target = resolveSpreadsheet_(req && (req.spreadsheetId || req.googleSpreadsheetId));
  var ownerEmail = '';
  try { ownerEmail = target.ss.getOwner().getEmail(); } catch (e) {}
  var userEmail = '';
  try { userEmail = Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || ''; } catch (e2) {}

  var tabs = getTabMap_(req && req.tabs);
  var settings = readSettingsObject_(target.ss, tabs.settings || SETTINGS_TAB_);

  return {
    success: true,
    mode: 'google-apps-script',
    provider: ARMS_PROVIDER,
    version: ARMS_API_VERSION,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    spreadsheetSource: target.source,
    settingsTab: tabs.settings || SETTINGS_TAB_,
    blobTab: BLOB_TAB_,
    tabs: tabs,
    ownerEmail: ownerEmail,
    effectiveUser: userEmail,
    timezone: Session.getScriptTimeZone(),
    scriptId: safeScriptId_(),
    settingsCount: Object.keys(settings).length,
    settings: settings,
    now: new Date().toISOString()
  };
}

function sheetsSetupHandler_(req) {
  var target = resolveSpreadsheet_(req.spreadsheetId || req.googleSpreadsheetId);
  var tabs = getTabMap_(req.tabs);
  var names = uniqueValues_([BLOB_TAB_].concat(Object.keys(tabs).map(function (k) { return tabs[k]; })));
  var created = ensureSheets_(target.ss, names);

  // Pastikan tab Settings punya header standar.
  var settingsSheet = ensureSheet_(target.ss, tabs.settings || SETTINGS_TAB_);
  if (settingsSheet.getLastRow() === 0) {
    settingsSheet.getRange(1, 1, 1, SETTINGS_HEADERS_.length).setValues([SETTINGS_HEADERS_]);
    try { settingsSheet.setFrozenRows(1); } catch (e) {}
  }
  SpreadsheetApp.flush();

  return {
    success: true,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    message: 'Berhasil membuat/memverifikasi ' + names.length + ' tab database pada spreadsheet aktif "' + target.name + '".',
    sheets: names,
    created: created,
    provider: ARMS_PROVIDER
  };
}

function sheetsSyncHandler_(req) {
  var data = req.data;
  if (!data || typeof data !== 'object') return fail_('Missing spreadsheetId or data', 400);

  var target = resolveSpreadsheet_(req.spreadsheetId || req.googleSpreadsheetId);
  var tabs = getTabMap_(req.tabs);
  var updatedTabs = [];
  var counts = {};
  var skipped = [];
  var warnings = [];

  var keys = Object.keys(data);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var tabName = tabs[key] || sanitizeTabName_(key);
    var records = data[key];

    if (key === 'settings' && records && !Array.isArray(records)) {
      var written = writeSettingsTab_(target.ss, tabName, records);
      updatedTabs.push(tabName);
      counts[key] = written;
      continue;
    }

    if (!Array.isArray(records)) {
      skipped.push(key);
      warnings.push('Collection "' + key + '" dilewati karena bukan array.');
      continue;
    }

    var res = writeTabFromObjects_(target.ss, tabName, records);
    updatedTabs.push(tabName);
    counts[key] = res.rows;
  }

  SpreadsheetApp.flush();

  return {
    success: true,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    updatedTabs: updatedTabs,
    counts: counts,
    skipped: skipped,
    warnings: warnings,
    totalItems: keys.reduce(function (acc, k) { return acc + (counts[k] || 0); }, 0),
    provider: ARMS_PROVIDER,
    syncedAt: new Date().toISOString()
  };
}

function sheetsFetchHandler_(req) {
  var target = resolveSpreadsheet_(req.spreadsheetId || req.googleSpreadsheetId);
  var tabs = getTabMap_(req.tabs);
  var data = {};
  var missing = [];

  var keys = Object.keys(tabs);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var tabName = tabs[key];
    var sheet = getSheetOrNull_(target.ss, tabName);
    if (!sheet) { missing.push(tabName); continue; }

    if (key === 'settings') {
      var settingsObj = settingsObjectFromRows_(readSettingsRawRows_(sheet));
      if (Object.keys(settingsObj).length) data.settings = settingsObj;
      continue;
    }

    var rows = readTabAsObjects_(sheet);
    // Tab kosong dilewati agar data lokal tidak tertimpa array kosong.
    if (rows.length) data[key] = rows;
  }

  return {
    success: true,
    data: data,
    missingTabs: missing,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    provider: ARMS_PROVIDER,
    fetchedAt: new Date().toISOString()
  };
}

function settingsSaveHandler_(req) {
  var patch = req.settings || req.data || req.payload;
  if (!patch || typeof patch !== 'object') return fail_('Missing settings object', 400);
  var target = resolveSpreadsheet_(req.spreadsheetId || req.googleSpreadsheetId || patch.googleSheetId);
  var tabs = getTabMap_(req.tabs);
  var tabName = tabs.settings || SETTINGS_TAB_;
  var result = mergeSettingsIntoTab_(target.ss, tabName, patch);
  SpreadsheetApp.flush();
  return {
    success: true,
    savedKeys: Object.keys(patch).length,
    totalKeys: result.count,
    settings: result.settings,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    tab: tabName,
    provider: ARMS_PROVIDER,
    savedAt: new Date().toISOString()
  };
}

function settingsLoadHandler_(req) {
  var target = resolveSpreadsheet_(req.spreadsheetId || req.googleSpreadsheetId);
  var tabs = getTabMap_(req.tabs);
  var tabName = tabs.settings || SETTINGS_TAB_;
  var settings = readSettingsObject_(target.ss, tabName);
  return {
    success: true,
    settings: settings,
    count: Object.keys(settings).length,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    tab: tabName,
    provider: ARMS_PROVIDER,
    loadedAt: new Date().toISOString()
  };
}

/**
 * Kompatibel dengan `/api/gas/proxy` milik server.ts:
 *  - bila `webAppUrl` menunjuk Apps Script lain -> diteruskan (UrlFetchApp)
 *  - bila kosong / menunjuk diri sendiri       -> dieksekusi lokal (spreadsheet aktif)
 */
function gasProxyHandler_(req) {
  var url = String(req.webAppUrl || '').trim();
  var innerAction = String(req.innerAction || req.action || 'GET_ALL_DATA').toUpperCase();

  if (url && url.indexOf('/exec') !== -1 && !isSelfWebAppUrl_(url)) {
    try {
      var response = UrlFetchApp.fetch(url, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          action: innerAction,
          tab: req.tab,
          payload: req.payload,
          data: req.data,
          auditInfo: req.auditInfo,
          spreadsheetId: req.googleSpreadsheetId || req.spreadsheetId
        }),
        muteHttpExceptions: true,
        followRedirects: true
      });
      var text = response.getContentText();
      try {
        return JSON.parse(text);
      } catch (e) {
        return fail_('Respon Apps Script tujuan tidak valid: ' + text.slice(0, 200), 400);
      }
    } catch (err) {
      return fail_('Gagal meneruskan ke Apps Script tujuan: ' + errorMessage_(err), 502);
    }
  }

  return getAllDataHandler_(req);
}

function isSelfWebAppUrl_(url) {
  try {
    var props = scriptProps_();
    var selfUrl = props.getProperty('ARMS_WEB_APP_URL') || '';
    return Boolean(selfUrl && String(url).indexOf(selfUrl.split('?')[0]) === 0);
  } catch (e) {
    return false;
  }
}

/** Format lama GAS: data dikembalikan dengan key = nama tab spreadsheet. */
function getAllDataHandler_(req) {
  var target = resolveSpreadsheet_(req.spreadsheetId || req.googleSpreadsheetId);
  var tabs = getTabMap_(req.tabs);
  var data = {};

  var keys = Object.keys(tabs);
  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var tabName = tabs[key];
    var sheet = getSheetOrNull_(target.ss, tabName);
    if (!sheet) continue;
    if (key === 'settings') {
      var rows = readSettingsRawRows_(sheet);
      if (rows.length) {
        data[tabName] = rows;
        data.settings = settingsObjectFromRows_(rows);
      }
      continue;
    }
    var records = readTabAsObjects_(sheet);
    if (records.length) data[tabName] = records;
  }

  return {
    success: true,
    data: data,
    spreadsheetId: target.id,
    spreadsheetName: target.name,
    spreadsheetUrl: target.url,
    provider: ARMS_PROVIDER,
    fetchedAt: new Date().toISOString()
  };
}
