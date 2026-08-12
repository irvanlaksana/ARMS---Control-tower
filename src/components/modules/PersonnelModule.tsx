import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Personnel, PersonnelType } from '../../types/arms';
import { Users, Plus, UserCheck, Pencil, Trash2 } from 'lucide-react';

interface PersonnelModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const PersonnelModule: React.FC<PersonnelModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState<Personnel | null>(null);

  const [type, setType] = useState<PersonnelType>('KARYAWAN');
  const [fullName, setFullName] = useState('');
  const [nikKtp, setNikKtp] = useState('');
  const [birthPlaceDate, setBirthPlaceDate] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const resetForm = () => {
    setEditingPersonnel(null);
    setType('KARYAWAN');
    setFullName('');
    setNikKtp('');
    setBirthPlaceDate('');
    setAddress('');
    setPhoneNumber('');
    setEmail('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setEmergencyContact('');
    setPosition('');
    setStatus('ACTIVE');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (personnel: Personnel) => {
    setEditingPersonnel(personnel);
    setType(personnel.type);
    setFullName(personnel.fullName);
    setNikKtp(personnel.nikKtp);
    setBirthPlaceDate(personnel.birthPlaceDate);
    setAddress(personnel.address);
    setPhoneNumber(personnel.phoneNumber);
    setEmail(personnel.email);
    setBankName(personnel.bankName);
    setAccountNumber(personnel.accountNumber);
    setAccountName(personnel.accountName);
    setEmergencyContact(personnel.emergencyContact);
    setPosition(personnel.position);
    setStatus(personnel.status || 'ACTIVE');
    setShowModal(true);
  };

  const handleDeletePersonnel = (p: Personnel) => {
    if (!window.confirm(`Apakah Anda yakin ingin menghapus data ${p.fullName}?`)) return;

    const updatedList = (store.personnel || []).filter((item) => item.id !== p.id);
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Personnel',
      p.id,
      `Hapus data ${p.fullName} (${p.type})`
    );

    onUpdateStore({
      ...store,
      personnel: updatedList,
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleSavePersonnel = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingPersonnel) {
      const updatedPersonnel: Personnel = {
        ...editingPersonnel,
        type,
        fullName,
        nikKtp,
        birthPlaceDate,
        address,
        phoneNumber,
        email,
        bankName,
        accountNumber,
        accountName,
        emergencyContact,
        position,
        status,
      };

      const updatedList = (store.personnel || []).map((p) =>
        p.id === editingPersonnel.id ? updatedPersonnel : p
      );

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Personnel',
        editingPersonnel.id,
        `Update data ${fullName} (${type})`
      );

      onUpdateStore({
        ...store,
        personnel: updatedList,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newPersonnel: Personnel = {
        id: `PRT-${Date.now()}`,
        type,
        fullName,
        nikKtp,
        birthPlaceDate,
        address,
        phoneNumber,
        email,
        bankName,
        accountNumber,
        accountName,
        emergencyContact,
        position,
        status,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Personnel',
        newPersonnel.id,
        `Tambah Karyawan/Mitra ${fullName} (${type})`
      );

      onUpdateStore({
        ...store,
        personnel: [newPersonnel, ...(store.personnel || [])],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
    resetForm();
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Database Karyawan & Mitra DC</h2>
          </div>
          <p className="text-xs text-slate-400">
            Kelola data KYC (KTP, Alamat, Rekening) lengkap untuk SPV, Karyawan Lapangan, dan Mitra DC (Freelance).
          </p>
        </div>
        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Karyawan / Mitra</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">KYC / NIK KTP</th>
                <th className="py-3 px-4">TTL & Alamat</th>
                <th className="py-3 px-4">Kontak</th>
                <th className="py-3 px-4">Rekening Bank</th>
                <th className="py-3 px-4 text-center">Status</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {(!store.personnel || store.personnel.length === 0) ? (
                <tr>
                  <td colSpan={canEdit ? 8 : 7} className="py-8 text-center text-slate-500 text-xs">
                    Belum ada data Karyawan / Mitra DC. Klik "Tambah Karyawan / Mitra" untuk memasukkan data baru.
                  </td>
                </tr>
              ) : (
                store.personnel.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">{p.fullName}</div>
                      <div className="text-[10px] text-indigo-300 font-medium">{p.position}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-semibold ${
                          p.type === 'KARYAWAN'
                            ? 'bg-blue-950/50 text-blue-300 border-blue-800'
                            : 'bg-amber-950/50 text-amber-300 border-amber-800'
                        }`}
                      >
                        {p.type.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-200">
                      {p.nikKtp}
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="text-slate-200">{p.birthPlaceDate}</div>
                      <div className="text-[10px] text-slate-400 max-w-[200px] truncate">{p.address}</div>
                    </td>
                    <td className="py-3.5 px-4 space-y-0.5">
                      <div className="text-emerald-400 font-semibold">{p.phoneNumber}</div>
                      <div className="text-[10px] text-slate-400">{p.email}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      <div className="text-slate-200">{p.bankName} - {p.accountNumber}</div>
                      <div className="text-[10px]">A.N: {p.accountName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold ${
                          p.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {p.status || 'ACTIVE'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(p)}
                            title="Edit Data"
                            className="flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded text-[11px] font-semibold transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDeletePersonnel(p)}
                            title="Hapus Data"
                            className="flex items-center gap-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2 py-1 rounded text-[11px] font-semibold transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePersonnel}
            className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">
                  {editingPersonnel ? 'Edit Data Karyawan / Mitra DC' : 'Registrasi Karyawan / Mitra DC Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-slate-400 hover:text-white text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Kategori (Karyawan / Mitra)</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PersonnelType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="KARYAWAN">KARYAWAN INTERNAL (SPV, dll)</option>
                  <option value="MITRA_DC">MITRA DC / FREELANCE</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">NIK KTP</label>
                <input
                  type="text"
                  required
                  value={nikKtp}
                  onChange={(e) => setNikKtp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Tempat, Tanggal Lahir</label>
                <input
                  type="text"
                  required
                  value={birthPlaceDate}
                  onChange={(e) => setBirthPlaceDate(e.target.value)}
                  placeholder="e.g. Jakarta, 17 Agustus 1990"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Alamat Lengkap Sesuai KTP</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nomor WhatsApp / HP</label>
                <input
                  type="text"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Kontak Darurat</label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="e.g. 0812xxx (Istri/Suami)"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Posisi / Jabatan</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="e.g. Mitra Eksekusi / Supervisor"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Status Keaktifan</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'INACTIVE')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE (Aktif)</option>
                  <option value="INACTIVE">INACTIVE (Non-Aktif)</option>
                </select>
              </div>

              <div className="md:col-span-2 border-t border-slate-800 pt-3 mt-1">
                <h4 className="text-xs font-semibold text-white mb-3">Informasi Rekening Bank</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nama Bank</label>
                    <input
                      type="text"
                      required
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. BCA / Mandiri"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nomor Rekening</label>
                    <input
                      type="text"
                      required
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Nama Pemilik Rekening</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 shadow-md transition"
              >
                {editingPersonnel ? 'Simpan Perubahan' : 'Simpan Data KYC'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
