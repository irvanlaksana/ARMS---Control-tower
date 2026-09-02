import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, LawyerNotice } from '../../types/arms';
import { SearchableSelect } from '../common/SearchableSelect';
import { 
  Scale, Plus, FileText, CheckCircle2, Send, ShieldAlert, 
  Copy, Check, Building2, UserCheck, Search, Edit2, Trash2, 
  HardDrive, ExternalLink, Link2, X, AlertCircle, FolderOpen, Eye, Lock
} from 'lucide-react';
import { GoogleDriveFolderPicker } from '../common/GoogleDriveFolderPicker';
import { QuickGDriveModal } from '../common/QuickGDriveModal';
import { LetterPreviewModal, LetterPreviewData } from '../common/LetterPreviewModal';
import { ROOT_GDRIVE_URL } from '../../data/initialData';

interface LawyerModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const LawyerModule: React.FC<LawyerModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewNotice, setViewNotice] = useState<LawyerNotice | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [clientFilter, setClientFilter] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Preview modal state
  const [previewData, setPreviewData] = useState<LetterPreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Quick GDrive Modal for Somasi
  const [quickDriveModal, setQuickDriveModal] = useState<{
    isOpen: boolean;
    noticeId: string;
    noticeNo: string;
    debtorName: string;
    url: string;
    folderId?: string;
  }>({
    isOpen: false,
    noticeId: '',
    noticeNo: '',
    debtorName: '',
    url: '',
    folderId: '',
  });

  // Active cases
  const activeCases = store.cases.filter(
    (c) => !['CLOSED', 'SETTLED', 'FULL_PAID', 'CANCELLED'].includes(c.status)
  );
  const multifinanceCases = activeCases.filter((c) => c.clientType === 'MULTIFINANCE' || !c.clientType);
  const peroranganCases = activeCases.filter((c) => c.clientType === 'PERORANGAN');

  // Form State
  const [selectedCaseId, setSelectedCaseId] = useState(activeCases[0]?.id || '');
  const [noticeType, setNoticeType] = useState<LawyerNotice['noticeType']>('SOMASI_1');
  const [lawyerFirmName, setLawyerFirmName] = useState('KANTOR ADVOKAT & KONSULTAN HUKUM WIJAYA & REKAN (Mitra Hukum)');
  const [lawyerName, setLawyerName] = useState('Dr. Hendra Wijaya, S.H., M.H. & Tim Advokat');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const [notes, setNotes] = useState('Debitur menunggak pembayaran dan belum memberikan respon kooperatif.');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const selectedCase = store.cases.find((c) => c.id === selectedCaseId);
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';

  const handleOpenModal = (notice?: LawyerNotice) => {
    if (notice) {
      setIsEditing(true);
      setEditId(notice.id);
      setSelectedCaseId(notice.caseId);
      setNoticeType(notice.noticeType);
      setLawyerFirmName(notice.lawyerFirmName || 'KANTOR ADVOKAT & KONSULTAN HUKUM WIJAYA & REKAN (Mitra Hukum)');
      setLawyerName(notice.lawyerName || 'Dr. Hendra Wijaya, S.H., M.H. & Tim Advokat');
      setDriveDocumentUrl(notice.driveDocumentUrl || '');
      setDriveFolderId(notice.driveFolderId || '');
      setDriveFolderUrl(notice.driveFolderUrl || '');
      setNotes(notice.notes || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      if (activeCases.length > 0) setSelectedCaseId(activeCases[0].id);
      setNoticeType('SOMASI_1');
      setLawyerFirmName('KANTOR ADVOKAT & KONSULTAN HUKUM WIJAYA & REKAN (Mitra Hukum)');
      setLawyerName('Dr. Hendra Wijaya, S.H., M.H. & Tim Advokat');
      setDriveDocumentUrl('');
      setDriveFolderId('');
      setDriveFolderUrl('');
      setNotes('Debitur menunggak pembayaran dan belum memberikan respon kooperatif.');
    }
    setShowAddModal(true);
  };

  const handleDeleteNotice = (id: string, noticeNo: string) => {
    if (!window.confirm(`Yakin ingin menghapus dokumen somasi "${noticeNo}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Lawyer_Notices',
      id,
      `Deleted Notice ${noticeNo}`
    );

    onUpdateStore({
      ...store,
      lawyerNotices: (store.lawyerNotices || []).filter(n => n.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  // Tailored Legal Draft Generator
  const generateLetterDraft = (
    debtorName: string,
    debtorAddr: string,
    clientName: string,
    contractNo: string,
    amount: number,
    type: LawyerNotice['noticeType'],
    firm: string,
    lawyer: string,
    isPer: boolean
  ): string => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formattedAmount = `Rp ${amount.toLocaleString('id-ID')}`;

    let typeTitle = 'SURAT SOMASI I (PERINGATAN HUKUM PERTAMA)';
    if (type === 'SURAT_KLARIFIKASI') typeTitle = 'SURAT KLARIFIKASI & KONFIRMASI KEWAJIBAN PIUTANG';
    if (type === 'SOMASI_2') typeTitle = 'SURAT SOMASI II (PERINGATAN HUKUM KEDUA)';
    if (type === 'SOMASI_TERAKHIR') typeTitle = 'SURAT SOMASI TERAKHIR & PERINGATAN FINAL PROSES HUKUM';
    if (type === 'UNDANGAN_MEDIASI_HUKUM') typeTitle = 'UNDANGAN MEDIASI & MUSYAWARAH HUKUM FORMAL';
    if (type === 'GUGATAN_SEDERHANA') typeTitle = 'DRAFT PENDAFTARAN GUGATAN SEDERHANA (PERDATA)';

    if (isPer) {
      // PERORANGAN LEGAL LETTER
      return `${typeTitle}
Nomor: ${type}/LEGAL-PERORANGAN/${new Date().getFullYear()}/${(store.lawyerNotices?.length || 0) + 1}
Tanggal: ${todayStr}

Kepada Yth.
Bpk/Ibu ${debtorName}
Alamat: ${debtorAddr || 'Alamat Domisili Sesuai Dokumen Kesepakatan'}

Perihal: ${typeTitle} — Atas Surat Pengakuan Hutang (SPH) / Dokumen Perjanjian No. ${contractNo}

Dengan hormat,

Kami yang bertanda tangan di bawah ini, para Advokat dan Konsultan Hukum pada ${firm || 'KANTOR ADVOKAT & KONSULTAN HUKUM MITRA'}, bertindak untuk dan atas nama Klien kami:
Bpk/Ibu ${clientName} (selaku Kreditur / Pemilik Piutang Sah).

Berdasarkan data dan dokumen yang kami terima, Saudara/i memiliki kewajiban pembayaran yang telah jatuh tempo dengan rincian:
1. Dasar Kesepakatan : Surat Pengakuan Hutang (SPH) / Perjanjian No. ${contractNo}
2. Pokok Piutang Tertunggak : ${formattedAmount}
3. Status : Wanprestasi / Cidera Janji atas batas waktu pembayaran yang telah disepakati bersama.

Melalui Surat ini, kami memberikan PERINGATAN HUKUM (SOMASI) agar Saudara/i segera menyelesaikan kewajiban tersebut dalam waktu selambat-lambatnya 3 (tiga) hari kerja sejak surat ini diterima.

Apabila Saudara/i tetap tidak mengindahkan somasi ini, kami akan mengambil langkah hukum yang tegas, baik melalui:
1. Gugatan Perdata Wanprestasi / Gugatan Sederhana ke Pengadilan Negeri setempat;
2. Pelaporan Pidana atas dugaan Tindak Pidana Penipuan dan/atau Penggelapan (Pasal 378 / 372 KUHP) apabila ditemukan itikad buruk;
3. Permohonan Sita Jaminan (Conservatoir Beslag) atas aset harta kekayaan Saudara/i.

Demikian somasi ini kami sampaikan agar menjadi perhatian serius dan diselesaikan dengan itikad baik.

Hormat kami,
Kuasa Hukum / Tim Advokat

${lawyer || 'Dr. Hendra Wijaya, S.H., M.H.'}
Advokat & Konsultan Hukum`;
    }

    // MULTIFINANCE LEGAL LETTER
    return `${typeTitle}
Nomor: ${type}/LEGAL-MJI/${new Date().getFullYear()}/${(store.lawyerNotices?.length || 0) + 1}
Tanggal: ${todayStr}

Kepada Yth.
Debitur / Konsumen: ${debtorName}
Alamat: ${debtorAddr || 'Sesuai Kontrak Pembiayaan'}

Perihal: ${typeTitle} — Perjanjian Pembiayaan No. Kontrak: ${contractNo}

Dengan hormat,

Kami yang bertanda tangan di bawah ini, Tim Advokat & Kuasa Hukum mewakili PT MITRAJASA SATRIA INDONESIA yang bertindak berdasarkan Surat Kuasa Khusus dari Kreditur (${clientName}):

Bahwa Saudara/i tercatat memiliki fasilitas pembiayaan konsumen pada ${clientName} dengan No. Kontrak ${contractNo}, dan saat ini telah menunggak kewajiban pembayaran pokok sebesar ${formattedAmount}.

Berdasarkan Undang-Undang No. 42 Tahun 1999 tentang Jaminan Fidusia dan klausul Perjanjian Pembiayaan:
1. Objek jaminan fidusia telah dibebani hak jaminan kebendaan;
2. Setiap pengalihan, penggadaian, atau penyembunyian unit kendaraan tanpa persetujuan tertulis merupakan tindak pidana berdasarkan Pasal 36 UU Jaminan Fidusia No. 42/1999 dengan ancaman pidana penjara paling lama 2 (dua) tahun;
3. Tindakan Saudara/i yang tidak melakukan pembayaran merupakan bentuk Wanprestasi murni.

Melalui Surat ini, kami memberikan PERINGATAN HUKUM KERAS agar Saudara/i dalam waktu 3x24 Jam segera:
- Melunasi seluruh total tunggakan kewajiban; ATAU
- Menyerahkan secara sukarela unit jaminan fidusia kepada Tim Eksekusi PT Mitrajasa Satria Indonesia untuk dilakukan pengamanan.

Apabila peringatan ini diabaikan, kami akan segera memproses laporan pidana dan/atau eksekusi paksa jaminan fidusia sesuai hukum yang berlaku.

Hormat kami,
Kuasa Hukum Eksekusi & Advokat

${lawyer || 'Dr. Hendra Wijaya, S.H., M.H.'}
${firm || 'Kantor Advokat & Konsultan Hukum Mitra'}`;
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const customer = (store.customers || []).find((c) => c.id === selectedCase.customerId);
    const debtorAddr = customer?.addressCurrent || customer?.addressKtp || selectedCase.debtorAddress || '';

    const draftText = generateLetterDraft(
      selectedCase.debtorName,
      debtorAddr,
      selectedCase.clientName,
      selectedCase.multifinanceContractNo || selectedCase.contractId || '-',
      selectedCase.principalDebtOS,
      noticeType,
      lawyerFirmName,
      lawyerName,
      isPerorangan
    );

    let noticeTypeLabel = 'Somasi I';
    if (noticeType === 'SURAT_KLARIFIKASI') noticeTypeLabel = 'Surat Klarifikasi';
    if (noticeType === 'SOMASI_2') noticeTypeLabel = 'Somasi II';
    if (noticeType === 'SOMASI_TERAKHIR') noticeTypeLabel = 'Somasi Terakhir';
    if (noticeType === 'UNDANGAN_MEDIASI_HUKUM') noticeTypeLabel = 'Undangan Mediasi';
    if (noticeType === 'GUGATAN_SEDERHANA') noticeTypeLabel = 'Gugatan Sederhana';

    if (isEditing && editId) {
      const updatedNotices = (store.lawyerNotices || []).map((n) => {
        if (n.id === editId) {
          return {
            ...n,
            caseId: selectedCase.id,
            caseNo: selectedCase.caseNo,
            debtorName: selectedCase.debtorName,
            debtorAddress: debtorAddr,
            clientName: selectedCase.clientName,
            multifinanceContractNo: selectedCase.multifinanceContractNo,
            noticeType,
            lawyerFirmName,
            lawyerName,
            driveDocumentUrl: driveDocumentUrl.trim() || undefined,
            principalDebtAmount: selectedCase.principalDebtOS,
            notes,
          };
        }
        return n;
      });

      const updatedCases = store.cases.map((c) => {
        if (c.id === selectedCase.id) {
          return {
            ...c,
            lawyerStatus: `Dikirim ${noticeTypeLabel} (Lawyer)`,
            lastLawyerNoticeType: noticeType,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Lawyer_Notices',
        editId,
        `Updated Pengajuan Surat Legal (${noticeTypeLabel} - ${isPerorangan ? 'Perorangan' : 'Multifinance'}) untuk Nasabah ${selectedCase.debtorName} (${selectedCase.caseNo})`
      );

      onUpdateStore({
        ...store,
        cases: updatedCases,
        lawyerNotices: updatedNotices,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newNotice: LawyerNotice = {
        id: `LGL-${Date.now()}`,
        noticeNo: `${noticeType}/${isPerorangan ? 'LEGAL-PER' : 'LEGAL-CORP'}/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
        caseId: selectedCase.id,
        caseNo: selectedCase.caseNo,
        debtorName: selectedCase.debtorName,
        debtorAddress: debtorAddr,
        clientName: selectedCase.clientName,
        multifinanceContractNo: selectedCase.multifinanceContractNo,
        noticeType,
        requestedDate: new Date().toISOString().split('T')[0],
        lawyerFirmName,
        lawyerName,
        driveDocumentUrl: driveDocumentUrl.trim() || undefined,
        driveFolderId: driveFolderId || undefined,
        driveFolderUrl: driveFolderUrl || undefined,
        principalDebtAmount: selectedCase.principalDebtOS,
        status: 'SENT_TO_DEBTOR',
        letterContentDraft: draftText,
        notes,
        createdBy: currentUser.name,
        createdAt: new Date().toISOString(),
      };

      const updatedCases = store.cases.map((c) => {
        if (c.id === selectedCase.id) {
          return {
            ...c,
            lawyerStatus: `Dikirim ${noticeTypeLabel} (Lawyer)`,
            lawyerNoticeCount: (c.lawyerNoticeCount || 0) + 1,
            lastLawyerNoticeType: noticeType,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Lawyer_Notices',
        newNotice.id,
        `Membuat Pengajuan Surat Legal (${noticeTypeLabel} - ${isPerorangan ? 'Perorangan' : 'Multifinance'}) untuk Nasabah ${newNotice.debtorName} (${newNotice.caseNo})`
      );

      onUpdateStore({
        ...store,
        cases: updatedCases,
        lawyerNotices: [newNotice, ...(store.lawyerNotices || [])],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowAddModal(false);
  };

  const handleUpdateNoticeContent = (id: string, newContent: string) => {
    const updated = (store.lawyerNotices || []).map((n) =>
      n.id === id ? { ...n, letterContentDraft: newContent } : n
    );
    onUpdateStore({ ...store, lawyerNotices: updated });
    if (viewNotice && viewNotice.id === id) {
      setViewNotice({ ...viewNotice, letterContentDraft: newContent });
    }
  };

  const handleUpdateNoticeStatus = (id: string, newStatus: LawyerNotice['status']) => {
    const updated = (store.lawyerNotices || []).map((n) =>
      n.id === id ? { ...n, status: newStatus } : n
    );
    onUpdateStore({ ...store, lawyerNotices: updated });
    if (viewNotice && viewNotice.id === id) {
      setViewNotice({ ...viewNotice, status: newStatus });
    }
  };

  const handleUpdateNoticeDriveUrl = (id: string, url: string, folderId?: string, folderUrl?: string) => {
    const updated = (store.lawyerNotices || []).map((n) =>
      n.id === id ? {
        ...n,
        driveDocumentUrl: url.trim() || undefined,
        driveFolderId: folderId || n.driveFolderId,
        driveFolderUrl: folderUrl || n.driveFolderUrl,
      } : n
    );
    onUpdateStore({ ...store, lawyerNotices: updated });
    if (viewNotice && viewNotice.id === id) {
      setViewNotice({
        ...viewNotice,
        driveDocumentUrl: url.trim() || undefined,
        driveFolderId: folderId || viewNotice.driveFolderId,
        driveFolderUrl: folderUrl || viewNotice.driveFolderUrl,
      });
    }
  };

  const handleSaveQuickDriveUrl = (savedUrl: string, savedFolderId?: string, savedFolderUrl?: string) => {
    if (!quickDriveModal.noticeId) return;

    const updated = (store.lawyerNotices || []).map((n) =>
      n.id === quickDriveModal.noticeId ? {
        ...n,
        driveDocumentUrl: savedUrl.trim() || undefined,
        driveFolderId: savedFolderId || n.driveFolderId,
        driveFolderUrl: savedFolderUrl || n.driveFolderUrl,
      } : n
    );

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Lawyer_Notices',
      quickDriveModal.noticeId,
      `Updated Link Google Drive for Lawyer Notice ${quickDriveModal.noticeNo}`
    );

    onUpdateStore({
      ...store,
      lawyerNotices: updated,
      auditLogs: [audit, ...(store.auditLogs || [])],
    });

    setQuickDriveModal({
      isOpen: false,
      noticeId: '',
      noticeNo: '',
      debtorName: '',
      url: '',
      folderId: '',
    });
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const noticesList = store.lawyerNotices || [];

  const filteredNotices = noticesList.filter((n) => {
    const parentCase = store.cases.find((c) => c.id === n.caseId || c.caseNo === n.caseNo);
    const isPer = parentCase?.clientType === 'PERORANGAN';

    if (clientFilter === 'MULTIFINANCE' && isPer) return false;
    if (clientFilter === 'PERORANGAN' && !isPer) return false;

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const match = `${n.noticeNo} ${n.debtorName} ${n.caseNo} ${n.clientName} ${n.lawyerFirmName} ${n.lawyerName || ''} ${n.driveDocumentUrl || ''}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  const getNoticeBadge = (type: LawyerNotice['noticeType']) => {
    switch (type) {
      case 'SURAT_KLARIFIKASI':
        return <span className="bg-sky-950 text-sky-300 border border-sky-800 px-2 py-0.5 rounded text-[10px] font-bold">1. Klarifikasi</span>;
      case 'SOMASI_1':
        return <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px] font-bold">2. Somasi I</span>;
      case 'SOMASI_2':
        return <span className="bg-orange-950 text-orange-300 border border-orange-800 px-2 py-0.5 rounded text-[10px] font-bold">3. Somasi II</span>;
      case 'SOMASI_TERAKHIR':
        return <span className="bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded text-[10px] font-bold">4. Somasi Terakhir</span>;
      case 'UNDANGAN_MEDIASI_HUKUM':
        return <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-[10px] font-bold">5. Mediasi Hukum</span>;
      case 'GUGATAN_SEDERHANA':
        return <span className="bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded text-[10px] font-bold">6. Gugatan Sederhana PN</span>;
      default:
        return <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">{type}</span>;
    }
  };

  const getStatusBadge = (status: LawyerNotice['status']) => {
    switch (status) {
      case 'DRAFT_PROPOSED':
        return <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded text-[10px]">Draft Pengajuan</span>;
      case 'SUBMITTED_TO_LAWYER':
        return <span className="bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded text-[10px]">Review Advokat</span>;
      case 'APPROVED_BY_LAWYER':
        return <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-[10px]">Disetujui Lawyer</span>;
      case 'SENT_TO_DEBTOR':
        return <span className="bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded text-[10px]">Terkirim ke Nasabah</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded text-[10px]">Selesai / Respons</span>;
      default:
        return <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Surat Somasi & Tindakan Hukum (Lawyer Notice)
            </h2>
            <span className="bg-purple-950 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-800 font-semibold">
              Litigasi & Somasi Formal
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Penerbitan surat somasi, eskalasi hukum berjenjang, dan manajemen arsip digital berkas perkara hukum
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <a
              href={store.settings?.googleDriveFolderUrl || ROOT_GDRIVE_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-700 hover:border-indigo-500 text-xs font-semibold rounded-xl transition"
              title="Buka Folder Google Drive Master ARMS"
            >
              <FolderOpen className="w-4 h-4 text-blue-400" />
              <span>Buka GDrive Master</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={() => handleOpenModal()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Surat Somasi Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Surat Legal</div>
            <div className="text-lg font-bold text-white">{noticesList.length} Surat</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-purple-950 text-purple-400 rounded-lg border border-purple-800">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Terkirim ke Nasabah</div>
            <div className="text-lg font-bold text-purple-300">
              {noticesList.filter((n) => n.status === 'SENT_TO_DEBTOR' || n.status === 'COMPLETED').length} Kasus
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-950 text-amber-400 rounded-lg border border-amber-800">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Somasi Aktif</div>
            <div className="text-lg font-bold text-amber-400">
              {noticesList.filter((n) => n.noticeType.includes('SOMASI')).length} Somasi
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Kasus Aktif Ter-Cover Lawyer</div>
            <div className="text-lg font-bold text-emerald-400">
              {store.cases.filter((c) => Boolean(c.lawyerStatus)).length} Nasabah
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setClientFilter('ALL')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              clientFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({noticesList.length})
          </button>
          <button
            onClick={() => setClientFilter('MULTIFINANCE')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              clientFilter === 'MULTIFINANCE'
                ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-700'
                : 'text-slate-400 hover:text-indigo-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Multifinance</span>
          </button>
          <button
            onClick={() => setClientFilter('PERORANGAN')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              clientFilter === 'PERORANGAN'
                ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Klien Perorangan</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari surat, nasabah, lawyer..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            <span>Daftar Pengajuan & Surat Somasi Lawyer</span>
          </h3>
          <span className="text-xs text-slate-400">
            Format Somasi disesuaikan otomatis untuk Klien Multifinance & Perorangan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No. Surat Legal</th>
                <th className="py-3 px-4">Kasus & Nasabah</th>
                <th className="py-3 px-4">Kategori Klien</th>
                <th className="py-3 px-4">Jenis Surat / Tindakan</th>
                <th className="py-3 px-4">Kantor Hukum & Advokat</th>
                <th className="py-3 px-4">Link Google Drive</th>
                <th className="py-3 px-4 text-right">Tunggakan Pokok</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredNotices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Belum ada pengajuan surat legal lawyer yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredNotices.map((n) => {
                  const parentCase = store.cases.find((c) => c.id === n.caseId || c.caseNo === n.caseNo);
                  const isPer = parentCase?.clientType === 'PERORANGAN';
                  const hasDriveUrl = !!n.driveDocumentUrl && n.driveDocumentUrl.trim().length > 0;

                  return (
                    <tr key={n.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{n.noticeNo}</td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {parentCase?.status === 'CLOSED' ? (
                            <span className="text-slate-400 italic inline-flex items-center gap-1 font-normal text-xs">
                              <Lock className="w-3 h-3 text-slate-400" /> [Kasus Ditutup]
                            </span>
                          ) : (
                            <span>{n.debtorName}</span>
                          )}
                          <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800">
                            ⚖️ Lawyer
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">Ref: {n.caseNo}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isPer ? (
                          <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800/80 font-medium">
                            <UserCheck className="w-3 h-3" /> Perorangan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-indigo-950/80 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800/80 font-medium">
                            <Building2 className="w-3 h-3" /> Multifinance
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={n.clientName}>
                          {n.clientName}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">{getNoticeBadge(n.noticeType)}</td>

                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-slate-200 font-medium">{n.lawyerFirmName}</div>
                        <div className="text-[10px] text-slate-400">{n.lawyerName}</div>
                      </td>

                      {/* Google Drive Link */}
                      <td className="py-3.5 px-4">
                        {hasDriveUrl ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={n.driveDocumentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/80 rounded-lg text-[11px] font-semibold transition group shadow-sm"
                              title="Buka Dokumen di Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                              <span>Buka GDrive</span>
                            </a>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(n.driveDocumentUrl || '');
                                setCopiedUrl(n.id);
                                setTimeout(() => setCopiedUrl(null), 2000);
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                              title="Salin Link Google Drive"
                            >
                              {copiedUrl === n.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setQuickDriveModal({
                              isOpen: true,
                              noticeId: n.id,
                              noticeNo: n.noticeNo,
                              debtorName: n.debtorName,
                              url: '',
                            })}
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 py-1 px-2 border border-dashed border-slate-700 hover:border-indigo-500 rounded-lg transition"
                            title="Tautkan link berkas Google Drive"
                          >
                            <Plus className="w-3 h-3 text-indigo-400" />
                            <span>+ Link GDrive</span>
                          </button>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        Rp {n.principalDebtAmount.toLocaleString('id-ID')}
                      </td>

                      <td className="py-3.5 px-4 text-center">{getStatusBadge(n.status)}</td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setPreviewData({
                                type: 'LAWYER_SOMASI',
                                lawyerNotice: n,
                                title: `Surat Somasi Advokat - ${n.noticeNo}`,
                                driveUrl: n.driveDocumentUrl,
                                folderUrl: n.driveFolderUrl,
                              });
                              setShowPreviewModal(true);
                            }}
                            className="inline-flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 px-2.5 py-1 rounded text-[11px] font-semibold transition shadow-sm"
                            title="Pratinjau Format Somasi Resmi / Cetak"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Preview</span>
                          </button>

                          <button
                            onClick={() => setViewNotice(n)}
                            className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                            title="Buka Form & Edit Draft"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Form</span>
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenModal(n)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                                title="Edit Notice"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteNotice(n.id, n.noticeNo)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                                title="Hapus Notice"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK GDRIVE MODAL (SOMASI) */}
      <QuickGDriveModal
        isOpen={quickDriveModal.isOpen}
        onClose={() => setQuickDriveModal({ isOpen: false, noticeId: '', noticeNo: '', debtorName: '', url: '', folderId: '' })}
        title="Tautkan Berkas Google Drive Somasi / Tindakan Legal"
        documentNo={quickDriveModal.noticeNo}
        subjectName={quickDriveModal.debtorName}
        initialUrl={quickDriveModal.url}
        initialFolderId={quickDriveModal.folderId}
        category="LAWYER_SOMASI"
        store={store}
        currentUser={currentUser}
        onUpdateStore={onUpdateStore}
        onSave={handleSaveQuickDriveUrl}
      />

      {/* Modal Add / Edit Legal Service / Notice */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form onSubmit={handleCreateNotice} className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-5 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {isEditing ? 'Edit Form Pengajuan Somasi / Surat Legal' : 'Form Buat Pengajuan Somasi / Surat Legal'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {activeCases.length === 0 ? (
              <div className="p-4 bg-amber-950/60 border border-amber-800/80 rounded-lg text-xs text-amber-200">
                ⚠️ Tidak ada kasus aktif yang membutuhkan surat legal. Semua pekerjaan kasus telah selesai/lunas.
              </div>
            ) : (
              <>
                <div className="relative z-[60]">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Nasabah / Kasus Belum Selesai (Ketik untuk mencari) <span className="text-red-400">*</span>
                  </label>
                  <SearchableSelect
                    value={selectedCaseId}
                    onChange={setSelectedCaseId}
                    options={activeCases.map((c) => {
                      const isClosed = c.status === 'CLOSED';
                      const debtor = isClosed ? '[Kasus Ditutup]' : c.debtorName;
                      const cat = c.clientType === 'PERORANGAN' ? 'PERORANGAN' : 'MULTIFINANCE';
                      return {
                        value: c.id,
                        label: `[${cat}] ${c.caseNo} — ${debtor}`,
                        subLabel: `Kreditur: ${c.clientName} | Tunggakan/Piutang: Rp ${c.principalDebtOS.toLocaleString('id-ID')}`
                      };
                    })}
                  />
                </div>

                {/* Selected Case Info Banner */}
                {selectedCase && (
                  <div
                    className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                      isPerorangan
                        ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                        : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
                    }`}
                  >
                    <div>
                      <span className="text-[10px] text-slate-400 block">Kategori & Klien:</span>
                      <span className="font-bold text-white">
                        {isPerorangan ? '👤 Klien Perorangan: ' : '🏢 Multifinance: '}
                        {selectedCase.clientName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Dasar Tagihan:</span>
                      <span className="font-mono text-slate-300">{selectedCase.multifinanceContractNo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pokok Tertunggak:</span>
                      <span className="font-bold text-emerald-400">
                        Rp {selectedCase.principalDebtOS.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Jenis Surat / Tindakan Lawyer <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value as LawyerNotice['noticeType'])}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="SURAT_KLARIFIKASI">1. Surat Klarifikasi & Konfirmasi Piutang</option>
                      <option value="SOMASI_1">2. Surat Somasi I (Peringatan Hukum I)</option>
                      <option value="SOMASI_2">3. Surat Somasi II (Peringatan Hukum II)</option>
                      <option value="SOMASI_TERAKHIR">4. Surat Somasi Terakhir & Ancaman Hukum</option>
                      <option value="UNDANGAN_MEDIASI_HUKUM">5. Surat Undangan Mediasi Hukum Formal</option>
                      <option value="GUGATAN_SEDERHANA">6. Draft Pendaftaran Gugatan Sederhana PN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Advokat / Kuasa Hukum
                    </label>
                    <input
                      type="text"
                      value={lawyerName}
                      onChange={(e) => setLawyerName(e.target.value)}
                      placeholder="e.g. Dr. Hendra Wijaya, S.H., M.H."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kantor Law Firm / Tim Legal Counsel
                  </label>
                  <input
                    type="text"
                    value={lawyerFirmName}
                    onChange={(e) => setLawyerFirmName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Google Drive Folder & Document Link Picker */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white border-b border-slate-800 pb-2">
                    <HardDrive className="w-4 h-4 text-indigo-400" />
                    <span>Google Drive Integrasi Berkas Somasi & Legal</span>
                  </div>
                  <GoogleDriveFolderPicker
                    store={store}
                    currentUser={currentUser}
                    onUpdateStore={onUpdateStore}
                    defaultCategory="LAWYER_SOMASI"
                    selectedFolderId={driveFolderId}
                    documentUrl={driveDocumentUrl}
                    onSelectFolder={(folder) => {
                      setDriveFolderId(folder.id);
                      setDriveFolderUrl(folder.url);
                    }}
                    onUpdateDocumentUrl={(url) => setDriveDocumentUrl(url)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catatan Khusus & Latar Belakang Wanprestasi
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan khusus penunggakan piutang..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isEditing ? 'Simpan Perubahan' : 'Generate & Simpan Somasi'}</span>
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* View & Edit Notice Modal (Clean Form / Draft Editor) */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 shadow-2xl my-auto max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Form & Draft Surat Somasi Legal</h3>
                </div>
                <div className="text-xs text-slate-400">
                  {viewNotice.noticeNo} • Ref Kasus: {viewNotice.caseNo} • {viewNotice.clientName}
                </div>
              </div>

              <button
                onClick={() => setViewNotice(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Quick Status and GDrive Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Status Saat Ini:</span>
                {getStatusBadge(viewNotice.status)}
              </div>

              <div className="flex items-center gap-3">
                {canEdit && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Ubah Status:</span>
                    <select
                      value={viewNotice.status}
                      onChange={(e) => handleUpdateNoticeStatus(viewNotice.id, e.target.value as LawyerNotice['status'])}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white"
                    >
                      <option value="DRAFT_PROPOSED">Draft Pengajuan</option>
                      <option value="SUBMITTED_TO_LAWYER">Proses Review Advokat</option>
                      <option value="APPROVED_BY_LAWYER">Disetujui Lawyer</option>
                      <option value="SENT_TO_DEBTOR">Terkirim ke Nasabah</option>
                      <option value="COMPLETED">Selesai / Respons Debitur</option>
                    </select>
                  </div>
                )}

                {viewNotice.driveDocumentUrl && (
                  <a
                    href={viewNotice.driveDocumentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-700 rounded-lg text-xs font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Dokumen GDrive</span>
                  </a>
                )}
              </div>
            </div>

            {/* Google Drive Folder & Document Link Picker inside View Notice */}
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-2">
              <GoogleDriveFolderPicker
                store={store}
                currentUser={currentUser}
                onUpdateStore={onUpdateStore}
                defaultCategory="LAWYER_SOMASI"
                selectedFolderId={viewNotice.driveFolderId}
                documentUrl={viewNotice.driveDocumentUrl || ''}
                onSelectFolder={(folder) => {
                  handleUpdateNoticeDriveUrl(viewNotice.id, viewNotice.driveDocumentUrl || '', folder.id, folder.url);
                }}
                onUpdateDocumentUrl={(url) => {
                  handleUpdateNoticeDriveUrl(viewNotice.id, url, viewNotice.driveFolderId, viewNotice.driveFolderUrl);
                }}
              />
            </div>

            {/* Editable Draft Textarea Form */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Teks Lengkap Draft Somasi / Surat Legal:
                </label>
                <span className="text-[11px] text-slate-500">
                  Dapat diedit langsung sesuai instruksi penasihat hukum
                </span>
              </div>
              <textarea
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed min-h-[20rem] focus:outline-none focus:border-indigo-500 shadow-inner"
                value={viewNotice.letterContentDraft}
                onChange={(e) => handleUpdateNoticeContent(viewNotice.id, e.target.value)}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="text-xs text-slate-400">
                Pembuat: <span className="text-white font-medium">{viewNotice.createdBy}</span> • Tgl: {viewNotice.requestedDate}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setPreviewData({
                      type: 'LAWYER_SOMASI',
                      lawyerNotice: viewNotice,
                      title: `Pratinjau Somasi - ${viewNotice.noticeNo}`,
                      driveUrl: viewNotice.driveDocumentUrl,
                      folderUrl: viewNotice.driveFolderUrl,
                    });
                    setShowPreviewModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/60 rounded-lg text-xs font-semibold transition"
                >
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Pratinjau Format Cetak</span>
                </button>

                <button
                  onClick={() => handleCopyText(viewNotice.letterContentDraft)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
                </button>

                <button
                  onClick={() => setViewNotice(null)}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition shadow"
                >
                  Selesai / Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LETTER PREVIEW MODAL */}
      <LetterPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewData(null);
        }}
        data={previewData}
        onOpenQuickDriveModal={(d) => {
          setShowPreviewModal(false);
          if (d.lawyerNotice) {
            setQuickDriveModal({
              isOpen: true,
              noticeId: d.lawyerNotice.id,
              noticeNo: d.lawyerNotice.noticeNo,
              debtorName: d.lawyerNotice.debtorName,
              url: d.lawyerNotice.driveDocumentUrl || '',
              folderId: d.lawyerNotice.driveFolderId,
            });
          }
        }}
      />

    </div>
  );
};
