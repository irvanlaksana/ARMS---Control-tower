import React, { useMemo, useState } from 'react';

interface AddressFieldsProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  compact?: boolean;
}

const districtsByRegency: Record<string, string[]> = {
  'Kabupaten Banyumas': ['Banyumas', 'Baturraden', 'Cilongok', 'Kembaran', 'Purwokerto Selatan', 'Purwokerto Utara', 'Sokaraja', 'Wangon'],
  'Kabupaten Purbalingga': ['Bobotsari', 'Kalimanah', 'Purbalingga', 'Bukateja'],
  'Kabupaten Cilacap': ['Cilacap Selatan', 'Cilacap Tengah', 'Cilacap Utara', 'Majenang'],
  'Kabupaten Kebumen': ['Kebumen', 'Gombong', 'Prembun'],
  'Kabupaten Banjarnegara': ['Banjarnegara', 'Klampok', 'Wanadadi'],
};

const regencies = Object.keys(districtsByRegency);

const parseAddress = (value: string) => {
  const parts = (value || '').split(',').map((part) => part.trim()).filter(Boolean);
  const regencyIndex = parts.findIndex((part) => regencies.includes(part));
  const regency = regencyIndex >= 0 ? parts[regencyIndex] : '';
  const districtIndex = parts.findIndex((part) => part.startsWith('Kec. '));
  const villageIndex = parts.findIndex((part) => part.startsWith('Kel. '));
  const detailParts = parts.filter((_, index) => index !== regencyIndex && index !== districtIndex && index !== villageIndex);

  return {
    detail: detailParts.join(', '),
    regency,
    district: districtIndex >= 0 ? parts[districtIndex].replace(/^Kec\.\s*/, '') : '',
    village: villageIndex >= 0 ? parts[villageIndex].replace(/^Kel\.\s*/, '') : '',
  };
};

export const AddressFields: React.FC<AddressFieldsProps> = ({
  value,
  onChange,
  label = 'Alamat',
  required = false,
  compact = false,
}) => {
  const parsedAddress = useMemo(() => parseAddress(value), [value]);
  const [detail, setDetail] = useState(parsedAddress.detail);
  const [regency, setRegency] = useState(parsedAddress.regency);
  const [district, setDistrict] = useState(parsedAddress.district);
  const [village, setVillage] = useState(parsedAddress.village);

  const districtOptions = useMemo(() => districtsByRegency[regency] || [], [regency]);

  const updateAddress = (next: Partial<{ detail: string; regency: string; district: string; village: string }>) => {
    const nextState = {
      detail: next.detail ?? detail,
      regency: next.regency ?? regency,
      district: next.district ?? district,
      village: next.village ?? village,
    };
    setDetail(nextState.detail);
    setRegency(nextState.regency);
    setDistrict(nextState.district);
    setVillage(nextState.village);
    onChange([
      nextState.detail.trim(),
      nextState.village && `Kel. ${nextState.village}`,
      nextState.district && `Kec. ${nextState.district}`,
      nextState.regency,
    ].filter(Boolean).join(', '));
  };

  const fieldClass = `w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white ${compact ? 'py-2' : ''}`;

  return (
    <div className="md:col-span-2 space-y-2">
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={regency}
          required={required}
          onChange={(event) => updateAddress({ regency: event.target.value, district: '', village: '' })}
          className={fieldClass}
        >
          <option value="">Pilih Kabupaten/Kota</option>
          {regencies.map((item) => <option key={item} value={item}>{item}</option>)}
          <option value="Lainnya">Lainnya</option>
        </select>
        <select
          value={district}
          required={required}
          disabled={!regency || regency === 'Lainnya'}
          onChange={(event) => updateAddress({ district: event.target.value, village: '' })}
          className={fieldClass}
        >
          <option value="">Pilih Kecamatan</option>
          {districtOptions.map((item) => <option key={item} value={item}>{item}</option>)}
          {regency && <option value="Lainnya">Lainnya</option>}
        </select>
        <input
          type="text"
          value={village}
          required={required}
          onChange={(event) => updateAddress({ village: event.target.value })}
          placeholder="Kelurahan / Desa"
          className={fieldClass}
        />
      </div>
      <textarea
        value={detail}
        required={required}
        onChange={(event) => updateAddress({ detail: event.target.value })}
        placeholder="Alamat lengkap (jalan, nomor rumah, RT/RW, kode pos)"
        rows={compact ? 2 : 3}
        className={fieldClass}
      />
    </div>
  );
};
