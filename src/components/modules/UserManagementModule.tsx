import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, UserRole } from '../../types/arms';
import { ShieldCheck, Plus, AlertCircle, Pencil, Trash2 } from 'lucide-react';

interface UserManagementModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const UserManagementModule: React.FC<UserManagementModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('SUPER_ADMIN_OPS');
  const [department, setDepartment] = useState('Control Tower Operations');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const resetForm = () => {
    setEditingUser(null);
    setUsername('');
    setName('');
    setEmail('');
    setRole('SUPER_ADMIN_OPS');
    setDepartment('Control Tower Operations');
    setStatus('ACTIVE');
  };

  const handleOpenAdd = () => {
    resetForm();
    setShowModal(true);
  };

  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setUsername(user.username);
    setName(user.name);
    setEmail(user.email);
    setRole(user.role);
    setDepartment(user.department || 'Control Tower Operations');
    setStatus((user.status as 'ACTIVE' | 'SUSPENDED') || 'ACTIVE');
    setShowModal(true);
  };

  const handleDeleteUser = (user: User) => {
    if (user.id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif login.');
      return;
    }

    const superAdminCount = store.users.filter((u) => u.role === 'SUPER_ADMIN_OPS' && u.status === 'ACTIVE').length;
    if (user.role === 'SUPER_ADMIN_OPS' && superAdminCount <= 1) {
      alert('Tidak dapat menghapus satu-satunya Super Admin aktif di dalam sistem.');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus akun pengguna "${user.name}" (${user.username})?`)) return;

    const updatedUsers = store.users.filter((u) => u.id !== user.id);
    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Users',
      user.id,
      `Hapus Akun Pengguna ${user.username} (${user.name})`
    );

    onUpdateStore({
      ...store,
      users: updatedUsers,
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      const updatedUser: User = {
        ...editingUser,
        username,
        name,
        email,
        role,
        department,
        status,
      };

      const updatedList = store.users.map((u) => (u.id === editingUser.id ? updatedUser : u));

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Users',
        editingUser.id,
        `Update User Account ${username} (${role})`
      );

      onUpdateStore({
        ...store,
        users: updatedList,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newUser: User = {
        id: `USR-${Date.now()}`,
        username,
        name,
        email,
        role,
        department,
        status,
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'CREATE',
        'Users',
        newUser.id,
        `Created User Account ${username} with role ${role}`
      );

      onUpdateStore({
        ...store,
        users: [newUser, ...store.users],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
    resetForm();
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">System User Accounts & Strict Role Security</h2>
          </div>
          <p className="text-xs text-slate-400">
            Strictly limited to 4 authorized corporate roles. Field personnel do not have login access.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah User Account</span>
          </button>
        )}
      </div>

      <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-amber-300">Mandatory Security Architecture Constraint:</div>
          <p className="leading-normal">
            Only 4 roles have login access: <span className="font-semibold text-white">SUPER_ADMIN_OPS</span> (Control Tower),{' '}
            <span className="font-semibold text-white">APPROVER_EXECUTIVE</span> (Direktur Utama),{' '}
            <span className="font-semibold text-white">VIEWER_COMMISSIONER</span> (Komisaris), and{' '}
            <span className="font-semibold text-white">VIEWER_INVESTOR</span> (Investor). Field Agents, DC Freelance, and External Partners do NOT have login accounts.
          </p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2 px-3">Username</th>
                <th className="py-2 px-3">Full Name</th>
                <th className="py-2 px-3">Email</th>
                <th className="py-2 px-3">Departemen</th>
                <th className="py-2 px-3">System Role</th>
                <th className="py-2 px-3 text-center">Status</th>
                {canEdit && <th className="py-2 px-3 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.users.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 7 : 6} className="py-6 text-center text-slate-500 text-xs">
                    Belum ada akun pengguna tersimpan.
                  </td>
                </tr>
              ) : (
                store.users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-indigo-300">{u.username}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{u.name}</td>
                    <td className="py-2.5 px-3 text-slate-400">{u.email}</td>
                    <td className="py-2.5 px-3 text-slate-300">{u.department || 'Control Tower Operations'}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full border ${
                          u.role === 'SUPER_ADMIN_OPS'
                            ? 'bg-indigo-950 text-indigo-300 border-indigo-800'
                            : u.role === 'APPROVER_EXECUTIVE'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-1 rounded-full border font-semibold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {u.status || 'ACTIVE'}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-2.5 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            title="Edit User"
                            className="flex items-center gap-1 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 px-2 py-1 rounded text-[11px] font-semibold transition"
                          >
                            <Pencil className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                          {u.id !== currentUser.id && (
                            <button
                              onClick={() => handleDeleteUser(u)}
                              title="Hapus User"
                              className="flex items-center gap-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 px-2 py-1 rounded text-[11px] font-semibold transition"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3">
          <form onSubmit={handleSaveUser} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-4 space-y-2.5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="font-bold text-white text-base">
                {editingUser ? 'Edit User Account & Access' : 'Create Authorized System User'}
              </h3>
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

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Department</label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Select System Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="SUPER_ADMIN_OPS">SUPER_ADMIN_OPS (Control Tower)</option>
                <option value="APPROVER_EXECUTIVE">APPROVER_EXECUTIVE (Direktur Utama)</option>
                <option value="VIEWER_COMMISSIONER">VIEWER_COMMISSIONER (Komisaris)</option>
                <option value="VIEWER_INVESTOR">VIEWER_INVESTOR (Investor)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-0.5">Status Akun</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="ACTIVE">ACTIVE (Aktif)</option>
                <option value="SUSPENDED">SUSPENDED (Ditangguhkan)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-1.5 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="px-3 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 font-semibold transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 shadow-md transition"
              >
                {editingUser ? 'Simpan Perubahan' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
