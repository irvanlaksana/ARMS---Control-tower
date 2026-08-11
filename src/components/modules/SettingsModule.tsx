import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, AppSettings } from '../../types/arms';
import { Settings as SettingsIcon, Database, FileCode, CheckCircle, Save, ExternalLink } from 'lucide-react';

interface SettingsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
  onOpenSheetsModal: () => void;
  onOpenGASModal: () => void;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
  onOpenSheetsModal,
  onOpenGASModal,
}) => {
  const [settings, setSettings] = useState<AppSettings>(store.settings);
  const [savedMsg, setSavedMsg] = useState(false);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'UPDATE',
      'Settings',
      'APP_SETTINGS',
      `Updated ARMS System Settings (Sheet ID: ${settings.googleSheetId || 'None'})`
    );

    onUpdateStore({
      ...store,
      settings,
      auditLogs: [audit, ...store.auditLogs],
    });

    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <SettingsIcon className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">ARMS System Settings & Database Integration</h2>
          </div>
          <p className="text-xs text-slate-400">
            Configure Google Sheets Database, Apps Script Endpoint, Drive Folder ID & Enterprise Branding
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenGASModal}
            className="flex items-center gap-2 bg-indigo-950 text-indigo-300 border border-indigo-800 px-3 py-2 rounded-lg text-xs font-semibold hover:bg-indigo-900 transition"
          >
            <FileCode className="w-4 h-4 text-indigo-400" />
            <span>Get GAS Code</span>
          </button>
          <button
            onClick={onOpenSheetsModal}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
          >
            <Database className="w-4 h-4" />
            <span>Setup Google Sheets</span>
          </button>
        </div>
      </div>

      {savedMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>System Settings updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6 shadow-lg">
        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
            1. Google Sheets & Apps Script Integration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Spreadsheet ID</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.googleSheetId || ''}
                onChange={(e) => setSettings({ ...settings, googleSheetId: e.target.value })}
                placeholder="e.g. 1a2b3c4d5e6f7g8h9i0j..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Apps Script Web App URL</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.appsScriptWebAppUrl || ''}
                onChange={(e) => setSettings({ ...settings, appsScriptWebAppUrl: e.target.value })}
                placeholder="https://script.google.com/macros/s/.../exec"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Drive Storage Folder ID</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.googleDriveFolderId || ''}
                onChange={(e) => setSettings({ ...settings, googleDriveFolderId: e.target.value })}
                placeholder="Google Drive Folder ID for document/photo uploads"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Default Agency Fee %</label>
              <input
                type="number"
                disabled={!canEdit}
                value={settings.defaultFeePercent ?? 0}
                onChange={(e) => setSettings({ ...settings, defaultFeePercent: Number(e.target.value) })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
            2. Enterprise Company Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Name</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyName || ''}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Phone / Call Center</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyPhone || ''}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Company Official Email</label>
              <input
                type="email"
                disabled={!canEdit}
                value={settings.companyEmail || ''}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Headquarters Address</label>
              <input
                type="text"
                disabled={!canEdit}
                value={settings.companyAddress || ''}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-4 border-t border-slate-800">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
            >
              <Save className="w-4 h-4" />
              <span>Save System Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
