import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Case, FeeType, Client, ClientType } from '../../types/arms';
import { Briefcase, Plus, CheckCircle, Search, Building2, User as UserIcon, UserCheck, ShieldCheck } from 'lucide-react';

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
  const [filterClientType, setFilterClientType] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [clientCategory, setClientCategory] = useState<ClientType>('MULTIFINANCE');
  
  // Multifinance Client Selection
  const multifinanceClients = store.clients.filter((c) => c.industry !== 'PERORANGAN' && c.clientType !== 'PERORANGAN');
  const [clientId, setClientId] = useState(multifinanceClients[0]?.id || store.clients[0]?.id || '');
  
  // Perorangan Client Selection
  const peroranganClients = store.clients.filter((c) => c.industry === 'PERORANGAN' || c.clientType === 'PERORANGAN');
  const [peroranganClientId, setPeroranganClientId] = useState(peroranganClients[0]?.id || '');

  // Other Case Fields
  const [customerId, setCustomerId] = useState(store.customers[0]?.id || '');
  const [contractNo, setContractNo] = useState('ADR-CTR-2026-99');
  const [serviceId, setServiceId] = useState(store.services[0]?.id || '');
  const [principalDebtOS, setPrincipalDebtOS] = useState(150000000);
  const [overdueDays, setOverdueDays] = useState(120);
  const [assetSummary, setAssetSummary] = useState('Honda HR-V Turbo 2022 (B 1234 XYZ)');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [gDriveFolderUrl, setGDriveFolderUrl] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  // Filter products based on client category:
  // For PERORANGAN: ONLY PENAGIHAN_PERORANGAN is available
  // For MULTIFINANCE: only corporate/institutional products are available
  const availableServices = clientCategory === 'PERORANGAN'
    ? store.services.filter(s => s.category === 'PENAGIHAN_PERORANGAN' || s.serviceCode.includes('PERORANGAN') || s.name.toLowerCase().includes('perorangan'))
    : store.services.filter(s => s.category !== 'PENAGIHAN_PERORANGAN' && !s.serviceCode.includes('PERORANGAN') && !s.name.toLowerCase().includes('perorangan'));

  const selectedMultifinance = store.clients.find((c) => c.id === clientId);
  const selectedPerorangan = store.clients.find((c) => c.id === peroranganClientId) || peroranganClients[0];
  const activeClientName = clientCategory === 'MULTIFINANCE' 
    ? (selectedMultifinance?.companyName || 'Multifinance Client')
    : (selectedPerorangan?.companyName || 'Klien Perorangan');

  const selectedCustomer = store.customers.find((cu) => cu.id === customerId);
  const computedFolderName = `${selectedCustomer?.fullName || 'Debitur'} - [${clientCategory === 'PERORANGAN' ? 'Perorangan' : 'Multifinance'}: ${activeClientName}] - ${assetSummary}`;

  const handleSwitchCategory = (cat: ClientType) => {
    setClientCategory(cat);
    if (cat === 'PERORANGAN') {
      setContractNo('SPH-PER/2026/01');
      const peroranganSrv = store.services.find(s => s.category === 'PENAGIHAN_PERORANGAN' || s.serviceCode.includes('PERORANGAN') || s.name.toLowerCase().includes('perorangan'));
      if (peroranganSrv) {
        setServiceId(peroranganSrv.id);
      }
    } else {
      setContractNo('ADR-CTR-2026-99');
      const multiSrv = store.services.find(s => s.category !== 'PENAGIHAN_PERORANGAN' && !s.serviceCode.includes('PERORANGAN') && !s.name.toLowerCase().includes('perorangan'));
      if (multiSrv) {
        setServiceId(multiSrv.id);
      }
    }
  };

  const handleOpenAddModal = () => {
    // Sync default IDs
    if (multifinanceClients.length > 0 && !multifinanceClients.some(c => c.id === clientId)) {
      setClientId(multifinanceClients[0].id);
    }
    if (peroranganClients.length > 0 && !peroranganClients.some(c => c.id === peroranganClientId)) {
      setPeroranganClientId(peroranganClients[0].id);
    }
    if (clientCategory === 'PERORANGAN') {
      const peroranganSrv = store.services.find(s => s.category === 'PENAGIHAN_PERORANGAN' || s.serviceCode.includes('PERORANGAN') || s.name.toLowerCase().includes('perorangan'));
      if (peroranganSrv) setServiceId(peroranganSrv.id);
    } else {
      const multiSrv = store.services.find(s => s.category !== 'PENAGIHAN_PERORANGAN' && !s.serviceCode.includes('PERORANGAN') && !s.name.toLowerCase().includes('perorangan'));
      if (multiSrv) setServiceId(multiSrv.id);
    }
    setShowAddModal(true);
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    let actualClientId = clientId;
    let actualClientName = selectedMultifinance?.companyName || 'Multifinance Client';
    let clientCodeForCase = selectedMultifinance?.clientCode || 'CLI';

    if (clientCategory === 'PERORANGAN') {
      const peroranganClient = store.clients.find((c) => c.id === peroranganClientId) || peroranganClients[0];
      actualClientId = peroranganClient?.id || clientId;
      actualClientName = peroranganClient?.companyName || 'Klien Perorangan';
      clientCodeForCase = peroranganClient?.clientCode || 'PER';
    }

    // Update active cases count for selected client
    const updatedClients = store.clients.map((c) => 
      c.id === actualClientId ? { ...c, activeCasesCount: (c.activeCasesCount || 0) + 1 } : c
    );

    const customer = store.customers.find((cu) => cu.id === customerId);
    const service = store.services.find((s) => s.id === serviceId);
    const partner = (store.personnel || []).find((p) => p.id === personnelId);

    // Get fee configuration for snapshot
    const feeConfig = store.fees.find((f) => f.clientId === actualClientId && f.serviceId === serviceId);
    const feeTypeSnapshot: FeeType = feeConfig ? feeConfig.feeType : (service?.defaultFeeType || 'PERCENT');
    const feePercentSnapshot = feeConfig?.percentageValue || 15;
    const feeFixedSnapshot = feeConfig?.fixedAmount || 2500000;

    const newCase: Case = {
      id: `CAS-${Date.now()}`,
      caseNo: `CAS-2026-${clientCodeForCase}-${Math.floor(100 + Math.random() * 900)}`,
      clientId: actualClientId,
      clientName: actualClientName,
      clientType: clientCategory,
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
      gDriveFolderName: computedFolderName,
      gDriveFolderUrl,
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
      `Created ${clientCategory === 'PERORANGAN' ? 'Individual (Perorangan)' : 'Multifinance'} Case ${newCase.caseNo} for ${newCase.debtorName} [Client: ${actualClientName}]`
    );

    onUpdateStore({
      ...store,
      clients: updatedClients,
      cases: [newCase, ...store.cases],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowAddModal(false);
  };

  const filteredCases = store.cases.filter((c) => {
    if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
    
    // Filter Client Type
    if (filterClientType === 'PERORANGAN') {
      const clientObj = store.clients.find(cli => cli.id === c.clientId);
      const isPerorangan = c.clientType === 'PERORANGAN' || clientObj?.industry === 'PERORANGAN' || clientObj?.clientType === 'PERORANGAN';
      if (!isPerorangan) return false;
    } else if (filterClientType === 'MULTIFINANCE') {
      const clientObj = store.clients.find(cli => cli.id === c.clientId);
      const isPerorangan = c.clientType === 'PERORANGAN' || clientObj?.industry === 'PERORANGAN' || clientObj?.clientType === 'PERORANGAN';
      if (isPerorangan) return false;
    }

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
            Multifinance & Perorangan Recovery Cases with Fee Snapshots & Operational Flow
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAddModal}
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

        {/* Client Type Filter */}
        <select
          value={filterClientType}
          onChange={(e) => setFilterClientType(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="ALL">🏢 Semua Klien (Multifinance & Perorangan)</option>
          <option value="MULTIFINANCE">🏢 Multifinance / Lembaga</option>
          <option value="PERORANGAN">👤 Klien Perorangan (Individu)</option>
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="ALL">Semua Status</option>
          <option value="NEW">NEW</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="FIELD_ACTION">FIELD ACTION</option>
          <option value="IN_MEDIATION">IN MEDIATION</option>
          <option value="UNIT_RECOVERED">UNIT RECOVERED</option>
          <option value="FULL_PAID">FULL PAID</option>
          <option value="SETTLED">SETTLED</option>
          <option value="CLOSED">CLOSED</option>
        </select>
      </div>

      {/* Cases Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Case No</th>
                <th className="py-3 px-4">Pemberi Kuasa / Client</th>
                <th className="py-3 px-4">Debtor & NIK</th>
                <th className="py-3 px-4">Asset Info</th>
                <th className="py-3 px-4 text-right">OS Principal Debt</th>
                <th className="py-3 px-4">Fee Snapshot</th>
                <th className="py-3 px-4">Assigned Partner</th>
                <th className="py-3 px-4 text-center">Berkas (GDrive)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    Tidak ada data kasus penagihan yang cocok dengan filter.
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => {
                  const isCompleted = ['CLOSED', 'SETTLED', 'FULL_PAID', 'UNIT_RECOVERED'].includes(c.status);
                  const clientObj = store.clients.find(cli => cli.id === c.clientId);
                  const isPerorangan = c.clientType === 'PERORANGAN' || clientObj?.industry === 'PERORANGAN' || clientObj?.clientType === 'PERORANGAN';

                  return (
                    <tr key={c.id} className={`transition ${isCompleted ? 'bg-emerald-950/20 hover:bg-emerald-950/40 border-l-2 border-emerald-500' : 'hover:bg-slate-800/40'}`}>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        <div className="flex items-center gap-2">
                          {c.caseNo}
                          {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{c.clientName}</div>
                        <div className="mt-1">
                          {isPerorangan ? (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-950/60 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-medium">
                              <UserCheck className="w-3 h-3 text-amber-400" /> Klien Perorangan
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-medium">
                              <Building2 className="w-3 h-3 text-indigo-400" /> Multifinance
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 space-y-1">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5 flex-wrap">
                          <span>{c.debtorName}</span>
                          {c.lawyerStatus && (
                            <span className="bg-purple-950 text-purple-300 text-[10px] px-1.5 py-0.2 rounded border border-purple-800 font-semibold">
                              ⚖️ {c.lawyerStatus}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">NIK: {c.debtorNik}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 max-w-[180px] truncate">{c.assetSummary}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 font-mono">
                        Rp {c.principalDebtOS.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                          {c.feeTypeSnapshot} ({c.feePercentSnapshot}% / Rp {c.feeFixedSnapshot?.toLocaleString('id-ID') || 0})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{c.currentPersonnelName || 'Unassigned'}</td>
                      <td className="py-3.5 px-4 text-center">
                        {c.gDriveFolderUrl ? (
                          <a
                            href={c.gDriveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px] bg-indigo-950/40 px-2 py-1 rounded border border-indigo-900/50"
                          >
                            📁 View
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500">-</span>
                        )}
                      </td>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Recovery Case Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreateCase} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">Register New Recovery Case</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daftarkan perkara penagihan/recovery dari Klien Multifinance atau Klien Perorangan</p>
            </div>

            {/* Client Category Selector (Multifinance vs Perorangan) */}
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Pilih Tipe Klien / Pemberi Kuasa:
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleSwitchCategory('MULTIFINANCE')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                    clientCategory === 'MULTIFINANCE'
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-indigo-400" />
                  <span>Client Multifinance / Lembaga</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchCategory('PERORANGAN')}
                  className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition ${
                    clientCategory === 'PERORANGAN'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                  }`}
                >
                  <UserIcon className="w-4 h-4 text-amber-400" />
                  <span>Client Perorangan (Individu)</span>
                </button>
              </div>
            </div>

            {/* Multifinance vs Perorangan Details Selection */}
            {clientCategory === 'MULTIFINANCE' ? (
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    Pilih Klien Multifinance / Perusahaan
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {multifinanceClients.length} Terdaftar di Master
                  </span>
                </div>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  {multifinanceClients.length === 0 ? (
                    <option value="">(Belum ada data client multifinance)</option>
                  ) : (
                    multifinanceClients.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.companyName} ({cli.clientCode}) - {cli.industry}
                      </option>
                    ))
                  )}
                </select>
                <p className="text-[10px] text-slate-400">
                  Data diambil dari Master Data Klien (Clients & Creditors Master).
                </p>
              </div>
            ) : (
              <div className="bg-amber-950/20 p-3.5 rounded-xl border border-amber-800/40 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    Pilih Klien Perorangan (Pemberi Kuasa / Kreditur)
                  </label>
                  <span className="text-[10px] bg-amber-950/90 text-amber-300 px-2 py-0.5 rounded border border-amber-800/60 font-mono font-medium">
                    {peroranganClients.length} Terdaftar di Master
                  </span>
                </div>

                {peroranganClients.length === 0 ? (
                  <div className="p-3 bg-amber-950/40 rounded-lg border border-amber-800/60 text-xs text-amber-200 text-center">
                    Belum ada data Klien Perorangan di Master Data. Silakan daftarkan terlebih dahulu melalui menu <strong>Clients & Creditors Master</strong>.
                  </div>
                ) : (
                  <>
                    <select
                      value={peroranganClientId}
                      onChange={(e) => setPeroranganClientId(e.target.value)}
                      className="w-full bg-slate-900 border border-amber-800/60 rounded-lg p-2.5 text-xs text-white focus:border-amber-500 focus:outline-none shadow-inner"
                    >
                      {peroranganClients.map((cli) => (
                        <option key={cli.id} value={cli.id}>
                          {cli.companyName} {cli.nikKtp ? `(NIK: ${cli.nikKtp})` : ''} - Kode: {cli.clientCode}
                        </option>
                      ))}
                    </select>

                    {selectedPerorangan && (
                      <div className="bg-slate-950/70 p-3 rounded-lg border border-slate-800/90 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                        <div>
                          <span className="text-slate-500 block text-[10px]">NIK KTP Kreditur</span>
                          <span className="text-slate-200 font-mono font-medium">{selectedPerorangan.nikKtp || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">No. Telepon / WA</span>
                          <span className="text-slate-200 font-mono font-medium">{selectedPerorangan.phone || '-'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Alamat Domisili</span>
                          <span className="text-slate-200 font-medium truncate block" title={selectedPerorangan.address}>
                            {selectedPerorangan.address || '-'}
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Case Details Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Debtor Profile (Pihak Tertagih)</label>
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
                <label className="block text-xs text-slate-400 mb-1">
                  {clientCategory === 'MULTIFINANCE' ? 'Multifinance Contract No' : 'No. Perjanjian / SPH / SPK Perorangan'}
                </label>
                <input
                  type="text"
                  required
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  placeholder={clientCategory === 'MULTIFINANCE' ? 'e.g. ADR-CTR-2026-99' : 'e.g. SPH-PER/2026/045'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs text-slate-400">
                    Produk / Layanan Recovery
                  </label>
                  {clientCategory === 'PERORANGAN' ? (
                    <span className="text-[10px] bg-amber-950 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-amber-400" /> Khusus Perorangan
                    </span>
                  ) : (
                    <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800/80 px-1.5 py-0.5 rounded font-semibold flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-indigo-400" /> Multifinance
                    </span>
                  )}
                </div>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-lg p-2.5 text-xs text-white focus:outline-none ${
                    clientCategory === 'PERORANGAN' ? 'border-amber-800/70 focus:border-amber-500' : 'border-slate-800 focus:border-indigo-500'
                  }`}
                >
                  {availableServices.length === 0 ? (
                    <option value="">(Tidak ada produk tersedia untuk kategori ini)</option>
                  ) : (
                    availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.serviceCode || (s as any).code})
                      </option>
                    ))
                  )}
                </select>
                {clientCategory === 'PERORANGAN' ? (
                  <p className="text-[10px] text-amber-400/90 mt-1.5 leading-tight bg-amber-950/30 p-1.5 rounded border border-amber-900/40">
                    🔒 <strong>Ketentuan Produk:</strong> Klien perorangan hanya dapat memilih produk <strong>Penagihan & Mediasi Piutang Perorangan</strong>.
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pilihan produk institusi: Penagihan Unit Fidusia, Somasi Korporat, & Dana Talangan.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">OS Principal Debt (Nilai Piutang Pokok Rp)</label>
                <input
                  type="number"
                  min="0"
                  value={principalDebtOS}
                  onChange={(e) => setPrincipalDebtOS(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Overdue Days (DPD / Hari Keterlambatan)</label>
                <input
                  type="number"
                  min="0"
                  value={overdueDays}
                  onChange={(e) => setOverdueDays(Number(e.target.value))}
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
                      {p.fullName} ({p.type})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {clientCategory === 'MULTIFINANCE' ? 'Asset Collateral Description (Unit Agunan Fidusia)' : 'Keterangan Agunan / Bukti Hutang (Giro / Kwitansi / Aset Jaminan)'}
              </label>
              <input
                type="text"
                required
                value={assetSummary}
                onChange={(e) => setAssetSummary(e.target.value)}
                placeholder={clientCategory === 'MULTIFINANCE' ? 'e.g. Honda HR-V Turbo 2022 (B 1234 XYZ)' : 'e.g. Surat Pengakuan Hutang & BPKB Motor Vario 2023'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
              <h4 className="text-xs font-bold text-amber-400 mb-1.5">Google Drive Folder Integration</h4>
              <p className="text-[10px] text-slate-300 mb-2">Nama folder standar untuk arsip berkas perkara ini:</p>
              <div className="bg-slate-900 border border-slate-700 p-2 rounded text-[11px] font-mono text-emerald-300 mb-2.5 select-all break-all">
                {computedFolderName}
              </div>
              <label className="block text-[10px] text-slate-400 mb-1">Paste Link Folder GDrive di sini (Opsional):</label>
              <input
                type="text"
                value={gDriveFolderUrl}
                onChange={(e) => setGDriveFolderUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 shadow-md"
              >
                Simpan & Snapshot Fee Perkara
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

