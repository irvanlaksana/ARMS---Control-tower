import React, { useState, useMemo, useRef } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Customer } from '../../types/arms';
import { Users, Plus, Edit2, Trash2, AlertTriangle, Upload, Image as ImageIcon, Eye, X, CheckCircle, UserCheck, Clock, AlertCircle, Download, FileSpreadsheet, UploadCloud, ClipboardList, CheckCircle2 } from 'lucide-react';
import { findDuplicateCustomerMaster } from '../../utils/duplicateCheck';
import { AmountInput } from '../common/AmountInput';
import { DateInput } from '../common/DateInput';
import { AddressFields } from '../common/AddressFields';
import { downloadCSV } from '../../utils/exportUtils';

interface CustomersModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

/* ---------- CSV / JSON bulk import helpers ---------- */

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

function parseCsv(text: string): Record<string, string>[] {
  const content = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = content.split('\n').filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const firstLine = lines[0];
  const delimiter = (firstLine.match(/;/g) || []).length >= (firstLine.match(/,/g) || []).length ? ';' : ',';
  const headers = parseCsvLine(firstLine, delimiter).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line, delimiter);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
    return row;
  });
}

// Normalisasi header CSV/JSON ke field Customer
const HEADER_ALIASES: Record<string, string> = {
  fullname: 'fullName',
  nama: 'fullName',
  namadebitur: 'fullName',
  debitur: 'fullName',
  namalengkap: 'fullName',
  customer: 'fullName',
  customername: 'fullName',
  customercode: 'customerCode',
  kodedebitur: 'customerCode',
  contractno: 'contractNo',
  nokontrak: 'contractNo',
  kontrak: 'contractNo',
  nik: 'nikKtp',
  nikktp: 'nikKtp',
  noktp: 'nikKtp',
  ktp: 'nikKtp',
  phone: 'phone',
  nomorhp: 'phone',
  nomorhandphone: 'phone',
  handphone: 'phone',
  hp: 'phone',
  telepon: 'phone',
  nohp: 'phone',
  addresscurrent: 'addressCurrent',
  alamatdomisili: 'addressCurrent',
  alamat: 'addressCurrent',
  alamatdebitur: 'addressCurrent',
  addressktp: 'addressKtp',
  alamatktp: 'addressKtp',
  workplace: 'workplace',
  pekerjaan: 'workplace',
  duedate: 'dueDate',
  jatuhTempo: 'dueDate',
  tgljatuhtempo: 'dueDate',
  installmentamount: 'installmentAmount',
  angsuran: 'installmentAmount',
  nominalangsuran: 'installmentAmount',
  totalinstallment: 'totalInstallment',
  totalangsuran: 'totalInstallment',
  penaltyamount: 'penaltyAmount',
  denda: 'penaltyAmount',
  vehiclemerctype: 'vehicleMerkType',
  meritipe: 'vehicleMerkType',
  merktipe: 'vehicleMerkType',
  merk: 'vehicleMerkType',
  kendaraan: 'vehicleMerkType',
  vehiclepoliceNo: 'vehiclePoliceNo',
  nopol: 'vehiclePoliceNo',
  nopolisi: 'vehiclePoliceNo',
  plat: 'vehiclePoliceNo',
  emergencycontactname: 'emergencyContactName',
  emergencycontactphone: 'emergencyContactPhone',
  risknotes: 'riskNotes',
  gdrivefolderurl: 'gDriveFolderUrl',
  ktpphotourl: 'ktpPhotoUrl',
  fotoktp: 'ktpPhotoUrl',
};

const CUSTOMER_EXPORT_COLUMNS = [
  'customerCode',
  'contractNo',
  'fullName',
  'nikKtp',
  'phone',
  'addressCurrent',
  'addressKtp',
  'workplace',
  'dueDate',
  'installmentAmount',
  'totalInstallment',
  'penaltyAmount',
  'vehicleMerkType',
  'vehiclePoliceNo',
  'emergencyContactName',
  'emergencyContactPhone',
  'riskNotes',
  'gDriveFolderUrl',
  'createdAt',
] as const;

function normalizeImportRow(raw: Record<string, unknown> | Record<string, string>): Partial<Customer> {
  const out: Partial<Customer> = {};
  const get = (key: string, aliases: string[]): string => {
    const keys = [key, ...aliases].map((k) => k.toLowerCase().replace(/[\s\-\.]/g, ''));
    for (const k of Object.keys(raw)) {
      if (keys.includes(k.toLowerCase().replace(/[\s\-\.]/g, ''))) return String(raw[k] ?? '').trim();
    }
    return '';
  };
  out.fullName = get('fullName', ['nama', 'namadebitur', 'debitur', 'namalengkap']) || undefined;
  out.customerCode = get('customerCode', ['kodedebitur']) || undefined;
  out.contractNo = get('contractNo', ['nokontrak', 'kontrak']) || undefined;
  out.nikKtp = get('nikKtp', ['nik', 'nikktp', 'noktp']) || undefined;
  out.phone = get('phone', ['nomorhp', 'handphone', 'hp', 'telepon', 'nohp']) || undefined;
  out.addressCurrent = get('addressCurrent', ['alamatdomisili', 'alamat', 'alamatdebitur']) || undefined;
  out.addressKtp = get('addressKtp', ['alamatktp']) || undefined;
  out.workplace = get('workplace', ['pekerjaan']) || undefined;
  out.dueDate = get('dueDate', ['jatuhTempo', 'tgljatuhtempo']) || undefined;
  out.installmentAmount = get('installmentAmount', ['angsuran', 'nominalangsuran']) || undefined;
  const totalStr = get('totalInstallment', ['totalangsuran']);
  out.totalInstallment = totalStr ? Number(String(totalStr).replace(/[^\d]/g, '')) || 0 : undefined;
  out.penaltyAmount = get('penaltyAmount', ['denda']) || undefined;
  out.vehicleMerkType = get('vehicleMerkType', ['merktipe', 'meritipe', 'merk', 'kendaraan']) || undefined;
  out.vehiclePoliceNo = get('vehiclePoliceNo', ['nopol', 'nopolisi', 'plat']) || undefined;
  out.emergencyContactName = get('emergencyContactName', []) || undefined;
  out.emergencyContactPhone = get('emergencyContactPhone', []) || undefined;
  out.riskNotes = get('riskNotes', []) || 'Data hasil import bulk';
  out.gDriveFolderUrl = get('gDriveFolderUrl', []) || undefined;
  out.ktpPhotoUrl = get('ktpPhotoUrl', ['fotoktp']) || undefined;
  return out;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form fields
  const [contractNo, setContractNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [addressCurrent, setAddressCurrent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [totalInstallment, setTotalInstallment] = useState(0);
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleMerkType, setVehicleMerkType] = useState('');
  const [vehiclePoliceNo, setVehiclePoliceNo] = useState('');
  const [ktpPhotoUrl, setKtpPhotoUrl] = useState('');
  const [stnkPhotoUrls, setStnkPhotoUrls] = useState<string[]>([]);
  
  const [nikKtp, setNikKtp] = useState(''); // Keep this for internal needs/backend if needed, or make optional

  // Bulk export / import
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<Partial<Customer>[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [importSummary, setImportSummary] = useState<{ added: number; skipped: number; errors: number } | null>(null);
  const importFileRef = useRef<HTMLInputElement>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  // Real-time duplicate check for customer master
  const duplicateWarning = useMemo(() => {
    if (!showModal) return null;
    return findDuplicateCustomerMaster(store.customers || [], {
      fullName,
      contractNo,
      nikKtp,
      phone,
      excludeCustomerId: isEditing ? editId : null,
    });
  }, [showModal, store.customers, fullName, contractNo, nikKtp, phone, isEditing, editId]);

  const hasDuplicateCustomerInStore = (cust: Customer) => {
    return (store.customers || []).some(c => 
      c.id !== cust.id &&
      ((c.contractNo && cust.contractNo && c.contractNo.toLowerCase().trim() === cust.contractNo.toLowerCase().trim()) ||
       (c.nikKtp && cust.nikKtp && c.nikKtp.replace(/\D/g, '') === cust.nikKtp.replace(/\D/g, '') && c.nikKtp.replace(/\D/g, '').length >= 10) ||
       (c.fullName.toLowerCase().trim() === cust.fullName.toLowerCase().trim() && c.phone && cust.phone && c.phone.replace(/\D/g, '') === cust.phone.replace(/\D/g, '')))
    );
  };

  type DebtorProcessStatus = 'NEW' | 'PROCESS' | 'ASSIGNED' | 'CLOSED';

  const getDebtorProcessStatus = (customerId: string): { status: DebtorProcessStatus; label: string; description: string } => {
    const customerCases = (store.cases || []).filter((caseItem) => caseItem.customerId === customerId);
    const caseIds = new Set(customerCases.map((caseItem) => caseItem.id));

    const hasClosedCase = customerCases.some((caseItem) =>
      ['FULL_PAID', 'SETTLED', 'CLOSED', 'UNIT_RECOVERED'].includes(caseItem.status)
    );
    const hasRecoveredAsset = (store.assets || []).some((asset) =>
      caseIds.has(asset.caseId) && ['RECOVERED_WAREHOUSE', 'IN_TRANSIT', 'LIQUIDATED'].includes(asset.physicalStatus)
    );
    if (hasClosedCase || hasRecoveredAsset) {
      return {
        status: 'CLOSED',
        label: 'Closed',
        description: hasRecoveredAsset ? 'Unit sudah ditarik/dikuasai' : 'Pembayaran sudah lunas atau kasus ditutup',
      };
    }

    const hasAssignmentAndLetter = customerCases.some((caseItem) => {
      const hasAssignment = (store.assignments || []).some((assignment) =>
        assignment.caseId === caseItem.id && !['FAILED', 'REASSIGNED'].includes(assignment.status)
      );
      const hasLetter = (store.sks || []).some((sk) =>
        sk.caseId === caseItem.id && !['REVOKED', 'REJECTED'].includes(sk.status)
      );
      return hasAssignment && hasLetter;
    });
    if (hasAssignmentAndLetter) {
      return {
        status: 'ASSIGNED',
        label: 'Assigned',
        description: 'Surat tugas/kuasa dan penugasan lapangan sudah dibuat',
      };
    }

    if (customerCases.length > 0) {
      return {
        status: 'PROCESS',
        label: 'Proses',
        description: 'Debitur sudah dimasukkan ke modul Kasus dan Piutang',
      };
    }

    return {
      status: 'NEW',
      label: 'Belum Diproses',
      description: 'Belum dimasukkan ke modul Kasus dan Piutang',
    };
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setIsEditing(true);
      setEditId(customer.id);
      setContractNo(customer.contractNo || '');
      setFullName(customer.fullName);
      setAddressCurrent(customer.addressCurrent);
      setDueDate(customer.dueDate || '');
      setInstallmentAmount(customer.installmentAmount || '');
      setTotalInstallment(customer.totalInstallment || 0);
      setPenaltyAmount(customer.penaltyAmount || '');
      setPhone(customer.phone);
      setVehicleMerkType(customer.vehicleMerkType || '');
      setVehiclePoliceNo(customer.vehiclePoliceNo || '');
      setKtpPhotoUrl(customer.ktpPhotoUrl || '');
      setStnkPhotoUrls(customer.stnkPhotoUrls || []);
      setNikKtp(customer.nikKtp || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setContractNo('');
      setFullName('');
      setAddressCurrent('');
      setDueDate('');
      setInstallmentAmount('');
      setTotalInstallment(0);
      setPenaltyAmount('');
      setPhone('');
      setVehicleMerkType('');
      setVehiclePoliceNo('');
      setKtpPhotoUrl('');
      setStnkPhotoUrls([]);
      setNikKtp('');
    }
    setShowModal(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Customers',
      id,
      `Deleted customer ${name}`
    );

    onUpdateStore({
      ...store,
      customers: store.customers.filter(c => c.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>, target: 'KTP' | 'STNK') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      if (target === 'KTP') {
        setKtpPhotoUrl(result);
      } else {
        setStnkPhotoUrls((prev) => [...prev, result]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    if (duplicateWarning?.isDuplicate) {
      const confirmProceed = window.confirm(
        `⚠️ PERINGATAN DATA DEBITUR GANDA (DUPLICATE DETECTED):\n\n` +
        `${duplicateWarning.matchReason}\n\n` +
        `Data master debitur ini memiliki kesamaan dengan debitur yang sudah terdaftar.\n` +
        `Apakah Anda yakin ingin tetap menyimpan profil debitur ini?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    if (isEditing && editId) {
      const updatedCustomers = store.customers.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            contractNo,
            fullName,
            nikKtp,
            phone,
            addressCurrent,
            addressKtp: addressCurrent,
            dueDate,
            installmentAmount,
            totalInstallment,
            penaltyAmount,
            vehicleMerkType,
            vehiclePoliceNo,
            ktpPhotoUrl,
            stnkPhotoUrls,
            workplace: c.workplace || '',
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Customers',
        editId,
        `Updated Debtor Profile ${fullName}`
      );

      onUpdateStore({
        ...store,
        customers: updatedCustomers,
        cases: store.cases.map(c => c.customerId === editId
          ? { ...c, principalDebtOS: totalInstallment }
          : c),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        customerCode: `DEB-${Date.now()}`,
        contractNo,
        nikKtp,
        fullName,
        phone,
        addressCurrent,
        addressKtp: addressCurrent,
        dueDate,
        installmentAmount,
        totalInstallment,
        penaltyAmount,
        vehicleMerkType,
        vehiclePoliceNo,
        ktpPhotoUrl,
        stnkPhotoUrls,
        workplace: '',
        emergencyContactName: 'Family Contact',
        emergencyContactPhone: phone,
        riskNotes: 'Normal recovery case profile',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Customers', newCustomer.id, `Created Debtor Profile ${fullName}`);

      onUpdateStore({
        ...store,
        customers: [newCustomer, ...store.customers],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
  };

  /* ---------- EXPORT BULK ---------- */

  const handleExportCSV = () => {
    const columns = CUSTOMER_EXPORT_COLUMNS.map((key) => ({
      header: key,
      accessor: (item: Customer) => {
        const val = (item as any)[key];
        if (Array.isArray(val)) return JSON.stringify(val);
        return val;
      },
    }));
    downloadCSV(
      `ARMS-Debitur-Database-${new Date().toISOString().slice(0, 10)}`,
      store.customers,
      columns,
    );
    const audit = createAuditEntry(currentUser.username, currentUser.role, 'EXPORT', 'Customers', 'BULK_EXPORT', `Export CSV ${store.customers.length} data debitur`);
    onUpdateStore({ ...store, auditLogs: [audit, ...store.auditLogs] });
  };

  const handleExportJSON = () => {
    if (store.customers.length === 0) {
      alert('Tidak ada data debitur untuk diexport.');
      return;
    }
    const blob = new Blob([JSON.stringify(store.customers, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ARMS-Debitur-Database-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const audit = createAuditEntry(currentUser.username, currentUser.role, 'EXPORT', 'Customers', 'BULK_EXPORT_JSON', `Export JSON ${store.customers.length} data debitur`);
    onUpdateStore({ ...store, auditLogs: [audit, ...store.auditLogs] });
  };

  /* ---------- IMPORT BULK ---------- */

  const isDuplicateOfExisting = (row: Partial<Customer>) => {
    const nik = (row.nikKtp || '').replace(/\D/g, '');
    return (store.customers || []).some((c) =>
      (row.contractNo && c.contractNo && c.contractNo.toLowerCase().trim() === row.contractNo.toLowerCase().trim()) ||
      (nik.length >= 10 && c.nikKtp && c.nikKtp.replace(/\D/g, '') === nik) ||
      (row.fullName && c.fullName.toLowerCase().trim() === row.fullName.toLowerCase().trim() &&
        row.phone && c.phone && c.phone.replace(/\D/g, '') === row.phone.replace(/\D/g, ''))
    );
  };

  const handleImportFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      let parsed: Partial<Customer>[] = [];
      try {
        if (file.name.toLowerCase().endsWith('.json')) {
          const json = JSON.parse(text);
          const arr = Array.isArray(json) ? json : (json.customers || json.data || []);
          if (!Array.isArray(arr)) throw new Error('Format JSON harus berupa array data debitur');
          parsed = arr.map((r: any) => normalizeImportRow(r));
        } else {
          parsed = parseCsv(text).map((r) => normalizeImportRow(r));
        }
      } catch (err: any) {
        setImportErrors([`Gagal membaca file: ${err.message || String(err)}`]);
        setImportRows([]);
        setImportFileName('');
        return;
      }

      const errors: string[] = [];
      parsed.forEach((row, i) => {
        if (!row.fullName) {
          errors.push(`Baris ${i + 1}: Nama Debitur (fullName) wajib diisi.`);
        }
      });
      setImportRows(parsed);
      setImportErrors(errors);
      setImportFileName(file.name);
      setImportSummary(null);
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (importRows.length === 0) return;
    const stamp = Date.now();
    const existingIds = new Set((store.customers || []).map((c) => c.id));
    let added = 0;
    let skipped = 0;
    const newCustomers: Customer[] = [];

    importRows.forEach((row, idx) => {
      if (!row.fullName) {
        skipped++;
        return;
      }
      if (skipDuplicates && isDuplicateOfExisting(row)) {
        skipped++;
        return;
      }
      let id = `CUST-${stamp}${idx}`;
      if (existingIds.has(id)) id = `${id}-${idx}`;
      existingIds.add(id);
      const customerCode = row.customerCode || `DEB-${stamp}${idx}`;
      newCustomers.push({
        id,
        customerCode,
        contractNo: row.contractNo,
        nikKtp: row.nikKtp || '',
        fullName: row.fullName,
        phone: row.phone || '',
        addressCurrent: row.addressCurrent || '',
        addressKtp: row.addressKtp || row.addressCurrent || '',
        workplace: row.workplace || '',
        emergencyContactName: row.emergencyContactName || 'Family Contact',
        emergencyContactPhone: row.emergencyContactPhone || row.phone || '',
        dueDate: row.dueDate,
        installmentAmount: row.installmentAmount,
        totalInstallment: row.totalInstallment || 0,
        penaltyAmount: row.penaltyAmount,
        vehicleMerkType: row.vehicleMerkType,
        vehiclePoliceNo: row.vehiclePoliceNo,
        ktpPhotoUrl: row.ktpPhotoUrl,
        stnkPhotoUrls: [],
        riskNotes: row.riskNotes || 'Data hasil import bulk',
        gDriveFolderUrl: row.gDriveFolderUrl,
        createdAt: new Date().toISOString(),
      });
      added++;
    });

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Customers',
      `BULK-${stamp}`,
      `Bulk import ${added} data debitur dari ${importFileName} (${skipped} dilewati)`
    );
    onUpdateStore({
      ...store,
      customers: [...newCustomers, ...(store.customers || [])],
      auditLogs: [audit, ...store.auditLogs],
    });
    setImportSummary({ added, skipped, errors: importErrors.length });
    setImportRows([]);
    setImportErrors([]);
    setImportFileName('');
    if (importFileRef.current) importFileRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Debtor & Customer Database</h2>
          </div>
          <p className="text-xs text-slate-400">Master Debtor Profiles, NIK Verification & Risk Notes</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 text-xs font-semibold px-3.5 py-2.5 rounded-lg transition"
                title="Export seluruh data debitur ke CSV (Excel/Google Sheets)"
              >
                <Download className="w-4 h-4 text-emerald-400" />
                Export CSV
              </button>
              <button
                onClick={handleExportJSON}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3.5 py-2.5 rounded-lg transition"
                title="Export seluruh data debitur lengkap ke JSON"
              >
                <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                Export JSON
              </button>
              <button
                onClick={() => { setImportOpen(true); setImportSummary(null); }}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2.5 rounded-lg transition"
                title="Import banyak data debitur dari CSV / JSON"
              >
                <UploadCloud className="w-4 h-4" />
                Import Bulk
              </button>
            </>
          )}
          {canEdit && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Debtor Profile</span>
            </button>
          )}
        </div>
      </div>

      {importSummary && (
        <div className="p-3.5 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Import Bulk Selesai:</span>
          <span>Ditambahkan: <b className="text-white">{importSummary.added}</b></span>
          <span>Dilewati / Duplikat: <b className="text-amber-300">{importSummary.skipped}</b></span>
          <span>Baris Error: <b className="text-rose-300">{importSummary.errors}</b></span>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Debtor Code</th>
                <th className="py-3 px-4">No. Kontrak</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Outstanding</th>
                <th className="py-3 px-4">Status Proses</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  {(() => {
                    const processStatus = getDebtorProcessStatus(c.id);
                    const statusStyles = {
                      NEW: 'bg-slate-800 text-slate-300 border-slate-700',
                      PROCESS: 'bg-amber-950 text-amber-300 border-amber-800',
                      ASSIGNED: 'bg-indigo-950 text-indigo-300 border-indigo-800',
                      CLOSED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                    }[processStatus.status];
                    const StatusIcon = {
                      NEW: AlertCircle,
                      PROCESS: Clock,
                      ASSIGNED: UserCheck,
                      CLOSED: CheckCircle,
                    }[processStatus.status];

                    return (
                      <>
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{c.customerCode}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{c.contractNo || '-'}</span>
                      {hasDuplicateCustomerInStore(c) && (
                        <span className="bg-amber-950 text-amber-300 text-[9px] px-1.5 py-0.5 rounded border border-amber-800 font-bold flex items-center gap-1" title="Data debitur dengan nomor kontrak / identitas serupa terdaftar lebih dari 1 kali">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Duplikat
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">
                    {c.fullName}
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">{c.phone}</td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">{c.addressCurrent}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {c.vehicleMerkType ? (
                      <span className="block text-xs">
                        {c.vehicleMerkType}
                        {Array.isArray(c.stnkPhotoUrls) && c.stnkPhotoUrls.length > 1 && (
                          <span className="ml-1 inline-flex items-center justify-center rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-300">+{c.stnkPhotoUrls.length - 1}</span>
                        )}
                        <br/> <span className="font-mono text-[10px] text-slate-500">{c.vehiclePoliceNo}</span>
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-amber-300 text-[11px]">
                    {c.totalInstallment || c.installmentAmount || c.penaltyAmount ? (
                      <>
                        {c.totalInstallment ? <span className="block">Total Angsuran: Rp {c.totalInstallment.toLocaleString('id-ID')}</span> : null}
                        {c.installmentAmount && <span className="block">Angsuran: {c.installmentAmount}</span>}
                        {c.penaltyAmount && <span className="block text-red-400">Denda: Rp {c.penaltyAmount}</span>}
                      </>
                    ) : '-'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wide ${statusStyles}`}
                      title={processStatus.description}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {processStatus.label}
                    </span>
                    <span className="block mt-1 max-w-[180px] text-[10px] leading-tight text-slate-500">
                      {processStatus.description}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id, c.fullName)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                      </>
                   );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* BULK IMPORT MODAL */}
      {importOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl p-5 sm:p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base">Import Bulk Data Debitur</h3>
                  <p className="text-[11px] text-slate-400">Unggah file CSV (Excel/Google Sheets) atau JSON</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {importSummary && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-400" /> Import berhasil!</div>
                <div>Ditambahkan: <b className="text-white">{importSummary.added}</b> · Dilewati: <b className="text-amber-300">{importSummary.skipped}</b> · Error: <b className="text-rose-300">{importSummary.errors}</b></div>
              </div>
            )}

            <label className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-950 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <span className="font-semibold text-slate-200">Pilih File CSV / JSON</span>
              <span className="text-[10px] text-slate-500 mt-1">Kolom didukung: customerCode, contractNo, fullName, nikKtp, phone, addressCurrent, addressKtp, dueDate, installmentAmount, totalInstallment, penaltyAmount, vehicleMerkType, vehiclePoliceNo, riskNotes, dll.</span>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,.json,text/csv,application/json,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
              />
            </label>

            {importFileName && (
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <ClipboardList className="w-3.5 h-3.5 text-indigo-400" />
                File: <span className="text-white font-mono">{importFileName}</span> · {importRows.length} baris terbaca
              </div>
            )}

            {importErrors.length > 0 && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-[11px] text-rose-200 space-y-1">
                {importErrors.slice(0, 8).map((e, i) => (
                  <div key={i}>⚠️ {e}</div>
                ))}
                {importErrors.length > 8 && <div>...dan {importErrors.length - 8} error lainnya</div>}
              </div>
            )}

            {importRows.length > 0 && (
              <>
                <div className="overflow-x-auto border border-slate-800 rounded-xl">
                  <table className="w-full text-left text-[11px] text-slate-300">
                    <thead className="bg-slate-950 text-slate-400">
                      <tr>
                        <th className="p-2">#</th>
                        <th className="p-2">Nama Debitur</th>
                        <th className="p-2">No. Kontrak</th>
                        <th className="p-2">NIK</th>
                        <th className="p-2">No. HP</th>
                        <th className="p-2">Kendaraan</th>
                        <th className="p-2">Total Angsuran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {importRows.slice(0, 10).map((row, i) => (
                        <tr key={i} className={row.fullName ? '' : 'bg-rose-950/30'}>
                          <td className="p-2 font-mono text-slate-500">{i + 1}</td>
                          <td className={`p-2 font-semibold ${row.fullName ? 'text-white' : 'text-rose-300'}`}>{row.fullName || <em className="text-rose-400">(nama kosong)</em>}</td>
                          <td className="p-2 font-mono">{row.contractNo || '-'}</td>
                          <td className="p-2 font-mono">{row.nikKtp || '-'}</td>
                          <td className="p-2">{row.phone || '-'}</td>
                          <td className="p-2">{row.vehicleMerkType || '-'}</td>
                          <td className="p-2 font-mono text-amber-300">{row.totalInstallment ? `Rp ${row.totalInstallment.toLocaleString('id-ID')}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {importRows.length > 10 && (
                    <div className="p-2 bg-slate-950 text-[10px] text-slate-500 text-center">…dan {importRows.length - 10} baris lainnya</div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(e) => setSkipDuplicates(e.target.checked)}
                    className="accent-indigo-500"
                  />
                  Lewati data duplikat (cocokkan No. Kontrak / NIK / Nama+No. HP yang sudah terdaftar)
                </label>
              </>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Tutup
              </button>
              <button
                type="button"
                disabled={importRows.length === 0}
                onClick={handleImport}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition shadow-lg flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Import {importRows.length} Data Debitur
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">
              {isEditing ? 'Edit Data Debitur' : 'Register Data Debitur'}
            </h3>

            {duplicateWarning?.isDuplicate && (
              <div className="bg-amber-950/80 border-2 border-amber-500/80 rounded-xl p-3.5 space-y-2 text-amber-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                  <span>⚠️ PERINGATAN: DATA DEBITUR SUDAH TERDAFTAR</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {duplicateWarning.matchReason}.
                </p>
                {duplicateWarning.matchedCustomer && (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-amber-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block">Kode Debitur</span>
                      <span className="text-indigo-300 font-bold">{duplicateWarning.matchedCustomer.customerCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nama Terdaftar</span>
                      <span className="text-white font-bold">{duplicateWarning.matchedCustomer.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">No. Kontrak Terdaftar</span>
                      <span className="text-slate-300">{duplicateWarning.matchedCustomer.contractNo || '-'}</span>
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-amber-400/90 font-medium">
                  💡 <em>Mohon periksa data kembali untuk menghindari duplikasi data profil debitur.</em>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">No. Kontrak</label>
                <input
                  type="text"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <AddressFields value={addressCurrent} onChange={setAddressCurrent} label="Alamat Domisili Debitur" required />

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tanggal Jatuh Tempo</label>
                <DateInput
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Foto KTP</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center w-full gap-2 border border-dashed border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 bg-slate-950 cursor-pointer hover:border-indigo-500 transition">
                    <Upload className="w-4 h-4 text-indigo-400" />
                    <span>Upload Foto KTP</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'KTP')} />
                  </label>
                  {ktpPhotoUrl && (
                    <div className="relative group">
                      <img src={ktpPhotoUrl} alt="KTP" className="w-full h-24 object-cover rounded-lg border border-slate-800" />
                      <button
                        type="button"
                        onClick={() => setKtpPhotoUrl('')}
                        className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-slate-950/80 text-slate-200 hover:text-red-400"
                        aria-label="Hapus foto KTP"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Foto STNK</label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center w-full gap-2 border border-dashed border-slate-700 rounded-lg p-2.5 text-xs text-slate-300 bg-slate-950 cursor-pointer hover:border-indigo-500 transition">
                    <ImageIcon className="w-4 h-4 text-indigo-400" />
                    <span>Upload Foto STNK</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []) as File[];
                        files.forEach((file) => {
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = String(reader.result || '');
                            if (result) setStnkPhotoUrls((prev) => [...prev, result]);
                          };
                          reader.readAsDataURL(file);
                        });
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {stnkPhotoUrls.length > 0 && (
                    <div className="grid grid-cols-2 gap-2">
                      {stnkPhotoUrls.map((url, index) => (
                        <div key={`${url}-${index}`} className="relative group">
                          <img src={url} alt={`STNK ${index + 1}`} className="w-full h-24 object-cover rounded-lg border border-slate-800" />
                          {index === stnkPhotoUrls.length - 1 && stnkPhotoUrls.length > 1 && (
                            <span className="absolute top-1 left-1 bg-amber-500/90 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-slate-950">+{stnkPhotoUrls.length - 1}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setStnkPhotoUrls((prev) => prev.filter((_, i) => i !== index))}
                            className="absolute top-1 right-1 hidden group-hover:flex items-center justify-center w-6 h-6 rounded-full bg-slate-950/80 text-slate-200 hover:text-red-400"
                            aria-label="Hapus foto STNK"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Angsuran</label>
                <input
                  type="text"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Total Angsuran (Rp)</label>
                <AmountInput
                  required
                  value={totalInstallment}
                  onChange={setTotalInstallment}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">DENDA</label>
                <input
                  type="text"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nomor Handphone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <h4 className="font-semibold text-slate-300 text-sm border-b border-slate-800 pb-1 mt-4">Spesifikasi Kendaraan</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Merk/Type</label>
                <input
                  type="text"
                  value={vehicleMerkType}
                  onChange={(e) => setVehicleMerkType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nomor Polisi</label>
                <input
                  type="text"
                  value={vehiclePoliceNo}
                  onChange={(e) => setVehiclePoliceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="hidden">
              <input type="text" value={nikKtp} onChange={(e) => setNikKtp(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/20"
              >
                {isEditing ? 'Simpan Perubahan' : 'Simpan Debitur'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
