/**
 * Export SELURUH database ARMS ke format spreadsheet (multi-sheet workbook).
 *
 * Format mengikuti persis skema tab spreadsheet aktif yang dipakai backend
 * Google Apps Script (lihat `appsscript/Db.gs`):
 *  - satu tab per database (nama tab = `tabName` pada konfigurasi database),
 *  - baris pertama = header (union seluruh key record, urutan kemunculan),
 *  - nilai sel = `cellToString_` (boolean -> 'true'/'false', object -> JSON),
 *  - database `settings` ditulis sebagai baris key/value.
 *
 * Output yang tersedia:
 *  1. SpreadsheetML 2003 (`.xls`) — workbook multi-sheet, dibuka langsung oleh
 *     Microsoft Excel, LibreOffice, dan Google Sheets (File > Import).
 *  2. CSV gabungan (`.csv`) — semua tab dalam satu file dengan penanda seksi,
 *     berguna untuk diff / re-import cepat.
 */

import type { ARMSStore } from '../services/armsDataService';
import type { AppSettings } from '../types/arms';
import { getActiveDatabaseConfigs, getDatabaseConfigs } from '../data/databaseConfig';
import { STORE_TO_SUPABASE_TABLE, snakeToCamel } from './supabaseAdapter';
import { SUPABASE_TABLE_COLUMNS } from './supabaseSchemaColumns';

export interface ExportSheet {
  /** Nama tab pada spreadsheet (mis. `Asset_Recoveries`). */
  tabName: string;
  /** Label tampilan database (mis. `Recovery / Eksekusi Unit`). */
  label: string;
  /** Key koleksi pada ARMSStore. */
  collection: string;
  /** Header kolom (baris pertama tab). */
  headers: string[];
  /** Baris data (sudah dalam bentuk string, sama seperti isi sel spreadsheet). */
  rows: string[][];
  /** Jumlah record pada tab ini. */
  recordCount: number;
}

export interface ExportSummary {
  fileName: string;
  format: 'xls' | 'csv';
  sheetCount: number;
  totalRecords: number;
  exportedAt: string;
}

/** Samakan perilaku `cellToString_` di Apps Script agar hasil export identik. */
export function cellToString(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Nama tab spreadsheet valid: maksimal 31 karakter, tanpa karakter terlarang
 * Excel/Sheets (`[]:*?/\`) dan tanpa karakter yang merepotkan XML (`<>&'"`).
 */
export function sanitizeSheetName(name: string): string {
  const cleaned = String(name || 'Sheet')
    .replace(/[[\]:*?/\\<>&'"]/g, '_')
    .replace(/_+/g, '_')
    .trim();
  return (cleaned || 'Sheet').slice(0, 31);
}

/** Settings ditulis sebagai baris key/value (object -> JSON), sama seperti sync. */
export function settingsToRows(settings: AppSettings | undefined): { headers: string[]; rows: string[][] } {
  const rows: string[][] = [];
  Object.keys(settings || {}).forEach((key) => {
    const value = (settings as unknown as Record<string, unknown>)[key];
    if (value === undefined) return;
    rows.push([key, cellToString(value)]);
  });
  return { headers: ['key', 'value'], rows };
}

/**
 * Daftar kolom kanonik sebuah database (dari skema SQL/Supabase), dinormalkan ke
 * camelCase agar sama dengan key record pada ARMSStore & header tab spreadsheet.
 * Dipakai supaya tab yang masih kosong tetap menampilkan struktur kolomnya.
 */
export function schemaHeadersFor(collection: string): string[] {
  const table = STORE_TO_SUPABASE_TABLE[collection];
  if (!table) return [];
  const columns = SUPABASE_TABLE_COLUMNS[table] || [];
  return columns
    .map((column) => snakeToCamel(column))
    .filter((column) => column && column !== 'updatedAt');
}

function unionHeaders(records: Record<string, unknown>[]): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();
  records.forEach((record) => {
    Object.keys(record || {}).forEach((key) => {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    });
  });
  return headers;
}

/**
 * Bangun seluruh sheet export dari store.
 * @param onlyActive true = hanya database yang diaktifkan di Pengaturan (default),
 *                   false = seluruh 30 database.
 */
export function buildExportSheets(store: ARMSStore, onlyActive = true): ExportSheet[] {
  const configs = onlyActive ? getActiveDatabaseConfigs(store?.settings) : getDatabaseConfigs(store?.settings);
  const sheets: ExportSheet[] = [];

  configs.forEach((cfg) => {
    if (cfg.collection === 'settings') {
      const { headers, rows } = settingsToRows(store?.settings);
      sheets.push({
        tabName: cfg.tabName,
        label: cfg.label,
        collection: cfg.collection,
        headers,
        rows,
        recordCount: rows.length,
      });
      return;
    }

    const raw = (store as unknown as Record<string, unknown>)[cfg.collection];
    const records: Record<string, unknown>[] = Array.isArray(raw) ? (raw as Record<string, unknown>[]) : [];
    const recordHeaders = unionHeaders(records);
    const schemaHeaders = schemaHeadersFor(cfg.collection);
    // Header = kolom yang benar-benar terpakai (urutan kemunculan, sama seperti
    // tab spreadsheet aktif) ditambah kolom skema yang belum terisi.
    const headers = [
      ...recordHeaders,
      ...schemaHeaders.filter((column) => !recordHeaders.includes(column)),
    ];
    const rows = records.map((record) => headers.map((header) => cellToString(record?.[header])));

    sheets.push({
      tabName: cfg.tabName,
      label: cfg.label,
      collection: cfg.collection,
      headers: headers.length > 0 ? headers : ['value'],
      rows,
      recordCount: records.length,
    });
  });

  return sheets;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
    // Karakter kontrol tidak valid dalam XML 1.0
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
}

const NUMERIC_RE = /^-?\d+(\.\d+)?$/;

function dataCell(value: string, styleId?: string): string {
  const isNumber = value !== '' && NUMERIC_RE.test(value) && !/^0\d/.test(value);
  const style = styleId ? ` ss:StyleID="${styleId}"` : '';
  const type = isNumber ? 'Number' : 'String';
  return `<Cell${style}><Data ss:Type="${type}">${escapeXml(value)}</Data></Cell>`;
}

/**
 * Hasilkan SpreadsheetML 2003 (`.xls`) multi-sheet. File ini dikenali Excel,
 * LibreOffice, maupun Google Sheets sebagai workbook berisi banyak tab.
 */
export function sheetsToSpreadsheetML(
  sheets: ExportSheet[],
  options: { title?: string; author?: string; includeSummary?: boolean } = {}
): string {
  const title = options.title || 'ARMS Control Tower — Database Export';
  const author = options.author || 'ARMS Control Tower';

  const summaryRows: string[][] = sheets.map((sheet) => [
    sheet.tabName,
    sheet.label,
    String(sheet.recordCount),
    String(sheet.headers.length),
  ]);

  const parts: string[] = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<?mso-application progid="Excel.Sheet"?>');
  parts.push(
    '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">'
  );
  parts.push('<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">');
  parts.push(`<Title>${escapeXml(title)}</Title>`);
  parts.push(`<Author>${escapeXml(author)}</Author>`);
  parts.push(`<Created>${new Date().toISOString()}</Created>`);
  parts.push('</DocumentProperties>');
  parts.push('<Styles>');
  parts.push(
    '<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Top"/><Font ss:FontName="Calibri" ss:Size="10"/></Style>'
  );
  parts.push(
    '<Style ss:ID="header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#1F3864" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style>'
  );
  parts.push('<Style ss:ID="title"><Font ss:Bold="1" ss:Size="12"/></Style>');
  parts.push('</Styles>');

  if (options.includeSummary !== false) {
    const totalRecords = sheets.reduce((acc, sheet) => acc + sheet.recordCount, 0);
    parts.push(`<Worksheet ss:Name="${escapeXml(sanitizeSheetName('_Ringkasan'))}">`);
    parts.push('<Table>');
    parts.push(`<Row><Cell ss:StyleID="title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>`);
    parts.push(
      `<Row><Cell><Data ss:Type="String">Diekspor pada</Data></Cell><Cell><Data ss:Type="String">${escapeXml(
        new Date().toLocaleString('id-ID')
      )}</Data></Cell></Row>`
    );
    parts.push(
      `<Row><Cell><Data ss:Type="String">Jumlah tab database</Data></Cell>${dataCell(String(sheets.length))}</Row>`
    );
    parts.push(
      `<Row><Cell><Data ss:Type="String">Total record</Data></Cell>${dataCell(String(totalRecords))}</Row>`
    );
    parts.push('<Row/>');
    parts.push(
      `<Row>${['Tab Spreadsheet', 'Nama Database', 'Jumlah Record', 'Jumlah Kolom']
        .map((head) => dataCell(head, 'header'))
        .join('')}</Row>`
    );
    summaryRows.forEach((row) => {
      parts.push(`<Row>${row.map((cell) => dataCell(cell)).join('')}</Row>`);
    });
    parts.push('</Table></Worksheet>');
  }

  sheets.forEach((sheet) => {
    const safeName = escapeXml(sanitizeSheetName(sheet.tabName));
    parts.push(`<Worksheet ss:Name="${safeName}"><Table>`);
    parts.push(`<Row>${sheet.headers.map((header) => dataCell(header, 'header')).join('')}</Row>`);
    sheet.rows.forEach((row) => {
      parts.push(`<Row>${row.map((cell) => dataCell(cell)).join('')}</Row>`);
    });
    parts.push('</Table></Worksheet>');
  });

  parts.push('</Workbook>');
  return parts.join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV per tab (tanpa penanda seksi) — dipakai untuk export tab tunggal. */
export function sheetToCSV(sheet: ExportSheet): string {
  const lines = [sheet.headers.map(csvEscape).join(',')];
  sheet.rows.forEach((row) => lines.push(row.map(csvEscape).join(',')));
  return lines.join('\r\n');
}

/**
 * Seluruh tab digabung dalam satu file CSV dengan penanda seksi
 * (`### TAB: <nama> | <label> | <n> record`).
 */
export function sheetsToCombinedCSV(sheets: ExportSheet[]): string {
  const chunks: string[] = [];
  chunks.push(
    `### ARMS CONTROL TOWER - DATABASE EXPORT\r\n### Tanggal: ${new Date().toLocaleString(
      'id-ID'
    )}\r\n### Jumlah tab: ${sheets.length}\r\n### Total record: ${sheets.reduce(
      (acc, sheet) => acc + sheet.recordCount,
      0
    )}`
  );
  sheets.forEach((sheet) => {
    chunks.push(
      `\r\n### TAB: ${sheet.tabName} | ${sheet.label} | ${sheet.recordCount} record\r\n${sheetToCSV(sheet)}`
    );
  });
  return chunks.join('\r\n');
}

/** Nama file export standar, mis. `ARMS_Database_Export_2026-09-14_15-04.xls`. */
export function buildExportFileName(format: 'xls' | 'csv', when: Date = new Date()): string {
  const stamp = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, '0')}-${String(
    when.getDate()
  ).padStart(2, '0')}_${String(when.getHours()).padStart(2, '0')}-${String(when.getMinutes()).padStart(2, '0')}`;
  return `ARMS_Database_Export_${stamp}.${format}`;
}

function triggerDownload(content: string, fileName: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/**
 * Unduh seluruh database sebagai workbook spreadsheet multi-sheet.
 * @returns ringkasan export untuk ditampilkan ke user / audit log.
 */
export function exportDatabaseToSpreadsheet(
  store: ARMSStore,
  options: { format?: 'xls' | 'csv'; onlyActive?: boolean; fileName?: string } = {}
): ExportSummary {
  const format = options.format === 'csv' ? 'csv' : 'xls';
  const sheets = buildExportSheets(store, options.onlyActive !== false);
  const content =
    format === 'csv'
      ? sheetsToCombinedCSV(sheets)
      : sheetsToSpreadsheetML(sheets, { includeSummary: true });
  const fileName = options.fileName || buildExportFileName(format);
  const mimeType =
    format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/vnd.ms-excel;charset=utf-8;';

  if (typeof document !== 'undefined') {
    triggerDownload(content, fileName, mimeType);
  }

  return {
    fileName,
    format,
    sheetCount: sheets.length,
    totalRecords: sheets.reduce((acc, sheet) => acc + sheet.recordCount, 0),
    exportedAt: new Date().toISOString(),
  };
}

/** Unduh satu tab database saja (CSV). */
export function exportSingleTabCSV(store: ARMSStore, collection: string): ExportSummary | null {
  const sheets = buildExportSheets(store, false);
  const sheet = sheets.find((item) => item.collection === collection);
  if (!sheet) return null;
  const fileName = `${sanitizeSheetName(sheet.tabName)}_${new Date().toISOString().slice(0, 10)}.csv`;
  if (typeof document !== 'undefined') {
    triggerDownload(sheetToCSV(sheet), fileName, 'text/csv;charset=utf-8;');
  }
  return {
    fileName,
    format: 'csv',
    sheetCount: 1,
    totalRecords: sheet.recordCount,
    exportedAt: new Date().toISOString(),
  };
}
