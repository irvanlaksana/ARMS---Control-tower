import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, AssetRecovery } from '../../types/arms';
import { Car, Plus, ExternalLink } from 'lucide-react';

interface AssetRecoveryModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssetRecoveryModule: React.FC<AssetRecoveryModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [bastNo, setBastNo] = useState(`BAST-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [warehouseLocation, setWarehouseLocation] = useState('Gudang ARMS Karawang');
  const [bastDriveUrl, setBastDriveUrl] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);

    const newRec: AssetRecovery = {
      id: `REC-${Date.now()}`,
      recoveryNo: bastNo,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      assetId: store.assets[0]?.id || 'AST-001',
      assetDescription: c?.assetSummary || 'Vehicle Asset',
      personnelId: c?.currentPersonnelId || store.personnel?.[0]?.id || 'PRT-001',
      personnelName: c?.currentPersonnelName || 'Partner Agency',
      recoveryDate: new Date().toISOString().split('T')[0],
      warehouseLocation,
      physicalCondition: 'GOOD',
      repossessionFee: 15000000,
      status: 'STORED',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Asset_Recovery', newRec.id, `Recorded Asset Repossession BAST ${bastNo} for ${c?.caseNo}`);

    onUpdateStore({
      ...store,
      assetRecoveries: [newRec, ...store.assetRecoveries],
      auditLogs: [audit, ...store.auditLogs],
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Asset Repossession & BAST Handover Records</h2>
          </div>
          <p className="text-xs text-slate-400">Official BAST (Berita Acara Serah Terima) Repossession Reports</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record BAST Repossession</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">BAST No</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Asset Description</th>
                <th className="py-3 px-4">Recovery Date</th>
                <th className="py-3 px-4">Warehouse Location</th>
                <th className="py-3 px-4 text-center">BAST Document</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.assetRecoveries.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{r.recoveryNo}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{r.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{r.personnelName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{r.assetDescription}</td>
                  <td className="py-3.5 px-4 text-slate-400">{r.recoveryDate}</td>
                  <td className="py-3.5 px-4 text-slate-300">{r.warehouseLocation}</td>
                  <td className="py-3.5 px-4 text-center">
                    {r.bastDriveUrl ? (
                      <a
                        href={r.bastDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>View BAST</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                      {(r.status || '').replace(/_/g, ' ')}
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
          <form onSubmit={handleAddRecovery} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Record Asset Repossession (BAST)</h3>

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
              <label className="block text-xs text-slate-400 mb-1">BAST Number</label>
              <input
                type="text"
                required
                value={bastNo}
                onChange={(e) => setBastNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Warehouse Location</label>
              <input
                type="text"
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">BAST Google Drive Document Link</label>
              <input
                type="text"
                value={bastDriveUrl}
                onChange={(e) => setBastDriveUrl(e.target.value)}
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
                Save BAST Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
