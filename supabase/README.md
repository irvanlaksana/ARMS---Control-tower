# Panduan Database Supabase - ARMS Control Tower

Dokumen ini berisi panduan lengkap pembuatan tabel, relasi, indeks, trigger, dan data awal (*seed data*) untuk sistem **ARMS (Agency Recovery Management System) - Control Tower** di database **Supabase** (PostgreSQL).

---

## 📋 Daftar Isi
1. [Struktur & Daftar 30 Tabel](#-daftar-30-tabel-database)
2. [Langkah Cepat: Eksekusi SQL di Supabase SQL Editor](#-langkah-cepat-eksekusi-di-supabase-sql-editor)
3. [Langkah Alternatif: Menggunakan Supabase CLI](#-langkah-alternatif-menggunakan-supabase-cli)
4. [Penjelasan Relasi Antar Tabel (Entity Relationship)](#-penjelasan-relasi-antar-tabel)
5. [Konfigurasi Row Level Security (RLS)](#-konfigurasi-row-level-security-rls)
6. [Konfigurasi Realtime di Supabase](#-konfigurasi-realtime-di-supabase)
7. [Variabel Lingkungan (.env)](#-variabel-lingkungan-env)

---

## 🗄️ Daftar 30 Tabel Database

Sistem ARMS memiliki 30 tabel yang saling terintegrasi:

| No | Nama Tabel | Kategori | Deskripsi |
|---|---|---|---|
| 1 | `users` | Pengguna & Akses | Akun login Control Tower, Executive, Komisaris, Investor |
| 2 | `clients` | Kemitraan Klien | Klien Multifinance, Bank, Fintech, dan Kreditur Perorangan |
| 3 | `personnel` | SDM & Mitra | Karyawan internal dan Mitra Eksekutor Lapangan (Mitra DC) |
| 4 | `services` | Katalog Jasa | Daftar layanan penagihan, recovery unit, mediasi, dan talangan |
| 5 | `fees` | Tarif Fee | Skema persentase komisi, fixed fee, dan tiered fee per klien |
| 6 | `contracts` | Legalitas Klien | Arsip dokumen MoU & Perjanjian Kerjasama (PKS) |
| 7 | `leads` | Pipeline Bisnis | Prospek calon klien baru & corporate partnerships |
| 8 | `customers` | Debitur | Data lengkap nasabah/debitur (identitas, alamat, data motor/mobil) |
| 9 | `cases` | Perkara Piutang | Kasus penagihan & recovery aset agunan |
| 10 | `assignments` | Tugas Lapangan | Surat Penugasan resmi kepada SPV/Mitra DC dengan target SLA |
| 11 | `sks` | Surat Kuasa | Dokumen Surat Kuasa (SK) penagihan dan penarikan unit |
| 12 | `lawyer_notices` | Litigasi Hukum | Surat Somasi 1, 2, Terakhir dan notis mediasi advokat |
| 13 | `comm_logs` | Log Komunikasi | Catatan kunjungan lapangan dan interaksi telepon/WhatsApp debitur |
| 14 | `assets` | Unit Agunan | Kendaraan debitur (NMAX, Avanza, HR-V, dll) dan status lokasi |
| 15 | `collections` | Pembayaran Masuk | Log uang titipan/angsuran yang berhasil ditagih di lapangan |
| 16 | `asset_recoveries`| Recovery Unit | Eksekusi pengamanan unit ke gudang (BAST) & fee komisi mitra |
| 17 | `dana_talangan` | Pembiayaan Taktis| Talangan bridging penarikan unit, towing, dan sewa gudang |
| 18 | `payments` | Keuangan | Pembayaran perkara, agency fee, dan split transfer komisi mitra |
| 19 | `expenses` | Pengeluaran Ops | Biaya taktis lapangan, bensin, towing, dan legal fee |
| 20 | `settlements` | Rekonsiliasi | Pembagian hasil tagih dan remitansi bersih ke kreditur |
| 21 | `ledger` | Buku Besar | Double-entry journal akuntansi kas, piutang, dan pendapatan |
| 22 | `cash_accounts` | Rekening Bank | Pool modal kerja, rekening operasional, dan vault talangan |
| 23 | `petty_cash` | Kas Kecil | Pencatatan pengeluaran operasional kantor harian |
| 24 | `working_capital`| Modal Kerja | Injeksi dana dari Direksi/Investor ke rekening modal kerja |
| 25 | `documents` | Arsip Digital | Tautan dokumen Google Drive (KTP, SPH, BPKB, Kwitansi) |
| 26 | `drive_folders` | Google Drive | Struktur direktori folder Google Drive sistem ARMS |
| 27 | `approvals` | Approval Center | Workflow persetujuan Direksi (Disbursement, SK, MoU) |
| 28 | `notifications` | Notifikasi | Pemberitahuan tugas baru, approval, dan deadline SLA |
| 29 | `audit_logs` | Audit Trail | Rekam jejak seluruh aksi user (create, update, delete, approve) |
| 30 | `settings` | Pengaturan | Konfigurasi sistem, logo, identitas perusahaan, dan sync |

---

## 🚀 Langkah Cepat: Eksekusi di Supabase SQL Editor

Untuk membuat seluruh tabel dan memasukkan data awal (*seed data*):

### Langkah 1: Buat Tabel & Skema
1. Buka [Dashboard Supabase](https://supabase.com/dashboard) dan pilih proyek Anda.
2. Di menu sebelah kiri, klik **SQL Editor**.
3. Klik tombol **New Query**.
4. Salin seluruh isi file [`supabase/schema.sql`](./schema.sql) dan tempel (*paste*) ke dalam editor.
5. Klik tombol **Run** (atau tekan `Ctrl + Enter` / `Cmd + Enter`).
6. Pesan **"Success. No rows returned"** akan muncul, menandakan 30 tabel, indeks, trigger, dan view alias berhasil dibuat.

### Langkah 2: Masukkan Data Awal (Seed Data)
1. Buka query baru di **SQL Editor**.
2. Salin seluruh isi file [`supabase/seed.sql`](./seed.sql) dan tempel ke editor.
3. Klik tombol **Run**.
4. Data master awal (Pengguna Admin, Klien Multifinance seperti Adira & BRI, Personel/Mitra DC, Katalog Layanan, Kas Rekening, dll) sudah siap digunakan.

---

## 🛠️ Langkah Alternatif: Menggunakan Supabase CLI

Jika Anda mengelola proyek secara lokal dengan **Supabase CLI**:

```bash
# 1. Login ke akun Supabase
supabase login

# 2. Hubungkan ke project Anda (ganti <PROJECT_REF> dengan ID project Supabase)
supabase link --project-ref <PROJECT_REF>

# 3. Jalankan migration
supabase db push
```

Atau jalankan via file SQL:
```bash
supabase db execute --file supabase/schema.sql
supabase db execute --file supabase/seed.sql
```

---

## 🔗 Penjelasan Relasi Antar Tabel

1. **`clients` & `cases`**:
   - `cases.client_id` mereferensikan `clients.id`.
   - Mengelompokkan semua kasus/SPK berdasarkan lembaga pembiayaan atau kreditur perorangan.

2. **`customers` & `cases`**:
   - `cases.customer_id` mereferensikan `customers.id`.
   - Menghubungkan identitas debitur dan kendaraan yang menunggak dengan nomor perkara penagihan.

3. **`personnel` & `assignments` / `sks` / `asset_recoveries` / `payments`**:
   - Personel bertindak sebagai petugas lapangan (Karyawan) atau Mitra Debt Collector (Mitra DC).
   - Setiap Surat Tugas (`assignments`) dan Surat Kuasa (`sks`) menugaskan personel terkait.
   - Eksekusi Unit (`asset_recoveries`) dan Pembayaran (`payments`) mencatat komisi mitra dan status transfer.

4. **`cases` & `dana_talangan` / `payments` / `settlements`**:
   - Alur pergerakan dana kasus dari pengajuan talangan bridging hingga pembayaran debitur dan pembagian hak tagih ke klien (*settlement*).

---

## 🔒 Konfigurasi Row Level Security (RLS)

Seluruh tabel telah dilengkapi dengan fitur **Row Level Security (RLS)** aktif. Secara bawaan:
- Pengguna yang terautentikasi (*authenticated users*) maupun akses *anon key* dapat membaca dan menulis data sesuai hak akses aplikasi ARMS.
- Service Role Key (`service_role`) memiliki akses bypass penuh untuk operasi backend / sinkronisasi.

---

## ⚡ Konfigurasi Realtime di Supabase

Jika ingin mengaktifkan pembaruan data secara langsung (*realtime live updates*) untuk modul-modul penting, jalankan query berikut di SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE 
    public.cases,
    public.assignments,
    public.sks,
    public.payments,
    public.dana_talangan,
    public.collections,
    public.asset_recoveries,
    public.approvals,
    public.notifications,
    public.cash_accounts,
    public.petty_cash,
    public.working_capital;
```

---

## 🔑 Variabel Lingkungan (.env)

Tambahkan variabel Supabase ke dalam file `.env` proyek Anda:

```env
# Supabase Project Configuration
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## 🩺 Troubleshooting "Gagal push ke Supabase"

Pesan error yang muncul di tab **Settings → Database → Push ke Supabase** berasal
langsung dari PostgREST. Berikut pemetaan penyebab dan penanganannya di kode.

### 1. `Could not find the 'g_drive_folder_url' column of 'clients' in the schema cache`

**Penyebab.** Konverter `camelToSnake()` di `src/utils/supabaseAdapter.ts` mengubah
setiap huruf kapital menjadi `_huruf`, sehingga:

| Field TypeScript | Hasil konversi lama | Kolom asli di Postgres |
|---|---|---|
| `gDriveFolderUrl` | `g_drive_folder_url` ❌ | `gdrive_folder_url` |
| `gDriveFolderId` | `g_drive_folder_id` ❌ | `gdrive_folder_id` |
| `gDriveFolderName` | `g_drive_folder_name` ❌ | `gdrive_folder_name` |
| `principalDebtOS` | `principal_debt_o_s` ❌ | `principal_debt_os` |
| `policeNoVIN` | `police_no_v_i_n` ❌ | `police_no_vin` |

**Perbaikan.**
- `camelToSnake()` kini sadar akronim (`OS`, `VIN` tidak dipecah per huruf).
- Penamaan yang tidak bisa ditebak otomatis didaftarkan di `CAMEL_TO_SNAKE_OVERRIDES`
  (`gDriveFolderUrl → gdrive_folder_url`, dst).
- `snakeToCamel()` memakai peta kebalikannya, sehingga **Fetch dari Supabase**
  mengembalikan nama field yang benar (`gDriveFolderUrl`, bukan `gdriveFolderUrl`).
- `toSupabaseRow(table, obj)` memfilter payload memakai manifest kolom nyata
  (`src/utils/supabaseSchemaColumns.ts`). Key yang tidak punya kolom akan dibuang
  dan dilaporkan sebagai *warning*, bukan menggagalkan seluruh tabel.

### 2. `null value in column "created_at" of relation "audit_logs" violates not-null constraint`

**Penyebab.** Adapter mengubah `undefined`/`''` menjadi `null` lalu tetap mengirim
key-nya. Postgres hanya memakai `DEFAULT NOW()` bila kolomnya **tidak dikirim** —
mengirim `null` eksplisit tetap melanggar `NOT NULL`.

**Perbaikan.** Kolom `NOT NULL` yang punya `DEFAULT` (`created_at`, `updated_at`,
`timestamp`, `status`, `sla_days`, dll) didata otomatis di
`SUPABASE_DEFAULTED_NOT_NULL`, dan key-nya dihapus dari payload bila nilainya null.

### 3. `insert or update on table "fees" violates foreign key constraint "fees_client_id_fkey"`

**Penyebab.** Efek beruntun dari error nomor 1: `clients` dan `cases` gagal ter-upsert,
sehingga baris anak (`fees`, `contracts`, `assignments`, `sks`) menunjuk id induk yang
belum ada di database.

**Perbaikan.**
- Urutan push tetap mengikuti `ORDERED_COLLECTIONS` (induk dulu, anak belakangan) dan
  urutan itu kini divalidasi otomatis terhadap definisi FK di migrasi.
- `pushFullStoreToSupabase()` mencatat id yang **benar-benar berhasil tersimpan** per
  tabel. FK menggantung akan dikosongkan (bila kolomnya nullable) atau barisnya
  dilewati, disertai catatan — bukan menggagalkan seluruh tabel.
- Batch yang gagal diulang baris-per-baris agar satu record rusak tidak membatalkan 100
  record lainnya, dan id duplikat dalam satu batch digabung
  (`ON CONFLICT` tidak boleh mengenai baris yang sama dua kali).

### Perintah validasi

```bash
npm run db:columns        # regenerate manifest kolom dari supabase/migrations/*.sql
npm run db:validate       # cek tipe TS <-> kolom Postgres, round-trip key, urutan FK
npm run db:validate:data  # simulasi push memakai data awal ARMS (tanpa jaringan)
```

Jalankan `npm run db:columns` **setiap kali menambah migrasi baru**, lalu
`npm run db:validate`. Semua error di atas akan terdeteksi sebelum tombol
"Push ke Supabase" ditekan.
