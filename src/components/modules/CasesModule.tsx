import React, { useState } from 'react';
import { ARMSStore, createAuditEntry, calculateAgencyFee } from '../../services/armsDataService';
import { User, Case, FeeType } from '../../types/arms';
import { Briefcase, Plus, CheckCircle, Search, Filter, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';

interface CasesModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const CasesModule: React.FC<CasesModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [clientId, setClientId] = useState(store.clients[0]?.id || '');
  const [customerId, setCustomerId] = useState(store.customers[0]?.id || '');
  const [contractNo, setContractNo] = useState('ADR-CTR-2026-99');
  const [serviceId, setServiceId] = useState(store.services[0]?.id || '');
  const [principalDebtOS, setPrincipalDebtOS] = useState(150000000);
  const [overdueDays, setOverdueDays] = useState(120);
  const [assetSummary, setAssetSummary] = useState('Honda HR-V Turbo 2022 (B 1234 XYZ)');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    const client = store.clients.find((c) => c.id === clientId);
    const customer = store.customers.find((cu) => cu.id === customerId);
    const service = store.services.find((s) => s.id === serviceId);
    const partner = (store.personnel || []).find((p) => p.id === personnelId);

    // Get fee configuration for snapshot
    const feeConfig = store.fees.find((f) => f.clientId === clientId && f.serviceId === serviceId);
    const feeTypeSnapshot: FeeType = feeConfig ? feeConfig.feeType : (service?.defaultFeeType || 'PERCENT');
    const feePercentSnapshot = feeConfig?.percentageValue || 15;
    const feeFixedSnapshot = feeConfig?.fixedAmount || 2500000;

    const newCase: Case = {
      id: `CAS-${Date.now()}`,
      caseNo: `CAS-2026-${client?.clientCode || 'CLI'}-${Math.floor(100 + Math.random() * 900)}`,
      clientId,
      clientName: client?.companyName || 'Multifinance Client',
      contractId: store.contracts[0]?.id || 'CTR-001',
      customerId,
      debtorName: customer?.fullName || 'Debtor Name',
      debtorNik: customer?.nikKtp || '3171000000000000',
      multifinanceContractNo: contractNo,
      serviceId,
      serviceName: service?.name || 'Recovery Service',
      principalDebtOS,
      overdueDays,
      dpdBucket: overdueDays > 180 ? '180+' : overdueDays > 90 ? '90-180' : '60-90',
      assetSummary,
      feeTypeSnapshot,
      feePercentSnapshot,
      feeFixedSnapshot,
      status: 'ASSIGNED',
      currentPersonnelId: personnelId,
      currentPersonnelName: partner?.fullName,
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Cases',
      newCase.id,
      `Created Case ${newCase.caseNo} for ${newCase.debtorName} with Fee Snapshot (${feeTypeSnapshot})`
    );

    onUpdateStore({
      ...store,
      cases: [newCase, ...store.cases],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowAddModal(false);
  };

  const filteredCases = store.cases.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    if (
      search &&
      !c.caseNo.toLowerCase().includes(search.toLowerCase()) &&
      !c.debtorName.toLowerCase().includes(search.toLowerCase()) &&
      !c.clientName.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Cases & Debtors Portfolio (Piutang)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Multifinance Recovery Cases with Fee Snapshots & Operational Flow
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Recovery Case</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Case No, Debtor Name, or Client..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="NEW">NEW</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="FIELD_ACTION">FIELD ACTION</option>
          <option value="IN_MEDIATION">IN MEDIATION</option>
          <option value="UNIT_RECOVERED">UNIT RECOVERED</option>
          <option value="FULL_PAID">FULL PAID</option>
          <option value="SETTLED">SETTLED</option>
        </select>
      </div>

      {/* Cases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Case No</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Debtor & NIK</th>
                <th className="py-3 px-4">Asset Info</th>
                <th className="py-3 px-4 text-right">OS Principal Debt</th>
                <th className="py-3 px-4">Fee Snapshot</th>
                <th className="py-3 px-4">Assigned Partner</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCases.map((c) => {
                const isCompleted = ['CLOSED', 'SETTLED', 'FULL_PAID', 'UNIT_RECOVERED'].includes(c.status);
                return (
                <tr key={c.id} className={`transition ${isCompleted ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-l-2 border-emerald-500' : 'hover:bg-slate-800/40'}`}>
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                    <div className="flex items-center gap-2">
                      {c.caseNo}
                      {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-white">{c.clientName}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-slate-100">{c.debtorName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">NIK: {c.debtorNik}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[180px] truncate">{c.assetSummary}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    Rp {c.principalDebtOS.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                      {c.feeTypeSnapshot} ({c.feePercentSnapshot}% / Rp {c.feeFixedSnapshot?.toLocaleString('id-ID') || 0})
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{c.currentPersonnelName || 'Unassigned'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                      isCompleted 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800' 
                        : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                    }`}>
                      {(c.status || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateCase} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Register New Recovery Case</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Multifinance Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.clients.map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.companyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Debtor Profile</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.customers.map((cu) => (
                    <option key={cu.id} value={cu.id}>
                      {cu.fullName} ({cu.nikKtp})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Multifinance Contract No</label>
                <input
                  type="text"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Recovery Service</label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">OS Principal Debt (Rp)</label>
                <input
                  type="number"
                  value={principalDebtOS}
                  onChange={(e) => setPrincipalDebtOS(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Overdue Days (DPD)</label>
                <input
                  type="number"
                  value={overdueDays}
                  onChange={(e) => setOverdueDays(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Asset Collateral Description</label>
              <input
                type="text"
                value={assetSummary}
                onChange={(e) => setAssetSummary(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Assign Initial Field Partner</label>
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

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                Create Case & Snapshot Fee
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
