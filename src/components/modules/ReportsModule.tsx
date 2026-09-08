import React, { useState, useMemo } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Case, Client, Payment, Settlement, Expense, DanaTalangan, AuditLogEntry } from '../../types/arms';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  ShieldCheck,
  PieChart,
  Building2,
  Users,
  CheckCircle2,
  TrendingUp,
  FileText,
  DollarSign,
  Wallet,
  Calendar,
  Filter,
  Check,
  Activity
} from 'lucide-react';
import { downloadCSV, formatRupiahNumber } from '../../utils/exportUtils';

interface ReportsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

type ReportTab = 'RECOVERY_CLIENT' | 'FINANCIAL_PL' | 'DEBTOR_PORTFOLIO' | 'SETTLEMENTS' | 'DANA_TALANGAN' | 'EXPENSES' | 'AUDIT_TRAIL';

export const ReportsModule: React.FC<ReportsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [activeTab, setActiveTab] = useState<ReportTab>('RECOVERY_CLIENT');
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');
  const [exportedSuccess, setExportedSuccess] = useState<string | null>(null);

  // 1. RECOVERY PERFORMANCE DATA AGGREGATION
  const clientPerformanceData = useMemo(() => {
    const clients = store.clients || [];
    const cases = store.cases || [];
    const payments = store.payments || [];

    return clients.map((client) => {
      const clientCases = cases.filter((c) => c.clientId === client.id);
      const totalCases = clientCases.length;
      const resolvedCases = clientCases.filter((c) => c.status === 'SETTLED' || c.status === 'CLOSED').length;
      const activeCases = clientCases.filter((c) => c.status !== 'SETTLED' && c.status !== 'CLOSED').length;
      
      const totalPrincipalOS = clientCases.reduce((acc, curr) => acc + (curr.principalDebtOS || 0), 0);
      const clientPayments = payments.filter((p) => p.clientId === client.id && p.status === 'VERIFIED');
      const totalCollected = clientPayments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
      const totalAgencyFeeEarned = clientPayments.reduce((acc, curr) => acc + getPaymentCompanyFee(curr), 0);

      const recoveryRate = totalPrincipalOS > 0 ? ((totalCollected / totalPrincipalOS) * 100) : (totalCases > 0 && resolvedCases > 0 ? ((resolvedCases / totalCases) * 100) : 0);
      const avgDpd = totalCases > 0 ? Math.round(clientCases.reduce((acc, curr) => acc + (curr.overdueDays || 0), 0) / totalCases) : 0;

      return {
        clientId: client.id,
        clientCode: client.clientCode,
        clientName: client.companyName,
        clientType: client.clientType || (client.industry === 'PERORANGAN' ? 'PERORANGAN' : 'MULTIFINANCE'),
        industry: client.industry,
        totalCases,
        activeCases,
        resolvedCases,
        totalPrincipalOS,
        totalCollected,
        totalAgencyFeeEarned,
        recoveryRate: Math.min(100, Math.round(recoveryRate * 10) / 10),
        avgDpd,
      };
    });
  }, [store]);

  // Filtered Debtor Cases
  const filteredCases = useMemo(() => {
    let list = store.cases || [];
    if (selectedClientId !== 'ALL') {
      list = list.filter((c) => c.clientId === selectedClientId);
    }
    return list;
  }, [store.cases, selectedClientId]);

  const getPaymentCompanyFee = (payment: any) => {
    if (typeof payment.companyRevenueAmount === 'number') return payment.companyRevenueAmount;
    const grossFee = Number(payment.grossAgencyFee ?? payment.successFeeAmount ?? payment.amount * 0.2 ?? 0);
    const companyPercent = Number(payment.companyFeePercent ?? store.settings?.defaultCompanyCommissionSplitPercent ?? 20);
    return Math.round((grossFee * companyPercent) / 100);
  };

  const getPaymentPartnerFee = (payment: any) => {
    if (typeof payment.partnerCommissionAmount === 'number') return payment.partnerCommissionAmount;
    const grossFee = Number(payment.grossAgencyFee ?? payment.successFeeAmount ?? payment.amount * 0.2 ?? 0);
    const companyFee = getPaymentCompanyFee(payment);
    return Math.max(0, Math.round(grossFee - companyFee));
  };

  // Overall Totals
  const verifiedPayments = useMemo(() => (store.payments || []).filter((p: any) => (p.verificationStatus || p.status) === 'VERIFIED'), [store.payments]);
  const totalOSAll = useMemo(() => (store.cases || []).reduce((a, b) => a + (b.principalDebtOS || 0), 0), [store.cases]);
  const totalCollectedAll = useMemo(() => verifiedPayments.reduce((a, b) => a + (b.amount || 0), 0), [verifiedPayments]);
  const totalCompanyFeeAll = useMemo(() => verifiedPayments.reduce((a, b) => a + getPaymentCompanyFee(b), 0), [verifiedPayments]);
  const totalPartnerFeeAll = useMemo(() => verifiedPayments.reduce((a, b) => a + getPaymentPartnerFee(b), 0), [verifiedPayments]);
  const totalAgencyFeeAll = totalCompanyFeeAll;
  const totalExpensesAll = useMemo(() => (store.expenses || []).reduce((a, b) => a + (b.amount || 0), 0), [store.expenses]);
  const standardAccountingReport = useMemo(() => {
    const revenue = totalCompanyFeeAll;
    const partnerFee = totalPartnerFeeAll;
    const operatingExpenses = totalExpensesAll;
    const grossProfit = revenue;
    const netProfit = revenue - operatingExpenses;
    return [
      { account: 'Pendapatan Usaha (Fee Perusahaan)', value: revenue, type: 'REVENUE' },
      { account: 'Komisi Mitra / Fee Mitra', value: partnerFee, type: 'PARTNER_FEE' },
      { account: 'Beban Operasional / Biaya Recovery', value: operatingExpenses, type: 'EXPENSE' },
      { account: 'Laba Kotor', value: grossProfit, type: 'GROSS_PROFIT' },
      { account: 'Laba Bersih / Net Profit', value: netProfit, type: 'NET_PROFIT' },
      { account: 'Total Penerimaan Kas', value: totalCollectedAll, type: 'CASH_IN' },
      { account: 'Total Outstanding Piutang', value: totalOSAll, type: 'AR' },
    ];
  }, [totalCompanyFeeAll, totalPartnerFeeAll, totalExpensesAll, totalCollectedAll, totalOSAll]);
  const netProfitEstimated = totalCompanyFeeAll - totalExpensesAll;

  const showExportNotice = (title: string) => {
    setExportedSuccess(title);
    setTimeout(() => setExportedSuccess(null), 4000);
  };

  const recordAuditAndStore = (actionTitle: string, desc: string) => {
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'EXPORT',
      'Reports & Rekapitulasi',
      actionTitle,
      desc
    );

    onUpdateStore({
      ...store,
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  // =========================================================================
  // EXPORT HANDLERS WITH DIRECT INSTANT DOWNLOAD
  // =========================================================================

  // 1. Export Recovery Performance per Client
  const handleExportClientPerformance = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Rekap_Kinerja_Recovery_Klien_${dateStr}`;

    downloadCSV<(typeof clientPerformanceData)[0]>(filename, clientPerformanceData, [
      { header: 'Kode Klien', accessor: (d) => d.clientCode },
      { header: 'Nama Klien / Multifinance', accessor: (d) => d.clientName },
      { header: 'Kategori Klien', accessor: (d) => d.clientType },
      { header: 'Industri', accessor: (d) => d.industry },
      { header: 'Total Perkara (Cases)', accessor: (d) => d.totalCases },
      { header: 'Perkara Aktif (On Progress)', accessor: (d) => d.activeCases },
      { header: 'Perkara Selesai (Settled/Closed)', accessor: (d) => d.resolvedCases },
      { header: 'Total OS Pokok Piutang (Rp)', accessor: (d) => d.totalPrincipalOS },
      { header: 'Total Tagihan Berhasil Ditagih (Rp)', accessor: (d) => d.totalCollected },
      { header: 'Pendapatan Fee Agency PT MJ (Rp)', accessor: (d) => d.totalAgencyFeeEarned },
      { header: 'Recovery Rate (%)', accessor: (d) => `${d.recoveryRate}%` },
      { header: 'Rata-rata DPD (Hari)', accessor: (d) => d.avgDpd },
    ]);

    recordAuditAndStore('Kinerja Recovery per Klien', `Exported client recovery performance report (${clientPerformanceData.length} records) to CSV`);
    showExportNotice('Rekapitulasi Kinerja Klien berhasil diunduh langsung!');
  };

  // 2. Export Financial Statement & Profit/Loss
  const handleExportFinancialPL = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Keuangan_Laba_Rugi_PT_MJ_${dateStr}`;

    const payments = (store.payments || []).map((p, idx) => {
      const companyFee = getPaymentCompanyFee(p);
      return {
        no: idx + 1,
        type: 'INFLOW_PENDAPATAN',
        date: p.paymentDate,
        docNo: p.receiptNo,
        category: 'Agency Success Fee',
        client: p.clientName,
        debtor: p.debtorName,
        description: `Pelunasan Perkara ${p.caseNo} (${p.method})`,
        grossAmount: p.amount,
        feePortion: companyFee,
        netDisbursement: p.amount - companyFee,
        status: p.verificationStatus || p.status,
      };
    });

    const expenses = (store.expenses || []).map((e, idx) => ({
      no: payments.length + idx + 1,
      type: 'OUTFLOW_BIAYA',
      date: e.expenseDate,
      docNo: e.receiptDocUrl ? 'RECEIPT-ATTACHED' : 'EXP-SLIP',
      category: e.category,
      client: '-',
      debtor: '-',
      description: `${e.category} - ${e.notes || 'Operasional Lapangan'} (Kas: ${e.bankAccountId || 'KAS UTAMA'})`,
      grossAmount: -e.amount,
      feePortion: 0,
      netDisbursement: 0,
      status: 'RECORDED',
    }));

    interface FinancialRecord {
      no: number;
      type: string;
      date: string;
      docNo: string;
      category: string;
      client: string;
      debtor: string;
      description: string;
      grossAmount: number;
      feePortion: number;
      netDisbursement: number;
      status: string;
    }

    const fullFinancials: FinancialRecord[] = [...payments, ...expenses];

    downloadCSV<FinancialRecord>(filename, fullFinancials, [
      { header: 'No', accessor: (d) => d.no },
      { header: 'Arus Kas', accessor: (d) => d.type },
      { header: 'Tanggal', accessor: (d) => d.date },
      { header: 'No. Bukti / Kuitansi', accessor: (d) => d.docNo },
      { header: 'Kategori Keuangan', accessor: (d) => d.category },
      { header: 'Klien Multifinance', accessor: (d) => d.client },
      { header: 'Nama Debitur', accessor: (d) => d.debtor },
      { header: 'Deskripsi / Keterangan', accessor: (d) => d.description },
      { header: 'Nominal Transaksi (Rp)', accessor: (d) => d.grossAmount },
      { header: 'Bagian Fee Agency (Rp)', accessor: (d) => d.feePortion },
      { header: 'Disetorkan ke Klien (Rp)', accessor: (d) => d.netDisbursement },
      { header: 'Status Transaksi', accessor: (d) => d.status },
    ]);

    recordAuditAndStore('Laporan Keuangan & P&L', `Exported P&L financial statement (${fullFinancials.length} transactions) to CSV`);
    showExportNotice('Laporan Keuangan & Laba Rugi berhasil diunduh langsung!');
  };

  // 3. Export Debtor Portfolio & Cases
  const handleExportDebtorCases = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Rekapitulasi_Portofolio_Debitur_Cases_${dateStr}`;

    const dataToExport = filteredCases;

    downloadCSV<Case>(filename, dataToExport, [
      { header: 'No. Perkara', accessor: (c) => c.caseNo },
      { header: 'Klien Pemberi Kuasa', accessor: (c) => c.clientName },
      { header: 'Kategori Klien', accessor: (c) => c.clientType || 'MULTIFINANCE' },
      { header: 'Nama Debitur', accessor: (c) => c.debtorName },
      { header: 'NIK KTP Debitur', accessor: (c) => c.debtorNik || '-' },
      { header: 'No. Kontrak / SPH', accessor: (c) => c.multifinanceContractNo || '-' },
      { header: 'Layanan / Produk', accessor: (c) => c.serviceName || '-' },
      { header: 'OS Pokok Piutang (Rp)', accessor: (c) => c.principalDebtOS },
      { header: 'Overdue DPD (Hari)', accessor: (c) => c.overdueDays },
      { header: 'Bucket DPD', accessor: (c) => c.dpdBucket },
      { header: 'Deskripsi Agunan / Aset', accessor: (c) => c.assetSummary || '-' },
      { header: 'Field Partner / PIC', accessor: (c) => c.currentPersonnelName || '-' },
      { header: 'Status Perkara', accessor: (c) => c.status },
      { header: 'Folder Google Drive', accessor: (c) => c.gDriveFolderUrl || '-' },
      { header: 'Tanggal Didaftarkan', accessor: (c) => c.createdAt?.slice(0, 10) || '-' },
    ]);

    recordAuditAndStore('Portofolio Debitur', `Exported Debtor Cases portfolio (${dataToExport.length} cases) to CSV`);
    showExportNotice('Rekapitulasi Portofolio Debitur berhasil diunduh langsung!');
  };

  // 4. Export Settlements
  const handleExportSettlements = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Rekap_Remittance_Settlement_Klien_${dateStr}`;
    const settlements = store.settlements || [];

    downloadCSV<Settlement>(filename, settlements, [
      { header: 'No. Settlement', accessor: (s) => s.settlementNo },
      { header: 'Tanggal Settlement', accessor: (s) => s.settlementDate },
      { header: 'Nama Klien / Multifinance', accessor: (s) => s.clientName },
      { header: 'No. Perkara Terkait', accessor: (s) => s.caseNo || '-' },
      { header: 'Total Terkumpul dari Debitur (Rp)', accessor: (s) => s.totalCollected },
      { header: 'Fee Agency PT MJ (Rp)', accessor: (s) => s.agencyFeeAmount },
      { header: 'Net Disetorkan ke Rekening Klien (Rp)', accessor: (s) => s.netRemittedToClient },
      { header: 'Status Pelunasan Settlement', accessor: (s) => s.status },
      { header: 'Tanggal Dibuat', accessor: (s) => s.createdAt?.slice(0, 10) || '-' },
    ]);

    recordAuditAndStore('Settlements Remittance', `Exported Settlements report (${settlements.length} records) to CSV`);
    showExportNotice('Rekapitulasi Settlement Klien berhasil diunduh langsung!');
  };

  // 5. Export Dana Talangan Ledger
  const handleExportDanaTalangan = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Rekap_Dana_Talangan_Liquidity_${dateStr}`;
    const items = store.danaTalangan || [];

    downloadCSV<DanaTalangan>(filename, items, [
      { header: 'No. Funding / Proposal', accessor: (d) => d.fundingNo },
      { header: 'Nama Debitur Terkait', accessor: (d) => d.debtorName },
      { header: 'No. Perkara', accessor: (d) => d.caseNo },
      { header: 'Jumlah Dana Ditalangi (Rp)', accessor: (d) => d.requestedAmount },
      { header: 'Persentase Return Fee (%)', accessor: (d) => `${d.feeOrInterestRatePercent}%` },
      { header: 'Sumber Dana (Vault)', accessor: (d) => d.funderSource },
      { header: 'Target Tanggal Pengembalian', accessor: (d) => d.repayTargetDate || '-' },
      { header: 'Status Bridging', accessor: (d) => d.status },
      { header: 'Alasan / Tujuan Talangan', accessor: (d) => d.purpose },
      { header: 'Tanggal Pengajuan', accessor: (d) => d.createdAt?.slice(0, 10) || '-' },
    ]);

    recordAuditAndStore('Dana Talangan Liquidity', `Exported Dana Talangan liquidity ledger (${items.length} records) to CSV`);
    showExportNotice('Rekapitulasi Dana Talangan berhasil diunduh langsung!');
  };

  // 6. Export Expenses & Kas Kecil
  const handleExportExpenses = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Rekap_Pengeluaran_Biaya_Operasional_${dateStr}`;
    const items = store.expenses || [];

    downloadCSV<Expense>(filename, items, [
      { header: 'ID Pengeluaran', accessor: (e) => e.expenseNo || e.id },
      { header: 'Tanggal Biaya', accessor: (e) => e.expenseDate },
      { header: 'Kategori Pengeluaran', accessor: (e) => e.category },
      { header: 'Jumlah Pengeluaran (Rp)', accessor: (e) => e.amount },
      { header: 'Diajukan Oleh', accessor: (e) => e.requestedBy },
      { header: 'Keterangan / Deskripsi', accessor: (e) => e.description || '-' },
      { header: 'Bukti Kuitansi / Receipt', accessor: (e) => e.driveReceiptUrl ? 'Terlampir' : 'Tidak Ada' },
      { header: 'Status Pembayaran', accessor: (e) => e.status },
      { header: 'Waktu Input', accessor: (e) => e.createdAt || '-' },
    ]);

    recordAuditAndStore('Pengeluaran & Biaya Operasional', `Exported Operational Expenses (${items.length} records) to CSV`);
    showExportNotice('Rekapitulasi Pengeluaran Operasional berhasil diunduh langsung!');
  };

  // 7. Export Audit Trail
  const handleExportAuditTrail = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Audit_Trail_Log_Sistem_${dateStr}`;
    const logs = store.auditLogs || [];

    downloadCSV<AuditLogEntry>(filename, logs, [
      { header: 'ID Audit', accessor: (l) => l.id },
      { header: 'Waktu (Timestamp)', accessor: (l) => l.timestamp },
      { header: 'Username Pengguna', accessor: (l) => l.username },
      { header: 'Hak Akses (Role)', accessor: (l) => l.userRole },
      { header: 'Tipe Aksi', accessor: (l) => l.action },
      { header: 'Modul / Entitas', accessor: (l) => l.moduleName },
      { header: 'ID / Objek Target', accessor: (l) => l.targetId },
      { header: 'Detail Perubahan / Catatan', accessor: (l) => l.details },
    ]);

    recordAuditAndStore('Audit Trail Log', `Exported System Audit Trail (${logs.length} entries) to CSV`);
    showExportNotice('Log Kepatuhan & Audit Trail berhasil diunduh langsung!');
  };

  const handleExportStandardAccountingReport = () => {
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `Laporan_Akuntansi_Standar_${dateStr}`;

    downloadCSV(filename, standardAccountingReport, [
      { header: 'Akun / Pos', accessor: (row: any) => row.account },
      { header: 'Nilai (Rp)', accessor: (row: any) => row.value },
      { header: 'Kategori', accessor: (row: any) => row.type },
    ]);

    recordAuditAndStore('Laporan Akuntansi Standar', `Exported standard accounting report (${standardAccountingReport.length} lines) to CSV`);
    showExportNotice('Laporan Akuntansi Standar berhasil diunduh langsung!');
  };

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Laporan Eksekutif & Rekapitulasi Terpadu (Direct Export)
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Modul Rekapitulasi Portofolio Perkara, Kinerja Pemulihan Piutang, Laba Rugi Finansial, dan Log Kepatuhan. Klik tombol <strong>Export CSV</strong> pada laporan yang diinginkan untuk <strong>langsung mengunduh file data ke komputer Anda</strong>.
            </p>
          </div>

          {/* Quick Stats Summary Pill */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-950/80 border border-slate-800 p-2.5 rounded-xl">
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Total Piutang OS</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{formatRupiahNumber(totalOSAll)}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Fee Perusahaan</span>
              <span className="text-sm font-bold text-emerald-400 font-mono">{formatRupiahNumber(totalCompanyFeeAll)}</span>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-500 block uppercase font-mono">Fee Mitra</span>
              <span className="text-sm font-bold text-amber-300 font-mono">{formatRupiahNumber(totalPartnerFeeAll)}</span>
            </div>
          </div>
        </div>

        {/* Success Alert Banner on Direct Download */}
        {exportedSuccess && (
          <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{exportedSuccess}</span>
            </div>
            <span className="text-[11px] text-emerald-400/80 font-mono">File CSV terunduh secara instan</span>
          </div>
        )}
      </div>

      {/* Grid of 6 Export Cards for Quick Direct Download */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        {/* Card 1: Kinerja Recovery per Klien */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition shadow-lg flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                <Building2 className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {clientPerformanceData.length} Klien Terdaftar
              </span>
            </div>
            <h3 className="font-bold text-white text-sm">Rekapitulasi Kinerja Klien</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Tingkat keberhasilan pemulihan piutang (*Recovery Rate*), total perkara aktif vs selesai, dan DPD bucket per multifinance.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportClientPerformance}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV Kinerja Klien</span>
          </button>
        </div>

        {/* Card 2: Laporan Laba Rugi Finansial */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition shadow-lg flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 rounded font-mono">
                Est. Laba: {formatRupiahNumber(netProfitEstimated)}
              </span>
            </div>
            <h3 className="font-bold text-white text-sm">Laporan Keuangan & Laba Rugi</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Rincian komprehensif penerimaan Agency Fee, penyaluran bagian kreditur, serta seluruh pengeluaran operasional.
            </p>
          </div>
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-300">
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                <div className="text-slate-500">Fee Perusahaan</div>
                <div className="mt-0.5 font-bold text-emerald-300 font-mono">{formatRupiahNumber(totalCompanyFeeAll)}</div>
              </div>
              <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2">
                <div className="text-slate-500">Fee Mitra</div>
                <div className="mt-0.5 font-bold text-amber-300 font-mono">{formatRupiahNumber(totalPartnerFeeAll)}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportFinancialPL}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
            >
              <Download className="w-3 h-3" />
              <span>Export CSV Laba Rugi (P&L)</span>
            </button>
            <button
              type="button"
              onClick={handleExportStandardAccountingReport}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-100 px-2.5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
            >
              <FileText className="w-3 h-3" />
              <span>Laporan Akuntansi Standar</span>
            </button>
          </div>
        </div>

        {/* Card 3: Portofolio Debitur & Kasus */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition shadow-lg flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                <Users className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {(store.cases || []).length} Perkara
              </span>
            </div>
            <h3 className="font-bold text-white text-sm">Rekap Portofolio Debitur</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Daftar komprehensif seluruh debitur, nomor kontrak, NIK, penugasan field partner, status perkara, dan link arsip Drive.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportDebtorCases}
            className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-2.5 py-2 rounded-lg text-xs transition shadow-md"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV Debitur & Kasus</span>
          </button>
        </div>

        {/* Card 4: Remittance Settlement Klien */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition shadow-lg flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {(store.settlements || []).length} Rekor Settlement
              </span>
            </div>
            <h3 className="font-bold text-white text-sm">Rekap Settlement Remittance</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Histori penyetoran dana hasil penagihan debitur kembali ke rekening institusi multifinance/klien setelah pemotongan fee.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportSettlements}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV Settlement Klien</span>
          </button>
        </div>

        {/* Card 5: Dana Talangan & Bridging */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition shadow-lg flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">
                <Wallet className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {(store.danaTalangan || []).length} Proposal Talangan
              </span>
            </div>
            <h3 className="font-bold text-white text-sm">Rekap Dana Talangan & Return</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Pelacakan fasilitas bridging modal kerja penagihan, persentase return imbal hasil, dan jadwal pelunasan kembali.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportDanaTalangan}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV Dana Talangan</span>
          </button>
        </div>

        {/* Card 6: Audit Trail & Compliance */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 space-y-2 hover:border-slate-700 transition shadow-lg flex flex-col justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="p-2 bg-slate-700/50 text-slate-300 rounded-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {(store.auditLogs || []).length} Log Audit
              </span>
            </div>
            <h3 className="font-bold text-white text-sm">Log Kepatuhan Audit Trail</h3>
            <p className="text-xs text-slate-400 leading-normal">
              Catatan kepatuhan sistem forensik terhadap seluruh aksi pembuatan, perubahan data, approval transaksi, dan export.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExportAuditTrail}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750 px-2.5 py-2 rounded-lg text-xs font-semibold transition shadow-md"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Interactive Table Preview & Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Navigation Bar */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('RECOVERY_CLIENT')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'RECOVERY_CLIENT'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Kinerja Multifinance / Klien</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FINANCIAL_PL')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'FINANCIAL_PL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <PieChart className="w-3 h-3" />
              <span>Keuangan & Laba Rugi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DEBTOR_PORTFOLIO')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'DEBTOR_PORTFOLIO'
                  ? 'bg-amber-600 text-slate-950 font-bold shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Users className="w-3 h-3" />
              <span>Portofolio Debitur & Kasus</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SETTLEMENTS')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'SETTLEMENTS'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <DollarSign className="w-3 h-3" />
              <span>Remittance Settlement</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('DANA_TALANGAN')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'DANA_TALANGAN'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Wallet className="w-3 h-3" />
              <span>Dana Talangan</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('AUDIT_TRAIL')}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shrink-0 ${
                activeTab === 'AUDIT_TRAIL'
                  ? 'bg-slate-700 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              <span>Audit Trail</span>
            </button>
          </div>

          {/* Action on Active Tab */}
          <div className="flex items-center gap-2">
            {activeTab === 'RECOVERY_CLIENT' && (
              <button
                type="button"
                onClick={handleExportClientPerformance}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Tabel Ini (CSV)</span>
              </button>
            )}

            {activeTab === 'FINANCIAL_PL' && (
              <button
                type="button"
                onClick={handleExportFinancialPL}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Laporan Keuangan (CSV)</span>
              </button>
            )}

            {activeTab === 'DEBTOR_PORTFOLIO' && (
              <div className="flex items-center gap-2">
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="bg-slate-900 border border-slate-750 text-xs text-slate-200 rounded-lg px-2 py-1.5 focus:outline-none"
                >
                  <option value="ALL">Semua Klien Multifinance</option>
                  {(store.clients || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleExportDebtorCases}
                  className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-2.5 py-1.5 rounded-lg text-xs transition shadow"
                >
                  <Download className="w-3 h-3" />
                  <span>Unduh Debitur (CSV)</span>
                </button>
              </div>
            )}

            {activeTab === 'SETTLEMENTS' && (
              <button
                type="button"
                onClick={handleExportSettlements}
                className="flex items-center gap-1.5 bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Settlement (CSV)</span>
              </button>
            )}

            {activeTab === 'DANA_TALANGAN' && (
              <button
                type="button"
                onClick={handleExportDanaTalangan}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Dana Talangan (CSV)</span>
              </button>
            )}

            {activeTab === 'AUDIT_TRAIL' && (
              <button
                type="button"
                onClick={handleExportAuditTrail}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition shadow"
              >
                <Download className="w-3 h-3" />
                <span>Unduh Log Audit (CSV)</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: KINERJA MULTIFINANCE / KLIEN */}
        {activeTab === 'RECOVERY_CLIENT' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="p-3">Klien / Lembaga</th>
                  <th className="p-3">Tipe Klien</th>
                  <th className="p-3 text-center">Total Perkara</th>
                  <th className="p-3 text-center">Aktif / Selesai</th>
                  <th className="p-3 text-right">Total OS Pokok</th>
                  <th className="p-3 text-right">Tertagih (Collected)</th>
                  <th className="p-3 text-right">Fee Agency PT MJ</th>
                  <th className="p-3 text-center">Recovery Rate</th>
                  <th className="p-3 text-center">Avg DPD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {clientPerformanceData.map((d) => (
                  <tr key={d.clientId} className="hover:bg-slate-850/50 transition">
                    <td className="p-3">
                      <div className="font-bold text-white text-xs">{d.clientName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">Kode: {d.clientCode} | {d.industry}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        d.clientType === 'PERORANGAN'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800/60'
                          : 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60'
                      }`}>
                        {d.clientType}
                      </span>
                    </td>
                    <td className="p-3 text-center font-bold text-white font-mono">
                      {d.totalCases}
                    </td>
                    <td className="p-3 text-center">
                      <span className="text-amber-400 font-mono">{d.activeCases} on-prog</span>
                      <span className="text-slate-600 mx-1">/</span>
                      <span className="text-emerald-400 font-mono font-bold">{d.resolvedCases} done</span>
                    </td>
                    <td className="p-3 text-right font-mono text-slate-300">
                      {formatRupiahNumber(d.totalPrincipalOS)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {formatRupiahNumber(d.totalCollected)}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-indigo-300">
                      {formatRupiahNumber(d.totalAgencyFeeEarned)}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-16 bg-slate-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{ width: `${d.recoveryRate}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-[11px] text-emerald-400">{d.recoveryRate}%</span>
                      </div>
                    </td>
                    <td className="p-3 text-center font-mono text-amber-400 font-semibold">
                      {d.avgDpd} Hari
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: FINANCIAL P&L STATEMENT */}
        {activeTab === 'FINANCIAL_PL' && (
          <div className="p-3.5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="bg-slate-950 p-3 rounded-xl border border-emerald-900/40">
                <span className="text-[11px] text-emerald-400 font-bold block uppercase tracking-wider">Total Agency Revenue Inflow</span>
                <span className="text-xl font-extrabold text-emerald-300 font-mono mt-0.5 block">{formatRupiahNumber(totalAgencyFeeAll)}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Dari {(store.payments || []).length} transaksi pelunasan terverifikasi</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-red-900/40">
                <span className="text-[11px] text-red-400 font-bold block uppercase tracking-wider">Total Beban Operasional & Derek</span>
                <span className="text-xl font-extrabold text-red-400 font-mono mt-0.5 block">{formatRupiahNumber(totalExpensesAll)}</span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Biaya towing, storage pool, akomodasi lapangan</span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-indigo-900/40">
                <span className="text-[11px] text-indigo-400 font-bold block uppercase tracking-wider">Estimasi Laba Bersih Operasional</span>
                <span className="text-xl font-extrabold text-white font-mono mt-0.5 block">{formatRupiahNumber(netProfitEstimated)}</span>
                <span className="text-[10px] text-emerald-400 mt-0.5 block">Margin Efisiensi: {totalAgencyFeeAll > 0 ? Math.round((netProfitEstimated / totalAgencyFeeAll) * 100) : 0}%</span>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">No. Bukti / Receipt</th>
                    <th className="p-2.5">Klien & Debitur</th>
                    <th className="p-2.5">Kategori</th>
                    <th className="p-2.5 text-right">Total Transaksi</th>
                    <th className="p-2.5 text-right">Fee Agency PT MJ</th>
                    <th className="p-2.5 text-right">Disetor ke Klien</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {(store.payments || []).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-850/40">
                      <td className="p-2.5 text-slate-400 font-mono">{p.paymentDate}</td>
                      <td className="p-2.5 font-mono text-indigo-300 font-bold">{p.receiptNo}</td>
                      <td className="p-2.5">
                        <div className="text-white font-semibold">{p.debtorName}</div>
                        <div className="text-[10px] text-slate-500">{p.clientName}</div>
                      </td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800/60 rounded text-[10px]">
                          Pelunasan ({p.method})
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-semibold text-white">{formatRupiahNumber(p.amount)}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-400">{formatRupiahNumber(p.feePortion)}</td>
                      <td className="p-2.5 text-right font-mono text-cyan-300">{formatRupiahNumber(p.amount - p.feePortion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: PORTOFOLIO DEBITUR & KASUS */}
        {activeTab === 'DEBTOR_PORTFOLIO' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="p-3">No. Perkara</th>
                  <th className="p-3">Klien Pemberi Kuasa</th>
                  <th className="p-3">Nama Debitur & NIK</th>
                  <th className="p-3">No. Kontrak</th>
                  <th className="p-3 text-right">OS Pokok Piutang</th>
                  <th className="p-3 text-center">DPD (Hari)</th>
                  <th className="p-3">Field Partner (PIC)</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850/50 transition">
                    <td className="p-3 font-mono font-bold text-indigo-300">
                      {c.caseNo}
                    </td>
                    <td className="p-3">
                      <div className="text-white font-medium">{c.clientName}</div>
                      <span className="text-[10px] text-slate-500 uppercase">{c.clientType || 'MULTIFINANCE'}</span>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-white">{c.debtorName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">NIK: {c.debtorNik || '-'}</div>
                    </td>
                    <td className="p-3 font-mono text-slate-300">
                      {c.multifinanceContractNo || '-'}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-amber-300">
                      {formatRupiahNumber(c.principalDebtOS)}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800/60">
                        {c.overdueDays} DPD
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="text-slate-300">{c.currentPersonnelName || '-'}</span>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                        c.status === 'SETTLED' || c.status === 'CLOSED'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : c.status === 'IN_PROGRESS' || c.status === 'ASSIGNED'
                          ? 'bg-blue-950 text-blue-300 border-blue-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 4: SETTLEMENTS */}
        {activeTab === 'SETTLEMENTS' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="p-3">No. Settlement</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Klien Multifinance</th>
                  <th className="p-3 text-right">Total Terkumpul</th>
                  <th className="p-3 text-right">Potongan Fee Agency</th>
                  <th className="p-3 text-right">Net Remittance Klien</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(store.settlements || []).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/50">
                    <td className="p-3 font-mono font-bold text-cyan-300">{s.settlementNo}</td>
                    <td className="p-3 text-slate-400 font-mono">{s.settlementDate}</td>
                    <td className="p-3 font-bold text-white">{s.clientName}</td>
                    <td className="p-3 text-right font-mono text-white">{formatRupiahNumber(s.totalCollected)}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatRupiahNumber(s.agencyFeeDeducted)}</td>
                    <td className="p-3 text-right font-mono font-bold text-cyan-400">{formatRupiahNumber(s.netRemittanceToClient)}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded text-[10px] font-semibold">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 5: DANA TALANGAN */}
        {activeTab === 'DANA_TALANGAN' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="p-3">No. Proposal</th>
                  <th className="p-3">Klien & Debitur</th>
                  <th className="p-3">Keperluan</th>
                  <th className="p-3 text-right">Modal Ditalangi</th>
                  <th className="p-3 text-center">Return %</th>
                  <th className="p-3 text-right">Imbal Hasil Fee</th>
                  <th className="p-3">Target Pelunasan</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(store.danaTalangan || []).map((d) => (
                  <tr key={d.id} className="hover:bg-slate-850/50">
                    <td className="p-3 font-mono font-bold text-purple-300">{d.proposalNo}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{d.debtorName}</div>
                      <div className="text-[10px] text-slate-500">{d.clientName} (Perkara: {d.caseNo})</div>
                    </td>
                    <td className="p-3 text-slate-300 max-w-xs truncate">{d.purpose}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">{formatRupiahNumber(d.amountRequired)}</td>
                    <td className="p-3 text-center font-mono font-bold text-purple-300">{d.returnFeePercent}%</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatRupiahNumber(d.returnFeeAmount)}</td>
                    <td className="p-3 font-mono text-slate-400">{d.targetRepaymentDate}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 bg-purple-950 text-purple-300 border border-purple-800 rounded text-[10px] font-semibold">
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 6: AUDIT TRAIL */}
        {activeTab === 'AUDIT_TRAIL' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-mono text-[11px]">
                  <th className="p-3">Waktu</th>
                  <th className="p-3">User & Role</th>
                  <th className="p-3">Aksi</th>
                  <th className="p-3">Modul</th>
                  <th className="p-3">Target</th>
                  <th className="p-3">Rincian Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {(store.auditLogs || []).slice(0, 30).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-850/50">
                    <td className="p-3 font-mono text-slate-400 text-[10px]">{l.timestamp}</td>
                    <td className="p-3">
                      <div className="font-bold text-white">{l.username}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{l.role}</div>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        l.action === 'CREATE' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                        l.action === 'UPDATE' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                        l.action === 'DELETE' ? 'bg-red-950 text-red-300 border-red-800' :
                        l.action === 'EXPORT' ? 'bg-amber-950 text-amber-300 border-amber-800' :
                        'bg-slate-800 text-slate-300 border-slate-700'
                      }`}>
                        {l.action}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-300">{l.module}</td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{l.targetId}</td>
                    <td className="p-3 text-slate-300 max-w-md truncate">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
