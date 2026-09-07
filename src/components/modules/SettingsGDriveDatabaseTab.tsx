import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Client, Personnel, Case, Customer, SK, Contract } from '../../types/arms';
import { ROOT_GDRIVE_URL, ROOT_GDRIVE_ID } from '../../data/initialData';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Users,
  Building2,
  FileText,
  ExternalLink,
  Edit2,
  Upload,
  Eye,
  Copy,
  Check,
  Search,
  Plus,
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  CreditCard,
  Image as ImageIcon,
  CheckCircle2,
  FileCheck,
  Scale,
  Car,
  AlertCircle,
  FileSignature,
  Loader2,
  RefreshCw,
  FolderCheck
} from 'lucide-react';
import { ensureDrivePath, createDriveFolder, isPlaceholderDriveUrl, isRealDriveFolder, slugify, folderUrlFromId, getRootDriveId } from '../../lib/drive';
import { LetterPreviewModal, LetterPreviewData } from '../common/LetterPreviewModal';
import { EmployeeIdCardModal } from './EmployeeIdCardModal';
import { AddressFields } from '../common/AddressFields';

interface SettingsGDriveDatabaseTabProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

type ExplorerSection = 'ALL' | 'KARYAWAN' | 'MULTIFINANCE';

export const SettingsGDriveDatabaseTab: React.FC<SettingsGDriveDatabaseTabProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [activeSection, setActiveSection] = useState<ExplorerSection>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [creatingFolderKey, setCreatingFolderKey] = useState<string | null>(null);
  const [folderActionMsg, setFolderActionMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Expanded tree states
  const [expandedClients, setExpandedClients] = useState<Record<string, boolean>>({
    'CLI-001': true,
    'CLI-003': true,
  });

  // Modal States
  const [previewDocData, setPreviewDocData] = useState<LetterPreviewData | null>(null);
  const [previewKtpPersonnel, setPreviewKtpPersonnel] = useState<Personnel | null>(null);
  const [idCardPersonnel, setIdCardPersonnel] = useState<Personnel | null>(null);

  // Edit Link Modal State
  const [editLinkTarget, setEditLinkTarget] = useState<{
    type: 'PERSONNEL' | 'CLIENT_PROPOSAL' | 'CLIENT_MOU' | 'CLIENT_SKP' | 'DEBTOR';
    id: string;
    name: string;
    currentFolderUrl?: string;
    currentFolderId?: string;
    currentDocUrl?: string;
    currentSphUrl?: string;
    extraNote?: string;
  } | null>(null);

  const [editFolderUrl, setEditFolderUrl] = useState('');
  const [editFolderId, setEditFolderId] = useState('');
  const [editDocUrl, setEditDocUrl] = useState('');
  const [editSphUrl, setEditSphUrl] = useState('');

  // Quick Upload / File Link Modal State
  const [uploadTarget, setUploadTarget] = useState<{
    type: 'PERSONNEL_KTP' | 'CLIENT_PROPOSAL' | 'CLIENT_MOU' | 'DEBTOR_SKP' | 'DEBTOR_SPH';
    id: string;
    title: string;
    targetName: string;
    currentUrl?: string;
  } | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedBase64, setUploadedBase64] = useState('');

  // Add Debitur under Multifinance Modal State
  const [addDebtorClientId, setAddDebtorClientId] = useState<string | null>(null);
  const [newDebtorName, setNewDebtorName] = useState('');
  const [newDebtorNik, setNewDebtorNik] = useState('');
  const [newContractNo, setNewContractNo] = useState('');
  const [newVehicle, setNewVehicle] = useState('');
  const [newPoliceNo, setNewPoliceNo] = useState('');
  const [newPrincipalOS, setNewPrincipalOS] = useState<number>(50000000);
  const [newOverdueDays, setNewOverdueDays] = useState<number>(90);
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';
  const rootDriveUrl = store.settings?.googleDriveFolderUrl || ROOT_GDRIVE_URL;
  const rootDriveId = getRootDriveId(store.settings) || ROOT_GDRIVE_ID;

  const personnelList = store.personnel || [];
  const clientsList = store.clients || [];
  const casesList = store.cases || [];

  // Folder GDrive dikatakan sudah "nyata" bila URL folder Google Drive valid
  // (ID 20+ karakter) dan cocok dengan folderId yang tersimpan — menolak
  // link placeholder lama `&path=` serta ID buatan seperti `GDRIVE-CLI-...`.
  const isRealFolder = (url?: string, folderId?: string) => {
    return isRealDriveFolder(url, folderId);
  };

  const personnelPathSegments = (p: Personnel) => [
    'PT_MJ_INDONESIA',
    'DATABASE_KARYAWAN',
    slugify(p.fullName),
  ];

  const clientPathSegments = (client: Client) => [
    'PT_MJ_INDONESIA',
    'MULTIFINANCE',
    slugify(client.companyName),
  ];

  const debtorPathSegments = (debtorCase: Case, client?: Client) => [
    'PT_MJ_INDONESIA',
    'MULTIFINANCE',
    slugify(client?.companyName || debtorCase.clientName),
    'FOLDER_SKP',
    `DEBITUR_${slugify(debtorCase.debtorName)}`,
  ];

  const handleEnsureFolder = async (kind: 'PERSONNEL' | 'CLIENT' | 'CLIENT_SKP' | 'DEBTOR', id: string) => {
    const key = `${kind}-${id}`;
    if (creatingFolderKey) return;
    setCreatingFolderKey(key);
    setFolderActionMsg(null);
    try {
      if (kind === 'PERSONNEL') {
        const p = personnelList.find((x) => x.id === id);
        if (!p) throw new Error('Personel tidak ditemukan');
        const result = await ensureDrivePath(personnelPathSegments(p), rootDriveId);
        const updatedPersonnel = personnelList.map((x) =>
          x.id === id
            ? { ...x, gDriveFolderUrl: result.webViewLink, gDriveFolderId: result.folderId }
            : x,
        );
        const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Personnel_GDrive', id, `Buat folder GDrive karyawan: ${p.fullName}`);
        onUpdateStore({ ...store, personnel: updatedPersonnel, auditLogs: [audit, ...store.auditLogs] });
        setFolderActionMsg({ ok: true, text: `Folder GDrive ${p.fullName} berhasil dibuat/diperbaiki.` });
      } else if (kind === 'CLIENT') {
        const client = clientsList.find((x) => x.id === id);
        if (!client) throw new Error('Klien tidak ditemukan');
        const result = await ensureDrivePath(clientPathSegments(client), rootDriveId);
        const updatedClients = clientsList.map((x) =>
          x.id === id
            ? { ...x, gDriveFolderUrl: result.webViewLink, gDriveFolderId: result.folderId }
            : x,
        );
        const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Client_GDrive', id, `Buat folder GDrive klien: ${client.companyName}`);
        onUpdateStore({ ...store, clients: updatedClients, auditLogs: [audit, ...store.auditLogs] });
        setFolderActionMsg({ ok: true, text: `Folder GDrive ${client.companyName} berhasil dibuat/diperbaiki.` });
      } else if (kind === 'CLIENT_SKP') {
        const client = clientsList.find((x) => x.id === id);
        if (!client) throw new Error('Klien tidak ditemukan');
        const result = await ensureDrivePath([...clientPathSegments(client), 'FOLDER_SKP'], rootDriveId);
        const updatedClients = clientsList.map((x) =>
          x.id === id
            ? { ...x, skpDriveFolderUrl: result.webViewLink, skpDriveFolderId: result.folderId }
            : x,
        );
        const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Client_GDrive', id, `Buat folder SKP GDrive klien: ${client.companyName}`);
        onUpdateStore({ ...store, clients: updatedClients, auditLogs: [audit, ...store.auditLogs] });
        setFolderActionMsg({ ok: true, text: `Folder SKP ${client.companyName} berhasil dibuat/diperbaiki.` });
      } else {
        const debtorCase = casesList.find((x) => x.id === id);
        if (!debtorCase) throw new Error('Debitur tidak ditemukan');
        const client = clientsList.find((x) => x.id === debtorCase.clientId);
        const result = await ensureDrivePath(debtorPathSegments(debtorCase, client), rootDriveId);
        const updatedCases = casesList.map((x) =>
          x.id === id
            ? { ...x, gDriveFolderUrl: result.webViewLink, gDriveFolderId: result.folderId }
            : x,
        );
        const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Debtor_GDrive', id, `Buat folder GDrive debitur: ${debtorCase.debtorName}`);
        onUpdateStore({ ...store, cases: updatedCases, auditLogs: [audit, ...store.auditLogs] });
        setFolderActionMsg({ ok: true, text: `Folder GDrive debitur ${debtorCase.debtorName} berhasil dibuat/diperbaiki.` });
      }
    } catch (err: any) {
      setFolderActionMsg({ ok: false, text: `Gagal membuat folder: ${err.message || String(err)}. Periksa kredensial service account & folder master.` });
    } finally {
      setCreatingFolderKey(null);
    }
  };

  const toggleClientExpand = (clientId: string) => {
    setExpandedClients((prev) => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const handleCopyLink = (url: string, id: string) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open Edit Link Modal
  const openEditLink = (target: typeof editLinkTarget) => {
    if (!target) return;
    // URL placeholder lama (`&path=`) dibersihkan agar tidak tersimpan kembali
    const cleanUrl = (u?: string) => (u && !isPlaceholderDriveUrl(u) ? u : '');
    const cleanId = (u?: string) => (u && !isPlaceholderDriveUrl(u) ? u : '');
    setEditLinkTarget(target);
    setEditFolderUrl(cleanUrl(target.currentFolderUrl));
    setEditFolderId(cleanId(target.currentFolderId));
    setEditDocUrl(cleanUrl(target.currentDocUrl));
    setEditSphUrl(cleanUrl(target.currentSphUrl));
  };

  // Save Edit Link
  const handleSaveEditLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editLinkTarget) return;

    if (editLinkTarget.type === 'PERSONNEL') {
      const updatedPersonnel = (store.personnel || []).map((p) => {
        if (p.id === editLinkTarget.id) {
          return {
            ...p,
            gDriveFolderUrl: editFolderUrl.trim() || undefined,
            gDriveFolderId: editFolderId.trim() || undefined,
            ktpDriveFolderUrl: editDocUrl.trim() || p.ktpDriveFolderUrl,
            ktpDriveFileId: editFolderId.trim() || p.ktpDriveFileId,
          };
        }
        return p;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Personnel_GDrive',
        editLinkTarget.id,
        `Update Link Google Drive Karyawan: ${editLinkTarget.name}`
      );

      onUpdateStore({
        ...store,
        personnel: updatedPersonnel,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else if (
      editLinkTarget.type === 'CLIENT_PROPOSAL' ||
      editLinkTarget.type === 'CLIENT_MOU' ||
      editLinkTarget.type === 'CLIENT_SKP'
    ) {
      const updatedClients = (store.clients || []).map((c) => {
        if (c.id === editLinkTarget.id) {
          return {
            ...c,
            gDriveFolderUrl: editFolderUrl.trim() || c.gDriveFolderUrl,
            gDriveFolderId: editFolderId.trim() || c.gDriveFolderId,
            proposalDriveUrl:
              editLinkTarget.type === 'CLIENT_PROPOSAL'
                ? editDocUrl.trim() || c.proposalDriveUrl
                : c.proposalDriveUrl,
            mouDriveUrl:
              editLinkTarget.type === 'CLIENT_MOU'
                ? editDocUrl.trim() || c.mouDriveUrl
                : c.mouDriveUrl,
            skpDriveFolderUrl:
              editLinkTarget.type === 'CLIENT_SKP'
                ? editFolderUrl.trim() || c.skpDriveFolderUrl
                : c.skpDriveFolderUrl,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Client_GDrive',
        editLinkTarget.id,
        `Update Link Google Drive Client Multifinance: ${editLinkTarget.name}`
      );

      onUpdateStore({
        ...store,
        clients: updatedClients,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else if (editLinkTarget.type === 'DEBTOR') {
      const updatedCases = (store.cases || []).map((cs) => {
        if (cs.id === editLinkTarget.id) {
          return {
            ...cs,
            gDriveFolderUrl: editFolderUrl.trim() || cs.gDriveFolderUrl,
            gDriveFolderId: editFolderId.trim() || cs.gDriveFolderId,
            skpDriveDocumentUrl: editDocUrl.trim() || cs.skpDriveDocumentUrl,
            sphDriveDocumentUrl: editSphUrl.trim() || cs.sphDriveDocumentUrl,
          };
        }
        return cs;
      });

      const updatedCustomers = (store.customers || []).map((cust) => {
        const matchingCase = store.cases?.find((c) => c.id === editLinkTarget.id);
        if (cust.id === matchingCase?.customerId || cust.fullName === editLinkTarget.name) {
          return {
            ...cust,
            gDriveFolderUrl: editFolderUrl.trim() || cust.gDriveFolderUrl,
          };
        }
        return cust;
      });

      const updatedSks = (store.sks || []).map((sk) => {
        if (sk.caseId === editLinkTarget.id || sk.debtorName === editLinkTarget.name) {
          return {
            ...sk,
            driveFolderUrl: editFolderUrl.trim() || sk.driveFolderUrl,
            driveDocumentUrl: editDocUrl.trim() || sk.driveDocumentUrl,
          };
        }
        return sk;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Debtor_GDrive',
        editLinkTarget.id,
        `Update Link Google Drive Debitur: ${editLinkTarget.name}`
      );

      onUpdateStore({
        ...store,
        cases: updatedCases,
        customers: updatedCustomers,
        sks: updatedSks,
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setEditLinkTarget(null);
  };

  // Open Quick Upload / File Link modal
  const openUploadModal = (target: typeof uploadTarget) => {
    setUploadTarget(target);
    setUploadedUrl(target?.currentUrl || '');
    setUploadedBase64('');
  };

  const handleFileUploadLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const res = reader.result as string;
      // Keep full data URL (data:<mime>;base64,xxxx) so server can detect mimeType
      setUploadedBase64(res);
      // show a temporary uploading placeholder while actual upload happens on save
      setUploadedUrl('Uploading...');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTarget) return;

    let finalUrl = uploadedUrl.trim();
    let finalFileId: string | undefined;

    // If there's a base64 payload, upload to server Drive endpoint (service account)
    if (uploadedBase64) {
      try {
        // extract mime and base64
        const match = uploadedBase64.match(/^data:(.+);base64,(.*)$/);
        const mime = match ? match[1] : 'image/jpeg';
        const rawBase64 = match ? match[2] : uploadedBase64;
        const ext = mime.split('/')?.[1] || 'jpg';
        const fileName = `${uploadTarget.targetName || 'file'}-${Date.now().toString().slice(-6)}.${ext}`;

        // determine folderId from upload target context (use linked folder if available)
        const determineFolderId = () => {
          const extractFolderId = (u?: string) => {
            if (!u) return undefined;
            const m = u.match(/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/);
            if (m) return m[1];
            const m2 = u.match(/folders\/([a-zA-Z0-9_-]+)/);
            if (m2) return m2[1];
            return undefined;
          };

          if (uploadTarget.type === 'PERSONNEL_KTP') {
            const p = (store.personnel || []).find((x) => x.id === uploadTarget.id);
            return p?.gDriveFolderId || extractFolderId(p?.gDriveFolderUrl) || store.settings?.googleDriveFolderId;
          }

          if (uploadTarget.type === 'DEBTOR_SKP' || uploadTarget.type === 'DEBTOR_SPH') {
            const cs = (store.cases || []).find((c) => c.id === uploadTarget.id);
            return cs?.gDriveFolderId || extractFolderId(cs?.gDriveFolderUrl) || store.settings?.googleDriveFolderId;
          }

          if (uploadTarget.type === 'CLIENT_PROPOSAL' || uploadTarget.type === 'CLIENT_MOU') {
            const cl = (store.clients || []).find((c) => c.id === uploadTarget.id);
            return cl?.gDriveFolderId || extractFolderId(cl?.gDriveFolderUrl) || store.settings?.googleDriveFolderId;
          }

          return store.settings?.googleDriveFolderId;
        };

        const folderIdToUse = determineFolderId();

        const resp = await fetch('/api/drive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName, mimeType: mime, base64: uploadedBase64, folderId: folderIdToUse }),
        });

        const json = await resp.json();
        if (!json || !json.success) {
          console.error('Drive upload failed', json);
          alert('Gagal mengunggah ke Google Drive: ' + (json?.error || 'Unknown'));
        } else {
          finalUrl = json.webViewLink || `https://drive.google.com/file/d/${json.fileId}/view?usp=sharing`;
          finalFileId = json.fileId;
        }
      } catch (err) {
        console.error('Upload error', err);
        alert('Gagal mengunggah berkas ke server. Periksa koneksi atau konfigurasi server.');
      }
    }

    if (uploadTarget.type === 'PERSONNEL_KTP') {
      const updatedPersonnel = (store.personnel || []).map((p) => {
        if (p.id === uploadTarget.id) {
          return {
            ...p,
            ktpDriveFolderUrl: finalUrl || p.ktpDriveFolderUrl,
            ktpPhotoUrl: finalUrl || p.ktpPhotoUrl,
            ktpDriveFileId: finalFileId || p.ktpDriveFileId,
          };
        }
        return p;
      });
      onUpdateStore({ ...store, personnel: updatedPersonnel });
    } else if (uploadTarget.type === 'CLIENT_PROPOSAL') {
      const updatedClients = (store.clients || []).map((c) => {
        if (c.id === uploadTarget.id) {
          return { ...c, proposalDriveUrl: finalUrl || c.proposalDriveUrl, proposalStatus: 'SENT' };
        }
        return c;
      });
      onUpdateStore({ ...store, clients: updatedClients });
    } else if (uploadTarget.type === 'CLIENT_MOU') {
      const updatedClients = (store.clients || []).map((c) => {
        if (c.id === uploadTarget.id) {
          return { ...c, mouDriveUrl: finalUrl || c.mouDriveUrl, mouStatus: 'ACTIVE' };
        }
        return c;
      });
      onUpdateStore({ ...store, clients: updatedClients });
    } else if (uploadTarget.type === 'DEBTOR_SKP') {
      const updatedCases = (store.cases || []).map((cs) => {
        if (cs.id === uploadTarget.id) {
          return { ...cs, skpDriveDocumentUrl: finalUrl || cs.skpDriveDocumentUrl };
        }
        return cs;
      });
      onUpdateStore({ ...store, cases: updatedCases });
    } else if (uploadTarget.type === 'DEBTOR_SPH') {
      const updatedCases = (store.cases || []).map((cs) => {
        if (cs.id === uploadTarget.id) {
          return { ...cs, sphDriveDocumentUrl: finalUrl || cs.sphDriveDocumentUrl };
        }
        return cs;
      });
      onUpdateStore({ ...store, cases: updatedCases });
    }

    // reset modal
    setUploadedBase64('');
    setUploadedUrl('');
    setUploadTarget(null);
  };

  // Add Debitur under Multifinance
  const handleAddDebtor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addDebtorClientId || !newDebtorName.trim()) return;

    const targetClient = store.clients?.find((c) => c.id === addDebtorClientId);
    if (!targetClient) return;

    const custId = `CUST-${Date.now().toString().slice(-4)}`;
    const caseId = `CAS-${Date.now().toString().slice(-4)}`;
    const skId = `SK-${Date.now().toString().slice(-4)}`;

    const slugDebtor = slugify(newDebtorName.trim());
    const slugClient = slugify(targetClient.companyName);

    // Buat folder asli di Google Drive: PT_MJ_INDONESIA > MULTIFINANCE > [Klien] > FOLDER_SKP > DEBITUR_[nama]
    let debtorFolderUrl = '';
    let debtorFolderId = '';
    try {
      const driveResult = await ensureDrivePath(
        ['PT_MJ_INDONESIA', 'MULTIFINANCE', slugClient, 'FOLDER_SKP', `DEBITUR_${slugDebtor}`],
        rootDriveId,
      );
      debtorFolderUrl = driveResult.webViewLink;
      debtorFolderId = driveResult.folderId;
    } catch (err: any) {
      console.warn('Gagal membuat folder GDrive debitur, memakai folder master:', err);
      debtorFolderUrl = rootDriveUrl;
    }
    const skpSimulatedUrl = '';
    const sphSimulatedUrl = '';

    const newCustomer: Customer = {
      id: custId,
      customerCode: `DEB-${Date.now().toString().slice(-4)}`,
      contractNo: newContractNo.trim() || `CTR-${Date.now().toString().slice(-4)}`,
      nikKtp: newDebtorNik.trim() || '3171000000000000',
      fullName: newDebtorName.trim(),
      phone: newPhone.trim() || '0812-0000-0000',
      addressCurrent: newAddress.trim() || 'Alamat Domisili Debitur',
      addressKtp: newAddress.trim() || 'Alamat KTP Debitur',
      workplace: 'Karyawan / Wiraswasta',
      emergencyContactName: 'Keluarga',
      emergencyContactPhone: '0812-9999-8888',
      vehicleMerkType: newVehicle.trim() || 'Unit Kendaraan Bermotor',
      vehiclePoliceNo: newPoliceNo.trim() || 'B 1234 XYZ',
      riskNotes: 'Data debitur baru diinput melalui Direktori GDrive Multifinance.',
      gDriveFolderUrl: debtorFolderUrl,
      createdAt: new Date().toISOString(),
    };

    const newCase: Case = {
      id: caseId,
      caseNo: `CAS/${targetClient.clientCode}/${new Date().getFullYear()}/${(casesList.length + 1).toString().padStart(3, '0')}`,
      clientId: targetClient.id,
      clientName: targetClient.companyName,
      clientType: 'MULTIFINANCE',
      contractId: 'CTR-001',
      customerId: custId,
      debtorName: newDebtorName.trim(),
      debtorNik: newDebtorNik.trim() || '3171000000000000',
      multifinanceContractNo: newContractNo.trim() || `CTR-${Date.now().toString().slice(-4)}`,
      serviceId: 'SRV-001',
      serviceName: 'Penagihan & Recovery Unit Kendaraan',
      principalDebtOS: Number(newPrincipalOS) || 50000000,
      overdueDays: Number(newOverdueDays) || 90,
      dpdBucket: '90-180',
      assetSummary: `${newVehicle.trim()} (${newPoliceNo.trim()})`,
      gDriveFolderName: `📁 DEBITUR_${slugDebtor}`,
      gDriveFolderUrl: debtorFolderUrl,
      gDriveFolderId: debtorFolderId || undefined,
      skpDriveDocumentUrl: skpSimulatedUrl,
      sphDriveDocumentUrl: sphSimulatedUrl,
      feeTypeSnapshot: 'SUCCESS_FEE',
      feePercentSnapshot: 15,
      status: 'ASSIGNED',
      currentPersonnelId: personnelList[0]?.id,
      currentPersonnelName: personnelList[0]?.fullName,
      createdAt: new Date().toISOString(),
    };

    const newSk: SK = {
      id: skId,
      skNumber: `SK/MJ/${targetClient.clientCode}/${new Date().getFullYear()}/${(store.sks?.length || 0 + 1).toString().padStart(3, '0')}`,
      caseId: caseId,
      caseNo: newCase.caseNo,
      debtorName: newDebtorName.trim(),
      clientType: 'MULTIFINANCE',
      clientName: targetClient.companyName,
      pemberiKuasaType: 'PERUSAHAAN',
      personnelId: personnelList[0]?.id || 'PER-001',
      personnelName: personnelList[0]?.fullName || 'Petugas Lapangan',
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'ACTIVE',
      approvedBy: 'Direktur Utama',
      approvedAt: new Date().toISOString(),
      driveFolderUrl: debtorFolderUrl,
      driveDocumentUrl: skpSimulatedUrl,
      createdAt: new Date().toISOString(),
    };

    const updatedCases = [newCase, ...(store.cases || [])];
    const updatedCustomers = [newCustomer, ...(store.customers || [])];
    const updatedSks = [newSk, ...(store.sks || [])];

    // Update activeCasesCount on client
    const updatedClients = (store.clients || []).map((c) => {
      if (c.id === targetClient.id) {
        return { ...c, activeCasesCount: (c.activeCasesCount || 0) + 1 };
      }
      return c;
    });

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Debtor_Case',
      caseId,
      `Tambah data Debitur ${newDebtorName.trim()} di bawah Multifinance ${targetClient.companyName} dengan Folder GDrive`
    );

    onUpdateStore({
      ...store,
      cases: updatedCases,
      customers: updatedCustomers,
      sks: updatedSks,
      clients: updatedClients,
      auditLogs: [audit, ...store.auditLogs],
    });

    // Reset Form & Close
    setAddDebtorClientId(null);
    setNewDebtorName('');
    setNewDebtorNik('');
    setNewContractNo('');
    setNewVehicle('');
    setNewPoliceNo('');
    setNewPrincipalOS(50000000);
    setNewOverdueDays(90);
    setNewPhone('');
    setNewAddress('');
  };

  // Filter lists by search query
  const filteredPersonnel = personnelList.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.fullName.toLowerCase().includes(q) ||
      p.nikKtp.includes(q) ||
      (p.position && p.position.toLowerCase().includes(q))
    );
  });

  const filteredClients = clientsList.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const matchClient = c.companyName.toLowerCase().includes(q) || c.clientCode.toLowerCase().includes(q);
    const hasMatchingDebtor = casesList.some(
      (cs) => cs.clientId === c.id && (cs.debtorName.toLowerCase().includes(q) || cs.multifinanceContractNo.toLowerCase().includes(q))
    );
    return matchClient || hasMatchingDebtor;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner & Breadcrumbs Structure */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-600 to-blue-700 text-white rounded-2xl shadow-lg shrink-0">
              <HardDrive className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white">
                  Direktori Google Drive & Database Terpadu
                </h2>
                <span className="px-2.5 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-700 text-[10px] font-bold rounded-full">
                  MULTI-TIER FOLDER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Kelola pratinjau, tautkan file, dan perbarui link Google Drive untuk setiap Karyawan/Mitra PT MJ serta Debitur masing-masing Klien Multifinance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={rootDriveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg transition"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Buka GDrive Master</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Structure Navigation Pills */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
          <div className="text-[11px] font-bold text-indigo-400 flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-indigo-400" />
            <span>Struktur Folder Resmi Sistem PT Mitrajasa Satria Indonesia:</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-start gap-2">
              <span className="px-2 py-0.5 bg-blue-950 text-blue-300 rounded font-mono font-bold text-[10px] shrink-0">
                1. KARYAWAN
              </span>
              <span className="text-slate-300 font-mono text-[11px] break-all">
                📁 PT MJ INDONESIA &gt; 📁 DATABASE KARYAWAN &gt; 📁 [NAMA TIAP KARYAWAN]
              </span>
            </div>

            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-start gap-2">
              <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded font-mono font-bold text-[10px] shrink-0">
                2. KLIEN &amp; DEBITUR
              </span>
              <span className="text-slate-300 font-mono text-[11px] break-all">
                📁 PT MJ INDONESIA &gt; 📁 MULTIFINANCE &gt; 📁 [MULTIFINANCE] &gt; 📁 PROPOSAL / 📁 SKP &gt; 📁 [NAMA DEBITUR]
              </span>
            </div>
          </div>
        </div>

        {/* Filters & Search Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSection('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSection === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              <span>Semua Database</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('KARYAWAN')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSection === 'KARYAWAN'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>1. Database Karyawan ({personnelList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('MULTIFINANCE')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                activeSection === 'MULTIFINANCE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>2. Database Klien &amp; Debitur ({clientsList.length})</span>
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari Karyawan / Multifinance / Debitur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {folderActionMsg && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${folderActionMsg.ok ? 'bg-emerald-950/80 text-emerald-200 border-emerald-700' : 'bg-rose-950/80 text-rose-200 border-rose-700'}`}>
          {folderActionMsg.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{folderActionMsg.text}</span>
        </div>
      )}

      {/* SECTION 1: DATABASE KARYAWAN PT MJ INDONESIA */}
      {(activeSection === 'ALL' || activeSection === 'KARYAWAN') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Database Karyawan PT MJ Indonesia
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Struktur: PT MJ INDONESIA &gt; DATABASE KARYAWAN &gt; [NAMA TIAP KARYAWAN]
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-blue-950 text-blue-300 border border-blue-800 rounded-full">
              {filteredPersonnel.length} Personel Terdaftar
            </span>
          </div>

          {filteredPersonnel.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Tidak ada data karyawan yang sesuai dengan pencarian.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredPersonnel.map((p) => {
                const hasRealFolder = isRealFolder(p.gDriveFolderUrl, p.gDriveFolderId);
                const folderUrl = hasRealFolder
                  ? p.gDriveFolderUrl || folderUrlFromId(p.gDriveFolderId)
                  : '';
                const folderPlaceholderText = `Folder belum dibuat — klik "Buat Folder GDrive"`;
                const ktpDocUrl = p.ktpDriveFolderUrl || '';

                return (
                  <div
                    key={p.id}
                    className="bg-slate-950/80 border border-slate-800 hover:border-slate-700 rounded-xl p-4 space-y-3 shadow-md transition"
                  >
                    {/* Header Item */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {p.ktpPhotoUrl ? (
                          <button
                            type="button"
                            onClick={() => setPreviewKtpPersonnel(p)}
                            className="w-12 h-12 rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shrink-0 cursor-pointer hover:opacity-80 transition"
                            title="Klik untuk Preview Foto KTP"
                          >
                            <img src={p.ktpPhotoUrl} alt="Foto KTP" className="w-full h-full object-cover" />
                          </button>
                        ) : (
                          <div className="w-12 h-12 rounded-xl border border-dashed border-slate-700 bg-slate-900 flex items-center justify-center text-slate-500 shrink-0">
                            <Users className="w-5 h-5" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white text-sm">{p.fullName}</h4>
                            <span
                              className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${
                                p.type === 'KARYAWAN'
                                  ? 'bg-blue-950 text-blue-300 border-blue-800'
                                  : 'bg-amber-950 text-amber-300 border-amber-800'
                              }`}
                            >
                              {p.type === 'KARYAWAN' ? 'Karyawan Internal' : 'Mitra DC Freelance'}
                            </span>
                          </div>
                          <p className="text-xs text-indigo-300 font-medium">{p.position || 'Staf Lapangan'}</p>
                          <span className="text-[10px] text-slate-400 font-mono">NIK: {p.nikKtp}</span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full">
                        {p.status || 'ACTIVE'}
                      </span>
                    </div>

                    {/* Google Drive Link Box */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                          <Folder className="w-3.5 h-3.5 text-blue-400" />
                          <span>Folder GDrive Karyawan:</span>
                        </span>
                        <span className="text-[10px] text-indigo-400 font-mono">
                          📁 {slugify(p.fullName)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={folderUrl || folderPlaceholderText}
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 font-mono truncate select-all focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyLink(folderUrl, `FLD-${p.id}`)}
                          disabled={!folderUrl}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Salin Link Folder"
                        >
                          {copiedId === `FLD-${p.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        {folderUrl ? (
                          <a
                            href={folderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                            title="Buka Folder di Google Drive"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-500">
                            Belum dibuat
                          </span>
                        )}
                      </div>

                      {/* KTP Document Link row */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                        <span className="text-slate-400 flex items-center gap-1">
                          <ImageIcon className="w-3 h-3 text-amber-400" />
                          <span>Berkas KTP &amp; KYC:</span>
                        </span>
                        {ktpDocUrl ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-emerald-400 font-semibold text-[10px] flex items-center gap-0.5">
                              <CheckCircle2 className="w-3 h-3" /> Terhubung
                            </span>
                            <a
                              href={ktpDocUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-400 hover:underline text-[10px] flex items-center gap-0.5"
                            >
                              Lihat File <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[10px]">Belum ditautkan</span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => setPreviewKtpPersonnel(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-400" />
                        <span>Preview KTP</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIdCardPersonnel(p)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-red-950 to-red-900 hover:from-red-900 hover:to-red-800 border border-red-700/80 text-red-200 text-xs font-bold rounded-lg transition"
                      >
                        <CreditCard className="w-3.5 h-3.5 text-red-400" />
                        <span>ID Card</span>
                      </button>

                      {canEdit && (
                        <>
                          <button
                            type="button"
                            disabled={!!creatingFolderKey}
                            onClick={() => handleEnsureFolder('PERSONNEL', p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-950 hover:bg-blue-900 border border-blue-800 text-blue-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                          >
                            {creatingFolderKey === `PERSONNEL-${p.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FolderCheck className="w-3.5 h-3.5 text-blue-400" />
                            )}
                            {hasRealFolder ? 'Perbaiki Folder' : 'Buat Folder GDrive'}
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              openEditLink({
                                type: 'PERSONNEL',
                                id: p.id,
                                name: p.fullName,
                                currentFolderUrl: p.gDriveFolderUrl || folderUrl,
                                currentFolderId: p.gDriveFolderId || p.ktpDriveFileId,
                                currentDocUrl: p.ktpDriveFolderUrl || '',
                                extraNote: `Struktur: PT MJ INDONESIA > DATABASE KARYAWAN > ${slugify(p.fullName)}`,
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-xs font-semibold rounded-lg transition"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Edit Link</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              openUploadModal({
                                type: 'PERSONNEL_KTP',
                                id: p.id,
                                title: `Upload Berkas KTP - ${p.fullName}`,
                                targetName: p.fullName,
                                currentUrl: p.ktpDriveFolderUrl,
                              })
                            }
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg transition"
                          >
                            <Upload className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Upload / Tautkan</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SECTION 2: DATABASE KLIEN &amp; DEBITUR PT MJ INDONESIA */}
      {(activeSection === 'ALL' || activeSection === 'MULTIFINANCE') && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">
                  Database Multifinance &amp; Debitur SKP
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Struktur: PT MJ INDONESIA &gt; MULTIFINANCE &gt; [NAMA MULTIFINANCE] &gt; PROPOSAL &amp; SKP &gt; [NAMA DEBITUR]
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full">
              {filteredClients.length} Klien Multifinance Terdaftar
            </span>
          </div>

          {filteredClients.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Tidak ada data Multifinance yang sesuai dengan pencarian.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => {
                const isExpanded = !!expandedClients[client.id];
                const clientDebtors = casesList.filter((cs) => cs.clientId === client.id);

                const slugClient = slugify(client.companyName);
                const hasRealClientFolder = isRealFolder(client.gDriveFolderUrl, client.gDriveFolderId);
                const clientFolderUrl = hasRealClientFolder
                  ? client.gDriveFolderUrl || folderUrlFromId(client.gDriveFolderId)
                  : '';
                const proposalUrl = client.proposalDriveUrl || '';
                const mouUrl = client.mouDriveUrl || '';
                const hasRealSkpFolder = isRealFolder(client.skpDriveFolderUrl, client.skpDriveFolderId);
                const skpFolderUrl = hasRealSkpFolder
                  ? client.skpDriveFolderUrl || folderUrlFromId(client.skpDriveFolderId)
                  : '';

                return (
                  <div
                    key={client.id}
                    className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg transition"
                  >
                    {/* Multifinance Header Row */}
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleClientExpand(client.id)}
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition shrink-0 mt-0.5"
                          title="Buka / Tutup Folder Multifinance"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-bold text-white text-base truncate">
                              {client.companyName}
                            </h4>
                            <span className="px-2.5 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono font-bold rounded-full">
                              {client.clientCode}
                            </span>
                            <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px] font-semibold rounded-full">
                              {clientDebtors.length} Debitur Terdaftar
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            PIC: {client.contactPerson} | Telp: {client.phone}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {clientFolderUrl ? (
                          <a
                            href={clientFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                            title="Buka Folder Multifinance di Google Drive"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Folder Multifinance</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 border border-dashed border-slate-700 text-slate-400 text-xs font-semibold rounded-lg">
                            <Folder className="w-3.5 h-3.5 text-amber-400" />
                            Folder belum dibuat
                          </span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            disabled={!!creatingFolderKey}
                            onClick={() => handleEnsureFolder('CLIENT', client.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                          >
                            {creatingFolderKey === `CLIENT-${client.id}` ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FolderCheck className="w-3.5 h-3.5 text-emerald-400" />
                            )}
                            {hasRealClientFolder ? 'Perbaiki Folder' : 'Buat Folder'}
                          </button>
                        )}

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => setAddDebtorClientId(client.id)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-md transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Tambah Debitur Baru</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multifinance Sub-Folders & Debtors Content */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 space-y-5">
                        {/* Sub-Folders: 1. PROPOSAL & 2. MOU */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Folder Proposal */}
                          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-400" />
                                <span className="font-bold text-white text-xs">
                                  📁 FOLDER PROPOSAL KERJASAMA
                                </span>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  client.proposalStatus === 'ACCEPTED'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                }`}
                              >
                                {client.proposalStatus || 'TERKIRIM'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                              <div>Path: /MULTIFINANCE/{slugClient}/PROPOSAL/</div>
                              <div className="text-slate-300 truncate">
                                File: Proposal Kerjasama Penagihan PT MJ - {client.companyName}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                              {proposalUrl ? (
                                <>
                                  <a
                                    href={proposalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Buka Proposal</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(proposalUrl, `PROP-${client.id}`)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                    title="Salin Link Proposal"
                                  >
                                    {copiedId === `PROP-${client.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">Belum ada link proposal</span>
                              )}

                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditLink({
                                        type: 'CLIENT_PROPOSAL',
                                        id: client.id,
                                        name: `${client.companyName} (Proposal)`,
                                        currentFolderUrl: clientFolderUrl,
                                        currentDocUrl: proposalUrl,
                                        extraNote: 'Link dokumen Proposal Kerjasama di Google Drive',
                                      })
                                    }
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 rounded-lg transition text-xs flex items-center gap-1"
                                    title="Edit Link Proposal"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openUploadModal({
                                        type: 'CLIENT_PROPOSAL',
                                        id: client.id,
                                        title: `Upload Proposal - ${client.companyName}`,
                                        targetName: client.companyName,
                                        currentUrl: proposalUrl,
                                      })
                                    }
                                    className="p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg transition text-xs flex items-center gap-1"
                                    title="Upload Proposal"
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>Tautkan File</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Folder MoU & PKS */}
                          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileSignature className="w-4 h-4 text-emerald-400" />
                                <span className="font-bold text-white text-xs">
                                  📁 FOLDER MOU &amp; PKS RESMI
                                </span>
                              </div>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                                  client.mouStatus === 'ACTIVE'
                                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                    : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                                }`}
                              >
                                {client.mouStatus || 'ACTIVE'}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-400 space-y-1 font-mono">
                              <div>No. Kontrak: {client.mouContractNo || 'MOU/MJ/2026/001'}</div>
                              <div className="text-slate-300 truncate">
                                Perjanjian Kerjasama Penagihan &amp; Recovery Unit
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                              {mouUrl ? (
                                <>
                                  <a
                                    href={mouUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Buka MoU</span>
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyLink(mouUrl, `MOU-${client.id}`)}
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                                    title="Salin Link MoU"
                                  >
                                    {copiedId === `MOU-${client.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs text-slate-500">Belum ada link MoU</span>
                              )}

                              {canEdit && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openEditLink({
                                        type: 'CLIENT_MOU',
                                        id: client.id,
                                        name: `${client.companyName} (MoU & PKS)`,
                                        currentFolderUrl: clientFolderUrl,
                                        currentDocUrl: mouUrl,
                                        extraNote: 'Link dokumen MoU / Perjanjian Kerjasama di Google Drive',
                                      })
                                    }
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg transition text-xs flex items-center gap-1"
                                    title="Edit Link MoU"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openUploadModal({
                                        type: 'CLIENT_MOU',
                                        id: client.id,
                                        title: `Upload MoU Kerjasama - ${client.companyName}`,
                                        targetName: client.companyName,
                                        currentUrl: mouUrl,
                                      })
                                    }
                                    className="p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded-lg transition text-xs flex items-center gap-1"
                                    title="Upload MoU"
                                  >
                                    <Upload className="w-3 h-3" />
                                    <span>Tautkan File</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Sub-Folder: 3. FOLDER SKP & DAFTAR DEBITUR */}
                        <div className="space-y-3">
                          <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded-lg">
                                <Folder className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-bold text-white text-xs sm:text-sm">
                                  📁 FOLDER SKP (Surat Kuasa Penagihan) &amp; Berkas Debitur
                                </h5>
                                <p className="text-[11px] text-slate-400 font-mono">
                                  Struktur: /MULTIFINANCE/{slugClient}/FOLDER_SKP/
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {skpFolderUrl ? (
                                <a
                                  href={skpFolderUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold rounded-lg transition"
                                >
                                  <FolderOpen className="w-3.5 h-3.5" />
                                  <span>Buka Folder SKP GDrive</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-950 border border-dashed border-slate-700 text-amber-300/80 text-xs font-semibold rounded-lg">
                                  <Folder className="w-3.5 h-3.5 text-amber-400" />
                                  Folder SKP belum dibuat
                                </span>
                              )}
                              {canEdit && (
                                <button
                                  type="button"
                                  disabled={!!creatingFolderKey}
                                  onClick={() => handleEnsureFolder('CLIENT_SKP', client.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold rounded-lg transition disabled:opacity-50"
                                >
                                  {creatingFolderKey === `CLIENT_SKP-${client.id}` ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <FolderCheck className="w-3.5 h-3.5 text-amber-400" />
                                  )}
                                  Buat Folder SKP
                                </button>
                              )}
                            </div>
                          </div>

                          {/* List of Debtors under this Multifinance */}
                          {clientDebtors.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-slate-800 text-center space-y-2">
                              <p className="text-xs text-slate-400">
                                Belum ada data debitur yang terdaftar di bawah {client.companyName}.
                              </p>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => setAddDebtorClientId(client.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>+ Tambah Debitur Pertama</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                              {clientDebtors.map((debtorCase) => {
                                const slugDebtor = slugify(debtorCase.debtorName);
                                const hasRealDebtorFolder = isRealFolder(debtorCase.gDriveFolderUrl, debtorCase.gDriveFolderId);
                                const debtorFolder = hasRealDebtorFolder
                                  ? debtorCase.gDriveFolderUrl || folderUrlFromId(debtorCase.gDriveFolderId)
                                  : '';
                                const folderPlaceholder = `Folder belum dibuat — klik "Buat Folder GDrive"`;
                                const skpDoc = debtorCase.skpDriveDocumentUrl || '';
                                const sphDoc = debtorCase.sphDriveDocumentUrl || '';

                                return (
                                  <div
                                    key={debtorCase.id}
                                    className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md hover:border-slate-700 transition"
                                  >
                                    {/* Debitur Name & Vehicle */}
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="flex items-start gap-2.5">
                                        <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-lg shrink-0 mt-0.5">
                                          <Car className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <h6 className="font-bold text-white text-xs sm:text-sm">
                                            {debtorCase.debtorName}
                                          </h6>
                                          <p className="text-[11px] text-slate-300">
                                            {debtorCase.assetSummary}
                                          </p>
                                          <span className="text-[10px] text-slate-400 font-mono">
                                            No. Kontrak: {debtorCase.multifinanceContractNo} | NIK: {debtorCase.debtorNik}
                                          </span>
                                        </div>
                                      </div>

                                      <div className="text-right shrink-0">
                                        <span className="text-xs font-bold text-emerald-400 font-mono block">
                                          Rp {(debtorCase.principalDebtOS || 0).toLocaleString('id-ID')}
                                        </span>
                                        <span className="text-[9px] px-2 py-0.5 bg-slate-800 text-slate-300 rounded font-semibold border border-slate-700">
                                          DPD {debtorCase.overdueDays} Hari
                                        </span>
                                      </div>
                                    </div>

                                    {/* Debitur GDrive Folder Row */}
                                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1">
                                          <Folder className="w-3 h-3 text-amber-400" />
                                          <span>Folder Debitur:</span>
                                        </span>
                                        <span className="text-[10px] text-indigo-300 font-mono">
                                          📁 DEBITUR_{slugDebtor}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2">
                                        <input
                                          type="text"
                                          readOnly
                                          value={debtorFolder || folderPlaceholder}
                                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 font-mono truncate select-all"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleCopyLink(debtorFolder, `DEB-${debtorCase.id}`)}
                                          disabled={!debtorFolder}
                                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition disabled:opacity-40 disabled:cursor-not-allowed"
                                          title="Salin Link Folder Debitur"
                                        >
                                          {copiedId === `DEB-${debtorCase.id}` ? (
                                            <Check className="w-3 h-3 text-emerald-400" />
                                          ) : (
                                            <Copy className="w-3 h-3" />
                                          )}
                                        </button>
                                        {debtorFolder ? (
                                          <a
                                            href={debtorFolder}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded transition"
                                            title="Buka Folder di Google Drive"
                                          >
                                            <ExternalLink className="w-3 h-3" />
                                          </a>
                                        ) : (
                                          <span className="px-1.5 py-1 bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-500">
                                            Belum dibuat
                                          </span>
                                        )}
                                      </div>

                                      {/* SKP & SPH Status Links */}
                                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[10px]">
                                        <div>
                                          <span className="text-slate-500 block">Berkas SKP:</span>
                                          {skpDoc ? (
                                            <a
                                              href={skpDoc}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-emerald-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                                            >
                                              📄 SKP Terhubung <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          ) : (
                                            <span className="text-slate-500">Belum ditautkan</span>
                                          )}
                                        </div>

                                        <div>
                                          <span className="text-slate-500 block">Berkas SPH/KTP:</span>
                                          {sphDoc ? (
                                            <a
                                              href={sphDoc}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5"
                                            >
                                              📄 SPH Terhubung <ExternalLink className="w-2.5 h-2.5" />
                                            </a>
                                          ) : (
                                            <span className="text-slate-500">Belum ditautkan</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    {/* Action Buttons for Debitur */}
                                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const matchedSk = store.sks?.find((s) => s.caseId === debtorCase.id);
                                          const skPreviewData: SK = matchedSk || {
                                            id: `SK-${debtorCase.id}`,
                                            skNumber: `SK/MJ/${client.clientCode}/${new Date().getFullYear()}/001`,
                                            caseId: debtorCase.id,
                                            caseNo: debtorCase.caseNo,
                                            debtorName: debtorCase.debtorName,
                                            clientType: 'MULTIFINANCE',
                                            clientName: client.companyName,
                                            pemberiKuasaType: 'PERUSAHAAN',
                                            personnelId: debtorCase.currentPersonnelId || 'PER-001',
                                            personnelName: debtorCase.currentPersonnelName || 'Petugas Lapangan',
                                            issuedDate: new Date().toISOString().split('T')[0],
                                            expiryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
                                            status: 'ACTIVE',
                                            driveFolderUrl: debtorFolder,
                                            driveDocumentUrl: skpDoc,
                                            createdAt: new Date().toISOString(),
                                          };

                                          setPreviewDocData({
                                            type: 'SK',
                                            sk: skPreviewData,
                                            title: `Surat Kuasa Penagihan (SKP) - ${debtorCase.debtorName}`,
                                            driveUrl: skpDoc || debtorFolder,
                                            folderUrl: debtorFolder,
                                          });
                                        }}
                                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-indigo-400" />
                                        <span>Preview SKP</span>
                                      </button>

                                      {canEdit && (
                                        <>
                                          <button
                                            type="button"
                                            disabled={!!creatingFolderKey}
                                            onClick={() => handleEnsureFolder('DEBTOR', debtorCase.id)}
                                            className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 text-xs font-semibold rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                                          >
                                            {creatingFolderKey === `DEBTOR-${debtorCase.id}` ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <FolderCheck className="w-3.5 h-3.5 text-amber-400" />
                                            )}
                                            {hasRealDebtorFolder ? 'Perbaiki Folder' : 'Buat Folder'}
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openEditLink({
                                                type: 'DEBTOR',
                                                id: debtorCase.id,
                                                name: `${debtorCase.debtorName} (${client.companyName})`,
                                                currentFolderUrl: debtorCase.gDriveFolderUrl || debtorFolder,
                                                currentFolderId: debtorCase.gDriveFolderId || '',
                                                currentDocUrl: debtorCase.skpDriveDocumentUrl || '',
                                                currentSphUrl: debtorCase.sphDriveDocumentUrl || '',
                                                extraNote: `Struktur: MULTIFINANCE > ${slugClient} > FOLDER_SKP > DEBITUR_${slugDebtor}`,
                                              })
                                            }
                                            className="px-2.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-800 text-indigo-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                                          >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            <span>Edit Link</span>
                                          </button>

                                          <button
                                            type="button"
                                            onClick={() =>
                                              openUploadModal({
                                                type: 'DEBTOR_SKP',
                                                id: debtorCase.id,
                                                title: `Tautkan Dokumen SKP - ${debtorCase.debtorName}`,
                                                targetName: debtorCase.debtorName,
                                                currentUrl: debtorCase.skpDriveDocumentUrl,
                                              })
                                            }
                                            className="px-2.5 py-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                                          >
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Tautkan SKP</span>
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: EDIT LINK MODAL (Compact, Viewport-Constrained) */}
      {editLinkTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveEditLink}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Perbarui Tautan Google Drive
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                    {editLinkTarget.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditLinkTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Structure Note */}
            {editLinkTarget.extraNote && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-indigo-300">
                {editLinkTarget.extraNote}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  URL / Tautan Folder Google Drive:
                </label>
                <input
                  type="text"
                  required
                  value={editFolderUrl}
                  onChange={(e) => setEditFolderUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Google Drive Folder ID (Opsional):
                </label>
                <input
                  type="text"
                  value={editFolderId}
                  onChange={(e) => setEditFolderId(e.target.value)}
                  placeholder="e.g. 11OxYLvKiH8P4AIP_..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  {editLinkTarget.type === 'PERSONNEL'
                    ? 'Tautan Berkas Scan KTP / Dokumen KYC:'
                    : editLinkTarget.type === 'DEBTOR'
                    ? 'Tautan Dokumen SKP (Surat Kuasa Penagihan):'
                    : editLinkTarget.type === 'CLIENT_PROPOSAL'
                    ? 'Tautan Dokumen Proposal Kerjasama:'
                    : 'Tautan Dokumen MoU / Perjanjian Pokok:'}
                </label>
                <input
                  type="text"
                  value={editDocUrl}
                  onChange={(e) => setEditDocUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              {editLinkTarget.type === 'DEBTOR' && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Tautan Berkas SPH / Surat Pengakuan Hutang &amp; KTP Debitur:
                  </label>
                  <input
                    type="text"
                    value={editSphUrl}
                    onChange={(e) => setEditSphUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditLinkTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Perubahan Link</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: UPLOAD & TAUTKAN FILE MODAL (Compact, Viewport-Constrained) */}
      {uploadTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveUpload}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Upload className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">{uploadTarget.title}</h3>
                  <p className="text-[11px] text-slate-400 truncate max-w-[280px]">
                    Subjek: {uploadTarget.targetName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUploadTarget(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload Area */}
            <div className="space-y-3 text-xs">
              <label className="border-2 border-dashed border-slate-700 hover:border-emerald-500 bg-slate-950 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition text-center group">
                <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-400 mb-1 transition" />
                <span className="font-semibold text-slate-200">Pilih berkas dari komputer/HP</span>
                <span className="text-[10px] text-slate-500">Format: JPG, PNG, PDF</span>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUploadLocal}
                  className="hidden"
                />
              </label>

              {uploadedBase64 && (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                  <span className="text-emerald-300 font-semibold text-[11px] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> File berhasil diproses
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setUploadedBase64('');
                      setUploadedUrl('');
                    }}
                    className="text-rose-400 hover:underline text-[10px]"
                  >
                    Hapus
                  </button>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Atau masukkan URL Berkas di Google Drive secara langsung:
                </label>
                <input
                  type="text"
                  required
                  value={uploadedUrl}
                  onChange={(e) => setUploadedUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setUploadTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Tautan Berkas</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: TAMBAH DEBITUR BARU (Compact, Viewport-Constrained) */}
      {addDebtorClientId && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form
            onSubmit={handleAddDebtor}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-600/10 border border-emerald-500/20 text-emerald-400 rounded-xl">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">
                    Tambah Debitur &amp; Buat Folder GDrive Otomatis
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Klien: {clientsList.find((c) => c.id === addDebtorClientId)?.companyName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddDebtorClientId(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">
                  Nama Lengkap Debitur <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Budi Santoso, S.Kom."
                  value={newDebtorName}
                  onChange={(e) => setNewDebtorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  NIK KTP Debitur
                </label>
                <input
                  type="text"
                  placeholder="16 digit NIK"
                  value={newDebtorNik}
                  onChange={(e) => setNewDebtorNik(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  No. Kontrak / Perjanjian Lising
                </label>
                <input
                  type="text"
                  placeholder="e.g. ADR-2026-99120"
                  value={newContractNo}
                  onChange={(e) => setNewContractNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Agunan / Merk Unit Kendaraan
                </label>
                <input
                  type="text"
                  placeholder="e.g. Toyota Avanza 1.5 G"
                  value={newVehicle}
                  onChange={(e) => setNewVehicle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Nomor Polisi (Plat No)
                </label>
                <input
                  type="text"
                  placeholder="e.g. B 1928 KLC"
                  value={newPoliceNo}
                  onChange={(e) => setNewPoliceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Sisa Pokok Hutang (O/S) (Rp)
                </label>
                <input
                  type="number"
                  value={newPrincipalOS}
                  onChange={(e) => setNewPrincipalOS(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Hari Keterlambatan (DPD)
                </label>
                <input
                  type="number"
                  value={newOverdueDays}
                  onChange={(e) => setNewOverdueDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <AddressFields value={newAddress} onChange={setNewAddress} label="Alamat Debitur" compact />
            </div>

            <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                Sistem akan otomatis membuat folder asli di Google Drive: <br />
                <code className="font-mono text-[10px] text-white">
                  📁 PT MJ INDONESIA &gt; 📁 MULTIFINANCE &gt; 📁 {clientsList.find((c) => c.id === addDebtorClientId)?.companyName} &gt; 📁 FOLDER_SKP &gt; 📁 DEBITUR_{slugify(newDebtorName.trim()) || 'NAMA_DEBITUR'}
                </code>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAddDebtorClientId(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Debitur &amp; Buat Folder GDrive</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 4: PREVIEW KTP LIGHTBOX (Compact, Viewport-Constrained) */}
      {previewKtpPersonnel && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Dokumen KTP Google Drive</h3>
                  <p className="text-xs text-slate-400">
                    {previewKtpPersonnel.fullName} ({previewKtpPersonnel.nikKtp})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewKtpPersonnel(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 border border-slate-800 rounded-xl flex items-center justify-center min-h-[200px]">
              {previewKtpPersonnel.ktpPhotoUrl ? (
                <img
                  src={previewKtpPersonnel.ktpPhotoUrl}
                  alt={`KTP ${previewKtpPersonnel.fullName}`}
                  className="max-h-[260px] w-auto object-contain rounded border border-slate-800"
                />
              ) : (
                <div className="text-slate-500 text-xs">Foto KTP belum diunggah</div>
              )}
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] space-y-1 font-mono text-slate-300">
              <div>
                <span className="text-slate-500">Struktur Path:</span> 📁 PT MJ INDONESIA / DATABASE KARYAWAN / {slugify(previewKtpPersonnel.fullName)} /
              </div>
              <div>
                <span className="text-slate-500">Link GDrive:</span>{' '}
                <a
                  href={previewKtpPersonnel.gDriveFolderUrl || rootDriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:underline"
                >
                  Buka Folder Karyawan
                </a>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIdCardPersonnel(previewKtpPersonnel);
                  setPreviewKtpPersonnel(null);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white text-xs font-bold rounded-xl shadow-md transition"
              >
                <CreditCard className="w-4 h-4" />
                <span>Cetak ID Card</span>
              </button>

              <button
                type="button"
                onClick={() => setPreviewKtpPersonnel(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ID CARD MODAL */}
      {idCardPersonnel && (
        <EmployeeIdCardModal
          isOpen={true}
          onClose={() => setIdCardPersonnel(null)}
          personnel={idCardPersonnel}
          companyName={store.settings?.companyName}
          companyAddress={store.settings?.companyAddress}
          companyPhone={store.settings?.companyPhone}
          companyLogo={store.settings?.companyLogo}
        />
      )}

      {/* LETTER PREVIEW MODAL */}
      {previewDocData && (
        <LetterPreviewModal
          isOpen={true}
          onClose={() => setPreviewDocData(null)}
          data={previewDocData}
        />
      )}
    </div>
  );
};
