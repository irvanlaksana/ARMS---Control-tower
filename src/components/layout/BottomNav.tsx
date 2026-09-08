import React from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Landmark, 
  Users, 
  Menu, 
  CheckSquare
} from 'lucide-react';
import { UserRole } from '../../types/arms';

interface BottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onToggleMoreMenu: () => void;
  isMoreMenuOpen: boolean;
  pendingApprovalsCount?: number;
  userRole?: UserRole;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onToggleMoreMenu,
  isMoreMenuOpen,
  pendingApprovalsCount = 0,
}) => {
  // Simplified menu definitions for 1-thumb mobile access
  const primaryNavItems = [
    {
      id: 'DASHBOARD',
      shortLabel: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'CASES',
      shortLabel: 'Tugas',
      icon: Briefcase,
    },
    {
      id: 'MODAL_KERJA',
      shortLabel: 'Kas',
      icon: Landmark,
    },
    {
      id: 'PERSONNEL',
      shortLabel: 'Tim',
      icon: Users,
    },
  ];

  const isPrimaryActive = primaryNavItems.some((item) => item.id === activeTab);

  return (
    <nav 
      aria-label="Mobile Navigation Bar"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)] transition-all duration-300 select-none pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-center justify-around px-2 py-1.5 max-w-md mx-auto">
        {primaryNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id && !isMoreMenuOpen;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (isMoreMenuOpen) onToggleMoreMenu();
                onSelectTab(item.id);
              }}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 min-w-[60px] min-h-[48px] relative ${
                isActive
                  ? 'text-indigo-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200 active:scale-95'
              }`}
            >
              {/* Active Indicator Glow / Pill */}
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
              )}

              <div className={`p-1 rounded-lg transition ${isActive ? 'bg-indigo-950/80 text-indigo-300' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>

              <span className={`text-[10px] tracking-tight mt-0.5 leading-none ${isActive ? 'text-indigo-300 font-bold' : 'text-slate-400 font-medium'}`}>
                {item.shortLabel}
              </span>
            </button>
          );
        })}

        {/* 5th Button: Menu Lengkap / More (Auto Drawer Toggle) */}
        <button
          onClick={onToggleMoreMenu}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 min-w-[60px] min-h-[48px] relative ${
            isMoreMenuOpen || (!isPrimaryActive && activeTab !== 'DASHBOARD')
              ? 'text-red-400 font-bold scale-105'
              : 'text-slate-400 hover:text-slate-200 active:scale-95'
          }`}
        >
          {(isMoreMenuOpen || (!isPrimaryActive && activeTab !== 'DASHBOARD')) && (
            <span className="absolute -top-1 w-8 h-1 bg-gradient-to-r from-red-500 to-amber-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
          )}

          <div className={`p-1 rounded-lg transition relative ${isMoreMenuOpen ? 'bg-red-950/80 text-red-300' : ''}`}>
            {pendingApprovalsCount > 0 ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}

            {/* Notification badge */}
            {pendingApprovalsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-amber-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center shadow-md animate-pulse">
                {pendingApprovalsCount}
              </span>
            )}
          </div>

          <span className={`text-[10px] tracking-tight mt-0.5 leading-none ${isMoreMenuOpen ? 'text-red-300 font-bold' : 'text-slate-400 font-medium'}`}>
            Menu
          </span>
        </button>
      </div>
    </nav>
  );
};
