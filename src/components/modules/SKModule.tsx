import React, { useState, useRef, useEffect } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, SK, ApprovalRequest, ClientType } from '../../types/arms';
import { FileText, Plus, ExternalLink, Printer, Edit3, UserCheck, Building2, User as UserIcon, Search, Edit2, Trash2 } from 'lucide-react';
import { OfficialLetterhead } from '../common/OfficialLetterhead';
import { angkaKeTerbilang } from '../../utils/terbilang';

interface SKModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const SKModule: React.FC<SKModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'edit_text'>('preview');
  const [clientTypeFilter, setClientTypeFilter] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [caseId, setCaseId] = useState(store.cases[0]?.id || '');
  const [personnelId, setPartnerId] = useState(store.personnel?.[0]?.id || '');
  const [driveDocumentUrl, setDriveDocumentUrl] = useState('');
  
  // Corporate / Multifinance Parameters
  const [companyName, setCompanyName] = useState(store.settings?.companyName || 'PT. MITRAJASA SATRIA INDONESIA');
  const [companyAddress, setCompanyAddress] = useState(store.settings?.companyAddress || 'JL. Menteri Supeno No. 07, Sokaraja Tengah, Banyumas, Jawa Tengah 53181');
  const [repName, setRepName] = useState('Irvan Indralaksana');
  const [repTitle, setRepTitle] = useState('Direktur Utama');
  const [city, setCity] = useState('Banyumas');
  
  // Perorangan (Individual Creditor) Parameters
  const [pemberiKuasaType, setPemberiKuasaType] = useState<'PERUSAHAAN' | 'KREDITUR_PERORANGAN'>('PERUSAHAAN');
  const [krediturName, setKrediturName] = useState('');
  const [krediturNik, setKrediturNik] = useState('');
  const [krediturAddress, setKrediturAddress] = useState('');
  const [krediturJob, setKrediturJob] = useState('Wiraswasta / Kreditur Perorangan');

  const [dasarPenagihan, setDasarPenagihan] = useState('');
  const [customNominal, setCustomNominal] = useState<number>(0);
  
  // Local states for Debtor & Vehicle details in the SK Form
  const [skContractNo, setSkContractNo] = useState('');
  const [skDebtorName, setSkDebtorName] = useState('');
  const [skDebtorAddress, setSkDebtorAddress] = useState('');
  const [skDueDate, setSkDueDate] = useState('');
  const [skInstallment, setSkInstallment] = useState('');
  const [skPenalty, setSkPenalty] = useState('');
  const [skPhone, setSkPhone] = useState('');
  const [skVehicleMerk, setSkVehicleMerk] = useState('');
  const [skVehiclePoliceNo, setSkVehiclePoliceNo] = useState('');

  const [draftContent, setDraftContent] = useState('');

  const printRef = useRef<HTMLDivElement>(null);
  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const selectedCase = (store.cases || []).find((cs) => cs.id === caseId) || store.cases?.[0];
  const selectedPersonnel = (store.personnel || []).find((pr) => pr.id === personnelId) || store.personnel?.[0];
  const isPerorangan = selectedCase?.clientType === 'PERORANGAN';
  const settings = store.settings;

  // When selected case changes, auto sync defaults for Perorangan or Multifinance
  useEffect(() => {
    if (selectedCase) {
      const client = (store.clients || []).find(
        (cl) => cl.id === selectedCase.clientId || cl.companyName === selectedCase.clientName
      );

      if (selectedCase.clientType === 'PERORANGAN') {
        setPemberiKuasaType('KREDITUR_PERORANGAN');
        const kName = client?.contactPerson || client?.companyName?.replace(/\s*\(.*?\)\s*/g, '') || selectedCase.clientName?.replace(/\s*\(.*?\)\s*/g, '') || 'H. Rahmat Hidayat, S.E.';
        const kNik = client?.nikKtp || '3302101506780002';
        const kAddr = client?.address || 'Jl. Overste Isdiman No. 88, Purwokerto Lor, Banyumas';
        setKrediturName(kName);
        setKrediturNik(kNik);
        setKrediturAddress(kAddr);
        setKrediturJob('Wiraswasta / Kreditur Pribadi');
        setDasarPenagihan(`Surat Pengakuan Hutang (SPH) No. ${selectedCase.contractId || selectedCase.multifinanceContractNo || 'SPH-2026/001'} / Kwitansi Pinjaman Tertanggal 15 Januari 2025`);
      } else {
        setPemberiKuasaType('PERUSAHAAN');
        setDasarPenagihan(`Perjanjian Pembiayaan Konsumen No. ${selectedCase.multifinanceContractNo || selectedCase.contractId || 'ADR-90123847'} / Sertifikat Jaminan Fidusia`);
      }
      setCustomNominal(selectedCase.principalDebtOS || 0);

      const customer = (store.customers || []).find((c) => c.id === selectedCase.customerId);
      setSkContractNo(customer?.contractNo || selectedCase.contractId || selectedCase.multifinanceContractNo || '');
      setSkDebtorName(selectedCase.debtorName || '');
      setSkDebtorAddress(customer?.addressCurrent || customer?.addressKtp || selectedCase.debtorAddress || '');
      setSkDueDate(customer?.dueDate || '');
      setSkInstallment(customer?.installmentAmount || '');
      setSkPenalty(customer?.penaltyAmount || '');
      setSkPhone(customer?.phone || selectedCase.debtorPhone || '');
      setSkVehicleMerk(customer?.vehicleMerkType || '');
      setSkVehiclePoliceNo(customer?.vehiclePoliceNo || '');
    }
  }, [selectedCase, store.clients, store.customers]);

  const currentNominal = customNominal > 0 ? customNominal : (selectedCase?.principalDebtOS || 0);
  const skNumberDraft = selectedCase
    ? selectedCase.clientType === 'PERORANGAN'
      ? `SK/MSI-IND/${selectedCase.caseNo}/2026`
      : `SK/MSI-${selectedCase.caseNo}/2026`
    : `SK/MSI-OPS/2026/001`;
  const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 10);
  const endDateStr = endDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

  // Update text draft whenever parameters change
  useEffect(() => {
    if (selectedCase && selectedPersonnel) {
      const cName = companyName || 'PT. MITRAJASA SATRIA INDONESIA';
      const cAddr = companyAddress || 'JL. Menteri Supeno No. 07, Sokaraja Tengah, Banyumas, Jawa Tengah 53181';
      const nominalVal = customNominal > 0 ? customNominal : selectedCase.principalDebtOS || 0;
      const terbilangStr = angkaKeTerbilang(nominalVal);
      const customer = (store.customers || []).find((c) => c.id === selectedCase.customerId);
      const debtorAddr = customer?.addressCurrent || customer?.addressKtp || selectedCase.debtorAddress || 'JL. Ahmad Yani No. 45, Purwokerto';
      const employeeJob = selectedPersonnel.position || (selectedPersonnel.type ? selectedPersonnel.type.replace('_', ' ') : 'Kuasa Lapangan & Mediasi');
      const employeeNik = selectedPersonnel.nikKtp || '3302101234560001';
      const employeeId = selectedPersonnel.id || 'PER-001';

      if (pemberiKuasaType === 'KREDITUR_PERORANGAN' || selectedCase.clientType === 'PERORANGAN') {
        // Text template for Perorangan Creditor
        const text = `SURAT KUASA KHUSUS PENAGIHAN PIUTANG PERSEORANGAN
No. Surat: ${skNumberDraft}

Yang bertanda tangan di bawah ini:
Nama Lengkap      : ${krediturName || selectedCase.clientName}
NIK / No. KTP     : ${krediturNik || '3302101506780002'}
Pekerjaan         : ${krediturJob}
Alamat Domisili   : ${krediturAddress || 'Alamat Domisili Kreditur'}
Dalam hal ini bertindak selaku Kreditur / Pemilik Piutang Sah yang sah, selanjutnya disebut sebagai PEMBERI KUASA.

Dengan ini memberikan kuasa penuh kepada Tim Operasional PT MITRAJASA SATRIA INDONESIA:
Nama Karyawan     : ${selectedPersonnel.fullName}
NIK / No. KTP     : ${employeeNik}
NIK / ID Petugas  : ${employeeId}
Jabatan           : ${employeeJob}
Alamat            : ${selectedPersonnel.address || 'Alamat Domisili Petugas'}
Yang selanjutnya disebut sebagai PENERIMA KUASA.

KHUSUS
Untuk dan atas nama Pemberi Kuasa, melakukan tindakan penagihan, mediasi, musyawarah kekeluargaan, penerimaan pembayaran/titipan, serta penyelesaian transaksi piutang perseorangan kepada:
Nama Debitur      : ${skDebtorName || selectedCase.debtorName}
NIK Debitur       : ${selectedCase.debtorNik || '-'}
Alamat Debitur    : ${skDebtorAddress || debtorAddr}
Jumlah Piutang    : Rp${nominalVal.toLocaleString('id-ID')} (${terbilangStr})
Dasar Penagihan   : ${dasarPenagihan}

HAK DAN WEWENANG PENERIMA KUASA
Untuk melaksanakan maksud di atas, Penerima Kuasa diberikan wewenang untuk:
1. Menghubungi, mendatangi tempat tinggal/kantor, dan menyampaikan penagihan resmi serta mediasi kepada Debitur.
2. Menerima pembayaran berupa uang tunai dengan tanda terima resmi, cek, bilyet giro, atau konfirmasi bukti transfer yang disetorkan ke rekening Kreditur/Perusahaan.
3. Memberikan kuitansi atau tanda terima pembayaran sementara yang sah atas nama Pemberi Kuasa.
4. Melakukan musyawarah mufakat perihal skema angsuran atau restrukturisasi pembayaran dengan persetujuan Pemberi Kuasa.

KETENTUAN KHUSUS
1. Seluruh dana yang diterima wajib diserahkan atau disetorkan secara penuh kepada Pemberi Kuasa sesuai perjanjian kerjasama penanganan piutang.
2. Surat Kuasa ini berlaku selama 90 (sembilan puluh) hari kalender sejak tanggal ditandatangani dan dapat diperpanjang atas kesepakatan tertulis.

Demikian Surat Kuasa ini dibuat dengan sebenarnya dalam keadaan sadar tanpa paksaan dari pihak manapun untuk dipergunakan sebagaimana mestinya.

${city}, ${todayStr}

Pemberi Kuasa (Kreditur),
(Meterai Rp 10.000)

${krediturName || selectedCase.clientName}

Penerima Kuasa,

${selectedPersonnel.fullName}
${employeeJob}`;

        setDraftContent(text);
      } else {
        // Corporate / Multifinance text template
        const text = `SURAT TUGAS 
Nomor: ST-DC/MJI/2026/08/${skNumberDraft.split('/').pop() || '0483'}

Yang bertanda tangan di bawah ini, mewakili Manajemen PT MITRA JASATRIA INDONESIA:
Nama\t\t: ${repName.toUpperCase()}
Jabatan\t\t: ${repTitle.toUpperCase()}

Dengan ini memberikan tugas penuh, wewenang, dan tanggung jawab penagihan di lapangan kepada : 
Nama\t\t: ${selectedPersonnel.fullName.toUpperCase()}
NIK\t\t\t: ${employeeNik}
Jabatan\t\t: ${employeeJob}

Dan rekan
Untuk melakukan konfirmasi, penagihan, dan negosiasi penyelesaian kewajiban pembayaran atas nama Debitur/Nasabah dari ${selectedCase.clientName} yang penagihannya dikuasakan kepada PT Mitra Jasatria Indonesia.
Berikut data nasabah : 
No. Kontrak \t\t: ${skContractNo || customer?.contractNo || selectedCase.contractId || selectedCase.multifinanceContractNo || '-'}
Nama\t\t\t: ${skDebtorName ? skDebtorName.toUpperCase() : selectedCase.debtorName.toUpperCase()}
Alamat\t\t\t: ${skDebtorAddress || debtorAddr || '-'}
Tanggal Jatuh Tempo\t: ${skDueDate || customer?.dueDate || '-'}
Angsuran\t\t: ${skInstallment || customer?.installmentAmount || '-'}
DENDA\t\t\t: Rp ${skPenalty || customer?.penaltyAmount || '-'}
Nomor Handphone\t\t: ${skPhone || customer?.phone || '-'}

Adapun spesifikasi kendaraan sebagai berikut : 
Merk/Type\t\t: ${skVehicleMerk || customer?.vehicleMerkType || '-'}
Nomor Polisi\t\t: ${skVehiclePoliceNo || customer?.vehiclePoliceNo || '-'}

Pelaksanaan Surat Tugas ini wajib tunduk dan patuh pada ketentuan sebagai berikut:
MASA BERLAKU SURAT TUGAS
Surat Tugas ini berlaku efektif terhitung sejak tanggal ${todayStr} sampai dengan tanggal ${endDateStr}. Apabila masa berlaku telah berakhir, Surat Tugas ini dinyatakan tidak berlaku lagi dan wajib diperpanjang melalui persetujuan Manajemen PT Mitra Jasatria Indonesia.

WEWENANG DAN TANGGUNG JAWAB PETUGAS
Dalam menjalankan tugas penagihan di lapangan, Tim Penagihan berwenang:
1. Mendatangi alamat domisili, kantor, atau lokasi tempat usaha Debitur sesuai data resmi yang tercantum dalam lembar kerja penagihan.
2. Melakukan konfirmasi, negosiasi, dan menyampaikan Surat Peringatan (SP) atau tagihan resmi yang diterbitkan oleh Perusahaan/Kreditur/Mitra Perusahaan.
Untuk keperluan diatas, PENERIMA TUGAS berhak untuk menerima jaminan piutang/jaminan fidusia, menandatangani dokumen - dokumen, meminta tanda tangan, serta melakukan tindakan yang dianggap perlu dalam melaksanakan tugas tersebut/meminta bantuan pihak berwajib jika diperlukan. 

LARANGAN DAN KEPATUHAN
1. Dilarang menerima pembayaran tunai (cash) secara langsung dari Debitur dalam bentuk apa pun, kecuali menggunakan Virtual Account resmi atau tanda terima sah dari sistem perusahaan.
2. Dilarang menggunakan ancaman, kekerasan fisik, intimidasi, penekanan secara psikologis, atau tindakan melawan hukum yang melanggar Kode Etik Penagihan Bank Indonesia (BI), Otoritas Jasa Keuangan (OJK), serta Peraturan Perundang-undangan Republik Indonesia.
3. Petugas wajib bersikap sopan, profesional, mengenakan pakaian rapi dan sopan selama berada di lapangan.
4. Petugas wajib melaporkan hasil penagihan (Field Report) secara real-time melalui sistem aplikasi penagihan resmi PT Mitra Jasatria Indonesia pada hari yang sama.

SANKSI DAN TANGGUNG JAWAB HUKUM
Setiap pelanggaran terhadap kode etik, penyalahgunaan wewenang, penggelapan dana penagihan, atau tindakan penyimpangan yang dilakukan oleh Petugas Penagihan akan dikenakan sanksi tegas berupa Pemutusan Hubungan Kerja (PHK) secara tidak hormat.
Tindakan pelanggaran hukum yang dilakukan oleh Petugas di luar prosedur resmi Perusahaan menjadi tanggung jawab pribadi petugas bersangkutan secara pidana maupun perdata (PT Mitra Jasatria Indonesia membebaskan diri dari segala tuntutan hukum akibat penyimpangan oknum).

Demikian Surat Tugas ini diterbitkan untuk dipergunakan sebagaimana mestinya dan dilaksanakan dengan penuh rasa tanggung jawab demi menjaga integritas, profesionalisme, dan nama baik PT Mitra Jasatria Indonesia serta Kreditur.

${city}, ${todayStr}
Pemberi Tugas,                                        Penerima Tugas,
PT MITRA JASATRIA INDONESIA                           PETUGAS PENAGIHAN



${repName}                                            ${selectedPersonnel.fullName.toUpperCase()}
${repTitle}                                           ${employeeJob.toUpperCase()}`;

        setDraftContent(text);
      }
    }
  }, [
    selectedCase,
    selectedPersonnel,
    pemberiKuasaType,
    krediturName,
    krediturNik,
    krediturAddress,
    krediturJob,
    companyName,
    companyAddress,
    repName,
    repTitle,
    city,
    dasarPenagihan,
    customNominal,
    skNumberDraft,
    todayStr,
    store.customers,
    skContractNo,
    skDebtorName,
    skDebtorAddress,
    skDueDate,
    skInstallment,
    skPenalty,
    skPhone,
    skVehicleMerk,
    skVehiclePoliceNo
  ]);

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
    const isPer = selectedCase.clientType === 'PERORANGAN';

    if (isEditing && editId) {
      const updatedSKs = store.sks.map(sk => {
        if (sk.id === editId) {
          return {
            ...sk,
            skNumber,
            caseId: selectedCase.id,
            caseNo: selectedCase.caseNo,
            debtorName: selectedCase.debtorName,
            clientType: selectedCase.clientType || 'MULTIFINANCE',
            clientName: selectedCase.clientName,
            pemberiKuasaType: isPer ? pemberiKuasaType : 'PERUSAHAAN',
            krediturName: isPer ? (krediturName || selectedCase.clientName) : undefined,
            krediturNik: isPer ? krediturNik : undefined,
            krediturAddress: isPer ? krediturAddress : undefined,
            personnelId: selectedPersonnel.id,
            personnelName: selectedPersonnel.fullName,
            driveDocumentUrl,
          };
        }
        return sk;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'SK',
        editId,
        `Updated Surat Kuasa Khusus ${skNumber} (${isPer ? 'Perorangan: ' + selectedCase.clientName : 'Multifinance'})`
      );

      onUpdateStore({
        ...store,
        sks: updatedSKs,
        auditLogs: [audit, ...(store.auditLogs || [])],
      });
    } else {
      const newSK: SK = {
        id: `SK-${Date.now()}`,
        skNumber,
        caseId: selectedCase.id,
        caseNo: selectedCase.caseNo,
        debtorName: selectedCase.debtorName,
        clientType: selectedCase.clientType || 'MULTIFINANCE',
        clientName: selectedCase.clientName,
        pemberiKuasaType: isPer ? pemberiKuasaType : 'PERUSAHAAN',
        krediturName: isPer ? (krediturName || selectedCase.clientName) : undefined,
        krediturNik: isPer ? krediturNik : undefined,
        krediturAddress: isPer ? krediturAddress : undefined,
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
      title: `Penerbitan Surat Kuasa Khusus ${skNumber} (${isPer ? 'Klien Perorangan' : 'Klien Multifinance'})`,
      requestedBy: currentUser.name,
      description: `Surat Kuasa Khusus penagihan piutang ${isPer ? 'perorangan' : 'multifinance'} untuk kasus ${selectedCase.caseNo} (${selectedCase.debtorName}) - Klien: ${selectedCase.clientName}`,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'SK',
      newSK.id,
      `Generated Surat Kuasa Khusus ${skNumber} (${isPer ? 'Perorangan: ' + selectedCase.clientName : 'Multifinance'})`
    );

    onUpdateStore({
      ...store,
      sks: [newSK, ...(store.sks || [])],
      approvals: [approvalReq, ...(store.approvals || [])],
      auditLogs: [audit, ...(store.auditLogs || [])],
    });
    }

    setShowModal(false);
  };

  const handleDeleteSK = (id: string, skNo: string) => {
    if (!window.confirm(`Are you sure you want to delete SK "${skNo}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'SK',
      id,
      `Deleted SK ${skNo}`
    );

    onUpdateStore({
      ...store,
      sks: (store.sks || []).filter(s => s.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleOpenForExistingSK = (sk: SK, editMode: boolean = false) => {
    setCaseId(sk.caseId);
    setPartnerId(sk.personnelId);
    setDriveDocumentUrl(sk.driveDocumentUrl || '');
    if (sk.clientType === 'PERORANGAN' || sk.pemberiKuasaType === 'KREDITUR_PERORANGAN') {
      setPemberiKuasaType('KREDITUR_PERORANGAN');
      if (sk.krediturName) setKrediturName(sk.krediturName);
      if (sk.krediturNik) setKrediturNik(sk.krediturNik);
      if (sk.krediturAddress) setKrediturAddress(sk.krediturAddress);
    } else {
      setPemberiKuasaType('PERUSAHAAN');
    }
    if (editMode) {
      setIsEditing(true);
      setEditId(sk.id);
    } else {
      setIsEditing(false);
      setEditId(null);
    }
    setShowModal(true);
  };

  const currentCustomer = (store.customers || []).find((c) => c.id === selectedCase?.customerId);
  const debtorAddress = currentCustomer?.addressCurrent || currentCustomer?.addressKtp || selectedCase?.debtorAddress || 'JL. Ahmad Yani No. 45, Purwokerto';

  const multifinanceCases = (store.cases || []).filter((c) => c.clientType !== 'PERORANGAN');
  const peroranganCases = (store.cases || []).filter((c) => c.clientType === 'PERORANGAN');

  const allSks = store.sks || [];
  const multifinanceSKCount = allSks.filter((s) => {
    const parentCase = (store.cases || []).find((c) => c.id === s.caseId);
    return (s.clientType === 'MULTIFINANCE' || (!s.clientType && parentCase?.clientType !== 'PERORANGAN'));
  }).length;

  const peroranganSKCount = allSks.filter((s) => {
    const parentCase = (store.cases || []).find((c) => c.id === s.caseId);
    return s.clientType === 'PERORANGAN' || parentCase?.clientType === 'PERORANGAN';
  }).length;

  const filteredSKs = allSks.filter((sk) => {
    const parentCase = (store.cases || []).find((c) => c.id === sk.caseId);
    const cType = sk.clientType || parentCase?.clientType || 'MULTIFINANCE';
    if (clientTypeFilter === 'MULTIFINANCE' && cType !== 'MULTIFINANCE') return false;
    if (clientTypeFilter === 'PERORANGAN' && cType !== 'PERORANGAN') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = `${sk.skNumber} ${sk.debtorName} ${sk.caseNo} ${sk.personnelName} ${sk.clientName || parentCase?.clientName || ''}`.toLowerCase();
      if (!match.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">
              Surat Kuasa Khusus (SK)
            </h2>
            <span className="bg-indigo-950 text-indigo-300 text-[10px] px-2 py-0.5 rounded border border-indigo-800 font-semibold">
              Multifinance & Perorangan
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Penerbitan dan pengelolaan Surat Kuasa Khusus penagihan piutang resmi perusahaan & perorangan (Standar F4 multi-halaman)
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              if (store.cases && store.cases.length > 0 && !caseId) {
                setCaseId(store.cases[0].id);
              }
              setShowModal(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Buat Surat Kuasa Khusus</span>
          </button>
        )}
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Client Type Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start">
          <button
            onClick={() => setClientTypeFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${
              clientTypeFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua Dokumen ({allSks.length})
          </button>

          <button
            onClick={() => setClientTypeFilter('MULTIFINANCE')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              clientTypeFilter === 'MULTIFINANCE'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Multifinance ({multifinanceSKCount})</span>
          </button>

          <button
            onClick={() => setClientTypeFilter('PERORANGAN')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
              clientTypeFilter === 'PERORANGAN'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-200 font-semibold">Perorangan ({peroranganSKCount})</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nomor SK, debitur, kreditur..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* List of Issued SK */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/40">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white">Daftar Surat Kuasa Diterbitkan</h3>
            <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono">
              Menampilkan {filteredSKs.length} dokumen
            </span>
          </div>
          <span className="text-xs text-slate-400">Standar Hukum Perdata & Kuasa Khusus F4</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3.5">Nomor SK</th>
                <th className="p-3.5">Klien / Pemberi Kuasa</th>
                <th className="p-3.5">Kasus / Debitur</th>
                <th className="p-3.5">Penerima Kuasa</th>
                <th className="p-3.5">Tgl Terbit & Masa Berlaku</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSKs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                    Belum ada data Surat Kuasa Khusus sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredSKs.map((sk) => {
                  const parentCase = (store.cases || []).find((c) => c.id === sk.caseId);
                  const isPer = sk.clientType === 'PERORANGAN' || parentCase?.clientType === 'PERORANGAN';
                  const cName = sk.krediturName || sk.clientName || parentCase?.clientName || 'Klien';

                  return (
                    <tr key={sk.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-medium text-white">
                        <div className="font-bold text-indigo-300">{sk.skNumber}</div>
                        <div className="text-[10px] text-slate-500 font-mono">Ref: {sk.caseNo}</div>
                      </td>

                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          {isPer ? (
                            <span className="bg-amber-950 text-amber-300 text-[9px] px-1.5 py-0.5 rounded border border-amber-800 font-bold inline-flex items-center gap-1">
                              <UserIcon className="w-2.5 h-2.5" />
                              PERORANGAN
                            </span>
                          ) : (
                            <span className="bg-indigo-950 text-indigo-300 text-[9px] px-1.5 py-0.5 rounded border border-indigo-800 font-bold inline-flex items-center gap-1">
                              <Building2 className="w-2.5 h-2.5" />
                              MULTIFINANCE
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-slate-200 truncate max-w-[200px]">
                          {cName}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-100">{sk.debtorName}</div>
                        {parentCase && (
                          <div className="text-[10px] text-emerald-400 font-mono">
                            OS: Rp {(parentCase.principalDebtOS || 0).toLocaleString('id-ID')}
                          </div>
                        )}
                      </td>

                      <td className="p-3.5 font-medium text-slate-200">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{sk.personnelName}</span>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-400">
                        <div>Terbit: <span className="text-slate-200 font-mono">{sk.issuedDate}</span></div>
                        <div className="text-[10px] text-slate-500">Exp: <span className="font-mono">{sk.expiryDate}</span></div>
                      </td>

                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            sk.status === 'ACTIVE' || sk.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                              : sk.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-500/10 text-slate-400 border border-slate-500/30'
                          }`}
                        >
                          {sk.status === 'ACTIVE' || sk.status === 'APPROVED'
                            ? 'Disetujui / Aktif'
                            : sk.status === 'PENDING_APPROVAL'
                            ? 'Menunggu Approval'
                            : sk.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleOpenForExistingSK(sk, true)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                                title="Edit SK"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSK(sk.id, sk.skNumber)}
                                className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                                title="Delete SK"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleOpenForExistingSK(sk, false)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded border border-slate-700 text-[11px] font-medium transition shadow-sm"
                            title="Preview / Cetak Format F4"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Preview F4</span>
                          </button>

                          {sk.driveDocumentUrl && (
                            <a
                              href={sk.driveDocumentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-200 font-medium"
                              title="Buka File Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generator & Preview Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-2 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-7xl overflow-hidden shadow-2xl my-4 flex flex-col md:flex-row max-h-[95vh]">
            
            {/* Form Parameter Section */}
            <div className="p-4 md:w-1/3 overflow-y-auto border-r border-slate-800 space-y-3 custom-scrollbar">
              <div className="border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">
                    {isEditing ? 'Edit Surat Kuasa Khusus' : 'Generator Surat Kuasa Khusus'}
                  </h3>
                </div>
                <p className="text-[10px] text-slate-400">
                  Parameter kuasa khusus & preview format resmi F4 untuk Klien Multifinance & Perorangan
                </p>
              </div>
              
              <form onSubmit={handleCreateSK} className="space-y-2.5 text-xs">
                {/* Case Selection with Grouped Options */}
                <div>
                  <label className="block text-slate-400 mb-0.5 text-[10px] font-semibold">Pilih Berkas Kasus & Debitur</label>
                  <select
                    value={caseId}
                    onChange={(e) => setCaseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500 shadow-inner"
                  >
                    {multifinanceCases.length > 0 && (
                      <optgroup label="🏢 Klien Multifinance / Lembaga Pembiayaan">
                        {multifinanceCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            [MULTIFINANCE] {c.caseNo} — {c.debtorName} ({c.clientName})
                          </option>
                        ))}
                      </optgroup>
                    )}

                    {peroranganCases.length > 0 && (
                      <optgroup label="👤 Klien Perorangan / Kreditur Individu">
                        {peroranganCases.map((c) => (
                          <option key={c.id} value={c.id}>
                            [PERORANGAN] {c.caseNo} — {c.debtorName} (Kreditur: {c.clientName})
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                {/* Info Card when Perorangan is selected */}
                {isPerorangan && (
                  <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-[11px] font-bold text-amber-200">
                        Klien Perorangan (Kreditur Individu)
                      </span>
                    </div>

                    <div className="space-y-2 pt-1 border-t border-amber-900/50">
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Model Pemberi Kuasa</label>
                        <select
                          value={pemberiKuasaType}
                          onChange={(e) => setPemberiKuasaType(e.target.value as any)}
                          className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-xs text-white"
                        >
                          <option value="KREDITUR_PERORANGAN">
                            Kuasa Langsung dari Kreditur Individu
                          </option>
                          <option value="PERUSAHAAN">
                            Kuasa Melalui PT. MSI (Substitusi Kuasa)
                          </option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-0.5">Nama Kreditur</label>
                          <input
                            type="text"
                            value={krediturName}
                            onChange={(e) => setKrediturName(e.target.value)}
                            placeholder="Nama Lengkap Kreditur"
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-0.5">NIK / No. KTP</label>
                          <input
                            type="text"
                            value={krediturNik}
                            onChange={(e) => setKrediturNik(e.target.value)}
                            placeholder="330210..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Alamat Domisili Kreditur</label>
                        <input
                          type="text"
                          value={krediturAddress}
                          onChange={(e) => setKrediturAddress(e.target.value)}
                          placeholder="Alamat lengkap kreditur"
                          className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Penerima Kuasa (Karyawan / Petugas Lapangan) */}
                <div>
                  <label className="block text-slate-400 mb-0.5 text-[10px] font-semibold">Penerima Kuasa (Petugas Penagihan & Mediasi)</label>
                  <select
                    value={personnelId}
                    onChange={(e) => setPartnerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-[11px] text-white focus:outline-none focus:border-indigo-500"
                  >
                    {(store.personnel || []).map((p) => {
                      const roleLabel = p.position || (p.type ? p.type.replace(/_/g, ' ') : 'Petugas Lapangan');
                      return (
                        <option key={p.id} value={p.id}>
                          {p.fullName} ({roleLabel})
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Company Rep (if corporate mode) */}
                {!isPerorangan && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5 font-medium">Diwakili Oleh (Direksi)</label>
                      <input
                        type="text"
                        value={repName}
                        onChange={(e) => setRepName(e.target.value)}
                        placeholder="Nama Direktur"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white text-[11px]"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5 font-medium">Jabatan Pejabat</label>
                      <input
                        type="text"
                        value={repTitle}
                        onChange={(e) => setRepTitle(e.target.value)}
                        placeholder="Direktur Utama"
                        className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {/* Dasar Penagihan */}
                <div>
                  <label className="block text-slate-300 mb-1 font-semibold">
                    Dasar Penagihan ({isPerorangan ? 'SPH / Kwitansi Piutang' : 'Kontrak / Fidusia'})
                  </label>
                  <input
                    type="text"
                    value={dasarPenagihan}
                    onChange={(e) => setDasarPenagihan(e.target.value)}
                    placeholder="Nomor SPH / Kwitansi / Kontrak Pembiayaan..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>

                {/* Detail Debitur & Kendaraan */}
                <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 space-y-3 mt-4">
                  <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    Detail Nasabah & Kendaraan (Otomatis dari Database / Bisa Diedit)
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">No. Kontrak</label>
                      <input type="text" value={skContractNo} onChange={(e) => setSkContractNo(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white font-mono" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Nama Nasabah</label>
                      <input type="text" value={skDebtorName} onChange={(e) => setSkDebtorName(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5">Alamat Nasabah</label>
                    <input type="text" value={skDebtorAddress} onChange={(e) => setSkDebtorAddress(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white" />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Tanggal Jatuh Tempo</label>
                      <input type="text" value={skDueDate} onChange={(e) => setSkDueDate(e.target.value)} placeholder="Tgl 15 setiap bulan" className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Nomor Handphone</label>
                      <input type="text" value={skPhone} onChange={(e) => setSkPhone(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Angsuran</label>
                      <input type="text" value={skInstallment} onChange={(e) => setSkInstallment(e.target.value)} placeholder="Angsuran ke 8 s/d 18 : Rp. 385.000" className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white text-[10px]" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">DENDA (Rp)</label>
                      <input type="text" value={skPenalty} onChange={(e) => setSkPenalty(e.target.value)} placeholder="1.500.000" className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Merk / Type Kendaraan</label>
                      <input type="text" value={skVehicleMerk} onChange={(e) => setSkVehicleMerk(e.target.value)} placeholder="HONDA BEAT SPORTY CBS" className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white" />
                    </div>
                    <div>
                      <label className="block text-slate-400 text-[10px] mb-0.5">Nomor Polisi</label>
                      <input type="text" value={skVehiclePoliceNo} onChange={(e) => setSkVehiclePoliceNo(e.target.value)} placeholder="R 1234 XY" className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white font-mono" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5 font-semibold">Nominal Piutang (Rp)</label>
                    <input
                      type="number"
                      value={currentNominal}
                      onChange={(e) => setCustomNominal(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white font-mono text-emerald-400 text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 text-[10px] mb-0.5 font-semibold">Kota Penerbitan</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Banyumas"
                      className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white text-[11px]"
                    />
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-slate-400 text-[10px] mb-0.5 font-medium">Google Drive Document Link (Opsional)</label>
                  <input
                    type="text"
                    value={driveDocumentUrl}
                    onChange={(e) => setDriveDocumentUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-md p-1.5 text-white text-[11px]"
                  />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold rounded-lg hover:from-indigo-500 hover:to-indigo-400 transition shadow-lg active:scale-95"
                  >
                    {isEditing ? 'Simpan Perubahan' : `Ajukan Approval Executive (SK ${isPerorangan ? 'Perorangan' : 'Multifinance'})`}
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
            <div className="p-4 md:w-2/3 bg-slate-800/30 flex flex-col overflow-hidden">
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-md transition active:scale-95"
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
                        {isPerorangan || pemberiKuasaType === 'KREDITUR_PERORANGAN'
                          ? 'SURAT KUASA KHUSUS PENAGIHAN PIUTANG PERSEORANGAN'
                          : 'SURAT KUASA KHUSUS'}
                      </h2>
                      <p className="text-xs font-mono font-medium text-slate-800">
                        No. Surat: {skNumberDraft}
                      </p>
                    </div>

                    <p className="font-semibold text-slate-900 keep-together">Yang bertanda tangan di bawah ini:</p>
                    
                    {/* Pemberi Kuasa */}
                    {isPerorangan && pemberiKuasaType === 'KREDITUR_PERORANGAN' ? (
                      // Pemberi Kuasa Perorangan (Kreditur)
                      <table className="w-full mb-2 ml-3 keep-together">
                        <tbody>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Nama Lengkap (Kreditur)</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold text-slate-950">{krediturName || selectedCase?.clientName || 'Nama Kreditur'}</td>
                          </tr>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">NIK / No. KTP</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-mono">{krediturNik || '3302101506780002'}</td>
                          </tr>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Pekerjaan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">{krediturJob}</td>
                          </tr>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Alamat Domisili</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">{krediturAddress || 'Alamat Domisili Kreditur'}</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      // Pemberi Kuasa Corporate
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
                    )}
                    
                    <p className="text-justify keep-together">
                      {isPerorangan && pemberiKuasaType === 'KREDITUR_PERORANGAN' ? (
                        <>Dalam hal ini bertindak selaku Kreditur / Pemilik Piutang Sah, yang selanjutnya disebut sebagai <b>PEMBERI KUASA</b>.</>
                      ) : (
                        <>Dalam hal ini bertindak untuk dan atas nama <b>{companyName}</b>, yang selanjutnya disebut sebagai <b>PEMBERI KUASA</b>.</>
                      )}
                    </p>

                    <p className="font-semibold text-slate-900 mt-2 keep-together">
                      Dengan ini memberikan kuasa penuh kepada Tim Operasional PT MITRAJASA SATRIA INDONESIA:
                    </p>

                    {/* Penerima Kuasa */}
                    <table className="w-full mb-2 ml-3 keep-together">
                      <tbody>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Nama Petugas / Karyawan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5 font-bold text-slate-950">{selectedPersonnel?.fullName || 'Nama Petugas'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">NIK / No. KTP</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">{selectedPersonnel?.nikKtp || '3302101234560001'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">NIK / ID Petugas</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5 font-mono">{selectedPersonnel?.id || 'EMP-2026-001'}</td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Jabatan</td>
                          <td className="w-4 py-0.5 align-top">:</td>
                          <td className="py-0.5">
                            {selectedPersonnel?.position || (selectedPersonnel?.type ? selectedPersonnel.type.replace('_', ' ') : 'Kuasa Penagihan & Mediasi')}
                          </td>
                        </tr>
                        <tr>
                          <td className="w-48 py-0.5 align-top font-medium">Alamat Domisili</td>
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
                        Untuk dan atas nama Pemberi Kuasa, melakukan tindakan penagihan, mediasi, musyawarah kekeluargaan, penerimaan pembayaran/titipan, serta penyelesaian piutang kepada:
                      </p>
                      
                      {/* Data Debitur & Piutang */}
                      <table className="w-full mb-3 ml-3">
                        <tbody>
                          <tr>
                            <td className="w-48 py-0.5 align-top font-medium">Nama Debitur / Peminjam</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold text-slate-950">{selectedCase?.debtorName || 'Nama Debitur'}</td>
                          </tr>
                          {selectedCase?.debtorNik && (
                            <tr>
                              <td className="w-48 py-0.5 align-top font-medium">NIK Debitur</td>
                              <td className="w-4 py-0.5 align-top">:</td>
                              <td className="py-0.5 font-mono">{selectedCase.debtorNik}</td>
                            </tr>
                          )}
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
                        <li>Menghubungi, mendatangi, dan menyampaikan penagihan resmi serta mediasi kepada pihak Debitur.</li>
                        <li>Menerima pembayaran berupa cek, bilyet giro, titipan tunai resmi atau bukti transfer dari Debitur yang ditujukan ke rekening sah Pemberi Kuasa/Perusahaan.</li>
                        <li>Memberikan kuitansi atau tanda terima pembayaran sementara yang sah atas nama Pemberi Kuasa kepada Debitur.</li>
                        <li>Melakukan musyawarah negosiasi jadwal pembayaran (skema angsuran/restrukturisasi) berdasarkan batas wewenang yang telah disetujui sebelumnya oleh Pemberi Kuasa.</li>
                      </ol>
                    </div>

                    {/* KETENTUAN KHUSUS */}
                    <div className="keep-together pt-2">
                      <h4 className="font-bold uppercase tracking-wide mb-1 text-slate-950">
                        KETENTUAN KHUSUS
                      </h4>
                      <ol className="list-decimal ml-5 space-y-1.5 text-justify">
                        <li>
                          Penerima Kuasa <b>DILARANG KERAS</b> mengalihkan pembayaran ke rekening pribadi tanpa persetujuan tertulis resmi dari Pemberi Kuasa.
                        </li>
                        <li>
                          Surat Kuasa ini berlaku selama 90 (sembilan puluh) hari sejak tanggal ditandatangani dan akan berakhir secara otomatis apabila piutang dinyatakan lunas atau dicabut secara tertulis oleh Pemberi Kuasa.
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
                          <p className="font-semibold text-xs mb-4">
                            {isPerorangan && pemberiKuasaType === 'KREDITUR_PERORANGAN'
                              ? 'Kreditur Perorangan'
                              : companyName}
                          </p>
                          
                          {/* Meterai box */}
                          <div className="w-24 h-12 border border-dashed border-slate-400 flex items-center justify-center text-[10px] text-slate-500 mb-4">
                            Meterai<br/>Rp 10.000
                          </div>

                          <p className="font-bold underline text-slate-950">
                            {isPerorangan && pemberiKuasaType === 'KREDITUR_PERORANGAN'
                              ? (krediturName || selectedCase?.clientName)
                              : repName}
                          </p>
                          <p className="text-xs text-slate-700">
                            {isPerorangan && pemberiKuasaType === 'KREDITUR_PERORANGAN'
                              ? 'Kreditur Pribadi'
                              : repTitle}
                          </p>
                        </div>

                        <div className="w-1/2 flex flex-col items-center justify-between">
                          <div>
                            <p className="font-bold mb-1">Penerima Kuasa,</p>
                            <p className="font-semibold text-xs text-transparent select-none mb-4">Spacer</p>
                          </div>
                          
                          <div className="mt-16">
                            <p className="font-bold underline text-slate-950">{selectedPersonnel?.fullName || 'Nama Petugas'}</p>
                            <p className="text-xs text-slate-700">
                              {selectedPersonnel?.position || 'Kuasa Lapangan & Mediasi'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dokumen Footer */}
                    <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono keep-together">
                      PT. MITRAJASA SATRIA INDONESIA • Surat Kuasa Khusus Penagihan Piutang ({isPerorangan ? 'Klien Perorangan' : 'Multifinance'}) • Format Resmi F4
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

