import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Partner } from '../../types/arms';
import { Handshake, Plus } from 'lucide-react';

interface PartnersModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const PartnersModule: React.FC<PartnersModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [partnerCode, setPartnerCode] = useState('');
  const [coverageRegion, setCoverageRegion] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phoneWhatsApp, setPhoneWhatsApp] = useState('');
  const [bankName, setBankName] = useState('Bank Mandiri');
  const [bankAccountNo, setBankAccountNo] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddPartner = (e: React.FormEvent) => {
    e.preventDefault();
    const newPartner: Partner = {
      id: `PRT-${Date.now()}`,
      partnerCode: partnerCode || `PRT-${Math.floor(100 + Math.random() * 900)}`,
      name,
      type: 'DC_AGENCY',
      coverageRegion,
      contactPerson,
      phoneWhatsApp,
      bankName,
      bankAccountNo,
      bankAccountName: name,
      ratingNotes: 'New partner agency',
      activeAssignmentsCount: 0,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Partners', newPartner.id, `Added Partner ${name}`);

    onUpdateStore({
      ...store,
      partners: [newPartner, ...store.partners],
      auditLogs: [audit, ...store.auditLogs],
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">External DC Partners & Field Agencies</h2>
          </div>
          <p className="text-xs text-slate-400">External Debt Collection Agencies, Legal Advocates & Recovery Specialists</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Partner Agency</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Agency / Firm Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Coverage Region</th>
                <th className="py-3 px-4">WhatsApp & Contact</th>
                <th className="py-3 px-4">Bank Account</th>
                <th className="py-3 px-4 text-center">Assignments</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.partners.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{p.partnerCode}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{p.name}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700">
                      {p.type}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{p.coverageRegion}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="text-emerald-400 font-semibold">{p.phoneWhatsApp}</div>
                    <div className="text-[10px] text-slate-400">{p.contactPerson}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {p.bankName}: {p.bankAccountNo}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-white">{p.activeAssignmentsCount}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                      {p.status}
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
          <form onSubmit={handleAddPartner} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Register Partner Agency</h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Partner Code</label>
              <input
                type="text"
                required
                value={partnerCode}
                onChange={(e) => setPartnerCode(e.target.value)}
                placeholder="e.g. DC-GARUDA"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Agency Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PT Garuda Eagle Recovery Services"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Coverage Region</label>
              <input
                type="text"
                value={coverageRegion}
                onChange={(e) => setCoverageRegion(e.target.value)}
                placeholder="e.g. Jabodetabek & Banten"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">WhatsApp Number</label>
              <input
                type="text"
                value={phoneWhatsApp}
                onChange={(e) => setPhoneWhatsApp(e.target.value)}
                placeholder="+62 812-xxxx-xxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
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
                Save Partner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
