import { useRef } from "react";
import type { KopAlign, KopSurat } from "../types";
import { Check, Segmented } from "./ui";

interface Props {
  kop: KopSurat;
  onChange: (k: KopSurat) => void;
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "mm",
  onChange,
  onReset,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className="ml-auto text-[10.5px] font-semibold tabular-nums text-slate-600">
          {value}
          {unit}
        </span>
        <button
          onClick={onReset}
          title="Reset"
          className="text-[10px] text-slate-300 hover:text-slate-500"
        >
          ↺
        </button>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(1)))}
          className="h-5 w-5 shrink-0 rounded bg-slate-100 text-[12px] leading-none text-slate-600 hover:bg-slate-200"
        >
          −
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(+e.target.value)}
          className="h-1 flex-1 accent-indigo-600"
        />
        <button
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(1)))}
          className="h-5 w-5 shrink-0 rounded bg-slate-100 text-[12px] leading-none text-slate-600 hover:bg-slate-200"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function KopEditor({ kop, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<KopSurat>) => onChange({ ...kop, ...patch });

  const pick = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => set({ image: String(reader.result) });
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      {/* upload area */}
      {kop.image ? (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-1.5">
          <img
            src={kop.image}
            alt="Kop"
            className="mx-auto max-h-16 w-auto object-contain"
          />
          <div className="mt-1.5 flex gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 hover:text-slate-900"
            >
              Ganti
            </button>
            <button
              onClick={() => set({ image: "" })}
              className="flex-1 rounded bg-white px-2 py-1 text-[11px] font-medium text-rose-500 ring-1 ring-slate-200 hover:bg-rose-50"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0]);
          }}
          className="flex w-full flex-col items-center gap-0.5 rounded-md border border-dashed border-slate-300 bg-slate-50 py-3 text-slate-400 transition hover:border-indigo-400 hover:text-indigo-500"
        >
          <span className="text-lg leading-none">🖼️</span>
          <span className="text-[11px] font-medium">Upload Kop Surat</span>
          <span className="text-[9.5px]">klik / seret gambar (PNG, JPG)</span>
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      {kop.image && (
        <>
          <Slider
            label="Ukuran (lebar)"
            value={kop.width}
            min={40}
            max={190}
            onChange={(v) => set({ width: v })}
            onReset={() => set({ width: 170 })}
          />
          <Slider
            label="Geser Kanan / Kiri"
            value={kop.offsetX}
            min={-40}
            max={40}
            onChange={(v) => set({ offsetX: v })}
            onReset={() => set({ offsetX: 0 })}
          />
          <Slider
            label="Geser Atas / Bawah"
            value={kop.offsetY}
            min={-20}
            max={40}
            onChange={(v) => set({ offsetY: v })}
            onReset={() => set({ offsetY: 0 })}
          />

          <div>
            <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Perataan
            </span>
            <Segmented<KopAlign>
              value={kop.align}
              onChange={(v) => set({ align: v })}
              options={[
                { value: "left", label: "⬅ Kiri" },
                { value: "center", label: "↔ Tengah" },
                { value: "right", label: "Kanan ➡" },
              ]}
            />
          </div>

          <div className="pt-0.5">
            <Check checked={kop.garis} onChange={(v) => set({ garis: v })}>
              Garis pemisah di bawah kop
            </Check>
            <Check
              checked={kop.semuaHalaman}
              onChange={(v) => set({ semuaHalaman: v })}
            >
              Tampilkan kop di halaman 2
            </Check>
          </div>
        </>
      )}

      {/* ---------- POSISI ISI SURAT ---------- */}
      <div className="rounded-md border border-indigo-100 bg-indigo-50/50 p-2">
        <div className="mb-1 flex items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">
            Posisi Isi Surat
          </span>
          <span className="ml-auto text-[9.5px] text-slate-400">
            menyesuaikan kop
          </span>
        </div>

        <div className="mb-1.5 grid grid-cols-2 gap-1">
          <button
            onClick={() => set({ kontenY: Math.max(-60, kop.kontenY - 2) })}
            className="rounded bg-white py-1 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-100"
          >
            ↑ Naikkan
          </button>
          <button
            onClick={() => set({ kontenY: Math.min(60, kop.kontenY + 2) })}
            className="rounded bg-white py-1 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-200 hover:bg-indigo-100"
          >
            ↓ Turunkan
          </button>
        </div>

        <Slider
          label="Halaman 1"
          value={kop.kontenY}
          min={-60}
          max={60}
          onChange={(v) => set({ kontenY: v })}
          onReset={() => set({ kontenY: 0 })}
        />
        <div className="mt-1">
          <Slider
            label="Halaman 2"
            value={kop.kontenY2}
            min={-40}
            max={60}
            onChange={(v) => set({ kontenY2: v })}
            onReset={() => set({ kontenY2: 0 })}
          />
        </div>

        <div className="mt-1.5 flex gap-1">
          <button
            onClick={() => set({ kontenY: -12, kontenY2: 0 })}
            className="flex-1 rounded bg-white py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 hover:text-indigo-600"
          >
            Rapat ke kop
          </button>
          <button
            onClick={() => set({ kontenY: 0, kontenY2: 0 })}
            className="flex-1 rounded bg-white py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 hover:text-indigo-600"
          >
            ↺ Normal
          </button>
        </div>
      </div>
    </div>
  );
}
