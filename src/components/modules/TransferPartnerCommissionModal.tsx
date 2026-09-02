import { SearchableSelect } from "../common/SearchableSelect";
import React, { useState, useEffect } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, AssetRecovery, Payment, Expense, LedgerEntry } from '../../types/arms';
import {
  DollarSign,
  UserCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  CreditCard,
  ExternalLink,
  X,
  FileCheck,
  Send,
  Lock,
  ArrowRight,
  Landmark,
  Percent
} from 'lucide-react';

interface TransferPartnerCommissionModalProps {
  recovery?: AssetRecovery | null;
  payment?: Payment | null;
  store: ARMSStore;
  currentUser: User;
  onClose: () => void;
  onUpdateStore?: (newStore: ARMSStore) => void;
  onSuccess?: (newStore: ARMSStore) => void;
}

export const TransferPartnerCommissionModal: React.FC<TransferPartnerCommissionModalProps> = ({
  recovery,
  payment,
  store,
  currentUser,
  onClose,
  onUpdateStore,
  onSuccess,
}) => {
  const isPayment = Boolean(payment && !recovery);
  const targetCaseId = payment?.caseId || recovery?.caseId;
  const targetCaseNo = payment?.caseNo || recovery?.caseNo;

  const targetCase = store.cases.find(
    (c) => c.id === targetCaseId || c.caseNo === targetCaseNo
  );
  const effectiveCaseNo = targetCase?.caseNo || targetCaseNo || 'CASE-GENERAL';

  const targetPersonnelId = payment?.personnelId || recovery?.personnelId || targetCase?.currentPersonnelId;
  const targetPersonnelName = payment?.personnelName || recovery?.personnelName || targetCase?.currentPersonnelName;

  const targetPersonnel = store.personnel.find(
    (p) => p.id === targetPersonnelId || (targetPersonnelName && p.fullName.toLowerCase() === targetPersonnelName.toLowerCase())
  );

  const defaultCompanyPercent = store.settings?.defaultCompanyCommissionSplitPercent ?? 20;

  // Initial calculation values
  const initialGrossFee = isPayment
    ? (payment?.grossAgencyFee || payment?.successFeeAmount || (payment ? Math.round(payment.amount * 0.2) : 5000000))
    : (recovery?.repossessionFee || 10000000);

  const initialCompanyPercent = isPayment
    ? (payment?.companyFeePercent ?? defaultCompanyPercent)
    : (recovery?.companyFeePercent ?? defaultCompanyPercent);

  const initialCompanyAmount = isPayment
    ? (payment?.companyRevenueAmount ?? Math.round((initialCompanyPercent / 100) * initialGrossFee))
    : (recovery?.companyFeeAmount ?? Math.round((initialCompanyPercent / 100) * initialGrossFee));

  const initialPartnerAmount = isPayment
    ? (payment?.partnerCommissionAmount ?? Math.max(0, initialGrossFee - initialCompanyAmount))
    : (recovery?.partnerCommissionAmount ?? Math.max(0, initialGrossFee - initialCompanyAmount));

  // Form states
  const [grossFee, setGrossFee] = useState<number>(initialGrossFee);
  const [companyPercent, setCompanyPercent] = useState<number>(initialCompanyPercent);
  const [companyAmount, setCompanyAmount] = useState<number>(initialCompanyAmount);
  const [partnerAmount, setPartnerAmount] = useState<number>(initialPartnerAmount);

  // Bank & Destination states
  const [bankName, setBankName] = useState(
    payment?.partnerBankName || recovery?.partnerBankName || targetPersonnel?.bankName || 'BCA (Bank Central Asia)'
  );
  const [accountNumber, setAccountNumber] = useState(
    payment?.partnerAccountNo || recovery?.partnerAccountNo || targetPersonnel?.accountNumber || '8830192831'
  );
  const [accountName, setAccountName] = useState(
    payment?.partnerAccountName || recovery?.partnerAccountName || targetPersonnel?.accountName || targetPersonnelName || 'Mitra DC'
  );

  // Source Cash Account
  const operationalCashAccount = store.cashAccounts.find(
    (acc) => acc.type === 'OPERATIONAL' || acc.accountName.toLowerCase().includes('operasional')
  ) || store.cashAccounts[0];

  const [selectedCashAccountId, setSelectedCashAccountId] = useState(operationalCashAccount?.id || '');
  const [transferRef, setTransferRef] = useState(`TRF-DC-${Date.now().toString().slice(-6)}`);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferProofUrl, setTransferProofUrl] = useState(
    payment?.partnerTransferProofUrl || payment?.proofUrl || recovery?.partnerTransferProofUrl || recovery?.bastDriveUrl || ''
  );
  const [notes, setNotes] = useState(
    isPayment
      ? `Transfer Komisi Penerimaan Dana Kasus ${targetCaseNo || payment?.paymentNo} (${targetCase?.debtorName || payment?.debtorName || 'Debitur'}) kepada Mitra DC ${targetPersonnelName || 'Mitra DC'}`
      : `Transfer Komisi Eksekusi Unit Kasus ${targetCaseNo || recovery?.recoveryNo} (${targetCase?.debtorName || 'Debitur'}) kepada Mitra DC ${targetPersonnelName || 'Mitra DC'}`
  );
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Recalculate amounts whenever gross fee or company % changes
  const handlePercentChange = (newPercent: number) => {
    const validPct = Math.max(0, Math.min(100, newPercent));
    setCompanyPercent(validPct);
    const compAmt = Math.round((validPct / 100) * grossFee);
    setCompanyAmount(compAmt);
    setPartnerAmount(Math.max(0, grossFee - compAmt));
  };

  const handleGrossFeeChange = (newGross: number) => {
    setGrossFee(newGross);
    const compAmt = Math.round((companyPercent / 100) * newGross);
    setCompanyAmount(compAmt);
    setPartnerAmount(Math.max(0, newGross - compAmt));
  };

  const selectedCashAccount = store.cashAccounts.find((a) => a.id === selectedCashAccountId);

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (partnerAmount <= 0) {
      setErrorMessage('Nominal komisi transfer ke mitra DC harus lebih besar dari Rp 0.');
      return;
    }

    if (selectedCashAccount && selectedCashAccount.balance < partnerAmount) {
      if (!window.confirm(`PERINGATAN: Saldo pada akun ${selectedCashAccount.accountName} (Rp ${selectedCashAccount.balance.toLocaleString('id-ID')}) kurang dari nominal transfer (Rp ${partnerAmount.toLocaleString('id-ID')}). Tetap lanjutkan transaksi?`)) {
        return;
      }
    }

    const nowIso = new Date().toISOString();
    const effectiveCaseNo = targetCaseNo || (isPayment ? payment?.caseNo : recovery?.caseNo) || 'CAS-001';
    const effectivePersonnelName = targetPersonnelName || (isPayment ? payment?.personnelName : recovery?.personnelName) || 'Mitra DC';

    // 1. Create Expense Record (category: COMMISSION_PARTNER)
    const newExpense: Expense = {
      id: `EXP-${Date.now()}`,
      expenseNo: `EXP-DC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      caseId: targetCaseId,
      caseNo: effectiveCaseNo,
      category: 'COMMISSION_PARTNER',
      amount: partnerAmount,
      requestedBy: currentUser.name || currentUser.username || 'Finance Admin',
      expenseDate: transferDate,
      description: `[Transfer Komisi Mitra DC] ${notes} | Bank: ${bankName} No. Rek: ${accountNumber} a/n ${accountName} (Ref: ${transferRef})`,
      status: 'PAID',
      approvedBy: currentUser.name || currentUser.username,
      approvedAt: nowIso,
      driveReceiptUrl: transferProofUrl,
      createdAt: nowIso,
    };

    // 2. Create Ledger Entry for Expense
    const newLedgerEntry: LedgerEntry = {
      id: `LED-${Date.now()}`,
      entryNo: `JRN-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
      date: transferDate,
      account: 'EXPENSE_OPS',
      type: 'DEBIT',
      amount: partnerAmount,
      referenceModule: 'EXPENSE',
      referenceId: newExpense.id,
      description: `Biaya Komisi Mitra DC (${isPayment ? 'Penerimaan Dana' : 'Eksekusi Unit'}): ${effectivePersonnelName} (${effectiveCaseNo}) - Ref: ${transferRef}`,
      createdAt: nowIso,
    };

    // 3. Deduct balance from selected Cash Account
    const updatedCashAccounts = store.cashAccounts.map((acc) => {
      if (acc.id === selectedCashAccountId) {
        return {
          ...acc,
          balance: acc.balance - partnerAmount,
          lastUpdated: nowIso,
        };
      }
      return acc;
    });

    // 4. Update Payment or AssetRecovery record
    let updatedPayments = store.payments;
    let updatedRecoveries = store.assetRecoveries;

    if (isPayment && payment) {
      updatedPayments = store.payments.map((p) => {
        if (p.id === payment.id) {
          return {
            ...p,
            grossAgencyFee: grossFee,
            companyFeePercent: companyPercent,
            companyRevenueAmount: companyAmount,
            partnerCommissionPercent: 100 - companyPercent,
            partnerCommissionAmount: partnerAmount,
            partnerPayoutStatus: 'TRANSFERRED' as const,
            partnerTransferDate: transferDate,
            partnerTransferRef: transferRef,
            partnerTransferProofUrl: transferProofUrl,
            partnerBankName: bankName,
            partnerAccountNo: accountNumber,
            partnerAccountName: accountName,
            paidFromCashAccountId: selectedCashAccountId,
          };
        }
        return p;
      });
    } else if (recovery) {
      updatedRecoveries = (store.assetRecoveries || []).map((r) => {
        if (r.id === recovery.id) {
          return {
            ...r,
            repossessionFee: grossFee,
            companyFeePercent: companyPercent,
            companyFeeAmount: companyAmount,
            partnerCommissionAmount: partnerAmount,
            partnerPayoutStatus: 'TRANSFERRED' as const,
            partnerTransferDate: transferDate,
            partnerTransferRef: transferRef,
            partnerTransferProofUrl: transferProofUrl,
            partnerBankName: bankName,
            partnerAccountNo: accountNumber,
            partnerAccountName: accountName,
            paidFromCashAccountId: selectedCashAccountId,
          };
        }
        return r;
      });
    }

    // 5. Audit Log Entry
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'PAYMENT',
      isPayment ? 'Payments_PartnerPayout' : 'AssetRecovery_PartnerPayout',
      (isPayment ? payment?.id : recovery?.id) || `PAYOUT-${Date.now()}`,
      `Transfer Komisi Mitra DC Rp ${partnerAmount.toLocaleString('id-ID')} kepada ${effectivePersonnelName} untuk kasus ${effectiveCaseNo} (Fee Perusahaan ${companyPercent}% = Rp ${companyAmount.toLocaleString('id-ID')})`
    );

    const updatedStore: ARMSStore = {
      ...store,
      payments: updatedPayments,
      assetRecoveries: updatedRecoveries,
      expenses: [newExpense, ...(store.expenses || [])],
      ledger: [newLedgerEntry, ...(store.ledger || [])],
      cashAccounts: updatedCashAccounts,
      auditLogs: [audit, ...(store.auditLogs || [])],
    };

    if (onUpdateStore) {
      onUpdateStore(updatedStore);
    }
    if (onSuccess) {
      onSuccess(updatedStore);
    }
    setIsSuccess(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/70 border-b border-slate-800 p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-950/90 border border-emerald-800/80 rounded-xl text-emerald-300 shadow-inner">
              <DollarSign className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Transfer Komisi Mitra DC ({isPayment ? 'Penerimaan Dana' : 'Eksekusi Unit'})</span>
                <span className="px-2 py-0.5 bg-amber-950/80 text-amber-300 border border-amber-800 text-[10px] font-bold rounded-full">
                  MITRA DC FREELANCE
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {isPayment 
                  ? 'Penyaluran bagi hasil komisi penagihan / penerimaan angsuran debitur kepada mitra penagihan'
                  : 'Penyaluran bagi hasil penarikan unit kepada mitra penagihan eksternal'}
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

        {isSuccess ? (
          <div className="p-8 text-center space-y-5">
            <div className="w-16 h-16 bg-emerald-950 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-400 shadow-lg shadow-emerald-950/60">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-lg font-bold text-white">Transfer Komisi Berhasil Diproses!</h4>
              <p className="text-xs text-slate-300 max-w-md mx-auto">
                Dana komisi sebesar <strong className="text-emerald-400 font-mono">Rp {partnerAmount.toLocaleString('id-ID')}</strong> telah berhasil dibukukan pada pengeluaran kas operasional dan disalurkan ke rekening Mitra DC <strong className="text-white">{targetPersonnelName || 'Mitra DC'}</strong>.
              </p>
            </div>

            {/* Voucher Slip Summary */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left max-w-md mx-auto space-y-2 text-xs font-mono">
              <div className="flex justify-between border-b border-slate-800 pb-2">
                <span className="text-slate-400">Nomor Referensi:</span>
                <span className="text-indigo-300 font-bold">{transferRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Penerima (Mitra DC):</span>
                <span className="text-white font-bold">{accountName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rekening Tujuan:</span>
                <span className="text-slate-200">{bankName} - {accountNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">{isPayment ? 'Perkara / No. Pembayaran:' : 'Kasus / BAST:'}</span>
                <span className="text-slate-200">{effectiveCaseNo} ({isPayment ? payment?.paymentNo : recovery?.recoveryNo})</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm font-bold">
                <span className="text-emerald-400">Nominal Transfer:</span>
                <span className="text-emerald-300">Rp {partnerAmount.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                Selesai & Tutup Jendela
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmTransfer} className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1">
            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Case & Debtor Banner */}
            <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">{isPayment ? 'No. Kasus & Payment' : 'No. Kasus & BAST'}</span>
                <span className="font-bold text-indigo-300 font-mono">{effectiveCaseNo}</span>
                <span className="text-slate-400 block text-[11px] font-mono">{isPayment ? payment?.paymentNo : recovery?.recoveryNo}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">Debitur & Klien</span>
                <span className="font-bold text-white block">{targetCase?.debtorName || payment?.debtorName || 'Debitur'}</span>
                <span className="text-slate-400 text-[11px] block">{targetCase?.clientName || 'Multifinance'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] uppercase font-bold block">{isPayment ? 'Total Bayar Debitur' : 'Aset Kendaraan'}</span>
                {isPayment ? (
                  <>
                    <span className="font-bold text-emerald-400 font-mono block">Rp {(payment?.amount || 0).toLocaleString('id-ID')}</span>
                    <span className="text-slate-400 text-[11px] block">{payment?.paymentType}</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-slate-200 block truncate">{recovery?.assetDescription}</span>
                    <span className="text-emerald-400 text-[11px] block">{recovery?.warehouseLocation}</span>
                  </>
                )}
              </div>
            </div>

            {/* Split Fee Calculation Box */}
            <div className="bg-gradient-to-br from-indigo-950/40 via-slate-950 to-slate-900 border border-indigo-900/60 rounded-xl p-4 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-indigo-900/50 pb-2.5">
                <h4 className="text-xs font-bold text-indigo-200 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-400" />
                  <span>Kalkulasi Bagi Hasil & Persentase Fee Perusahaan</span>
                </h4>
                <span className="text-[11px] text-slate-400 font-mono">Formula Otomatis ARMS</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold">
                    {isPayment ? 'Total Agency / Success Fee:' : 'Total Tarif / Gross Fee Penarikan:'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">Rp</span>
                    <input
                      type="number"
                      required
                      value={grossFee}
                      onChange={(e) => handleGrossFeeChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {isPayment ? 'Gross success fee penagihan' : 'Tarif tagih ke Klien Multifinance'}
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1 font-semibold flex items-center justify-between">
                    <span>Bagian Perusahaan (%):</span>
                    <span className="text-indigo-300 font-mono text-[10px]">Dapat Diatur</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={companyPercent}
                      onChange={(e) => handlePercentChange(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-indigo-300 font-mono font-bold focus:border-indigo-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-slate-400">%</span>
                  </div>
                  <span className="text-[10px] text-indigo-400/90 font-mono mt-1 block">
                    = Rp {companyAmount.toLocaleString('id-ID')}
                  </span>
                </div>

                <div className="bg-emerald-950/70 border border-emerald-700/80 rounded-lg p-2.5 flex flex-col justify-between shadow-inner">
                  <div className="flex justify-between items-center text-[10px] font-bold text-emerald-300 uppercase">
                    <span>Hak Komisi Mitra DC:</span>
                    <span>({100 - companyPercent}%)</span>
                  </div>
                  <div className="text-lg font-black text-emerald-400 font-mono mt-1">
                    Rp {partnerAmount.toLocaleString('id-ID')}
                  </div>
                  <span className="text-[9px] text-emerald-300/80">Nominal bersih yang ditransfer</span>
                </div>
              </div>
            </div>

            {/* Destination Mitra DC Bank Account */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-400" />
                <span>Rekening Tujuan Pembayaran Mitra DC</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nama Bank Tujuan</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Bank BCA / Mandiri / BRI"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 8830192831"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Atas Nama Rekening</label>
                  <input
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Nama Pemilik Rekening"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Source Cash Account & Transfer Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Landmark className="w-4 h-4 text-blue-400" />
                <span>Sumber Kas & Rincian Pengeluaran</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Sumber Rekening Kas Perusahaan <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedCashAccountId}
                    onChange={(e) => setSelectedCashAccountId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  >
                    {store.cashAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountName} - Saldo: Rp {acc.balance.toLocaleString('id-ID')} ({acc.bankName})
                      </option>
                    ))}
                  </select>
                  {selectedCashAccount && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Saldo Tersedia: <strong className="text-emerald-400">Rp {selectedCashAccount.balance.toLocaleString('id-ID')}</strong>
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Tanggal Transfer</label>
                  <input
                    type="date"
                    required
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">No. Referensi / Struk Transfer</label>
                  <input
                    type="text"
                    required
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Link Bukti Transfer (Google Drive / URL)</label>
                  <input
                    type="text"
                    value={transferProofUrl}
                    onChange={(e) => setTransferProofUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Catatan Transaksi / Keterangan</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
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
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-950/50 transition cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Konfirmasi & Proses Transfer (Rp {partnerAmount.toLocaleString('id-ID')})</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
