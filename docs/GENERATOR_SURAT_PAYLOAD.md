# Integrasi Generator Surat Web (Surat Tugas & BAST)

Modul **Surat Kuasa (SK)** mengirim data ke generator surat web:

| Item | Nilai |
| --- | --- |
| UI online | https://generator-surat-beige.vercel.app/ |
| Repo sumber | https://github.com/irvanlaksana/generator-surat- |
| Model data | `LetterData` (tab **Surat Tugas**) + `BastData` (tab **BAST**) dari `src/types.ts` repo tersebut |
| Ukuran kertas | `PaperSize` = `f4` \| `a4` \| `legal` \| `letter` |
| Tab dokumen | `docType` = `surat_tugas` \| `bast` |
| Versi payload | `2` (`source: "ARMS-CONTROL-TOWER"`) |

> Generator **lokal** (komponen `src/components/assignment-letter/`) tetap ada dan tidak diubah —
> ia memakai model `BastData` versi lama. Yang baru adalah jalur "Kirim ke Generator" (web).

---

## 1. Bentuk payload

```jsonc
{
  "source": "ARMS-CONTROL-TOWER",
  "version": 2,
  "generatedAt": "2026-09-14T03:40:00.000Z",
  "docType": "surat_tugas",          // atau "bast"
  "paperSize": "f4",
  "letter": { /* LetterData lengkap */ },
  "bast":   { /* BastData lengkap   */ },
  "meta": {
    "armsSkId": "SK-001",
    "armsSkNumber": "SK/ARMS/2026/4821",
    "armsCaseNo": "CAS-2026-0007",
    "armsPersonnelId": "PRS-004",
    "armsCustomerId": "CUS-018",
    "clientType": "MULTIFINANCE"
  }
}
```

Kedua objek (`letter` dan `bast`) **selalu** dikirim, sehingga generator bisa membuka
tab mana pun sesuai pilihan pengguna di ARMS (`docType`).

### Pemetaan `letter` (LetterData) ← data ARMS

| Field generator | Sumber di ARMS |
| --- | --- |
| `kopCompanyName` | `settings.companyName` |
| `kopImage` | `settings.companyLogo` (dikirim hanya lewat JSON/postMessage, dibuang dari URL) |
| `kopImageHeight/Fit/Align/OffsetX/OffsetY/MarginBottom` | default generator (120 / contain / center / 0 / 0 / 32) |
| `letterNumber` | `skNumber` form; bila kosong dibuat `001/ST/MJI/29/VIII/2026` (format `utils/letterNumber.ts` generator) |
| `assignerName` / `assignerPosition` | `repName` / `repTitle`; klien perorangan → `krediturName` / "Kreditur / Pemilik Piutang" |
| `assigneeName` / `assigneePosition` | `personnel.fullName` / `personnel.position` |
| `clientName` | kreditur/leasing: `case.clientName` atau `sk.clientName` |
| `customerContract` | `case.multifinanceContractNo` / `customer.contractNo` |
| `customerName` | `customer.fullName` / `case.debtorName` |
| `customerAddress` | `customer.addressCurrent` → `addressKtp` |
| `customerAddressDetail`, `customerKabupaten`, `customerKecamatan`, `customerKelurahan` | hasil `splitIndonesianAddress()` (pola `KEL.`, `KEC.`, `KAB.`, `DESA`) |
| `customerDueDate` | `customer.dueDate` (ISO `yyyy-mm-dd`) |
| `customerInstallment` / `customerTotalInstallment` / `customerPenalty` | `customer.installmentAmount` / `totalInstallment` / `penaltyAmount` (format `Rp 385.000`) |
| `customerUnpaidInstallmentCount` | turunan `case.overdueDays` → "N Bulan" |
| `attachments` | lampiran form SK (KTP/STNK/foto unit) → `{url,width,height}` |
| `vehicleBrand` / `vehiclePlate` | `customer.vehicleMerkType` / `vehiclePoliceNo` |
| `validFrom` / `validTo` | tanggal terbit / kedaluwarsa SK (ISO) |
| `signPlaceDate` | `"<kota>, <tanggal panjang id-ID>"` |

### Pemetaan `bast` (BastData) ← data ARMS

| Field generator | Sumber di ARMS |
| --- | --- |
| `jenis` | `roda2`/`roda4` — dari `asset.category` / `recovery.vehicleType` / kata kunci merk |
| `nomorBast` / `nomorPenyerahan` | `001/BAST/MJI/…` dan `001/SPK/MJI/…` |
| `perusahaan`, `cabang`, `alamat`, `telepon` | `settings.companyName/city/companyAddress/companyPhone` |
| `petugasNama/Nik/Jabatan/Hp` | `personnel.fullName/nikKtp/position/phoneNumber` |
| `debiturNama/Nik/Alamat/Hp` | `customer.fullName/nikKtp/addressCurrent/phone` |
| `nomorKontrak`, `krediturLeasing` | kontrak & leasing (sama seperti `letter`) |
| `kendaraanMerk/Type/NoPol/Tahun` | `customer.vehicleMerkType` (dipecah `/`), `asset.policeNoVIN`, `recovery.vehicleYear` |
| `kendaraanStnk` | `recovery.hasStnk` → "Ada (diserahkan)" / "Tidak ada" |
| `kendaraanKondisiBodi` | `recovery.physicalCondition` / `warehouseLocation` |
| `checklist` | `{}` — generator mengisinya sendiri lewat `syncChecklist(jenis, {})` |
| `kota`, `tanggal` | `city`, tanggal panjang Indonesia |
| `saksi1*`, `saksi2*` | pemberi tugas & petugas |
| `catatanKhusus` | draft/catatan form SK (maks. 600 karakter) |

---

## 2. Jalur pengiriman (4 lapis)

1. **URL payload** — `?payload=<base64url>`; bila lebih dari 1.400 karakter dipindah ke
   fragment `#payload=<base64url>` (fragment tidak dikirim ke server, jadi aman untuk payload besar).
2. **Parameter datar** — `?docType=`, `?tab=`, `?paper=`, `?letterNumber=`, `?assigneeName=`,
   `?customerName=`, `?customerContract=`, `?customerDueDate=`, `?vehicleBrand=`, `?vehiclePlate=`,
   `?validFrom=`, `?validTo=`, `?nomorBast=`, `?nomorPenyerahan=`, `?petugasNama=`, `?debiturNama=`,
   `?nomorKontrak=`, `?krediturLeasing=` — fallback bila aplikasi hanya membaca param sederhana.
3. **postMessage** — pesan `ARMS_GENERATOR_PAYLOAD` dikirim ulang pada 400 / 1200 / 2500 / 4500 ms
   (SPA butuh waktu mount). Generator boleh membalas `ARMS_GENERATOR_READY` atau `ARMS_GENERATOR_ACK`;
   setelah ACK diterima ARMS menampilkan status "ACK generator: diterima ✔".
4. **JSON manual** — tombol *Salin Payload JSON* dan *Unduh JSON* di panel "7. Kirim ke Generator
   Surat Web" pada form SK (otomatis juga disalin ke clipboard saat generator dibuka).

Payload berat (kop/lampiran ber-`data:` atau `blob:`) **dibuang dari URL** tetapi tetap ada di
JSON/postMessage, supaya URL tidak melewati batas browser.

### Contoh request backend

```bash
curl -s -X POST http://localhost:3000/api/surat/open-generator \
  -H 'Content-Type: application/json' \
  -d '{
        "skNumber": "001/ST/MJI/14/IX/2026",
        "docType": "surat_tugas",
        "paperSize": "f4",
        "companyName": "PT. MITRA JASATRIA INDONESIA",
        "city": "Purwokerto",
        "debtor": { "debtorName": "KISNO ANGKAH TRI HIDAYAT", "addressCurrent": "KALIKABONG RT 004 RW 002, KEL. KALIKABONG, KEC. KALIMANAH, KAB. PURBALINGGA", "dueDate": "2026-09-20", "vehicleMerkType": "YAMAHA / VIXION", "vehiclePoliceNo": "R4088YV" },
        "personnel": { "fullName": "RIZKY JUANDA SAPUTRA", "nikKtp": "3302242201940001", "position": "Petugas Penagihan", "phoneNumber": "0812-9876-5432" }
      }'
```

Respons: `{ success, url, payload, encodedPayload, docType, paperSize, payloadInHash, transport }`.

Backend yang tersedia:
- `server.ts` → `POST /api/surat/open-generator` (Express/VPS/lokal)
- `api/surat/open-generator.ts` → Vercel serverless
- `appsscript/Surat.gs` → action `SURAT_OPEN_GENERATOR` (Google Apps Script)
- Ketiganya memakai logika yang sama (`api/lib/generatorLink.ts` / port JS di `Surat.gs`).

Bila frontend sudah mengirim `payload` jadi, backend meneruskannya apa adanya
(`{ payload: { letter, bast, docType, paperSize, ... } }`).

---

## 3. Patch penerima untuk repo `generator-surat-`

Aplikasi generator saat ini **belum membaca parameter URL** (data awal hard-coded di
`src/App.tsx`, BAST dipersist di `localStorage['bast-generator-v1']`). Agar autofill benar-benar
jalan, tempel patch berikut di repo generator (tidak mengubah fitur yang sudah ada).

### 3.1 File baru `src/utils/incomingPayload.ts`

```ts
import { LetterData, BastData, PaperSize } from '../types';
import { syncChecklist } from '../data/defaults';

export type DocumentType = 'surat_tugas' | 'bast';

export interface IncomingPayload {
  source?: string;
  version?: number;
  docType?: DocumentType;
  paperSize?: PaperSize;
  letter?: Partial<LetterData>;
  bast?: Partial<BastData>;
  meta?: Record<string, unknown>;
}

const ACK = 'ARMS_GENERATOR_ACK';
const READY = 'ARMS_GENERATOR_READY';
const INCOMING = 'ARMS_GENERATOR_PAYLOAD';

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

function readPayloadParam(search: string, hash: string): IncomingPayload | null {
  const fromQuery = new URLSearchParams(search).get('payload');
  const fromHash = hash.match(/payload=([^&]+)/)?.[1];
  const encoded = fromQuery || fromHash;
  if (!encoded) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(decodeURIComponent(encoded)));
    if (parsed && typeof parsed === 'object') return parsed as IncomingPayload;
  } catch {
    /* payload rusak -> abaikan */
  }
  return null;
}

/** Baca payload dari URL (query/hash) atau dari parameter datar. */
export function readIncomingPayload(): IncomingPayload | null {
  if (typeof window === 'undefined') return null;
  const { search, hash } = window.location;
  const payload = readPayloadParam(search, hash);
  if (payload && (payload.letter || payload.bast)) return payload;

  const params = new URLSearchParams(search);
  const get = (key: string) => params.get(key) || undefined;
  const docType = (get('docType') || get('tab')) as DocumentType | undefined;
  if (!docType && !get('letterNumber') && !get('nomorBast')) return null;

  return {
    source: get('src') === 'arms' ? 'ARMS-CONTROL-TOWER' : undefined,
    docType,
    paperSize: get('paper') as PaperSize | undefined,
    letter: {
      letterNumber: get('letterNumber'),
      assignerName: get('assignerName'),
      assignerPosition: get('assignerPosition'),
      assigneeName: get('assigneeName'),
      assigneePosition: get('assigneePosition'),
      clientName: get('clientName'),
      customerName: get('customerName'),
      customerContract: get('customerContract'),
      customerDueDate: get('customerDueDate'),
      vehicleBrand: get('vehicleBrand'),
      vehiclePlate: get('vehiclePlate'),
      validFrom: get('validFrom'),
      validTo: get('validTo'),
    } as Partial<LetterData>,
    bast: {
      nomorBast: get('nomorBast'),
      nomorPenyerahan: get('nomorPenyerahan'),
      petugasNama: get('petugasNama'),
      debiturNama: get('debiturNama'),
      nomorKontrak: get('nomorKontrak'),
      krediturLeasing: get('krediturLeasing'),
    } as Partial<BastData>,
  };
}

function dropEmpty<T extends object>(obj: T): T {
  const out: any = {};
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') out[key] = value;
  });
  return out as T;
}

/** Gabungkan payload ke state LetterData & BastData yang sudah ada. */
export function applyIncomingPayload(
  payload: IncomingPayload,
  current: { letter: LetterData; bast: BastData }
): { letter: LetterData; bast: BastData; docType?: DocumentType; paperSize?: PaperSize } {
  const letter = { ...current.letter, ...dropEmpty(payload.letter || {}) } as LetterData;
  const bastRaw = { ...current.bast, ...dropEmpty(payload.bast || {}) } as BastData;
  const bast = {
    ...bastRaw,
    checklist: syncChecklist(bastRaw.jenis ?? current.bast.jenis ?? 'roda4', payload.bast?.checklist ?? bastRaw.checklist ?? {}),
  };
  return { letter, bast, docType: payload.docType, paperSize: payload.paperSize };
}

/** Dengarkan postMessage dari ARMS Control Tower dan balas ACK. */
export function subscribeIncomingPayload(
  onPayload: (payload: IncomingPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => undefined;
  const handler = (event: MessageEvent) => {
    const data: any = event?.data;
    if (!data || typeof data !== 'object' || data.type !== INCOMING) return;
    if (!data.letter && !data.bast) return;
    onPayload({
      source: data.source,
      version: data.version,
      docType: data.docType,
      paperSize: data.paperSize,
      letter: data.letter,
      bast: data.bast,
      meta: data.meta,
    });
    try {
      event.source?.postMessage({ type: ACK, source: 'generator-surat', ok: true }, { targetOrigin: '*' } as any);
    } catch {
      /* ignore */
    }
  };
  window.addEventListener('message', handler);
  try {
    window.parent?.postMessage({ type: READY, source: 'generator-surat' }, '*');
  } catch {
    /* ignore */
  }
  return () => window.removeEventListener('message', handler);
}
```

### 3.2 Perubahan `src/App.tsx`

```tsx
import { useEffect, useState } from 'react';
import { readIncomingPayload, applyIncomingPayload, subscribeIncomingPayload, IncomingPayload } from './utils/incomingPayload';

export default function App() {
  const [docType, setDocType] = useState<DocumentType>('surat_tugas');
  const [data, setData] = useState<LetterData>(initialData);
  const [bastData, setBastData] = useState<BastData>(() => loadInitialBast());
  const [paperSize, setPaperSize] = useState<PaperSize>(DEFAULT_PAPER_SIZE);
  // ... state lain tetap sama ...

  const consumePayload = (payload: IncomingPayload) => {
    const merged = applyIncomingPayload(payload, { letter: data, bast: bastData });
    setData(merged.letter);
    setBastData(merged.bast);
    if (merged.docType) setDocType(merged.docType);
    if (merged.paperSize) setPaperSize(merged.paperSize);
  };

  // 1) payload dari URL saat pertama kali dibuka
  useEffect(() => {
    const payload = readIncomingPayload();
    if (payload) consumePayload(payload);
    // 2) payload susulan lewat postMessage (ARMS mengirim ulang beberapa kali)
    const unsubscribe = subscribeIncomingPayload(consumePayload);
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

> Catatan: `consumePayload` sengaja tidak menghapus nilai default generator — hanya field yang
> benar-benar terisi di ARMS yang menimpa (`dropEmpty`), sehingga aplikasi tetap bisa dipakai manual.

### 3.3 Verifikasi cepat

```bash
# buka URL hasil dari ARMS, pastikan form terisi
https://generator-surat-beige.vercel.app/?src=arms&pv=2&docType=surat_tugas&tab=surat_tugas&paper=f4&letterNumber=001%2FST%2FMJI%2F14%2FIX%2F2026&customerName=KISNO%20ANGKAH%20TRI%20HIDAYAT&payload=<base64url>
```

---

## 4. Berkas terkait di repo ARMS

| Berkas | Peran |
| --- | --- |
| `src/lib/generatorSuratPayload.ts` | tipe `LetterData`/`BastData` (cermin repo generator), builder payload, encode base64url, `buildGeneratorUrl`, `sendPayloadToWindow` |
| `src/lib/suratGenerator.ts` | generator **lokal** (model lama) + re-export konstanta/builder generator web |
| `src/components/modules/SKModule.tsx` | panel "7. Kirim ke Generator Surat Web": pilih tab (Surat Tugas/BAST), ukuran kertas, tombol kirim, ringkasan payload, salin/unduh JSON, salin URL, status ACK |
| `api/lib/generatorLink.ts` | builder tautan bersama untuk Express & Vercel |
| `api/surat/open-generator.ts` | endpoint Vercel |
| `server.ts` | endpoint Express `/api/surat/open-generator` + `/api/surat/create-issue` (repo `generator-surat-`) |
| `appsscript/Surat.gs` | action `SURAT_OPEN_GENERATOR` & `SURAT_CREATE_ISSUE` versi Apps Script |
| `scripts/test-generator-payload.mjs` | uji unit builder payload & tautan generator |
