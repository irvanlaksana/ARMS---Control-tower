import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Expense, LedgerEntry } from '../../types/arms';
import { Wallet, Plus } from 'lucide-react';

interface ExpensesModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [category, setCategory] = useState<'FIELD_OPERATIONAL' | 'TOWING' | 'WAREHOUSE' | 'LEGAL_FEE' | 'ADMIN'>('FIELD_OPERATIONAL');
  const [amount, setAmount] = useState(3500000);
  const [description, setDescription] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const expenseNo = `EXP-2026-${Math.floor(100 + Math.random() * 900)}`;

    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      expenseNo,
      category: 'OPERATIONAL',
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
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-5 h-5 text-rose-400" />
            <h2 className="text-xl font-bold text-white">Operating Expenses & Operational Outlays</h2>
          </div>
          <p className="text-xs text-slate-400">Agency Field Logistics, Legal Fees, Towing & Warehouse Expenses</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Expense</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Expense No</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Amount (Rp)</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Paid By</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.expenses.map((e) => (
                <tr key={e.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-rose-300">{e.expenseNo}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                      {(e.category || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-rose-400">
                    Rp {e.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-200">{e.description}</td>
                  <td className="py-3.5 px-4 text-slate-400">{e.requestedBy}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                      {e.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddExpense} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Record Operational Expense</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Expense Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="FIELD_OPERATIONAL">Field Operational & Logistics</option>
                <option value="TOWING">Towing & Transport</option>
                <option value="WAREHOUSE">Warehouse Storage</option>
                <option value="LEGAL_FEE">Legal & Attorney Fees</option>
                <option value="ADMIN">Administrative & HQ</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (Rp)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Expense Description</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of expense..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-500"
              >
                Post Expense & Ledger Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
