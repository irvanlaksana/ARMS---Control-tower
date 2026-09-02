import React, { useState, useMemo } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Case, FeeType, Client, ClientType } from '../../types/arms';
import { Briefcase, Plus, CheckCircle, Search, Building2, User as UserIcon, UserCheck, ShieldCheck, Edit2, Trash2, AlertTriangle, AlertCircle, Lock } from 'lucide-react';
import { findDuplicateCaseForClient } from '../../utils/duplicateCheck';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

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

  const effectiveClientId = clientCategory === 'PERORANGAN' ? peroranganClientId : clientId;

  // Real-time Duplicate Detection
  const duplicateWarning = useMemo(() => {
    if (!showAddModal) return null;
    return findDuplicateCaseForClient(store.cases || [], effectiveClientId, {
      customerId,
      debtorName: selectedCustomer?.fullName,
      debtorNik: selectedCustomer?.nikKtp,
      contractNo,
      excludeCaseId: isEditing ? editId : null,
    });
  }, [showAddModal, store.cases, effectiveClientId, customerId, selectedCustomer, contractNo, isEditing, editId]);

  // Check if a case in the list has duplicate debtor under same client
  const hasDuplicateInCases = (targetCase: Case) => {
    return (store.cases || []).some(c => 
      c.id !== targetCase.id &&
      c.clientId === targetCase.clientId &&
      ((c.debtorNik && targetCase.debtorNik && c.debtorNik.replace(/\D/g, '') === targetCase.debtorNik.replace(/\D/g, '') && c.debtorNik.replace(/\D/g, '').length >= 10) ||
       (c.multifinanceContractNo && targetCase.multifinanceContractNo && c.multifinanceContractNo.toLowerCase().trim() === targetCase.multifinanceContractNo.toLowerCase().trim()) ||
       (c.customerId && c.customerId === targetCase.customerId))
    );
  };

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

  const handleOpenAddModal = (c?: Case) => {
    if (c) {
      setIsEditing(true);
      setEditId(c.id);
      setClientCategory(c.clientType || 'MULTIFINANCE');
      if (c.clientType === 'PERORANGAN') {
        setPeroranganClientId(c.clientId);
      } else {
        setClientId(c.clientId);
      }
      setCustomerId(c.customerId);
      setContractNo(c.multifinanceContractNo);
      setServiceId(c.serviceId);
      setPrincipalDebtOS(c.principalDebtOS);
      setOverdueDays(c.overdueDays);
      setAssetSummary(c.assetSummary);
      setPartnerId(c.currentPersonnelId || '');
      setGDriveFolderUrl(c.gDriveFolderUrl || '');
    } else {
      setIsEditing(false);
      setEditId(null);
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
      setContractNo(clientCategory === 'PERORANGAN' ? 'SPH-PER/2026/01' : 'ADR-CTR-2026-99');
      setPrincipalDebtOS(150000000);
      setOverdueDays(120);
      setAssetSummary(clientCategory === 'MULTIFINANCE' ? 'Honda HR-V Turbo 2022 (B 1234 XYZ)' : 'Surat Pengakuan Hutang');
      setGDriveFolderUrl('');
    }
    setShowAddModal(true);
  };

  const handleDeleteCase = (id: string, caseNo: string) => {
    if (!window.confirm(`Are you sure you want to delete case "${caseNo}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Cases',
      id,
      `Deleted Case ${caseNo}`
    );

    onUpdateStore({
      ...store,
      cases: store.cases.filter(c => c.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();

    // If duplicate is detected, ask confirmation
    if (duplicateWarning?.isDuplicate) {
      const confirmProceed = window.confirm(
        `⚠️ PERINGATAN DATA DEBITUR GANDA (DUPLICATE DETECTED):\n\n` +
        `${duplicateWarning.matchReason}\n\n` +
        `Data perkara untuk debitur ini sudah ada di sistem untuk klien yang sama.\n` +
        `Apakah Anda yakin ingin tetap menyimpan data perkara ini?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    let actualClientId = clientId;
    let actualClientName = selectedMultifinance?.companyName || 'Multifinance Client';
    let clientCodeForCase = selectedMultifinance?.clientCode || 'CLI';

    if (clientCategory === 'PERORANGAN') {
      const peroranganClient = store.clients.find((c) => c.id === peroranganClientId) || peroranganClients[0];
      actualClientId = peroranganClient?.id || clientId;
      actualClientName = peroranganClient?.companyName || 'Klien Perorangan';
      clientCodeForCase = peroranganClient?.clientCode || 'PER';
    }

    const customer = store.customers.find((cu) => cu.id === customerId);
    const service = store.services.find((s) => s.id === serviceId);
    const partner = (store.personnel || []).find((p) => p.id === personnelId);

    if (isEditing && editId) {
      const updatedCases = store.cases.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            clientId: actualClientId,
            clientName: actualClientName,
            clientType: clientCategory,
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
            currentPersonnelId: personnelId,
            currentPersonnelName: partner?.fullName,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Cases',
        editId,
        `Updated Case ${clientCategory} for ${customer?.fullName}`
      );

      onUpdateStore({
        ...store,
        cases: updatedCases,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      // Update active cases count for selected client
      const updatedClients = store.clients.map((c) => 
        c.id === actualClientId ? { ...c, activeCasesCount: (c.activeCasesCount || 0) + 1 } : c
      );

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
    }

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
            onClick={() => handleOpenAddModal()}
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
        <div className="w-full sm:w-48 relative z-50">
          <SearchableSelect 
            value={filterClientType}
            onChange={(val) => setFilterClientType(val as any)}
            searchable={false}
            options={[
              { value: 'ALL', label: 'Semua Client (ALL)' },
              { value: 'MULTIFINANCE', label: 'Multifinance' },
              { value: 'PERORANGAN', label: 'Perorangan' }
            ]}
          />
        </div>
        <div className="w-full sm:w-48 relative z-40">
          <SearchableSelect 
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as any)}
            searchable={false}
            options={[
              { value: 'ALL', label: 'Semua Status' },
              { value: 'OPEN', label: 'OPEN' },
              { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
              { value: 'CLOSED', label: 'CLOSED' },
              { value: 'CANCELLED', label: 'CANCELLED' }
            ]}
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Case Details</th>
                <th className="px-4 py-3 font-medium">Debtor Info</th>
                <th className="px-4 py-3 font-medium">Asset / Collateral</th>
                <th className="px-4 py-3 font-medium text-right">Principal OS</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredCases.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.caseNo}</div>
                    <div className="text-[10px] text-slate-500">{c.clientName} {c.clientType === 'PERORANGAN' ? '[PERORANGAN]' : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-300">{c.debtorName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.assetSummary}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">
                    Rp {c.principalDebtOS.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-medium ${c.status === 'OPEN' ? 'bg-indigo-900/50 text-indigo-400' : c.status === 'CLOSED' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEditClick(c)} className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteClick(c.id)} className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No cases found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveCase} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">{isEditing ? 'Edit Case' : 'New Recovery Case'}</h2>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client / Creditor</label>
                <SearchableSelect 
                  value={clientId}
                  onChange={(val) => {
                    setClientId(val);
                    const client = store.clients.find(c => c.id === val);
                    if (client) {
                      setClientCategory(client.category);
                    }
                  }}
                  options={store.clients.map(c => ({
                    value: c.id,
                    label: c.name,
                    subLabel: c.category
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Debtor Name</label>
                <input
                  type="text"
                  required
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Principal Outstanding (Rp)</label>
                <input
                  type="number"
                  required
                  value={principalDebtOS}
                  onChange={(e) => setPrincipalDebtOS(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assign To Personnel / Mitra</label>
                <SearchableSelect 
                  value={personnelId}
                  onChange={setPartnerId}
                  options={(store.personnel || []).map((pr) => ({
                    value: pr.id,
                    label: pr.fullName,
                    subLabel: pr.type === 'MITRA_DC' ? 'Mitra DC' : 'Internal'
                  }))}
                />
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
                {isEditing ? 'Simpan Perubahan' : 'Simpan & Snapshot Fee Perkara'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

