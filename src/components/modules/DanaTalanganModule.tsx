import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, DanaTalangan, ApprovalRequest } from '../../types/arms';
import { Coins, Plus, CheckCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DanaTalanganModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const DanaTalanganModule: React.FC<DanaTalanganModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [purpose, setPurpose] = useState<'PENARIKAN_UNIT' | 'STORAGE_WAREHOUSE' | 'TOWING_LOGISTICS' | 'LEGAL_MEDIATION' | 'LIQUIDITY_BRIDGING'>('PENARIKAN_UNIT');
  const [requestedAmount, setRequestedAmount] = useState(10000000);
  const [funderSource, setFunderSource] = useState<'INTERNAL_CASH' | 'INVESTOR_POOL' | 'TALANGAN_VAULT'>('TALANGAN_VAULT');
  const [feeRate, setFeeRate] = useState(5);
  const [repayTargetDate, setRepayTargetDate] = useState('2026-08-30');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleCreateTalangan = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);

    const fundingNo = `TAL-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newFunding: DanaTalangan = {
      id: `TAL-${Date.now()}`,
      fundingNo,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      debtorName: c?.debtorName || 'Debtor',
      purpose,
      requestedAmount,
      funderSource,
      feeOrInterestRatePercent: feeRate,
      repayTargetDate,
      status: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
    };

    // Create approval request for Direktur Utama
    const approvalReq: ApprovalRequest = {
      id: `APP-TAL-${Date.now()}`,
      requestNo: `REQ-TAL-${Math.floor(100 + Math.random() * 900)}`,
      module: 'DANA_TALANGAN',
      targetId: newFunding.id,
      targetReference: `${fundingNo} (${c?.caseNo})`,
      title: `Pencairan Dana Talangan ${(purpose || '').replace(/_/g, ' ')} Rp ${requestedAmount.toLocaleString('id-ID')}`,
      requestedBy: currentUser.name,
      amountOrValue: requestedAmount,
      description: `Pengajuan dana talangan untuk penarikan/recovery aset unit kasus ${c?.caseNo}. Source: ${funderSource}.`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Dana_Talangan',
      newFunding.id,
      `Requested Dana Talangan ${fundingNo} for ${requestedAmount} (Pending Executive Approval)`
    );

    onUpdateStore({
      ...store,
      danaTalangan: [newFunding, ...store.danaTalangan],
      approvals: [approvalReq, ...store.approvals],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Dana Talangan & Liquidity Financing</h2>
          </div>
          <p className="text-xs text-slate-400">
            Agency Short-term Liquidity Bridging for Repossession, Storage, Towing & Asset Recovery
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>New Dana Talangan Request</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Funding No</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Purpose</th>
                <th className="py-3 px-4 text-right">Requested Amount</th>
                <th className="py-3 px-4">Funder Source</th>
                <th className="py-3 px-4">Bridging Fee %</th>
                <th className="py-3 px-4">Repay Target</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(store.danaTalangan || []).map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-300">{t.fundingNo}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{t.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{t.debtorName}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                      {(t.purpose || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    Rp {t.requestedAmount.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-300">{t.funderSource}</td>
                  <td className="py-3.5 px-4 font-mono text-amber-300">{t.feeOrInterestRatePercent}%</td>
                  <td className="py-3.5 px-4 text-slate-400">{t.repayTargetDate || '-'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-amber-950 text-amber-300 text-[10px] px-2.5 py-1 rounded-full border border-amber-800 font-semibold">
                      {(t.status || '').replace(/_/g, ' ')}
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
          <form onSubmit={handleCreateTalangan} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Request Dana Talangan Liquidity</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Case</label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNo} - {c.debtorName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Purpose Category</label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="PENARIKAN_UNIT">Penarikan Unit</option>
                  <option value="STORAGE_WAREHOUSE">Sewa & Storage Gudang</option>
                  <option value="TOWING_LOGISTICS">Towing & Logistik</option>
                  <option value="LEGAL_MEDIATION">Legal & Mediasi</option>
                  <option value="LIQUIDITY_BRIDGING">Liquidity Bridging</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Requested Amount (Rp)</label>
                <input
                  type="number"
                  value={requestedAmount}
                  onChange={(e) => setRequestedAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Funder Source Vault</label>
                <select
                  value={funderSource}
                  onChange={(e) => setFunderSource(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="TALANGAN_VAULT">Talangan Vault (BCA)</option>
                  <option value="INTERNAL_CASH">Kas Operasional Utama</option>
                  <option value="INVESTOR_POOL">Investor Liquidity Pool</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Bridging Fee Rate (%)</label>
                <input
                  type="number"
                  value={feeRate}
                  onChange={(e) => setFeeRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Repayment Target Date</label>
                <input
                  type="date"
                  value={repayTargetDate}
                  onChange={(e) => setRepayTargetDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-[11px] text-amber-300">
              Note: This request will automatically trigger an Approval Request for Direktur Utama in the Approval Center before disbursement.
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
                className="px-4 py-2 bg-amber-600 text-slate-950 text-xs font-bold rounded-lg hover:bg-amber-500"
              >
                Submit for Executive Approval
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
