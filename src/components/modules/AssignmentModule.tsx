import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Assignment } from '../../types/arms';
import { Users, Plus, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface AssignmentModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssignmentModule: React.FC<AssignmentModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showModal, setShowModal] = useState(false);
  // Active unfinished cases for new assignments
  const activeCases = store.cases.filter(
    (c) => !['CLOSED', 'SETTLED', 'FULL_PAID', 'CANCELLED'].includes(c.status)
  );

  const [caseId, setCaseId] = useState(activeCases[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [slaDays, setSlaDays] = useState(14);
  const [instructions, setInstructions] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);
    const p = (store.personnel || []).find((pr) => pr.id === personnelId);

    if (!c) return;

    const newAssignment: Assignment = {
      id: `ASN-${Date.now()}`,
      assignmentNo: `ASN-2026-${Math.floor(100 + Math.random() * 900)}`,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      debtorName: c?.debtorName || 'Debtor',
      personnelId,
      personnelName: p?.fullName || 'Partner',
      assignedDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + slaDays * 86400000).toISOString().split('T')[0],
      slaDays,
      instructions,
      status: 'IN_PROGRESS',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Assignments',
      newAssignment.id,
      `Assigned Case ${newAssignment.caseNo} to Partner ${newAssignment.personnelName}`
    );

    onUpdateStore({
      ...store,
      assignments: [newAssignment, ...store.assignments],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Partner & Field Assignments</h2>
          </div>
          <p className="text-xs text-slate-400">
            Control Tower Task Delegation to External DC Agencies & Field Repossession Partners
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Task Assignment</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Assignment No</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Field Partner</th>
                <th className="py-3 px-4">Assigned Date</th>
                <th className="py-3 px-4">SLA Target</th>
                <th className="py-3 px-4">Instructions</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.assignments.map((a) => {
                const parentCase = store.cases.find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
                const hasLawyerNotice = Boolean(parentCase?.lawyerStatus);
                return (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{a.assignmentNo}</td>
                    <td className="py-3.5 px-4 space-y-1">
                      <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{a.caseNo}</span>
                        {hasLawyerNotice && (
                          <span className="bg-purple-950 text-purple-300 text-[10px] px-1.5 py-0.2 rounded border border-purple-800 font-medium">
                            ⚖️ {parentCase?.lawyerStatus || 'Dikirim Surat Lawyer'}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{a.debtorName}</div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">{a.personnelName}</td>
                    <td className="py-3.5 px-4 text-slate-400">{a.assignedDate}</td>
                    <td className="py-3.5 px-4 text-amber-400 font-medium">
                      {a.targetDate} ({a.slaDays} hari SLA)
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">{a.instructions}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2.5 py-1 rounded-full border border-indigo-800 font-semibold">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateAssignment} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Buat Penugasan Baru Mitra Lapangan</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih Kasus Belum Selesai (Kasus Aktif) <span className="text-red-400">*</span>
              </label>
              {activeCases.length === 0 ? (
                <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-lg text-xs text-amber-300">
                  ⚠️ Semua kasus telah selesai/lunas. Tidak ada pekerjaan kasus aktif untuk penugasan baru.
                </div>
              ) : (
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {activeCases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNo} - {c.debtorName} ({c.clientName})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Field Partner / Agency</label>
              <select
                value={personnelId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                {(store.personnel || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target SLA Days</label>
              <input
                type="number"
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Field Instructions</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Specific operational instructions for the field team..."
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
                Confirm Assignment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
