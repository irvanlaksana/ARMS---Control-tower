const fs = require('fs');
let content = fs.readFileSync('src/components/modules/CasesModule.tsx', 'utf8');

const targetStr = `        {/* Client Type Filter */}
        <SearchableSelect 
                  value={personnelId}`;

const replacementStr = `        {/* Client Type Filter */}
        <div className="w-full sm:w-48 relative z-50">
          <SearchableSelect 
            value={filterClientType}
            onChange={(val) => setFilterClientType(val as any)}
            searchable={false}
            options={[
              { value: 'ALL', label: 'Semua Client (ALL)' },
              { value: 'MULTIFINANCE', label: 'Multifinance' },
              { value: 'PERORANGAN', label: 'Perorangan' }
            ]}
          />
        </div>
        <div className="w-full sm:w-48 relative z-40">
          <SearchableSelect 
            value={filterStatus}
            onChange={(val) => setFilterStatus(val as any)}
            searchable={false}
            options={[
              { value: 'ALL', label: 'Semua Status' },
              { value: 'OPEN', label: 'OPEN' },
              { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
              { value: 'CLOSED', label: 'CLOSED' },
              { value: 'CANCELLED', label: 'CANCELLED' }
            ]}
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-4">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-950/50 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-medium">Case Details</th>
                <th className="px-4 py-3 font-medium">Debtor Info</th>
                <th className="px-4 py-3 font-medium">Asset / Collateral</th>
                <th className="px-4 py-3 font-medium text-right">Principal OS</th>
                <th className="px-4 py-3 font-medium text-center">Status</th>
                <th className="px-4 py-3 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredCases.map(c => (
                <tr key={c.id} className="hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-white">{c.caseNo}</div>
                    <div className="text-[10px] text-slate-500">{c.clientName} {c.clientType === 'PERORANGAN' ? '[PERORANGAN]' : ''}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-300">{c.debtorName}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {c.assetSummary}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-white">
                    Rp {c.principalDebtOS.toLocaleString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={\`px-2 py-1 rounded text-[10px] font-medium \${c.status === 'OPEN' ? 'bg-indigo-900/50 text-indigo-400' : c.status === 'CLOSED' ? 'bg-emerald-900/50 text-emerald-400' : 'bg-amber-900/50 text-amber-400'}\`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => handleEditClick(c)} className="p-1.5 text-slate-400 hover:text-indigo-400 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteClick(c.id)} className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCases.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No cases found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form onSubmit={handleSaveCase} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-3xl p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-lg font-bold text-white">{isEditing ? 'Edit Case' : 'New Recovery Case'}</h2>
              <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Client / Creditor</label>
                <SearchableSelect 
                  value={clientId}
                  onChange={(val) => {
                    setClientId(val);
                    const client = store.clients.find(c => c.id === val);
                    if (client) {
                      setClientCategory(client.category);
                    }
                  }}
                  options={store.clients.map(c => ({
                    value: c.id,
                    label: c.name,
                    subLabel: c.category
                  }))}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Debtor Name</label>
                <input
                  type="text"
                  required
                  value={debtorName}
                  onChange={(e) => setDebtorName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Principal Outstanding (Rp)</label>
                <input
                  type="number"
                  required
                  value={principalDebtOS}
                  onChange={(e) => setPrincipalDebtOS(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Assign To Personnel / Mitra</label>
                <SearchableSelect 
                  value={personnelId}`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/modules/CasesModule.tsx', content);
