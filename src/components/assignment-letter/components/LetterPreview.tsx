import React, { useState } from 'react';
import { LetterData, PaperSize, PAPER_SIZES } from '../types';
import { FileDown, Loader2, UploadCloud, Printer, Eye, ChevronDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { toJpeg } from 'html-to-image';
import { formatDateID, formatCleanAddress, formatDateDDMMYYYY, formatDueDate } from '../utils/dateFormatter';

interface LetterPreviewProps {
  data: LetterData;
  paperSize?: PaperSize;
  onPaperSizeChange?: (size: PaperSize) => void;
  onOpenPrintPreview?: () => void;
  onOpenDriveModal?: () => void;
}

export default function LetterPreview({ 
  data, 
  paperSize = 'f4',
  onPaperSizeChange,
  onOpenPrintPreview,
  onOpenDriveModal 
}: LetterPreviewProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const activePaper = PAPER_SIZES[paperSize] || PAPER_SIZES.f4;

  const handleSavePdf = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const page1 = document.getElementById('letter-page-1');
      if (!page1) {
        throw new Error('Halaman surat tidak ditemukan');
      }

      // Initialize jsPDF with active paper dimension
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [activePaper.widthMm, activePaper.heightMm],
        compress: true,
      });

      // Render Page 1
      const imgData1 = await toJpeg(page1, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
      });

      pdf.addImage(imgData1, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');

      // Render Page 2 (Lampiran) if exists
      const page2 = document.getElementById('letter-page-2');
      if (page2 && data.attachments && data.attachments.length > 0) {
        pdf.addPage([activePaper.widthMm, activePaper.heightMm], 'portrait');
        const imgData2 = await toJpeg(page2, {
          quality: 0.95,
          backgroundColor: '#ffffff',
          pixelRatio: 2,
        });
        pdf.addImage(imgData2, 'JPEG', 0, 0, activePaper.widthMm, activePaper.heightMm, undefined, 'FAST');
      }

      const safeName = (data.customerName || 'Penagihan').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `Surat_Tugas_${safeName}_${paperSize.toUpperCase()}.pdf`;
      pdf.save(filename);
    } catch (err) {
      console.error('Gagal membuat file PDF:', err);
      // Fallback to browser print if canvas fails
      const originalTitle = document.title;
      document.title = `Surat_Tugas_${(data.customerName || 'Penagihan').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      window.print();
      setTimeout(() => {
        document.title = originalTitle;
      }, 1000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    if (onOpenPrintPreview) {
      onOpenPrintPreview();
    } else {
      window.print();
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#FDFBF7]">
      {/* Top Toolbar */}
      <div className="flex flex-wrap justify-between items-center gap-2.5 p-3 md:p-3.5 bg-[#EBEBE4] border-b border-[#D1D1CA] print:hidden">
        {/* Left: Paper Size Selector */}
        <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-[#D1D1CA] shadow-2xs">
          <span className="text-xs font-bold text-slate-700">Kertas:</span>
          {onPaperSizeChange ? (
            <select
              value={paperSize}
              onChange={(e) => onPaperSizeChange(e.target.value as PaperSize)}
              className="text-xs font-bold text-[#5A5A40] bg-transparent focus:outline-none cursor-pointer"
            >
              {(Object.keys(PAPER_SIZES) as PaperSize[]).map((key) => (
                <option key={key} value={key}>
                  {PAPER_SIZES[key].name} ({PAPER_SIZES[key].widthMm}×{PAPER_SIZES[key].heightMm}mm)
                </option>
              ))}
            </select>
          ) : (
            <span className="text-xs font-bold text-[#5A5A40]">{activePaper.name}</span>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Print Preview Button */}
          {onOpenPrintPreview && (
            <button
              type="button"
              id="btn-preview-modal-trigger"
              onClick={onOpenPrintPreview}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-[#D1D1CA] rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              title="Buka Pratinjau Cetak Lengkap (Print Preview)"
            >
              <Eye size={15} className="text-[#5A5A40]" />
              <span>Pratinjau Cetak</span>
            </button>
          )}

          {/* Quick Direct Print */}
          <button
            type="button"
            id="btn-quick-print"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
            title="Cetak Dokumen Sekarang (Ctrl+P)"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Cetak</span>
          </button>

          {/* Save to Drive */}
          {onOpenDriveModal && (
            <button 
              type="button"
              id="btn-preview-simpan-gdrive"
              onClick={onOpenDriveModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2D6A4F] text-white rounded-lg hover:bg-[#1B4332] active:scale-95 transition font-semibold text-xs shadow-2xs cursor-pointer"
            >
              <UploadCloud size={15} />
              <span className="hidden sm:inline">Simpan ke GDrive</span>
            </button>
          )}

          {/* Save PDF */}
          <button 
            id="btn-simpan-pdf"
            onClick={handleSavePdf}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#5A5A40] text-white rounded-lg hover:bg-[#484833] active:scale-95 transition font-bold text-xs shadow-2xs cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Menyimpan...</span>
              </>
            ) : (
              <>
                <FileDown size={15} />
                <span>Simpan PDF</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 print:p-0 print:overflow-visible text-black bg-[#EBEBE4] print:bg-white custom-scrollbar">
        {/* The Document Container - Dynamic Paper Size with 10mm Top Margin, 12mm Bottom Margin */}
        <div 
          id="letter-page-1"
          style={{
            width: `${activePaper.widthMm}mm`,
            maxWidth: `${activePaper.widthMm}mm`,
            minHeight: `${activePaper.heightMm}mm`,
            paddingTop: '10mm',
            paddingLeft: '18mm',
            paddingRight: '18mm',
            paddingBottom: '10mm',
          }}
          className="mx-auto bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#E5E5E0] font-serif print:shadow-none print:border-none print:p-0 print:pt-[10mm] print:px-[18mm] print:pb-[10mm] print:m-0 print:max-w-none text-[9pt] leading-[1.24] box-border print-document-sheet"
        >
          
          {/* Kop Surat Image */}
          <div style={{ position: 'relative', left: `${data.kopImageOffsetX || 0}px`, top: `${data.kopImageOffsetY}px`, marginBottom: `${data.kopImageMarginBottom}px` }}>
            {data.kopImage ? (
              <img 
                src={data.kopImage} 
                alt="Kop Surat" 
                style={{
                  width: '100%',
                  height: `${data.kopImageHeight}px`,
                  objectFit: data.kopImageFit,
                  objectPosition: data.kopImageAlign
                }} 
              />
            ) : (
              <div className="border-[2px] border-dashed border-[#D1D1CA] bg-[#F5F5F0] p-6 text-center text-[#8A8A7A] text-[10pt] font-sans rounded-xl">
                [ Area Kop Surat - Silakan unggah file gambar melalui form Isi Data ]
              </div>
            )}
          </div>

          {/* Title Section */}
          <div className="text-center mb-1.5">
            <h2 className="font-bold underline text-[11pt] tracking-wider uppercase">Surat Tugas</h2>
            <p className="font-bold text-[8.5pt] font-mono tracking-wide mt-0.5 bg-slate-100/70 inline-block px-2 py-0.5 border border-slate-300 rounded">
              Nomor: {data.letterNumber}
            </p>
          </div>

          {/* Body */}
          <div className="space-y-0 text-justify letter-content text-[9pt] leading-[1.24]">
            <p>Yang bertanda tangan di bawah ini, mewakili Manajemen <strong>{data.kopCompanyName}</strong>:</p>
            
            <div className="pl-6 space-y-0.5 my-1.5">
              <div className="grid grid-cols-[100px_10px_1fr]">
                <div className="font-bold">Nama</div><div>:</div><div className="font-bold uppercase">{data.assignerName}</div>
              </div>
              <div className="grid grid-cols-[100px_10px_1fr]">
                <div className="font-bold">Jabatan</div><div>:</div><div className="font-bold uppercase">{data.assignerPosition}</div>
              </div>
            </div>

            <p>Dengan ini memberikan tugas penuh, wewenang, dan tanggung jawab penagihan di lapangan kepada :</p>

            <div className="my-1.5 pl-6">
              <table className="w-full text-left font-bold mb-1 text-[9pt]">
                <thead>
                  <tr>
                    <th className="pb-1 w-[50%]">Nama</th>
                    <th className="pb-1 w-[50%]">Jabatan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="uppercase">{data.assigneeName || '....................................'}</td>
                    <td>{data.assigneePosition}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {data.penagihanType === 'perorangan' ? (
              <>
                <p>
                  Untuk melakukan konfirmasi, penagihan, mediasi, dan negosiasi penyelesaian kewajiban pembayaran hutang/tagihan atas nama Debitur dari Pemberi Kuasa Perorangan: <strong>{data.clientName || '....................................'}</strong>
                  {data.krediturPeroranganNik ? ` (NIK: ${data.krediturPeroranganNik})` : ''}
                  {data.dasarPenagihan ? ` berdasarkan ${data.dasarPenagihan}` : ''} yang penagihannya dikuasakan kepada <strong>{data.kopCompanyName}</strong>.
                </p>

                <p className="mt-1.5 font-bold">Berikut rincian data debitur & besaran tagihan :</p>
                
                <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>No. Perjanjian / Bukti</div><div>:</div><div className="font-mono">{data.customerContract || '-'}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Nama Debitur</div><div>:</div><div className="uppercase font-bold">{data.customerName}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Alamat</div><div>:</div><div className="uppercase">{formatCleanAddress(data.customerAddress)}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Tanggal Jatuh Tempo</div><div>:</div><div className="font-bold">{formatDueDate(data.customerDueDate)}</div>
                  </div>
                  {data.besaranPokok && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>Hutang Pokok</div><div>:</div><div>{data.besaranPokok}</div>
                    </div>
                  )}
                  {data.besaranBungaDenda && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>Bunga / Denda / Biaya</div><div>:</div><div>{data.besaranBungaDenda}</div>
                    </div>
                  )}
                  {data.totalTagihan && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div className="font-bold">Total Kewajiban Tagihan</div>
                      <div className="font-bold">:</div>
                      <div className="font-bold text-[9.5pt]">{data.totalTagihan}</div>
                    </div>
                  )}
                  {data.terbilangTagihan && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div className="italic text-slate-600 text-[8.5pt]">Terbilang</div>
                      <div>:</div>
                      <div className="italic font-medium text-[8.5pt]"># {data.terbilangTagihan} #</div>
                    </div>
                  )}
                </div>

                {/* Kronologi Singkat / Duduk Perkara (Khusus Perorangan) */}
                {data.kronologi && data.kronologi.trim() && (
                  <div className="pl-6 mb-2 text-[9pt]">
                    <div className="border-l-2 border-[#5A5A40] pl-2.5 py-1 bg-slate-50/70 rounded-r">
                      <div className="font-bold text-[8.5pt] uppercase tracking-wide text-slate-800 mb-0.5">
                        Kronologi & Duduk Perkara :
                      </div>
                      <p className="text-[8.5pt] leading-normal text-justify whitespace-pre-line text-slate-900">
                        {data.kronologi}
                      </p>
                    </div>
                  </div>
                )}

                {/* Spesifikasi Objek / Kendaraan jika ada */}
                {(data.vehicleBrand || data.vehiclePlate) && (
                  <>
                    <p>Adapun jaminan / spesifikasi objek sebagai berikut :</p>
                    <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                      <div className="grid grid-cols-[180px_10px_1fr]">
                        <div>Merk/Type</div><div>:</div><div className="uppercase">{data.vehicleBrand}</div>
                      </div>
                      <div className="grid grid-cols-[180px_10px_1fr]">
                        <div>Nomor Polisi</div><div>:</div><div className="uppercase font-bold">{data.vehiclePlate || 'R-1234-XX'}</div>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* FORMAT LAMA PENAGIHAN LEMBAGA */
              <>
                <p>
                  Untuk melakukan konfirmasi, penagihan, dan negosiasi penyelesaian kewajiban pembayaran atas nama Debitur/Nasabah dari <strong>{data.clientName}</strong> yang penagihannya dikuasakan kepada <strong>{data.kopCompanyName}</strong>.
                </p>

                <p className="mt-1.5">Berikut data nasabah :</p>
                
                <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>No. Kontrak</div><div>:</div><div>{data.customerContract}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Nama</div><div>:</div><div className="uppercase">{data.customerName}</div>
                  </div>
                  {data.customerNik && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>NIK KTP</div><div>:</div><div className="font-mono">{data.customerNik}</div>
                    </div>
                  )}
                  {data.customerPhone && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>No. HP / Telepon</div><div>:</div><div>{data.customerPhone}</div>
                    </div>
                  )}
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Alamat</div><div>:</div><div className="uppercase">{formatCleanAddress(data.customerAddress)}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Tanggal Jatuh Tempo</div><div>:</div><div className="font-bold">{formatDueDate(data.customerDueDate)}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Angsuran</div><div>:</div><div>{data.customerInstallment}{data.customerTotalInstallment ? ` / ${data.customerTotalInstallment}` : ''}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>DENDA</div><div>:</div><div>{data.customerPenalty}</div>
                  </div>
                </div>

                <p>Adapun spesifikasi kendaraan sebagai berikut :</p>
                
                <div className="pl-6 space-y-0.5 mb-2 text-[9pt]">
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Merk/Type</div><div>:</div><div className="uppercase">{data.vehicleBrand}</div>
                  </div>
                  <div className="grid grid-cols-[180px_10px_1fr]">
                    <div>Nomor Polisi</div><div>:</div><div className="uppercase font-bold">{data.vehiclePlate || 'R-1234-XX'}</div>
                  </div>
                  {data.vehicleChassisNo && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>No. Rangka</div><div>:</div><div className="font-mono">{data.vehicleChassisNo}</div>
                    </div>
                  )}
                  {data.vehicleEngineNo && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>No. Mesin</div><div>:</div><div className="font-mono">{data.vehicleEngineNo}</div>
                    </div>
                  )}
                  {(data.vehicleYear || data.vehicleColor) && (
                    <div className="grid grid-cols-[180px_10px_1fr]">
                      <div>Tahun / Warna</div><div>:</div><div>{[data.vehicleYear, data.vehicleColor].filter(Boolean).join(' / ')}</div>
                    </div>
                  )}
                </div>
              </>
            )}

            <p>Pelaksanaan Surat Tugas ini wajib tunduk dan patuh pada ketentuan sebagai berikut:</p>

            {/* Rules Sections */}
            <div className="space-y-0 text-[9pt] leading-[1.24]">
              <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">MASA BERLAKU SURAT TUGAS</div>
              <p>
                Surat Tugas ini berlaku efektif terhitung sejak tanggal {formatDateID(data.validFrom)} sampai dengan tanggal {formatDateID(data.validTo)}. Apabila masa berlaku telah berakhir, Surat Tugas ini dinyatakan tidak berlaku lagi dan wajib diperpanjang melalui persetujuan Manajemen {data.kopCompanyName}.
              </p>

              <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">WEWENANG DAN TANGGUNG JAWAB PETUGAS</div>
              <p>Dalam menjalankan tugas penagihan di lapangan, Tim Penagihan berwenang:</p>
              <ul className="list-disc pl-6 space-y-0.5 text-[8.5pt] leading-[1.2]">
                <li className="pl-1.5">Mendatangi alamat domisili, kantor, atau lokasi tempat usaha Debitur sesuai data resmi yang tercantum dalam lembar kerja penagihan.</li>
                <li className="pl-1.5">Melakukan konfirmasi, negosiasi, dan menyampaikan Surat Peringatan (SP) atau tagihan resmi yang diterbitkan oleh Perusahaan/Kreditur/Mitra Perusahaan.</li>
                <li className="pl-1.5">Untuk keperluan diatas, PENERIMA TUGAS berhak untuk menerima jaminan piutang/jaminan fidusia, menandatangani dokumen - dokumen, meminta tanda tangan, serta melakukan tindakan yang dianggap perlu dalam melaksanakan tugas tersebut/meminta bantuan pihak berwajib jika diperlukan.</li>
              </ul>

              <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt] break-before-auto">LARANGAN DAN KEPATUHAN</div>
              <ul className="list-disc pl-6 space-y-0.5 text-[8.5pt] leading-[1.2]">
                <li className="pl-1.5">Dilarang menerima pembayaran tunai (cash) secara langsung dari Debitur dalam bentuk apa pun, kecuali menggunakan Virtual Account resmi atau tanda terima sah dari sistem perusahaan.</li>
                <li className="pl-1.5">Dilarang menggunakan ancaman, kekerasan fisik, intimidasi, penekanan secara psikologis, atau tindakan melawan hukum yang melanggar Kode Etik Penagihan Bank Indonesia (BI), Otoritas Jasa Keuangan (OJK), serta Peraturan Perundang-undangan Republik Indonesia.</li>
                <li className="pl-1.5">Petugas wajib bersikap sopan, profesional, mengenakan pakaian rapi dan sopan selama berada di lapangan.</li>
                <li className="pl-1.5">Petugas wajib melaporkan hasil penagihan (Field Report) secara real-time melalui sistem aplikasi penagihan resmi {data.kopCompanyName} pada hari yang sama.</li>
              </ul>

              <div className="text-center font-bold mt-1.5 mb-0.5 text-[9pt]">SANKSI DAN TANGGUNG JAWAB HUKUM</div>
              <ul className="list-disc pl-6 space-y-0.5 text-[8.5pt] leading-[1.2]">
                <li className="pl-1.5">Setiap pelanggaran terhadap kode etik, penyalahgunaan wewenang, penggelapan dana penagihan, atau tindakan penyimpangan yang dilakukan oleh Petugas Penagihan akan dikenakan sanksi tegas berupa Pemutusan Hubungan Kerja (PHK) secara tidak hormat.</li>
                <li className="pl-1.5">Tindakan pelanggaran hukum yang dilakukan oleh Petugas di luar prosedur resmi Perusahaan menjadi tanggung jawab pribadi petugas bersangkutan secara pidana maupun perdata ({data.kopCompanyName} membebaskan diri dari segala tuntutan hukum akibat penyimpangan oknum).</li>
              </ul>

              <p className="mt-1.5 pt-0.5">
                Demikian Surat Tugas ini diterbitkan untuk dipergunakan sebagaimana mestinya dan dilaksanakan dengan penuh rasa tanggung jawab demi menjaga integritas, profesionalisme, dan nama baik {data.kopCompanyName} serta Kreditur.
              </p>
            </div>

            {/* Signatures */}
            <div className="mt-3 flex justify-between break-inside-avoid text-[9pt]">
              <div className="w-[260px]">
                <p className="mb-8"><br/>Pemberi Tugas,<br/>{data.kopCompanyName}</p>
                <p className="font-bold underline">{data.assignerName}</p>
                <p>{data.assignerPosition}</p>
              </div>
              <div className="w-[260px]">
                <p className="mb-8">{data.signPlaceDate}<br/>Penerima Tugas,<br/>PETUGAS PENAGIHAN</p>
                <p className="font-bold underline">{data.assigneeName || '....................................'}</p>
              </div>
            </div>

          </div>
        </div>

        {/* Lampiran Images Page */}
        {(data.attachments && data.attachments.length > 0) && (
          <div 
            id="letter-page-2"
            style={{
              width: `${activePaper.widthMm}mm`,
              maxWidth: `${activePaper.widthMm}mm`,
              minHeight: `${activePaper.heightMm}mm`,
              paddingTop: '10mm',
              paddingLeft: '18mm',
              paddingRight: '18mm',
              paddingBottom: '12mm',
            }}
            className="mx-auto bg-white shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-[#E5E5E0] font-serif print:shadow-none print:border-none print:p-0 print:pt-[10mm] print:px-[18mm] print:pb-[12mm] print:m-0 print:max-w-none mt-8 print:mt-0 print:break-before-page box-border print-document-sheet print-page-last"
          >
            <h3 className="font-bold text-lg mb-6 text-center underline">Lampiran</h3>
            <div className="flex flex-col items-center gap-8">
              {data.attachments.map((att, idx) => (
                <img 
                  key={idx} 
                  src={att.url} 
                  alt={`Lampiran ${idx + 1}`} 
                  style={{ width: `${att.width || 600}px`, height: `${att.height || 270}px` }}
                  className="object-contain border-2 border-dashed border-[#D1D1CA] p-2" 
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
