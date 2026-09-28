export interface AttachmentData {
  url: string;
  originalUrl?: string;
  width: number;
  height: number;
  cropped?: boolean;
}

export type PaperSize = 'f4' | 'a4' | 'legal' | 'letter';

export interface PaperSizeConfig {
  id: PaperSize;
  name: string;
  shortName: string;
  widthMm: number;
  heightMm: number;
  description: string;
}

export const PAPER_SIZES: Record<PaperSize, PaperSizeConfig> = {
  f4: {
    id: 'f4',
    name: 'F4 / Folio',
    shortName: 'F4 (Folio)',
    widthMm: 215,
    heightMm: 330,
    description: '215 × 330 mm (Standar Surat Resmi / Legal Indonesia)',
  },
  a4: {
    id: 'a4',
    name: 'A4',
    shortName: 'A4',
    widthMm: 210,
    heightMm: 297,
    description: '210 × 297 mm (Standar Internasional ISO)',
  },
  legal: {
    id: 'legal',
    name: 'US Legal',
    shortName: 'Legal',
    widthMm: 215.9,
    heightMm: 355.6,
    description: '215.9 × 355.6 mm (8.5 × 14 inci)',
  },
  letter: {
    id: 'letter',
    name: 'US Letter',
    shortName: 'Letter',
    widthMm: 215.9,
    heightMm: 279.4,
    description: '215.9 × 279.4 mm (8.5 × 11 inci)',
  },
};

export const DEFAULT_PAPER_SIZE: PaperSize = 'f4';

export type PenagihanType = 'lembaga' | 'perorangan';

export interface LetterData {
  penagihanType?: PenagihanType;
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
  assignerNik?: string;
  assigneeName: string;
  assigneePosition: string;
  assigneeNik?: string;
  assigneePhone?: string;
  clientName: string;
  krediturPeroranganNik?: string;
  dasarPenagihan?: string;
  customerContract: string;
  customerName: string;
  customerNik?: string;
  customerPhone?: string;
  customerAddress: string;
  customerAddressDetail?: string;
  customerRt?: string;
  customerRw?: string;
  customerKabupaten?: string;
  customerKecamatan?: string;
  customerKelurahan?: string;
  customerDueDate: string;
  customerInstallment: string;
  customerTotalInstallment: string;
  customerPenalty: string;
  customerUnpaidInstallmentCount: string;
  kronologi?: string;
  besaranPokok?: string;
  besaranBungaDenda?: string;
  totalTagihan?: string;
  terbilangTagihan?: string;
  attachments: AttachmentData[];
  vehicleBrand: string;
  vehicleBrandMake?: string;
  vehicleBrandModel?: string;
  vehiclePlate: string;
  vehicleChassisNo?: string;
  vehicleEngineNo?: string;
  vehicleYear?: string;
  vehicleColor?: string;
  validFrom: string;
  validTo: string;
  signPlaceDate: string;
  caseNo?: string;
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
  // Kop Surat settings (persisted & synchronized with uploaded kop surat template)
  kopImage?: string | null;
  kopImageHeight?: number;
  kopImageFit?: 'contain' | 'fill' | 'cover';
  kopImageAlign?: 'left' | 'center' | 'right';
  kopImageOffsetY?: number;
  kopImageOffsetX?: number;
  kopImageMarginBottom?: number;
  kopCompanyName?: string;
  useImageKop?: boolean;
  
  // Data Petugas / Pihak Pertama (Penerima)
  petugasNama: string;
  petugasNik: string;
  petugasJabatan: string;
  petugasHp: string;
  
  // Data Debitur / Pihak Kedua (Pemberi / Yang Menyerahkan)
  debiturNama: string;
  debiturNik: string;
  debiturAlamat: string;
  debiturHp: string;
  nomorKontrak: string;
  krediturLeasing: string;
  
  // Data Kendaraan
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
  
  // Checklist komponen
  checklist: ChecklistMap;
  
  // Lokasi & Tanggal
  kota: string;
  tanggal: string;
  
  // Saksi-Saksi
  saksi1Nama: string;
  saksi1Jabatan: string;
  saksi2Nama: string;
  saksi2Jabatan: string;
  
  // Catatan Tambahan
  catatanKhusus: string;

  // Backward compatibility fields
  noBast?: string;
  noSuratTugas?: string;
  kop?: any;
  st?: any;
}
