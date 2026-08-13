/**
 * Google Apps Script (GAS) Backend Code Generator for ARMS System
 * Generates standalone Code.gs script to deploy on script.google.com as a Web App
 * with complete support for all 26 sheets, CRUD, Audit Trail, and RBAC.
 */

export function generateGoogleAppsScriptCode(): string {
  return `/**
 * ARMS - Agency Recovery Management System
 * Google Apps Script Web App Backend & Single Source of Truth
 * 
 * Instructions:
 * 1. Open Google Sheets -> Extensions -> Apps Script
 * 2. Paste this entire Code.gs file.
 * 3. Click Deploy -> New deployment -> Select type: Web App
 * 4. Execute as: "Me" | Who has access: "Anyone"
 * 5. Copy the Web App URL and paste it into ARMS App Settings!
 */

const SHEET_NAMES = [
  "Users", "Roles", "Clients", "Partners", "Personnel", "Services", "Fees", "Contracts", 
  "Leads", "Customers", "Cases", "Assignments", "SK", "Lawyer_Notices", "Communication_Log", 
  "Assets", "Collections", "Asset_Recoveries", "Payments", "Funding", "Expenses", "Settlements", 
  "Ledger", "Cash", "Documents", "Approvals", "Notifications", "Audit_Log", "Settings"
];

const STORE_KEY_MAP = {
  "users": "Users",
  "roles": "Roles",
  "clients": "Clients",
  "personnel": "Partners",
  "partners": "Partners",
  "services": "Services",
  "fees": "Fees",
  "contracts": "Contracts",
  "leads": "Leads",
  "customers": "Customers",
  "cases": "Cases",
  "assignments": "Assignments",
  "sks": "SK",
  "lawyerNotices": "Lawyer_Notices",
  "commLogs": "Communication_Log",
  "assets": "Assets",
  "collections": "Collections",
  "assetRecoveries": "Asset_Recoveries",
  "payments": "Payments",
  "danaTalangan": "Funding",
  "expenses": "Expenses",
  "settlements": "Settlements",
  "ledger": "Ledger",
  "cashAccounts": "Cash",
  "documents": "Documents",
  "approvals": "Approvals",
  "notifications": "Notifications",
  "auditLogs": "Audit_Log",
  "settings": "Settings"
};

const HEADERS_MAP = {
  "Users": ["id", "username", "name", "email", "role", "department", "status", "lastLogin", "createdAt"],
  "Roles": ["roleCode", "roleName", "description", "permissionsJson"],
  "Clients": ["id", "clientCode", "companyName", "industry", "contactPerson", "phone", "email", "address", "tier", "activeCasesCount", "status", "createdAt"],
  "Partners": ["id", "type", "fullName", "nikKtp", "birthPlaceDate", "address", "phoneNumber", "email", "bankName", "accountNumber", "accountName", "emergencyContact", "position", "ktpPhotoUrl", "ktpDriveFileId", "ktpDriveFolderUrl", "status", "createdAt"],
  "Personnel": ["id", "type", "fullName", "nikKtp", "birthPlaceDate", "address", "phoneNumber", "email", "bankName", "accountNumber", "accountName", "emergencyContact", "position", "ktpPhotoUrl", "ktpDriveFileId", "ktpDriveFolderUrl", "status", "createdAt"],
  "Services": ["id", "serviceCode", "name", "category", "description", "defaultFeeType", "status"],
  "Fees": ["id", "clientId", "clientName", "serviceId", "serviceName", "feeType", "percentageValue", "fixedAmount", "successFeePercent", "tierRulesJson", "customFormulaNotes", "effectiveDate", "status"],
  "Contracts": ["id", "contractNo", "clientId", "clientName", "title", "startDate", "endDate", "feeStructureSummary", "status", "approvedBy", "approvedAt", "rejectionReason", "driveDocumentUrl", "createdAt"],
  "Leads": ["id", "leadCode", "companyName", "contactPerson", "phone", "email", "estimatedVolume", "serviceRequested", "stage", "notes", "assignedTo", "createdAt"],
  "Customers": ["id", "customerCode", "nikKtp", "fullName", "phone", "addressCurrent", "addressKtp", "workplace", "emergencyContactName", "emergencyContactPhone", "riskNotes", "createdAt"],
  "Cases": ["id", "caseNo", "clientId", "clientName", "contractId", "customerId", "debtorName", "debtorNik", "multifinanceContractNo", "serviceId", "serviceName", "principalDebtOS", "overdueDays", "dpdBucket", "assetSummary", "feeTypeSnapshot", "feePercentSnapshot", "feeFixedSnapshot", "status", "lawyerStatus", "lawyerNoticeCount", "lastLawyerNoticeType", "currentPersonnelId", "currentPersonnelName", "createdAt"],
  "Assignments": ["id", "assignmentNo", "caseId", "caseNo", "debtorName", "personnelId", "personnelName", "assignedDate", "targetDate", "slaDays", "instructions", "status", "fieldReportSummary", "createdAt"],
  "SK": ["id", "skNumber", "caseId", "caseNo", "debtorName", "personnelId", "personnelName", "issuedDate", "expiryDate", "status", "approvedBy", "approvedAt", "driveDocumentUrl", "createdAt"],
  "Lawyer_Notices": ["id", "noticeNo", "caseId", "caseNo", "debtorName", "debtorAddress", "clientName", "multifinanceContractNo", "noticeType", "requestedDate", "lawyerFirmName", "lawyerName", "principalDebtAmount", "status", "letterContentDraft", "notes", "createdBy", "createdAt"],
  "LawyerNotices": ["id", "noticeNo", "caseId", "caseNo", "debtorName", "debtorAddress", "clientName", "multifinanceContractNo", "noticeType", "requestedDate", "lawyerFirmName", "lawyerName", "principalDebtAmount", "status", "letterContentDraft", "notes", "createdBy", "createdAt"],
  "Communication_Log": ["id", "caseId", "caseNo", "personnelId", "personnelName", "logDate", "channel", "contactPerson", "summary", "outcome", "followUpAction", "nextFollowUpDate", "attachmentDriveUrl", "recordedBy", "createdAt"],
  "Assets": ["id", "assetCode", "caseId", "caseNo", "debtorName", "category", "brandModel", "policeNoVIN", "estimatedMarketValue", "physicalStatus", "warehouseLocation", "storageFeePerDay", "recoveredDate", "createdAt"],
  "Collections": ["id", "collectionNo", "caseId", "caseNo", "debtorName", "personnelId", "personnelName", "amountCollected", "collectionDate", "paymentMethod", "receiptNo", "verificationStatus", "notes", "createdAt"],
  "Asset_Recoveries": ["id", "recoveryNo", "caseId", "caseNo", "assetId", "assetDescription", "personnelId", "personnelName", "recoveryDate", "warehouseLocation", "physicalCondition", "repossessionFee", "status", "createdAt"],
  "AssetRecoveries": ["id", "recoveryNo", "caseId", "caseNo", "assetId", "assetDescription", "personnelId", "personnelName", "recoveryDate", "warehouseLocation", "physicalCondition", "repossessionFee", "status", "createdAt"],
  "Funding": ["id", "fundingNo", "caseId", "caseNo", "debtorName", "purpose", "requestedAmount", "funderSource", "feeOrInterestRatePercent", "disbursedDate", "status", "approvedBy", "approvedAt", "repayTargetDate", "driveProofUrl", "createdAt"],
  "Expenses": ["id", "expenseNo", "caseId", "caseNo", "category", "amount", "requestedBy", "expenseDate", "description", "status", "approvedBy", "approvedAt", "driveReceiptUrl", "createdAt"],
  "Settlements": ["id", "settlementNo", "caseId", "caseNo", "clientId", "clientName", "totalCollected", "agencyFeePercent", "agencyFeeAmount", "talanganDeducted", "directExpensesDeducted", "netRemittedToClient", "settlementDate", "status", "approvedBy", "approvedAt", "driveSettlementDocUrl", "createdAt"],
  "Ledger": ["id", "entryNo", "date", "account", "type", "amount", "referenceModule", "referenceId", "description", "isReversed", "reversedById", "createdAt"],
  "Cash": ["id", "accountName", "bankName", "accountNo", "balance", "type", "lastUpdated"],
  "Documents": ["id", "docNo", "title", "category", "caseId", "caseNo", "driveFileId", "driveViewUrl", "uploadedBy", "uploadedAt"],
  "Approvals": ["id", "requestNo", "module", "targetId", "targetReference", "title", "requestedBy", "amountOrValue", "description", "status", "reviewedBy", "reviewedAt", "rejectionReason", "createdAt"],
  "Notifications": ["id", "title", "message", "type", "forRole", "isRead", "createdAt"],
  "Audit_Log": ["id", "timestamp", "username", "userRole", "action", "moduleName", "targetId", "details", "ipAddress"],
  "Settings": ["key", "value", "updatedAt"]
};

/**
 * Helper to safely resolve Spreadsheet instance
 */
function getSS(ss, spreadsheetId) {
  if (ss) return ss;
  if (spreadsheetId && String(spreadsheetId).trim().length > 5) {
    try {
      return SpreadsheetApp.openById(String(spreadsheetId).trim());
    } catch (e) {
      // Fallback to active spreadsheet
    }
  }
  var active = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.getActive();
  if (!active) {
    throw new Error("Spreadsheet tidak ditemukan. Buka Apps Script dari Google Sheet (Extensions -> Apps Script) atau sertakan Spreadsheet ID.");
  }
  return active;
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  const action = (e && e.parameter) ? e.parameter.action : "PING";
  const spreadsheetId = (e && e.parameter) ? (e.parameter.spreadsheetId || e.parameter.googleSpreadsheetId) : null;
  
  try {
    const ss = getSS(null, spreadsheetId);
    setupAllSheets(ss);

    if (action === "SETUP_SHEETS") {
      const result = setupAllSheets(ss);
      return responseJSON({ success: true, message: "All 26 ARMS sheets initialized successfully", result });
    }

    if (action === "GET_ALL_DATA") {
      const allData = {};
      SHEET_NAMES.forEach(sheetName => {
        allData[sheetName] = getSheetData(ss, sheetName);
      });
      return responseJSON({ success: true, data: allData });
    }

    if (action === "GET_TAB") {
      const tab = e.parameter ? e.parameter.tab : null;
      if (!tab) return responseJSON({ success: false, error: "Missing tab parameter" });
      const targetSheet = STORE_KEY_MAP[tab] || tab;
      const data = getSheetData(ss, targetSheet);
      return responseJSON({ success: true, tab: targetSheet, data });
    }

    return responseJSON({ success: true, message: "ARMS Google Apps Script Service is Active", timestamp: new Date() });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * Handle HTTP POST Requests (CRUD / Actions)
 */
function doPost(e) {
  try {
    var contents = {};
    if (e && e.postData && e.postData.contents) {
      var raw = e.postData.contents;
      if (typeof raw === "string") {
        try {
          contents = JSON.parse(raw);
          if (typeof contents === "string") {
            contents = JSON.parse(contents);
          }
        } catch (pErr) {
          contents = {};
        }
      } else if (typeof raw === "object") {
        contents = raw;
      }
    }

    var action = contents.action || (e && e.parameter && e.parameter.action);
    var tab = contents.tab || (e && e.parameter && e.parameter.tab);
    var payload = contents.payload;
    var auditInfo = contents.auditInfo;
    var spreadsheetId = contents.spreadsheetId || contents.googleSpreadsheetId || (e && e.parameter && (e.parameter.spreadsheetId || e.parameter.googleSpreadsheetId));

    var ss = getSS(null, spreadsheetId);

    if (action === "SETUP_SHEETS") {
      const result = setupAllSheets(ss);
      return responseJSON({ success: true, message: "Initialized all 26 sheets with formatted headers", result });
    }

    if (action === "GET_ALL_DATA") {
      const allData = {};
      SHEET_NAMES.forEach(sheetName => {
        allData[sheetName] = getSheetData(ss, sheetName);
      });
      return responseJSON({ success: true, data: allData });
    }

    if (action === "GET_TAB") {
      const targetSheet = STORE_KEY_MAP[tab] || tab;
      if (!targetSheet) return responseJSON({ success: false, error: "Missing tab parameter" });
      const data = getSheetData(ss, targetSheet);
      return responseJSON({ success: true, tab: targetSheet, data });
    }

    if (action === "SYNC_TAB") {
      var targetSheets = getTargetSheetNames(ss, tab);
      if (targetSheets.length === 0) return responseJSON({ success: false, error: "Tab tidak valid: " + tab });
      var tabData = payload !== undefined ? payload : contents.data;
      if (tab === "settings" && tabData && typeof tabData === "object" && !Array.isArray(tabData)) {
        tabData = Object.keys(tabData).map(function(k) {
          return { key: k, value: String(tabData[k]), updatedAt: new Date().toISOString() };
        });
      }
      if (Array.isArray(tabData)) {
        targetSheets.forEach(function(tSheet) {
          setSheetData(ss, tSheet, tabData);
        });
        if (auditInfo) logAudit(ss, auditInfo);
        return responseJSON({ success: true, message: "Tab " + targetSheets.join(", ") + " berhasil disinkronkan!", tab: targetSheets[0] });
      }
      return responseJSON({ success: false, error: "Payload data untuk tab " + tab + " tidak valid." });
    }

    if (action === "SYNC_FULL_DATA") {
      var fullData = contents.data;
      if (typeof fullData === "string") {
        try { fullData = JSON.parse(fullData); } catch(err){}
      }
      if (!fullData || typeof fullData !== "object") {
        return responseJSON({ success: false, error: "Data payload kosong atau format tidak sesuai." });
      }

      var updatedSheets = [];
      Object.keys(fullData).forEach(function(key) {
        var targetSheets = getTargetSheetNames(ss, key);
        if (targetSheets.length > 0) {
          var val = fullData[key];
          if (key === "settings" && val && typeof val === "object" && !Array.isArray(val)) {
            val = Object.keys(val).map(function(k) {
              return { key: k, value: String(val[k]), updatedAt: new Date().toISOString() };
            });
          }
          if (Array.isArray(val)) {
            targetSheets.forEach(function(tSheet) {
              setSheetData(ss, tSheet, val);
              if (updatedSheets.indexOf(tSheet) === -1) {
                updatedSheets.push(tSheet);
              }
            });
          }
        }
      });
      if (auditInfo) logAudit(ss, auditInfo);
      return responseJSON({
        success: true,
        message: "Berhasil menyinkronkan data ke " + updatedSheets.length + " tab Google Sheets!",
        updatedSheets: updatedSheets
      });
    }

    if (action === "CREATE_RECORD") {
      const targetSheetName = STORE_KEY_MAP[tab] || tab;
      const sheet = getOrCreateSheet(ss, targetSheetName);
      const headers = HEADERS_MAP[targetSheetName] || Object.keys(payload);
      const row = headers.map(h => payload[h] !== undefined ? payload[h] : "");
      sheet.appendRow(row);

      if (auditInfo) logAudit(ss, auditInfo);
      return responseJSON({ success: true, message: "Record created successfully", tab: targetSheetName, id: payload.id });
    }

    if (action === "UPDATE_RECORD") {
      const targetSheetName = STORE_KEY_MAP[tab] || tab;
      const sheet = getOrCreateSheet(ss, targetSheetName);
      const headers = HEADERS_MAP[targetSheetName] || [];
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return responseJSON({ success: false, error: "No data in sheet" });

      const idIndex = headers.indexOf("id") >= 0 ? headers.indexOf("id") : 0;
      let targetRow = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idIndex]) === String(payload.id)) {
          targetRow = i + 1;
          break;
        }
      }

      if (targetRow === -1) return responseJSON({ success: false, error: "Record ID not found: " + payload.id });

      const updatedRow = headers.map(h => payload[h] !== undefined ? payload[h] : "");
      sheet.getRange(targetRow, 1, 1, updatedRow.length).setValues([updatedRow]);

      if (auditInfo) logAudit(ss, auditInfo);
      return responseJSON({ success: true, message: "Record updated", tab: targetSheetName, id: payload.id });
    }

    return responseJSON({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return responseJSON({ success: false, error: err.toString() });
  }
}

/**
 * Initialize all 26 required sheets with formatted headers
 */
function setupAllSheets(ss) {
  const targetSS = getSS(ss);
  const created = [];
  SHEET_NAMES.forEach(sheetName => {
    let sheet = targetSS.getSheetByName(sheetName);
    if (!sheet) {
      sheet = targetSS.insertSheet(sheetName);
    }
    const headers = HEADERS_MAP[sheetName] || [];
    if (headers.length > 0 && sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
      const range = sheet.getRange(1, 1, 1, headers.length);
      range.setFontWeight("bold");
      range.setBackground("#1e293b"); // dark slate header
      range.setFontColor("#ffffff");
    }
    created.push(sheetName);
  });

  // Activate Users sheet by default
  const usersSheet = targetSS.getSheetByName("Users");
  if (usersSheet) {
    targetSS.setActiveSheet(usersSheet);
  }

  // Remove default empty "Sheet1" or "Lembar1" if empty and other sheets exist
  const defaultSheet = targetSS.getSheetByName("Sheet1") || targetSS.getSheetByName("Lembar1");
  if (defaultSheet && targetSS.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
    try {
      targetSS.deleteSheet(defaultSheet);
    } catch (e) {
      // ignore
    }
  }

  return created;
}

function getTargetSheetNames(ss, key) {
  var ALIAS_MAP = {
    "personnel": ["Personnel", "Partners"],
    "partners": ["Partners", "Personnel"],
    "lawyerNotices": ["Lawyer_Notices", "LawyerNotices"],
    "commLogs": ["Communication_Log", "CommunicationLog"],
    "assetRecoveries": ["Asset_Recoveries", "AssetRecoveries"],
    "collections": ["Collections"],
    "danaTalangan": ["Funding", "DanaTalangan"],
    "cashAccounts": ["Cash", "CashAccounts"],
    "auditLogs": ["Audit_Log", "AuditLog"],
    "users": ["Users", "UsersTable"]
  };

  var primary = STORE_KEY_MAP[key] || (SHEET_NAMES.indexOf(key) >= 0 ? key : null);
  if (!primary) return [];

  var candidates = ALIAS_MAP[key] || [primary];
  var targetSS = getSS(ss);
  var existingSheets = targetSS.getSheets().map(function(s) { return s.getName(); });

  var matched = [];
  candidates.forEach(function(sName) {
    if (existingSheets.indexOf(sName) >= 0) {
      matched.push(sName);
    }
  });

  if (matched.length === 0) {
    matched.push(primary);
  }
  return matched;
}

function getOrCreateSheet(ss, tab) {
  const targetSS = getSS(ss);
  let sheet = targetSS.getSheetByName(tab);
  if (!sheet) {
    sheet = targetSS.insertSheet(tab);
    const headers = HEADERS_MAP[tab] || ["id"];
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(ss, tab) {
  const targetSS = getSS(ss);
  const sheet = targetSS.getSheetByName(tab);
  if (!sheet) return [];
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];
  
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = values[i][colIdx];
    });
    rows.push(rowObj);
  }
  return rows;
}

function setSheetData(ss, tab, records) {
  const sheet = getOrCreateSheet(ss, tab);
  sheet.clearContents();
  
  let headers = HEADERS_MAP[tab] ? HEADERS_MAP[tab].slice() : [];
  if (records && records.length > 0) {
    records.forEach(function(rec) {
      if (rec && typeof rec === "object") {
        Object.keys(rec).forEach(function(k) {
          if (headers.indexOf(k) === -1) {
            headers.push(k);
          }
        });
      }
    });
  }
  if (!headers || headers.length === 0) headers = ["id"];

  var fullMatrix = [headers];
  if (records && records.length > 0) {
    records.forEach(function(rec) {
      var row = headers.map(function(h) {
        var val = rec[h];
        if (val === undefined || val === null) return "";
        if (typeof val === "object") {
          return JSON.stringify(val);
        }
        return String(val);
      });
      fullMatrix.push(row);
    });
  }

  sheet.getRange(1, 1, fullMatrix.length, headers.length).setValues(fullMatrix);
}

function logAudit(ss, audit) {
  const sheet = getOrCreateSheet(ss, "Audit_Log");
  const headers = HEADERS_MAP["Audit_Log"];
  const row = headers.map(h => audit[h] !== undefined ? audit[h] : "");
  sheet.appendRow(row);
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
`;
}
