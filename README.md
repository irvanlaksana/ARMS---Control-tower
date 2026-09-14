# ARMS — Control Tower (Agency Recovery Management System)

Sistem Control Tower untuk agency DC & Recovery Management. **Seluruh data dan
pengaturan disimpan pada spreadsheet aktif** yang dipakai deploy saat ini, dan
aplikasi dapat dijalankan langsung sebagai **Google Apps Script Web App** — tanpa
Service Account, tanpa `GOOGLE_SERVICE_ACCOUNT_JSON`, dan tanpa Supabase.

Google Drive tetap dipakai untuk arsip berkas (KTP, SPPI, SKP, dokumen) dengan
**seluruh fitur yang sama**; yang berubah hanya cara penyimpanannya: folder dibuat
dan berkas diunggah lewat `DriveApp` (akun deploy Apps Script), sedangkan
konfigurasinya (Folder ID / URL / struktur sub-folder) disimpan di spreadsheet aktif.

Dua kemampuan baru yang berlaku di **seluruh modul**:

1. **Preview media Google Drive in-app** — setiap foto/PDF/dokumen yang diunggah ke
   Drive bisa dilihat tanpa keluar aplikasi (lihat [Preview Media](#preview-media-google-drive-semua-modul)).
2. **Kirim data ke Generator Surat web** — modul Surat Kuasa membuka
   `https://generator-surat-beige.vercel.app/` membawa payload `LetterData` + `BastData`
   sesuai repo [`irvanlaksana/generator-surat-`](https://github.com/irvanlaksana/generator-surat-)
   (lihat [Generator Surat](#generator-surat-web-surat-tugas--bast) dan
   [`docs/GENERATOR_SURAT_PAYLOAD.md`](docs/GENERATOR_SURAT_PAYLOAD.md)).

## Deploy utama: Google Apps Script

```
React SPA (HtmlService di dalam Web App Apps Script)
   └─ google.script.run ──> appsscript/*.gs
                              ├─ SpreadsheetApp → SPREADSHEET AKTIF (30 tab + Settings + Blob_Store)
                              └─ DriveApp       → Google Drive (folder karyawan, mitra DC, SKP, berkas)
```

```bash
npm install
npm run gas:build     # bangun SPA + rakit appsscript/dist (Code.gs, Db.gs, Index.html, BundleNN.html)
npm run gas:login     # sekali saja
npm run gas:create    # buat project Apps Script (atau: npm run gas:build -- --scriptId <ID>)
npm run gas:push      # kirim seluruh berkas
npm run gas:test      # uji backend + frontend + preview media + payload generator (388 pemeriksaan)
```

Lalu **Deploy → New deployment → Web app** (*Execute as: Me*, *Who has access: Anyone*).
Panduan lengkap: [`docs/DEPLOY_GOOGLE_APPS_SCRIPT.md`](docs/DEPLOY_GOOGLE_APPS_SCRIPT.md) •
Detail backend: [`appsscript/README.md`](appsscript/README.md).

### Pengaturan & Branding Profile → spreadsheet aktif

Pada **Settings → Pengaturan Sistem & Google Sheets** ("ARMS System Settings &
Branding Profile"), semua pengaturan — profil perusahaan, logo, konfigurasi Google
Drive, konfigurasi tab/kolom database, fee default, URL Web App Apps Script —
disimpan sebagai baris `key | value | updatedAt | note` pada tab **`Settings`** di
spreadsheet aktif. Nilai panjang (mis. logo base64) dipecah otomatis menjadi
`key__chunkN` dan digabung kembali saat dibaca, sehingga tidak pernah melewati batas
50.000 karakter per sel. localStorage browser hanya berperan sebagai cache.

### Tiga mode operasi (terdeteksi otomatis oleh `src/lib/gasBridge.ts`)

| Mode | Kondisi | Jalur penyimpanan |
|---|---|---|
| `GAS_HTML` | aplikasi dibuka dari URL Web App Apps Script | `google.script.run` → spreadsheet aktif |
| `GAS_URL` | aplikasi di-host terpisah + **Apps Script Web App URL** diisi di Pengaturan | HTTP POST ke `/exec` → spreadsheet aktif |
| `SERVER` | tanpa Apps Script (`server.ts` / Netlify / Vercel) | Google Sheets API (+ Supabase bila dikonfigurasi) |

Mode hybrid tersedia untuk deploy lama: set env `GAS_WEB_APP_URL` pada
server/Netlify/Vercel, maka `server.ts` meneruskan seluruh `/api/*` ke Apps Script.

> Bagian Google API (Service Account) di bawah tetap dipertahankan untuk deploy
> mode `SERVER`; tidak diperlukan bila memakai Google Apps Script.

### Preview Media Google Drive (semua modul)

Satu penyedia preview global (`src/components/common/MediaPreview.tsx`, dipasang di
`App.tsx`) membuat **semua media yang diunggah ke Google Drive bisa dilihat di dalam
aplikasi** — foto KTP/SPPI/STNK, bukti kunjungan & penagihan, SKP, SPH, BAST, proposal,
MoU, kwitansi petty cash, bukti transfer modal kerja/komisi mitra, lampiran surat kuasa.

| Cara pakai | Contoh |
|---|---|
| Otomatis (tanpa ubah komponen) | klik tautan `<a href={doc.driveDocumentUrl}>` di modul mana pun → preview in-app |
| Atribut data | `<img src={url} data-media-preview data-media-name="KTP.jpg" data-media-module="Personnel" />` |
| Galeri | `data-media-gallery={JSON.stringify(items)} data-media-index={i}` (navigasi ← →, Esc tutup) |
| Komponen | `<MediaThumb>`, `<MediaLink>`, `<MediaUrlPreviewButton>`, `<MediaBadge>` |
| Hook | `const { openMedia, openGallery } = useMediaPreview()` |
| Opt-out | `data-no-media-preview` (logo, tautan folder/spreadsheet tetap buka tab baru) |

Fitur preview: gambar (zoom + fallback otomatis), PDF/Docs/Slides (iframe), video/audio
(player), navigasi galeri, tombol **Buka di Google Drive**, **Unduh**, **Salin Tautan**,
serta **sumber Server** untuk berkas privat.

Berkas privat (tidak dibagikan "anyone with link") tetap terbaca lewat proxy backend
`GET /api/drive/file?fileId=...`:
- mode `SERVER` → Service Account men-stream berkas (`Content-Type` asli),
- mode `GAS_HTML`/`GAS_URL` → action `DRIVE_FILE` mengembalikan base64 (maks. 25 MB),
  frontend mengubahnya jadi Blob URL,
- dokumen Google native (Docs/Sheets/Slides/Drawing) otomatis di-export ke PDF/PNG.

### Generator Surat Web (Surat Tugas & BAST)

Modul **Surat Kuasa** → panel *"7. Kirim ke Generator Surat Web"*:

- Target: `https://generator-surat-beige.vercel.app/` (repo `irvanlaksana/generator-surat-`).
- Pilihan **tab tujuan** (`surat_tugas` / `bast`) dan **ukuran kertas** (`f4`/`a4`/`legal`/`letter`).
- Payload mengikuti model repo: `LetterData` (32 field) + `BastData` (38 field) + `meta` ARMS.
- Dikirim lewat 4 jalur: `?payload=<base64url>` (atau `#payload=` bila panjang), parameter datar,
  `postMessage ARMS_GENERATOR_PAYLOAD` (dengan ACK), serta JSON yang bisa **disalin/diunduh**.
- Tombol **Kirim ke Generator** juga tersedia per baris daftar SK.
- Generator **lokal** (`src/components/assignment-letter/`) tetap ada dan tidak diubah.
- Backend: `POST /api/surat/open-generator` (Express/Vercel/Apps Script) memakai logika yang sama
  (`api/lib/generatorLink.ts` ↔ port JS di `appsscript/Surat.gs`).
- Patch penerima (agar aplikasi generator membaca payload) tersedia siap-tempel di
  [`docs/GENERATOR_SURAT_PAYLOAD.md`](docs/GENERATOR_SURAT_PAYLOAD.md).

---

## 1. Arsitektur & Alur Data

```
ARMS UI (React)
   │
   ├── POST /api/sheets/setup   → buat/verifikasi tab (sheet) database
   ├── POST /api/sheets/sync    → tulis data seluruh database ke tab spreadsheet
   ├── POST /api/sheets/fetch   → baca data dari spreadsheet ke aplikasi
   │
   ├── POST /api/drive/create-folder → buat satu folder di Google Drive
   ├── POST /api/drive/ensure-path   → pastikan struktur folder bertingkat ada
   └── POST /api/drive/upload        → upload file (KTP, SPPI, SKP, SPH, Proposal, MoU) ke folder
```

Semua API tersebut memakai **Service Account** (`googleapis`) yang dikonfigurasi lewat environment variable di server. Aplikasi **tidak pernah menyimpan kredensial** Google di browser.

---

## 2. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Akun Google | Untuk membuat project di Google Cloud Console |
| Akun Google Sheets | Spreadsheet tujuan database (bisa dibuat di Google Drive) |
| Server/aplikasi | Node.js 20+ (`npm run dev` atau `npm run build && npm start`) |
| Variabel kredensial | Salah satu dari `GOOGLE_SERVICE_ACCOUNT_JSON` atau `GOOGLE_APPLICATION_CREDENTIALS` |

---

## 3. Setup Google Cloud (sekali saja)

### Langkah 3.1 — Buat Project Google Cloud
1. Buka [Google Cloud Console](https://console.cloud.google.com/) → **Select project** → **New Project**.
2. Beri nama mis. `arms-control-tower` → **Create**.
3. Pastikan project tersebut terpilih di pojok atas.

### Langkah 3.2 — Aktifkan API
Buka **APIs & Services → Library**, lalu cari dan aktifkan:

1. **Google Sheets API**
   https://console.cloud.google.com/apis/library/sheets.googleapis.com
2. **Google Drive API**
   https://console.cloud.google.com/apis/library/drive.googleapis.com

> Keduanya wajib diaktifkan. Setelah aktif, tunggu 1–2 menit sebelum melanjutkan.

### Langkah 3.3 — Buat Service Account
1. Buka **APIs & Services → Credentials → Create Credentials → Service account**.
2. Nama: `arms-sheets-service` (bebas).
3. Role tidak wajib diisi (akses ditentukan dari *sharing file*, bukan IAM).
4. **Done**, lalu klik service account tersebut → tab **Keys** → **Add Key → Create new key → JSON** → file JSON terunduh (mis. `service-account.json`).
   > **⚠️ Jangan commit file JSON ini ke Git.** Tambahkan ke `.gitignore`, dan jangan upload ke public.

### Langkah 3.4 — Catat Email Service Account
Di halaman service account, salin **email** dengan format:

```
arms-sheets-service@<project-id>.iam.gserviceaccount.com
```

Email ini akan dipakai untuk *share* spreadsheet dan folder Drive.

---

## 4. Menyiapkan Spreadsheet Database & Folder Drive

### Langkah 4.1 — Buat Spreadsheet
1. Buka [sheets.new](https://sheets.new) (atau buat lewat Google Drive).
2. Beri nama mis. `ARMS_Database_2026`.
3. **Share** spreadsheet tersebut dengan email service account di atas → beri akses **Editor (Writer)**:
   ```
   Klik tombol "Bagikan" (Share) → masukkan email service account → Editor → Send
   ```
4. Salin **Spreadsheet ID** dari URL:
   ```
   https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit#gid=0
   ```
   Contoh: `1AbCdefGhIjKlMnOpQrStUvWxYz0123456789`

> Alternatif: pastikan spreadsheet dibuat/dimiliki oleh akun yang sudah di-share, atau buat lewat Drive API. Yang terpenting service account memiliki akses **Editor**.

### Langkah 4.2 — Siapkan Folder Master Google Drive
1. Buat folder root ARMS di Google Drive, mis. `ARMS_CT_2026`.
2. Klik kanan folder → **Share** → masukkan email service account → akses **Editor**.
3. Salin **Folder ID** dari URL:
   ```
   https://drive.google.com/drive/folders/<FOLDER_ID>
   ```
   Contoh: `1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS`

> Di aplikasi, folder root dipakai sebagai dasar pembuatan struktur:
> ```
> PT_MJ_INDONESIA/
> ├── DATABASE_KARYAWAN/<NAMA_KARYAWAN>/
> │   ├── 01_KTP/     ← foto KTP
> │   └── 02_SPPI/    ← berkas SPPI (opsional)
> └── MULTIFINANCE/<NAMA_KLIN>/
>     └── FOLDER_SKP/DEBITUR_<NAMA_DEBITUR>/
> ```

### Langkah 4.3 — (Opsional) Verifikasi Akses via curl
```bash
# Setup / verifikasi sheet (menggunakan kredensial server)
curl -X POST http://localhost:3000/api/sheets/setup \
  -H 'Content-Type: application/json' \
  -d '{"spreadsheetId":"<SPREADSHEET_ID>","tabs":{"customers":"Debitur_2026","cases":"Kasus"}}'

# Pastikan struktur folder ada / dibuat
curl -X POST http://localhost:3000/api/drive/ensure-path \
  -H 'Content-Type: application/json' \
  -d '{"path":["PT_MJ_INDONESIA","MULTIFINANCE","PT_ADIRA_DINAMIKA_MULTI_FINANCE","FOLDER_SKP"],"rootId":"<FOLDER_ID>"}'
```

---

## 5. Konfigurasi Kredensial di Server

Server membaca kredensial dari environment variable dengan prioritas:

1. **`GOOGLE_SERVICE_ACCOUNT_JSON`** — isi **penuh JSON** service account (disarankan untuk Vercel / Cloud Run / secret manager).
2. **`GOOGLE_APPLICATION_CREDENTIALS`** — **path** ke file JSON service account (untuk VPS / lokal).

### 5.1. Mode Lokal (.env)
```bash
cp .env.example .env
```
Isi `.env`:
```ini
# Opsi A: path ke file JSON service account
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"

# Opsi B (lebih aman untuk server): isi JSON lengkap dalam satu baris
# GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}' 
```
Jalankan aplikasi:
```bash
npm run dev          # development (Vite + server)
# atau
npm run build && npm start   # production
```

> `server.ts` sudah memuat `dotenv/config`, jadi `.env` di folder root otomatis terbaca.

### 5.1b. Validasi kredensial (sebelum/sesudah isi .env)
```bash
# Validasi isi kredensial + coba dapat access token dari Google
npm run validate:creds
# atau
node scripts/validate-google-creds.mjs

# Sekaligus uji akses ke spreadsheet database Anda:
node scripts/validate-google-creds.mjs <SPREADSHEET_ID>
```
Skrip akan mencetak pesan spesifik bila file tidak ditemukan, JSON rusak, `private_key` tidak valid, atau spreadsheet tidak di-share — bukan lagi error ADC samar `Could not load the default credentials`.

### 5.2. Mode Vercel
1. Buka project di Vercel → **Settings → Environment Variables**.
2. Tambahkan **`GOOGLE_SERVICE_ACCOUNT_JSON`** dengan value JSON service account (tempel seluruh isi file, termasuk baris baru `\n` pada `private_key` — pastikan JSON valid).
3. Deploy ulang aplikasi.

### 5.3. Mode Cloud Run / VPS
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
npm run build && npm start
```
Atau simpan sebagai secret inline:
```bash
export GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
```

---

## 6. Konfigurasi di Aplikasi ARMS

### 6.1. Tab SYSTEM — Spreadsheet Aktif & Push Otomatis

1. Buka **Settings → Pengaturan Sistem & Google Sheets**.
2. Pada kartu **"Spreadsheet Aktif — Sumber Penyimpanan Deploy Ini"** terlihat mode
   deploy (`GOOGLE APPS SCRIPT (TERIKAT)` / `(WEB APP URL)` / `SERVER API`), nama & ID
   spreadsheet aktif, tab pengaturan, dan akun deploy/Drive. Tombol **Muat dari
   Spreadsheet** membaca pengaturan dari tab `Settings`; **Uji Koneksi** memeriksa
   backend + Google Drive.
3. Pada kartu **"Spreadsheet Aktif & Push Data Otomatis"**, kolom **Spreadsheet Aktif
   (ID / URL)** terisi otomatis (terkunci) bila berjalan di dalam Apps Script; isi
   manual bila memakai mode `SERVER`/`GAS_URL`, lalu klik **Simpan**.
4. Di bawahnya ada kartu **"Kolom Spreadsheet untuk Membuat Database"**:
   - Edit **nama tab/sheet** per database (mis. `customers → Debitur_2026`).
   - Toggle **ON/OFF** untuk mengaktifkan/nonaktifkan sinkronisasi per database.
   - Klik **Simpan Kolom** untuk menyimpan konfigurasi.
   - Klik **Buat Kolom Database** untuk membuat/memverifikasi seluruh tab di spreadsheet.
5. Klik **🚀 Push Data Otomatis & Buat Tab** untuk mengisi seluruh data sekaligus ke spreadsheet aktif.
6. Isi **URL Web App Google Apps Script** bila aplikasi di-host di luar Apps Script (mode `GAS_URL`).

### 6.2. Tab DATABASE — Pengaturan Semua Database

1. Buka **Settings → Database & Sheet**.
2. Kolom **Spreadsheet aktif (ID / URL)** terisi otomatis dari spreadsheet tempat
   Apps Script di-deploy (isi manual hanya untuk mode `SERVER`).
3. Klik **Buat Sheet Database** (membuat semua tab otomatis di spreadsheet aktif).
4. Klik **Push ke Sheets** untuk mengirim seluruh database aktif.
5. **Simpan Konfigurasi** menyimpan nama tab & toggle ON/OFF ke tab `Settings`
   spreadsheet aktif (bukan hanya di browser).
5. Tabel daftar database menampilkan:
   - nama tab spreadsheet (bisa diedit),
   - jumlah data,
   - status **TERHUBUNG / NONAKTIF**,
   - waktu sync terakhir,
   - toggle **ON/OFF** per database.

### 6.3. Tab GDRIVE_DATABASE — Direktori Google Drive

1. Buka **Settings → 📁 Direktori GDrive & Database Karyawan / Multifinance**.
2. Untuk setiap **Karyawan**: klik **Buat Folder GDrive** (struktur: `PT_MJ_INDONESIA/DATABASE_KARYAWAN/<NAMA>/01_KTP` dan `.../02_SPPI`).
   - Form **Edit Data Karyawan / Mitra DC** mengunggah foto KTP ke `01_KTP` dan berkas **SPPI (opsional)** ke `02_SPPI` lewat endpoint `/api/drive/upload`.
   - Nama file: `KTP_<NAMA>_<timestamp>.jpg` / `SPPI_<NAMA>_<timestamp>.jpg`.
3. Untuk setiap **Klien Multifinance**: klik **Buat Folder** (struktur: `PT_MJ_INDONESIA/MULTIFINANCE/<NAMA_KLIN>`).
4. Klik **Buat Folder SKP** untuk folder `FOLDER_SKP` per klien.
5. Untuk **Debitur**: klik **Buat Folder** → `FOLDER_SKP/DEBITUR_<NAMA>`; atau gunakan **+ Tambah Debitur Baru** (modal **"Tambah Debitur & Buat Folder GDrive Otomatis"**) — folder dibuat otomatis saat menekan **Simpan Debitur & Buat Folder GDrive**.
6. Setelah folder dibuat, tombol **Buka/Salin** aktif dan folder muncul di GDrive dengan link `drive.google.com/drive/folders/<ID>`.

> Folder hasil pembuatan **asli** (bukan simulasi `&path=`), terdeteksi via `isRealDriveFolder` (ID 25+ karakter base64url).

---

## 7. Referensi Endpoint

| Metode | Endpoint | Fungsi | Body utama |
|---|---|---|---|
| GET | `/api/health` | Cek status server / Apps Script | — |
| GET | `/api/runtime` | Info spreadsheet aktif, mode deploy, akun Drive | — |
| POST | `/api/settings/save` | Simpan pengaturan ke tab `Settings` | `{ spreadsheetId, settings, tabs }` |
| POST | `/api/settings/load` | Muat pengaturan dari tab `Settings` | `{ spreadsheetId, tabs }` |
| POST | `/api/sheets/setup` | Buat/verifikasi tab sheet | `{ spreadsheetId, tabs }` |
| POST | `/api/sheets/sync` | Tulis data database | `{ spreadsheetId, data, tabs }` |
| POST | `/api/sheets/fetch` | Baca data spreadsheet | `{ spreadsheetId, tabs }` |
| POST | `/api/drive/create-folder` | Buat folder | `{ name, parentId }` |
| POST | `/api/drive/ensure-path` | Pastikan path folder | `{ path, rootId }` |
| POST | `/api/drive/upload` | Upload file | `{ fileName, mimeType, base64, folderId }` |
| GET | `/api/drive/file` | Proxy baca berkas untuk preview media (biner / `mode=json`) | `?fileId=&name=&mode=` |
| GET | `/api/drive/status` | Status koneksi & folder root Drive | — |
| POST | `/api/surat/create-issue` | Buat GitHub Issue di repo `generator-surat-` (sinkron SK/debitur + payload) | `{ skNumber, debtor, personnel }` |
| POST | `/api/surat/open-generator` | Link generator surat web (`LetterData` + `BastData`) | `{ payload }` atau `{ skNumber, debtor, personnel, docType, paperSize }` |

Semua endpoint di atas tersedia baik di `server.ts` (mode `SERVER`) maupun sebagai
*action* Apps Script (mode `GAS_HTML`/`GAS_URL`) — lihat tabel pemetaan di
[`appsscript/README.md`](appsscript/README.md).

---

## 8. Troubleshooting

| Gejala / Error | Penyebab | Solusi |
|---|---|---|
| `Google API belum dikonfigurasi. Set env GOOGLE_SERVICE_ACCOUNT_JSON ... atau GOOGLE_APPLICATION_CREDENTIALS` | Kredensial service account belum diset di server | Set salah satu env var (Bab 5), restart server |
| `Could not load the default credentials...` | Kredensial belum diset / versi lama tanpa `authFor()` | Repo ini sudah memakai `authFor()` (baca kredensial eksplisit di `api/lib/googleAuth.ts`). Isi `GOOGLE_SERVICE_ACCOUNT_JSON` atau `GOOGLE_APPLICATION_CREDENTIALS`, letakkan file `service-account.json` di root repo, lalu jalankan `node scripts/validate-google-creds.mjs` untuk cek |
| `File kredensial tidak ditemukan: ...service-account.json` | Path `GOOGLE_APPLICATION_CREDENTIALS` menunjuk file yang belum ada | Letakkan file JSON service account di lokasi tsb (default `./service-account.json` = root repo), lalu jalankan ulang validasi |
| `GOOGLE_SERVICE_ACCOUNT_JSON tidak valid ... / bukan JSON valid` | Isi env adalah JSON rusak / `private_key` terpotong | Tempel ulang seluruh isi file JSON (pertahankan `\n` pada `private_key`), lalu jalankan `node scripts/validate-google-creds.mjs` |
| `MetadataLookupWarning` | Server mencoba metadata GCE tanpa kredensial | Set kredensial; versi baru sudah tidak memunculkan warning ini |
| `403 insufficient permissions` | Service account belum di-share ke spreadsheet/folder | Share spreadsheet & folder root dengan email service account sebagai **Editor** |
| `Spreadsheet not found` / `404` | Spreadsheet ID salah atau tidak di-share | Salin ID dari URL; pastikan share Editor |
| `The caller does not have permission` pada Drive | Folder master belum di-share | Share folder root (dan folder induk) ke service account |
| Folder tampil "Belum dibuat" padahal sudah | Link lama memakai `&path=` / ID buatan (`GDRIVE-CLI-...`) | Klik **Buat Folder / Perbaiki Folder** untuk membuat folder asli |
| `fetch failed (unable to verify the first certificate)` pada `/api/surat/create-issue` | Koneksi TLS server ke `api.github.com` diblokir | Pastikan server bisa akses internet; cek proxy/trusted CA |
| Push sukses tapi "0 dokumen" | Spreadsheet ID kosong / belum disimpan | Isi ID, klik **Simpan**, lalu **Push Data Otomatis** |
| CSV terunduh tidak rapi di Excel | Pemisah koma vs semicolon | Export memakai `;` + UTF-8 BOM; pilih sesuai regional Excel |
| Halaman Apps Script menampilkan "Bundle aplikasi kosong" | `BundleNN.html` belum ter-push | `npm run gas:build && npm run gas:push` |
| URL `/dev` meminta login Google | Deployment development | Pakai URL `/exec` dari **Deploy → New deployment** |
| Respon HTML / akses ditolak (mode `GAS_URL`) | Akses deployment bukan *Anyone* | Deploy ulang: *Execute as: Me*, *Who has access: Anyone* |
| `Exceeded maximum execution time` saat push | Batas 6 menit per eksekusi Apps Script | Push per bagian / nonaktifkan tab yang tidak diperlukan |
| Pengaturan kembali default di browser lain | localStorage hanya cache | Klik **Muat dari Spreadsheet** di kartu Spreadsheet Aktif |

### Cek cepat konfigurasi
```bash
curl http://localhost:3000/api/health
# lalu uji:
curl -X POST http://localhost:3000/api/sheets/setup \
  -H 'Content-Type: application/json' \
  -d '{"spreadsheetId":"<SPREADSHEET_ID>"}'
```

---

## 9. Keamanan

- **Jangan pernah** commit `service-account.json`, `.env`, `appsscript/.clasp.json`, `appsscript/dist/`, atau token ke Git.
- Pada deploy Apps Script, simpan `GITHUB_TOKEN` di **Script Properties** (bukan di kode).
- Gunakan secret manager (Vercel Env, Cloud Run Secret, dsb.) untuk `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Berikan service account akses **minimal**: hanya spreadsheet database dan folder Drive yang dibutuhkan (jangan beri akses ke Drive root akun pribadi).
- Nonaktifkan database yang tidak dipakai melalui tab **Database & Sheet** (toggle OFF) agar tidak ter-push.
