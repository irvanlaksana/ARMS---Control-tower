import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, ApprovalRequest } from '../../types/arms';
import { CheckSquare, CheckCircle, XCircle, Clock, Plus, Edit2, Trash2, X, Filter } from 'lucide-react';

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
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Create / Edit Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Form State
  const [reqModule, setReqModule] = useState<ApprovalRequest['module']>('CONTRACT');
  const [title, setTitle] = useState('');
  const [targetReference, setTargetReference] = useState('');
  const [amountOrValue, setAmountOrValue] = useState<number>(0);
  const [description, setDescription] = useState('');

  const canApprove = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';
  const canDelete = currentUser.role === 'SUPER_ADMIN_OPS';

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

  const handleOpenCreateModal = (item?: ApprovalRequest) => {
    if (item) {
      setIsEditing(true);
      setEditId(item.id);
      setReqModule(item.module);
      setTitle(item.title);
      setTargetReference(item.targetReference || '');
      setAmountOrValue(item.amountOrValue || 0);
      setDescription(item.description || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setReqModule('CONTRACT');
      setTitle('');
      setTargetReference('');
      setAmountOrValue(0);
      setDescription('');
    }
    setShowCreateModal(true);
  };

  const handleSaveApprovalRequest = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      alert('Judul permohonan approval wajib diisi.');
      return;
    }

    if (isEditing && editId) {
      const existing = store.approvals.find((a) => a.id === editId);
      if (!existing) return;

      const updated = {
        ...existing,
        module: reqModule,
        title,
        targetReference: targetReference || existing.targetReference,
        amountOrValue: Number(amountOrValue) || 0,
        description,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'ApprovalCenter',
        editId,
        `Updated Approval Request ${existing.requestNo} (${title})`
      );

      onUpdateStore({
        ...store,
        approvals: store.approvals.map((a) => (a.id === editId ? updated : a)),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const reqNo = `REQ-${reqModule.substring(0, 3)}-${Date.now().toString().slice(-4)}`;
      const newReq: ApprovalRequest = {
        id: `APP-${Date.now()}`,
        requestNo: reqNo,
        module: reqModule,
        targetId: `TGT-${Date.now()}`,
        targetReference: targetReference || reqNo,
        title,
        requestedBy: currentUser.name,
        amountOrValue: Number(amountOrValue) || 0,
        description,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'ApprovalCenter',
        newReq.id,
        `Created Approval Request ${reqNo} (${title})`
      );

      onUpdateStore({
        ...store,
        approvals: [newReq, ...store.approvals],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowCreateModal(false);
  };

  const handleDeleteRequest = (item: ApprovalRequest) => {
    if (!window.confirm(`Hapus approval request ${item.requestNo} (${item.title})?`)) {
      return;
    }

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'ApprovalCenter',
      item.id,
      `Deleted Approval Request ${item.requestNo}`
    );

    onUpdateStore({
      ...store,
      approvals: store.approvals.filter((a) => a.id !== item.id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  // Prepare WhatsApp template message and open WhatsApp Web with prefilled text
  const openWhatsAppTemplate = (request: ApprovalRequest) => {
    const lines = [] as string[];
    lines.push(`Permohonan Approval: ${request.requestNo}`);
    lines.push(`Judul: ${request.title}`);
    if (request.amountOrValue) lines.push(`Nominal: Rp ${Number(request.amountOrValue).toLocaleString('id-ID')}`);
    if (request.description) lines.push(`Detail: ${request.description}`);
    if (request.targetReference) lines.push(`Referensi: ${request.targetReference}`);
    lines.push('Mohon persetujuan. Terima kasih.');

    const text = lines.join('\n');
    const webUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const mobileUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    // Prefer opening web WhatsApp for desktop; fallback to mobile URL
    try {
      window.open(webUrl, '_blank');
    } catch (err) {
      window.open(mobileUrl, '_blank');
    }
  };

  const filteredApprovals = store.approvals.filter((app) => {
    if (filterModule !== 'ALL' && app.module !== filterModule) return false;
    if (filterStatus !== 'ALL' && app.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className="w-5 h-5 text-amber-400" />
            <h2 className="text-xl font-bold text-white">Approval Center (Konfirmasi Manual)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Admin menginput status Approval atau Reject secara manual setelah mendapat instruksi dari Direktur Utama.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canApprove && (
            <button
              onClick={() => handleOpenCreateModal()}
              className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold px-3 py-2 rounded-lg flex items-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Permohonan Approval</span>
            </button>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="PENDING">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>

          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">Semua Modul</option>
            <option value="CONTRACT">Contract / MoU</option>
            <option value="SK">Surat Kuasa (SK)</option>
            <option value="EXPENSE">Expense Claim</option>
            <option value="DANA_TALANGAN">Dana Talangan</option>
            <option value="SETTLEMENT">Settlement Remittance</option>
          </select>
        </div>
      </div>

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
              {filteredApprovals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-500 text-xs">
                    Tidak ada antrean approval request yang sesuai filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredApprovals.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-semibold text-amber-300">{app.requestNo}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                        {app.module}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5 max-w-[280px]">
                      <div className="font-bold text-white">{app.title}</div>
                      <div className="text-[11px] text-slate-400 leading-relaxed">{app.description}</div>
                      {app.targetReference && (
                        <div className="text-[10px] text-slate-500 font-mono">Ref: {app.targetReference}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">{app.requestedBy}</td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
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
                      <div className="flex items-center justify-end gap-1.5">
                        {app.status === 'PENDING' && canApprove && (
                          <>
                            <button
                              onClick={() => handleAction(app, 'APPROVED')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition shadow"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setSelectedRequest(app)}
                              className="bg-rose-950 text-rose-300 hover:bg-rose-900 border border-rose-800 text-[11px] font-semibold px-2 py-1 rounded-md transition"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {/* WhatsApp template quick action */}
                        <button
                          onClick={() => openWhatsAppTemplate(app)}
                          title="Kirim Template WhatsApp"
                          className="bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-semibold px-2.5 py-1 rounded-md transition shadow"
                        >
                          WA
                        </button>
                        {canDelete && (
                          <>
                            <button
                              onClick={() => handleOpenCreateModal(app)}
                              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
                              title="Edit Request"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRequest(app)}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Hapus Request"
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
      </div>

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveApprovalRequest}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {isEditing ? 'Edit Permohonan Approval' : 'Buat Permohonan Approval Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Modul Terkait</label>
              <select
                value={reqModule}
                onChange={(e) => setReqModule(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="CONTRACT">Contract / MoU</option>
                <option value="SK">Surat Kuasa (SK)</option>
                <option value="EXPENSE">Expense Operasional</option>
                <option value="DANA_TALANGAN">Dana Talangan</option>
                <option value="SETTLEMENT">Settlement Remittance</option>
                <option value="FINANCIAL_ADJUSTMENT">Financial Adjustment</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Judul Permohonan</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Persetujuan Pencairan Dana Talangan Unit Avanza"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Nominal / Nilai (Rp)</label>
              <input
                type="number"
                min="0"
                value={amountOrValue}
                onChange={(e) => setAmountOrValue(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Keterangan & Rincian</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Jelaskan dasar permohonan approval..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold rounded-lg"
              >
                {isEditing ? 'Simpan Perubahan' : 'Submit Approval Request'}
              </button>
            </div>
          </form>
        </div>
      )}

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
