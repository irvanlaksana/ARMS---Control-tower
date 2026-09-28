import React from 'react';
import { BastData, PaperSize, PAPER_SIZES } from '../types';
import { getEffectiveKopSettings } from '../utils/kopStorage';

interface SuratPenyerahanProps {
  data: BastData;
  paperSize?: PaperSize;
}

export default function SuratPenyerahan({ data, paperSize = 'f4' }: SuratPenyerahanProps) {
  const paper = PAPER_SIZES[paperSize] || PAPER_SIZES.f4;
  const effectiveKop = getEffectiveKopSettings(data);
  const showImageKop = Boolean(effectiveKop.kopImage && data.useImageKop !== false);

  return (
    <div 
      style={{
        width: `${paper.widthMm}mm`,
        minHeight: `${paper.heightMm}mm`,
      }}
      className="mx-auto bg-white p-[11mm] text-black font-serif text-[8.5pt] leading-[1.25] box-border print:p-[10mm] print:shadow-none print:m-0 print:w-full print:min-h-0 print:text-[8.5pt] flex flex-col justify-between"
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
          <div className="text-center border-b-[2px] border-black pb-1.5 mb-2 print:break-inside-avoid">
            <h2 className="text-[12.5pt] font-bold tracking-wide uppercase font-serif leading-none">{data.perusahaan}</h2>
            <p className="text-[8.5pt] font-sans font-semibold text-gray-800 mt-0.5">{data.cabang}</p>
            <p className="text-[7.5pt] font-sans text-gray-600 leading-tight mt-0.5">{data.alamat} | Telp: {data.telepon}</p>
          </div>
        )}

        {/* Judul Surat */}
        <div className="text-center mb-1.5">
          <h1 className="text-[10.5pt] font-bold uppercase tracking-wider font-serif underline decoration-1 underline-offset-2">
            SURAT PERNYATAAN PENYERAHAN KENDARAAN SECARA SUKARELA
          </h1>
          <p className="text-[8pt] font-bold font-sans uppercase tracking-wide text-slate-800 mt-0.5">
            DAN PEMBERIAN KUASA PENJUALAN UNIT JAMINAN FIDUSIA
          </p>
          <p className="text-[8pt] font-bold font-mono tracking-wide mt-0.5 bg-slate-100/90 inline-block px-2.5 py-0.2 border border-slate-300 rounded">
            Nomor: {data.nomorPenyerahan || '-'}
          </p>
        </div>

        {/* Pembuka */}
        <p className="mb-1 text-justify text-[8.5pt]">
          Pada hari ini, tanggal <strong>{data.tanggal}</strong>, bertempat di <strong>{data.kota}</strong>, yang bertanda tangan di bawah ini:
        </p>

        {/* Pihak I & Pihak II */}
        <div className="grid grid-cols-2 gap-2 mb-1.5 font-sans text-[8pt]">
          {/* Pihak I */}
          <div className="bg-slate-50/70 p-1.5 rounded border border-slate-300">
            <p className="font-bold underline text-[8pt] text-slate-900 mb-0.5 uppercase tracking-wide">
              I. PIHAK PERTAMA (KONSUMEN / YANG MENYERAHKAN):
            </p>
            <div className="grid grid-cols-[100px_6px_1fr] gap-y-0.5 leading-snug">
              <div>Nama Lengkap</div><div>:</div><div className="font-bold uppercase text-black">{data.debiturNama || '-'}</div>
              <div>No. KTP / NIK</div><div>:</div><div className="font-mono">{data.debiturNik || '-'}</div>
              <div>Alamat Lengkap</div><div>:</div><div className="text-[7.5pt] leading-tight">{data.debiturAlamat || '-'}</div>
              <div>No. Telepon / HP</div><div>:</div><div>{data.debiturHp || '-'}</div>
              <div>No. Kontrak</div><div>:</div><div className="font-bold font-mono text-black">{data.nomorKontrak || '-'}</div>
              <div>Kreditur / Finance</div><div>:</div><div className="font-semibold text-black">{data.krediturLeasing || '-'}</div>
            </div>
            <p className="text-[7pt] italic text-slate-600 mt-0.5">
              *Selanjutnya disebut sebagai <strong>PIHAK PERTAMA</strong>.
            </p>
          </div>

          {/* Pihak II */}
          <div className="bg-slate-50/70 p-1.5 rounded border border-slate-300">
            <p className="font-bold underline text-[8pt] text-slate-900 mb-0.5 uppercase tracking-wide">
              II. PIHAK KEDUA (PENERIMA KUASA / KREDITUR):
            </p>
            <div className="grid grid-cols-[100px_6px_1fr] gap-y-0.5 leading-snug">
              <div>Nama Lengkap</div><div>:</div><div className="font-bold uppercase text-black">{data.petugasNama || '-'}</div>
              <div>Jabatan</div><div>:</div><div>{data.petugasJabatan || '-'}</div>
              <div>Perusahaan</div><div>:</div><div className="font-semibold text-black">{data.perusahaan}</div>
              <div>Cabang</div><div>:</div><div>{data.cabang}</div>
              <div>No. Telepon / HP</div><div>:</div><div>{data.petugasHp || '-'}</div>
            </div>
            <p className="text-[7pt] italic text-slate-600 mt-0.5">
              *Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.
            </p>
          </div>
        </div>

        {/* Objek Kendaraan */}
        <div className="mb-1.5 text-[8pt]">
          <p className="text-justify mb-0.5 text-[8.5pt]">
            Dengan ini PIHAK PERTAMA menyatakan secara sadar, sukarela, dan tanpa ada paksaan dari pihak manapun menyerahkan 1 (satu) unit kendaraan bermotor ({data.jenis === 'roda2' ? 'Roda 2 / Sepeda Motor' : 'Roda 4 / Mobil'}) dengan rincian spesifikasi sebagai berikut:
          </p>
          <div className="border border-slate-400 p-1.5 bg-slate-50/50 font-sans text-[7.5pt] grid grid-cols-2 gap-x-3 gap-y-0.5 rounded leading-tight">
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Merk / Tipe</div><div>:</div><div className="font-bold uppercase text-black">{data.kendaraanMerk} {data.kendaraanType}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Nomor Polisi</div><div>:</div><div className="font-bold font-mono text-black">{data.kendaraanNoPol}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Tahun / Warna</div><div>:</div><div>{data.kendaraanTahun} / {data.kendaraanWarna}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Odometer / KM</div><div>:</div><div>{data.kendaraanOdometer || '-'}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Nomor Rangka</div><div>:</div><div className="font-mono">{data.kendaraanNoRangka}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Nomor Mesin</div><div>:</div><div className="font-mono">{data.kendaraanNoMesin}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Status STNK</div><div>:</div><div>{data.kendaraanStnk}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Status BPKB</div><div>:</div><div>{data.kendaraanBpkb || 'Dalam Jaminan Kreditur'}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Kondisi Mesin</div><div>:</div><div className="truncate">{data.kendaraanKondisiMesin}</div>
            </div>
            <div className="grid grid-cols-[85px_6px_1fr]">
              <div>Kapasitas BBM</div><div>:</div><div>{data.kendaraanBahanBakar || '-'}</div>
            </div>
          </div>
        </div>

        {/* Ketentuan & Klausul Penyerahan (Wanprestasi, Kuasa Jual, dsb) */}
        <div className="text-justify space-y-0.5 text-[7.5pt] leading-tight mb-1.5">
          <p className="font-bold text-[8pt] font-sans uppercase tracking-wide text-slate-900 mb-0.5">
            KETENTUAN PENYERAHAN UNIT & PEMBERIAN KUASA:
          </p>
          <ol className="list-decimal pl-3.5 space-y-0.5 text-slate-900 font-sans">
            <li>
              <strong>Pengakuan Wanprestasi:</strong> PIHAK PERTAMA mengakui secara sadar telah melakukan wanprestasi (cidera janji) atas kewajiban pembayaran angsuran fasilitas pembiayaan berdasarkan Perjanjian Pembiayaan Konsumen No. <strong>{data.nomorKontrak}</strong> kepada Kreditur <strong>{data.krediturLeasing}</strong>.
            </li>
            <li>
              <strong>Penyerahan Sukarela:</strong> Sehubungan dengan hal tersebut di atas, PIHAK PERTAMA dengan ini secara sadar, ikhlas, sukarela, dan tanpa paksaan, ancaman, maupun bujuk rayu dari pihak manapun menyerahkan unit kendaraan tersebut kepada PIHAK KEDUA selaku pihak yang berwenang dari Kreditur.
            </li>
            <li>
              <strong>Masa Tenggang (Grace Period):</strong> PIHAK PERTAMA diberikan batas waktu tenggang selama <strong>7 (tujuh) hari kerja</strong> terhitung sejak tanggal surat ini untuk menyelesaikan seluruh kewajiban tunggakan angsuran, denda, dan biaya penanganan kepada Kreditur.
            </li>
            <li>
              <strong>Kuasa Penjualan Unit:</strong> Apabila sampai dengan batas waktu tenggang tersebut PIHAK PERTAMA tidak dapat menyelesaikan seluruh kewajibannya, maka PIHAK PERTAMA dengan ini <strong>MEMBERIKAN KUASA PENUH DAN MUTLAK YANG TIDAK DAPAT DICABUT KEMBALI KEPADA KREDITUR</strong> untuk menjual, mengalihkan, atau melelang unit kendaraan tersebut kepada pihak ketiga dengan harga wajar, guna pelunasan sisa pokok hutang, bunga, denda, dan biaya operasional lainnya.
            </li>
            <li>
              <strong>Perhitungan Hasil Penjualan:</strong> Apabila hasil penjualan unit melebihi total kewajiban hutang, kelebihan dana akan diserahkan kepada PIHAK PERTAMA. Sebaliknya bila hasil penjualan tidak mencukupi, PIHAK PERTAMA tetap berkewajiban melunasi sisa kekurangannya sampai tuntas.
            </li>
            <li>
              <strong>Pengosongan Barang Pribadi & Bebas Tuntutan:</strong> PIHAK PERTAMA telah memeriksa dan mengambil seluruh barang-barang pribadi/berharga dari kendaraan. Dengan ini PIHAK KEDUA dan Kreditur dibebaskan dari segala tuntutan hukum di kemudian hari mengenai barang-barang di dalam kendaraan.
            </li>
            {data.catatanKhusus && (
              <li className="italic text-slate-800">
                <strong>Catatan Tambahan:</strong> {data.catatanKhusus}
              </li>
            )}
          </ol>
        </div>

        {/* Kotak Bordered "PERHATIAN" */}
        <div className="border border-slate-900 bg-slate-50 p-1.5 rounded mb-1.5 font-sans text-[7pt] leading-tight">
          <p className="font-bold text-slate-950 uppercase tracking-wide text-[7.5pt] mb-0.5 flex items-center gap-1">
            <span>PERHATIAN PENTING:</span>
          </p>
          <p className="text-slate-800 text-justify">
            Unit kendaraan bermotor di atas merupakan objek jaminan fidusia yang sah dan tercatat secara hukum. Setiap upaya penggelapan, pemindahtanganan secara melawan hukum, atau perusakan atas unit jaminan fidusia ini diancam dengan sanksi pidana penjara dan denda sesuai <strong>Undang-Undang Republik Indonesia Nomor 42 Tahun 1999 tentang Jaminan Fidusia</strong> serta Kitab Undang-Undang Hukum Pidana (KUHP). Surat ini memiliki kekuatan hukum yang sah dan mengikat kedua belah pihak.
          </p>
        </div>

        {/* Penutup & Tanda Tangan */}
        <div className="pt-0.5 text-center text-[8pt] break-inside-avoid">
          <p className="mb-1 font-serif text-[8.5pt]">{data.kota}, {data.tanggal}</p>
          
          <div className="grid grid-cols-2 gap-3 mb-1.5">
            <div>
              <p className="font-bold text-[8.5pt]">PIHAK PERTAMA</p>
              <p className="text-[7pt] text-slate-600 font-sans">(Yang Menyerahkan Unit / Konsumen)</p>
              <div className="h-9 flex items-end justify-center">
                <span className="text-[6.5pt] text-slate-400 border border-dashed border-slate-300 px-1.5 py-0.2 rounded font-sans italic">
                  Materai Rp 10.000
                </span>
              </div>
              <p className="font-bold underline uppercase tracking-wide text-[8.5pt] mt-0.5">({data.debiturNama || '............................'})</p>
              <p className="text-[7pt] font-sans text-slate-700">Konsumen / Debitur</p>
            </div>

            <div>
              <p className="font-bold text-[8.5pt]">PIHAK KEDUA</p>
              <p className="text-[7pt] text-slate-600 font-sans">(Yang Menerima Unit / Penerima Kuasa)</p>
              <div className="h-9"></div>
              <p className="font-bold underline uppercase tracking-wide text-[8.5pt] mt-0.5">({data.petugasNama || '............................'})</p>
              <p className="text-[7pt] font-sans text-slate-700">{data.petugasJabatan}</p>
            </div>
          </div>

          {/* Saksi-Saksi */}
          {(data.saksi1Nama || data.saksi2Nama) && (
            <div className="border-t border-slate-300 pt-1 text-[7.5pt]">
              <p className="font-bold text-[7.5pt] mb-0.5 font-sans uppercase tracking-wide text-slate-700">SAKSI - SAKSI:</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[7pt] font-medium font-sans text-slate-600">{data.saksi1Jabatan || 'Saksi I (Konsumen/Keluarga)'}</p>
                  <div className="h-7"></div>
                  <p className="font-bold underline uppercase text-[8pt]">({data.saksi1Nama || '............................'})</p>
                </div>
                <div>
                  <p className="text-[7pt] font-medium font-sans text-slate-600">{data.saksi2Jabatan || 'Saksi II (Supervisor Remedial)'}</p>
                  <div className="h-7"></div>
                  <p className="font-bold underline uppercase text-[8pt]">({data.saksi2Nama || '............................'})</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Official Footnote matching Multi-Finance Report */}
      <div className="border-t border-slate-300 pt-1 mt-1 flex items-center justify-between font-sans text-[6.5pt] text-slate-500">
        <div>
          <span>Lembar 1: Asli (Kreditur / Kantor Pusat)</span> | <span>Lembar 2: Konsumen (Debitur)</span> | <span>Lembar 3: Arsip Cabang</span>
        </div>
        <div>
          <span>Dokumen Penyerahan Unit Sukarela • PT. Mitra Jasatria Indonesia</span>
        </div>
      </div>
    </div>
  );
}

