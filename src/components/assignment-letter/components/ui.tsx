import type React from "react";
import { useState } from "react";

/* ---------------- Section (compact animated accordion) ---------------- */
export function Section({
  title,
  icon,
  children,
  defaultOpen = true,
  hint,
  badge,
}: {
  key?: React.Key;
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  hint?: string;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_3px_10px_-2px_rgba(15,23,42,0.12)]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-slate-50"
      >
        {icon && (
          <span className="text-[13px] leading-none transition-transform duration-200 group-hover:scale-110">
            {icon}
          </span>
        )}
        <span className="text-[12px] font-semibold tracking-tight text-slate-800">
          {title}
        </span>
        {badge && (
          <span className="rounded-full bg-indigo-50 px-1.5 py-[1px] text-[9px] font-bold uppercase tracking-wide text-indigo-500">
            {badge}
          </span>
        )}
        {hint && (
          <span className="truncate text-[10.5px] font-normal text-slate-400">
            {hint}
          </span>
        )}
        <svg
          className={`ml-auto shrink-0 text-slate-300 transition-all duration-300 group-hover:text-slate-500 ${
            open ? "rotate-180" : ""
          }`}
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-2.5 py-2.5">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Grid helpers ---------------- */
export function Grid({
  cols = 2,
  children,
}: {
  cols?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  const map = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3" } as const;
  return <div className={`grid gap-2 ${map[cols]}`}>{children}</div>;
}

/* ---------------- Field ---------------- */
export function Field({
  label,
  hint,
  span,
  children,
}: {
  label: string;
  hint?: string;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block min-w-0 ${span ? "col-span-full" : ""}`}>
      <span className="mb-0.5 block truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      {children}
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[12.5px] text-slate-800 outline-none transition placeholder:text-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement> & { upper?: boolean },
) {
  const { upper, className, onChange, ...rest } = props;
  return (
    <input
      {...rest}
      className={`${inputCls} ${upper ? "uppercase" : ""} ${className ?? ""}`}
      onChange={(e) => {
        if (upper) e.target.value = e.target.value.toUpperCase();
        onChange?.(e);
      }}
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;
  return (
    <textarea
      {...rest}
      className={`${inputCls} resize-y leading-snug ${className ?? ""}`}
    />
  );
}

/* ---------------- Segmented ---------------- */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-0.5 rounded-md bg-slate-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 truncate rounded px-1.5 py-1 text-[11.5px] font-medium transition ${
            value === o.value
              ? "bg-white text-indigo-600 shadow-sm"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Checkbox row ---------------- */
export function Check({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1.5 py-0.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 shrink-0 accent-indigo-600"
      />
      <span className="text-[11.5px] leading-snug text-slate-600">{children}</span>
    </label>
  );
}

/* ---------------- Button ---------------- */
export function Btn({
  children,
  variant = "ghost",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost" | "dark";
}) {
  const styles: Record<string, string> = {
    primary: "bg-indigo-600 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700",
    dark: "bg-slate-900 text-white hover:bg-slate-800",
    ghost:
      "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
  };
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-[12px] font-medium transition active:scale-[0.97] ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
