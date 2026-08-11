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
  "Users", "Roles", "Clients", "Partners", "Services", "Fees", "Contracts", 
  "Leads", "Customers", "Cases", "Assignments", "SK", "Communication_Log", 
  "Assets", "Collections", "Payments", "Funding", "Expenses", "Settlements", 
  "Ledger", "Cash", "Documents", "Approvals", "Notifications", "Audit_Log", "Settings"
];

const STORE_KEY_MAP = {
  "users": "Users",
  "roles": "Roles",
  "clients": "Clients",
  "partners": "Partners",
  "services": "Services",
  "fees": "Fees",
  "contracts": "Contracts",
  "leads": "Leads",
  "customers": "Customers",
  "cases": "Cases",
  "assignments": "Assignments",
  "sks": "SK",
  "commLogs": "Communication_Log",
  "assets": "Assets",
  "collections": "Collections",
  "assetRecoveries": "Collections",
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
  "Partners": ["id", "partnerCode", "name", "type", "coverageRegion", "contactPerson", "phoneWhatsApp", "bankName", "bankAccountNo", "bankAccountName", "ratingNotes", "activeAssignmentsCount", "status", "createdAt"],
  "Services": ["id", "serviceCode", "name", "category", "description", "defaultFeeType", "status"],
  "Fees": ["id", "clientId", "clientName", "serviceId", "serviceName", "feeType", "percentageValue", "fixedAmount", "successFeePercent", "tierRulesJson", "customFormulaNotes", "effectiveDate", "status"],
  "Contracts": ["id", "contractNo", "clientId", "clientName", "title", "startDate", "endDate", "feeStructureSummary", "status", "approvedBy", "approvedAt", "rejectionReason", "driveDocumentUrl", "createdAt"],
  "Leads": ["id", "leadCode", "companyName", "contactPerson", "phone", "email", "estimatedVolume", "serviceRequested", "stage", "notes", "assignedTo", "createdAt"],
  "Customers": ["id", "customerCode", "nikKtp", "fullName", "phone", "addressCurrent", "addressKtp", "workplace", "emergencyContactName", "emergencyContactPhone", "riskNotes", "createdAt"],
  "Cases": ["id", "caseNo", "clientId", "clientName", "contractId", "customerId", "debtorName", "debtorNik", "multifinanceContractNo", "serviceId", "serviceName", "principalDebtOS", "overdueDays", "dpdBucket", "assetSummary", "feeTypeSnapshot", "feePercentSnapshot", "feeFixedSnapshot", "status", "currentPartnerId", "currentPartnerName", "createdAt"],
  "Assignments": ["id", "assignmentNo", "caseId", "caseNo", "debtorName", "partnerId", "partnerName", "assignedDate", "targetDate", "slaDays", "instructions", "status", "fieldReportSummary", "createdAt"],
  "SK": ["id", "skNumber", "caseId", "caseNo", "debtorName", "partnerId", "partnerName", "issuedDate", "expiryDate", "status", "approvedBy", "approvedAt", "driveDocumentUrl", "createdAt"],
  "Communication_Log": ["id", "caseId", "caseNo", "partnerId", "partnerName", "logDate", "channel", "contactPerson", "summary", "outcome", "followUpAction", "nextFollowUpDate", "attachmentDriveUrl", "recordedBy", "createdAt"],
  "Assets": ["id", "assetCode", "caseId", "caseNo", "debtorName", "category", "brandModel", "policeNoVIN", "estimatedMarketValue", "physicalStatus", "warehouseLocation", "storageFeePerDay", "recoveredDate", "createdAt"],
  "Collections": ["id", "collectionNo", "caseId", "caseNo", "debtorName", "partnerId", "partnerName", "amountCollected", "collectionDate", "paymentMethod", "receiptNo", "verificationStatus", "notes", "createdAt"],
  "Payments": ["id", "paymentNo", "caseId", "caseNo", "debtorName", "amount", "paymentDate", "paymentType", "proofUrl", "allocationSummary", "verificationStatus", "verifiedBy", "createdAt"],
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
 * Handle HTTP GET Requests
 */
function doGet(e) {
  const action = e.parameter ? e.parameter.action : "PING";
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
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
      const tab = e.parameter.tab;
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  try {
    setupAllSheets(ss);

    const contents = JSON.parse((e && e.postData && e.postData.contents) ? e.postData.contents : "{}");
    const action = contents.action;
    const tab = contents.tab;
    const payload = contents.payload;
    const auditInfo = contents.auditInfo;

    if (action === "SETUP_SHEETS") {
      const result = setupAllSheets(ss);
      return responseJSON({ success: true, message: "Initialized all 26 sheets with formatted headers", result });
    }

    if (action === "SYNC_FULL_DATA") {
      // Overwrite / sync full dataset from web app
      const fullData = contents.data;
      if (fullData) {
        Object.keys(fullData).forEach(key => {
          const sheetName = STORE_KEY_MAP[key] || (SHEET_NAMES.includes(key) ? key : null);
          if (sheetName) {
            let val = fullData[key];
            if (key === "settings" && val && typeof val === "object" && !Array.isArray(val)) {
              val = Object.keys(val).map(k => ({ key: k, value: String(val[k]), updatedAt: new Date().toISOString() }));
            }
            if (Array.isArray(val)) {
              setSheetData(ss, sheetName, val);
            }
          }
        });
        if (auditInfo) logAudit(ss, auditInfo);
        return responseJSON({ success: true, message: "Full dataset synchronized to all 26 Google Sheets!" });
      }
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
  const created = [];
  SHEET_NAMES.forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
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
  return created;
}

function getOrCreateSheet(ss, tab) {
  let sheet = ss.getSheetByName(tab);
  if (!sheet) {
    sheet = ss.insertSheet(tab);
    const headers = HEADERS_MAP[tab] || ["id"];
    sheet.appendRow(headers);
  }
  return sheet;
}

function getSheetData(ss, tab) {
  const sheet = ss.getSheetByName(tab);
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
  const headers = HEADERS_MAP[tab] || (records.length > 0 ? Object.keys(records[0]) : ["id"]);
  sheet.appendRow(headers);
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");

  if (records && records.length > 0) {
    const rows = records.map(rec => headers.map(h => rec[h] !== undefined ? rec[h] : ""));
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
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
