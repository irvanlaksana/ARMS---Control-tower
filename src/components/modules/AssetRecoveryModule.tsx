import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, AssetRecovery } from '../../types/arms';
import { Car, Plus, ExternalLink, Edit2, Trash2, AlertCircle } from 'lucide-react';

interface AssetRecoveryModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssetRecoveryModule: React.FC<AssetRecoveryModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecovery | null>(null);

  const [caseId, setCaseId] = useState(store.cases?.[0]?.id || '');
  const [bastNo, setBastNo] = useState(`BAST-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [warehouseLocation, setWarehouseLocation] = useState('Gudang ARMS Karawang');
  const [bastDriveUrl, setBastDriveUrl] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState<'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED'>('GOOD');
  const [status, setStatus] = useState<AssetRecovery['status']>('STORED');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const handleOpenModal = (rec?: AssetRecovery) => {
    if (rec) {
      setIsEditing(true);
      setEditId(rec.id);
      setCaseId(rec.caseId);
      setBastNo(rec.recoveryNo);
      setWarehouseLocation(rec.warehouseLocation || 'Gudang ARMS Karawang');
      setBastDriveUrl(rec.bastDriveUrl || '');
      setPhysicalCondition(rec.physicalCondition || 'GOOD');
      setStatus(rec.status || 'STORED');
    } else {
      setIsEditing(false);
      setEditId(null);
      setCaseId(store.cases?.[0]?.id || '');
      setBastNo(`BAST-2026-${Math.floor(100 + Math.random() * 900)}`);
      setWarehouseLocation('Gudang ARMS Karawang');
      setBastDriveUrl('');
      setPhysicalCondition('GOOD');
      setStatus('STORED');
    }
    setShowModal(true);
  };

  const handleSaveRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const c = (store.cases || []).find((cs) => cs.id === caseId);

    if (isEditing && editId) {
      const existing = (store.assetRecoveries || []).find((r) => r.id === editId);
      if (!existing) return;

      const updatedRec: AssetRecovery = {
        ...existing,
        caseId,
        caseNo: c?.caseNo || existing.caseNo,
        recoveryNo: bastNo,
        warehouseLocation,
        bastDriveUrl,
        physicalCondition,
        status,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Asset_Recovery',
        updatedRec.id,
        `Updated Asset Repossession BAST ${bastNo} for ${updatedRec.caseNo}`
      );

      onUpdateStore({
        ...store,
        assetRecoveries: (store.assetRecoveries || []).map((r) => (r.id === editId ? updatedRec : r)),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newRec: AssetRecovery = {
        id: `REC-${Date.now()}`,
        recoveryNo: bastNo,
        caseId: c?.id || caseId || 'CAS-001',
        caseNo: c?.caseNo || 'CAS-001',
        assetId: store.assets?.[0]?.id || 'AST-001',
        assetDescription: c?.assetSummary || 'Vehicle Asset',
        personnelId: c?.currentPersonnelId || store.personnel?.[0]?.id || 'PER-001',
        personnelName: c?.currentPersonnelName || store.personnel?.[0]?.fullName || 'Partner Agency',
        recoveryDate: new Date().toISOString().split('T')[0],
        warehouseLocation,
        physicalCondition,
        repossessionFee: 15000000,
        status,
        bastDriveUrl,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Asset_Recovery',
        newRec.id,
        `Recorded Asset Repossession BAST ${bastNo} for ${c?.caseNo || newRec.caseNo}`
      );

      onUpdateStore({
        ...store,
        assetRecoveries: [newRec, ...(store.assetRecoveries || [])],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
  };

  const confirmDeleteRecovery = () => {
    if (!deleteTarget) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Asset_Recovery',
      deleteTarget.id,
      `Deleted Asset Repossession BAST ${deleteTarget.recoveryNo} (${deleteTarget.caseNo})`
    );

    onUpdateStore({
      ...store,
      assetRecoveries: (store.assetRecoveries || []).filter((r) => r.id !== deleteTarget.id),
      auditLogs: [audit, ...store.auditLogs],
    });

    setDeleteTarget(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Asset Repossession & BAST Handover Records</h2>
          </div>
          <p className="text-xs text-slate-400">Official BAST (Berita Acara Serah Terima) Repossession Reports</p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
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
                {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(store.assetRecoveries || []).length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-12 text-center text-slate-500 text-xs">
                    Belum ada data penarikan aset / BAST serah terima.
                  </td>
                </tr>
              ) : (
                (store.assetRecoveries || []).map((r) => (
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
                    {canEdit && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenModal(r)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                            title="Edit BAST"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(r)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="Hapus BAST"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveRecovery} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">
              {isEditing ? 'Edit Asset Repossession (BAST)' : 'Record Asset Repossession (BAST)'}
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Pilih Berkas Kasus</label>
              {(store.cases || []).length === 0 ? (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                  (Belum ada data kasus perkara terdaftar)
                </div>
              ) : (
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {(store.cases || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNo} - {c.debtorName} ({c.clientName})
                    </option>
                  ))}
                </select>
              )}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kondisi Fisik</label>
                <select
                  value={physicalCondition}
                  onChange={(e) => setPhysicalCondition(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="EXCELLENT">EXCELLENT (Sangat Baik)</option>
                  <option value="GOOD">GOOD (Baik)</option>
                  <option value="FAIR">FAIR (Cukup)</option>
                  <option value="DAMAGED">DAMAGED (Rusak)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status Penyimpanan</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="STORED">STORED (Gudang)</option>
                  <option value="AUCTION_PROCESS">AUCTION PROCESS</option>
                  <option value="RETURNED_TO_CLIENT">RETURNED TO CLIENT</option>
                  <option value="REDEEMED_BY_DEBTOR">REDEEMED BY DEBTOR</option>
                </select>
              </div>
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
                {isEditing ? 'Simpan Perubahan' : 'Save BAST Record'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Delete BAST Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Data BAST Penarikan</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">No BAST:</span>
                <span className="font-mono font-bold text-white">{deleteTarget.recoveryNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kasus:</span>
                <span className="font-semibold text-white">{deleteTarget.caseNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Aset:</span>
                <span className="text-indigo-400">{deleteTarget.assetDescription}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus data BAST penarikan aset ini? Penghapusan akan dicatat pada log audit sistem.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecovery}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
