import { Pagination, usePagination } from '../common/Pagination';
import React, { useState } from 'react';
import { AmountInput } from '../common/AmountInput';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Asset } from '../../types/arms';
import { Car, Plus, Edit2, Trash2, AlertCircle, Lock, Search } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';

interface AssetsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssetsModule: React.FC<AssetsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);

  const [clientFilter, setClientFilter] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');

  const [caseId, setCaseId] = useState(store.cases?.[0]?.id || '');
  const [brandModel, setBrandModel] = useState('');
  const [policeNoVIN, setPoliceNoVIN] = useState('');
  const [estimatedValue, setEstimatedValue] = useState(150000000);
  const [warehouseLocation, setWarehouseLocation] = useState('Gudang ARMS Central Karawang');
  const [physicalStatus, setPhysicalStatus] = useState<Asset['physicalStatus']>('RECOVERED_WAREHOUSE');
  const [storageFeePerDay, setStorageFeePerDay] = useState(75000);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';


  const handleOpenModal = (asset?: Asset) => {
    if (asset) {
      setIsEditing(true);
      setEditId(asset.id);
      setCaseId(asset.caseId);
      setBrandModel(asset.brandModel);
      setPoliceNoVIN(asset.policeNoVIN);
      setEstimatedValue(asset.estimatedMarketValue || 0);
      setWarehouseLocation(asset.warehouseLocation || 'Gudang ARMS Central Karawang');
      setPhysicalStatus(asset.physicalStatus || 'RECOVERED_WAREHOUSE');
      setStorageFeePerDay(asset.storageFeePerDay || 75000);
    } else {
      setIsEditing(false);
      setEditId(null);
      setCaseId(store.cases?.[0]?.id || '');
      setBrandModel('');
      setPoliceNoVIN('');
      setEstimatedValue(150000000);
      setWarehouseLocation('Gudang ARMS Central Karawang');
      setPhysicalStatus('RECOVERED_WAREHOUSE');
      setStorageFeePerDay(75000);
    }
    setShowModal(true);
  };

  const handleSaveAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const c = (store.cases || []).find((cs) => cs.id === caseId);

    if (isEditing && editId) {
      const existing = (store.assets || []).find((a) => a.id === editId);
      if (!existing) return;

      const updatedAsset: Asset = {
        ...existing,
        caseId,
        caseNo: c?.caseNo || existing.caseNo,
        debtorName: c?.debtorName || existing.debtorName,
        brandModel,
        policeNoVIN,
        estimatedMarketValue: estimatedValue,
        physicalStatus,
        warehouseLocation,
        storageFeePerDay,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Assets',
        updatedAsset.id,
        `Updated Asset ${brandModel} (${policeNoVIN})`
      );

      onUpdateStore({
        ...store,
        assets: (store.assets || []).map((a) => (a.id === editId ? updatedAsset : a)),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newAsset: Asset = {
        id: `AST-${Date.now()}`,
        assetCode: `AST-2026-${Math.floor(100 + Math.random() * 900)}`,
        caseId: c?.id || caseId || 'CAS-001',
        caseNo: c?.caseNo || 'CAS-001',
        debtorName: c?.debtorName || 'Debtor',
        category: 'COMMERCIAL_VEHICLE',
        brandModel,
        policeNoVIN,
        estimatedMarketValue: estimatedValue,
        physicalStatus,
        warehouseLocation,
        storageFeePerDay,
        recoveredDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Assets',
        newAsset.id,
        `Registered Asset ${brandModel} (${policeNoVIN})`
      );

      onUpdateStore({
        ...store,
        assets: [newAsset, ...(store.assets || [])],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
  };

  const confirmDeleteAsset = () => {
    if (!deleteTarget) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Assets',
      deleteTarget.id,
      `Deleted Asset ${deleteTarget.assetCode} (${deleteTarget.brandModel} - ${deleteTarget.policeNoVIN})`
    );

    onUpdateStore({
      ...store,
      assets: (store.assets || []).filter((a) => a.id !== deleteTarget.id),
      auditLogs: [audit, ...store.auditLogs],
    });

    setDeleteTarget(null);
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = (store.assets || []).filter((a) => {
    const term = searchTerm.toLowerCase().trim();
    const parentCase = store.cases.find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
    const matchesSearch =
      !term ||
      a.assetCode.toLowerCase().includes(term) ||
      a.brandModel.toLowerCase().includes(term) ||
      a.policeNoVIN.toLowerCase().includes(term) ||
      a.warehouseLocation.toLowerCase().includes(term) ||
      (parentCase?.caseNo && parentCase.caseNo.toLowerCase().includes(term)) ||
      (parentCase?.debtorName && parentCase.debtorName.toLowerCase().includes(term));

    if (!matchesSearch) return false;

    if (clientFilter === 'ALL') return true;
    const cType = parentCase?.clientType || 'MULTIFINANCE';
    return cType === clientFilter;
  });

  const assetPagination = usePagination<Asset>(filteredAssets, 10);

  return (
    <div className="space-y-6">
      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg overflow-x-auto">
          <button
            onClick={() => {
              setClientFilter('ALL');
              assetPagination.setPage(1);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              clientFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Aset
          </button>
          <button
            onClick={() => {
              setClientFilter('MULTIFINANCE');
              assetPagination.setPage(1);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              clientFilter === 'MULTIFINANCE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Klien Multifinance
          </button>
          <button
            onClick={() => {
              setClientFilter('PERORANGAN');
              assetPagination.setPage(1);
            }}
            className={`px-4 py-1.5 text-xs font-bold rounded-md transition whitespace-nowrap ${
              clientFilter === 'PERORANGAN'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Klien Perorangan
          </button>
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nopol/vin, model, debitur..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              assetPagination.setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Car className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Collateral Assets & Warehouse Inventory</h2>
          </div>
          <p className="text-xs text-slate-400">Recovered Vehicle & Heavy Equipment Inventory Tracking</p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
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
                {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-12 text-center text-slate-500 text-xs">
                    Belum ada data agunan / aset tersimpan di gudang inventory untuk filter ini.
                  </td>
                </tr>
              ) : (
                assetPagination.pageItems.map((a) => {
                  const parentCase = store.cases.find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
                  const isClosed = parentCase?.status === 'CLOSED';

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{a.assetCode}</td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-bold text-white">{a.caseNo}</div>
                        <div className="text-[11px] text-slate-400">
                          {isClosed ? (
                            <span className="text-slate-400 italic inline-flex items-center gap-1 font-normal text-xs">
                              <Lock className="w-3 h-3 text-slate-400" /> [Kasus Ditutup]
                            </span>
                          ) : (
                            a.debtorName
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-100">{a.brandModel}</td>
                      <td className="py-3.5 px-4 font-mono text-emerald-400">{a.policeNoVIN}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        Rp {(a.estimatedMarketValue || 0).toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{a.warehouseLocation || 'In Field'}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                          {(a.physicalStatus || '').replace(/_/g, ' ')}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenModal(a)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                              title="Edit Aset"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(a)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Hapus Aset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={assetPagination.page}
          totalPages={assetPagination.totalPages}
          totalItems={assetPagination.totalItems}
          pageSize={assetPagination.pageSize}
          onPageChange={assetPagination.setPage}
          onPageSizeChange={assetPagination.setPageSize}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveAsset} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">
              {isEditing ? 'Edit Agunan & Inventory Aset' : 'Register Recovered Asset'}
            </h3>

            <div className="relative z-[60]">
              <label className="block text-xs text-slate-400 mb-1">Pilih Berkas Kasus</label>
              {(store.cases || []).length === 0 ? (
                <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                  (Belum ada data kasus perkara terdaftar)
                </div>
              ) : (
                <SearchableSelect
                  value={caseId}
                  onChange={setCaseId}
                  options={(store.cases || []).filter(c => isEditing && c.id === caseId ? true : c.status !== 'CLOSED').map((c) => {
                    const isClosed = c.status === 'CLOSED';
                    const debtor = isClosed ? '[Kasus Ditutup]' : c.debtorName;
                    const cat = c.clientType === 'PERORANGAN' ? 'PERORANGAN' : 'MULTIFINANCE';
                    return {
                      value: c.id,
                      label: `[${cat}] ${c.caseNo} — ${debtor}`,
                      subLabel: `Klien: ${c.clientName}`
                    };
                  })}
                />
              )}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Estimasi Nilai Pasar (Rp)</label>
                <AmountInput
                  required
                  value={estimatedValue}
                  onChange={setEstimatedValue}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status Fisik Aset</label>
                <select
                  value={physicalStatus}
                  onChange={(e) => setPhysicalStatus(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="RECOVERED_WAREHOUSE">RECOVERED WAREHOUSE</option>
                  <option value="IN_TRANSIT">IN TRANSIT</option>
                  <option value="AUCTION_PENDING">AUCTION PENDING</option>
                  <option value="RELEASED">RELEASED</option>
                </select>
              </div>
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
                {isEditing ? 'Simpan Perubahan' : 'Save Asset'}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* Delete Asset Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Data Aset / Agunan</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Aset:</span>
                <span className="font-mono font-bold text-white">{deleteTarget.assetCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unit:</span>
                <span className="font-semibold text-white">{deleteTarget.brandModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No Pol / VIN:</span>
                <span className="font-mono text-emerald-400">{deleteTarget.policeNoVIN}</span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus data agunan ini dari daftar inventaris gudang? Penghapusan akan dicatat pada log audit sistem.
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
                onClick={confirmDeleteAsset}
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
