import React, { useState } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Customer } from '../../types/arms';
import { Users, Plus, Edit2, Trash2 } from 'lucide-react';

interface CustomersModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [nikKtp, setNikKtp] = useState('');
  const [phone, setPhone] = useState('');
  const [addressCurrent, setAddressCurrent] = useState('');
  const [workplace, setWorkplace] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setIsEditing(true);
      setEditId(customer.id);
      setFullName(customer.fullName);
      setNikKtp(customer.nikKtp);
      setPhone(customer.phone);
      setAddressCurrent(customer.addressCurrent);
      setWorkplace(customer.workplace);
    } else {
      setIsEditing(false);
      setEditId(null);
      setFullName('');
      setNikKtp('');
      setPhone('');
      setAddressCurrent('');
      setWorkplace('');
    }
    setShowModal(true);
  };

  const handleDeleteCustomer = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete customer "${name}"?`)) return;

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'DELETE',
      'Customers',
      id,
      `Deleted customer ${name}`
    );

    onUpdateStore({
      ...store,
      customers: store.customers.filter(c => c.id !== id),
      auditLogs: [audit, ...store.auditLogs],
    });
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing && editId) {
      const updatedCustomers = store.customers.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            fullName,
            nikKtp,
            phone,
            addressCurrent,
            addressKtp: addressCurrent,
            workplace,
          };
        }
        return c;
      });

      const audit = createAuditEntry(
        currentUser.username,
        currentUser.role,
        'UPDATE',
        'Customers',
        editId,
        `Updated Debtor Profile ${fullName}`
      );

      onUpdateStore({
        ...store,
        customers: updatedCustomers,
        auditLogs: [audit, ...store.auditLogs],
      });
    } else {
      const newCustomer: Customer = {
        id: `CUST-${Date.now()}`,
        customerCode: `DEB-${nikKtp || Date.now()}`,
        nikKtp,
        fullName,
        phone,
        addressCurrent,
        addressKtp: addressCurrent,
        workplace,
        emergencyContactName: 'Family Contact',
        emergencyContactPhone: phone,
        riskNotes: 'Normal recovery case profile',
        createdAt: new Date().toISOString(),
      };

      const audit = createAuditEntry(currentUser.username, currentUser.role, 'CREATE', 'Customers', newCustomer.id, `Created Debtor Profile ${fullName}`);

      onUpdateStore({
        ...store,
        customers: [newCustomer, ...store.customers],
        auditLogs: [audit, ...store.auditLogs],
      });
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Debtor & Customer Database</h2>
          </div>
          <p className="text-xs text-slate-400">Master Debtor Profiles, NIK Verification & Risk Notes</p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Debtor Profile</span>
          </button>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Debtor Code</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">NIK (KTP)</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Current Address</th>
                <th className="py-3 px-4">Workplace</th>
                <th className="py-3 px-4">Risk Notes</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{c.customerCode}</td>
                  <td className="py-3.5 px-4 font-bold text-white">{c.fullName}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">{c.nikKtp}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">{c.phone}</td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">{c.addressCurrent}</td>
                  <td className="py-3.5 px-4 text-slate-400">{c.workplace}</td>
                  <td className="py-3.5 px-4 text-amber-300 text-[11px]">{c.riskNotes}</td>
                  {canEdit && (
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleOpenModal(c)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-indigo-400 transition"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(c.id, c.fullName)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-red-400 transition"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSaveCustomer} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-base">
              {isEditing ? 'Edit Debtor Profile' : 'Register Debtor Profile'}
            </h3>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Supriadi Mangkuto"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">NIK (KTP 16 digits)</label>
              <input
                type="text"
                required
                value={nikKtp}
                onChange={(e) => setNikKtp(e.target.value)}
                placeholder="3171012301900001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+62 812-xxxx-xxxx"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Current Address</label>
              <input
                type="text"
                value={addressCurrent}
                onChange={(e) => setAddressCurrent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500"
              >
                {isEditing ? 'Save Changes' : 'Save Debtor'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
