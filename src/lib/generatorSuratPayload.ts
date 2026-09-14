/**
 * ============================================================================
 *  ARMS — Control Tower :: PAYLOAD GENERATOR SURAT (Surat Tugas & BAST)
 * ============================================================================
 *  UI online : https://generator-surat-beige.vercel.app/
 *  Repo      : https://github.com/irvanlaksana/generator-surat-
 *
 *  Bentuk payload MENGIKUTI PERSIS model data aplikasi generator:
 *    • LetterData  -> tab "Surat Tugas"  (src/types.ts)
 *    • BastData    -> tab "BAST"         (src/types.ts)
 *    • PaperSize   -> 'f4' | 'a4' | 'legal' | 'letter'
 *    • DocType     -> 'surat_tugas' | 'bast'
 *
 *  Payload dikirim ke generator lewat 3 jalur sekaligus (mana pun yang
 *  didukung aplikasi tujuan akan terpakai):
 *    1. query `?payload=<base64url>` (atau `#payload=` bila terlalu panjang),
 *    2. parameter datar (?letterNumber=, ?customerName=, ?assigneeName=, ...),
 *    3. postMessage `ARMS_GENERATOR_PAYLOAD` + handshake `ARMS_GENERATOR_READY`.
 *  Sebagai cadangan manual, JSON payload bisa disalin / diunduh dari modul SK.
 *
 *  Dokumen teknis & patch penerima (sisi generator) ada di:
 *    docs/GENERATOR_SURAT_PAYLOAD.md
 * ============================================================================
 */
import { AssetRecovery, Asset, Case, Customer, Personnel, SK } from '../types/arms';

/* ======================================================================== *
 *  KONSTANTA GENERATOR
 * ======================================================================== */

export const GENERATOR_UI_URL = 'https://generator-surat-beige.vercel.app/';
export const GENERATOR_REPO_URL = 'https://github.com/irvanlaksana/generator-surat-';
export const GENERATOR_PAYLOAD_PARAM = 'payload';
export const GENERATOR_PAYLOAD_VERSION = 2;
export const GENERATOR_SOURCE_ID = 'ARMS-CONTROL-TOWER';

/** Panjang aman query string sebelum payload dipindah ke hash fragment. */
export const GENERATOR_MAX_QUERY_PAYLOAD = 1400;

/* ======================================================================== *
 *  TIPE DATA — CERMIN PERSIS src/types.ts REPO generator-surat-
 * ======================================================================== */

export interface AttachmentData {
  url: string;
  width: number;
  height: number;
}

export type PaperSize = 'f4' | 'a4' | 'legal' | 'letter';

export interface LetterData {
  kopImage: string | null;
  kopImageHeight: number;
  kopImageFit: 'contain' | 'fill' | 'cover';
  kopImageAlign: 'left' | 'center' | 'right';
  kopImageOffsetY: number;
  kopImageOffsetX: number;
  kopImageMarginBottom: number;
  kopCompanyName: string;
  letterNumber: string;
  assignerName: string;
  assignerPosition: string;
  assigneeName: string;
  assigneePosition: string;
  clientName: string;
  customerContract: string;
  customerName: string;
  customerAddress: string;
  customerAddressDetail?: string;
  customerKabupaten?: string;
  customerKecamatan?: string;
  customerKelurahan?: string;
  customerDueDate: string;
  customerInstallment: string;
  customerTotalInstallment: string;
  customerPenalty: string;
  customerUnpaidInstallmentCount: string;
  attachments: AttachmentData[];
  vehicleBrand: string;
  vehiclePlate: string;
  validFrom: string;
  validTo: string;
  signPlaceDate: string;
}

export type VehicleType = 'roda2' | 'roda4';
export type ItemCondition = 'baik' | 'rusak' | 'tidak_ada' | '';

export interface ChecklistItemValue {
  status: ItemCondition;
  statusPihak2?: ItemCondition;
  catatan?: string;
}

export type ChecklistMap = Record<string, ChecklistItemValue>;

export interface BastData {
  jenis: VehicleType;
  nomorBast: string;
  nomorPenyerahan: string;
  perusahaan: string;
  cabang: string;
  alamat: string;
  telepon: string;

  petugasNama: string;
  petugasNik: string;
  petugasJabatan: string;
  petugasHp: string;

  debiturNama: string;
  debiturNik: string;
  debiturAlamat: string;
  debiturHp: string;
  nomorKontrak: string;
  krediturLeasing: string;

  kendaraanMerk: string;
  kendaraanType: string;
  kendaraanTahun: string;
  kendaraanWarna: string;
  kendaraanNoPol: string;
  kendaraanNoRangka: string;
  kendaraanNoMesin: string;
  kendaraanBpkb: string;
  kendaraanStnk: string;
  kendaraanOdometer: string;
  kendaraanBahanBakar: string;
  kendaraanKondisiMesin: string;
  kendaraanKondisiBodi: string;

  checklist: ChecklistMap;

  kota: string;
  tanggal: string;

  saksi1Nama: string;
  saksi1Jabatan: string;
  saksi2Nama: string;
  saksi2Jabatan: string;

  catatanKhusus: string;
}

export type GeneratorDocType = 'surat_tugas' | 'bast';

export interface GeneratorPayloadMeta {
  armsSkId?: string;
  armsSkNumber?: string;
  armsCaseId?: string;
  armsCaseNo?: string;
  armsPersonnelId?: string;
  armsCustomerId?: string;
  clientType?: 'PERORANGAN' | 'MULTIFINANCE' | string;
  note?: string;
}

export interface GeneratorPayload {
  /** Penanda asal payload — dipakai aplikasi generator untuk validasi. */
  source: typeof GENERATOR_SOURCE_ID;
  version: number;
  generatedAt: string;
  docType: GeneratorDocType;
  paperSize: PaperSize;
  letter: LetterData;
  bast: BastData;
  meta?: GeneratorPayloadMeta;
}

/** Input dari Form Pembuatan Surat Tugas / Kuasa (modul SK) + konteks ARMS. */
export interface WebGeneratorInput {
  skNumber?: string;
  skId?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyLogo?: string | null;
  repName?: string;
  repTitle?: string;
  city?: string;
  isPerorangan?: boolean;
  krediturName?: string;
  krediturNik?: string;
  krediturAddress?: string;
  personnel?: Personnel | null;
  caseItem?: Case | null;
  customer?: Customer | null;
  asset?: Asset | null;
  recovery?: AssetRecovery | null;
  sk?: SK | null;
  contractNo?: string;
  debtorName?: string;
  debtorAddress?: string;
  debtorPhone?: string;
  dueDate?: string;
  installment?: string;
  totalInstallment?: string;
  unpaidInstallmentCount?: string;
  penalty?: string;
  vehicleMerk?: string;
  vehiclePoliceNo?: string;
  customNominal?: number;
  issuedDate?: string;
  expiryDate?: string;
  attachments?: string[];
  notes?: string;
  docType?: GeneratorDocType;
  paperSize?: PaperSize;
  sequence?: string | number;
}

/* ======================================================================== *
 *  DEFAULT (SAMPAI DETAIL YANG SAMA DENGAN initialData APLIKASI GENERATOR)
 * ======================================================================== */

export const DEFAULT_COMPANY_NAME = 'PT. MITRA JASATRIA INDONESIA';
export const DEFAULT_KOP_HEIGHT = 120;
export const DEFAULT_KOP_MARGIN_BOTTOM = 32;

const DEFAULT_LETTER_SKELETON: Omit<LetterData, 'letterNumber'> = {
  kopImage: null,
  kopImageHeight: DEFAULT_KOP_HEIGHT,
  kopImageFit: 'contain',
  kopImageAlign: 'center',
  kopImageOffsetY: 0,
  kopImageOffsetX: 0,
  kopImageMarginBottom: DEFAULT_KOP_MARGIN_BOTTOM,
  kopCompanyName: DEFAULT_COMPANY_NAME,
  assignerName: '',
  assignerPosition: '',
  assigneeName: '',
  assigneePosition: '',
  clientName: '',
  customerContract: '',
  customerName: '',
  customerAddress: '',
  customerAddressDetail: '',
  customerKabupaten: '',
  customerKecamatan: '',
  customerKelurahan: '',
  customerDueDate: '',
  customerInstallment: '',
  customerTotalInstallment: '',
  customerPenalty: '',
  customerUnpaidInstallmentCount: '',
  attachments: [],
  vehicleBrand: '',
  vehiclePlate: '',
  validFrom: '',
  validTo: '',
  signPlaceDate: '',
};

const DEFAULT_BAST_SKELETON: BastData = {
  jenis: 'roda4',
  nomorBast: '',
  nomorPenyerahan: '',
  perusahaan: DEFAULT_COMPANY_NAME,
  cabang: '',
  alamat: '',
  telepon: '',
  petugasNama: '',
  petugasNik: '',
  petugasJabatan: '',
  petugasHp: '',
  debiturNama: '',
  debiturNik: '',
  debiturAlamat: '',
  debiturHp: '',
  nomorKontrak: '',
  krediturLeasing: '',
  kendaraanMerk: '',
  kendaraanType: '',
  kendaraanTahun: '',
  kendaraanWarna: '',
  kendaraanNoPol: '',
  kendaraanNoRangka: '',
  kendaraanNoMesin: '',
  kendaraanBpkb: '',
  kendaraanStnk: '',
  kendaraanOdometer: '',
  kendaraanBahanBakar: '',
  kendaraanKondisiMesin: '',
  kendaraanKondisiBodi: '',
  /**
   * Dikirim kosong: aplikasi generator memanggil syncChecklist(jenis, checklist)
   * sehingga item checklist default (status 'baik') otomatis terisi.
   */
  checklist: {},
  kota: '',
  tanggal: '',
  saksi1Nama: '',
  saksi1Jabatan: '',
  saksi2Nama: '',
  saksi2Jabatan: '',
  catatanKhusus: '',
};

/* ======================================================================== *
 *  HELPER FORMAT
 * ======================================================================== */

const ROMAN_MONTHS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

export function getRomanMonth(monthIndex: number): string {
  return ROMAN_MONTHS[monthIndex] || 'I';
}

/** Inisial perusahaan — aturan sama dengan utils/letterNumber.ts generator. */
export function extractCompanyInitials(companyName?: string): string {
  if (!companyName || !companyName.trim()) return 'MJI';
  const clean = companyName.trim();
  if (/^[A-Z0-9]{2,6}$/i.test(clean)) return clean.toUpperCase();

  const withoutPrefix = clean
    .replace(/^(PT\.?|CV\.?|KOPERASI|KOP\.?|UD\.?|PERUM\.?|PERSERO\.?)\s+/gi, '')
    .trim();
  const upper = withoutPrefix.toUpperCase();

  if (upper.includes('MITRA JASATRIA INDONESIA') || upper.includes('MITRAJASA SATRIA INDONESIA')) return 'MJI';
  if (upper.includes('ANUGRAH MEGA MANDIRI')) return 'KAMM';
  if (upper.includes('OTO MULTIARTHA')) return 'OTO';
  if (upper.includes('FEDERAL INTERNATIONAL FINANCE') || upper.includes('FIF GROUP')) return 'FIF';
  if (upper.includes('BUSSAN AUTO FINANCE')) return 'BAF';
  if (upper.includes('ADIRA')) return 'ADIRA';
  if (upper.includes('WOM FINANCE')) return 'WOM';
  if (upper.includes('KREDIT PLUS') || upper.includes('KB FINANSIA')) return 'KB-KP';

  const words = withoutPrefix.split(/[\s,.-]+/).filter((w) => w.length > 1);
  if (words.length >= 2) {
    const acronym = words.map((w) => w[0].toUpperCase()).join('');
    if (acronym.length >= 2 && acronym.length <= 5) return acronym;
  }
  return withoutPrefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'MJI';
}

export type OfficialLetterType = 'ST' | 'BAST' | 'SPK';

/**
 * Nomor surat resmi dengan format generator:
 *   [NO_URUT]/[ST|BAST|SPK]/[INISIAL_PT]/[TGL]/[BULAN_ROMAWI]/[TAHUN]
 *   contoh: 001/ST/MJI/29/VIII/2026
 */
export function buildOfficialLetterNumber(options: {
  type: OfficialLetterType;
  companyName?: string;
  date?: Date | string;
  sequence?: string | number;
}): string {
  let d = new Date();
  if (options.date) {
    const parsed = typeof options.date === 'string' ? new Date(options.date) : options.date;
    if (!isNaN(parsed.getTime())) d = parsed;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const roman = getRomanMonth(d.getMonth());
  const year = d.getFullYear();
  const initials = extractCompanyInitials(options.companyName);
  const seq = options.sequence ? String(options.sequence).padStart(3, '0') : '001';
  return `${seq}/${options.type}/${initials}/${day}/${roman}/${year}`;
}

/** Tanggal ISO (yyyy-mm-dd) — format yang dipakai <input type="date"> generator. */
export function toIsoDate(value?: string | Date | null, fallback?: Date): string {
  const base = fallback ? new Date(fallback) : new Date();
  if (!value) return isoOf(base);
  if (value instanceof Date) return isoOf(value);
  const normalized = String(value).trim().replace(/[./]/g, '-');
  const d = new Date(normalized);
  if (isNaN(d.getTime())) {
    // coba format "29 Agustus 2026"
    const longMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (longMatch) {
      const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
      const mi = months.indexOf(longMatch[2].toLowerCase());
      if (mi >= 0) return `${longMatch[3]}-${String(mi + 1).padStart(2, '0')}-${String(longMatch[1]).padStart(2, '0')}`;
    }
    return isoOf(base);
  }
  return isoOf(d);
}

function isoOf(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Tanggal panjang Indonesia: "29 Agustus 2026". */
export function toLongIdDate(value?: string | Date | null): string {
  const iso = toIsoDate(value);
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Format rupiah singkat: 385000 -> "Rp 385.000". String berformat dilewatkan. */
export function formatRupiah(value?: string | number | null): string {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value).trim();
  if (!text) return '';
  if (/rp/i.test(text)) return text;
  const num = Number(text.replace(/[^\d.-]/g, ''));
  if (!isNaN(num) && /^[\d.,\s-]+$/.test(text)) return `Rp ${num.toLocaleString('id-ID')}`;
  return text;
}

/** Pisahkan alamat jadi detail / kelurahan / kecamatan / kabupaten (pola alamat Jateng). */
export function splitIndonesianAddress(address?: string | null): {
  detail: string;
  kelurahan: string;
  kecamatan: string;
  kabupaten: string;
} {
  const raw = String(address || '').trim();
  const empty = { detail: '', kelurahan: '', kecamatan: '', kabupaten: '' };
  if (!raw) return empty;

  const upper = raw.toUpperCase();
  const grab = (patterns: RegExp[]): string => {
    for (const p of patterns) {
      const m = upper.match(p);
      if (m?.[1]) return m[1].trim();
    }
    return '';
  };

  const kabupaten = grab([
    /KAB(?:UPATEN)?\.?\s+([A-Z\s]+?)(?:,|KEC\.|KEL\.|DESA|$)/,
    /\b([A-Z\s]+)\s*(?:REGENCY)?\b(?=,\s*JAWA|$)/,
  ]);
  const kecamatan = grab([/KEC(?:AMATAN)?\.?\s+([A-Z\s]+?)(?:,|KEL\.|DESA|KAB\.|$)/]);
  const kelurahan = grab([
    /KEL(?:URAHAN)?\.?\s+([A-Z\s]+?)(?:,|KEC\.|KAB\.|$)/,
    /DESA\s+([A-Z\s]+?)(?:,|KEC\.|KAB\.|$)/,
  ]);

  const detail = raw
    .replace(/,?\s*KEL(?:URAHAN)?\.?\s+[A-Z\s]+/gi, '')
    .replace(/,?\s*DESA\s+[A-Z\s]+/gi, '')
    .replace(/,?\s*KEC(?:AMATAN)?\.?\s+[A-Z\s]+/gi, '')
    .replace(/,?\s*KAB(?:UPATEN)?\.?\s+[A-Z\s]+/gi, '')
    .replace(/,?\s*(JAWA\s+TENGAH|JAWA\s+BARAT|JAWA\s+TIMUR|D\.?\s*I\.?\s*YOGYAKARTA)\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  return { detail: detail || raw, kelurahan, kecamatan, kabupaten };
}

/** Deteksi roda2 / roda4 dari kategori aset + teks merk (aturan generator). */
export function inferVehicleType(input: {
  merk?: string;
  category?: Asset['category'];
  vehicleType?: AssetRecovery['vehicleType'];
  assetSummary?: string;
}): VehicleType {
  const cat = String(input.category || input.vehicleType || '').toUpperCase();
  if (cat.includes('MOTORCYCLE') || cat === 'MOTORCYCLE') return 'roda2';
  if (cat.includes('PASSENGER') || cat.includes('COMMERCIAL') || cat.includes('HEAVY')) return 'roda4';

  const text = `${input.merk || ''} ${input.assetSummary || ''}`.toLowerCase();
  const motorKeywords =
    /motor|beat|vario|nmax|pcx|scoopy|matic|supra|jupiter|mio|soul|satria|ninja|rx-?k|mx king|vixion|crf|adv\b|cbr|vespa|klx|genio|fazzio|aerox|lexi|fino|grand|revo|shogun|spin|satria fu|nmax|pcx|ADV150|ADV160/i;
  if (motorKeywords.test(text)) return 'roda2';
  const carKeywords = /mobil|avanza|xenia|brio|jazz|yaris|rush|terios|ertiga|xl7|pajero|fortuner|innova|cayla|sigra|agya|ayla|pickup|truk|truck|l300|gran max|carry/i;
  if (carKeywords.test(text)) return 'roda4';
  return 'roda4';
}

/** Pecah "YAMAHA / VIXION" jadi merk & tipe (pola generator: kendaraanMerk / kendaraanType). */
export function splitVehicleBrandModel(text?: string | null): { merk: string; type: string } {
  const raw = String(text || '').trim();
  if (!raw) return { merk: '', type: '' };
  if (raw.includes('/')) {
    const [merk, type] = raw.split('/');
    return { merk: merk.trim(), type: (type || '').trim() };
  }
  const parts = raw.split(/\s+/);
  if (parts.length >= 2) return { merk: parts[0], type: parts.slice(1).join(' ') };
  return { merk: raw, type: '' };
}

/** Ubah daftar lampiran (data URL / URL Drive) jadi AttachmentData generator. */
export function toAttachments(urls?: string[] | null, width = 600, height = 380): AttachmentData[] {
  if (!Array.isArray(urls)) return [];
  return urls
    .filter((u) => typeof u === 'string' && u.trim().length > 0)
    .map((u) => ({ url: u.trim(), width, height }));
}

/**
 * Buang bagian payload yang terlalu berat untuk query string:
 * lampiran/kop ber-data-URL dihapus (tetap ada di JSON yang disalin/diunduh).
 */
export function compactPayloadForUrl(payload: GeneratorPayload): GeneratorPayload {
  const stripHeavy = (value?: string | null): string | null => {
    if (!value) return null;
    return value.startsWith('data:') || value.startsWith('blob:') ? null : value;
  };
  return {
    ...payload,
    letter: {
      ...payload.letter,
      kopImage: stripHeavy(payload.letter.kopImage),
      attachments: (payload.letter.attachments || []).filter(
        (a) => a && typeof a.url === 'string' && !a.url.startsWith('data:') && !a.url.startsWith('blob:')
      ),
    },
    bast: {
      ...payload.bast,
      catatanKhusus: String(payload.bast.catatanKhusus || '').slice(0, 400),
    },
  };
}

/* ======================================================================== *
 *  PEMBANGUN LetterData (TAB "SURAT TUGAS")
 * ======================================================================== */

export function buildLetterData(input: WebGeneratorInput): LetterData {
  const personnel = input.personnel;
  const caseItem = input.caseItem;
  const customer = input.customer;
  const sk = input.sk;
  const recovery = input.recovery;

  const company = (input.companyName || DEFAULT_COMPANY_NAME).trim();
  const issuedIso = toIsoDate(input.issuedDate || sk?.issuedDate, new Date());
  const expiryIso = toIsoDate(input.expiryDate || sk?.expiryDate, new Date(Date.now() + 3 * 86400000));

  const kreditur =
    (input.isPerorangan ? input.krediturName || sk?.krediturName : '') ||
    caseItem?.clientName ||
    sk?.clientName ||
    customer?.workplace ||
    '';

  const debtorName = input.debtorName || customer?.fullName || caseItem?.debtorName || sk?.debtorName || '';
  const debtorAddress =
    input.debtorAddress || customer?.addressCurrent || customer?.addressKtp || input.krediturAddress || '';
  const addressParts = splitIndonesianAddress(debtorAddress);

  const contractNo = input.contractNo || caseItem?.multifinanceContractNo || customer?.contractNo || '';
  const vehicleText = input.vehicleMerk || customer?.vehicleMerkType || caseItem?.assetSummary || recovery?.assetDescription || '';
  const brandModel = splitVehicleBrandModel(vehicleText);
  const plate = input.vehiclePoliceNo || customer?.vehiclePoliceNo || '';

  const installmentText = input.installment || customer?.installmentAmount || '';
  const totalText =
    input.totalInstallment ||
    (customer?.totalInstallment ? formatRupiah(customer.totalInstallment) : '');
  const penaltyText = input.penalty || customer?.penaltyAmount || '';

  const unpaidCount =
    input.unpaidInstallmentCount ||
    (caseItem?.overdueDays ? `${Math.max(1, Math.round(caseItem.overdueDays / 30))} Bulan` : '');

  const letterNumber =
    (input.skNumber || sk?.skNumber || '').trim() ||
    buildOfficialLetterNumber({
      type: 'ST',
      companyName: company,
      date: issuedIso,
      sequence: input.sequence,
    });

  const signCity = (input.city || '').trim();
  const signPlaceDate = signCity ? `${signCity}, ${toLongIdDate(issuedIso)}` : toLongIdDate(issuedIso);

  const kopImage = (() => {
    const logo = input.companyLogo;
    if (!logo) return null;
    // data URL terlalu berat untuk query string; tetap dikirim lewat JSON/postMessage
    return logo;
  })();

  return {
    ...DEFAULT_LETTER_SKELETON,
    kopImage,
    kopCompanyName: company,
    letterNumber,
    assignerName: (input.isPerorangan ? input.krediturName || kreditur : input.repName || '').trim(),
    assignerPosition: (input.isPerorangan ? 'Kreditur / Pemilik Piutang' : input.repTitle || '').trim(),
    assigneeName: (personnel?.fullName || sk?.personnelName || '').trim(),
    assigneePosition: (personnel?.position || 'Petugas Penagihan').trim(),
    clientName: kreditur,
    customerContract: contractNo,
    customerName: debtorName,
    customerAddress: debtorAddress,
    customerAddressDetail: addressParts.detail,
    customerKabupaten: addressParts.kabupaten,
    customerKecamatan: addressParts.kecamatan,
    customerKelurahan: addressParts.kelurahan,
    customerDueDate: toIsoDate(input.dueDate || customer?.dueDate),
    customerInstallment: formatRupiah(installmentText),
    customerTotalInstallment: formatRupiah(totalText),
    customerPenalty: formatRupiah(penaltyText),
    customerUnpaidInstallmentCount: unpaidCount,
    attachments: toAttachments(input.attachments),
    vehicleBrand: vehicleText || `${brandModel.merk}${brandModel.type ? ` / ${brandModel.type}` : ''}`.trim(),
    vehiclePlate: plate,
    validFrom: issuedIso,
    validTo: expiryIso,
    signPlaceDate,
  };
}

/* ======================================================================== *
 *  PEMBANGUN BastData (TAB "BAST")
 * ======================================================================== */

export function buildBastData(input: WebGeneratorInput): BastData {
  const personnel = input.personnel;
  const caseItem = input.caseItem;
  const customer = input.customer;
  const asset = input.asset;
  const recovery = input.recovery;
  const sk = input.sk;

  const company = (input.companyName || DEFAULT_COMPANY_NAME).trim();
  const issuedIso = toIsoDate(input.issuedDate || sk?.issuedDate || recovery?.recoveryDate, new Date());

  const vehicleText = input.vehicleMerk || customer?.vehicleMerkType || asset?.brandModel || caseItem?.assetSummary || recovery?.assetDescription || '';
  const brandModel = splitVehicleBrandModel(vehicleText);
  const plate = input.vehiclePoliceNo || customer?.vehiclePoliceNo || (asset?.policeNoVIN || '');
  const jenis = inferVehicleType({
    merk: vehicleText,
    category: asset?.category,
    vehicleType: recovery?.vehicleType,
    assetSummary: caseItem?.assetSummary,
  });

  const kreditur =
    (input.isPerorangan ? input.krediturName || sk?.krediturName : '') ||
    caseItem?.clientName ||
    sk?.clientName ||
    customer?.workplace ||
    '';

  const contractNo = input.contractNo || caseItem?.multifinanceContractNo || customer?.contractNo || '';
  const nomorBast = buildOfficialLetterNumber({
    type: 'BAST',
    companyName: company,
    date: issuedIso,
    sequence: input.sequence,
  });
  const nomorPenyerahan = buildOfficialLetterNumber({
    type: 'SPK',
    companyName: company,
    date: issuedIso,
    sequence: input.sequence,
  });

  const kondisiMap: Record<string, string> = {
    EXCELLENT: 'Sangat baik / istimewa',
    GOOD: 'Baik, layak jalan',
    FAIR: 'Cukup, ada lecet pemakaian',
    DAMAGED: 'Rusak, perlu perbaikan',
    PARTS_MISSING: 'Ada komponen hilang',
  };

  const catatan =
    (input.notes || '').trim() ||
    `Penyerahan unit kendaraan dilakukan secara sukarela sehubungan dengan penyelesaian kewajiban angsuran pembiayaan${
      contractNo ? ` nomor kontrak ${contractNo}` : ''
    }.`;

  return {
    ...DEFAULT_BAST_SKELETON,
    jenis,
    nomorBast,
    nomorPenyerahan,
    perusahaan: company,
    cabang: (input.city || '').trim(),
    alamat: (input.companyAddress || '').trim(),
    telepon: (input.companyPhone || '').trim(),

    petugasNama: (personnel?.fullName || sk?.personnelName || '').trim(),
    petugasNik: (personnel?.nikKtp || '').trim(),
    petugasJabatan: (personnel?.position || 'Petugas Remedial / Eksekusi Penagihan').trim(),
    petugasHp: (personnel?.phoneNumber || '').trim(),

    debiturNama: (input.debtorName || customer?.fullName || caseItem?.debtorName || sk?.debtorName || '').trim(),
    debiturNik: (customer?.nikKtp || caseItem?.debtorNik || sk?.krediturNik || '').trim(),
    debiturAlamat: (input.debtorAddress || customer?.addressCurrent || customer?.addressKtp || '').trim(),
    debiturHp: (input.debtorPhone || customer?.phone || '').trim(),
    nomorKontrak: contractNo,
    krediturLeasing: kreditur,

    kendaraanMerk: brandModel.merk,
    kendaraanType: brandModel.type,
    kendaraanTahun: recovery?.vehicleYear ? String(recovery.vehicleYear) : '',
    kendaraanWarna: '',
    kendaraanNoPol: plate,
    kendaraanNoRangka: '',
    kendaraanNoMesin: '',
    kendaraanBpkb: '',
    kendaraanStnk:
      recovery?.hasStnk === undefined ? '' : recovery.hasStnk ? 'Ada (diserahkan)' : 'Tidak ada',
    kendaraanOdometer: '',
    kendaraanBahanBakar: '',
    kendaraanKondisiMesin: '',
    kendaraanKondisiBodi:
      (recovery?.physicalCondition && kondisiMap[recovery.physicalCondition]) ||
      (recovery?.warehouseLocation ? `Unit di ${recovery.warehouseLocation}` : ''),

    checklist: {},
    kota: (input.city || '').trim(),
    tanggal: toLongIdDate(issuedIso),

    saksi1Nama: (input.repName || '').trim(),
    saksi1Jabatan: (input.repTitle || '').trim(),
    saksi2Nama: (personnel?.fullName || '').trim(),
    saksi2Jabatan: (personnel?.position || 'Petugas Lapangan').trim(),

    catatanKhusus: catatan.slice(0, 600),
  };
}

/* ======================================================================== *
 *  PAYLOAD UTAMA
 * ======================================================================== */

export function buildGeneratorPayload(input: WebGeneratorInput = {}): GeneratorPayload {
  const docType: GeneratorDocType = input.docType === 'bast' ? 'bast' : 'surat_tugas';
  const paperSize: PaperSize = (['f4', 'a4', 'legal', 'letter'] as PaperSize[]).includes(input.paperSize as PaperSize)
    ? (input.paperSize as PaperSize)
    : 'f4';

  return {
    source: GENERATOR_SOURCE_ID,
    version: GENERATOR_PAYLOAD_VERSION,
    generatedAt: new Date().toISOString(),
    docType,
    paperSize,
    letter: buildLetterData(input),
    bast: buildBastData(input),
    meta: {
      armsSkId: input.skId || input.sk?.id,
      armsSkNumber: input.skNumber || input.sk?.skNumber,
      armsCaseId: input.caseItem?.id,
      armsCaseNo: input.caseItem?.caseNo || input.sk?.caseNo,
      armsPersonnelId: input.personnel?.id || input.sk?.personnelId,
      armsCustomerId: input.customer?.id,
      clientType: input.isPerorangan ? 'PERORANGAN' : 'MULTIFINANCE',
      note: 'Payload otomatis dari ARMS Control Tower (modul Surat Kuasa).',
    },
  };
}

/* ======================================================================== *
 *  ENCODE / DECODE / URL
 * ======================================================================== */

function toBase64Url(json: string): string {
  if (typeof btoa === 'function') {
    const bytes = typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json) : null;
    let binary = '';
    if (bytes) bytes.forEach((b) => (binary += String.fromCharCode(b)));
    else binary = unescape(encodeURIComponent(json));
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  // Node (dipakai saat build / test server-side)
  return Buffer.from(json, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  if (typeof atob === 'function') {
    const binary = atob(padded);
    if (typeof TextDecoder !== 'undefined') {
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return new TextDecoder('utf-8').decode(bytes);
    }
    return decodeURIComponent(escape(binary));
  }
  return Buffer.from(padded, 'base64').toString('utf-8');
}

/** Encode payload ke base64url untuk `?payload=` / `#payload=`. */
export function encodeGeneratorPayload(payload: GeneratorPayload | Record<string, unknown>): string {
  return toBase64Url(JSON.stringify(payload));
}

/** Decode payload base64url (dipakai test & debug). */
export function decodeGeneratorPayload(encoded: string): GeneratorPayload | null {
  try {
    const parsed = JSON.parse(fromBase64Url(encoded));
    if (parsed && typeof parsed === 'object') return parsed as GeneratorPayload;
    return null;
  } catch {
    return null;
  }
}

/**
 * URL generator lengkap dengan payload.
 * - payload kecil  -> `?payload=<base64url>` + parameter datar,
 * - payload besar  -> parameter datar + `#payload=<base64url>` (tidak terkirim ke server).
 */
export function buildGeneratorUrl(payload: GeneratorPayload, options?: { maxLength?: number }): string {
  const compact = compactPayloadForUrl(payload);
  const encoded = encodeGeneratorPayload(compact);
  const max = options?.maxLength ?? GENERATOR_MAX_QUERY_PAYLOAD;

  const base = GENERATOR_UI_URL.replace(/\/$/, '');
  const params = new URLSearchParams();
  params.set('src', 'arms');
  params.set('pv', String(payload.version));
  params.set('docType', payload.docType);
  params.set('tab', payload.docType === 'bast' ? 'bast' : 'surat_tugas');
  params.set('paper', payload.paperSize);

  // Parameter datar (fallback bila aplikasi tujuan belum membaca payload)
  const flat: Record<string, string> = {
    letterNumber: compact.letter.letterNumber,
    assignerName: compact.letter.assignerName,
    assignerPosition: compact.letter.assignerPosition,
    assigneeName: compact.letter.assigneeName,
    assigneePosition: compact.letter.assigneePosition,
    clientName: compact.letter.clientName,
    customerName: compact.letter.customerName,
    customerContract: compact.letter.customerContract,
    customerDueDate: compact.letter.customerDueDate,
    vehicleBrand: compact.letter.vehicleBrand,
    vehiclePlate: compact.letter.vehiclePlate,
    validFrom: compact.letter.validFrom,
    validTo: compact.letter.validTo,
    nomorBast: compact.bast.nomorBast,
    nomorPenyerahan: compact.bast.nomorPenyerahan,
    petugasNama: compact.bast.petugasNama,
    debiturNama: compact.bast.debiturNama,
    nomorKontrak: compact.bast.nomorKontrak,
    krediturLeasing: compact.bast.krediturLeasing,
  };
  Object.entries(flat).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const withQuery = `${base}/?${params.toString()}`;
  if (encoded.length <= max) {
    params.set(GENERATOR_PAYLOAD_PARAM, encoded);
    return `${base}/?${params.toString()}`;
  }
  return `${withQuery}#${GENERATOR_PAYLOAD_PARAM}=${encoded}`;
}

/** JSON payload rapi untuk disalin / diunduh (cadangan autofill manual). */
export function generatorPayloadJson(payload: GeneratorPayload): string {
  return JSON.stringify(payload, null, 2);
}

/** Unduh payload sebagai berkas .json (hanya di browser). */
export function downloadGeneratorPayload(payload: GeneratorPayload, fileName?: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const name = fileName || `arms-generator-payload-${(payload.meta?.armsSkNumber || payload.docType).toString().replace(/[^\w.-]+/g, '_')}.json`;
  const blob = new Blob([generatorPayloadJson(payload)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ======================================================================== *
 *  HANDSHAKE postMessage (jalur ke-3)
 * ======================================================================== */

export const GENERATOR_MESSAGE_TYPE = 'ARMS_GENERATOR_PAYLOAD';
export const GENERATOR_READY_TYPE = 'ARMS_GENERATOR_READY';
export const GENERATOR_ACK_TYPE = 'ARMS_GENERATOR_ACK';

export interface GeneratorMessage {
  type: typeof GENERATOR_MESSAGE_TYPE;
  source: typeof GENERATOR_SOURCE_ID;
  version: number;
  docType: GeneratorDocType;
  paperSize: PaperSize;
  letter: LetterData;
  bast: BastData;
  meta?: GeneratorPayloadMeta;
}

export function toGeneratorMessage(payload: GeneratorPayload): GeneratorMessage {
  return {
    type: GENERATOR_MESSAGE_TYPE,
    source: payload.source,
    version: payload.version,
    docType: payload.docType,
    paperSize: payload.paperSize,
    letter: payload.letter,
    bast: payload.bast,
    meta: payload.meta,
  };
}

/**
 * Kirim payload ke jendela generator melalui postMessage secara berulang
 * (aplikasi SPA butuh waktu mount). Berhenti setelah ACK diterima atau
 * semua percobaan selesai. Mengembalikan fungsi pembersih listener.
 */
export function sendPayloadToWindow(
  win: Window | null,
  payload: GeneratorPayload,
  options?: { delays?: number[]; targetOrigin?: string; onAck?: (ack: boolean) => void }
): () => void {
  const delays = options?.delays || [400, 1200, 2500, 4500];
  const targetOrigin = options?.targetOrigin || '*';
  if (!win || typeof window === 'undefined') return () => undefined;

  const message = toGeneratorMessage(payload);
  let done = false;
  const timers: number[] = [];

  const listener = (event: MessageEvent) => {
    const data: any = event?.data;
    if (!data || typeof data !== 'object') return;
    if (data.type === GENERATOR_ACK_TYPE || data.type === GENERATOR_READY_TYPE) {
      done = true;
      timers.forEach((t) => window.clearTimeout(t));
      try {
        win.postMessage(message, targetOrigin);
      } catch {
        /* ignore */
      }
      options?.onAck?.(true);
      window.removeEventListener('message', listener);
    }
  };
  window.addEventListener('message', listener);

  delays.forEach((delay) => {
    const timer = window.setTimeout(() => {
      if (done) return;
      try {
        win.postMessage(message, targetOrigin);
      } catch {
        /* ignore */
      }
    }, delay);
    timers.push(timer);
  });

  const finalTimer = window.setTimeout(() => {
    if (!done) options?.onAck?.(false);
    window.removeEventListener('message', listener);
  }, delays[delays.length - 1] + 1500);
  timers.push(finalTimer);

  return () => {
    done = true;
    timers.forEach((t) => window.clearTimeout(t));
    window.removeEventListener('message', listener);
  };
}

/* ======================================================================== *
 *  RINGKASAN UNTUK UI (dipakai modul SK)
 * ======================================================================== */

export interface GeneratorPayloadSummary {
  docType: GeneratorDocType;
  docTypeLabel: string;
  paperSize: PaperSize;
  letterNumber: string;
  assigneeName: string;
  customerName: string;
  vehicle: string;
  urlLength: number;
  payloadBytes: number;
  transportedVia: string[];
}

export function summarizeGeneratorPayload(payload: GeneratorPayload, url: string): GeneratorPayloadSummary {
  const json = generatorPayloadJson(payload);
  return {
    docType: payload.docType,
    docTypeLabel: payload.docType === 'bast' ? 'BAST (Berita Acara Serah Terima)' : 'Surat Tugas Penagihan',
    paperSize: payload.paperSize,
    letterNumber: payload.letter.letterNumber || payload.bast.nomorBast,
    assigneeName: payload.letter.assigneeName || payload.bast.petugasNama,
    customerName: payload.letter.customerName || payload.bast.debiturNama,
    vehicle: [payload.letter.vehicleBrand, payload.letter.vehiclePlate].filter(Boolean).join(' • '),
    urlLength: url.length,
    payloadBytes: json.length,
    transportedVia: ['query/fragment payload', 'parameter datar', 'postMessage', 'JSON (salin/unduh)'],
  };
}
