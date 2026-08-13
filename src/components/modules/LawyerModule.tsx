import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, LawyerNotice } from '../../types/arms';
import { Scale, Plus, FileText, CheckCircle2, Clock, Send, ShieldAlert, Eye, Copy, Check, Printer } from 'lucide-react';

interface LawyerModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const LawyerModule: React.FC<LawyerModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewNotice, setViewNotice] = useState<LawyerNotice | null>(null);
  const [copied, setCopied] = useState(false);

  // Form State
  const activeCases = store.cases.filter(
    (c) => !['CLOSED', 'SETTLED', 'FULL_PAID', 'CANCELLED'].includes(c.status)
  );

  const [selectedCaseId, setSelectedCaseId] = useState(activeCases[0]?.id || '');
  const [noticeType, setNoticeType] = useState<LawyerNotice['noticeType']>('SOMASI_1');
  const [lawyerFirmName, setLawyerFirmName] = useState('Advokat & Tim Legal Counsel PT MITRA JASATRIA INDONESIA');
  const [lawyerName, setLawyerName] = useState('Dr. Hendra Wijaya, S.H., M.H.');
  const [notes, setNotes] = useState('Debitur menunggak pembayaran dan belum memberikan respon kooperatif.');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const generateLetterDraft = (
    debtorName: string,
    debtorAddr: string,
    clientName: string,
    contractNo: string,
    amount: number,
    type: LawyerNotice['noticeType'],
    firm: string,
    lawyer: string
  ): string => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const formattedAmount = `Rp ${amount.toLocaleString('id-ID')}`;

    let typeTitle = 'SURAT SOMASI I (PERINGATAN HUKUM PERTAMA)';
    if (type === 'SURAT_KLARIFIKASI') typeTitle = 'SURAT KLARIFIKASI & KONFIRMASI KEWAJIBAN PIUTANG';
    if (type === 'SOMASI_2') typeTitle = 'SURAT SOMASI II (PERINGATAN HUKUM KEDUA)';
    if (type === 'SOMASI_TERAKHIR') typeTitle = 'SURAT SOMASI TERAKHIR & PERINGATAN FINAL PROSES HUKUM';
    if (type === 'UNDANGAN_MEDIASI_HUKUM') typeTitle = 'UNDANGAN MEDIASI & MUSYAWARAH HUKUM FORMAL';
    if (type === 'GUGATAN_SEDERHANA') typeTitle = 'DRAFT PENDAFTARAN GUGATAN SEDERHANA (PERDATA)';

    return `${typeTitle}
Nomor: ${type}/MJI-LEGAL/${new Date().getFullYear()}/${(store.lawyerNotices?.length || 0) + 1}
Tanggal: ${todayStr}

Kepada Yth.
Bpk/Ibu ${debtorName}
Alamat: ${debtorAddr || 'Alamat Sesuai Kontrak Perjanjian'}

Perihal: ${typeTitle} — Atas Perjanjian Pembiayaan No. ${contractNo}

Dengan hormat,
Kami yang bertanda tangan di bawah ini, ${lawyer || 'Kuasa Hukum'}, bertindak untuk dan atas nama ${firm} selaku Kuasa Hukum Resmi dari Klien kami, ${clientName}.

Berdasarkan data operasional dan rekapitulasi keuangan Klien kami, Saudara terdaftar masih memiliki sisa kewajiban penunggakan fasilitas pembiayaan dengan jumlah tunggakan pokok sebesar ${formattedAmount}.

Sehubungan dengan hal tersebut di atas, melalui Surat Hukum ini kami menyampaikan hal-hal sebagai berikut:
1. Saudara telah cidera janji (wanprestasi) atas kewajiban pembayaran yang telah disepakati dalam Kontrak Perjanjian No. ${contractNo}.
2. Kami memperingatkan dan meminta Saudara untuk segera melakukan pelunasan atau hadir beritikad baik menyelesaikan kewajiban dalam waktu paling lambat 3 (tiga) hari kerja sejak surat ini diterima.
3. Apabila Saudara mengabaikan peringatan hukum ini, maka Klien kami melalui Kuasa Hukum akan mengambil tindakan hukum tegas sesuai peraturan perundang-undangan yang berlaku, termasuk pelaporan dugaan tindak pidana Penggelapan Objek Jaminan Fidusia (UU No. 42 Tahun 1999) serta Pendaftaran Gugatan Perdata di Pengadilan Negeri.

Demikian Surat ini disampaikan untuk menjadi perhatian serius dan dilaksanakan sebagaimana mestinya.

Hormat Kami,
Kuasa Hukum & Advokat ${clientName}
${firm}

(${lawyer || 'Tim Advokat Legal Counsel'})`;
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCase = store.cases.find((c) => c.id === selectedCaseId);
    if (!targetCase) return;

    const customer = store.customers.find((cu) => cu.id === targetCase.customerId);
    const debtorAddr = customer?.addressCurrent || customer?.addressKtp || 'Alamat Sesuai Kontrak';

    const draftText = generateLetterDraft(
      targetCase.debtorName,
      debtorAddr,
      targetCase.clientName,
      targetCase.multifinanceContractNo,
      targetCase.principalDebtOS,
      noticeType,
      lawyerFirmName,
      lawyerName
    );

    let noticeTypeLabel = 'Somasi 1';
    if (noticeType === 'SURAT_KLARIFIKASI') noticeTypeLabel = 'Surat Klarifikasi';
    if (noticeType === 'SOMASI_2') noticeTypeLabel = 'Somasi 2';
    if (noticeType === 'SOMASI_TERAKHIR') noticeTypeLabel = 'Somasi Terakhir';
    if (noticeType === 'UNDANGAN_MEDIASI_HUKUM') noticeTypeLabel = 'Undangan Mediasi';
    if (noticeType === 'GUGATAN_SEDERHANA') noticeTypeLabel = 'Gugatan Sederhana';

    const newNotice: LawyerNotice = {
      id: `LGL-${Date.now()}`,
      noticeNo: `${noticeType}/MJI-LEGAL/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`,
      caseId: targetCase.id,
      caseNo: targetCase.caseNo,
      debtorName: targetCase.debtorName,
      debtorAddress: debtorAddr,
      clientName: targetCase.clientName,
      multifinanceContractNo: targetCase.multifinanceContractNo,
      noticeType,
      requestedDate: new Date().toISOString().split('T')[0],
      lawyerFirmName,
      lawyerName,
      principalDebtAmount: targetCase.principalDebtOS,
      status: 'SENT_TO_DEBTOR',
      letterContentDraft: draftText,
      notes,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
    };

    // Update target case with lawyer notice indicator
    const updatedCases = store.cases.map((c) => {
      if (c.id === targetCase.id) {
        return {
          ...c,
          lawyerStatus: `Dikirim ${noticeTypeLabel} (Lawyer)`,
          lawyerNoticeCount: (c.lawyerNoticeCount || 0) + 1,
          lastLawyerNoticeType: noticeType,
        };
      }
      return c;
    });

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Lawyer_Notices',
      newNotice.id,
      `Membuat Pengajuan Surat Legal (${noticeTypeLabel}) untuk Nasabah ${newNotice.debtorName} (${newNotice.caseNo})`
    );

    onUpdateStore({
      ...store,
      cases: updatedCases,
      lawyerNotices: [newNotice, ...(store.lawyerNotices || [])],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowAddModal(false);
  };

  const handleUpdateNoticeStatus = (noticeId: string, newStatus: LawyerNotice['status']) => {
    const updatedNotices = (store.lawyerNotices || []).map((n) => {
      if (n.id === noticeId) {
        return { ...n, status: newStatus };
      }
      return n;
    });

    onUpdateStore({
      ...store,
      lawyerNotices: updatedNotices,
    });

    if (viewNotice && viewNotice.id === noticeId) {
      setViewNotice({ ...viewNotice, status: newStatus });
    }
  };

  const handleUpdateNoticeContent = (noticeId: string, newContent: string) => {
    const updatedNotices = (store.lawyerNotices || []).map((n) => {
      if (n.id === noticeId) {
        return { ...n, letterContentDraft: newContent };
      }
      return n;
    });

    onUpdateStore({
      ...store,
      lawyerNotices: updatedNotices,
    });

    if (viewNotice && viewNotice.id === noticeId) {
      setViewNotice({ ...viewNotice, letterContentDraft: newContent });
    }
  };

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getNoticeBadge = (type: LawyerNotice['noticeType']) => {
    switch (type) {
      case 'SURAT_KLARIFIKASI':
        return <span className="bg-blue-950 text-blue-300 text-[10px] px-2 py-0.5 rounded border border-blue-800 font-semibold">Surat Klarifikasi</span>;
      case 'SOMASI_1':
        return <span className="bg-amber-950 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800 font-semibold">Somasi 1</span>;
      case 'SOMASI_2':
        return <span className="bg-orange-950 text-orange-300 text-[10px] px-2 py-0.5 rounded border border-orange-800 font-semibold">Somasi 2</span>;
      case 'SOMASI_TERAKHIR':
        return <span className="bg-red-950 text-red-300 text-[10px] px-2 py-0.5 rounded border border-red-800 font-semibold">Somasi Terakhir</span>;
      case 'UNDANGAN_MEDIASI_HUKUM':
        return <span className="bg-purple-950 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-800 font-semibold">Mediasi Hukum</span>;
      case 'GUGATAN_SEDERHANA':
        return <span className="bg-rose-950 text-rose-300 text-[10px] px-2 py-0.5 rounded border border-rose-800 font-semibold">Gugatan Sederhana</span>;
    }
  };

  const getStatusBadge = (status: LawyerNotice['status']) => {
    switch (status) {
      case 'DRAFT_PROPOSED':
        return <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded border border-slate-700">Draft Pengajuan</span>;
      case 'SUBMITTED_TO_LAWYER':
        return <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800">Proses Review Advokat</span>;
      case 'APPROVED_BY_LAWYER':
        return <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800">Disetujui Lawyer</span>;
      case 'SENT_TO_DEBTOR':
        return <span className="bg-purple-950 text-purple-300 text-[10px] px-2 py-0.5 rounded border border-purple-800 font-semibold">Terkirim ke Nasabah</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-900 text-emerald-200 text-[10px] px-2 py-0.5 rounded border border-emerald-700 font-semibold">Selesai / Respons</span>;
    }
  };

  const noticesList = store.lawyerNotices || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Scale className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Menu Lawyer & Tindakan Hukum (Legal Notice & Somasi)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Layanan Pengajuan Surat Klarifikasi, Somasi 1, 2, Somasi Terakhir, dan Undangan Mediasi Hukum Otomatis untuk Nasabah Belum Selesai
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Servis / Surat Legal Lawyer</span>
          </button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-indigo-950 text-indigo-400 rounded-lg border border-indigo-800">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Surat Legal</div>
            <div className="text-lg font-bold text-white">{noticesList.length} Surat</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-purple-950 text-purple-400 rounded-lg border border-purple-800">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Terkirim ke Nasabah</div>
            <div className="text-lg font-bold text-purple-300">
              {noticesList.filter((n) => n.status === 'SENT_TO_DEBTOR' || n.status === 'COMPLETED').length} Kasus
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-amber-950 text-amber-400 rounded-lg border border-amber-800">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Somasi Aktif</div>
            <div className="text-lg font-bold text-amber-400">
              {noticesList.filter((n) => n.noticeType.includes('SOMASI')).length} Somasi
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-lg border border-emerald-800">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400">Kasus Aktif Ter-Cover Lawyer</div>
            <div className="text-lg font-bold text-emerald-400">
              {store.cases.filter((c) => Boolean(c.lawyerStatus)).length} Nasabah
            </div>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400" />
            <span>Daftar Pengajuan & Surat Hukum Lawyer</span>
          </h3>
          <span className="text-xs text-slate-400">
            Otomatis memberikan tanda keterangan Lawyer di seluruh Core Recovery
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">No. Surat Legal</th>
                <th className="py-3 px-4">Kasus & Nasabah</th>
                <th className="py-3 px-4">Klien Multifinance</th>
                <th className="py-3 px-4">Jenis Surat / Tindakan</th>
                <th className="py-3 px-4">Kantor Hukum & Advokat</th>
                <th className="py-3 px-4 text-right">Tunggakan Pokok</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {noticesList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    Belum ada pengajuan surat legal lawyer. Klik tombol "Tambah Servis / Surat Legal Lawyer" untuk membuat draft somasi.
                  </td>
                </tr>
              ) : (
                noticesList.map((n) => (
                  <tr key={n.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{n.noticeNo}</td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span>{n.debtorName}</span>
                        <span className="text-[10px] bg-purple-950 text-purple-300 px-1.5 py-0.2 rounded border border-purple-800">
                          ⚖️ Lawyer
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">Ref: {n.caseNo}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{n.clientName}</td>
                    <td className="py-3.5 px-4">{getNoticeBadge(n.noticeType)}</td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="text-slate-200 font-medium">{n.lawyerFirmName}</div>
                      <div className="text-[10px] text-slate-400">{n.lawyerName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      Rp {n.principalDebtAmount.toLocaleString('id-ID')}
                    </td>
                    <td className="py-3.5 px-4 text-center">{getStatusBadge(n.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => setViewNotice(n)}
                        className="inline-flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Lihat Draft</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add Legal Service / Notice */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleCreateNotice} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Buat Pengajuan Surat Legal / Lawyer</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {activeCases.length === 0 ? (
              <div className="p-4 bg-amber-950/60 border border-amber-800/80 rounded-lg text-xs text-amber-200">
                ⚠️ Tidak ada kasus aktif yang membutuhkan surat legal. Semua pekerjaan kasus telah selesai/lunas.
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Pilih Nasabah / Kasus Belum Selesai <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={selectedCaseId}
                    onChange={(e) => setSelectedCaseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {activeCases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNo} — {c.debtorName} ({c.clientName}) - Tunggakan: Rp {c.principalDebtOS.toLocaleString('id-ID')}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Jenis Surat / Tindakan Lawyer <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={noticeType}
                      onChange={(e) => setNoticeType(e.target.value as LawyerNotice['noticeType'])}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="SURAT_KLARIFIKASI">1. Surat Klarifikasi & Konfirmasi Piutang</option>
                      <option value="SOMASI_1">2. Surat Somasi I (Peringatan Hukum I)</option>
                      <option value="SOMASI_2">3. Surat Somasi II (Peringatan Hukum II)</option>
                      <option value="SOMASI_TERAKHIR">4. Surat Somasi Terakhir & Ancaman Hukum</option>
                      <option value="UNDANGAN_MEDIASI_HUKUM">5. Surat Undangan Mediasi Hukum Formal</option>
                      <option value="GUGATAN_SEDERHANA">6. Draft Pendaftaran Gugatan Sederhana PN</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Nama Advokat / Kuasa Hukum
                    </label>
                    <input
                      type="text"
                      value={lawyerName}
                      onChange={(e) => setLawyerName(e.target.value)}
                      placeholder="e.g. Dr. Hendra Wijaya, S.H., M.H."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Kantor Law Firm / Tim Legal Counsel
                  </label>
                  <input
                    type="text"
                    value={lawyerFirmName}
                    onChange={(e) => setLawyerFirmName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catatan Khusus & Latar Belakang Wanprestasi
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tuliskan latar belakang penunggakan atau instruksi khusus untuk tim lawyer..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3 bg-indigo-950/40 border border-indigo-900/60 rounded-lg text-[11px] text-indigo-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Otomatisasi Sistem Control Tower:</span>
                  </div>
                  <p className="text-slate-300">
                    Sistem akan secara otomatis men-generate **Draft Surat Resmi Lawyer** dan menandai nasabah ini dengan status **"Dikirim Surat Lawyer"** di seluruh modul Core Recovery (Cases, Assignments, Collections, Asset Recovery, dll).
                  </p>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Generate & Kirim Pengajuan</span>
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* View & Edit Notice Modal */}
      {viewNotice && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-bold text-white text-base">Draft Surat Resmi Legal / Lawyer</h3>
                </div>
                <div className="text-xs text-slate-400">
                  {viewNotice.noticeNo} • Ref Kasus: {viewNotice.caseNo}
                </div>
              </div>
              <button
                onClick={() => setViewNotice(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Status Surat:</span>
                {getStatusBadge(viewNotice.status)}
              </div>

              {canEdit && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Ubah Status:</span>
                  <select
                    value={viewNotice.status}
                    onChange={(e) => handleUpdateNoticeStatus(viewNotice.id, e.target.value as LawyerNotice['status'])}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="DRAFT_PROPOSED">Draft Pengajuan</option>
                    <option value="SUBMITTED_TO_LAWYER">Proses Review Advokat</option>
                    <option value="APPROVED_BY_LAWYER">Disetujui Lawyer</option>
                    <option value="SENT_TO_DEBTOR">Terkirim ke Nasabah</option>
                    <option value="COMPLETED">Selesai / Respons Debitur</option>
                  </select>
                </div>
              )}
            </div>

            {/* Letter Content Preview Box */}
            <textarea
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-5 font-mono text-xs text-slate-200 whitespace-pre-wrap leading-relaxed min-h-[24rem] border-l-4 border-l-indigo-500 focus:outline-none focus:border-indigo-500"
              value={viewNotice.letterContentDraft}
              onChange={(e) => handleUpdateNoticeContent(viewNotice.id, e.target.value)}
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-400">
                Pembuat: <span className="text-white font-medium">{viewNotice.createdBy}</span> • Tgl: {viewNotice.requestedDate}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyText(viewNotice.letterContentDraft)}
                  className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-slate-700 transition"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Tersalin!' : 'Salin Teks Draft'}</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Surat</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
