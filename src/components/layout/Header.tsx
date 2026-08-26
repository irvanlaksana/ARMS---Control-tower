import React from 'react';
import { User, UserRole, AppSettings } from '../../types/arms';
import { Shield, Database, RefreshCw, Menu, Layers, CheckSquare } from 'lucide-react';

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
        return <span className="bg-red-950/80 text-red-300 text-[10px] px-2 py-0.5 rounded border border-red-800 font-semibold">Control Tower</span>;
      case 'APPROVER_EXECUTIVE':
        return <span className="bg-emerald-950/80 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold">Direktur Utama</span>;
      case 'VIEWER_COMMISSIONER':
        return <span className="bg-purple-950/80 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-800 font-semibold">Komisaris</span>;
      case 'VIEWER_INVESTOR':
        return <span className="bg-amber-950/80 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800 font-semibold">Investor</span>;
    }
  };

  const companyLogo = settings?.companyLogo;
  const companyName = settings?.companyName || 'ARMS — PT. MITRA JASA TAMA';

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 sticky top-0 z-30 shadow-md select-none">
      {/* Left: Brand & Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition shrink-0 active:scale-95"
            title="Buka / Tutup Menu"
            aria-label="Toggle Sidebar Menu"
          >
            <Menu className="w-5 h-5 text-red-400" />
          </button>
        )}

        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-slate-950 flex items-center justify-center text-white shadow-md font-bold text-base tracking-wider border border-red-500/40 overflow-hidden shrink-0">
          {companyLogo ? (
            <img src={companyLogo} alt={companyName} className="w-full h-full object-contain p-0.5" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-red-600 to-red-950 flex items-center justify-center text-white font-black text-sm">
              {companyName.charAt(0)}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5 truncate">
            <h1 className="font-extrabold text-xs sm:text-sm text-white tracking-tight truncate">{companyName}</h1>
            <span className="hidden sm:inline-block text-[9px] uppercase tracking-widest bg-red-950 text-red-300 px-1.5 py-0.5 rounded border border-red-700/60 font-bold">
              ARMS
            </span>
          </div>
          <p className="text-[10px] text-slate-400 truncate hidden md:block">
            {settings?.companyAddress || 'Agency Recovery Management System • Debt Recovery Control Tower'}
          </p>
        </div>
      </div>

      {/* Right: Actions, Live Indicator & User Switcher */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Firebase Live Pill */}
        <div
          className="flex items-center gap-1.5 text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg border bg-emerald-950/60 text-emerald-300 border-emerald-800 font-medium"
          title={isSyncing ? "Menyinkronkan data..." : "Firebase Database Online"}
        >
          <Database className={`w-3 h-3 text-emerald-400 ${isSyncing ? "animate-pulse" : ""}`} />
          <span className="hidden xs:inline sm:inline">
            {isSyncing ? "Sync..." : "Live DB"}
          </span>
        </div>

        {/* Sync Button */}
        <button
          onClick={onSyncData}
          disabled={isSyncing}
          className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white transition active:scale-95 disabled:opacity-50"
          title="Sinkronisasi Data Manual"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        {/* User Switcher Dropdown */}
        <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2 border-l border-slate-800">
          <div className="text-right hidden lg:block">
            <div className="text-xs font-bold text-white truncate max-w-[130px]">{currentUser.name}</div>
            <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
          </div>

          <select
            value={currentUser.id}
            onChange={(e) => {
              const selected = (usersList || []).find((u) => u.id === e.target.value);
              if (selected && onSwitchUser) onSwitchUser(selected);
            }}
            className="bg-slate-800 hover:bg-slate-700 text-[11px] sm:text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1.5 focus:outline-none focus:border-red-500 cursor-pointer font-medium max-w-[110px] sm:max-w-[180px] truncate"
            title="Ganti Pengguna / Role"
          >
            {(usersList || []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
};
