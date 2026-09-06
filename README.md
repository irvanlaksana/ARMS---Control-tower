# ARMS — Control Tower (Agency Recovery Management System)

Sistem Control Tower untuk agency DC & Recovery Management dengan backend **Google Sheets** (database) dan **Google Drive** (arsip folder/lampiran) yang dikelola dari aplikasi web (React + Vite + Firebase/Google APIs).

Bagian README ini berisi **panduan lengkap setup Google Sheets & Google Drive** — dari pembuatan kredensial Google Cloud sampai konfigurasi di dalam aplikasi ARMS dan solusi error yang umum terjadi.

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
   └── POST /api/drive/upload        → upload file (KTP, SKP, SPH, Proposal, MoU) ke folder
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

### 6.1. Tab SYSTEM — Google Sheets Cloud Database Control & Push Otomatis

1. Buka **Settings → Pengaturan Sistem & Google Sheets**.
2. Pada kartu **"Google Sheets Cloud Database Control & Push Otomatis"**, isi kolom **"Kolom Spreadsheet Database (Google Sheets ID / URL)"** dengan ID spreadsheet (contoh: `1AbCdef...`), lalu klik **Simpan**.
3. Di bawahnya ada kartu **"Kolom Spreadsheet untuk Membuat Database"**:
   - Edit **nama tab/sheet** per database (mis. `customers → Debitur_2026`).
   - Toggle **ON/OFF** untuk mengaktifkan/nonaktifkan sinkronisasi per database.
   - Klik **Simpan Kolom** untuk menyimpan konfigurasi.
   - Klik **Buat Kolom Database** untuk membuat/memverifikasi seluruh tab di spreadsheet.
4. Klik **🚀 Push Data Otomatis & Buat Sheet** untuk mengisi seluruh data sekaligus.

### 6.2. Tab DATABASE — Pengaturan Semua Database

1. Buka **Settings → Database & Sheet**.
2. Isi **Google Spreadsheet ID / URL**.
3. Klik **Buat Sheet Database** (membuat semua tab otomatis).
4. Klik **Push Semua Data** untuk mengirim seluruh database aktif.
5. Tabel daftar database menampilkan:
   - nama tab spreadsheet (bisa diedit),
   - jumlah data,
   - status **TERHUBUNG / NONAKTIF**,
   - waktu sync terakhir,
   - toggle **ON/OFF** per database.

### 6.3. Tab GDRIVE_DATABASE — Direktori Google Drive

1. Buka **Settings → 📁 Direktori GDrive & Database Karyawan / Multifinance**.
2. Untuk setiap **Karyawan**: klik **Buat Folder GDrive** (struktur: `PT_MJ_INDONESIA/DATABASE_KARYAWAN/<NAMA>`).
3. Untuk setiap **Klien Multifinance**: klik **Buat Folder** (struktur: `PT_MJ_INDONESIA/MULTIFINANCE/<NAMA_KLIN>`).
4. Klik **Buat Folder SKP** untuk folder `FOLDER_SKP` per klien.
5. Untuk **Debitur**: klik **Buat Folder** → `FOLDER_SKP/DEBITUR_<NAMA>`; atau gunakan **+ Tambah Debitur Baru** (modal **"Tambah Debitur & Buat Folder GDrive Otomatis"**) — folder dibuat otomatis saat menekan **Simpan Debitur & Buat Folder GDrive**.
6. Setelah folder dibuat, tombol **Buka/Salin** aktif dan folder muncul di GDrive dengan link `drive.google.com/drive/folders/<ID>`.

> Folder hasil pembuatan **asli** (bukan simulasi `&path=`), terdeteksi via `isRealDriveFolder` (ID 25+ karakter base64url).

---

## 7. Referensi Endpoint

| Metode | Endpoint | Fungsi | Body utama |
|---|---|---|---|
| GET | `/api/health` | Cek status server | — |
| POST | `/api/sheets/setup` | Buat/verifikasi tab sheet | `{ spreadsheetId, tabs }` |
| POST | `/api/sheets/sync` | Tulis data database | `{ spreadsheetId, data, tabs }` |
| POST | `/api/sheets/fetch` | Baca data spreadsheet | `{ spreadsheetId, tabs }` |
| POST | `/api/drive/create-folder` | Buat folder | `{ name, parentId }` |
| POST | `/api/drive/ensure-path` | Pastikan path folder | `{ path, rootId }` |
| POST | `/api/drive/upload` | Upload file | `{ fileName, mimeType, base64, folderId }` |

---

## 8. Troubleshooting

| Gejala / Error | Penyebab | Solusi |
|---|---|---|
| `Google API belum dikonfigurasi. Set env GOOGLE_SERVICE_ACCOUNT_JSON ... atau GOOGLE_APPLICATION_CREDENTIALS` | Kredensial service account belum diset di server | Set salah satu env var (Bab 5), restart server |
| `Could not load the default credentials...` | Versi lama / kredensial tidak terbaca | Upgrade ke versi dengan `authFor()`; set `GOOGLE_APPLICATION_CREDENTIALS` |
| `MetadataLookupWarning` | Server mencoba metadata GCE tanpa kredensial | Set kredensial; versi baru sudah tidak memunculkan warning ini |
| `403 insufficient permissions` | Service account belum di-share ke spreadsheet/folder | Share spreadsheet & folder root dengan email service account sebagai **Editor** |
| `Spreadsheet not found` / `404` | Spreadsheet ID salah atau tidak di-share | Salin ID dari URL; pastikan share Editor |
| `The caller does not have permission` pada Drive | Folder master belum di-share | Share folder root (dan folder induk) ke service account |
| Folder tampil "Belum dibuat" padahal sudah | Link lama memakai `&path=` / ID buatan (`GDRIVE-CLI-...`) | Klik **Buat Folder / Perbaiki Folder** untuk membuat folder asli |
| `fetch failed (unable to verify the first certificate)` pada `/api/surat/create-issue` | Koneksi TLS server ke `api.github.com` diblokir | Pastikan server bisa akses internet; cek proxy/trusted CA |
| Push sukses tapi "0 dokumen" | Spreadsheet ID kosong / belum disimpan | Isi ID, klik **Simpan**, lalu **Push Data Otomatis** |
| CSV terunduh tidak rapi di Excel | Pemisah koma vs semicolon | Export memakai `;` + UTF-8 BOM; pilih sesuai regional Excel |

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

- **Jangan pernah** commit `service-account.json`, `.env`, atau token ke Git.
- Gunakan secret manager (Vercel Env, Cloud Run Secret, dsb.) untuk `GOOGLE_SERVICE_ACCOUNT_JSON`.
- Berikan service account akses **minimal**: hanya spreadsheet database dan folder Drive yang dibutuhkan (jangan beri akses ke Drive root akun pribadi).
- Nonaktifkan database yang tidak dipakai melalui tab **Database & Sheet** (toggle OFF) agar tidak ter-push.
