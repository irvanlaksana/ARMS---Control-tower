import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { AmountInput } from './AmountInput';
import type { ManualFeeItem, ManualFeeTotals } from '../../utils/tierFeeCalculator';

/**
 * Editor "Biaya Tambahan Manual" — tombol "+" untuk menambah biaya di luar
 * kalkulasi otomatis (tier engine / fee tiering).
 *
 * Perilakunya identik dengan blok "Tambah Biaya" pada modul Debtor Payments &
 * Fee Collections (`PaymentsModule`): tiap baris punya nama biaya, nominal, dan
 * alokasi (100% Hak Perusahaan atau Split dengan Mitra), plus tombol hapus.
 */

export interface ManualFeeEditorProps {
  items: ManualFeeItem[];
  onChange: (items: ManualFeeItem[]) => void;
  totals: ManualFeeTotals;
  /** Skema warna mengikuti modul induk. */
  accent?: 'indigo' | 'rose' | 'emerald';
  title?: string;
  description?: string;
  addLabel?: string;
  disabled?: boolean;
}

const ACCENTS: Record<
  NonNullable<ManualFeeEditorProps['accent']>,
  { button: string; border: string; focus: string }
> = {
  indigo: {
    button: 'border-indigo-700 bg-indigo-950/70 text-indigo-200 hover:bg-indigo-900',
    border: 'border-slate-800',
    focus: 'focus:border-indigo-500',
  },
  rose: {
    button: 'border-rose-700 bg-rose-950/70 text-rose-200 hover:bg-rose-900',
    border: 'border-rose-900/50',
    focus: 'focus:border-rose-500',
  },
  emerald: {
    button: 'border-emerald-700 bg-emerald-950/70 text-emerald-200 hover:bg-emerald-900',
    border: 'border-emerald-900/50',
    focus: 'focus:border-emerald-500',
  },
};

export const ManualFeeEditor: React.FC<ManualFeeEditorProps> = ({
  items,
  onChange,
  totals,
  accent = 'indigo',
  title = 'Biaya Tambahan Manual',
  description = 'Tambahkan biaya di luar kalkulasi otomatis.',
  addLabel = 'Tambah Biaya',
  disabled = false,
}) => {
  const palette = ACCENTS[accent] || ACCENTS.indigo;

  const addItem = () => {
    if (disabled) return;
    onChange([...items, { name: '', amount: 0, allocation: 'COMPANY' }]);
  };

  const updateItem = (index: number, patch: Partial<ManualFeeItem>) => {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <div className={`border-t ${palette.border} pt-2 space-y-1.5`}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <h4 className="text-xs font-bold text-slate-200">{title}</h4>
          <p className="text-[10px] text-slate-500">{description}</p>
        </div>
        <button
          type="button"
          onClick={addItem}
          disabled={disabled}
          title={addLabel}
          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${palette.button}`}
        >
          <Plus className="h-3 w-3" /> {addLabel}
        </button>
      </div>

      {items.length === 0 && (
        <p className="text-[10px] text-slate-600">
          Belum ada biaya tambahan. Klik <span className="font-semibold text-slate-400">+ {addLabel}</span> untuk
          menambahkan biaya di luar perhitungan otomatis.
        </p>
      )}

      {items.map((item, index) => (
        <div
          key={index}
          className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-slate-950/70 p-2 sm:grid-cols-[1fr_130px_145px_auto]"
        >
          <input
            value={item.name}
            disabled={disabled}
            onChange={(e) => updateItem(index, { name: e.target.value })}
            placeholder="Nama biaya, contoh: Biaya Tarik"
            className={`rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-white placeholder:text-slate-600 focus:outline-none ${palette.focus}`}
          />
          <AmountInput
            value={item.amount}
            readOnly={disabled}
            onChange={(amount) => updateItem(index, { amount })}
            className={`w-full rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-xs text-emerald-300 focus:outline-none ${palette.focus}`}
          />
          <select
            value={item.allocation === 'SPLIT' ? 'SPLIT' : 'COMPANY'}
            disabled={disabled}
            onChange={(e) => updateItem(index, { allocation: e.target.value as 'COMPANY' | 'SPLIT' })}
            className={`rounded-lg border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none ${palette.focus}`}
          >
            <option value="COMPANY">100% Hak Perusahaan</option>
            <option value="SPLIT">Split dengan Mitra</option>
          </select>
          <button
            type="button"
            onClick={() => removeItem(index)}
            disabled={disabled}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-950/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            title="Hapus biaya"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {totals.total > 0 && (
        <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-400 sm:grid-cols-3">
          <span>
            Tambahan: <b className="text-white">Rp {totals.total.toLocaleString('id-ID')}</b>
          </span>
          <span>
            Perusahaan: <b className="text-emerald-400">Rp {totals.company.toLocaleString('id-ID')}</b>
          </span>
          <span>
            Mitra: <b className="text-amber-400">Rp {totals.partner.toLocaleString('id-ID')}</b>
          </span>
        </div>
      )}
    </div>
  );
};

export default ManualFeeEditor;
