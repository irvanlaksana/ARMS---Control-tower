import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, ApprovalRequest } from '../../types/arms';
import { CheckSquare, CheckCircle, XCircle, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';

interface ApprovalCenterModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ApprovalCenterModule: React.FC<ApprovalCenterModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterModule, setFilterModule] = useState<string>('ALL');

  const canApprove = currentUser.role === 'APPROVER_EXECUTIVE' || currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAction = (request: ApprovalRequest, status: 'APPROVED' | 'REJECTED') => {
    const updatedApprovals = store.approvals.map((app) => {
      if (app.id === request.id) {
        return {
          ...app,
          status,
          reviewedBy: currentUser.name,
          reviewedAt: new Date().toISOString(),
          rejectionReason: status === 'REJECTED' ? rejectReason : undefined,
        };
      }
      return app;
    });

    // Update target item status depending on module
    let updatedContracts = [...store.contracts];
    let updatedSKs = [...store.sks];
    let updatedExpenses = [...store.expenses];
    let updatedTalangan = [...store.danaTalangan];
    let updatedSettlements = [...store.settlements];

    if (request.module === 'CONTRACT') {
      updatedContracts = updatedContracts.map((c) =>
        c.id === request.targetId
          ? { ...c, status: status === 'APPROVED' ? 'ACTIVE' : 'REJECTED', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }
          : c
      );
    } else if (request.module === 'SK') {
      updatedSKs = updatedSKs.map((s) =>
        s.id === request.targetId
          ? { ...s, status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }
          : s
      );
    } else if (request.module === 'EXPENSE') {
      updatedExpenses = updatedExpenses.map((e) =>
        e.id === request.targetId
          ? { ...e, status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }
          : e
      );
    } else if (request.module === 'DANA_TALANGAN') {
      updatedTalangan = updatedTalangan.map((t) =>
        t.id === request.targetId
          ? { ...t, status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }
          : t
      );
    } else if (request.module === 'SETTLEMENT') {
      updatedSettlements = updatedSettlements.map((st) =>
        st.id === request.targetId
          ? { ...st, status: status === 'APPROVED' ? 'APPROVED' : 'REJECTED', approvedBy: currentUser.name, approvedAt: new Date().toISOString() }
          : st
      );
    }

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      status === 'APPROVED' ? 'APPROVE' : 'REJECT',
      'ApprovalCenter',
      request.id,
      `${status} request ${request.requestNo} (${request.module}) by ${currentUser.name}`
    );

    onUpdateStore({
      ...store,
      approvals: updatedApprovals,
      contracts: updatedContracts,
      sks: updatedSKs,
      expenses: updatedExpenses,
      danaTalangan: updatedTalangan,
      settlements: updatedSettlements,
      auditLogs: [audit, ...store.auditLogs],
    });

    setSelectedRequest(null);
    setRejectReason('');
  };

  const filteredApprovals = store.approvals.filter((app) => {
    if (filterModule !== 'ALL' && app.module !== filterModule) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Approval Center — Direktur Utama Control</h2>
          </div>
          <p className="text-xs text-slate-400">
            Formal Approval Hub for Contracts, Surat Kuasa, Expenses, Dana Talangan & Settlements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Modules</option>
            <option value="CONTRACT">Contract / MoU</option>
            <option value="SK">Surat Kuasa (SK)</option>
            <option value="EXPENSE">Expense Claim</option>
            <option value="DANA_TALANGAN">Dana Talangan</option>
            <option value="SETTLEMENT">Settlement Remittance</option>
          </select>
        </div>
      </div>

      {!canApprove && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-amber-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Notice: You are in Read-Only mode. Approval actions are reserved for Direktur Utama & Control Tower.</span>
        </div>
      )}

      {/* Approvals Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <h3 className="font-bold text-white text-xs uppercase tracking-wider">
            Approval Requests Queue ({filteredApprovals.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Request No</th>
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Title & Details</th>
                <th className="py-3 px-4">Requested By</th>
                <th className="py-3 px-4 text-right">Amount / Value</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredApprovals.map((app) => (
                <tr key={app.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-semibold text-amber-300">{app.requestNo}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                      {app.module}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{app.title}</div>
                    <div className="text-[11px] text-slate-400">{app.description}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{app.requestedBy}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    {app.amountOrValue ? `Rp ${app.amountOrValue.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {app.status === 'PENDING' && (
                      <span className="bg-amber-950/80 text-amber-300 text-[10px] px-2.5 py-1 rounded-full border border-amber-800 font-semibold inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Pending
                      </span>
                    )}
                    {app.status === 'APPROVED' && (
                      <span className="bg-emerald-950/80 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Approved
                      </span>
                    )}
                    {app.status === 'REJECTED' && (
                      <span className="bg-rose-950/80 text-rose-300 text-[10px] px-2.5 py-1 rounded-full border border-rose-800 font-semibold inline-flex items-center gap-1">
                        <XCircle className="w-3 h-3" />
                        Rejected
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {app.status === 'PENDING' && canApprove ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(app, 'APPROVED')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-md transition shadow"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedRequest(app)}
                          className="bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-[11px] font-semibold px-2.5 py-1.5 rounded-md transition"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">
                        {app.reviewedBy ? `By ${app.reviewedBy}` : 'Completed'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Reject Request {selectedRequest.requestNo}</h3>
            <p className="text-xs text-slate-400">Please state the formal reason for rejection:</p>

            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Budget ceiling exceeded / Requires additional supporting documentation"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-rose-500"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(selectedRequest, 'REJECTED')}
                className="px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-500"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
