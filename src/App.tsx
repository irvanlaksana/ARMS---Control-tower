import React, { useState, useEffect } from 'react';
import { ARMSStore } from './services/armsDataService';
import { useFirebaseStore } from './hooks/useFirebaseStore';
import { User, UserRole } from './types/arms';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

// Modules
import { DashboardModule } from './components/modules/DashboardModule';
import { ApprovalCenterModule } from './components/modules/ApprovalCenterModule';
import { CasesModule } from './components/modules/CasesModule';
import { DanaTalanganModule } from './components/modules/DanaTalanganModule';
import { PettyCashModule } from './components/modules/PettyCashModule';
import { ModalKerjaModule } from './components/modules/ModalKerjaModule';
import { FinancePnLModule } from './components/modules/FinancePnLModule';
import { FeeConfigModule } from './components/modules/FeeConfigModule';
import { CommLogModule } from './components/modules/CommLogModule';
import { AssignmentModule } from './components/modules/AssignmentModule';
import { ClientsModule } from './components/modules/ClientsModule';
import { PersonnelModule } from './components/modules/PersonnelModule';
import { ContractsModule } from './components/modules/ContractsModule';
import { CustomersModule } from './components/modules/CustomersModule';
import { AssetsModule } from './components/modules/AssetsModule';
import { SKModule } from './components/modules/SKModule';
import { PaymentsModule } from './components/modules/PaymentsModule';
import { ExpensesModule } from './components/modules/ExpensesModule';
import { SettlementModule } from './components/modules/SettlementModule';
import { CollectionModule } from './components/modules/CollectionModule';
import { AssetRecoveryModule } from './components/modules/AssetRecoveryModule';
import { ServicesModule } from './components/modules/ServicesModule';
import { LawyerModule } from './components/modules/LawyerModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { DailyActivityModule } from './components/modules/DailyActivityModule';
import { DocumentsModule } from './components/modules/DocumentsModule';
import { UserManagementModule } from './components/modules/UserManagementModule';
import { AuditLogModule } from './components/modules/AuditLogModule';
import { SettingsModule } from './components/modules/SettingsModule';

export default function App() {
  const { store, updateStore: handleUpdateStore, forceSync, pushFullData, isSyncing } = useFirebaseStore();

  const [currentUser, setCurrentUser] = useState<User>(() => store.users[0] || {
    id: 'USR-001',
    username: 'superadmin',
    name: 'Super Admin Control Tower',
    email: 'admin@arms-controltower.co.id',
    role: 'SUPER_ADMIN_OPS',
    department: 'Control Tower Operations',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (store.users && store.users.length > 0) {
      const exists = store.users.find((u) => u.id === currentUser?.id);
      if (!exists) {
        setCurrentUser(store.users[0]);
      }
    }
  }, [store.users]);

  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showGASModal, setShowGASModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleRoleChange = (role: UserRole) => {
    const matchingUser = store.users.find((u) => u.role === role) || {
      id: `USR-${role}`,
      username: role.toLowerCase(),
      name: role.replace(/_/g, ' '),
      email: `${role.toLowerCase()}@arms-recovery.co.id`,
      role,
      status: 'ACTIVE' as const,
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(matchingUser);
  };

  const handleSyncData = forceSync;

  const renderModule = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <DashboardModule store={store} currentUser={currentUser} onNavigateTab={setActiveTab} />;
      case 'APPROVALS':
        return <ApprovalCenterModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'CASES':
        return <CasesModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'MODAL_KERJA':
        return <ModalKerjaModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} onNavigateTab={setActiveTab} />;
      case 'TALANGAN':
        return <DanaTalanganModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'PETTY_CASH':
        return <PettyCashModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'FINANCE':
        return <FinancePnLModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'FEE_CONFIG':
        return <FeeConfigModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'COMM_LOG':
        return <CommLogModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'ASSIGNMENTS':
        return <AssignmentModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'CLIENTS':
        return <ClientsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'PERSONNEL':
        return <PersonnelModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'CONTRACTS':
        return <ContractsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'CUSTOMERS':
        return <CustomersModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'ASSETS':
        return <AssetsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'SK':
        return <SKModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'PAYMENTS':
        return <PaymentsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'EXPENSES':
        return <ExpensesModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'SETTLEMENT':
        return <SettlementModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'COLLECTION':
        return <CollectionModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'RECOVERY':
        return <AssetRecoveryModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'LAWYER':
        return <LawyerModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'SERVICES':
        return <ServicesModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'REPORTS':
        return <ReportsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'DAILY_ACTIVITY':
        return <DailyActivityModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'DOCUMENTS':
        return <DocumentsModule store={store} />;
      case 'USERS':
        return <UserManagementModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'AUDIT':
        return <AuditLogModule store={store} />;
      case 'SETTINGS':
        return (
          <SettingsModule
            store={store}
            currentUser={currentUser}
            onUpdateStore={handleUpdateStore}
            onOpenSheetsModal={() => setShowSetupModal(true)}
            onOpenGASModal={() => setShowGASModal(true)}
            onPushFullFirebase={pushFullData}
            onSyncData={forceSync}
          />
        );
      default:
        return <DashboardModule store={store} currentUser={currentUser} onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        usersList={store.users || []}
        onSwitchUser={(u) => setCurrentUser(u)}
        isSheetsConnected={Boolean(store.settings?.googleSheetId || store.settings?.appsScriptWebAppUrl)}
        sheetId={store.settings?.googleSheetId || (store.settings?.appsScriptWebAppUrl ? 'GAS Connected' : '')}
        onOpenGASModal={() => setShowGASModal(true)}
        onOpenSheetsModal={() => setShowSetupModal(true)}
        onSyncData={handleSyncData}
        pendingApprovalsCount={(store.approvals || []).filter((a) => a.status === 'PENDING').length}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        settings={store.settings}
        isSyncing={isSyncing}
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Navigation Sidebar (Desktop Static + Mobile Drawer with Auto-Hide) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            // Auto-hide drawer on mobile upon selection
            setIsSidebarOpen(false);
          }}
          currentUserRole={currentUser.role}
          companyLogo={store.settings?.companyLogo}
          companyName={store.settings?.companyName}
          isMobileOpen={isSidebarOpen}
          onCloseMobile={() => setIsSidebarOpen(false)}
        />

        {/* Dynamic Content Panel */}
        <main className="min-w-0 flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4 pb-24 lg:pb-4 bg-slate-950">
          <div className="max-w-7xl mx-auto min-w-0 space-y-2 sm:space-y-3">{renderModule()}</div>
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (Auto-Hide / Simplified Menus) */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsSidebarOpen(false);
        }}
        onToggleMoreMenu={() => setIsSidebarOpen(!isSidebarOpen)}
        isMoreMenuOpen={isSidebarOpen}
        pendingApprovalsCount={(store.approvals || []).filter((a) => a.status === 'PENDING').length}
        userRole={currentUser.role}
      />
    </div>
  );
}
