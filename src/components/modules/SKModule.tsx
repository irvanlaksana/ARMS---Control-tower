import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, SK, ApprovalRequest } from '../../types/arms';
import { FileText, Plus, ExternalLink } from 'lucide-react';

interface SKModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const SKModule: React.FC<SKModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [partnerId, setPartnerId] = useState(store.partners[0]?.id || '');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleCreateSK = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);
    const p = store.partners.find((pr) => pr.id === partnerId);
    const skNumber = `SK/ARMS-${c?.clientName.substring(0, 3).toUpperCase()}/2026/${Math.floor(100 + Math.random() * 900)}`;

    const newSK: SK = {
      id: `SK-${Date.now()}`,
      skNumber,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      debtorName: c?.debtorName || 'Debtor',
      partnerId,
      partnerName: p?.name || 'Partner',
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      status: 'PENDING_APPROVAL',
      driveDocumentUrl,
      createdAt: new Date().toISOString(),
    };

    const approvalReq: ApprovalRequest = {
      id: `APP-SK-${Date.now()}`,
      requestNo: `REQ-SK-${Math.floor(100 + Math.random() * 900)}`,
      module: 'SK',
      targetId: newSK.id,
      targetReference: skNumber,
      title: `Penerbitan Surat Kuasa ${skNumber} (${p?.name})`,
      requestedBy: currentUser.name,
      description: `Surat Kuasa eksekusi untuk kasus ${c?.caseNo} atas nama debtor ${c?.debtorName}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'SK', newSK.id, `Generated SK ${skNumber} (Pending Approval)`);

    onUpdateStore({
      ...store,
      sks: [newSK, ...store.sks],
      approvals: [approvalReq, ...store.approvals],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Surat Kuasa (SK) Legal Standing Management</h2>
          </div>
          <p className="text-xs text-slate-400">Formal Power of Attorney Tracking for Legal Field Execution</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Issue New Surat Kuasa</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">SK Number</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Authorized Field Partner</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Drive Document</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.sks.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{s.skNumber}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{s.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{s.debtorName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{s.partnerName}</td>
                  <td className="py-3.5 px-4 text-slate-400">{s.issuedDate}</td>
                  <td className="py-3.5 px-4 text-amber-400 font-medium">{s.expiryDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    {s.driveDocumentUrl ? (
                      <a
                        href={s.driveDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2.5 py-1 rounded-full border border-indigo-800 font-semibold">
                      {(s.status || '').replace(/_/g, ' ')}
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
          <form onSubmit={handleCreateSK} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Issue Surat Kuasa (SK)</h3>

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
              <label className="block text-xs text-slate-400 mb-1">Authorized Partner Agency</label>
              <select
                value={partnerId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                {store.partners.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Drive PDF Link</label>
              <input
                type="text"
                value={driveDocumentUrl}
                onChange={(e) => setDriveDocumentUrl(e.target.value)}
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
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
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
