import React, { useState, useEffect } from 'react';
import { initializeARMSStore, ARMSStore, getStoredStore, saveStore, fetchDataFromGoogleSheets, mapGasDataToStore } from './services/armsDataService';
import { User, UserRole } from './types/arms';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { SetupSheetsModal } from './components/modals/SetupSheetsModal';
import { GASCodeModal } from './components/modals/GASCodeModal';

// Modules
import { DashboardModule } from './components/modules/DashboardModule';
import { ApprovalCenterModule } from './components/modules/ApprovalCenterModule';
import { CasesModule } from './components/modules/CasesModule';
import { DanaTalanganModule } from './components/modules/DanaTalanganModule';
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
import { LeadsModule } from './components/modules/LeadsModule';
import { ReportsModule } from './components/modules/ReportsModule';
import { DocumentsModule } from './components/modules/DocumentsModule';
import { UserManagementModule } from './components/modules/UserManagementModule';
import { AuditLogModule } from './components/modules/AuditLogModule';
import { SettingsModule } from './components/modules/SettingsModule';

export default function App() {
  const [store, setStore] = useState<ARMSStore>(() => {
    return getStoredStore() || initializeARMSStore();
  });

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

  // Initial Data Pull from Google Sheets on app startup
  useEffect(() => {
    const webAppUrl = store.settings?.appsScriptWebAppUrl;
    if (webAppUrl) {
      fetchDataFromGoogleSheets(webAppUrl, store).then((updatedStore) => {
        setStore(updatedStore);
      }).catch((e) => console.warn('Initial GAS pull failed:', e));
    }
  }, []);
  const [activeTab, setActiveTab] = useState('DASHBOARD');
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showGASModal, setShowGASModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Sync state changes to local storage & connected Google Sheets
  const handleUpdateStore = (newStore: ARMSStore) => {
    setStore(newStore);
    saveStore(newStore);

    // Auto-sync to Google Sheets in background if connected
    if (newStore.settings?.appsScriptWebAppUrl) {
      fetch('/api/gas/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: newStore.settings.appsScriptWebAppUrl,
          action: 'SYNC_FULL_DATA',
          data: newStore,
        }),
      }).catch(() => {
        // Direct browser fetch fallback
        fetch(newStore.settings.appsScriptWebAppUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'SYNC_FULL_DATA',
            data: newStore,
          }),
        }).catch((e) => console.error('Auto sync GAS error:', e));
      });
    } else if (newStore.settings?.googleSheetId) {
      fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spreadsheetId: newStore.settings.googleSheetId,
          data: newStore,
        }),
      }).catch((e) => console.error('Auto sync Sheets error:', e));
    }
  };

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

  const handleSyncData = async () => {
    if (store.settings.appsScriptWebAppUrl) {
      try {
        // First pull latest data from Google Sheets
        const refreshedStore = await fetchDataFromGoogleSheets(store.settings.appsScriptWebAppUrl, store);
        setStore(refreshedStore);

        // Then push full data back to Google Sheets
        const res = await fetch('/api/gas/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl: store.settings.appsScriptWebAppUrl,
            action: 'SYNC_FULL_DATA',
            data: refreshedStore,
          }),
        });
        if (!res.ok) throw new Error('Proxy returned non-200');
      } catch (e) {
        console.warn('Proxy failed, attempting direct push to GAS Web App:', e);
        try {
          await fetch(store.settings.appsScriptWebAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'SYNC_FULL_DATA',
              data: store,
            }),
          });
        } catch (err) {
          console.error('Failed sync to GAS Web App:', err);
        }
      }
    } else if (store.settings.googleSheetId) {
      try {
        await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spreadsheetId: store.settings.googleSheetId,
            data: store,
          }),
        });
      } catch (e) {
        console.error('Failed sync to Google Sheets:', e);
      }
    }
    handleUpdateStore({ ...store });
  };

  const renderModule = () => {
    switch (activeTab) {
      case 'DASHBOARD':
        return <DashboardModule store={store} currentUser={currentUser} onNavigateTab={setActiveTab} />;
      case 'APPROVALS':
        return <ApprovalCenterModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'CASES':
        return <CasesModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'TALANGAN':
        return <DanaTalanganModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
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
      case 'LEADS':
        return <LeadsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
      case 'REPORTS':
        return <ReportsModule store={store} currentUser={currentUser} onUpdateStore={handleUpdateStore} />;
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
          />
        );
      default:
        return <DashboardModule store={store} currentUser={currentUser} onNavigateTab={setActiveTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
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
      />

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        {isSidebarOpen && (
          <Sidebar
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            currentUserRole={currentUser.role}
            companyLogo={store.settings?.companyLogo}
            companyName={store.settings?.companyName}
          />
        )}

        {/* Dynamic Content Panel */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto space-y-6">{renderModule()}</div>
        </main>
      </div>

      {/* Setup Modals */}
      <SetupSheetsModal
        isOpen={showSetupModal}
        onClose={() => setShowSetupModal(false)}
        store={store}
        onUpdateStore={handleUpdateStore}
        onOpenGASModal={() => {
          setShowSetupModal(false);
          setShowGASModal(true);
        }}
      />

      <GASCodeModal
        isOpen={showGASModal}
        onClose={() => setShowGASModal(false)}
        googleSheetId={store.settings.googleSheetId}
      />
    </div>
  );
}
