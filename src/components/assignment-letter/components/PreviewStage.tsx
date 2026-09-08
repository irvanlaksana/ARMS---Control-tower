import type React from "react";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Membungkus konten dokumen dan menskalakannya dengan transform: scale()
 * sambil menjaga ukuran area (agar scrollbar & centering tetap benar).
 */
export default function PreviewStage({
  zoom,
  children,
}: {
  zoom: number;
  children: React.ReactNode;
}) {
  const inner = useRef<HTMLDivElement>(null);
  // default = F4 (215 x 330 mm) dalam px @96dpi
  const [size, setSize] = useState({ w: 813, h: 1247 });

  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const measure = () => {
      const w = el.offsetWidth || 813; // F4: 215mm @96dpi
      const h = el.offsetHeight || 1247; // F4: 330mm @96dpi
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      className="zoom-stage mx-auto"
      style={{ width: size.w * zoom, height: size.h * zoom }}
    >
      <div
        ref={inner}
        className="zoom-wrap"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

export function PageCard({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: string;
  children: React.ReactNode;
}) {
  return (
    <figure className="page-card m-0">
      <figcaption className="no-print mb-2 flex items-center gap-2 text-[13px] font-semibold text-slate-500">
        <span className="flex h-5 items-center rounded bg-slate-900 px-2 text-[11px] font-bold uppercase tracking-wide text-white">
          {label}
        </span>
        {badge && <span className="text-slate-500">{badge}</span>}
        <span className="ml-auto text-[11px] font-normal text-slate-400">
          F4 / Folio · 215 × 330 mm
        </span>
      </figcaption>
      <div className="page-shadow bg-white shadow-[0_18px_45px_-18px_rgba(15,23,42,0.55)] ring-1 ring-slate-300">
        {children}
      </div>
    </figure>
  );
}
