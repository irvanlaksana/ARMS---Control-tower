/**
 * ============================================================================
 *  Integrasi Generator Surat Tugas / Kuasa
 * ============================================================================
 *  A. GENERATOR LOKAL (tetap ada, tidak dihapus):
 *     komponen `assignment-letter/AssignmentLetterGenerator` memakai model
 *     `BastData` versi lama. `buildGeneratorData()` di berkas ini menerjemahkan
 *     Form Pembuatan Surat Tugas / Kuasa (ARMS) ke model tersebut.
 *
 *  B. GENERATOR WEB (dipakai tombol "Buat di Generator"):
 *     https://generator-surat-beige.vercel.app/
 *     repo: https://github.com/irvanlaksana/generator-surat-
 *     Payload-nya mengikuti model `LetterData` + `BastData` repo tersebut dan
 *     dibangun di `./generatorSuratPayload.ts` (lihat docs/GENERATOR_SURAT_PAYLOAD.md).
 * ============================================================================
 */
import { BastData, VehicleType } from '../components/assignment-letter/types';
import { BLANK_DATA, syncChecklist } from '../components/assignment-letter/data/defaults';
import { Case, Customer, Personnel, SK } from '../types/arms';

/** Konstanta & builder payload generator web (sumber tunggal). */
export {
  GENERATOR_UI_URL,
  GENERATOR_REPO_URL,
  GENERATOR_PAYLOAD_PARAM,
  GENERATOR_PAYLOAD_VERSION,
  buildGeneratorUrl,
  buildGeneratorPayload,
  encodeGeneratorPayload as encodeWebGeneratorPayload,
  decodeGeneratorPayload,
  downloadGeneratorPayload,
  generatorPayloadJson,
  sendPayloadToWindow,
  summarizeGeneratorPayload,
} from './generatorSuratPayload';
export type {
  GeneratorPayload,
  GeneratorDocType,
  LetterData as GeneratorLetterData,
  BastData as GeneratorBastData,
  PaperSize as GeneratorPaperSize,
  WebGeneratorInput,
} from './generatorSuratPayload';

export interface GeneratorFormInput {
  skNumber?: string;
  companyName?: string;
  companyAddress?: string;
  repName?: string;
  repTitle?: string;
  city?: string;
  isPerorangan?: boolean;
  krediturName?: string;
  krediturAddress?: string;
  personnel?: Personnel | null;
  caseItem?: Case | null;
  customer?: Customer | null;
  sk?: SK | null;
  contractNo?: string;
  debtorName?: string;
  debtorAddress?: string;
  dueDate?: string;
  installment?: string;
  penalty?: string;
  vehicleMerk?: string;
  vehiclePoliceNo?: string;
  customNominal?: number;
  issuedDate?: string;
  expiryDate?: string;
}

function inferVehicleType(merk?: string): VehicleType {
  const text = `${merk || ''} ${''}`.toLowerCase();
  return /motor|beat|vario|nmax|pcx|scoopy|matic|supra|jupiter|mio|soul|satria|ninja|rx-?k|mx|vixion|brio|crf|adv|cbr|yamaha|honda|suzuki|kawasaki/i.test(text)
    ? 'roda2'
    : 'roda4';
}

function toIdDate(value?: string): string {
  if (!value) return new Date().toISOString().split('T')[0];
  const normalized = value.replace(/[./]/g, '-');
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? value : d.toISOString().split('T')[0];
}

function toIdLong(value?: string): string {
  if (!value) return '';
  const d = new Date(toIdDate(value));
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Terjemahkan isian Form Pembuatan Surat Tugas / Kuasa ke data generator. */
export function buildGeneratorData(input: GeneratorFormInput): BastData {
  const company = input.companyName || BLANK_DATA.st.perusahaan;
  const personnel = input.personnel;
  const caseItem = input.caseItem;
  const customer = input.customer;
  const sk = input.sk;

  const namaDebitur =
    input.debtorName || customer?.fullName || caseItem?.debtorName || sk?.debtorName || '';
  const alamatDebitur =
    input.debtorAddress || customer?.addressCurrent || customer?.addressKtp || '';
  const noKontrak =
    input.contractNo || caseItem?.multifinanceContractNo || customer?.contractNo || '';
  const merk = input.vehicleMerk || customer?.vehicleMerkType || caseItem?.assetSummary || '';
  const plat = input.vehiclePoliceNo || customer?.vehiclePoliceNo || '';
  const jenis = inferVehicleType(merk);

  const issuedISO = toIdDate(input.issuedDate || new Date().toISOString().split('T')[0]);
  const expiresISO = toIdDate(input.expiryDate || new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0]);

  const kreditur = input.isPerorangan
    ? input.krediturName || caseItem?.clientName || ''
    : caseItem?.clientName || sk?.clientName || '';

  const st = {
    ...BLANK_DATA.st,
    nomor: input.skNumber || sk?.skNumber || BLANK_DATA.st.nomor,
    perusahaan: company,
    pemberiNama: input.isPerorangan
      ? (input.krediturName || kreditur || company)
      : (input.repName || BLANK_DATA.st.pemberiNama),
    pemberiJabatan: input.isPerorangan
      ? 'Kreditur / Pemilik Piutang'
      : (input.repTitle || BLANK_DATA.st.pemberiJabatan),
    petugasNama: personnel?.fullName || sk?.personnelName || BLANK_DATA.st.petugasNama,
    petugasNik: personnel?.nikKtp || BLANK_DATA.st.petugasNik,
    petugasJabatan: personnel?.position || 'Petugas Penagihan',
    noKontrak,
    nasabahNama: namaDebitur,
    nasabahAlamat: alamatDebitur,
    jatuhTempo: input.dueDate || customer?.dueDate || '',
    angsuranNilai:
      input.installment ||
      customer?.installmentAmount ||
      (customer?.totalInstallment ? `Rp ${customer.totalInstallment.toLocaleString('id-ID')}` : ''),
    denda: input.penalty || customer?.penaltyAmount || '',
    merkType: merk,
    noPolisi: plat,
    berlakuDari: toIdLong(issuedISO),
    berlakuSampai: toIdLong(expiresISO),
    kota: input.city || BLANK_DATA.st.kota,
    tanggalSuratISO: issuedISO,
  };

  return {
    ...BLANK_DATA,
    jenis,
    perusahaan: company,
    cabang: input.city || BLANK_DATA.cabang,
    alamat: input.companyAddress || BLANK_DATA.alamat,
    noBast: st.nomor,
    noSuratTugas: st.nomor,
    noPerjanjian: noKontrak,
    tglPerjanjian: '',
    namaDebitur,
    bpkbAtasNama: namaDebitur,
    kreditur: kreditur || company,
    catatanKreditur: '',
    mitraNama: company,
    mitraAlamat: input.companyAddress || BLANK_DATA.mitraAlamat,
    mitraPic: personnel?.fullName || '',
    merekType: merk,
    noPolisi: plat,
    ttdBertandatangan: input.isPerorangan
      ? (input.krediturName || '')
      : (input.repName || ''),
    ttdMenyerahkan: personnel?.fullName || '',
    ttdMenerima1: personnel?.fullName || '',
    checklist: syncChecklist(jenis, {}),
    st,
  };
}

/**
 * Encode payload JSON (model generator LOKAL) ke base64url.
 * Dipertahankan untuk kompatibilitas; payload generator web memakai
 * `encodeWebGeneratorPayload` dari ./generatorSuratPayload.
 */
export function encodeGeneratorPayload(data: BastData | Record<string, unknown>): string {
  const json = JSON.stringify(data);
  if (typeof TextEncoder !== 'undefined' && typeof btoa === 'function') {
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((b) => { binary += String.fromCharCode(b); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  return Buffer.from(json, 'utf-8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
