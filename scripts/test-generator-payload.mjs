#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: UJI PAYLOAD GENERATOR SURAT WEB
 * ============================================================================
 *  Target generator: https://generator-surat-beige.vercel.app/
 *  Repo acuan      : https://github.com/irvanlaksana/generator-surat-
 *                    (model LetterData + BastData + PaperSize + docType)
 *
 *  Menguji kode ASLI:
 *    • src/lib/generatorSuratPayload.ts  — builder payload frontend
 *    • src/lib/suratGenerator.ts         — generator lokal (fitur lama, tetap ada)
 *    • api/lib/generatorLink.ts          — builder tautan backend (Express/Vercel)
 *    • appsscript/Surat.gs               — action SURAT_OPEN_GENERATOR (GAS)
 *    • appsscript/Drive.gs               — action DRIVE_FILE (proxy preview media)
 *
 *  Jalankan: `npm run test:generator`
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadGasProject, MockFolder, mockState, ROOT } from './lib/gasMockRuntime.mjs';

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ✅ ${label}\n`);
  } else {
    failed += 1;
    failures.push(label + (detail ? ` — ${detail}` : ''));
    process.stdout.write(`  ❌ ${label}${detail ? ` — ${detail}` : ''}\n`);
  }
}

function group(title) {
  process.stdout.write(`\n▸ ${title}\n`);
}

/* ======================================================================== *
 *  BUNDLE KODE ASLI
 * ======================================================================== */

const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms-generator-test');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const entryPath = path.join(CACHE_DIR, 'generator-entry.ts');
const bundlePath = path.join(CACHE_DIR, 'generator-bundle.mjs');

fs.writeFileSync(
  entryPath,
  [
    `export * as web from '${ROOT}/src/lib/generatorSuratPayload';`,
    `export * as legacy from '${ROOT}/src/lib/suratGenerator';`,
    `export * as backend from '${ROOT}/api/lib/generatorLink';`,
    '',
  ].join('\n'),
  'utf8'
);

execSync(
  `npx esbuild "${entryPath}" --bundle --format=esm --platform=node --packages=external --target=node20 --outfile="${bundlePath}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

const { web, legacy, backend } = await import(bundlePath);

/* ======================================================================== *
 *  DATA UJI (meniru store ARMS)
 * ======================================================================== */

const settings = {
  companyName: 'PT. MITRA JASATRIA INDONESIA',
  companyAddress: 'Jl. Gerilya No. 45, Purwokerto Selatan, Banyumas, Jawa Tengah',
  companyPhone: '(0281) 634567',
  companyLogo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg',
};

const personnel = {
  id: 'PRS-004',
  fullName: 'RIZKY JUANDA SAPUTRA',
  nikKtp: '3302242201940001',
  position: 'Petugas Remedial',
  phoneNumber: '0812-9876-5432',
  ktpPhotoUrl: 'https://drive.google.com/file/d/1KTPabcdef0123456789abcdefghijklmno/view',
};

const customer = {
  id: 'CUS-018',
  fullName: 'KISNO ANGKAH TRI HIDAYAT',
  nikKtp: '3303041508820003',
  phone: '0857-1234-5678',
  contractNo: '00730191',
  addressCurrent: 'KALIKABONG RT 004 RW 002, KEL. KALIKABONG, KEC. KALIMANAH, KAB. PURBALINGGA, JAWA TENGAH',
  addressKtp: 'KALIKABONG RT 004 RW 002',
  dueDate: '2026-09-20',
  installmentAmount: 'Rp 385.000',
  totalInstallment: 4235000,
  penaltyAmount: 'Rp 41.692.000',
  vehicleMerkType: 'YAMAHA / VIXION',
  vehiclePoliceNo: 'R4088YV',
};

const caseItem = {
  id: 'CAS-0007',
  caseNo: 'CAS-2026-0007',
  clientId: 'CLT-002',
  clientName: 'Koperasi Anugrah Mega Mandiri (KAMM)',
  clientType: 'MULTIFINANCE',
  customerId: customer.id,
  debtorName: customer.fullName,
  debtorNik: customer.nikKtp,
  multifinanceContractNo: '00730191 / KAMM-2024',
  assetSummary: 'YAMAHA VIXION 2022',
  overdueDays: 120,
};

const asset = { id: 'AST-001', category: 'MOTORCYCLE', brandModel: 'YAMAHA VIXION 150', policeNoVIN: 'R4088YV', caseId: caseItem.id };
const recovery = {
  id: 'RCV-001',
  caseId: caseItem.id,
  recoveryDate: '2026-09-10',
  vehicleType: 'MOTORCYCLE',
  vehicleYear: 2022,
  hasStnk: true,
  hasKey: true,
  physicalCondition: 'GOOD',
  warehouseLocation: 'Gudang Purwokerto',
  assetDescription: 'YAMAHA VIXION 150',
};

const formInput = {
  skNumber: '001/ST/MJI/14/IX/2026',
  skId: 'SK-001',
  companyName: settings.companyName,
  companyAddress: settings.companyAddress,
  companyPhone: settings.companyPhone,
  companyLogo: settings.companyLogo,
  repName: 'FILEMO HALAWA',
  repTitle: 'DIREKTUR',
  city: 'Purwokerto',
  isPerorangan: false,
  personnel,
  caseItem,
  customer,
  asset,
  recovery,
  contractNo: '00730191',
  debtorName: customer.fullName,
  debtorAddress: customer.addressCurrent,
  debtorPhone: customer.phone,
  dueDate: customer.dueDate,
  installment: customer.installmentAmount,
  penalty: customer.penaltyAmount,
  vehicleMerk: customer.vehicleMerkType,
  vehiclePoliceNo: customer.vehiclePoliceNo,
  issuedDate: '2026-09-14',
  expiryDate: '2026-09-24',
  attachments: ['https://drive.google.com/file/d/1ATTabcdef0123456789abcdefghijklmno/view', 'data:image/jpeg;base64,/9j/4AAQ'],
  notes: 'Unit diserahkan sukarela di gudang Purwokerto.',
  docType: 'surat_tugas',
  paperSize: 'f4',
};

/* ======================================================================== *
 *  1. KONSTANTA GENERATOR
 * ======================================================================== */

group('1. Target generator (URL & repo)');

check('UI generator = generator-surat-beige.vercel.app', web.GENERATOR_UI_URL === 'https://generator-surat-beige.vercel.app/');
check('Repo generator = irvanlaksana/generator-surat-', web.GENERATOR_REPO_URL === 'https://github.com/irvanlaksana/generator-surat-');
check('Backend memakai base URL yang sama', backend.GENERATOR_BASE_URL === 'https://generator-surat-beige.vercel.app');
check('Backend memakai repo yang sama', backend.GENERATOR_REPO_URL === 'https://github.com/irvanlaksana/generator-surat-');
check('Modul lama me-re-export URL baru', legacy.GENERATOR_UI_URL === 'https://generator-surat-beige.vercel.app/');
check('Versi payload = 2', web.GENERATOR_PAYLOAD_VERSION === 2);

/* ======================================================================== *
 *  2. BENTUK PAYLOAD (LetterData + BastData)
 * ======================================================================== */

group('2. Payload mengikuti model repo generator-surat-');

const payload = web.buildGeneratorPayload(formInput);

const LETTER_KEYS = [
  'kopImage', 'kopImageHeight', 'kopImageFit', 'kopImageAlign', 'kopImageOffsetY', 'kopImageOffsetX',
  'kopImageMarginBottom', 'kopCompanyName', 'letterNumber', 'assignerName', 'assignerPosition',
  'assigneeName', 'assigneePosition', 'clientName', 'customerContract', 'customerName', 'customerAddress',
  'customerAddressDetail', 'customerKabupaten', 'customerKecamatan', 'customerKelurahan', 'customerDueDate',
  'customerInstallment', 'customerTotalInstallment', 'customerPenalty', 'customerUnpaidInstallmentCount',
  'attachments', 'vehicleBrand', 'vehiclePlate', 'validFrom', 'validTo', 'signPlaceDate',
];
const BAST_KEYS = [
  'jenis', 'nomorBast', 'nomorPenyerahan', 'perusahaan', 'cabang', 'alamat', 'telepon',
  'petugasNama', 'petugasNik', 'petugasJabatan', 'petugasHp',
  'debiturNama', 'debiturNik', 'debiturAlamat', 'debiturHp', 'nomorKontrak', 'krediturLeasing',
  'kendaraanMerk', 'kendaraanType', 'kendaraanTahun', 'kendaraanWarna', 'kendaraanNoPol', 'kendaraanNoRangka',
  'kendaraanNoMesin', 'kendaraanBpkb', 'kendaraanStnk', 'kendaraanOdometer', 'kendaraanBahanBakar',
  'kendaraanKondisiMesin', 'kendaraanKondisiBodi', 'checklist', 'kota', 'tanggal',
  'saksi1Nama', 'saksi1Jabatan', 'saksi2Nama', 'saksi2Jabatan', 'catatanKhusus',
];

const missingLetter = LETTER_KEYS.filter((k) => !(k in payload.letter));
const missingBast = BAST_KEYS.filter((k) => !(k in payload.bast));
check('LetterData punya SEMUA field repo generator', missingLetter.length === 0, missingLetter.join(','));
check('BastData punya SEMUA field repo generator', missingBast.length === 0, missingBast.join(','));
check('source = ARMS-CONTROL-TOWER', payload.source === 'ARMS-CONTROL-TOWER');
check('docType mengikuti pilihan modul SK', payload.docType === 'surat_tugas');
check('paperSize f4', payload.paperSize === 'f4');
check('checklist dikirim kosong (generator mengisi default)', Object.keys(payload.bast.checklist).length === 0);

group('3. Isi payload sesuai data ARMS');
check('kopCompanyName dari pengaturan', payload.letter.kopCompanyName === settings.companyName);
check('letterNumber dari nomor SK', payload.letter.letterNumber === '001/ST/MJI/14/IX/2026');
check('assignerName = pemberi tugas', payload.letter.assignerName === 'FILEMO HALAWA');
check('assignerPosition = jabatan pemberi', payload.letter.assignerPosition === 'DIREKTUR');
check('assigneeName = petugas', payload.letter.assigneeName === 'RIZKY JUANDA SAPUTRA');
check('assigneePosition = jabatan petugas', payload.letter.assigneePosition === 'Petugas Remedial');
check('clientName = kreditur/leasing', payload.letter.clientName === 'Koperasi Anugrah Mega Mandiri (KAMM)');
check('customerName = debitur', payload.letter.customerName === 'KISNO ANGKAH TRI HIDAYAT');
check('customerContract = no kontrak', payload.letter.customerContract === '00730191');
check('customerDueDate format ISO', payload.letter.customerDueDate === '2026-09-20');
check('customerInstallment format rupiah', payload.letter.customerInstallment === 'Rp 385.000');
check('customerTotalInstallment dari angka', payload.letter.customerTotalInstallment === 'Rp 4.235.000');
check('customerPenalty format rupiah', payload.letter.customerPenalty === 'Rp 41.692.000');
check('customerUnpaidInstallmentCount dari overdueDays', /Bulan/.test(payload.letter.customerUnpaidInstallmentCount));
check('vehicleBrand dari merk/tipe', payload.letter.vehicleBrand === 'YAMAHA / VIXION');
check('vehiclePlate dari nomor polisi', payload.letter.vehiclePlate === 'R4088YV');
check('validFrom/validTo ISO', payload.letter.validFrom === '2026-09-14' && payload.letter.validTo === '2026-09-24');
check('signPlaceDate = kota + tanggal panjang', /^Purwokerto, \d{1,2} September 2026$/.test(payload.letter.signPlaceDate));
check('attachments ikut terkirim (2 berkas)', payload.letter.attachments.length === 2);
check('attachment punya width/height', payload.letter.attachments[0].width > 0 && payload.letter.attachments[0].height > 0);
check('kopImage (logo) ikut di payload JSON', typeof payload.letter.kopImage === 'string' && payload.letter.kopImage.startsWith('data:image/png'));

check('BAST jenis roda2 (motor)', payload.bast.jenis === 'roda2');
check('BAST nomorBast format resmi', /^\d{3}\/BAST\/MJI\/\d{2}\/[IVX]+\/\d{4}$/.test(payload.bast.nomorBast));
check('BAST nomorPenyerahan format SPK', /^\d{3}\/SPK\/MJI\/\d{2}\/[IVX]+\/\d{4}$/.test(payload.bast.nomorPenyerahan));
check('BAST petugasNik dari personnel', payload.bast.petugasNik === '3302242201940001');
check('BAST petugasHp dari personnel', payload.bast.petugasHp === '0812-9876-5432');
check('BAST debiturNik dari customer', payload.bast.debiturNik === '3303041508820003');
check('BAST debiturHp dari customer', payload.bast.debiturHp === '0857-1234-5678');
check('BAST krediturLeasing dari klien', payload.bast.krediturLeasing === 'Koperasi Anugrah Mega Mandiri (KAMM)');
check('BAST kendaraanMerk/Type terpecah', payload.bast.kendaraanMerk === 'YAMAHA' && payload.bast.kendaraanType === 'VIXION');
check('BAST kendaraanTahun dari asset recovery', payload.bast.kendaraanTahun === '2022');
check('BAST kendaraanStnk dari hasStnk', payload.bast.kendaraanStnk === 'Ada (diserahkan)');
check('BAST kendaraanKondisiBodi dari physicalCondition', /Baik/.test(payload.bast.kendaraanKondisiBodi));
check('BAST kota/tanggal terisi', payload.bast.kota === 'Purwokerto' && /September 2026/.test(payload.bast.tanggal));
check('BAST catatanKhusus dari catatan form', payload.bast.catatanKhusus === 'Unit diserahkan sukarela di gudang Purwokerto.');
check('meta memuat ID ARMS', payload.meta.armsSkId === 'SK-001' && payload.meta.armsCaseNo === 'CAS-2026-0007');

group('4. Alamat terurai (detail / kelurahan / kecamatan / kabupaten)');
const parts = web.splitIndonesianAddress(customer.addressCurrent);
check('Kelurahan terbaca', parts.kelurahan === 'KALIKABONG');
check('Kecamatan terbaca', parts.kecamatan === 'KALIMANAH');
check('Kabupaten terbaca', parts.kabupaten.includes('PURBALINGGA'));
check('Detail alamat = RT/RW', parts.detail.startsWith('KALIKABONG RT 004 RW 002'));
check('letter memakai hasil uraian', payload.letter.customerKecamatan === 'KALIMANAH');

group('5. Format nomor surat & util');
check(
  'Nomor surat resmi ST',
  web.buildOfficialLetterNumber({ type: 'ST', companyName: settings.companyName, date: '2026-09-14', sequence: 7 }) === '007/ST/MJI/14/IX/2026'
);
check('Inisial KAMM dikenali', web.extractCompanyInitials('Koperasi Anugrah Mega Mandiri') === 'KAMM');
check('Inisial default MJI', web.extractCompanyInitials('') === 'MJI');
check('Bulan romawi Agustus', web.getRomanMonth(7) === 'VIII');
check('Tanggal panjang Indonesia', web.toLongIdDate('2026-08-29') === '29 Agustus 2026');
check('Tanggal dari format panjang', web.toIsoDate('29 Agustus 2026') === '2026-08-29');
check('formatRupiah angka', web.formatRupiah(1250000) === 'Rp 1.250.000');
check('formatRupiah teks berformat dilewatkan', web.formatRupiah('Rp 385.000') === 'Rp 385.000');
check('inferVehicleType motor', web.inferVehicleType({ merk: 'HONDA BEAT' }) === 'roda2');
check('inferVehicleType mobil', web.inferVehicleType({ merk: 'TOYOTA AVANZA' }) === 'roda4');
check('inferVehicleType dari kategori aset', web.inferVehicleType({ merk: 'UNKNOWN', category: 'MOTORCYCLE' }) === 'roda2');
check('splitVehicleBrandModel', web.splitVehicleBrandModel('YAMAHA / VIXION').type === 'VIXION');

/* ======================================================================== *
 *  6. URL GENERATOR
 * ======================================================================== */

group('6. Tautan generator membawa payload');

const url = web.buildGeneratorUrl(payload);
check('URL ke generator-surat-beige.vercel.app', url.startsWith('https://generator-surat-beige.vercel.app/'));
check('URL membawa docType', /[?&]docType=surat_tugas/.test(url));
check('URL membawa tab', /[?&]tab=surat_tugas/.test(url));
check('URL membawa ukuran kertas', /[?&]paper=f4/.test(url));
check('URL membawa parameter datar letterNumber', /letterNumber=/.test(url));
check('URL membawa parameter datar customerName', /customerName=/.test(url));
check('Payload ada (query atau hash)', /[?&]payload=|#payload=/.test(url));

const encodedFromUrl = url.includes('#payload=') ? url.split('#payload=')[1] : decodeURIComponent(url.split('payload=')[1].split('&')[0]);
const decoded = web.decodeGeneratorPayload(encodedFromUrl);
check('Payload base64url bisa di-decode', !!decoded && decoded.source === 'ARMS-CONTROL-TOWER');
check('LetterData utuh setelah decode', decoded?.letter?.customerName === 'KISNO ANGKAH TRI HIDAYAT');
check('BastData utuh setelah decode', decoded?.bast?.petugasNik === '3302242201940001');
check('kopImage data: dibuang dari URL', !decoded?.letter?.kopImage);
check('Lampiran data: dibuang dari URL', (decoded?.letter?.attachments || []).every((a) => !a.url.startsWith('data:')));
check('Lampiran Drive tetap ada di URL', (decoded?.letter?.attachments || []).length === 1);

const bastUrl = web.buildGeneratorUrl(web.buildGeneratorPayload({ ...formInput, docType: 'bast', paperSize: 'a4' }));
check('docType BAST diteruskan ke URL', /[?&]docType=bast/.test(bastUrl) && /[?&]paper=a4/.test(bastUrl));

const bigPayload = web.buildGeneratorPayload({
  ...formInput,
  notes: 'X'.repeat(5000),
  attachments: Array.from({ length: 40 }, (_, i) => `https://drive.google.com/file/d/1FILE${String(i).padStart(25, '0')}abcdef/view`),
});
const bigUrl = web.buildGeneratorUrl(bigPayload);
check('Payload besar dipindah ke hash fragment', bigUrl.includes('#payload='));

const summary = web.summarizeGeneratorPayload(payload, url);
check('Ringkasan payload untuk UI', summary.docTypeLabel.includes('Surat Tugas') && summary.payloadBytes > 500);
check('generatorPayloadJson menghasilkan JSON rapi', web.generatorPayloadJson(payload).includes('\n  "source"'));

const message = web.toGeneratorMessage(payload);
check('postMessage memakai tipe ARMS_GENERATOR_PAYLOAD', message.type === 'ARMS_GENERATOR_PAYLOAD');
check('postMessage membawa letter & bast', !!message.letter && !!message.bast);

/* ======================================================================== *
 *  7. BACKEND (Express / Vercel)
 * ======================================================================== */

group('7. Backend builder tautan (api/lib/generatorLink.ts)');

const backendResult = backend.buildGeneratorLink({
  skNumber: '002/ST/MJI/14/IX/2026',
  skId: 'SK-002',
  companyName: settings.companyName,
  city: 'Banyumas',
  companyAddress: settings.companyAddress,
  docType: 'surat_tugas',
  paperSize: 'f4',
  debtor: {
    debtorName: 'BUDI SANTOSO',
    addressCurrent: 'JL. MERDEKA 10, KEL. SOKARAJA, KEC. SOKARAJA, KAB. BANYUMAS',
    dueDate: '2026-10-01',
    vehicleMerkType: 'HONDA / BEAT',
    vehiclePoliceNo: 'R1234BC',
    nikKtp: '3302010101010001',
    phone: '08111111111',
  },
  personnel: { fullName: 'SITI AMINAH', nikKtp: '3302020202020002', position: 'Field Collector', phoneNumber: '08222222222' },
  driveDocumentUrl: 'https://drive.google.com/file/d/1DOCabcdef0123456789abcdefghijklmno/view',
});

check('Backend success', backendResult.success === true);
check('Backend URL ke beige', backendResult.url.startsWith('https://generator-surat-beige.vercel.app/'));
check('Backend payload punya letter & bast', !!backendResult.payload.letter && !!backendResult.payload.bast);
check('Backend memetakan debitur', backendResult.payload.letter.customerName === 'BUDI SANTOSO');
check('Backend memetakan petugas', backendResult.payload.letter.assigneeName === 'SITI AMINAH');
check('Backend memetakan jabatan petugas', backendResult.payload.letter.assigneePosition === 'Field Collector');
check('Backend memetakan kendaraan', backendResult.payload.letter.vehiclePlate === 'R1234BC');
check('Backend memetakan BAST debitur NIK', backendResult.payload.bast.debiturNik === '3302010101010001');
check('Backend menyimpan driveDocumentUrl di meta', backendResult.payload.meta.driveDocumentUrl.includes('drive.google.com'));
check('Backend menyertakan daftar jalur transport', backendResult.transport.length >= 3);

const passThrough = backend.buildGeneratorLink({ payload });
check('Backend meneruskan payload frontend apa adanya', passThrough.payload.letter.customerName === 'KISNO ANGKAH TRI HIDAYAT');
check('Backend mempertahankan meta frontend', passThrough.payload.meta?.armsSkId === 'SK-001');

/* ======================================================================== *
 *  8. GENERATOR LOKAL (FITUR LAMA TETAP ADA)
 * ======================================================================== */

group('8. Generator lokal (model lama) tidak dihapus');

const legacyData = legacy.buildGeneratorData({
  skNumber: '003/ST/MJI/14/IX/2026',
  companyName: settings.companyName,
  companyAddress: settings.companyAddress,
  repName: 'FILEMO HALAWA',
  repTitle: 'DIREKTUR',
  city: 'Purwokerto',
  personnel,
  caseItem,
  customer,
  contractNo: '00730191',
  debtorName: customer.fullName,
  debtorAddress: customer.addressCurrent,
  issuedDate: '2026-09-14',
  expiryDate: '2026-09-24',
});
check('buildGeneratorData lokal masih menghasilkan BastData lama', !!legacyData && !!legacyData.st && legacyData.st.nomor === '003/ST/MJI/14/IX/2026');
check('Generator lokal mengisi petugas', legacyData.st.petugasNama === 'RIZKY JUANDA SAPUTRA');
check('Generator lokal mengisi checklist', Object.keys(legacyData.checklist || {}).length > 0);
check('encodeGeneratorPayload lokal tetap ada', typeof legacy.encodeGeneratorPayload === 'function');

/* ======================================================================== *
 *  9. APPS SCRIPT (SURAT_OPEN_GENERATOR + DRIVE_FILE)
 * ======================================================================== */

group('9. Google Apps Script: SURAT_OPEN_GENERATOR');

const gas = loadGasProject();

const gasSurat = gas.call('SURAT_OPEN_GENERATOR', {
  skNumber: '004/ST/MJI/14/IX/2026',
  companyName: settings.companyName,
  city: 'Purwokerto',
  docType: 'bast',
  paperSize: 'legal',
  debtor: { debtorName: 'AGUS SALIM', addressCurrent: 'JL. MELATI 5', dueDate: '2026-11-05', vehicleMerkType: 'TOYOTA AVANZA' },
  personnel: { fullName: 'DEWI LESTARI', nikKtp: '3303030303030003', position: 'SPV Remedial' },
});
check('GAS SURAT_OPEN_GENERATOR sukses', gasSurat.success === true);
check('GAS mengarah ke generator-surat-beige.vercel.app', String(gasSurat.url).startsWith('https://generator-surat-beige.vercel.app/'));
check('GAS menyertakan repo generator-surat-', String(gasSurat.generatorRepo).includes('generator-surat-'));
check('GAS meneruskan docType bast', gasSurat.docType === 'bast');
check('GAS meneruskan paperSize legal', gasSurat.paperSize === 'legal');

const gasEncoded = gasSurat.encodedPayload;
const gasDecoded = JSON.parse(Buffer.from(String(gasEncoded).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
check('Payload GAS base64url valid', gasDecoded.source === 'ARMS-CONTROL-TOWER');
check('Payload GAS punya letter & bast', !!gasDecoded.letter && !!gasDecoded.bast);
check('Payload GAS memetakan debitur', gasDecoded.bast.debiturNama === 'AGUS SALIM');
check('Payload GAS memetakan petugas', gasDecoded.bast.petugasNama === 'DEWI LESTARI');
check('Payload GAS jenis roda4 untuk mobil', gasDecoded.bast.jenis === 'roda4');
check('URL GAS membawa parameter datar', /customerName=|debiturNama=/.test(String(gasSurat.url)));

const gasSuratPassThrough = gas.call('SURAT_OPEN_GENERATOR', { payload });
check('GAS meneruskan payload frontend', gasSuratPassThrough.success === true);
const gasPtDecoded = JSON.parse(
  Buffer.from(String(gasSuratPassThrough.encodedPayload).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
);
check('Payload frontend utuh lewat GAS', gasPtDecoded.letter.customerName === 'KISNO ANGKAH TRI HIDAYAT');
check('Kop data: dibuang dari URL GAS', !gasPtDecoded.letter.kopImage);

const gasMissing = gas.call('SURAT_OPEN_GENERATOR', {});
check('GAS menolak request tanpa debtor/personnel', gasMissing.success === false);

group('10. Google Apps Script: DRIVE_FILE (proxy preview media)');

const folder = new MockFolder('1FOLDERabcdef0123456789ABCDEFGHIJK', 'KARYAWAN_INTERNAL', null);
mockState.folders.set(folder.id, folder);
mockState.rootFolder = folder;

const fotoBlob = {
  getBytes: () => Array.from(Buffer.from('JPEG-MOCK-BYTES', 'utf8')),
  getName: () => 'KTP-RIZKY.jpg',
  getContentType: () => 'image/jpeg',
};
const createdFile = folder.createFile(fotoBlob);

const gasFile = gas.call('DRIVE_FILE', { fileId: createdFile.id });
check('DRIVE_FILE sukses', gasFile.success === true);
check('DRIVE_FILE mengembalikan mimeType', gasFile.mimeType === 'image/jpeg');
check('DRIVE_FILE mengembalikan nama berkas', gasFile.name === 'KTP-RIZKY.jpg');
check('DRIVE_FILE mengembalikan base64 isi berkas', Buffer.from(String(gasFile.base64), 'base64').toString('utf8') === 'JPEG-MOCK-BYTES');
check('DRIVE_FILE menyertakan webViewLink', String(gasFile.webViewLink).includes(createdFile.id));

const gasFileByUrl = gas.call('DRIVE_FILE', { fileId: `https://drive.google.com/file/d/${createdFile.id}/view` });
check('DRIVE_FILE menerima URL Drive penuh', gasFileByUrl.success === true && gasFileByUrl.fileId === createdFile.id);

const gasFileMissing = gas.call('DRIVE_FILE', { fileId: '1TIDAKADAabcdef0123456789abcdefgh' });
check('DRIVE_FILE gagal untuk berkas tidak ada', gasFileMissing.success === false);

const gasFileNoParam = gas.call('DRIVE_FILE', {});
check('DRIVE_FILE menolak tanpa fileId', gasFileNoParam.success === false);

const bigFile = folder.createFile({
  getBytes: () => new Array(26 * 1024 * 1024).fill(0),
  getName: () => 'video-besar.mp4',
  getContentType: () => 'video/mp4',
});
const gasFileBig = gas.call('DRIVE_FILE', { fileId: bigFile.id });
check('DRIVE_FILE menolak berkas > 25 MB', gasFileBig.success === false && /terlalu besar/i.test(String(gasFileBig.error)));

const aliasFile = gas.call('GET_FILE', { fileId: createdFile.id });
check('Alias GET_FILE -> DRIVE_FILE', aliasFile.success === true);

/* ======================================================================== *
 *  RINGKASAN
 * ======================================================================== */

process.stdout.write(`\n${'='.repeat(72)}\n`);
process.stdout.write(`GENERATOR SURAT & MEDIA PROXY: ${passed} lulus, ${failed} gagal\n`);
if (failed) {
  process.stdout.write('Kegagalan:\n');
  failures.forEach((f) => process.stdout.write(`  - ${f}\n`));
}
process.stdout.write(`${'='.repeat(72)}\n`);
process.exit(failed ? 1 : 0);
