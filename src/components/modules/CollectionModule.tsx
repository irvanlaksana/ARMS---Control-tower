import React, { useState, useRef } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Collection, CommunicationLog, FieldPhoto, ClientType } from '../../types/arms';
import { 
  ShieldAlert, Plus, PhoneCall, MessageSquare, Image, Upload, X, Eye, 
  CheckCircle2, Check, X as XIcon, Paperclip, Building2, UserCheck, Calendar, DollarSign,
  Camera, FileText, ChevronRight, Filter, Search, Tag, ExternalLink, MapPin,
  Car, AlertCircle, CheckSquare, Sparkles, Navigation, Trash2
} from 'lucide-react';

interface CollectionModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  initialTab?: 'FIELD_ACTIONS' | 'COMM_LOGS' | 'PHOTO_GALLERY';
}

export type ActionOrCommType = 
  | 'FIELD_VISIT'
  | 'WHATSAPP'
  | 'PHONE'
  | 'MEDIATION'
  | 'SURAT_PERINGATAN'
  | 'REPOSSESSION'
  | 'PENAGIHAN_PERORANGAN';

const formatDateSafe = (d?: string) => {
  if (!d) return '-';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? d : dt.toLocaleDateString('id-ID');
  } catch {
    return d;
  }
};

const formatTimeSafe = (d?: string) => {
  if (!d) return '';
  try {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? '' : dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

export const CollectionModule: React.FC<CollectionModuleProps> = ({ 
  store, 
  currentUser, 
  onUpdateStore,
  initialTab = 'FIELD_ACTIONS'
}) => {
  // Main Tab Selection
  const [activeTab, setActiveTab] = useState<'FIELD_ACTIONS' | 'COMM_LOGS' | 'PHOTO_GALLERY'>(initialTab);
  const [clientFilter, setClientFilter] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<{ photo: FieldPhoto; caseNo: string; debtorName: string; clientName: string } | null>(null);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);
  const [commLogToDelete, setCommLogToDelete] = useState<CommunicationLog | null>(null);

  // Active cases
  const activeCases = store.cases.filter(
    (c) => !['CLOSED', 'SETTLED', 'FULL_PAID', 'CANCELLED'].includes(c.status)
  );
  const multifinanceCases = activeCases.filter((c) => c.clientType === 'MULTIFINANCE' || !c.clientType);
  const peroranganCases = activeCases.filter((c) => c.clientType === 'PERORANGAN');

  // Unified Form State
  const [selectedCaseId, setSelectedCaseId] = useState(activeCases[0]?.id || store.cases[0]?.id || '');
  const [interactionType, setInteractionType] = useState<ActionOrCommType>('FIELD_VISIT');
  const [personnelId, setPersonnelId] = useState(store.personnel?.[0]?.id || '');
  const [contactPerson, setContactPerson] = useState('Debitur Langsung');
  const [outcome, setOutcome] = useState<'PROMISE_TO_PAY' | 'MEDIATION_AGREED' | 'UNIT_FOUND' | 'REFUSED' | 'UNREACHABLE' | 'DEPOSIT_PAID' | 'REPOSSESSED'>('PROMISE_TO_PAY');
  const [reportSummary, setReportSummary] = useState('');
  const [followUpAction, setFollowUpAction] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  
  // Payment Section
  const [hasPayment, setHasPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH_RECEIPT' | 'MEDIATION_ESCROW'>('TRANSFER');
  const [receiptNo, setReceiptNo] = useState(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  
  // Photos & Attachments
  const [uploadedPhotos, setUploadedPhotos] = useState<FieldPhoto[]>([]);
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  // Selected case details
  const selectedCase = store.cases.find((c) => c.id === selectedCaseId);
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';

  // Handle Photo Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File, index: number) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const resultUrl = uploadEvent.target?.result as string;
        if (!resultUrl) return;

        let defaultCat: FieldPhoto['category'] = 'TEMU_DEBITUR';
        if (interactionType === 'WHATSAPP') defaultCat = 'LAINNYA';
        if (interactionType === 'REPOSSESSION') defaultCat = 'UNIT_KENDARAAN';
        if (interactionType === 'SURAT_PERINGATAN') defaultCat = 'SURAT_BERITA_ACARA';

        const newPhoto: FieldPhoto = {
          id: `PHT-${Date.now()}-${index}`,
          url: resultUrl,
          caption: file.name.replace(/\.[^/.]+$/, ''),
          category: defaultCat,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        };

        setUploadedPhotos((prev) => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    e.target.value = '';
  };

  const removePhoto = (photoId: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const updatePhotoMeta = (photoId: string, fields: Partial<FieldPhoto>) => {
    setUploadedPhotos((prev) => prev.map((p) => p.id === photoId ? { ...p, ...fields } : p));
  };

  // Open Unified Modal and reset
  const handleOpenModal = (defaultType: ActionOrCommType = 'FIELD_VISIT') => {
    const validCaseId = (store.cases || []).some((c) => c.id === selectedCaseId)
      ? selectedCaseId
      : activeCases[0]?.id || store.cases[0]?.id || '';
    setSelectedCaseId(validCaseId);

    const validPersonnelId = (store.personnel || []).some((p) => p.id === personnelId)
      ? personnelId
      : store.personnel?.[0]?.id || '';
    setPersonnelId(validPersonnelId);

    setInteractionType(defaultType);
    setReportSummary('');
    setFollowUpAction('');
    setNextFollowUpDate('');
    setHasPayment(false);
    setPaymentAmount(0);
    setUploadedPhotos([]);
    setReceiptNo(`REC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setShowUnifiedModal(true);
  };

  // Save Unified Record
  const handleSaveUnifiedRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = selectedCase || (store.cases || []).find((c) => c.id === selectedCaseId) || store.cases?.[0];
    if (!targetCase) return;

    const personnel = (store.personnel || []).find((p) => p.id === personnelId);
    const personnelName = personnel?.fullName || personnel?.name || currentUser.name || 'Petugas Control Tower';
    const nowIso = new Date().toISOString();
    const todayDate = nowIso.split('T')[0];

    let newCollections = [...(store.collections || [])];
    let newCommLogs = [...(store.commLogs || [])];

    const isFieldType = ['FIELD_VISIT', 'SURAT_PERINGATAN', 'MEDIATION', 'REPOSSESSION', 'PENAGIHAN_PERORANGAN'].includes(interactionType);
    const isCommType = ['WHATSAPP', 'PHONE', 'MEDIATION', 'SURAT_PERINGATAN'].includes(interactionType);

    // 1. Create Collection Action if field-related or payment received
    if (isFieldType || hasPayment || paymentAmount > 0) {
      let mappedActionType: Collection['actionType'] = 'FIELD_VISIT';
      if (interactionType === 'SURAT_PERINGATAN') mappedActionType = 'SURAT_PERINGATAN';
      if (interactionType === 'MEDIATION') mappedActionType = 'MEDIATION';
      if (interactionType === 'REPOSSESSION') mappedActionType = 'REPOSSESSION_EXECUTED';
      if (targetCase.clientType === 'PERORANGAN' && interactionType === 'PENAGIHAN_PERORANGAN') mappedActionType = 'PENAGIHAN_PERORANGAN';

      const newAction: Collection = {
        id: `COL-${Date.now()}`,
        collectionNo: `COL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        caseId: targetCase.id,
        caseNo: targetCase.caseNo,
        debtorName: targetCase.debtorName,
        clientType: targetCase.clientType || 'MULTIFINANCE',
        clientName: targetCase.clientName,
        actionType: mappedActionType,
        personnelId: personnelId || 'PER-OPS',
        personnelName,
        amountCollected: hasPayment ? Number(paymentAmount) || 0 : 0,
        collectionDate: todayDate,
        paymentMethod: hasPayment ? paymentMethod : 'TRANSFER',
        receiptNo: hasPayment && paymentAmount > 0 ? receiptNo : '-',
        verificationStatus: hasPayment && paymentAmount > 0 ? 'PENDING_VERIFICATION' : 'VERIFIED',
        notes: `[${interactionType}] Pihak: ${contactPerson || 'Debitur'}. ${reportSummary}`,
        photos: uploadedPhotos,
        driveFolderUrl: driveFolderUrl || targetCase.gDriveFolderUrl,
        createdAt: nowIso,
      };

      newCollections = [newAction, ...newCollections];
    }

    // 2. Create Communication Log
    if (isCommType || !isFieldType) {
      let mappedChannel: CommunicationLog['channel'] = 'WHATSAPP';
      if (interactionType === 'PHONE') mappedChannel = 'PHONE';
      if (interactionType === 'FIELD_VISIT') mappedChannel = 'IN_PERSON';
      if (interactionType === 'MEDIATION') mappedChannel = 'IN_PERSON';
      if (interactionType === 'SURAT_PERINGATAN') mappedChannel = 'LETTER';

      let mappedOutcome: CommunicationLog['outcome'] = 'PROMISE_TO_PAY';
      if (outcome === 'MEDIATION_AGREED') mappedOutcome = 'MEDIATION_AGREED';
      if (outcome === 'UNIT_FOUND' || outcome === 'REPOSSESSED') mappedOutcome = 'UNIT_FOUND';
      if (outcome === 'REFUSED') mappedOutcome = 'REFUSED';
      if (outcome === 'UNREACHABLE') mappedOutcome = 'NO_ANSWER';

      const newComm: CommunicationLog = {
        id: `COMM-${Date.now()}`,
        caseId: targetCase.id,
        caseNo: targetCase.caseNo,
        channel: mappedChannel,
        contactPerson: contactPerson || 'Debitur',
        summary: reportSummary || `Tindakan ${interactionType} tercatat oleh ${personnelName}`,
        outcome: mappedOutcome,
        followUpAction: followUpAction || (hasPayment ? `Penerimaan titipan Rp ${(paymentAmount || 0).toLocaleString('id-ID')}` : 'Follow up berkala'),
        nextFollowUpDate: nextFollowUpDate || undefined,
        logDate: nowIso,
        personnelId: personnelId || 'PER-OPS',
        personnelName,
        attachmentDriveUrl: driveFolderUrl || targetCase.gDriveFolderUrl,
        photos: uploadedPhotos,
        recordedBy: currentUser.name || currentUser.username || 'Control Tower User',
        createdAt: nowIso,
      };

      newCommLogs = [newComm, ...newCommLogs];
    }

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Collections_Communications',
      `REC-${Date.now()}`,
      `Recorded ${interactionType} for ${targetCase.caseNo} (${targetCase.debtorName}) - Client: ${targetCase.clientName} (${targetCase.clientType === 'PERORANGAN' ? 'Perorangan' : 'Multifinance'})`
    );

    onUpdateStore({
      ...store,
      collections: newCollections,
      commLogs: newCommLogs,
      auditLogs: [audit, ...(store.auditLogs || [])],
    });

    setShowUnifiedModal(false);
  };

  const handleVerifyCollection = (colId: string) => {
    const colToUpdate = store.collections.find((c) => c.id === colId);
    if (!colToUpdate) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Collections',
      colId,
      `Verified Collection Record ${colToUpdate.collectionNo} (${colToUpdate.debtorName})`
    );

    const updatedCollections = store.collections.map((c) =>
      c.id === colId ? { ...c, verificationStatus: 'VERIFIED' as const } : c
    );

    onUpdateStore({
      ...store,
      collections: updatedCollections,
      auditLogs: [audit, ...(store.auditLogs || [])],
    });
  };

  const handleRejectCollection = (colId: string) => {
    const colToUpdate = store.collections.find((c) => c.id === colId);
    if (!colToUpdate) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Collections',
      colId,
      `Rejected Collection Record ${colToUpdate.collectionNo} (${colToUpdate.debtorName})`
    );

    const updatedCollections = store.collections.map((c) =>
      c.id === colId ? { ...c, verificationStatus: 'REJECTED' as const } : c
    );

    onUpdateStore({
      ...store,
      collections: updatedCollections,
      auditLogs: [audit, ...(store.auditLogs || [])],
    });
  };

  const confirmDeleteCollection = () => {
    if (!collectionToDelete) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Collections',
      collectionToDelete.id,
      `Deleted Collection Record ${collectionToDelete.collectionNo} (${collectionToDelete.debtorName})`
    );

    onUpdateStore({
      ...store,
      collections: (store.collections || []).filter((c) => c.id !== collectionToDelete.id),
      auditLogs: [audit, ...(store.auditLogs || [])],
    });

    setCollectionToDelete(null);
  };

  const confirmDeleteCommLog = () => {
    if (!commLogToDelete) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Comm_Logs',
      commLogToDelete.id,
      `Deleted Communication Log ${commLogToDelete.id} for ${commLogToDelete.caseNo}`
    );

    onUpdateStore({
      ...store,
      commLogs: (store.commLogs || []).filter((l) => l.id !== commLogToDelete.id),
      auditLogs: [audit, ...(store.auditLogs || [])],
    });

    setCommLogToDelete(null);
  };

  // Filtered Collections
  const filteredCollections = store.collections.filter((col) => {
    const parentCase = store.cases.find((c) => c.id === col.caseId || c.caseNo === col.caseNo);
    const cType = col.clientType || parentCase?.clientType || 'MULTIFINANCE';
    
    if (clientFilter === 'MULTIFINANCE' && cType !== 'MULTIFINANCE') return false;
    if (clientFilter === 'PERORANGAN' && cType !== 'PERORANGAN') return false;

    if (searchTerm) {
      const matchText = `${col.collectionNo} ${col.caseNo} ${col.debtorName} ${col.personnelName} ${col.notes} ${col.clientName || ''}`.toLowerCase();
      if (!matchText.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Filtered Comm Logs
  const filteredCommLogs = store.commLogs.filter((log) => {
    const parentCase = store.cases.find((c) => c.id === log.caseId || c.caseNo === log.caseNo);
    const cType = parentCase?.clientType || 'MULTIFINANCE';

    if (clientFilter === 'MULTIFINANCE' && cType !== 'MULTIFINANCE') return false;
    if (clientFilter === 'PERORANGAN' && cType !== 'PERORANGAN') return false;

    if (searchTerm) {
      const matchText = `${log.caseNo} ${log.contactPerson} ${log.personnelName} ${log.summary} ${log.followUpAction} ${parentCase?.debtorName || ''}`.toLowerCase();
      if (!matchText.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Aggregate Photos for Gallery
  const allFieldPhotos: Array<{ 
    photo: FieldPhoto; 
    caseNo: string; 
    debtorName: string; 
    clientName: string; 
    clientType: ClientType; 
    source: 'COLLECTION' | 'COMM_LOG'; 
    date: string 
  }> = [];

  store.collections.forEach((col) => {
    const parentCase = store.cases.find((c) => c.id === col.caseId || c.caseNo === col.caseNo);
    const cType = (col.clientType || parentCase?.clientType || 'MULTIFINANCE') as ClientType;
    if (col.photos && col.photos.length > 0) {
      col.photos.forEach((p) => {
        allFieldPhotos.push({
          photo: p,
          caseNo: col.caseNo,
          debtorName: col.debtorName,
          clientName: col.clientName || parentCase?.clientName || 'Klien',
          clientType: cType,
          source: 'COLLECTION',
          date: col.collectionDate,
        });
      });
    }
  });

  (store.commLogs || []).forEach((log) => {
    const parentCase = (store.cases || []).find((c) => c.id === log.caseId || c.caseNo === log.caseNo);
    const cType = (parentCase?.clientType || 'MULTIFINANCE') as ClientType;
    if (log.photos && log.photos.length > 0) {
      log.photos.forEach((p) => {
        // avoid duplicate photo id
        if (!allFieldPhotos.some((existing) => existing.photo.id === p.id)) {
          allFieldPhotos.push({
            photo: p,
            caseNo: log.caseNo,
            debtorName: parentCase?.debtorName || log.contactPerson || 'Debitur',
            clientName: parentCase?.clientName || 'Klien',
            clientType: cType,
            source: 'COMM_LOG',
            date: formatDateSafe(log.logDate),
          });
        }
      });
    }
  });

  const filteredPhotos = allFieldPhotos.filter((item) => {
    if (clientFilter === 'MULTIFINANCE' && item.clientType !== 'MULTIFINANCE') return false;
    if (clientFilter === 'PERORANGAN' && item.clientType !== 'PERORANGAN') return false;
    if (searchTerm) {
      const match = `${item.caseNo} ${item.debtorName} ${item.clientName} ${item.photo.caption} ${item.photo.category}`.toLowerCase();
      if (!match.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Collections & Communications Log
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Pusat Tindakan Penagihan Lapangan, Log Komunikasi WhatsApp / Panggilan, & Dokumentasi Bukti Foto Kunjungan
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal('FIELD_VISIT')}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-lg transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>recods</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Module Subtabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('FIELD_ACTIONS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'FIELD_ACTIONS'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Field Visits & Collections</span>
            <span className="ml-1 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
              {store.collections.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COMM_LOGS')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'COMM_LOGS'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>WhatsApp & Call Reports</span>
            <span className="ml-1 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
              {store.commLogs.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('PHOTO_GALLERY')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              activeTab === 'PHOTO_GALLERY'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Galeri Foto Lapangan</span>
            <span className="ml-1 px-1.5 py-0.2 bg-black/30 rounded-full text-[10px]">
              {allFieldPhotos.length}
            </span>
          </button>
        </div>

        {/* Client Type Filter & Search Bar */}
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setClientFilter('ALL')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition ${
                clientFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setClientFilter('MULTIFINANCE')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                clientFilter === 'MULTIFINANCE'
                  ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-700'
                  : 'text-slate-400 hover:text-indigo-300'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Multifinance</span>
            </button>
            <button
              onClick={() => setClientFilter('PERORANGAN')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition flex items-center gap-1 ${
                clientFilter === 'PERORANGAN'
                  ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                  : 'text-slate-400 hover:text-amber-300'
              }`}
            >
              <UserCheck className="w-3 h-3" />
              <span>Perorangan</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari kasus, nasabah, hasil..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* TAB 1: FIELD VISITS & COLLECTIONS */}
      {activeTab === 'FIELD_ACTIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">No. Tindakan & Tanggal</th>
                  <th className="py-3 px-4">Kasus & Debitur</th>
                  <th className="py-3 px-4">Kategori Klien</th>
                  <th className="py-3 px-4">Petugas / Mitra</th>
                  <th className="py-3 px-4">Tindakan Lapangan</th>
                  <th className="py-3 px-4 text-right">Titipan Dana (Rp)</th>
                  <th className="py-3 px-4 text-center">Foto Bukti</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCollections.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="py-8 text-center text-slate-500 text-xs">
                      Tidak ada data tindakan lapangan yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredCollections.map((act) => {
                    const isPer = act.clientType === 'PERORANGAN';
                    const photoCount = act.photos?.length || 0;

                    return (
                      <tr key={act.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          <div className="font-bold text-white text-xs">{act.collectionNo}</div>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3" /> {act.collectionDate}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="font-bold text-white">{act.debtorName}</div>
                          <div className="text-[11px] text-slate-400">Ref: {act.caseNo}</div>
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
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
                            {act.clientName || 'Multifinance'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-medium text-slate-200">
                          {act.personnelName}
                        </td>

                        <td className="py-3.5 px-4 space-y-1 max-w-[200px]">
                          <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800 font-semibold inline-block">
                            {act.actionType}
                          </span>
                          <div className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                            {act.notes}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-emerald-400">
                            Rp {(act.amountCollected || 0).toLocaleString('id-ID')}
                          </div>
                          {act.receiptNo && act.receiptNo !== '-' && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Kwitansi: {act.receiptNo}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {photoCount > 0 ? (
                            <button
                              onClick={() => {
                                const p = act.photos![0];
                                setSelectedPhotoPreview({
                                  photo: p,
                                  caseNo: act.caseNo,
                                  debtorName: act.debtorName,
                                  clientName: act.clientName || 'Klien',
                                });
                              }}
                              className="inline-flex items-center gap-1 bg-amber-950 text-amber-300 px-2 py-1 rounded text-[10px] font-semibold border border-amber-800 hover:bg-amber-900 transition"
                            >
                              <Camera className="w-3 h-3" />
                              <span>{photoCount} Foto</span>
                            </button>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
                              act.verificationStatus === 'VERIFIED'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : act.verificationStatus === 'REJECTED'
                                ? 'bg-red-950 text-red-300 border-red-800'
                                : 'bg-amber-950 text-amber-300 border-amber-800'
                            }`}
                          >
                            {act.verificationStatus}
                          </span>
                        </td>

                        {canEdit && (
                          <td className="py-3.5 px-4 text-right space-x-1">
                            {act.verificationStatus === 'PENDING_VERIFICATION' && (
                              <>
                                <button
                                  onClick={() => handleVerifyCollection(act.id)}
                                  className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-950/50 rounded transition"
                                  title="Verifikasi Pembayaran"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleRejectCollection(act.id)}
                                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded transition"
                                  title="Tolak Verifikasi Pembayaran"
                                >
                                  <XIcon className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                            <button
                              onClick={() => setCollectionToDelete(act)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Hapus Catatan Tindakan"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: COMMUNICATION LOGS & WHATSAPP REPORTS */}
      {activeTab === 'COMM_LOGS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Waktu & Kanal</th>
                  <th className="py-3 px-4">Kasus & Debitur</th>
                  <th className="py-3 px-4">Kategori Klien</th>
                  <th className="py-3 px-4">PIC & Kontak</th>
                  <th className="py-3 px-4">Ringkasan Diskusi</th>
                  <th className="py-3 px-4">Hasil / Status</th>
                  <th className="py-3 px-4">Tindak Lanjut</th>
                  <th className="py-3 px-4 text-center">Lampiran & Foto</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCommLogs.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 9 : 8} className="py-8 text-center text-slate-500 text-xs">
                      Tidak ada data log komunikasi yang sesuai filter.
                    </td>
                  </tr>
                ) : (
                  filteredCommLogs.map((log) => {
                    const parentCase = store.cases.find((c) => c.id === log.caseId || c.caseNo === log.caseNo);
                    const isPer = parentCase?.clientType === 'PERORANGAN';
                    const photoCount = log.photos?.length || 0;

                    return (
                      <tr key={log.id} className="hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4 font-mono text-slate-400">
                          <div className="font-semibold text-slate-200">
                            {formatDateSafe(log.logDate)}
                          </div>
                          {formatTimeSafe(log.logDate) && (
                            <div className="text-[10px] text-slate-500">
                              {formatTimeSafe(log.logDate)}
                            </div>
                          )}
                          <span className="bg-emerald-950 text-emerald-300 text-[9px] px-1.5 py-0.5 rounded border border-emerald-800 font-semibold mt-1 inline-flex items-center gap-1">
                            <MessageSquare className="w-2.5 h-2.5" />
                            {log.channel}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="font-bold text-indigo-300">{log.caseNo}</div>
                          <div className="text-[11px] text-white font-medium">{parentCase?.debtorName || '-'}</div>
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
                          <div className="text-[10px] text-slate-400 truncate max-w-[130px] mt-0.5">
                            {parentCase?.clientName || '-'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 space-y-0.5">
                          <div className="font-semibold text-white">{log.personnelName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            👤 {log.contactPerson}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-200 max-w-[260px] leading-relaxed">
                          {log.summary}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="bg-slate-800 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                            {log.outcome}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-300 max-w-[180px]">
                          <div>{log.followUpAction || '-'}</div>
                          {log.nextFollowUpDate && (
                            <div className="text-[10px] text-amber-400 mt-0.5 flex items-center gap-1 font-mono">
                              <Calendar className="w-3 h-3" /> {log.nextFollowUpDate}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {photoCount > 0 && (
                              <button
                                onClick={() => {
                                  const p = log.photos![0];
                                  setSelectedPhotoPreview({
                                    photo: p,
                                    caseNo: log.caseNo,
                                    debtorName: parentCase?.debtorName || log.contactPerson,
                                    clientName: parentCase?.clientName || 'Klien',
                                  });
                                }}
                                className="w-8 h-8 rounded border border-slate-700 overflow-hidden hover:border-amber-500 transition"
                                title="Lihat Foto Bukti"
                              >
                                <img src={log.photos![0].url} alt="Bukti" className="w-full h-full object-cover" />
                              </button>
                            )}

                            {log.attachmentDriveUrl && (
                              <a
                                href={log.attachmentDriveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-400 hover:text-indigo-300 p-1.5 bg-indigo-950/40 rounded border border-indigo-900/50"
                                title="Buka Dokumen Google Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {photoCount === 0 && !log.attachmentDriveUrl && (
                              <span className="text-slate-600 text-[10px]">-</span>
                            )}
                          </div>
                        </td>

                        {canEdit && (
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setCommLogToDelete(log)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Hapus Log Komunikasi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: FIELD PHOTO GALLERY */}
      {activeTab === 'PHOTO_GALLERY' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-8">
                <Camera className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="text-sm font-semibold text-slate-400">Belum Ada Dokumentasi Foto Lapangan</p>
                <p className="text-xs text-slate-500 mt-1">
                  Upload foto saat melakukan Record Collection & Comm Log.
                </p>
              </div>
            ) : (
              filteredPhotos.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedPhotoPreview(item)}
                  className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow group hover:border-indigo-500 transition cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img
                      src={item.photo.url}
                      alt={item.photo.caption}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                    />
                    <div className="absolute top-2 left-2">
                      <span className="bg-black/70 backdrop-blur-sm text-white text-[9px] px-2 py-0.5 rounded border border-white/20 font-semibold uppercase tracking-wider">
                        {(item.photo?.category || 'DOKUMENTASI').replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="absolute top-2 right-2">
                      {item.clientType === 'PERORANGAN' ? (
                        <span className="bg-amber-950/90 text-amber-300 text-[9px] px-1.5 py-0.5 rounded border border-amber-700 font-bold flex items-center gap-1">
                          <UserCheck className="w-2.5 h-2.5" /> Perorangan
                        </span>
                      ) : (
                        <span className="bg-indigo-950/90 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded border border-indigo-700 font-bold flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5" /> Multifinance
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{item.caseNo}</span>
                        <span>{item.date}</span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-1 mt-0.5">{item.debtorName}</h4>
                      <p className="text-[11px] text-slate-300 line-clamp-2 mt-1">{item.photo.caption}</p>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span className="truncate max-w-[140px]">{item.clientName}</span>
                      <span className="text-indigo-400 font-semibold flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> Zoom
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* UNIFIED MODAL: RECORD COLLECTION ACTION & COMMUNICATION LOG */}
      {showUnifiedModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveUnifiedRecord}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl p-6 space-y-5 shadow-2xl my-8 max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  Record Collection Action & Communication Log
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Form Terpadu: Rekam Kunjungan Lapangan, Interaksi WhatsApp / Telepon, dan Penerimaan Titipan Dana
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUnifiedModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Case Selection with Distinction */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pilih Berkas Perkara / Kasus (Scroll down untuk Multifinance & Perorangan) <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
              >
                {(!store.cases || store.cases.length === 0) && (
                  <option value="">-- Belum Ada Berkas Kasus --</option>
                )}

                {multifinanceCases.length > 0 && (
                  <optgroup label="🏢 Klien Multifinance / Lembaga Pembiayaan">
                    {multifinanceCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        [MULTIFINANCE] {c.caseNo || '-'} — {c.debtorName || '-'} ({c.clientName || 'Multifinance'}) - OS: Rp {(c.principalDebtOS || 0).toLocaleString('id-ID')}
                      </option>
                    ))}
                  </optgroup>
                )}

                {peroranganCases.length > 0 && (
                  <optgroup label="👤 Klien Perorangan / Kreditur Individu">
                    {peroranganCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        [PERORANGAN] {c.caseNo || '-'} — {c.debtorName || '-'} (Kreditur: {c.clientName || 'Perorangan'}) - Piutang: Rp {(c.principalDebtOS || 0).toLocaleString('id-ID')}
                      </option>
                    ))}
                  </optgroup>
                )}

                {(store.cases || []).filter(c => !activeCases.some(ac => ac.id === c.id)).length > 0 && (
                  <optgroup label="📁 Berkas Kasus Lainnya">
                    {(store.cases || []).filter(c => !activeCases.some(ac => ac.id === c.id)).map((c) => (
                      <option key={c.id} value={c.id}>
                        [{c.clientType || 'KASUS'}] {c.caseNo || '-'} — {c.debtorName || '-'} ({c.status || '-'})
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            {/* Selected Case Summary Card */}
            {selectedCase && (
              <div
                className={`p-3.5 rounded-xl border text-xs grid grid-cols-1 sm:grid-cols-3 gap-3 ${
                  isPerorangan
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
                }`}
              >
                <div>
                  <span className="text-[10px] text-slate-400 block">Kategori & Klien Pemberi Kuasa</span>
                  <div className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                    {isPerorangan ? (
                      <span className="bg-amber-900 text-amber-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
                        👤 PERORANGAN
                      </span>
                    ) : (
                      <span className="bg-indigo-900 text-indigo-200 text-[10px] px-1.5 py-0.2 rounded font-mono">
                        🏢 MULTIFINANCE
                      </span>
                    )}
                    <span className="truncate">{selectedCase.clientName || 'Klien'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Debitur & Dokumen Perjanjian</span>
                  <div className="font-bold text-white mt-0.5">{selectedCase.debtorName || '-'}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{selectedCase.multifinanceContractNo || selectedCase.contractId || '-'}</div>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Sisa Kewajiban Pokok (OS)</span>
                  <div className="font-bold text-emerald-400 mt-0.5 font-mono">
                    Rp {(selectedCase.principalDebtOS || 0).toLocaleString('id-ID')}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Overdue: {selectedCase.overdueDays || 0} Hari ({selectedCase.dpdBucket || '-'})
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Mode & Interaction Type Visual Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pilih Tipe Aktivitas & Kanal Interaksi <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setInteractionType('FIELD_VISIT')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    interactionType === 'FIELD_VISIT'
                      ? 'bg-indigo-600/25 border-indigo-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <MapPin className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Kunjungan Lapangan</div>
                    <div className="text-[10px] text-slate-400">Field visit domisili debitur</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('WHATSAPP')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    interactionType === 'WHATSAPP'
                      ? 'bg-emerald-600/25 border-emerald-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <MessageSquare className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">WhatsApp & Chat</div>
                    <div className="text-[10px] text-slate-400">Pesan WA / penagihan online</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('PHONE')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    interactionType === 'PHONE'
                      ? 'bg-blue-600/25 border-blue-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <PhoneCall className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Telepon Suara</div>
                    <div className="text-[10px] text-slate-400">Panggilan telepon langsung</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('MEDIATION')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    interactionType === 'MEDIATION'
                      ? 'bg-purple-600/25 border-purple-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Mediasi Kantor</div>
                    <div className="text-[10px] text-slate-400">Musyawarah komitmen pembayaran</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('SURAT_PERINGATAN')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    interactionType === 'SURAT_PERINGATAN'
                      ? 'bg-amber-600/25 border-amber-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Penyampaian SP / SPH</div>
                    <div className="text-[10px] text-slate-400">Surat peringatan / somasi</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInteractionType('REPOSSESSION')}
                  className={`p-2.5 rounded-lg border text-left flex items-start gap-2.5 transition ${
                    interactionType === 'REPOSSESSION'
                      ? 'bg-rose-600/25 border-rose-500 text-white shadow'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <Car className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs font-bold">Eksekusi Unit</div>
                    <div className="text-[10px] text-slate-400">Penarikan aset jaminan</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 3: Personnel & Contacted Person */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Petugas / Mitra Lapangan / PIC <span className="text-red-400">*</span>
                </label>
                <select
                  value={personnelId}
                  onChange={(e) => setPersonnelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {(store.personnel || []).map((p) => {
                    const roleLabel = p.position || (p.type ? p.type.replace(/_/g, ' ') : 'Petugas Lapangan');
                    return (
                      <option key={p.id} value={p.id}>
                        {p.fullName || 'Petugas'} ({roleLabel})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Pihak yang Ditemui / Dihubungi <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Contoh: Hendra Wijaya (Debitur Langsung) / Istri Debitur"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Step 4: Outcome & Follow-Up Plan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Hasil Tindakan / Outcome <span className="text-red-400">*</span>
                </label>
                <select
                  value={outcome}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setOutcome(val);
                    if (val === 'DEPOSIT_PAID') {
                      setHasPayment(true);
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-medium"
                >
                  <option value="PROMISE_TO_PAY">Janji Bayar (Promise to Pay)</option>
                  <option value="DEPOSIT_PAID">Pembayaran Titipan / Pelunasan</option>
                  <option value="MEDIATION_AGREED">Sepakat Mediasi Kantor</option>
                  <option value="UNIT_FOUND">Unit Ditemukan / Teridentifikasi</option>
                  <option value="REPOSSESSED">Unit Berhasil Ditarik / Diserahterimakan</option>
                  <option value="UNREACHABLE">Debitur Tidak di Rumah / Nomor Tidak Aktif</option>
                  <option value="REFUSED">Menolak Bayar / Tidak Kooperatif</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Tindak Lanjut / Action Plan
                </label>
                <input
                  type="text"
                  value={followUpAction}
                  onChange={(e) => setFollowUpAction(e.target.value)}
                  placeholder="Contoh: Kunjungan ulang / Monitoring transfer..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Target Tanggal Janji Bayar / Next Action
                </label>
                <input
                  type="date"
                  value={nextFollowUpDate}
                  onChange={(e) => setNextFollowUpDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            {/* Step 5: Report Summary */}
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Laporan Rinci Pembicaraan & Situasi Lapangan <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={reportSummary}
                onChange={(e) => setReportSummary(e.target.value)}
                placeholder="Jelaskan detail situasi debitur, respon keluarga, hasil negosiasi nominal komitmen, kendala, atau hasil pengecekan unit..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>

            {/* Step 6: Payment Details (Collapsible / Checkbox) */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasPayment}
                    onChange={(e) => setHasPayment(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-900 border-slate-700"
                  />
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-400" />
                    Ada Penerimaan Titipan Dana / Pembayaran dari Debitur
                  </span>
                </label>

                {hasPayment && (
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800">
                    Auto Record ke Modul Collection
                  </span>
                )}
              </div>

              {hasPayment && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Nominal Pembayaran (Rp) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(Number(e.target.value))}
                      placeholder="e.g. 5000000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-emerald-300 font-bold font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Metode Penerimaan</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    >
                      <option value="TRANSFER">Transfer Bank / Virtual Account</option>
                      <option value="CASH_RECEIPT">Kwitansi Tunai Lapangan</option>
                      <option value="MEDIATION_ESCROW">Rekening Escrow Mediasi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">No. Kwitansi / Tanda Terima</label>
                    <input
                      type="text"
                      value={receiptNo}
                      onChange={(e) => setReceiptNo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Step 7: Multiple Photo Uploads & Google Drive Link */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-amber-400" />
                    Dokumentasi Foto Bukti (Multi-Upload)
                  </span>
                  <p className="text-[10px] text-slate-400">
                    Foto rumah, foto pertemuan, unit kendaraan, kwitansi, atau screenshot chat WhatsApp
                  </p>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/40 text-xs px-3 py-1.5 rounded-lg transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>+ Pilih Foto Bukti</span>
                </button>
              </div>

              {/* Photo Thumbnails and Metadata Editor */}
              {uploadedPhotos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {uploadedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-2 flex gap-2 items-start relative group"
                    >
                      <img
                        src={photo.url}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-md border border-slate-700 shrink-0"
                      />

                      <div className="flex-1 min-w-0 space-y-1">
                        <select
                          value={photo.category}
                          onChange={(e) =>
                            updatePhotoMeta(photo.id, { category: e.target.value as any })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-amber-300 font-semibold"
                        >
                          <option value="RUMAH_DEBITUR">Rumah Debitur</option>
                          <option value="TEMU_DEBITUR">Pertemuan Debitur</option>
                          <option value="UNIT_KENDARAAN">Unit Kendaraan / Aset</option>
                          <option value="SURAT_BERITA_ACARA">Surat Berita Acara / SP</option>
                          <option value="KWITANSI_BAYAR">Kwitansi Tanda Terima</option>
                          <option value="LOKASI_KANTOR">Lokasi Mediasi Kantor</option>
                          <option value="LAINNYA">Screenshot Chat WA / Lainnya</option>
                        </select>

                        <input
                          type="text"
                          value={photo.caption}
                          onChange={(e) =>
                            updatePhotoMeta(photo.id, { caption: e.target.value })
                          }
                          placeholder="Keterangan foto..."
                          className="w-full bg-slate-950 border border-slate-800 rounded p-1 text-[10px] text-slate-200"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        className="text-red-400 hover:text-red-300 p-1 bg-red-950/50 rounded border border-red-800/60 transition"
                        title="Hapus foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-800 hover:border-slate-700 rounded-lg p-4 text-center cursor-pointer transition"
                >
                  <Camera className="w-6 h-6 mx-auto text-slate-600 mb-1" />
                  <p className="text-[11px] text-slate-400">Klik di sini untuk upload foto dokumentasi lapangan</p>
                  <p className="text-[10px] text-slate-600">Mendukung format JPG, PNG, WEBP (Bisa multi-select)</p>
                </div>
              )}

              {/* Google Drive Link */}
              <div className="pt-2">
                <label className="block text-[11px] text-slate-400 mb-1">
                  Link Google Drive Folder / Dokumen Tambahan (Opsional)
                </label>
                <input
                  type="url"
                  value={driveFolderUrl}
                  onChange={(e) => setDriveFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono placeholder-slate-600"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowUnifiedModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan Laporan & Sinkronisasi</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FULL PHOTO PREVIEW MODAL */}
      {selectedPhotoPreview && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-300">
                    {selectedPhotoPreview.caseNo}
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-bold text-white">
                    {selectedPhotoPreview.debtorName}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Klien: {selectedPhotoPreview.clientName}
                </div>
              </div>

              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 flex items-center justify-center p-4 max-h-[60vh] overflow-hidden">
              <img
                src={selectedPhotoPreview.photo.url}
                alt={selectedPhotoPreview.photo.caption}
                className="max-h-[55vh] w-auto max-w-full object-contain rounded-lg shadow-lg border border-slate-800"
              />
            </div>

            <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800 font-bold uppercase">
                    {(selectedPhotoPreview.photo?.category || 'DOKUMENTASI').replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    Waktu: {selectedPhotoPreview.photo?.timestamp || '-'}
                  </span>
                </div>
                <p className="text-slate-200 mt-1 font-medium">{selectedPhotoPreview.photo.caption}</p>
              </div>

              <a
                href={selectedPhotoPreview.photo.url}
                download={`Bukti-Foto-${selectedPhotoPreview.caseNo}.jpg`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition self-end sm:self-auto shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Ukuran Penuh</span>
              </a>
            </div>
          </div>
        </div>
      )}
      {/* Delete Collection Confirmation Modal */}
      {collectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Catatan Tindakan</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">No Tindakan:</span>
                <span className="font-mono font-bold text-white">{collectionToDelete.collectionNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Debitur:</span>
                <span className="font-semibold text-white">{collectionToDelete.debtorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Jenis:</span>
                <span className="text-indigo-400">{collectionToDelete.actionType}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus log tindakan penagihan ini? Penghapusan akan dicatat pada log audit sistem.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCollectionToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteCollection}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Comm Log Confirmation Modal */}
      {commLogToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Log Komunikasi</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Kasus:</span>
                <span className="font-mono font-bold text-white">{commLogToDelete.caseNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kontak:</span>
                <span className="font-semibold text-white">{commLogToDelete.contactPerson || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Media:</span>
                <span className="text-indigo-400">{commLogToDelete.channel}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus log komunikasi ini? Penghapusan akan dicatat pada log audit sistem.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCommLogToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteCommLog}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
