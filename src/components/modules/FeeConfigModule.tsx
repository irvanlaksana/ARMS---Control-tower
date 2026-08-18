import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, FeeConfig, FeeType } from '../../types/arms';
import { Settings, Plus, CheckCircle, ShieldCheck } from 'lucide-react';

interface FeeConfigModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const FeeConfigModule: React.FC<FeeConfigModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [clientId, setClientId] = useState(store.clients[0]?.id || '');
  const [serviceId, setServiceId] = useState(store.services[0]?.id || '');
  const [feeType, setFeeType] = useState<FeeType>('PERCENT');
  const [percentageValue, setPercentageValue] = useState(15);
  const [fixedAmount, setFixedAmount] = useState(2500000);
  const [customFormulaNotes, setCustomFormulaNotes] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedClient = store.clients.find((c) => c.id === clientId);
  const isPeroranganClient = selectedClient?.clientType === 'PERORANGAN' || selectedClient?.industry === 'PERORANGAN';

  const availableServices = isPeroranganClient
    ? store.services.filter(s => s.category === 'PENAGIHAN_PERORANGAN' || s.serviceCode.includes('PERORANGAN') || s.name.toLowerCase().includes('perorangan'))
    : store.services.filter(s => s.category !== 'PENAGIHAN_PERORANGAN' && !s.serviceCode.includes('PERORANGAN') && !s.name.toLowerCase().includes('perorangan'));

  const handleClientChange = (newClientId: string) => {
    setClientId(newClientId);
    const client = store.clients.find(c => c.id === newClientId);
    const isPer = client?.clientType === 'PERORANGAN' || client?.industry === 'PERORANGAN';
    const srv = isPer
      ? store.services.find(s => s.category === 'PENAGIHAN_PERORANGAN' || s.serviceCode.includes('PERORANGAN') || s.name.toLowerCase().includes('perorangan'))
      : store.services.find(s => s.category !== 'PENAGIHAN_PERORANGAN' && !s.serviceCode.includes('PERORANGAN') && !s.name.toLowerCase().includes('perorangan'));
    if (srv) {
      setServiceId(srv.id);
    }
  };

  const handleCreateFee = (e: React.FormEvent) => {
    e.preventDefault();
    const client = store.clients.find((c) => c.id === clientId);
    const service = store.services.find((s) => s.id === serviceId);

    const newFee: FeeConfig = {
      id: `FEE-${Date.now()}`,
      clientId,
      clientName: client?.companyName || 'Client',
      serviceId,
      serviceName: service?.name || 'Service',
      feeType,
      percentageValue: feeType === 'PERCENT' || feeType === 'SUCCESS_FEE' ? percentageValue : undefined,
      fixedAmount: feeType === 'FIXED' || feeType === 'SUCCESS_FEE' ? fixedAmount : undefined,
      customFormulaNotes: feeType === 'CUSTOM' ? customFormulaNotes : undefined,
      effectiveDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Fees',
      newFee.id,
      `Configured ${feeType} Fee Engine for ${newFee.clientName} (${newFee.serviceName})`
    );

    onUpdateStore({
      ...store,
      fees: [newFee, ...store.fees],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Dynamic Fee Engine Configuration</h2>
          </div>
          <p className="text-xs text-slate-400">
            Manual Control Tower Fee Rules: Percent, Fixed Nominal, Success Fee, Tiered & Custom Formulas
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Configure Fee Rule</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client Company</th>
                <th className="py-3 px-4">Service Category</th>
                <th className="py-3 px-4">Fee Structure Type</th>
                <th className="py-3 px-4">Percentage</th>
                <th className="py-3 px-4">Fixed Nominal</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.fees.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-bold text-white">{f.clientName}</td>
                  <td className="py-3.5 px-4 text-slate-300">{f.serviceName}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800 font-bold">
                      {f.feeType}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono font-semibold text-emerald-400">
                    {f.percentageValue ? `${f.percentageValue}%` : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-emerald-400">
                    {f.fixedAmount ? `Rp ${f.fixedAmount.toLocaleString('id-ID')}` : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">{f.effectiveDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                      {f.status}
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
          <form onSubmit={handleCreateFee} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Configure Fee Engine Rule</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Pilih Klien ({isPeroranganClient ? 'Perorangan' : 'Multifinance'})
                </label>
                <select
                  value={clientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} {c.clientType === 'PERORANGAN' || c.industry === 'PERORANGAN' ? '(Perorangan)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Pilih Produk Layanan {isPeroranganClient && <span className="text-amber-400 font-semibold">(Khusus Perorangan)</span>}
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {availableServices.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.serviceCode || (s as any).code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fee Type</label>
                <select
                  value={feeType}
                  onChange={(e) => setFeeType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="PERCENT">Percent (%)</option>
                  <option value="FIXED">Fixed Nominal (Rp)</option>
                  <option value="SUCCESS_FEE">Success Fee (% + Base)</option>
                  <option value="TIERED">Tiered DPD Scale</option>
                  <option value="CUSTOM">Custom Formula</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Percentage Value (%)</label>
                <input
                  type="number"
                  value={percentageValue}
                  onChange={(e) => setPercentageValue(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fixed Amount (Rp)</label>
                <input
                  type="number"
                  value={fixedAmount}
                  onChange={(e) => setFixedAmount(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
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
                Save Fee Configuration
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
