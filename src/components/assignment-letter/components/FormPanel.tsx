import { useState } from "react";
import type { BastData, ChecklistMap, VehicleType } from "../types";
import { PERLENGKAPAN } from "../data/perlengkapan";
import { hariTanggal } from "../lib/format";
import {
  KREDITUR_DEFAULT,
  KREDITUR_PRESETS,
  catatanKreditur,
  catatanKrediturText,
  countForDate,
  generateNomorST,
  mitraLine,
  nextCountForDate,
} from "../lib/text";
import ChecklistEditor from "./ChecklistEditor";
import KopEditor from "./KopEditor";
import { Check, Field, Grid, Section, Segmented, TextArea, TextInput } from "./ui";
import type { SuratTugasData } from "../types";

interface Props {
  data: BastData;
  set: <K extends keyof BastData>(key: K, value: BastData[K]) => void;
  setJenis: (j: VehicleType) => void;
  setChecklist: (c: ChecklistMap) => void;
}

export default function FormPanel({ data, set, setJenis, setChecklist }: Props) {
  const isR2 = data.jenis === "roda2";
  const [allOpen, setAllOpen] = useState(false);
  const [groupKey, setGroupKey] = useState(0);
  const st = <K extends keyof SuratTugasData>(k: K, v: SuratTugasData[K]) =>
    set("st", { ...data.st, [k]: v });

  const filledChecklist = Object.values(data.checklist).filter(
    (e) => e.p1 || e.p2,
  ).length;

  const dOpen = (main = false) => allOpen || main;
  const gk = (t: string) => `${t}-${groupKey}`;

  return (
    <div className="space-y-2">
      {/* ---------- Jenis kendaraan + kontrol grup ---------- */}
      <Segmented<VehicleType>
        value={data.jenis}
        onChange={setJenis}
        options={[
          { value: "roda2", label: "🏍️ Roda 2" },
          { value: "roda4", label: "🚗 Roda 4" },
        ]}
      />

      <div className="flex items-center justify-between px-0.5 pt-0.5">
        <span className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-slate-400">
          Grup Isian
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => {
              setAllOpen(true);
              setGroupKey((k) => k + 1);
            }}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
          >
            ＋ Buka semua
          </button>
          <button
            onClick={() => {
              setAllOpen(false);
              setGroupKey((k) => k + 1);
            }}
            className="rounded px-1.5 py-0.5 text-[10px] font-medium text-slate-400 transition hover:bg-slate-100 hover:text-indigo-600"
          >
            − Tutup semua
          </button>
        </div>
      </div>

      {/* ---------- 1. Data utama ---------- */}
      <Section key={gk("du")} title="Data Utama" icon="📋" defaultOpen={dOpen(true)}>
        <Grid cols={2}>
          <Field label="No. BAST">
            <TextInput
              value={data.noBast}
              placeholder="12496/BAST/2026"
              onChange={(e) => set("noBast", e.target.value)}
            />
          </Field>
          <Field label="Tanggal BAST">
            <TextInput
              type="date"
              value={data.tanggalBast}
              onChange={(e) => set("tanggalBast", e.target.value)}
            />
          </Field>

          <Field label="No. Perjanjian">
            <TextInput
              value={data.noPerjanjian}
              placeholder="040424210837"
              onChange={(e) => set("noPerjanjian", e.target.value)}
            />
          </Field>
          <Field label="Tgl. Perjanjian">
            <TextInput
              upper
              value={data.tglPerjanjian}
              placeholder="13-FEB-24"
              onChange={(e) => set("tglPerjanjian", e.target.value)}
            />
          </Field>

          <Field label="Nama Debitur">
            <TextInput
              upper
              value={data.namaDebitur}
              placeholder="MARYANTO"
              onChange={(e) => set("namaDebitur", e.target.value)}
            />
          </Field>
          <Field label="STNK/BPKB a/n">
            <TextInput
              upper
              value={data.bpkbAtasNama}
              placeholder="SULASTRI"
              onChange={(e) => set("bpkbAtasNama", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      {/* ---------- 2. Kreditur & Mitra ---------- */}
      <Section
        key={gk("km")}
        title="Kreditur & Mitra"
        icon="🤝"
        defaultOpen={dOpen()}
        badge={
          data.kreditur.match(/\(([^)]+)\)/)?.[1] ||
          data.kreditur
            .split(" ")
            .filter((w) => w && w !== "PT")
            .slice(0, 2)
            .map((w) => w[0])
            .join("")
            .toUpperCase() ||
          undefined
        }
      >
        {/* --- kreditur --- */}
        <Field label="Nama Kreditur" hint="Dipakai di BAST, Penyerahan & Surat Tugas">
          <TextInput
            value={data.kreditur}
            placeholder={KREDITUR_DEFAULT}
            onChange={(e) => set("kreditur", e.target.value)}
          />
        </Field>

        <div className="mt-1 flex flex-wrap gap-1">
          {KREDITUR_PRESETS.map((k) => {
            const singkat = k.match(/\(([^)]+)\)/)?.[1] ?? k.split(" ")[1] ?? k;
            const aktif = data.kreditur === k;
            return (
              <button
                key={k}
                title={k}
                onClick={() => set("kreditur", k)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${
                  aktif
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {singkat}
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          <Field label="Kalimat Penyerahan" hint="Kosongkan = kalimat baku otomatis">
            <TextArea
              rows={3}
              value={data.catatanKreditur}
              placeholder={catatanKrediturText(data.kreditur)}
              onChange={(e) => set("catatanKreditur", e.target.value)}
            />
          </Field>
        </div>
        <div className="mt-1">
          <Check
            checked={data.tampilkanCatatanBast}
            onChange={(v) => set("tampilkanCatatanBast", v)}
          >
            Tampilkan kalimat kreditur di BAST
          </Check>
          <Check
            checked={data.tampilkanCatatanPenyerahan}
            onChange={(v) => set("tampilkanCatatanPenyerahan", v)}
          >
            Tampilkan di Surat Penyerahan (poin 5)
          </Check>
        </div>

        <div className="my-2.5 border-t border-slate-100" />

        {/* --- perusahaan mitra --- */}
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Perusahaan Mitra (Pelaksana)
        </p>
        <Field label="Nama Perusahaan Mitra">
          <TextInput
            upper
            value={data.mitraNama}
            placeholder="PT MITRA JASATRIA INDONESIA"
            onChange={(e) => set("mitraNama", e.target.value)}
          />
        </Field>
        <div className="mt-2">
          <Grid cols={2}>
            <Field label="No. Legalitas / AHU">
              <TextInput
                value={data.mitraLegalitas}
                placeholder="AHU-056731.AH.01.01"
                onChange={(e) => set("mitraLegalitas", e.target.value)}
              />
            </Field>
            <Field label="PIC Lapangan">
              <TextInput
                upper
                value={data.mitraPic}
                placeholder="Nama penanggung jawab"
                onChange={(e) => set("mitraPic", e.target.value)}
              />
            </Field>
            <Field label="Alamat Mitra" span>
              <TextArea
                rows={2}
                value={data.mitraAlamat}
                placeholder="Alamat kantor mitra"
                onChange={(e) => set("mitraAlamat", e.target.value)}
              />
            </Field>
          </Grid>
        </div>
        <div className="mt-1">
          <Check
            checked={data.tampilkanMitraBast}
            onChange={(v) => set("tampilkanMitraBast", v)}
          >
            Tampilkan kalimat mitra di BAST
          </Check>
          <Check
            checked={data.mitraSebagaiPenerima}
            onChange={(v) => set("mitraSebagaiPenerima", v)}
          >
            Cetak nama mitra di kolom “Yang Menerima”
          </Check>
        </div>

        <div className="mt-2 rounded-md bg-slate-50 p-2 text-[10.5px] leading-relaxed text-slate-500">
          <span className="mb-0.5 block text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">
            Pratinjau kalimat BAST
          </span>
          {data.tampilkanCatatanBast && <p className="mb-1">“{catatanKreditur(data)}”</p>}
          {data.tampilkanMitraBast && data.mitraNama && <p>“{mitraLine(data)}”</p>}
          {!data.tampilkanCatatanBast && !data.tampilkanMitraBast && (
            <span className="italic text-slate-400">Tidak ada kalimat tambahan.</span>
          )}
        </div>
      </Section>

      {/* ---------- 3. Kendaraan ---------- */}
      <Section key={gk("kd")} title="Kendaraan" icon="🚘" defaultOpen={dOpen()}>
        <Grid cols={2}>
          <Field label="Merk / Type" span>
            <TextInput
              upper
              value={data.merekType}
              placeholder={isR2 ? "HONDA / BEAT CBS" : "HONDA / MINIBUS"}
              onChange={(e) => set("merekType", e.target.value)}
            />
          </Field>
          <Field label="No. Rangka">
            <TextInput
              upper
              value={data.noRangka}
              placeholder="MHRDD1750PJ407376"
              onChange={(e) => set("noRangka", e.target.value)}
            />
          </Field>
          <Field label="No. Mesin">
            <TextInput
              upper
              value={data.noMesin}
              placeholder="L12B35431364"
              onChange={(e) => set("noMesin", e.target.value)}
            />
          </Field>
        </Grid>
        <div className="mt-2">
          <Grid cols={3}>
            <Field label="No. Polisi">
              <TextInput
                upper
                value={data.noPolisi}
                placeholder="R1187UC"
                onChange={(e) => set("noPolisi", e.target.value)}
              />
            </Field>
            <Field label="Warna">
              <TextInput
                upper
                value={data.warna}
                placeholder="MERAH"
                onChange={(e) => set("warna", e.target.value)}
              />
            </Field>
            <Field label="Tahun">
              <TextInput
                value={data.tahun}
                placeholder="2023"
                onChange={(e) => set("tahun", e.target.value)}
              />
            </Field>
          </Grid>
        </div>
      </Section>

      {/* ---------- 4. Tanda tangan ---------- */}
      <Section key={gk("tt")} title="Tanda Tangan" icon="✍️" defaultOpen={dOpen()}>
        <Grid cols={2}>
          <Field label="Yang Bertandatangan">
            <TextInput
              upper
              value={data.ttdBertandatangan}
              placeholder="Nama konsumen"
              onChange={(e) => set("ttdBertandatangan", e.target.value)}
            />
          </Field>
          <Field label="Yang Menerima 1">
            <TextInput
              upper
              value={data.ttdMenerima1}
              placeholder="FILEMO HALAWA"
              onChange={(e) => set("ttdMenerima1", e.target.value)}
            />
          </Field>
          <Field label="Yang Menyerahkan">
            <TextInput
              upper
              value={data.ttdMenyerahkan}
              placeholder="FILEMO HALAWA"
              onChange={(e) => set("ttdMenyerahkan", e.target.value)}
            />
          </Field>
          <Field label="Yang Menerima 2">
            <TextInput
              upper
              value={data.ttdMenerima2}
              placeholder="Petugas gudang"
              onChange={(e) => set("ttdMenerima2", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      {/* ---------- 4b. Surat Tugas ---------- */}
      <Section
        key={gk("st")}
        title="Surat Tugas & Kop"
        icon="📑"
        defaultOpen={dOpen()}
        badge={data.kop.image ? "kop ✓" : undefined}
      >
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Kop Surat
        </p>
        <KopEditor kop={data.kop} onChange={(k) => set("kop", k)} />

        <div className="my-2.5 border-t border-slate-100" />

        <Grid cols={2}>
          <Field
            label="Nomor Surat"
            span
            hint={
              countForDate(data.st.tanggalSuratISO) > 0
                ? `Sudah ${countForDate(data.st.tanggalSuratISO)} surat tercatat untuk tanggal ini`
                : "Format: ST-DC/{mitra}.{kreditur}/{thn}/{bln}/{seri}"
            }
          >
            <div className="flex gap-1.5">
              <TextInput
                value={data.st.nomor}
                placeholder="ST-DC/MJI.KAMM/2026/08/0483"
                onChange={(e) => st("nomor", e.target.value)}
              />
              <button
                type="button"
                onClick={() => {
                  const n = nextCountForDate(data.st.tanggalSuratISO);
                  st(
                    "nomor",
                    generateNomorST(
                      {
                        mitraNama: data.mitraNama,
                        kreditur: data.kreditur,
                        tanggalSuratISO: data.st.tanggalSuratISO,
                      },
                      n,
                    ),
                  );
                }}
                title="Buat nomor surat otomatis"
                className="shrink-0 rounded-md bg-indigo-600 px-2.5 text-[11.5px] font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95"
              >
                🎲 Acak
              </button>
            </div>
          </Field>
          <div className="col-span-full rounded-md bg-slate-50 px-2 py-1.5">
            <span className="block text-[9.5px] font-semibold uppercase tracking-wide text-slate-400">
              Perusahaan penerbit
            </span>
            <span className="text-[11.5px] font-medium text-slate-700">
              {data.mitraNama || data.st.perusahaan}
            </span>
            <span className="block text-[9.5px] text-slate-400">
              Diambil dari panel “Kreditur &amp; Perusahaan Mitra”
            </span>
          </div>
          <Field label="Pemberi Tugas">
            <TextInput
              upper
              value={data.st.pemberiNama}
              onChange={(e) => st("pemberiNama", e.target.value)}
            />
          </Field>
          <Field label="Jabatan">
            <TextInput
              upper
              value={data.st.pemberiJabatan}
              onChange={(e) => st("pemberiJabatan", e.target.value)}
            />
          </Field>
          <Field label="Petugas" span>
            <TextInput
              upper
              value={data.st.petugasNama}
              onChange={(e) => st("petugasNama", e.target.value)}
            />
          </Field>
          <Field label="NIK Petugas">
            <TextInput
              value={data.st.petugasNik}
              onChange={(e) => st("petugasNik", e.target.value)}
            />
          </Field>
          <Field label="Jabatan Petugas">
            <TextInput
              value={data.st.petugasJabatan}
              onChange={(e) => st("petugasJabatan", e.target.value)}
            />
          </Field>
        </Grid>

        <div className="my-2.5 border-t border-slate-100" />

        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Data Nasabah
        </p>
        <Grid cols={2}>
          <Field label="No. Kontrak">
            <TextInput
              value={data.st.noKontrak}
              onChange={(e) => st("noKontrak", e.target.value)}
            />
          </Field>
          <Field label="Nama Nasabah">
            <TextInput
              upper
              value={data.st.nasabahNama}
              onChange={(e) => st("nasabahNama", e.target.value)}
            />
          </Field>
          <Field label="Alamat" span>
            <TextArea
              rows={2}
              value={data.st.nasabahAlamat}
              onChange={(e) => st("nasabahAlamat", e.target.value)}
            />
          </Field>
          <Field label="Jatuh Tempo">
            <TextInput
              upper
              value={data.st.jatuhTempo}
              placeholder="23 MARET 2018"
              onChange={(e) => st("jatuhTempo", e.target.value)}
            />
          </Field>
          <Field label="Angsuran / Total" span hint="Nilai angsuran / total tagihan">
            <TextInput
              value={data.st.angsuranNilai}
              placeholder="Rp. 652.000 / Rp. 11.736.000"
              onChange={(e) => st("angsuranNilai", e.target.value)}
            />
          </Field>
          <Field label="Denda">
            <TextInput
              value={data.st.denda}
              placeholder="Rp. 169.285.000"
              onChange={(e) => st("denda", e.target.value)}
            />
          </Field>
          <Field label="Merk/Type">
            <TextInput
              value={data.st.merkType}
              placeholder="HONDA / BeAT"
              onChange={(e) => st("merkType", e.target.value)}
            />
          </Field>
          <Field label="Nomor Polisi">
            <TextInput
              upper
              value={data.st.noPolisi}
              onChange={(e) => st("noPolisi", e.target.value)}
            />
          </Field>
        </Grid>

        <button
          onClick={() =>
            set("st", {
              ...data.st,
              merkType: data.merekType || data.st.merkType,
              noPolisi: data.noPolisi || data.st.noPolisi,
              nasabahNama: data.namaDebitur || data.st.nasabahNama,
            })
          }
          className="mt-1.5 w-full rounded bg-slate-100 py-1 text-[10.5px] font-medium text-slate-600 hover:bg-slate-200"
        >
          ⤵ Salin data kendaraan &amp; debitur dari BAST
        </button>

        <div className="my-2.5 border-t border-slate-100" />

        <Grid cols={2}>
          <Field label="Berlaku Dari">
            <TextInput
              value={data.st.berlakuDari}
              placeholder="29 Agustus 2026"
              onChange={(e) => st("berlakuDari", e.target.value)}
            />
          </Field>
          <Field label="Berlaku Sampai">
            <TextInput
              value={data.st.berlakuSampai}
              placeholder="31 Agustus 2026"
              onChange={(e) => st("berlakuSampai", e.target.value)}
            />
          </Field>
          <Field label="Kota">
            <TextInput
              value={data.st.kota}
              placeholder="Purwokerto"
              onChange={(e) => st("kota", e.target.value)}
            />
          </Field>
          <Field label="Tanggal Surat">
            <TextInput
              type="date"
              value={data.st.tanggalSuratISO}
              onChange={(e) => st("tanggalSuratISO", e.target.value)}
            />
          </Field>
        </Grid>
      </Section>

      {/* ---------- 5. Checklist ---------- */}
      <Section
        key={gk("ck")}
        title="Checklist"
        icon="✅"
        defaultOpen={dOpen()}
        badge={filledChecklist ? `${filledChecklist} terisi` : undefined}
        hint={PERLENGKAPAN[data.jenis].label}
      >
        <ChecklistEditor
          jenis={data.jenis}
          checklist={data.checklist}
          onChange={setChecklist}
        />
      </Section>

      {/* ---------- 6. Lanjutan ---------- */}
      <Section
        key={gk("op")}
        title="Opsi & Kop BAST"
        icon="⚙️"
        defaultOpen={dOpen()}
        hint="penyelesaian, karoseri, kop teks"
      >
        {/* kop surat */}
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Kop Surat
        </p>
        <div className="space-y-1.5">
          <TextInput
            value={data.perusahaan}
            placeholder="Nama perusahaan"
            onChange={(e) => set("perusahaan", e.target.value)}
          />
          <TextInput
            upper
            value={data.cabang}
            placeholder="Cabang"
            onChange={(e) => set("cabang", e.target.value)}
          />
          <TextInput
            upper
            value={data.alamat}
            placeholder="Alamat cabang"
            onChange={(e) => set("alamat", e.target.value)}
          />
        </div>

        <div className="my-2.5 border-t border-slate-100" />

        {/* nomor tambahan */}
        <Grid cols={2}>
          <Field label="No. Surat Tugas">
            <TextInput
              upper
              value={data.noSuratTugas}
              placeholder="040426C01061"
              onChange={(e) => set("noSuratTugas", e.target.value)}
            />
          </Field>
          <Field label="Hari & Tanggal" hint={`Auto: ${hariTanggal(data.tanggalBast) || "-"}`}>
            <TextInput
              value={data.hariTanggal}
              placeholder={hariTanggal(data.tanggalBast)}
              onChange={(e) => set("hariTanggal", e.target.value)}
            />
          </Field>
        </Grid>

        <div className="my-2.5 border-t border-slate-100" />

        {/* opsi dokumen */}
        <Grid cols={2}>
          <Field label="Penyelesaian">
            <Segmented
              value={data.penyelesaian}
              onChange={(v) => set("penyelesaian", v)}
              options={[
                { value: "", label: "—" },
                { value: "YA", label: "YA" },
                { value: "TIDAK", label: "TIDAK" },
              ]}
            />
          </Field>
          <Field label={isR2 ? "Aksesoris" : "Karoseri"}>
            <Segmented
              value={data.karoseri}
              onChange={(v) => set("karoseri", v)}
              options={[
                { value: "", label: "—" },
                { value: "Termasuk", label: "Ya" },
                { value: "Tidak Termasuk", label: "Tidak" },
              ]}
            />
          </Field>
        </Grid>
        <div className="mt-1.5">
          <Check
            checked={data.labelMesinBenar}
            onChange={(v) => set("labelMesinBenar", v)}
          >
            Perbaiki label kolom jadi “No. Mesin”
          </Check>
        </div>
      </Section>
    </div>
  );
}
