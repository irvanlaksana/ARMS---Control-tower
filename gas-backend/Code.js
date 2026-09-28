// ============================================================================
// ARMS CONTROL TOWER - GOOGLE APPS SCRIPT BACKEND (Code.gs)
// Deploy Target: Google Apps Script Web App
// Primary Database: Google Spreadsheet (Kolom-per-Kolom, Bebas 50k char limit)
// Media / Document Storage: Google Drive
// ============================================================================

/**
 * Entry point untuk Web App (UI HTML)
 */
function doGet(e) {
  // Support jika dipanggil via HTTP GET API
  if (e && e.parameter && e.parameter.action) {
    var action = e.parameter.action;
    var spreadsheetId = e.parameter.spreadsheetId || 'arms-control-tower';
    
    if (action === 'GET_ALL_DATA') {
      var resData = fetchSheets(spreadsheetId, {});
      return ContentService.createTextOutput(JSON.stringify(resData))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === 'CHECK_STRUCTURE') {
      var resStruct = checkAndPrepareSheets(spreadsheetId, {});
      return ContentService.createTextOutput(JSON.stringify(resStruct))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Standar: Sajikan antarmuka HTML ARMS
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('ARMS Control Tower')
    .setSandboxMode(HtmlService.SandboxMode.IFRAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * Entry point untuk Webhook / HTTP POST API
 */
function doPost(e) {
  try {
    var postData = JSON.parse(e.postData.contents);
    var action = postData.action || 'SYNC';
    var spreadsheetId = postData.spreadsheetId || 'arms-control-tower';
    var data = postData.data || {};
    var tabMap = postData.tabMap || {};

    var result;
    if (action === 'CHECK_STRUCTURE') {
      result = checkAndPrepareSheets(spreadsheetId, tabMap);
    } else {
      result = syncSheets(spreadsheetId, data, tabMap);
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * MASTER SKEMA KOLOM DATABASE ARMS
 * Memastikan setiap data dipetakan ke dalam kolom masing-masing,
 * TIDAK ditumpuk sekaligus dalam format JSON raksasa.
 */
var MASTER_SCHEMA_COLUMNS = {
  Users: ['id', 'username', 'name', 'email', 'role', 'department', 'status', 'last_login', 'created_at', 'updated_at'],
  Clients: ['id', 'client_code', 'company_name', 'industry', 'client_type', 'nik_ktp', 'contact_person', 'phone', 'email', 'address', 'tier', 'active_cases_count', 'status', 'gdrive_folder_url', 'gdrive_folder_id', 'proposal_drive_url', 'proposal_status', 'mou_drive_url', 'mou_contract_no', 'mou_status', 'skp_drive_folder_url', 'created_at', 'updated_at'],
  Personnel: ['id', 'type', 'full_name', 'nik_ktp', 'birth_place_date', 'address', 'phone_number', 'email', 'bank_name', 'account_number', 'account_name', 'emergency_contact', 'position', 'ktp_photo_url', 'ktp_drive_file_id', 'ktp_drive_folder_url', 'sppi_photo_url', 'sppi_drive_file_id', 'sppi_drive_folder_url', 'gdrive_folder_url', 'status', 'created_at', 'updated_at'],
  Services: ['id', 'service_code', 'name', 'category', 'description', 'default_fee_type', 'status', 'created_at', 'updated_at'],
  Fees: ['id', 'client_id', 'client_name', 'service_id', 'service_name', 'fee_type', 'percentage_value', 'fixed_amount', 'success_fee_percent', 'tier_rules_json', 'custom_formula_notes', 'effective_date', 'status', 'created_at', 'updated_at'],
  Contracts: ['id', 'contract_no', 'client_id', 'client_name', 'title', 'start_date', 'end_date', 'fee_structure_summary', 'status', 'approved_by', 'approved_at', 'rejection_reason', 'drive_document_url', 'created_at', 'updated_at'],
  Leads: ['id', 'lead_code', 'company_name', 'contact_person', 'phone', 'email', 'estimated_volume', 'service_requested', 'stage', 'notes', 'assigned_to', 'created_at', 'updated_at'],
  Customers: ['id', 'customer_code', 'contract_no', 'nik_ktp', 'full_name', 'phone', 'address_current', 'address_ktp', 'workplace', 'emergency_contact_name', 'emergency_contact_phone', 'due_date', 'installment_amount', 'total_installment', 'penalty_amount', 'vehicle_merk_type', 'vehicle_police_no', 'ktp_photo_url', 'stnk_photo_urls', 'risk_notes', 'gdrive_folder_url', 'created_at', 'updated_at'],
  Cases: ['id', 'case_no', 'client_id', 'client_name', 'client_type', 'contract_id', 'customer_id', 'debtor_name', 'debtor_nik', 'multifinance_contract_no', 'service_id', 'service_name', 'principal_debt_os', 'overdue_days', 'dpd_bucket', 'asset_summary', 'gdrive_folder_name', 'gdrive_folder_url', 'gdrive_folder_id', 'skp_drive_document_url', 'sph_drive_document_url', 'fee_type_snapshot', 'fee_percent_snapshot', 'fee_fixed_snapshot', 'status', 'lawyer_status', 'lawyer_notice_count', 'last_lawyer_notice_type', 'current_personnel_id', 'current_personnel_name', 'created_at', 'updated_at'],
  Assignments: ['id', 'assignment_no', 'case_id', 'case_no', 'debtor_name', 'personnel_id', 'personnel_name', 'assigned_date', 'target_date', 'sla_days', 'instructions', 'status', 'field_report_summary', 'gdrive_folder_url', 'created_at', 'updated_at'],
  SK: ['id', 'sk_number', 'case_id', 'case_no', 'debtor_name', 'client_type', 'client_name', 'pemberi_kuasa_type', 'kreditur_name', 'kreditur_nik', 'kreditur_address', 'personnel_id', 'personnel_name', 'issued_date', 'expiry_date', 'status', 'approved_by', 'approved_at', 'drive_folder_id', 'drive_folder_url', 'drive_document_url', 'created_at', 'updated_at'],
  Lawyer_Notices: ['id', 'notice_no', 'case_id', 'case_no', 'debtor_name', 'debtor_address', 'client_name', 'multifinance_contract_no', 'notice_type', 'requested_date', 'lawyer_firm_name', 'lawyer_name', 'principal_debt_amount', 'status', 'letter_content_draft', 'notes', 'drive_folder_id', 'drive_folder_url', 'drive_document_url', 'created_by', 'created_at', 'updated_at'],
  Communication_Log: ['id', 'case_id', 'case_no', 'personnel_id', 'personnel_name', 'log_date', 'channel', 'contact_person', 'summary', 'outcome', 'follow_up_action', 'next_follow_up_date', 'attachment_drive_url', 'photos', 'recorded_by', 'created_at', 'updated_at'],
  Assets: ['id', 'asset_code', 'case_id', 'case_no', 'debtor_name', 'category', 'brand_model', 'police_no_vin', 'estimated_market_value', 'physical_status', 'warehouse_location', 'storage_fee_per_day', 'recovered_date', 'created_at', 'updated_at'],
  Collections: ['id', 'collection_no', 'case_id', 'case_no', 'debtor_name', 'client_type', 'client_name', 'action_type', 'personnel_id', 'personnel_name', 'amount_collected', 'collection_date', 'payment_method', 'receipt_no', 'verification_status', 'notes', 'photos', 'drive_folder_url', 'created_at', 'updated_at'],
  Asset_Recoveries: ['id', 'recovery_no', 'case_id', 'case_no', 'asset_id', 'asset_description', 'personnel_id', 'personnel_name', 'personnel_type', 'recovery_date', 'warehouse_location', 'physical_condition', 'vehicle_type', 'vehicle_year', 'has_stnk', 'has_key', 'tier_applied_name', 'tier_applied_basis', 'tier_base_amount', 'tier_modifiers_total', 'repossession_fee', 'company_fee_percent', 'company_fee_amount', 'partner_commission_amount', 'partner_payout_status', 'partner_transfer_date', 'partner_transfer_ref', 'partner_transfer_proof_url', 'partner_bank_name', 'partner_account_no', 'partner_account_name', 'paid_from_cash_account_id', 'status', 'bast_drive_url', 'created_at', 'updated_at'],
  Payments: ['id', 'payment_no', 'case_id', 'case_no', 'debtor_name', 'amount', 'payment_date', 'payment_type', 'payment_method', 'total_paid_by_debitur', 'success_fee_amount', 'execution_fee_amount', 'pass_through_fee', 'proof_url', 'allocation_summary', 'manual_splits', 'verification_status', 'verified_by', 'personnel_id', 'personnel_name', 'personnel_type', 'tier_applied_name', 'tier_applied_basis', 'tier_percent', 'gross_agency_fee', 'company_fee_percent', 'company_revenue_amount', 'partner_commission_percent', 'partner_commission_amount', 'partner_payout_status', 'partner_transfer_date', 'partner_transfer_ref', 'partner_transfer_proof_url', 'partner_bank_name', 'partner_account_no', 'partner_account_name', 'paid_from_cash_account_id', 'created_at', 'updated_at'],
  Funding: ['id', 'funding_no', 'case_id', 'case_no', 'debtor_name', 'purpose', 'requested_amount', 'funder_source', 'fee_or_interest_rate_percent', 'disbursed_date', 'status', 'approved_by', 'approved_at', 'repay_target_date', 'drive_proof_url', 'created_at', 'updated_at'],
  Expenses: ['id', 'expense_no', 'case_id', 'case_no', 'category', 'amount', 'requested_by', 'expense_date', 'description', 'status', 'approved_by', 'approved_at', 'drive_receipt_url', 'created_at', 'updated_at'],
  Settlements: ['id', 'settlement_no', 'case_id', 'case_no', 'client_id', 'client_name', 'total_collected', 'agency_fee_percent', 'agency_fee_amount', 'talangan_deducted', 'direct_expenses_deducted', 'net_remitted_to_client', 'settlement_date', 'status', 'approved_by', 'approved_at', 'drive_settlement_doc_url', 'created_at', 'updated_at'],
  Ledger: ['id', 'entry_no', 'date', 'account', 'type', 'amount', 'reference_module', 'reference_id', 'description', 'is_reversed', 'reversed_by_id', 'created_at', 'updated_at'],
  Cash: ['id', 'account_name', 'bank_name', 'account_no', 'account_holder', 'branch', 'balance', 'type', 'notes', 'last_updated', 'created_at', 'updated_at'],
  Petty_Cash: ['id', 'transaction_no', 'type', 'category', 'amount', 'transaction_date', 'recipient_or_source', 'personnel_id', 'personnel_name', 'requested_by_user_id', 'requested_by_user_name', 'case_id', 'case_no', 'description', 'proof_receipt_url', 'status', 'approved_by', 'approved_at', 'created_by_name', 'created_at', 'updated_at'],
  Working_Capital: ['id', 'transaction_no', 'type', 'source_or_funder', 'funder_type', 'target_allocation', 'amount', 'transaction_date', 'notes', 'proof_document_url', 'status', 'approved_by', 'created_by_name', 'created_at', 'updated_at'],
  Documents: ['id', 'doc_no', 'title', 'category', 'case_id', 'case_no', 'drive_folder_id', 'drive_folder_url', 'drive_file_id', 'drive_view_url', 'uploaded_by', 'uploaded_at', 'created_at', 'updated_at'],
  Drive_Folders: ['id', 'name', 'category', 'folder_url', 'description', 'case_id', 'case_no', 'is_system_default', 'created_at', 'updated_at'],
  Approvals: ['id', 'request_no', 'module', 'target_id', 'target_reference', 'title', 'requested_by', 'amount_or_value', 'description', 'status', 'reviewed_by', 'reviewed_at', 'rejection_reason', 'created_at', 'updated_at'],
  Notifications: ['id', 'title', 'message', 'type', 'for_role', 'is_read', 'created_at', 'updated_at'],
  Audit_Log: ['id', 'timestamp', 'username', 'user_role', 'action', 'module_name', 'target_id', 'details', 'ip_address', 'created_at'],
  Settings: ['key', 'value', 'description', 'updated_at']
};

/**
 * Helper: Ambil referensi Spreadsheet (ID, URL, atau create jika belum ada)
 */
function getSpreadsheet(spreadsheetId) {
  if (!spreadsheetId) throw new Error("Spreadsheet ID atau Nama Workbook diperlukan.");
  
  var cleanId = String(spreadsheetId).trim();

  // 1. Cek jika input adalah URL Spreadsheet lengkap
  if (cleanId.indexOf('docs.google.com/spreadsheets') !== -1) {
    return SpreadsheetApp.openByUrl(cleanId);
  }

  // 2. Cek jika input adalah ID Spreadsheet standar Google (biasanya > 25 karakter acak)
  if (cleanId.length > 20 && !cleanId.includes(' ')) {
    try {
      return SpreadsheetApp.openById(cleanId);
    } catch (e) {
      // Jika gagal, lanjut ke pencarian nama di Google Drive
    }
  }

  // 3. Cari berdasarkan nama file di Google Drive
  var files = DriveApp.getFilesByName(cleanId);
  while (files.hasNext()) {
    var file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.open(file);
    }
  }

  // 4. Jika terikat langsung pada Spreadsheet aktif (Bound Script)
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {}

  // 5. Jika belum ada file dengan nama tersebut sama sekali, buat baru secara otomatis di Google Drive
  var newSS = SpreadsheetApp.create(cleanId);
  return newSS;
}

/**
 * Helper untuk konversi nama properti camelCase <-> snake_case
 */
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, function(g) { return g[1].toUpperCase(); });
}

function toSnakeCase(str) {
  return str.replace(/[A-Z]/g, function(letter) { return "_" + letter.toLowerCase(); });
}

/**
 * PEMBERSIH NILAI SEL (ANTI ERROR 50,000 CHARACTERS):
 * Menjamin tidak ada sel yang melebihi batas 50,000 karakter Google Sheets.
 * Jika terdapat base64 gambar, simpan ke Google Drive atau truncate.
 */
function sanitizeCellValue(val, folderId) {
  if (val === undefined || val === null) {
    return '';
  }

  if (typeof val === 'boolean' || typeof val === 'number') {
    return val;
  }

  if (typeof val === 'object') {
    if (Array.isArray(val)) {
      // Jika array sederhana (misal list string ID / foto), gabungkan dengan koma
      if (val.length === 0) return '';
      if (typeof val[0] !== 'object') {
        var joined = val.join(', ');
        return joined.length > 45000 ? joined.substring(0, 45000) + '... [TRUNCATED]' : joined;
      }
    }
    // Jika objek / array kompleks
    try {
      var jsonStr = JSON.stringify(val);
      if (jsonStr.length > 45000) {
        return jsonStr.substring(0, 45000) + '... [TRUNCATED_50K_LIMIT]';
      }
      return jsonStr;
    } catch (e) {
      return String(val);
    }
  }

  var strVal = String(val);

  // Jika berupa base64 gambar raksasa (data:image/...)
  if (strVal.indexOf('data:image/') === 0) {
    // Unggah ke Google Drive secara instan agar tidak membebani cell sheet
    try {
      var match = strVal.match(/^data:(image\/[a-zA-Z0-9]+);base64,(.+)$/);
      if (match) {
        var mime = match[1];
        var b64Data = match[2];
        var ext = mime.replace('image/', '').replace('jpeg', 'jpg');
        var fileName = 'img_sync_' + Date.now() + '.' + ext;
        var blob = Utilities.newBlob(Utilities.base64Decode(b64Data), mime, fileName);
        var targetFolder = folderId ? DriveApp.getFolderById(folderId) : DriveApp.getRootFolder();
        var driveFile = targetFolder.createFile(blob);
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        return driveFile.getUrl();
      }
    } catch (e) {
      // Jika upload gagal, truncate agar tidak melanggar limit 50k karakter
      return '[BASE64_IMAGE_URL_TOO_LARGE]';
    }
  }

  // Batasi strictly pada 45,000 karakter (limit Google Sheet = 50,000)
  if (strVal.length > 45000) {
    return strVal.substring(0, 45000) + '... [TRUNCATED_50K_LIMIT]';
  }

  return strVal;
}

/**
 * 🛠️ FITUR: PERIKSA & BUAT STRUKTUR SHEET DAN KOLOM
 * Dipanggil oleh tombol "Periksa & Buat Struktur Kolom/Sheet" sebelum push data.
 * Memastikan semua 30 sheet dan kolom-kolomnya terbuat rapi di Spreadsheet target.
 */
function checkAndPrepareSheets(spreadsheetId, customTabMap) {
  try {
    var ss = getSpreadsheet(spreadsheetId);
    var existingSheets = ss.getSheets();
    var existingSheetNames = existingSheets.map(function(s) { return s.getName(); });
    
    var tabMap = customTabMap || {};
    var createdSheets = [];
    var existingConfigured = [];
    var totalColumnsAdded = 0;

    // Loop semua definisi tabel master
    for (var tabKey in MASTER_SCHEMA_COLUMNS) {
      if (!MASTER_SCHEMA_COLUMNS.hasOwnProperty(tabKey)) continue;

      var tabName = tabMap[tabKey] || tabMap[tabKey.toLowerCase()] || tabKey;
      var expectedColumns = MASTER_SCHEMA_COLUMNS[tabKey];
      var sheet;

      if (existingSheetNames.indexOf(tabName) === -1) {
        // Buat sheet baru jika belum ada
        sheet = ss.insertSheet(tabName);
        existingSheetNames.push(tabName);
        createdSheets.push(tabName);
      } else {
        sheet = ss.getSheetByName(tabName);
        existingConfigured.push(tabName);
      }

      // Periksa header di baris 1
      var lastCol = sheet.getLastColumn();
      var currentHeaders = [];
      if (lastCol > 0) {
        currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }

      // Jika baris header masih kosong atau tidak lengkap
      if (currentHeaders.length === 0 || currentHeaders[0] === '') {
        // Tulis seluruh kolom standar ke baris 1
        var headerRange = sheet.getRange(1, 1, 1, expectedColumns.length);
        headerRange.setValues([expectedColumns]);
        
        // Format Header yang elegan (Dark Slate Header, White Text, Bold, Freeze Row 1)
        headerRange.setBackground('#1e293b')
                   .setFontColor('#ffffff')
                   .setFontWeight('bold')
                   .setFontSize(10)
                   .setHorizontalAlignment('center');
        
        sheet.setFrozenRows(1);
        totalColumnsAdded += expectedColumns.length;
      } else {
        // Periksa apakah ada kolom yang kurang
        var missingColumns = [];
        for (var c = 0; c < expectedColumns.length; c++) {
          var colName = expectedColumns[c];
          if (currentHeaders.indexOf(colName) === -1 && currentHeaders.indexOf(toCamelCase(colName)) === -1) {
            missingColumns.push(colName);
          }
        }

        if (missingColumns.length > 0) {
          var startCol = currentHeaders.length + 1;
          var missingRange = sheet.getRange(1, startCol, 1, missingColumns.length);
          missingRange.setValues([missingColumns]);
          missingRange.setBackground('#334155')
                      .setFontColor('#f8fafc')
                      .setFontWeight('bold')
                      .setFontSize(10)
                      .setHorizontalAlignment('center');
          totalColumnsAdded += missingColumns.length;
        }
      }
    }

    // Rapikan Sheet1 default bawaan jika tidak dipakai
    try {
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Sheet 1');
      if (defaultSheet && existingSheetNames.length > 1) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) {}

    return {
      success: true,
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      spreadsheetName: ss.getName(),
      totalSheets: Object.keys(MASTER_SCHEMA_COLUMNS).length,
      createdSheets: createdSheets,
      existingSheets: existingConfigured,
      totalColumnsConfigured: totalColumnsAdded,
      message: 'Berhasil memeriksa dan menyiapkan ' + Object.keys(MASTER_SCHEMA_COLUMNS).length + ' Sheet dan struktur kolom lengkap.',
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      error: 'Gagal menyiapkan struktur spreadsheet: ' + err.toString()
    };
  }
}

/**
 * 🚀 SINKRONISASI DATA KE GOOGLE SHEETS
 * Membagi setiap data ke dalam kolom-kolom terpisah (BUKAN satu cell JSON utuh)
 * dan membatasi setiap cell agar aman di bawah 50,000 karakter.
 */
function syncSheets(spreadsheetId, data, tabMap) {
  try {
    if (!spreadsheetId) throw new Error("Spreadsheet ID diperlukan untuk sinkronisasi.");

    var ss = getSpreadsheet(spreadsheetId);
    var updatedTabs = [];
    var counts = {};
    var driveFolderId = null;

    if (data && data.settings && data.settings.googleDriveFolderId) {
      driveFolderId = data.settings.googleDriveFolderId;
    }

    for (var collectionKey in data) {
      if (!data.hasOwnProperty(collectionKey)) continue;

      var tabName = (tabMap && tabMap[collectionKey]) ? tabMap[collectionKey] : collectionKey;
      var records = data[collectionKey];

      // Pastikan sheet ada
      var sheet = ss.getSheetByName(tabName);
      if (!sheet) {
        sheet = ss.insertSheet(tabName);
      }

      // ====================================================================
      // 1. PENANGANAN KHUSUS TAB 'Settings' (Key - Value - Deskripsi)
      // ====================================================================
      if (collectionKey === 'settings') {
        var settingHeaders = ['key', 'value', 'description', 'updated_at'];
        var settingRows = [settingHeaders];

        var settingsObj = records || {};
        for (var sKey in settingsObj) {
          if (!settingsObj.hasOwnProperty(sKey)) continue;
          var sVal = settingsObj[sKey];

          // Jangan simpan base64 logo raksasa ke cell settings
          var cleanSVal = sanitizeCellValue(sVal, driveFolderId);
          settingRows.push([
            sKey,
            cleanSVal,
            'Pengaturan sistem ARMS (' + sKey + ')',
            new Date().toISOString()
          ]);
        }

        sheet.clear();
        var setRange = sheet.getRange(1, 1, settingRows.length, settingHeaders.length);
        setRange.setValues(settingRows);
        
        // Format Header
        sheet.getRange(1, 1, 1, settingHeaders.length)
             .setBackground('#1e293b')
             .setFontColor('#ffffff')
             .setFontWeight('bold')
             .setHorizontalAlignment('center');
        sheet.setFrozenRows(1);

        updatedTabs.push(tabName);
        counts[collectionKey] = settingRows.length - 1;
        continue;
      }

      // ====================================================================
      // 2. PENANGANAN KOLEKSI DATA REGULER (Users, Clients, Cases, SK, dll)
      // ====================================================================
      // Ambil kolom yang sudah ada di baris 1, atau gunakan skema master
      var expectedHeaders = MASTER_SCHEMA_COLUMNS[tabName] || MASTER_SCHEMA_COLUMNS[collectionKey] || [];
      var lastCol = sheet.getLastColumn();
      var currentHeaders = [];

      if (lastCol > 0) {
        currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      }

      var headersToUse = currentHeaders.length > 0 && currentHeaders[0] !== ''
        ? currentHeaders
        : expectedHeaders;

      // Jika belum ada header dan tidak ada di master, ambil dari keys record pertama
      if (headersToUse.length === 0 && Array.isArray(records) && records.length > 0) {
        headersToUse = Object.keys(records[0]);
      }

      // Jika tetap kosong (tidak ada data dan tidak ada master), lewati
      if (headersToUse.length === 0) {
        headersToUse = ['id', 'name', 'created_at', 'updated_at'];
      }

      var rowsMatrix = [];

      if (Array.isArray(records) && records.length > 0) {
        for (var r = 0; r < records.length; r++) {
          var item = records[r];
          var rowData = [];

          for (var h = 0; h < headersToUse.length; h++) {
            var col = headersToUse[h];
            var camelCol = toCamelCase(col);
            var snakeCol = toSnakeCase(col);

            // Cari nilai dari properti item (mendukung snake_case & camelCase)
            var rawVal = '';
            if (item[col] !== undefined) {
              rawVal = item[col];
            } else if (item[camelCol] !== undefined) {
              rawVal = item[camelCol];
            } else if (item[snakeCol] !== undefined) {
              rawVal = item[snakeCol];
            }

            // Sanitasi nilai sel untuk mencegah error > 50,000 karakter
            var safeVal = sanitizeCellValue(rawVal, driveFolderId);
            rowData.push(safeVal);
          }

          rowsMatrix.push(rowData);
        }
      }

      // Tulis ke Sheet
      // Selalu pastikan baris 1 adalah Header terformat
      sheet.getRange(1, 1, 1, headersToUse.length).setValues([headersToUse]);
      sheet.getRange(1, 1, 1, headersToUse.length)
           .setBackground('#1e293b')
           .setFontColor('#ffffff')
           .setFontWeight('bold')
           .setFontSize(10)
           .setHorizontalAlignment('center');
      sheet.setFrozenRows(1);

      // Bersihkan baris lama di bawah header jika ada
      var lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
      }

      // Jika ada baris data baru, tulis ke bawah header
      if (rowsMatrix.length > 0) {
        sheet.getRange(2, 1, rowsMatrix.length, headersToUse.length).setValues(rowsMatrix);
      }

      updatedTabs.push(tabName);
      counts[collectionKey] = rowsMatrix.length;
    }

    return {
      success: true,
      updatedTabs: updatedTabs,
      counts: counts,
      syncedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      error: 'Spreadsheet Sync Error: ' + err.toString()
    };
  }
}

/**
 * 📥 BACA DATA DARI GOOGLE SHEETS
 */
function fetchSheets(spreadsheetId, customTabMap) {
  try {
    var ss = getSpreadsheet(spreadsheetId);
    var tabMap = customTabMap || {};
    var data = {};

    var allSheets = ss.getSheets();
    for (var s = 0; s < allSheets.length; s++) {
      var sheet = allSheets[s];
      var sheetName = sheet.getName();

      // Cari collection key dari tabMap
      var collectionKey = sheetName;
      for (var k in tabMap) {
        if (tabMap[k] === sheetName) {
          collectionKey = k;
          break;
        }
      }

      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();

      if (lastRow <= 1 || lastCol === 0) {
        data[collectionKey] = [];
        continue;
      }

      var values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
      var headers = values.shift(); // Baris pertama adalah Header

      // Kasus khusus Settings
      if (collectionKey === 'settings' || sheetName === 'Settings') {
        var settingsObj = {};
        for (var i = 0; i < values.length; i++) {
          var row = values[i];
          var setKey = row[0];
          var setVal = row[1];
          if (setKey) {
            settingsObj[setKey] = setVal;
          }
        }
        data['settings'] = settingsObj;
        continue;
      }

      var items = [];
      for (var r = 0; r < values.length; r++) {
        var dataRow = values[r];
        var itemObj = {};
        var hasContent = false;

        for (var c = 0; c < headers.length; c++) {
          var colName = headers[c];
          var cellVal = dataRow[c];

          if (cellVal !== '') hasContent = true;

          // Coba parse jika string JSON
          if (typeof cellVal === 'string' && (cellVal.startsWith('{') || cellVal.startsWith('['))) {
            try {
              cellVal = JSON.parse(cellVal);
            } catch (e) {}
          }

          itemObj[toCamelCase(colName)] = cellVal;
        }

        if (hasContent) {
          items.push(itemObj);
        }
      }

      data[collectionKey] = items;
    }

    return {
      success: true,
      data: data,
      provider: 'google-sheets-gas',
      syncedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      error: 'Gagal membaca data Spreadsheet: ' + err.toString()
    };
  }
}

/**
 * 📁 BUAT / CARI FOLDER GOOGLE DRIVE
 */
function ensureDriveFolder(folderName, parentId) {
  try {
    var parent;
    if (parentId && String(parentId).trim()) {
      parent = DriveApp.getFolderById(String(parentId).trim());
    } else {
      parent = DriveApp.getRootFolder();
    }

    var folders = parent.getFoldersByName(folderName);
    if (folders.hasNext()) {
      var existing = folders.next();
      return { success: true, id: existing.getId(), url: existing.getUrl() };
    } else {
      var newFolder = parent.createFolder(folderName);
      return { success: true, id: newFolder.getId(), url: newFolder.getUrl() };
    }
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * 📁 DAFTAR SUBFOLDER GOOGLE DRIVE
 */
function listDriveSubfolders(parentFolderId, searchName) {
  try {
    var parent;
    if (parentFolderId && String(parentFolderId).trim()) {
      parent = DriveApp.getFolderById(String(parentFolderId).trim());
    } else {
      parent = DriveApp.getRootFolder();
    }
    var folders = parent.getFolders();
    var list = [];
    var searchLower = searchName ? String(searchName).toLowerCase() : '';
    while (folders.hasNext()) {
      var f = folders.next();
      var name = f.getName();
      if (!searchLower || name.toLowerCase().indexOf(searchLower) !== -1) {
        list.push({
          id: f.getId(),
          name: name,
          mimeType: 'application/vnd.google-apps.folder',
          webViewLink: f.getUrl()
        });
      }
    }
    return { success: true, folders: list };
  } catch (e) {
    return { success: false, error: e.toString(), folders: [] };
  }
}

/**
 * 📁 METADATA FOLDER GOOGLE DRIVE
 */
function getDriveFolderMetadata(folderId) {
  try {
    var folder;
    if (folderId && String(folderId).trim()) {
      folder = DriveApp.getFolderById(String(folderId).trim());
    } else {
      folder = DriveApp.getRootFolder();
    }
    return {
      success: true,
      id: folder.getId(),
      name: folder.getName(),
      mimeType: 'application/vnd.google-apps.folder',
      webViewLink: folder.getUrl()
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

/**
 * ☁️ UPLOAD FILE KE GOOGLE DRIVE
 */
function uploadToDrive(base64Data, filename, mimeType, folderId) {
  try {
    var cleanBase64 = String(base64Data);
    if (cleanBase64.indexOf(',') !== -1) {
      cleanBase64 = cleanBase64.split(',')[1];
    }

    var blob = Utilities.newBlob(Utilities.base64Decode(cleanBase64), mimeType || 'image/jpeg', filename || 'file.jpg');
    var folder = (folderId && String(folderId).trim())
      ? DriveApp.getFolderById(String(folderId).trim())
      : DriveApp.getRootFolder();

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    return {
      success: true,
      id: file.getId(),
      fileId: file.getId(),
      fileName: filename,
      url: file.getUrl(),
      webViewLink: file.getUrl(),
      directViewUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w800'
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}
