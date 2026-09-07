import type { BastData } from "../types";
import { todayISO } from "./format";

export const KREDITUR_DEFAULT = "Koperasi Anugrah Mega Mandiri (KAMM)";

/** Pilihan cepat nama kreditur. */
export const KREDITUR_PRESETS = [
  "Koperasi Anugrah Mega Mandiri (KAMM)",
  "PT Adira Dinamika Multi Finance, Tbk",
  "PT Federal International Finance (FIF)",
  "PT BFI Finance Indonesia, Tbk",
  "PT Mandiri Utama Finance",
];

/** Ambil inisial perusahaan: pakai singkatan dalam kurung bila ada,
 *  jika tidak ambil huruf awal tiap kata (PT/CV/Tbk dilewati). */
export function initialsOf(name: string, max = 5): string {
  const inBrackets = name.match(/\(([^)]+)\)/);
  if (inBrackets) {
    const s = inBrackets[1].replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (s) return s.slice(0, max);
  }
  const skip = new Set(["PT", "CV", "TBK", "LTD", "LLC", "THE", "DAN"]);
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !skip.has(w));
  const s = words.map((w) => w[0]).join("");
  return s.slice(0, max) || "XX";
}

const SEQ_KEY = "bast-st-seq-v1";

/** Jumlah Surat Tugas yang sudah dibuat untuk tanggal tertentu (tanpa menambah). */
export function countForDate(iso: string): number {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const reg: Record<string, number> = raw ? JSON.parse(raw) : {};
    return reg[iso] ?? 0;
  } catch {
    return 0;
  }
}

/** Catat satu Surat Tugas baru untuk tanggal ini, kembalikan urutan ke-n. */
export function nextCountForDate(iso: string): number {
  try {
    const raw = localStorage.getItem(SEQ_KEY);
    const reg: Record<string, number> = raw ? JSON.parse(raw) : {};
    const n = (reg[iso] ?? 0) + 1;
    reg[iso] = n;
    localStorage.setItem(SEQ_KEY, JSON.stringify(reg));
    return n;
  } catch {
    return 1;
  }
}

/**
 * Nomor Surat Tugas resmi:
 *   ST-DC/{inisial mitra}.{inisial kreditur}/{tahun}/{bulan}/{seri 4 digit}
 * Bila lebih dari satu surat pada hari yang sama, ditambah kode huruf
 * -A, -B, -C … pada surat ke-2 dst.
 */
export function generateNomorST(d: {
  mitraNama: string;
  kreditur: string;
  tanggalSuratISO: string;
}, countOfDay: number): string {
  const iso = d.tanggalSuratISO || todayISO();
  const yy = iso.slice(0, 4);
  const mm = iso.slice(5, 7);
  const mitra = initialsOf(d.mitraNama || "PT MITRA JASATRIA INDONESIA");
  const kreditur = initialsOf(d.kreditur || KREDITUR_DEFAULT);
  const serial = Math.floor(1000 + Math.random() * 9000);
  const suffix =
    countOfDay <= 1 ? "" : `-${String.fromCharCode(65 + Math.min(countOfDay - 2, 25))}`;
  return `ST-DC/${mitra}.${kreditur}/${yy}/${mm}/${serial}${suffix}`;
}

/** Kalimat mitra pelaksana penagihan pada BAST. */
export function mitraLine(d: {
  mitraNama: string;
  mitraLegalitas: string;
  mitraAlamat?: string;
  mitraPic?: string;
  kreditur: string;
}): string {
  if (!d.mitraNama) return "";
  const legal = d.mitraLegalitas ? ` (Nomor ${d.mitraLegalitas})` : "";
  const alamat = d.mitraAlamat?.trim() ? `, beralamat di ${d.mitraAlamat.trim()}` : "";
  const pic = d.mitraPic?.trim() ? `, diwakili oleh ${d.mitraPic.trim()}` : "";
  return `Penerimaan unit kendaraan bermotor ini dilaksanakan oleh ${d.mitraNama}${legal}${alamat}${pic} selaku mitra resmi yang dikuasakan oleh ${d.kreditur || KREDITUR_DEFAULT}.`;
}

/** Kalimat baku penyerahan unit terkait keterlambatan angsuran pada kreditur. */
export function catatanKrediturText(kreditur: string): string {
  const nama = (kreditur || KREDITUR_DEFAULT).trim();
  return (
    "Penyerahan unit kendaraan ini dilakukan sehubungan dengan keterlambatan " +
    "kewajiban pembayaran angsuran pembiayaan fasilitas kredit/fidusia pada kreditur " +
    nama +
    "."
  );
}

/** Teks final: pakai teks kustom bila diisi, jika tidak pakai kalimat baku. */
export function catatanKreditur(data: BastData): string {
  const custom = data.catatanKreditur?.trim();
  return custom ? custom : catatanKrediturText(data.kreditur);
}
