import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Client, ClientType } from '../../types/arms';
import { Building2, Plus, Search, User as UserIcon, UserCheck, Edit2, Trash2 } from 'lucide-react';

interface ClientsModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ClientsModule: React.FC<ClientsModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'MULTIFINANCE' | 'PERORANGAN'>('ALL');

  // Form State
  const [clientType, setClientType] = useState<ClientType>('MULTIFINANCE');
  const [companyName, setCompanyName] = useState('');
  const [clientCode, setClientCode] = useState('');
  const [nikKtp, setNikKtp] = useState('');
  const [industry, setIndustry] = useState<'MULTIFINANCE' | 'BANKING' | 'FINTECH' | 'PERORANGAN' | 'OTHER'>('MULTIFINANCE');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setIsEditing(true);
      setEditId(client.id);
      setClientType(client.clientType || 'MULTIFINANCE');
      setIndustry(client.industry as any || 'MULTIFINANCE');
      setClientCode(client.clientCode);
      setCompanyName(client.companyName);
      setNikKtp(client.nikKtp || '');
      setContactPerson(client.contactPerson || '');
      setPhone(client.phone || '');
      setEmail(client.email || '');
      setAddress(client.address || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setClientType('MULTIFINANCE');
      setIndustry('MULTIFINANCE');
      setClientCode('');
      setCompanyName('');
      setNikKtp('');
      setContactPerson('');
      setPhone('');
      setEmail('');
      setAddress('');
    }
    setShowModal(true);
  };

  const handleDeleteClient = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete client "${name}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Clients',
      id,
      `Deleted client ${name}`
    );

    onUpdateStore({
      ...store,
      clients: store.clients.filter(c => c.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    const isPerorangan = clientType === 'PERORANGAN';

    if (isEditing && editId) {
      const updatedClients = store.clients.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            clientCode: clientCode || c.clientCode,
            companyName,
            industry: isPerorangan ? 'PERORANGAN' : industry,
            clientType,
            nikKtp: isPerorangan ? nikKtp : undefined,
            contactPerson: contactPerson || (isPerorangan ? companyName : ''),
            phone,
            email,
            address,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Clients',
        editId,
        `Updated client ${companyName}`
      );

      onUpdateStore({
        ...store,
        clients: updatedClients,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newClient: Client = {
        id: `CLI-${Date.now()}`,
        clientCode: clientCode || (isPerorangan ? `PER-${Math.floor(100 + Math.random() * 900)}` : `CLI-${Math.floor(100 + Math.random() * 900)}`),
        companyName,
        industry: isPerorangan ? 'PERORANGAN' : industry,
        clientType,
        nikKtp: isPerorangan ? nikKtp : undefined,
        contactPerson: contactPerson || (isPerorangan ? companyName : ''),
        phone,
        email,
        address,
        tier: 'TIER_1',
        activeCasesCount: 0,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username, 
        currentUser.role, 
        'CREATE', 
        'Clients', 
        newClient.id, 
        `Created ${isPerorangan ? 'Klien Perorangan' : 'Client Multifinance'} ${companyName}`
      );

      onUpdateStore({
        ...store,
        clients: [newClient, ...store.clients],
        auditLogs: [audit, ...store.auditLogs],
      });
    }
    setShowModal(false);
  };

  const filteredClients = store.clients.filter((c) => {
    const isPerorangan = c.clientType === 'PERORANGAN' || c.industry === 'PERORANGAN';
    if (filterType === 'PERORANGAN' && !isPerorangan) return false;
    if (filterType === 'MULTIFINANCE' && isPerorangan) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchName = c.companyName.toLowerCase().includes(q);
      const matchCode = c.clientCode.toLowerCase().includes(q);
      const matchContact = c.contactPerson.toLowerCase().includes(q);
      const matchNik = c.nikKtp?.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchContact && !matchNik) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Building2 className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Clients & Creditors Master</h2>
          </div>
          <p className="text-xs text-slate-400">Master Data Klien Multifinance, Perbankan, Fintech & Klien Perorangan (Pemberi Kuasa)</p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Client</span>
          </button>
        )}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari berdasarkan nama klien, kode, kontak, atau NIK..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value as any)}
          className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-xs text-slate-200 focus:outline-none"
        >
          <option value="ALL">🏢 Semua Klien (Multifinance & Perorangan)</option>
          <option value="MULTIFINANCE">🏢 Multifinance / Lembaga</option>
          <option value="PERORANGAN">👤 Klien Perorangan (Individu)</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client Code</th>
                <th className="py-3 px-4">Nama Klien / Perusahaan</th>
                <th className="py-3 px-4">Tipe & Industri</th>
                <th className="py-3 px-4">Kontak Person / NIK</th>
                <th className="py-3 px-4">Phone & Email</th>
                <th className="py-3 px-4 text-center">Active Cases</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 text-xs">
                    Tidak ada data klien yang cocok dengan pencarian.
                  </td>
                </tr>
              ) : (
                filteredClients.map((cli) => {
                  const isPerorangan = cli.clientType === 'PERORANGAN' || cli.industry === 'PERORANGAN';
                  return (
                    <tr key={cli.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{cli.clientCode}</td>
                      <td className="py-3.5 px-4 font-bold text-white">
                        {cli.companyName}
                        {cli.address && <div className="text-[10px] font-normal text-slate-400 truncate max-w-xs">{cli.address}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        {isPerorangan ? (
                          <span className="inline-flex items-center gap-1 bg-amber-950/70 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-800/80 font-medium">
                            <UserCheck className="w-3 h-3 text-amber-400" /> Perorangan
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 font-medium">
                            <Building2 className="w-3 h-3 text-indigo-400" /> {cli.industry || 'MULTIFINANCE'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        <div>{cli.contactPerson || cli.companyName}</div>
                        {cli.nikKtp && <div className="text-[10px] text-slate-500 font-mono">NIK: {cli.nikKtp}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 space-y-0.5">
                        <div>{cli.phone || '-'}</div>
                        {cli.email && <div className="text-[10px] text-slate-500">{cli.email}</div>}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-white">{cli.activeCasesCount}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2.5 py-1 rounded-full border border-emerald-800 font-semibold">
                          {cli.status}
                        </span>
                      </td>
                      {canEdit && (
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleOpenModal(cli)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                              title="Edit Client"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClient(cli.id, cli.companyName)}
                              className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                              title="Delete Client"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveClient} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">
              {isEditing ? 'Edit Client / Pemberi Kuasa' : 'Register Client / Pemberi Kuasa'}
            </h3>

            {/* Category Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setClientType('MULTIFINANCE');
                  setIndustry('MULTIFINANCE');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
                  clientType === 'MULTIFINANCE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Multifinance
              </button>
              <button
                type="button"
                onClick={() => {
                  setClientType('PERORANGAN');
                  setIndustry('PERORANGAN');
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-semibold transition ${
                  clientType === 'PERORANGAN' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <UserIcon className="w-3.5 h-3.5" /> Perorangan
              </button>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {clientType === 'PERORANGAN' ? 'Kode Klien (Opsional)' : 'Kode Perusahaan Klien'}
              </label>
              <input
                type="text"
                value={clientCode}
                onChange={(e) => setClientCode(e.target.value)}
                placeholder={clientType === 'PERORANGAN' ? 'e.g. PER-01' : 'e.g. ADIRA-FIN'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {clientType === 'PERORANGAN' ? 'Nama Lengkap Kreditur Perorangan *' : 'Nama Perusahaan Lengkap *'}
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={clientType === 'PERORANGAN' ? 'e.g. H. Rahmat Hidayat, S.E.' : 'e.g. PT Adira Dinamika Multi Finance Tbk'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            {clientType === 'PERORANGAN' ? (
              <div>
                <label className="block text-xs text-slate-400 mb-1">NIK / No. KTP Kreditur *</label>
                <input
                  type="text"
                  required
                  value={nikKtp}
                  onChange={(e) => setNikKtp(e.target.value)}
                  placeholder="16 digit NIK KTP"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Industri</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  >
                    <option value="MULTIFINANCE">MULTIFINANCE</option>
                    <option value="BANKING">BANKING</option>
                    <option value="FINTECH">FINTECH</option>
                    <option value="OTHER">OTHER</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Head of Recovery"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">No. Phone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email (Opsional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Alamat Domisili / Kantor</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Alamat lengkap..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                {isEditing ? 'Simpan Perubahan' : 'Simpan Master Klien'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
