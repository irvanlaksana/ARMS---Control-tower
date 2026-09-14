/**
 * ============================================================================
 *  ARMS — Control Tower :: PEMBUAT TAUTAN GENERATOR SURAT (backend)
 * ============================================================================
 *  Dipakai bersama oleh:
 *    • server.ts            (Express / VPS / lokal)
 *    • api/surat/open-generator.ts (Vercel serverless)
 *  Versi Apps Script ada di appsscript/Surat.gs (port JS dari berkas ini).
 *
 *  Tujuan: menghasilkan URL https://generator-surat-beige.vercel.app/ yang
 *  membawa payload sesuai model data repo https://github.com/irvanlaksana/generator-surat-
 *  yaitu `LetterData` (tab Surat Tugas) + `BastData` (tab BAST).
 * ============================================================================
 */

export const GENERATOR_BASE_URL = 'https://generator-surat-beige.vercel.app';
export const GENERATOR_REPO_URL = 'https://github.com/irvanlaksana/generator-surat-';
export const GENERATOR_PAYLOAD_VERSION = 2;
export const GENERATOR_SOURCE_ID = 'ARMS-CONTROL-TOWER';
/** Batas panjang payload di query string; lebih dari ini dipindah ke hash. */
export const GENERATOR_MAX_QUERY_PAYLOAD = 1400;

export type GeneratorDocType = 'surat_tugas' | 'bast';
export type GeneratorPaperSize = 'f4' | 'a4' | 'legal' | 'letter';

export interface GeneratorLinkResult {
  success: boolean;
  url: string;
  payload: Record<string, any>;
  encodedPayload: string;
  docType: GeneratorDocType;
  paperSize: GeneratorPaperSize;
  /** Jalur pengiriman payload yang dipakai. */
  transport: string[];
  /** true bila payload diletakkan di hash fragment (karena panjang). */
  payloadInHash: boolean;
}

function base64UrlEncode(json: string): string {
  return Buffer.from(json, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function isoDate(value?: string | null, fallbackDaysFromNow = 0): string {
  if (value) {
    const normalized = String(value).replace(/[./]/g, '-');
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    // format "29 Agustus 2026"
    const longMatch = normalized.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
    if (longMatch) {
      const months = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
      const mi = months.indexOf(longMatch[2].toLowerCase());
      if (mi >= 0) return `${longMatch[3]}-${String(mi + 1).padStart(2, '0')}-${String(longMatch[1]).padStart(2, '0')}`;
    }
  }
  const d = new Date(Date.now() + fallbackDaysFromNow * 86400000);
  return d.toISOString().split('T')[0];
}

function pick(obj: any, keys: string[]): string {
  for (const key of keys) {
    const value = obj?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function normalizeAttachments(input: any): Array<{ url: string; width: number; height: number }> {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (typeof item === 'string') return { url: item, width: 600, height: 380 };
      if (item && typeof item === 'object' && typeof item.url === 'string') {
        return { url: item.url, width: Number(item.width) || 600, height: Number(item.height) || 380 };
      }
      return null;
    })
    .filter(Boolean) as Array<{ url: string; width: number; height: number }>;
}

/**
 * Bangun payload generator.
 * - Bila `body.payload` sudah berisi letter/bast (dibangun frontend), dipakai apa adanya.
 * - Bila tidak, payload dirakit dari body { skNumber, debtor, personnel, ... }.
 */
export function buildGeneratorPayloadFromBody(body: any): Record<string, any> {
  const incoming = body?.payload;
  if (incoming && typeof incoming === 'object' && (incoming.letter || incoming.bast)) {
    return {
      source: incoming.source || GENERATOR_SOURCE_ID,
      version: Number(incoming.version) || GENERATOR_PAYLOAD_VERSION,
      generatedAt: incoming.generatedAt || new Date().toISOString(),
      docType: incoming.docType === 'bast' ? 'bast' : 'surat_tugas',
      paperSize: ['f4', 'a4', 'legal', 'letter'].includes(incoming.paperSize) ? incoming.paperSize : 'f4',
      letter: incoming.letter || {},
      bast: incoming.bast || {},
      meta: incoming.meta || {},
    };
  }

  const debtor = body?.debtor || {};
  const personnel = body?.personnel || {};
  const issued = isoDate(body?.issuedDate);
  const expiry = isoDate(body?.expiryDate, 3);

  const letter = {
    kopImage: body?.companyLogo || null,
    kopImageHeight: 120,
    kopImageFit: 'contain',
    kopImageAlign: 'center',
    kopImageOffsetY: 0,
    kopImageOffsetX: 0,
    kopImageMarginBottom: 32,
    kopCompanyName: pick(body, ['companyName']),
    letterNumber: pick(body, ['skNumber', 'letterNumber']),
    assignerName: pick(body, ['repName', 'assignerName', 'krediturName']),
    assignerPosition: pick(body, ['repTitle', 'assignerPosition']),
    assigneeName: pick(personnel, ['fullName', 'personnelName', 'name']),
    assigneePosition: pick(personnel, ['position', 'jabatan']) || 'Petugas Penagihan',
    clientName: pick(body, ['clientName', 'krediturName', 'leasingName']),
    customerContract: pick(body, ['contractNo', 'customerContract']) || pick(debtor, ['contractNo', 'multifinanceContractNo']),
    customerName: pick(debtor, ['debtorName', 'fullName', 'name', 'customerName']),
    customerAddress: pick(debtor, ['address', 'addressCurrent', 'addressKtp', 'debtorAddress']),
    customerAddressDetail: pick(debtor, ['addressDetail']),
    customerKabupaten: pick(debtor, ['kabupaten']),
    customerKecamatan: pick(debtor, ['kecamatan']),
    customerKelurahan: pick(debtor, ['kelurahan']),
    customerDueDate: isoDate(pick(debtor, ['dueDate']) || body?.dueDate),
    customerInstallment: pick(body, ['installment']) || pick(debtor, ['installmentAmount']),
    customerTotalInstallment: pick(body, ['totalInstallment']) || pick(debtor, ['totalInstallment']),
    customerPenalty: pick(body, ['penalty']) || pick(debtor, ['penaltyAmount']),
    customerUnpaidInstallmentCount: pick(body, ['unpaidInstallmentCount']),
    attachments: normalizeAttachments(body?.attachments),
    vehicleBrand: pick(body, ['vehicleMerk']) || pick(debtor, ['vehicleMerkType', 'brandModel']),
    vehiclePlate: pick(body, ['vehiclePoliceNo']) || pick(debtor, ['vehiclePoliceNo', 'policeNoVIN']),
    validFrom: issued,
    validTo: expiry,
    signPlaceDate: body?.signPlaceDate || '',
  };

  const bast = {
    jenis: String(body?.jenis || 'roda4') === 'roda2' ? 'roda2' : 'roda4',
    nomorBast: pick(body, ['nomorBast', 'skNumber']),
    nomorPenyerahan: pick(body, ['nomorPenyerahan', 'skNumber']),
    perusahaan: pick(body, ['companyName']),
    cabang: pick(body, ['city', 'cabang']),
    alamat: pick(body, ['companyAddress']),
    telepon: pick(body, ['companyPhone']),
    petugasNama: pick(personnel, ['fullName', 'personnelName', 'name']),
    petugasNik: pick(personnel, ['nikKtp', 'nik']),
    petugasJabatan: pick(personnel, ['position', 'jabatan']) || 'Petugas Remedial / Eksekusi Penagihan',
    petugasHp: pick(personnel, ['phoneNumber', 'phone', 'hp']),
    debiturNama: pick(debtor, ['debtorName', 'fullName', 'name']),
    debiturNik: pick(debtor, ['nikKtp', 'debtorNik', 'nik']),
    debiturAlamat: pick(debtor, ['address', 'addressCurrent', 'addressKtp']),
    debiturHp: pick(debtor, ['phone', 'phoneNumber']),
    nomorKontrak: letter.customerContract,
    krediturLeasing: letter.clientName,
    kendaraanMerk: letter.vehicleBrand,
    kendaraanType: '',
    kendaraanTahun: pick(body, ['vehicleYear']),
    kendaraanWarna: pick(body, ['vehicleColor']),
    kendaraanNoPol: letter.vehiclePlate,
    kendaraanNoRangka: pick(body, ['chassisNo', 'noRangka']),
    kendaraanNoMesin: pick(body, ['engineNo', 'noMesin']),
    kendaraanBpkb: pick(body, ['bpkb']),
    kendaraanStnk: pick(body, ['stnk']),
    kendaraanOdometer: pick(body, ['odometer']),
    kendaraanBahanBakar: pick(body, ['fuel']),
    kendaraanKondisiMesin: pick(body, ['engineCondition']),
    kendaraanKondisiBodi: pick(body, ['bodyCondition']),
    /** Kosong: aplikasi generator mengisi default lewat syncChecklist(jenis, {}). */
    checklist: {},
    kota: pick(body, ['city']),
    tanggal: '',
    saksi1Nama: letter.assignerName,
    saksi1Jabatan: letter.assignerPosition,
    saksi2Nama: letter.assigneeName,
    saksi2Jabatan: letter.assigneePosition,
    catatanKhusus: pick(body, ['notes', 'catatanKhusus']),
  };

  return {
    source: GENERATOR_SOURCE_ID,
    version: GENERATOR_PAYLOAD_VERSION,
    generatedAt: new Date().toISOString(),
    docType: body?.docType === 'bast' ? 'bast' : 'surat_tugas',
    paperSize: ['f4', 'a4', 'legal', 'letter'].includes(body?.paperSize) ? body.paperSize : 'f4',
    letter,
    bast,
    meta: {
      armsSkId: body?.skId || '',
      armsSkNumber: body?.skNumber || '',
      driveDocumentUrl: body?.driveDocumentUrl || '',
      clientType: body?.clientType || '',
      note: 'Payload dirakit backend ARMS Control Tower.',
    },
  };
}

/** Buang data berat (data:/blob:) supaya URL tidak meledak. */
function compactForUrl(payload: Record<string, any>): Record<string, any> {
  const strip = (value: any) => (typeof value === 'string' && /^(data:|blob:)/i.test(value) ? null : value);
  return {
    ...payload,
    letter: {
      ...(payload.letter || {}),
      kopImage: strip(payload?.letter?.kopImage),
      attachments: (payload?.letter?.attachments || []).filter(
        (a: any) => a && typeof a.url === 'string' && !/^(data:|blob:)/i.test(a.url)
      ),
    },
    bast: {
      ...(payload.bast || {}),
      catatanKhusus: String(payload?.bast?.catatanKhusus || '').slice(0, 400),
    },
  };
}

/** Rakit URL generator lengkap (payload + parameter datar). */
export function buildGeneratorLink(body: any, baseOverride?: string): GeneratorLinkResult {
  const payload = buildGeneratorPayloadFromBody(body || {});
  const compact = compactForUrl(payload);
  const encoded = base64UrlEncode(JSON.stringify(compact));
  const base = String(baseOverride || body?.generatorBase || GENERATOR_BASE_URL).replace(/\/+$/, '');
  const docType: GeneratorDocType = payload.docType === 'bast' ? 'bast' : 'surat_tugas';
  const paperSize: GeneratorPaperSize = payload.paperSize || 'f4';

  const params = new URLSearchParams();
  params.set('src', 'arms');
  params.set('pv', String(payload.version));
  params.set('docType', docType);
  params.set('tab', docType);
  params.set('paper', paperSize);

  const letter = compact.letter || {};
  const bast = compact.bast || {};
  const flat: Record<string, string> = {
    letterNumber: letter.letterNumber,
    assignerName: letter.assignerName,
    assignerPosition: letter.assignerPosition,
    assigneeName: letter.assigneeName,
    assigneePosition: letter.assigneePosition,
    clientName: letter.clientName,
    customerName: letter.customerName,
    customerContract: letter.customerContract,
    customerDueDate: letter.customerDueDate,
    vehicleBrand: letter.vehicleBrand,
    vehiclePlate: letter.vehiclePlate,
    validFrom: letter.validFrom,
    validTo: letter.validTo,
    nomorBast: bast.nomorBast,
    nomorPenyerahan: bast.nomorPenyerahan,
    petugasNama: bast.petugasNama,
    debiturNama: bast.debiturNama,
    nomorKontrak: bast.nomorKontrak,
    krediturLeasing: bast.krediturLeasing,
  };
  Object.entries(flat).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });

  const queryOnly = `${base}/?${params.toString()}`;
  const payloadInHash = encoded.length > GENERATOR_MAX_QUERY_PAYLOAD;
  const url = payloadInHash
    ? `${queryOnly}#payload=${encoded}`
    : `${base}/?${params.toString()}&payload=${encodeURIComponent(encoded)}`;

  return {
    success: true,
    url,
    payload,
    encodedPayload: encoded,
    docType,
    paperSize,
    payloadInHash,
    transport: [
      payloadInHash ? 'hash #payload' : 'query ?payload',
      'parameter datar',
      'postMessage ARMS_GENERATOR_PAYLOAD',
      'JSON (salin/unduh dari modul SK)',
    ],
  };
}
