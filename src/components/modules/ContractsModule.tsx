import { Pagination, usePagination } from '../common/Pagination';
import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Contract, ApprovalRequest } from '../../types/arms';
import { FileSpreadsheet, Plus, ExternalLink, Edit2, Trash2 } from 'lucide-react';

interface ContractsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ContractsModule: React.FC<ContractsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [clientId, setClientId] = useState(store.clients[0]?.id || '');
  const [title, setTitle] = useState('');
  const [feeStructureSummary, setFeeStructureSummary] = useState('');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');
  const [draftContent, setDraftContent] = useState('');

  React.useEffect(() => {
    setDraftContent(`MEMORANDUM OF UNDERSTANDING (MoU) JASA PENAGIHAN\n\nPada hari ini, disepakati perjanjian kerjasama penagihan antara:\n1. KLIEN (Multi Finance)\n2. MJ AGENCY RECOVERY\n\nBahwa KLIEN menyerahkan kuasa penagihan portofolio macet (DPD 90+) kepada MJ AGENCY dengan struktur biaya:\n${feeStructureSummary || '[Isi struktur biaya]'}\n\nDemikian MoU ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.\n\nTtd,\n\n( KLIEN )          ( MJ AGENCY )`);
  }, [feeStructureSummary]);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleOpenModal = (contract?: Contract) => {
    if (contract) {
      setIsEditing(true);
      setEditId(contract.id);
      setClientId(contract.clientId);
      setTitle(contract.title);
      setFeeStructureSummary(contract.feeStructureSummary || '');
      setDriveDocumentUrl(contract.driveDocumentUrl || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setClientId(store.clients[0]?.id || '');
      setTitle('');
      setFeeStructureSummary('');
      setDriveDocumentUrl('');
    }
    setShowModal(true);
  };

  const handleDeleteContract = (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete contract "${title}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Contracts',
      id,
      `Deleted contract ${title}`
    );

    onUpdateStore({
      ...store,
      contracts: store.contracts.filter(c => c.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleSaveContract = (e: React.FormEvent) => {
    e.preventDefault();
    const client = store.clients.find((c) => c.id === clientId);

    if (isEditing && editId) {
      const updatedContracts = store.contracts.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            clientId,
            clientName: client?.companyName || 'Client',
            title,
            feeStructureSummary,
            driveDocumentUrl,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Contracts',
        editId,
        `Updated contract ${title}`
      );

      onUpdateStore({
        ...store,
        contracts: updatedContracts,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const contractNo = `MOU/ARMS-${client?.clientCode || 'CLI'}/2026/${Math.floor(100 + Math.random() * 900)}`;

      const newContract: Contract = {
        id: `CTR-${Date.now()}`,
        contractNo,
        clientId,
        clientName: client?.companyName || 'Client',
        title,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '2026-12-31',
        feeStructureSummary,
        status: 'PENDING_EXECUTIVE_APPROVAL',
        driveDocumentUrl,
        createdAt: new Date().toISOString(),
      };

      const approvalReq: ApprovalRequest = {
        id: `APP-CTR-${Date.now()}`,
        requestNo: `REQ-CTR-${Math.floor(100 + Math.random() * 900)}`,
        module: 'CONTRACT',
        targetId: newContract.id,
        targetReference: contractNo,
        title: `Approval MoU Contract ${client?.companyName}`,
        requestedBy: currentUser.name,
        description: title,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Contracts', newContract.id, `Created MoU ${contractNo} (Pending Executive Approval)`);

      onUpdateStore({
        ...store,
        contracts: [newContract, ...store.contracts],
        approvals: [approvalReq, ...store.approvals],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
  };

  const contractPagination = usePagination<Contract>(store.contracts || [], 10);

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Contracts & Master MoU Agreements</h2>
          </div>
          <p className="text-xs text-slate-400">Formal B2B Master Recovery Agreements with Multifinance Institutions</p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Draft New Contract / MoU</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Contract No</th>
                <th className="py-3 px-4">Multifinance Client</th>
                <th className="py-3 px-4">Title & Fee Structure</th>
                <th className="py-3 px-4">Validity Period</th>
                <th className="py-3 px-4 text-center">Drive Document</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {contractPagination.pageItems.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{c.contractNo}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{c.clientName}</td>
                  <td className="py-3.5 px-4 space-y-0.5 max-w-[280px]">
                    <div className="font-semibold text-slate-100">{c.title}</div>
                    <div className="text-[10px] text-emerald-400">{c.feeStructureSummary}</div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {c.startDate} to {c.endDate}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {c.driveDocumentUrl ? (
                      <a
                        href={c.driveDocumentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>View Document</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2.5 py-1 rounded-full border border-indigo-800 font-semibold">
                      {(c.status || '').replace(/_/g, ' ')}
                    </span>
                  </td>
                  {canEdit && (
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                          title="Edit Contract"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteContract(c.id, c.title)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                          title="Delete Contract"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <form onSubmit={handleSaveContract} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-5 sm:p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto my-auto">
            <h3 className="font-bold text-white text-base">
              {isEditing ? 'Edit MoU Master Contract' : 'Draft MoU Master Contract'}
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Select Multifinance Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              >
                {store.clients.map((cli) => (
                  <option key={cli.id} value={cli.id}>
                    {cli.companyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Contract Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Master Recovery Agreement Portofolio Macet DPD 90+"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Fee Structure Summary</label>
              <input
                type="text"
                required
                value={feeStructureSummary}
                onChange={(e) => setFeeStructureSummary(e.target.value)}
                placeholder="e.g. Success fee 15% + Rp 2.500.000 per unit recovered"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Google Drive Document Link (Upload draft to GDrive and paste link here)</label>
              <input
                type="text"
                value={driveDocumentUrl}
                onChange={(e) => setDriveDocumentUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>
            
            <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-4">
               <h4 className="text-xs font-bold text-amber-400 mb-2">Draft MoU Template (Copy & Paste to GDocs)</h4>
               <textarea
                  rows={6}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-[10px] text-slate-300 font-mono"
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
               />
               <p className="text-[10px] text-slate-400 mt-1 italic">*Copy teks ini, buat di Google Docs, lalu paste link-nya di atas.</p>
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
                {isEditing ? 'Save Changes' : 'Submit for Executive Approval'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
