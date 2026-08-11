import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, CommunicationLog } from '../../types/arms';
import { PhoneCall, Plus, MessageSquare, ExternalLink, Paperclip, CheckCircle } from 'lucide-react';

interface CommLogModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const CommLogModule: React.FC<CommLogModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [partnerId, setPartnerId] = useState(store.partners[0]?.id || '');
  const [channel, setChannel] = useState<'WHATSAPP' | 'PHONE' | 'IN_PERSON'>('WHATSAPP');
  const [contactPerson, setContactPerson] = useState('Komandan Eko Wibowo');
  const [summary, setSummary] = useState('');
  const [outcome, setOutcome] = useState<'NO_ANSWER' | 'PROMISE_TO_PAY' | 'REFUSED' | 'MEDIATION_AGREED' | 'UNIT_FOUND' | 'OTHER'>('UNIT_FOUND');
  const [followUpAction, setFollowUpAction] = useState('');
  const [attachmentDriveUrl, setAttachmentDriveUrl] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleAddLog = (e: React.FormEvent) => {
    e.preventDefault();
    const c = store.cases.find((cs) => cs.id === caseId);
    const p = store.partners.find((pr) => pr.id === partnerId);

    const newLog: CommunicationLog = {
      id: `LOG-${Date.now()}`,
      caseId,
      caseNo: c?.caseNo || 'CAS-001',
      partnerId,
      partnerName: p?.name || 'Partner',
      logDate: new Date().toISOString(),
      channel,
      contactPerson,
      summary,
      outcome,
      followUpAction,
      attachmentDriveUrl,
      recordedBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Communication_Log',
      newLog.id,
      `Recorded Communication Log for ${newLog.caseNo} via ${channel}`
    );

    onUpdateStore({
      ...store,
      commLogs: [newLog, ...store.commLogs],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <PhoneCall className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-bold text-white">Communication Log — Field & WhatsApp Reports</h2>
          </div>
          <p className="text-xs text-slate-400">
            Control Tower Logging for WhatsApp Comms, Partner Field Updates & Debtor Negotiations
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record WhatsApp / Call Log</span>
          </button>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Case No</th>
                <th className="py-3 px-4">Partner & Contact</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Summary</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Follow-Up Action</th>
                <th className="py-3 px-4 text-center">Attachment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.commLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {new Date(log.logDate).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-indigo-300">{log.caseNo}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-semibold text-white">{log.partnerName}</div>
                    <div className="text-[10px] text-slate-400">{log.contactPerson}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="bg-emerald-950/80 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold inline-flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {log.channel}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-200 max-w-[240px] leading-relaxed">{log.summary}</td>
                  <td className="py-3.5 px-4">
                    <span className="bg-slate-800 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                      {log.outcome}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">{log.followUpAction}</td>
                  <td className="py-3.5 px-4 text-center">
                    {log.attachmentDriveUrl ? (
                      <a
                        href={log.attachmentDriveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddLog} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">Record WhatsApp / Communication Log</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Select Case</label>
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.caseNo} - {c.debtorName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Partner Agency</label>
                <select
                  value={partnerId}
                  onChange={(e) => setPartnerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  {store.partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Channel</label>
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="PHONE">Phone Call</option>
                  <option value="IN_PERSON">In-Person Meeting</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Contact Person Name</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Communication Summary</label>
              <textarea
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Details of WhatsApp report or field update..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Outcome</label>
                <select
                  value={outcome}
                  onChange={(e) => setOutcome(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                >
                  <option value="UNIT_FOUND">Unit Found & Secured</option>
                  <option value="PROMISE_TO_PAY">Promise To Pay</option>
                  <option value="MEDIATION_AGREED">Mediation Agreed</option>
                  <option value="NO_ANSWER">No Answer</option>
                  <option value="REFUSED">Refused / Dispute</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Follow-up Action</label>
                <input
                  type="text"
                  value={followUpAction}
                  onChange={(e) => setFollowUpAction(e.target.value)}
                  placeholder="e.g. Issue BAST / Issue SK"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Drive Attachment Link (Photo/BAST/PDF)</label>
              <input
                type="text"
                value={attachmentDriveUrl}
                onChange={(e) => setAttachmentDriveUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
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
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-500"
              >
                Save Log Record
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
