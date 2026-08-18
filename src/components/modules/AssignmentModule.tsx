import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Assignment } from '../../types/arms';
import { Users, Plus, CheckCircle, Clock, AlertCircle, Building2, UserCheck, ExternalLink, Filter, Search, Scale } from 'lucide-react';

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
  const activeCases = store.cases.filter(
    (c) => !['CLOSED', 'SETTLED', 'FULL_PAID', 'CANCELLED'].includes(c.status)
  );
  const multifinanceCases = activeCases.filter((c) => c.clientType === 'MULTIFINANCE' || !c.clientType);
  const peroranganCases = activeCases.filter((c) => c.clientType === 'PERORANGAN');

  const [caseId, setCaseId] = useState(activeCases[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [slaDays, setSlaDays] = useState(14);
  const [instructions, setInstructions] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedCase = store.cases.find((cs) => cs.id === caseId);
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const p = (store.personnel || []).find((pr) => pr.id === personnelId);

    const newAssignment: Assignment = {
      id: `ASN-${Date.now()}`,
      assignmentNo: `ASN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      caseId: selectedCase.id,
      caseNo: selectedCase.caseNo,
      debtorName: selectedCase.debtorName,
      personnelId,
      personnelName: p?.fullName || 'Mitra Lapangan',
      assignedDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + slaDays * 86400000).toISOString().split('T')[0],
      slaDays,
      instructions: instructions || (isPerorangan ? 'Lakukan kunjungan lapangan, verifikasi domisili, dan mediasi penagihan piutang perorangan secara profesional.' : 'Lakukan penelusuran unit jaminan fidusia dan negosiasi penyerahan unit.'),
      status: 'IN_PROGRESS',
      gDriveFolderUrl: selectedCase.gDriveFolderUrl,
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
      assignments: [newAssignment, ...store.assignments],
      auditLogs: [audit, ...store.auditLogs],
    });

    setInstructions('');
    setShowModal(false);
  };

  // Filtered assignments
  const filteredAssignments = store.assignments.filter((a) => {
    const parentCase = store.cases.find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
    const cType = parentCase?.clientType || 'MULTIFINANCE';

    if (clientFilter === 'MULTIFINANCE' && cType !== 'MULTIFINANCE') return false;
    if (clientFilter === 'PERORANGAN' && cType !== 'PERORANGAN') return false;

    if (searchTerm) {
      const match = `${a.assignmentNo} ${a.caseNo} ${a.debtorName} ${a.personnelName} ${parentCase?.clientName || ''} ${a.instructions}`.toLowerCase();
      if (!match.includes(searchTerm.toLowerCase())) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Partner & Field Assignments</h2>
          </div>
          <p className="text-xs text-slate-400">
            Penugasan Kasus Multifinance & Klien Perorangan ke Mitra Lapangan & DC Agency Resmi
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              if (activeCases.length > 0 && !caseId) {
                setCaseId(activeCases[0].id);
              }
              if (store.personnel && store.personnel.length > 0 && !personnelId) {
                setPartnerId(store.personnel[0].id);
              }
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Penugasan Baru</span>
          </button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setClientFilter('ALL')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              clientFilter === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Semua ({store.assignments.length})
          </button>
          <button
            onClick={() => setClientFilter('MULTIFINANCE')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              clientFilter === 'MULTIFINANCE'
                ? 'bg-indigo-900/80 text-indigo-200 border border-indigo-700'
                : 'text-slate-400 hover:text-indigo-300'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Multifinance</span>
          </button>
          <button
            onClick={() => setClientFilter('PERORANGAN')}
            className={`px-3 py-1.5 rounded text-xs font-medium transition flex items-center gap-1.5 ${
              clientFilter === 'PERORANGAN'
                ? 'bg-amber-900/80 text-amber-200 border border-amber-700'
                : 'text-slate-400 hover:text-amber-300'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Klien Perorangan</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
                <th className="py-3 px-4">No. Penugasan</th>
                <th className="py-3 px-4">Kasus & Debitur</th>
                <th className="py-3 px-4">Kategori Klien</th>
                <th className="py-3 px-4">Mitra Lapangan</th>
                <th className="py-3 px-4">Tgl Tugas</th>
                <th className="py-3 px-4">Target SLA</th>
                <th className="py-3 px-4">Instruksi Khusus</th>
                <th className="py-3 px-4 text-center">Berkas (Drive)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredAssignments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    Tidak ada data penugasan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredAssignments.map((a) => {
                  const parentCase = store.cases.find((c) => c.id === a.caseId || c.caseNo === a.caseNo);
                  const isPer = parentCase?.clientType === 'PERORANGAN';
                  const hasLawyerNotice = Boolean(parentCase?.lawyerStatus);

                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">
                        {a.assignmentNo}
                      </td>

                      <td className="py-3.5 px-4 space-y-1">
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

                      <td className="py-3.5 px-4">
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

                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {a.personnelName}
                      </td>

                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {a.assignedDate}
                      </td>

                      <td className="py-3.5 px-4 text-amber-400 font-medium">
                        {a.targetDate}
                        <div className="text-[10px] text-slate-400 font-normal">
                          {a.slaDays} hari SLA
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-300 max-w-[220px] truncate" title={a.instructions}>
                        {a.instructions}
                      </td>

                      <td className="py-3.5 px-4 text-center">
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

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${
                            a.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : a.status === 'CANCELLED'
                              ? 'bg-red-950 text-red-300 border-red-800'
                              : 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE ASSIGNMENT MODAL WITH PERORANGAN & MULTIFINANCE SUPPORT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAssignment}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-2xl"
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                Buat Penugasan Baru Mitra Lapangan
              </h3>
              <p className="text-xs text-slate-400">
                Pilih berkas perkara (Klien Multifinance atau Klien Perorangan) untuk diterbitkan surat penugasan lapangan.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Pilih Berkas Kasus Aktif <span className="text-red-400">*</span>
              </label>
              {activeCases.length === 0 ? (
                <div className="p-3 bg-amber-950/60 border border-amber-800 rounded-lg text-xs text-amber-300">
                  ⚠️ Semua kasus telah selesai/lunas. Tidak ada pekerjaan kasus aktif untuk penugasan baru.
                </div>
              ) : (
                <select
                  value={caseId}
                  onChange={(e) => setCaseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <optgroup label="🏢 Kasus Multifinance / Perusahaan">
                    {multifinanceCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        [MULTIFINANCE] {c.caseNo} — {c.debtorName} ({c.clientName})
                      </option>
                    ))}
                  </optgroup>

                  <optgroup label="👤 Kasus Klien Perorangan (Kreditur Individu)">
                    {peroranganCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        [PERORANGAN] {c.caseNo} — {c.debtorName} (Kreditur: {c.clientName})
                      </option>
                    ))}
                  </optgroup>
                </select>
              )}
            </div>

            {/* Selected Case Info Summary */}
            {selectedCase && (
              <div
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                  isPerorangan
                    ? 'bg-amber-950/20 border-amber-800/40 text-amber-200'
                    : 'bg-indigo-950/20 border-indigo-800/40 text-indigo-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">
                    Detail Kasus Terpilih
                  </span>
                  {isPerorangan ? (
                    <span className="bg-amber-900 text-amber-200 text-[10px] px-2 py-0.5 rounded font-bold">
                      👤 Klien Perorangan
                    </span>
                  ) : (
                    <span className="bg-indigo-900 text-indigo-200 text-[10px] px-2 py-0.5 rounded font-bold">
                      🏢 Multifinance
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 text-slate-200">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Kreditur / Klien:</span>
                    <span className="font-bold truncate block">{selectedCase.clientName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Debitur:</span>
                    <span className="font-bold truncate block">{selectedCase.debtorName || '-'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Dasar Dokumen / Kontrak:</span>
                    <span className="font-mono truncate block">
                      {selectedCase.multifinanceContractNo || selectedCase.contractId || '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Nilai Pokok (OS):</span>
                    <span className="font-bold text-emerald-400">
                      Rp {(selectedCase.principalDebtOS || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-semibold">
                Pilih Mitra Lapangan / Agency Eksternal <span className="text-red-400">*</span>
              </label>
              <select
                value={personnelId}
                onChange={(e) => setPartnerId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {(store.personnel || []).map((p) => {
                  const roleLabel = p.position || (p.type ? p.type.replace(/_/g, ' ') : 'Mitra Lapangan');
                  return (
                    <option key={p.id} value={p.id}>
                      {p.fullName} — {roleLabel}
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Target SLA (Hari Kalender)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={slaDays}
                onChange={(e) => setSlaDays(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Instruksi Khusus Penugasan Lapangan</label>
              <textarea
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={
                  isPerorangan
                    ? 'Instruksi khusus penagihan piutang perorangan (kunjungan, klarifikasi SPH, negosiasi cicilan)...'
                    : 'Instruksi khusus penagihan multifinance / penarikan unit fidusia...'
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={activeCases.length === 0}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 shadow-md transition disabled:opacity-50"
              >
                Terbitkan Penugasan
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
