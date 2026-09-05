import React, { useRef } from 'react';
import { OfficialLetterhead } from './OfficialLetterhead';
import { SK, LawyerNotice, Contract, DocumentRecord, DriveFolder } from '../../types/arms';
import { 
  Printer, 
  ExternalLink, 
  X, 
  Copy, 
  Check, 
  HardDrive, 
  FileText, 
  Scale, 
  Building2, 
  ShieldCheck, 
  QrCode, 
  Calendar, 
  UserCheck 
} from 'lucide-react';
import { ROOT_GDRIVE_URL } from '../../data/initialData';

export type PreviewDocType = 'SK' | 'LAWYER_SOMASI' | 'MOU_KONTRAK' | 'DOCUMENT';

export interface LetterPreviewData {
  type: PreviewDocType;
  sk?: SK;
  lawyerNotice?: LawyerNotice;
  contract?: Contract;
  document?: DocumentRecord;
  title?: string;
  driveUrl?: string;
  folderUrl?: string;
  folderName?: string;
}

interface LetterPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LetterPreviewData | null;
  onOpenQuickDriveModal?: (doc: LetterPreviewData) => void;
}

export const LetterPreviewModal: React.FC<LetterPreviewModalProps> = ({
  isOpen,
  onClose,
  data,
  onOpenQuickDriveModal,
}) => {
  const [copied, setCopied] = React.useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeDriveUrl = 
    data.driveUrl || 
    data.sk?.driveDocumentUrl || 
    data.lawyerNotice?.driveDocumentUrl || 
    data.contract?.driveDocumentUrl || 
    data.document?.driveViewUrl || 
    '';

  return (
    <div className="letter-preview-modal fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] my-auto print:max-h-none print:border-none print:shadow-none print:bg-white print:rounded-none">
        
        {/* Top Control Bar (Hidden on Print) */}
        <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
              {data.type === 'LAWYER_SOMASI' ? (
                <Scale className="w-5 h-5 text-amber-400" />
              ) : (
                <FileText className="w-5 h-5 text-indigo-400" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-sm sm:text-base truncate">
                {data.title || (
                  data.type === 'SK' ? `Pratinjau Surat Tugas & Kuasa (${data.sk?.skNumber})` :
                  data.type === 'LAWYER_SOMASI' ? `Pratinjau Surat Somasi Advokat (${data.lawyerNotice?.noticeNo})` :
                  data.type === 'MOU_KONTRAK' ? `Pratinjau Dokumen MoU (${data.contract?.contractNo})` :
                  'Pratinjau Dokumen Resmi'
                )}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>Format Resmi Cetak & Arsip Digital</span>
                {activeDriveUrl && (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Terhubung Google Drive
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {activeDriveUrl ? (
              <a
                href={activeDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-700/80 rounded-xl text-xs font-semibold transition group shadow-sm"
                title="Buka File di Google Drive"
              >
                <HardDrive className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">Buka di GDrive</span>
                <ExternalLink className="w-3 h-3 text-blue-400" />
              </a>
            ) : (
              onOpenQuickDriveModal && (
                <button
                  onClick={() => onOpenQuickDriveModal(data)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/60 rounded-xl text-xs font-semibold transition"
                  title="Tautkan Link Google Drive"
                >
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>+ Link GDrive</span>
                </button>
              )
            )}

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-md"
              title="Cetak Surat / Simpan ke PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cetak / PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              title="Tutup Pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Paper Container - Scrollable on modal, pristine white for print */}
        <div className="p-4 sm:p-8 overflow-y-auto bg-slate-800/60 print:p-0 print:bg-white flex justify-center">
          <div
            ref={printRef}
            className="letter-preview-paper w-full max-w-3xl bg-white text-slate-900 rounded-xl sm:rounded-2xl p-6 sm:p-10 shadow-2xl border border-slate-200 print:border-none print:shadow-none print:rounded-none print:p-6"
            style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
          >
            {/* RENDER SPECIFIC DOCUMENT TYPE */}
            {data.type === 'SK' && data.sk && (
              <SKLetterPaper sk={data.sk} />
            )}

            {data.type === 'LAWYER_SOMASI' && data.lawyerNotice && (
              <LawyerNoticePaper notice={data.lawyerNotice} />
            )}

            {data.type === 'MOU_KONTRAK' && data.contract && (
              <ContractPaper contract={data.contract} />
            )}

            {data.type === 'DOCUMENT' && data.document && (
              <GenericDocumentPaper doc={data.document} />
            )}
          </div>
        </div>

        {/* Footer Bar with Copy & Quick Drive Info (Hidden on Print) */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 print:hidden shrink-0">
          <div className="flex items-center gap-2 truncate pr-2">
            <span className="text-[11px] text-slate-500 font-mono">
              Folder: {data.folderName || 'Arsip Dokumen ARMS'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => {
                const textToCopy = printRef.current?.innerText || '';
                handleCopyText(textToCopy);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin' : 'Salin Teks'}</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   1. SURAT TUGAS & KUASA FORMAL PAPER COMPONENT
========================================================================= */
const SKLetterPaper: React.FC<{ sk: SK }> = ({ sk }) => {
  const isPerorangan = sk.clientType === 'PERORANGAN' || sk.pemberiKuasaType === 'KREDITUR_PERORANGAN';
  const principalAmountFormatted = sk.principalDebtAmount 
    ? `Rp ${sk.principalDebtAmount.toLocaleString('id-ID')}` 
    : 'Sesuai Pokok Piutang Terhutang';

  return (
    <div className="space-y-5 leading-relaxed text-sm">
      {/* Official Header Kop Surat */}
      <OfficialLetterhead className="mb-4" />

      {/* Document Title & Number */}
      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase underline">
          SURAT KUASA KHUSUS & SURAT TUGAS PENANGANAN ASET
        </h2>
        <p className="text-xs sm:text-sm font-semibold font-mono tracking-wider">
          NOMOR: {sk.skNumber}
        </p>
      </div>

      {/* Opening statement */}
      <p className="text-justify text-xs sm:text-sm pt-2">
        Pada hari ini, tanggal <span className="font-bold">{sk.issuedDate || '2026-08-18'}</span>, bertempat di kantor PT. Mitra Jasatria Indonesia, yang bertanda tangan di bawah ini:
      </p>

      {/* Pihak I (Pemberi Kuasa) */}
      <div className="pl-4 border-l-2 border-slate-400 space-y-1 text-xs sm:text-sm">
        <div className="font-bold uppercase text-slate-900">
          I. PIHAK PEMBERI KUASA (KREDITUR / PEMBERI TUGAS):
        </div>
        <div className="grid grid-cols-12 gap-1">
          <span className="col-span-4 font-semibold">Nama / Lembaga</span>
          <span className="col-span-8">: {sk.krediturName || sk.clientName || 'PT. ADI INDONESIA MULTI FINANCE'}</span>
        </div>
        {sk.krediturNik && (
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-4 font-semibold">NIK / Identitas</span>
            <span className="col-span-8 font-mono">: {sk.krediturNik}</span>
          </div>
        )}
        <div className="grid grid-cols-12 gap-1">
          <span className="col-span-4 font-semibold">Alamat Domisili</span>
          <span className="col-span-8">: {sk.krediturAddress || 'Sesuai Perjanjian Pembiayaan / Domisili Klien'}</span>
        </div>
        <div className="grid grid-cols-12 gap-1">
          <span className="col-span-4 font-semibold">Kapasitas / Jabatan</span>
          <span className="col-span-8">: {isPerorangan ? 'Kreditur Pemegang Hak Tagih Pribadi' : 'Kreditur Penerima Fidusia / Lembaga Pembiayaan'}</span>
        </div>
      </div>

      {/* Pihak II (Penerima Kuasa) */}
      <div className="pl-4 border-l-2 border-indigo-400 space-y-1 text-xs sm:text-sm">
        <div className="font-bold uppercase text-slate-900">
          II. PIHAK PENERIMA KUASA (PELAKSANA TUGAS RECOVERY):
        </div>
        <div className="grid grid-cols-12 gap-1">
          <span className="col-span-4 font-semibold">Nama Lengkap</span>
          <span className="col-span-8 font-bold">: {sk.personnelName || 'Rian Firmansyah, S.H.'}</span>
        </div>
        {sk.personnelNik && (
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-4 font-semibold">NIK KTP</span>
            <span className="col-span-8 font-mono">: {sk.personnelNik}</span>
          </div>
        )}
        <div className="grid grid-cols-12 gap-1">
          <span className="col-span-4 font-semibold">Jabatan / Posisi</span>
          <span className="col-span-8">: {sk.personnelPosition || 'Field Specialist Recovery & Remedial'}</span>
        </div>
        <div className="grid grid-cols-12 gap-1">
          <span className="col-span-4 font-semibold">Badan Pelaksana</span>
          <span className="col-span-8">: PT. MITRA JASATRIA INDONESIA (Badan Hukum No. AHU-056731.AH.01.01)</span>
        </div>
      </div>

      {/* Khusus / Objek Kasus */}
      <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 space-y-1.5 text-xs sm:text-sm">
        <div className="font-bold text-center underline uppercase">KHUSUS</div>
        <p className="text-justify">
          Untuk dan atas nama Pemberi Kuasa melakukan segala tindakan hukum, negosiasi persuasif, verifikasi lapangan, penagihan kewajiban, mediasi, serta serah terima penarikan/pengamanan unit objek jaminan fidusia terhadap debitur berikut:
        </p>
        <div className="grid grid-cols-12 gap-1 pt-1 font-sans text-xs">
          <span className="col-span-4 font-semibold text-slate-700">Nama Debitur</span>
          <span className="col-span-8 font-bold text-slate-950">: {sk.debtorName}</span>
          <span className="col-span-4 font-semibold text-slate-700">No. Perjanjian / Kasus</span>
          <span className="col-span-8 font-mono text-slate-950">: {sk.caseNo}</span>
          <span className="col-span-4 font-semibold text-slate-700">Total Pokok Piutang</span>
          <span className="col-span-8 font-bold text-slate-950">: {principalAmountFormatted}</span>
          {sk.vehicleMerk && (
            <>
              <span className="col-span-4 font-semibold text-slate-700">Objek / Kendaraan</span>
              <span className="col-span-8 text-slate-950">: {sk.vehicleMerk} ({sk.vehiclePoliceNo || 'No Polisi Tercatat'})</span>
            </>
          )}
        </div>
      </div>

      {/* Klausul Kewenangan */}
      <div className="space-y-1 text-xs text-justify">
        <div className="font-bold text-slate-950">KUASA INI DIBERIKAN DENGAN KETENTUAN DAN WEWENANG:</div>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li>Menghubungi, mendatangi alamat domisili maupun tempat kerja Debitur secara patut dan profesional sesuai standar etika profesi penagihan.</li>
          <li>Menyampaikan surat somasi, peringatan hukum, rincian kewajiban, dan melakukan negosiasi penyelesaian pembayaran / pelunasan hutang.</li>
          <li>Menerima pembayaran titipan melalui rekening resmi escrow / kwitansi sah PT. Mitra Jasatria Indonesia atau langsung ke rekening Kreditur.</li>
          <li>Melakukan serah terima dan penarikan unit jaminan secara damai dengan menandatangani Berita Acara Serah Terima (BAST).</li>
          <li><strong>Hak Substitusi:</strong> Penerima Kuasa diberikan hak penuh untuk mensubstitusikan / melimpahkan sebagian atau seluruh kuasa ini kepada personil operational lapangan resmi lainnya dari PT. Mitra Jasatria Indonesia.</li>
        </ol>
      </div>

      {/* Validity Period */}
      <p className="text-xs text-justify">
        Surat Kuasa dan Surat Tugas ini berlaku terhitung sejak tanggal <span className="font-bold">{sk.issuedDate}</span> sampai dengan tanggal <span className="font-bold">{sk.expiryDate || 'selesainya proses penyelesaian'}</span>, dan dapat diperpanjang atas persetujuan kedua belah pihak.
      </p>

      {/* Signature Section */}
      <div className="grid grid-cols-2 gap-6 pt-4 text-xs">
        <div className="text-center space-y-12">
          <div>
            <p className="font-semibold">Pemberi Kuasa,</p>
            <p className="text-[11px] text-slate-600">Kreditur / Multifinance Partner</p>
          </div>
          <div className="relative inline-block">
            <div className="w-20 h-10 border border-dashed border-slate-400 mx-auto rounded flex items-center justify-center text-[9px] text-slate-400">
              MATERAI Rp 10.000
            </div>
            <p className="font-bold underline uppercase pt-2">
              ( {sk.krediturName || sk.clientName || 'PEMBERI KUASA'} )
            </p>
          </div>
        </div>

        <div className="text-center space-y-12">
          <div>
            <p className="font-semibold">Penerima Kuasa,</p>
            <p className="text-[11px] text-slate-600">PT. MITRA JASATRIA INDONESIA</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-2 mb-1">
              <QrCode className="w-8 h-8 text-slate-700 opacity-60" />
            </div>
            <p className="font-bold underline uppercase">
              ( {sk.personnelName || 'RIAN FIRMANSYAH, S.H.'} )
            </p>
            <p className="text-[10px] text-slate-600 font-mono">Reg. AHU-056731.AH.01.01</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   2. SURAT SOMASI ADVOKAT PAPER COMPONENT
========================================================================= */
const LawyerNoticePaper: React.FC<{ notice: LawyerNotice }> = ({ notice }) => {
  const principalAmountFormatted = notice.principalDebtAmount 
    ? `Rp ${notice.principalDebtAmount.toLocaleString('id-ID')}` 
    : 'Sesuai Rincian Kewajiban';

  return (
    <div className="space-y-5 leading-relaxed text-sm">
      {/* Law Firm Letterhead Header */}
      <div className="border-b-2 border-slate-900 pb-3 text-center space-y-0.5">
        <h1 className="text-base sm:text-xl font-black uppercase tracking-wider text-slate-950 font-serif">
          {notice.lawyerFirmName || 'KANTOR ADVOKAT & KONSULTAN HUKUM WIJAYA & REKAN'}
        </h1>
        <p className="text-xs sm:text-sm font-semibold text-red-700 uppercase tracking-widest font-serif">
          ADVOCATES & LEGAL CONSULTANTS (MITRA HUKUM PT. MITRA JASATRIA INDONESIA)
        </p>
        <p className="text-[11px] text-slate-600 font-sans">
          Jl. Jend. Gatot Subroto No. 45, Jakarta Selatan | Telp: (021) 5290-7788 | Email: legal.notice@wijayalawfirm.co.id
        </p>
        <div className="border-b border-black pt-1" />
      </div>

      {/* Meta Info: Nomor & Lampiran */}
      <div className="flex justify-between items-start text-xs pt-1">
        <div className="space-y-1">
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-3 font-semibold">Nomor</span>
            <span className="col-span-9 font-bold font-mono">: {notice.noticeNo}</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-3 font-semibold">Lampiran</span>
            <span className="col-span-9">: 1 (Satu) Berkas Salinan Kontrak & Kuasa</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-3 font-semibold">Perihal</span>
            <span className="col-span-9 font-bold text-red-900 uppercase">
              : {notice.noticeType.replace('_', ' ')} - TEGURAN HUKUM ATAS KEWAJIBAN PEMBAYARAN & PENYERAHAN JAMINAN
            </span>
          </div>
        </div>
        <div className="text-right text-xs">
          <p>Jakarta, {notice.issuedDate || '2026-08-18'}</p>
        </div>
      </div>

      {/* Target Debitur */}
      <div className="text-xs sm:text-sm space-y-0.5 pt-1">
        <p className="font-semibold">Kepada Yang Terhormat:</p>
        <p className="font-bold text-base">{notice.debtorName}</p>
        <p className="text-slate-700">Di Tempat / Alamat Domisili Terdaftar</p>
      </div>

      {/* Salutation & Body Content */}
      <div className="space-y-3 text-xs sm:text-sm text-justify">
        <p>Dengan hormat,</p>
        <p>
          Bertindak untuk dan atas nama Klien kami (Kreditur Pemegang Hak Tagih & Penerima Jaminan Fidusia), bersama ini kami Kantor Advokat & Konsultan Hukum menyampaikan <strong>SURAT TEGURAN HUKUM (SOMASI)</strong> sehubungan dengan kewajiban pembayaran yang telah jatuh tempo atas fasilitas pembiayaan dengan rincian perkara:
        </p>

        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs font-sans space-y-1">
          <div className="grid grid-cols-12 gap-1">
            <span className="col-span-4 font-semibold text-slate-700">Nomor Registrasi Kasus</span>
            <span className="col-span-8 font-mono font-bold">: {notice.caseNo}</span>
            <span className="col-span-4 font-semibold text-slate-700">Nama Debitur</span>
            <span className="col-span-8 font-bold">: {notice.debtorName}</span>
            <span className="col-span-4 font-semibold text-slate-700">Total Tunggakan Pokok</span>
            <span className="col-span-8 font-bold text-red-700">: {principalAmountFormatted}</span>
            <span className="col-span-4 font-semibold text-slate-700">Status Kewajiban</span>
            <span className="col-span-8 text-red-600 font-semibold">: MENUNGGAK / WANPRESTASI</span>
          </div>
        </div>

        {/* Custom Letter Draft / Standard Clauses */}
        {notice.letterContentDraft ? (
          <div className="whitespace-pre-line text-xs leading-relaxed bg-slate-50/50 p-3 rounded border border-slate-200 font-serif">
            {notice.letterContentDraft}
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <p>
              Bahwa sampai dengan diterbitkannya Somasi ini, Saudara belum memenuhi itikad baik untuk melunasi kewajiban tersebut di atas, yang mana tindakan tersebut telah memenuhi unsur <strong>Wanprestasi (Ingkar Janji)</strong> sebagaimana diatur dalam Pasal 1243 Kitab Undang-Undang Hukum Perdata (KUHPerdata).
            </p>
            <p>
              Bahwa apabila objek jaminan yang bersangkutan dialihkan, digadaikan, disewakan, atau dipindahtangankan tanpa persetujuan tertulis dari Kreditur, hal tersebut merupakan perbuatan melawan hukum yang melanggar <strong>Pasal 36 UU No. 42 Tahun 1999 tentang Jaminan Fidusia</strong> serta berpotensi memenuhi unsur tindak pidana Penggelapan (<strong>Pasal 372 KUHP</strong>) dan/atau Penipuan (<strong>Pasal 378 KUHP</strong>) dengan ancaman pidana penjara.
            </p>
          </div>
        )}

        {/* Ultimatum */}
        <div className="p-2.5 bg-red-50 border-l-4 border-red-700 text-xs text-red-950 space-y-1">
          <p className="font-bold uppercase">BATAS WAKTU PENYELESAIAN (ULTIMATUM):</p>
          <p>
            Oleh karena itu, kami memberikan tenggang waktu <span className="font-bold">3 x 24 Jam</span> sejak diterimanya surat ini bagi Saudara untuk segera menyelesaikan pelunasan kewajiban atau menyerahkan unit jaminan secara sukarela kepada Tim Recovery PT. Mitra Jasatria Indonesia.
          </p>
        </div>

        <p className="text-xs">
          Apabila dalam batas waktu tersebut Saudara tidak mengindahkan somasi ini, maka kami akan mengambil langkah hukum tegas baik secara <strong>Hukum Pidana</strong> (Laporan Kepolisian) maupun <strong>Hukum Perdata</strong> (Gugatan Sederhana / Eksekusi Sertifikat Jaminan Fidusia).
        </p>
      </div>

      {/* Signatures */}
      <div className="pt-4 flex justify-between items-end text-xs">
        <div className="space-y-1 text-[11px] text-slate-500 font-sans">
          <p className="font-semibold text-slate-700">Tembusan Yth:</p>
          <p>1. Direksi Kreditur / Lembaga Pembiayaan</p>
          <p>2. Direktur Operasional PT. Mitra Jasatria Indonesia</p>
          <p>3. Arsip Litigasi Advokat</p>
        </div>

        <div className="text-center space-y-12 w-64">
          <div>
            <p className="font-semibold">Hormat Kami,</p>
            <p className="text-[11px] text-slate-600">Kuasa Hukum & Advokat</p>
          </div>
          <div>
            <div className="w-16 h-16 border-2 border-red-800 rounded-full mx-auto flex items-center justify-center text-[9px] font-bold text-red-800 rotate-[-12deg] mb-1 opacity-75">
              LEGAL STAMP
            </div>
            <p className="font-bold underline uppercase">
              {notice.lawyerName || 'Dr. Hendra Wijaya, S.H., M.H.'}
            </p>
            <p className="text-[10px] text-slate-600 font-mono">Advokat & Konsultan Hukum</p>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   3. MOU & KONTRAK KERJASAMA PAPER COMPONENT
========================================================================= */
const ContractPaper: React.FC<{ contract: Contract }> = ({ contract }) => {
  return (
    <div className="space-y-5 leading-relaxed text-sm">
      <OfficialLetterhead className="mb-4" />

      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase underline">
          MEMORANDUM OF UNDERSTANDING (MoU) & PERJANJIAN KERJASAMA
        </h2>
        <p className="text-xs sm:text-sm font-semibold font-mono tracking-wider">
          NOMOR: {contract.contractNo}
        </p>
        <p className="text-xs font-semibold text-slate-700">
          TENTANG: {contract.title}
        </p>
      </div>

      <p className="text-justify text-xs sm:text-sm pt-2">
        Pada hari ini disepakati Perjanjian Kerjasama Jasa Penanganan, Penagihan, dan Pemulihan Aset Kredit Bermasalah (Asset Recovery Services) antara:
      </p>

      <div className="pl-4 border-l-2 border-slate-400 space-y-1 text-xs sm:text-sm">
        <div className="font-bold uppercase text-slate-900">
          1. {contract.clientName} (Selanjutnya disebut sebagai "PIHAK PERTAMA")
        </div>
        <p className="text-slate-600">Lembaga Pembiayaan / Kreditur Pemberi Kuasa Portofolio Tagihan.</p>
      </div>

      <div className="pl-4 border-l-2 border-indigo-400 space-y-1 text-xs sm:text-sm">
        <div className="font-bold uppercase text-slate-900">
          2. PT. MITRA JASATRIA INDONESIA (Selanjutnya disebut sebagai "PIHAK KEDUA")
        </div>
        <p className="text-slate-600">Badan Usaha Jasa Penagihan & Recovery Legal (AHU-056731.AH.01.01).</p>
      </div>

      <div className="space-y-3 text-xs text-justify pt-2">
        <div>
          <h4 className="font-bold text-slate-950 uppercase">PASAL 1: RUANG LINGKUP PEKERJAAN</h4>
          <p>PIHAK PERTAMA menunjuk PIHAK KEDUA untuk melaksanakan penanganan portofolio tagihan, mediasi, somasi advokat, hingga eksekusi sukarela jaminan fidusia di lapangan.</p>
        </div>

        <div>
          <h4 className="font-bold text-slate-950 uppercase">PASAL 2: STRUKTUR IMBAL JASA (FEE)</h4>
          <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg font-mono text-xs text-indigo-950 font-semibold">
            {contract.feeStructureSummary || '25% Success Fee dari total dana tertagih / penyelesaian aset jaminan.'}
          </div>
        </div>

        <div>
          <h4 className="font-bold text-slate-950 uppercase">PASAL 3: JANGKA WAKTU & STATUS</h4>
          <p>Perjanjian ini berlaku efektif mulai tanggal <span className="font-bold">{contract.startDate}</span> sampai dengan <span className="font-bold">{contract.endDate || 'penyelesaian portfolio'}</span> dengan status resmi <span className="font-semibold uppercase text-emerald-800">{contract.status}</span>.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 pt-6 text-xs text-center">
        <div className="space-y-12">
          <p className="font-semibold">PIHAK PERTAMA,</p>
          <p className="font-bold underline uppercase">( {contract.clientName} )</p>
        </div>
        <div className="space-y-12">
          <p className="font-semibold">PIHAK KEDUA,</p>
          <p className="font-bold underline uppercase">( PT. MITRA JASATRIA INDONESIA )</p>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. GENERIC DOCUMENT RECORD COMPONENT
========================================================================= */
const GenericDocumentPaper: React.FC<{ doc: DocumentRecord }> = ({ doc }) => {
  return (
    <div className="space-y-5 leading-relaxed text-sm">
      <OfficialLetterhead className="mb-4" />

      <div className="text-center space-y-1">
        <h2 className="text-base sm:text-lg font-bold tracking-wide uppercase underline">
          LEMBAR ARSIP BERKAS DOKUMEN DIGITAL
        </h2>
        <p className="text-xs sm:text-sm font-semibold font-mono tracking-wider">
          KODE DOKUMEN: {doc.docNo}
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 space-y-2 text-xs font-sans">
        <div className="grid grid-cols-12 gap-1.5">
          <span className="col-span-4 font-semibold text-slate-600">Judul Berkas</span>
          <span className="col-span-8 font-bold text-slate-950">{doc.title}</span>

          <span className="col-span-4 font-semibold text-slate-600">Kategori Berkas</span>
          <span className="col-span-8 font-semibold text-indigo-700">{doc.category}</span>

          {doc.caseNo && (
            <>
              <span className="col-span-4 font-semibold text-slate-600">No. Kasus / Debitur</span>
              <span className="col-span-8 font-mono text-slate-900">{doc.caseNo}</span>
            </>
          )}

          <span className="col-span-4 font-semibold text-slate-600">Waktu Pengunggahan</span>
          <span className="col-span-8 text-slate-700">{doc.uploadedAt} oleh {doc.uploadedBy}</span>
        </div>
      </div>

      {doc.driveViewUrl && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-xs space-y-2">
          <div className="font-bold text-blue-900 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Tautan Berkas Google Drive Asli:</span>
          </div>
          <p className="font-mono text-blue-800 truncate">{doc.driveViewUrl}</p>
          <a
            href={doc.driveViewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Buka Berkas Penuh di Tab Baru</span>
          </a>
        </div>
      )}
    </div>
  );
};
