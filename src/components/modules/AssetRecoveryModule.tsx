import React, { useState, useMemo } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, AssetRecovery } from '../../types/arms';
import {
  Car,
  Plus,
  ExternalLink,
  Edit2,
  Trash2,
  AlertCircle,
  DollarSign,
  UserCheck,
  Building2,
  CheckCircle2,
  Send,
  Search,
  Filter,
  Percent,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import { UnitExecutionModal } from './UnitExecutionModal';
import { TransferPartnerCommissionModal } from './TransferPartnerCommissionModal';

interface AssetRecoveryModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssetRecoveryModule: React.FC<AssetRecoveryModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedRecoveryForTransfer, setSelectedRecoveryForTransfer] = useState<AssetRecovery | null>(null);
  const [editTarget, setEditTarget] = useState<AssetRecovery | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AssetRecovery | null>(null);

  // Filters & search
  const [search, setSearch] = useState('');
  const [filterPersonnelType, setFilterPersonnelType] = useState<'ALL' | 'KARYAWAN' | 'MITRA_DC' | 'PENDING_TRANSFER'>('ALL');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  // Summary Metrics
  const metrics = useMemo(() => {
    const list = store.assetRecoveries || [];
    const totalUnits = list.length;
    const totalGrossFee = list.reduce((acc, r) => acc + (r.repossessionFee || 0), 0);
    const totalCompanyRevenue = list.reduce((acc, r) => acc + (r.companyFeeAmount || Math.round((r.repossessionFee || 0) * 0.2)), 0);
    
    const mitraList = list.filter((r) => r.personnelType === 'MITRA_DC' || r.partnerPayoutStatus === 'PENDING_TRANSFER' || r.partnerPayoutStatus === 'TRANSFERRED');
    const partnerTotalCommissions = mitraList.reduce((acc, r) => acc + (r.partnerCommissionAmount || Math.round((r.repossessionFee || 0) * 0.8)), 0);
    const partnerPendingTransfer = mitraList
      .filter((r) => r.partnerPayoutStatus === 'PENDING_TRANSFER')
      .reduce((acc, r) => acc + (r.partnerCommissionAmount || Math.round((r.repossessionFee || 0) * 0.8)), 0);
    const partnerTransferred = mitraList
      .filter((r) => r.partnerPayoutStatus === 'TRANSFERRED')
      .reduce((acc, r) => acc + (r.partnerCommissionAmount || Math.round((r.repossessionFee || 0) * 0.8)), 0);

    return {
      totalUnits,
      totalGrossFee,
      totalCompanyRevenue,
      partnerTotalCommissions,
      partnerPendingTransfer,
      partnerTransferred,
      pendingCount: mitraList.filter((r) => r.partnerPayoutStatus === 'PENDING_TRANSFER').length,
    };
  }, [store.assetRecoveries]);

  // Filtered List
  const filteredRecoveries = useMemo(() => {
    return (store.assetRecoveries || []).filter((r) => {
      if (filterPersonnelType === 'KARYAWAN' && r.personnelType === 'MITRA_DC') return false;
      if (filterPersonnelType === 'MITRA_DC' && r.personnelType !== 'MITRA_DC') return false;
      if (filterPersonnelType === 'PENDING_TRANSFER' && r.partnerPayoutStatus !== 'PENDING_TRANSFER') return false;

      if (search) {
        const query = search.toLowerCase();
        const parentCase = store.cases.find((c) => c.id === r.caseId || c.caseNo === r.caseNo);
        const match =
          r.recoveryNo.toLowerCase().includes(query) ||
          r.caseNo.toLowerCase().includes(query) ||
          r.assetDescription.toLowerCase().includes(query) ||
          r.personnelName.toLowerCase().includes(query) ||
          (parentCase?.debtorName || '').toLowerCase().includes(query) ||
          (parentCase?.clientName || '').toLowerCase().includes(query);
        if (!match) return false;
      }
      return true;
    });
  }, [store.assetRecoveries, store.cases, filterPersonnelType, search]);

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
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Car className="w-4 h-4 text-rose-400" />
            <h2 className="text-xl font-bold text-white">Asset Repossession, BAST & Commission Settlement</h2>
          </div>
          <p className="text-xs text-slate-400">
            Eksekusi Penarikan Unit Berdasarkan Tier, Auto-Close Kasus, Pendapatan Komisi Perusahaan (20%), dan Penyaluran Komisi Mitra DC (80%)
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowExecutionModal(true)}
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-lg shadow-rose-950/50 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Eksekusi Unit Baru (Tier & BAST)</span>
          </button>
        )}
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
              Total Unit Dieksekusi
            </span>
            <div className="text-2xl font-black text-white font-mono">{metrics.totalUnits} Unit</div>
            <span className="text-[11px] text-slate-400">Tersimpan di Gudang ARMS</span>
          </div>
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-rose-400">
            <Car className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">
              Total Gross Fee Klien
            </span>
            <div className="text-xl font-black text-white font-mono">
              Rp {metrics.totalGrossFee.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-slate-400">Total Tarif Tagihan Multifinance</span>
          </div>
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-indigo-400">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-indigo-900/60 bg-indigo-950/20 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-indigo-300 text-[10px] uppercase font-bold tracking-wider block">
                Pendapatan Fee Perusahaan
              </span>
              <span className="px-1.5 py-0.2 bg-indigo-900/80 text-indigo-200 text-[9px] font-mono rounded font-bold">
                20% Share
              </span>
            </div>
            <div className="text-xl font-black text-indigo-300 font-mono">
              Rp {metrics.totalCompanyRevenue.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-indigo-400/90">Masuk ke Kas Pendapatan ARMS</span>
          </div>
          <div className="p-2.5 bg-indigo-950 border border-indigo-800/80 rounded-xl text-indigo-400">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/60 bg-emerald-950/20 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-300 text-[10px] uppercase font-bold tracking-wider block">
                Komisi Mitra DC
              </span>
              {metrics.pendingCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-900 text-amber-200 text-[9px] font-mono rounded font-bold animate-pulse">
                  {metrics.pendingCount} Menunggu Transfer
                </span>
              )}
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono">
              Rp {metrics.partnerPendingTransfer.toLocaleString('id-ID')}
            </div>
            <span className="text-[11px] text-emerald-400/80">
              Disalurkan: Rp {metrics.partnerTransferred.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="p-2.5 bg-emerald-950 border border-emerald-800/80 rounded-xl text-emerald-400">
            <Send className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan No BAST, No Kasus, Debitur, Aset, atau Mitra DC..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
          />
        </div>

        <select
          value={filterPersonnelType}
          onChange={(e) => setFilterPersonnelType(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-2 text-xs text-slate-200 focus:outline-none"
        >
          <option value="ALL">👥 Semua Pelaksana (Karyawan & Mitra DC)</option>
          <option value="KARYAWAN">🏢 Karyawan Internal Saja</option>
          <option value="MITRA_DC">⚡ Mitra DC Eksternal (Freelance)</option>
          <option value="PENDING_TRANSFER">⏳ Menunggu Transfer Komisi Mitra DC</option>
        </select>
      </div>

      {/* Table of Repossession Records */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">No. BAST & Tanggal</th>
                <th className="py-2.5 px-3">Kasus, Debitur & Klien</th>
                <th className="py-2.5 px-3">Deskripsi Aset & Gudang</th>
                <th className="py-2.5 px-3">Pelaksana Lapangan</th>
                <th className="py-2.5 px-3 text-right">Fee Tagihan Klien</th>
                <th className="py-2.5 px-3 text-right">Fee Perusahaan (20%)</th>
                <th className="py-2.5 px-3 text-right">Komisi Mitra DC (80%)</th>
                <th className="py-2.5 px-3 text-center">Status Payout DC</th>
                <th className="py-2.5 px-3 text-center">Dokumen BAST</th>
                {canEdit && <th className="py-2.5 px-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredRecoveries.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="py-12 text-center text-slate-500 text-xs">
                    Belum ada data penarikan aset / BAST serah terima yang sesuai dengan kriteria filter.
                  </td>
                </tr>
              ) : (
                filteredRecoveries.map((r) => {
                  const parentCase = store.cases.find((c) => c.id === r.caseId || c.caseNo === r.caseNo);
                  const isMitra = r.personnelType === 'MITRA_DC';
                  const compFee = r.companyFeeAmount ?? Math.round((r.repossessionFee || 0) * 0.2);
                  const partnerFee = isMitra ? (r.partnerCommissionAmount ?? Math.round((r.repossessionFee || 0) * 0.8)) : 0;
                  const isPendingPayout = isMitra && r.partnerPayoutStatus === 'PENDING_TRANSFER';
                  const isTransferred = isMitra && r.partnerPayoutStatus === 'TRANSFERRED';

                  return (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-rose-300">
                        <div>{r.recoveryNo}</div>
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">{r.recoveryDate}</div>
                      </td>

                      <td className="py-2.5 px-3 space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{r.caseNo}</span>
                          <span className="px-1.5 py-0.2 bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] rounded font-mono">
                            CLOSED
                          </span>
                        </div>
                        <div className="text-slate-300 font-medium">{parentCase?.debtorName || 'Debitur'}</div>
                        <div className="text-[10px] text-slate-500">{parentCase?.clientName || 'Multifinance'}</div>
                      </td>

                      <td className="py-2.5 px-3 space-y-0.5">
                        <div className="font-semibold text-slate-100">{r.assetDescription}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1">
                          <span>{r.warehouseLocation}</span>
                          <span className="text-[10px] px-1.5 bg-slate-800 rounded text-slate-300 font-mono">
                            {r.physicalCondition}
                          </span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 space-y-1">
                        <div className="font-semibold text-white">{r.personnelName}</div>
                        {isMitra ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 rounded text-[10px] font-bold">
                            <UserCheck className="w-3 h-3 text-amber-400" />
                            Mitra DC Freelance
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-950/80 text-blue-300 border border-blue-800 rounded text-[10px] font-bold">
                            <Building2 className="w-3 h-3 text-blue-400" />
                            Karyawan Internal
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                        Rp {r.repossessionFee.toLocaleString('id-ID')}
                        {r.tierAppliedName && (
                          <div className="text-[9px] text-slate-400 font-normal truncate max-w-[140px] ml-auto">
                            {r.tierAppliedName}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-300">
                        Rp {compFee.toLocaleString('id-ID')}
                        <div className="text-[9px] text-indigo-400/80 font-normal">
                          {r.companyFeePercent || 20}% Perusahaan
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                        {isMitra ? (
                          <>
                            Rp {partnerFee.toLocaleString('id-ID')}
                            <div className="text-[9px] text-emerald-400/80 font-normal">
                              {100 - (r.companyFeePercent || 20)}% Hak Mitra
                            </div>
                          </>
                        ) : (
                          <span className="text-slate-600 font-normal text-xs">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {isMitra ? (
                          isTransferred ? (
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-[10px] font-semibold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Ditransfer
                              </span>
                              {r.partnerTransferRef && (
                                <div className="text-[9px] text-slate-400 font-mono">{r.partnerTransferRef}</div>
                              )}
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setSelectedRecoveryForTransfer(r)}
                              className="inline-flex items-center gap-1.5 px-2 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[10px] font-bold shadow-md shadow-amber-950/50 transition cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Transfer Komisi</span>
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500 font-medium">Internal</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {r.bastDriveUrl ? (
                          <a
                            href={r.bastDriveUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px] bg-slate-950 px-2 py-1 rounded border border-slate-800"
                          >
                            <ExternalLink className="w-3 h-3 text-indigo-400" />
                            <span>Lihat BAST</span>
                          </a>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {canEdit && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPendingPayout && (
                              <button
                                onClick={() => setSelectedRecoveryForTransfer(r)}
                                className="p-1.5 text-amber-400 hover:text-white hover:bg-amber-600 rounded transition"
                                title="Transfer Komisi Mitra DC"
                              >
                                <Send className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={() => setDeleteTarget(r)}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Hapus BAST"
                            >
                              <Trash2 className="w-3 h-3" />
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
      </div>

      {/* Execution Modal */}
      {showExecutionModal && (
        <UnitExecutionModal
          store={store}
          currentUser={currentUser}
          onClose={() => setShowExecutionModal(false)}
          onUpdateStore={onUpdateStore}
          onSuccess={(newRec) => {
            if (newRec.personnelType === 'MITRA_DC') {
              setSelectedRecoveryForTransfer(newRec);
            }
          }}
        />
      )}

      {/* Transfer Commission Modal */}
      {selectedRecoveryForTransfer && (
        <TransferPartnerCommissionModal
          recovery={selectedRecoveryForTransfer}
          store={store}
          currentUser={currentUser}
          onClose={() => setSelectedRecoveryForTransfer(null)}
          onUpdateStore={onUpdateStore}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-4 shadow-2xl space-y-2.5">
            <div className="flex items-center gap-2 text-rose-400">
              <div className="p-2 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Data BAST Penarikan</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
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

            <div className="flex justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecovery}
                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow cursor-pointer"
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
