import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, WorkingCapitalTransaction } from '../../types/arms';
import { 
  Building, Plus, Search, Filter, ArrowUpRight, ArrowDownRight, 
  Wallet, Coins, ShieldCheck, FileText, Printer, Trash2, Edit2, 
  CheckCircle2, AlertCircle, X, DollarSign, Layers, Landmark
} from 'lucide-react';

interface ModalKerjaModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  onNavigateTab?: (tab: string) => void;
}

export const ModalKerjaModule: React.FC<ModalKerjaModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
  onNavigateTab,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Form Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<WorkingCapitalTransaction | null>(null);

  // Voucher Print Modal State
  const [selectedForPrint, setSelectedForPrint] = useState<WorkingCapitalTransaction | null>(null);

  // Form Fields
  const [type, setType] = useState<WorkingCapitalTransaction['type']>('INJECTION');
  const [sourceOrFunder, setSourceOrFunder] = useState('');
  const [funderType, setFunderType] = useState<WorkingCapitalTransaction['funderType']>('DIREKSI_PEMILIK');
  const [targetAllocation, setTargetAllocation] = useState<WorkingCapitalTransaction['targetAllocation']>('OPERATIONAL_POOL');
  const [amount, setAmount] = useState<number>(50000000);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [proofDocumentUrl, setProofDocumentUrl] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN_OPS';

  const workingCapitalList = store.workingCapital || [];

  // Financial Metrics Calculation
  const totalInjections = workingCapitalList
    .filter((w) => w.type === 'INJECTION' && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const totalAllocated = workingCapitalList
    .filter((w) => w.type === 'ALLOCATION' && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const totalReturned = workingCapitalList
    .filter((w) => (w.type === 'RETURN_CAPITAL' || w.type === 'WITHDRAWAL') && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const standbyCapital = totalInjections - totalAllocated - totalReturned;

  // Filtered List
  const filteredList = workingCapitalList.filter((item) => {
    const matchesSearch = 
      (item.transactionNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sourceOrFunder || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = typeFilter === 'ALL' || item.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleOpenModal = (item?: WorkingCapitalTransaction) => {
    if (item) {
      setIsEditing(true);
      setEditId(item.id);
      setType(item.type);
      setSourceOrFunder(item.sourceOrFunder);
      setFunderType(item.funderType);
      setTargetAllocation(item.targetAllocation);
      setAmount(item.amount);
      setTransactionDate(item.transactionDate);
      setNotes(item.notes || '');
      setProofDocumentUrl(item.proofDocumentUrl || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setType('INJECTION');
      setSourceOrFunder('');
      setFunderType('DIREKSI_PEMILIK');
      setTargetAllocation('OPERATIONAL_POOL');
      setAmount(50000000);
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setProofDocumentUrl('');
    }
    setShowModal(true);
  };

  const handleSaveTransaction = (e: React.FormEvent) => {
    e.preventDefault();

    if (!sourceOrFunder.trim()) {
      alert('Nama Sumber Dana / Funder wajib diisi.');
      return;
    }

    if (amount <= 0) {
      alert('Nominal transaksi harus lebih besar dari Rp 0.');
      return;
    }

    if (isEditing && editId) {
      const existing = workingCapitalList.find((w) => w.id === editId);
      if (!existing) return;

      const updated: WorkingCapitalTransaction = {
        ...existing,
        type,
        sourceOrFunder,
        funderType,
        targetAllocation,
        amount,
        transactionDate,
        notes,
        proofDocumentUrl,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Working_Capital',
        editId,
        `Updated Working Capital Transaction ${existing.transactionNo} (${type} Rp ${amount.toLocaleString('id-ID')})`
      );

      onUpdateStore({
        ...store,
        workingCapital: workingCapitalList.map((w) => (w.id === editId ? updated : w)),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const transactionNo = `WCP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newTransaction: WorkingCapitalTransaction = {
        id: `WCP-${Date.now()}`,
        transactionNo,
        type,
        sourceOrFunder,
        funderType,
        targetAllocation,
        amount,
        transactionDate,
        notes,
        proofDocumentUrl,
        status: 'COMPLETED',
        createdByName: currentUser.name,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Working_Capital',
        newTransaction.id,
        `Recorded Working Capital ${transactionNo} (${type} Rp ${amount.toLocaleString('id-ID')} from ${sourceOrFunder})`
      );

      onUpdateStore({
        ...store,
        workingCapital: [newTransaction, ...workingCapitalList],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Working_Capital',
      deleteTarget.id,
      `Deleted Working Capital Transaction ${deleteTarget.transactionNo} (${deleteTarget.type} Rp ${deleteTarget.amount.toLocaleString('id-ID')})`
    );

    onUpdateStore({
      ...store,
      workingCapital: workingCapitalList.filter((w) => w.id !== deleteTarget.id),
      auditLogs: [audit, ...store.auditLogs],
    });

    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Modal Kerja (Working Capital Management)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Pencatatan Suntikan Modal Pemilik/Investor, Alokasi Likuiditas Operasional & Talangan, serta Pengembalian Modal
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('SETTINGS')}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3.5 py-2.5 rounded-lg border border-slate-700 transition"
            >
              <Landmark className="w-4 h-4 text-emerald-400" />
              <span>Kelola Saldo Bank (Setting)</span>
            </button>
          )}

          {canEdit && (
            <button
              onClick={() => handleOpenModal()}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Catat Transaksi Modal Kerja</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Modal Masuk */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Modal Disetor (Injection)</span>
            <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-900/50">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {totalInjections.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Suntikan Direksi & Pool Investor</span>
          </div>
        </div>

        {/* Total Modal Teralokasi */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Modal Teralokasi (Allocated)</span>
            <div className="p-2 rounded-lg bg-blue-950/80 text-blue-400 border border-blue-900/50">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {totalAllocated.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-blue-300 font-medium">
            Alokasi ke Ops, Vault Talangan & Kas Kecil
          </div>
        </div>

        {/* Pengembalian / Penarikan Modal */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Pengembalian / Penarikan</span>
            <div className="p-2 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-900/50">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {totalReturned.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-amber-400 font-medium">
            Return of Capital ke Pemilik/Investor
          </div>
        </div>

        {/* Saldo Standby Tersedia */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Modal Standby / Unallocated</span>
            <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-900/50">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold tracking-tight ${standbyCapital >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
            Rp {standbyCapital.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">
            Cadangan Kas Modal Siap Pakai
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari no transaksi, sumber dana, catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'ALL'
                ? 'bg-indigo-600 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Semua Tipe
          </button>
          <button
            onClick={() => setTypeFilter('INJECTION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'INJECTION'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Suntikan Modal (Inflow)
          </button>
          <button
            onClick={() => setTypeFilter('ALLOCATION')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'ALLOCATION'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Alokasi Modal
          </button>
          <button
            onClick={() => setTypeFilter('RETURN_CAPITAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              typeFilter === 'RETURN_CAPITAL'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Pengembalian Modal
          </button>
        </div>
      </div>

      {/* Working Capital Transaction Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No Transaksi</th>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Jenis Transaksi</th>
                <th className="py-3 px-4">Sumber / Funder</th>
                <th className="py-3 px-4">Alokasi Tujuan</th>
                <th className="py-3 px-4 text-right">Nominal (Rp)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 text-xs">
                    Belum ada data transaksi modal kerja. Klik tombol <strong>+ Catat Transaksi Modal Kerja</strong> untuk menambahkan setoran atau alokasi modal.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {item.transactionNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {item.transactionDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            item.type === 'INJECTION'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : item.type === 'ALLOCATION'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : 'bg-amber-950 text-amber-300 border-amber-800'
                          }`}
                        >
                          {item.type === 'INJECTION'
                            ? 'SUNTIKAN MODAL'
                            : item.type === 'ALLOCATION'
                            ? 'ALOKASI MODAL'
                            : 'PENGEMBALIAN'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{item.sourceOrFunder}</div>
                        <div className="text-[10px] text-slate-400">{(item.funderType || '').replace(/_/g, ' ')}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                          {(item.targetAllocation || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-white">
                        <span className={item.type === 'INJECTION' ? 'text-emerald-400' : 'text-slate-200'}>
                          Rp {item.amount.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedForPrint(item)}
                            className="text-slate-400 hover:text-indigo-400 transition"
                            title="Cetak Bukti Transaksi"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenModal(item)}
                                className="text-slate-400 hover:text-white transition"
                                title="Edit Data"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(item)}
                                className="text-slate-400 hover:text-rose-400 transition"
                                title="Hapus Data"
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

      {/* Form Modal (Create / Edit) */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Landmark className="w-4 h-4 text-indigo-400" />
                <span>{isEditing ? 'Edit Transaksi Modal Kerja' : 'Catat Transaksi Modal Kerja Baru'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Jenis Transaksi Modal *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500"
                >
                  <option value="INJECTION">SUNTIKAN MODAL (Inflow / Penambahan Modal Kerja)</option>
                  <option value="ALLOCATION">ALOKASI MODAL (Penempatan ke Pool Ops / Talangan / Kas Kecil)</option>
                  <option value="RETURN_CAPITAL">PENGEMBALIAN MODAL (Return of Capital ke Investor/Pemilik)</option>
                  <option value="WITHDRAWAL">PENARIKAN MODAL KERJA</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tipe Funder / Sumber *</label>
                  <select
                    value={funderType}
                    onChange={(e) => setFunderType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500"
                  >
                    <option value="DIREKSI_PEMILIK">Direksi / Pemilik Perusahaan</option>
                    <option value="INVESTOR_POOL">Investor / Funder Pool</option>
                    <option value="BANK_LOAN">Fasilitas Pinjaman Bank</option>
                    <option value="INTERNAL_RESERVE">Cadangan Kas Internal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Alokasi Tujuan *</label>
                  <select
                    value={targetAllocation}
                    onChange={(e) => setTargetAllocation(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500"
                  >
                    <option value="OPERATIONAL_POOL">Kas Operasional Utama (Bank Mandiri)</option>
                    <option value="TALANGAN_VAULT">Vault Dana Talangan (BCA)</option>
                    <option value="PETTY_CASH">Kas Kecil Operasional (Petty Cash)</option>
                    <option value="TACTICAL_RESERVE">Cadangan Likuiditas Taktis</option>
                    <option value="RETURN_TO_INVESTOR">Rekening Investor / Pemilik</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Nama Sumber Dana / Nama Funder *</label>
                <input
                  type="text"
                  placeholder="Contoh: Setoran Modal Awal Direktur Utama, Suntikan Pool Investor Batavia"
                  value={sourceOrFunder}
                  onChange={(e) => setSourceOrFunder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Nominal Modal (Rp) *</label>
                  <input
                    type="number"
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500 font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Tanggal Transaksi *</label>
                  <input
                    type="date"
                    value={transactionDate}
                    onChange={(e) => setTransactionDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Keterangan / Peruntukan</label>
                <textarea
                  rows={2}
                  placeholder="Catatan tujuan setoran, skema bagi hasil/kompensasi, atau nomor perjanjian..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Link Dokumen Bukti Transfer / Perjanjian</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={proofDocumentUrl}
                  onChange={(e) => setProofDocumentUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow"
                >
                  {isEditing ? 'Simpan Perubahan' : 'Simpan Transaksi Modal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Konfirmasi Hapus Transaksi</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">No Transaksi:</span>
                <span className="font-mono font-bold text-white">{deleteTarget.transactionNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Funder / Sumber:</span>
                <span className="font-medium text-white">{deleteTarget.sourceOrFunder}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal:</span>
                <span className="font-bold text-emerald-400">Rp {deleteTarget.amount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus catatan transaksi modal kerja ini dari pembukuan? Penghapusan akan dicatat pada log audit sistem.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Voucher Modal */}
      {selectedForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span>Bukti Transaksi Modal Kerja</span>
              </h3>
              <button onClick={() => setSelectedForPrint(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Receipt Card */}
            <div className="bg-white text-slate-900 p-6 rounded-lg shadow space-y-4 text-xs font-sans">
              <div className="text-center border-b pb-3 space-y-1">
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">
                  {store.settings?.companyName || 'PT MANDIRI JAYA ARMS'}
                </h4>
                <p className="text-[10px] text-slate-600">
                  BUKTI TRANSAKSI SETORAN / ALOKASI MODAL KERJA
                </p>
                <p className="font-mono text-[11px] font-bold text-indigo-900">
                  {selectedForPrint.transactionNo}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500 block">Tanggal Transaksi:</span>
                  <span className="font-bold">{selectedForPrint.transactionDate}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Jenis Transaksi:</span>
                  <span className="font-bold uppercase text-indigo-800">{selectedForPrint.type}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sumber Dana / Funder:</span>
                  <span className="font-bold">{selectedForPrint.sourceOrFunder}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Alokasi Tujuan:</span>
                  <span className="font-bold">{(selectedForPrint.targetAllocation || '').replace(/_/g, ' ')}</span>
                </div>
              </div>

              <div className="bg-slate-100 p-3 rounded border border-slate-200 text-center space-y-1">
                <div className="text-[10px] text-slate-500 uppercase font-semibold">Nominal Transaksi</div>
                <div className="text-lg font-extrabold text-slate-900 font-mono">
                  Rp {selectedForPrint.amount.toLocaleString('id-ID')}
                </div>
              </div>

              {selectedForPrint.notes && (
                <div className="text-[10px] text-slate-600 italic border-l-2 border-slate-300 pl-2">
                  Catatan: {selectedForPrint.notes}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2 pt-6 text-center text-[10px]">
                <div>
                  <div className="text-slate-500">Penyetor / Funder</div>
                  <div className="mt-8 font-bold border-t border-slate-300 pt-1">
                    ( {selectedForPrint.sourceOrFunder.slice(0, 18)} )
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Petugas Input</div>
                  <div className="mt-8 font-bold border-t border-slate-300 pt-1">
                    ( {selectedForPrint.createdByName || currentUser.name} )
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Direktur / Approver</div>
                  <div className="mt-8 font-bold border-t border-slate-300 pt-1">
                    ( Direksi Operasional )
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedForPrint(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Tutup
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak / Cetak PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
