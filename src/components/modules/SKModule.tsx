import React, { useState, useEffect } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, SK, ApprovalRequest } from '../../types/arms';
import { 
  FileText, Plus, ExternalLink, HardDrive, UserCheck, 
  Building2, User as UserIcon, Search, Edit2, Trash2, 
  Link2, Check, Copy, Calendar, DollarSign, 
  Car, ShieldCheck, CheckCircle2, X, AlertCircle, FolderOpen, Eye, Lock
} from 'lucide-react';
import DriveFilePreview from '../common/DriveFilePreview';
import { angkaKeTerbilang } from '../../utils/terbilang';
import { GoogleDriveFolderPicker } from '../common/GoogleDriveFolderPicker';
import { QuickGDriveModal } from '../common/QuickGDriveModal';
import { LetterPreviewModal, LetterPreviewData } from '../common/LetterPreviewModal';
import { ROOT_GDRIVE_URL } from '../../data/initialData';

interface SKModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const SKModule: React.FC<SKModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [clientTypeFilter, setClientTypeFilter] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Preview Modal state
  const [previewData, setPreviewData] = useState<LetterPreviewData | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Quick GDrive Link Modal state
  const [quickDriveModal, setQuickDriveModal] = useState<{
    isOpen: boolean;
    skId: string;
    skNumber: string;
    debtorName: string;
    url: string;
    folderId?: string;
  }>({
    isOpen: false,
    skId: '',
    skNumber: '',
    debtorName: '',
    url: '',
    folderId: '',
  });

  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  
  // Form State
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [driveFolderUrl, setDriveFolderUrl] = useState('');
  
  // Corporate / Multifinance Parameters
  const [companyName, setCompanyName] = useState(store.settings?.companyName || 'PT. MITRAJASA SATRIA INDONESIA');
  const [companyAddress, setCompanyAddress] = useState(store.settings?.companyAddress || 'JL. Menteri Supeno No. 07, Sokaraja Tengah, Banyumas, Jawa Tengah 53181');
  const [repName, setRepName] = useState('Irvan Indralaksana');
  const [repTitle, setRepTitle] = useState('Direktur Utama');
  const [city, setCity] = useState('Banyumas');
  
  // Perorangan (Individual Creditor) Parameters
  const [pemberiKuasaType, setPemberiKuasaType] = useState<'PERUSAHAAN' | 'KREDITUR_PERORANGAN'>('PERUSAHAAN');
  const [krediturName, setKrediturName] = useState('');
  const [krediturNik, setKrediturNik] = useState('');
  const [krediturAddress, setKrediturAddress] = useState('');
  const [krediturJob, setKrediturJob] = useState('Wiraswasta / Kreditur Perorangan');

  const [dasarPenagihan, setDasarPenagihan] = useState('');
  const [customNominal, setCustomNominal] = useState<number>(0);
  
  // Local states for Debtor & Vehicle details in the SK Form
  const [skContractNo, setSkContractNo] = useState('');
  const [skDebtorName, setSkDebtorName] = useState('');
  const [skDebtorAddress, setSkDebtorAddress] = useState('');
  const [skDueDate, setSkDueDate] = useState('');
  const [skInstallment, setSkInstallment] = useState('');
  const [skPenalty, setSkPenalty] = useState('');
  const [skPhone, setSkPhone] = useState('');
  const [skVehicleMerk, setSkVehicleMerk] = useState('');
  const [skVehiclePoliceNo, setSkVehiclePoliceNo] = useState('');

  const [draftContent, setDraftContent] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [showClauseDetails, setShowClauseDetails] = useState(false);

  // Attachment preview/upload states
  const [selectedAttachmentPreview, setSelectedAttachmentPreview] = useState<{ src: string; index: number } | null>(null);
  const [isUploadingAttachmentPreview, setIsUploadingAttachmentPreview] = useState(false);

  // Generator-surat integration popup/modal state
  const [showGeneratorPopup, setShowGeneratorPopup] = useState(false);
  const [isSyncingGenerator, setIsSyncingGenerator] = useState(false);
  const [generatorIssueUrl, setGeneratorIssueUrl] = useState<string | null>(null);
  const [generatorError, setGeneratorError] = useState<string | null>(null);

  const handleAddAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachments(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  // helper to upload first attachment if it is a data URL and return webViewLink
  const uploadFirstAttachmentIfNeeded = async () => {
    if (!attachments || attachments.length === 0) return null;
    const first = attachments[0];
    if (typeof first === 'string' && first.startsWith('data:')) {
      try {
        const match = first.match(/^data:(.+);base64,(.*)$/);
        const mime = match ? match[1] : 'application/pdf';
        const ext = mime.split('/')?.[1] || 'pdf';
        const fileName = `SK_${skNumberDraft || 'doc'}_${Date.now().toString().slice(-6)}.${ext}`;
        const extractFolderIdFromUrl = (u?: string) => {
          if (!u) return undefined;
          const m = u.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
          if (m) return m[1];
          const m2 = u.match(/folders\/([a-zA-Z0-9_-]+)/);
          if (m2) return m2[1];
          return undefined;
        };
        const folderIdToUse = selectedCase?.gDriveFolderId || extractFolderIdFromUrl(selectedCase?.gDriveFolderUrl) || store.settings?.googleDriveFolderId;

        const resp = await fetch('/api/drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, mimeType: mime, base64: first, folderId: folderIdToUse }),
        });
        const j = await resp.json();
        if (j && j.success) return j;
      } catch (err) {
        console.error('Attachment upload failed', err);
      }
    }
    return null;
  };

  // Sync selected SK / Debtor & Personnel to generator-surat- repository by creating a GitHub issue
  const syncToGeneratorRepo = async (options?: { skNumber?: string; skId?: string }) => {
    try {
      setIsSyncingGenerator(true);
      setGeneratorError(null);
      setGeneratorIssueUrl(null);

      const payload = {
        skNumber: options?.skNumber || skNumberDraft,
        skId: options?.skId || (isEditing ? editId : undefined),
        debtor: selectedCase || null,
        personnel: selectedPersonnel || null,
        driveDocumentUrl: driveDocumentUrl || null,
      };

      const resp = await fetch('/api/surat/open-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const j = await resp.json();
      if (!resp.ok) {
        setGeneratorError(j?.error || 'Failed creating generator link');
      } else {
        // j.url contains the generator app link with encoded payload
        setGeneratorIssueUrl(j.url || null);
        try {
          if (j.url) window.open(j.url, '_blank');
        } catch (err) {
          // ignore popup blocker
        }
      }
    } catch (err: any) {
      console.error('Sync to generator repo failed', err);
      setGeneratorError(err?.message || String(err));
    } finally {
      setIsSyncingGenerator(false);
    }
  };

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedCase = (store.cases || []).find((cs) => cs.id === caseId) || store.cases?.[0];
  const selectedPersonnel = (store.personnel || []).find((pr) => pr.id === personnelId) || store.personnel?.[0];
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';

  // When selected case changes, auto sync defaults for Perorangan or Multifinance
  useEffect(() => {
    if (selectedCase) {
      const client = (store.clients || []).find(
        (cl) => cl.id === selectedCase.clientId || cl.companyName === selectedCase.clientName
      );

      if (selectedCase.clientType === 'PERORANGAN') {
        setPemberiKuasaType('KREDITUR_PERORANGAN');
        const kName = client?.contactPerson || client?.companyName?.replace(/\s*\(.*?\)\s*/g, '') || selectedCase.clientName?.replace(/\s*\(.*?\)\s*/g, '') || 'H. Rahmat Hidayat, S.E.';
        const kNik = client?.nikKtp || '3302101506780002';
        const kAddr = client?.address || 'Jl. Overste Isdiman No. 88, Purwokerto Lor, Banyumas';
        setKrediturName(kName);
        setKrediturNik(kNik);
        setKrediturAddress(kAddr);
        setKrediturJob('Wiraswasta / Kreditur Pribadi');
        setDasarPenagihan(`Surat Pengakuan Hutang (SPH) No. ${selectedCase.contractId || selectedCase.multifinanceContractNo || 'SPH-2026/001'} / Kwitansi Pinjaman Tertanggal 15 Januari 2025`);
      } else {
        setPemberiKuasaType('PERUSAHAAN');
        setDasarPenagihan(`Perjanjian Pembiayaan Konsumen No. ${selectedCase.multifinanceContractNo || selectedCase.contractId || 'ADR-90123847'} / Sertifikat Jaminan Fidusia`);
      }
      setCustomNominal(selectedCase.principalDebtOS || 0);

      const customer = (store.customers || []).find((c) => c.id === selectedCase.customerId);
      setSkContractNo(customer?.contractNo || selectedCase.contractId || selectedCase.multifinanceContractNo || '');
      setSkDebtorName(selectedCase.debtorName || '');
      setSkDebtorAddress(customer?.addressCurrent || customer?.addressKtp || selectedCase.debtorAddress || '');
      setSkDueDate(customer?.dueDate || '');
      setSkInstallment(customer?.installmentAmount || '');
      setSkPenalty(customer?.penaltyAmount || '');
      setSkPhone(customer?.phone || selectedCase.debtorPhone || '');
      setSkVehicleMerk(customer?.vehicleMerkType || '');
      setSkVehiclePoliceNo(customer?.vehiclePoliceNo || '');
    }
  }, [selectedCase, store.clients, store.customers]);

  const skNumberDraft = selectedCase
    ? selectedCase.clientType === 'PERORANGAN'
      ? `ST-DC/MJI-IND/${selectedCase.caseNo}/2026`
      : `ST-DC/MJI-${selectedCase.caseNo}/2026`
    : `ST-DC/MJI-OPS/2026/001`;
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 3);
  const endDateStr = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Update text draft whenever parameters change
  useEffect(() => {
    if (selectedCase && selectedPersonnel) {
      const nominalVal = customNominal > 0 ? customNominal : selectedCase.principalDebtOS || 0;
      const terbilangStr = angkaKeTerbilang(nominalVal);
      const customer = (store.customers || []).find((c) => c.id === selectedCase.customerId);
      const debtorAddr = customer?.addressCurrent || customer?.addressKtp || selectedCase.debtorAddress || 'JL. Ahmad Yani No. 45, Purwokerto';
      const employeeJob = selectedPersonnel.position || (selectedPersonnel.type ? selectedPersonnel.type.replace('_', ' ') : 'Kuasa Lapangan & Mediasi');
      const employeeNik = selectedPersonnel.nikKtp || '3302101234560001';
      const employeeId = selectedPersonnel.id || 'PER-001';

      if (pemberiKuasaType === 'KREDITUR_PERORANGAN' || selectedCase.clientType === 'PERORANGAN') {
        const text = `SURAT TUGAS PENAGIHAN PIUTANG PERSEORANGAN
No. Surat: ${skNumberDraft}

Yang bertanda tangan di bawah ini:
Nama Lengkap      : ${krediturName || selectedCase.clientName}
NIK / No. KTP     : ${krediturNik || '3302101506780002'}
Pekerjaan         : ${krediturJob}
Alamat Domisili   : ${krediturAddress || 'Alamat Domisili Kreditur'}
Dalam hal ini bertindak selaku Kreditur / Pemilik Piutang Sah yang sah, selanjutnya disebut sebagai PEMBERI TUGAS.

Dengan ini memberikan tugas penuh, wewenang, dan tanggung jawab penagihan di lapangan kepada :
Nama Karyawan     : ${selectedPersonnel.fullName}
NIK               : ${employeeNik}
Jabatan           : ${employeeJob}
Yang selanjutnya disebut sebagai PENERIMA TUGAS.

KHUSUS
Untuk dan atas nama Pemberi Tugas, melakukan tindakan penagihan, mediasi, musyawarah kekeluargaan, penerimaan pembayaran/titipan, serta penyelesaian transaksi piutang perseorangan kepada:
Nama Debitur      : ${skDebtorName || selectedCase.debtorName}
NIK Debitur       : ${selectedCase.debtorNik || '-'}
Alamat Debitur    : ${skDebtorAddress || debtorAddr}
Jumlah Piutang    : Rp${nominalVal.toLocaleString('id-ID')} (${terbilangStr})
Dasar Penagihan   : ${dasarPenagihan}

MASA BERLAKU SURAT TUGAS: ${todayStr} s/d ${endDateStr}`;

        setDraftContent(text);
      } else {
        const text = `SURAT TUGAS 
Nomor: ST-DC/MJI/2026/08/${skNumberDraft.split('/').pop() || '0483'}

Yang bertanda tangan di bawah ini, mewakili Manajemen PT MITRA JASATRIA INDONESIA:
Nama        : ${repName.toUpperCase()}
Jabatan     : ${repTitle.toUpperCase()}

Dengan ini memberikan tugas penuh, wewenang, dan tanggung jawab penagihan di lapangan kepada :
Nama        : ${selectedPersonnel.fullName.toUpperCase()}
NIK         : ${employeeNik}
Jabatan     : ${employeeJob}

Dan rekan
Untuk melakukan konfirmasi, penagihan, dan negosiasi penyelesaian kewajiban pembayaran atas nama Debitur/Nasabah dari ${selectedCase.clientName} yang penagihannya dikuasakan kepada PT Mitra Jasatria Indonesia.

Data Nasabah:
No. Kontrak : ${skContractNo || customer?.contractNo || selectedCase.contractId || selectedCase.multifinanceContractNo || '-'}
Nama        : ${skDebtorName ? skDebtorName.toUpperCase() : selectedCase.debtorName.toUpperCase()}
Alamat      : ${skDebtorAddress || debtorAddr || '-'}
Jatuh Tempo : ${skDueDate || customer?.dueDate || '-'}
Angsuran    : ${skInstallment || customer?.installmentAmount || '-'}
Denda       : Rp ${skPenalty || customer?.penaltyAmount || '-'}
Handphone   : ${skPhone || customer?.phone || '-'}

Spesifikasi Kendaraan:
Merk/Type   : ${skVehicleMerk || customer?.vehicleMerkType || '-'}
No. Polisi  : ${skVehiclePoliceNo || customer?.vehiclePoliceNo || '-'}

MASA BERLAKU: ${todayStr} s/d ${endDateStr}`;

        setDraftContent(text);
      }
    }
  }, [
    selectedCase,
    selectedPersonnel,
    companyName,
    companyAddress,
    repName,
    repTitle,
    city,
    pemberiKuasaType,
    krediturName,
    krediturNik,
    krediturAddress,
    krediturJob,
    dasarPenagihan,
    customNominal,
    skNumberDraft,
    todayStr,
    endDateStr,
    store.customers,
    skContractNo,
    skDebtorName,
    skDebtorAddress,
    skDueDate,
    skInstallment,
    skPenalty,
    skPhone,
    skVehicleMerk,
    skVehiclePoliceNo
  ]);

  const handleCreateSK = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !selectedPersonnel) return;

    const skNumber = skNumberDraft;
    const isPer = selectedCase.clientType === 'PERORANGAN';

    if (isEditing && editId) {
      const updatedSKs = store.sks.map(sk => {
        if (sk.id === editId) {
          return {
            ...sk,
            skNumber,
            caseId: selectedCase.id,
            caseNo: selectedCase.caseNo,
            debtorName: selectedCase.debtorName,
            clientType: selectedCase.clientType || 'MULTIFINANCE',
            clientName: selectedCase.clientName,
            pemberiKuasaType: isPer ? pemberiKuasaType : 'PERUSAHAAN',
            krediturName: isPer ? (krediturName || selectedCase.clientName) : undefined,
            krediturNik: isPer ? krediturNik : undefined,
            krediturAddress: isPer ? krediturAddress : undefined,
            personnelId: selectedPersonnel.id,
            personnelName: selectedPersonnel.fullName,
            driveDocumentUrl: driveDocumentUrl.trim() || undefined,
          };
        }
        return sk;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'SK',
        editId,
        `Updated Surat Tugas / Kuasa ${skNumber} (${isPer ? 'Perorangan: ' + selectedCase.clientName : 'Multifinance'})`
      );

      onUpdateStore({
        ...store,
        sks: updatedSKs,
        auditLogs: [audit, ...(store.auditLogs || [])],
      });
    } else {
      // If attachments include a data URL, upload first attachment and use as driveDocumentUrl
      try {
        const uploaded = await uploadFirstAttachmentIfNeeded();
        if (uploaded && uploaded.success) {
          const newDocUrl = uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.fileId}/view?usp=sharing`;
          setDriveDocumentUrl(newDocUrl);
          if (!driveFolderId) setDriveFolderId(store.settings?.googleDriveFolderId || '');
          if (!driveFolderUrl) setDriveFolderUrl(store.settings?.googleDriveFolderUrl || '');
        }
      } catch (err) {
        console.error('Attachment upload step failed', err);
      }

      const newSK: SK = {
        id: `SK-${Date.now()}`,
        skNumber,
        caseId: selectedCase.id,
        caseNo: selectedCase.caseNo,
        debtorName: selectedCase.debtorName,
        clientType: selectedCase.clientType || 'MULTIFINANCE',
        clientName: selectedCase.clientName,
        pemberiKuasaType: isPer ? pemberiKuasaType : 'PERUSAHAAN',
        krediturName: isPer ? (krediturName || selectedCase.clientName) : undefined,
        krediturNik: isPer ? krediturNik : undefined,
        krediturAddress: isPer ? krediturAddress : undefined,
        personnelId: selectedPersonnel.id,
        personnelName: selectedPersonnel.fullName,
        issuedDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
        status: 'PENDING_APPROVAL',
        driveDocumentUrl: driveDocumentUrl.trim() || undefined,
        driveFolderId: driveFolderId || undefined,
        driveFolderUrl: driveFolderUrl || undefined,
        createdAt: new Date().toISOString(),
      };

      const approvalReq: ApprovalRequest = {
        id: `APP-SK-${Date.now()}`,
        requestNo: `REQ-SK-${Math.floor(100 + Math.random() * 900)}`,
        module: 'SK',
        targetId: newSK.id,
        targetReference: skNumber,
        title: `Penerbitan Surat Tugas / Kuasa ${skNumber} (${isPer ? 'Klien Perorangan' : 'Klien Multifinance'})`,
        requestedBy: currentUser.name,
        description: `Surat Tugas / Kuasa penagihan piutang ${isPer ? 'perorangan' : 'multifinance'} untuk kasus ${selectedCase.caseNo} (${selectedCase.debtorName}) - Klien: ${selectedCase.clientName}`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'SK',
        newSK.id,
        `Generated Surat Tugas / Kuasa ${skNumber} (${isPer ? 'Perorangan: ' + selectedCase.clientName : 'Multifinance'})`
      );

      onUpdateStore({
        ...store,
        sks: [newSK, ...(store.sks || [])],
        approvals: [approvalReq, ...(store.approvals || [])],
        auditLogs: [audit, ...(store.auditLogs || [])],
      });
    }

    setShowModal(false);
  };

  const handleDeleteSK = (id: string, skNo: string) => {
    if (!window.confirm(`Yakin ingin menghapus dokumen "${skNo}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'SK',
      id,
      `Deleted SK ${skNo}`
    );

    onUpdateStore({
      ...store,
      sks: (store.sks || []).filter(s => s.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleOpenForExistingSK = (sk: SK) => {
    setCaseId(sk.caseId);
    setPartnerId(sk.personnelId);
    setDriveDocumentUrl(sk.driveDocumentUrl || '');
    setDriveFolderId(sk.driveFolderId || '');
    setDriveFolderUrl(sk.driveFolderUrl || '');
    if (sk.clientType === 'PERORANGAN' || sk.pemberiKuasaType === 'KREDITUR_PERORANGAN') {
      setPemberiKuasaType('KREDITUR_PERORANGAN');
      if (sk.krediturName) setKrediturName(sk.krediturName);
      if (sk.krediturNik) setKrediturNik(sk.krediturNik);
      if (sk.krediturAddress) setKrediturAddress(sk.krediturAddress);
    } else {
      setPemberiKuasaType('PERUSAHAAN');
    }
    setIsEditing(true);
    setEditId(sk.id);
    setShowModal(true);
  };

  const handleOpenCreateModal = () => {
    if (store.cases && store.cases.length > 0 && !caseId) {
      setCaseId(store.cases[0].id);
    }
    setIsEditing(false);
    setEditId(null);
    setDriveDocumentUrl('');
    setDriveFolderId('');
    setDriveFolderUrl('');
    setShowModal(true);
  };

  const handleSaveQuickDriveUrl = (savedUrl: string, savedFolderId?: string, savedFolderUrl?: string) => {
    if (!quickDriveModal.skId) return;

    const updatedSKs = store.sks.map(sk => {
      if (sk.id === quickDriveModal.skId) {
        return {
          ...sk,
          driveDocumentUrl: savedUrl.trim() || undefined,
          driveFolderId: savedFolderId || sk.driveFolderId,
          driveFolderUrl: savedFolderUrl || sk.driveFolderUrl,
        };
      }
      return sk;
    });

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'SK',
      quickDriveModal.skId,
      `Updated Link Google Drive for SK ${quickDriveModal.skNumber}`
    );

    onUpdateStore({
      ...store,
      sks: updatedSKs,
      auditLogs: [audit, ...(store.auditLogs || [])],
    });

    setQuickDriveModal({
      isOpen: false,
      skId: '',
      skNumber: '',
      debtorName: '',
      url: '',
      folderId: '',
    });
  };

  const activeCases = (store.cases || []).filter((c) => {
    if (isEditing && c.id === caseId) return true;
    return c.status !== 'CLOSED';
  });
  const multifinanceCases = activeCases.filter((c) => c.clientType !== 'PERORANGAN');
  const peroranganCases = activeCases.filter((c) => c.clientType === 'PERORANGAN');

  const allSks = store.sks || [];
  const multifinanceSKCount = allSks.filter((s) => {
    const parentCase = (store.cases || []).find((c) => c.id === s.caseId);
    return (s.clientType === 'MULTIFINANCE' || (!s.clientType && parentCase?.clientType !== 'PERORANGAN'));
  }).length;

  const peroranganSKCount = allSks.filter((s) => {
    const parentCase = (store.cases || []).find((c) => c.id === s.caseId);
    return s.clientType === 'PERORANGAN' || parentCase?.clientType === 'PERORANGAN';
  }).length;

  const filteredSKs = allSks.filter((sk) => {
    const parentCase = (store.cases || []).find((c) => c.id === sk.caseId);
    const cType = sk.clientType || parentCase?.clientType || 'MULTIFINANCE';
    if (clientTypeFilter === 'MULTIFINANCE' && cType !== 'MULTIFINANCE') return false;
    if (clientTypeFilter === 'PERORANGAN' && cType !== 'PERORANGAN') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = `${sk.skNumber} ${sk.debtorName} ${sk.caseNo} ${sk.personnelName} ${sk.clientName || parentCase?.clientName || ''} ${sk.driveDocumentUrl || ''}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Surat Kuasa & Surat Tugas Penagihan
            </h2>
            <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800 font-semibold">
              Multifinance & Perorangan
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Penerbitan surat tugas resmi, pengelolaan parameter penagihan, serta tautan arsip digital Google Drive
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Surat Tugas Baru</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Client Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
          <button
            onClick={() => setClientTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              clientTypeFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Dokumen ({allSks.length})
          </button>

          <button
            onClick={() => setClientTypeFilter('MULTIFINANCE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              clientTypeFilter === 'MULTIFINANCE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Multifinance ({multifinanceSKCount})</span>
          </button>

          <button
            onClick={() => setClientTypeFilter('PERORANGAN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              clientTypeFilter === 'PERORANGAN'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-200 font-semibold">Perorangan ({peroranganSKCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nomor surat, debitur, kreditur, gdrive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* List of Issued SK */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Daftar Surat Tugas / Kuasa Diterbitkan</h3>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
              Menampilkan {filteredSKs.length} dokumen
            </span>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tersinkronisasi Link Google Drive</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Nomor Surat</th>
                <th className="p-3.5">Klien / Pemberi Tugas</th>
                <th className="p-3.5">Kasus / Debitur</th>
                <th className="p-3.5">Penerima Tugas</th>
                <th className="p-3.5">Tgl Terbit & Masa Berlaku</th>
                <th className="p-3.5">Link Google Drive</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSKs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-500 italic">
                    Belum ada data Surat Tugas / Kuasa sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSKs.map((sk) => {
                  const parentCase = (store.cases || []).find((c) => c.id === sk.caseId);
                  const isPer = sk.clientType === 'PERORANGAN' || parentCase?.clientType === 'PERORANGAN';
                  const cName = sk.krediturName || sk.clientName || parentCase?.clientName || 'Klien';
                  const hasDriveUrl = !!sk.driveDocumentUrl && sk.driveDocumentUrl.trim().length > 0;

                  return (
                    <tr key={sk.id} className="hover:bg-slate-800/40 transition">
                      {/* Nomor Surat */}
                      <td className="p-3.5 font-mono font-medium text-white">
                        <div className="font-bold text-indigo-300">{sk.skNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Ref: {sk.caseNo}</div>
                      </td>

                      {/* Klien / Pemberi Tugas */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isPer ? (
                            <span className="bg-amber-950 text-amber-300 text-[9px] px-1.5 py-0.5 rounded border border-amber-800 font-bold inline-flex items-center gap-1">
                              <UserIcon className="w-2.5 h-2.5" />
                              PERORANGAN
                            </span>
                          ) : (
                            <span className="bg-indigo-950 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded border border-indigo-800 font-bold inline-flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />
                              MULTIFINANCE
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-200 truncate max-w-[180px]">
                          {cName}
                        </div>
                      </td>

                      {/* Debitur & Pokok */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-100">
                          {parentCase?.status === 'CLOSED' ? (
                            <span className="text-slate-400 italic inline-flex items-center gap-1 font-normal text-xs">
                              <Lock className="w-3 h-3 text-slate-400" /> [Kasus Ditutup]
                            </span>
                          ) : (
                            sk.debtorName
                          )}
                        </div>
                        {parentCase && (
                          <div className="text-[10px] text-emerald-400 font-mono">
                            OS: Rp {(parentCase.principalDebtOS || 0).toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      {/* Penerima Tugas */}
                      <td className="p-3.5 font-medium text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{sk.personnelName}</span>
                        </div>
                      </td>

                      {/* Tanggal */}
                      <td className="p-3.5 text-slate-400">
                        <div>Terbit: <span className="text-slate-200 font-mono">{sk.issuedDate}</span></div>
                        <div className="text-[10px] text-slate-500">Exp: <span className="font-mono">{sk.expiryDate}</span></div>
                      </td>

                      {/* Link Google Drive */}
                      <td className="p-3.5">
                        {hasDriveUrl ? (
                          <div className="flex items-center gap-1.5">
                            <a
                              href={sk.driveDocumentUrl}
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
                                navigator.clipboard.writeText(sk.driveDocumentUrl || '');
                                setCopiedUrl(sk.id);
                                setTimeout(() => setCopiedUrl(null), 2000);
                              }}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
                              title="Salin Link Google Drive"
                            >
                              {copiedUrl === sk.id ? (
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
                              skId: sk.id,
                              skNumber: sk.skNumber,
                              debtorName: sk.debtorName,
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

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sk.status === 'ACTIVE' || sk.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : sk.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {sk.status === 'ACTIVE' || sk.status === 'APPROVED'
                            ? 'Disetujui / Aktif'
                            : sk.status === 'PENDING_APPROVAL'
                            ? 'Menunggu Approval'
                            : sk.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setPreviewData({
                                type: 'SK',
                                sk: sk,
                                title: `Surat Tugas & Kuasa - ${sk.skNumber}`,
                                driveUrl: sk.driveDocumentUrl,
                                folderUrl: sk.driveFolderUrl,
                              });
                              setShowPreviewModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-200 rounded border border-indigo-800 text-[11px] font-semibold transition shadow-sm"
                            title="Pratinjau Format Surat Resmi / Cetak"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Preview</span>
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenForExistingSK(sk)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-700 text-[11px] font-medium transition"
                                title="Edit Form Surat"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSK(sk.id, sk.skNumber)}
                                className="p-1.5 hover:bg-red-950/40 rounded text-slate-400 hover:text-red-400 transition"
                                title="Hapus Dokumen"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* QUICK GDRIVE LINK MODAL */}
      <QuickGDriveModal
        isOpen={quickDriveModal.isOpen}
        onClose={() => setQuickDriveModal({ isOpen: false, skId: '', skNumber: '', debtorName: '', url: '', folderId: '' })}
        title="Tautkan Berkas Google Drive Surat Tugas"
        documentNo={quickDriveModal.skNumber}
        subjectName={quickDriveModal.debtorName}
        initialUrl={quickDriveModal.url}
        initialFolderId={quickDriveModal.folderId}
        category="SK"
        store={store}
        currentUser={currentUser}
        onUpdateStore={onUpdateStore}
        onSave={handleSaveQuickDriveUrl}
      />

      {/* CLEAN FORM MODAL (SURAT TUGAS / KUASA GENERATOR & EDITOR) */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl my-auto flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isEditing ? 'Edit Form Surat Tugas / Kuasa' : 'Form Pembuatan Surat Tugas / Kuasa'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {isPerorangan ? 'Kategori: Klien Perorangan (Kreditur Pribadi)' : 'Kategori: Lembaga Pembiayaan / Multifinance'} • No. Draft: <span className="font-mono text-indigo-300">{skNumberDraft}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="https://generator-surat-three.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition flex items-center gap-2"
                  title="Open Generator Surat (generator-surat-three.vercel.app)"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="text-xs hidden sm:inline">Generator</span>
                </a>

                <button
                  type="button"
                  onClick={() => { setShowGeneratorPopup(true); setGeneratorIssueUrl(null); setGeneratorError(null); }}
                  className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 rounded-lg text-white flex items-center gap-2"
                  title="Buat surat di Generator (sinkron data debitur & penerima tugas)"
                >
                  <FileText className="w-4 h-4" />
                  Buat Surat
                </button>

                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreateSK} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* 1. SELEKSI KASUS & DEBITUR */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    1. Berkas Kasus & Debitur
                  </h4>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 text-xs font-semibold">
                    Pilih Berkas Kasus Aktif <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                  >
                    {multifinanceCases.length > 0 && (
                      <optgroup label="🏢 Klien Multifinance / Lembaga Pembiayaan">
                        {multifinanceCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            [MULTIFINANCE] {c.caseNo} — {c.status === 'CLOSED' ? '[Kasus Ditutup]' : c.debtorName} ({c.clientName})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {peroranganCases.length > 0 && (
                      <optgroup label="👤 Klien Perorangan / Kreditur Individu">
                        {peroranganCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            [PERORANGAN] {c.caseNo} — {c.status === 'CLOSED' ? '[Kasus Ditutup]' : c.debtorName} (Kreditur: {c.clientName})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Info Card Selected Case */}
                {selectedCase && (
                  <div className={`p-3 rounded-xl border text-xs flex flex-wrap items-center justify-between gap-3 ${
                    isPerorangan ? 'bg-amber-950/20 border-amber-800/40 text-amber-200' : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
                  }`}>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Nama Debitur:</span>
                      <span className="font-bold text-white">{selectedCase.debtorName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Klien / Kreditur:</span>
                      <span className="font-semibold text-slate-200">{selectedCase.clientName}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Tunggakan Pokok:</span>
                      <span className="font-bold text-emerald-400 font-mono">
                        Rp {(selectedCase.principalDebtOS || 0).toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. PEMBERI TUGAS / KUASA */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      2. Identitas Pemberi Tugas / Kuasa
                    </h4>
                  </div>
                  <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">
                    {isPerorangan ? 'Kreditur Perseorangan' : 'Manajemen Perusahaan'}
                  </span>
                </div>

                {isPerorangan ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nama Lengkap Kreditur</label>
                      <input
                        type="text"
                        value={krediturName}
                        onChange={(e) => setKrediturName(e.target.value)}
                        placeholder="Nama Kreditur Pemilik Piutang"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">NIK / No. KTP Kreditur</label>
                      <input
                        type="text"
                        value={krediturNik}
                        onChange={(e) => setKrediturNik(e.target.value)}
                        placeholder="330210..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Pekerjaan</label>
                      <input
                        type="text"
                        value={krediturJob}
                        onChange={(e) => setKrediturJob(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Alamat Domisili Kreditur</label>
                      <input
                        type="text"
                        value={krediturAddress}
                        onChange={(e) => setKrediturAddress(e.target.value)}
                        placeholder="Alamat lengkap kreditur"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nama Perwakilan Manajemen</label>
                      <input
                        type="text"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Jabatan Perwakilan</label>
                      <input
                        type="text"
                        value={repTitle}
                        onChange={(e) => setRepTitle(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Kota Domisili Penerbitan</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 3. PENERIMA TUGAS / KUASA */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    3. Petugas Penerima Tugas (Kuasa Lapangan)
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-semibold">Pilih Petugas / Personel <span className="text-red-400">*</span></label>
                    <select
                      value={personnelId}
                      onChange={(e) => setPartnerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      {(store.personnel || []).map((pr) => (
                        <option key={pr.id} value={pr.id}>
                          {pr.fullName} ({pr.position || pr.type?.replace('_', ' ')})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPersonnel && (
                    <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">NIK Petugas:</div>
                        <div className="font-mono text-white font-semibold">{selectedPersonnel.nikKtp || '3302101234560001'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">Jabatan:</div>
                        <div className="text-slate-200 font-semibold">{selectedPersonnel.position || 'Kuasa Lapangan'}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. DETAIL KONTRAK & OBJEK PENAGIHAN */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                  <Car className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    4. Data Kontrak, Tagihan & Objek Kendaraan
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">No. Kontrak / SPH</label>
                    <input
                      type="text"
                      value={skContractNo}
                      onChange={(e) => setSkContractNo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nama Debitur</label>
                    <input
                      type="text"
                      value={skDebtorName}
                      onChange={(e) => setSkDebtorName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-semibold text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nomor Telepon Debitur</label>
                    <input
                      type="text"
                      value={skPhone}
                      onChange={(e) => setSkPhone(e.target.value)}
                      placeholder="0812..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Alamat Lengkap Debitur</label>
                    <input
                      type="text"
                      value={skDebtorAddress}
                      onChange={(e) => setSkDebtorAddress(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Tgl Jatuh Tempo</label>
                    <input
                      type="text"
                      value={skDueDate}
                      onChange={(e) => setSkDueDate(e.target.value)}
                      placeholder="e.g. 15 Tiap Bulan"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nominal Angsuran (Rp)</label>
                    <input
                      type="text"
                      value={skInstallment}
                      onChange={(e) => setSkInstallment(e.target.value)}
                      placeholder="Rp 1.450.000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Denda Keterlambatan (Rp)</label>
                    <input
                      type="text"
                      value={skPenalty}
                      onChange={(e) => setSkPenalty(e.target.value)}
                      placeholder="Rp 250.000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nominal Piutang Pokok (Rp)</label>
                    <input
                      type="number"
                      value={customNominal}
                      onChange={(e) => setCustomNominal(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-emerald-400 font-bold text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Merk / Tipe Kendaraan</label>
                    <input
                      type="text"
                      value={skVehicleMerk}
                      onChange={(e) => setSkVehicleMerk(e.target.value)}
                      placeholder="Honda Beat 2023 / Toyota Avanza"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Nomor Polisi (Plat)</label>
                    <input
                      type="text"
                      value={skVehiclePoliceNo}
                      onChange={(e) => setSkVehiclePoliceNo(e.target.value)}
                      placeholder="R 1234 AB"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-400 mb-1 text-[11px] font-semibold">Dasar Tagihan / Sertifikat Fidusia</label>
                    <input
                      type="text"
                      value={dasarPenagihan}
                      onChange={(e) => setDasarPenagihan(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* 5. LINK & FOLDER GOOGLE DRIVE DOKUMEN RESMI */}
              <GoogleDriveFolderPicker
                store={store}
                currentUser={currentUser}
                onUpdateStore={onUpdateStore}
                selectedFolderId={driveFolderId}
                onSelectFolder={(id, url) => {
                  setDriveFolderId(id);
                  setDriveFolderUrl(url);
                }}
                valueUrl={driveDocumentUrl}
                onChangeUrl={setDriveDocumentUrl}
                defaultCategory="SK"
                label="5. Folder & Tautan Google Drive (Arsip Digital SK)"
                helperText="Pilih folder tujuan di Google Drive, unggah berkas PDF/Scan SK, lalu salin tautan URL dokumen."
              />

              {/* 6. LAMPIRAN DOKUMEN / FOTO */}
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      6. Lampiran Gambar (KTP, STNK, dll)
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400">{attachments.length} Berkas Terlampir</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {attachments.map((src, i) => (
                    <div key={i} className="relative w-16 h-16 rounded-lg border border-slate-700 overflow-hidden group">
                      <img
                        src={src}
                        alt="Lampiran"
                        onClick={() => setSelectedAttachmentPreview({ src, index: i })}
                        className="w-full h-full object-cover cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setAttachments(attachments.filter((_, index) => index !== i))}
                        className="absolute inset-0 bg-black/60 text-white flex justify-center items-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Hapus gambar"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  ))}
                  <label className="w-16 h-16 rounded-lg border border-dashed border-slate-600 hover:border-indigo-400 flex flex-col items-center justify-center text-slate-500 hover:text-white cursor-pointer transition bg-slate-900/60">
                    <Plus className="w-5 h-5 mb-0.5" />
                    <span className="text-[9px]">Upload</span>
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleAddAttachment} />
                  </label>
                </div>

                {/* Attachment Preview Modal (DriveFilePreview) */}
                <DriveFilePreview
                  open={!!selectedAttachmentPreview}
                  onClose={() => setSelectedAttachmentPreview(null)}
                  fileUrl={selectedAttachmentPreview?.src}
                  fileName={selectedAttachmentPreview ? `attachment-${selectedAttachmentPreview.index}` : undefined}
                  isUploading={isUploadingAttachmentPreview}
                  webViewLink={selectedAttachmentPreview?.src}
                  onUpload={async () => {
                    if (!selectedAttachmentPreview) return;
                    const { src, index } = selectedAttachmentPreview;
                    if (typeof src === 'string' && src.startsWith('data:')) {
                      setIsUploadingAttachmentPreview(true);
                      try {
                        const match = src.match(/^data:(.+);base64,(.*)$/);
                        const mime = match ? match[1] : 'application/pdf';
                        const ext = mime.split('/')?.[1] || 'jpg';
                        const fileName = `SK_ATTACHMENT_${Date.now().toString().slice(-6)}.${ext}`;
                        const extractFolderIdFromUrl = (u?: string) => {
                          if (!u) return undefined;
                          const m = u.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
                          if (m) return m[1];
                          const m2 = u.match(/folders\/([a-zA-Z0-9_-]+)/);
                          if (m2) return m2[1];
                          return undefined;
                        };
                        const folderIdToUse = selectedCase?.gDriveFolderId || extractFolderIdFromUrl(selectedCase?.gDriveFolderUrl) || store.settings?.googleDriveFolderId;

                        const resp = await fetch('/api/drive/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fileName, mimeType: mime, base64: src, folderId: folderIdToUse }),
                        });
                        const j = await resp.json();
                        if (j && j.success) {
                          const newUrl = j.webViewLink || `https://drive.google.com/file/d/${j.fileId}/view?usp=sharing`;
                          setAttachments(prev => prev.map((it, idx) => idx === index ? newUrl : it));
                          const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'SK_Attachment', `ATT-${Date.now()}`, `Uploaded SK attachment via preview for case ${selectedCase?.caseNo}`);
                          onUpdateStore({ ...store, auditLogs: [audit, ...(store.auditLogs || [])] });
                          setSelectedAttachmentPreview(null);
                        }
                      } catch (err) {
                        console.error('Attachment upload failed', err);
                      } finally {
                        setIsUploadingAttachmentPreview(false);
                      }
                    }
                  }}
                />
              </div>

              {/* 7. KLAUSUL & DRAFT TEKS LENGKAP (COLLAPSIBLE) */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowClauseDetails(!showClauseDetails)}
                  className="w-full p-3.5 bg-slate-950/60 flex items-center justify-between text-left text-xs text-slate-300 hover:bg-slate-950 transition"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span className="font-semibold">Lihat / Edit Klausul Hukum Teks Lengkap</span>
                  </div>
                  <span className="text-slate-500 text-xs">
                    {showClauseDetails ? '▲ Sembunyikan Teks' : '▼ Tampilkan Teks'}
                  </span>
                </button>

                {showClauseDetails && (
                  <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Draft naskah surat tugas yang ter-generate otomatis berdasarkan isian form:
                    </p>
                    <textarea
                      rows={10}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3 sticky bottom-0 bg-slate-900 py-3">
                <button
                  type="button"
                  onClick={() => {
                    const mockSK: SK = {
                      id: editId || 'TEMP',
                      skNumber: skNumberDraft || `SK/ARMS/2026/${Math.floor(100 + Math.random() * 900)}`,
                      caseId: selectedCase?.id || caseId,
                      caseNo: selectedCase?.caseNo || 'CAS-TEMP',
                      clientType: selectedCase?.clientType || 'MULTIFINANCE',
                      clientName: selectedCase?.clientName || 'PT Mitrajasa Satria Indonesia',
                      pemberiKuasaType: isPerorangan ? pemberiKuasaType : 'PERUSAHAAN',
                      krediturName: isPerorangan ? (krediturName || selectedCase?.clientName) : undefined,
                      krediturNik: isPerorangan ? krediturNik : undefined,
                      krediturAddress: isPerorangan ? krediturAddress : undefined,
                      debtorName: skDebtorName || selectedCase?.debtorName || 'Nama Debitur',
                      personnelId: selectedPersonnel?.id || personnelId,
                      personnelName: selectedPersonnel?.fullName || 'Petugas Lapangan',
                      issuedDate: todayStr,
                      expiryDate: endDateStr,
                      driveDocumentUrl: driveDocumentUrl,
                      driveFolderId: driveFolderId,
                      driveFolderUrl: driveFolderUrl,
                      status: 'ACTIVE',
                      createdAt: new Date().toISOString(),
                    };
                    setPreviewData({
                      type: 'SK',
                      sk: mockSK,
                      title: `Draft Pratinjau Surat - ${mockSK.skNumber}`,
                      driveUrl: driveDocumentUrl,
                      folderUrl: driveFolderUrl,
                    });
                    setShowPreviewModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-indigo-700/60 font-semibold text-xs rounded-xl transition"
                >
                  <Eye className="w-4 h-4 text-indigo-400" />
                  <span>Pratinjau Format Cetak</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
                  >
                    Batal / Tutup
                  </button>

                  <button
                    type="button"
                    onClick={() => { setShowGeneratorPopup(true); setGeneratorIssueUrl(null); setGeneratorError(null); }}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl transition flex items-center gap-2"
                    title="Buat di Generator (sinkron data debitur & penerima tugas)"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Buat di Generator
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isEditing ? 'Simpan Perubahan Surat' : 'Simpan & Terbitkan Surat Tugas'}</span>
                  </button>
                </div>
              </div>

            </form>
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
          if (d.sk) {
            setQuickDriveModal({
              isOpen: true,
              skId: d.sk.id,
              skNumber: d.sk.skNumber,
              debtorName: d.sk.debtorName,
              url: d.sk.driveDocumentUrl || '',
              folderId: d.sk.driveFolderId,
            });
          }
        }}
      />

      {/* Generator-surat Popup */}
      {showGeneratorPopup && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-3">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-white font-bold text-sm">Buat Surat di Generator</h3>
                <p className="text-xs text-slate-400">Sinkronisasi data debitur dan penerima tugas ke <a href="https://generator-surat-three.vercel.app" target="_blank" rel="noreferrer" className="text-indigo-400 underline">generator-surat-three.vercel.app</a></p>
              </div>
              <button onClick={() => setShowGeneratorPopup(false)} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>

            <div className="mt-3 text-xs text-slate-300 space-y-3">
              <div>
                <div className="text-slate-400 text-[11px]">Debitur yang akan disinkron:</div>
                <pre className="bg-slate-800 p-2 rounded text-[11px] text-slate-200 overflow-auto max-h-28">{JSON.stringify(selectedCase || {}, null, 2)}</pre>
              </div>
              <div>
                <div className="text-slate-400 text-[11px]">Petugas penerima tugas:</div>
                <pre className="bg-slate-800 p-2 rounded text-[11px] text-slate-200 overflow-auto max-h-28">{JSON.stringify(selectedPersonnel || {}, null, 2)}</pre>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                {generatorError && <div className="text-rose-400">{generatorError}</div>}
                {generatorIssueUrl && <a href={generatorIssueUrl} target="_blank" rel="noreferrer" className="text-indigo-300 underline">Buka Generator Surat</a>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowGeneratorPopup(false)} className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded">Tutup</button>
                <button
                  onClick={() => syncToGeneratorRepo()}
                  disabled={isSyncingGenerator}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded flex items-center gap-2"
                >
                  {isSyncingGenerator ? 'Menyinkron...' : 'Buat Issue & Sinkron'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
