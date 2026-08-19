import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, CashAccount } from '../../types/arms';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  ArrowRightLeft,
  Coins,
  Wallet,
  Building,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Search,
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  CreditCard
} from 'lucide-react';

interface SettingsBankBalancesTabProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

const INDONESIAN_BANKS = [
  { name: 'Bank Mandiri', color: 'from-amber-600 to-blue-900', code: 'MANDIRI' },
  { name: 'Bank Central Asia (BCA)', color: 'from-blue-600 to-blue-950', code: 'BCA' },
  { name: 'Bank Negara Indonesia (BNI)', color: 'from-teal-600 to-emerald-950', code: 'BNI' },
  { name: 'Bank Rakyat Indonesia (BRI)', color: 'from-blue-700 to-indigo-950', code: 'BRI' },
  { name: 'Bank Syariah Indonesia (BSI)', color: 'from-emerald-600 to-teal-950', code: 'BSI' },
  { name: 'CIMB Niaga', color: 'from-rose-700 to-red-950', code: 'CIMB' },
  { name: 'Bank Permata', color: 'from-emerald-700 to-green-950', code: 'PERMATA' },
  { name: 'Bank Danamon', color: 'from-amber-700 to-yellow-950', code: 'DANAMON' },
  { name: 'Bank Tabungan Negara (BTN)', color: 'from-sky-700 to-blue-950', code: 'BTN' },
  { name: 'Bank Jago', color: 'from-purple-600 to-fuchsia-950', code: 'JAGO' },
  { name: 'Cash on Hand (Brankas Kantor)', color: 'from-slate-700 to-slate-900', code: 'CASH' },
];

export const SettingsBankBalancesTab: React.FC<SettingsBankBalancesTabProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Bank Form Modal State
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferFromId, setTransferFromId] = useState('');
  const [transferToId, setTransferToId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNotes, setTransferNotes] = useState('');

  // Delete Confirmation Modal State
  const [accountToDelete, setAccountToDelete] = useState<CashAccount | null>(null);

  // Success Feedback
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  // Form Fields
  const [bankName, setBankName] = useState('Bank Mandiri');
  const [customBankName, setCustomBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [accountHolder, setAccountHolder] = useState('PT MITRA JASA TAMA');
  const [branch, setBranch] = useState('KC Jakarta Sudirman');
  const [balance, setBalance] = useState<number>(0);
  const [type, setType] = useState<CashAccount['type']>('MODAL_KERJA_POOL');
  const [notes, setNotes] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const cashAccounts = store.cashAccounts || [];
  const workingCapitalList = store.workingCapital || [];

  // Metrics Calculations
  const totalCashBalance = cashAccounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  
  const totalInjections = workingCapitalList
    .filter((w) => w.type === 'INJECTION' && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const totalAllocated = workingCapitalList
    .filter((w) => w.type === 'ALLOCATION' && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const totalReturned = workingCapitalList
    .filter((w) => (w.type === 'RETURN_CAPITAL' || w.type === 'WITHDRAWAL') && w.status === 'COMPLETED')
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const standbyCapital = totalInjections - totalAllocated - totalReturned;

  // Filtered Accounts
  const filteredAccounts = cashAccounts.filter((acc) => {
    const term = searchTerm.toLowerCase();
    return (
      (acc.bankName || '').toLowerCase().includes(term) ||
      (acc.accountName || '').toLowerCase().includes(term) ||
      (acc.accountNo || '').toLowerCase().includes(term) ||
      (acc.accountHolder || '').toLowerCase().includes(term) ||
      (acc.type || '').toLowerCase().includes(term)
    );
  });

  const handleCopyAccountNo = (accId: string, accNo: string) => {
    navigator.clipboard.writeText(accNo);
    setCopiedId(accId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenAddModal = () => {
    setIsEditing(false);
    setEditId(null);
    setBankName('Bank Mandiri');
    setCustomBankName('');
    setAccountName('');
    setAccountNo('');
    setAccountHolder('PT MITRA JASA TAMA');
    setBranch('KC Jakarta Sudirman');
    setBalance(0);
    setType('MODAL_KERJA_POOL');
    setNotes('');
    setShowAccountModal(true);
  };

  const handleOpenEditModal = (acc: CashAccount) => {
    setIsEditing(true);
    setEditId(acc.id);
    const isKnownBank = INDONESIAN_BANKS.some((b) => b.name === acc.bankName);
    if (isKnownBank) {
      setBankName(acc.bankName);
      setCustomBankName('');
    } else {
      setBankName('OTHER');
      setCustomBankName(acc.bankName);
    }
    setAccountName(acc.accountName);
    setAccountNo(acc.accountNo);
    setAccountHolder(acc.accountHolder || 'PT MITRA JASA TAMA');
    setBranch(acc.branch || '');
    setBalance(acc.balance || 0);
    setType(acc.type || 'MODAL_KERJA_POOL');
    setNotes(acc.notes || '');
    setShowAccountModal(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();

    const finalBankName = bankName === 'OTHER' ? customBankName.trim() : bankName;

    if (!finalBankName) {
      alert('Nama Bank wajib diisi.');
      return;
    }

    if (!accountName.trim()) {
      alert('Nama Rekening wajib diisi.');
      return;
    }

    if (!accountNo.trim()) {
      alert('Nomor Rekening wajib diisi.');
      return;
    }

    const nowIso = new Date().toISOString();

    if (isEditing && editId) {
      const existing = cashAccounts.find((a) => a.id === editId);
      if (!existing) return;

      const updated: CashAccount = {
        ...existing,
        bankName: finalBankName,
        accountName: accountName.trim(),
        accountNo: accountNo.trim(),
        accountHolder: accountHolder.trim(),
        branch: branch.trim(),
        balance: Number(balance) || 0,
        type,
        notes: notes.trim(),
        lastUpdated: nowIso,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Finance_Ledger',
        editId,
        `Updated Bank Account ${finalBankName} - ${accountNo} (Saldo: Rp ${(Number(balance) || 0).toLocaleString('id-ID')})`
      );

      onUpdateStore({
        ...store,
        cashAccounts: cashAccounts.map((a) => (a.id === editId ? updated : a)),
        auditLogs: [audit, ...store.auditLogs],
      });

      setActionSuccessMsg(`Rekening ${finalBankName} (${accountNo}) berhasil diperbarui.`);
    } else {
      const newAccount: CashAccount = {
        id: `ACC-${Date.now()}`,
        bankName: finalBankName,
        accountName: accountName.trim(),
        accountNo: accountNo.trim(),
        accountHolder: accountHolder.trim(),
        branch: branch.trim(),
        balance: Number(balance) || 0,
        type,
        notes: notes.trim(),
        lastUpdated: nowIso,
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Finance_Ledger',
        newAccount.id,
        `Added Bank Account ${finalBankName} - ${accountNo} (Saldo Awal: Rp ${(Number(balance) || 0).toLocaleString('id-ID')})`
      );

      onUpdateStore({
        ...store,
        cashAccounts: [...cashAccounts, newAccount],
        auditLogs: [audit, ...store.auditLogs],
      });

      setActionSuccessMsg(`Rekening baru ${finalBankName} (${accountNo}) berhasil ditambahkan.`);
    }

    setShowAccountModal(false);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const confirmDeleteAccount = () => {
    if (!accountToDelete) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Finance_Ledger',
      accountToDelete.id,
      `Deleted Bank Account ${accountToDelete.bankName} (${accountToDelete.accountNo}) with balance Rp ${(accountToDelete.balance || 0).toLocaleString('id-ID')}`
    );

    onUpdateStore({
      ...store,
      cashAccounts: cashAccounts.filter((a) => a.id !== accountToDelete.id),
      auditLogs: [audit, ...store.auditLogs],
    });

    setActionSuccessMsg(`Rekening ${accountToDelete.bankName} (${accountToDelete.accountNo}) berhasil dihapus.`);
    setAccountToDelete(null);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const handleOpenTransferModal = () => {
    if (cashAccounts.length < 2) {
      alert('Dibutuhkan minimal 2 rekening bank untuk melakukan transfer antarrekening.');
      return;
    }
    setTransferFromId(cashAccounts[0].id);
    setTransferToId(cashAccounts[1].id);
    setTransferAmount(0);
    setTransferNotes('Transfer / Rekonsiliasi Alokasi Saldo Bank Modal Kerja');
    setShowTransferModal(true);
  };

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();

    if (transferFromId === transferToId) {
      alert('Rekening asal dan rekening tujuan tidak boleh sama.');
      return;
    }

    if (transferAmount <= 0) {
      alert('Nominal transfer harus lebih besar dari Rp 0.');
      return;
    }

    const sourceAcc = cashAccounts.find((a) => a.id === transferFromId);
    const destAcc = cashAccounts.find((a) => a.id === transferToId);

    if (!sourceAcc || !destAcc) {
      alert('Rekening tidak valid.');
      return;
    }

    if (sourceAcc.balance < transferAmount) {
      if (!window.confirm(`Saldo rekening asal (${sourceAcc.bankName}: Rp ${sourceAcc.balance.toLocaleString('id-ID')}) kurang dari nominal transfer (Rp ${transferAmount.toLocaleString('id-ID')}). Tetap lanjutkan?`)) {
        return;
      }
    }

    const nowIso = new Date().toISOString();

    const updatedAccounts = cashAccounts.map((acc) => {
      if (acc.id === transferFromId) {
        return {
          ...acc,
          balance: (acc.balance || 0) - transferAmount,
          lastUpdated: nowIso,
        };
      }
      if (acc.id === transferToId) {
        return {
          ...acc,
          balance: (acc.balance || 0) + transferAmount,
          lastUpdated: nowIso,
        };
      }
      return acc;
    });

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Finance_Ledger',
      `TRF-${Date.now()}`,
      `Inter-Bank Transfer: Rp ${transferAmount.toLocaleString('id-ID')} from ${sourceAcc.bankName} (${sourceAcc.accountNo}) to ${destAcc.bankName} (${destAcc.accountNo}). Note: ${transferNotes}`
    );

    onUpdateStore({
      ...store,
      cashAccounts: updatedAccounts,
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowTransferModal(false);
    setActionSuccessMsg(`Transfer Rp ${transferAmount.toLocaleString('id-ID')} dari ${sourceAcc.bankName} ke ${destAcc.bankName} berhasil dicatat.`);
    setTimeout(() => setActionSuccessMsg(''), 4000);
  };

  const getTypeBadge = (accType: CashAccount['type']) => {
    switch (accType) {
      case 'MODAL_KERJA_POOL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-700">
            Modal Kerja Pool
          </span>
        );
      case 'OPERATIONAL':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700">
            Operasional Utama
          </span>
        );
      case 'TALANGAN_VAULT':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700">
            Vault Dana Talangan
          </span>
        );
      case 'PETTY_CASH':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-950 text-purple-300 border border-purple-700">
            Kas Kecil (Petty Cash)
          </span>
        );
      case 'INVESTOR_ESCROW':
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-700">
            Investor Escrow
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {(accType || 'LAINNYA').replace(/_/g, ' ')}
          </span>
        );
    }
  };

  const getBankGradient = (bName: string) => {
    const found = INDONESIAN_BANKS.find((b) => bName.toLowerCase().includes(b.code.toLowerCase()) || bName.toLowerCase().includes(b.name.toLowerCase()));
    return found ? found.color : 'from-slate-800 to-indigo-950';
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-3">
          <div className="p-3 bg-indigo-950/80 rounded-xl border border-indigo-800 text-indigo-400 shrink-0">
            <Landmark className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">Saldo Rekening Bank & Modal Kerja</h2>
              <span className="px-2.5 py-0.5 bg-indigo-900/80 text-indigo-200 border border-indigo-700 text-[10px] font-bold rounded-full">
                {cashAccounts.length} Rekening Aktif
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Pusat monitoring saldo riil seluruh rekening bank perusahaan, kas penampungan modal kerja, vault talangan likuiditas, dan kas kecil operasional.
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleOpenTransferModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition cursor-pointer"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-amber-400" />
              <span>Mutasi Antar Bank</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening Bank</span>
            </button>
          </div>
        )}
      </div>

      {/* Success Notification Banner */}
      {actionSuccessMsg && (
        <div className="p-3.5 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-lg animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* Financial Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Saldo Seluruh Bank</span>
            <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-900/50">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            Rp {totalCashBalance.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
            <span>Total Likuiditas Bank & Kas Tersedia</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Injeksi Modal Masuk</span>
            <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-900/50">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            Rp {totalInjections.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-indigo-300">
            <span>Dari Direksi & Investor</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Alokasi Modal Berjalan</span>
            <div className="p-2 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-900/50">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            Rp {totalAllocated.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-300">
            <span>Dialokasikan ke Lapangan & Vault</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Modal Kerja Siaga (Standby)</span>
            <div className="p-2 rounded-lg bg-sky-950/80 text-sky-400 border border-sky-900/50">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight font-mono">
            Rp {standbyCapital.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-sky-300">
            <span>Sisa Cadangan Modal Siaga</span>
          </div>
        </div>
      </div>

      {/* ATM / Digital Bank Cards Showcase */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-white text-sm">Kartu Rekening Bank Perusahaan</h3>
          </div>
          <span className="text-xs text-slate-400">Klik ikon salin untuk copy nomor rekening</span>
        </div>

        {cashAccounts.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-500 text-xs">
            Belum ada rekening bank yang didaftarkan. Klik tombol &ldquo;Tambah Rekening Bank&rdquo; untuk memulai.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cashAccounts.map((acc) => {
              const gradient = getBankGradient(acc.bankName);
              const isCopied = copiedId === acc.id;

              return (
                <div
                  key={acc.id}
                  className={`bg-gradient-to-br ${gradient} border border-slate-700/60 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[200px] transition transform hover:-translate-y-1`}
                >
                  {/* Background Watermark Pattern */}
                  <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
                  <div className="absolute right-12 top-2 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

                  {/* Top Card Row */}
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <div className="flex items-center gap-2">
                        <Landmark className="w-4 h-4 text-white/80" />
                        <span className="font-extrabold text-sm tracking-wide text-white uppercase">{acc.bankName}</span>
                      </div>
                      <p className="text-[11px] text-white/70 font-medium mt-0.5">{acc.accountName}</p>
                    </div>
                    <div>{getTypeBadge(acc.type)}</div>
                  </div>

                  {/* Card Chip & Account Number */}
                  <div className="my-3 relative z-10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="w-9 h-6 rounded bg-amber-400/90 border border-amber-300 flex items-center justify-center shadow-inner">
                        <div className="w-5 h-3 border-t border-b border-amber-600 opacity-60" />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyAccountNo(acc.id, acc.accountNo)}
                        className="flex items-center gap-1 px-2 py-1 bg-black/30 hover:bg-black/50 text-white/90 rounded text-[10px] font-mono transition backdrop-blur-sm"
                        title="Salin Nomor Rekening"
                      >
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{isCopied ? 'Tersalin!' : acc.accountNo}</span>
                      </button>
                    </div>
                    <div className="text-[11px] text-white/80 font-mono tracking-wider font-semibold">
                      A.N. {acc.accountHolder || 'PT MITRA JASA TAMA'}
                    </div>
                  </div>

                  {/* Bottom Card Balance & Actions */}
                  <div className="pt-2 border-t border-white/10 flex items-end justify-between relative z-10">
                    <div>
                      <span className="text-[10px] text-white/60 uppercase font-semibold block">Saldo Rekening:</span>
                      <span className="text-xl font-extrabold font-mono text-emerald-300">
                        Rp {(acc.balance || 0).toLocaleString('id-ID')}
                      </span>
                    </div>

                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(acc)}
                          className="p-1.5 bg-black/30 hover:bg-black/60 rounded-lg text-white/80 hover:text-amber-300 transition"
                          title="Edit / Sesuaikan Saldo"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountToDelete(acc)}
                          className="p-1.5 bg-black/30 hover:bg-rose-900/80 rounded-lg text-white/80 hover:text-rose-300 transition"
                          title="Hapus Rekening"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comprehensive Table & Management */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg space-y-4 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Building className="w-4 h-4 text-indigo-400" />
              <span>Daftar Rinci Rekening Bank & Alokasi Modal</span>
            </h3>
            <p className="text-xs text-slate-400">Tabel pengelolaan data rekening, nomor rekening, saldo, dan cabang</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari bank / no rek / nama..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Bank & Logo</th>
                <th className="py-3 px-4">Nama Rekening / Label</th>
                <th className="py-3 px-4">Nomor Rekening & A.N.</th>
                <th className="py-3 px-4">Peruntukan / Tipe</th>
                <th className="py-3 px-4 text-right">Saldo Saat Ini</th>
                <th className="py-3 px-4">Cabang</th>
                {canEdit && <th className="py-3 px-4 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-8 text-center text-slate-500 text-xs">
                    Tidak ditemukan rekening bank yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <div className="p-1.5 bg-slate-800 rounded-md text-indigo-400 border border-slate-700">
                        <Landmark className="w-3.5 h-3.5" />
                      </div>
                      <span>{acc.bankName}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-200">{acc.accountName}</div>
                      {acc.notes && <div className="text-[10px] text-slate-500 truncate max-w-xs">{acc.notes}</div>}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                        <span>{acc.accountNo}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyAccountNo(acc.id, acc.accountNo)}
                          className="text-slate-400 hover:text-white"
                          title="Salin No Rekening"
                        >
                          {copiedId === acc.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-400">A.N. {acc.accountHolder || 'PT MITRA JASA TAMA'}</div>
                    </td>
                    <td className="py-3.5 px-4">{getTypeBadge(acc.type)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-400 text-sm">
                      Rp {(acc.balance || 0).toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">{acc.branch || '-'}</td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(acc)}
                            className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition"
                            title="Edit / Sesuaikan Saldo"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setAccountToDelete(acc)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="Hapus Rekening"
                          >
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
      </div>

      {/* Add / Edit Bank Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveAccount}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Landmark className="w-5 h-5 text-indigo-400" />
                <span>{isEditing ? 'Edit Rekening Bank & Saldo' : 'Tambah Rekening Bank Baru'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {INDONESIAN_BANKS.map((b) => (
                    <option key={b.name} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                  <option value="OTHER">Bank Lainnya (Kustom)...</option>
                </select>
              </div>

              {bankName === 'OTHER' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Nama Bank Kustom</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Bank BJB / Seabank"
                    value={customBankName}
                    onChange={(e) => setCustomBankName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Peruntukan / Tipe Rekening</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="MODAL_KERJA_POOL">MODAL KERJA POOL (Injeksi & Penampungan)</option>
                  <option value="OPERATIONAL">OPERASIONAL (Disbursement & Biaya)</option>
                  <option value="TALANGAN_VAULT">TALANGAN VAULT (Dana Talangan Lapangan)</option>
                  <option value="PETTY_CASH">PETTY CASH (Kas Kecil Tunai)</option>
                  <option value="INVESTOR_ESCROW">INVESTOR ESCROW (Rekening Khusus Investor)</option>
                  <option value="OTHER">LAINNYA</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nama / Label Rekening</label>
              <input
                type="text"
                required
                placeholder="Contoh: Rekening Utama Modal Kerja & Penampungan"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  required
                  placeholder="137-00-998877-1"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Atas Nama Rekening</label>
                <input
                  type="text"
                  required
                  value={accountHolder}
                  onChange={(e) => setAccountHolder(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Saldo Rekening Saat Ini (IDR)</label>
                <input
                  type="number"
                  min="0"
                  value={balance}
                  onChange={(e) => setBalance(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono font-bold"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Rp {(Number(balance) || 0).toLocaleString('id-ID')}
                </span>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Kantor Cabang (KCP/KC)</label>
                <input
                  type="text"
                  placeholder="Contoh: KC Jakarta Sudirman"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Catatan / Keterangan Tambahan</label>
              <textarea
                rows={2}
                placeholder="Catatan peruntukan rekening, akses m-banking / token..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow"
              >
                {isEditing ? 'Simpan Perubahan' : 'Daftarkan Rekening'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transfer / Mutasi Antar Bank Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleExecuteTransfer}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-amber-400" />
                <span>Mutasi / Pindah Saldo Antar Bank</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Rekening Asal (Sumber Dana)</label>
              <select
                value={transferFromId}
                onChange={(e) => setTransferFromId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} ({acc.accountNo}) - Saldo: Rp {(acc.balance || 0).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Rekening Tujuan (Penerima)</label>
              <select
                value={transferToId}
                onChange={(e) => setTransferToId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                {cashAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} ({acc.accountNo}) - Saldo: Rp {(acc.balance || 0).toLocaleString('id-ID')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Nominal Transfer (IDR)</label>
              <input
                type="number"
                required
                min="1000"
                value={transferAmount}
                onChange={(e) => setTransferAmount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono font-bold"
              />
              <span className="text-[10px] text-emerald-400 mt-0.5 block">
                Rp {(Number(transferAmount) || 0).toLocaleString('id-ID')}
              </span>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Catatan / Berita Transfer</label>
              <input
                type="text"
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Eksekusi Mutasi Saldo
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-800/60 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/80 border border-rose-800">
                <AlertCircle className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Hapus Rekening Bank</h3>
                <p className="text-xs text-rose-300">Tindakan ini tidak dapat dibatalkan</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Bank:</span>
                <span className="font-bold text-white">{accountToDelete.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No Rekening:</span>
                <span className="font-mono font-bold text-indigo-300">{accountToDelete.accountNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Saldo:</span>
                <span className="font-mono font-bold text-emerald-400">
                  Rp {(accountToDelete.balance || 0).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Apakah Anda yakin ingin menghapus data rekening bank ini? Riwayat penghapusan akan dicatat pada log audit sistem.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteAccount}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg shadow"
              >
                Ya, Hapus Rekening
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
