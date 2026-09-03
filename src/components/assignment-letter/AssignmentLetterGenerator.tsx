import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { BastData, ChecklistMap, VehicleType } from "./types";
import { BLANK_DATA, syncChecklist } from "./data/defaults";
import FormPanel from "./components/FormPanel";
import SuratPenyerahan from "./components/SuratPenyerahan";
import BastSheet from "./components/BastSheet";
import { SuratTugasHal1, SuratTugasHal2 } from "./components/SuratTugas";
import PreviewStage, { PageCard } from "./components/PreviewStage";
import { Btn } from "./components/ui";

const PAPER_W = 215 * (96 / 25.4);
const PAPER_H = 330 * (96 / 25.4);

interface Props {
  initialData: BastData;
  isPersonal: boolean;
  onClose: () => void;
  onSave: (data: BastData) => void;
}

export default function AssignmentLetterGenerator({ initialData, isPersonal, onClose, onSave }: Props) {
  const [data, setData] = useState<BastData>(() => ({
    ...BLANK_DATA,
    ...initialData,
    kop: { ...BLANK_DATA.kop, ...initialData.kop },
    st: { ...BLANK_DATA.st, ...initialData.st },
    checklist: syncChecklist(initialData.jenis, initialData.checklist),
  }));
  const [pageMode, setPageMode] = useState<"both" | "bast" | "penyerahan" | "tugas">(
    isPersonal ? "tugas" : "both",
  );
  const [zoom, setZoom] = useState(0.7);
  const [fitMode, setFitMode] = useState<"width" | "page" | "manual">("width");
  const viewportRef = useRef<HTMLDivElement>(null);

  const set = useCallback(
    <K extends keyof BastData>(key: K, value: BastData[K]) =>
      setData((current) => {
        if (key === "noBast" || key === "noSuratTugas") {
          const number = value as string;
          return { ...current, noBast: number, noSuratTugas: number, st: { ...current.st, nomor: number } };
        }
        if (key === "st") {
          const st = value as BastData["st"];
          return { ...current, st, noBast: st.nomor, noSuratTugas: st.nomor };
        }
        return { ...current, [key]: value };
      }),
    [],
  );
  const setJenis = useCallback(
    (jenis: VehicleType) =>
      setData((current) => ({ ...current, jenis, checklist: syncChecklist(jenis, current.checklist) })),
    [],
  );
  const setChecklist = useCallback((checklist: ChecklistMap) => setData((current) => ({ ...current, checklist })), []);

  const fit = useCallback(
    (mode: "width" | "page") => {
      const element = viewportRef.current;
      if (!element) return;
      const width = element.clientWidth - 56;
      const height = element.clientHeight - 84;
      const nextZoom = mode === "width" ? width / PAPER_W : Math.min(width / PAPER_W, height / PAPER_H);
      setZoom(Math.min(1.6, Math.max(0.2, +nextZoom.toFixed(3))));
    },
    [],
  );

  useLayoutEffect(() => {
    if (fitMode === "manual") return;
    fit(fitMode);
    const element = viewportRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => fit(fitMode));
    observer.observe(element);
    return () => observer.disconnect();
  }, [fitMode, fit]);

  const showTugas = pageMode === "both" || pageMode === "tugas";
  const showPenyerahan = !isPersonal && (pageMode === "both" || pageMode === "penyerahan");
  const showBast = pageMode === "both" || pageMode === "bast";
  const pageCount = (showTugas ? 2 : 0) + (showPenyerahan ? 1 : 0) + (showBast ? 1 : 0);
  let pageNo = 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[#e7eaf0]">
      <div className="no-print flex items-center justify-between border-b border-slate-300 bg-white px-4 py-2">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Generator Surat Penugasan Lapangan</h2>
          <p className="text-[11px] text-slate-500">{isPersonal ? "Debitur perorangan · Surat Penyerahan tidak digunakan" : "Debitur perusahaan"}</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="primary" onClick={() => onSave(data)}>Simpan Surat</Btn>
          <Btn variant="primary" onClick={() => window.print()}>🖨️ Cetak / Simpan PDF</Btn>
          <Btn onClick={onClose}>Tutup</Btn>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="no-print thin-scroll w-[350px] shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
          <FormPanel data={data} set={set} setJenis={setJenis} setChecklist={setChecklist} />
        </aside>
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="no-print flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-100 px-3 py-2">
            <div className="flex gap-1 rounded-lg bg-white p-1">
              {([["both", "Semua"], ["tugas", "Surat Tugas"], ...(isPersonal ? [] : [["penyerahan", "Penyerahan"] as const]), ["bast", "BAST"]] as const).map(([value, label]) => (
                <button key={value} onClick={() => setPageMode(value)} className={`rounded px-2.5 py-1 text-[11px] ${pageMode === value ? "bg-slate-900 text-white" : "text-slate-600"}`}>
                  {label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-slate-500">{pageCount} halaman</span>
            <div className="ml-auto flex gap-1">
              <button className="rounded bg-white px-2 py-1 text-xs" onClick={() => { setFitMode("manual"); setZoom((value) => Math.max(0.2, value - 0.1)); }}>−</button>
              <span className="rounded bg-white px-2 py-1 text-xs">{Math.round(zoom * 100)}%</span>
              <button className="rounded bg-white px-2 py-1 text-xs" onClick={() => { setFitMode("manual"); setZoom((value) => Math.min(1.6, value + 0.1)); }}>+</button>
              <button className="rounded bg-white px-2 py-1 text-xs" onClick={() => { setFitMode("width"); fit("width"); }}>Lebar</button>
            </div>
          </div>
          <div ref={viewportRef} className="print-scroll thin-scroll flex-1 overflow-auto p-7">
            <div className="print-root">
              <PreviewStage zoom={zoom}>
                <div className="page-list flex flex-col items-center gap-8">
                  {showTugas && <><PageCard label={`Halaman ${++pageNo}`} badge="Surat Tugas — Hal. 1"><SuratTugasHal1 data={data} /></PageCard><PageCard label={`Halaman ${++pageNo}`} badge="Surat Tugas — Hal. 2"><SuratTugasHal2 data={data} /></PageCard></>}
                  {showPenyerahan && <PageCard label={`Halaman ${++pageNo}`} badge="Surat Penyerahan"><SuratPenyerahan data={data} /></PageCard>}
                  {showBast && <PageCard label={`Halaman ${++pageNo}`} badge={`BAST — ${data.jenis === "roda2" ? "Roda 2" : "Roda 4"}`}><BastSheet data={data} /></PageCard>}
                </div>
              </PreviewStage>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
