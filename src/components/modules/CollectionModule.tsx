import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Collection } from '../../types/arms';
import { ShieldAlert, Plus } from 'lucide-react';

interface CollectionModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const CollectionModule: React.FC<CollectionModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [actionType, setActionType] = useState<'FIELD_VISIT' | 'SURAT_PERINGATAN' | 'MEDIATION' | 'SEIZURE_WARNING' | 'REPOSSESSION_EXECUTED'>('FIELD_VISIT');
  const [actionNotes, setActionNotes] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddCollectionAction = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);

    const newAction: Collection = {
      id: `COL-${Date.now()}`,
      collectionNo: `COL-2026-${Math.floor(100 + Math.random() * 900)}`,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      debtorName: c?.debtorName || 'Debtor',
      partnerId: c?.currentPartnerId || store.partners[0]?.id || 'PRT-001',
      partnerName: c?.currentPartnerName || 'Partner Agency',
      amountCollected: 15000000,
      collectionDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'TRANSFER',
      receiptNo: `REC-${Math.floor(100 + Math.random() * 900)}`,
      verificationStatus: 'VERIFIED',
      notes: actionNotes || 'Field collection and mediation recorded',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Collection', newAction.id, `Recorded Collection ${newAction.collectionNo} for ${c?.caseNo}`);

    onUpdateStore({
      ...store,
      collections: [newAction, ...store.collections],
      auditLogs: [audit, ...store.auditLogs],
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Collection Actions & Field Operations</h2>
          </div>
          <p className="text-xs text-slate-400">Field Visits, Warning Letters (SP1-3), Legal Mediation Logs</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record Field Action</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Partner Agency</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Action Notes</th>
                <th className="py-3 px-4">Recorded By</th>
                <th className="py-3 px-4 text-center">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.collections.map((act) => (
                <tr key={act.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-400">{act.collectionDate}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{act.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{act.debtorName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-300">{act.partnerName}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800 font-semibold">
                      {act.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-emerald-400 font-bold">
                    Rp {act.amountCollected.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{act.receiptNo}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                      {act.verificationStatus}
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
          <form onSubmit={handleAddCollectionAction} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Record Field Collection Action</h3>

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
              <label className="block text-xs text-slate-400 mb-1">Action Category</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                <option value="FIELD_VISIT">Field Visit / Kunjungan Lapangan</option>
                <option value="SURAT_PERINGATAN">Surat Peringatan (SP1/SP2/SP3)</option>
                <option value="MEDIATION">Mediasi Kantor / Sub-Branch</option>
                <option value="SEIZURE_WARNING">Somasi / Seizure Warning</option>
                <option value="REPOSSESSION_EXECUTED">Penarikan Aset / Repossession</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Action Notes & Report</label>
              <textarea
                rows={3}
                required
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder="Field report notes..."
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
                Save Action
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
