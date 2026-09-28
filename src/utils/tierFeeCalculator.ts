/**
 * Tier Fee Calculator & Asset Repossession Revenue Engine
 * Calculates gross repossession fees based on Client Tier Rules / Vehicle Year / DPD / Vehicle Type,
 * computes the company revenue share (default 20%), and handles DC partner commission payout split (80%).
 */

import { Case, Client, FeeConfig, Personnel, AssetRecovery, Payment, LedgerEntry } from '../types/arms';
import { ARMSStore, createAuditEntry } from '../services/armsDataService';

export interface RepossessionTierCalculationParams {
  targetCase: Case;
  client?: Client;
  feeConfig?: FeeConfig;
  personnel?: Personnel;
  vehicleType?: 'MOTORCYCLE' | 'PASSENGER_CAR' | 'COMMERCIAL_VEHICLE' | 'HEAVY_EQUIPMENT' | 'OTHER';
  vehicleYear?: number;
  hasStnk?: boolean;
  hasKey?: boolean;
  isOutOfTown?: boolean;
  physicalCondition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'PARTS_MISSING';
  customGrossFee?: number;
  companySplitPercent?: number; // e.g. 20 (Perusahaan mendapat 20%)
}

export interface TierModifierResult {
  name: string;
  type: 'ADD' | 'SUBTRACT';
  amount: number;
  description: string;
}

export interface RepossessionTierCalculationResult {
  basisName: string;
  appliedTierRuleName: string;
  baseFeeAmount: number;
  modifiers: TierModifierResult[];
  modifiersTotal: number;
  grossRepossessionFee: number; // Total Tagihan/Tarif ke Klien
  companyFeePercent: number; // Default 20%
  companyRevenueAmount: number; // Pendapatan Bersih Perusahaan (20% * Gross Fee)
  partnerCommissionAmount: number; // Komisi Hak Mitra DC (80% * Gross Fee)
  isMitraDC: boolean;
  personnelType: 'KARYAWAN' | 'MITRA_DC';
  personnelName: string;
  payoutStatus: 'NOT_APPLICABLE' | 'PENDING_TRANSFER' | 'TRANSFERRED';
  explanationNotes: string;
}

export interface PaymentTierCalculationParams {
  targetCase: Case;
  client?: Client;
  feeConfig?: FeeConfig;
  personnel?: Personnel;
  paymentAmount: number;
  companySplitPercent?: number; // e.g. 20 (Perusahaan mendapat 20%)
  customGrossFee?: number;
}

export interface PaymentTierCalculationResult {
  basisName: string;
  appliedTierRuleName: string;
  tierPercent: number; // e.g. 15% or 20%
  grossAgencyFee: number; // Total Success/Agency Fee
  companyFeePercent: number; // e.g. 20%
  companyRevenueAmount: number; // Pendapatan Perusahaan (20% * grossAgencyFee)
  partnerCommissionPercent: number; // e.g. 80%
  partnerCommissionAmount: number; // Hak Komisi Mitra DC (80% * grossAgencyFee)
  isMitraDC: boolean;
  personnelType: 'KARYAWAN' | 'MITRA_DC';
  personnelName: string;
  payoutStatus: 'NOT_APPLICABLE' | 'PENDING_TRANSFER' | 'TRANSFERRED';
  explanationNotes: string;
}

/**
 * Calculate automated tier fee for debtor repayment / cash receipts
 */
export function calculatePaymentTierFee(
  params: PaymentTierCalculationParams,
  defaultCompanyPercent: number = 20
): PaymentTierCalculationResult {
  const {
    targetCase,
    feeConfig,
    personnel,
    paymentAmount,
    companySplitPercent = defaultCompanyPercent,
    customGrossFee,
  } = params;

  const isMitraDC = personnel?.type === 'MITRA_DC';
  const personnelType: 'KARYAWAN' | 'MITRA_DC' = isMitraDC ? 'MITRA_DC' : 'KARYAWAN';
  const personnelName = personnel?.fullName || targetCase.currentPersonnelName || 'Petugas Lapangan';

  let basisName = 'TIER_DPD_COLLECTION';
  let appliedTierRuleName = 'Standar Tiering DPD Kolektibilitas';
  let tierPercent = 15;
  let grossAgencyFee = 0;

  // 1. Check if specific custom gross fee was provided manually
  if (customGrossFee !== undefined && customGrossFee > 0) {
    basisName = 'CUSTOM_MANUAL_FEE';
    appliedTierRuleName = 'Tarif Kustom Fee Penerimaan Dana';
    grossAgencyFee = customGrossFee;
    tierPercent = paymentAmount > 0 ? Math.round((customGrossFee / paymentAmount) * 100) : 0;
  }
  // 2. Check if FeeConfig has custom JSON tier rules
  else if (feeConfig?.feeType === 'TIERED' && feeConfig?.tierRulesJson) {
    try {
      const parsedConfig = JSON.parse(feeConfig.tierRulesJson);
      basisName = parsedConfig.basis || 'CUSTOM_TIER_RULES';
      
      let matchedValue = 0;
      let matchedType: 'PERCENT' | 'FIXED' = 'PERCENT';
      let checkVal = paymentAmount;
      if (parsedConfig.basis === 'DPD') {
        checkVal = targetCase.overdueDays;
      } else if (parsedConfig.basis === 'PAYMENT_AMOUNT') {
        checkVal = paymentAmount;
      }

      // Evaluate rules
      if (Array.isArray(parsedConfig.rules)) {
        for (const rule of parsedConfig.rules) {
          const minMatch = rule.min === null || rule.min === undefined || checkVal >= rule.min;
          const maxMatch = rule.max === null || rule.max === undefined || checkVal <= rule.max;
          if (minMatch && maxMatch) {
            appliedTierRuleName = `Tier Aturan Klien: ${rule.min ?? 'Min'} - ${rule.max ?? 'Max'} (${parsedConfig.basis})`;
            matchedType = rule.type;
            matchedValue = rule.value;
            break;
          }
        }
      }

      if (matchedValue > 0) {
        if (matchedType === 'PERCENT') {
          tierPercent = matchedValue;
          grossAgencyFee = Math.round((matchedValue / 100) * paymentAmount);
        } else {
          grossAgencyFee = matchedValue;
          tierPercent = paymentAmount > 0 ? Math.round((matchedValue / paymentAmount) * 100) : 0;
        }
      }
    } catch {
      // JSON parse fallback
    }
  } else if (feeConfig?.feeType === 'PERCENT' && feeConfig.percentageValue) {
    basisName = 'CLIENT_PERCENT_FEE';
    tierPercent = feeConfig.percentageValue;
    appliedTierRuleName = `Tarif Kontrak Klien (${tierPercent}%)`;
    grossAgencyFee = Math.round((tierPercent / 100) * paymentAmount);
  } else if (feeConfig?.feeType === 'SUCCESS_FEE' && feeConfig.successFeePercent) {
    basisName = 'CLIENT_SUCCESS_FEE';
    tierPercent = feeConfig.successFeePercent;
    appliedTierRuleName = `Success Fee Kontrak Klien (${tierPercent}%)`;
    grossAgencyFee = Math.round((tierPercent / 100) * paymentAmount);
  } else if (feeConfig?.feeType === 'FIXED' && feeConfig.fixedAmount) {
    basisName = 'CLIENT_FIXED_FEE';
    grossAgencyFee = feeConfig.fixedAmount;
    tierPercent = paymentAmount > 0 ? Math.round((feeConfig.fixedAmount / paymentAmount) * 100) : 0;
    appliedTierRuleName = `Tarif Tetap Klien (Rp ${feeConfig.fixedAmount.toLocaleString('id-ID')})`;
  }

  // 3. Fallback to standard DPD tiering if grossAgencyFee is still 0
  if (grossAgencyFee === 0 && paymentAmount > 0) {
    const dpd = targetCase.overdueDays || 60;
    if (dpd <= 30) {
      tierPercent = 10;
      appliedTierRuleName = 'Tier 1 - DPD 1-30 Hari (Early Stage 10%)';
    } else if (dpd <= 60) {
      tierPercent = 15;
      appliedTierRuleName = 'Tier 2 - DPD 31-60 Hari (Mid Stage 15%)';
    } else if (dpd <= 90) {
      tierPercent = 20;
      appliedTierRuleName = 'Tier 3 - DPD 61-90 Hari (NPL Bucket 20%)';
    } else if (dpd <= 180) {
      tierPercent = 25;
      appliedTierRuleName = 'Tier 4 - DPD 91-180 Hari (Severe Default 25%)';
    } else {
      tierPercent = 30;
      appliedTierRuleName = 'Tier 5 - DPD > 180 Hari / Write-Off (Recovery 30%)';
    }
    grossAgencyFee = Math.round((tierPercent / 100) * paymentAmount);
  }

  // Split calculations
  const effectiveCompanyPercent = Math.max(0, Math.min(100, companySplitPercent));
  let companyRevenueAmount = 0;
  let partnerCommissionPercent = 0;
  let partnerCommissionAmount = 0;
  let payoutStatus: 'NOT_APPLICABLE' | 'PENDING_TRANSFER' | 'TRANSFERRED' = 'NOT_APPLICABLE';

  if (isMitraDC) {
    companyRevenueAmount = Math.round((effectiveCompanyPercent / 100) * grossAgencyFee);
    partnerCommissionPercent = 100 - effectiveCompanyPercent;
    partnerCommissionAmount = Math.max(0, grossAgencyFee - companyRevenueAmount);
    payoutStatus = partnerCommissionAmount > 0 ? 'PENDING_TRANSFER' : 'NOT_APPLICABLE';
  } else {
    companyRevenueAmount = grossAgencyFee;
    partnerCommissionPercent = 0;
    partnerCommissionAmount = 0;
    payoutStatus = 'NOT_APPLICABLE';
  }

  const explanationNotes = isMitraDC
    ? `Penerimaan dana via Mitra DC (${personnelName}). Gross Fee: Rp ${grossAgencyFee.toLocaleString('id-ID')} (${appliedTierRuleName}). Pendapatan Perusahaan (${effectiveCompanyPercent}%): Rp ${companyRevenueAmount.toLocaleString('id-ID')}. Hak Komisi Mitra DC (${partnerCommissionPercent}%): Rp ${partnerCommissionAmount.toLocaleString('id-ID')}.`
    : `Penerimaan dana via Karyawan Internal (${personnelName}). 100% Gross Fee Rp ${grossAgencyFee.toLocaleString('id-ID')} (${appliedTierRuleName}) dibukukan sebagai Pendapatan Perusahaan.`;

  return {
    basisName,
    appliedTierRuleName,
    tierPercent,
    grossAgencyFee,
    companyFeePercent: effectiveCompanyPercent,
    companyRevenueAmount,
    partnerCommissionPercent,
    partnerCommissionAmount,
    isMitraDC,
    personnelType,
    personnelName,
    payoutStatus,
    explanationNotes,
  };
}

/**
 * Calculate automated tier fee for unit repossession & handover
 */
export function calculateRepossessionTierFee(
  params: RepossessionTierCalculationParams,
  defaultCompanyPercent: number = 20
): RepossessionTierCalculationResult {
  const {
    targetCase,
    feeConfig,
    personnel,
    vehicleType = 'PASSENGER_CAR',
    vehicleYear = new Date().getFullYear() - 3,
    hasStnk = true,
    hasKey = true,
    isOutOfTown = false,
    physicalCondition = 'GOOD',
    customGrossFee,
    companySplitPercent = defaultCompanyPercent,
  } = params;

  const isMitraDC = personnel?.type === 'MITRA_DC';
  const personnelType: 'KARYAWAN' | 'MITRA_DC' = isMitraDC ? 'MITRA_DC' : 'KARYAWAN';
  const personnelName = personnel?.fullName || targetCase.currentPersonnelName || 'Petugas Lapangan';

  let basisName = 'TIER_STANDAR_KENDARAAN';
  let appliedTierRuleName = 'Standar Unit Handover Tier';
  let baseFeeAmount = 0;
  const modifiers: TierModifierResult[] = [];

  // 1. Check if specific custom gross fee was provided manually
  if (customGrossFee !== undefined && customGrossFee > 0) {
    basisName = 'CUSTOM_MANUAL_FEE';
    appliedTierRuleName = 'Tarif Kustom Eksekusi Unit';
    baseFeeAmount = customGrossFee;
  }
  // 2. Check if FeeConfig has custom JSON tier rules
  else if (feeConfig?.tierRulesJson) {
    try {
      const parsedConfig = JSON.parse(feeConfig.tierRulesJson);
      basisName = parsedConfig.basis || 'CUSTOM_TIER_RULES';
      
      let matchedValue = 0;
      let checkVal = targetCase.principalDebtOS;
      if (parsedConfig.basis === 'VEHICLE_YEAR') {
        checkVal = vehicleYear;
      } else if (parsedConfig.basis === 'DPD') {
        checkVal = targetCase.overdueDays;
      }

      // Evaluate rules
      if (Array.isArray(parsedConfig.rules)) {
        for (const rule of parsedConfig.rules) {
          const minMatch = rule.min === null || rule.min === undefined || checkVal >= rule.min;
          const maxMatch = rule.max === null || rule.max === undefined || checkVal <= rule.max;
          if (minMatch && maxMatch) {
            appliedTierRuleName = `Tier Aturan Klien: ${rule.min ?? 'Min'} - ${rule.max ?? 'Max'} (${parsedConfig.basis})`;
            if (rule.type === 'PERCENT') {
              matchedValue = (rule.value / 100) * targetCase.principalDebtOS;
            } else {
              matchedValue = rule.value;
            }
            break;
          }
        }
      }

      if (matchedValue > 0) {
        baseFeeAmount = matchedValue;
      }

      // Evaluate configured modifiers
      if (Array.isArray(parsedConfig.modifiers)) {
        for (const mod of parsedConfig.modifiers) {
          if (mod.name.toLowerCase().includes('stnk') && !hasStnk) {
            modifiers.push({
              name: mod.name,
              type: mod.type || 'SUBTRACT',
              amount: mod.type === 'SUBTRACT' ? -Math.abs(mod.value) : Math.abs(mod.value),
              description: 'Penyesuaian Dokumen: Unit tanpa STNK asli',
            });
          }
        }
      }
    } catch {
      // JSON parse fallback to standard matrix
    }
  }

  // 3. Fallback to Standard Automotive Repossession Matrix if baseFeeAmount is still 0
  if (baseFeeAmount === 0) {
    const currentYear = new Date().getFullYear();
    const ageInYears = Math.max(0, currentYear - vehicleYear);

    if (vehicleType === 'MOTORCYCLE') {
      basisName = 'TIER_SEPEDA_MOTOR';
      if (ageInYears <= 2) {
        appliedTierRuleName = `Tier 1 Motor Baru (${vehicleYear} - ${currentYear})`;
        baseFeeAmount = 2500000;
      } else if (ageInYears <= 6) {
        appliedTierRuleName = `Tier 2 Motor Menengah (${vehicleYear})`;
        baseFeeAmount = 1800000;
      } else {
        appliedTierRuleName = `Tier 3 Motor Lama (${vehicleYear})`;
        baseFeeAmount = 1300000;
      }

      if (!hasStnk) {
        modifiers.push({
          name: 'Tanpa STNK',
          type: 'SUBTRACT',
          amount: -250000,
          description: 'Pengurangan biaya karena unit diserahkan tanpa STNK asli',
        });
      }
    } else if (vehicleType === 'COMMERCIAL_VEHICLE') {
      basisName = 'TIER_KENDARAAN_KOMERSIAL';
      appliedTierRuleName = `Tier Kendaraan Niaga / Box / Truk (${vehicleYear})`;
      baseFeeAmount = 12000000;

      if (!hasStnk) {
        modifiers.push({
          name: 'Tanpa STNK',
          type: 'SUBTRACT',
          amount: -1000000,
          description: 'Pengurangan biaya pengurusan dokumen STNK hilang',
        });
      }
    } else if (vehicleType === 'HEAVY_EQUIPMENT') {
      basisName = 'TIER_ALAT_BERAT';
      appliedTierRuleName = `Tier Alat Berat & Excavator (${vehicleYear})`;
      baseFeeAmount = 25000000;
    } else {
      // Default PASSENGER_CAR (Mobil Penumpang)
      basisName = 'TIER_MOBIL_PENUMPANG';
      if (ageInYears <= 3) {
        appliedTierRuleName = `Tier 1 Mobil Baru / Premium (${vehicleYear} - ${currentYear})`;
        baseFeeAmount = 12000000;
      } else if (ageInYears <= 7) {
        appliedTierRuleName = `Tier 2 Mobil Menengah (${vehicleYear})`;
        baseFeeAmount = 8500000;
      } else {
        appliedTierRuleName = `Tier 3 Mobil Lama (${vehicleYear})`;
        baseFeeAmount = 6000000;
      }

      if (!hasStnk) {
        modifiers.push({
          name: 'Tanpa STNK',
          type: 'SUBTRACT',
          amount: -500000,
          description: 'Pengurangan biaya karena unit tanpa STNK asli',
        });
      }
    }

    if (!hasKey) {
      modifiers.push({
        name: 'Tanpa Kunci Kontak',
        type: 'SUBTRACT',
        amount: vehicleType === 'MOTORCYCLE' ? -150000 : -500000,
        description: 'Biaya pembuatan duplikat kunci / towing darurat',
      });
    }

    if (physicalCondition === 'DAMAGED' || physicalCondition === 'PARTS_MISSING') {
      modifiers.push({
        name: 'Kondisi Rusak / Derek',
        type: 'SUBTRACT',
        amount: vehicleType === 'MOTORCYCLE' ? -300000 : -1000000,
        description: 'Biaya penanganan unit rusak / part tidak lengkap',
      });
    }

    if (isOutOfTown) {
      modifiers.push({
        name: 'Eksekusi Luar Kota / Red Zone',
        type: 'ADD',
        amount: vehicleType === 'MOTORCYCLE' ? 350000 : 1500000,
        description: 'Tambahan insentif penarikan lintas wilayah / medan berisiko tinggi',
      });
    }
  }

  // Calculate net modifiers
  const modifiersTotal = modifiers.reduce((acc, m) => acc + m.amount, 0);
  const grossRepossessionFee = Math.max(0, baseFeeAmount + modifiersTotal);

  // Split calculations
  const effectiveCompanyPercent = Math.max(0, Math.min(100, companySplitPercent));
  const companyRevenueAmount = Math.round((effectiveCompanyPercent / 100) * grossRepossessionFee);
  const partnerCommissionAmount = isMitraDC
    ? Math.max(0, grossRepossessionFee - companyRevenueAmount)
    : 0;

  const payoutStatus: 'NOT_APPLICABLE' | 'PENDING_TRANSFER' | 'TRANSFERRED' = isMitraDC
    ? 'PENDING_TRANSFER'
    : 'NOT_APPLICABLE';

  const explanationNotes = isMitraDC
    ? `Eksekusi oleh Mitra DC (${personnelName}). Total Fee: Rp ${grossRepossessionFee.toLocaleString('id-ID')}. Perusahaan (${effectiveCompanyPercent}%): Rp ${companyRevenueAmount.toLocaleString('id-ID')}. Hak Mitra DC (${100 - effectiveCompanyPercent}%): Rp ${partnerCommissionAmount.toLocaleString('id-ID')}.`
    : `Eksekusi oleh Karyawan Internal (${personnelName}). Total Fee Rp ${grossRepossessionFee.toLocaleString('id-ID')} dicatat 100% sebagai Pendapatan Perusahaan.`;

  return {
    basisName,
    appliedTierRuleName,
    baseFeeAmount,
    modifiers,
    modifiersTotal,
    grossRepossessionFee,
    companyFeePercent: effectiveCompanyPercent,
    companyRevenueAmount,
    partnerCommissionAmount,
    isMitraDC,
    personnelType,
    personnelName,
    payoutStatus,
    explanationNotes,
  };
}

/**
 * Executes a Unit Repossession transaction:
 * 1. Updates Case to 'CLOSED'
 * 2. Creates AssetRecovery BAST record with full tier details
 * 3. Records Company Revenue in Payments & Ledger
 * 4. Flags Partner Commission as 'PENDING_TRANSFER' if handled by MITRA_DC
 */
export function executeUnitRepossessionAndCloseCase(
  store: ARMSStore,
  targetCase: Case,
  calcResult: RepossessionTierCalculationResult,
  extraParams: {
    bastNo: string;
    warehouseLocation: string;
    physicalCondition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'DAMAGED' | 'PARTS_MISSING';
    vehicleType?: 'MOTORCYCLE' | 'PASSENGER_CAR' | 'COMMERCIAL_VEHICLE' | 'HEAVY_EQUIPMENT' | 'OTHER';
    vehicleYear?: number;
    hasStnk?: boolean;
    hasKey?: boolean;
    bastDriveUrl?: string;
    notes?: string;
    currentUser: { username: string; role: any; name?: string };
  }
): {
  updatedStore: ARMSStore;
  newRecovery: AssetRecovery;
  newPayment: Payment;
  newLedgerEntry: LedgerEntry;
} {
  const nowIso = new Date().toISOString();
  const todayDate = nowIso.split('T')[0];
  const { currentUser, bastNo, warehouseLocation, physicalCondition, vehicleType, vehicleYear, hasStnk, hasKey, bastDriveUrl } = extraParams;

  const personnelObj = store.personnel.find(p => p.id === targetCase.currentPersonnelId || p.fullName === calcResult.personnelName);

  // 1. Create BAST / AssetRecovery Record
  const newRecovery: AssetRecovery = {
    id: `REC-${Date.now()}`,
    recoveryNo: bastNo || `BAST-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    caseId: targetCase.id,
    caseNo: targetCase.caseNo,
    assetId: targetCase.customerId ? `AST-${targetCase.customerId}` : `AST-${Date.now()}`,
    assetDescription: targetCase.assetSummary || 'Kendaraan Bermotor / Aset Jaminan',
    personnelId: personnelObj?.id || targetCase.currentPersonnelId || 'PER-OPS',
    personnelName: personnelObj?.fullName || calcResult.personnelName,
    personnelType: calcResult.personnelType,
    recoveryDate: todayDate,
    warehouseLocation: warehouseLocation || 'Gudang ARMS Karawang',
    physicalCondition,
    vehicleType: vehicleType || 'PASSENGER_CAR',
    vehicleYear: vehicleYear || new Date().getFullYear() - 2,
    hasStnk: hasStnk ?? true,
    hasKey: hasKey ?? true,
    tierAppliedName: calcResult.appliedTierRuleName,
    tierAppliedBasis: calcResult.basisName,
    tierBaseAmount: calcResult.baseFeeAmount,
    tierModifiersTotal: calcResult.modifiersTotal,
    repossessionFee: calcResult.grossRepossessionFee,
    companyFeePercent: calcResult.companyFeePercent,
    companyFeeAmount: calcResult.companyRevenueAmount,
    partnerCommissionAmount: calcResult.partnerCommissionAmount,
    partnerPayoutStatus: calcResult.payoutStatus,
    partnerBankName: personnelObj?.bankName || '',
    partnerAccountNo: personnelObj?.accountNumber || '',
    partnerAccountName: personnelObj?.accountName || personnelObj?.fullName || '',
    status: 'STORED',
    bastDriveUrl: bastDriveUrl || targetCase.gDriveFolderUrl,
    createdAt: nowIso,
  };

  // 2. Create Payment / Revenue Record
  const newPayment: Payment = {
    id: `PAY-${Date.now()}`,
    paymentNo: `PAY-REV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    caseId: targetCase.id,
    caseNo: targetCase.caseNo,
    debtorName: targetCase.debtorName,
    amount: calcResult.grossRepossessionFee,
    paymentDate: todayDate,
    paymentType: 'ASSET_LIQUIDATION_PAYMENT',
    paymentMethod: 'TRANSFER',
    executionFeeAmount: calcResult.companyRevenueAmount,
    allocationSummary: `Pendapatan Fee Eksekusi Unit Perusahaan (${calcResult.companyFeePercent}%): Rp ${calcResult.companyRevenueAmount.toLocaleString('id-ID')}${
      calcResult.isMitraDC ? ` | Alokasi Komisi Mitra DC: Rp ${calcResult.partnerCommissionAmount.toLocaleString('id-ID')}` : ' | Pelaksana: Karyawan Internal'
    }`,
    verificationStatus: 'VERIFIED',
    verifiedBy: currentUser.name || currentUser.username,
    proofUrl: bastDriveUrl || targetCase.gDriveFolderUrl,
    createdAt: nowIso,
  };

  // 3. Create General Ledger Entry for Company Revenue
  const newLedgerEntry: LedgerEntry = {
    id: `LED-${Date.now()}`,
    entryNo: `JRN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    date: todayDate,
    account: 'REVENUE_FEE',
    type: 'CREDIT',
    amount: calcResult.companyRevenueAmount,
    referenceModule: 'SETTLEMENT',
    referenceId: newRecovery.id,
    description: `Pendapatan Fee Penyerahan Unit (${calcResult.appliedTierRuleName}) - Perkara ${targetCase.caseNo} (${targetCase.debtorName})`,
    createdAt: nowIso,
  };

  // 4. Update Case Status to 'CLOSED'
  const updatedCases = store.cases.map((c) => {
    if (c.id === targetCase.id) {
      return {
        ...c,
        status: 'CLOSED' as const,
      };
    }
    return c;
  });

  // 5. Audit Log
  const audit = createAuditEntry(
    currentUser.username,
    currentUser.role,
    'UPDATE',
    'Cases_AssetRecovery',
    targetCase.id,
    `Eksekusi Unit Sukses & Kasus ${targetCase.caseNo} DITUTUP (CLOSED). Pendapatan Perusahaan tercatat Rp ${calcResult.companyRevenueAmount.toLocaleString('id-ID')} (${calcResult.appliedTierRuleName}). ${
      calcResult.isMitraDC ? `Komisi Mitra DC siap ditransfer: Rp ${calcResult.partnerCommissionAmount.toLocaleString('id-ID')}` : ''
    }`
  );

  const updatedStore: ARMSStore = {
    ...store,
    cases: updatedCases,
    assetRecoveries: [newRecovery, ...(store.assetRecoveries || [])],
    payments: [newPayment, ...(store.payments || [])],
    ledger: [newLedgerEntry, ...(store.ledger || [])],
    auditLogs: [audit, ...(store.auditLogs || [])],
  };

  return {
    updatedStore,
    newRecovery,
    newPayment,
    newLedgerEntry,
  };
}
