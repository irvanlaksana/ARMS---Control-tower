import React, { useState, useEffect } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, FeeConfig, FeeType } from '../../types/arms';
import { Settings, Plus, CheckCircle, ShieldCheck, Edit2, Trash2, X, PlusCircle } from 'lucide-react';

interface TierRule {
  id: string;
  min: number;
  max: number | null; // null means 'up'
  type: 'PERCENT' | 'FIXED';
  value: number;
}

interface TierModifier {
  id: string;
  name: string;
  type: 'ADD' | 'SUBTRACT';
  value: number;
}

interface TieredConfigData {
  basis: 'PAYMENT_AMOUNT' | 'VEHICLE_YEAR' | 'DPD';
  rules: TierRule[];
  modifiers: TierModifier[];
}

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
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [clientId, setClientId] = useState(store.clients[0]?.id || '');
  const [serviceId, setServiceId] = useState(store.services[0]?.id || '');
  const [feeType, setFeeType] = useState<FeeType>('PERCENT');
  const [percentageValue, setPercentageValue] = useState(15);
  const [fixedAmount, setFixedAmount] = useState(2500000);
  const [customFormulaNotes, setCustomFormulaNotes] = useState('');
  
  const [tieredConfig, setTieredConfig] = useState<TieredConfigData>({
    basis: 'PAYMENT_AMOUNT',
    rules: [],
    modifiers: []
  });

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

  const handleOpenModal = (fee?: FeeConfig) => {
    if (fee) {
      setIsEditing(true);
      setEditId(fee.id);
      setClientId(fee.clientId);
      setServiceId(fee.serviceId);
      setFeeType(fee.feeType);
      setPercentageValue(fee.percentageValue || 15);
      setFixedAmount(fee.fixedAmount || 2500000);
      setCustomFormulaNotes(fee.customFormulaNotes || '');
      
      if (fee.tierRulesJson) {
        try {
          const parsed = JSON.parse(fee.tierRulesJson);
          setTieredConfig(parsed);
        } catch (e) {
          setTieredConfig({ basis: 'PAYMENT_AMOUNT', rules: [], modifiers: [] });
        }
      } else {
        setTieredConfig({ basis: 'PAYMENT_AMOUNT', rules: [], modifiers: [] });
      }
    } else {
      setIsEditing(false);
      setEditId(null);
      setClientId(store.clients[0]?.id || '');
      setServiceId(store.services[0]?.id || '');
      setFeeType('PERCENT');
      setPercentageValue(15);
      setFixedAmount(2500000);
      setCustomFormulaNotes('');
      setTieredConfig({ basis: 'PAYMENT_AMOUNT', rules: [], modifiers: [] });
    }
    setShowModal(true);
  };

  const handleDeleteFee = (id: string, clientName: string, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to delete fee configuration for ${clientName} - ${serviceName}?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Fees',
      id,
      `Deleted Fee Config for ${clientName}`
    );

    onUpdateStore({
      ...store,
      fees: store.fees.filter(f => f.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const applyTemplate = (type: 'PAYMENT' | 'MOTOR') => {
    if (type === 'PAYMENT') {
      setTieredConfig({
        basis: 'PAYMENT_AMOUNT',
        rules: [
          { id: Date.now().toString() + '1', min: 4000000, max: 6000000, type: 'PERCENT', value: 20 },
          { id: Date.now().toString() + '2', min: 6100000, max: 8000000, type: 'PERCENT', value: 25 },
          { id: Date.now().toString() + '3', min: 8100000, max: null, type: 'PERCENT', value: 30 },
        ],
        modifiers: []
      });
    } else if (type === 'MOTOR') {
      setTieredConfig({
        basis: 'VEHICLE_YEAR',
        rules: [
          { id: Date.now().toString() + '1', min: 2012, max: 2015, type: 'FIXED', value: 1000000 },
          { id: Date.now().toString() + '2', min: 2016, max: 2020, type: 'FIXED', value: 1200000 },
          { id: Date.now().toString() + '3', min: 2021, max: null, type: 'FIXED', value: 1500000 },
        ],
        modifiers: [
          { id: Date.now().toString() + '4', name: 'Tanpa STNK', type: 'SUBTRACT', value: 200000 }
        ]
      });
    }
  };

  const handleSaveFee = (e: React.FormEvent) => {
    e.preventDefault();
    const client = store.clients.find((c) => c.id === clientId);
    const service = store.services.find((s) => s.id === serviceId);
    
    const tierRulesJson = feeType === 'TIERED' ? JSON.stringify(tieredConfig) : undefined;

    if (isEditing && editId) {
      const updatedFees = store.fees.map(f => {
        if (f.id === editId) {
          return {
            ...f,
            clientId,
            clientName: client?.companyName || 'Client',
            serviceId,
            serviceName: service?.name || 'Service',
            feeType,
            percentageValue: feeType === 'PERCENT' || feeType === 'SUCCESS_FEE' ? percentageValue : undefined,
            fixedAmount: feeType === 'FIXED' || feeType === 'SUCCESS_FEE' ? fixedAmount : undefined,
            customFormulaNotes: feeType === 'CUSTOM' ? customFormulaNotes : undefined,
            tierRulesJson,
          };
        }
        return f;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Fees',
        editId,
        `Updated ${feeType} Fee Engine for ${client?.companyName} (${service?.name})`
      );

      onUpdateStore({
        ...store,
        fees: updatedFees,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
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
        tierRulesJson,
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
    }

    setShowModal(false);
  };

  const renderTieredSummary = (fee: FeeConfig) => {
    if (!fee.tierRulesJson) return <span className="text-slate-500">-</span>;
    try {
      const parsed: TieredConfigData = JSON.parse(fee.tierRulesJson);
      return (
        <div className="flex flex-col gap-0.5 text-[10px]">
          <span className="font-semibold text-indigo-400">
            {parsed.basis === 'PAYMENT_AMOUNT' ? 'Basis: Nominal Bayar' : parsed.basis === 'VEHICLE_YEAR' ? 'Basis: Tahun Motor' : 'Basis: DPD'}
          </span>
          <span className="text-slate-400">{parsed.rules.length} Tiering Rules, {parsed.modifiers.length} Modifiers</span>
        </div>
      );
    } catch {
      return <span className="text-red-400">Invalid Rules</span>;
    }
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
            onClick={() => handleOpenModal()}
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
                <th className="py-3 px-4">Detail (Percent/Fixed/Tiered)</th>
                <th className="py-3 px-4">Effective Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.fees.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-10 text-center text-slate-500 text-xs">
                    Belum ada konfigurasi fee engine. Klik tombol <strong>+ Configure Dynamic Fee Rule</strong> untuk membuat skema pembagian fee.
                  </td>
                </tr>
              ) : (
                store.fees.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white">{f.clientName}</td>
                    <td className="py-3.5 px-4 text-slate-300">{f.serviceName}</td>
                    <td className="py-3.5 px-4">
                      <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800 font-bold">
                        {f.feeType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {f.feeType === 'TIERED' ? (
                        renderTieredSummary(f)
                      ) : (
                        <div className="flex flex-col gap-0.5 text-[11px] font-mono">
                          {f.percentageValue ? <span className="text-emerald-400">{f.percentageValue}%</span> : null}
                          {f.fixedAmount ? <span className="text-emerald-400">Rp {f.fixedAmount.toLocaleString('id-ID')}</span> : null}
                          {!f.percentageValue && !f.fixedAmount && <span className="text-slate-500">-</span>}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">{f.effectiveDate}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                        {f.status}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleOpenModal(f)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                            title="Edit Fee Config"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFee(f.id, f.clientName, f.serviceName)}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                            title="Delete Fee Config"
                          >
                            <Trash2 className="w-4 h-4" />
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
          <form onSubmit={handleSaveFee} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] flex flex-col">
            <h3 className="font-bold text-white text-base shrink-0">
              {isEditing ? 'Edit Fee Engine Rule' : 'Configure Fee Engine Rule'}
            </h3>

            <div className="overflow-y-auto pr-2 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Pilih Klien ({isPeroranganClient ? 'Perorangan' : 'Multifinance'})
                  </label>
                  <select
                    value={clientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {availableServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.serviceCode || (s as any).code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className={feeType === 'TIERED' ? 'col-span-2' : ''}>
                  <label className="block text-xs text-slate-400 mb-1">Tipe Struktur Fee (Fee Type)</label>
                  <select
                    value={feeType}
                    onChange={(e) => setFeeType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-bold"
                  >
                    <option value="PERCENT">Persentase Flat (%)</option>
                    <option value="FIXED">Nominal Tetap (Rp)</option>
                    <option value="SUCCESS_FEE">Success Fee (% + Base)</option>
                    <option value="TIERED">Bertingkat (Tiered / Bersyarat)</option>
                    <option value="CUSTOM">Formula Kustom</option>
                  </select>
                </div>

                {feeType !== 'TIERED' && feeType !== 'CUSTOM' && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nilai Persentase (%)</label>
                      <input
                        type="number"
                        value={percentageValue}
                        onChange={(e) => setPercentageValue(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                        disabled={feeType === 'FIXED'}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nominal Tetap (Rp)</label>
                      <input
                        type="number"
                        value={fixedAmount}
                        onChange={(e) => setFixedAmount(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                        disabled={feeType === 'PERCENT'}
                      />
                    </div>
                  </>
                )}
                
                {feeType === 'CUSTOM' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Catatan Formula Kustom</label>
                    <textarea
                      value={customFormulaNotes}
                      onChange={(e) => setCustomFormulaNotes(e.target.value)}
                      placeholder="e.g. 5% dari total tagihan + biaya transportasi Rp 200,000 jika penagihan di luar kota..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white min-h-[100px] focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {feeType === 'TIERED' && (
                <div className="mt-4 border border-indigo-900/50 bg-indigo-950/10 rounded-xl p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="w-1.5 h-4 bg-indigo-500 rounded-full"></span>
                      Pengaturan Fee Bertingkat
                    </h4>
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => applyTemplate('PAYMENT')}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700"
                      >
                        + Template Unit
                      </button>
                      <button
                        type="button"
                        onClick={() => applyTemplate('MOTOR')}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-slate-700"
                      >
                        + Template Motor
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Parameter Basis Tiering</label>
                    <select
                      value={tieredConfig.basis}
                      onChange={(e) => setTieredConfig({...tieredConfig, basis: e.target.value as any})}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none font-medium"
                    >
                      <option value="PAYMENT_AMOUNT">Jumlah Pembayaran / Unit (Rp)</option>
                      <option value="VEHICLE_YEAR">Tahun Kendaraan (Tahun)</option>
                      <option value="DPD">Hari Keterlambatan (DPD - Days Past Due)</option>
                    </select>
                  </div>

                  {/* Rules Mapping */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-300">Tingkatan / Tier Rules</label>
                      <button
                        type="button"
                        onClick={() => setTieredConfig({
                          ...tieredConfig,
                          rules: [...tieredConfig.rules, { id: Date.now().toString(), min: 0, max: null, type: 'PERCENT', value: 10 }]
                        })}
                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Tambah Tier
                      </button>
                    </div>
                    
                    {tieredConfig.rules.length === 0 ? (
                      <div className="text-center py-4 text-xs text-slate-500 bg-slate-900/50 rounded-lg border border-slate-800">
                        Belum ada rule bertingkat yang ditambahkan.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {tieredConfig.rules.map((rule, idx) => (
                          <div key={rule.id} className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                            <span className="text-[10px] font-bold text-slate-500 w-4 text-center">{idx + 1}.</span>
                            
                            <div className="flex items-center gap-1 flex-1 min-w-[120px]">
                              <input
                                type="number"
                                placeholder="Min"
                                value={rule.min === 0 && rule.max === null ? '' : rule.min}
                                onChange={(e) => {
                                  const newRules = [...tieredConfig.rules];
                                  newRules[idx].min = Number(e.target.value);
                                  setTieredConfig({...tieredConfig, rules: newRules});
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                              />
                              <span className="text-slate-500 text-xs">-</span>
                              <input
                                type="number"
                                placeholder="Up (Kosong)"
                                value={rule.max === null ? '' : rule.max}
                                onChange={(e) => {
                                  const newRules = [...tieredConfig.rules];
                                  newRules[idx].max = e.target.value === '' ? null : Number(e.target.value);
                                  setTieredConfig({...tieredConfig, rules: newRules});
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                              />
                            </div>
                            
                            <div className="flex items-center gap-1 w-[130px]">
                              <select
                                value={rule.type}
                                onChange={(e) => {
                                  const newRules = [...tieredConfig.rules];
                                  newRules[idx].type = e.target.value as any;
                                  setTieredConfig({...tieredConfig, rules: newRules});
                                }}
                                className="w-[50px] bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                              >
                                <option value="PERCENT">%</option>
                                <option value="FIXED">Rp</option>
                              </select>
                              <input
                                type="number"
                                value={rule.value}
                                onChange={(e) => {
                                  const newRules = [...tieredConfig.rules];
                                  newRules[idx].value = Number(e.target.value);
                                  setTieredConfig({...tieredConfig, rules: newRules});
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                              />
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                const newRules = [...tieredConfig.rules];
                                newRules.splice(idx, 1);
                                setTieredConfig({...tieredConfig, rules: newRules});
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Modifiers Mapping */}
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-semibold text-slate-300">Modifikasi Khusus (Kondisional)</label>
                      <button
                        type="button"
                        onClick={() => setTieredConfig({
                          ...tieredConfig,
                          modifiers: [...tieredConfig.modifiers, { id: Date.now().toString(), name: 'Tanpa STNK', type: 'SUBTRACT', value: 200000 }]
                        })}
                        className="flex items-center gap-1 text-[10px] text-amber-400 hover:text-amber-300"
                      >
                        <PlusCircle className="w-3.5 h-3.5" /> Tambah Kondisi
                      </button>
                    </div>

                    {tieredConfig.modifiers.length > 0 && (
                      <div className="space-y-2">
                        {tieredConfig.modifiers.map((mod, idx) => (
                          <div key={mod.id} className="flex flex-wrap items-center gap-2 bg-slate-900 p-2 rounded-lg border border-slate-700">
                            <input
                              type="text"
                              placeholder="Kondisi e.g. Tanpa STNK"
                              value={mod.name}
                              onChange={(e) => {
                                const newMods = [...tieredConfig.modifiers];
                                newMods[idx].name = e.target.value;
                                setTieredConfig({...tieredConfig, modifiers: newMods});
                              }}
                              className="flex-1 min-w-[120px] bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white"
                            />
                            <div className="flex items-center gap-1 w-[140px]">
                              <select
                                value={mod.type}
                                onChange={(e) => {
                                  const newMods = [...tieredConfig.modifiers];
                                  newMods[idx].type = e.target.value as any;
                                  setTieredConfig({...tieredConfig, modifiers: newMods});
                                }}
                                className="w-[45px] bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white text-center font-bold"
                              >
                                <option value="SUBTRACT">-</option>
                                <option value="ADD">+</option>
                              </select>
                              <input
                                type="number"
                                placeholder="Rp Nominal"
                                value={mod.value}
                                onChange={(e) => {
                                  const newMods = [...tieredConfig.modifiers];
                                  newMods[idx].value = Number(e.target.value);
                                  setTieredConfig({...tieredConfig, modifiers: newMods});
                                }}
                                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-white font-mono"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newMods = [...tieredConfig.modifiers];
                                newMods.splice(idx, 1);
                                setTieredConfig({...tieredConfig, modifiers: newMods});
                              }}
                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-500 shadow-md shadow-indigo-900/20 transition"
              >
                {isEditing ? 'Simpan Perubahan' : 'Simpan Konfigurasi'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
