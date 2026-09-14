# ARMS — Control Tower :: Backend Google Apps Script

Folder ini berisi **seluruh backend ARMS dalam bentuk Google Apps Script**, pengganti
`server.ts` / `api/*.ts` / `netlify/functions` bila aplikasi di-deploy lewat Google Apps Script.

Tidak ada fitur yang dihapus atau diubah perilakunya — hanya **cara penyimpanannya**:

| Kebutuhan | Sebelum (server Node) | Sekarang (Apps Script) |
|---|---|---|
| Database & seluruh data | Google Sheets API + Service Account / CSV lokal | **Spreadsheet aktif** tempat script di-deploy (`SpreadsheetApp`) |
| Pengaturan sistem & branding profile | localStorage + env server | **Tab `Settings`** pada spreadsheet aktif (baris `key/value`) |
| Konfigurasi Google Drive (Folder ID/URL, struktur sub-folder) | env + localStorage | **Tab `Settings`** pada spreadsheet aktif |
| Berkas fisik (KTP, SPPI, SKP, dokumen) | Drive API + `GOOGLE_SERVICE_ACCOUNT_JSON` | **`DriveApp`** sebagai akun deploy (tanpa Service Account) |
| Surat tugas → GitHub Issue / generator | `GITHUB_TOKEN` env server | Script Properties `GITHUB_TOKEN` atau key `githubToken` di tab `Settings` |

## Isi folder

```
appsscript/
├── appsscript.json        # manifest: timezone, oauthScopes, webapp (Execute as: Me, Access: Anyone)
├── Code.gs                # doGet/doPost, router action, render aplikasi (HtmlService)
├── Db.gs                  # resolusi spreadsheet aktif, baca/tulis tab, tab Settings, Blob_Store
├── Drive.gs               # DriveApp: status, create-folder, ensure-path, upload
├── Surat.gs               # GitHub Issue + link generator surat tugas
├── Menu.gs                # menu spreadsheet + utilitas deploy & self-test
├── Index.template.html    # shell HTML (diisi bundle oleh `npm run gas:build`)
├── .clasp.json.example    # contoh konfigurasi clasp (scriptId + rootDir)
└── dist/                  # hasil build (di-gitignore) — inilah yang di-push clasp
```

## Peta endpoint → action

Semua endpoint lama tetap tersedia; frontend mengarahkannya otomatis lewat
`src/lib/gasBridge.ts` (tanpa perlu mengubah modul mana pun).

| Endpoint lama | Action Apps Script | Fungsi |
|---|---|---|
| `GET /api/health` | `HEALTH` | cek status backend |
| `GET /api/runtime` | `RUNTIME_INFO` | info spreadsheet aktif, akun deploy, tab |
| `POST /api/sheets/setup` | `SHEETS_SETUP` | buat/verifikasi seluruh tab database |
| `POST /api/sheets/sync` | `SHEETS_SYNC` | tulis data seluruh database aktif |
| `POST /api/sheets/fetch` | `SHEETS_FETCH` | baca data dari spreadsheet |
| `POST /api/gas/proxy` | `GAS_PROXY` | teruskan ke Apps Script lain / eksekusi lokal |
| — (legacy) | `GET_ALL_DATA` | format lama: data per nama tab |
| `GET /api/drive/status` | `DRIVE_STATUS` | status Google Drive (DriveApp) |
| `GET /api/drive/file` | `DRIVE_FILE` | proxy baca berkas (base64 ≤ 25 MB) utk preview media semua modul |
| `POST /api/drive/upload` | `DRIVE_UPLOAD` | unggah KTP/SPPI/dokumen |
| `POST /api/drive/create-folder` | `DRIVE_CREATE_FOLDER` | buat satu folder |
| `POST /api/drive/ensure-path` | `DRIVE_ENSURE_PATH` | pastikan struktur folder bertingkat |
| `POST /api/surat/create-issue` | `SURAT_CREATE_ISSUE` | buat GitHub Issue di repo `generator-surat-` (sinkron SK/debitur + payload generator) |
| `POST /api/surat/open-generator` | `SURAT_OPEN_GENERATOR` | link `generator-surat-beige.vercel.app` + payload `LetterData` & `BastData` |
| `POST /api/settings/save` | `SETTINGS_SAVE` | simpan pengaturan ke tab `Settings` |
| `POST /api/settings/load` | `SETTINGS_LOAD` | muat pengaturan dari tab `Settings` |

Alias action lama tetap diterima: `PING`, `SETUP`, `SYNC`, `PUSH`, `FETCH`, `GET_ALL_DATA`,
`CREATE_FOLDER`, `ENSURE_PATH`, `UPLOAD`, `STATUS`, `FILE` / `GET_FILE` (→ `DRIVE_FILE`),
`SAVE_SETTINGS`, `LOAD_SETTINGS`.

## Cara deploy (ringkas)

```bash
npm install
npm run gas:build          # bangun SPA + rakit appsscript/dist
npm run gas:login          # sekali saja: clasp login (buka browser)
npm run gas:create         # buat project Apps Script baru (menulis appsscript/.clasp.json)
npm run gas:push           # kirim seluruh berkas ke project
```

Lalu di <https://script.google.com>: **Deploy → New deployment → Web app**
→ *Execute as*: **Me**, *Who has access*: **Anyone** → salin URL `/exec`.

Panduan lengkap (termasuk cara manual tanpa clasp): [`../docs/DEPLOY_GOOGLE_APPS_SCRIPT.md`](../docs/DEPLOY_GOOGLE_APPS_SCRIPT.md).

## Pengujian tanpa deploy

```bash
npm run gas:test
```

Menjalankan **berkas `.gs` asli** di VM Node dengan layanan Google tiruan
(`scripts/lib/gasMockRuntime.mjs`) dan **kode frontend asli** di lingkungan browser
tiruan, lalu memeriksa: routing semua endpoint, round-trip data 30 database,
penyimpanan pengaturan (termasuk logo base64 panjang yang dipecah otomatis),
fitur Google Drive, dan kompatibilitas jalur legacy.
