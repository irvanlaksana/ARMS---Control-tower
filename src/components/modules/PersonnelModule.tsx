import { Pagination, usePagination } from '../common/Pagination';
import React, { useState } from 'react';
import { AddressFields } from '../common/AddressFields';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Personnel, PersonnelType } from '../../types/arms';
import {
  Users,
  Plus,
  UserCheck,
  Pencil,
  Trash2,
  Folder,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  HardDrive,
  Search,
  X,
  CloudUpload,
  CheckCircle2,
  FileSignature,
  Loader2
} from 'lucide-react';
import { EmployeeIdCardModal } from './EmployeeIdCardModal';
import DriveFilePreview from '../common/DriveFilePreview';
import {
  drivePreviewUrl,
  extractFolderId,
  fileToCompressedDataUrl,
  getRootDriveId,
  personnelDocPathLabel,
  uploadPersonnelDocument,
} from '../../lib/drive';

interface PersonnelModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const PersonnelModule: React.FC<PersonnelModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [activeFolder, setActiveFolder] = useState<'ALL' | 'KARYAWAN' | 'MITRA_DC'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);
  const [previewKtpModal, setPreviewKtpModal] = useState<Personnel | null>(null);
  const [selectedForIdCard, setSelectedForIdCard] = useState<Personnel | null>(null);

  // Form states
  const [type, setType] = useState<PersonnelType>('KARYAWAN');
  const [fullName, setFullName] = useState('');
  const [nikKtp, setNikKtp] = useState('');
  const [birthPlaceDate, setBirthPlaceDate] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  // KTP Photo states
  const [ktpPhotoUrl, setKtpPhotoUrl] = useState<string>('');
  const [ktpDriveFileId, setKtpDriveFileId] = useState<string>('');
  const [ktpDriveFolderUrl, setKtpDriveFolderUrl] = useState<string>('');
  const [uploadedBase64, setUploadedBase64] = useState<string>('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  // SPPI (opsional) Photo states
  const [sppiPhotoUrl, setSppiPhotoUrl] = useState<string>('');
  const [sppiDriveFileId, setSppiDriveFileId] = useState<string>('');
  const [sppiDriveFolderUrl, setSppiDriveFolderUrl] = useState<string>('');
  const [uploadedSppiBase64, setUploadedSppiBase64] = useState<string>('');
  const [uploadError, setUploadError] = useState<string>('');
  const [uploadingKind, setUploadingKind] = useState<'KTP' | 'SPPI' | null>(null);

  const rootDriveId = getRootDriveId(store.settings);

  const driveFileViewUrl = (fileId?: string, webViewLink?: string, directViewUrl?: string) =>
    drivePreviewUrl(fileId, webViewLink, directViewUrl)
    || webViewLink
    || (fileId ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing` : '');

  const isPreviewableImage = (url?: string) =>
    !!url && (
      url.startsWith('data:image')
      || url.includes('drive.google.com/thumbnail')
      || url.includes('drive.google.com/uc?')
      || url.includes('lh3.googleusercontent.com')
      || /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(url)
    );

  const personNameForDrive = () =>
    (fullName || editingPersonnel?.fullName || 'PERSONEL').trim() || 'PERSONEL';

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const defaultDriveFolderId = store.settings?.googleDriveFolderId || '11OxYLvKiH8P4AIP_NM08KuYu0plAq16_';
  const defaultDriveFolderLink = store.settings?.googleDriveFolderUrl || `https://drive.google.com/drive/folders/11OxYLvKiH8P4AIP_NM08KuYu0plAq16_?usp=sharing`;

  const handleUpdatePersonnelPhoto = async (personnelId: string, newPhotoUrl: string) => {
    // If passed a data URL, upload immediately to server Drive endpoint
    if (typeof newPhotoUrl === 'string' && newPhotoUrl.startsWith('data:')) {
      setIsUploadingPhoto(true);
      const person = (store.personnel || []).find((x) => x.id === personnelId);
      const json = await uploadPersonnelDocument(
        newPhotoUrl,
        person?.fullName || fullName || 'ktp',
        'KTP',
        rootDriveId,
      );
      setIsUploadingPhoto(false);
      if (json && json.success) {
        const viewUrl = driveFileViewUrl(json.fileId, json.webViewLink);
        const updatedPersonnel = (store.personnel || []).map((p) =>
          p.id === personnelId
            ? { ...p, ktpPhotoUrl: viewUrl, ktpDriveFileId: json.fileId, ktpDriveFolderUrl: viewUrl }
            : p
        );
        const audit = createAuditEntry(
          currentUser.username,
          currentUser.role,
          'UPDATE',
          'Personnel',
          personnelId,
          `Memperbarui pas foto ID Card dan upload ke GDrive: ${personnelId}`
        );
        onUpdateStore({
          ...store,
          personnel: updatedPersonnel,
          auditLogs: [audit, ...(store.auditLogs || [])],
        });
        // clear staged base64
        setUploadedBase64('');
        return;
      }
      // fallback: store data URL as-is
    }

    // Non-base64 or upload failed: just set url
    const updatedPersonnel = (store.personnel || []).map((p) =>
      p.id === personnelId ? { ...p, ktpPhotoUrl: newPhotoUrl } : p
    );
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Personnel',
      personnelId,
      `Memperbarui pas foto ID Card untuk personel ${personnelId}`
    );
    onUpdateStore({
      ...store,
      personnel: updatedPersonnel,
      auditLogs: [audit, ...(store.auditLogs || [])],
    });
  };

  const resetForm = () => {
    setEditingPersonnel(null);
    setType('KARYAWAN');
    setFullName('');
    setNikKtp('');
    setBirthPlaceDate('');
    setAddress('');
    setPhoneNumber('');
    setEmail('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setEmergencyContact('');
    setPosition('');
    setStatus('ACTIVE');
    setKtpPhotoUrl('');
    setKtpDriveFileId('');
    setKtpDriveFolderUrl('');
    setUploadedBase64('');
    setSppiPhotoUrl('');
    setSppiDriveFileId('');
    setSppiDriveFolderUrl('');
    setUploadedSppiBase64('');
    setUploadError('');
    setUploadingKind(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (personnel: Personnel) => {
    setEditingPersonnel(personnel);
    setType(personnel.type);
    setFullName(personnel.fullName);
    setNikKtp(personnel.nikKtp);
    setBirthPlaceDate(personnel.birthPlaceDate);
    setAddress(personnel.address);
    setPhoneNumber(personnel.phoneNumber);
    setEmail(personnel.email);
    setBankName(personnel.bankName);
    setAccountNumber(personnel.accountNumber);
    setAccountName(personnel.accountName);
    setEmergencyContact(personnel.emergencyContact);
    setPosition(personnel.position || '');
    setStatus(personnel.status || 'ACTIVE');
    setKtpPhotoUrl(
      drivePreviewUrl(personnel.ktpDriveFileId, personnel.ktpPhotoUrl) || personnel.ktpPhotoUrl || '',
    );
    setKtpDriveFileId(personnel.ktpDriveFileId || '');
    setKtpDriveFolderUrl(personnel.ktpDriveFolderUrl || '');
    setUploadedBase64('');
    setSppiPhotoUrl(
      drivePreviewUrl(personnel.sppiDriveFileId, personnel.sppiPhotoUrl) || personnel.sppiPhotoUrl || '',
    );
    setSppiDriveFileId(personnel.sppiDriveFileId || '');
    setSppiDriveFolderUrl(personnel.sppiDriveFolderUrl || '');
    setUploadedSppiBase64('');
    setUploadError('');
    setShowModal(true);
  };

  const processDocFile = async (file: File, kind: 'KTP' | 'SPPI') => {
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i.test(file.name);
    if (!isImage) {
      setUploadError('Pilih file gambar (JPG, PNG, WEBP).');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 20 MB.');
      return;
    }

    setUploadError('');
    setUploadingKind(kind);
    setIsUploadingPhoto(true);

    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      if (kind === 'SPPI') {
        setSppiPhotoUrl(dataUrl);
        setUploadedSppiBase64(dataUrl);
      } else {
        setKtpPhotoUrl(dataUrl);
        setUploadedBase64(dataUrl);
      }

      const json = await uploadPersonnelDocument(dataUrl, personNameForDrive(), kind, rootDriveId);
      const preview = driveFileViewUrl(json.fileId, json.webViewLink, json.directViewUrl) || dataUrl;

      if (json?.success && json.fileId) {
        if (kind === 'SPPI') {
          setSppiPhotoUrl(preview);
          setSppiDriveFileId(json.fileId);
          setSppiDriveFolderUrl(json.webViewLink || preview);
          setUploadedSppiBase64('');
        } else {
          setKtpPhotoUrl(preview);
          setKtpDriveFileId(json.fileId);
          setKtpDriveFolderUrl(json.webViewLink || preview);
          setUploadedBase64('');
        }
      } else if (json?.fallbackBase64) {
        setUploadError(
          json.error
            ? `Google Drive belum tersambung (${json.error}). Foto tetap dipratinjau dan akan disimpan saat Anda menekan Simpan.`
            : 'Google Drive belum tersambung. Foto tetap dipratinjau dan akan disimpan saat Anda menekan Simpan.',
        );
      } else {
        setUploadError(json?.error || 'Gagal mengunggah foto ke Google Drive.');
      }
    } catch (err: any) {
      console.error('Gagal memproses unggahan KTP/SPPI', err);
      setUploadError(err?.message || 'Gagal membaca atau mengunggah foto.');
    } finally {
      setIsUploadingPhoto(false);
      setUploadingKind(null);
    }
  };

  const handleDocFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    kind: 'KTP' | 'SPPI',
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    void processDocFile(file, kind);
  };

  const handleDeletePersonnel = (p: Personnel) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data ${p.fullName}?`)) return;

    const updatedList = (store.personnel || []).filter((item) => item.id !== p.id);
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Personnel',
      p.id,
      `Hapus data ${p.fullName} (${p.type})`
    );

    onUpdateStore({
      ...store,
      personnel: updatedList,
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleSavePersonnel = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalKtpFileId = ktpDriveFileId || extractFolderId(ktpPhotoUrl) || '';
    let finalKtpUrl = ktpDriveFolderUrl || ktpPhotoUrl;
    let finalSppiFileId = sppiDriveFileId || extractFolderId(sppiPhotoUrl) || '';
    let finalSppiUrl = sppiDriveFolderUrl || sppiPhotoUrl;

    const ktpData = uploadedBase64 || (ktpPhotoUrl && ktpPhotoUrl.startsWith('data:') ? ktpPhotoUrl : '');
    const sppiData = uploadedSppiBase64 || (sppiPhotoUrl && sppiPhotoUrl.startsWith('data:') ? sppiPhotoUrl : '');

    try {
      if (ktpData || sppiData) setIsUploadingPhoto(true);

      if (ktpData) {
        const json = await uploadPersonnelDocument(ktpData, fullName || 'PERSONEL', 'KTP', rootDriveId);
        if (json?.success) {
          finalKtpFileId = json.fileId || finalKtpFileId;
          finalKtpUrl = driveFileViewUrl(json.fileId, json.webViewLink, json.directViewUrl) || finalKtpUrl;
        } else if (json?.fallbackBase64) {
          finalKtpUrl = json.webViewLink || ktpData;
        }
        setKtpDriveFileId(finalKtpFileId);
        setKtpDriveFolderUrl(finalKtpUrl);
        setKtpPhotoUrl(finalKtpUrl);
        setUploadedBase64('');
      }

      if (sppiData) {
        const json = await uploadPersonnelDocument(sppiData, fullName || 'PERSONEL', 'SPPI', rootDriveId);
        if (json?.success) {
          finalSppiFileId = json.fileId || finalSppiFileId;
          finalSppiUrl = driveFileViewUrl(json.fileId, json.webViewLink, json.directViewUrl) || finalSppiUrl;
        } else if (json?.fallbackBase64) {
          finalSppiUrl = json.webViewLink || sppiData;
        }
        setSppiDriveFileId(finalSppiFileId);
        setSppiDriveFolderUrl(finalSppiUrl);
        setSppiPhotoUrl(finalSppiUrl);
        setUploadedSppiBase64('');
      }
    } catch (err) {
      console.error('Failed uploading KTP/SPPI before save', err);
    } finally {
      setIsUploadingPhoto(false);
    }

    const driveNotes = [
      finalKtpUrl ? 'KTP' : null,
      finalSppiUrl ? 'SPPI' : null,
    ].filter(Boolean).join(' & ') || 'tanpa berkas';

    if (editingPersonnel) {
      const updatedPersonnel: Personnel = {
        ...editingPersonnel,
        type,
        fullName,
        nikKtp,
        birthPlaceDate,
        address,
        phoneNumber,
        email,
        bankName,
        accountNumber,
        accountName,
        emergencyContact,
        position,
        status,
        ktpPhotoUrl: finalKtpUrl,
        ktpDriveFileId: finalKtpFileId,
        ktpDriveFolderUrl: finalKtpUrl,
        sppiPhotoUrl: finalSppiUrl || undefined,
        sppiDriveFileId: finalSppiFileId || undefined,
        sppiDriveFolderUrl: finalSppiUrl || undefined,
      };

      const updatedList = (store.personnel || []).map((p) =>
        p.id === editingPersonnel.id ? updatedPersonnel : p
      );

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Personnel',
        editingPersonnel.id,
        `Update data ${fullName} (${type}) dengan berkas ${driveNotes} Google Drive`
      );

      onUpdateStore({
        ...store,
        personnel: updatedList,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newPersonnel: Personnel = {
        id: `PRT-${Date.now()}`,
        type,
        fullName,
        nikKtp,
        birthPlaceDate,
        address,
        phoneNumber,
        email,
        bankName,
        accountNumber,
        accountName,
        emergencyContact,
        position,
        status,
        ktpPhotoUrl: finalKtpUrl,
        ktpDriveFileId: finalKtpFileId,
        ktpDriveFolderUrl: finalKtpUrl,
        sppiPhotoUrl: finalSppiUrl || undefined,
        sppiDriveFileId: finalSppiFileId || undefined,
        sppiDriveFolderUrl: finalSppiUrl || undefined,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Personnel',
        newPersonnel.id,
        `Tambah Karyawan/Mitra ${fullName} (${type}) dengan berkas ${driveNotes} Google Drive`
      );

      onUpdateStore({
        ...store,
        personnel: [newPersonnel, ...(store.personnel || [])],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
    resetForm();
  };

  const personnelList = store.personnel || [];
  const karyawanList = personnelList.filter((p) => p.type === 'KARYAWAN');
  const mitraList = personnelList.filter((p) => p.type === 'MITRA_DC');

  const filteredPersonnel = personnelList.filter((p) => {
    const matchesFolder =
      activeFolder === 'ALL' ||
      (activeFolder === 'KARYAWAN' && p.type === 'KARYAWAN') ||
      (activeFolder === 'MITRA_DC' && p.type === 'MITRA_DC');

    const matchesSearch =
      p.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.nikKtp.includes(searchQuery) ||
      p.phoneNumber.includes(searchQuery) ||
      (p.position && p.position.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFolder && matchesSearch;
  });

  const personnelPagination = usePagination<Personnel>(filteredPersonnel, 10);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Database Karyawan & Mitra DC</h2>
          </div>
          <p className="text-xs text-slate-400">
            Penyimpanan terpusat Folder Database Karyawan, Mitra DC (Freelance), dan berkas KYC (Foto KTP & SPPI terhubung ke Google Drive).
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Karyawan / Mitra Baru</span>
          </button>
        )}
      </div>

      {/* Google Drive Status Banner */}
      <div className="bg-gradient-to-r from-blue-950/60 via-slate-900 to-indigo-950/60 border border-blue-800/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-md">
        <div className="flex items-start sm:items-center gap-2">
          <div className="p-2 bg-blue-900/50 rounded-lg border border-blue-700/50 text-blue-300 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Google Drive Storage Integration</span>
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Connected
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Folder Drive Terkonfigurasi: <code className="text-indigo-300 bg-slate-950 px-1.5 py-0.5 rounded font-mono text-[11px]">{defaultDriveFolderId}</code>
            </p>
          </div>
        </div>

        <a
          href={defaultDriveFolderLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-lg transition shrink-0"
        >
          <ExternalLink className="w-3 h-3 text-blue-400" />
          <span>Buka Folder Google Drive</span>
        </a>
      </div>

      {/* Folder Navigation Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <button
          onClick={() => setActiveFolder('ALL')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            activeFolder === 'ALL'
              ? 'bg-indigo-950/80 border-indigo-600 text-white shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${activeFolder === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">Semua Database</div>
              <div className="text-[11px] opacity-80">Folder Gabungan</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-indigo-300">
            {personnelList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('KARYAWAN')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            activeFolder === 'KARYAWAN'
              ? 'bg-blue-950/80 border-blue-600 text-white shadow-lg shadow-blue-950/50'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${activeFolder === 'KARYAWAN' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">Folder Karyawan Internal</div>
              <div className="text-[11px] opacity-80">SPV, Staf, & Desk Officer</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-blue-300">
            {karyawanList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveFolder('MITRA_DC')}
          className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${
            activeFolder === 'MITRA_DC'
              ? 'bg-amber-950/80 border-amber-600 text-white shadow-lg shadow-amber-950/50'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${activeFolder === 'MITRA_DC' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-sm">Folder Mitra DC (Freelance)</div>
              <div className="text-[11px] opacity-80">Eksekutor Lapangan & Desk DC</div>
            </div>
          </div>
          <span className="text-lg font-black bg-slate-950/60 px-2.5 py-1 rounded-lg border border-slate-800 text-amber-300">
            {mitraList.length}
          </span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NIK KTP, No HP, Jabatan..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Menampilkan <strong className="text-white">{filteredPersonnel.length}</strong> data</span>
          <span>•</span>
          <span>
            Kategori Terpilih:{' '}
            <strong className="text-indigo-300">
              {activeFolder === 'ALL' ? 'Semua Database' : activeFolder === 'KARYAWAN' ? 'Folder Karyawan' : 'Folder Mitra DC'}
            </strong>
          </span>
        </div>
      </div>

      {/* Main Database Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-[11px] text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">Nama Lengkap</th>
                <th className="py-2 px-2">TTL & Alamat</th>
                <th className="py-2 px-2">Kontak</th>
                {canEdit && <th className="py-2 px-2 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 4 : 3} className="py-12 text-center text-slate-500 text-xs">
                    <Folder className="w-6 h-6 text-slate-600 mx-auto mb-1.5 opacity-50" />
                    Belum ada data pada folder {activeFolder === 'ALL' ? 'Database' : activeFolder}. Klik "Tambah Karyawan / Mitra Baru" untuk memasukkan data.
                  </td>
                </tr>
              ) : (
                personnelPagination.pageItems.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2 px-2">
                      <div className="font-bold text-white">{p.fullName}</div>
                    </td>

                    <td className="py-2 px-2 space-y-0.5">
                      <div className="text-slate-200">{p.birthPlaceDate}</div>
                      <div className="text-[10px] text-slate-400 max-w-[180px] truncate">{p.address}</div>
                    </td>

                    <td className="py-2 px-2 space-y-0.5">
                      <div className="text-emerald-400 font-semibold">{p.phoneNumber}</div>
                      <div className="text-[10px] text-slate-400">{p.email || '-'}</div>
                    </td>

                    {canEdit && (
                      <td className="py-2 px-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Data"
                            className="flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-2 py-1 rounded text-[11px] font-semibold transition"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeletePersonnel(p)}
                            title="Hapus Data"
                            className="flex items-center gap-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2 py-1 rounded text-[11px] font-semibold transition"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden p-3 space-y-2.5">
          {filteredPersonnel.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs bg-slate-900/50 rounded-lg border border-slate-800">
              <Folder className="w-6 h-6 text-slate-600 mx-auto mb-1.5 opacity-50" />
              Belum ada data pada folder {activeFolder === 'ALL' ? 'Database' : activeFolder}. Klik "Tambah Karyawan / Mitra Baru" untuk memasukkan data.
            </div>
          ) : (
            personnelPagination.pageItems.map((p) => (
              <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2 shadow-sm">
                <div>
                  <h4 className="font-bold text-white text-sm">{p.fullName}</h4>
                </div>
                  
                <div className="grid grid-cols-1 gap-2 text-xs bg-slate-900/50 p-2 rounded border border-slate-800">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">TTL & Alamat</span>
                    <span className="text-slate-200 block">{p.birthPlaceDate}</span>
                    <span className="text-slate-400 block">{p.address}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">Kontak</span>
                    <span className="text-emerald-400 font-medium block">{p.phoneNumber}</span>
                    <span className="text-slate-400 block">{p.email || '-'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800/60 mt-1.5">
                  {canEdit && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleDeletePersonnel(p)}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-red-400 rounded-lg transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <Pagination
          page={personnelPagination.page}
          totalPages={personnelPagination.totalPages}
          totalItems={personnelPagination.totalItems}
          pageSize={personnelPagination.pageSize}
          onPageChange={personnelPagination.setPage}
          onPageSizeChange={personnelPagination.setPageSize}
        />
      </div>

      {/* Lightbox KTP Modal (replaced by DriveFilePreview) */}
      <DriveFilePreview
        open={!!previewKtpModal}
        onClose={() => setPreviewKtpModal(null)}
        fileUrl={previewKtpModal?.ktpPhotoUrl}
        fileName={previewKtpModal?.fullName}
        isUploading={isUploadingPhoto}
        driveFileId={previewKtpModal?.ktpDriveFileId}
        webViewLink={previewKtpModal?.ktpPhotoUrl}
        onUpload={async () => {
          // allow immediate upload from preview if the image is a data URL
          if (!previewKtpModal) return;
          const p = previewKtpModal;
          if (p.ktpPhotoUrl && p.ktpPhotoUrl.startsWith('data:')) {
            setIsUploadingPhoto(true);
            const json = await uploadPersonnelDocument(p.ktpPhotoUrl, p.fullName, 'KTP', rootDriveId);
            setIsUploadingPhoto(false);
            if (json && json.success) {
              const viewUrl = driveFileViewUrl(json.fileId, json.webViewLink, json.directViewUrl);
              const updatedPersonnel = (store.personnel || []).map((pp) =>
                pp.id === p.id
                  ? { ...pp, ktpPhotoUrl: viewUrl, ktpDriveFileId: json.fileId, ktpDriveFolderUrl: viewUrl }
                  : pp
              );
              const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Personnel', p.id, `Upload KTP via preview: ${p.id}`);
              onUpdateStore({ ...store, personnel: updatedPersonnel, auditLogs: [audit, ...(store.auditLogs || [])] });
              setPreviewKtpModal(null);
            }
          }
        }}
      />

      {/* Add / Edit Personnel Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto">
          <form
            onSubmit={handleSavePersonnel}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-3.5 sm:p-4 space-y-2.5 shadow-2xl max-h-[85vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {editingPersonnel ? 'Edit Data Karyawan / Mitra DC' : 'Registrasi Karyawan / Mitra DC Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* KTP Photo Upload Area */}
            <div className="bg-slate-950 p-3 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <CloudUpload className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Upload Foto KTP (Google Drive Cloud Storage)</span>
                </label>
                <span className="text-[10px] text-slate-400">Format: JPG, PNG, WEBP</span>
              </div>

              {uploadError && uploadingKind !== 'SPPI' && (
                <div className="text-[11px] text-amber-200 bg-amber-950/50 border border-amber-800/70 rounded-lg p-2">
                  {uploadError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
                <div className="md:col-span-2">
                  <div className={`relative border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition ${uploadingKind === 'KTP' ? 'border-indigo-500 bg-indigo-950/30' : 'border-slate-700 hover:border-indigo-500 bg-slate-900'}`}>
                    {uploadingKind === 'KTP' ? (
                      <Loader2 className="w-5 h-5 text-indigo-400 mb-1.5 animate-spin" />
                    ) : (
                      <Upload className="w-5 h-5 text-slate-400 mb-1.5" />
                    )}
                    <span className="text-xs font-semibold text-slate-200">
                      {uploadingKind === 'KTP' ? 'Mengunggah foto KTP...' : 'Klik atau tarik file KTP ke sini'}
                    </span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Unggah langsung ke Google Drive (JPG, PNG, WEBP)</span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif,image/*"
                      disabled={isUploadingPhoto}
                      onChange={(e) => handleDocFileUpload(e, 'KTP')}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-wait"
                    />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  {ktpPhotoUrl ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-emerald-600 bg-slate-900 group">
                      {isPreviewableImage(ktpPhotoUrl) ? (
                        <img src={ktpPhotoUrl} alt="Preview KTP" className="w-full h-full object-cover" />
                      ) : (
                        <a
                          href={ktpPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full flex flex-col items-center justify-center text-emerald-300 text-[10px] gap-1"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Berkas KTP terhubung</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setKtpPhotoUrl('');
                          setKtpDriveFileId('');
                          setKtpDriveFolderUrl('');
                          setUploadedBase64('');
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition"
                        title="Hapus Foto KTP"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg border border-slate-800 bg-slate-900 flex flex-col items-center justify-center text-slate-600">
                      <ImageIcon className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px]">Preview KTP</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] font-mono text-indigo-300 bg-indigo-950/40 p-2 rounded border border-indigo-800/50 flex items-start gap-1.5">
                <Folder className="w-3 h-3 text-indigo-400 shrink-0 mt-0.5" />
                <span>Pemetaan GDrive: {personnelDocPathLabel(fullName || editingPersonnel?.fullName || 'NAMA_PERSONEL', 'KTP')}</span>
              </div>

              {ktpDriveFileId && (
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Sinkron Google Drive ID: {ktpDriveFileId}</span>
                  </div>
                </div>
              )}
            </div>

            {/* SPPI Photo Upload Area (optional) */}
            <div className="bg-slate-950 p-3 border border-amber-900/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <FileSignature className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload SPPI (Opsional)</span>
                </label>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-slate-400 font-semibold">
                  Tidak wajib
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Surat Pernyataan Pemeriksaan Identitas. File gambar akan disimpan ke Google Drive pada subfolder <code className="text-amber-300 font-mono">02_SPPI</code>.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 items-center">
                <div className="md:col-span-2">
                  <label className="border-2 border-dashed border-slate-700 hover:border-amber-500 bg-slate-900 rounded-xl p-3 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                    <Upload className="w-5 h-5 text-slate-400 group-hover:text-amber-400 mb-1.5 transition" />
                    <span className="text-xs font-semibold text-slate-200">Klik atau tarik file SPPI ke sini</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Format: JPG, PNG, WEBP — otomatis tersimpan ke GDrive</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleDocFileUpload(e, 'SPPI')}
                      className="hidden"
                    />
                  </label>
                </div>

                <div className="flex flex-col items-center justify-center">
                  {sppiPhotoUrl ? (
                    <div className="relative w-full h-24 rounded-lg overflow-hidden border border-amber-600 bg-slate-900 group">
                      {isPreviewableImage(sppiPhotoUrl) || sppiDriveFileId ? (
                        <img
                          src={isPreviewableImage(sppiPhotoUrl) ? sppiPhotoUrl : drivePreviewUrl(sppiDriveFileId, sppiPhotoUrl)}
                          alt="Preview SPPI"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <a
                          href={sppiPhotoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full h-full flex flex-col items-center justify-center text-amber-300 text-[10px] gap-1"
                        >
                          <FileSignature className="w-5 h-5" />
                          <span>Berkas SPPI terhubung</span>
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSppiPhotoUrl('');
                          setSppiDriveFileId('');
                          setSppiDriveFolderUrl('');
                          setUploadedSppiBase64('');
                        }}
                        className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full opacity-80 hover:opacity-100 transition"
                        title="Hapus Berkas SPPI"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-24 rounded-lg border border-dashed border-slate-800 bg-slate-900 flex flex-col items-center justify-center text-slate-600">
                      <FileSignature className="w-5 h-5 mb-0.5" />
                      <span className="text-[10px]">Preview SPPI</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-[10px] font-mono text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-800/50 flex items-start gap-1.5">
                <Folder className="w-3 h-3 text-amber-400 shrink-0 mt-0.5" />
                <span>Pemetaan GDrive: {personnelDocPathLabel(fullName || editingPersonnel?.fullName || 'NAMA_PERSONEL', 'SPPI')}</span>
              </div>

              {sppiDriveFileId && (
                <div className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 p-2 rounded border border-emerald-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>Sinkron Google Drive ID: {sppiDriveFileId}</span>
                  </div>
                  {sppiPhotoUrl && !sppiPhotoUrl.startsWith('data:') && (
                    <a
                      href={sppiPhotoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-300 hover:underline flex items-center gap-1"
                    >
                      Buka <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Folder Kategori</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PersonnelType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="KARYAWAN">FOLDER KARYAWAN INTERNAL (SPV, Staf, dll)</option>
                  <option value="MITRA_DC">FOLDER MITRA DC / FREELANCE</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Nama Lengkap Sesuai KTP</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">NIK KTP (16 Digit)</label>
                <input
                  type="text"
                  required
                  value={nikKtp}
                  onChange={(e) => setNikKtp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Tempat, Tanggal Lahir</label>
                <input
                  type="text"
                  required
                  value={birthPlaceDate}
                  onChange={(e) => setBirthPlaceDate(e.target.value)}
                  placeholder="e.g. Jakarta, 17 Agustus 1990"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <AddressFields value={address} onChange={setAddress} label="Alamat Lengkap Sesuai KTP" required />

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Kontak Darurat</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. 0812xxx (Istri/Suami)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Posisi / Jabatan</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Supervisor Lapangan / Desk Collector"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-0.5">Status Keaktifan</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Aktif)</option>
                  <option value="INACTIVE">INACTIVE (Non-Aktif)</option>
                </select>
              </div>

              <div className="md:col-span-2 border-t border-slate-800 pt-2 mt-0.5">
                <h4 className="text-xs font-semibold text-white mb-2">Informasi Rekening Bank Payroll / Insentif</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Nama Bank</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. BCA / Mandiri"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Nomor Rekening</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-0.5">Nama Pemilik Rekening</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isUploadingPhoto}
                className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 shadow-md transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              >
                {isUploadingPhoto && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {isUploadingPhoto
                  ? 'Mengunggah ke Google Drive...'
                  : editingPersonnel
                    ? 'Simpan Perubahan'
                    : 'Simpan Data KYC, KTP & SPPI'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Official Employee ID Card Modal (Red & Black Edition) */}
      {selectedForIdCard && (
        <EmployeeIdCardModal
          personnel={selectedForIdCard}
          settings={store.settings}
          onClose={() => setSelectedForIdCard(null)}
          onUpdatePersonnelPhoto={handleUpdatePersonnelPhoto}
        />
      )}
    </div>
  );
};
