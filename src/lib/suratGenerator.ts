/**
 * Integrasi Generator Surat Tugas / Kuasa & BAST
 * Sumber & fungsi di-clone dan diadaptasikan dari repo:
 * https://github.com/irvanlaksana/generator-surat-
 * Disesuaikan penuh untuk ekosistem Google Apps Script (GAS) Web App & Google Drive.
 */
import { LetterData, BastData, VehicleType, PenagihanType } from '../components/assignment-letter/types';
import { BLANK_DATA, syncChecklist } from '../components/assignment-letter/data/defaults';
import { generateLetterNumber, generateBastNumber, generateSuratPenyerahanNumber } from '../components/assignment-letter/utils/letterNumber';
import { formatDateID, getTodaySignPlaceDate, formatDueDate } from '../components/assignment-letter/utils/dateFormatter';
import { VEHICLE_BRAND_GROUPS } from '../components/assignment-letter/data/vehicles';
import { angkaKeTerbilang } from '../utils/terbilang';
import { Case, Customer, Personnel, SK } from '../types/arms';

export interface GeneratorFormInput {
  skNumber?: string;
  companyName?: string;
  companyAddress?: string;
  companyPhone?: string;
  repName?: string;
  repTitle?: string;
  city?: string;
  isPerorangan?: boolean;
  krediturName?: string;
  krediturAddress?: string;
  krediturNik?: string;
  krediturJob?: string;
  dasarPenagihan?: string;
  kronologi?: string;
  phone?: string;
  personnel?: Personnel | null;
  caseItem?: Case | null;
  customer?: Customer | null;
  sk?: SK | null;
  contractNo?: string;
  debtorName?: string;
  debtorNik?: string;
  debtorAddress?: string;
  debtorPhone?: string;
  dueDate?: string;
  installment?: string;
  penalty?: string;
  totalInstallment?: string;
  unpaidCount?: string;
  totalTagihan?: string;
  terbilangTagihan?: string;
  vehicleMerk?: string;
  vehiclePoliceNo?: string;
  vehicleChassisNo?: string;
  vehicleEngineNo?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  customNominal?: number;
  issuedDate?: string;
  expiryDate?: string;
}

export function inferVehicleType(merk?: string): VehicleType {
  const text = `${merk || ''}`.toLowerCase();
  return /motor|beat|vario|nmax|pcx|scoopy|matic|supra|jupiter|mio|soul|satria|ninja|rx-?k|mx|vixion|crf|adv|cbr|yamaha|honda|suzuki|kawasaki/i.test(text)
    ? 'roda2'
    : 'roda4';
}

function formatRupiahNum(val: number | string | undefined): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'number' ? val : parseInt(String(val).replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return 'Rp ' + num.toLocaleString('id-ID').replace(/,/g, '.');
}

function parseRupiahNumber(val: number | string | undefined): number {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/\D/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

function detectVehicleBrandParts(fullBrand: string): { make: string; model: string } {
  if (!fullBrand || !fullBrand.trim()) return { make: '', model: '' };
  const allBrands = VEHICLE_BRAND_GROUPS.flatMap((g) => g.brands);
  const clean = fullBrand.trim();

  if (clean.includes('/')) {
    const parts = clean.split('/');
    return {
      make: parts[0]?.trim() || '',
      model: parts[1]?.trim() || '',
    };
  }

  const upper = clean.toUpperCase();
  for (const b of allBrands) {
    if (upper === b) return { make: b, model: '' };
    if (upper.startsWith(b + ' ') || upper.startsWith(b + '-')) {
      return {
        make: b,
        model: clean.slice(b.length).trim().replace(/^[-/]\s*/, ''),
      };
    }
  }

  return { make: clean, model: '' };
}

/**
 * Buat LetterData (Surat Tugas) dari input form / data ARMS
 */
export function buildLetterDataFromInput(input: GeneratorFormInput): LetterData {
  const company = input.companyName || 'PT. MITRA JASATRIA INDONESIA';
  const personnel = input.personnel;
  const caseItem = input.caseItem;
  const anyCase = (caseItem || {}) as any;
  const customer = input.customer;
  const anyCust = (customer || {}) as any;
  const sk = input.sk;

  const isPerorangan = input.isPerorangan ?? (caseItem?.clientType === 'PERORANGAN' || sk?.clientType === 'PERORANGAN');
  const penagihanType: PenagihanType = isPerorangan ? 'perorangan' : 'lembaga';

  const debtorName = input.debtorName || customer?.fullName || caseItem?.debtorName || sk?.debtorName || 'DEBITUR';
  const debtorAddress = input.debtorAddress || customer?.addressCurrent || customer?.addressKtp || anyCase.debtorAddress || '';
  const contractNo = input.contractNo || caseItem?.multifinanceContractNo || customer?.contractNo || '';
  const vehicle = input.vehicleMerk || customer?.vehicleMerkType || caseItem?.assetSummary || anyCase.vehicleBrand || '';
  const plate = input.vehiclePoliceNo || customer?.vehiclePoliceNo || anyCase.licensePlate || '';

  const { make: vehicleMake, model: vehicleModel } = detectVehicleBrandParts(vehicle);

  const clientName = isPerorangan
    ? (input.krediturName || caseItem?.clientName || 'Kreditur Perorangan')
    : (input.krediturName || caseItem?.clientName || sk?.clientName || 'PT. MULTI FINANCE');

  const issuedDate = input.issuedDate || sk?.issuedDate || new Date().toISOString().split('T')[0];
  const expiryDate = input.expiryDate || sk?.expiryDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  const city = input.city || 'Purwokerto';
  const signDate = `${city}, ${formatDateID(issuedDate)}`;

  const debtorNik = input.debtorNik || customer?.nikKtp || caseItem?.debtorNik || '';
  const debtorPhone = input.debtorPhone || customer?.phone || anyCase.phone || '';

  // Extract address detail, RT, RW, Kel, Kec, Kab
  let rt = '';
  let rw = '';
  let kel = '';
  let kec = '';
  let kab = city.toUpperCase();

  const rtMatch = debtorAddress.match(/RT\.?\s*([0-9A-Za-z]+)/i);
  if (rtMatch) rt = rtMatch[1];
  const rwMatch = debtorAddress.match(/RW\.?\s*([0-9A-Za-z]+)/i);
  if (rwMatch) rw = rwMatch[1];
  const kelMatch = debtorAddress.match(/(?:KEL\.?|DESA)\s+([A-Za-z\s]+?)(?:,|$)/i);
  if (kelMatch) kel = kelMatch[1].trim();
  const kecMatch = debtorAddress.match(/KEC\.?\s+([A-Za-z\s]+?)(?:,|$)/i);
  if (kecMatch) kec = kecMatch[1].trim();
  const kabMatch = debtorAddress.match(/KAB\.?\s+([A-Za-z\s]+?)(?:,|$)/i);
  if (kabMatch) kab = kabMatch[1].trim();

  // Financials
  const rawInstallment = input.installment || (customer?.installmentAmount ? formatRupiahNum(customer.installmentAmount) : (anyCase.monthlyPayment ? formatRupiahNum(anyCase.monthlyPayment) : ''));
  const rawTotalInst = input.customNominal ? formatRupiahNum(input.customNominal) : (customer?.totalInstallment ? formatRupiahNum(customer.totalInstallment) : (caseItem?.principalDebtOS ? formatRupiahNum(caseItem.principalDebtOS) : (anyCase.monthlyPayment ? formatRupiahNum(anyCase.monthlyPayment) : '')));
  const rawPenalty = input.penalty || (customer?.penaltyAmount ? formatRupiahNum(customer.penaltyAmount) : (anyCase.penalty ? formatRupiahNum(anyCase.penalty) : ''));

  const numericTotal = input.customNominal 
    || parseRupiahNumber(input.totalTagihan)
    || (anyCase.totalBillAmount ? anyCase.totalBillAmount : (caseItem?.principalDebtOS ? caseItem.principalDebtOS : (parseRupiahNumber(rawTotalInst) + parseRupiahNumber(rawPenalty))));

  const totalTagihanStr = numericTotal > 0 ? formatRupiahNum(numericTotal) : (input.totalTagihan || rawTotalInst);
  const terbilangStr = numericTotal > 0 ? `${angkaKeTerbilang(numericTotal)} Rupiah` : (input.terbilangTagihan || '');

  const unpaidCountStr = input.unpaidCount || (caseItem?.overdueDays ? `${Math.max(1, Math.ceil(caseItem.overdueDays / 30))} Bulan` : '1 Bulan');
  const dueDateStr = input.dueDate || customer?.dueDate || anyCase.dueDate || '';

  const kronologiText = input.kronologi || anyCase.notes || anyCust.riskNotes || (isPerorangan ? 'Debitur mengalami keterlambatan dalam penyelesaian kewajiban pembayaran sesuai kesepakatan yang telah disepakati.' : '');
  const dasarPenagihanText = input.dasarPenagihan || (isPerorangan ? 'Surat Pengakuan Hutang & Surat Kuasa Penagihan' : 'Perjanjian Kerjasama Penagihan & Surat Kuasa Khusus');

  return {
    penagihanType,
    kopImage: null,
    kopImageHeight: 120,
    kopImageFit: 'contain',
    kopImageAlign: 'center',
    kopImageOffsetY: 0,
    kopImageOffsetX: 0,
    kopImageMarginBottom: 32,
    kopCompanyName: company,
    letterNumber: input.skNumber || sk?.skNumber || generateLetterNumber(new Date(issuedDate), company),
    assignerName: isPerorangan ? (input.krediturName || clientName) : (input.repName || 'FILEMO HALAWA'),
    assignerPosition: isPerorangan ? 'Kreditur / Pemberi Kuasa' : (input.repTitle || 'DIREKTUR'),
    assignerNik: isPerorangan ? input.krediturNik : undefined,
    assigneeName: personnel?.fullName || sk?.personnelName || 'RIZKY JUANDA SAPUTRA',
    assigneePosition: personnel?.position || 'Petugas Penagihan',
    assigneeNik: personnel?.nikKtp || '',
    assigneePhone: personnel?.phoneNumber || '',
    clientName,
    krediturPeroranganNik: isPerorangan ? input.krediturNik : undefined,
    dasarPenagihan: dasarPenagihanText,
    customerContract: contractNo,
    customerName: debtorName,
    customerNik: debtorNik,
    customerPhone: debtorPhone,
    customerAddress: debtorAddress,
    customerAddressDetail: debtorAddress,
    customerRt: rt,
    customerRw: rw,
    customerKelurahan: kel,
    customerKecamatan: kec,
    customerKabupaten: kab,
    customerDueDate: dueDateStr,
    customerInstallment: rawInstallment,
    customerTotalInstallment: rawTotalInst,
    customerPenalty: rawPenalty,
    customerUnpaidInstallmentCount: unpaidCountStr,
    kronologi: kronologiText,
    besaranPokok: rawTotalInst,
    besaranBungaDenda: rawPenalty,
    totalTagihan: totalTagihanStr,
    terbilangTagihan: terbilangStr,
    attachments: [],
    vehicleBrand: vehicle,
    vehicleBrandMake: vehicleMake,
    vehicleBrandModel: vehicleModel,
    vehiclePlate: plate,
    vehicleChassisNo: input.vehicleChassisNo || anyCust.vehicleChassisNo || anyCase.chassisNumber || '',
    vehicleEngineNo: input.vehicleEngineNo || anyCust.vehicleEngineNo || anyCase.engineNumber || '',
    vehicleYear: input.vehicleYear || anyCust.vehicleYear || anyCase.vehicleYear || '',
    vehicleColor: input.vehicleColor || anyCust.vehicleColor || anyCase.vehicleColor || '',
    validFrom: issuedDate,
    validTo: expiryDate,
    signPlaceDate: signDate,
    caseNo: caseItem?.caseNo || '',
  };
}

/**
 * Buat BastData dari input form / data ARMS
 */
export function buildBastDataFromInput(input: GeneratorFormInput): BastData {
  const company = input.companyName || 'PT. MITRA JASATRIA INDONESIA';
  const personnel = input.personnel;
  const caseItem = input.caseItem;
  const anyCase = (caseItem || {}) as any;
  const customer = input.customer;
  const anyCust = (customer || {}) as any;
  const sk = input.sk;

  const debtorName = input.debtorName || customer?.fullName || caseItem?.debtorName || sk?.debtorName || 'DEBITUR';
  const debtorAddress = input.debtorAddress || customer?.addressCurrent || customer?.addressKtp || anyCase.debtorAddress || '';
  const debtorPhone = input.debtorPhone || customer?.phone || anyCase.phone || '';
  const debtorNik = input.debtorNik || customer?.nikKtp || caseItem?.debtorNik || '';
  const contractNo = input.contractNo || caseItem?.multifinanceContractNo || customer?.contractNo || '';
  const vehicle = input.vehicleMerk || customer?.vehicleMerkType || caseItem?.assetSummary || anyCase.vehicleBrand || '';
  const plate = input.vehiclePoliceNo || customer?.vehiclePoliceNo || anyCase.licensePlate || '';
  const jenis = inferVehicleType(vehicle);

  const clientName = (input.isPerorangan || caseItem?.clientType === 'PERORANGAN')
    ? (input.krediturName || caseItem?.clientName || 'Kreditur Perorangan')
    : (input.krediturName || caseItem?.clientName || sk?.clientName || 'PT. MULTI FINANCE');

  const city = input.city || 'Purwokerto';
  const issuedDate = input.issuedDate || new Date().toISOString().split('T')[0];
  const dateFormatted = formatDateID(issuedDate);

  const { make, model } = detectVehicleBrandParts(vehicle);

  const baseBast: BastData = {
    ...BLANK_DATA,
    jenis,
    nomorBast: input.skNumber ? `BAST-${input.skNumber}` : generateBastNumber(company),
    nomorPenyerahan: input.skNumber ? `SPK-${input.skNumber}` : generateSuratPenyerahanNumber(company),
    perusahaan: company,
    cabang: `Cabang ${city}`,
    alamat: input.companyAddress || BLANK_DATA.alamat,
    telepon: input.companyPhone || BLANK_DATA.telepon,
    petugasNama: personnel?.fullName || sk?.personnelName || BLANK_DATA.petugasNama,
    petugasNik: personnel?.nikKtp || BLANK_DATA.petugasNik,
    petugasJabatan: personnel?.position || BLANK_DATA.petugasJabatan,
    petugasHp: personnel?.phoneNumber || BLANK_DATA.petugasHp,
    debiturNama: debtorName,
    debiturNik: debtorNik,
    debiturAlamat: debtorAddress,
    debiturHp: debtorPhone,
    nomorKontrak: contractNo,
    krediturLeasing: clientName,
    kendaraanMerk: make || vehicle.split('/')[0]?.trim() || vehicle,
    kendaraanType: model || vehicle.split('/')[1]?.trim() || vehicle,
    kendaraanTahun: input.vehicleYear || anyCust.vehicleYear || anyCase.vehicleYear || '2022',
    kendaraanWarna: input.vehicleColor || anyCust.vehicleColor || anyCase.vehicleColor || 'Hitam',
    kendaraanNoPol: plate,
    kendaraanNoRangka: input.vehicleChassisNo || anyCust.vehicleChassisNo || anyCase.chassisNumber || 'MH3...',
    kendaraanNoMesin: input.vehicleEngineNo || anyCust.vehicleEngineNo || anyCase.engineNumber || 'G3E...',
    kendaraanBpkb: 'Dalam Jaminan Kreditur',
    kendaraanStnk: 'Ada',
    kendaraanOdometer: '45.000 KM',
    kendaraanBahanBakar: '1/2 Tangki',
    kendaraanKondisiMesin: 'Hidup Normal / Siap Jalan',
    kendaraanKondisiBodi: 'Bodi mulus terawat, lecet pemakaian wajar.',
    checklist: syncChecklist(jenis),
    kota: city,
    tanggal: dateFormatted,
    saksi1Nama: input.repName || 'FILEMO HALAWA',
    saksi1Jabatan: input.repTitle || 'Supervisor / Direktur',
    saksi2Nama: 'AHMAD FAUZI',
    saksi2Jabatan: 'Saksi Pihak Rekan / Keluarga',
    catatanKhusus: 'Penyerahan unit kendaraan dilakukan secara sukarela dan tanpa paksaan sehubungan penyelesaian kewajiban pembiayaan.',
    noBast: input.skNumber || '',
    noSuratTugas: input.skNumber || '',
  };

  return baseBast;
}

/**
 * Backward compatibility
 */
export function buildGeneratorData(input: GeneratorFormInput): BastData {
  return buildBastDataFromInput(input);
}
