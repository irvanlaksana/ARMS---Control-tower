import React, { useState, useMemo } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, SK, LawyerNotice, Contract, DocumentRecord, DriveFolder } from '../../types/arms';
import { 
  Folder, ExternalLink, HardDrive, FileText, X, Check, Copy, 
  UserCheck, Building2, Search, Plus, Eye, Scale, Filter, 
  FolderOpen, ArrowUpRight, CheckCircle2, AlertCircle, RefreshCw,
  Share2, ShieldCheck, Download, Tag, Calendar
} from 'lucide-react';
import { ROOT_GDRIVE_URL, ROOT_GDRIVE_ID, INITIAL_DRIVE_FOLDERS } from '../../data/initialData';
import { GoogleDriveFolderPicker } from '../common/GoogleDriveFolderPicker';
import { QuickGDriveModal } from '../common/QuickGDriveModal';
import { LetterPreviewModal, LetterPreviewData } from '../common/LetterPreviewModal';

interface DocumentsModuleProps {
  store: ARMSStore;
  currentUser?: User;
  onUpdateStore?: (newStore: ARMSStore) => void;
  onNavigateTab?: (tab: string) => void;
}

export type DocCategoryFilter = 
  | 'ALL' 
  | 'SK' 
  | 'LAWYER_SOMASI' 
  | 'MOU_KONTRAK' 
  | 'DEBTOR_CASES' 
  | 'FIELD_OPS' 
  | 'FINANCE_RECEIPTS' 
  | 'SETTLEMENT';

interface UnifiedDocItem {
  id: string;
  sourceModule: 'SK' | 'LAWYER' | 'CONTRACT' | 'DOCUMENT' | 'PAYMENT' | 'EXPENSE' | 'SETTLEMENT';
  docNo: string;
  title: string;
  category: 'SK' | 'LAWYER_SOMASI' | 'MOU_KONTRAK' | 'DEBTOR_CASES' | 'FIELD_OPS' | 'FINANCE_RECEIPTS' | 'SETTLEMENT';
  categoryLabel: string;
  subjectName: string; // Debitur / Klien / Personnel
  issuedDate: string;
  driveFolderId?: string;
  driveFolderUrl?: string;
  driveDocumentUrl?: string;
  status?: string;
  rawObj: any;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ 
  store, 
  currentUser = { id: 'USR-001', username: 'admin', name: 'Admin', role: 'SUPER_ADMIN_OPS' } as User,
  onUpdateStore,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'ALL_DOCS' | 'FOLDERS'>('ALL_DOCS');
  const [categoryFilter, setCategoryFilter] = useState<DocCategoryFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [driveStatusFilter, setDriveStatusFilter] = useState<'ALL' | 'LINKED' | 'UNLINKED'>('ALL');
  
  // Modals
  const [previewData, setPreviewData] = useState<LetterPreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  const [quickDriveModal, setQuickDriveModal] = useState<{
    isOpen: boolean;
    title: string;
    docNo: string;
    subjectName: string;
    url: string;
    folderId?: string;
    category: string;
    onSave: (url: string, folderId?: string, folderUrl?: string) => void;
  }>({
    isOpen: false,
    title: '',
    docNo: '',
    subjectName: '',
    url: '',
    folderId: '',
    category: 'GENERAL',
    onSave: () => {},
  });

  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'CONTRACT' | 'SK_SURAT_KUASA' | 'KTP_DEBTOR' | 'BPKB' | 'KWITANSI' | 'BERITA_ACARA' | 'SETTLEMENT_REPORT' | 'OTHER'>('SK_SURAT_KUASA');
  const [newDocCaseNo, setNewDocCaseNo] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');
  const [newDocFolderId, setNewDocFolderId] = useState('');
  const [newDocFolderUrl, setNewDocFolderUrl] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Compile all system documents into a unified list
  const unifiedDocs: UnifiedDocItem[] = useMemo(() => {
    const items: UnifiedDocItem[] = [];

    // 1. Surat Tugas & Kuasa (SK)
    (store.sks || []).forEach((sk) => {
      items.push({
        id: `sk-${sk.id}`,
        sourceModule: 'SK',
        docNo: sk.skNumber,
        title: `Surat Kuasa & Tugas - ${sk.debtorName}`,
        category: 'SK',
        categoryLabel: 'Surat Tugas & Kuasa',
        subjectName: `${sk.debtorName} (${sk.krediturName || sk.clientName || 'Klien'})`,
        issuedDate: sk.issuedDate,
        driveFolderId: sk.driveFolderId || 'FLD-01',
        driveFolderUrl: sk.driveFolderUrl || ROOT_GDRIVE_URL,
        driveDocumentUrl: sk.driveDocumentUrl,
        status: sk.status,
        rawObj: sk,
      });
    });

    // 2. Surat Somasi & Legal Notices
    (store.lawyerNotices || []).forEach((notice) => {
      items.push({
        id: `lawyer-${notice.id}`,
        sourceModule: 'LAWYER',
        docNo: notice.noticeNo,
        title: `Somasi Advokat: ${notice.noticeType.replace('_', ' ')} - ${notice.debtorName}`,
        category: 'LAWYER_SOMASI',
        categoryLabel: 'Somasi & Tindakan Legal',
        subjectName: `${notice.debtorName} (Kasus: ${notice.caseNo})`,
        issuedDate: notice.issuedDate,
        driveFolderId: notice.driveFolderId || 'FLD-02',
        driveFolderUrl: notice.driveFolderUrl || ROOT_GDRIVE_URL,
        driveDocumentUrl: notice.driveDocumentUrl,
        status: notice.status,
        rawObj: notice,
      });
    });

    // 3. MoU & Kontrak Kerjasama
    (store.contracts || []).forEach((contract) => {
      items.push({
        id: `contract-${contract.id}`,
        sourceModule: 'CONTRACT',
        docNo: contract.contractNo,
        title: `MoU Kemitraan: ${contract.title}`,
        category: 'MOU_KONTRAK',
        categoryLabel: 'MoU & Kontrak',
        subjectName: contract.clientName,
        issuedDate: contract.startDate,
        driveFolderId: 'FLD-03',
        driveFolderUrl: ROOT_GDRIVE_URL,
        driveDocumentUrl: contract.driveDocumentUrl,
        status: contract.status,
        rawObj: contract,
      });
    });

    // 4. Custom Document Records
    (store.documents || []).forEach((doc) => {
      let mappedCategory: UnifiedDocItem['category'] = 'DEBTOR_CASES';
      let label = 'Berkas Debitur';
      if (doc.category === 'SK_SURAT_KUASA') {
        mappedCategory = 'SK';
        label = 'Surat Tugas & Kuasa';
      } else if (doc.category === 'CONTRACT') {
        mappedCategory = 'MOU_KONTRAK';
        label = 'MoU Kontrak';
      } else if (doc.category === 'BERITA_ACARA') {
        mappedCategory = 'FIELD_OPS';
        label = 'Berita Acara Lapangan';
      } else if (doc.category === 'KWITANSI') {
        mappedCategory = 'FINANCE_RECEIPTS';
        label = 'Bukti Kwitansi';
      } else if (doc.category === 'SETTLEMENT_REPORT') {
        mappedCategory = 'SETTLEMENT';
        label = 'Laporan Settlement';
      }

      items.push({
        id: `doc-${doc.id}`,
        sourceModule: 'DOCUMENT',
        docNo: doc.docNo,
        title: doc.title,
        category: mappedCategory,
        categoryLabel: label,
        subjectName: doc.caseNo ? `Kasus ${doc.caseNo}` : doc.uploadedBy,
        issuedDate: doc.uploadedAt?.slice(0, 10) || '2026-08-18',
        driveFolderId: doc.driveFolderId,
        driveFolderUrl: doc.driveFolderUrl,
        driveDocumentUrl: doc.driveViewUrl,
        status: 'ACTIVE',
        rawObj: doc,
      });
    });

    // 5. Bukti Pembayaran / Kwitansi
    (store.payments || []).forEach((p) => {
      if (p.proofUrl) {
        items.push({
          id: `pay-${p.id}`,
          sourceModule: 'PAYMENT',
          docNo: `KW-${p.caseNo || p.id}`,
          title: `Kwitansi Pembayaran ${p.paymentType} - ${p.debtorName}`,
          category: 'FINANCE_RECEIPTS',
          categoryLabel: 'Kwitansi & Transfer',
          subjectName: `${p.debtorName} (Rp ${p.amount.toLocaleString('id-ID')})`,
          issuedDate: p.paymentDate,
          driveFolderId: 'FLD-06',
          driveFolderUrl: ROOT_GDRIVE_URL,
          driveDocumentUrl: p.proofUrl,
          status: p.verificationStatus,
          rawObj: p,
        });
      }
    });

    // 6. Laporan Settlement
    (store.settlements || []).forEach((st) => {
      if (st.driveSettlementDocUrl) {
        items.push({
          id: `st-${st.id}`,
          sourceModule: 'SETTLEMENT',
          docNo: st.settlementNo,
          title: `Laporan Settlement & Remit: ${st.clientName}`,
          category: 'SETTLEMENT',
          categoryLabel: 'Laporan Settlement',
          subjectName: `${st.clientName} (Kasus: ${st.caseNo})`,
          issuedDate: st.settlementDate,
          driveFolderId: 'FLD-07',
          driveFolderUrl: ROOT_GDRIVE_URL,
          driveDocumentUrl: st.driveSettlementDocUrl,
          status: st.status,
          rawObj: st,
        });
      }
    });

    // 7. Berkas Debitur Multifinance (SKP & SPH)
    (store.cases || []).forEach((cs) => {
      if (cs.skpDriveDocumentUrl || cs.gDriveFolderUrl) {
        items.push({
          id: `deb-skp-${cs.id}`,
          sourceModule: 'DOCUMENT',
          docNo: `SKP-${cs.multifinanceContractNo || cs.caseNo}`,
          title: `Berkas SKP Debitur: ${cs.debtorName}`,
          category: 'DEBTOR_CASES',
          categoryLabel: 'Berkas Debitur & SKP',
          subjectName: `${cs.debtorName} (${cs.clientName})`,
          issuedDate: cs.createdAt?.slice(0, 10) || '2026-03-01',
          driveFolderId: cs.gDriveFolderId || 'FLD-04',
          driveFolderUrl: cs.gDriveFolderUrl || ROOT_GDRIVE_URL,
          driveDocumentUrl: cs.skpDriveDocumentUrl || cs.gDriveFolderUrl,
          status: cs.status,
          rawObj: cs,
        });
      }

      if (cs.sphDriveDocumentUrl) {
        items.push({
          id: `deb-sph-${cs.id}`,
          sourceModule: 'DOCUMENT',
          docNo: `SPH-${cs.multifinanceContractNo || cs.caseNo}`,
          title: `Berkas SPH & Identitas: ${cs.debtorName}`,
          category: 'DEBTOR_CASES',
          categoryLabel: 'Berkas Debitur & SPH',
          subjectName: `${cs.debtorName} (${cs.clientName})`,
          issuedDate: cs.createdAt?.slice(0, 10) || '2026-03-01',
          driveFolderId: cs.gDriveFolderId || 'FLD-04',
          driveFolderUrl: cs.gDriveFolderUrl || ROOT_GDRIVE_URL,
          driveDocumentUrl: cs.sphDriveDocumentUrl,
          status: cs.status,
          rawObj: cs,
        });
      }
    });

    // 8. Berkas Database Karyawan & KYC
    (store.personnel || []).forEach((p) => {
      if (p.ktpDriveFolderUrl || p.gDriveFolderUrl) {
        items.push({
          id: `per-${p.id}`,
          sourceModule: 'DOCUMENT',
          docNo: `KTP-${p.nikKtp.slice(-6)}`,
          title: `Berkas KTP & KYC: ${p.fullName}`,
          category: 'FIELD_OPS',
          categoryLabel: 'Database Karyawan',
          subjectName: `${p.fullName} (${p.position || p.type})`,
          issuedDate: p.createdAt?.slice(0, 10) || '2026-01-10',
          driveFolderId: p.gDriveFolderId || 'FLD-05',
          driveFolderUrl: p.gDriveFolderUrl || ROOT_GDRIVE_URL,
          driveDocumentUrl: p.ktpDriveFolderUrl || p.gDriveFolderUrl,
          status: p.status,
          rawObj: p,
        });
      }
    });

    return items;
  }, [store]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return unifiedDocs.filter((item) => {
      // Category filter
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }

      // Drive status filter
      const hasDrive = !!item.driveDocumentUrl && item.driveDocumentUrl.trim().length > 0;
      if (driveStatusFilter === 'LINKED' && !hasDrive) return false;
      if (driveStatusFilter === 'UNLINKED' && hasDrive) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(q);
        const matchNo = item.docNo.toLowerCase().includes(q);
        const matchSubject = item.subjectName.toLowerCase().includes(q);
        const matchCategory = item.categoryLabel.toLowerCase().includes(q);
        const matchDrive = (item.driveDocumentUrl || '').toLowerCase().includes(q);
        return matchTitle || matchNo || matchSubject || matchCategory || matchDrive;
      }

      return true;
    });
  }, [unifiedDocs, categoryFilter, driveStatusFilter, searchQuery]);

  // Counts for statistics
  const totalDocs = unifiedDocs.length;
  const linkedCount = unifiedDocs.filter(d => !!d.driveDocumentUrl).length;
  const unlinkedCount = totalDocs - linkedCount;
  const foldersCount = (store.driveFolders || INITIAL_DRIVE_FOLDERS).length;

  // Open Preview Letter Handler
  const handleOpenPreview = (item: UnifiedDocItem) => {
    const folders = store.driveFolders || INITIAL_DRIVE_FOLDERS;
    const folderObj = folders.find(f => f.id === item.driveFolderId || f.category === item.category);

    if (item.sourceModule === 'SK') {
      setPreviewData({
        type: 'SK',
        sk: item.rawObj as SK,
        title: `Surat Tugas & Kuasa - ${item.docNo}`,
        driveUrl: item.driveDocumentUrl,
        folderUrl: folderObj?.folderUrl,
        folderName: folderObj?.name,
      });
    } else if (item.sourceModule === 'LAWYER') {
      setPreviewData({
        type: 'LAWYER_SOMASI',
        lawyerNotice: item.rawObj as LawyerNotice,
        title: `Surat Somasi Advokat - ${item.docNo}`,
        driveUrl: item.driveDocumentUrl,
        folderUrl: folderObj?.folderUrl,
        folderName: folderObj?.name,
      });
    } else if (item.sourceModule === 'CONTRACT') {
      setPreviewData({
        type: 'MOU_KONTRAK',
        contract: item.rawObj as Contract,
        title: `Memorandum of Understanding (MoU) - ${item.docNo}`,
        driveUrl: item.driveDocumentUrl,
        folderUrl: folderObj?.folderUrl,
        folderName: folderObj?.name,
      });
    } else {
      setPreviewData({
        type: 'DOCUMENT',
        document: item.rawObj as DocumentRecord,
        title: item.title,
        driveUrl: item.driveDocumentUrl,
        folderUrl: folderObj?.folderUrl,
        folderName: folderObj?.name,
      });
    }
    setShowPreviewModal(true);
  };

  // Quick edit Google Drive Link Handler
  const handleOpenQuickDrive = (item: UnifiedDocItem) => {
    setQuickDriveModal({
      isOpen: true,
      title: `Tautkan Link Google Drive: ${item.docNo}`,
      docNo: item.docNo,
      subjectName: item.subjectName,
      url: item.driveDocumentUrl || '',
      folderId: item.driveFolderId,
      category: item.category,
      onSave: (savedUrl, savedFolderId, savedFolderUrl) => {
        if (!onUpdateStore) return;

        if (item.sourceModule === 'SK') {
          const updated = (store.sks || []).map(sk => 
            sk.id === item.rawObj.id ? { 
              ...sk, 
              driveDocumentUrl: savedUrl.trim() || undefined,
              driveFolderId: savedFolderId || sk.driveFolderId,
              driveFolderUrl: savedFolderUrl || sk.driveFolderUrl
            } : sk
          );
          onUpdateStore({ ...store, sks: updated });
        } else if (item.sourceModule === 'LAWYER') {
          const updated = (store.lawyerNotices || []).map(n => 
            n.id === item.rawObj.id ? { 
              ...n, 
              driveDocumentUrl: savedUrl.trim() || undefined,
              driveFolderId: savedFolderId || n.driveFolderId,
              driveFolderUrl: savedFolderUrl || n.driveFolderUrl
            } : n
          );
          onUpdateStore({ ...store, lawyerNotices: updated });
        } else if (item.sourceModule === 'CONTRACT') {
          const updated = (store.contracts || []).map(c => 
            c.id === item.rawObj.id ? { ...c, driveDocumentUrl: savedUrl.trim() || undefined } : c
          );
          onUpdateStore({ ...store, contracts: updated });
        } else if (item.sourceModule === 'DOCUMENT') {
          const updated = (store.documents || []).map(d => 
            d.id === item.rawObj.id ? { 
              ...d, 
              driveViewUrl: savedUrl.trim(),
              driveFolderId: savedFolderId || d.driveFolderId,
              driveFolderUrl: savedFolderUrl || d.driveFolderUrl
            } : d
          );
          onUpdateStore({ ...store, documents: updated });
        }

        setQuickDriveModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Add custom new document
  const handleSaveNewDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocUrl.trim() || !onUpdateStore) return;

    const newDoc: DocumentRecord = {
      id: `DOC-${Date.now()}`,
      docNo: `DOC/ARMS/${Math.floor(1000 + Math.random() * 9000)}`,
      title: newDocTitle.trim(),
      category: newDocCategory,
      caseNo: newDocCaseNo.trim() || undefined,
      driveFolderId: newDocFolderId || undefined,
      driveFolderUrl: newDocFolderUrl || undefined,
      driveViewUrl: newDocUrl.trim(),
      uploadedBy: currentUser.name || currentUser.username,
      uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Documents',
      newDoc.id,
      `Added digital document "${newDoc.title}" to Google Drive folder`
    );

    onUpdateStore({
      ...store,
      documents: [newDoc, ...(store.documents || [])],
      auditLogs: [audit, ...(store.auditLogs || [])],
    });

    setShowAddDocModal(false);
    setNewDocTitle('');
    setNewDocCaseNo('');
    setNewDocUrl('');
    setNewDocFolderId('');
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Pusat Berkas & Google Drive Cloud Hub
              </h2>
              <p className="text-xs text-slate-400">
                Semua surat resmi, berkas perkara, dokumen somasi, dan MoU lengkap dengan tautan Google Drive & Pratinjau Cetak
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5 self-stretch sm:self-auto">
          <a
            href={store.settings?.googleDriveFolderUrl || ROOT_GDRIVE_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-blue-600/20 active:scale-95 flex-1 sm:flex-initial"
            title="Buka Folder Master Google Drive ARMS"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Buka GDrive Master</span>
            <ExternalLink className="w-3 h-3 opacity-70" />
          </a>

          <button
            onClick={() => setShowAddDocModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/60 text-xs font-semibold rounded-xl transition active:scale-95 flex-1 sm:flex-initial"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>+ Tautkan Berkas Baru</span>
          </button>
        </div>
      </div>

      {/* Top Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Dokumen & Surat</div>
          <div className="text-2xl font-black text-white font-mono">{totalDocs}</div>
          <div className="text-[10px] text-slate-500">Tercatat di seluruh modul sistem</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Terhubung GDrive</span>
          </div>
          <div className="text-2xl font-black text-emerald-400 font-mono">
            {linkedCount} <span className="text-xs text-slate-400 font-normal">({totalDocs > 0 ? Math.round((linkedCount / totalDocs) * 100) : 0}%)</span>
          </div>
          <div className="text-[10px] text-slate-500">Memiliki link file Google Drive aktif</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Perlu Tautan Link</span>
          </div>
          <div className="text-2xl font-black text-amber-400 font-mono">{unlinkedCount}</div>
          <div className="text-[10px] text-slate-500">Belum disematkan link file Drive</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
            <Folder className="w-3.5 h-3.5" />
            <span>Kategori Folder GDrive</span>
          </div>
          <div className="text-2xl font-black text-blue-400 font-mono">{foldersCount}</div>
          <div className="text-[10px] text-slate-500">Direktori struktur Google Drive terbit</div>
        </div>
      </div>

      {/* Main Tabs Selection (Semua Berkas vs Direktori Folder) */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('ALL_DOCS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'ALL_DOCS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Semua Dokumen & Link GDrive ({totalDocs})</span>
          </button>

          <button
            onClick={() => setActiveTab('FOLDERS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'FOLDERS'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span>Direktori Folder Google Drive ({foldersCount})</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: SEMUA DOKUMEN & LINK GOOGLE DRIVE
      ========================================================================= */}
      {activeTab === 'ALL_DOCS' && (
        <div className="space-y-4">
          {/* Filters and Search Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
            {/* Category Chips Filter */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Kategori:
              </span>

              {[
                { id: 'ALL', label: `Semua (${totalDocs})` },
                { id: 'SK', label: `Surat Kuasa & SK (${(store.sks || []).length})` },
                { id: 'LAWYER_SOMASI', label: `Somasi Advokat (${(store.lawyerNotices || []).length})` },
                { id: 'MOU_KONTRAK', label: `MoU Kemitraan (${(store.contracts || []).length})` },
                { id: 'DEBTOR_CASES', label: 'Berkas Debitur' },
                { id: 'FINANCE_RECEIPTS', label: 'Kwitansi & Bukti' },
                { id: 'FIELD_OPS', label: 'BAST & Lapangan' },
                { id: 'SETTLEMENT', label: 'Settlement' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCategoryFilter(c.id as DocCategoryFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    categoryFilter === c.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Search & Link Status Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Cari nomor dokumen, nama debitur, klien, kategori, atau URL Google Drive..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={driveStatusFilter}
                  onChange={(e) => setDriveStatusFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
                >
                  <option value="ALL">Status GDrive: Semua</option>
                  <option value="LINKED">🟢 Hanya yang ada Link Drive</option>
                  <option value="UNLINKED">⚪ Hanya yang Belum Ada Link</option>
                </select>
              </div>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Daftar Dokumen & Link Google Drive</h3>
                <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
                  Menampilkan {filteredDocs.length} dari {totalDocs} berkas
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Dokumen & Nomor</th>
                    <th className="p-3.5">Kategori</th>
                    <th className="p-3.5">Subjek / Debitur / Klien</th>
                    <th className="p-3.5">Folder Target GDrive</th>
                    <th className="p-3.5">Link Google Drive</th>
                    <th className="p-3.5 text-center">Pratinjau Surat</th>
                    <th className="p-3.5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredDocs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 italic">
                        Tidak ada dokumen yang sesuai kriteria pencarian / filter.
                      </td>
                    </tr>
                  ) : (
                    filteredDocs.map((doc) => {
                      const hasDrive = !!doc.driveDocumentUrl && doc.driveDocumentUrl.trim().length > 0;
                      const isCopied = copiedId === doc.id;

                      const folders = store.driveFolders || INITIAL_DRIVE_FOLDERS;
                      const currentFolder = folders.find(f => f.id === doc.driveFolderId || f.category === doc.category);

                      return (
                        <tr key={doc.id} className="hover:bg-slate-800/40 transition group">
                          {/* Dokumen & Nomor */}
                          <td className="p-3.5 font-medium text-white max-w-[240px]">
                            <div className="font-bold text-indigo-300 truncate" title={doc.title}>
                              {doc.title}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>No: {doc.docNo}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              Tgl: {doc.issuedDate}
                            </div>
                          </td>

                          {/* Kategori */}
                          <td className="p-3.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border ${
                              doc.category === 'SK' 
                                ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800' :
                              doc.category === 'LAWYER_SOMASI'
                                ? 'bg-red-950/80 text-red-300 border-red-800' :
                              doc.category === 'MOU_KONTRAK'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' :
                              doc.category === 'FINANCE_RECEIPTS'
                                ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                                'bg-slate-800 text-slate-300 border-slate-700'
                            }`}>
                              {doc.category === 'LAWYER_SOMASI' ? <Scale className="w-2.5 h-2.5 text-red-400" /> : <FileText className="w-2.5 h-2.5" />}
                              <span>{doc.categoryLabel}</span>
                            </span>
                          </td>

                          {/* Subjek / Debitur */}
                          <td className="p-3.5 text-slate-200">
                            <div className="font-semibold text-slate-100 max-w-[180px] truncate" title={doc.subjectName}>
                              {doc.subjectName}
                            </div>
                          </td>

                          {/* Folder Target Google Drive */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-1 text-[11px] text-slate-400">
                              <Folder className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[140px]" title={currentFolder?.name || 'Folder GDrive Default'}>
                                {currentFolder?.name || 'Folder ARMS Master'}
                              </span>
                            </div>
                          </td>

                          {/* Link Google Drive */}
                          <td className="p-3.5">
                            {hasDrive ? (
                              <div className="flex items-center gap-1.5">
                                <a
                                  href={doc.driveDocumentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-950 hover:bg-blue-900 text-blue-200 border border-blue-700/80 rounded-lg text-[11px] font-semibold transition group shadow-sm"
                                  title="Buka File di Google Drive (Tab Baru)"
                                >
                                  <HardDrive className="w-3.5 h-3.5 text-blue-400 group-hover:scale-110 transition-transform" />
                                  <span>Buka GDrive</span>
                                  <ExternalLink className="w-3 h-3 text-blue-400" />
                                </a>

                                <button
                                  onClick={() => handleCopy(doc.driveDocumentUrl || '', doc.id)}
                                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                                  title="Salin Link Google Drive"
                                >
                                  {isCopied ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleOpenQuickDrive(doc)}
                                className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-indigo-300 py-1 px-2.5 border border-dashed border-slate-700 hover:border-indigo-500 rounded-lg transition"
                                title="Tautkan link berkas Google Drive"
                              >
                                <Plus className="w-3 h-3 text-indigo-400" />
                                <span>+ Tautkan GDrive</span>
                              </button>
                            )}
                          </td>

                          {/* Tombol Preview Surat Resmi */}
                          <td className="p-3.5 text-center">
                            <button
                              onClick={() => handleOpenPreview(doc)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800/80 rounded-lg text-[11px] font-semibold transition shadow-sm hover:scale-105 active:scale-95"
                              title="Pratinjau Format Resmi Surat / Cetak Dokumen"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Preview Surat</span>
                            </button>
                          </td>

                          {/* Aksi Tambahan */}
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenQuickDrive(doc)}
                                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                                title="Edit Tautan Google Drive & Folder"
                              >
                                <HardDrive className="w-3.5 h-3.5" />
                              </button>
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
        </div>
      )}

      {/* =========================================================================
          TAB 2: DIREKTORI FOLDER GOOGLE DRIVE
      ========================================================================= */}
      {activeTab === 'FOLDERS' && (
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <Folder className="w-5 h-5 text-blue-400" />
                  <span>Struktur Direktori Folder Google Drive ARMS</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Folder tersinkronisasi otomatis dengan Google Drive Master untuk pengelompokan berkas legal, operasional & keuangan.
                </p>
              </div>

              <a
                href={store.settings?.googleDriveFolderUrl || ROOT_GDRIVE_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition shadow-md"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Buka Master Root GDrive</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(store.driveFolders || INITIAL_DRIVE_FOLDERS).map((folder) => {
                const countInFolder = unifiedDocs.filter(
                  d => d.driveFolderId === folder.id || d.category === folder.category
                ).length;

                return (
                  <div
                    key={folder.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                          <Folder className="w-5 h-5 text-blue-400" />
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-300">
                          {countInFolder} Berkas
                        </span>
                      </div>

                      <div>
                        <h4 className="font-bold text-white text-sm">{folder.name}</h4>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                          {folder.description || 'Folder pengarsipan dokumen'}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                      <a
                        href={folder.folderUrl || ROOT_GDRIVE_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-800 rounded-lg text-xs font-semibold transition"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Buka Folder</span>
                        <ExternalLink className="w-3 h-3 text-indigo-400" />
                      </a>

                      <button
                        onClick={() => {
                          setCategoryFilter(folder.category as DocCategoryFilter);
                          setActiveTab('ALL_DOCS');
                        }}
                        className="text-xs text-slate-400 hover:text-white px-2 py-1"
                      >
                        Lihat Berkas ({countInFolder}) &rarr;
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: PRATINJAU SURAT RESMI (LETTER PREVIEW)
      ========================================================================= */}
      <LetterPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setPreviewData(null);
        }}
        data={previewData}
        onOpenQuickDriveModal={(d) => {
          setShowPreviewModal(false);
          const found = unifiedDocs.find(item => item.docNo === d.sk?.skNumber || item.docNo === d.lawyerNotice?.noticeNo || item.docNo === d.contract?.contractNo);
          if (found) {
            handleOpenQuickDrive(found);
          }
        }}
      />

      {/* =========================================================================
          MODAL: EDIT CEPAT LINK GOOGLE DRIVE
      ========================================================================= */}
      <QuickGDriveModal
        isOpen={quickDriveModal.isOpen}
        onClose={() => setQuickDriveModal(prev => ({ ...prev, isOpen: false }))}
        title={quickDriveModal.title}
        documentNo={quickDriveModal.docNo}
        subjectName={quickDriveModal.subjectName}
        initialUrl={quickDriveModal.url}
        initialFolderId={quickDriveModal.folderId}
        category={quickDriveModal.category}
        store={store}
        currentUser={currentUser}
        onUpdateStore={onUpdateStore}
        onSave={quickDriveModal.onSave}
      />

      {/* =========================================================================
          MODAL: TAMBAH / TAUTKAN DOKUMEN DIGITAL BARU
      ========================================================================= */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Tautkan Berkas Google Drive Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDoc} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Judul / Nama Dokumen *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Scan KTP Debitur & SPH Asli - Budi Santoso"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Kategori Dokumen</label>
                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="SK_SURAT_KUASA">Surat Kuasa & Tugas</option>
                    <option value="KTP_DEBTOR">KTP & Identitas Debitur</option>
                    <option value="BPKB">BPKB & Berkas Fidusia</option>
                    <option value="BERITA_ACARA">Berita Acara (BAST)</option>
                    <option value="KWITANSI">Kwitansi & Pembayaran</option>
                    <option value="CONTRACT">MoU / Kontrak</option>
                    <option value="SETTLEMENT_REPORT">Laporan Settlement</option>
                    <option value="OTHER">Dokumen Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">No. Kasus Terkait (Opsional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CAS-2026-001"
                    value={newDocCaseNo}
                    onChange={(e) => setNewDocCaseNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Google Drive Folder Selector & Document URL */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <GoogleDriveFolderPicker
                  store={store}
                  currentUser={currentUser}
                  onUpdateStore={onUpdateStore}
                  defaultCategory="DEBTOR_CASES"
                  selectedFolderId={newDocFolderId}
                  valueUrl={newDocUrl}
                  onChangeUrl={(url) => setNewDocUrl(url)}
                  onSelectFolder={(id, fUrl) => {
                    setNewDocFolderId(id);
                    setNewDocFolderUrl(fUrl);
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Dokumen</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
