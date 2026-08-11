import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, LedgerEntry } from '../../types/arms';
import { PieChart, Plus, RefreshCw, DollarSign, Wallet, ShieldCheck, FileSpreadsheet } from 'lucide-react';

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
  const [showReversalModal, setShowReversalModal] = useState<LedgerEntry | null>(null);
  const [reversalReason, setReversalReason] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const handleReversal = (entry: LedgerEntry) => {
    if (!reversalReason.trim()) return;

    // Create opposite reversal entry
    const reversalEntry: LedgerEntry = {
      id: `LDG-REV-${Date.now()}`,
      entryNo: `LDG-2026-REV-${Math.floor(100 + Math.random() * 900)}`,
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
      `Reversed financial transaction ${entry.entryNo} (Amount: ${entry.amount}). Reason: ${reversalReason}`
    );

    onUpdateStore({
      ...store,
      ledger: [reversalEntry, ...updatedLedger],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowReversalModal(null);
    setReversalReason('');
  };

  const filteredLedger = store.ledger.filter((l) => {
    if (filterAccount !== 'ALL' && l.account !== filterAccount) return false;
    return true;
  });

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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PieChart className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Finance & Profit/Loss Ledger</h2>
          </div>
          <p className="text-xs text-slate-400">
            Immutable Double-Entry Ledger • Financial Reversals & Audit Controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
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
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Recognized Revenue Fees</div>
          <div className="text-2xl font-bold text-emerald-400">
            Rp {totalRevenue.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
          <div className="text-xs text-slate-400 font-medium">Total Operating Expenses</div>
          <div className="text-2xl font-bold text-rose-400">
            Rp {totalExpenses.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-1">
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
            Rule: Financial records are non-deletable. Reversals log to Audit Trail.
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
              {filteredLedger.map((l) => (
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
                  <td className="py-3.5 px-4 text-right font-bold text-white">
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
                    {!l.isReversed && canEdit ? (
                      <button
                        onClick={() => setShowReversalModal(l)}
                        className="text-rose-400 hover:text-rose-300 text-[11px] font-semibold border border-rose-900 bg-rose-950/60 px-2 py-1 rounded transition"
                      >
                        Reverse Entry
                      </button>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
