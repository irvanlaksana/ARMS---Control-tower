import React from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { Briefcase } from 'lucide-react';

interface ServicesModuleProps {
  store: ARMSStore;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({ store }) => {
  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Briefcase className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Agency Services Portfolio & Master Services</h2>
        </div>
        <p className="text-xs text-slate-400">Master Business Offerings & Service Catalog</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {store.services.map((s) => (
          <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                {s.code}
              </span>
              <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                {s.status}
              </span>
            </div>

            <h3 className="font-bold text-white text-base">{s.name}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>

            <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-300 font-medium">
              <span>Default Fee Structure:</span>
              <span className="text-amber-400 font-bold">{s.defaultFeeType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
