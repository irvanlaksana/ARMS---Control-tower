import { Pagination, usePagination } from '../common/Pagination';
import React, { useState, useMemo } from 'react';
import { ARMSStore, createAuditEntry } from '../../services/armsDataService';
import { User, Service } from '../../types/arms';
import { Briefcase, Plus, CheckCircle, FolderPlus, Layers, Search } from 'lucide-react';

interface ServicesModuleProps {
  store: ARMSStore;
  currentUser: User;
  onUpdateStore: (newStore: ARMSStore) => void;
}

export const ServicesModule: React.FC<ServicesModuleProps> = ({
  store,
  currentUser,
  onUpdateStore,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [serviceName, setServiceName] = useState('');
  const [serviceCode, setServiceCode] = useState(`SRV-00${(store.services?.length || 0) + 1}`);
  const [category, setCategory] = useState<Service['category']>('PENAGIHAN_KORPORAT');
  const [defaultFeeType, setDefaultFeeType] = useState<Service['defaultFeeType']>('SUCCESS_FEE');
  const [description, setDescription] = useState('');

  const canEdit = currentUser.role === 'SUPER_ADMIN_OPS' || currentUser.role === 'APPROVER_EXECUTIVE';

  const handleAddService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) return;

    const newService: Service = {
      id: `SVC-${Date.now()}`,
      serviceCode: serviceCode.trim() || `SRV-00${(store.services?.length || 0) + 1}`,
      name: serviceName.trim(),
      category,
      description: description.trim() || 'Produk layanan penagihan dan recovery piutang multifinance.',
      defaultFeeType,
      status: 'ACTIVE',
    };

    const audit = createAuditEntry(
      currentUser.username,
      currentUser.role,
      'CREATE',
      'Services',
      newService.id,
      `Menambahkan produk/layanan baru: ${newService.name} (${newService.serviceCode})`
    );

    onUpdateStore({
      ...store,
      services: [...store.services, newService],
      auditLogs: [audit, ...store.auditLogs],
    });

    setServiceName('');
    setDescription('');
    setShowModal(false);
  };

  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = useMemo(() => {
    return (store.services || []).filter((s) => {
      const term = searchTerm.toLowerCase().trim();
      const code = s.serviceCode || (s as any).code || '';
      return (
        !term ||
        s.name.toLowerCase().includes(term) ||
        code.toLowerCase().includes(term) ||
        s.category.toLowerCase().includes(term) ||
        (s.description && s.description.toLowerCase().includes(term))
      );
    });
  }, [store.services, searchTerm]);

  const servicePagination = usePagination<Service>(filteredServices, 9);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Briefcase className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Master Produk & Layanan Agency (Services Catalog)</h2>
          </div>
          <p className="text-xs text-slate-400">
            Katalog Layanan Usaha Agency. Penambahan produk baru akan secara otomatis muncul di seluruh pilihan Core Recovery.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Service / Produk Layanan</span>
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="flex justify-end">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari layanan, kode service..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              servicePagination.setPage(1);
            }}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Services Grid */}
      {servicePagination.pageItems.length === 0 ? (
        <div className="py-12 text-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl">
          {store.services.length === 0
            ? 'Belum ada produk atau layanan yang terdaftar.'
            : 'Tidak ada produk atau layanan yang cocok dengan pencarian.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {servicePagination.pageItems.map((s) => (
            <div key={s.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-lg hover:border-slate-700 transition">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800 font-bold">
                  {s.serviceCode || (s as any).code}
                </span>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] px-2 py-0.5 rounded border border-emerald-800 font-semibold">
                  {s.status}
                </span>
              </div>

              <h3 className="font-bold text-white text-base">{s.name}</h3>
              <div className="text-[10px] font-semibold text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800 w-fit">
                Kategori: {s.category.replace(/_/g, ' ')}
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{s.description}</p>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-xs text-slate-300 font-medium">
                <span>Tipe Skema Fee:</span>
                <span className="text-amber-400 font-bold">{s.defaultFeeType}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <Pagination
          page={servicePagination.page}
          totalPages={servicePagination.totalPages}
          totalItems={servicePagination.totalItems}
          pageSize={servicePagination.pageSize}
          onPageChange={servicePagination.setPage}
          onPageSizeChange={servicePagination.setPageSize}
        />
      </div>

      {/* Modal Add Service */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAddService} className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Tambah Produk / Layanan Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nama Produk / Layanan <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                placeholder="e.g. Penagihan Khusus Somasi Lawyer"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Kode Service</label>
                <input
                  type="text"
                  value={serviceCode}
                  onChange={(e) => setServiceCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tipe Fee Default</label>
                <select
                  value={defaultFeeType}
                  onChange={(e) => setDefaultFeeType(e.target.value as Service['defaultFeeType'])}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="SUCCESS_FEE">SUCCESS_FEE</option>
                  <option value="PERCENT">PERCENT</option>
                  <option value="FIXED">FIXED</option>
                  <option value="TIERED">TIERED</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Kategori Layanan</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Service['category'])}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                <option value="PENAGIHAN_KORPORAT">PENAGIHAN KORPORAT</option>
                <option value="RECOVERY_UNIT">RECOVERY UNIT</option>
                <option value="DANA_TALANGAN_PENARIKAN">DANA TALANGAN PENARIKAN</option>
                <option value="TALANGAN_LIKUIDITAS_ASSET">TALANGAN LIKUIDITAS ASSET</option>
                <option value="PENAGIHAN_PERORANGAN">PENAGIHAN PERORANGAN</option>
                <option value="MEDIASI">MEDIASI & ADVOKASI HUKUM</option>
                <option value="PENYELESAIAN_FINANSIAL">PENYELESAIAN FINANSIAL</option>
                <option value="ASSET_LIQUIDATION">ASSET LIQUIDATION</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Deskripsi Layanan</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Penjelasan deskripsi layanan dan ruang lingkup penanganan..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-lg"
              >
                Simpan & Munculkan di Core Recovery
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
