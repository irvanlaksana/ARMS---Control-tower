import React from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { Folder, ExternalLink, HardDrive } from 'lucide-react';

interface DocumentsModuleProps {
  store: ARMSStore;
}

export const DocumentsModule: React.FC<DocumentsModuleProps> = ({ store }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Folder className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Google Drive Document Repository & Evidence</h2>
        </div>
        <p className="text-xs text-slate-400">
          Google Drive Integration for BAST Photos, Surat Kuasa PDFs, MoU Contracts & Payment Receipts
        </p>
      </div>

      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="font-bold text-white">Google Drive Root Folder ID</div>
            <div className="font-mono text-[11px] text-slate-400">
              {store.settings.googleDriveFolderId || '1DriveFolderForARMSDocuments2026'}
            </div>
          </div>
        </div>

        <a
          href={`https://drive.google.com/drive/folders/${store.settings.googleDriveFolderId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-semibold text-xs transition"
        >
          <span>Open Drive Folder</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-800 bg-slate-950/50 font-bold text-white text-xs uppercase tracking-wider">
          Indexed Documents
        </div>

        <div className="divide-y divide-slate-800 text-xs text-slate-300">
          <div className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition">
            <div>
              <div className="font-bold text-white">MoU Master Recovery Contract - PT Adira Dinamika</div>
              <div className="text-[10px] text-slate-400 font-mono">Category: CONTRACT | ID: CTR-001</div>
            </div>
            <a
              href="https://drive.google.com/file/d/1MoU_Adira_Master_Contract_2026/view"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              <span>View PDF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition">
            <div>
              <div className="font-bold text-white">Surat Kuasa Eksekusi - Supriadi Mangkuto</div>
              <div className="text-[10px] text-slate-400 font-mono">Category: SURAT_KUASA | ID: SK-001</div>
            </div>
            <a
              href="https://drive.google.com/file/d/1SK_Supriadi_Mangkuto_2026/view"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              <span>View PDF</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition">
            <div>
              <div className="font-bold text-white">BAST Penarikan Unit - Honda HR-V B 1234 XYZ</div>
              <div className="text-[10px] text-slate-400 font-mono">Category: BAST_PHOTOS | ID: REC-001</div>
            </div>
            <a
              href="https://drive.google.com/file/d/1BAST_Honda_HRV_Photos/view"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1"
            >
              <span>View Photos</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
