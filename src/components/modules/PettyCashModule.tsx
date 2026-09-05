import React, { useState } from 'react';
import { DateInput } from '../common/DateInput';
import { AmountInput } from '../common/AmountInput';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, PettyCashTransaction } from '../../types/arms';
import { 
  Wallet, Plus, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle, 
  Trash2, Edit2, Search, Filter, Printer, FileText, DollarSign, Calendar,
  Building2, UserCheck, ExternalLink, ShieldCheck, X, RefreshCw, Layers
} from 'lucide-react';

interface PettyCashModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const PettyCashModule: React.FC<PettyCashModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CASH_IN' | 'CASH_OUT'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Modals
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [modalType, setModalType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [amount, setAmount] = useState<number>(150000);
  const [category, setCategory] = useState<PettyCashTransaction['category']>('BBM_TOLL_PARKIR');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [recipientOrSource, setRecipientOrSource] = useState<string>('');
  const [personnelId, setPersonnelId] = useState<string>(store.personnel[0]?.id || '');
  const [requestedByUserId, setRequestedByUserId] = useState<string>(store.users.find((u) => u.status === 'ACTIVE')?.id || '');
  const [caseId, setCaseId] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [proofReceiptUrl, setProofReceiptUrl] = useState<string>('');

  // Physical Cash Opname Modal
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [denominations, setDenominations] = useState<{ [key: number]: number }>({
    100000: 0,
    50000: 0,
    20000: 0,
    10000: 0,
    5000: 0,
    2000: 0,
    1000: 0,
  });
  const [opnameNotes, setOpnameNotes] = useState('');

  // Voucher Print Modal
  const [selectedForVoucher, setSelectedForVoucher] = useState<PettyCashTransaction | null>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';
  const pettyCashList = store.pettyCash || [];
  const activeUsers = (store.users || []).filter((u) => u.status === 'ACTIVE');
  const closedCases = (store.cases || []).filter((c) => c.status === 'CLOSED');
  const categorySelection = modalType === 'CASH_IN' && caseId
    ? `CLOSED_CASE:${caseId}`
    : category;

  // Financial Calculations
  const totalCashIn = pettyCashList
    .filter((t) => t.type === 'CASH_IN' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalCashOut = pettyCashList
    .filter((t) => t.type === 'CASH_OUT' && t.status === 'APPROVED')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const currentBalance = totalCashIn - totalCashOut;
  const imprestPlafon = 10000000; // Rp 10.000.000 default imprest fund limit

  // Filtered List
  const filteredList = pettyCashList.filter((t) => {
    if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
    if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

    if (searchTerm) {
      const matchText = `${t.transactionNo} ${t.description} ${t.recipientOrSource} ${t.personnelName || ''} ${t.caseNo || ''}`.toLowerCase();
      if (!matchText.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  // Category Labels
  const getCategoryLabel = (cat: PettyCashTransaction['category']) => {
    switch (cat) {
      case 'TOP_UP_REPLENISHMENT':
        return 'Dropping / Top Up Kas';
      case 'BBM_TOLL_PARKIR':
        return 'BBM, Tol & Parkir Lapangan';
      case 'KONSUMSI_MEETING':
        return 'Konsumsi Tim & Mediasi';
      case 'ATK_MATERAI_FOTOCOPY':
        return 'Materai, ATK & Fotokopi';
      case 'BIAYA_LAPANGAN_TAKSELE':
        return 'Biaya Taktis & Lapangan';
      case 'KURIR_PENGIRIMAN_SURAT':
        return 'Kurir & Ekspedisi Somasi';
      case 'MAINTENANCE_KANTOR':
        return 'Maintenance & Pulsa/Paket Data';
      default:
        return 'Pengeluaran Lainnya';
    }
  };

  // Open Add/Edit Modal
  const handleOpenModal = (type: 'CASH_IN' | 'CASH_OUT', item?: PettyCashTransaction) => {
    setModalType(type);
    if (item) {
      setIsEditing(true);
      setEditId(item.id);
      setAmount(item.amount);
      setCategory(item.category);
      setTransactionDate(item.transactionDate);
      setRecipientOrSource(item.recipientOrSource);
      setPersonnelId(item.personnelId || '');
      setRequestedByUserId(item.requestedByUserId || '');
      setCaseId(item.caseId || '');
      setDescription(item.description);
      setProofReceiptUrl(item.proofReceiptUrl || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setAmount(type === 'CASH_IN' ? 5000000 : 150000);
      setCategory(type === 'CASH_IN' ? 'TOP_UP_REPLENISHMENT' : 'BBM_TOLL_PARKIR');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setRecipientOrSource(type === 'CASH_IN' ? 'Bank Mandiri Utama Ops' : '');
      setPersonnelId(store.personnel[0]?.id || '');
      setRequestedByUserId(activeUsers[0]?.id || '');
      setCaseId('');
      setDescription('');
      setProofReceiptUrl('');
    }
    setShowTransactionModal(true);
  };

  // Save Transaction
  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('Nominal transaksi harus lebih besar dari 0.');
      return;
    }

    if (!description.trim()) {
      alert('Keterangan transaksi wajib diisi.');
      return;
    }

    if (!recipientOrSource.trim()) {
      alert(modalType === 'CASH_IN' ? 'Sumber dana wajib diisi.' : 'Nama penerima dana wajib diisi.');
      return;
    }

    // Safety check on cash out
    if (modalType === 'CASH_OUT' && !isEditing && amount > currentBalance) {
      if (!window.confirm(`Peringatan: Saldo kas kecil saat ini (Rp ${currentBalance.toLocaleString('id-ID')}) lebih kecil dari pengeluaran yang diinput (Rp ${amount.toLocaleString('id-ID')}). Tetap lanjutkan?`)) {
        return;
      }
    }

    const selectedPersonnel = store.personnel.find((p) => p.id === personnelId);
    const selectedUser = activeUsers.find((u) => u.id === requestedByUserId);
    const selectedCase = store.cases.find((c) => c.id === caseId);

    if (isEditing && editId) {
      const existing = pettyCashList.find((t) => t.id === editId);
      if (!existing) return;

      const updatedItem: PettyCashTransaction = {
        ...existing,
        type: modalType,
        category,
        amount,
        transactionDate,
        recipientOrSource,
        personnelId: selectedPersonnel?.id,
        personnelName: selectedPersonnel?.fullName,
        requestedByUserId: modalType === 'CASH_IN' ? selectedUser?.id : undefined,
        requestedByUserName: modalType === 'CASH_IN' ? selectedUser?.name : undefined,
        caseId: selectedCase?.id,
        caseNo: selectedCase?.caseNo,
        description,
        proofReceiptUrl,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Petty_Cash',
        editId,
        `Updated Petty Cash ${existing.transactionNo} (${modalType === 'CASH_IN' ? 'Kas Masuk' : 'Kas Keluar'} Rp ${amount.toLocaleString('id-ID')})`
      );

      onUpdateStore({
        ...store,
        pettyCash: pettyCashList.map((t) => (t.id === editId ? updatedItem : t)),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const txNo = `PC-${new Date().getFullYear()}-${String(pettyCashList.length + 1).padStart(4, '0')}`;
      const newItem: PettyCashTransaction = {
        id: `PC-${Date.now()}`,
        transactionNo: txNo,
        type: modalType,
        category,
        amount,
        transactionDate,
        recipientOrSource,
        personnelId: selectedPersonnel?.id,
        personnelName: selectedPersonnel?.fullName,
        requestedByUserId: modalType === 'CASH_IN' ? selectedUser?.id : undefined,
        requestedByUserName: modalType === 'CASH_IN' ? selectedUser?.name : undefined,
        caseId: selectedCase?.id,
        caseNo: selectedCase?.caseNo,
        description,
        proofReceiptUrl,
        status: 'APPROVED',
        approvedBy: currentUser.name,
        approvedAt: new Date().toISOString(),
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Petty_Cash',
        newItem.id,
        `Recorded ${modalType === 'CASH_IN' ? 'Dropping Kas Masuk' : 'Pengeluaran Kas Keluar'} ${txNo} Rp ${amount.toLocaleString('id-ID')} (${description})`
      );

      onUpdateStore({
        ...store,
        pettyCash: [newItem, ...pettyCashList],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowTransactionModal(false);
  };

  // Delete Transaction
  const handleDelete = (item: PettyCashTransaction) => {
    if (!window.confirm(`Hapus transaksi kas kecil ${item.transactionNo} (${item.type === 'CASH_IN' ? 'Kas Masuk' : 'Kas Keluar'} Rp ${item.amount.toLocaleString('id-ID')})?`)) {
      return;
    }

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Petty_Cash',
      item.id,
      `Deleted Petty Cash Transaction ${item.transactionNo}`
    );

    onUpdateStore({
      ...store,
      pettyCash: pettyCashList.filter((t) => t.id !== item.id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  // Opname total calculation
  const totalPhysicalOpname = Object.entries(denominations).reduce(
    (acc, [denom, count]) => acc + Number(denom) * Number(count || 0),
    0
  );
  const opnameDifference = totalPhysicalOpname - currentBalance;

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Petty Cash (Kas Kecil Operasional)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Pencatatan kas kecil, dana dropping operasional, pengeluaran BBM/tol/konsumsi lapangan, dan rekonsiliasi kas opname.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => handleOpenModal('CASH_IN')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
              >
                <ArrowDownLeft className="w-4 h-4" />
                <span>+ Dropping / Top Up Kas</span>
              </button>
              <button
                onClick={() => handleOpenModal('CASH_OUT')}
                className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ Catat Pengeluaran</span>
              </button>
              <button
                onClick={() => setShowOpnameModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-900/60 text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 transition"
                title="Pemeriksaan Fisik Kas / Berita Acara Kas Opname"
              >
                <Layers className="w-4 h-4" />
                <span>Kas Opname</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Saldo Kas Kecil */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden shadow">
          <div className="text-xs text-slate-400 font-medium">Saldo Kas Kecil (Cash on Hand)</div>
          <div className={`text-2xl font-bold mt-1 ${currentBalance < 500000 ? 'text-amber-400' : 'text-emerald-400'}`}>
            Rp {currentBalance.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Tersedia di brankas operasional</span>
          </div>
        </div>

        {/* Card 2: Total Dropping */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="text-xs text-slate-400 font-medium">Total Dropping (Kas Masuk)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            Rp {totalCashIn.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Dari Bank Mandiri / Kas Utama
          </div>
        </div>

        {/* Card 3: Total Pengeluaran */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="text-xs text-slate-400 font-medium">Total Pengeluaran Taktis</div>
          <div className="text-2xl font-bold text-rose-400 mt-1">
            Rp {totalCashOut.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            Biaya bbm, tol, konsumsi, atk, dll.
          </div>
        </div>

        {/* Card 4: Plafon Imprest */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow">
          <div className="text-xs text-slate-400 font-medium">Plafon Imprest System</div>
          <div className="text-2xl font-bold text-indigo-400 mt-1">
            Rp {imprestPlafon.toLocaleString('id-ID')}
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-indigo-500 h-1.5 rounded-full"
              style={{ width: `${Math.min(100, Math.max(0, (currentBalance / imprestPlafon) * 100))}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Type Filter */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${typeFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Semua
            </button>
            <button
              onClick={() => setTypeFilter('CASH_IN')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${typeFilter === 'CASH_IN' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Kas Masuk (Top Up)
            </button>
            <button
              onClick={() => setTypeFilter('CASH_OUT')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${typeFilter === 'CASH_OUT' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Kas Keluar (Pengeluaran)
            </button>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">Semua Kategori</option>
            <option value="TOP_UP_REPLENISHMENT">Dropping / Top Up Kas</option>
            <option value="BBM_TOLL_PARKIR">BBM, Tol & Parkir</option>
            <option value="KONSUMSI_MEETING">Konsumsi & Mediasi</option>
            <option value="ATK_MATERAI_FOTOCOPY">Materai & ATK</option>
            <option value="BIAYA_LAPANGAN_TAKSELE">Biaya Taktis Lapangan</option>
            <option value="KURIR_PENGIRIMAN_SURAT">Kurir & Ekspedisi</option>
            <option value="MAINTENANCE_KANTOR">Maintenance Posko</option>
            <option value="LAINNYA">Lainnya</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari transaksi / keterangan..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Buku Kas Kecil ({filteredList.length} Transaksi)
          </h3>
          <span className="text-[11px] text-slate-400">
            Real-time balance: <strong className="text-white">Rp {currentBalance.toLocaleString('id-ID')}</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No. Transaksi & Tanggal</th>
                <th className="py-3 px-4">Jenis & Kategori</th>
                <th className="py-3 px-4">Keterangan / Uraian</th>
                <th className="py-3 px-4">Penerima / Sumber</th>
                <th className="py-3 px-4">PIC Petugas</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3 px-4 text-center">Bukti / Slip</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 9 : 8} className="py-10 text-center text-slate-500 text-xs">
                    Belum ada data transaksi kas kecil. Klik tombol <strong>+ Dropping Kas</strong> atau <strong>+ Catat Pengeluaran</strong> untuk memulai.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const isCashIn = item.type === 'CASH_IN';
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      {/* No & Tanggal */}
                      <td className="py-3.5 px-4 font-mono text-slate-400">
                        <div className="font-bold text-white text-xs">{item.transactionNo}</div>
                        <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {item.transactionDate}
                        </div>
                      </td>

                      {/* Jenis & Kategori */}
                      <td className="py-3.5 px-4 space-y-1">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isCashIn
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-rose-950 text-rose-300 border-rose-800'
                          }`}
                        >
                          {isCashIn ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isCashIn ? 'KAS MASUK' : 'KAS KELUAR'}
                        </span>
                        <div className="text-[11px] text-slate-300 font-medium">
                          {getCategoryLabel(item.category)}
                        </div>
                      </td>

                      {/* Keterangan */}
                      <td className="py-3.5 px-4 max-w-[240px]">
                        <div className="text-slate-200 font-medium leading-relaxed">{item.description}</div>
                        {item.caseNo && (
                          <div className="text-[10px] text-indigo-400 font-mono mt-0.5">
                            Ref Kasus: {item.caseNo}
                          </div>
                        )}
                      </td>

                      {/* Penerima / Sumber */}
                      <td className="py-3.5 px-4 text-slate-300 font-medium">
                        {item.recipientOrSource}
                      </td>

                      {/* PIC */}
                      <td className="py-3.5 px-4 text-slate-400">
                        {item.type === 'CASH_IN'
                          ? (item.requestedByUserName || item.personnelName || '-')
                          : (item.personnelName || '-')}
                      </td>

                      {/* Nominal */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm">
                        <span className={isCashIn ? 'text-emerald-400' : 'text-rose-400'}>
                          {isCashIn ? '+' : '-'} Rp {item.amount.toLocaleString('id-ID')}
                        </span>
                      </td>

                      {/* Bukti & Cetak Voucher */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {item.proofReceiptUrl ? (
                            <a
                              href={item.proofReceiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 rounded border border-indigo-900"
                              title="Buka Bukti Nota / Kwitansi"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[10px]">-</span>
                          )}
                          <button
                            onClick={() => setSelectedForVoucher(item)}
                            className="p-1 text-amber-400 hover:text-amber-300 bg-amber-950/40 rounded border border-amber-900"
                            title="Cetak Voucher Kas Kecil"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          {item.status}
                        </span>
                      </td>

                      {/* Aksi */}
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(item.type, item)}
                              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                              title="Edit Transaksi"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Hapus Transaksi"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Transaction Modal (Kas Masuk & Kas Keluar) */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveTransaction}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                {modalType === 'CASH_IN' ? (
                  <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                ) : (
                  <ArrowUpRight className="w-5 h-5 text-rose-400" />
                )}
                <h3 className="font-bold text-white text-base">
                  {isEditing ? 'Edit' : 'Catat'} {modalType === 'CASH_IN' ? 'Kas Masuk (Dropping Kas)' : 'Pengeluaran Kas Kecil'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Transaksi</label>
                <DateInput
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nominal (Rp)</label>
                <AmountInput
                  value={amount}
                  onChange={setAmount}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                  required
                />
              </div>
            </div>

            {/* Kategori */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori Transaksi</label>
              <select
                value={categorySelection}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.startsWith('CLOSED_CASE:')) {
                    setCategory('TOP_UP_REPLENISHMENT');
                    setCaseId(value.replace('CLOSED_CASE:', ''));
                  } else {
                    setCategory(value as PettyCashTransaction['category']);
                    if (modalType === 'CASH_IN') setCaseId('');
                  }
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              >
                {modalType === 'CASH_IN' ? (
                  <>
                    <option value="TOP_UP_REPLENISHMENT">Dropping / Top Up Kas dari Rekening Utama</option>
                    {closedCases.length > 0 && (
                      <optgroup label="Kasus Closed / Debitur">
                        {closedCases.map((closedCase) => (
                          <option key={closedCase.id} value={`CLOSED_CASE:${closedCase.id}`}>
                            Dropping terkait {closedCase.debtorName} ({closedCase.caseNo})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </>
                ) : (
                  <>
                    <option value="BBM_TOLL_PARKIR">BBM, Tol & Parkir Lapangan</option>
                    <option value="KONSUMSI_MEETING">Konsumsi Tim Lembur & Mediasi Kasus</option>
                    <option value="ATK_MATERAI_FOTOCOPY">Materai 10rb, ATK & Fotokopi Berkas</option>
                    <option value="BIAYA_LAPANGAN_TAKSELE">Biaya Taktis Lapangan & Koordinasi</option>
                    <option value="KURIR_PENGIRIMAN_SURAT">Kurir / Ekspedisi Somasi & Surat Kuasa</option>
                    <option value="MAINTENANCE_KANTOR">Maintenance Posko / Kuota Internet</option>
                    <option value="LAINNYA">Pengeluaran Lain-lain</option>
                  </>
                )}
              </select>
            </div>

            {/* Sumber / Penerima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {modalType === 'CASH_IN' ? 'Sumber Dana' : 'Dibayarkan Kepada'}
                </label>
                <input
                  type="text"
                  value={recipientOrSource}
                  onChange={(e) => setRecipientOrSource(e.target.value)}
                  placeholder={modalType === 'CASH_IN' ? 'e.g. Bank Mandiri Ops / Kasir Pusat' : 'e.g. SPBU Pertamina / Rumah Makan / Toko ATK'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  {modalType === 'CASH_IN' ? 'Petugas Pengajuan' : 'PIC Petugas / Pengaju'}
                </label>
                <select
                  value={modalType === 'CASH_IN' ? requestedByUserId : personnelId}
                  onChange={(e) => modalType === 'CASH_IN'
                    ? setRequestedByUserId(e.target.value)
                    : setPersonnelId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">
                    {modalType === 'CASH_IN' ? '-- Pilih Pengguna --' : '-- Pilih PIC Petugas --'}
                  </option>
                  {modalType === 'CASH_IN'
                    ? activeUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} ({user.role.replace(/_/g, ' ')})
                      </option>
                    ))
                    : store.personnel.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.type})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Terkait Kasus (Opsional) */}
            {modalType === 'CASH_OUT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Terkait Kasus / Debitur (Opsional)
                </label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">-- Umum (Tidak Terikat Kasus Spesifik) --</option>
                  {(store.cases || []).filter(c => c.status !== 'CLOSED').map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNo} - {c.status === 'CLOSED' ? '[Kasus Ditutup]' : c.debtorName} ({c.clientName})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Keterangan */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Keterangan / Uraian Rinci</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Pembelian bensin 2 unit motor tim penarikan ke lokasi debitur & e-toll..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {/* Link Bukti Nota / Kwitansi */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Link Bukti Struk / Nota / Google Drive (Opsional)
              </label>
              <input
                type="url"
                value={proofReceiptUrl}
                onChange={(e) => setProofReceiptUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTransactionModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-white text-xs font-semibold rounded-lg shadow transition ${
                  modalType === 'CASH_IN' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {isEditing ? 'Simpan Perubahan' : modalType === 'CASH_IN' ? 'Simpan Kas Masuk' : 'Simpan Pengeluaran'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Kas Opname Modal */}
      {showOpnameModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Berita Acara Kas Opname Fisik</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOpnameModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Hitung fisik uang tunai di brankas kas kecil per lembar pecahan untuk mencocokkan dengan saldo sistem.
            </p>

            <div className="space-y-2 bg-slate-950 p-4 rounded-lg border border-slate-800 font-mono text-xs">
              {[100000, 50000, 20000, 10000, 5000, 2000, 1000].map((denom) => (
                <div key={denom} className="flex items-center justify-between gap-3">
                  <span className="w-32 text-slate-300">Rp {denom.toLocaleString('id-ID')} :</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={denominations[denom] || 0}
                      onChange={(e) =>
                        setDenominations({
                          ...denominations,
                          [denom]: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-right text-white focus:outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-500 text-[10px]">lbr</span>
                  </div>
                  <span className="w-28 text-right font-bold text-emerald-400">
                    Rp {((denominations[denom] || 0) * denom).toLocaleString('id-ID')}
                  </span>
                </div>
              ))}
            </div>

            <div className="bg-slate-800/60 p-4 rounded-lg space-y-2 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Total Fisik Kas Opname:</span>
                <span className="font-bold text-white font-mono">Rp {totalPhysicalOpname.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Saldo Tercatat di Sistem:</span>
                <span className="font-bold text-slate-400 font-mono">Rp {currentBalance.toLocaleString('id-ID')}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-2 font-bold">
                <span>Selisih (Fisik - Sistem):</span>
                <span className={`font-mono ${opnameDifference === 0 ? 'text-emerald-400' : opnameDifference > 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {opnameDifference === 0 ? '0 (PAS / BALANCE)' : `Rp ${opnameDifference.toLocaleString('id-ID')}`}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan Berita Acara Kas Opname</label>
              <textarea
                rows={2}
                value={opnameNotes}
                onChange={(e) => setOpnameNotes(e.target.value)}
                placeholder="e.g. Kas opname fisik selesai dilakukan oleh kasir & disaksikan supervisor operasional..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowOpnameModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Berita Acara</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Voucher Slip Modal */}
      {selectedForVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl font-sans">
            <div className="border-b-2 border-slate-900 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-slate-900 uppercase">
                  {selectedForVoucher.type === 'CASH_IN' ? 'KAS MASUK (DROPPING)' : 'PETTY CASH VOUCHER'}
                </h2>
                <div className="text-xs text-slate-600 font-semibold">
                  PT MJ AGENCY RECOVERY INDONESIA • CONTROL TOWER
                </div>
              </div>
              <div className="text-right font-mono">
                <div className="text-xs font-bold text-slate-900">{selectedForVoucher.transactionNo}</div>
                <div className="text-[11px] text-slate-600">{selectedForVoucher.transactionDate}</div>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-semibold">
                  {selectedForVoucher.type === 'CASH_IN' ? 'Diterima Dari:' : 'Dibayarkan Kepada:'}
                </span>
                <span className="col-span-2 font-bold text-slate-900">{selectedForVoucher.recipientOrSource}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-semibold">Jumlah Uang:</span>
                <span className="col-span-2 font-black text-base text-slate-900 font-mono">
                  Rp {selectedForVoucher.amount.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-semibold">Kategori:</span>
                <span className="col-span-2 font-medium text-slate-800">{getCategoryLabel(selectedForVoucher.category)}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <span className="text-slate-500 font-semibold">Untuk Keperluan:</span>
                <span className="col-span-2 text-slate-800 leading-relaxed">{selectedForVoucher.description}</span>
              </div>

              {selectedForVoucher.caseNo && (
                <div className="grid grid-cols-3 gap-2">
                  <span className="text-slate-500 font-semibold">Referensi Kasus:</span>
                  <span className="col-span-2 font-mono text-slate-800">{selectedForVoucher.caseNo}</span>
                </div>
              )}
            </div>

            {/* Signature Area */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-slate-300 text-center text-[10px]">
              <div>
                <div className="text-slate-500 mb-10">Dibuat Oleh (PIC/Kasir)</div>
                <div className="font-bold border-t border-slate-400 pt-1 text-slate-800">
                  {selectedForVoucher.createdByName || currentUser.name}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-10">Penerima Uang</div>
                <div className="font-bold border-t border-slate-400 pt-1 text-slate-800">
                  {selectedForVoucher.recipientOrSource}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-10">Menyetujui (Manager)</div>
                <div className="font-bold border-t border-slate-400 pt-1 text-slate-800">
                  {selectedForVoucher.approvedBy || 'Direktur Ops'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedForVoucher(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 text-xs rounded hover:bg-slate-300"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded hover:bg-slate-800 flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
