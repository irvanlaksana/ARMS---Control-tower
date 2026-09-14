/**
 * ============================================================================
 *  ARMS — Control Tower :: MOCK RUNTIME GOOGLE APPS SCRIPT (untuk pengujian)
 * ============================================================================
 *  Menyediakan tiruan SpreadsheetApp / DriveApp / PropertiesService / Session /
 *  Utilities / UrlFetchApp / ContentService / HtmlService, lalu memuat seluruh
 *  berkas `appsscript/*.gs` ke dalam VM Node sehingga logika backend dapat diuji
 *  tanpa deploy.
 *
 *  Dipakai oleh:
 *    - scripts/test-gas-backend.mjs  (uji handler Apps Script)
 *    - scripts/test-gas-bridge.mjs   (uji jalur frontend → Apps Script)
 * ============================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, '..', '..');
export const GAS_DIR = path.join(ROOT, 'appsscript');

/* ======================================================================== *
 *  MOCK LAYANAN GOOGLE
 * ======================================================================== */

class MockRange {
  constructor(sheet, row, col, numRows, numCols) {
    this.sheet = sheet;
    this.row = row;
    this.col = col;
    this.numRows = numRows;
    this.numCols = numCols;
  }
  getValues() {
    const out = [];
    for (let r = 0; r < this.numRows; r++) {
      const srcRow = this.sheet.data[this.row - 1 + r] || [];
      const line = [];
      for (let c = 0; c < this.numCols; c++) {
        const value = srcRow[this.col - 1 + c];
        line.push(value === undefined ? '' : value);
      }
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    for (let r = 0; r < values.length; r++) {
      const targetRow = this.row - 1 + r;
      while (this.sheet.data.length <= targetRow) this.sheet.data.push([]);
      for (let c = 0; c < values[r].length; c++) {
        const targetCol = this.col - 1 + c;
        const text = values[r][c];
        if (typeof text === 'string' && text.length > 50000) {
          throw new Error('The data validation rule has failed: cell exceeds 50000 characters');
        }
        this.sheet.data[targetRow][targetCol] = text === undefined || text === null ? '' : text;
      }
    }
    return this;
  }
  getValue() {
    return this.getValues()[0][0];
  }
}

class MockSheet {
  constructor(name, ss) {
    this.name = name;
    this.ss = ss;
    this.data = [];
    this.frozenRows = 0;
  }
  getName() {
    return this.name;
  }
  getLastRow() {
    return this.data.filter((row) => row.some((cell) => cell !== '' && cell !== undefined && cell !== null)).length;
  }
  getLastColumn() {
    return this.data.reduce((max, row) => Math.max(max, row.length), 0);
  }
  getRange(row, col, numRows = 1, numCols = 1) {
    return new MockRange(this, row, col, numRows, numCols);
  }
  clear() {
    this.data = [];
    return this;
  }
  clearContents() {
    this.data = this.data.map((row) => row.map(() => ''));
    return this;
  }
  setFrozenRows(n) {
    this.frozenRows = n;
    return this;
  }
  getParent() {
    return this.ss;
  }
  getSheetId() {
    return this.name;
  }
}

class MockSpreadsheet {
  constructor(id, name, ownerEmail) {
    this.id = id;
    this.name = name;
    this.ownerEmail = ownerEmail || 'owner@arms.test';
    this.sheets = new Map();
    const first = new MockSheet('Sheet1', this);
    this.sheets.set('Sheet1', first);
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  getUrl() {
    return `https://docs.google.com/spreadsheets/d/${this.id}/edit`;
  }
  getOwner() {
    return { getEmail: () => this.ownerEmail };
  }
  getSheetByName(name) {
    return this.sheets.get(name) || null;
  }
  insertSheet(name) {
    if (this.sheets.has(name)) return this.sheets.get(name);
    const sheet = new MockSheet(name, this);
    this.sheets.set(name, sheet);
    return sheet;
  }
  getSheets() {
    return Array.from(this.sheets.values());
  }
}

export class MockFolder {
  constructor(id, name, parent) {
    this.id = id;
    this.name = name;
    this.parent = parent || null;
    this.children = [];
    this.files = [];
  }
  getId() {
    return this.id;
  }
  getName() {
    return this.name;
  }
  getUrl() {
    return `https://drive.google.com/drive/folders/${this.id}`;
  }
  createFolder(name) {
    const folder = new MockFolder(fakeGoogleId('FLD'), name, this);
    this.children.push(folder);
    mockState.folders.set(folder.id, folder);
    return folder;
  }
  createFile(blob) {
    const file = {
      id: fakeGoogleId('FILE'),
      name: blob.getName(),
      mimeType: blob.getContentType(),
      bytes: blob.getBytes(),
      sharing: null,
      getId() {
        return this.id;
      },
      getName() {
        return this.name;
      },
      getUrl() {
        return `https://drive.google.com/file/d/${this.id}/view`;
      },
      setSharing(access, permission) {
        this.sharing = { access, permission };
      },
      getMimeType() {
        return this.mimeType;
      },
      /** Ukuran berkas (byte) — dipakai proxy preview /api/drive/file. */
      getSize() {
        return this.bytes ? this.bytes.length : 0;
      },
      /** Blob isi berkas — dipakai proxy preview /api/drive/file. */
      getBlob() {
        return {
          getBytes: () => this.bytes,
          getName: () => this.name,
          getContentType: () => this.mimeType,
          copyBlob: () => this.getBlob(),
        };
      },
    };
    this.files.push(file);
    mockState.files.set(file.id, file);
    return file;
  }
  getFoldersByName(name) {
    const matches = this.children.filter((child) => child.name === name);
    return makeIterator(matches);
  }
}

/** ID tiruan bergaya Google (>= 25 karakter base64url) agar lolos validasi frontend. */
function fakeGoogleId(prefix) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let out = '';
  for (let i = 0; i < 28; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `${prefix}${out}`;
}

function makeIterator(items) {
  let index = 0;
  return {
    hasNext() {
      return index < items.length;
    },
    next() {
      return items[index++];
    },
  };
}

export const mockState = {
  seq: 0,
  spreadsheets: new Map(),
  folders: new Map(),
  files: new Map(),
  properties: new Map(),
  activeSpreadsheet: null,
  urlFetchLog: [],
};

function createSpreadsheet(name) {
  const ss = new MockSpreadsheet(`SS-${++mockState.seq}`, name);
  mockState.spreadsheets.set(ss.id, ss);
  return ss;
}

const DriveAppMock = {
  Access: { ANYONE_WITH_LINK: 'anyoneWithLink', DOMAIN: 'domain' },
  Permission: { VIEW: 'view', EDIT: 'edit' },
  getFolderById(id) {
    const folder = mockState.folders.get(id);
    if (!folder) throw new Error(`Folder not found: ${id}`);
    return folder;
  },
  getFileById(id) {
    const file = mockState.files.get(id);
    if (!file) throw new Error(`File not found: ${id}`);
    return file;
  },
  createFolder(name) {
    const folder = new MockFolder(fakeGoogleId('FLD'), name, null);
    mockState.folders.set(folder.id, folder);
    return folder;
  },
  getFoldersByName(name) {
    return makeIterator(Array.from(mockState.folders.values()).filter((f) => f.name === name && !f.parent));
  },
  getRootFolder() {
    if (!mockState.rootFolder) {
      mockState.rootFolder = new MockFolder('ROOT', 'My Drive', null);
      mockState.folders.set('ROOT', mockState.rootFolder);
    }
    return mockState.rootFolder;
  },
  getFilesByName(name) {
    return makeIterator(
      Array.from(mockState.spreadsheets.values()).filter((ss) => ss.name === name)
    );
  },
  /** Ambil berkas by ID — dipakai handler DRIVE_FILE (proxy preview media). */
  getFileById(id) {
    const file = mockState.files.get(id);
    if (!file) throw new Error(`File not found: ${id}`);
    return file;
  },
};

const UtilitiesMock = {
  base64Decode(text) {
    return Array.from(Buffer.from(String(text), 'base64'));
  },
  base64Encode(bytes) {
    return Buffer.from(bytes).toString('base64');
  },
  base64EncodeWebSafe(bytes) {
    return Buffer.from(bytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  base64DecodeWebSafe(text) {
    const normalized = String(text).replace(/-/g, '+').replace(/_/g, '/');
    return Array.from(Buffer.from(normalized + '='.repeat((4 - (normalized.length % 4)) % 4), 'base64'));
  },
  newBlob(bytes, contentType, name) {
    const data = typeof bytes === 'string' ? Array.from(Buffer.from(bytes, 'utf8')) : bytes;
    return {
      getBytes: () => data,
      getContentType: () => contentType || 'application/octet-stream',
      getName: () => name || 'blob',
      setDataFromString: () => undefined,
    };
  },
  formatDate(date, timeZone, format) {
    return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  },
  jsonParse: (text) => JSON.parse(text),
};

function buildSandbox() {
  const sandbox = {
  console,
  Logger: { log: (...args) => void args },
  JSON,
  Math,
  Date,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  isNaN,
  parseInt,
  parseFloat,
  encodeURIComponent,
  decodeURIComponent,
  Buffer,
  MimeType: { GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet' },
  Utilities: UtilitiesMock,
  DriveApp: DriveAppMock,
  PropertiesService: {
    getScriptProperties: () => ({
      getProperty: (key) => (mockState.properties.has(key) ? mockState.properties.get(key) : null),
      setProperty: (key, value) => {
        mockState.properties.set(key, String(value));
        return undefined;
      },
      deleteProperty: (key) => {
        mockState.properties.delete(key);
      },
      getProperties: () => Object.fromEntries(mockState.properties),
    }),
  },
  Session: {
    getEffectiveUser: () => ({ getEmail: () => 'deployer@arms.test' }),
    getActiveUser: () => ({ getEmail: () => 'deployer@arms.test' }),
    getScriptTimeZone: () => 'Asia/Jakarta',
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: () => mockState.activeSpreadsheet,
    openById(id) {
      const ss = mockState.spreadsheets.get(id);
      if (!ss) throw new Error(`Spreadsheet not found: ${id}`);
      return ss;
    },
    openByUrl(url) {
      const id = String(url).match(/\/d\/([^/]+)/)?.[1];
      return this.openById(id);
    },
    create: (name) => createSpreadsheet(name),
    flush: () => undefined,
    getUi: () => {
      throw new Error('UI tidak tersedia pada pengujian headless');
    },
  },
  ScriptApp: {
    getScriptId: () => 'SCRIPT-ID-TEST',
    getOAuthToken: () => 'ya29.test-token',
    newWebApp: () => undefined,
  },
  UrlFetchApp: {
    fetch(url, options = {}) {
      mockState.urlFetchLog.push({ url, options });
      if (String(url).includes('api.github.com')) {
        return {
          getResponseCode: () => 201,
          getContentText: () => JSON.stringify({ html_url: 'https://github.com/issue/1', number: 1 }),
        };
      }
      if (/docs\.google\.com\/(document|spreadsheets|presentation|drawings)\/d\//.test(String(url))) {
        // Export dokumen Google native -> PDF/PNG tiruan
        const bytes = Array.from(Buffer.from('%PDF-1.4 mock export', 'utf8'));
        return {
          getResponseCode: () => 200,
          getContentText: () => '%PDF-1.4 mock export',
          getBlob: () => ({
            getBytes: () => bytes,
            getName: () => 'export.pdf',
            getContentType: () => 'application/pdf',
          }),
        };
      }
      return {
        getResponseCode: () => 200,
        getContentText: () => JSON.stringify({ success: true, data: { Users: [{ id: 'USR-REMOTE' }] } }),
      };
    },
  },
  ContentService: {
    MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
    createTextOutput(text) {
      return {
        _text: text,
        _mime: '',
        setMimeType(mime) {
          this._mime = mime;
          return this;
        },
        getContent() {
          return this._text;
        },
      };
    },
  },
  HtmlService: {
    XFrameOptionsMode: { ALLOWALL: 'ALLOWALL' },
    createTemplateFromFile(name) {
      return {
        evaluate: () => ({
          setTitle: () => ({ addMetaTag: () => ({ setXFrameOptionsMode: () => ({ getContent: () => `<html>${name}</html>` }) }) }),
          getContent: () => `<html>${name}</html>`,
        }),
      };
    },
    createHtmlOutputFromFile(name) {
      return { getContent: () => `<!-- ${name} -->` };
    },
    createHtmlOutput(html) {
      return {
        setTitle: () => ({ addMetaTag: () => ({ setXFrameOptionsMode: () => ({ getContent: () => html }) }) }),
        getContent: () => html,
      };
    },
  },
};
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  return sandbox;
}


/* ======================================================================== *
 *  MUAT PROYEK APPS SCRIPT
 * ======================================================================== */

export function loadGasProject(options = {}) {
  const state = mockState;
  if (options.reset !== false) resetMockState();

  const gsFiles = fs.readdirSync(GAS_DIR).filter((file) => file.endsWith('.gs')).sort();
  if (!gsFiles.length) throw new Error('Tidak ada berkas .gs di appsscript/ — jalankan dari root repo.');
  const source = gsFiles
    .map((file) => `// ==== ${file} ====\n${fs.readFileSync(path.join(GAS_DIR, file), 'utf8')}`)
    .join('\n');

  const sandbox = buildSandbox();
  const context = vm.createContext(sandbox);
  vm.runInContext(source, context, { filename: 'appsscript.gs' });

  return {
    sandbox,
    state,
    gsFiles,
    call: (action, payload = {}) => sandbox.handleApiRequest({ action, payload }),
    doGet: (parameter = {}) => sandbox.doGet({ parameter }),
    doPost: (body) => sandbox.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } }),
    parse: (output) => JSON.parse(output.getContent()),
  };
}

export function resetMockState() {
  mockState.seq = 0;
  mockState.spreadsheets.clear();
  mockState.folders.clear();
  mockState.files.clear();
  mockState.properties.clear();
  mockState.activeSpreadsheet = null;
  mockState.urlFetchLog.length = 0;
  mockState.rootFolder = null;
}
