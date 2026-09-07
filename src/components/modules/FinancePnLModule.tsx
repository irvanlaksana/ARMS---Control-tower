import React, { useState, useMemo } from 'react';
import { Pagination, usePagination } from '../common/Pagination';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, LedgerEntry } from '../../types/arms';
import { PieChart, Plus, RefreshCw, DollarSign, Wallet, ShieldCheck, FileSpreadsheet, Trash2, Edit2, X, Search } from 'lucide-react';

interface FinancePnLModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const FinancePnLModule: React.FC<FinancePnLModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [filterAccount, setFilterAccount] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showReversalModal, setShowReversalModal] = useState<LedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  // Manual Journal Entry Modal
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [account, setAccount] = useState<LedgerEntry['account']>('EXPENSE_OPS');
  const [entryType, setEntryType] = useState<'DEBIT' | 'CREDIT'>('DEBIT');
  const [amount, setAmount] = useState<number>(1000000);
  const [description, setDescription] = useState('');
  const [referenceModule, setReferenceModule] = useState<LedgerEntry['referenceModule']>('ADJUSTMENT');
  const [referenceId, setReferenceId] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleOpenEntryModal = (item?: LedgerEntry) => {
    if (item) {
      setIsEditing(true);
      setEditId(item.id);
      setAccount(item.account);
      setEntryType(item.type);
      setAmount(item.amount);
      setDescription(item.description);
      setReferenceModule(item.referenceModule);
      setReferenceId(item.referenceId || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setAccount('EXPENSE_OPS');
      setEntryType('DEBIT');
      setAmount(1000000);
      setDescription('');
      setReferenceModule('ADJUSTMENT');
      setReferenceId('');
    }
    setShowEntryModal(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();

    if (amount <= 0) {
      alert('Nominal harus lebih besar dari 0.');
      return;
    }

    if (!description.trim()) {
      alert('Keterangan jurnal wajib diisi.');
      return;
    }

    if (isEditing && editId) {
      const existing = store.ledger.find((l) => l.id === editId);
      if (!existing) return;

      const updated: LedgerEntry = {
        ...existing,
        account,
        type: entryType,
        amount,
        description,
        referenceModule,
        referenceId: referenceId || existing.referenceId,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Finance_Ledger',
        editId,
        `Updated Ledger Entry ${existing.entryNo} (${account} Rp ${amount.toLocaleString('id-ID')})`
      );

      onUpdateStore({
        ...store,
        ledger: store.ledger.map((l) => (l.id === editId ? updated : l)),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const entryNo = `LDG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newEntry: LedgerEntry = {
        id: `LDG-${Date.now()}`,
        entryNo,
        date: new Date().toISOString().split('T')[0],
        account,
        type: entryType,
        amount,
        referenceModule,
        referenceId: referenceId || entryNo,
        description,
        isReversed: false,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Finance_Ledger',
        newEntry.id,
        `Posted Manual Journal Entry ${entryNo} (${account} ${entryType} Rp ${amount.toLocaleString('id-ID')})`
      );

      onUpdateStore({
        ...store,
        ledger: [newEntry, ...store.ledger],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowEntryModal(false);
  };

  const handleDeleteEntry = (entry: LedgerEntry) => {
    if (!window.confirm(`Hapus entri jurnal ${entry.entryNo} (Rp ${entry.amount.toLocaleString('id-ID')})? Tindakan ini akan tercatat dalam Audit Log.`)) {
      return;
    }

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Finance_Ledger',
      entry.id,
      `Hard deleted Ledger Entry ${entry.entryNo} (${entry.account} Rp ${entry.amount.toLocaleString('id-ID')})`
    );

    onUpdateStore({
      ...store,
      ledger: store.ledger.filter((l) => l.id !== entry.id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleReversal = (entry: LedgerEntry) => {
    if (!reversalReason.trim()) return;

    // Create opposite reversal entry
    const reversalEntry: LedgerEntry = {
      id: `LDG-REV-${Date.now()}`,
      entryNo: `LDG-${new Date().getFullYear()}-REV-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      account: entry.account,
      type: entry.type === 'DEBIT' ? 'CREDIT' : 'DEBIT',
      amount: entry.amount,
      referenceModule: 'ADJUSTMENT',
      referenceId: entry.id,
      description: `REVERSAL of ${entry.entryNo}: ${reversalReason}`,
      isReversed: true,
      reversedById: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    // Mark original entry as reversed
    const updatedLedger = store.ledger.map((l) => {
      if (l.id === entry.id) {
        return { ...l, isReversed: true, reversedById: currentUser.name };
      }
      return l;
    });

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'FINANCIAL_REVERSAL',
      'Finance_Ledger',
      entry.id,
      `Reversed financial transaction ${entry.entryNo} (Amount: Rp ${entry.amount.toLocaleString('id-ID')}). Reason: ${reversalReason}`
    );

    onUpdateStore({
      ...store,
      ledger: [reversalEntry, ...updatedLedger],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowReversalModal(null);
    setReversalReason('');
  };

  const filteredLedger = useMemo(() => {
    return store.ledger.filter((l) => {
      if (filterAccount !== 'ALL' && l.account !== filterAccount) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const match = `${l.entryNo} ${l.description} ${l.referenceModule} ${l.referenceId || ''}`.toLowerCase();
        if (!match.includes(q)) return false;
      }
      return true;
    });
  }, [store.ledger, filterAccount, searchTerm]);

  const pnlPagination = usePagination<LedgerEntry>(filteredLedger, 10);

  const totalRevenue = store.ledger
    .filter((l) => l.account === 'REVENUE_FEE' && !l.isReversed)
    .reduce((sum, l) => sum + l.amount, 0);

  const totalExpenses = store.ledger
    .filter((l) => l.account === 'EXPENSE_OPS' && !l.isReversed)
    .reduce((sum, l) => sum + l.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Finance & Profit/Loss Ledger</h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable Double-Entry Ledger • Financial Reversals & Audit Controls
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              onClick={() => handleOpenEntryModal()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Post Manual Journal Entry</span>
            </button>
          )}

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                pnlPagination.setPage(1);
              }}
              placeholder="Cari jurnal..."
              className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-48"
            />
          </div>

          <select
            value={filterAccount}
            onChange={(e) => {
              setFilterAccount(e.target.value);
              pnlPagination.setPage(1);
            }}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Accounts</option>
            <option value="CASH">CASH Account</option>
            <option value="RECEIVABLE">RECEIVABLE</option>
            <option value="TALANGAN_RECEIVABLE">TALANGAN RECEIVABLE</option>
            <option value="REVENUE_FEE">REVENUE FEE</option>
            <option value="EXPENSE_OPS">EXPENSE OPS</option>
          </select>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium">Total Recognized Revenue Fees</div>
          <div className="text-2xl font-bold text-emerald-400">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium">Total Operating Expenses</div>
          <div className="text-2xl font-bold text-rose-400">
            Rp {totalExpenses.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1 shadow">
          <div className="text-xs text-slate-400 font-medium">Net Operating Profit / Loss</div>
          <div className="text-2xl font-bold text-indigo-400">
            Rp {netProfit.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            General Ledger Entries ({filteredLedger.length})
          </h3>
          <span className="text-[11px] text-slate-500">
            Rule: Financial records are non-deletable for standard operations. Reversals log to Audit Trail.
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Entry No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4 text-right">Amount (Rp)</th>
                <th className="py-3 px-4">Reference & Description</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pnlPagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500 text-xs">
                    {store.ledger.length === 0
                      ? 'Belum ada data transaksi buku besar (General Ledger). Transaksi dari modul Pembayaran, Biaya, dan Jurnal Manual akan otomatis muncul di sini.'
                      : 'Tidak ada entri jurnal yang sesuai filter atau pencarian.'}
                  </td>
                </tr>
              ) : (
                pnlPagination.pageItems.map((l) => (
                  <tr key={l.id} className={`hover:bg-slate-800/40 transition ${l.isReversed ? 'opacity-60 bg-slate-950/30' : ''}`}>
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{l.entryNo}</td>
                    <td className="py-3.5 px-4 text-slate-400">{l.date}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                        {l.account}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${l.type === 'DEBIT' ? 'bg-emerald-950 text-emerald-300' : 'bg-blue-950 text-blue-300'}`}>
                        {l.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-white font-mono">
                      Rp {l.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5 max-w-[260px]">
                      <div className="font-semibold text-slate-200">{l.description}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Ref: {l.referenceModule} ({l.referenceId})</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {l.isReversed ? (
                        <span className="bg-rose-950 text-rose-300 text-[10px] px-2 py-0.5 rounded border border-rose-800 font-semibold">
                          REVERSED
                        </span>
                      ) : (
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                          POSTED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {!l.isReversed && canEdit && (
                          <button
                            onClick={() => setShowReversalModal(l)}
                            className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold border border-rose-900 bg-rose-950/60 px-2 py-1 rounded transition"
                            title="Reverse Jurnal"
                          >
                            Reverse
                          </button>
                        )}
                        {isSuperAdmin && (
                          <>
                            <button
                              onClick={() => handleOpenEntryModal(l)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                              title="Edit Entry"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteEntry(l)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={pnlPagination.page}
          totalPages={pnlPagination.totalPages}
          totalItems={pnlPagination.totalItems}
          pageSize={pnlPagination.pageSize}
          onPageChange={pnlPagination.setPage}
          onPageSizeChange={pnlPagination.setPageSize}
        />
      </div>

      {/* Manual Journal Entry Modal */}
      {showEntryModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveEntry}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {isEditing ? 'Edit Entri Jurnal' : 'Post Manual Journal Entry'}
              </h3>
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account</label>
                <select
                  value={account}
                  onChange={(e) => setAccount(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="CASH">CASH Account</option>
                  <option value="RECEIVABLE">RECEIVABLE</option>
                  <option value="TALANGAN_RECEIVABLE">TALANGAN RECEIVABLE</option>
                  <option value="REVENUE_FEE">REVENUE FEE</option>
                  <option value="EXPENSE_OPS">EXPENSE OPS</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Entry Type</label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-bold"
                >
                  <option value="DEBIT">DEBIT</option>
                  <option value="CREDIT">CREDIT</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nominal (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                min="1000"
                step="1000"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value.replace(/\D/g, '')) || 0)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono font-bold"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reference Module</label>
                <select
                  value={referenceModule}
                  onChange={(e) => setReferenceModule(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="EXPENSE">EXPENSE</option>
                  <option value="TALANGAN">TALANGAN</option>
                  <option value="SETTLEMENT">SETTLEMENT</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Reference ID / No</label>
                <input
                  type="text"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="e.g. ADJ-001"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Keterangan Jurnal</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Setoran modal awal / Penyesuaian biaya operasional..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowEntryModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg"
              >
                {isEditing ? 'Simpan Perubahan' : 'Post Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reversal Modal */}
      {showReversalModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Reverse Ledger Entry {showReversalModal.entryNo}</h3>
            <p className="text-xs text-slate-400">
              Amount to reverse: <span className="font-bold text-white">Rp {showReversalModal.amount.toLocaleString('id-ID')}</span>
            </p>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Formal Reason for Reversal</label>
              <textarea
                rows={3}
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                placeholder="e.g. Correction of duplicate posting / Incorrect allocation"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowReversalModal(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReversal(showReversalModal)}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-500"
              >
                Execute Reversal & Audit Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
