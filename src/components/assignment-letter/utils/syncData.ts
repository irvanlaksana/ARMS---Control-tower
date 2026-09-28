import { LetterData, BastData, VehicleType } from '../types';

/**
 * Mengambil dan menyinkronkan seluruh isian formulir dari Surat Tugas ke BAST & Surat Penyerahan
 */
export function syncLetterDataToBast(letter: LetterData, prev: BastData): BastData {
  // 1. Ekstraksi Kota & Tanggal dari signPlaceDate (contoh: "Purwokerto, 20 Agustus 2026")
  let kota = prev.kota;
  let tanggal = prev.tanggal;
  if (letter.signPlaceDate && letter.signPlaceDate.includes(',')) {
    const parts = letter.signPlaceDate.split(',');
    if (parts[0]?.trim()) kota = parts[0].trim();
    if (parts[1]?.trim()) tanggal = parts[1].trim();
  } else if (letter.signPlaceDate && letter.signPlaceDate.trim()) {
    tanggal = letter.signPlaceDate.trim();
  }

  // 2. Ekstraksi Merk & Tipe Kendaraan
  let brand = prev.kendaraanMerk;
  let model = prev.kendaraanType;
  if (letter.vehicleBrandMake && letter.vehicleBrandMake.trim()) {
    brand = letter.vehicleBrandMake.trim();
  } else if (letter.vehicleBrand && letter.vehicleBrand.trim()) {
    brand = letter.vehicleBrand.split('/')[0]?.trim() || prev.kendaraanMerk;
  }

  if (letter.vehicleBrandModel && letter.vehicleBrandModel.trim()) {
    model = letter.vehicleBrandModel.trim();
  } else if (letter.vehicleBrand && letter.vehicleBrand.includes('/')) {
    model = letter.vehicleBrand.split('/')[1]?.trim() || prev.kendaraanType;
  }

  // 3. Deteksi otomatis Kategori Kendaraan (Roda 2 vs Roda 4)
  let detectedJenis: VehicleType = prev.jenis;
  const combined = `${letter.vehicleBrand || ''} ${letter.vehicleBrandMake || ''} ${letter.vehicleBrandModel || ''}`.toLowerCase();
  const motorKeywords = [
    'vario', 'beat', 'nmax', 'pcx', 'scoopy', 'aerox', 'vixion', 'mio',
    'cbr', 'ninja', 'klx', 'crf', 'supra', 'jupiter', 'motor', 'r15', 'r25', 'cb150'
  ];
  const mobilKeywords = [
    'avanza', 'xenia', 'hrv', 'hr-v', 'brio', 'innova', 'rush', 'terios',
    'pajero', 'fortuner', 'sigra', 'calya', 'mobil', 'jazz', 'yaris', 'agya', 'ayla'
  ];

  if (motorKeywords.some((k) => combined.includes(k))) {
    detectedJenis = 'roda2';
  } else if (mobilKeywords.some((k) => combined.includes(k))) {
    detectedJenis = 'roda4';
  }

  return {
    ...prev,
    // Data Konsumen / Debitur dari Surat Tugas
    debiturNama: letter.customerName ?? prev.debiturNama,
    debiturAlamat: letter.customerAddress ?? prev.debiturAlamat,
    nomorKontrak: letter.customerContract ?? prev.nomorKontrak,
    krediturLeasing: letter.clientName ?? prev.krediturLeasing,

    // Data Petugas Penerima Kuasa dari Surat Tugas (Penerima Tugas)
    petugasNama: letter.assigneeName ?? prev.petugasNama,
    petugasJabatan: letter.assigneePosition ?? prev.petugasJabatan,

    // Data Saksi I / Mengetahui dari Surat Tugas (Pemberi Tugas / Direktur)
    saksi1Nama: letter.assignerName ?? prev.saksi1Nama,
    saksi1Jabatan: letter.assignerPosition ?? prev.saksi1Jabatan,

    // Data Kendaraan dari Surat Tugas
    kendaraanNoPol: letter.vehiclePlate ?? prev.kendaraanNoPol,
    kendaraanMerk: brand,
    kendaraanType: model,
    jenis: detectedJenis,

    // Perusahaan & Lokasi / Waktu
    perusahaan: letter.kopCompanyName || prev.perusahaan,
    kota,
    tanggal,

    // Kop Surat & Parameter Posisi
    kopImage: letter.kopImage !== undefined ? letter.kopImage : prev.kopImage,
    kopImageHeight: letter.kopImageHeight ?? prev.kopImageHeight,
    kopImageFit: letter.kopImageFit ?? prev.kopImageFit,
    kopImageAlign: letter.kopImageAlign ?? prev.kopImageAlign,
    kopImageOffsetY: letter.kopImageOffsetY ?? prev.kopImageOffsetY,
    kopImageOffsetX: letter.kopImageOffsetX ?? prev.kopImageOffsetX,
    kopImageMarginBottom: letter.kopImageMarginBottom ?? prev.kopImageMarginBottom,
    kopCompanyName: letter.kopCompanyName ?? prev.kopCompanyName,
    useImageKop: letter.kopImage ? true : prev.useImageKop,
  };
}
