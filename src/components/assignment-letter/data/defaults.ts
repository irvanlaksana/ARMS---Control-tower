import { BastData, ChecklistMap, VehicleType, LetterData } from '../types';

export interface ChecklistDefinition {
  id: string;
  kategori: string;
  nama: string;
}

export const CHECKLIST_RODA2: ChecklistDefinition[] = [
  // Dokumen & Kunci
  { id: 'stnk_asli', kategori: 'Dokumen & Kunci', nama: 'STNK Asli' },
  { id: 'kunci_kontak', kategori: 'Dokumen & Kunci', nama: 'Kunci Kontak (Asli)' },
  { id: 'kunci_cadangan', kategori: 'Dokumen & Kunci', nama: 'Kunci Cadangan / Duplikat' },
  { id: 'buku_servis', kategori: 'Dokumen & Kunci', nama: 'Buku Servis & Manual' },
  { id: 'toolset', kategori: 'Dokumen & Kunci', nama: 'Toolset / Kunci Busi Standar' },
  
  // Perlengkapan & Aksesoris
  { id: 'spion_kanan', kategori: 'Perlengkapan & Aksesoris', nama: 'Kaca Spion Kanan' },
  { id: 'spion_kiri', kategori: 'Perlengkapan & Aksesoris', nama: 'Kaca Spion Kiri' },
  { id: 'helm', kategori: 'Perlengkapan & Aksesoris', nama: 'Helm Bawaan' },
  { id: 'jaket', kategori: 'Perlengkapan & Aksesoris', nama: 'Jaket / Perlengkapan Lain' },

  // Kelistrikan & Lampu
  { id: 'lampu_utama', kategori: 'Kelistrikan & Indikator', nama: 'Lampu Utama (Jauh / Dekat)' },
  { id: 'lampu_belakang', kategori: 'Kelistrikan & Indikator', nama: 'Lampu Belakang & Rem' },
  { id: 'lampu_sein_depan', kategori: 'Kelistrikan & Indikator', nama: 'Lampu Sein Depan (Kiri & Kanan)' },
  { id: 'lampu_sein_belakang', kategori: 'Kelistrikan & Indikator', nama: 'Lampu Sein Belakang (Kiri & Kanan)' },
  { id: 'klakson', kategori: 'Kelistrikan & Indikator', nama: 'Klakson' },
  { id: 'speedometer', kategori: 'Kelistrikan & Indikator', nama: 'Speedometer & Odometer Digital/Analog' },
  { id: 'aki_starter', kategori: 'Kelistrikan & Indikator', nama: 'Aki & Electric Starter' },

  // Roda & Kaki-Kaki
  { id: 'ban_depan', kategori: 'Roda & Kaki-Kaki', nama: 'Ban Depan (Kondisi Kembangan)' },
  { id: 'ban_belakang', kategori: 'Roda & Kaki-Kaki', nama: 'Ban Belakang (Kondisi Kembangan)' },
  { id: 'velg_depan', kategori: 'Roda & Kaki-Kaki', nama: 'Velg Depan (Original/Variasi)' },
  { id: 'velg_belakang', kategori: 'Roda & Kaki-Kaki', nama: 'Velg Belakang (Original/Variasi)' },
  { id: 'rem_depan', kategori: 'Roda & Kaki-Kaki', nama: 'Sistem Rem Depan (Cakram/Tromol)' },
  { id: 'rem_belakang', kategori: 'Roda & Kaki-Kaki', nama: 'Sistem Rem Belakang (Cakram/Tromol)' },
  { id: 'suspensi_depan', kategori: 'Roda & Kaki-Kaki', nama: 'Shockbreaker Depan' },
  { id: 'suspensi_belakang', kategori: 'Roda & Kaki-Kaki', nama: 'Shockbreaker Belakang' },

  // Bodi & Mesin
  { id: 'bodi_sayap', kategori: 'Bodi & Eksterior', nama: 'Bodi / Cover Sayap Kiri & Kanan' },
  { id: 'bodi_belakang', kategori: 'Bodi & Eksterior', nama: 'Bodi Belakang & Spakbor Belakang' },
  { id: 'spakbor_depan', kategori: 'Bodi & Eksterior', nama: 'Spakbor Depan' },
  { id: 'jok_kulit', kategori: 'Bodi & Eksterior', nama: 'Jok / Kulit Jok' },
  { id: 'knalpot_standar', kategori: 'Bodi & Eksterior', nama: 'Knalpot & Pelindung Panas' },
  { id: 'kondisi_mesin', kategori: 'Mesin & Transmisi', nama: 'Mesin (Suara Halus / Normal)' },
];

export const CHECKLIST_RODA4: ChecklistDefinition[] = [
  // Dokumen & Kunci
  { id: 'stnk_asli', kategori: 'Dokumen & Kunci', nama: 'STNK Asli' },
  { id: 'kunci_kontak', kategori: 'Dokumen & Kunci', nama: 'Kunci Kontak Utama & Remote' },
  { id: 'kunci_cadangan', kategori: 'Dokumen & Kunci', nama: 'Kunci Cadangan / Spare Key' },
  { id: 'buku_servis', kategori: 'Dokumen & Kunci', nama: 'Buku Servis & Manual Book' },

  // Perlengkapan Darurat
  { id: 'ban_serep', kategori: 'Perlengkapan Darurat', nama: 'Ban Serep / Cadangan' },
  { id: 'dongkrak_handle', kategori: 'Perlengkapan Darurat', nama: 'Dongkrak & Handle Pemutar' },
  { id: 'kunci_roda', kategori: 'Perlengkapan Darurat', nama: 'Kunci Roda' },
  { id: 'segitiga_pengaman', kategori: 'Perlengkapan Darurat', nama: 'Segitiga Pengaman & Toolset' },
  { id: 'p3k', kategori: 'Perlengkapan Darurat', nama: 'Kotak P3K' },

  // Eksterior & Lampu
  { id: 'lampu_utama', kategori: 'Eksterior & Lampu', nama: 'Headlamp Utama (Kiri & Kanan)' },
  { id: 'foglamp', kategori: 'Eksterior & Lampu', nama: 'Lampu Kabut / Foglamp' },
  { id: 'lampu_belakang', kategori: 'Eksterior & Lampu', nama: 'Stoplamp Belakang (Kiri & Kanan)' },
  { id: 'lampu_sein', kategori: 'Eksterior & Lampu', nama: 'Lampu Sein (Depan, Belakang, Spion)' },
  { id: 'spion_elektrik', kategori: 'Eksterior & Lampu', nama: 'Kaca Spion Elektrik (Kiri & Kanan)' },
  { id: 'wiper_depan', kategori: 'Eksterior & Lampu', nama: 'Wiper Depan & Belakang + Washer' },
  { id: 'kaca_film', kategori: 'Eksterior & Lampu', nama: 'Kaca Film & Kondisi Kaca Mobil' },
  { id: 'bumper_depan', kategori: 'Eksterior & Lampu', nama: 'Bumper Depan & Grille' },
  { id: 'bumper_belakang', kategori: 'Eksterior & Lampu', nama: 'Bumper Belakang' },

  // Interior & Kenyamanan
  { id: 'ac_blower', kategori: 'Interior & Audio', nama: 'AC / Air Conditioner Dingin & Blower' },
  { id: 'audio_headunit', kategori: 'Interior & Audio', nama: 'Head Unit / Audio Tape & Speaker' },
  { id: 'power_window', kategori: 'Interior & Audio', nama: 'Power Window 4 Pintu & Central Lock' },
  { id: 'jok_interior', kategori: 'Interior & Audio', nama: 'Kondisi Jok (Depan, Tengah, Belakang)' },
  { id: 'karpet_dasar', kategori: 'Interior & Audio', nama: 'Karpet Dasar / Set Karpet Karet' },
  { id: 'plafon_interior', kategori: 'Interior & Audio', nama: 'Plafon & Dashboard Interior' },
  { id: 'sabuk_pengaman', kategori: 'Interior & Audio', nama: 'Sabuk Pengaman / Seatbelt' },

  // Kaki-Kaki & Roda
  { id: 'ban_depan_kanan', kategori: 'Roda & Ban', nama: 'Ban & Velg Depan Kanan' },
  { id: 'ban_depan_kiri', kategori: 'Roda & Ban', nama: 'Ban & Velg Depan Kiri' },
  { id: 'ban_belakang_kanan', kategori: 'Roda & Ban', nama: 'Ban & Velg Belakang Kanan' },
  { id: 'ban_belakang_kiri', kategori: 'Roda & Ban', nama: 'Ban & Velg Belakang Kiri' },

  // Mesin
  { id: 'kondisi_mesin', kategori: 'Mesin & Transmisi', nama: 'Kondisi Mesin & Transmisi' },
  { id: 'rem_handbrake', kategori: 'Mesin & Transmisi', nama: 'Rem Kaki & Handbrake (Rem Tangan)' },
  { id: 'aki_mobil', kategori: 'Mesin & Transmisi', nama: 'Aki Mobil (Starter Normal)' },
];

export function getChecklistDefinitions(jenis: VehicleType): ChecklistDefinition[] {
  return jenis === 'roda2' ? CHECKLIST_RODA2 : CHECKLIST_RODA4;
}

export function syncChecklist(jenis: VehicleType, current: ChecklistMap = {}): ChecklistMap {
  const defs = getChecklistDefinitions(jenis);
  const result: ChecklistMap = {};
  for (const item of defs) {
    if (current[item.id]) {
      result[item.id] = { ...current[item.id] };
    } else {
      result[item.id] = { status: 'baik', catatan: 'Lengkap & Baik' };
    }
  }
  return result;
}

export function emptyChecklist(jenis: VehicleType): ChecklistMap {
  const defs = getChecklistDefinitions(jenis);
  const result: ChecklistMap = {};
  for (const item of defs) {
    result[item.id] = { status: '' as any, catatan: '' };
  }
  return result;
}

// Data Kosong Murni (Semua field isian kosong untuk Reset Form)
export const BLANK_DATA: BastData = {
  jenis: 'roda4',
  nomorBast: '',
  nomorPenyerahan: '',
  perusahaan: 'PT. MITRA JASATRIA INDONESIA',
  cabang: 'Cabang Purwokerto',
  alamat: 'Jl. Gerilya No. 45, Purwokerto Selatan, Banyumas, Jawa Tengah',
  telepon: '(0281) 634567 / 0812-3456-7890',
  
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

  checklist: emptyChecklist('roda4'),

  kota: 'Purwokerto',
  tanggal: '',

  saksi1Nama: '',
  saksi1Jabatan: '',
  saksi2Nama: '',
  saksi2Jabatan: '',

  catatanKhusus: '',
};

export const CONTOH_RODA4: BastData = {
  ...BLANK_DATA,
  jenis: 'roda4',
  nomorBast: '001/BAST/MJI/29/VIII/2026',
  nomorPenyerahan: '001/SPK/MJI/29/VIII/2026',
  
  petugasNama: 'RIZKY JUANDA SAPUTRA',
  petugasNik: '3302242201940001',
  petugasJabatan: 'Petugas Remedial / Eksekusi Penagihan',
  petugasHp: '0812-9876-5432',

  debiturNama: 'KISNO ANGKAH TRI HIDAYAT',
  debiturNik: '3303041508820003',
  debiturAlamat: 'Kalikabong RT 004 RW 002, Kalimanah, Purbalingga',
  debiturHp: '0857-1234-5678',
  nomorKontrak: '00730191 / KAMM-2024',
  krediturLeasing: 'Koperasi Anugrah Mega Mandiri (KAMM)',

  kendaraanMerk: 'TOYOTA',
  kendaraanType: 'AVANZA 1.3 G M/T',
  kendaraanTahun: '2021',
  kendaraanWarna: 'Hitam Metalik',
  kendaraanNoPol: 'R 4088 YV',
  kendaraanNoRangka: 'MHFM1BA3JMK129481',
  kendaraanNoMesin: '1NR-FE-8291048',
  kendaraanBpkb: 'Dalam Jaminan Kreditur',
  kendaraanStnk: 'Ada (Berlaku s/d 14-08-2027)',
  kendaraanOdometer: '48.250 KM',
  kendaraanBahanBakar: '1/2 Tangki',
  kendaraanKondisiMesin: 'Hidup Normal / Siap Jalan',
  kendaraanKondisiBodi: 'Bodi mulus terawat, lecet pemakaian wajar di bumper depan bawah.',

  checklist: syncChecklist('roda4', {
    stnk_asli: { status: 'baik', catatan: 'STNK Asli Ada & Pajak Aktif' },
    kunci_kontak: { status: 'baik', catatan: 'Kunci Utama + Remote' },
    kunci_cadangan: { status: 'baik', catatan: '1 Kunci Cadangan Manual' },
    ban_serep: { status: 'baik', catatan: 'Ada (Tekanan Angin Cukup)' },
    dongkrak_handle: { status: 'baik', catatan: 'Ada di Bagasi' },
    audio_headunit: { status: 'baik', catatan: 'Layar Sentuh & Speaker Normal' },
    ac_blower: { status: 'baik', catatan: 'AC Dingin & Blower Bersih' },
  }),

  kota: 'Purwokerto',
  tanggal: '29 Agustus 2026',

  saksi1Nama: 'FILEMO HALAWA',
  saksi1Jabatan: 'Supervisor Remedial / Direktur',
  saksi2Nama: 'AHMAD FAUZI',
  saksi2Jabatan: 'Saksi Pihak Keluarga / Rekan',

  catatanKhusus: 'Penyerahan unit kendaraan dilakukan secara sukarela dan tanpa paksaan dari pihak manapun sehubungan dengan penyelesaian kewajiban angsuran pembiayaan jaminan fidusia.',
};

export const CONTOH_RODA2: BastData = {
  ...BLANK_DATA,
  jenis: 'roda2',
  nomorBast: '002/BAST/MJI/29/VIII/2026',
  nomorPenyerahan: '002/SPK/MJI/29/VIII/2026',
  
  petugasNama: 'RIZKY JUANDA SAPUTRA',
  petugasNik: '3302242201940001',
  petugasJabatan: 'Petugas Remedial / Eksekusi Penagihan',
  petugasHp: '0812-9876-5432',

  debiturNama: 'AGUS SETIAWAN',
  debiturNik: '3302111805950002',
  debiturAlamat: 'Jl. Pemuda No. 12 RT 01/RW 03, Purwokerto Barat',
  debiturHp: '0812-2891-7742',
  nomorKontrak: '00892019 / KAMM-2025',
  krediturLeasing: 'Koperasi Anugrah Mega Mandiri (KAMM)',

  kendaraanMerk: 'YAMAHA',
  kendaraanType: 'VIXION 150 DOHC',
  kendaraanTahun: '2022',
  kendaraanWarna: 'Merah Doff / Matte Red',
  kendaraanNoPol: 'R 4088 YV',
  kendaraanNoRangka: 'MH3RG1210NK049182',
  kendaraanNoMesin: 'G3E4E-0849201',
  kendaraanBpkb: 'Dalam Jaminan',
  kendaraanStnk: 'Ada (Pajak Hidup s/d Nov 2026)',
  kendaraanOdometer: '22.400 KM',
  kendaraanBahanBakar: '3/4 Bar',
  kendaraanKondisiMesin: 'Mesin halus, tarikan normal, elektrik starter berfungsi baik.',
  kendaraanKondisiBodi: 'Lecet halus pada cover knalpot dan spion kanan.',
  checklist: syncChecklist('roda2', {
    stnk_asli: { status: 'baik', catatan: 'STNK Asli Ada' },
    kunci_kontak: { status: 'baik', catatan: '1 Buah Kunci Asli' },
    kunci_cadangan: { status: 'tidak_ada', catatan: 'Tidak diserahkan' },
    spion_kanan: { status: 'rusak', catatan: 'Sedikit lecet' },
    spion_kiri: { status: 'baik', catatan: 'Baik & Utuh' },
    helm: { status: 'baik', catatan: '1 Pcs Helm Standar' },
    ban_depan: { status: 'baik', catatan: 'Ketebalan 80%' },
    ban_belakang: { status: 'baik', catatan: 'Ketebalan 75%' },
  }),

  kota: 'Purwokerto',
  tanggal: '29 Agustus 2026',

  saksi1Nama: 'FILEMO HALAWA',
  saksi1Jabatan: 'Supervisor Remedial / Direktur',
  saksi2Nama: 'AHMAD FAUZI',
  saksi2Jabatan: 'Saksi Pihak Keluarga / Rekan',

  catatanKhusus: 'Penyerahan unit kendaraan dilakukan secara sukarela dan tanpa paksaan sehubungan dengan penyelesaian kewajiban pembiayaan.',
};

// Data Kosong Murni Surat Tugas
export const BLANK_LETTER_DATA: Partial<LetterData> = {
  penagihanType: 'lembaga',
  letterNumber: '',
  assignerName: '',
  assignerPosition: '',
  assigneeName: '',
  assigneePosition: '',
  clientName: '',
  krediturPeroranganNik: '',
  dasarPenagihan: '',
  customerContract: '',
  customerName: '',
  customerAddress: '',
  customerAddressDetail: '',
  customerRt: '',
  customerRw: '',
  customerKabupaten: '',
  customerKecamatan: '',
  customerKelurahan: '',
  customerDueDate: '',
  customerInstallment: '',
  customerTotalInstallment: '',
  customerUnpaidInstallmentCount: '',
  customerPenalty: '',
  kronologi: '',
  besaranPokok: '',
  besaranBungaDenda: '',
  totalTagihan: '',
  terbilangTagihan: '',
  attachments: [],
  vehicleBrand: '',
  vehicleBrandMake: '',
  vehicleBrandModel: '',
  vehiclePlate: '',
  validFrom: '',
  validTo: '',
  signPlaceDate: '',
};

// Data Contoh Surat Tugas (Lembaga Pembiayaan / Leasing)
export const CONTOH_LETTER_DATA: Partial<LetterData> = {
  penagihanType: 'lembaga',
  letterNumber: '001/ST-MJI/VIII/2026',
  assignerName: 'FILEMO HALAWA',
  assignerPosition: 'DIREKTUR',
  assigneeName: 'RIZKY JUANDA SAPUTRA',
  assigneePosition: 'Petugas Penagihan',
  clientName: 'Koperasi Anugrah Mega Mandiri (KAMM)',
  krediturPeroranganNik: '',
  dasarPenagihan: 'Perjanjian Pembiayaan Konsumen No. 00730191 / KAMM-2024',
  customerContract: '00730191',
  customerName: 'KISNO ANGKAH TRI HIDAYAT',
  customerAddressDetail: '',
  customerRt: '004',
  customerRw: '002',
  customerKabupaten: 'BANYUMAS',
  customerKecamatan: 'PURWOKERTO SELATAN',
  customerKelurahan: 'TELUK',
  customerAddress: 'RT 004 RW 002, KEL. TELUK, KEC. PURWOKERTO SELATAN',
  customerDueDate: '22-September-2026',
  customerInstallment: 'Rp 1.850.000',
  customerTotalInstallment: 'Rp 5.550.000',
  customerUnpaidInstallmentCount: '3',
  customerPenalty: 'Rp 350.000',
  besaranPokok: 'Rp 5.550.000',
  besaranBungaDenda: 'Rp 350.000',
  totalTagihan: 'Rp 5.900.000',
  terbilangTagihan: 'Lima Juta Sembilan Ratus Ribu Rupiah',
  kronologi: 'Debitur memiliki tunggakan angsuran pembiayaan sebanyak 3 bulan berturut-turut terhitung sejak tanggal jatuh tempo yang telah disepakati.',
  vehicleBrand: 'HONDA / HR-V 1.5 E',
  vehicleBrandMake: 'HONDA',
  vehicleBrandModel: 'HR-V 1.5 E',
  vehiclePlate: 'R 4088 YV',
  validFrom: '2026-08-20',
  validTo: '2026-08-31',
  signPlaceDate: 'Purwokerto, 20 Agustus 2026',
};

// Data Contoh Surat Tugas (Penagihan Perorangan / Hutang Piutang Pribadi)
export const CONTOH_LETTER_PERORANGAN: Partial<LetterData> = {
  penagihanType: 'perorangan',
  letterNumber: '002/ST-MJI/VIII/2026',
  assignerName: 'FILEMO HALAWA',
  assignerPosition: 'DIREKTUR',
  assigneeName: 'RIZKY JUANDA SAPUTRA',
  assigneePosition: 'Petugas Penagihan Khusus',
  clientName: 'H. AHMAD SUBAGYO, S.E.',
  krediturPeroranganNik: '3302141908750002',
  dasarPenagihan: 'Surat Perjanjian Pengakuan Hutang & Surat Kuasa Khusus tertanggal 10 Januari 2026',
  customerContract: 'SPH/08/I/2026',
  customerName: 'BAMBANG KURNIAWAN',
  customerAddressDetail: 'Jl. Ahmad Yani No. 88',
  customerRt: '02',
  customerRw: '05',
  customerKabupaten: 'BANYUMAS',
  customerKecamatan: 'PURWOKERTO TIMUR',
  customerKelurahan: 'KRANJI',
  customerAddress: 'Jl. Ahmad Yani No. 88 RT 02 RW 05, KEL. KRANJI, KEC. PURWOKERTO TIMUR',
  customerDueDate: '22-September-2026',
  customerInstallment: '',
  customerTotalInstallment: '',
  customerUnpaidInstallmentCount: '',
  customerPenalty: '',
  besaranPokok: 'Rp 65.000.000',
  besaranBungaDenda: 'Rp 5.000.000',
  totalTagihan: 'Rp 70.000.000',
  terbilangTagihan: 'Tujuh Puluh Juta Rupiah',
  kronologi: 'Pada tanggal 10 Januari 2026, Debitur menerima pinjaman dana modal usaha dengan kesepakatan pelunasan paling lambat tanggal 10 Juli 2026. Namun hingga melewati batas waktu jatuh tempo dan telah diberikan teguran lisan maupun tertulis sebanyak 3 (tiga) kali, Debitur belum melakukan pembayaran kewajiban.',
  vehicleBrand: '',
  vehicleBrandMake: '',
  vehicleBrandModel: '',
  vehiclePlate: '',
  validFrom: '2026-08-20',
  validTo: '2026-08-31',
  signPlaceDate: 'Purwokerto, 20 Agustus 2026',
};
