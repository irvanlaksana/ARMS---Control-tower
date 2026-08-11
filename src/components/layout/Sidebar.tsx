import React from 'react';
import { UserRole } from '../../types/arms';
import { 
  LayoutDashboard, CheckSquare, Briefcase, Users, PhoneCall, Receipt, ShieldAlert,
  Car, FileText, UserPlus, Building2, Handshake, DollarSign, Wallet, FileSpreadsheet,
  Settings, FolderGit2, ShieldCheck, Scale, PieChart, Coins, Lock, Eye, AlertCircle
} from 'lucide-react';

export type ModuleTab = 
  | 'dashboard' | 'approvals' | 'cases' | 'assignments' | 'commlog' | 'collections'
  | 'asset_recovery' | 'assets' | 'sks' | 'leads' | 'clients' | 'partners' | 'customers'
  | 'dana_talangan' | 'payments' | 'expenses' | 'settlement' | 'finance' | 'fee_config'
  | 'contracts' | 'services' | 'reports' | 'documents' | 'audit_log' | 'users' | 'settings';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  userRole?: UserRole;
  currentUserRole?: UserRole;
  pendingApprovalsCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  currentUserRole,
  pendingApprovalsCount = 0,
}) => {
  const role = userRole || currentUserRole || 'SUPER_ADMIN_OPS';

  const isAllowed = (tab: string): boolean => {
    if (role === 'SUPER_ADMIN_OPS') return true;

    if (role === 'APPROVER_EXECUTIVE') {
      return [
        'DASHBOARD', 'APPROVALS', 'CASES', 'CONTRACTS', 'SK', 'TALANGAN',
        'EXPENSES', 'SETTLEMENT', 'FINANCE', 'REPORTS', 'DOCUMENTS', 'AUDIT', 'CLIENTS'
      ].includes(tab);
    }

    if (role === 'VIEWER_COMMISSIONER') {
      return [
        'DASHBOARD', 'CASES', 'FINANCE', 'TALANGAN', 'REPORTS', 'DOCUMENTS', 'AUDIT'
      ].includes(tab);
    }

    if (role === 'VIEWER_INVESTOR') {
      return [
        'DASHBOARD', 'TALANGAN', 'FINANCE', 'REPORTS'
      ].includes(tab);
    }

    return false;
  };

  const navGroups = [
    {
      title: 'OVERVIEW & APPROVALS',
      items: [
        { id: 'DASHBOARD', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'APPROVALS', label: 'Approval Center', icon: CheckSquare, badge: pendingApprovalsCount },
      ],
    },
    {
      title: 'CORE RECOVERY & OPERATIONS',
      items: [
        { id: 'CASES', label: 'Cases / Piutang', icon: Briefcase },
        { id: 'ASSIGNMENTS', label: 'Assignments', icon: Users },
        { id: 'COMM_LOG', label: 'Communication Log', icon: PhoneCall },
        { id: 'COLLECTION', label: 'Collections', icon: Receipt },
        { id: 'RECOVERY', label: 'Asset Recovery', icon: ShieldAlert },
        { id: 'ASSETS', label: 'Assets Warehouse', icon: Car },
        { id: 'SK', label: 'Surat Kuasa (SK)', icon: FileText },
      ],
    },
    {
      title: 'CRM, CLIENTS & PARTNERS',
      items: [
        { id: 'LEADS', label: 'Leads / CRM', icon: UserPlus },
        { id: 'CLIENTS', label: 'Clients / Multifinance', icon: Building2 },
        { id: 'PARTNERS', label: 'Partners & Field DC', icon: Handshake },
        { id: 'CUSTOMERS', label: 'Customers / Debtors', icon: Users },
      ],
    },
    {
      title: 'FINANCE & LIQUIDITY',
      items: [
        { id: 'TALANGAN', label: 'Dana Talangan', icon: Coins },
        { id: 'PAYMENTS', label: 'Payments', icon: DollarSign },
        { id: 'EXPENSES', label: 'Expenses', icon: Wallet },
        { id: 'SETTLEMENT', label: 'Settlement Remittance', icon: Scale },
        { id: 'FINANCE', label: 'Finance & P&L', icon: PieChart },
        { id: 'FEE_CONFIG', label: 'Fee Engine', icon: Settings },
        { id: 'CONTRACTS', label: 'Contracts / MoU', icon: FileSpreadsheet },
        { id: 'SERVICES', label: 'Services', icon: FolderGit2 },
      ],
    },
    {
      title: 'ADMINISTRATION',
      items: [
        { id: 'REPORTS', label: 'Reports & Analytics', icon: FileSpreadsheet },
        { id: 'DOCUMENTS', label: 'Documents & Drive', icon: FileText },
        { id: 'AUDIT', label: 'Audit Log', icon: ShieldCheck },
        { id: 'USERS', label: 'User Management', icon: Users },
        { id: 'SETTINGS', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 h-[calc(100vh-57px)] overflow-y-auto text-slate-300">
      <div className="p-4 border-b border-slate-800/80 bg-slate-900/50">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          Active Role Level
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300 bg-indigo-950/60 p-2 rounded border border-indigo-900/50">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>{(role || '').replace(/_/g, ' ')}</span>
        </div>
      </div>

      <nav className="p-3 space-y-6 flex-1">
        {navGroups.map((group, idx) => {
          const visibleItems = group.items.filter((item) => isAllowed(item.id));
          if (visibleItems.length === 0) return null;

          return (
            <div key={idx} className="space-y-1">
              <div className="px-3 text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">
                {group.title}
              </div>
              {visibleItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-900/40'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && item.badge > 0 ? (
                      <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full shadow">
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 bg-slate-950/40 flex items-center justify-between">
        <span>ARMS v1.0 • GAS DB</span>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="System Online"></span>
      </div>
    </aside>
  );
};
