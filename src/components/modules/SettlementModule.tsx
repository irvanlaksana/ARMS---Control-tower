import React, { useState, useMemo } from 'react';
import { Pagination, usePagination } from '../common/Pagination';
import { AmountInput } from '../common/AmountInput';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Settlement, ApprovalRequest } from '../../types/arms';
import { ShieldCheck, Plus, CheckCircle, ExternalLink, Edit2, Trash2, Search } from 'lucide-react';

interface SettlementModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const SettlementModule: React.FC<SettlementModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [clientId, setClientId] = useState(store.clients[0]?.id || '');
  const [totalDebtorCollectedAmount, setTotalDebtorCollectedAmount] = useState(100000000);
  const [agencyFeeDeduction, setAgencyFeeDeduction] = useState(15000000);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleCreateSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    const client = store.clients.find((c) => c.id === clientId);
    const netRemittedToClient = totalDebtorCollectedAmount - agencyFeeDeduction;

    if (isEditing && editId) {
      const existingSettlement = store.settlements.find(s => s.id === editId);
      if (!existingSettlement) return;

      const updatedSettlement = {
        ...existingSettlement,
        clientId,
        clientName: client?.companyName || existingSettlement.clientName,
        totalCollected: totalDebtorCollectedAmount,
        agencyFeeAmount: agencyFeeDeduction,
        netRemittedToClient,
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'UPDATE', 'Settlements', editId, `Updated Settlement ${existingSettlement.settlementNo}`);

      onUpdateStore({
        ...store,
        settlements: store.settlements.map(s => s.id === editId ? updatedSettlement : s),
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const settlementNo = `SET-2026-${Math.floor(100 + Math.random() * 900)}`;

      const newSettlement: Settlement = {
        id: `SET-${Date.now()}`,
        settlementNo,
        clientId,
        clientName: client?.companyName || 'Client',
        caseId: store.cases[0]?.id || 'CAS-001',
        caseNo: store.cases[0]?.caseNo || 'CAS-001',
        totalCollected: totalDebtorCollectedAmount,
        agencyFeePercent: 15,
        agencyFeeAmount: agencyFeeDeduction,
        talanganDeducted: 0,
        directExpensesDeducted: 0,
        netRemittedToClient,
        settlementDate: new Date().toISOString().split('T')[0],
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
      };

      const approvalReq: ApprovalRequest = {
        id: `APP-SET-${Date.now()}`,
        requestNo: `REQ-SET-${Math.floor(100 + Math.random() * 900)}`,
        module: 'SETTLEMENT',
        targetId: newSettlement.id,
        targetReference: settlementNo,
        title: `Remittance Settlement ${client?.companyName} Rp ${netRemittedToClient.toLocaleString('id-ID')}`,
        requestedBy: currentUser.name,
        amountOrValue: netRemittedToClient,
        description: `Settlement hasil penagihan debtor. Client Net Remittance: Rp ${netRemittedToClient.toLocaleString('id-ID')}. Agency Fee Cut: Rp ${agencyFeeDeduction.toLocaleString('id-ID')}`,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Settlements', newSettlement.id, `Created Settlement ${settlementNo} (Pending Executive Approval)`);

      onUpdateStore({
        ...store,
        settlements: [newSettlement, ...store.settlements],
        approvals: [approvalReq, ...store.approvals],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
    resetForm();
  };

  const handleEditClick = (s: Settlement) => {
    setClientId(s.clientId || store.clients[0]?.id || '');
    setTotalDebtorCollectedAmount(s.totalCollected);
    setAgencyFeeDeduction(s.agencyFeeAmount);
    setEditId(s.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this settlement record?')) {
      const existingSettlement = store.settlements.find(s => s.id === id);
      const audit = createAuditEntry(currentUser.username, currentUser.role, 'DELETE', 'Settlements', id, `Deleted Settlement ${existingSettlement?.settlementNo}`);
      onUpdateStore({
        ...store,
        settlements: store.settlements.filter(s => s.id !== id),
        auditLogs: [audit, ...store.auditLogs]
      });
    }
  };

  const resetForm = () => {
    setClientId(store.clients[0]?.id || '');
    setTotalDebtorCollectedAmount(100000000);
    setAgencyFeeDeduction(15000000);
    setEditId(null);
    setIsEditing(false);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SETTLED' | 'PENDING_APPROVAL' | 'SUBMITTED'>('ALL');

  const filteredSettlements = useMemo(() => {
    return (store.settlements || []).filter((s) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        s.settlementNo.toLowerCase().includes(term) ||
        s.clientName.toLowerCase().includes(term) ||
        s.settlementDate.toLowerCase().includes(term);

      if (!matchesSearch) return false;
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      return true;
    });
  }, [store.settlements, searchTerm, statusFilter]);

  const settlementPagination = usePagination<Settlement>(filteredSettlements, 10);

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Remittance Settlement to Multifinance Clients</h2>
          </div>
          <p className="text-xs text-slate-400">Formal Net Remittance Statements & Bank Transfer Clearing</p>
        </div>

        {canEdit && (
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Client Settlement</span>
          </button>
        )}
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg overflow-x-auto">
          {(['ALL', 'SETTLED', 'PENDING_APPROVAL', 'SUBMITTED'] as const).map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                settlementPagination.setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {st === 'ALL' && 'Semua Settlement'}
              {st === 'SETTLED' && 'Settled / Remitted'}
              {st === 'PENDING_APPROVAL' && 'Pending Approval'}
              {st === 'SUBMITTED' && 'Submitted'}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari no settlement, klien, tanggal..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              settlementPagination.setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Settlement No</th>
                <th className="py-2 px-3">Multifinance Client</th>
                <th className="py-2 px-3 text-right">Collected Amount</th>
                <th className="py-2 px-3 text-right">Agency Fee Cut</th>
                <th className="py-2 px-3 text-right font-bold text-emerald-400">Net Client Remittance</th>
                <th className="py-2 px-3">Settlement Date</th>
                <th className="py-2 px-3 text-center">Status</th>
                {canEdit && <th className="py-2 px-3 text-center">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {settlementPagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-slate-500 text-xs">
                    {store.settlements.length === 0
                      ? 'Belum ada data penyelesaian settlement remittance. Klik tombol + New Client Settlement untuk membuat settlement.'
                      : 'Tidak ada data settlement yang sesuai dengan filter atau pencarian.'}
                  </td>
                </tr>
              ) : (
                settlementPagination.pageItems.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{s.settlementNo}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{s.clientName}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-200">
                      Rp {s.totalCollected.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-rose-400">
                      - Rp {s.agencyFeeAmount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                      Rp {s.netRemittedToClient.toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{s.settlementDate}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-1 rounded-full border border-indigo-800 font-semibold">
                        {(s.status || '').replace(/_/g, ' ')}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEditClick(s)} className="text-slate-400 hover:text-white transition">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteClick(s.id)} className="text-slate-400 hover:text-rose-400 transition">
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
        <Pagination
          page={settlementPagination.page}
          totalPages={settlementPagination.totalPages}
          totalItems={settlementPagination.totalItems}
          pageSize={settlementPagination.pageSize}
          onPageChange={settlementPagination.setPage}
          onPageSizeChange={settlementPagination.setPageSize}
        />
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto">
          <form onSubmit={handleCreateSettlement} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-3.5 sm:p-4 space-y-2.5 shadow-2xl max-h-[85vh] overflow-y-auto my-auto">
            <h3 className="font-bold text-white text-base">{isEditing ? 'Edit Remittance Settlement' : 'Generate Remittance Settlement'}</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Select Multifinance Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              >
                {store.clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Total Gross Debtor Collected (Rp)</label>
              <AmountInput
                required
                value={totalDebtorCollectedAmount}
                onChange={setTotalDebtorCollectedAmount}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Agency Fee Deduction (Rp)</label>
              <AmountInput
                required
                value={agencyFeeDeduction}
                onChange={setAgencyFeeDeduction}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono"
              />
            </div>

            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs font-semibold text-emerald-400 flex justify-between">
              <span>Net Remittance to Client:</span>
              <span className="font-mono font-bold">
                Rp {(totalDebtorCollectedAmount - agencyFeeDeduction).toLocaleString('id-ID')}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-1.5">
              <button
                type="button"
                onClick={() => { setShowModal(false); resetForm(); }}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                {isEditing ? 'Save Changes' : 'Submit for Executive Approval'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
