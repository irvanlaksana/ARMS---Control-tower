import React, { useState, useRef } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, SK, ApprovalRequest } from '../../types/arms';
import { FileText, Plus, ExternalLink, Printer, Edit3 } from 'lucide-react';
import { OfficialLetterhead } from '../common/OfficialLetterhead';
import { angkaKeTerbilang } from '../../utils/terbilang';

interface SKModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const SKModule: React.FC<SKModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit_text'>('preview');
  
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');
  
  // Form & Document Parameter State
  const [companyName, setCompanyName] = useState(store.settings?.companyName || 'PT. MITRAJASA SATRIA INDONESIA');
  const [companyAddress, setCompanyAddress] = useState(store.settings?.companyAddress || 'JL. Menteri Supeno No. 07, Sokaraja Tengah, Banyumas, Jawa Tengah 53181');
  const [repName, setRepName] = useState('Irvan Indralaksana');
  const [repTitle, setRepTitle] = useState('Direktur Utama');
  const [city, setCity] = useState('Banyumas');
  const [dasarPenagihan, setDasarPenagihan] = useState('Invoice No. INV/MSI/2026/089 Tanggal 15 Januari 2026 / SPK No. SPK-RECOV/2026/012');
  const [customNominal, setCustomNominal] = useState<number>(0);
  const [draftContent, setDraftContent] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedCase = store.cases.find((cs) => cs.id === caseId) || store.cases[0];
  const selectedPersonnel = (store.personnel || []).find((pr) => pr.id === personnelId) || store.personnel?.[0];
  const settings = store.settings;

  const currentNominal = customNominal > 0 ? customNominal : (selectedCase?.principalDebtOS || 75000000);
  const skNumberDraft = selectedCase ? `SK/MSI-${selectedCase.caseNo}/2026` : `SK/MSI-OPS/2026/001`;
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Update text draft whenever case/personnel/parameters change
  React.useEffect(() => {
    if (selectedCase && selectedPersonnel) {
      const cName = companyName || 'PT. MITRAJASA SATRIA INDONESIA';
      const cAddr = companyAddress || 'JL. Menteri Supeno No. 07, Sokaraja Tengah, Banyumas, Jawa Tengah 53181';
      const nominalVal = customNominal > 0 ? customNominal : selectedCase.principalDebtOS;
      const terbilangStr = angkaKeTerbilang(nominalVal);
      const customer = store.customers.find((c) => c.id === selectedCase.customerId);
      const debtorAddr = customer?.addressCurrent || customer?.addressKtp || 'JL. Ahmad Yani No. 45, Purwokerto';
      const employeeJob = selectedPersonnel.position || selectedPersonnel.type.replace('_', ' ') || 'Finance & Collection Staff';
      const employeeNik = selectedPersonnel.nikKtp || '3302101234560001';
      const employeeId = selectedPersonnel.id || 'EMP-2026-001';

      const text = `SURAT KUASA KHUSUS
No. Surat: ${skNumberDraft}

Yang bertanda tangan di bawah ini:
Nama Perusahaan   : ${cName}
Alamat Perusahaan : ${cAddr}
Diwakili Oleh     : ${repName}
Jabatan           : ${repTitle}
Dalam hal ini bertindak untuk dan atas nama ${cName}, yang selanjutnya disebut sebagai PEMBERI KUASA.

Dengan ini memberikan kuasa penuh kepada karyawan perusahaan:
Nama Karyawan     : ${selectedPersonnel.fullName}
NIK / No. KTP     : ${employeeNik}
NIK / ID Karyawan : ${employeeId}
Jabatan           : ${employeeJob}
Alamat            : ${selectedPersonnel.address || 'Alamat Domisili Karyawan'}
Yang selanjutnya disebut sebagai PENERIMA KUASA.

KHUSUS
Untuk dan atas nama Pemberi Kuasa, melakukan tindakan penagihan, penerimaan pembayaran, serta penyelesaian transaksi piutang usaha perusahaan kepada:
Nama Perusahaan/Debitur : ${selectedCase.debtorName}
Alamat Debitur          : ${debtorAddr}
Jumlah Piutang          : Rp${nominalVal.toLocaleString('id-ID')} (${terbilangStr})
Dasar Penagihan         : ${dasarPenagihan}

HAK DAN WEWENANG PENERIMA KUASA
Untuk melaksanakan maksud di atas, Penerima Kuasa diberikan wewenang untuk:
1. Menghubungi, mendatangi, dan menyampaikan penagihan resmi (termasuk menyerahkan Invoice/Surat Tagihan/Somasi Internal) kepada pihak Debitur.
2. Menerima pembayaran berupa cek, bilyet giro, atau bukti transfer dari Debitur yang ditujukan hanya ke rekening resmi Perusahaan.
3. Memberikan kuitansi atau tanda terima pembayaran sementara yang sah atas nama perusahaan kepada Debitur.
4. Melakukan negosiasi jadwal pembayaran (skema angsuran) berdasarkan batas wewenang yang telah disetujui sebelumnya oleh Manajemen Pemberi Kuasa.

KETENTUAN KHUSUS (INTERNAL PERUSAHAAN)
1. Penerima Kuasa DILARANG KERAS menerima pembayaran piutang dalam bentuk uang tunai (cash) atau mengalihkan pembayaran ke rekening pribadi, kecuali mendapat persetujuan tertulis terpisah dari Direksi Pemberi Kuasa.
2. Surat Kuasa ini berlaku sejak tanggal ditandatangani dan akan berakhir secara otomatis apabila:
   - Seluruh piutang di atas telah dinyatakan lunas oleh Perusahaan.
   - Surat Kuasa ini dicabut kembali secara tertulis oleh Pemberi Kuasa.
   - Hubungan kerja antara Pemberi Kuasa dan Penerima Kuasa berakhir/putus.

Demikian Surat Kuasa ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.

${city}, ${todayStr}

Pemberi Kuasa,
${cName}

(Meterai Rp 10.000)

${repName}
${repTitle}

Penerima Kuasa,

${selectedPersonnel.fullName}
${employeeJob}`;

      setDraftContent(text);
    }
  }, [selectedCase, selectedPersonnel, companyName, companyAddress, repName, repTitle, city, dasarPenagihan, customNominal, skNumberDraft, todayStr, store.customers]);

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
              <title>Surat Kuasa Khusus - PT Mitrajasa Satria Indonesia</title>
              <style>
                @page {
                  size: 215mm 330mm;
                  margin: 12mm 15mm 15mm 15mm;
                }
                body {
                  font-family: "Times New Roman", Times, Georgia, serif;
                  font-size: 11pt;
                  line-height: 1.45;
                  color: black;
                  background: white;
                  margin: 0;
                  padding: 8mm 12mm;
                  width: 215mm;
                  box-sizing: border-box;
                }
                h1, h2, h3, h4, p { margin: 0; padding: 0; }
                .text-center { text-align: center; }
                .text-justify { text-align: justify; }
                .font-bold { font-weight: bold; }
                .underline { text-decoration: underline; }
                .uppercase { text-transform: uppercase; }
                .flex { display: flex; }
                .items-center { align-items: center; }
                .justify-between { justify-content: space-between; }
                .gap-5 { gap: 1.25rem; }
                .w-full { width: 100%; }
                .w-48 { width: 180px; }
                .w-4 { width: 15px; }
                .ml-3 { margin-left: 0.75rem; }
                table { border-collapse: collapse; width: 100%; page-break-inside: avoid; }
                td { padding: 3px 0; vertical-align: top; font-size: 11pt; }
                .space-y-4 > * + * { margin-top: 1rem; }
                .space-y-3 > * + * { margin-top: 0.75rem; }
                .space-y-1 > * + * { margin-top: 0.25rem; }
                .space-y-0\\.5 > * + * { margin-top: 0.125rem; }
                .mb-1 { margin-bottom: 0.25rem; }
                .mb-2 { margin-bottom: 0.5rem; }
                .mb-3 { margin-bottom: 0.75rem; }
                .mb-4 { margin-bottom: 1rem; }
                .mb-6 { margin-bottom: 1.5rem; }
                .mt-2 { margin-top: 0.5rem; }
                .mt-3 { margin-top: 0.75rem; }
                .mt-4 { margin-top: 1rem; }
                .mt-6 { margin-top: 1.5rem; }
                .pt-2 { padding-top: 0.5rem; }
                .pt-4 { padding-top: 1rem; }
                .pt-6 { padding-top: 1.5rem; }
                .border-b-\\[3px\\] { border-bottom: 3px solid black; }
                .border-b-\\[1px\\] { border-bottom: 1px solid black; }
                .text-red-700 { color: #b91c1c; }
                .text-slate-950 { color: #020617; }
                .text-slate-900 { color: #0f172a; }
                .text-sm { font-size: 0.875rem; }
                .text-xs { font-size: 0.75rem; }
                .text-xl { font-size: 1.25rem; }
                .text-2xl { font-size: 1.5rem; }
                .font-black { font-weight: 900; }
                .tracking-wider { letter-spacing: 0.05em; }
                .keep-together { page-break-inside: avoid; break-inside: avoid; }
                .signature-block { page-break-inside: avoid; break-inside: avoid; margin-top: 1.5rem; }
                ol, ul { margin: 0; padding-left: 1.25rem; }
                li { margin-bottom: 0.25rem; text-align: justify; }
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

    const skNumber = skNumberDraft;

    const newSK: SK = {
      id: `SK-${Date.now()}`,
      skNumber,
      caseId: selectedCase.id,
      caseNo: selectedCase.caseNo,
      debtorName: selectedCase.debtorName,
      personnelId: selectedPersonnel.id,
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
      title: `Penerbitan Surat Kuasa Khusus ${skNumber} (${selectedPersonnel.fullName})`,
      requestedBy: currentUser.name,
      description: `Surat Kuasa Khusus penagihan piutang untuk kasus ${selectedCase.caseNo} atas nama ${selectedCase.debtorName}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'SK',
      newSK.id,
      `Generated Surat Kuasa Khusus ${skNumber} (Pending Approval)`
    );

    onUpdateStore({
      ...store,
      sks: [newSK, ...(store.sks || [])],
      approvals: [approvalReq, ...(store.approvals || [])],
      auditLogs: [audit, ...store.auditLogs],
    });

    setShowModal(false);
  };

  const currentCustomer = store.customers.find((c) => c.id === selectedCase?.customerId);
  const debtorAddress = currentCustomer?.addressCurrent || currentCustomer?.addressKtp || 'JL. Ahmad Yani No. 45, Purwokerto';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <span>Surat Kuasa Khusus (SK)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Penerbitan dan pengelolaan Surat Kuasa Khusus penagihan piutang resmi perusahaan (Standar F4 multi-halaman)
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Surat Kuasa Khusus</span>
          </button>
        )}
      </div>

      {/* List of Issued SK */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white">Daftar Surat Kuasa Diterbitkan</h3>
          <span className="text-xs text-slate-400">Total: {store.sks?.length || 0} Dokumen</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Nomor SK</th>
                <th className="p-3.5">Kasus / Debitur</th>
                <th className="p-3.5">Penerima Kuasa</th>
                <th className="p-3.5">Tgl Terbit</th>
                <th className="p-3.5">Masa Berlaku</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {(store.sks || []).map((sk) => (
                <tr key={sk.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-mono font-medium text-white">{sk.skNumber}</td>
                  <td className="p-3.5">
                    <div className="font-semibold text-slate-200">{sk.debtorName}</div>
                    <div className="text-[11px] text-slate-500 font-mono">Ref: {sk.caseNo}</div>
                  </td>
                  <td className="p-3.5 font-medium text-slate-200">{sk.personnelName}</td>
                  <td className="p-3.5 text-slate-400">{sk.issuedDate}</td>
                  <td className="p-3.5 text-slate-400">{sk.expiryDate}</td>
                  <td className="p-3.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        sk.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : sk.status === 'PENDING_APPROVAL'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                      }`}
                    >
                      {sk.status === 'ACTIVE'
                        ? 'Disetujui / Aktif'
                        : sk.status === 'PENDING_APPROVAL'
                        ? 'Menunggu Approval'
                        : sk.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {sk.driveDocumentUrl ? (
                      <a
                        href={sk.driveDocumentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium"
                      >
                        <span>GDrive</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-500 text-[11px]">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generator & Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl overflow-hidden shadow-2xl my-8 flex flex-col md:flex-row max-h-[90vh]">
            
            {/* Form Section */}
            <div className="p-6 md:w-1/3 overflow-y-auto border-r border-slate-800 space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white">Generator Surat Kuasa Khusus</h3>
                <p className="text-xs text-slate-400">Isi parameter kuasa khusus & preview format resmi multi-halaman</p>
              </div>
              
              <form onSubmit={handleCreateSK} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Pilih Debitur / Kasus</label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    {store.cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.caseNo} - {c.debtorName}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Penerima Kuasa (Karyawan Perusahaan)</label>
                  <select
                    value={personnelId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
                  >
                    {(store.personnel || []).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.position || p.type.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Diwakili Oleh (Direksi)</label>
                    <input
                      type="text"
                      value={repName}
                      onChange={(e) => setRepName(e.target.value)}
                      placeholder="Nama Direktur"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Jabatan Pejabat</label>
                    <input
                      type="text"
                      value={repTitle}
                      onChange={(e) => setRepTitle(e.target.value)}
                      placeholder="Direktur Utama"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Dasar Penagihan (Invoice / SPK)</label>
                  <input
                    type="text"
                    value={dasarPenagihan}
                    onChange={(e) => setDasarPenagihan(e.target.value)}
                    placeholder="Invoice No. ... Tanggal ... / SPK No. ..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Nominal Piutang (Rp)</label>
                    <input
                      type="number"
                      value={currentNominal}
                      onChange={(e) => setCustomNominal(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Kota Penerbitan</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Banyumas"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Google Drive Document Link (Opsional)</label>
                  <input
                    type="text"
                    value={driveDocumentUrl}
                    onChange={(e) => setDriveDocumentUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition shadow-md"
                  >
                    Ajukan Approval Executive
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full py-1.5 bg-transparent text-slate-400 rounded-lg hover:text-slate-300 transition"
                  >
                    Tutup
                  </button>
                </div>
              </form>
            </div>

            {/* Preview Section */}
            <div className="p-6 md:w-2/3 bg-slate-800/30 flex flex-col overflow-hidden">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-white">Dokumen Surat Kuasa Khusus</h4>
                  <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={`px-3 py-1 rounded-md font-medium transition ${
                        activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Format F4 Resmi
                    </button>
                    <button
                      onClick={() => setActiveTab('edit_text')}
                      className={`px-3 py-1 rounded-md font-medium transition flex items-center gap-1 ${
                        activeTab === 'edit_text' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Teks Draft</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak F4 (PDF Multi-Halaman)</span>
                </button>
              </div>

              {activeTab === 'edit_text' ? (
                <div className="flex-1 flex flex-col space-y-2 overflow-y-auto">
                  <p className="text-[11px] text-slate-400">
                    Draft teks di bawah ini dapat disalin ke Google Docs atau diedit manual:
                  </p>
                  <textarea
                    rows={18}
                    className="w-full flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-200 leading-relaxed focus:outline-none focus:border-indigo-500"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                  />
                </div>
              ) : (
                /* Printable Area - F4 Paper Format with Multi-page capability */
                <div className="bg-slate-950/70 rounded-xl p-4 text-black flex-1 overflow-y-auto flex justify-center">
                  <div
                    ref={printRef}
                    className="f4-page-preview rounded-lg p-8 sm:p-10 space-y-4 text-[12px] leading-relaxed"
                    style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}
                  >
                    {/* Official Kop Surat Perusahaan */}
                    <OfficialLetterhead customLogo={settings.companyLogo} />

                    {/* Judul & Nomor */}
                    <div className="text-center space-y-1 mb-4 mt-2 keep-together">
                      <h2 className="text-base sm:text-lg font-bold underline uppercase tracking-wide text-slate-950">
                        SURAT KUASA KHUSUS
                      </h2>
                      <p className="text-xs font-mono font-medium text-slate-800">
                        No. Surat: {skNumberDraft}
                      </p>
                    </div>

                    <p className="font-semibold text-slate-900 keep-together">Yang bertanda tangan di bawah ini:</p>
                    
                    {/* Pemberi Kuasa */}
                    <table className="w-full mb-2 ml-3 keep-together">
                      <tbody>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Nama Perusahaan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5 font-bold text-slate-950">{companyName}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Alamat Perusahaan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">{companyAddress}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Diwakili Oleh</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5 font-bold">{repName}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Jabatan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">{repTitle}</td>
                        </tr>
                      </tbody>
                    </table>
                    
                    <p className="text-justify keep-together">
                      Dalam hal ini bertindak untuk dan atas nama <b>{companyName}</b>, yang selanjutnya disebut sebagai <b>PEMBERI KUASA</b>.
                    </p>

                    <p className="font-semibold text-slate-900 mt-2 keep-together">
                      Dengan ini memberikan kuasa penuh kepada karyawan perusahaan:
                    </p>

                    {/* Penerima Kuasa */}
                    <table className="w-full mb-2 ml-3 keep-together">
                      <tbody>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Nama Karyawan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5 font-bold text-slate-950">{selectedPersonnel?.fullName || 'Nama Petugas'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">NIK / No. KTP</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">{selectedPersonnel?.nikKtp || '3302101234560001'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">NIK / ID Karyawan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5 font-mono">{selectedPersonnel?.id || 'EMP-2026-001'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Jabatan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">{selectedPersonnel?.position || selectedPersonnel?.type.replace('_', ' ') || 'Finance & Collection Staff'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Alamat</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">{selectedPersonnel?.address || 'Alamat Domisili Karyawan'}</td>
                        </tr>
                      </tbody>
                    </table>

                    <p className="keep-together">Yang selanjutnya disebut sebagai <b>PENERIMA KUASA</b>.</p>

                    {/* Bagian KHUSUS */}
                    <div className="keep-together pt-2">
                      <div className="text-center font-bold my-2 tracking-widest text-sm underline">
                        KHUSUS
                      </div>

                      <p className="text-justify mb-2">
                        Untuk dan atas nama Pemberi Kuasa, melakukan tindakan penagihan, penerimaan pembayaran, serta penyelesaian transaksi piutang usaha perusahaan kepada:
                      </p>
                      
                      {/* Data Debitur & Piutang */}
                      <table className="w-full mb-3 ml-3">
                        <tbody>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Nama Perusahaan/Debitur</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold text-slate-950">{selectedCase?.debtorName || 'Nama Debitur'}</td>
                          </tr>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Alamat Debitur</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">{debtorAddress}</td>
                          </tr>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Jumlah Piutang</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold text-slate-950">
                              Rp {currentNominal.toLocaleString('id-ID')} ({angkaKeTerbilang(currentNominal)})
                            </td>
                          </tr>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Dasar Penagihan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-medium">{dasarPenagihan}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* HAK DAN WEWENANG PENERIMA KUASA */}
                    <div className="keep-together pt-2">
                      <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                        HAK DAN WEWENANG PENERIMA KUASA
                      </h4>
                      <p className="mb-1">Untuk melaksanakan maksud di atas, Penerima Kuasa diberikan wewenang untuk:</p>
                      <ol className="list-decimal ml-5 space-y-1 text-justify">
                        <li>Menghubungi, mendatangi, dan menyampaikan penagihan resmi (termasuk menyerahkan Invoice/Surat Tagihan/Somasi Internal) kepada pihak Debitur.</li>
                        <li>Menerima pembayaran berupa cek, bilyet giro, atau bukti transfer dari Debitur yang ditujukan hanya ke rekening resmi Perusahaan.</li>
                        <li>Memberikan kuitansi atau tanda terima pembayaran sementara yang sah atas nama perusahaan kepada Debitur.</li>
                        <li>Melakukan negosiasi jadwal pembayaran (skema angsuran) berdasarkan batas wewenang yang telah disetujui sebelumnya oleh Manajemen Pemberi Kuasa.</li>
                      </ol>
                    </div>

                    {/* KETENTUAN KHUSUS (INTERNAL PERUSAHAAN) */}
                    <div className="keep-together pt-2">
                      <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                        KETENTUAN KHUSUS (INTERNAL PERUSAHAAN)
                      </h4>
                      <ol className="list-decimal ml-5 space-y-1.5 text-justify">
                        <li>
                          Penerima Kuasa <b>DILARANG KERAS</b> menerima pembayaran piutang dalam bentuk uang tunai (cash) atau mengalihkan pembayaran ke rekening pribadi, kecuali mendapat persetujuan tertulis terpisah dari Direksi Pemberi Kuasa.
                        </li>
                        <li>
                          Surat Kuasa ini berlaku sejak tanggal ditandatangani dan akan berakhir secara otomatis apabila:
                          <ul className="list-disc ml-5 mt-1 space-y-0.5">
                            <li>Seluruh piutang di atas telah dinyatakan lunas oleh Perusahaan.</li>
                            <li>Surat Kuasa ini dicabut kembali secara tertulis oleh Pemberi Kuasa.</li>
                            <li>Hubungan kerja antara Pemberi Kuasa dan Penerima Kuasa berakhir/putus.</li>
                          </ul>
                        </li>
                      </ol>
                    </div>

                    {/* Penutup */}
                    <p className="text-justify keep-together pt-2">
                      Demikian Surat Kuasa ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.
                    </p>

                    {/* Tanda Tangan */}
                    <div className="signature-block pt-4">
                      <div className="text-right mb-2">
                        <p>{city}, {todayStr}</p>
                      </div>

                      <div className="flex justify-between text-center mt-2">
                        <div className="w-1/2 flex flex-col items-center">
                          <p className="font-bold mb-1">Pemberi Kuasa,</p>
                          <p className="font-semibold text-xs mb-4">{companyName}</p>
                          
                          {/* Meterai box */}
                          <div className="w-24 h-12 border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-500 mb-4">
                            Meterai<br/>Rp 10.000
                          </div>

                          <p className="font-bold underline text-slate-950">{repName}</p>
                          <p className="text-xs text-slate-700">{repTitle}</p>
                        </div>

                        <div className="w-1/2 flex flex-col items-center justify-between">
                          <div>
                            <p className="font-bold mb-1">Penerima Kuasa,</p>
                            <p className="font-semibold text-xs text-transparent select-none mb-4">Spacer</p>
                          </div>
                          
                          <div className="mt-16">
                            <p className="font-bold underline text-slate-950">{selectedPersonnel?.fullName || 'Nama Petugas'}</p>
                            <p className="text-xs text-slate-700">{selectedPersonnel?.position || 'Finance & Collection Staff'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dokumen Footer */}
                    <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono keep-together">
                      {companyName} • Surat Kuasa Khusus Penagihan Piutang Usaha • Format Resmi F4
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
