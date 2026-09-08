import { Pagination, usePagination } from '../common/Pagination';
import React, { useState, useMemo } from 'react';
import { AmountInput } from '../common/AmountInput';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Expense, LedgerEntry } from '../../types/arms';
import { Wallet, Plus, Edit2, Trash2, Search } from 'lucide-react';

interface ExpensesModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [category, setCategory] = useState<'FIELD_OPERATIONAL' | 'TOWING' | 'WAREHOUSE' | 'LEGAL_FEE' | 'ADMIN'>('FIELD_OPERATIONAL');
  const [amount, setAmount] = useState(3500000);
  const [description, setDescription] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && editId) {
      const existingExpense = store.expenses.find(exp => exp.id === editId);
      if (!existingExpense) return;

      const updatedExpense = {
        ...existingExpense,
        category,
        amount,
        description,
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Expenses', editId, `Updated Expense ${existingExpense.expenseNo}`);

      onUpdateStore({
        ...store,
        expenses: store.expenses.map(exp => exp.id === editId ? updatedExpense : exp),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const expenseNo = `EXP-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newExpense: Expense = {
        id: `EXP-${Date.now()}`,
        expenseNo,
        category: 'OPERATIONAL', // We actually set a detailed category in the state
        amount,
        description,
        expenseDate: new Date().toISOString().split('T')[0],
        requestedBy: currentUser.name,
        status: 'APPROVED',
        createdAt: new Date().toISOString(),
      };

      const ledgerEntry: LedgerEntry = {
        id: `LDG-EXP-${Date.now()}`,
        entryNo: `LDG-2026-EXP-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        account: 'EXPENSE_OPS',
        type: 'DEBIT',
        amount,
        referenceModule: 'EXPENSE',
        referenceId: newExpense.id,
        description: `Operational Expense ${expenseNo}: ${description}`,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Expenses', newExpense.id, `Recorded Expense ${expenseNo} Rp ${amount.toLocaleString('id-ID')}`);

      onUpdateStore({
        ...store,
        expenses: [newExpense, ...store.expenses],
        ledger: [ledgerEntry, ...store.ledger],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
    resetForm();
  };

  const handleEditClick = (exp: Expense) => {
    setCategory(exp.category as any || 'FIELD_OPERATIONAL');
    setAmount(exp.amount);
    setDescription(exp.description || '');
    setEditId(exp.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      const existingExpense = store.expenses.find(exp => exp.id === id);
      const audit = createAuditEntry(currentUser.username, currentUser.role, 'DELETE', 'Expenses', id, `Deleted Expense ${existingExpense?.expenseNo}`);
      onUpdateStore({
        ...store,
        expenses: store.expenses.filter(exp => exp.id !== id),
        auditLogs: [audit, ...store.auditLogs]
      });
    }
  };

  const resetForm = () => {
    setCategory('FIELD_OPERATIONAL');
    setAmount(3500000);
    setDescription('');
    setEditId(null);
    setIsEditing(false);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FIELD_OPERATIONAL' | 'TOWING' | 'WAREHOUSE' | 'LEGAL_FEE' | 'ADMIN'>('ALL');

  const filteredExpenses = useMemo(() => {
    return (store.expenses || []).filter((e) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        e.expenseNo.toLowerCase().includes(term) ||
        (e.description && e.description.toLowerCase().includes(term)) ||
        (e.paidBy && e.paidBy.toLowerCase().includes(term)) ||
        e.category.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (categoryFilter !== 'ALL' && e.category !== categoryFilter) return false;
      return true;
    });
  }, [store.expenses, searchTerm, categoryFilter]);

  const expensePagination = usePagination<Expense>(filteredExpenses, 10);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Wallet className="w-4 h-4 text-rose-400" />
            <h2 className="text-xl font-bold text-white">Operating Expenses & Operational Outlays</h2>
          </div>
          <p className="text-xs text-slate-400">Agency Field Logistics, Legal Fees, Towing & Warehouse Expenses</p>
        </div>

        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'Semua Kategori' },
              { key: 'FIELD_OPERATIONAL', label: 'Operasional Lapangan' },
              { key: 'TOWING', label: 'Towing / Derek' },
              { key: 'WAREHOUSE', label: 'Gudang' },
              { key: 'LEGAL_FEE', label: 'Legal Fee' },
              { key: 'ADMIN', label: 'Administrasi' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setCategoryFilter(t.key);
                expensePagination.setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                categoryFilter === t.key
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari no expense, uraian, pembayar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              expensePagination.setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Expense No</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3 text-right">Amount (Rp)</th>
                <th className="py-2 px-3">Description</th>
                <th className="py-2 px-3">Paid By</th>
                <th className="py-2 px-3 text-center">Status</th>
                {canEdit && <th className="py-2 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {expensePagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-slate-500 text-xs">
                    {store.expenses.length === 0
                      ? 'Belum ada data pengeluaran operasional. Klik tombol + Record Expense untuk mencatat pengeluaran.'
                      : 'Tidak ada data pengeluaran yang sesuai dengan filter atau pencarian.'}
                  </td>
                </tr>
              ) : (
                expensePagination.pageItems.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-rose-300">{e.expenseNo}</td>
                    <td className="py-2.5 px-3">
                      <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                        {(e.category || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-400">
                      Rp {e.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-200">{e.description}</td>
                    <td className="py-2.5 px-3 text-slate-400">{e.requestedBy}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-1 rounded-full border border-emerald-800 font-semibold">
                        {e.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditClick(e)} className="text-slate-400 hover:text-white transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteClick(e.id)} className="text-slate-400 hover:text-rose-400 transition">
                            <Trash2 className="w-3.5 h-3.5" />
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
        <Pagination
          page={expensePagination.page}
          totalPages={expensePagination.totalPages}
          totalItems={expensePagination.totalItems}
          pageSize={expensePagination.pageSize}
          onPageChange={expensePagination.setPage}
          onPageSizeChange={expensePagination.setPageSize}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleAddExpense} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-4 space-y-2.5 shadow-2xl">
            <h3 className="font-bold text-white text-base">{isEditing ? 'Edit Operational Expense' : 'Record Operational Expense'}</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Expense Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                <option value="FIELD_OPERATIONAL">Field Operational & Logistics</option>
                <option value="TOWING">Towing & Transport</option>
                <option value="WAREHOUSE">Warehouse Storage</option>
                <option value="LEGAL_FEE">Legal & Attorney Fees</option>
                <option value="ADMIN">Administrative & HQ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Amount (Rp)</label>
              <AmountInput
                required
                value={amount}
                onChange={setAmount}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Expense Description</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of expense..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-500"
              >
                {isEditing ? 'Save Changes' : 'Post Expense & Ledger Entry'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
