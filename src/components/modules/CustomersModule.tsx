import React, { useState, useMemo } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Customer } from '../../types/arms';
import { Users, Plus, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { findDuplicateCustomerMaster } from '../../utils/duplicateCheck';

interface CustomersModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const CustomersModule: React.FC<CustomersModuleProps> = ({ store, currentUser, onUpdateStore }) => {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  
  // Form fields
  const [contractNo, setContractNo] = useState('');
  const [fullName, setFullName] = useState('');
  const [addressCurrent, setAddressCurrent] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState('');
  const [penaltyAmount, setPenaltyAmount] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleMerkType, setVehicleMerkType] = useState('');
  const [vehiclePoliceNo, setVehiclePoliceNo] = useState('');
  
  const [nikKtp, setNikKtp] = useState(''); // Keep this for internal needs/backend if needed, or make optional

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS';

  // Real-time duplicate check for customer master
  const duplicateWarning = useMemo(() => {
    if (!showModal) return null;
    return findDuplicateCustomerMaster(store.customers || [], {
      fullName,
      contractNo,
      nikKtp,
      phone,
      excludeCustomerId: isEditing ? editId : null,
    });
  }, [showModal, store.customers, fullName, contractNo, nikKtp, phone, isEditing, editId]);

  const hasDuplicateCustomerInStore = (cust: Customer) => {
    return (store.customers || []).some(c => 
      c.id !== cust.id &&
      ((c.contractNo && cust.contractNo && c.contractNo.toLowerCase().trim() === cust.contractNo.toLowerCase().trim()) ||
       (c.nikKtp && cust.nikKtp && c.nikKtp.replace(/\D/g, '') === cust.nikKtp.replace(/\D/g, '') && c.nikKtp.replace(/\D/g, '').length >= 10) ||
       (c.fullName.toLowerCase().trim() === cust.fullName.toLowerCase().trim() && c.phone && cust.phone && c.phone.replace(/\D/g, '') === cust.phone.replace(/\D/g, '')))
    );
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setIsEditing(true);
      setEditId(customer.id);
      setContractNo(customer.contractNo || '');
      setFullName(customer.fullName);
      setAddressCurrent(customer.addressCurrent);
      setDueDate(customer.dueDate || '');
      setInstallmentAmount(customer.installmentAmount || '');
      setPenaltyAmount(customer.penaltyAmount || '');
      setPhone(customer.phone);
      setVehicleMerkType(customer.vehicleMerkType || '');
      setVehiclePoliceNo(customer.vehiclePoliceNo || '');
      setNikKtp(customer.nikKtp || '');
    } else {
      setIsEditing(false);
      setEditId(null);
      setContractNo('');
      setFullName('');
      setAddressCurrent('');
      setDueDate('');
      setInstallmentAmount('');
      setPenaltyAmount('');
      setPhone('');
      setVehicleMerkType('');
      setVehiclePoliceNo('');
      setNikKtp('');
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

    if (duplicateWarning?.isDuplicate) {
      const confirmProceed = window.confirm(
        `⚠️ PERINGATAN DATA DEBITUR GANDA (DUPLICATE DETECTED):\n\n` +
        `${duplicateWarning.matchReason}\n\n` +
        `Data master debitur ini memiliki kesamaan dengan debitur yang sudah terdaftar.\n` +
        `Apakah Anda yakin ingin tetap menyimpan profil debitur ini?`
      );
      if (!confirmProceed) {
        return;
      }
    }

    if (isEditing && editId) {
      const updatedCustomers = store.customers.map(c => {
        if (c.id === editId) {
          return {
            ...c,
            contractNo,
            fullName,
            nikKtp,
            phone,
            addressCurrent,
            addressKtp: addressCurrent,
            dueDate,
            installmentAmount,
            penaltyAmount,
            vehicleMerkType,
            vehiclePoliceNo,
            workplace: c.workplace || '',
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
        customerCode: `DEB-${Date.now()}`,
        contractNo,
        nikKtp,
        fullName,
        phone,
        addressCurrent,
        addressKtp: addressCurrent,
        dueDate,
        installmentAmount,
        penaltyAmount,
        vehicleMerkType,
        vehiclePoliceNo,
        workplace: '',
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
                <th className="py-3 px-4">No. Kontrak</th>
                <th className="py-3 px-4">Full Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-4">Outstanding</th>
                {canEdit && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {store.customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-300">{c.customerCode}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{c.contractNo || '-'}</span>
                      {hasDuplicateCustomerInStore(c) && (
                        <span className="bg-amber-950 text-amber-300 text-[9px] px-1.5 py-0.5 rounded border border-amber-800 font-bold flex items-center gap-1" title="Data debitur dengan nomor kontrak / identitas serupa terdaftar lebih dari 1 kali">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-400" /> Duplikat
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-bold text-white">{c.fullName}</td>
                  <td className="py-3.5 px-4 text-emerald-400 font-semibold">{c.phone}</td>
                  <td className="py-3.5 px-4 text-slate-300 max-w-[200px] truncate">{c.addressCurrent}</td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {c.vehicleMerkType ? (
                      <span className="block text-xs">{c.vehicleMerkType} <br/> <span className="font-mono text-[10px] text-slate-500">{c.vehiclePoliceNo}</span></span>
                    ) : '-'}
                  </td>
                  <td className="py-3.5 px-4 text-amber-300 text-[11px]">
                    {c.installmentAmount || c.penaltyAmount ? (
                      <>
                        {c.installmentAmount && <span className="block">Angsuran: {c.installmentAmount}</span>}
                        {c.penaltyAmount && <span className="block text-red-400">Denda: Rp {c.penaltyAmount}</span>}
                      </>
                    ) : '-'}
                  </td>
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
          <form onSubmit={handleSaveCustomer} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-white text-base border-b border-slate-800 pb-2">
              {isEditing ? 'Edit Data Debitur' : 'Register Data Debitur'}
            </h3>

            {/* Duplicate Debitur Warning Banner */}
            {duplicateWarning?.isDuplicate && (
              <div className="bg-amber-950/80 border-2 border-amber-500/80 rounded-xl p-3.5 space-y-2 text-amber-200 shadow-lg animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
                  <span>⚠️ PERINGATAN: DATA DEBITUR SUDAH TERDAFTAR</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {duplicateWarning.matchReason}.
                </p>
                {duplicateWarning.matchedCustomer && (
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-amber-800/60 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] font-mono">
                    <div>
                      <span className="text-slate-500 block">Kode Debitur</span>
                      <span className="text-indigo-300 font-bold">{duplicateWarning.matchedCustomer.customerCode}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Nama Terdaftar</span>
                      <span className="text-white font-bold">{duplicateWarning.matchedCustomer.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">No. Kontrak Terdaftar</span>
                      <span className="text-slate-300">{duplicateWarning.matchedCustomer.contractNo || '-'}</span>
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-amber-400/90 font-medium">
                  💡 <em>Mohon periksa data kembali untuk menghindari duplikasi data profil debitur.</em>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">No. Kontrak</label>
                <input
                  type="text"
                  value={contractNo}
                  onChange={(e) => setContractNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nama</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1">Alamat</label>
                <input
                  type="text"
                  value={addressCurrent}
                  onChange={(e) => setAddressCurrent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Tanggal Jatuh Tempo</label>
                <input
                  type="text"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Angsuran</label>
                <input
                  type="text"
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">DENDA</label>
                <input
                  type="text"
                  value={penaltyAmount}
                  onChange={(e) => setPenaltyAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nomor Handphone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>
            </div>

            <h4 className="font-semibold text-slate-300 text-sm border-b border-slate-800 pb-1 mt-4">Spesifikasi Kendaraan</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Merk/Type</label>
                <input
                  type="text"
                  value={vehicleMerkType}
                  onChange={(e) => setVehicleMerkType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Nomor Polisi</label>
                <input
                  type="text"
                  value={vehiclePoliceNo}
                  onChange={(e) => setVehiclePoliceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white font-mono"
                />
              </div>
            </div>
            
            <div className="hidden">
              {/* Hidden KTP for backend consistency if required */}
              <input type="text" value={nikKtp} onChange={(e) => setNikKtp(e.target.value)} />
            </div>

            <div className="flex justify-end gap-2 pt-4 mt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg hover:bg-slate-700 font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-500 transition shadow-lg shadow-indigo-900/20"
              >
                {isEditing ? 'Simpan Perubahan' : 'Simpan Debitur'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
