import React, { useState, useEffect } from 'react';
import { LetterData, AttachmentData, PenagihanType } from '../types';
import { generateOfficialLetterNumber } from '../utils/letterNumber';
import { formatDateID, formatCleanAddress, formatDateDDMMYYYY, formatDueDate, getTodaySignPlaceDate } from '../utils/dateFormatter';
import { 
  Sparkles, 
  Calendar, 
  Scissors, 
  SlidersHorizontal, 
  Loader2, 
  Undo2, 
  Check, 
  Save, 
  RotateCcw, 
  Image as ImageIcon,
  Building2,
  UserCheck,
  User as UserIcon,
  CreditCard,
  Phone,
  Car,
  FileSpreadsheet,
  CheckCircle2,
  FolderKanban,
  FileText
} from 'lucide-react';
import { regionData } from '../data/regions';
import { BLANK_LETTER_DATA, CONTOH_LETTER_DATA, CONTOH_LETTER_PERORANGAN } from '../data/defaults';
import { VEHICLE_BRAND_GROUPS, POPULAR_VEHICLE_MODELS } from '../data/vehicles';
import { autoCropDocumentImage } from '../utils/imageAutoCrop';
import ImageCropModal from './ImageCropModal';
import { getSavedKopTemplate, saveKopTemplate } from '../utils/kopStorage';
import { ARMSStore } from '../../../services/armsDataService';
import { buildLetterDataFromInput, GeneratorFormInput } from '../../../lib/suratGenerator';
import { angkaKeTerbilang } from '../../../utils/terbilang';

export interface LetterFormProps {
  data: LetterData;
  onChange: (data: LetterData) => void;
  armsStore?: ARMSStore;
  activeCaseId?: string;
  activePersonnelId?: string;
  onAutofillFromCase?: (caseId: string, personnelId?: string, isPerorangan?: boolean) => void;
}

export default function LetterForm({ 
  data, 
  onChange,
  armsStore,
  activeCaseId,
  activePersonnelId,
  onAutofillFromCase
}: LetterFormProps) {
  // Sync state for ARMS Case & Debtor Autofill
  const [selectedCaseIdState, setSelectedCaseIdState] = useState<string>(activeCaseId || '');
  const [selectedPersonnelIdState, setSelectedPersonnelIdState] = useState<string>(activePersonnelId || '');
  const [isPeroranganKuasa, setIsPeroranganKuasa] = useState<boolean>(data.penagihanType === 'perorangan');
  const [autofillSuccessMessage, setAutofillSuccessMessage] = useState<string>('');

  useEffect(() => {
    if (activeCaseId) setSelectedCaseIdState(activeCaseId);
  }, [activeCaseId]);

  useEffect(() => {
    if (activePersonnelId) setSelectedPersonnelIdState(activePersonnelId);
  }, [activePersonnelId]);

  const formatRupiah = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    return 'Rp ' + parseInt(digits, 10).toLocaleString('id-ID').replace(/,/g, '.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let parsedValue: string | number = (type === 'range' || type === 'number') ? Number(value) : value;
    
    if (name === 'customerInstallment' || name === 'customerTotalInstallment' || name === 'customerPenalty' || name === 'besaranPokok' || name === 'besaranBungaDenda' || name === 'totalTagihan') {
      parsedValue = formatRupiah(value as string);
    }
    
    const updated = { ...data, [name]: parsedValue };

    // Auto terbilang if totalTagihan or customerTotalInstallment changes
    if (name === 'totalTagihan' || name === 'customerTotalInstallment') {
      const num = parseInt(String(parsedValue).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > 0) {
        updated.terbilangTagihan = `${angkaKeTerbilang(num)} Rupiah`;
      }
    }

    onChange(updated);
  };

  // Clean up any lingering KAB. from customerAddress
  useEffect(() => {
    if (data.customerAddress && /KAB\./i.test(data.customerAddress)) {
      onChange({
        ...data,
        customerAddress: formatCleanAddress(data.customerAddress),
      });
    }
  }, [data.customerAddress]);

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let newData = { ...data, [name]: value };

    if (name === 'customerKecamatan') {
      let detectedKab = '';
      let kecName = value;
      if (value.includes('|')) {
        const parts = value.split('|');
        detectedKab = parts[0];
        kecName = parts[1];
        newData.customerKabupaten = detectedKab;
        newData.customerKecamatan = kecName;
      } else {
        for (const [kab, kecMap] of Object.entries(regionData)) {
          if (kecMap[value]) {
            detectedKab = kab;
            break;
          }
        }
        newData.customerKabupaten = detectedKab;
      }
      newData.customerKelurahan = '';
    }

    const parts = [];
    if (newData.customerAddressDetail && newData.customerAddressDetail.trim()) {
      parts.push(formatCleanAddress(newData.customerAddressDetail.trim()));
    }
    const rtClean = (newData.customerRt || '').trim().replace(/^RT\.?\s*/i, '');
    const rwClean = (newData.customerRw || '').trim().replace(/^RW\.?\s*/i, '');
    if (rtClean && rwClean) {
      parts.push(`RT ${rtClean} RW ${rwClean}`);
    } else if (rtClean) {
      parts.push(`RT ${rtClean}`);
    } else if (rwClean) {
      parts.push(`RW ${rwClean}`);
    }
    if (newData.customerKelurahan) parts.push(`KEL. ${newData.customerKelurahan}`);
    if (newData.customerKecamatan) parts.push(`KEC. ${newData.customerKecamatan}`);

    newData.customerAddress = parts.filter(Boolean).join(', ');
    onChange(newData);
  };

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...data, customerDueDate: e.target.value });
  };

  const handleDueDateBlur = () => {
    if (data.customerDueDate && data.customerDueDate.trim()) {
      onChange({ ...data, customerDueDate: formatDueDate(data.customerDueDate) });
    }
  };

  // Derive make and model for Data Kendaraan from all known brands
  const allKnownVehicleBrands = VEHICLE_BRAND_GROUPS.flatMap((g) => g.brands);
  const currentMake = data.vehicleBrandMake ?? (() => {
    if (!data.vehicleBrand) return '';
    const upper = data.vehicleBrand.toUpperCase().trim();
    for (const b of allKnownVehicleBrands) {
      if (upper === b || upper.startsWith(b + ' ') || upper.startsWith(b + '/') || upper.startsWith(b + '-')) {
        return b;
      }
    }
    return '';
  })();

  const currentModel = data.vehicleBrandModel ?? (() => {
    if (!data.vehicleBrand) return '';
    if (data.vehicleBrand.includes('/')) {
      return data.vehicleBrand.split('/')[1]?.trim() || '';
    }
    if (currentMake && data.vehicleBrand.toUpperCase().startsWith(currentMake)) {
      return data.vehicleBrand.slice(currentMake.length).trim().replace(/^[\/\-\s]+/, '');
    }
    return currentMake ? '' : data.vehicleBrand;
  })();

  const handleVehicleMakeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const make = e.target.value === 'LAINNYA' ? '' : e.target.value;
    const model = currentModel;
    const combined = make && model ? `${make} / ${model}` : (make || model);
    onChange({
      ...data,
      vehicleBrandMake: make,
      vehicleBrandModel: model,
      vehicleBrand: combined,
    });
  };

  const handleVehicleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const model = e.target.value;
    const make = currentMake;
    const combined = make && model ? `${make} / ${model}` : (make || model);
    onChange({
      ...data,
      vehicleBrandMake: make,
      vehicleBrandModel: model,
      vehicleBrand: combined,
    });
  };

  const handleGenerateLetterNumber = () => {
    onChange({
      ...data,
      letterNumber: generateOfficialLetterNumber({
        type: 'ST',
        companyName: data.kopCompanyName,
      }),
    });
  };

  const [savedKopSuccess, setSavedKopSuccess] = useState<boolean>(false);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const url = reader.result as string;
        const updated = { ...data, kopImage: url };
        onChange(updated);
        saveKopTemplate(updated);
        setSavedKopSuccess(true);
        setTimeout(() => setSavedKopSuccess(false), 2500);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveAsDefaultKop = () => {
    saveKopTemplate(data);
    setSavedKopSuccess(true);
    setTimeout(() => setSavedKopSuccess(false), 3000);
  };

  const handleRestoreSavedKop = () => {
    const saved = getSavedKopTemplate();
    if (saved && saved.kopImage) {
      onChange({
        ...data,
        kopImage: saved.kopImage,
        kopImageHeight: saved.kopImageHeight,
        kopImageFit: saved.kopImageFit,
        kopImageAlign: saved.kopImageAlign,
        kopImageOffsetY: saved.kopImageOffsetY,
        kopImageOffsetX: saved.kopImageOffsetX,
        kopImageMarginBottom: saved.kopImageMarginBottom,
        kopCompanyName: saved.kopCompanyName || data.kopCompanyName,
      });
      setSavedKopSuccess(true);
      setTimeout(() => setSavedKopSuccess(false), 2500);
    }
  };

  const handleResetKopPosition = () => {
    onChange({
      ...data,
      kopImageHeight: 120,
      kopImageOffsetY: 0,
      kopImageOffsetX: 0,
      kopImageMarginBottom: 32,
      kopImageFit: 'contain',
      kopImageAlign: 'center',
    });
  };

  const [autoCropOnUpload, setAutoCropOnUpload] = useState<boolean>(true);
  const [isProcessingAttachments, setIsProcessingAttachments] = useState<boolean>(false);
  const [activeCropIndex, setActiveCropIndex] = useState<number | null>(null);
  const [singleCropLoading, setSingleCropLoading] = useState<number | null>(null);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsProcessingAttachments(true);
    const fileList = Array.from(files) as File[];
    const newAttachments: AttachmentData[] = [];
    
    for (const file of fileList) {
      try {
        const rawDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        if (autoCropOnUpload) {
          const cropRes = await autoCropDocumentImage(rawDataUrl, { sensitivity: 'medium' });
          if (cropRes.didCrop) {
            newAttachments.push({
              url: cropRes.url,
              originalUrl: rawDataUrl,
              width: 600,
              height: 270,
              cropped: true,
            });
          } else {
            newAttachments.push({
              url: rawDataUrl,
              originalUrl: rawDataUrl,
              width: 600,
              height: 270,
              cropped: false,
            });
          }
        } else {
          newAttachments.push({
            url: rawDataUrl,
            originalUrl: rawDataUrl,
            width: 600,
            height: 270,
            cropped: false,
          });
        }
      } catch (err) {
        console.error('Error processing attachment:', err);
      }
    }

    onChange({ ...data, attachments: [...(data.attachments || []), ...newAttachments] });
    setIsProcessingAttachments(false);
    e.target.value = '';
  };

  const handleAutoCropSingle = async (index: number) => {
    const att = data.attachments?.[index];
    if (!att) return;
    setSingleCropLoading(index);
    try {
      const base = att.originalUrl || att.url;
      const cropRes = await autoCropDocumentImage(base, { sensitivity: 'medium' });
      const newAttachments = [...(data.attachments || [])];
      if (cropRes.didCrop) {
        newAttachments[index] = {
          ...att,
          url: cropRes.url,
          originalUrl: base,
          cropped: true,
        };
      } else {
        alert('Tepi dokumen sudah optimal atau kontras background sudah pas.');
      }
      onChange({ ...data, attachments: newAttachments });
    } catch (e) {
      console.error(e);
    } finally {
      setSingleCropLoading(null);
    }
  };

  const handleRestoreOriginal = (index: number) => {
    const att = data.attachments?.[index];
    if (!att || !att.originalUrl) return;
    const newAttachments = [...(data.attachments || [])];
    newAttachments[index] = {
      ...att,
      url: att.originalUrl,
      cropped: false,
    };
    onChange({ ...data, attachments: newAttachments });
  };

  const resetAllAttachmentsToDefault = () => {
    if (!data.attachments || data.attachments.length === 0) return;
    const updated = data.attachments.map(att => ({ ...att, width: 600, height: 270 }));
    onChange({ ...data, attachments: updated });
  };

  const removeAttachment = (index: number) => {
    const newAttachments = [...(data.attachments || [])];
    newAttachments.splice(index, 1);
    onChange({ ...data, attachments: newAttachments });
  };

  const updateAttachmentDimension = (index: number, field: 'width' | 'height', value: number) => {
    const newAttachments = [...(data.attachments || [])];
    newAttachments[index] = { ...newAttachments[index], [field]: value };
    onChange({ ...data, attachments: newAttachments });
  };

  const [activeCategory, setActiveCategory] = useState<'semua' | 'tugas' | 'nasabah' | 'kop' | 'kendaraan'>('semua');

  const handleResetForm = () => {
    onChange({
      ...data,
      ...BLANK_LETTER_DATA,
      // Preserve current Kop settings so user's uploaded letterhead isn't lost
      kopImage: data.kopImage,
      kopImageHeight: data.kopImageHeight,
      kopImageFit: data.kopImageFit,
      kopImageAlign: data.kopImageAlign,
      kopImageOffsetY: data.kopImageOffsetY,
      kopImageOffsetX: data.kopImageOffsetX,
      kopImageMarginBottom: data.kopImageMarginBottom,
      kopCompanyName: data.kopCompanyName,
    });
  };

  const handleApplyContoh = () => {
    onChange({
      ...data,
      ...CONTOH_LETTER_DATA,
      kopImage: data.kopImage,
      kopImageHeight: data.kopImageHeight,
      kopImageFit: data.kopImageFit,
      kopImageAlign: data.kopImageAlign,
      kopImageOffsetY: data.kopImageOffsetY,
      kopImageOffsetX: data.kopImageOffsetX,
      kopImageMarginBottom: data.kopImageMarginBottom,
      kopCompanyName: data.kopCompanyName,
    });
  };

  const handleApplyContohPerorangan = () => {
    onChange({
      ...data,
      ...CONTOH_LETTER_PERORANGAN,
      kopImage: data.kopImage,
      kopImageHeight: data.kopImageHeight,
      kopImageFit: data.kopImageFit,
      kopImageAlign: data.kopImageAlign,
      kopImageOffsetY: data.kopImageOffsetY,
      kopImageOffsetX: data.kopImageOffsetX,
      kopImageMarginBottom: data.kopImageMarginBottom,
      kopCompanyName: data.kopCompanyName,
    });
  };

  // Dedicated Autofill Handler from Selected Debtor / Case in ARMS
  const handleApplyDebtorAutofill = () => {
    if (!armsStore) return;
    const targetCaseId = selectedCaseIdState || armsStore.cases?.[0]?.id;
    if (!targetCaseId) {
      alert('Pilih berkas debitur / kasus terlebih dahulu.');
      return;
    }

    const caseItem = armsStore.cases?.find(c => c.id === targetCaseId);
    if (!caseItem) return;
    const customer = armsStore.customers?.find(c => c.id === caseItem.customerId);
    const personnel = armsStore.personnel?.find(p => p.id === selectedPersonnelIdState) || armsStore.personnel?.[0];
    const client = armsStore.clients?.find(cl => cl.id === caseItem.clientId);

    const isPer = isPeroranganKuasa || caseItem.clientType === 'PERORANGAN';

    const formInput: GeneratorFormInput = {
      caseItem,
      customer,
      personnel,
      companyName: armsStore.settings?.companyName || data.kopCompanyName,
      companyAddress: armsStore.settings?.companyAddress,
      isPerorangan: isPer,
      krediturName: caseItem.clientName || client?.companyName,
      krediturAddress: client?.address,
      issuedDate: new Date().toISOString().split('T')[0],
      expiryDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    };

    const generated = buildLetterDataFromInput(formInput);

    onChange({
      ...data,
      ...generated,
      // Retain existing Kop image if available
      kopImage: data.kopImage || generated.kopImage,
      attachments: data.attachments?.length ? data.attachments : generated.attachments,
    });

    const debtorDisplayName = customer?.fullName || caseItem.debtorName || 'Debitur';
    setAutofillSuccessMessage(`Data debitur "${debtorDisplayName}" (${caseItem.caseNo}) berhasil diterapkan otomatis!`);
    setTimeout(() => setAutofillSuccessMessage(''), 4500);

    if (onAutofillFromCase) {
      onAutofillFromCase(targetCaseId, selectedPersonnelIdState, isPer);
    }
  };

  const sectionClass = "bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2.5";
  const headingClass = "text-xs font-bold text-slate-800 pb-1.5 border-b border-slate-100 uppercase tracking-wider flex items-center justify-between";
  const labelClass = "block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-0.5";
  const inputClass = "w-full px-2.5 py-1.5 border border-slate-300 bg-white rounded-lg focus:ring-1 focus:ring-[#5A5A40] focus:border-[#5A5A40] outline-none transition-all text-slate-800 placeholder:text-slate-400 text-xs shadow-2xs";

  return (
    <div className="space-y-2.5 pb-6">
      {/* ⚡ PANEL SINKRONISASI OTOMATIS DATA DEBITUR DARI DATABASE ARMS */}
      {armsStore && armsStore.cases && armsStore.cases.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-slate-50 p-3 rounded-xl border border-amber-300 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="p-1 bg-amber-600 text-white rounded-md">
                <Sparkles size={14} />
              </span>
              <div>
                <h3 className="text-xs font-bold text-slate-900 leading-tight">
                  Sinkronisasi Otomatis Data Debitur ARMS
                </h3>
                <p className="text-[10px] text-slate-600">
                  Pilih debitur & petugas lapangan untuk mengisi seluruh formulir secara instan
                </p>
              </div>
            </div>
            <span className="text-[9px] bg-amber-200 text-amber-900 font-extrabold px-2 py-0.5 rounded-full">
              {armsStore.cases.length} Debitur
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1 border-t border-amber-200/80">
            {/* 1. Pilih Debitur & Berkas Kasus */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <FolderKanban size={11} className="text-amber-700" />
                Pilih Berkas Kasus & Debitur:
              </label>
              <select
                value={selectedCaseIdState}
                onChange={(e) => {
                  setSelectedCaseIdState(e.target.value);
                  const selected = armsStore.cases?.find(c => c.id === e.target.value);
                  if (selected?.clientType === 'PERORANGAN') {
                    setIsPeroranganKuasa(true);
                  }
                }}
                className="w-full px-2.5 py-1.5 border border-amber-300 bg-white rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
              >
                <option value="">-- Pilih Debitur / Kasus Aktif --</option>
                {armsStore.cases.map((c) => {
                  const cust = armsStore.customers?.find(cu => cu.id === c.customerId);
                  const debtorName = cust?.fullName || c.debtorName || 'Tanpa Nama';
                  const client = c.clientName || 'Multi Finance';
                  const amount = cust?.totalInstallment ? `Rp ${cust.totalInstallment.toLocaleString('id-ID')}` : (c.principalDebtOS ? `Rp ${c.principalDebtOS.toLocaleString('id-ID')}` : '');
                  return (
                    <option key={c.id} value={c.id}>
                      {c.caseNo} • {debtorName} ({client}) {amount ? `• ${amount}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 2. Pilih Petugas Penerima Tugas (Kuasa Lapangan) */}
            <div>
              <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                <UserCheck size={11} className="text-amber-700" />
                Pilih Petugas Lapangan (Kuasa Penagihan):
              </label>
              <select
                value={selectedPersonnelIdState}
                onChange={(e) => setSelectedPersonnelIdState(e.target.value)}
                className="w-full px-2.5 py-1.5 border border-amber-300 bg-white rounded-lg text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-amber-500 outline-none shadow-2xs"
              >
                <option value="">-- Pilih Petugas Lapangan --</option>
                {armsStore.personnel?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} • {p.position || 'Petugas Penagihan'} ({p.phoneNumber || p.nikKtp || 'Terdaftar'})
                  </option>
                ))}
              </select>
            </div>

            {/* Action Button & Feedback */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleApplyDebtorAutofill}
                className="flex-1 py-2 px-3 bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white rounded-lg font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles size={13} />
                <span>Terapkan Data Debitur ke Formulir</span>
              </button>
            </div>

            {autofillSuccessMessage && (
              <div className="flex items-center gap-1.5 p-2 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-lg text-[11px] font-bold animate-in fade-in duration-200">
                <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                <span>{autofillSuccessMessage}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Category Navigation Bar for Quick Jump */}
      <div className="flex bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-semibold sticky top-0 z-10 shadow-xs backdrop-blur">
        <button
          type="button"
          onClick={() => setActiveCategory('semua')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer text-center ${
            activeCategory === 'semua' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Semua
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('tugas')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer text-center ${
            activeCategory === 'tugas' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Pihak
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('nasabah')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer text-center ${
            activeCategory === 'nasabah' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Debitur
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('kendaraan')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer text-center ${
            activeCategory === 'kendaraan' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Objek
        </button>
        <button
          type="button"
          onClick={() => setActiveCategory('kop')}
          className={`flex-1 py-1 px-1.5 rounded-md transition-all cursor-pointer text-center ${
            activeCategory === 'kop' ? 'bg-white text-slate-900 shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Kop
        </button>
      </div>

      {/* Preset & Reset Bar for Surat Tugas */}
      <div className="bg-slate-100/90 border border-slate-200/90 p-2.5 rounded-xl shadow-2xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
            <Sparkles size={13} className="text-[#5A5A40]" />
            <span>Preset & Contoh Cepat:</span>
          </div>
          <span className="text-[9.5px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
            Manual / Contoh
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={handleApplyContoh}
            className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-bold text-[10px] transition shadow-2xs cursor-pointer active:scale-95"
            title="Muat data contoh Surat Tugas leasing kendaraan"
          >
            <Sparkles size={11} className="text-[#5A5A40]" />
            <span>Contoh Leasing</span>
          </button>
          <button
            type="button"
            onClick={handleApplyContohPerorangan}
            className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold text-[10px] transition shadow-2xs cursor-pointer active:scale-95"
            title="Muat data contoh Surat Tugas penagihan perorangan (hutang piutang)"
          >
            <Sparkles size={11} className="text-amber-700" />
            <span>Perorangan</span>
          </button>
          <button
            type="button"
            id="btn-reset-form-kosong-surat-tugas"
            onClick={handleResetForm}
            className="flex items-center justify-center gap-1 py-1.5 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg font-bold text-[10px] transition shadow-2xs cursor-pointer active:scale-95"
            title="Kosongkan seluruh isian formulir Surat Tugas (Reset Bersih)"
          >
            <RotateCcw size={11} className="text-rose-600" />
            <span>Kosongkan</span>
          </button>
        </div>
      </div>

      {/* Switcher Jenis Penagihan */}
      <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">
          Jenis Penagihan:
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setIsPeroranganKuasa(false);
              onChange({ ...data, penagihanType: 'lembaga' });
            }}
            className={`py-1.5 px-2 rounded-lg font-bold text-xs transition border cursor-pointer text-center ${
              data.penagihanType !== 'perorangan'
                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            🏢 Lembaga / Leasing
          </button>
          <button
            type="button"
            onClick={() => {
              setIsPeroranganKuasa(true);
              onChange({ ...data, penagihanType: 'perorangan' });
            }}
            className={`py-1.5 px-2 rounded-lg font-bold text-xs transition border cursor-pointer text-center ${
              data.penagihanType === 'perorangan'
                ? 'bg-[#5A5A40] text-white border-[#5A5A40] shadow-xs'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            👤 Penagihan Perorangan
          </button>
        </div>
      </div>

      {/* 1. INFORMASI SURAT */}
      {(activeCategory === 'semua' || activeCategory === 'tugas') && (
        <section className={sectionClass}>
          <h2 className={headingClass}>
            <span>1. Informasi Surat</span>
          </h2>
          <div className="space-y-2.5">
            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className={labelClass}>No. Surat Tugas (Resmi)</label>
                <button
                  type="button"
                  onClick={handleGenerateLetterNumber}
                  className="text-[10px] text-[#5A5A40] hover:text-[#383826] font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <Sparkles size={10} />
                  <span>Auto No</span>
                </button>
              </div>
              <input
                type="text"
                name="letterNumber"
                value={data.letterNumber}
                onChange={handleChange}
                className={inputClass}
                placeholder="Contoh: 001/ST-MJI/28/IX/2026"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Berlaku Mulai</label>
                <input
                  type="date"
                  name="validFrom"
                  value={data.validFrom}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Berlaku Sampai</label>
                <input
                  type="date"
                  name="validTo"
                  value={data.validTo}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <label className={labelClass}>Tempat & Tanggal Surat TTD</label>
                <button
                  type="button"
                  onClick={() => onChange({ ...data, signPlaceDate: getTodaySignPlaceDate('Purwokerto') })}
                  className="text-[10px] text-[#5A5A40] hover:text-[#383826] font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
                >
                  <Calendar size={10} />
                  <span>Hari Ini</span>
                </button>
              </div>
              <input
                type="text"
                name="signPlaceDate"
                value={data.signPlaceDate}
                onChange={handleChange}
                className={inputClass}
                placeholder="Contoh: Purwokerto, 28 September 2026"
              />
            </div>
          </div>
        </section>
      )}

      {/* 2. KOP SURAT PERUSAHAAN */}
      {(activeCategory === 'semua' || activeCategory === 'kop') && (
        <section className={sectionClass}>
          <h2 className={headingClass}>
            <span>2. Pengaturan Kop Surat</span>
            {data.kopImage && (
              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
                Kop Aktif
              </span>
            )}
          </h2>

          <div className="space-y-2">
            <div>
              <label className={labelClass}>Unggah Gambar Kop Surat Resmi</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[#5A5A40] file:text-white hover:file:bg-[#383826] cursor-pointer"
              />
            </div>

            {data.kopImage && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">Penyesuaian Presisi Kop:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleSaveAsDefaultKop}
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Simpan pengaturan Kop ini sebagai default untuk dokumen berikutnya"
                    >
                      <Save size={10} />
                      <span>Simpan Kop</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRestoreSavedKop}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold flex items-center gap-1 border border-slate-200 cursor-pointer"
                      title="Pulihkan pengaturan Kop yang tersimpan"
                    >
                      <RotateCcw size={10} />
                      <span>Pulihkan</span>
                    </button>
                  </div>
                </div>

                {savedKopSuccess && (
                  <div className="p-1.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded text-[10px] font-bold flex items-center gap-1">
                    <Check size={11} />
                    <span>Pengaturan template Kop surat tersimpan di sistem!</span>
                  </div>
                )}

                <div className="space-y-1.5 bg-slate-50 p-2 rounded-lg border border-slate-200/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-600 font-semibold">Tinggi Kop:</span>
                    <span className="font-mono font-bold text-slate-800">{data.kopImageHeight} px</span>
                  </div>
                  <input
                    type="range"
                    name="kopImageHeight"
                    min={60}
                    max={250}
                    value={data.kopImageHeight}
                    onChange={handleChange}
                    className="w-full accent-[#5A5A40] h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600">
                        <span>Offset Vertikal (Y):</span>
                        <span className="font-mono font-bold">{data.kopImageOffsetY}px</span>
                      </div>
                      <input
                        type="range"
                        name="kopImageOffsetY"
                        min={-40}
                        max={60}
                        value={data.kopImageOffsetY}
                        onChange={handleChange}
                        className="w-full accent-[#5A5A40] h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-600">
                        <span>Jarak Bawah:</span>
                        <span className="font-mono font-bold">{data.kopImageMarginBottom}px</span>
                      </div>
                      <input
                        type="range"
                        name="kopImageMarginBottom"
                        min={0}
                        max={60}
                        value={data.kopImageMarginBottom}
                        onChange={handleChange}
                        className="w-full accent-[#5A5A40] h-1 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleResetKopPosition}
                      className="text-[10px] text-slate-500 hover:text-slate-800 font-semibold underline cursor-pointer"
                    >
                      Reset Posisi
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ ...data, kopImage: null })}
                      className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Hapus Kop
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className={labelClass}>Nama Badan Usaha / Perusahaan</label>
              <input
                type="text"
                name="kopCompanyName"
                value={data.kopCompanyName}
                onChange={handleChange}
                className={inputClass}
                placeholder="Contoh: PT. MITRA JASATRIA INDONESIA"
              />
            </div>
          </div>
        </section>
      )}

      {/* 3. PEMBERI TUGAS & PENERIMA TUGAS */}
      {(activeCategory === 'semua' || activeCategory === 'tugas') && (
        <section className={sectionClass}>
          <h2 className={headingClass}>
            <span>3. Identitas Pihak Surat</span>
          </h2>

          <div className="space-y-3">
            {/* Pemberi Tugas */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Building2 size={12} className="text-[#5A5A40]" />
                Pemberi Tugas (Manajemen Perusahaan):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Nama Pejabat Pemberi Tugas</label>
                  <input
                    type="text"
                    name="assignerName"
                    value={data.assignerName}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="FILEMO HALAWA"
                  />
                </div>
                <div>
                  <label className={labelClass}>Jabatan</label>
                  <input
                    type="text"
                    name="assignerPosition"
                    value={data.assignerPosition}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="DIREKTUR"
                  />
                </div>
              </div>
            </div>

            {/* Penerima Tugas (Kuasa Lapangan) */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <UserCheck size={12} className="text-[#5A5A40]" />
                Penerima Tugas (Kuasa Lapangan):
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Nama Petugas Lapangan</label>
                  <input
                    type="text"
                    name="assigneeName"
                    value={data.assigneeName}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Nama Lengkap Petugas"
                  />
                </div>
                <div>
                  <label className={labelClass}>Jabatan Petugas</label>
                  <input
                    type="text"
                    name="assigneePosition"
                    value={data.assigneePosition}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Petugas Penagihan"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>NIK Petugas (Opsional)</label>
                  <input
                    type="text"
                    name="assigneeNik"
                    value={data.assigneeNik || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="3302xxxxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className={labelClass}>No. HP Petugas (Opsional)</label>
                  <input
                    type="text"
                    name="assigneePhone"
                    value={data.assigneePhone || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>
            </div>

            {/* Klien / Kreditur */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <CreditCard size={12} className="text-[#5A5A40]" />
                {data.penagihanType === 'perorangan' ? 'Kreditur Perorangan (Pemberi Kuasa):' : 'Klien / Kreditur (Lembaga):'}
              </span>
              <div>
                <label className={labelClass}>
                  {data.penagihanType === 'perorangan' ? 'Nama Pemberi Kuasa Perorangan' : 'Nama Lembaga / Multifinance'}
                </label>
                <input
                  type="text"
                  name="clientName"
                  value={data.clientName}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder={data.penagihanType === 'perorangan' ? 'Nama Lengkap Kreditur Perorangan' : 'Contoh: PT. BFI Finance Indonesia'}
                />
              </div>

              {data.penagihanType === 'perorangan' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>NIK Kreditur Perorangan</label>
                    <input
                      type="text"
                      name="krediturPeroranganNik"
                      value={data.krediturPeroranganNik || ''}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="330xxxxxxxxxxxxx"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dasar Penagihan</label>
                    <input
                      type="text"
                      name="dasarPenagihan"
                      value={data.dasarPenagihan || ''}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Surat Kuasa Khusus / Perjanjian"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 4. DATA NASABAH / DEBITUR */}
      {(activeCategory === 'semua' || activeCategory === 'nasabah') && (
        <section className={sectionClass}>
          <h2 className={headingClass}>
            <span>4. Data Debitur / Nasabah</span>
          </h2>

          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>No. Kontrak / Perjanjian</label>
                <input
                  type="text"
                  name="customerContract"
                  value={data.customerContract}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="Contoh: 00730191"
                />
              </div>
              <div>
                <label className={labelClass}>Nama Debitur / Nasabah</label>
                <input
                  type="text"
                  name="customerName"
                  value={data.customerName}
                  onChange={handleChange}
                  className={`${inputClass} font-bold`}
                  placeholder="Nama Lengkap Debitur"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>NIK KTP Debitur</label>
                <input
                  type="text"
                  name="customerNik"
                  value={data.customerNik || ''}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="3302xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className={labelClass}>No. Telepon / HP Debitur</label>
                <input
                  type="text"
                  name="customerPhone"
                  value={data.customerPhone || ''}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder="08xxxxxxxxxx"
                />
              </div>
            </div>

            {/* Address Cascading Selector */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                <span>Rincian Alamat Debitur:</span>
                <span className="text-[9.5px] text-slate-500 font-normal">Kecamatan & Kelurahan Otomatis</span>
              </span>

              <div>
                <label className={labelClass}>Jalan / Dusun / RT / RW</label>
                <input
                  type="text"
                  name="customerAddressDetail"
                  value={data.customerAddressDetail || ''}
                  onChange={handleAddressChange}
                  className={inputClass}
                  placeholder="Contoh: Jl. Diponegoro No. 12"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>RT</label>
                  <input
                    type="text"
                    name="customerRt"
                    value={data.customerRt || ''}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="004"
                  />
                </div>
                <div>
                  <label className={labelClass}>RW</label>
                  <input
                    type="text"
                    name="customerRw"
                    value={data.customerRw || ''}
                    onChange={handleAddressChange}
                    className={inputClass}
                    placeholder="002"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={labelClass}>Kecamatan</label>
                  <select
                    name="customerKecamatan"
                    value={data.customerKecamatan || ''}
                    onChange={handleAddressChange}
                    className={inputClass}
                  >
                    <option value="">Pilih Kecamatan...</option>
                    {Object.entries(regionData).map(([kab, kecs]) => (
                      <optgroup key={kab} label={kab}>
                        {Object.keys(kecs).map((kec) => (
                          <option key={`${kab}|${kec}`} value={`${kab}|${kec}`}>
                            {kec} ({kab})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Kelurahan / Desa</label>
                  <select
                    name="customerKelurahan"
                    value={data.customerKelurahan || ''}
                    onChange={handleAddressChange}
                    className={inputClass}
                    disabled={!data.customerKecamatan}
                  >
                    <option value="">Pilih Kelurahan...</option>
                    {data.customerKabupaten && data.customerKecamatan && regionData[data.customerKabupaten]?.[data.customerKecamatan]?.map((kel) => (
                      <option key={kel} value={kel}>{kel}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClass}>Alamat Lengkap Terformat (Muncul di Surat)</label>
                <textarea
                  name="customerAddress"
                  value={data.customerAddress}
                  onChange={handleChange}
                  rows={2}
                  className={`${inputClass} text-[11px]`}
                  placeholder="Format otomatis atau edit manual di sini..."
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 5. BESARAN TAGIHAN & KONTRAK */}
      {(activeCategory === 'semua' || activeCategory === 'nasabah') && (
        <section className={sectionClass}>
          <h2 className={headingClass}>
            <span>5. Parameter Tagihan & Kontrak</span>
          </h2>

          <div className="space-y-2.5">
            <div>
              <label className={labelClass}>Tanggal Jatuh Tempo</label>
              <input
                type="text"
                name="customerDueDate"
                value={data.customerDueDate}
                onChange={handleDueDateChange}
                onBlur={handleDueDateBlur}
                className={inputClass}
                placeholder="Contoh: 02-Februari-2024 atau 2024-02-02"
              />
            </div>

            {data.penagihanType === 'perorangan' ? (
              /* Parameter Tagihan Perorangan */
              <div className="space-y-2 p-2.5 bg-amber-50/50 rounded-lg border border-amber-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Hutang Pokok</label>
                    <input
                      type="text"
                      name="besaranPokok"
                      value={data.besaranPokok || ''}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Rp 50.000.000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bunga / Denda / Biaya</label>
                    <input
                      type="text"
                      name="besaranBungaDenda"
                      value={data.besaranBungaDenda || ''}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Rp 5.000.000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Total Kewajiban Tagihan</label>
                    <input
                      type="text"
                      name="totalTagihan"
                      value={data.totalTagihan || ''}
                      onChange={handleChange}
                      className={`${inputClass} font-bold text-slate-900 border-amber-300 focus:ring-amber-500`}
                      placeholder="Rp 55.000.000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Terbilang (Otomatis)</label>
                    <input
                      type="text"
                      name="terbilangTagihan"
                      value={data.terbilangTagihan || ''}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Lima Puluh Lima Juta Rupiah"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Kronologi & Duduk Perkara Singkat</label>
                  <textarea
                    name="kronologi"
                    value={data.kronologi || ''}
                    onChange={handleChange}
                    rows={3}
                    className={`${inputClass} text-[11px]`}
                    placeholder="Tuliskan kronologi terjadinya hutang piutang, tanggal kesepakatan, dan alasan penagihan..."
                  />
                </div>
              </div>
            ) : (
              /* Parameter Tagihan Lembaga / Multifinance */
              <div className="space-y-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelClass}>Angsuran per Bulan</label>
                    <input
                      type="text"
                      name="customerInstallment"
                      value={data.customerInstallment}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Rp 1.500.000"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Total Angsuran</label>
                    <input
                      type="text"
                      name="customerTotalInstallment"
                      value={data.customerTotalInstallment}
                      onChange={handleChange}
                      className={inputClass}
                      placeholder="Rp 15.000.000"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Denda</label>
                  <input
                    type="text"
                    name="customerPenalty"
                    value={data.customerPenalty}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder="Rp 500.000"
                  />
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 6. DATA KENDARAAN / OBJEK */}
      {(activeCategory === 'semua' || activeCategory === 'kendaraan') && (
        <section className={sectionClass}>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Car size={13} className="text-[#5A5A40]" />
              <span>6. Data Objek Kendaraan</span>
            </h2>
            <button
              type="button"
              onClick={() => {
                onChange({
                  ...data,
                  vehicleBrand: '',
                  vehicleBrandMake: '',
                  vehicleBrandModel: '',
                  vehiclePlate: '',
                  vehicleChassisNo: '',
                  vehicleEngineNo: '',
                  vehicleYear: '',
                  vehicleColor: '',
                });
              }}
              className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
            >
              Kosongkan Objek
            </button>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className={labelClass}>Merk Kendaraan</label>
              <select
                value={currentMake}
                onChange={handleVehicleMakeChange}
                className={inputClass}
              >
                <option value="">Pilih Merk Kendaraan...</option>
                {VEHICLE_BRAND_GROUPS.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.brands.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </optgroup>
                ))}
                <option value="LAINNYA">Lainnya / Manual</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Tipe / Model Kendaraan</label>
              <input
                type="text"
                value={currentModel}
                onChange={handleVehicleModelChange}
                className={inputClass}
                placeholder="Contoh: VARIO 150 / AVANZA VELOZ"
              />
            </div>

            {/* Quick Chips for Popular Models */}
            {currentMake && POPULAR_VEHICLE_MODELS[currentMake] && (
              <div className="flex flex-wrap gap-1 pt-0.5">
                {POPULAR_VEHICLE_MODELS[currentMake].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      const combined = `${currentMake} / ${m}`;
                      onChange({
                        ...data,
                        vehicleBrandMake: currentMake,
                        vehicleBrandModel: m,
                        vehicleBrand: combined,
                      });
                    }}
                    className={`text-[9.5px] px-2 py-0.5 rounded-full border transition cursor-pointer ${
                      currentModel.toUpperCase() === m.toUpperCase()
                        ? 'bg-[#5A5A40] text-white border-[#5A5A40]'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>Nomor Polisi (Plat)</label>
                <input
                  type="text"
                  name="vehiclePlate"
                  value={data.vehiclePlate}
                  onChange={handleChange}
                  className={`${inputClass} font-mono font-bold uppercase`}
                  placeholder="R-1234-XX"
                />
              </div>
              <div>
                <label className={labelClass}>Tahun / Warna</label>
                <input
                  type="text"
                  value={[data.vehicleYear, data.vehicleColor].filter(Boolean).join(' / ')}
                  onChange={(e) => {
                    const parts = e.target.value.split('/');
                    onChange({
                      ...data,
                      vehicleYear: parts[0]?.trim() || '',
                      vehicleColor: parts[1]?.trim() || '',
                    });
                  }}
                  className={inputClass}
                  placeholder="Contoh: 2022 / Hitam Metalik"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className={labelClass}>No. Rangka</label>
                <input
                  type="text"
                  name="vehicleChassisNo"
                  value={data.vehicleChassisNo || ''}
                  onChange={handleChange}
                  className={`${inputClass} font-mono text-[11px]`}
                  placeholder="MH3xxxxxxxxxxxx"
                />
              </div>
              <div>
                <label className={labelClass}>No. Mesin</label>
                <input
                  type="text"
                  name="vehicleEngineNo"
                  value={data.vehicleEngineNo || ''}
                  onChange={handleChange}
                  className={`${inputClass} font-mono text-[11px]`}
                  placeholder="G3Exxxxxxxxxxxx"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 7. LAMPIRAN FOTO DOKUMEN DENGAN AUTO-CROP & MANUAL CROP */}
      {(activeCategory === 'semua' || activeCategory === 'kendaraan') && (
        <section className={sectionClass}>
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <ImageIcon size={13} className="text-[#5A5A40]" />
              <span>7. Lampiran Foto Dokumen</span>
            </h2>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-600 font-semibold flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCropOnUpload}
                  onChange={(e) => setAutoCropOnUpload(e.target.checked)}
                  className="rounded text-[#5A5A40] focus:ring-[#5A5A40]"
                />
                <span>Auto-Crop</span>
              </label>
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <label className={labelClass}>Tambah Lampiran Foto (KTP, STNK, Unit Kendaraan)</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleAttachmentUpload}
                disabled={isProcessingAttachments}
                className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-[#5A5A40] file:text-white hover:file:bg-[#383826] cursor-pointer"
              />
            </div>

            {isProcessingAttachments && (
              <div className="p-2 bg-slate-100 rounded-lg flex items-center gap-2 text-xs text-slate-700">
                <Loader2 size={14} className="animate-spin text-[#5A5A40]" />
                <span>Memproses dan mendeteksi tepi dokumen...</span>
              </div>
            )}

            {data.attachments && data.attachments.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    Daftar Lampiran ({data.attachments.length}):
                  </span>
                  <button
                    type="button"
                    onClick={resetAllAttachmentsToDefault}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline cursor-pointer"
                  >
                    Reset Dimensi Semua
                  </button>
                </div>

                {data.attachments.map((att, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Lampiran #{idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleAutoCropSingle(idx)}
                          disabled={singleCropLoading === idx}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Auto-crop dokumen"
                        >
                          {singleCropLoading === idx ? <Loader2 size={10} className="animate-spin" /> : <Scissors size={10} />}
                          <span>Auto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveCropIndex(idx)}
                          className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                          title="Potong manual"
                        >
                          <SlidersHorizontal size={10} />
                          <span>Crop</span>
                        </button>
                        {att.cropped && att.originalUrl && (
                          <button
                            type="button"
                            onClick={() => handleRestoreOriginal(idx)}
                            className="px-2 py-0.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                            title="Kembalikan foto asli"
                          >
                            <Undo2 size={10} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <img
                        src={att.url}
                        alt={`Lampiran ${idx + 1}`}
                        className="w-16 h-12 object-contain bg-white border border-slate-200 rounded shadow-2xs"
                      />
                      <div className="flex-1 grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <label className="text-slate-500 font-semibold block mb-0.5">Lebar (px)</label>
                          <input
                            type="number"
                            value={att.width || 600}
                            onChange={(e) => updateAttachmentDimension(idx, 'width', parseInt(e.target.value, 10) || 600)}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-slate-500 font-semibold block mb-0.5">Tinggi (px)</label>
                          <input
                            type="number"
                            value={att.height || 270}
                            onChange={(e) => updateAttachmentDimension(idx, 'height', parseInt(e.target.value, 10) || 270)}
                            className="w-full px-1.5 py-1 border border-slate-300 rounded text-xs bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Image Crop Modal */}
      {activeCropIndex !== null && data.attachments?.[activeCropIndex] && (
        <ImageCropModal
          isOpen={true}
          onClose={() => setActiveCropIndex(null)}
          imageUrl={data.attachments[activeCropIndex].url}
          originalUrl={data.attachments[activeCropIndex].originalUrl}
          onSaveCrop={(croppedUrl) => {
            const newAttachments = [...(data.attachments || [])];
            newAttachments[activeCropIndex] = {
              ...newAttachments[activeCropIndex],
              url: croppedUrl,
              originalUrl: newAttachments[activeCropIndex].originalUrl || newAttachments[activeCropIndex].url,
              cropped: true,
            };
            onChange({ ...data, attachments: newAttachments });
            setActiveCropIndex(null);
          }}
          onRestoreOriginal={() => {
            handleRestoreOriginal(activeCropIndex);
            setActiveCropIndex(null);
          }}
        />
      )}
    </div>
  );
}
