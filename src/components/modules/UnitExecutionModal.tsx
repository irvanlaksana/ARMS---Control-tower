import React, { useState, useMemo } from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { User, Case, AssetRecovery } from '../../types/arms';
import { SearchableSelect } from '../common/SearchableSelect';
import {
  Car,
  CheckCircle,
  AlertTriangle,
  UserCheck,
  Building2,
  DollarSign,
  Percent,
  X,
  Send,
  HelpCircle,
  FileText,
  ShieldCheck,
  HardDrive
} from 'lucide-react';
import {
  calculateRepossessionTierFee,
  executeUnitRepossessionAndCloseCase,
  RepossessionTierCalculationResult
} from '../../utils/tierFeeCalculator';

interface UnitExecutionModalProps {
  initialCaseId?: string;
  store: ARMSStore;
  currentUser: User;
  onClose: () => void;
  onUpdateStore: (newStore: ARMSStore) => void;
  onSuccess?: (recovery: AssetRecovery) => void;
}

export const UnitExecutionModal: React.FC<UnitExecutionModalProps> = ({
  initialCaseId,
  store,
  currentUser,
  onClose,
  onUpdateStore,
  onSuccess,
}) => {
  // Available cases: Open or active cases
  const availableCases = store.cases.filter(
    (c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED'
  );

  const [selectedCaseId, setSelectedCaseId] = useState<string>(
    initialCaseId || availableCases[0]?.id || store.cases[0]?.id || ''
  );

  const targetCase = store.cases.find((c) => c.id === selectedCaseId) || store.cases[0];
  const targetClient = store.clients.find((cl) => cl.id === targetCase?.clientId);
  const targetFeeConfig = store.fees.find(
    (f) => f.clientId === targetCase?.clientId && (f.serviceId === targetCase?.serviceId || f.feeType === 'TIERED')
  );

  // Form states
  const [bastNo, setBastNo] = useState(`BAST-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  const [warehouseLocation, setWarehouseLocation] = useState('Gudang ARMS Karawang (Pusat Penampungan)');
  const [physicalCondition, setPhysicalCondition] = useState<
    'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'PARTS_MISSING'
  >('GOOD');
  const [vehicleType, setVehicleType] = useState<
    'MOTORCYCLE' | 'PASSENGER_CAR' | 'COMMERCIAL_VEHICLE' | 'HEAVY_EQUIPMENT'
  >('PASSENGER_CAR');
  const [vehicleYear, setVehicleYear] = useState<number>(new Date().getFullYear() - 2);
  const [hasStnk, setHasStnk] = useState<boolean>(true);
  const [hasKey, setHasKey] = useState<boolean>(true);
  const [isOutOfTown, setIsOutOfTown] = useState<boolean>(false);
  const [customGrossFee, setCustomGrossFee] = useState<number | undefined>(undefined);
  const [useCustomFee, setUseCustomFee] = useState<boolean>(false);

  // Personnel selection
  const defaultPersonnelId = targetCase?.currentPersonnelId || store.personnel[0]?.id || '';
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(defaultPersonnelId);
  const selectedPersonnel = store.personnel.find((p) => p.id === selectedPersonnelId);

  // Company split %
  const defaultCompanyPercent = store.settings?.defaultCompanyCommissionSplitPercent ?? 20;
  const [companySplitPercent, setCompanySplitPercent] = useState<number>(defaultCompanyPercent);

  const [bastDriveUrl, setBastDriveUrl] = useState<string>(targetCase?.gDriveFolderUrl || '');
  const [notes, setNotes] = useState<string>('');

  // Live Tier Calculation
  const calcResult: RepossessionTierCalculationResult = useMemo(() => {
    if (!targetCase) {
      return {
        basisName: 'TIER_STANDAR',
        appliedTierRuleName: 'Standar Tier',
        baseFeeAmount: 0,
        modifiers: [],
        modifiersTotal: 0,
        grossRepossessionFee: 0,
        companyFeePercent: 20,
        companyRevenueAmount: 0,
        partnerCommissionAmount: 0,
        isMitraDC: false,
        personnelType: 'KARYAWAN',
        personnelName: 'Petugas',
        payoutStatus: 'NOT_APPLICABLE',
        explanationNotes: '',
      };
    }

    return calculateRepossessionTierFee(
      {
        targetCase,
        client: targetClient,
        feeConfig: targetFeeConfig,
        personnel: selectedPersonnel,
        vehicleType,
        vehicleYear,
        hasStnk,
        hasKey,
        isOutOfTown,
        physicalCondition,
        customGrossFee: useCustomFee ? customGrossFee : undefined,
        companySplitPercent,
      },
      defaultCompanyPercent
    );
  }, [
    targetCase,
    targetClient,
    targetFeeConfig,
    selectedPersonnel,
    vehicleType,
    vehicleYear,
    hasStnk,
    hasKey,
    isOutOfTown,
    physicalCondition,
    customGrossFee,
    useCustomFee,
    companySplitPercent,
    defaultCompanyPercent,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCase) return;

    const { updatedStore, newRecovery } = executeUnitRepossessionAndCloseCase(
      store,
      targetCase,
      calcResult,
      {
        bastNo,
        warehouseLocation,
        physicalCondition,
        vehicleType,
        vehicleYear,
        hasStnk,
        hasKey,
        bastDriveUrl,
        notes,
        currentUser: {
          username: currentUser.username,
          role: currentUser.role,
          name: currentUser.name,
        },
      }
    );

    onUpdateStore(updatedStore);
    if (onSuccess) onSuccess(newRecovery);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-fade-in my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-slate-950 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-900/60 border border-rose-700/60 rounded-xl text-rose-300 shadow-inner">
              <Car className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Eksekusi Unit & Penyerahan BAST</h3>
                <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold rounded-full">
                  AUTO-CLOSE & REVENUE TIER
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Hitung fee penarikan otomatis berdasarkan tier, tutup kasus (CLOSED), dan catat pendapatan komisi perusahaan
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
          {/* Step 1: Select Target Case */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-300">
              1. Pilih Berkas Perkara / Kasus yang Dieksekusi <span className="text-red-400">*</span>
            </label>
            {availableCases.length === 0 ? (
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400">
                Tidak ada kasus aktif untuk eksekusi unit.
              </div>
            ) : (
              <div className="relative z-[60]">
                <SearchableSelect
                  value={selectedCaseId}
                  onChange={(val) => {
                    setSelectedCaseId(val);
                    const found = store.cases.find((c) => c.id === val);
                    if (found?.currentPersonnelId) {
                      setSelectedPersonnelId(found.currentPersonnelId);
                    }
                    if (found?.gDriveFolderUrl) {
                      setBastDriveUrl(found.gDriveFolderUrl);
                    }
                  }}
                  options={availableCases.map((c) => {
                    const isClosed = c.status === 'CLOSED';
                    const debtor = isClosed ? '[Kasus Ditutup]' : c.debtorName;
                    const cat = c.clientType === 'PERORANGAN' ? 'PERORANGAN' : 'MULTIFINANCE';
                    return {
                      value: c.id,
                      label: `[${cat}] ${c.caseNo} — ${debtor}`,
                      subLabel: `Klien: ${c.clientName} | OS: Rp ${c.principalDebtOS.toLocaleString('id-ID')} | Status: ${c.status}`
                    };
                  })}
                />
              </div>
            )}

            {targetCase && (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Klien Multifinance</span>
                  <span className="font-semibold text-white">{targetCase.clientName}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Debitur & NIK</span>
                  <span className="font-semibold text-white">{targetCase.debtorName} ({targetCase.debtorNik || '-'})</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Aset Jaminan</span>
                  <span className="font-semibold text-amber-300 truncate block">{targetCase.assetSummary}</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Vehicle & Physical Parameters for Tier Calculation */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-200 flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5">
                <Car className="w-4 h-4 text-indigo-400" />
                <span>2. Parameter Kendaraan & Penentuan Tier Tarif Penarikan</span>
              </span>
              <span className="text-[10px] text-indigo-400 font-mono">Penentu Tarif Tier Klien</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Kategori Kendaraan</label>
                <select
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="MOTORCYCLE">🏍️ Sepeda Motor (Roda 2)</option>
                  <option value="PASSENGER_CAR">🚗 Mobil Penumpang (Passenger Car)</option>
                  <option value="COMMERCIAL_VEHICLE">🚚 Kendaraan Niaga / Box / Truk</option>
                  <option value="HEAVY_EQUIPMENT">🚜 Alat Berat & Excavator</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Tahun Pembuatan Unit</label>
                <input
                  type="number"
                  min="2000"
                  max={new Date().getFullYear()}
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Kondisi Fisik Unit</label>
                <select
                  value={physicalCondition}
                  onChange={(e) => setPhysicalCondition(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="EXCELLENT">EXCELLENT (Sangat Baik / Orisinil)</option>
                  <option value="GOOD">GOOD (Baik & Mesin Nyala)</option>
                  <option value="FAIR">FAIR (Cukup / Ada Baret)</option>
                  <option value="DAMAGED">DAMAGED (Rusak / Butuh Derek)</option>
                  <option value="PARTS_MISSING">PARTS MISSING (Part Tidak Lengkap)</option>
                </select>
              </div>
            </div>

            {/* Checklist Modifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-850 transition">
                <input
                  type="checkbox"
                  checked={hasStnk}
                  onChange={(e) => setHasStnk(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <div className="text-[11px]">
                  <span className="font-semibold text-white block">Ada STNK Asli</span>
                  <span className="text-[10px] text-slate-400">
                    {hasStnk ? 'Dokumen lengkap' : 'Tanpa STNK (- Penyesuaian fee)'}
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-850 transition">
                <input
                  type="checkbox"
                  checked={hasKey}
                  onChange={(e) => setHasKey(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <div className="text-[11px]">
                  <span className="font-semibold text-white block">Kunci Kontak Ada</span>
                  <span className="text-[10px] text-slate-400">
                    {hasKey ? 'Kunci lengkap' : 'Tanpa kunci (- Biaya duplikat)'}
                  </span>
                </div>
              </label>

              <label className="flex items-center gap-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg cursor-pointer hover:bg-slate-850 transition">
                <input
                  type="checkbox"
                  checked={isOutOfTown}
                  onChange={(e) => setIsOutOfTown(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-0"
                />
                <div className="text-[11px]">
                  <span className="font-semibold text-white block">Luar Kota / Red Zone</span>
                  <span className="text-[10px] text-slate-400">
                    {isOutOfTown ? '+ Insentif medan berat' : 'Dalam wilayah kota'}
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Step 3: Personnel & Role Selection (Karyawan vs Mitra DC) */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center justify-between border-b border-slate-800/80 pb-2">
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                <span>3. Petugas Pelaksana Eksekusi Unit</span>
              </span>
              <span className="text-[10px] text-slate-400">Karyawan Internal vs Mitra DC</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Pilih Petugas / Mitra DC Eksekutor:
                </label>
                <SearchableSelect 
                  value={selectedPersonnelId}
                  onChange={setSelectedPersonnelId}
                  options={store.personnel.map(p => ({
                    value: p.id,
                    label: p.fullName,
                    subLabel: `${p.type === 'MITRA_DC' ? '⚡ Mitra DC Freelance' : '🏢 Karyawan Internal'} - ${p.position || p.type}`
                  }))}
                />
              </div>

              <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Tipe Pelaksana</span>
                  <span className="text-xs font-bold text-white block mt-0.5">
                    {selectedPersonnel?.fullName || 'Petugas'}
                  </span>
                </div>
                {calcResult.isMitraDC ? (
                  <span className="px-2.5 py-1 bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                    ⚡ MITRA DC (Split Commission)
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-blue-950/80 text-blue-300 border border-blue-800 text-[10px] font-bold rounded-lg flex items-center gap-1">
                    🏢 KARYAWAN INTERNAL (100% Revenue)
                  </span>
                )}
              </div>
            </div>

            {calcResult.isMitraDC && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-lg text-xs text-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-amber-300">
                    Bagi Hasil Mitra DC Terdeteksi:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400">Bagian Perusahaan:</span>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={companySplitPercent}
                      onChange={(e) => setCompanySplitPercent(Number(e.target.value))}
                      className="w-16 bg-slate-950 border border-amber-700/80 rounded px-2 py-0.5 text-xs text-amber-200 font-mono font-bold text-center"
                    />
                    <span className="text-xs text-amber-300 font-mono font-bold">%</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Perusahaan mendapatkan fee <strong className="text-amber-300">{companySplitPercent}%</strong> sebagai pendapatan operasional, dan Mitra DC berhak menerima <strong className="text-emerald-400">{100 - companySplitPercent}%</strong>. Tombol transfer komisi akan langsung tersedia setelah eksekusi.
                </p>
              </div>
            )}
          </div>

          {/* Live Tier Fee Calculation Result Box */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/50 border-2 border-emerald-600/70 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Rincian Perhitungan Fee & Pendapatan Otomatis (Tier Engine)
                </h4>
              </div>
              <span className="px-2.5 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold font-mono rounded-full">
                {calcResult.appliedTierRuleName}
              </span>
            </div>

            {/* Breakdown details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold block">
                  Total Tarif / Gross Fee Klien
                </span>
                <div className="text-lg font-black text-white font-mono">
                  Rp {calcResult.grossRepossessionFee.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-slate-500">
                  Basis: {calcResult.basisName}
                </span>
              </div>

              <div className="bg-slate-950/70 p-3 rounded-xl border border-indigo-900/60 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-400 text-[10px] uppercase font-bold">
                    Pendapatan Perusahaan
                  </span>
                  <span className="text-[10px] font-bold text-indigo-300 font-mono">
                    ({calcResult.companyFeePercent}%)
                  </span>
                </div>
                <div className="text-lg font-black text-indigo-300 font-mono">
                  Rp {calcResult.companyRevenueAmount.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px] text-indigo-400/80">
                  Masuk ke Rekening Pendapatan Kas ARMS
                </span>
              </div>

              <div className={`p-3 rounded-xl border space-y-1 ${
                calcResult.isMitraDC
                  ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-300'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold">
                    Hak Komisi Mitra DC
                  </span>
                  {calcResult.isMitraDC && (
                    <span className="text-[10px] font-bold font-mono">
                      ({100 - calcResult.companyFeePercent}%)
                    </span>
                  )}
                </div>
                <div className="text-lg font-black font-mono">
                  Rp {calcResult.partnerCommissionAmount.toLocaleString('id-ID')}
                </div>
                <span className="text-[10px]">
                  {calcResult.isMitraDC ? 'Siap Ditransfer ke Mitra DC' : 'Tidak Berlaku (Karyawan Internal)'}
                </span>
              </div>
            </div>

            {/* Modifiers List */}
            {calcResult.modifiers.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs space-y-1.5">
                <span className="text-slate-400 text-[10px] font-bold uppercase">
                  Penyesuaian Dokumen & Kondisi Lapangan:
                </span>
                <div className="space-y-1">
                  {calcResult.modifiers.map((mod, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="text-slate-300 font-medium">
                        • {mod.name}: <span className="text-slate-500 font-normal">{mod.description}</span>
                      </span>
                      <span className={`font-mono font-bold ${mod.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {mod.amount < 0 ? `- Rp ${Math.abs(mod.amount).toLocaleString('id-ID')}` : `+ Rp ${mod.amount.toLocaleString('id-ID')}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 4: Storage & BAST Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Nomor Dokumen BAST (Berita Acara Serah Terima) <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={bastNo}
                onChange={(e) => setBastNo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Lokasi Gudang Penyimpanan Aset <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={warehouseLocation}
                onChange={(e) => setWarehouseLocation(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-slate-400 mb-1">
                Link Folder / Berkas BAST di Google Drive (Foto Serah Terima & Dokumen)
              </label>
              <input
                type="text"
                value={bastDriveUrl}
                onChange={(e) => setBastDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-rose-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Notice Banner: Auto-Closing Case */}
          <div className="p-3.5 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-rose-300">
                Peringatan Sistem: Eksekusi Unit akan Otomatis Meng-Close Kasus Perkara
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Menyimpan formulir ini akan mengubah status kasus menjadi <strong className="text-white">CLOSED</strong>, mencatat BAST Serah Terima, membukukan pendapatan komisi perusahaan sebesar <strong className="text-emerald-400 font-mono">Rp {calcResult.companyRevenueAmount.toLocaleString('id-ID')}</strong> ke Buku Besar, dan mengaktifkan tombol transfer bagi hasil untuk Mitra DC.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800 gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
            >
              Batal
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-rose-950/50 transition cursor-pointer"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Simpan Eksekusi Unit, Close Kasus & Catat Pendapatan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
