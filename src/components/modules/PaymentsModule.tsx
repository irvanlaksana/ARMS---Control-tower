import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Payment, LedgerEntry } from '../../types/arms';
import { DollarSign, Plus, CheckCircle } from 'lucide-react';

interface PaymentsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [paymentAmount, setPaymentAmount] = useState(25000000);
  const [paymentType, setPaymentType] = useState<'FULL_PAYMENT' | 'PARTIAL_PAYMENT' | 'SETTLEMENT_NEGOTIATED'>('PARTIAL_PAYMENT');
  const [proofDriveUrl, setProofDriveUrl] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);

    const receiptNo = `PAY-2026-${Math.floor(100 + Math.random() * 900)}`;
    const feeSnapshot = c?.feePercentSnapshot || 15;
    const agencyFeeCalculated = (paymentAmount * feeSnapshot) / 100;

    const newPayment: Payment = {
      id: `PAY-${Date.now()}`,
      paymentNo: receiptNo,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      debtorName: c?.debtorName || 'Debtor',
      paymentDate: new Date().toISOString().split('T')[0],
      amount: paymentAmount,
      paymentType: 'DEBTOR_REPAYMENT',
      proofUrl: proofDriveUrl,
      allocationSummary: `Principal: Rp ${(paymentAmount - agencyFeeCalculated).toLocaleString('id-ID')}, Agency Fee (${feeSnapshot}%): Rp ${agencyFeeCalculated.toLocaleString('id-ID')}`,
      verificationStatus: 'VERIFIED',
      verifiedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    // Post Double-Entry Ledger
    const ledgerEntry1: LedgerEntry = {
      id: `LDG-PAY1-${Date.now()}`,
      entryNo: `LDG-2026-PAY-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      account: 'CASH',
      type: 'DEBIT',
      amount: paymentAmount,
      referenceModule: 'PAYMENT',
      referenceId: newPayment.id,
      description: `Debtor Payment Receipt ${receiptNo} for ${c?.caseNo}`,
      createdAt: new Date().toISOString(),
    };

    const ledgerEntry2: LedgerEntry = {
      id: `LDG-PAY2-${Date.now()}`,
      entryNo: `LDG-2026-REV-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      account: 'REVENUE_FEE',
      type: 'CREDIT',
      amount: agencyFeeCalculated,
      referenceModule: 'PAYMENT',
      referenceId: newPayment.id,
      description: `Agency Fee Recognized ${feeSnapshot}% on Receipt ${receiptNo}`,
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'PAYMENT',
      'Payments',
      newPayment.id,
      `Recorded Debtor Payment ${receiptNo} Rp ${paymentAmount.toLocaleString('id-ID')} with Fee Rp ${agencyFeeCalculated.toLocaleString('id-ID')}`
    );

    onUpdateStore({
      ...store,
      payments: [newPayment, ...store.payments],
      ledger: [ledgerEntry1, ledgerEntry2, ...store.ledger],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Debtor Payments & Fee Collections</h2>
          </div>
          <p className="text-xs text-slate-400">Verified Debtor Recovery Receipts & Agency Commission Ledger Postings</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Debtor Payment</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4 text-right">Payment Amount</th>
                <th className="py-3 px-4 font-mono">Fee %</th>
                <th className="py-3 px-4 text-right">Agency Fee</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.payments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">{p.paymentNo}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{p.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{p.debtorName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-200">{p.paymentType}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    Rp {p.amount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[200px]">{p.allocationSummary}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                      {p.verificationStatus}
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
          <form onSubmit={handleRecordPayment} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Record Debtor Payment</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Case</label>
              <select
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                {store.cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNo} - {c.debtorName} ({c.clientName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Payment Amount (Rp)</label>
              <input
                type="number"
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Payment Type</label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="PARTIAL_PAYMENT">Angsuran / Partial Payment</option>
                <option value="FULL_PAYMENT">Pelunasan / Full Payment</option>
                <option value="SETTLEMENT_NEGOTIATED">Settlement Negosiasi</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Proof of Transfer Google Drive Link</label>
              <input
                type="text"
                value={proofDriveUrl}
                onChange={(e) => setProofDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
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
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500"
              >
                Post Payment & Ledger Entry
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
