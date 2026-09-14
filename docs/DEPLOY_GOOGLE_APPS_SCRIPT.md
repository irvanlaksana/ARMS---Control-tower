# Deploy ARMS — Control Tower via Google Apps Script

Panduan lengkap memindahkan **seluruh penyimpanan ARMS ke spreadsheet aktif** dan
menjalankan aplikasi lewat **Google Apps Script Web App** — tanpa Service Account,
tanpa `GOOGLE_SERVICE_ACCOUNT_JSON`, tanpa Supabase, dan **tanpa mengubah fitur
maupun fungsi yang sudah ada**.

---

## 1. Apa yang berubah

```
SEBELUM
  React SPA ──HTTP──> server.ts / Netlify / Vercel
                        ├─ Google Sheets API (Service Account)  → spreadsheet
                        └─ Google Drive API  (Service Account)  → folder berkas

SEKARANG (deploy Google Apps Script)
  React SPA (HtmlService, di dalam Web App)
        └─ google.script.run ──> appsscript/*.gs
                                   ├─ SpreadsheetApp → SPREADSHEET AKTIF (30 tab + Settings)
                                   └─ DriveApp       → Google Drive (akun deploy)
```

* **Spreadsheet aktif** = spreadsheet tempat Apps Script di-deploy (atau yang diikat
  lewat Script Property `ARMS_SPREADSHEET_ID`). Semua data, semua pengaturan
  (Branding Profile, logo, konfigurasi Google Drive, konfigurasi tab database,
  fee default) disimpan di sini.
* **Pengaturan** disimpan sebagai baris `key | value | updatedAt | note` pada tab
  **`Settings`**. Nilai panjang (mis. logo base64) otomatis dipecah menjadi
  `key`, `key__chunk2`, `key__chunk3`, … dan digabung kembali saat dibaca.
* **Nilai sangat panjang pada data** (mis. foto KTP yang tersimpan sebagai base64)
  dipindah ke tab **`Blob_Store`** dan selnya diisi referensi `@@arms_blob:<id>`
  — karena satu sel Google Sheets maksimal 50.000 karakter.
* **Google Drive tetap berfungsi penuh** (buat folder, struktur bertingkat, unggah
  KTP/SPPI/SKP, pratinjau) tetapi memakai `DriveApp` sebagai akun deploy.
  Konfigurasi foldernya (Folder ID / URL) tetap diatur dari halaman Pengaturan dan
  kini **tersimpan di spreadsheet aktif**.
* Frontend tidak diubah per-modul: `src/lib/gasBridge.ts` memasang interceptor pada
  `window.fetch`, sehingga semua pemanggilan `/api/sheets/*`, `/api/drive/*`,
  `/api/gas/proxy`, `/api/surat/*` otomatis diarahkan ke Apps Script.

### Tiga mode operasi (terdeteksi otomatis)

| Mode | Kapan aktif | Jalur penyimpanan |
|---|---|---|
| `GAS_HTML` | Aplikasi dibuka dari URL Web App Apps Script | `google.script.run` → spreadsheet aktif |
| `GAS_URL` | Aplikasi di-host terpisah (Netlify/Vercel/lokal) + **Apps Script Web App URL** diisi di Pengaturan | HTTP POST ke `/exec` → spreadsheet aktif |
| `SERVER` | Tidak ada Apps Script; memakai `server.ts` seperti sebelumnya | Google Sheets API / Supabase |

Ada juga **mode hybrid**: set env `GAS_WEB_APP_URL` pada server/Netlify/Vercel, maka
`server.ts` meneruskan seluruh `/api/*` ke Apps Script — hosting lama tetap dipakai,
penyimpanan pindah ke spreadsheet aktif.

---

## 2. Prasyarat

| Kebutuhan | Keterangan |
|---|---|
| Akun Google | pemilik spreadsheet & Drive tujuan |
| Node.js 20+ | untuk `npm run gas:build` |
| Google Spreadsheet | boleh baru, boleh yang sudah ada |
| (Opsional) `clasp` | dipakai lewat `npx @google/clasp`, tidak perlu install global |

---

## 3. Langkah deploy (otomatis dengan clasp — disarankan)

### 3.1 Bangun bundle Apps Script

```bash
npm install
npm run gas:build
```

Hasilnya di `appsscript/dist/`:

```
appsscript.json  Code.gs  Db.gs  Drive.gs  Surat.gs  Menu.gs
Index.html  Bundle01.html … BundleNN.html  BundleRun.html
```

`Index.html` + `BundleNN.html` adalah aplikasi React yang sudah di-inline menjadi
satu bundle (±2 MB) dan dipecah agar setiap berkas Apps Script tetap ringan.

### 3.2 Login & buat project Apps Script

```bash
npm run gas:login      # sekali saja, membuka browser untuk otorisasi clasp
npm run gas:create     # membuat project Apps Script standalone baru
```

`gas:create` menulis `appsscript/.clasp.json` (scriptId + `rootDir: dist`).

> Sudah punya project Apps Script? Ambil **Script ID** dari
> `script.google.com/home/projects/<SCRIPT_ID>/edit`, lalu:
> ```bash
> npm run gas:build -- --scriptId <SCRIPT_ID>
> ```

### 3.3 Kirim berkas

```bash
npm run gas:push       # = clasp push --force dari folder appsscript/
npm run gas:open       # buka editor Apps Script (opsional)
```

### 3.4 Siapkan spreadsheet aktif

Pilih salah satu:

* **A. Spreadsheet baru (paling mudah)** — di editor Apps Script jalankan fungsi
  `armsCreateDatabaseSpreadsheet`. Spreadsheet dibuat, seluruh tab disiapkan, dan
  otomatis diikat sebagai database aktif.
* **B. Spreadsheet yang sudah ada** — buka spreadsheet tersebut →
  *Extensions → Apps Script* → tempel project (atau `clasp push` ke project yang
  terikat) → jalankan `armsBindActiveSpreadsheet` lalu `armsSetupDatabase`.
* **C. Tanpa menu** — isi Script Property manual:
  *Project Settings → Script Properties* → `ARMS_SPREADSHEET_ID` = ID spreadsheet.

Bila tidak ada yang diset, Apps Script tetap jalan: spreadsheet dibuat otomatis
pada permintaan pertama dan ID-nya disimpan di Script Properties.

### 3.5 Deploy sebagai Web App

Di editor Apps Script: **Deploy → New deployment → Select type → Web app**

* **Execute as**: `Me`
* **Who has access**: `Anyone`
* Salin **Web app URL** (berakhiran `/exec`)

Buka URL tersebut → aplikasi ARMS tampil dan langsung tersambung ke spreadsheet aktif.

> Setelah ada perubahan kode, jalankan `npm run gas:build && npm run gas:push`, lalu
> **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**.
> URL `/exec` tetap sama.

### 3.6 Verifikasi cepat

Di editor Apps Script jalankan `armsSelfTest` — semua handler diuji dan hasilnya
ditampilkan (health, runtime, setup, fetch, Drive, generator surat, token GitHub).

---

## 4. Langkah deploy (manual, tanpa clasp)

Bila tidak bisa memakai clasp:

1. Buat spreadsheet baru → *Extensions → Apps Script*.
2. Salin isi `appsscript/Code.gs`, `Db.gs`, `Drive.gs`, `Surat.gs`, `Menu.gs`
   menjadi file `.gs` dengan nama yang sama.
3. *Project Settings → manifest `appsscript.json`* → aktifkan
   **"Show appsscript.json manifest file in editor"**, lalu samakan isinya dengan
   `appsscript/appsscript.json`.
4. Buat file HTML bernama **`Index`** dan **`BundleRun`** dari
   `appsscript/dist/Index.html` dan `appsscript/dist/BundleRun.html`.
5. Bundle frontend (`BundleNN.html`) berukuran ±2 MB — **sangat disarankan** dikirim
   lewat clasp (`npm run gas:push`). Menempel manual ke editor browser biasanya
   gagal/berat. Bila terpaksa, pecah sesuai berkas `BundleNN.html` yang dihasilkan.
6. Jalankan `armsCreateDatabaseSpreadsheet` → `armsSelfTest` → Deploy Web App.

---

## 5. Konfigurasi di dalam aplikasi

Buka **Settings → Pengaturan Sistem & Google Sheets** (tab *SYSTEM* pada
"ARMS System Settings & Branding Profile"):

1. **Kartu "Spreadsheet Aktif — Sumber Penyimpanan Deploy Ini"**
   Menampilkan mode (`GOOGLE APPS SCRIPT (TERIKAT)` / `(WEB APP URL)` / `SERVER API`),
   nama & ID spreadsheet, tab pengaturan, dan akun deploy/Drive.
   Tombol: **Buka Spreadsheet**, **Muat dari Spreadsheet**, **Uji Koneksi**.
2. **URL Web App Google Apps Script** — isi hanya bila aplikasi di-host di luar
   Apps Script (mode `GAS_URL`). Pakai URL `/exec`.
3. **Spreadsheet Aktif & Push Data Otomatis** — pada mode `GAS_HTML` kolom ID terkunci
   (otomatis terikat). Tombol **🚀 Push Data Otomatis & Buat Tab** menulis seluruh
   database aktif ke spreadsheet.
4. **Kolom Spreadsheet untuk Membuat Database** — nama tab per database + toggle
   ON/OFF (tidak berubah). **Simpan Kolom** kini juga menyimpan konfigurasi ke tab
   `Settings`; **Buat Kolom Database** membuat tabnya di spreadsheet aktif.
5. **Google Drive Storage Integration** — status koneksi, mode
   (`DriveApp (akun deploy Apps Script)`), Folder ID/URL, struktur sub-folder
   `KARYAWAN_INTERNAL` / `MITRA_DC_FREELANCE` / `LEGAL_KYC_DOCUMENTS`, dan tombol
   **Uji Akses GDrive**. Semua fitur folder & unggahan tetap sama; konfigurasinya
   tersimpan di spreadsheet aktif.
6. **Simpan Pengaturan ke Spreadsheet Aktif** — menyimpan profil perusahaan, logo,
   konfigurasi Drive, fee default, dan konfigurasi tab database ke tab `Settings`,
   sekaligus mencatat audit log.

Tab lain (**Direktori GDrive & Database Karyawan / Multifinance**, **Database & Sheet**,
**Saldo Bank & Modal Kerja**, **Alur Kerja**) tetap berfungsi seperti semula.

---

## 6. Struktur data di spreadsheet aktif

| Tab | Isi |
|---|---|
| `Users`, `Clients`, `Personnel`, `Services`, `Fees`, `Contracts`, `Leads`, `Customers`, `Cases`, `Assignments`, `SK`, `Lawyer_Notices`, `Communication_Log`, `Assets`, `Collections`, `Asset_Recoveries`, `Payments`, `Funding`, `Expenses`, `Settlements`, `Ledger`, `Cash`, `Petty_Cash`, `Working_Capital`, `Documents`, `Drive_Folders`, `Approvals`, `Notifications`, `Audit_Log` | satu baris per record, baris pertama = header |
| `Settings` | `key \| value \| updatedAt \| note` — seluruh pengaturan sistem & branding |
| `Blob_Store` | `blobId \| chunk \| value` — nilai panjang (foto base64 dsb.) |

Nama tab dapat diubah dari Pengaturan; perubahan disimpan di `Settings.databaseConfig`.

---

## 7. Google Drive (penyimpanan berkas)

Struktur yang dibuat aplikasi tetap sama:

```
<FOLDER ROOT (mis. PT_MJ_INDONESIA)>/
├── DATABASE_KARYAWAN/<NAMA_KARYAWAN>/
│   ├── 01_KTP/    ← foto KTP
│   └── 02_SPPI/   ← berkas SPPI (opsional)
└── MULTIFINANCE/<NAMA_KLIEN>/
    └── FOLDER_SKP/DEBITUR_<NAMA_DEBITUR>/
```

Yang berubah:

* Akses Drive memakai **akun deploy Apps Script** (bukan Service Account), sehingga
  folder & berkas muncul di Drive Anda sendiri dan **tidak terkena batas kuota
  Service Account / kewajiban Shared Drive**.
* Folder root dibaca dari **tab `Settings`** (`googleDriveFolderId`,
  `googleDriveFolderUrl`). Pastikan akun deploy punya akses **Editor** pada folder itu.
* Berkas yang diunggah otomatis di-share *Anyone with the link – Viewer* agar
  pratinjau di aplikasi berjalan (bila kebijakan domain melarang, berkas tetap
  tersimpan dan pratinjau memakai thumbnail Drive).

---

## 8. Fitur surat tugas (GitHub Issue & generator)

* `SURAT_CREATE_ISSUE` membutuhkan token GitHub:
  *Project Settings → Script Properties → `GITHUB_TOKEN`*, **atau** jalankan
  `armsSetGithubToken`, **atau** simpan key `githubToken` di tab `Settings`.
* `SURAT_OPEN_GENERATOR` menghasilkan URL **https://generator-surat-beige.vercel.app/**
  yang membawa payload `LetterData` (tab Surat Tugas) + `BastData` (tab BAST) sesuai repo
  [`irvanlaksana/generator-surat-`](https://github.com/irvanlaksana/generator-surat-),
  dalam bentuk base64url + parameter datar — **paritas** dengan `server.ts` /
  `api/surat/open-generator.ts` (diverifikasi `npm run gas:test` dan `npm run test:generator`).
  Skema lengkap & patch penerima: [`docs/GENERATOR_SURAT_PAYLOAD.md`](GENERATOR_SURAT_PAYLOAD.md).
* `SURAT_CREATE_ISSUE` kini membuka issue di repo `generator-surat-` dan menyertakan tautan
  generator + payload JSON (sama seperti `server.ts`).
* `DRIVE_FILE` (proxy preview media) mengembalikan base64 berkas ≤ 25 MB; dokumen Google
  native di-export ke PDF/PNG. Dipakai preview media di semua modul.

---

## 9. Troubleshooting

| Gejala | Penyebab | Solusi |
|---|---|---|
| Halaman menampilkan "Bundle aplikasi kosong / Index.html belum ada" | `BundleNN.html` belum ter-push | `npm run gas:build && npm run gas:push` |
| URL `/dev` meminta login Google | Deployment development | Gunakan URL `/exec` dari *New deployment* |
| Respon HTML / "Akses Ditolak" (mode `GAS_URL`) | Akses deployment bukan *Anyone* | Deploy ulang dengan *Who has access: Anyone* |
| `Spreadsheet not found` | Script Property/ID salah | Jalankan `armsBindActiveSpreadsheet` atau `armsCreateDatabaseSpreadsheet` |
| Folder Drive "tidak ditemukan / belum dibagikan" | Folder root bukan milik akun deploy | Bagikan folder root ke akun deploy sebagai Editor, atau perbarui Folder ID di Pengaturan |
| `Exceeded maximum execution time` | Push terlalu besar (6 menit/eksekusi) | Push per bagian (nonaktifkan tab yang tidak perlu) atau kurangi foto base64 di data |
| Data lama hilang setelah push | Tab kosong ikut dibersihkan (perilaku sync penuh) | Aktifkan hanya database yang diinginkan (toggle ON/OFF), atau pull dulu sebelum push |
| Pengaturan kembali ke default di browser lain | localStorage hanya cache | Klik **Muat dari Spreadsheet** pada kartu Spreadsheet Aktif |
| Kuota `google.script.run` / payload besar | Foto base64 besar di dalam store | Kompres sebelum unggah (sudah otomatis) atau simpan ke Drive lalu pakai URL-nya |

Log eksekusi: *Apps Script → Executions*, atau `Logger.log` pada `handleApiRequest`.

---

## 10. Keamanan

* Deployment *Anyone* berarti URL Web App dapat diakses siapa pun yang memiliki
  link. Data tetap berada di spreadsheet/Drive milik Anda; jika ingin lebih ketat,
  pilih *Anyone with Google account* (mode `GAS_URL` dari domain lain tetap bisa,
  namun `google.script.run` meminta sesi Google).
* Simpan `GITHUB_TOKEN` di **Script Properties**, jangan di kode.
* Jangan commit `appsscript/.clasp.json`, `appsscript/dist/`, atau `.clasprc.json`
  (sudah masuk `.gitignore`).
* Batasi hak edit project Apps Script hanya pada pengelola ARMS.

---

## 11. Perintah npm terkait

| Perintah | Fungsi |
|---|---|
| `npm run gas:build` | bangun SPA + rakit `appsscript/dist` |
| `npm run gas:build:fast` | rakit ulang tanpa build Vite |
| `npm run gas:login` | `clasp login` |
| `npm run gas:create` | buat project Apps Script baru |
| `npm run gas:push` | kirim seluruh berkas ke project |
| `npm run gas:deploy` | buat deployment baru via clasp |
| `npm run gas:open` | buka editor Apps Script |
| `npm run gas:test` | uji backend `.gs` + jalur frontend (tanpa deploy) |
