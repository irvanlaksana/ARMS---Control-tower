import React, { useState } from 'react';
import { UserRole } from '../../types/arms';
import { 
  LayoutDashboard, CheckSquare, Briefcase, Users, PhoneCall, Receipt, ShieldAlert,
  Car, FileText, UserPlus, Building2, DollarSign, Wallet, FileSpreadsheet,
  Settings, FolderGit2, ShieldCheck, Scale, PieChart, Coins, Banknote, Landmark,
  X, Search, ChevronRight, Layers, Sparkles, Activity
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  userRole?: UserRole;
  currentUserRole?: UserRole;
  pendingApprovalsCount?: number;
  companyLogo?: string;
  companyName?: string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  currentUserRole,
  pendingApprovalsCount = 0,
  companyLogo,
  companyName,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const role = userRole || currentUserRole || 'SUPER_ADMIN_OPS';
  const [searchQuery, setSearchQuery] = useState('');

  const isAllowed = (tab: string): boolean => {
    if (role === 'SUPER_ADMIN_OPS') return true;

    if (role === 'APPROVER_EXECUTIVE') {
      return [
        'PETTY_CASH', 'EXPENSES', 'PAYMENTS', 'SETTLEMENT', 'FINANCE', 'REPORTS', 'DOCUMENTS', 'AUDIT', 'CLIENTS'
      ].includes(tab);
    }

    if (role === 'VIEWER_COMMISSIONER') {
      return [
      ].includes(tab);
    }

    if (role === 'VIEWER_INVESTOR') {
      return [
        'DASHBOARD', 'TALANGAN', 'FINANCE', 'REPORTS'
      ].includes(tab);
    }

    return false;
  };

  // Simplified and intuitive menu labels
  const navGroups = [
    {
      title: 'UTAMA & PERSETUJUAN',
      items: [
        { id: 'DASHBOARD', label: 'Dashboard', shortLabel: 'Home', icon: LayoutDashboard },
        { id: 'APPROVALS', label: 'Persetujuan (Approvals)', shortLabel: 'Persetujuan', icon: CheckSquare, badge: pendingApprovalsCount },
      ],
    },
    {
      title: 'MASTER DATA & MITRA',
      items: [
        { id: 'CLIENTS', label: 'Klien & Multifinance', shortLabel: 'Klien', icon: Building2 },
        { id: 'CONTRACTS', label: 'Kontrak & MoU', shortLabel: 'Kontrak', icon: FileSpreadsheet },
        { id: 'CUSTOMERS', label: 'Data Debitur', shortLabel: 'Debitur', icon: Users },
        { id: 'PERSONNEL', label: 'Tim Karyawan & Mitra DC', shortLabel: 'Tim & Mitra', icon: Users },
        { id: 'SERVICES', label: 'Katalog Layanan', shortLabel: 'Layanan', icon: FolderGit2 },
        { id: 'FEE_CONFIG', label: 'Tarif & Fee Recovery', shortLabel: 'Tarif Fee', icon: Settings },
      ],
    },
    {
      title: 'OPERASIONAL & LAPANGAN',
      items: [
        { id: 'CASES', label: 'Kasus & Piutang', shortLabel: 'Kasus', icon: Briefcase },
        { id: 'SK', label: 'Surat Kuasa (SK)', shortLabel: 'Surat Kuasa', icon: FileText },
        { id: 'ASSIGNMENTS', label: 'Penugasan Lapangan', shortLabel: 'Penugasan', icon: Users },
        { id: 'LAWYER', label: 'Lawyer & Somasi', shortLabel: 'Lawyer', icon: Scale },
        { id: 'COLLECTION', label: 'Koleksi & Log Komunikasi', shortLabel: 'Koleksi', icon: Receipt },
        { id: 'RECOVERY', label: 'Eksekusi & Tarik Aset', shortLabel: 'Eksekusi Aset', icon: ShieldAlert },
        { id: 'ASSETS', label: 'Gudang Penitipan Aset', shortLabel: 'Gudang Aset', icon: Car },
      ],
    },
    {
      title: 'KEUANGAN & KAS',
      items: [
        { id: 'MODAL_KERJA', label: 'Modal Kerja & Rekening', shortLabel: 'Modal Kerja', icon: Landmark },
        { id: 'TALANGAN', label: 'Dana Talangan', shortLabel: 'Talangan', icon: Coins },
        { id: 'PETTY_CASH', label: 'Kas Kecil (Petty Cash)', shortLabel: 'Petty Cash', icon: Banknote },
        { id: 'EXPENSES', label: 'Pengeluaran (Biaya)', shortLabel: 'Pengeluaran', icon: Wallet },
        { id: 'PAYMENTS', label: 'Penerimaan Dana', shortLabel: 'Penerimaan', icon: DollarSign },
        { id: 'SETTLEMENT', label: 'Settlement & Remitansi', shortLabel: 'Settlement', icon: Scale },
        { id: 'FINANCE', label: 'Laporan Laba / Rugi (P&L)', shortLabel: 'Laba/Rugi', icon: PieChart },
      ],
    },
    {
      title: 'ADMINISTRASI & SISTEM',
      items: [
        { id: 'DOCUMENTS', label: 'Dokumen & Google Drive', shortLabel: 'Dokumen', icon: FileText },
        { id: 'DAILY_ACTIVITY', label: 'Daily Activity', shortLabel: 'Daily', icon: Activity },
        { id: 'REPORTS', label: 'Laporan & Rekapitulasi', shortLabel: 'Laporan', icon: FileSpreadsheet },
        { id: 'AUDIT', label: 'Log Audit Keamanan', shortLabel: 'Log Audit', icon: ShieldCheck },
        { id: 'USERS', label: 'Kelola Pengguna', shortLabel: 'Pengguna', icon: Users },
        { id: 'SETTINGS', label: 'Pengaturan Sistem', shortLabel: 'Pengaturan', icon: Settings },
      ],
    },
  ];

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const filteredNavGroups = navGroups.map((group) => {
    const visible = group.items.filter((item) => {
      const allowed = isAllowed(item.id);
      if (!allowed) return false;
      if (!searchQuery.trim()) return true;
      return (
        item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.shortLabel.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
    return { ...group, items: visible };
  }).filter((g) => g.items.length > 0);

  return (
    <>
      {/* Mobile Backdrop Overlay (Auto-Hide when tapped outside) */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container (Desktop static, Mobile off-canvas drawer) */}
      <aside 
        className={`
          w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 text-slate-300 select-none
          lg:static lg:h-[calc(100vh-57px)] lg:translate-x-0 lg:z-auto
          fixed inset-y-0 left-0 z-50 h-full max-w-[85vw] shadow-2xl transition-transform duration-300 ease-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand & Logo Header */}
        <div className="p-3.5 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow border border-red-500/30 overflow-hidden shrink-0">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName || 'Logo'} className="w-full h-full object-contain p-0.5" />
              ) : (
                <span className="font-bold text-red-400 text-sm">{(companyName || 'ARMS').charAt(0)}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">{companyName || 'MJ Agency Recovery'}</div>
              <div className="text-[10px] text-red-400 font-semibold tracking-tight">CONTROL TOWER DC</div>
            </div>
          </div>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 transition"
              title="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Quick Search on Mobile / Desktop */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari modul / menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-red-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Active Role Indicator */}
        <div className="px-3.5 py-2 border-b border-slate-800/60 bg-slate-900/40 flex items-center justify-between text-[10px]">
          <span className="text-slate-400 font-semibold uppercase">Role:</span>
          <span className="font-bold text-red-400 bg-red-950/60 border border-red-900/60 px-2 py-0.5 rounded truncate max-w-[170px]">
            {(role || '').replace(/_/g, ' ')}
          </span>
        </div>

        {/* Nav Items List */}
        <nav className="p-2.5 space-y-5 flex-1 overflow-y-auto overscroll-contain">
          {filteredNavGroups.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-2 text-[9.5px] font-bold text-slate-500 tracking-wider uppercase mb-1 flex items-center gap-1">
                <span>{group.title}</span>
              </div>
              
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer group ${
                      isActive
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white font-bold shadow-md shadow-red-950/60'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/80 active:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-red-400'}`} />
                      <span className="truncate text-left">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.badge && item.badge > 0 ? (
                        <span className="bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-full shadow animate-pulse">
                          {item.badge}
                        </span>
                      ) : null}
                      {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}

          {filteredNavGroups.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-500">
              Tidak ada menu "{searchQuery}"
            </div>
          )}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 text-[10.5px] text-slate-500 bg-slate-950 flex items-center justify-between">
          <span className="font-mono">ARMS Control Tower</span>
          <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </aside>
    </>
  );
};
