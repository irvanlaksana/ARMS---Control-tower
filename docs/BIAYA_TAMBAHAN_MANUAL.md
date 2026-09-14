# Biaya Tambahan Manual (tombol "+") pada Eksekusi Unit & BAST

Fitur tombol **"+ Tambah Biaya"** yang sebelumnya hanya ada di modul
**Debtor Payments & Fee Collections** (*Penerimaan Dana & Perhitungan Fee Tiering →
Kalkulasi Otomatis Fee & Bagi Hasil*) kini tersedia juga di:

| Modul / Layar | Bagian |
| --- | --- |
| **Asset Repossession, BAST & Commission Settlement** (`AssetRecoveryModule`) | lewat modal *Eksekusi Unit Baru (Tier & BAST)* + badge biaya manual di daftar BAST |
| **Eksekusi Unit & Penyerahan BAST** (`UnitExecutionModal`) | kartu *Rincian Perhitungan Fee & Pendapatan Otomatis (Tier Engine)* |
| **Penagihan → interaksi REPOSSESSION** (`CollectionModule`) | panel *Parameter Eksekusi Unit & Perhitungan Tier Otomatis* |
| **Transfer Komisi Mitra DC** (`TransferPartnerCommissionModal`) | *Kalkulasi Bagi Hasil & Persentase Fee Perusahaan* (rincian biaya manual, hanya-baca) |

Perilakunya **identik** dengan modul Pembayaran: tiap baris biaya punya
`nama biaya`, `nominal`, dan `alokasi`:

- **100% Hak Perusahaan** (`COMPANY`) → seluruh nominal menjadi pendapatan perusahaan.
- **Split dengan Mitra** (`SPLIT`) → nominal dibagi sesuai persentase bagi hasil
  (mis. perusahaan 20% / mitra 80%). Bila pelaksana adalah **Karyawan Internal**
  (bukan Mitra DC), seluruh biaya tetap 100% milik perusahaan.

## Alur perhitungan

```
tier engine (calculateRepossessionTierFee)
        │  gross / perusahaan / mitra
        ▼
applyManualFeesToRepossessionTier(calc, manualSplits, companySplitPercent)
        │  + total biaya manual (per alokasi)
        ▼
gross final        = tier.gross        + Σ nominal biaya
perusahaan final   = tier.perusahaan   + Σ (COMPANY 100% | SPLIT × %perusahaan)
mitra final        = tier.mitra        + Σ (SPLIT × %mitra)
```

Helper-nya ada di `src/utils/tierFeeCalculator.ts`:

- `normalizeManualFees(items)` — buang baris kosong/≤ 0, beri nama default, normalkan alokasi.
- `calculateManualFeeTotals(items, { isMitraDC, companySplitPercent })` → `{ total, company, partner, itemCount }`.
- `applyManualFeesToRepossessionTier(calc, items, percent)` → hasil tier final
  (menyimpan juga nilai tier asli: `tierGrossRepossessionFee`, `tierCompanyRevenueAmount`,
  `tierPartnerCommissionAmount`).
- `executeUnitRepossessionAndCloseCase(..., { manualSplits })` — otomatis memakai nilai final.

Komponen UI-nya: `src/components/common/ManualFeeEditor.tsx`
(dipakai `UnitExecutionModal` & `CollectionModule`; blok di `PaymentsModule` tetap seperti semula).

## Yang tercatat saat eksekusi unit disimpan

| Record | Perubahan |
| --- | --- |
| `AssetRecovery` (BAST) | `repossessionFee`, `companyFeeAmount`, `partnerCommissionAmount` sudah termasuk biaya manual + field baru `manualSplits[]` dan `manualFeesTotal` |
| `Payment` (revenue) | `amount` = gross final, `executionFeeAmount` = bagian perusahaan final, `manualSplits[]`, `allocationSummary` menyebut biaya tambahan |
| `LedgerEntry` (jurnal) | `amount` = pendapatan perusahaan final (akun `REVENUE_FEE`, tipe `CREDIT`) |
| `Case` | tetap otomatis `CLOSED` |
| `AuditLog` | catatan eksekusi menyebut jumlah item & total biaya manual |

## Penyimpanan

- **Spreadsheet aktif (Google Apps Script)**: otomatis — kolom baru muncul sendiri
  di tab `Asset_Recoveries` / `Payments` (skema tab mengikuti key record).
- **Supabase**: migrasi `supabase/migrations/20260914000000_add_asset_recovery_manual_fees.sql`
  menambah `manual_splits JSONB` dan `manual_fees_total NUMERIC(18,2)` pada
  `asset_recoveries` (tabel `payments` sudah punya `manual_splits`).
  Jalankan ulang `npm run db:columns` bila menambah kolom lagi.

## Uji

`npm run test:fees` → `scripts/test-manual-fee-export.mjs`
(matematika biaya manual, pencatatan BAST/Payment/Ledger/Audit, regresi tanpa biaya manual,
export spreadsheet, dan render SSR tombol "+").
