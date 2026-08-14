import React, { useState } from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { Contract, SK, Case } from '../../types/arms';
import { Folder, ExternalLink, HardDrive, Eye, X, FileText, Printer } from 'lucide-react';
import { OfficialLetterhead } from '../common/OfficialLetterhead';
import { angkaKeTerbilang } from '../../utils/terbilang';

interface DocumentsModuleProps {
  store: ARMSStore;
}

type PreviewType = 'MOU' | 'SK' | null;

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ store }) => {
  const [previewType, setPreviewType] = useState<PreviewType>(null);
  const [previewData, setPreviewData] = useState<any>(null);

  const handlePreviewMOU = (contract: Contract) => {
    setPreviewType('MOU');
    setPreviewData(contract);
  };

  const handlePreviewSK = (sk: SK) => {
    setPreviewType('SK');
    setPreviewData(sk);
  };

  const closePreview = () => {
    setPreviewType(null);
    setPreviewData(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Folder className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Document Center & Previews</h2>
        </div>
        <p className="text-xs text-slate-400">
          Generate previews of legal documents (SK, MOU) based on current assignment data.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contracts List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            MoU / Contracts
          </div>
          <div className="divide-y divide-slate-800 text-xs text-slate-300 overflow-y-auto flex-1 p-2">
            {store.contracts.map(c => (
              <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-800/40 rounded transition mb-1">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="font-bold text-white truncate">{c.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{c.clientName} | ID: {c.contractNo}</div>
                </div>
                <button
                  onClick={() => handlePreviewMOU(c)}
                  className="shrink-0 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>
              </div>
            ))}
            {store.contracts.length === 0 && (
              <div className="p-4 text-center text-slate-500 italic">No Contracts found.</div>
            )}
          </div>
        </div>

        {/* SK List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col h-[500px]">
          <div className="p-4 border-b border-slate-800 bg-slate-950/50 font-bold text-white text-xs uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            Surat Kuasa (SK)
          </div>
          <div className="divide-y divide-slate-800 text-xs text-slate-300 overflow-y-auto flex-1 p-2">
            {store.sks.map(sk => {
              const parentCase = store.cases.find(c => c.id === sk.caseId);
              return (
                <div key={sk.id} className="p-3 flex items-center justify-between hover:bg-slate-800/40 rounded transition mb-1">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="font-bold text-white truncate">SK: {sk.debtorName}</div>
                    <div className="text-[10px] text-slate-400 font-mono truncate">By: {sk.personnelName} | ID: {sk.skNumber}</div>
                  </div>
                  <button
                    onClick={() => handlePreviewSK(sk)}
                    className="shrink-0 bg-indigo-950/50 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>
              );
            })}
            {store.sks.length === 0 && (
              <div className="p-4 text-center text-slate-500 italic">No Surat Kuasa found.</div>
            )}
          </div>
        </div>
      </div>

      {/* Document Preview Modal - F4 Paper Format */}
      {previewType && previewData && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex justify-center py-6 px-4 overflow-y-auto">
          <div className="f4-page-preview rounded-xl relative flex flex-col text-slate-900 my-auto">
            {/* Modal Actions */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden z-10">
              <button 
                onClick={() => window.print()} 
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold shadow-md flex items-center gap-1.5 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak F4 (PDF)</span>
              </button>
              <button 
                onClick={closePreview}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg shadow-sm border border-slate-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* F4 Document Content */}
            <div className="p-8 sm:p-12 font-serif flex-1 flex flex-col justify-between" style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}>
              
              <div>
                {/* Official Letterhead */}
                <OfficialLetterhead className="mb-6" />

                {/* MOU Template */}
                {previewType === 'MOU' && (
                  <div className="space-y-5 text-[12px] leading-relaxed text-justify mt-4">
                    <div className="text-center space-y-1 mb-6">
                      <h2 className="font-bold text-base underline decoration-2 uppercase tracking-wide">
                        MEMORANDUM OF UNDERSTANDING (MoU)
                      </h2>
                      <p className="font-mono text-xs">Nomor: {previewData.contractNo}</p>
                    </div>

                    <p>Pada hari ini, tanggal <strong>{new Date(previewData.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, telah disepakati perjanjian kerjasama layanan penagihan dan pemulihan aset (Asset Recovery) antara:</p>
                    
                    <div className="pl-4 space-y-2">
                      <p><strong>1. {previewData.clientName}</strong><br/><span className="text-slate-600">Sebagai Lembaga Pembiayaan / Multifinance Pemberi Kuasa, selanjutnya disebut sebagai <strong>KLIEN</strong>.</span></p>
                      <p><strong>2. PT. MITRAJASA SATRIA INDONESIA</strong><br/><span className="text-slate-600">Badan Hukum Pengelola Jasa Penagihan & Recovery, Nomor AHU-.056731.AH.01.01., selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</span></p>
                    </div>

                    <p>Bahwa <strong>KLIEN</strong> menyerahkan penanganan portofolio piutang bermasalah (NPL) kepada <strong>PIHAK KEDUA</strong> dengan skema penugasan dan struktur imbal jasa (fee structure) sebagai berikut:</p>
                    
                    <div className="bg-slate-50 p-4 border border-slate-300 rounded font-mono text-[11px] text-slate-800">
                      {previewData.feeStructureSummary || '[Struktur biaya belum diatur]'}
                    </div>

                    <p>Demikian Memorandum of Understanding (MoU) ini dibuat rangkap 2 (dua) dan ditandatangani oleh kedua belah pihak di atas meterai yang cukup untuk dilaksanakan dengan penuh itikad baik dan tanggung jawab.</p>

                    <div className="mt-14 flex justify-between px-6">
                      <div className="text-center">
                        <p className="mb-14 font-bold">PIHAK PERTAMA (KLIEN)</p>
                        <p className="font-bold underline">{previewData.clientName}</p>
                        <p className="text-[11px] text-slate-600">Perwakilan Manajemen</p>
                      </div>
                      <div className="text-center">
                        <p className="mb-14 font-bold">PIHAK KEDUA</p>
                        <p className="font-bold underline">PT. MITRAJASA SATRIA INDONESIA</p>
                        <p className="text-[11px] text-slate-600">Direktur Utama</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* SK Template */}
                {previewType === 'SK' && (() => {
                  const targetCase = store.cases.find((cs: Case) => cs.id === previewData.caseId);
                  const targetPersonnel = (store.personnel || []).find((pr) => pr.id === previewData.personnelId);
                  const targetCustomer = store.customers.find((c) => c.id === targetCase?.customerId);
                  const debtorAddr = targetCustomer?.addressCurrent || targetCustomer?.addressKtp || 'Alamat Debitur Sesuai Kontrak';
                  const amount = targetCase?.principalDebtOS || 75000000;
                  const compName = store.settings.companyName || 'PT. MITRAJASA SATRIA INDONESIA';
                  const compAddr = store.settings.companyAddress || 'JL. Menteri Supeno No. 07, Sokaraja Tengah, Banyumas, Jawa Tengah 53181';

                  return (
                    <div className="space-y-4 text-[12px] leading-relaxed text-justify mt-2" style={{ fontFamily: '"Times New Roman", Times, Georgia, serif' }}>
                      <div className="text-center space-y-1 mb-4">
                        <h2 className="font-bold text-base underline decoration-2 uppercase tracking-wide text-slate-950">
                          SURAT KUASA KHUSUS
                        </h2>
                        <p className="font-mono text-xs text-slate-700">No. Surat: {previewData.skNumber}</p>
                      </div>

                      <p className="font-semibold text-slate-900">Yang bertanda tangan di bawah ini:</p>
                      
                      <table className="w-full my-2 ml-3 text-slate-900">
                        <tbody>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">Nama Perusahaan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold">{compName}</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">Alamat Perusahaan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">{compAddr}</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">Diwakili Oleh</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold">Irvan Indralaksana</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">Jabatan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">Direktur Utama</td>
                          </tr>
                        </tbody>
                      </table>

                      <p>Dalam hal ini bertindak untuk dan atas nama <strong>{compName}</strong>, yang selanjutnya disebut sebagai <strong>PEMBERI KUASA</strong>.</p>
                      <p className="font-semibold text-slate-900 mt-2">Dengan ini memberikan kuasa penuh kepada karyawan perusahaan:</p>

                      <table className="w-full my-2 ml-3 text-slate-900">
                        <tbody>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">Nama Karyawan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold">{previewData.personnelName}</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">NIK / ID Karyawan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-mono">{previewData.personnelId}</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-medium">Jabatan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">{targetPersonnel?.position || 'Finance & Collection Staff'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <p>Yang selanjutnya disebut sebagai <strong>PENERIMA KUASA</strong>.</p>

                      <div className="text-center font-bold my-2 tracking-widest text-xs underline">
                        KHUSUS
                      </div>

                      <p>Untuk dan atas nama Pemberi Kuasa, melakukan tindakan penagihan, penerimaan pembayaran, serta penyelesaian transaksi piutang usaha perusahaan kepada:</p>

                      <table className="w-full my-2 ml-3 bg-slate-50 p-2.5 border border-slate-300 rounded text-slate-900 text-[11px]">
                        <tbody>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-bold">Nama Debitur</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold">{previewData.debtorName}</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-bold">Alamat Debitur</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">{debtorAddr}</td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-bold">Jumlah Piutang</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5 font-bold">
                              Rp {amount.toLocaleString('id-ID')} ({angkaKeTerbilang(amount)})
                            </td>
                          </tr>
                          <tr>
                            <td className="w-44 py-0.5 align-top font-bold">Dasar Penagihan</td>
                            <td className="w-4 py-0.5 align-top">:</td>
                            <td className="py-0.5">Perjanjian Kontrak No. {targetCase?.multifinanceContractNo || '-'} / Objek: {targetCase?.assetSummary || '-'}</td>
                          </tr>
                        </tbody>
                      </table>

                      <p className="text-justify">
                        Demikian Surat Kuasa Khusus ini dibuat dengan sebenarnya dan untuk dipergunakan sebagaimana mestinya.
                      </p>

                      <div className="mt-10 flex justify-between px-4">
                        <div className="text-center">
                          <p className="mb-12 font-bold">PEMBERI KUASA</p>
                          <p className="font-bold underline">{compName}</p>
                          <p className="text-[11px] text-slate-600">Direktur Utama</p>
                        </div>
                        <div className="text-center">
                          <p className="mb-12 font-bold">PENERIMA KUASA</p>
                          <p className="font-bold underline">{previewData.personnelName}</p>
                          <p className="text-[11px] text-slate-600">{targetPersonnel?.position || 'Collection Staff'}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Watermark / Footer */}
              <div className="pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
                PT. MITRAJASA SATRIA INDONESIA • ARMS Control Tower • Dokumen Resmi F4 (215mm x 330mm)
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
