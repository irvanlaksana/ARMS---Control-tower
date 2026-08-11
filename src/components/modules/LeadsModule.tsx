import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Lead } from '../../types/arms';
import { Target, Plus } from 'lucide-react';

interface LeadsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const LeadsModule: React.FC<LeadsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [prospectCompanyName, setProspectCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [estimatedPortfolioVal, setEstimatedPortfolioVal] = useState(5000000000);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    const newLead: Lead = {
      id: `LEAD-${Date.now()}`,
      leadCode: `LEAD-2026-${Math.floor(100 + Math.random() * 900)}`,
      companyName: prospectCompanyName,
      contactPerson,
      phone,
      email: 'contact@prospect.co.id',
      estimatedVolume: estimatedPortfolioVal,
      serviceRequested: 'RECOVERY_UNIT',
      stage: 'IN_NEGOTIATION',
      notes: 'New prospect outreach',
      assignedTo: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Leads', newLead.id, `Created Lead ${prospectCompanyName}`);

    onUpdateStore({
      ...store,
      leads: [newLead, ...store.leads],
      auditLogs: [audit, ...store.auditLogs],
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Target className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Leads CRM & B2B Multifinance Pipeline</h2>
          </div>
          <p className="text-xs text-slate-400">Prospecting New Multifinance Recovery Portfolios</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prospect Lead</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Lead Code</th>
                <th className="py-3 px-4">Prospect Company</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Est. Portfolio Size</th>
                <th className="py-3 px-4 text-center">Pipeline Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.leads.map((l) => (
                <tr key={l.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{l.leadCode}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{l.companyName}</td>
                  <td className="py-3.5 px-4 text-slate-300">{l.contactPerson}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">{l.phone}</td>
                  <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                    Rp {l.estimatedVolume.toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2.5 py-1 rounded-full border border-indigo-800 font-semibold">
                      {l.stage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddLead} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Register Prospect Lead</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Prospect Multifinance Name</label>
              <input
                type="text"
                required
                value={prospectCompanyName}
                onChange={(e) => setProspectCompanyName(e.target.value)}
                placeholder="e.g. PT Mandiri Utama Finance"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Contact Person</label>
              <input
                type="text"
                required
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Head of Collection"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Estimated NPL Portfolio Size (Rp)</label>
              <input
                type="number"
                value={estimatedPortfolioVal}
                onChange={(e) => setEstimatedPortfolioVal(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                Save Prospect
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
