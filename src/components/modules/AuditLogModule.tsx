import React, { useState } from 'react';
import { ARMSStore } from '../../services/armsDataService';
import { ShieldCheck, Search, Shield, Filter, Download } from 'lucide-react';

interface AuditLogModuleProps {
  store: ARMSStore;
}

export const AuditLogModule: React.FC<AuditLogModuleProps> = ({ store }) => {
  const [search, setSearch] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const filteredLogs = store.auditLogs.filter((log) => {
    if (filterAction !== 'ALL' && log.action !== filterAction) return false;
    if (
      search &&
      !log.username.toLowerCase().includes(search.toLowerCase()) &&
      !log.moduleName.toLowerCase().includes(search.toLowerCase()) &&
      !log.details.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Immutable Security & System Audit Trail</h2>
          </div>
          <p className="text-xs text-slate-400">
            Every CREATE, UPDATE, DELETE, APPROVE, REJECT, PAYMENT, EXPORT and Financial Change is logged here
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="ALL">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="PAYMENT">PAYMENT</option>
            <option value="EXPORT">EXPORT</option>
            <option value="FINANCIAL_REVERSAL">FINANCIAL REVERSAL</option>
          </select>
        </div>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter audit logs by username, module, or details..."
          className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
        />
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Module Name</th>
                <th className="py-3 px-4">Target ID</th>
                <th className="py-3 px-4">Audit Details</th>
                <th className="py-3 px-4 text-right">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {new Date(log.timestamp).toLocaleString('id-ID')}
                  </td>
                  <td className="py-3.5 px-4 space-y-0.5">
                    <div className="font-bold text-white">{log.username}</div>
                    <div className="text-[10px] text-slate-400">{log.userRole}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        log.action === 'APPROVE'
                          ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                          : log.action === 'REJECT' || log.action === 'FINANCIAL_REVERSAL'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : log.action === 'CREATE'
                          ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-medium text-slate-300">{log.moduleName}</td>
                  <td className="py-3.5 px-4 font-mono text-amber-300">{log.targetId}</td>
                  <td className="py-3.5 px-4 text-slate-200 max-w-[300px] leading-relaxed">{log.details}</td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-500">{log.ipAddress || '127.0.0.1'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
