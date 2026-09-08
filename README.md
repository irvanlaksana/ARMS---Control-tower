# ARMS — Control Tower (Agency Recovery Management System)

Sistem Control Tower untuk agency DC & Recovery Management dengan **seluruhnya layanan Google**:

| Fungsi | Layanan Google |
|---|---|
| **Database utama** | **Google Cloud Firestore** (Firebase) — 30 koleksi, diakses langsung dari browser |
| **Login** | Firebase Authentication (Google Sign-In) |
| **Arsip dokumen** (KTP, SPPI, SKP, BAST, …) | Google Drive (Service Account) |
| **Ekspor laporan** (opsional) | Google Sheets (Service Account) |
| **Deployment** | **Netlify** (SPA + Netlify Functions) |

Dokumentasi lengkap migrasi skema & data (Supabase → Firestore): **[`firestore/MIGRATION.md`](firestore/MIGRATION.md)**.

---

## 1. Arsitektur & Alur Data

```
Browser (React SPA — di-host Netlify)
   │
   ├── Firebase Auth (popup Google Sign-In)
   │
   ├── Firestore SDK (client-side) ──────────────────────────────┐
   │     • fetch  : getDocs per koleksi (30 koleksi)             │
   │     • push   : writeBatch (merge), batch 400 dokument       │
   │     • sync   : push + hapus dokumen yang terhapus           │
   │     • setel  : satu dokumen settings/app_settings           │
   │                                                        GOOGLE CLOUD
   └── fetch /api/*  →  Netlify Functions (serverless)          FIRESTORE
         ├── /api/health                          status server
         ├── /api/drive/status|create-folder|
         │   ensure-path|upload                   → Google Drive
         ├── /api/sheets/setup|sync|fetch         → Google Sheets (ekspor)
         └── /api/surat/open-generator|create-issue
```

- **Database = Google** (Firestore). Tidak ada PostgreSQL/Supabase.
- LocalStorage browser dipakai sebagai cache optimistik (offline-first);
  sumber kebenaran (remote) = Firestore.
- **Service Account** (satu saja, dari project Firebase yang sama) dipakai
  untuk Drive, Sheets, dan skrip migrasi/seed. Kredensial **tidak pernah**
  masuk ke browser.

---

## 2. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Akun Google | Untuk Google Cloud Console & Firebase Console |
| Firebase project | `gen-lang-client-0940128449` (sudah dikonfigurasi; konfig public di `firebase-applet-config.json`) |
| Node.js 20+ | `npm run dev` / skrip migrasi |
| Akun Netlify | Deploy produksi (build otomatis dari `netlify.toml`) |
| Kredensial | Satu Service Account Google (Bab 3) |

---

## 3. Setup Google Cloud (sekali saja)

> Konfigurasi web app Firebase **sudah** tersisip di `firebase-applet-config.json`
> (Auth + Firestore untuk browser). Yang perlu disiapkan hanya **Service Account**.

### Langkah 3.1 — Aktifkan API
Buka [Google Cloud Console](https://console.cloud.google.com/) → project
**gen-lang-client-0940128449** → **APIs & Services → Library**, aktifkan:

1. **Cloud Firestore API** — database utama (biasanya sudah aktif via Firebase)
2. **Google Drive API** — arsip dokumen
3. **Google Sheets API** — ekspor laporan (opsional)

### Langkah 3.2 — Buat Service Account
1. **APIs & Services → Credentials → Create Credentials → Service account**.
2. Nama bebas (mis. `arms-service`).
3. Role: **Cloud Datastore Owner** (untuk skrip seed/validasi Firestore) —
   untuk Drive/Sheets saja, role tidak wajib (akses dari sharing file).
4. Buka service account → tab **Keys** → **Add Key → Create new key → JSON**
   → file JSON terunduh (mis. `service-account.json`).

> **⚠️ Jangan commit file JSON ini ke Git** (sudah ada di `.gitignore`).

### Langkah 3.3 — Catat Email Service Account
```
arms-service@gen-lang-client-0940128449.iam.gserviceaccount.com
```
Email ini dipakai untuk *share* folder Drive / spreadsheet (Editor).

---

## 4. Migrasi Database ke Firestore (sekali saja)

Data & skema **yang saat ini ada** (30 tabel: users, clients, personnel,
services, fees, contracts, customers, cases, assignments, sks, cash_accounts,
drive_folders, notifications, audit_logs, settings, + 15 koleksi transaksional)
dipindahkan ke Firestore:

```bash
# 0. Letakkan file service-account.json di root repo (lokal)
#    atau set env GOOGLE_SERVICE_ACCOUNT_JSON

# 1. (Opsional) Regenerate skema TS bila schema/migrations/*.sql berubah
npm run db:schema

# 2. Validasi data awal terhadap skema TANPA jaringan
npm run db:validate:data

# 3. EKSEKUSI: _meta/schema + seed seluruh data + 13 composite indexes
npm run db:setup
#    varian: --dry-run | --seed-only | --meta-only | --index-only
#            --project <id> | --database <id>

# 4. Verifikasi online (jumlah dokumen per koleksi)
npm run db:validate:firestore
```

Setelah itu, browser aplikasi langsung membaca/menulis Firestore yang sama.
Detail & pemetaan lengkap: [`firestore/MIGRATION.md`](firestore/MIGRATION.md).

---

## 5. Konfigurasi Kredensial

Prioritas pembacaan (Netlify Functions & server lokal sama):

1. **`GOOGLE_SERVICE_ACCOUNT_JSON`** — isi penuh JSON (dipakai di **Netlify**).
2. **`GOOGLE_APPLICATION_CREDENTIALS`** — path file JSON (VPS / lokal).
3. **`./service-account.json`** di root repo (lokal saja).

### 5.1. Mode Lokal (.env)
```bash
cp .env.example .env
```
```ini
GOOGLE_APPLICATION_CREDENTIALS="./service-account.json"
# atau: GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```
```bash
npm run dev          # development (Vite + Express server lokal)
# atau
npm run build && npm start
```

Validasi kredensial:
```bash
npm run validate:creds                      # token Google
node scripts/validate-google-creds.mjs <SPREADSHEET_ID>   # + uji Sheets
```

### 5.2. Mode Netlify (produksi)
1. Di [app.netlify.com](https://app.netlify.com/) → import repo ini.
2. Netlify otomatis membaca `netlify.toml` (build `npm run build`, publish `dist`).
3. **Site settings → Environment variables** → tambahkan
   **`GOOGLE_SERVICE_ACCOUNT_JSON`** (seluruh isi file JSON, satu baris,
   `private_key` memakai `\n`).
4. Deploy. Fungsi `/api/*` langsung aktif.

---

## 6. Konfigurasi di Aplikasi ARMS

### 6.1. Tab SYSTEM — Google Firestore Database & Push Otomatis
1. Buka **Settings → Pengaturan Sistem & Google Sheets**.
2. Banner **"Google Firestore Database & Push Otomatis"** menampilkan
   project Firestore + status koneksi. **Database utama: Firestore**.
3. (Opsional) kartu **Export Laporan ke Google Sheets**: isi
   **Spreadsheet ID / URL** (harus spreadsheet Google asli) →
   **Buat/Update Tab Database** (membuat 30 tab otomatis) →
   **🚀 Push Data Otomatis ke Firestore** menuliskan data ke Firestore
   (primer) + spreadsheet (bila diisi).
4. **Pull dari Google Firestore** = tarik data terbaru ke aplikasi.

### 6.2. Tab DATABASE — Pengaturan Semua Database
1. Buka **Settings → Database & Sheet**.
2. Banner **Google Firestore Database (Database Utama)** — tombol
   **Pull / Push Firestore**.
3. (Opsional) **Google Spreadsheet ID / URL** sebagai target ekspor laporan.
4. Tabel 30 database menampilkan nama **Koleksi Firestore** (mis.
   `lawyer_notices`), jumlah data, status **TERHUBUNG/NONAKTIF**, waktu sync,
   dan toggle ON/OFF.

### 6.3. Tab GDRIVE_DATABASE — Direktori Google Drive
1. Buka **Settings → 📁 Direktori GDrive & Database Karyawan / Multifinance**.
2. **Karyawan**: **Buat Folder GDrive**
   (`PT_MJ_INDONESIA/DATABASE_KARYAWAN/<NAMA>/01_KTP` + `.../02_SPPI`).
   Form **Edit Data Karyawan / Mitra DC** mengunggah foto KTP ke `01_KTP`
   dan berkas SPPI ke `02_SPPI` (endpoint `/api/drive/upload`).
3. **Klien Multifinance**: **Buat Folder**
   (`PT_MJ_INDONESIA/MULTIFINANCE/<NAMA_KLIN>`) + **Buat Folder SKP**.
4. **Debitur**: `FOLDER_SKP/DEBITUR_<NAMA>` — otomatis via
   **Simpan Debitur & Buat Folder GDrive**.
5. Folder yang dibuat **asli** di Google Drive (link
   `drive.google.com/drive/folders/<ID>`).

---

## 7. Referensi Endpoint (Netlify Functions)

| Metode | Endpoint | Fungsi | Body utama |
|---|---|---|---|
| GET | `/api/health` | Status server & integrasi | — |
| POST | `/api/sheets/setup` | Buat/verifikasi tab sheet | `{ spreadsheetId, tabs }` |
| POST | `/api/sheets/sync` | Tulis data ke spreadsheet | `{ spreadsheetId, data, tabs }` |
| POST | `/api/sheets/fetch` | Baca spreadsheet | `{ spreadsheetId, tabs }` |
| GET | `/api/drive/status` | Status Drive & service account | — |
| POST | `/api/drive/create-folder` | Buat folder | `{ name, parentId }` |
| POST | `/api/drive/ensure-path` | Pastikan path folder | `{ path, rootId }` |
| POST | `/api/drive/upload` | Upload file | `{ fileName, mimeType, base64, folderId }` |
| POST | `/api/surat/open-generator` | Buka generator surat tugas | `{ skNumber, skId, debtor, personnel, driveDocumentUrl }` |
| POST | `/api/surat/create-issue` | Sinkron GitHub issue generator | `{ skNumber, skId, debtor, personnel }` |

> Catatan: **database (Firestore) tidak lewat endpoint** — browser
> berkomunikasi langsung dengan Firestore via SDK.

---

## 8. Skrip Utility

| Skrip | Fungsi |
|---|---|
| `npm run db:schema` | Generate `src/utils/firestoreSchemaColumns.ts` dari `schema/migrations/*.sql` |
| `npm run db:validate:data` | Simulasi push Firestore (offline) dengan data awal ARMS |
| `npm run db:setup` | **Migrasi/seed Firestore**: meta + data + indexes |
| `npm run db:seed` | Hanya seed data |
| `npm run db:validate:firestore` | Verifikasi online isi Firestore |
| `npm run spreadsheet:setup` | Buat spreadsheet Google baru + 30 tab (via Service Account) |
| `npm run validate:creds` | Validasi Service Account + token Google |

---

## 9. Troubleshooting

| Gejala / Error | Penyebab | Solusi |
|---|---|---|
| `Google Drive belum dikonfigurasi...` | Service account belum diset | Set `GOOGLE_SERVICE_ACCOUNT_JSON` (Netlify) / file lokal, lalu deploy lagi |
| `403 insufficient permissions` (Sheets/Drive) | File belum di-share ke service account | Share spreadsheet/folder → email SA → **Editor** |
| `Spreadsheet not found` / `404` | ID spreadsheet salah / bukan spreadsheet Google | Salin ID asli dari URL; **buat lewat `npm run spreadsheet:setup`** |
| `The caller does not have permission` (Drive) | Folder master belum di-share | Share folder root ke service account |
| Push Firestore gagal `PERMISSION_DENIED` | SA bukan dari project Firebase yang sama | Pakai SA project `gen-lang-client-0940128449` |
| Data tidak muncul di UI | Firestore masih kosong | Jalankan `npm run db:setup` (Bab 4), lalu **Pull dari Google Firestore** |
| `db:validate:data` → error field wajib | Data awal berubah tapi skema tidak | Perbaiki data di `src/data/initialData.ts` atau skema di `schema/migrations/` |
| Netlify: `Cannot find module 'googleapis'` | Node modules tidak ter-load | Pastikan `external_node_modules = ["googleapis"]` di `netlify.toml` |
| `fetch failed` pada `/api/surat/create-issue` | Koneksi TLS ke `api.github.com` diblokir | Cek jaringan/proxy server |

---

## 10. Keamanan

- **Jangan pernah** commit `service-account.json`, `.env`, atau token ke Git.
- Di Netlify, simpan Service Account hanya di **Environment Variables**
  (tidak pernah ke browser).
- Berikan service account akses **minimal**: hanya folder Drive &
  spreadsheet yang dibutuhkan.
- `firestore.rules` saat ini terbuka (project internal). Untuk multi-user
  publik, batasi dengan Auth:
  ```
  match /{document=**} {
    allow read, write: if request.auth != null;
  }
  ```
- Nonaktifkan database yang tidak dipakai (tab **Database & Sheet**, toggle
  OFF) agar tidak ikut di-push ke spreadsheet ekspor.
