import React from 'react';
import { BastData, PaperSize, PAPER_SIZES } from '../types';
import { getChecklistDefinitions } from '../data/defaults';
import { getEffectiveKopSettings } from '../utils/kopStorage';

interface BastSheetProps {
  data: BastData;
  paperSize?: PaperSize;
}

export default function BastSheet({ data, paperSize = 'f4' }: BastSheetProps) {
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.f4;
  const items = getChecklistDefinitions(data.jenis);
  const effectiveKop = getEffectiveKopSettings(data);
  const showImageKop = Boolean(effectiveKop.kopImage && data.useImageKop !== false);

  // Group checklist items by kategori
  const grouped: Record<string, typeof items> = {};
  items.forEach((item) => {
    if (!grouped[item.kategori]) {
      grouped[item.kategori] = [];
    }
    grouped[item.kategori].push(item);
  });

  return (
    <div 
      style={{
        width: `${paper.widthMm}mm`,
        minHeight: `${paper.heightMm}mm`,
      }}
      className="mx-auto bg-white p-[11mm] text-black font-serif text-[8.5pt] leading-tight box-border print:p-[10mm] print:shadow-none print:m-0 print:w-full print:min-h-0 print:text-[8.5pt] flex flex-col justify-between"
    >
      <div>
        {/* Header / Kop Surat */}
        {showImageKop ? (
          <div 
            className="kop-surat-header print:break-inside-avoid"
            style={{
              position: 'relative',
              left: `${effectiveKop.kopImageOffsetX || 0}px`,
              top: `${effectiveKop.kopImageOffsetY || 0}px`,
              marginBottom: `${effectiveKop.kopImageMarginBottom || 12}px`,
            }}
          >
            <img
              src={effectiveKop.kopImage!}
              alt="Kop Surat"
              style={{
                width: '100%',
                height: `${effectiveKop.kopImageHeight || 120}px`,
                objectFit: effectiveKop.kopImageFit || 'contain',
                objectPosition: effectiveKop.kopImageAlign || 'center',
              }}
            />
          </div>
        ) : (
          <div className="flex justify-between items-start border-b-[2px] border-black pb-1.5 mb-2 print:break-inside-avoid">
            <div>
              <h2 className="text-[12pt] font-bold uppercase tracking-wide font-serif leading-none">{data.perusahaan}</h2>
              <p className="text-[8.5pt] font-sans font-semibold text-gray-800 mt-0.5">{data.cabang}</p>
              <p className="text-[7.5pt] font-sans text-gray-600 leading-tight">{data.alamat} | Telp: {data.telepon}</p>
            </div>
            <div className="text-right font-sans text-[8pt]">
              <p className="font-bold text-gray-900 text-[9pt] uppercase tracking-wide">LEMBAR BAST - {data.jenis === 'roda2' ? 'RODA 2' : 'RODA 4'}</p>
              <p className="text-gray-700 mt-0.5">
                No. BAST: <span className="font-mono font-extrabold text-[9.5pt] text-black bg-slate-100 px-1.5 py-0.2 border border-slate-300 rounded">{data.nomorBast}</span>
              </p>
              <p className="text-gray-600 mt-0.5">No. Kontrak: <span className="font-semibold text-black">{data.nomorKontrak}</span></p>
            </div>
          </div>
        )}

        {/* Judul BAST */}
        <div className="text-center mb-1.5">
          <h1 className="text-[10.5pt] font-bold uppercase tracking-wider font-serif underline decoration-1 underline-offset-2">
            BERITA ACARA SERAH TERIMA & PEMERIKSAAN KONDISI FISIK UNIT
          </h1>
          <div className="flex items-center justify-center gap-2.5 font-sans text-[7.5pt] text-gray-700 mt-0.5">
            <span>NO. BAST: <strong className="font-mono text-black font-extrabold bg-slate-100 px-1 py-0.2 border border-slate-300 rounded">{data.nomorBast}</strong></span>
            <span>•</span>
            <span>NO. KONTRAK: <strong className="text-black font-bold font-mono">{data.nomorKontrak}</strong></span>
            <span>•</span>
            <span>TANGGAL: <strong className="text-black font-semibold">{data.tanggal}</strong></span>
          </div>
        </div>

        {/* Info Singkat Debitur & Kendaraan */}
        <div className="grid grid-cols-2 gap-2 mb-1.5 font-sans text-[8pt] bg-slate-50/70 border border-slate-300 p-1.5 rounded">
          <div>
            <p className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1 text-[8pt] uppercase tracking-wide">
              I. DATA KONSUMEN & PENERIMA:
            </p>
            <div className="grid grid-cols-[85px_6px_1fr] gap-y-0.5 leading-snug">
              <div>Nama Debitur</div><div>:</div><div className="font-bold uppercase text-black">{data.debiturNama}</div>
              <div>No. KTP / NIK</div><div>:</div><div className="font-mono">{data.debiturNik || '-'}</div>
              <div>No. HP / Telp</div><div>:</div><div>{data.debiturHp}</div>
              <div>Petugas Penerima</div><div>:</div><div className="font-semibold uppercase text-black">{data.petugasNama}</div>
              <div>Kreditur / Finance</div><div>:</div><div className="font-medium text-slate-800">{data.krediturLeasing}</div>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 mb-1 text-[8pt] uppercase tracking-wide">
              II. IDENTITAS KENDARAAN:
            </p>
            <div className="grid grid-cols-[80px_6px_1fr] gap-y-0.5 leading-snug">
              <div>Merk / Tipe</div><div>:</div><div className="font-bold uppercase text-black">{data.kendaraanMerk} {data.kendaraanType}</div>
              <div>No. Polisi</div><div>:</div><div className="font-bold font-mono text-black">{data.kendaraanNoPol}</div>
              <div>Tahun / Warna</div><div>:</div><div>{data.kendaraanTahun} / {data.kendaraanWarna}</div>
              <div>KM / BBM</div><div>:</div><div>{data.kendaraanOdometer || '-'} ({data.kendaraanBahanBakar || '-'})</div>
              <div>No. Rangka / Mesin</div><div>:</div><div className="font-mono text-[7.5pt]">{data.kendaraanNoRangka} / {data.kendaraanNoMesin}</div>
            </div>
          </div>
        </div>

        {/* Checklist Table */}
        <div className="mb-1.5">
          <div className="flex items-center justify-between mb-0.5 font-sans">
            <span className="font-bold text-[8pt] uppercase tracking-wide text-slate-900">
              LEMBAR CHECKLIST FISIK & KELENGKAPAN KENDARAAN ({items.length} ITEM):
            </span>
            <span className="text-[7pt] text-slate-600 italic">
              Keterangan: <strong>B</strong> = Baik/Lengkap | <strong>R</strong> = Rusak/Perbaikan | <strong>T</strong> = Tidak Ada
            </span>
          </div>

          <table className="w-full border-collapse border border-slate-400 font-sans text-[7.5pt]">
            <thead>
              <tr className="bg-slate-200 text-slate-900 text-center font-bold">
                <th className="border border-slate-400 py-0.5 px-1 w-5" rowSpan={2}>No</th>
                <th className="border border-slate-400 py-0.5 px-1.5 text-left" rowSpan={2}>Komponen / Kelengkapan Unit</th>
                <th className="border border-slate-400 py-0.2 px-1 text-[7pt]" colSpan={3}>Kondisi Diserahkan</th>
                <th className="border border-slate-400 py-0.2 px-1 text-[7pt]" colSpan={3}>Kondisi Diterima</th>
                <th className="border border-slate-400 py-0.5 px-1 text-left w-36" rowSpan={2}>Catatan Khusus / Keterangan</th>
              </tr>
              <tr className="bg-slate-200 text-slate-900 text-center font-bold text-[7pt]">
                <th className="border border-slate-400 py-0.2 w-4">B</th>
                <th className="border border-slate-400 py-0.2 w-4">R</th>
                <th className="border border-slate-400 py-0.2 w-4">T</th>
                <th className="border border-slate-400 py-0.2 w-4">B</th>
                <th className="border border-slate-400 py-0.2 w-4">R</th>
                <th className="border border-slate-400 py-0.2 w-4">T</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([kategori, list], groupIdx) => (
                <React.Fragment key={kategori}>
                  <tr className="bg-slate-100 font-bold text-slate-900">
                    <td colSpan={9} className="border border-slate-400 px-1 py-0.2 text-[7.5pt] uppercase tracking-wider bg-slate-100">
                      {groupIdx + 1}. {kategori}
                    </td>
                  </tr>
                  {list.map((item, itemIdx) => {
                    const val = data.checklist?.[item.id] || { status: 'baik', catatan: '' };
                    const isBaik = val.status === 'baik';
                    const isRusak = val.status === 'rusak';
                    const isTidakAda = val.status === 'tidak_ada';
                    
                    const status2 = val.statusPihak2 || val.status;
                    const isBaik2 = status2 === 'baik';
                    const isRusak2 = status2 === 'rusak';
                    const isTidakAda2 = status2 === 'tidak_ada';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 leading-none">
                        <td className="border border-slate-400 text-center py-0.5 text-[7pt] text-slate-500">
                          {itemIdx + 1}
                        </td>
                        <td className="border border-slate-400 px-1.5 py-0.5 text-slate-900 leading-tight">
                          {item.nama}
                        </td>
                        <td className="border border-slate-400 text-center py-0.5 font-bold text-emerald-700 text-[8pt]">
                          {isBaik ? '✓' : ''}
                        </td>
                        <td className="border border-slate-400 text-center py-0.5 font-bold text-rose-600 text-[8pt]">
                          {isRusak ? '✗' : ''}
                        </td>
                        <td className="border border-slate-400 text-center py-0.5 font-bold text-slate-400 text-[8pt]">
                          {isTidakAda ? '—' : ''}
                        </td>
                        <td className="border border-slate-400 text-center py-0.5 font-bold text-emerald-700 text-[8pt]">
                          {isBaik2 ? '✓' : ''}
                        </td>
                        <td className="border border-slate-400 text-center py-0.5 font-bold text-rose-600 text-[8pt]">
                          {isRusak2 ? '✗' : ''}
                        </td>
                        <td className="border border-slate-400 text-center py-0.5 font-bold text-slate-400 text-[8pt]">
                          {isTidakAda2 ? '—' : ''}
                        </td>
                        <td className="border border-slate-400 px-1 py-0.5 text-slate-700 text-[7pt] leading-tight">
                          {val.status === '' ? '' : (val.catatan || (isBaik ? 'Lengkap & Baik' : isRusak ? 'Rusak/Perbaikan' : 'Tidak Ada'))}
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {/* Catatan Kondisi Bodi & Kelengkapan */}
        <div className="border border-slate-300 p-1 font-sans text-[7.5pt] mb-1.5 bg-slate-50/50 rounded">
          <p className="font-bold text-slate-900 mb-0.5 uppercase tracking-wide text-[7.5pt]">
            CATATAN KONDISI BODI, CAT & KELENGKAPAN TAMBAHAN:
          </p>
          <p className="text-slate-800 italic leading-snug">
            {data.kendaraanKondisiBodi || 'Bodi kendaraan dalam kondisi wajar pemakaian.'} {data.catatanKhusus ? `(${data.catatanKhusus})` : ''}
          </p>
        </div>

        {/* Pernyataan Penutup */}
        <p className="text-[8pt] text-justify mb-1.5 leading-snug">
          Kedua belah pihak telah bersama-sama memeriksa fisik dan kelengkapan unit kendaraan di atas secara teliti, seksama, dan dalam keadaan sadar tanpa paksaan dari pihak manapun. Berita Acara Serah Terima ini dibuat sebagai bukti sah serah terima unit kendaraan.
        </p>

        {/* Kolom Tanda Tangan */}
        <div className="text-center font-sans text-[8pt] pt-0.5 break-inside-avoid">
          <p className="mb-1 font-serif text-[8.5pt]">{data.kota}, {data.tanggal}</p>
          
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="font-bold text-[8pt]">YANG MENYERAHKAN,</p>
              <p className="text-[7pt] text-slate-500">(Debitur / Kuasa)</p>
              <div className="h-9"></div>
              <p className="font-bold underline uppercase text-[8pt]">({data.debiturNama || '........................'})</p>
            </div>

            <div>
              <p className="font-bold text-[8pt]">YANG MENERIMA,</p>
              <p className="text-[7pt] text-slate-500">(Petugas Remedial / Penerima)</p>
              <div className="h-9"></div>
              <p className="font-bold underline uppercase text-[8pt]">({data.petugasNama || '........................'})</p>
            </div>

            <div>
              <p className="font-bold text-[8pt]">MENGETAHUI / SAKSI,</p>
              <p className="text-[7pt] text-slate-500">(Supervisor / Saksi Konsumen)</p>
              <div className="h-9"></div>
              <p className="font-bold underline uppercase text-[8pt]">({data.saksi1Nama || '........................'})</p>
            </div>
          </div>
        </div>
      </div>

      {/* Official Footnote matching Multi-Finance Report */}
      <div className="border-t border-slate-300 pt-1 mt-1 flex items-center justify-between font-sans text-[6.5pt] text-slate-500">
        <div>
          <span>Lembar 1: Asli (Kreditur / Kantor Pusat)</span> | <span>Lembar 2: Konsumen (Debitur)</span> | <span>Lembar 3: Arsip Cabang</span>
        </div>
        <div>
          <span>Form BAST Multi-Finance • PT. Mitra Jasatria Indonesia</span>
        </div>
      </div>
    </div>
  );
}

