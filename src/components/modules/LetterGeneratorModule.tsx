import React, { useMemo, useState } from 'react';
import { FileText, Play, ChevronDown, Database, UserRound, BriefcaseBusiness } from 'lucide-react';
import type { User } from '../../types/arms';
import type { ARMSStore } from '../../services/armsDataService';
import AssignmentLetterGenerator from '../assignment-letter/AssignmentLetterGenerator';
import { BLANK_DATA } from '../assignment-letter/data/defaults';
import type { BastData } from '../assignment-letter/types';
import '../assignment-letter/letter-generator.css';

interface Props {
  store: ARMSStore;
  currentUser: User;
}

export const LetterGeneratorModule: React.FC<Props> = ({ store }) => {
  const activeCases = useMemo(
    () => (store.cases || []).filter((item) => item.status !== 'CLOSED'),
    [store.cases],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(activeCases[0]?.id || '');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  const [data, setData] = useState<BastData>(BLANK_DATA);

  const selectedCase = useMemo(
    () => (store.cases || []).find((item) => item.id === selectedCaseId),
    [store.cases, selectedCaseId],
  );
  const selectedAssignment = useMemo(
    () => (store.assignments || []).find((item) => item.id === selectedAssignmentId),
    [store.assignments, selectedAssignmentId],
  );
  const caseAssignments = useMemo(
    () => (store.assignments || []).filter((item) => item.caseId === selectedCaseId),
    [store.assignments, selectedCaseId],
  );

  const fillFromRepository = (caseId = selectedCaseId, assignmentId = selectedAssignmentId) => {
    const currentCase = (store.cases || []).find((item) => item.id === caseId);
    const currentAssignment = (store.assignments || []).find((item) => item.id === assignmentId);
    if (!currentCase || currentCase.status === 'CLOSED') return;
    const customer = (store.customers || []).find((item) => item.id === currentCase.customerId);
    const personnel = (store.personnel || []).find(
      (item) => item.id === currentAssignment?.personnelId || item.id === currentCase.currentPersonnelId,
    );
    const vehicleType = currentCase.assetSummary?.toLowerCase().includes('motor') ? 'roda2' : 'roda4';
    const debtorName = customer?.fullName || currentCase.debtorName;
    const personnelName = personnel?.fullName || currentAssignment?.personnelName || currentCase.currentPersonnelName || '';
    const contractNumber = currentCase.multifinanceContractNo || customer?.contractNo || '';
    const assetDescription = currentCase.assetSummary || customer?.vehicleMerkType || '';

    setData({
      ...BLANK_DATA,
      jenis: vehicleType,
      noPerjanjian: contractNumber,
      namaDebitur: debtorName,
      bpkbAtasNama: debtorName,
      mitraNama: personnelName,
      mitraAlamat: personnel?.address || '',
      mitraPic: personnelName,
      merekType: assetDescription,
      st: {
        ...BLANK_DATA.st,
        petugasNama: personnelName,
        petugasNik: personnel?.nikKtp || '',
        petugasJabatan: personnel?.position || 'Petugas Lapangan',
        noKontrak: contractNumber,
        nasabahNama: debtorName,
        nasabahAlamat: customer?.addressCurrent || customer?.addressKtp || '',
        merkType: assetDescription,
      },
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Generator Surat Tugas / BAST</h2>
            </div>
            <p className="text-xs text-slate-400">
              Buat, lihat preview, cetak, dan simpan dokumen surat penugasan lapangan dari satu modul.
            </p>
          </div>
          <div className="group relative">
            <button type="button" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-md transition hover:bg-emerald-500">
              <Play className="h-4 w-4" /> Pilih Data & Generator <ChevronDown className="h-4 w-4" />
            </button>
            <div className="invisible absolute right-0 top-full z-10 mt-2 w-80 rounded-xl border border-slate-700 bg-slate-900 p-3 opacity-0 shadow-2xl transition group-hover:visible group-hover:opacity-100">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tarik data dari repository</div>
              <label className="mb-2 block text-[11px] text-slate-400">Kasus & piutang</label>
              <select value={selectedCaseId} onChange={(event) => { setSelectedCaseId(event.target.value); setSelectedAssignmentId(''); }} className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white">
                {activeCases.map((item) => <option key={item.id} value={item.id}>{item.caseNo} - {item.debtorName}</option>)}
              </select>
              <label className="mb-2 block text-[11px] text-slate-400">Penugasan & petugas</label>
              <select value={selectedAssignmentId} onChange={(event) => { setSelectedAssignmentId(event.target.value); fillFromRepository(selectedCaseId, event.target.value); }} className="mb-3 w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs text-white">
                <option value="">Pilih Assign To Personnel / Mitra</option>
                {caseAssignments.map((item) => <option key={item.id} value={item.id}>{item.assignmentNo} - {item.personnelName}</option>)}
              </select>
              <button type="button" onClick={() => fillFromRepository()} className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">
                <Database className="h-4 w-4" /> Isi Semua Form & Buka Preview
              </button>
              {selectedCase && <div className="mt-3 space-y-1 border-t border-slate-800 pt-2 text-[10px] text-slate-500"><div className="flex gap-1"><BriefcaseBusiness className="h-3 w-3" /> {selectedCase.caseNo}</div><div className="flex gap-1"><UserRound className="h-3 w-3" /> {selectedCase.debtorName}</div>{selectedAssignment && <div>{selectedAssignment.personnelName}</div>}</div>}
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <AssignmentLetterGenerator
          initialData={data}
          isPersonal={false}
          onSave={setData}
          onClose={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
