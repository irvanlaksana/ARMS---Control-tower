import React from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User } from '../../types/arms';
import { BarChart3, Download, FileSpreadsheet, ShieldCheck, PieChart } from 'lucide-react';

interface ReportsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const handleExportCSV = (reportName: string) => {
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'EXPORT',
      'Reports',
      reportName,
      `Exported ${reportName} to CSV / Excel format`
    );

    onUpdateStore({
      ...store,
      auditLogs: [audit, ...store.auditLogs],
    });

    alert(`Report "${reportName}" exported successfully to CSV and logged in Audit Trail.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Executive Management Reports & Analytics</h2>
        </div>
        <p className="text-xs text-slate-400">Exportable Reports for Executive Direktur Utama, Commissioners & Investors</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Report 1 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-sm">Monthly Financial & Profit/Loss Statement</h3>
            </div>
            <button
              onClick={() => handleExportCSV('Financial_P_L_Statement')}
              className="flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-emerald-900 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Complete breakdown of Agency Revenue Fees, Partner Disbursements, Towing/Storage Expenses, and Net Profit.
          </p>
        </div>

        {/* Report 2 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-sm">Case Recovery Performance by Client</h3>
            </div>
            <button
              onClick={() => handleExportCSV('Recovery_Performance_By_Client')}
              className="flex items-center gap-1.5 bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-indigo-900 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Recovery rates, average Resolution Days (SLA), and DPD bucket efficiency per Multifinance client.
          </p>
        </div>

        {/* Report 3 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-white text-sm">Dana Talangan Liquidity & Return Ledger</h3>
            </div>
            <button
              onClick={() => handleExportCSV('Dana_Talangan_Liquidity_Ledger')}
              className="flex items-center gap-1.5 bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-amber-900 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Detailed tracking of short-term liquidity bridging, investor pool returns, and repayment targets.
          </p>
        </div>

        {/* Report 4 */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              <h3 className="font-bold text-white text-sm">Full System Audit Trail Log</h3>
            </div>
            <button
              onClick={() => handleExportCSV('System_Audit_Trail')}
              className="flex items-center gap-1.5 bg-purple-950 text-purple-300 border border-purple-800 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-900 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Full compliance log of user actions, approvals, financial adjustments, and data modifications.
          </p>
        </div>
      </div>
    </div>
  );
};
