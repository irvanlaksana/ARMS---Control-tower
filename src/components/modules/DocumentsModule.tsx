import React, { useState } from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { Contract, SK, Case } from '../../types/arms';
import { Folder, ExternalLink, HardDrive, Eye, X, FileText } from 'lucide-react';

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

      {/* Document Preview Modal */}
      {previewType && previewData && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex justify-center py-10 px-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl min-h-[800px] shadow-2xl relative flex flex-col text-slate-900">
            {/* Modal Actions */}
            <div className="absolute top-4 right-4 flex gap-2 print:hidden">
              <button 
                onClick={() => window.print()} 
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded text-xs font-semibold shadow-sm border border-slate-300 transition"
              >
                Print PDF
              </button>
              <button 
                onClick={closePreview}
                className="bg-rose-100 hover:bg-rose-200 text-rose-700 p-1.5 rounded shadow-sm border border-rose-200 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* A4 Document Content */}
            <div className="p-12 font-serif flex-1 flex flex-col">
              
              {/* Common Header */}
              <div className="text-center border-b-2 border-slate-900 pb-4 mb-8">
                <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900">MJ AGENCY RECOVERY</h1>
                <p className="text-xs text-slate-600 mt-1">Gedung Perkantoran Sudirman, Lt. 12, Jakarta Selatan</p>
                <p className="text-xs text-slate-600">Telp: (021) 555-0199 | Email: legal@mjagency.co.id</p>
              </div>

              {/* MOU Template */}
              {previewType === 'MOU' && (
                <div className="space-y-6 text-sm leading-relaxed text-justify">
                  <h2 className="text-center font-bold text-lg underline decoration-2 underline-offset-4">MEMORANDUM OF UNDERSTANDING</h2>
                  <p className="text-center font-mono text-xs mb-8">No: {previewData.contractNo}</p>

                  <p>Pada hari ini, tanggal <strong>{new Date(previewData.startDate).toLocaleDateString('id-ID')}</strong>, telah disepakati perjanjian kerjasama penagihan antara:</p>
                  
                  <div className="pl-6 space-y-4">
                    <p><strong>1. {previewData.clientName}</strong><br/>Selanjutnya disebut sebagai <strong>KLIEN</strong>.</p>
                    <p><strong>2. MJ AGENCY RECOVERY</strong><br/>Selanjutnya disebut sebagai <strong>PIHAK KEDUA</strong>.</p>
                  </div>

                  <p>Bahwa <strong>KLIEN</strong> menyerahkan kuasa penagihan portofolio macet kepada <strong>PIHAK KEDUA</strong> dengan ketentuan dan struktur biaya sebagai berikut:</p>
                  
                  <div className="bg-slate-50 p-4 border border-slate-300 rounded font-mono text-xs">
                    {previewData.feeStructureSummary || '[Struktur biaya belum diatur]'}
                  </div>

                  <p>Demikian Memorandum of Understanding (MoU) ini dibuat dan ditandatangani oleh kedua belah pihak untuk dilaksanakan dengan penuh tanggung jawab.</p>

                  <div className="mt-16 flex justify-between px-10">
                    <div className="text-center">
                      <p className="mb-16 font-bold">KLIEN</p>
                      <p className="font-bold underline">{previewData.clientName}</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-16 font-bold">PIHAK KEDUA</p>
                      <p className="font-bold underline">MJ AGENCY RECOVERY</p>
                    </div>
                  </div>
                </div>
              )}

              {/* SK Template */}
              {previewType === 'SK' && (
                <div className="space-y-6 text-sm leading-relaxed text-justify">
                  <h2 className="text-center font-bold text-lg underline decoration-2 underline-offset-4">SURAT KUASA PENAGIHAN</h2>
                  <p className="text-center font-mono text-xs mb-8">No: {previewData.skNumber}</p>

                  <p>Yang bertanda tangan di bawah ini mewakili <strong>MJ AGENCY RECOVERY</strong>, dengan ini memberikan kuasa penuh kepada:</p>
                  
                  <table className="w-full my-4 ml-6">
                    <tbody>
                      <tr><td className="w-40 py-1 font-bold">Nama (Kolektor)</td><td>: {previewData.personnelName}</td></tr>
                      <tr><td className="py-1 font-bold">ID / NIK</td><td>: {previewData.personnelId}</td></tr>
                    </tbody>
                  </table>

                  <p>Untuk melakukan tindakan penagihan, negosiasi, dan/atau penarikan unit kendaraan secara sah sesuai hukum yang berlaku terhadap debitur berikut:</p>
                  
                  <table className="w-full my-4 ml-6 bg-slate-50 p-4 border border-slate-300">
                    <tbody className="block p-4">
                      <tr><td className="w-40 py-1 font-bold">Nama Debitur</td><td>: {previewData.debtorName}</td></tr>
                      <tr><td className="py-1 font-bold">Nomor Kasus</td><td>: {previewData.caseNo}</td></tr>
                      {(() => {
                        const c = store.cases.find((cs: Case) => cs.id === previewData.caseId);
                        return (
                          <>
                            <tr><td className="py-1 font-bold">No. Kontrak</td><td>: {c?.multifinanceContractNo || '-'}</td></tr>
                            <tr><td className="py-1 font-bold">Objek Jaminan</td><td>: {c?.assetSummary || '-'}</td></tr>
                          </>
                        );
                      })()}
                    </tbody>
                  </table>

                  <p>Surat Kuasa ini berlaku mulai tanggal <strong>{new Date(previewData.issuedDate).toLocaleDateString('id-ID')}</strong> sampai dengan <strong>{new Date(previewData.expiryDate).toLocaleDateString('id-ID')}</strong>.</p>
                  <p>Demikian Surat Kuasa ini dibuat untuk dipergunakan sebagaimana mestinya.</p>

                  <div className="mt-16 flex justify-between px-10">
                    <div className="text-center">
                      <p className="mb-16 font-bold">PEMBERI KUASA</p>
                      <p className="font-bold underline">MJ AGENCY RECOVERY</p>
                      <p className="text-xs">Direktur Operasional</p>
                    </div>
                    <div className="text-center">
                      <p className="mb-16 font-bold">PENERIMA KUASA</p>
                      <p className="font-bold underline">{previewData.personnelName}</p>
                      <p className="text-xs">Field Partner / Kolektor</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
            
            {/* Watermark / Footer */}
            <div className="p-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
              Generated by ARMS Control Tower • {new Date().toLocaleString()} • CONFIDENTIAL
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
