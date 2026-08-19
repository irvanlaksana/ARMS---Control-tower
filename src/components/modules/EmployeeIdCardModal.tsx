import React, { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Personnel, AppSettings } from '../../types/arms';
import { DEFAULT_MJ_LOGO } from '../../assets/mjLogo';
import {
  Download,
  Printer,
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  Building,
  Phone,
  Mail,
  MapPin,
  Camera,
  CheckCircle,
  Sparkles,
  Layers,
  FileCheck
} from 'lucide-react';

interface EmployeeIdCardModalProps {
  personnel: Personnel;
  settings?: AppSettings;
  onClose: () => void;
  onUpdatePersonnelPhoto?: (personnelId: string, newPhotoUrl: string) => void;
}

export const EmployeeIdCardModal: React.FC<EmployeeIdCardModalProps> = ({
  personnel,
  settings,
  onClose,
  onUpdatePersonnelPhoto,
}) => {
  const [viewMode, setViewMode] = useState<'FRONT' | 'BACK' | 'BOTH'>('BOTH');
  const [isDownloading, setIsDownloading] = useState(false);
  const [customPhoto, setCustomPhoto] = useState<string>(personnel.ktpPhotoUrl || '');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const bothCardsRef = useRef<HTMLDivElement>(null);

  const companyName = settings?.companyName || 'PT. MITRA JASA TAMA';
  const companyLogo = settings?.companyLogo || DEFAULT_MJ_LOGO;
  const companyAddress = settings?.companyAddress || 'Jl. Galuh Mas Raya Blok A No. 88, Telukjambe Timur, Karawang, Jawa Barat 41361';
  const companyPhone = settings?.companyPhone || '+62 267 845 9988 / 0812-9988-7766';
  const companyEmail = settings?.companyEmail || 'operations@mitrajasa.co.id';

  const isKaryawan = personnel.type === 'KARYAWAN';
  const cardTypeTitle = isKaryawan ? 'OFFICIAL EMPLOYEE ID PASS' : 'FIELD EXECUTOR BADGE';
  const cardTypeSubtitle = isKaryawan ? 'KARYAWAN INTERNAL OPERASIONAL' : 'MITRA DC & ASSET RECOVERY';
  const formattedId = personnel.id.startsWith('EMP') || personnel.id.startsWith('MITRA') 
    ? personnel.id 
    : `${isKaryawan ? 'MJT-KRY' : 'MJT-DC'}-${personnel.id.replace(/[^0-9]/g, '').slice(-4) || '2026'}`;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          setCustomPhoto(result);
          if (onUpdatePersonnelPhoto) {
            onUpdatePersonnelPhoto(personnel.id, result);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async (target: 'FRONT' | 'BACK' | 'BOTH') => {
    setIsDownloading(true);
    try {
      let elementToCapture: HTMLElement | null = null;
      let filename = `ID_CARD_${personnel.fullName.replace(/\s+/g, '_')}_${target}.png`;

      if (target === 'FRONT' && frontCardRef.current) {
        elementToCapture = frontCardRef.current;
      } else if (target === 'BACK' && backCardRef.current) {
        elementToCapture = backCardRef.current;
      } else if (bothCardsRef.current) {
        elementToCapture = bothCardsRef.current;
        filename = `ID_CARD_${personnel.fullName.replace(/\s+/g, '_')}_LENGKAP_DEPAN_BELAKANG.png`;
      }

      if (!elementToCapture) {
        throw new Error('Element tidak ditemukan untuk di-render');
      }

      const canvas = await html2canvas(elementToCapture, {
        scale: 3, // High DPI for crystal clear print quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#09090b',
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error generating ID card image:', err);
      alert(`Gagal mendownload ID Card: ${err.message || String(err)}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 space-y-6 shadow-2xl relative my-auto">
        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-red-600 to-red-950 rounded-xl border border-red-500/40 text-white shadow-lg">
              <CreditCard className="w-6 h-6 text-red-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-white text-lg tracking-wide">
                  ID Card Generator Resmi — {personnel.fullName}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-950 text-red-300 border border-red-700">
                  RED & BLACK EDITION
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Kartu Tanda Pengenal Resmi ARMS dengan format standar ID Badge CR80, Logo & Kop Perusahaan.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition self-end sm:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & View Mode Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('BOTH')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'BOTH'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Dua Sisi (Depan & Belakang)</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('FRONT')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'FRONT'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tampak Depan</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('BACK')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                viewMode === 'BACK'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>Tampak Belakang</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Custom Photo Upload Button */}
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer">
              <Camera className="w-3.5 h-3.5 text-amber-400" />
              <span>Ganti Foto Pas</span>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-blue-400" />
              <span>Cetak / Print</span>
            </button>

            {/* Download High-Res PNG Button */}
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload(viewMode)}
              className="flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-red-950/50 border border-red-500/30 transition transform active:scale-95 cursor-pointer"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
              <span>{isDownloading ? 'Sedang Merender PNG...' : 'Download ID Card (PNG HD)'}</span>
            </button>
          </div>
        </div>

        {downloadSuccess && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-2 shadow-lg animate-fade-in">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span>ID Card berhasil diunduh dalam format PNG High-Definition (Siap Cetak)!</span>
          </div>
        )}

        {/* Cards Preview Display Area */}
        <div className="flex items-center justify-center p-4 bg-slate-950/90 rounded-2xl border border-slate-800/80 overflow-x-auto min-h-[500px]">
          <div
            ref={bothCardsRef}
            className="flex flex-wrap items-center justify-center gap-8 p-6 bg-slate-950 rounded-xl"
          >
            {/* FRONT SIDE CARD (Tampak Depan) */}
            {(viewMode === 'FRONT' || viewMode === 'BOTH') && (
              <div
                ref={frontCardRef}
                className="w-[320px] h-[500px] bg-[#09090b] rounded-[22px] border-2 border-red-700/80 shadow-[0_0_25px_rgba(220,38,38,0.25)] relative overflow-hidden flex flex-col justify-between select-none text-white font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 10%, #1f0404 0%, #09090b 70%)`,
                }}
              >
                {/* Lanyard Hole Cutout Graphic */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 border border-red-900/60 rounded-full z-30 shadow-inner flex items-center justify-center">
                  <div className="w-8 h-1 bg-black rounded-full" />
                </div>

                {/* Top Geometric Crimson Banner & Letterhead */}
                <div className="relative pt-6 px-4 pb-3 bg-gradient-to-b from-red-800 via-red-900 to-red-950 border-b border-red-600/40">
                  {/* Decorative Diagonal Stripes */}
                  <div className="absolute top-0 right-0 w-24 h-full opacity-10 bg-[repeating-linear-gradient(45deg,#fff,#fff_5px,transparent_5px,transparent_10px)] pointer-events-none" />

                  {/* Company Logo & Name */}
                  <div className="flex items-center gap-2.5 relative z-10">
                    <div className="w-10 h-10 rounded-lg bg-black/70 p-1 border border-red-400/50 shadow-md shrink-0 flex items-center justify-center">
                      <img
                        src={companyLogo}
                        alt="Logo"
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="overflow-hidden">
                      <div className="font-black text-sm text-white tracking-wider uppercase leading-none truncate">
                        {companyName}
                      </div>
                      <div className="text-[9px] font-bold text-red-200 tracking-widest uppercase mt-0.5">
                        ARMS CONTROL TOWER
                      </div>
                      <div className="text-[7.5px] text-red-300/80 font-mono tracking-tight uppercase truncate">
                        LEGAL & DEBT RECOVERY AGENCY
                      </div>
                    </div>
                  </div>

                  {/* Card Type Tag */}
                  <div className="mt-2 flex items-center justify-between border-t border-red-700/60 pt-1.5">
                    <span className="text-[8.5px] font-black text-amber-300 tracking-wider uppercase">
                      {cardTypeTitle}
                    </span>
                    <span className="text-[8px] font-mono text-red-200 bg-black/50 px-1.5 py-0.5 rounded border border-red-600/40">
                      SECURE ID
                    </span>
                  </div>
                </div>

                {/* Middle Body: Photo & Identity */}
                <div className="px-5 py-3 flex flex-col items-center text-center relative z-10 flex-1 justify-center space-y-2.5">
                  {/* Portrait Photo Frame with Red & Metallic Accents */}
                  <div className="relative">
                    {/* Outer Glow Ring */}
                    <div className="w-28 h-36 rounded-xl p-[3px] bg-gradient-to-b from-red-500 via-red-700 to-black shadow-[0_0_15px_rgba(220,38,38,0.4)] relative">
                      <div className="w-full h-full rounded-[10px] overflow-hidden bg-slate-950 border border-red-950 flex items-center justify-center">
                        {customPhoto ? (
                          <img
                            src={customPhoto}
                            alt={personnel.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-center text-slate-500 p-2">
                            <Camera className="w-8 h-8 text-red-400 mb-1" />
                            <span className="text-[8px] text-slate-400 font-semibold">PAS FOTO</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hologram Badge Icon */}
                    <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-yellow-600 p-[1.5px] shadow-lg flex items-center justify-center">
                      <div className="w-full h-full rounded-full bg-black/90 flex items-center justify-center text-amber-300">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Name & Title */}
                  <div className="space-y-0.5 w-full">
                    <h4 className="text-base font-black text-white tracking-wide uppercase leading-tight">
                      {personnel.fullName}
                    </h4>
                    <div className="text-[11px] font-bold text-red-400 tracking-wide uppercase">
                      {personnel.position || (isKaryawan ? 'STAFF OPERASIONAL' : 'FIELD COLLECTOR')}
                    </div>
                    <div className="text-[8.5px] font-mono text-slate-400 tracking-wider uppercase">
                      {cardTypeSubtitle}
                    </div>
                  </div>

                  {/* ID & NIK Key-Value Grid */}
                  <div className="w-full bg-black/70 border border-red-900/60 rounded-lg p-2 grid grid-cols-2 gap-1 text-left text-[9px] shadow-inner font-mono">
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">ID KARYAWAN:</span>
                      <span className="text-red-300 font-extrabold text-[10px]">{formattedId}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">STATUS PAS:</span>
                      <span className="text-emerald-400 font-bold text-[9px]">● {personnel.status || 'ACTIVE'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">NO. NIK KTP:</span>
                      <span className="text-slate-200 font-medium truncate block">{personnel.nikKtp || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[8px] block uppercase">BERLAKU S/D:</span>
                      <span className="text-amber-300 font-semibold">DES 2028</span>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Barcode & Security Strip */}
                <div className="px-4 py-2 bg-gradient-to-t from-red-950 via-black to-black border-t border-red-800/50 flex items-center justify-between relative z-10">
                  {/* Mock Barcode Graphic */}
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-[2px] h-6 bg-white p-1 rounded">
                      {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2, 3, 1, 4, 2, 1].map((w, i) => (
                        <div
                          key={i}
                          className="h-full bg-black"
                          style={{ width: `${w}px` }}
                        />
                      ))}
                    </div>
                    <span className="text-[7px] font-mono text-slate-400 tracking-widest mt-0.5">
                      {personnel.nikKtp ? personnel.nikKtp.slice(-10) : 'ARMS-SEC-9988'}
                    </span>
                  </div>

                  {/* Micro QR Code */}
                  <div className="w-8 h-8 bg-white p-0.5 rounded border border-red-500/40 shadow shrink-0 flex items-center justify-center">
                    <QrCode className="w-full h-full text-black" />
                  </div>
                </div>
              </div>
            )}

            {/* BACK SIDE CARD (Tampak Belakang) */}
            {(viewMode === 'BACK' || viewMode === 'BOTH') && (
              <div
                ref={backCardRef}
                className="w-[320px] h-[500px] bg-[#09090b] rounded-[22px] border-2 border-red-700/80 shadow-[0_0_25px_rgba(220,38,38,0.25)] relative overflow-hidden flex flex-col justify-between select-none text-white font-sans"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 90%, #1f0404 0%, #09090b 70%)`,
                }}
              >
                {/* Lanyard Hole Cutout Graphic */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-2.5 bg-slate-900 border border-red-900/60 rounded-full z-30 shadow-inner flex items-center justify-center">
                  <div className="w-8 h-1 bg-black rounded-full" />
                </div>

                {/* Magnetic Stripe Graphic */}
                <div className="pt-6">
                  <div className="w-full h-9 bg-black border-y border-red-900/60 shadow-inner flex items-center px-4">
                    <div className="w-full h-1.5 bg-gradient-to-r from-red-950 via-red-800 to-black opacity-70" />
                  </div>
                </div>

                {/* Terms of Use & Security Policies */}
                <div className="px-5 py-2 space-y-2.5 flex-1 flex flex-col justify-center">
                  <div className="border-b border-red-800/40 pb-1 flex items-center justify-between">
                    <span className="text-[9px] font-black text-red-400 tracking-wider uppercase">
                      KETENTUAN PEMEGANG KARTU (TERMS OF USE)
                    </span>
                    <span className="text-[7.5px] font-mono text-slate-400">ARMS-SEC-V8</span>
                  </div>

                  <ol className="text-[7.5px] text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>
                      Kartu ini adalah tanda pengenal resmi <span className="text-white font-bold">{companyName}</span> dan wajib dikalungkan selama bertugas.
                    </li>
                    <li>
                      Dilarang memindahtangankan, menduplikasi, atau menyalahgunakan kartu ini kepada pihak ketiga yang tidak berwenang.
                    </li>
                    <li>
                      Segala tindakan hukum dan penagihan lapangan tunduk pada SOP Resmi, Surat Kuasa (SK), dan Kode Etik ARMS.
                    </li>
                    <li>
                      Apabila kartu ini hilang atau ditemukan pihak lain, mohon segera mengembalikan ke alamat kantor pusat tertera di bawah.
                    </li>
                  </ol>

                  {/* Company Address & Contacts */}
                  <div className="bg-black/70 border border-red-900/60 rounded-lg p-2.5 space-y-1.5 text-[7.5px] text-slate-300">
                    <div className="font-bold text-white text-[8.5px] flex items-center gap-1 border-b border-red-950 pb-1">
                      <Building className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="truncate">{companyName} - HEAD OFFICE</span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MapPin className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                      <span className="leading-tight text-slate-400">{companyAddress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="font-mono text-red-300">{companyPhone}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-red-400 shrink-0" />
                      <span className="text-slate-400">{companyEmail}</span>
                    </div>
                  </div>

                  {/* Official Signature & Verification Stamp Area */}
                  <div className="pt-1 flex items-end justify-between px-2">
                    <div className="text-left space-y-0.5">
                      <div className="text-[7px] text-slate-400 uppercase font-mono">Diterbitkan di:</div>
                      <div className="text-[8px] font-bold text-slate-200">Karawang, Jawa Barat</div>
                      <div className="text-[7px] text-slate-400 font-mono">ARMS Security Authority</div>
                    </div>

                    {/* Official Stamp & Director Signature */}
                    <div className="text-center relative">
                      {/* Stamp Graphic */}
                      <div className="absolute -top-3 -right-2 w-14 h-14 rounded-full border border-red-600/70 border-dashed opacity-60 flex items-center justify-center pointer-events-none rotate-[-15deg]">
                        <div className="text-[6px] font-black text-red-500 uppercase tracking-tighter text-center">
                          PT. MJT<br />VERIFIED<br />STAMP
                        </div>
                      </div>
                      {/* Signature line */}
                      <div className="w-24 h-6 border-b border-slate-600 flex items-end justify-center pb-0.5">
                        <span className="font-serif italic text-[11px] text-red-300 opacity-90">Irvan I.</span>
                      </div>
                      <div className="text-[7.5px] font-bold text-white uppercase mt-0.5">DIREKTUR UTAMA</div>
                    </div>
                  </div>
                </div>

                {/* Bottom Holographic Brand Band */}
                <div className="px-4 py-2 bg-gradient-to-r from-red-950 via-black to-red-950 border-t border-red-800/50 flex items-center justify-between text-[7px] text-slate-400 font-mono">
                  <span>AGENCY RECOVERY MANAGEMENT SYSTEM</span>
                  <span className="text-red-400 font-bold">PROPERTY OF PT MJT</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="text-slate-400 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Format kartu kompatibel dengan mesin cetak ID Card CR80 standard lanyard (85.6mm x 53.98mm).</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Tutup
            </button>
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => handleDownload('BOTH')}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Lembar Cetak Lengkap</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
