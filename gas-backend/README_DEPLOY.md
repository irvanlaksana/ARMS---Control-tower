# PANDUAN LENGKAP DEPLOY ARMS KE GOOGLE APPS SCRIPT (GAS)

Dokumen ini menjelaskan langkah demi langkah untuk melakukan deploy aplikasi **ARMS (Agency Recovery Management System)** ke **Google Apps Script** sebagai **Web App** mandiri, menggunakan **Google Sheets** sebagai database relasional tabular dan **Google Drive** sebagai media storage.

---

## 📂 Struktur File di Direktori `gas-backend/`

Seluruh file yang dibutuhkan untuk dideploy telah disiapkan di folder `gas-backend/`:
1. **`Code.js`** (File Apps Script Backend):
   - Menangani `doGet(e)` dan `doPost(e)`.
   - Mengelola pemetaan kolom tabular untuk **30 Sheet Master Database** tanpa limit 50.000 karakter.
   - Mengelola fungsi upload file base64 ke Google Drive (`uploadToDrive`).
   - Mengelola pembuatan folder otomatis berjenjang di Google Drive (`ensureDriveFolder`).
   - Menyediakan API `checkAndPrepareSheets` untuk memformat header sheet otomatis (bold, frozen row 1, warna latar kontras).

2. **`Index.html`** (File HTML Frontend Bundle):
   - Bundle single-file lengkap berisi antarmuka React + Tailwind CSS + Lucide Icons.
   - Berinteraksi langsung dengan backend melalui `google.script.run`.

3. **`appsscript.json`** (File Manifest Konfigurasi GAS):
   - Mengatur zona waktu (`Asia/Jakarta`), runtime `V8`, akses `ANYONE`, dan izin OAuth yang dibutuhkan (`Spreadsheets`, `Drive`).

---

## 🚀 Langkah-Langkah Deploy ke Google Apps Script

### Langkah 1: Buat Proyek Google Apps Script Baru
1. Buka browser dan kunjungi [https://script.google.com](https://script.google.com).
2. Klik tombol **+ Proyek baru** (New project).
3. Ubah nama proyek (di bagian kiri atas) menjadi **ARMS Control Tower**.

---

### Langkah 2: Konfigurasi Manifest (`appsscript.json`)
1. Di menu sebelah kiri editor Apps Script, klik ikon **Roda Gigi (Setelan Proyek / Project Settings)**.
2. Centang opsi: **Tampilkan file manifes "appsscript.json" di editor** (*Show "appsscript.json" manifest file in editor*).
3. Kembali ke tab **Editor (< >)**.
4. Klik file `appsscript.json`, hapus seluruh isinya, lalu ganti dengan isi dari file `gas-backend/appsscript.json`:
```json
{
  "timeZone": "Asia/Jakarta",
  "dependencies": {},
  "webapp": {
    "access": "ANYONE",
    "executeAs": "USER_DEPLOYING"
  },
  "oauthScopes": [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/script.container.ui"
  ],
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8"
}
```
5. Tekan **Ctrl + S** (atau Cmd + S) untuk menyimpan.

---

### Langkah 3: Salin Kode Backend (`Code.gs`)
1. Pada file default `Kode.gs` (atau `Code.gs`), hapus fungsi `myFunction()` bawaan.
2. Salin **seluruh isi** dari file `gas-backend/Code.js` dan tempelkan ke dalam `Code.gs`.
3. Tekan **Ctrl + S** untuk menyimpan file.

---

### Langkah 4: Tambahkan File Antarmuka Frontend (`Index.html`)
1. Di samping menu **File** pada editor Apps Script, klik tombol **+ (Tambah file)** -> pilih **HTML**.
2. Beri nama file: `Index` (Apps Script akan otomatis memberinya ekstensi `.html` sehingga menjadi `Index.html`).
3. Buka file `gas-backend/Index.html`, pilih semua kodenya (**Ctrl + A**), lalu salin (**Ctrl + C**).
4. Tempelkan (**Ctrl + V**) ke dalam file `Index.html` di editor Apps Script.
5. Tekan **Ctrl + S** untuk menyimpan file.

---

### Langkah 5: Hubungkan Spreadsheet Master
1. Buat Google Spreadsheet baru di Google Drive Anda dengan judul **ARMS Master Database** (atau gunakan spreadsheet yang sudah ada).
2. Salin **ID Spreadsheet** dari URL browser:
   - Contoh URL: `https://docs.google.com/spreadsheets/d/1a2b3c4d5e6f7g8h9i0jKLMN/edit`
   - Maka ID-nya adalah: `1a2b3c4d5e6f7g8h9i0jKLMN`
3. Di dalam file `Code.gs`, baris ke-15 atau baris konfigurasi, ID spreadsheet ini juga dapat diatur langsung dari menu **Pengaturan Sistem** di dalam aplikasi ARMS setelah dibuka.

---

### Langkah 6: Deploy sebagai Web App
1. Di pojok kanan atas editor Apps Script, klik tombol biru **Terapkan** (Deploy) -> pilih **Penerapan baru** (New deployment).
2. Klik ikon gerigi di samping *Pilih jenis* (Select type) -> pilih **Aplikasi Web** (Web app).
3. Isi kolom konfigurasi berikut:
   - **Deskripsi**: `ARMS Control Tower Production v1.0`
   - **Jalankan sebagai** (*Execute as*): **Saya (<email-anda>@gmail.com)**
   - **Yang memiliki akses** (*Who has access*): **Siapa saja** (*Anyone*) atau disesuaikan dengan domain organisasi Anda.
4. Klik tombol **Terapkan** (Deploy).
5. Klik **Beri Akses** (*Authorize access*), pilih akun Google Anda.
   *(Jika muncul peringatan "Google hasn't verified this app", klik **Advanced** / **Lanjutan** -> klik **Go to ARMS Control Tower (unsafe)** -> klik **Allow**)*.
6. Anda akan mendapatkan **URL Aplikasi Web** (berakhir dengan `/exec`).
   Contoh: `https://script.google.com/macros/s/AKfycbx.../exec`
7. Buka link tersebut di tab baru browser. Aplikasi ARMS kini telah online dan siap digunakan 100% di cloud Google!

---

### Langkah 7: Inisialisasi Otomatis 30 Sheet & Kolom
1. Buka aplikasi ARMS dari Web App URL Anda.
2. Masuk ke menu **Pengaturan Sistem** -> Tab **Pengaturan Sistem & Google Workspace**.
3. Masukkan ID Spreadsheet Anda pada kolom **ID Spreadsheet Database**.
4. Klik tombol **🛠️ 1. Periksa & Buat Struktur Kolom/Sheet**.
   - Sistem akan otomatis membuatkan seluruh 30 Sheet dan menyusun nama-nama kolom master secara rapi, tebal, dan beku pada baris 1.
5. Klik tombol **🚀 2. Push Data ke Kolom-kolom Sheet** untuk melakukan sinkronisasi data master pertama kali.
