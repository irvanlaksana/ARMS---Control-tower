import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Asset } from '../../types/arms';
import { Car, Plus } from 'lucide-react';

interface AssetsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssetsModule: React.FC<AssetsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [brandModel, setBrandModel] = useState('');
  const [policeNoVIN, setPoliceNoVIN] = useState('');
  const [estimatedValue, setEstimatedValue] = useState(150000000);
  const [warehouseLocation, setWarehouseLocation] = useState('Gudang ARMS Central Karawang');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);

    const newAsset: Asset = {
      id: `AST-${Date.now()}`,
      assetCode: `AST-2026-${Math.floor(100 + Math.random() * 900)}`,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      debtorName: c?.debtorName || 'Debtor',
      category: 'COMMERCIAL_VEHICLE',
      brandModel,
      policeNoVIN,
      estimatedMarketValue: estimatedValue,
      physicalStatus: 'RECOVERED_WAREHOUSE',
      warehouseLocation,
      storageFeePerDay: 75000,
      recoveredDate: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Assets', newAsset.id, `Registered Asset ${brandModel} (${policeNoVIN})`);

    onUpdateStore({
      ...store,
      assets: [newAsset, ...store.assets],
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
            <h2 className="text-xl font-bold text-white">Collateral Assets & Warehouse Inventory</h2>
          </div>
          <p className="text-xs text-slate-400">Recovered Vehicle & Heavy Equipment Inventory Tracking</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Register Asset</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Asset Code</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Brand / Model</th>
                <th className="py-3 px-4">Police No / VIN</th>
                <th className="py-3 px-4 text-right">Est. Market Value</th>
                <th className="py-3 px-4">Warehouse Location</th>
                <th className="py-3 px-4 text-center">Physical Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.assets.map((a) => (
                <tr key={a.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{a.assetCode}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{a.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{a.debtorName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-100">{a.brandModel}</td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">{a.policeNoVIN}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    Rp {a.estimatedMarketValue.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{a.warehouseLocation || 'In Field'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                      {(a.physicalStatus || '').replace(/_/g, ' ')}
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
          <form onSubmit={handleAddAsset} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Register Recovered Asset</h3>

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
              <label className="block text-xs text-slate-400 mb-1">Brand & Model</label>
              <input
                type="text"
                required
                value={brandModel}
                onChange={(e) => setBrandModel(e.target.value)}
                placeholder="e.g. Mitsubishi Fuso Canter HD 2021"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Police No / VIN</label>
              <input
                type="text"
                required
                value={policeNoVIN}
                onChange={(e) => setPoliceNoVIN(e.target.value)}
                placeholder="e.g. B 9412 UXR"
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
                Save Asset
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
