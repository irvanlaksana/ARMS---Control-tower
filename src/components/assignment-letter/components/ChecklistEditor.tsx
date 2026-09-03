import { useState } from "react";
import type { CheckState, ChecklistEntry, ChecklistMap, VehicleType } from "../types";
import { PERLENGKAPAN } from "../data/perlengkapan";

interface Props {
  jenis: VehicleType;
  checklist: ChecklistMap;
  onChange: (next: ChecklistMap) => void;
}

const blank = (): ChecklistEntry => ({ p1: "", k1: "", p2: "", k2: "" });

const pill = (active: boolean, tone: "ok" | "no") =>
  `h-5 w-6 rounded text-[9.5px] font-bold leading-none transition ${
    active
      ? tone === "ok"
        ? "bg-emerald-500 text-white"
        : "bg-rose-500 text-white"
      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
  }`;

export default function ChecklistEditor({ jenis, checklist, onChange }: Props) {
  const cfg = PERLENGKAPAN[jenis];
  const items = [...cfg.left, ...cfg.right];
  const [note, setNote] = useState<string | null>(null);

  const set = (item: string, patch: Partial<ChecklistEntry>) =>
    onChange({ ...checklist, [item]: { ...(checklist[item] ?? blank()), ...patch } });

  const bulk = (value: CheckState) => {
    const next: ChecklistMap = {};
    for (const item of items) {
      next[item] = { ...(checklist[item] ?? blank()), p1: value, p2: value };
    }
    onChange(next);
  };

  const toggle = (item: string, field: "p1" | "p2", value: CheckState) => {
    const cur = checklist[item]?.[field] ?? "";
    const v: CheckState = cur === value ? "" : value;
    set(item, field === "p1" ? { p1: v } : { p2: v });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => bulk("A")}
          className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100"
        >
          Semua Ada
        </button>
        <button
          onClick={() => bulk("")}
          className="rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-200"
        >
          Kosongkan
        </button>
        <span className="ml-auto text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">
          Pihak I · Pihak II
        </span>
      </div>

      <div className="thin-scroll max-h-[300px] divide-y divide-slate-100 overflow-y-auto rounded-md border border-slate-100">
        {items.map((item) => {
          const e = checklist[item] ?? blank();
          const open = note === item;
          return (
            <div key={item} className="px-1.5 py-1">
              <div className="flex items-center gap-1.5">
                <span className="flex-1 truncate text-[11.5px] text-slate-700" title={item}>
                  {item}
                </span>
                <div className="flex gap-0.5">
                  <button className={pill(e.p1 === "A", "ok")} onClick={() => toggle(item, "p1", "A")}>
                    A
                  </button>
                  <button className={pill(e.p1 === "TA", "no")} onClick={() => toggle(item, "p1", "TA")}>
                    TA
                  </button>
                </div>
                <span className="text-slate-200">|</span>
                <div className="flex gap-0.5">
                  <button className={pill(e.p2 === "A", "ok")} onClick={() => toggle(item, "p2", "A")}>
                    A
                  </button>
                  <button className={pill(e.p2 === "TA", "no")} onClick={() => toggle(item, "p2", "TA")}>
                    TA
                  </button>
                </div>
                <button
                  title="Keterangan"
                  onClick={() => setNote(open ? null : item)}
                  className={`w-4 text-[11px] ${
                    e.k1 || e.k2 ? "text-amber-500" : "text-slate-300 hover:text-slate-500"
                  }`}
                >
                  ✎
                </button>
              </div>
              {open && (
                <div className="mt-1 flex gap-1 pb-1">
                  <input
                    value={e.k1}
                    onChange={(ev) => set(item, { k1: ev.target.value })}
                    placeholder="Ket. I"
                    className="w-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10.5px] outline-none focus:border-indigo-400"
                  />
                  <input
                    value={e.k2}
                    onChange={(ev) => set(item, { k2: ev.target.value })}
                    placeholder="Ket. II"
                    className="w-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10.5px] outline-none focus:border-indigo-400"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
