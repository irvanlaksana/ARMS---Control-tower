import React, { useState, useMemo } from 'react';
import { Pagination, usePagination } from '../common/Pagination';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Assignment } from '../../types/arms';
import { Users, Plus, CheckCircle, Clock, AlertCircle, Building2, UserCheck, ExternalLink, Filter, Search, Scale, Edit2, Trash2 } from 'lucide-react';
import { SearchableSelect } from '../common/SearchableSelect';

interface AssignmentModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const AssignmentModule: React.FC<AssignmentModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [clientFilter, setClientFilter] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Active unfinished cases for new assignments
  const activeCases = (store.cases || []).filter(
    (c) => !['CLOSED', 'SETTLED', 'FULL_PAID', 'CANCELLED'].includes(c.status)
  );
  const multifinanceCases = activeCases.filter((c) => c.clientType === 'MULTIFINANCE' || !c.clientType);
  const peroranganCases = activeCases.filter((c) => c.clientType === 'PERORANGAN');

  const [caseId, setCaseId] = useState(activeCases[0]?.id || store.cases?.[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [slaDays, setSlaDays] = useState(14);
  const [instructions, setInstructions] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedCase = (store.cases || []).find((cs) => cs.id === caseId);
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';

  const handleOpenModal = (assignment?: Assignment) => {
    if (assignment) {
      setIsEditing(true);
      setEditId(assignment.id);
      setCaseId(assignment.caseId);
      setPartnerId(assignment.personnelId);
      setSlaDays(assignment.slaDays || 14);
      setInstructions(assignment.instructions || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      const defaultCaseId = activeCases[0]?.id || store.cases?.[0]?.id || '';
      setCaseId(defaultCaseId);
      if (store.personnel && store.personnel.length > 0) {
        setPartnerId(store.personnel[0].id);
      } else {
        setPartnerId('');
      }
      setSlaDays(14);
      setInstructions('');
    }
    setShowModal(true);
  };

  const handleDeleteAssignment = (id: string, assignmentNo: string) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus penugasan "${assignmentNo}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Assignments',
      id,
      `Deleted Assignment ${assignmentNo}`
    );

    onUpdateStore({
      ...store,
      assignments: (store.assignments || []).filter(a => a.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) {
      alert('Silakan pilih berkas perkara terlebih dahulu.');
      return;
    }

    if (!personnelId && (!store.personnel || store.personnel.length === 0)) {
      alert('Belum ada mitra lapangan/personil terdaftar. Silakan tambahkan mitra di menu Personnel terlebih dahulu.');
      return;
    }

    const p = (store.personnel || []).find((pr) => pr.id === personnelId);

    if (isEditing && editId) {
      const updatedAssignments = (store.assignments || []).map(a => {
        if (a.id === editId) {
          return {
            ...a,
            caseId: selectedCase.id,
            caseNo: selectedCase.caseNo,
            debtorName: selectedCase.debtorName,
            personnelId: personnelId || a.personnelId,
            personnelName: p?.fullName || a.personnelName || 'Mitra Lapangan',
            slaDays,
            instructions: instructions || (isPerorangan ? 'Lakukan kunjungan lapangan, verifikasi domisili, dan mediasi penagihan piutang perorangan secara profesional.' : 'Lakukan penelusuran unit jaminan fidusia dan negosiasi penyerahan unit.'),
            gDriveFolderUrl: selectedCase.gDriveFolderUrl || a.gDriveFolderUrl,
          };
        }
        return a;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Assignments',
        editId,
        `Updated Assignment for Case ${selectedCase.caseNo}`
      );

      onUpdateStore({
        ...store,
        assignments: updatedAssignments,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newAssignment: Assignment = {
        id: `ASN-${Date.now()}`,
        assignmentNo: `ASN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        caseId: selectedCase.id,
        caseNo: selectedCase.caseNo,
        debtorName: selectedCase.debtorName,
        personnelId: personnelId || store.personnel?.[0]?.id || 'PER-001',
        personnelName: p?.fullName || store.personnel?.[0]?.fullName || 'Mitra Lapangan',
        assignedDate: new Date().toISOString().split('T')[0],
        targetDate: new Date(Date.now() + slaDays * 86400000).toISOString().split('T')[0],
        slaDays,
        instructions: instructions || (isPerorangan ? 'Lakukan kunjungan lapangan, verifikasi domisili, dan mediasi penagihan piutang perorangan secara profesional.' : 'Lakukan penelusuran unit jaminan fidusia dan negosiasi penyerahan unit.'),
        status: 'IN_PROGRESS',
        gDriveFolderUrl: selectedCase.gDriveFolderUrl || '',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Assignments',
        newAssignment.id,
        `Assigned Case ${newAssignment.caseNo} (${selectedCase.clientType || 'MULTIFINANCE'}) to Partner ${newAssignment.personnelName}`
      );

      onUpdateStore({
        ...store,
        assignments: [newAssignment, ...(store.assignments || [])],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setInstructions('');
    setShowModal(false);
  };

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return (store.assignments || []).filter((a) => {
      const parentCase = (store.cases || []).find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
      const cType = parentCase?.clientType || 'MULTIFINANCE';

      if (clientFilter === 'MULTIFINANCE' && cType !== 'MULTIFINANCE') return false;
      if (clientFilter === 'PERORANGAN' && cType !== 'PERORANGAN') return false;

      if (searchTerm) {
        const match = `${a.assignmentNo} ${a.caseNo} ${a.debtorName} ${a.personnelName} ${parentCase?.clientName || ''} ${a.instructions}`.toLowerCase();
        if (!match.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [store.assignments, store.cases, clientFilter, searchTerm]);

  const assignmentPagination = usePagination<Assignment>(filteredAssignments, 10);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Users className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Partner & Field Assignments</h2>
          </div>
          <p className="text-xs text-slate-400">
            Penugasan Kasus Multifinance & Klien Perorangan ke Mitra Lapangan & DC Agency Resmi
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Buat Penugasan Baru</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => {
              setClientFilter('ALL');
              assignmentPagination.setPage(1);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition ${
              clientFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({store.assignments.length})
          </button>
          <button
            onClick={() => {
              setClientFilter('MULTIFINANCE');
              assignmentPagination.setPage(1);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              clientFilter === 'MULTIFINANCE'
                ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-700'
                : 'text-slate-400 hover:text-indigo-300'
            }`}
          >
            <Building2 className="w-3 h-3" />
            <span>Multifinance</span>
          </button>
          <button
            onClick={() => {
              setClientFilter('PERORANGAN');
              assignmentPagination.setPage(1);
            }}
            className={`px-2.5 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              clientFilter === 'PERORANGAN'
                ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Klien Perorangan</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              assignmentPagination.setPage(1);
            }}
            placeholder="Cari assignment, kasus, mitra..."
            className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-full sm:w-64"
          />
        </div>
      </div>

      {/* Assignment Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">No. Penugasan</th>
                <th className="py-2 px-3">Kasus & Debitur</th>
                <th className="py-2 px-3">Kategori Klien</th>
                <th className="py-2 px-3">Mitra Lapangan</th>
                <th className="py-2 px-3">Tgl Tugas</th>
                <th className="py-2 px-3">Target SLA</th>
                <th className="py-2 px-3">Instruksi Khusus</th>
                <th className="py-2 px-3 text-center">Berkas (Drive)</th>
                <th className="py-2 px-3 text-center">Status</th>
                {canEdit && <th className="py-2 px-3 text-right">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {assignmentPagination.pageItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-slate-500 text-xs">
                    {(store.assignments || []).length === 0
                      ? 'Belum ada data penugasan. Klik tombol + Buat Penugasan Baru untuk memulai.'
                      : 'Tidak ada data penugasan yang sesuai filter atau pencarian.'}
                  </td>
                </tr>
              ) : (
                assignmentPagination.pageItems.map((a) => {
                  const parentCase = store.cases.find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
                  const isPer = parentCase?.clientType === 'PERORANGAN';
                  const hasLawyerNotice = Boolean(parentCase?.lawyerStatus);

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">
                        {a.assignmentNo}
                      </td>

                      <td className="py-2.5 px-3 space-y-1">
                        <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                          <span>{a.caseNo}</span>
                          {hasLawyerNotice && (
                            <span className="bg-purple-950 text-purple-300 text-[10px] px-1.5 py-0.2 rounded border border-purple-800 font-medium">
                              ⚖️ {parentCase?.lawyerStatus || 'Somasi Advokat'}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-300 font-medium">{a.debtorName}</div>
                      </td>

                      <td className="py-2.5 px-3">
                        {isPer ? (
                          <span className="inline-flex items-center gap-1 bg-amber-950/80 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800/80 font-medium">
                            <UserCheck className="w-3 h-3" /> Perorangan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-indigo-950/80 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800/80 font-medium">
                            <Building2 className="w-3 h-3" /> Multifinance
                          </span>
                        )}
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={parentCase?.clientName}>
                          {parentCase?.clientName || '-'}
                        </div>
                      </td>

                      <td className="py-2.5 px-3 font-medium text-slate-200">
                        {a.personnelName}
                      </td>

                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {a.assignedDate}
                      </td>

                      <td className="py-2.5 px-3 text-amber-400 font-medium">
                        {a.targetDate}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {a.slaDays} hari SLA
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-300 max-w-[220px] truncate" title={a.instructions}>
                        {a.instructions}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        {a.gDriveFolderUrl ? (
                          <a
                            href={a.gDriveFolderUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 text-[11px] bg-indigo-950/50 px-2 py-1 rounded border border-indigo-800/50"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Buka</span>
                          </a>
                        ) : (
                          <span className="text-slate-600 text-[10px]">-</span>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`text-[10px] px-2 py-1 rounded-full font-semibold border ${
                            a.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>

                      {canEdit && (
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenModal(a)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                              title="Edit Assignment"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAssignment(a.id, a.assignmentNo)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                              title="Delete Assignment"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={assignmentPagination.page}
          totalPages={assignmentPagination.totalPages}
          totalItems={assignmentPagination.totalItems}
          pageSize={assignmentPagination.pageSize}
          onPageChange={assignmentPagination.setPage}
          onPageSizeChange={assignmentPagination.setPageSize}
        />
      </div>

      {/* CREATE ASSIGNMENT MODAL WITH PERORANGAN & MULTIFINANCE SUPPORT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form
            onSubmit={handleCreateAssignment}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-4 space-y-2.5 shadow-2xl"
          >
            <div className="border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                {isEditing ? 'Edit Penugasan Mitra Lapangan' : 'Buat Penugasan Baru Mitra Lapangan'}
              </h3>
              <p className="text-xs text-slate-400">
                Pilih berkas perkara (Klien Multifinance atau Klien Perorangan) untuk diterbitkan surat penugasan lapangan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih Berkas Kasus <span className="text-red-400">*</span>
              </label>
              {activeCases.length === 0 && !isEditing ? (
                <div className="p-2.5 bg-amber-950/60 border border-amber-800 rounded-lg text-xs text-amber-300">
                  ⚠️ Semua kasus telah selesai/lunas. Tidak ada berkas kasus aktif baru untuk ditugaskan.
                </div>
              ) : (
                <SearchableSelect
                  value={caseId}
                  onChange={setCaseId}
                  options={activeCases.map((cs) => ({
                    value: cs.id,
                    label: `${cs.caseNo} - ${cs.debtorName}`,
                    subLabel: cs.clientName || 'Kasus recovery'
                  }))}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih Mitra Lapangan / DC <span className="text-red-400">*</span>
              </label>
              <SearchableSelect
                value={personnelId}
                onChange={setPartnerId}
                options={(store.personnel || []).map((pr) => ({
                  value: pr.id,
                  label: pr.fullName,
                  subLabel: pr.type === 'MITRA_DC' ? 'Mitra DC' : 'Petugas Internal'
                }))}
                placeholder="Pilih mitra atau petugas..."
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Target SLA (Hari Kalender)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Instruksi Khusus Penugasan Lapangan</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={
                  isPerorangan
                    ? 'Instruksi khusus penagihan piutang perorangan (kunjungan, klarifikasi SPH, negosiasi cicilan)...'
                    : 'Instruksi khusus penagihan multifinance / penarikan unit fidusia...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={activeCases.length === 0 && !isEditing}
                className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 shadow-md transition disabled:opacity-50"
              >
                {isEditing ? 'Simpan Perubahan' : 'Terbitkan Penugasan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
