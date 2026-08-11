import React, { useState } from 'react';
import { generateGoogleAppsScriptCode } from '../../services/gasCodeGenerator';
import { FileCode, Copy, Check, Download, ExternalLink, X, HelpCircle } from 'lucide-react';

interface GASCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GASCodeModal: React.FC<GASCodeModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const code = generateGoogleAppsScriptCode();

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([code], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'Code.gs';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-950 text-indigo-400 border border-indigo-800">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Google Apps Script (GAS) Backend Code</h2>
              <p className="text-xs text-slate-400">Deploy as a Web App to connect Google Sheets as your live single-source database</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Deployment Steps Instructions */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 text-xs text-slate-300 space-y-2">
          <div className="font-semibold text-indigo-300 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4" />
            <span>Deployment Guide (5 Quick Steps):</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-2">
            <li>Open your Google Sheet → Click <span className="text-slate-200 font-medium">Extensions</span> → <span className="text-slate-200 font-medium">Apps Script</span>.</li>
            <li>Replace everything in <span className="text-slate-200 font-medium">Code.gs</span> with the code below.</li>
            <li>Click <span className="text-slate-200 font-medium font-semibold text-emerald-400">Deploy</span> → <span className="text-slate-200 font-medium">New deployment</span> → Select type <span className="text-slate-200 font-medium">Web app</span>.</li>
            <li>Set <span className="text-slate-200 font-medium">Execute as: Me</span> and <span className="text-slate-200 font-medium">Who has access: Anyone</span>.</li>
            <li>Copy the Web App URL and paste it into <span className="text-slate-200 font-medium text-indigo-300">Settings</span> tab in this ARMS App!</li>
          </ol>
        </div>

        {/* Code View */}
        <div className="flex-1 p-4 bg-slate-950 overflow-y-auto font-mono text-xs text-emerald-400 leading-relaxed border-b border-slate-800">
          <pre>{code}</pre>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 flex items-center justify-between gap-3">
          <a
            href="https://script.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <span>Open script.google.com</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Code.gs</span>
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg shadow-md transition"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
