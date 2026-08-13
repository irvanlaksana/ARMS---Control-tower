import React from 'react';
import { User, UserRole, AppSettings } from '../../types/arms';
import { Shield, Database, FileCode, Bell, UserCheck, RefreshCw, Layers, Menu } from 'lucide-react';

interface HeaderProps {
  currentUser: User;
  usersList: User[];
  onSwitchUser: (user: User) => void;
  onSyncData: () => void;
  pendingApprovalsCount: number;
  onToggleSidebar?: () => void;
  settings?: AppSettings;
  isSyncing?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  usersList = [],
  onSwitchUser,
  onSyncData,
  pendingApprovalsCount = 0,
  onToggleSidebar,
  settings,
  isSyncing = false,
}) => {
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN_OPS':
        return <span className="bg-blue-900/60 text-blue-300 text-xs px-2.5 py-0.5 rounded border border-blue-700/50 font-medium">Control Tower</span>;
      case 'APPROVER_EXECUTIVE':
        return <span className="bg-emerald-900/60 text-emerald-300 text-xs px-2.5 py-0.5 rounded border border-emerald-700/50 font-medium">Direktur Utama</span>;
      case 'VIEWER_COMMISSIONER':
        return <span className="bg-purple-900/60 text-purple-300 text-xs px-2.5 py-0.5 rounded border border-purple-700/50 font-medium">Komisaris</span>;
      case 'VIEWER_INVESTOR':
        return <span className="bg-amber-900/60 text-amber-300 text-xs px-2.5 py-0.5 rounded border border-amber-700/50 font-medium">Investor</span>;
    }
  };

  const companyLogo = settings?.companyLogo;
  const companyName = settings?.companyName || 'ARMS — Control Tower Agency DC';

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30 shadow-lg">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center text-white shadow-md font-bold text-xl tracking-wider border border-amber-500/30 overflow-hidden shrink-0">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="w-full h-full object-contain p-0.5" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-blue-700 flex items-center justify-center text-white font-bold text-lg">
              {companyName.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-lg text-white tracking-tight">{companyName}</h1>
            <span className="text-[10px] uppercase tracking-widest bg-slate-800 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30 font-semibold">Enterprise</span>
          </div>
          <p className="text-xs text-slate-400">
            {settings?.companyAddress || 'Google Sheets Single Source of Truth • Agency Recovery Management System'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Firebase Connection Pill */}
        <div
          className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition ${
            true
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80'
              : 'bg-slate-800/80 text-amber-300 border-slate-700'
          }`}
          title={isSyncing ? "Syncing..." : "Firebase Live"}
        >
          <Database className={`w-3.5 h-3.5 text-emerald-400 ${isSyncing ? "animate-pulse" : ""}`} />
          <span className="font-medium">
            {isSyncing ? "Syncing..." : "Firebase Live"}
          </span>
        </div>

        {/* Sync Button */}
        <button
          onClick={onSyncData}
          className="p-1.5 rounded-md bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 transition"
          title="Manual Sync with Firebase"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        

        {/* Role Quick Switcher */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-semibold text-slate-200">{currentUser.name}</div>
            <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
          </div>

          <div className="relative group">
            <select
              value={currentUser.id}
              onChange={(e) => {
                const selected = (usersList || []).find((u) => u.id === e.target.value);
                if (selected && onSwitchUser) onSwitchUser(selected);
              }}
              className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-md px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {(usersList || []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role.replace(/_/g, ' ')})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
