import React, { useState, useEffect, useMemo } from 'react';
import { AmountInput } from '../common/AmountInput';
import { Pagination, usePagination } from '../common/Pagination';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Payment, LedgerEntry } from '../../types/arms';
import {
  DollarSign,
  Plus,
  CheckCircle,
  FileText,
  X,
  Edit2,
  Trash2,
  Send,
  UserCheck,
  Building2,
  Percent,
  Layers,
  Sparkles,
  ArrowRight,
  Landmark,
  Clock,
  ShieldCheck,
  Lock,
  Search,
} from 'lucide-react';
import { PaymentReceipt } from './PaymentReceipt';
import { SearchableSelect } from "../common/SearchableSelect";
import { TransferPartnerCommissionModal } from './TransferPartnerCommissionModal';
import { calculatePaymentTierFee, PaymentTierCalculationResult } from '../../utils/tierFeeCalculator';

interface PaymentsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [paymentType, setPaymentType] = useState<'FULL_PAYMENT' | 'PARTIAL_PAYMENT' | 'SETTLEMENT_NEGOTIATED'>('PARTIAL_PAYMENT');
  const [paymentMethod, setPaymentMethod] = useState<'TRANSFER' | 'CASH'>('TRANSFER');
  const [totalPaidByDebitur, setTotalPaidByDebitur] = useState(25000000);
  const [companySplitPercent, setCompanySplitPercent] = useState<number>(
    store.settings?.defaultCompanyCommissionSplitPercent ?? 20
  );
  const [customGrossFee, setCustomGrossFee] = useState<number | undefined>(undefined);
  const [manualSplits, setManualSplits] = useState<
    { name: string; amount: number; allocation: 'COMPANY' | 'SPLIT' }[]
  >([]);
  const [proofDriveUrl, setProofDriveUrl] = useState('');
  
  // Destination bank override states for Mitra DC
  const [partnerBankName, setPartnerBankName] = useState('');
  const [partnerAccountNo, setPartnerAccountNo] = useState('');
  const [partnerAccountName, setPartnerAccountName] = useState('');

  const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<Payment | null>(null);
  const [selectedPaymentForTransfer, setSelectedPaymentForTransfer] = useState<Payment | null>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'FINANCE_CONTROLLER' || currentUser.role === 'OPS_LEAD';

  // Available open/active cases (filter out CLOSED cases unless editing an existing payment for that case)
  const availableCases = useMemo(() => {
    return (store.cases || []).filter((c) => {
      if (isEditing && c.id === caseId) return true;
      return c.status !== 'CLOSED';
    });
  }, [store.cases, isEditing, caseId]);

  const selectedCase = useMemo(() => {
    return (store.cases || []).find((cs) => cs.id === caseId) || availableCases[0] || (store.cases || [])[0];
  }, [caseId, store.cases, availableCases]);

  const selectedClient = useMemo(() => {
    if (!selectedCase) return undefined;
    return (store.clients || []).find((cl) => cl.id === selectedCase.clientId || cl.name === selectedCase.clientName);
  }, [selectedCase, store.clients]);

  const selectedFeeConfig = useMemo(() => {
    if (!selectedCase) return undefined;
    const feesList = store.fees || [];
    return feesList.find(
      (fc) => fc.clientId === selectedCase.clientId || fc.serviceType === 'DESK_COLLECTION' || fc.serviceType === 'FIELD_COLLECTION'
    );
  }, [selectedCase, store.fees]);

  const assignedPersonnel = useMemo(() => {
    if (!selectedCase) return undefined;
    const assignment = (store.assignments || []).find((a) => a.caseId === selectedCase.id && a.status === 'ACTIVE');
    const personnelId = assignment?.personnelId || selectedCase.currentPersonnelId;
    return (store.personnel || []).find((p) => p.id === personnelId || p.fullName === selectedCase.currentPersonnelName);
  }, [selectedCase, store.assignments, store.personnel]);

  // Automated Tier Fee Calculation
  const tierCalcResult: PaymentTierCalculationResult = useMemo(() => {
    if (!selectedCase) {
      return {
        basisName: 'NONE',
        appliedTierRuleName: 'Standar DPD',
        tierPercent: 20,
        grossAgencyFee: Math.round(totalPaidByDebitur * 0.2),
        companyFeePercent: companySplitPercent,
        companyRevenueAmount: Math.round(totalPaidByDebitur * 0.2 * (companySplitPercent / 100)),
        partnerCommissionPercent: 100 - companySplitPercent,
        partnerCommissionAmount: Math.round(totalPaidByDebitur * 0.2 * ((100 - companySplitPercent) / 100)),
        isMitraDC: false,
        personnelType: 'KARYAWAN',
        personnelName: 'Petugas Internal',
        payoutStatus: 'NOT_APPLICABLE',
        explanationNotes: '',
      };
    }

    return calculatePaymentTierFee(
      {
        targetCase: selectedCase,
        client: selectedClient,
        feeConfig: selectedFeeConfig,
        personnel: assignedPersonnel,
        paymentAmount: totalPaidByDebitur,
        companySplitPercent,
        customGrossFee: customGrossFee && customGrossFee > 0 ? customGrossFee : undefined,
      },
      store.settings?.defaultCompanyCommissionSplitPercent ?? 20
    );
  }, [selectedCase, selectedClient, selectedFeeConfig, assignedPersonnel, totalPaidByDebitur, companySplitPercent, customGrossFee, store.settings]);

  const manualFeeTotals = useMemo(() => {
    const validItems = manualSplits.filter((item) => item.amount > 0);
    const total = validItems.reduce((sum, item) => sum + item.amount, 0);
    const splitCompany = tierCalcResult.isMitraDC ? companySplitPercent / 100 : 1;
    const splitPartner = tierCalcResult.isMitraDC ? 1 - companySplitPercent / 100 : 0;
    const company = validItems.reduce(
      (sum, item) => sum + item.amount * (item.allocation === 'SPLIT' ? splitCompany : 1),
      0,
    );
    const partner = validItems.reduce(
      (sum, item) => sum + item.amount * (item.allocation === 'SPLIT' ? splitPartner : 0),
      0,
    );
    return {
      total,
      company: Math.round(company),
      partner: Math.round(partner),
    };
  }, [manualSplits, tierCalcResult.isMitraDC, companySplitPercent]);

  const finalFeeTotals = useMemo(
    () => ({
      gross: tierCalcResult.grossAgencyFee + manualFeeTotals.total,
      company: tierCalcResult.companyRevenueAmount + manualFeeTotals.company,
      partner: tierCalcResult.partnerCommissionAmount + manualFeeTotals.partner,
    }),
    [tierCalcResult, manualFeeTotals],
  );

  // Sync bank details when assigned personnel changes
  useEffect(() => {
    if (assignedPersonnel) {
      if (!partnerBankName) setPartnerBankName(assignedPersonnel.bankName || 'BCA (Bank Central Asia)');
      if (!partnerAccountNo) setPartnerAccountNo(assignedPersonnel.accountNumber || '8830192831');
      if (!partnerAccountName) setPartnerAccountName(assignedPersonnel.accountName || assignedPersonnel.fullName);
    }
  }, [assignedPersonnel]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const c = selectedCase;

    const receiptNo =
      isEditing && editId
        ? store.payments.find((p) => p.id === editId)?.paymentNo || `PAY-2026-${Math.floor(100 + Math.random() * 900)}`
        : `PAY-2026-${Math.floor(100 + Math.random() * 900)}`;

    const grossFee = finalFeeTotals.gross;
    const companyRevenue = finalFeeTotals.company;
    const partnerCommAmount = finalFeeTotals.partner;

    const customSplitsStr =
      manualSplits.length > 0
        ? ', ' +
          manualSplits
            .map((s) => `${s.name}: Rp ${s.amount.toLocaleString('id-ID')} (${s.allocation === 'SPLIT' ? 'Split Mitra' : '100% Perusahaan'})`)
            .join(', ')
        : '';

    let updatedPayments = store.payments;
    let auditLogMessage = '';
    let updatedCases = store.cases;
    let updatedAssignments = store.assignments;
    let newLedgerEntries: LedgerEntry[] = [];

    const shouldClose = paymentType === 'FULL_PAYMENT' || paymentType === 'SETTLEMENT_NEGOTIATED';

    if (shouldClose && c) {
      updatedCases = store.cases.map((caseItem) =>
        caseItem.id === c.id ? { ...caseItem, status: 'CLOSED' as const } : caseItem
      );
      updatedAssignments = store.assignments.map((assignment) =>
        assignment.caseId === c.id ? { ...assignment, status: 'COMPLETED' as const } : assignment
      );
    }

    let newlyCreatedPayment: Payment | null = null;

    if (isEditing && editId) {
      updatedPayments = store.payments.map((p) =>
        p.id === editId
          ? {
              ...p,
              caseId: c?.id || p.caseId,
              caseNo: c?.caseNo || 'CAS-001',
              debtorName: c?.debtorName || 'Debtor',
              paymentType: 'DEBTOR_REPAYMENT',
              paymentMethod,
              totalPaidByDebitur,
              amount: totalPaidByDebitur,
              successFeeAmount: grossFee,
              executionFeeAmount: partnerCommAmount,
              proofUrl: proofDriveUrl,
              manualSplits,
              allocationSummary: `Tier: ${tierCalcResult.appliedTierRuleName} (${tierCalcResult.tierPercent}%) | Gross: Rp ${grossFee.toLocaleString('id-ID')} | Perusahaan: Rp ${companyRevenue.toLocaleString('id-ID')}${tierCalcResult.isMitraDC ? ` | Mitra DC: Rp ${partnerCommAmount.toLocaleString('id-ID')}` : ''}${customSplitsStr}`,
              personnelId: assignedPersonnel?.id,
              personnelName: assignedPersonnel?.fullName || c?.currentPersonnelName,
              personnelType: tierCalcResult.personnelType,
              tierAppliedName: tierCalcResult.appliedTierRuleName,
              tierAppliedBasis: tierCalcResult.basisName,
              tierPercent: tierCalcResult.tierPercent,
              grossAgencyFee: grossFee,
              companyFeePercent: tierCalcResult.companyFeePercent,
              companyRevenueAmount: companyRevenue,
              partnerCommissionPercent: tierCalcResult.partnerCommissionPercent,
              partnerCommissionAmount: partnerCommAmount,
              partnerBankName: partnerBankName || assignedPersonnel?.bankName,
              partnerAccountNo: partnerAccountNo || assignedPersonnel?.accountNumber,
              partnerAccountName: partnerAccountName || assignedPersonnel?.accountName,
            }
          : p
      );
      auditLogMessage = `Updated Debtor Payment ${receiptNo} with automated tier split`;
    } else {
      const newPayment: Payment = {
        id: `PAY-${Date.now()}`,
        paymentNo: receiptNo,
        caseId: c?.id || '',
        caseNo: c?.caseNo || 'CAS-001',
        debtorName: c?.debtorName || 'Debtor',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: totalPaidByDebitur,
        paymentType: 'DEBTOR_REPAYMENT',
        paymentMethod,
        totalPaidByDebitur,
        successFeeAmount: grossFee,
        executionFeeAmount: partnerCommAmount,
        passThroughFee: 0,
        proofUrl: proofDriveUrl,
        manualSplits,
        allocationSummary: `Tier: ${tierCalcResult.appliedTierRuleName} (${tierCalcResult.tierPercent}%) | Gross: Rp ${grossFee.toLocaleString('id-ID')} | Perusahaan (${tierCalcResult.companyFeePercent}%): Rp ${companyRevenue.toLocaleString('id-ID')}${tierCalcResult.isMitraDC ? ` | Mitra DC: Rp ${partnerCommAmount.toLocaleString('id-ID')}` : ''}${customSplitsStr}`,
        verificationStatus: 'VERIFIED',
        verifiedBy: currentUser.name || currentUser.username,
        
        // Automated Tier & Partner Commission
        personnelId: assignedPersonnel?.id,
        personnelName: assignedPersonnel?.fullName || c?.currentPersonnelName,
        personnelType: tierCalcResult.personnelType,
        tierAppliedName: tierCalcResult.appliedTierRuleName,
        tierAppliedBasis: tierCalcResult.basisName,
        tierPercent: tierCalcResult.tierPercent,
        grossAgencyFee: grossFee,
        companyFeePercent: tierCalcResult.companyFeePercent,
        companyRevenueAmount: companyRevenue,
        partnerCommissionPercent: tierCalcResult.partnerCommissionPercent,
        partnerCommissionAmount: partnerCommAmount,
        partnerPayoutStatus: tierCalcResult.payoutStatus,
        partnerBankName: partnerBankName || assignedPersonnel?.bankName,
        partnerAccountNo: partnerAccountNo || assignedPersonnel?.accountNumber,
        partnerAccountName: partnerAccountName || assignedPersonnel?.accountName,
        
        createdAt: new Date().toISOString(),
      };

      newlyCreatedPayment = newPayment;
      updatedPayments = [newPayment, ...store.payments];

      // 1. Ledger Entry: Cash Inflow from Debtor
      const ledgerEntry1: LedgerEntry = {
        id: `LDG-PAY1-${Date.now()}`,
        entryNo: `LDG-2026-PAY-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        account: 'CASH',
        type: 'DEBIT',
        amount: totalPaidByDebitur,
        referenceModule: 'PAYMENT',
        referenceId: newPayment.id,
        description: `Debtor Payment Receipt ${receiptNo} for ${c?.caseNo} (${c?.debtorName})`,
        createdAt: new Date().toISOString(),
      };

      // 2. Ledger Entry: Company Revenue Recognized
      const ledgerEntry2: LedgerEntry = {
        id: `LDG-PAY2-${Date.now()}`,
        entryNo: `LDG-2026-REV-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
        account: 'REVENUE_FEE',
        type: 'CREDIT',
        amount: companyRevenue,
        referenceModule: 'PAYMENT',
        referenceId: newPayment.id,
        description: `Revenue Recognized (${tierCalcResult.companyFeePercent}% fee share on ${receiptNo} - ${tierCalcResult.appliedTierRuleName})`,
        createdAt: new Date().toISOString(),
      };

      newLedgerEntries = [ledgerEntry1, ledgerEntry2];
      auditLogMessage = `Recorded Debtor Payment ${receiptNo} Rp ${totalPaidByDebitur.toLocaleString('id-ID')} - Company Revenue: Rp ${companyRevenue.toLocaleString('id-ID')}, Mitra DC Commission: Rp ${partnerCommAmount.toLocaleString('id-ID')}`;
    }

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      isEditing ? 'UPDATE' : 'PAYMENT',
      'Payments',
      editId || newlyCreatedPayment?.id || `PAY-${Date.now()}`,
      auditLogMessage
    );

    const newStore: ARMSStore = {
      ...store,
      cases: updatedCases,
      assignments: updatedAssignments,
      payments: updatedPayments,
      ledger: [...newLedgerEntries, ...store.ledger],
      auditLogs: [audit, ...store.auditLogs],
    };

    onUpdateStore(newStore);
    setShowModal(false);
    resetForm();

    // If recorded via Mitra DC with pending commission transfer, prompt transfer modal immediately!
    if (newlyCreatedPayment && tierCalcResult.isMitraDC && partnerCommAmount > 0) {
      setSelectedPaymentForTransfer(newlyCreatedPayment);
    }
  };

  const handleEditClick = (p: Payment) => {
    setCaseId(p.caseId);
    setPaymentType((p.paymentType as any) || 'PARTIAL_PAYMENT');
    setPaymentMethod(p.paymentMethod || 'TRANSFER');
    setTotalPaidByDebitur(p.totalPaidByDebitur || p.amount);
    setCompanySplitPercent(p.companyFeePercent ?? (store.settings?.defaultCompanyCommissionSplitPercent ?? 20));
    setCustomGrossFee(p.grossAgencyFee);
    setManualSplits(p.manualSplits || []);
    setProofDriveUrl(p.proofUrl || '');
    setPartnerBankName(p.partnerBankName || '');
    setPartnerAccountNo(p.partnerAccountNo || '');
    setPartnerAccountName(p.partnerAccountName || '');
    setEditId(p.id);
    setIsEditing(true);
    setShowModal(true);
  };

  const handleDeleteClick = (id: string) => {
    if (confirm('Are you sure you want to delete this payment? Note: Ledger entries are not automatically deleted.')) {
      const existingPayment = store.payments.find((p) => p.id === id);
      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'DELETE',
        'Payments',
        id,
        `Deleted Payment ${existingPayment?.paymentNo}`
      );
      onUpdateStore({
        ...store,
        payments: store.payments.filter((p) => p.id !== id),
        auditLogs: [audit, ...store.auditLogs],
      });
    }
  };

  const resetForm = () => {
    setCaseId(availableCases[0]?.id || store.cases[0]?.id || '');
    setPaymentType('PARTIAL_PAYMENT');
    setPaymentMethod('TRANSFER');
    setTotalPaidByDebitur(25000000);
    setCompanySplitPercent(store.settings?.defaultCompanyCommissionSplitPercent ?? 20);
    setCustomGrossFee(undefined);
    setManualSplits([]);
    setProofDriveUrl('');
    setPartnerBankName('');
    setPartnerAccountNo('');
    setPartnerAccountName('');
    setEditId(null);
    setIsEditing(false);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [transferFilter, setTransferFilter] = useState<'ALL' | 'TRANSFERRED' | 'PENDING_TRANSFER' | 'INTERNAL'>('ALL');

  const filteredPayments = useMemo(() => {
    return (store.payments || []).filter((p) => {
      const term = searchTerm.toLowerCase().trim();
      const parentCase = store.cases.find((c) => c.id === p.caseId || c.caseNo === p.caseNo);
      const matchesSearch =
        !term ||
        p.receiptNo.toLowerCase().includes(term) ||
        p.caseNo.toLowerCase().includes(term) ||
        (parentCase?.debtorName && parentCase.debtorName.toLowerCase().includes(term)) ||
        (p.partnerName && p.partnerName.toLowerCase().includes(term));

      if (!matchesSearch) return false;

      if (transferFilter === 'ALL') return true;
      if (transferFilter === 'INTERNAL') return p.personnelType !== 'MITRA_DC' || !p.partnerCommissionAmount;
      if (transferFilter === 'TRANSFERRED') return p.personnelType === 'MITRA_DC' && p.partnerPayoutStatus === 'TRANSFERRED';
      if (transferFilter === 'PENDING_TRANSFER') return p.personnelType === 'MITRA_DC' && p.partnerPayoutStatus === 'PENDING_TRANSFER';
      return true;
    });
  }, [store.payments, store.cases, searchTerm, transferFilter]);

  const paymentPagination = usePagination<Payment>(filteredPayments, 10);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="p-2 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
            <h2 className="text-xl font-bold text-white">Debtor Payments & Fee Collections</h2>
          </div>
          <p className="text-xs text-slate-400">
            Perhitungan otomatis Success Fee berbasis Tiering, Pembukuan Pendapatan Perusahaan, dan Transfer Komisi Mitra DC
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md shadow-emerald-950/40 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record Debtor Payment</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-lg overflow-x-auto">
          {(
            [
              { key: 'ALL', label: 'Semua Pembayaran' },
              { key: 'TRANSFERRED', label: 'Komisi Ditransfer' },
              { key: 'PENDING_TRANSFER', label: 'Pending Transfer' },
              { key: 'INTERNAL', label: 'Internal PT' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTransferFilter(t.key);
                paymentPagination.setPage(1);
              }}
              className={`px-2.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition ${
                transferFilter === t.key
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari kuitansi, kasus, debitur, mitra..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              paymentPagination.setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Receipt No & Date</th>
                <th className="py-2.5 px-3">Case & Debtor</th>
                <th className="py-2.5 px-3 text-right">Payment Amount</th>
                <th className="py-2.5 px-3">Fee Perusahaan (Tier)</th>
                <th className="py-2.5 px-3">Mitra DC & Komisi</th>
                <th className="py-2.5 px-3 text-center">Status Transfer</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {paymentPagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                    {store.payments.length === 0
                      ? 'Belum ada data pembayaran debitur. Klik tombol + Record Debtor Payment untuk mencatat penerimaan.'
                      : 'Tidak ada data pembayaran yang sesuai dengan filter atau pencarian.'}
                  </td>
                </tr>
              ) : (
                paymentPagination.pageItems.map((p) => {
                  const targetCase = store.cases.find((c) => c.id === p.caseId || c.caseNo === p.caseNo);
                  const isMitra = p.personnelType === 'MITRA_DC' || (!p.personnelType && (p.executionFeeAmount || 0) > 0);
                  const partnerAmount = p.partnerCommissionAmount ?? (isMitra ? p.executionFeeAmount || 0 : 0);
                  const companyAmount = p.companyRevenueAmount ?? (p.successFeeAmount || Math.round(p.amount * 0.2));
                  const isTransferred = p.partnerPayoutStatus === 'TRANSFERRED';
                  const isPending = isMitra && partnerAmount > 0 && !isTransferred;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3">
                        <div className="font-mono font-bold text-emerald-400">{p.paymentNo}</div>
                        <div className="text-[11px] text-slate-500">{p.paymentDate}</div>
                      </td>

                      <td className="py-2.5 px-3 space-y-0.5">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{p.caseNo}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {targetCase?.clientName || 'Multifinance'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300">
                          {targetCase?.status === 'CLOSED' ? (
                            <span className="text-slate-400 italic inline-flex items-center gap-1 font-normal">
                              <Lock className="w-3 h-3 text-slate-400" /> [Kasus Ditutup]
                            </span>
                          ) : (
                            p.debtorName
                          )}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="font-bold text-emerald-400 font-mono text-sm">
                          Rp {p.amount.toLocaleString('id-ID')}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">{p.paymentMethod}</div>
                      </td>

                      <td className="py-2.5 px-3 space-y-0.5">
                        <div className="font-bold text-indigo-300 font-mono">
                          Rp {companyAmount.toLocaleString('id-ID')}
                          {p.companyFeePercent ? (
                            <span className="text-[10px] text-slate-400 font-normal ml-1">({p.companyFeePercent}%)</span>
                          ) : null}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                          {p.tierAppliedName || 'Standar Fee Kolektibilitas'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 space-y-0.5">
                        {isMitra ? (
                          <>
                            <div className="flex items-center gap-1 text-white font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                              <span>{p.personnelName || 'Mitra DC Freelance'}</span>
                            </div>
                            <div className="text-amber-400 font-mono font-bold text-[11px]">
                              Rp {partnerAmount.toLocaleString('id-ID')}
                              {p.partnerCommissionPercent ? (
                                <span className="text-[10px] text-slate-400 font-normal ml-1">({p.partnerCommissionPercent}%)</span>
                              ) : null}
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                            <span>Karyawan Internal (100% PT)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {isMitra && partnerAmount > 0 ? (
                          isTransferred ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-950/80 text-emerald-300 text-[10px] px-2 py-1 rounded-full border border-emerald-800 font-semibold">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span>Ditransfer</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 text-[10px] px-2 py-1 rounded-full border border-amber-800 font-semibold animate-pulse">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span>Belum Transfer</span>
                            </span>
                          )
                        ) : (
                          <span className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.5 rounded-full border border-slate-700">
                            Internal PT
                          </span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Transfer Partner Button */}
                          {isMitra && partnerAmount > 0 && (
                            <button
                              onClick={() => setSelectedPaymentForTransfer(p)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition cursor-pointer shadow-sm ${
                                isTransferred
                                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                                  : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-emerald-950/50'
                              }`}
                              title={isTransferred ? 'Lihat Bukti Transfer Komisi' : 'Transfer Komisi ke Rekening Mitra DC'}
                            >
                              <Send className="w-3 h-3" />
                              <span>{isTransferred ? 'Voucher' : 'Transfer'}</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedPaymentForReceipt(p)}
                            className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-800 transition"
                            title="Cetak Kuitansi Resmi"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleEditClick(p)}
                                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                                title="Edit Pembayaran"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(p.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition"
                                title="Hapus Pembayaran"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={paymentPagination.page}
          totalPages={paymentPagination.totalPages}
          totalItems={paymentPagination.totalItems}
          pageSize={paymentPagination.pageSize}
          onPageChange={paymentPagination.setPage}
          onPageSizeChange={paymentPagination.setPageSize}
        />
      </div>

      {/* Modal: Official Receipt */}
      {selectedPaymentForReceipt && (
        <PaymentReceipt
          payment={selectedPaymentForReceipt}
          onClose={() => setSelectedPaymentForReceipt(null)}
        />
      )}

      {/* Modal: Transfer Partner Commission */}
      {selectedPaymentForTransfer && (
        <TransferPartnerCommissionModal
          payment={selectedPaymentForTransfer}
          store={store}
          currentUser={currentUser}
          onClose={() => setSelectedPaymentForTransfer(null)}
          onSuccess={(updatedStore) => {
            onUpdateStore(updatedStore);
          }}
          onUpdateStore={onUpdateStore}
        />
      )}

      {/* Modal: Record Debtor Payment with Automated Tier Fee */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-3 overflow-y-auto">
          <form
            onSubmit={handleRecordPayment}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-3.5 sm:p-4 space-y-2.5 shadow-2xl max-h-[90vh] overflow-y-auto my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-950/80 border border-emerald-800 rounded-lg text-emerald-400">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {isEditing ? 'Edit Debtor Payment' : 'Penerimaan Dana & Perhitungan Fee Tiering'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Otomatisasi kalkulasi Success Fee & bagi hasil komisi Mitra DC
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Case Selector */}
            <div className="relative z-[60]">
              <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                Pilih Kasus / Perkara Debitur <span className="text-rose-400">*</span>
              </label>
              <SearchableSelect
                value={caseId}
                onChange={setCaseId}
                options={availableCases.map((c) => {
                  const isClosed = c.status === 'CLOSED';
                  const cat = c.clientType === 'PERORANGAN' ? 'PERORANGAN' : 'MULTIFINANCE';
                  const debtorName = isClosed ? '[Kasus Ditutup]' : c.debtorName;
                  return {
                    value: c.id,
                    label: `[${cat}] ${c.caseNo} — ${debtorName}`,
                    subLabel: `Klien: ${c.clientName} | DPD: ${c.overdueDays} Hari | Petugas: ${c.currentPersonnelName || 'Belum ditugaskan'}`
                  };
                })}
              />
            </div>

            {/* Debtor & Personnel Badge Banner */}
            {selectedCase && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-2.5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Klien & Status Tunggakan</span>
                  <span className="font-bold text-white">{selectedCase.clientName}</span>
                  <span className="text-slate-400 block text-[11px]">DPD: {selectedCase.overdueDays} Hari (Kolektibilitas {selectedCase.overdueDays > 90 ? 'Macet/NPL' : 'Perhatian Khusus'})</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block uppercase font-bold">Petugas Pelaksana</span>
                  <span className="font-bold text-indigo-300">{assignedPersonnel?.fullName || selectedCase.currentPersonnelName || 'Petugas Lapangan'}</span>
                  <span className="text-[11px] block">
                    {assignedPersonnel?.type === 'MITRA_DC' ? (
                      <span className="text-amber-400 font-bold">Mitra DC Freelance (Berhak Komisi)</span>
                    ) : (
                      <span className="text-slate-400">Karyawan Internal (Fee 100% PT)</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Amount & Method */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                  Nominal Diterima Dari Debitur (Rp) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">Rp</span>
                  <AmountInput
                    required
                    value={totalPaidByDebitur}
                    onChange={setTotalPaidByDebitur}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">Metode Pembayaran</label>
                <SearchableSelect 
                  value={paymentMethod}
                  onChange={(val) => setPaymentMethod(val as any)}
                  searchable={false}
                  options={[
                    { value: 'TRANSFER', label: 'Transfer Bank (Rekening Penampung PT)' },
                    { value: 'CASH', label: 'Tunai / Cash Kwitansi Lapangan' },
                  ]}
                />
              </div>
            </div>

            {/* Automated Tiering Calculation Breakdown Box */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-900 border border-indigo-900/60 rounded-xl p-3 space-y-3.5 shadow-inner">
              <div className="flex items-center justify-between border-b border-indigo-900/50 pb-1.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  <h4 className="text-xs font-bold text-indigo-200">Kalkulasi Otomatis Fee & Bagi Hasil</h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono font-bold">
                  {tierCalcResult.appliedTierRuleName}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {/* Gross Fee */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                    Gross Success Fee ({tierCalcResult.tierPercent}%):
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-2 text-[11px] text-slate-400 font-mono">Rp</span>
                    <AmountInput
                      value={finalFeeTotals.gross}
                      onChange={setCustomGrossFee}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Total tagihan fee ke klien</span>
                </div>

                {/* Company Split % */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold flex items-center justify-between">
                    <span>Fee Perusahaan (%):</span>
                    <span className="text-indigo-300 text-[9px]">Dapat Diatur</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={companySplitPercent}
                      onChange={(e) => setCompanySplitPercent(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pr-7 pl-3 py-1.5 text-xs text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-2.5 top-2 text-[11px] text-slate-400 font-mono">%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-0.5 block">Default perusahaan: 20%</span>
                </div>

                {/* Company Revenue Nominal */}
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5 font-semibold">
                    Pendapatan Perusahaan:
                  </label>
                  <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-lg px-2.5 py-1.5 text-emerald-400 font-mono font-bold text-xs">
                    Rp {finalFeeTotals.company.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[9px] text-emerald-500 mt-0.5 block">Otomatis masuk ke Jurnal Pendapatan</span>
                </div>
              </div>

              {/* Mitra DC Commission Sub-block */}
              {tierCalcResult.isMitraDC ? (
                <div className="bg-amber-950/40 border border-amber-900/60 rounded-xl p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs font-bold text-amber-300">
                        Hak Komisi Mitra DC ({tierCalcResult.partnerCommissionPercent}%):
                      </span>
                    </div>
                    <span className="font-mono font-bold text-amber-300 text-sm">
                      Rp {finalFeeTotals.partner.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <p className="text-[11px] text-amber-200/80">
                    Setelah disimpan, sistem akan langsung membuka <strong>Form Transfer Komisi</strong> untuk konfirmasi rekening tujuan ({assignedPersonnel?.bankName || 'BCA'}) dan bukti transfer.
                  </p>
                </div>
              ) : (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-2 text-slate-400 text-[11px] flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    Penanganan oleh Karyawan Internal. 100% Gross Fee Rp {finalFeeTotals.gross.toLocaleString('id-ID')} dicatat sebagai Pendapatan Perusahaan tanpa potongan komisi mitra luar.
                  </span>
                </div>
              )}

              <div className="border-t border-indigo-900/50 pt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Biaya Tambahan Manual</h4>
                    <p className="text-[10px] text-slate-500">Tambahkan biaya di luar kalkulasi fee tiering.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setManualSplits((items) => [...items, { name: '', amount: 0, allocation: 'COMPANY' }])
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-700 bg-indigo-950/70 px-2 py-1.5 text-[11px] font-semibold text-indigo-200 hover:bg-indigo-900"
                  >
                    <Plus className="h-3 w-3" /> Tambah Biaya
                  </button>
                </div>
                {manualSplits.map((item, index) => (
                  <div key={index} className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-2 sm:grid-cols-[1fr_130px_145px_auto]">
                    <input
                      value={item.name}
                      onChange={(e) =>
                        setManualSplits((items) =>
                          items.map((current, itemIndex) => itemIndex === index ? { ...current, name: e.target.value } : current),
                        )
                      }
                      placeholder="Nama biaya, contoh: Biaya Tarik"
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
                    />
                    <AmountInput
                      value={item.amount}
                      onChange={(amount) =>
                        setManualSplits((items) =>
                          items.map((current, itemIndex) => itemIndex === index ? { ...current, amount } : current),
                        )
                      }
                      className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-emerald-300 focus:border-indigo-500 focus:outline-none"
                    />
                    <select
                      value={item.allocation}
                      onChange={(e) =>
                        setManualSplits((items) =>
                          items.map((current, itemIndex) => itemIndex === index ? { ...current, allocation: e.target.value as 'COMPANY' | 'SPLIT' } : current),
                        )
                      }
                      className="rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="COMPANY">100% Hak Perusahaan</option>
                      <option value="SPLIT">Split dengan Mitra</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setManualSplits((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950/50 hover:text-red-300"
                      title="Hapus biaya"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {manualFeeTotals.total > 0 && (
                  <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-400 sm:grid-cols-3">
                    <span>Tambahan: <b className="text-white">Rp {manualFeeTotals.total.toLocaleString('id-ID')}</b></span>
                    <span>Perusahaan: <b className="text-emerald-400">Rp {manualFeeTotals.company.toLocaleString('id-ID')}</b></span>
                    <span>Mitra: <b className="text-amber-400">Rp {manualFeeTotals.partner.toLocaleString('id-ID')}</b></span>
                  </div>
                )}
              </div>
            </div>

            {/* Classification & Closing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                  Klasifikasi Status Kasus
                </label>
                <SearchableSelect 
                  value={paymentType}
                  onChange={(val) => setPaymentType(val as any)}
                  searchable={false}
                  options={[
                    { value: 'PARTIAL_PAYMENT', label: 'Angsuran / Partial Payment (Kasus Tetap Open)' },
                    { value: 'FULL_PAYMENT', label: 'Pelunasan / Full Payment (Otomatis CLOSE Kasus)' },
                    { value: 'SETTLEMENT_NEGOTIATED', label: 'Settlement Negosiasi (Otomatis CLOSE Kasus)' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-0.5">
                  Bukti Transfer / Dokumen (URL Drive)
                </label>
                <input
                  type="text"
                  value={proofDriveUrl}
                  onChange={(e) => setProofDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-950/50 transition cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Simpan Perubahan' : 'Konfirmasi & Bukukan Pendapatan'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
