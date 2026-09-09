import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { 
  LayoutDashboard, Users, Briefcase, FileText, 
  Settings, LogOut, FileSpreadsheet, Activity, DollarSign
} from "lucide-react";
import { clsx } from "clsx";

export function Layout({ children }: { children: ReactNode }) {
  const { signOut, user } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Cases", path: "/cases", icon: Briefcase },
    { name: "Clients", path: "/clients", icon: Users },
    { name: "Finance", path: "/finance", icon: DollarSign },
    { name: "Audit Log", path: "/audit", icon: Activity },
    { name: "Settings", path: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="h-16 flex items-center px-6 font-bold text-white text-xl border-b border-slate-800">
          ARMS
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={clsx(
                      "flex items-center gap-3 px-6 py-3 hover:bg-slate-800 hover:text-white transition-colors",
                      isActive && "bg-slate-800 text-white border-l-4 border-blue-500"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="text-sm truncate mb-4">{user?.email}</div>
          <button 
            onClick={signOut}
            className="flex items-center gap-2 text-slate-400 hover:text-white w-full"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-8 justify-between shadow-sm">
          <h1 className="text-xl font-semibold text-gray-800">
            Agency Recovery Management System
          </h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
