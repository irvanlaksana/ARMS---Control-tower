# Migrasi Database ARMS: Supabase (PostgreSQL) → Google Cloud Firestore

Dokumen ini adalah **pegangan resmi migrasi** skema & data ARMS dari
Supabase/PostgreSQL ke **Google Cloud Firestore (Firebase)** — database
**utuh (100%) Google**, tanpa PostgreSQL.

- **Sumber skema (truth):** `schema/migrations/*.sql` (file migrasi PostgreSQL, dipertahankan sebagai referensi skema).
- **Sumber data awal:** `src/data/initialData.ts` — **data yang saat ini ada** di aplikasi (Users, Clients, Personnel, Services, Fees, Contracts, Customers, Cases, Assignments, SK, Cash Accounts, Drive Folders, Notifications, Audit Logs, Settings).
- **Hasil migrasi:** 30 koleksi Firestore + composite indexes + seed data awal.

## 1. Pemetaan Supabase → Firestore

| Konsep Supabase (PostgreSQL) | Padanan Firestore | Keterangan |
|---|---|---|
| Tabel `public.<nama>` | Koleksi `<nama>` | Nama koleksi **identik** dengan nama tabel (snake_case), mis. `lawyer_notices`, `cash_accounts`, `dana_talangan` |
| Primary key `id TEXT` | **Document ID** | `setDoc(doc(db, 'cases', 'CAS-001'))` — ID = field `id` record ARMS |
| Kolom (snake_case) | Field dokumen (**camelCase**) | Field = nama field TypeScript ARMS apa adanya (`gDriveFolderUrl`, `principalDebtOS`, `policeNoVIN`) |
| `TIMESTAMPTZ` / `DATE` | String ISO-8601 | Nilai disimpan sebagai string ISO (mis. `2026-03-01T08:00:00Z`) agar identik dengan state aplikasi |
| `NUMERIC` / `INTEGER` | `number` | Adapter mem-parsing string `"Rp 2.500.000"` → `2500000` |
| `BOOLEAN` | `boolean` | String `"true"` dinormalisasi → `true` |
| `JSONB` | `array` / `map` | `stnkPhotoUrls`, `photos`, `manualSplits`, `databaseConfig` |
| `TEXT` kosong/`NULL` | Field **dihapus** | Firestore lebih konsisten: key tidak ada, bukan `null` |
| Trigger `set_updated_at()` | `firestoreService.ts` | `updatedAt` diisi otomatis saat push/sync |
| Constraint `CHECK (…)` | `firestoreAdapter.ts` | Nilai di luar daftar valid dinormalisasi ke default (mis. `cases.status → NEW`) |
| Foreign key constraint | `sanitizeForeignKeys()` | FK logis dibersihkan saat push: id induk tak ada → dikosongkan (nullable) / baris dilewati |
| RLS policies (`Allow anon read/write`) | `firestore.rules` | Aturan open (project internal); perketat bila dibuka publik |
| `CREATE INDEX` | `firestore.indexes.json` | Composite indexes untuk pola query `where + orderBy` |
| View alias (`fee_configs`, `cash`, dll) | **Tidak dipindah** | Alias tanpa data; aplikasi memakai koleksi aslinya |

### Daftar 30 koleksi (urutan dependensi)

`users`, `clients`, `personnel`, `services`, `fees`, `contracts`, `leads`,
`customers`, `cases`, `assignments`, `sks`, `lawyer_notices`, `comm_logs`,
`assets`, `collections`, `asset_recoveries`, `dana_talangan`, `payments`,
`expenses`, `settlements`, `ledger`, `cash_accounts`, `petty_cash`,
`working_capital`, `documents`, `drive_folders`, `approvals`,
`notifications`, `audit_logs`, `settings`

- `settings` disimpan sebagai **satu dokumen** `settings/app_settings`
  (setara baris tunggal `id = 'app_settings'`).

## 2. Eksekusi Migrasi (sekali saja)

```bash
# 0. Persiapan: Service Account dari project Firebase yang SAMA
#    (project_id = gen-lang-client-0940128449, lihat firebase-applet-config.json)
#    → simpan sebagai ./service-account.json (lokal)
#    → atau env GOOGLE_SERVICE_ACCOUNT_JSON (Netlify / CI)

# 1. (Opsional) Regenerate skema TS bila file migrasi SQL berubah
npm run db:schema

# 2. Validasi data awal terhadap skema TANPA jaringan
npm run db:validate:data

# 3. Jalankan migrasi: meta + seed seluruh data awal + composite indexes
npm run db:setup
#    varian: --dry-run | --seed-only | --meta-only | --index-only
#            --project <id> | --database <id>

# 4. Verifikasi online (jumlah dokumen per koleksi di Firestore)
npm run db:validate:firestore
```

Setelah step 3, browser aplikasi langsung membaca/menulis Firestore yang sama
(tanpa server tengah) via `firebase-applet-config.json`.

## 3. Arsitektur Baru (Netlify + Google)

```
Browser (React SPA di Netlify)
  ├── Firebase Auth (Google Sign-In)            → login user
  ├── Firestore SDK (client-side, langsung)     → DATABASE UTAMA (30 koleksi)
  │     fetch: getDocs per koleksi  /  push: writeBatch (merge) per batch 400
  └── fetch /api/* → Netlify Functions (serverless)
        ├── /api/health                       → status
        ├── /api/drive/status|create-folder|ensure-path|upload
        │                                       → Google Drive (Service Account)
        ├── /api/sheets/setup|sync|fetch      → Google Sheets (ekspor laporan,
        │                                       Service Account; opsional)
        └── /api/surat/open-generator|create-issue
```

- **Database = Google** (Firestore) — diakses langsung dari browser, tanpa
  backend database.
- **Google services**: Firebase Auth (login), Firestore (database),
  Google Drive (dokumen), Google Sheets (ekspor opsional).
- **Satu Service Account** (project Firebase yang sama) dipakai untuk
  Drive, Sheets, dan skrip migrasi/seed.

## 4. Data Awal yang Di-seed (sesuai data yang saat ini ada)

| Koleksi | Data |
|---|---|
| `users` | 4 pengguna (Super Admin, Executive Approver, Komisaris, Investor) |
| `clients` | 4 klien (Adira, BRI, Akulaku, kreditur perorangan) |
| `personnel` | 2 personel (karyawan + mitra DC) |
| `services` | 4 layanan |
| `fees` | 2 konfigurasi fee |
| `contracts` | 2 kontrak/MoU |
| `customers` | 3 debitur |
| `cases` | 3 kasus piutang |
| `assignments` | 1 surat tugas |
| `sks` | 3 surat kuasa |
| `cash_accounts` | 4 rekening kas |
| `drive_folders` | 7 folder Drive resmi |
| `notifications` | 1 notifikasi sistem |
| `audit_logs` | 1 log audit |
| `settings` | profil perusahaan + konfigurasi (1 dokumen) |
| lainnya | koleksi transaksional kosong (siap dipakai) |

## 5. Catatan Operasional

- **Idempoten**: `db:setup` memakai upsert (document ID sama) — aman dijalankan ulang.
- **Backup**: ekspor database dari Firebase Console (Firestore → Export) atau
  pakai tombol *Push ke Firestore + Sheets* di aplikasi untuk salinan Google Sheets.
- **Keamanan**: `firestore.rules` saat ini open (project internal). Untuk
  produksi multi-pengguna, batasi akses dengan klaim Firebase Auth, mis.:
  `allow read, write: if request.auth != null;`
- **Database Firestore**: default `(default)`; override via `VITE_FIRESTORE_DATABASE_ID`
  (build env Netlify) & `FIRESTORE_DATABASE_ID` (skrip).
