import React, { useState } from 'react';
import { BastData, ChecklistMap, ItemCondition, VehicleType } from '../types';
import { getChecklistDefinitions, CONTOH_RODA4, CONTOH_RODA2, BLANK_DATA, emptyChecklist } from '../data/defaults';
import { generateOfficialLetterNumber } from '../utils/letterNumber';
import { getSavedKopTemplate, saveKopTemplate } from '../utils/kopStorage';
import { 
  Bike, 
  Car, 
  Building2, 
  UserCheck, 
  User, 
  FileText, 
  CheckSquare, 
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  MinusCircle,
  Image as ImageIcon,
  Save,
  RotateCcw,
  Sliders,
  Check
} from 'lucide-react';

interface FormPanelProps {
  data: BastData;
  set: <K extends keyof BastData>(key: K, value: BastData[K]) => void;
  setJenis: (j: VehicleType) => void;
  setChecklist: (c: ChecklistMap) => void;
  onApplyTemplate?: (template: BastData) => void;
  onSyncFromLetter?: () => void;
}

export default function FormPanel({ data, set, setJenis, setChecklist, onApplyTemplate, onSyncFromLetter }: FormPanelProps) {
  const [activeSection, setActiveSection] = useState<'info' | 'kendaraan' | 'checklist' | 'kop' | 'ttd'>('info');
  const [savedKopSuccess, setSavedKopSuccess] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const checklistDefs = getChecklistDefinitions(data.jenis);

  const inputClass =
    'w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] transition-all shadow-2xs';
  const labelClass = 'block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5';

  const updateField = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    set(name as keyof BastData, value);
  };

  const handleItemStatusChange = (id: string, status: ItemCondition) => {
    const current = data.checklist[id] || { status: 'baik', catatan: '' };
    setChecklist({
      ...data.checklist,
      [id]: {
        ...current,
        status,
        catatan:
          status === '' ? '' :
          status === 'baik'
            ? 'Lengkap & Baik'
            : status === 'rusak'
            ? 'Rusak / Perlu Perbaikan'
            : 'Tidak Ada / Tidak Diserahkan',
      },
    });
  };

  const handleItemNoteChange = (id: string, catatan: string) => {
    const current = data.checklist[id] || { status: 'baik', catatan: '' };
    setChecklist({
      ...data.checklist,
      [id]: {
        ...current,
        catatan,
      },
    });
  };

  const setAllStatus = (status: ItemCondition) => {
    const updated: ChecklistMap = {};
    for (const def of checklistDefs) {
      updated[def.id] = {
        status,
        catatan:
          status === '' ? '' :
          status === 'baik'
            ? 'Lengkap & Baik'
            : status === 'rusak'
            ? 'Rusak'
            : 'Tidak Ada',
      };
    }
    setChecklist(updated);
  };

  const handleGenerateBast = () => {
    const num = generateOfficialLetterNumber({
      type: 'BAST',
      companyName: data.perusahaan,
    });
    set('nomorBast', num);
  };

  const handleGeneratePenyerahan = () => {
    const num = generateOfficialLetterNumber({
      type: 'SPK',
      companyName: data.perusahaan,
    });
    set('nomorPenyerahan', num);
  };

  const handleGenerateBoth = () => {
    const bNum = generateOfficialLetterNumber({
      type: 'BAST',
      companyName: data.perusahaan,
    });
    const pNum = generateOfficialLetterNumber({
      type: 'SPK',
      companyName: data.perusahaan,
    });
    set('nomorBast', bNum);
    set('nomorPenyerahan', pNum);
  };

  const handleSyncKopFromStorage = () => {
    const saved = getSavedKopTemplate();
    if (saved) {
      set('kopImage', saved.kopImage);
      set('kopImageHeight', saved.kopImageHeight);
      set('kopImageFit', saved.kopImageFit);
      set('kopImageAlign', saved.kopImageAlign);
      set('kopImageOffsetY', saved.kopImageOffsetY);
      set('kopImageOffsetX', saved.kopImageOffsetX);
      set('kopImageMarginBottom', saved.kopImageMarginBottom);
      set('useImageKop', Boolean(saved.kopImage));
      setSavedKopSuccess(true);
      setTimeout(() => setSavedKopSuccess(false), 2500);
    }
  };

  const handleSaveKopAsDefault = () => {
    saveKopTemplate({
      kopImage: data.kopImage ?? null,
      kopImageHeight: data.kopImageHeight ?? 120,
      kopImageFit: data.kopImageFit ?? 'contain',
      kopImageAlign: data.kopImageAlign ?? 'center',
      kopImageOffsetY: data.kopImageOffsetY ?? 0,
      kopImageOffsetX: data.kopImageOffsetX ?? 0,
      kopImageMarginBottom: data.kopImageMarginBottom ?? 24,
      kopCompanyName: data.perusahaan || 'PT. MITRA JASATRIA INDONESIA',
    });
    setSavedKopSuccess(true);
    setTimeout(() => setSavedKopSuccess(false), 2500);
  };

  const savedTemplate = getSavedKopTemplate();
  const currentKopImage = data.kopImage ?? savedTemplate?.kopImage ?? null;

  return (
    <div className="space-y-3.5">
      {/* Quick Template Selector Box */}
      <div className="bg-slate-100/90 border border-slate-200/90 p-2.5 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
            <Sparkles size={13} className="text-[#5A5A40]" />
            <span>Preset Template:</span>
          </div>
          <span className="text-[9.5px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
            Cepat Isi
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {onSyncFromLetter && (
            <button
              type="button"
              id="btn-sync-surat-tugas-action"
              onClick={() => {
                onSyncFromLetter();
                setSyncSuccess(true);
                setTimeout(() => setSyncSuccess(false), 2500);
              }}
              className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg font-bold text-[10.5px] transition shadow-2xs cursor-pointer active:scale-95 col-span-2"
              title="Ambil data semua isian formulir dari isian Surat Tugas secara otomatis"
            >
              {syncSuccess ? (
                <>
                  <Check size={13} className="text-emerald-600" />
                  <span>Isian Berhasil Disinkronkan dari Surat Tugas!</span>
                </>
              ) : (
                <>
                  <FileText size={13} className="text-emerald-700" />
                  <span>Ambil Isian dari Surat Tugas (Sinkron Otomatis)</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => onApplyTemplate?.(CONTOH_RODA4)}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-bold text-[10.5px] transition shadow-2xs cursor-pointer active:scale-95"
            title="Muat data contoh BAST Roda 4 (Mobil Avanza)"
          >
            <Car size={13} className="text-[#5A5A40]" />
            <span className="truncate">Contoh Mobil (R4)</span>
          </button>

          <button
            type="button"
            onClick={() => onApplyTemplate?.(CONTOH_RODA2)}
            className="flex items-center justify-center gap-1 py-1.5 px-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-bold text-[10.5px] transition shadow-2xs cursor-pointer active:scale-95"
            title="Muat data contoh BAST Roda 2 (Motor)"
          >
            <Bike size={13} className="text-[#5A5A40]" />
            <span className="truncate">Contoh Motor (R2)</span>
          </button>

          <button
            type="button"
            id="btn-reset-form-kosong-bast"
            onClick={() => onApplyTemplate?.({
              ...BLANK_DATA,
              jenis: data.jenis,
              perusahaan: data.perusahaan,
              cabang: data.cabang,
              alamat: data.alamat,
              telepon: data.telepon,
              kopImage: data.kopImage,
              kopImageHeight: data.kopImageHeight,
              kopImageFit: data.kopImageFit,
              kopImageAlign: data.kopImageAlign,
              kopImageOffsetY: data.kopImageOffsetY,
              kopImageOffsetX: data.kopImageOffsetX,
              kopImageMarginBottom: data.kopImageMarginBottom,
              kopCompanyName: data.kopCompanyName,
              useImageKop: data.useImageKop,
              checklist: emptyChecklist(data.jenis),
            })}
            className="flex items-center justify-center gap-1.5 py-1.5 px-2 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold text-[10.5px] transition shadow-2xs cursor-pointer active:scale-95 col-span-2"
            title="Kosongkan seluruh isian formulir (Reset Semua Field)"
          >
            <RotateCcw size={12} className="text-rose-600" />
            <span>Kosongkan Semua Field (Reset)</span>
          </button>
        </div>
      </div>

      {/* Jenis Kendaraan Selector */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
          Kategori Kendaraan
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setJenis('roda2')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              data.jenis === 'roda2'
                ? 'bg-[#5A5A40] text-white shadow-sm ring-2 ring-[#5A5A40]/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Bike size={15} />
            Roda 2 (Motor)
          </button>
          <button
            type="button"
            onClick={() => setJenis('roda4')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              data.jenis === 'roda4'
                ? 'bg-[#5A5A40] text-white shadow-sm ring-2 ring-[#5A5A40]/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Car size={15} />
            Roda 4 (Mobil)
          </button>
        </div>
      </div>

      {/* Navigation Pills inside Form */}
      <div className="flex rounded-lg bg-slate-200/80 p-1 gap-0.5 text-[10.5px] font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSection('info')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-center ${
            activeSection === 'info' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pihak
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('kendaraan')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-center ${
            activeSection === 'kendaraan' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Unit
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('checklist')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-center ${
            activeSection === 'checklist' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Checklist
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('kop')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-center flex items-center justify-center gap-1 ${
            activeSection === 'kop' ? 'bg-white text-[#5A5A40] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ImageIcon size={11} />
          <span>Kop</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSection('ttd')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap text-center ${
            activeSection === 'ttd' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          TTD
        </button>
      </div>

      {/* SECTION 1: INFO PIHAK & KONTRAK */}
      {activeSection === 'info' && (
        <div className="space-y-3.5">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Building2 size={15} className="text-[#5A5A40]" />
                <h3 className="text-xs font-bold text-slate-800">Data Perusahaan & Nomor Surat</h3>
              </div>
              <button
                type="button"
                id="btn-generate-both-bast-spk"
                onClick={handleGenerateBoth}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-[10.5px] font-bold transition shadow-xs cursor-pointer"
                title="Generate otomatis No. BAST dan No. Penyerahan resmi"
              >
                <Sparkles size={11} />
                <span>Auto No.</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className={labelClass}>No. BAST</label>
                  <button
                    type="button"
                    onClick={handleGenerateBast}
                    className="text-[9.5px] text-[#5A5A40] hover:text-[#383826] font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  name="nomorBast"
                  value={data.nomorBast}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className={labelClass}>No. Penyerahan (SPK)</label>
                  <button
                    type="button"
                    onClick={handleGeneratePenyerahan}
                    className="text-[9.5px] text-[#5A5A40] hover:text-[#383826] font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                  >
                    Generate
                  </button>
                </div>
                <input
                  type="text"
                  name="nomorPenyerahan"
                  value={data.nomorPenyerahan}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Nama Perusahaan / Eksekutor</label>
                <input
                  type="text"
                  name="perusahaan"
                  value={data.perusahaan}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Cabang Perusahaan</label>
                <input
                  type="text"
                  name="cabang"
                  value={data.cabang}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Alamat Kantor</label>
                <input
                  type="text"
                  name="alamat"
                  value={data.alamat}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Telepon Kantor</label>
                <input
                  type="text"
                  name="telepon"
                  value={data.telepon}
                  onChange={updateField}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          {/* Data Petugas Penerima */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <UserCheck size={15} className="text-[#5A5A40]" />
              <h3 className="text-xs font-bold text-slate-800">Pihak Penerima (Petugas MJI)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Nama Petugas Penerima</label>
                <input type="text" name="petugasNama" value={data.petugasNama} onChange={updateField} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>NIK / ID Petugas</label>
                <input type="text" name="petugasNik" value={data.petugasNik} onChange={updateField} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Jabatan Petugas</label>
                <input type="text" name="petugasJabatan" value={data.petugasJabatan} onChange={updateField} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>No. HP Petugas</label>
                <input type="text" name="petugasHp" value={data.petugasHp} onChange={updateField} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Data Konsumen / Debitur */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <User size={15} className="text-[#5A5A40]" />
              <h3 className="text-xs font-bold text-slate-800">Pihak Yang Menyerahkan (Debitur)</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Nama Debitur / Konsumen</label>
                <input type="text" name="debiturNama" value={data.debiturNama} onChange={updateField} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>No. KTP / NIK</label>
                <input type="text" name="debiturNik" value={data.debiturNik} onChange={updateField} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Alamat Lengkap Debitur</label>
              <textarea name="debiturAlamat" value={data.debiturAlamat} onChange={updateField} rows={2} className={`${inputClass} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>No. HP Debitur</label>
                <input type="text" name="debiturHp" value={data.debiturHp} onChange={updateField} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>No. Kontrak / Perjanjian</label>
                <input type="text" name="nomorKontrak" value={data.nomorKontrak} onChange={updateField} className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Kreditur / Leasing / Lembaga Pembiayaan</label>
              <input type="text" name="krediturLeasing" value={data.krediturLeasing} onChange={updateField} className={inputClass} />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: UNIT KENDARAAN */}
      {activeSection === 'kendaraan' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <FileText size={15} className="text-[#5A5A40]" />
            <h3 className="text-xs font-bold text-slate-800">Spesifikasi & Identitas Kendaraan</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Merk Kendaraan</label>
              <input type="text" name="kendaraanMerk" value={data.kendaraanMerk} onChange={updateField} className={inputClass} placeholder="Contoh: HONDA / TOYOTA" />
            </div>
            <div>
              <label className={labelClass}>Tipe / Model</label>
              <input type="text" name="kendaraanType" value={data.kendaraanType} onChange={updateField} className={inputClass} placeholder="Contoh: HR-V / AVANZA" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={labelClass}>Nomor Polisi</label>
              <input type="text" name="kendaraanNoPol" value={data.kendaraanNoPol} onChange={updateField} className={inputClass} placeholder="R 1829 XH" />
            </div>
            <div>
              <label className={labelClass}>Tahun</label>
              <input type="text" name="kendaraanTahun" value={data.kendaraanTahun} onChange={updateField} className={inputClass} placeholder="2022" />
            </div>
            <div>
              <label className={labelClass}>Warna</label>
              <input type="text" name="kendaraanWarna" value={data.kendaraanWarna} onChange={updateField} className={inputClass} placeholder="Putih Mutiara" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nomor Rangka (VIN)</label>
              <input type="text" name="kendaraanNoRangka" value={data.kendaraanNoRangka} onChange={updateField} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Nomor Mesin</label>
              <input type="text" name="kendaraanNoMesin" value={data.kendaraanNoMesin} onChange={updateField} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Odometer (KM)</label>
              <input type="text" name="kendaraanOdometer" value={data.kendaraanOdometer} onChange={updateField} className={inputClass} placeholder="36.120 KM" />
            </div>
            <div>
              <label className={labelClass}>Posisi Bahan Bakar</label>
              <input type="text" name="kendaraanBahanBakar" value={data.kendaraanBahanBakar} onChange={updateField} className={inputClass} placeholder="3/4 Tangki" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Kelengkapan STNK</label>
              <input type="text" name="kendaraanStnk" value={data.kendaraanStnk} onChange={updateField} className={inputClass} placeholder="Ada (Pajak s/d 2027)" />
            </div>
            <div>
              <label className={labelClass}>Status BPKB</label>
              <input type="text" name="kendaraanBpkb" value={data.kendaraanBpkb} onChange={updateField} className={inputClass} placeholder="Dalam Jaminan Kreditur" />
            </div>
          </div>
          <div>
            <label className={labelClass}>Kondisi Mesin & Transmisi</label>
            <input type="text" name="kendaraanKondisiMesin" value={data.kendaraanKondisiMesin} onChange={updateField} className={inputClass} placeholder="Normal / Hidup / Suara Halus" />
          </div>
          <div>
            <label className={labelClass}>Catatan Kondisi Bodi & Eksterior</label>
            <textarea
              name="kendaraanKondisiBodi"
              value={data.kendaraanKondisiBodi}
              onChange={updateField}
              rows={2}
              className={`${inputClass} resize-none`}
              placeholder="Catatan lecet bodi, baret, penyok, dll."
            />
          </div>
        </div>
      )}

      {/* SECTION 3: CHECKLIST KOMPONEN */}
      {activeSection === 'checklist' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-[#5A5A40]" />
              <h3 className="text-xs font-bold text-slate-800">Checklist Fisik ({data.jenis === 'roda2' ? 'Motor' : 'Mobil'})</h3>
            </div>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setAllStatus('')}
                className="text-[10px] font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded border border-slate-300 cursor-pointer"
              >
                Kosongkan
              </button>
              <button
                type="button"
                onClick={() => setAllStatus('baik')}
                className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 cursor-pointer"
              >
                Semua Baik
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
            {checklistDefs.map((def) => {
              const current = data.checklist[def.id] || { status: 'baik', catatan: '' };
              const status = current.status;

              return (
                <div key={def.id} className="p-2 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">{def.nama}</span>
                    <span className="text-[9.5px] text-slate-400 font-medium">{def.kategori}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(def.id, 'baik')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        status === 'baik'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle2 size={11} />
                      Baik (✓)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(def.id, 'rusak')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        status === 'rusak'
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <AlertTriangle size={11} />
                      Rusak (✗)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleItemStatusChange(def.id, 'tidak_ada')}
                      className={`flex-1 flex items-center justify-center gap-1 py-1 px-1 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                        status === 'tidak_ada'
                          ? 'bg-slate-700 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <MinusCircle size={11} />
                      Tdk Ada (—)
                    </button>
                  </div>

                  <input
                    type="text"
                    value={current.catatan || ''}
                    onChange={(e) => handleItemNoteChange(def.id, e.target.value)}
                    placeholder="Catatan kondisi..."
                    className="w-full bg-white border border-slate-200 rounded px-2 py-0.5 text-[10.5px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#5A5A40]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 4: KOP SURAT & SETTING POSISI */}
      {activeSection === 'kop' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div className="flex items-center gap-2">
              <ImageIcon size={15} className="text-[#5A5A40]" />
              <h3 className="text-xs font-bold text-slate-800">Kop Surat & Posisi (BAST & SPK)</h3>
            </div>
            <button
              type="button"
              onClick={handleSaveKopAsDefault}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#5A5A40] hover:bg-[#484833] text-white rounded-lg text-[10.5px] font-bold transition shadow-xs cursor-pointer"
            >
              {savedKopSuccess ? <Check size={11} className="text-emerald-300" /> : <Save size={11} />}
              <span>{savedKopSuccess ? 'Tersimpan!' : 'Kunci Standar'}</span>
            </button>
          </div>

          {/* Status info */}
          <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-lg text-[11px] text-emerald-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
              <span>Kop Surat Aktif & Tersinkronisasi</span>
            </p>
            <p className="text-[10.5px] text-emerald-800 leading-snug">
              BAST dan Surat Penyerahan otomatis menggunakan file Kop Surat yang Anda upload beserta seluruh posisi koordinat sekarang.
            </p>
          </div>

          {/* Toggle Image Kop vs Text Header */}
          <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <p className="text-xs font-bold text-slate-800">Tampilkan Kop Bergambar</p>
              <p className="text-[10px] text-slate-500">Gunakan logo kop surat yang diupload</p>
            </div>
            <button
              type="button"
              onClick={() => set('useImageKop', data.useImageKop === false ? true : false)}
              className={`px-3 py-1 rounded-md text-xs font-bold transition cursor-pointer ${
                data.useImageKop !== false
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {data.useImageKop !== false ? 'Aktif' : 'Teks Saja'}
            </button>
          </div>

          {/* Kop Image Thumbnail Preview */}
          {currentKopImage ? (
            <div className="p-2 border border-slate-200 rounded-lg bg-slate-50/50 space-y-1.5">
              <div className="flex items-center justify-between text-[10.5px] text-slate-600 font-medium">
                <span>Pratinjau Gambar Kop:</span>
                <button
                  type="button"
                  onClick={handleSyncKopFromStorage}
                  className="text-[#5A5A40] hover:underline font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={10} />
                  <span>Sinkronkan Ulang</span>
                </button>
              </div>
              <div className="bg-white p-2 border border-slate-200 rounded flex items-center justify-center max-h-20 overflow-hidden">
                <img
                  src={currentKopImage}
                  alt="Kop Surat Thumbnail"
                  className="max-h-16 w-auto object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="p-3 border-2 border-dashed border-slate-300 rounded-lg text-center text-slate-500 text-xs">
              <p>Belum ada gambar kop tersimpan.</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Silakan upload pada tab Surat Tugas atau sinkronkan.</p>
            </div>
          )}

          {/* Sliders Posisi Kop */}
          <div className="space-y-2.5 pt-1">
            {/* Slider Height */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Tinggi Kop:</span>
                <span className="font-mono text-[#5A5A40] font-bold">{data.kopImageHeight ?? savedTemplate?.kopImageHeight ?? 120} px</span>
              </div>
              <input
                type="range"
                min="60"
                max="220"
                step="5"
                value={data.kopImageHeight ?? savedTemplate?.kopImageHeight ?? 120}
                onChange={(e) => set('kopImageHeight', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
              />
            </div>

            {/* Slider Offset Y */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Geser Vertikal (Y):</span>
                <span className="font-mono text-[#5A5A40] font-bold">{data.kopImageOffsetY ?? savedTemplate?.kopImageOffsetY ?? 0} px</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="2"
                value={data.kopImageOffsetY ?? savedTemplate?.kopImageOffsetY ?? 0}
                onChange={(e) => set('kopImageOffsetY', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
              />
            </div>

            {/* Slider Offset X */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Geser Horisontal (X):</span>
                <span className="font-mono text-[#5A5A40] font-bold">{data.kopImageOffsetX ?? savedTemplate?.kopImageOffsetX ?? 0} px</span>
              </div>
              <input
                type="range"
                min="-60"
                max="60"
                step="2"
                value={data.kopImageOffsetX ?? savedTemplate?.kopImageOffsetX ?? 0}
                onChange={(e) => set('kopImageOffsetX', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
              />
            </div>

            {/* Slider Margin Bottom */}
            <div>
              <div className="flex justify-between text-[11px] font-semibold text-slate-700 mb-1">
                <span>Jarak Bawah (Margin):</span>
                <span className="font-mono text-[#5A5A40] font-bold">{data.kopImageMarginBottom ?? savedTemplate?.kopImageMarginBottom ?? 24} px</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="2"
                value={data.kopImageMarginBottom ?? savedTemplate?.kopImageMarginBottom ?? 24}
                onChange={(e) => set('kopImageMarginBottom', Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
              />
            </div>

            {/* Scale Fit & Alignment */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className={labelClass}>Skala Gambar</label>
                <select
                  value={data.kopImageFit ?? savedTemplate?.kopImageFit ?? 'contain'}
                  onChange={(e) => set('kopImageFit', e.target.value as any)}
                  className={inputClass}
                >
                  <option value="contain">Contain (Proporsional)</option>
                  <option value="fill">Fill (Rentangkan Penuh)</option>
                  <option value="cover">Cover (Penuh Area)</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Perataan</label>
                <select
                  value={data.kopImageAlign ?? savedTemplate?.kopImageAlign ?? 'center'}
                  onChange={(e) => set('kopImageAlign', e.target.value as any)}
                  className={inputClass}
                >
                  <option value="center">Tengah (Center)</option>
                  <option value="left">Rata Kiri</option>
                  <option value="right">Rata Kanan</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: TTD & SAKSI */}
      {activeSection === 'ttd' && (
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <UserCheck size={15} className="text-[#5A5A40]" />
            <h3 className="text-xs font-bold text-slate-800">Tempat, Tanggal & Saksi</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Kota / Tempat</label>
              <input type="text" name="kota" value={data.kota} onChange={updateField} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Tanggal Pelaksanaan</label>
              <input type="text" name="tanggal" value={data.tanggal} onChange={updateField} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nama Saksi 1</label>
              <input type="text" name="saksi1Nama" value={data.saksi1Nama} onChange={updateField} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Jabatan / Status Saksi 1</label>
              <input type="text" name="saksi1Jabatan" value={data.saksi1Jabatan} onChange={updateField} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelClass}>Nama Saksi 2</label>
              <input type="text" name="saksi2Nama" value={data.saksi2Nama} onChange={updateField} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Jabatan / Status Saksi 2</label>
              <input type="text" name="saksi2Jabatan" value={data.saksi2Jabatan} onChange={updateField} className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Catatan Khusus / Pernyataan Tambahan</label>
            <textarea
              name="catatanKhusus"
              value={data.catatanKhusus}
              onChange={updateField}
              rows={3}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
