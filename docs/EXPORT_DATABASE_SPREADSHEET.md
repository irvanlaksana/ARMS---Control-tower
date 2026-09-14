# Export Semua Data — Format Spreadsheet Database

Seluruh isi database ARMS (30 tab) dapat diunduh sebagai **workbook spreadsheet**
dengan skema yang **sama persis** seperti spreadsheet aktif tempat backend Google
Apps Script di-deploy:

- satu **tab per database** (nama tab = `tabName` pada `src/data/databaseConfig.ts`,
  mis. `Cases`, `Asset_Recoveries`, `Payments`, `Settings`),
- **baris pertama = header kolom** (union seluruh key record, urutan kemunculan —
  sama seperti `writeTabFromObjects_` di `appsscript/Db.gs`),
- **satu record = satu baris**, nilai sel diformat dengan aturan `cellToString`
  (boolean → `true`/`false`, object/array → JSON, null → kosong),
- tab `Settings` memakai skema **key/value**,
- tab yang masih kosong tetap menampilkan **struktur kolom kanonik** dari skema SQL
  (`SUPABASE_TABLE_COLUMNS`, dinormalkan ke camelCase).

## Cara pakai di aplikasi

| Lokasi | Tombol |
| --- | --- |
| **Pengaturan → Database** | `Export Workbook Excel (.xls, semua tab)` dan `Export CSV Gabungan (.csv)` + opsi *Hanya database yang aktif* |
| **Laporan / Reports** | kartu *Export Semua Data (Format Spreadsheet Database)* → `Excel Multi-Sheet (.xls)` / `CSV Gabungan (.csv)` |

Setiap export dicatat ke **Audit Log** (`EXPORT` / `DATABASE_EXPORT`) beserta jumlah
tab dan record.

Format file:

- **`.xls` (SpreadsheetML 2003)** — workbook multi-tab, dibuka langsung oleh
  Microsoft Excel & LibreOffice, atau diimpor ke Google Sheets
  (*File → Import → Upload*). Tab pertama `_Ringkasan` memuat jumlah tab, total
  record, dan rincian per database.
- **`.csv` gabungan** — semua tab dalam satu file dengan penanda seksi
  `### TAB: <nama> | <label> | <n> record`, praktis untuk diff/arsip teks.

## Cara pakai lewat CLI (snapshot di server/repo)

```bash
npm run export:database                       # dataset bawaan aplikasi → exports/*.xls + *.csv
node scripts/export-database-snapshot.mjs --all-tabs          # seluruh tab (abaikan status aktif)
node scripts/export-database-snapshot.mjs --from snapshot.json --out exports
```

`--from` menerima dump JSON `ARMSStore` (mis. hasil export dari browser) sehingga
data produksi bisa dibekukan menjadi berkas spreadsheet. Berkas hasil ditulis ke
folder `exports/` (di-ignore git — data, bukan kode).

## Kode

- `src/utils/spreadsheetExport.ts` — `buildExportSheets`, `schemaHeadersFor`,
  `sheetsToSpreadsheetML`, `sheetToCSV`, `sheetsToCombinedCSV`,
  `exportDatabaseToSpreadsheet`, `exportSingleTabCSV`, `cellToString`, `sanitizeSheetName`.
- `scripts/export-database-snapshot.mjs` — CLI snapshot.
- Uji: `npm run test:fees` (`scripts/test-manual-fee-export.mjs`, bagian
  *Export semua data — format spreadsheet database*).
