export type VehicleType = "roda2" | "roda4";

export type KopAlign = "left" | "center" | "right";

export interface KopSurat {
  image: string; // dataURL, "" = belum diupload
  width: number; // mm
  offsetX: number; // mm (+ ke kanan)
  offsetY: number; // mm (+ ke bawah)
  align: KopAlign;
  garis: boolean; // garis ganda di bawah kop
  semuaHalaman: boolean;
  kontenY: number; // mm, geser isi surat naik (-) / turun (+)
  kontenY2: number; // mm, khusus halaman 2
}

export interface SuratTugasData {
  nomor: string;
  perusahaan: string;
  pemberiNama: string;
  pemberiJabatan: string;
  petugasNama: string;
  petugasNik: string;
  petugasJabatan: string;
  noKontrak: string;
  nasabahNama: string;
  nasabahAlamat: string;
  jatuhTempo: string;
  angsuranNilai: string;
  denda: string;
  merkType: string;
  noPolisi: string;
  berlakuDari: string;
  berlakuSampai: string;
  kota: string;
  tanggalSuratISO: string; // yyyy-mm-dd
}

export type CheckState = "" | "A" | "TA";

export interface ChecklistEntry {
  p1: CheckState;
  k1: string;
  p2: CheckState;
  k2: string;
}

export type ChecklistMap = Record<string, ChecklistEntry>;

export interface BastData {
  jenis: VehicleType;

  /* Kop surat */
  perusahaan: string;
  cabang: string;
  alamat: string;

  /* Dokumen */
  noBast: string;
  tanggalBast: string; // yyyy-mm-dd
  hariTanggal: string; // teks bebas, kosong = auto dari tanggalBast
  noSuratTugas: string;

  /* Perjanjian */
  noPerjanjian: string;
  tglPerjanjian: string;
  namaDebitur: string;
  bpkbAtasNama: string;

  /* Catatan kreditur */
  kreditur: string;
  catatanKreditur: string; // kosong = otomatis dari nama kreditur
  tampilkanCatatanBast: boolean;
  tampilkanCatatanPenyerahan: boolean;

  /* Perusahaan mitra (pelaksana penagihan/penarikan) */
  mitraNama: string;
  mitraLegalitas: string; // Nomor AHU / izin
  mitraAlamat: string;
  mitraPic: string; // penanggung jawab lapangan
  tampilkanMitraBast: boolean;
  mitraSebagaiPenerima: boolean; // nama mitra dicetak di kolom "Yang Menerima"

  /* Kendaraan */
  merekType: string;
  noRangka: string;
  noMesin: string;
  noPolisi: string;
  warna: string;
  tahun: string;

  /* Tanda tangan */
  ttdBertandatangan: string;
  ttdMenerima1: string;
  ttdMenyerahkan: string;
  ttdMenerima2: string;

  /* Opsi */
  penyelesaian: "YA" | "TIDAK" | "";
  karoseri: "Termasuk" | "Tidak Termasuk" | "";
  labelMesinBenar: boolean;

  checklist: ChecklistMap;

  /* Surat Tugas */
  kop: KopSurat;
  st: SuratTugasData;
}
