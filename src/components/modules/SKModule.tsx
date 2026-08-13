import React, { useState, useRef } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, SK, ApprovalRequest } from '../../types/arms';
import { FileText, Plus, ExternalLink, Printer } from 'lucide-react';
import { DEFAULT_MJ_LOGO } from '../../assets/mjLogo';

interface SKModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const SKModule: React.FC<SKModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [showDraft, setShowDraft] = useState(false);
  
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');
  const [draftContent, setDraftContent] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedCase = store.cases.find((cs) => cs.id === caseId);
  const selectedPersonnel = (store.personnel || []).find((pr) => pr.id === personnelId);
  const settings = store.settings;

  React.useEffect(() => {
    setDraftContent(`SURAT KUASA PENAGIHAN\n\nYang bertanda tangan di bawah ini mewakili MJ AGENCY RECOVERY memberikan kuasa penuh kepada:\nNama (Kolektor): ${selectedPersonnel?.fullName || '......................'}\nNIK: ${selectedPersonnel?.nikKtp || '......................'}\n\nUntuk melakukan penagihan/penarikan unit kepada:\nNama Debitur: ${selectedCase?.debtorName || '......................'}\nNo Kontrak: ${selectedCase?.multifinanceContractNo || '......................'}\nObjek: ${selectedCase?.assetSummary || '......................'}\n\nSurat Kuasa ini berlaku selama 90 hari.\n\nTtd,\n\n( MJ AGENCY )          ( Penerima Kuasa )`);
  }, [selectedCase, selectedPersonnel]);

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
          <html>
            <head>
              <title>Print Surat Kuasa</title>
              <style>
                body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: black; margin: 40px; }
                h1, h2, h3, h4 { margin: 0; padding: 0; }
                .text-center { text-align: center; }
                .font-bold { font-weight: bold; }
                .underline { text-decoration: underline; }
                .uppercase { text-transform: uppercase; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-6 { gap: 1.5rem; }
                .border-b-2 { border-bottom: 2px solid black; }
                .pb-4 { padding-bottom: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mb-8 { margin-bottom: 2rem; }
                .mb-16 { margin-bottom: 4rem; }
                .mt-12 { margin-top: 3rem; }
                .pt-8 { padding-top: 2rem; }
                .w-full { width: 100%; }
                .w-40 { width: 150px; }
                .w-4 { width: 15px; }
                .ml-4 { margin-left: 1rem; }
                table { border-collapse: collapse; }
                td { padding: 4px 0; vertical-align: top; }
                .w-24 { width: 96px; }
                .h-24 { height: 96px; }
                .object-contain { object-fit: contain; }
                .text-justify { text-align: justify; }
                .my-6 { margin: 1.5rem 0; }
              </style>
            </head>
            <body>
              ${printContent}
            </body>
          </html>
        `);
        doc.close();
        
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      }
    }
  };

  const handleCreateSK = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !selectedPersonnel) return;

    const skNumber = `SK/ARMS-${selectedCase.clientName.substring(0, 3).toUpperCase()}/2026/${Math.floor(100 + Math.random() * 900)}`;

    const newSK: SK = {
      id: `SK-${Date.now()}`,
      skNumber,
      caseId,
      caseNo: selectedCase.caseNo,
      debtorName: selectedCase.debtorName,
      personnelId,
      personnelName: selectedPersonnel.fullName,
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0],
      status: 'PENDING_APPROVAL',
      driveDocumentUrl,
      createdAt: new Date().toISOString(),
    };

    const approvalReq: ApprovalRequest = {
      id: `APP-SK-${Date.now()}`,
      requestNo: `REQ-SK-${Math.floor(100 + Math.random() * 900)}`,
      module: 'SK',
      targetId: newSK.id,
      targetReference: skNumber,
      title: `Penerbitan Surat Kuasa ${skNumber} (${selectedPersonnel.fullName})`,
      requestedBy: currentUser.name,
      description: `Surat Kuasa eksekusi untuk kasus ${selectedCase.caseNo} atas nama debtor ${selectedCase.debtorName}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'SK', newSK.id, `Generated SK ${skNumber} (Pending Approval)`);

    onUpdateStore({
      ...store,
      sks: [newSK, ...store.sks],
      approvals: [approvalReq, ...store.approvals],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Surat Kuasa (SK) Legal Standing Management</h2>
          </div>
          <p className="text-xs text-slate-400">Formal Power of Attorney Tracking & Auto-Generation for Field Execution</p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setShowModal(true); setShowDraft(false); }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Terbitkan Surat Kuasa Baru</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">SK Number</th>
                <th className="py-3 px-4">Case & Debtor</th>
                <th className="py-3 px-4">Authorized Field Personnel</th>
                <th className="py-3 px-4">Issued Date</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Drive Document</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.sks.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{s.skNumber}</td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{s.caseNo}</div>
                    <div className="text-[11px] text-slate-400">{s.debtorName}</div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-200">{s.personnelName}</td>
                  <td className="py-3.5 px-4 text-slate-400">{s.issuedDate}</td>
                  <td className="py-3.5 px-4 text-amber-400 font-medium">{s.expiryDate}</td>
                  <td className="py-3.5 px-4 text-center">
                    {s.driveDocumentUrl ? (
                      <a
                        href={s.driveDocumentUrl}
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
                      {(s.status || '').replace(/_/g, ' ')}
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
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col md:flex-row">
            
            {/* Form Section */}
            <div className="p-6 md:w-1/3 border-r border-slate-800 space-y-4">
              <h3 className="font-bold text-white text-base">Issue Surat Kuasa</h3>
              
              <form onSubmit={handleCreateSK} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Pilih Debitur / Kasus</label>
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
                  <label className="block text-xs text-slate-400 mb-1">Penerima Kuasa (Karyawan/Mitra DC)</label>
                  <select
                    value={personnelId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  >
                    {(store.personnel || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
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
                
                <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-4 col-span-2">
                  <h4 className="text-xs font-bold text-amber-400 mb-2">Draft Surat Kuasa (Copy & Paste to GDocs)</h4>
                  <textarea
                    rows={8}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-[10px] text-slate-300 font-mono"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">*Copy teks ini, buat di Google Docs, lalu paste link-nya di atas.</p>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowDraft(true)}
                    className="w-full py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg hover:bg-slate-700 transition border border-slate-700"
                  >
                    Tampilkan Preview Draft SK
                  </button>
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition shadow-md"
                  >
                    Submit for Executive Approval
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full py-2 bg-transparent text-slate-400 text-xs rounded-lg hover:text-slate-300 transition"
                  >
                    Batalkan
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="p-6 md:w-2/3 bg-slate-800/30">
              {showDraft && selectedCase && selectedPersonnel ? (
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-sm font-bold text-white">Preview Draft Surat Kuasa</h4>
                    <button
                      onClick={handlePrint}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Cetak (PDF)</span>
                    </button>
                  </div>
                  
                  {/* Printable Area */}
                  <div className="bg-white rounded p-8 text-black shadow-inner flex-1 overflow-y-auto" style={{ fontFamily: 'serif' }}>
                    <div ref={printRef} className="space-y-6 text-[12px] leading-relaxed max-w-[800px] mx-auto bg-white p-8">
                      {/* Kop Surat */}
                      <div className="flex items-center gap-6 border-b-2 border-black pb-4 mb-6">
                        <img 
                          src={settings.companyLogo || DEFAULT_MJ_LOGO} 
                          alt="Logo" 
                          className="w-24 h-24 object-contain"
                        />
                        <div className="flex-1 text-center">
                          <h1 className="text-xl font-bold uppercase">{settings.companyName || 'PT SURAT KUASA AGENCY'}</h1>
                          <p className="text-sm">{settings.companyAddress || 'Alamat Perusahaan Terdaftar'}</p>
                          <p className="text-sm">Telp: {settings.companyPhone || '-'} | Email: {settings.companyEmail || '-'}</p>
                        </div>
                      </div>

                      <div className="text-center space-y-1 mb-8">
                        <h2 className="text-lg font-bold underline uppercase">SURAT KUASA PENGURUSAN DAN PENARIKAN KENDARAAN</h2>
                        <p>Nomor: SK/DRAFT/{selectedCase.caseNo}/2026</p>
                      </div>

                      <p>Yang bertanda tangan di bawah ini:</p>
                      
                      {/* Pihak Pertama */}
                      <table className="w-full mb-4 ml-4">
                        <tbody>
                          <tr>
                            <td className="w-40 py-1 align-top">Nama</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1 font-bold">{settings.companyName || 'Direktur Perusahaan'}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Jabatan</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">Pimpinan / Direktur Utama</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Alamat</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{settings.companyAddress || '-'}</td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <p>Dalam hal ini bertindak untuk dan atas nama pemberi tugas sesuai surat kuasa substitusi, selanjutnya disebut <b>PIHAK PERTAMA</b> (Pemberi Kuasa).</p>
                      <p>Dengan ini memberikan kuasa penuh kepada:</p>

                      {/* Pihak Kedua */}
                      <table className="w-full mb-4 ml-4">
                        <tbody>
                          <tr>
                            <td className="w-40 py-1 align-top">Nama Lengkap</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1 font-bold">{selectedPersonnel.fullName}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">NIK KTP</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{selectedPersonnel.nikKtp}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Tempat, Tanggal Lahir</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{selectedPersonnel.birthPlaceDate}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Alamat</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{selectedPersonnel.address}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Posisi / Jabatan</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{selectedPersonnel.position || selectedPersonnel.type.replace('_', ' ')}</td>
                          </tr>
                        </tbody>
                      </table>

                      <p>Selanjutnya disebut sebagai <b>PIHAK KEDUA</b> (Penerima Kuasa).</p>

                      <div className="text-center font-bold my-6">----------------------------- K H U S U S -----------------------------</div>

                      <p>Untuk dan atas nama <b>PIHAK PERTAMA</b>, <b>PIHAK KEDUA</b> diberikan wewenang untuk melakukan mediasi, negosiasi, pengamanan, dan penarikan unit kendaraan yang menjadi objek jaminan fidusia dari Debitur berikut:</p>
                      
                      {/* Data Debitur */}
                      <table className="w-full mb-4 ml-4">
                        <tbody>
                          <tr>
                            <td className="w-40 py-1 align-top">Nama Debitur</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1 font-bold">{selectedCase.debtorName}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Nomor Kasus / Kontrak</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{selectedCase.caseNo}</td>
                          </tr>
                          <tr>
                            <td className="w-40 py-1 align-top">Objek Jaminan</td>
                            <td className="w-4 py-1 align-top">:</td>
                            <td className="py-1">{selectedCase.assetSummary}</td>
                          </tr>
                        </tbody>
                      </table>

                      <p className="text-justify">
                        Segala tindakan hukum yang dilakukan oleh <b>PIHAK KEDUA</b> dalam rangka pelaksanaan kuasa ini sepenuhnya menjadi tanggung jawab <b>PIHAK KEDUA</b> apabila terjadi pelanggaran hukum atau norma sosial. 
                        Surat kuasa ini berlaku terhitung sejak tanggal diterbitkan sampai dengan batas waktu penugasan dicabut.
                      </p>

                      <div className="flex justify-between mt-12 pt-8">
                        <div className="text-center">
                          <p className="mb-16">Penerima Kuasa (PIHAK KEDUA)</p>
                          <p className="font-bold underline">{selectedPersonnel.fullName}</p>
                          <p>{selectedPersonnel.nikKtp}</p>
                        </div>
                        <div className="text-center">
                          <p className="mb-1">Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                          <p className="mb-16">Pemberi Kuasa (PIHAK PERTAMA)</p>
                          <p className="font-bold underline">{settings.companyName || 'Direktur Utama'}</p>
                          <p>Pimpinan</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                  <FileText className="w-10 h-10 opacity-50" />
                  <p className="text-xs">Klik "Tampilkan Preview Draft SK" untuk melihat draft otomatis.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
