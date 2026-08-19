import React, { useMemo } from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { UserRole, User } from '../../types/arms';
import { 
  Building2, Briefcase, DollarSign, Wallet, CheckSquare, ShieldAlert,
  Coins, ArrowUpRight, ArrowDownRight, Clock, AlertCircle, FileText, TrendingUp, PieChart as PieChartIcon, Target
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';

interface DashboardModuleProps {
  store: ARMSStore;
  userRole?: UserRole;
  currentUser?: User;
  onNavigateTab: (tab: any) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  store,
  userRole,
  currentUser,
  onNavigateTab,
}) => {
  const role = userRole || currentUser?.role || 'SUPER_ADMIN_OPS';

  // Financial Summary Calculations
  const totalCollected = (store.collections || []).reduce((sum, c) => sum + (c.amountCollected || 0), 0);
  const totalRevenueFee = (store.ledger || [])
    .filter((l) => l.account === 'REVENUE_FEE' && !l.isReversed)
    .reduce((sum, l) => sum + (l.amount || 0), 0);
  const totalExpenses = (store.expenses || [])
    .filter((e) => e.status === 'APPROVED')
    .reduce((sum, e) => sum + (e.amount || 0), 0);
  const netProfit = totalRevenueFee - totalExpenses;

  const totalCashBalance = (store.cashAccounts || []).reduce((sum, c) => sum + (c.balance || 0), 0);
  const activeTalanganAmount = (store.danaTalangan || [])
    .filter((t) => t.status === 'APPROVED' || t.status === 'DISBURSED')
    .reduce((sum, t) => sum + (t.requestedAmount || 0), 0);

  const pendingApprovals = (store.approvals || []).filter((a) => a.status === 'PENDING');
  const activeCasesCount = (store.cases || []).filter((c) => c.status !== 'CLOSED' && c.status !== 'CANCELLED').length;
  const recoveredUnitsCount = (store.assets || []).filter((a) => a.physicalStatus === 'RECOVERED_WAREHOUSE').length;

  // Monthly Collection Performance Data Calculation
  const monthlyData = useMemo(() => {
    const monthsMap: Record<string, { month: string; target: number; collected: number; revenue: number }> = {
      'Jan': { month: 'Jan', target: 0, collected: 0, revenue: 0 },
      'Feb': { month: 'Feb', target: 0, collected: 0, revenue: 0 },
      'Mar': { month: 'Mar', target: 0, collected: 0, revenue: 0 },
      'Apr': { month: 'Apr', target: 0, collected: 0, revenue: 0 },
      'Mei': { month: 'Mei', target: 0, collected: 0, revenue: 0 },
      'Jun': { month: 'Jun', target: 0, collected: 0, revenue: 0 },
    };

    (store.collections || []).forEach((c) => {
      if (c.collectionDate) {
        const date = new Date(c.collectionDate);
        const mName = date.toLocaleString('id-ID', { month: 'short' });
        if (monthsMap[mName]) {
          monthsMap[mName].collected += (c.amountCollected || 0);
          monthsMap[mName].revenue += (c.amountCollected || 0) * (store.settings?.defaultFeePercent || 15) / 100;
        }
      }
    });

    const result = Object.values(monthsMap);

    return result.map((m) => ({
      ...m,
      target: Math.round(m.target / 1000000),
      collected: Math.round(m.collected / 1000000),
      revenue: Math.round(m.revenue / 1000000),
    }));
  }, [store.collections, store.settings]);

  // Recovery Rate & Case Distribution Calculation
  const totalCases = (store.cases || []).length;
  const settledOrRecoveredCases = (store.cases || []).filter(
    (c) => c.status === 'SETTLED' || c.status === 'ASSET_RECOVERED' || c.status === 'CLOSED'
  ).length;
  const recoverySuccessRate = totalCases > 0 ? Math.round((settledOrRecoveredCases / totalCases) * 100) : 0;

  const caseDistributionData = useMemo(() => {
    const counts: Record<string, number> = {};
    (store.cases || []).forEach((c) => {
      const s = c.status || 'OTHER';
      counts[s] = (counts[s] || 0) + 1;
    });

    const COLOR_PALETTE: Record<string, string> = {
      SETTLED: '#10b981',
      ASSET_RECOVERED: '#3b82f6',
      ASSIGNED_FIELD: '#f59e0b',
      SK_ISSUED: '#6366f1',
      NEW_LEAD: '#8b5cf6',
      CLOSED: '#64748b',
    };

    const keys = Object.keys(counts);
    if (keys.length === 0) {
      return [
        { name: 'Belum Ada Kasus', value: 0, color: '#334155' },
      ];
    }

    return keys.map((k) => ({
      name: k.replace(/_/g, ' '),
      value: counts[k],
      color: COLOR_PALETTE[k] || '#a855f7',
    }));
  }, [store.cases]);

  return (
    <div className="space-y-6">
      {/* Top Welcome Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-lg">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-950/40 to-transparent pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-4">
            {store.settings?.companyLogo && (
              <div className="w-14 h-14 rounded-xl bg-slate-950 border border-amber-500/30 p-1 flex items-center justify-center shrink-0 shadow-md">
                <img
                  src={store.settings.companyLogo}
                  alt={store.settings?.companyName || 'Company Logo'}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-2.5 py-0.5 rounded border border-indigo-900">
                  {(role || '').replace(/_/g, ' ')} VIEW
                </span>
                <span className="text-xs text-slate-500">• Control Tower Agency DC</span>
              </div>
              <h2 className="text-2xl font-bold text-white">
                {store.settings?.companyName || 'ARMS Operations Dashboard'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {store.settings?.companyAddress || 'Google Sheets Single Source of Truth • Real-time Recovery, Finance & Liquidity Tracking'}
              </p>
            </div>
          </div>

          {pendingApprovals.length > 0 && (role === 'SUPER_ADMIN_OPS' || role === 'APPROVER_EXECUTIVE') && (
            <button
              onClick={() => onNavigateTab('APPROVALS')}
              className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 px-4 py-2.5 rounded-lg text-xs font-semibold hover:bg-amber-500/20 transition shadow"
            >
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <span>{pendingApprovals.length} Approval Requests Pending Review</span>
            </button>
          )}
        </div>
      </div>

      {/* Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Revenue (Agency Fee)</span>
            <div className="p-2 rounded-lg bg-emerald-950/80 text-emerald-400 border border-emerald-900/50">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {totalRevenueFee.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Success & Service Fees Earned</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Approved Expenses</span>
            <div className="p-2 rounded-lg bg-rose-950/80 text-rose-400 border border-rose-900/50">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {totalExpenses.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Field Ops, Towing & Warehouse</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Net Operating Profit</span>
            <div className="p-2 rounded-lg bg-indigo-950/80 text-indigo-400 border border-indigo-900/50">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {netProfit.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-indigo-300 font-medium">
            Revenue minus Approved Expenses
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Total Cash Liquidity</span>
            <div className="p-2 rounded-lg bg-amber-950/80 text-amber-400 border border-amber-900/50">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">
            Rp {totalCashBalance.toLocaleString('id-ID')}
          </div>
          <div className="text-[11px] text-amber-400 font-medium">
            Operational Bank + Talangan Vault
          </div>
        </div>
      </div>

      {/* Visual Analytics with Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Collection Performance Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Monthly Collection Performance & Agency Revenue (in Juta Rp)</span>
              </h3>
              <p className="text-[11px] text-slate-400">Pencapaian Target Penagihan vs Realisasi Collection & Success Fee</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
                Target
              </span>
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Collected
              </span>
              <span className="inline-flex items-center gap-1 text-indigo-400">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" />
                Revenue
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px', color: '#fff' }}
                  formatter={(val: any) => [`Rp ${val} Juta`, '']}
                />
                <Bar dataKey="target" name="Target (Juta)" fill="#475569" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected (Juta)" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="revenue" name="Revenue (Juta)" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recovery Success Rate & Case Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-indigo-400" />
                <span>Recovery Success Rate</span>
              </h3>
              <p className="text-[11px] text-slate-400">Persentase Penanganan Kasus & Distribusi Status</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-medium">Success Rate Overall</div>
                <div className="text-xl font-extrabold text-emerald-400 tracking-tight">{recoverySuccessRate}%</div>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div className="font-bold text-white">{settledOrRecoveredCases} of {totalCases} Cases</div>
              <span>Settled / Recovered</span>
            </div>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={caseDistributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {caseDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-800 pt-3">
            {caseDistributionData.slice(0, 4).map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-white font-mono">{item.value} Kasus</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operational Highlights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Cases & Recovery Status */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-indigo-400" />
              <span>Active Recovery Portfolio</span>
            </h3>
            <button
              onClick={() => onNavigateTab('CASES')}
              className="text-xs text-indigo-400 hover:text-indigo-300"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Active Cases</span>
              <span className="text-sm font-bold text-white">{activeCasesCount} Cases</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Recovered Units in Warehouse</span>
              <span className="text-sm font-bold text-emerald-400">{recoveredUnitsCount} Assets</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
              <span className="text-xs text-slate-400">Active Dana Talangan Disbursed</span>
              <span className="text-sm font-bold text-amber-400">
                Rp {activeTalanganAmount.toLocaleString('id-ID')}
              </span>
            </div>
          </div>
        </div>

        {/* Pending Approvals Summary */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-amber-400" />
              <span>Executive Approval Queue</span>
            </h3>
            <button
              onClick={() => onNavigateTab('APPROVALS')}
              className="text-xs text-amber-400 hover:text-amber-300"
            >
              Go to Approval Center ({pendingApprovals.length})
            </button>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs bg-slate-950/40 rounded-lg border border-slate-800/60">
              No pending approval requests. All contracts, SKs, expenses, and settlements are up to date.
            </div>
          ) : (
            <div className="space-y-2.5">
              {pendingApprovals.slice(0, 3).map((app) => (
                <div
                  key={app.id}
                  className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                        {app.module}
                      </span>
                      <span>{app.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Requested by: {app.requestedBy} • Ref: {app.targetReference}
                    </div>
                  </div>
                  {app.amountOrValue ? (
                    <div className="text-right">
                      <div className="font-bold text-emerald-400">
                        Rp {app.amountOrValue.toLocaleString('id-ID')}
                      </div>
                      <div className="text-[10px] text-amber-400">Pending Review</div>
                    </div>
                  ) : (
                    <span className="text-[10px] bg-amber-950 text-amber-300 px-2 py-1 rounded border border-amber-800">
                      Pending
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Multifinance Client Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-400" />
            <span>Multifinance Clients Portfolio Overview</span>
          </h3>
          <button
            onClick={() => onNavigateTab('CLIENTS')}
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Manage Clients
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Client Code</th>
                <th className="py-2.5 px-3">Company Name</th>
                <th className="py-2.5 px-3">Tier</th>
                <th className="py-2.5 px-3">Contact Person</th>
                <th className="py-2.5 px-3 text-center">Active Cases</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(store.clients || []).map((cli) => (
                <tr key={cli.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-mono font-semibold text-indigo-300">{cli.clientCode}</td>
                  <td className="py-3 px-3 font-medium text-white">{cli.companyName}</td>
                  <td className="py-3 px-3">
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                      {cli.tier}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400">{cli.contactPerson}</td>
                  <td className="py-3 px-3 text-center font-bold text-white">{cli.activeCasesCount}</td>
                  <td className="py-3 px-3 text-right">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-medium">
                      {cli.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
