import type React from "react";
import type { BastData, ChecklistEntry } from "../types";
import { PERLENGKAPAN } from "../data/perlengkapan";
import { hariTanggal, tglPanjang } from "../lib/format";
import { catatanKreditur, mitraLine } from "../lib/text";

const SANS = '"Calibri", "Carlito", "Segoe UI", Arial, sans-serif';
const ROW_H = "5.6mm";

function Tick() {
  return <span className="tick">✓</span>;
}

function CheckCells({ e }: { e?: ChecklistEntry }) {
  const entry: ChecklistEntry = e ?? { p1: "", k1: "", p2: "", k2: "" };
  const c: React.CSSProperties = { textAlign: "center" };
  const k: React.CSSProperties = { fontSize: "7pt", textAlign: "center" };
  return (
    <>
      <td style={c}>{entry.p1 === "A" && <Tick />}</td>
      <td style={c}>{entry.p1 === "TA" && <Tick />}</td>
      <td style={k}>{entry.k1}</td>
      <td style={c}>{entry.p2 === "A" && <Tick />}</td>
      <td style={c}>{entry.p2 === "TA" && <Tick />}</td>
      <td style={k}>{entry.k2}</td>
    </>
  );
}

function Opt({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <span
      style={
        on
          ? {
              border: "1px solid #000",
              borderRadius: "40%",
              padding: "0 1.2mm",
              fontWeight: "bold",
            }
          : undefined
      }
    >
      {children}
    </span>
  );
}

export default function BastSheet({ data }: { data: BastData }) {
  const cfg = PERLENGKAPAN[data.jenis];
  const rows = Math.max(cfg.left.length, cfg.right.length);
  const hari = data.hariTanggal || hariTanggal(data.tanggalBast);
  const labelMesin = data.labelMesinBenar ? "No. Mesin" : "No. Rangka";

  const headCell: React.CSSProperties = { textAlign: "center", height: ROW_H };
  const smallVal: React.CSSProperties = {
    textAlign: "center",
    fontSize: "7.4pt",
    height: "6mm",
  };
  const midVal: React.CSSProperties = { textAlign: "center", height: "6mm" };

  return (
    <div className="sheet sheet-bast">
      {/* ============ KOP ============ */}
      <div
        style={{
          fontFamily: SANS,
          fontSize: "18pt",
          fontWeight: "bold",
          lineHeight: 1.1,
        }}
      >
        {data.perusahaan}
      </div>
      <div style={{ fontFamily: SANS, fontSize: "11.5pt", paddingLeft: "1mm" }}>
        {data.cabang}
      </div>
      <div style={{ fontFamily: SANS, fontSize: "11.5pt" }}>{data.alamat}</div>
      <div
        style={{
          textAlign: "center",
          fontWeight: "bold",
          fontSize: "11pt",
          marginTop: "0.5mm",
        }}
      >
        BERITA ACARA SERAH TERIMA KENDARAAN BERMOTOR
      </div>

      {/* ============ NO / TANGGAL ============ */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: "4mm" }}>
        <div style={{ flex: 1, paddingTop: "8mm", fontSize: "9.5pt" }}>
          Pada hari ini tanggal,
          <span style={{ display: "inline-block", width: "22mm" }} />
          {hari}
          <span style={{ display: "inline-block", width: "3mm" }} />
          yang bertanda tangan di bawah ini :
        </div>
        <div style={{ width: "56mm", paddingTop: "3mm" }}>
          <table className="doc-table">
            <colgroup>
              <col style={{ width: "32%" }} />
              <col style={{ width: "68%" }} />
            </colgroup>
            <tbody>
              <tr>
                <td style={{ height: "5.2mm" }}>No.</td>
                <td>: {data.noBast}</td>
              </tr>
              <tr>
                <td style={{ height: "5.2mm" }}>Tanggal</td>
                <td>{data.tanggalBast ? `: ${tglPanjang(data.tanggalBast)}` : ""}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============ PARAGRAF ============ */}
      <div style={{ marginTop: "3mm", fontSize: "9.2pt", lineHeight: 1.25 }}>
        <div>
          Dengan ini menyerahkan kendaraan bermotor (&quot;Unit&quot;) secara
          sukarela kepada {data.perusahaan.replace(/^PT\.\s*/, "PT ")},
        </div>
        <div>
          sehubungan dengan telah terjadinya wanprestasi terhadap kewajiban
          pembayaran angsuran sebagaimana yang telah disepakati dalam
        </div>
        <div>
          Perjanjian Pembiayaan dengan Nomor : {data.noPerjanjian} Tanggal{" "}
          {data.tglPerjanjian} Atas Nama {data.namaDebitur}.
        </div>
        {data.tampilkanCatatanBast && (
          <div style={{ textAlign: "justify" }}>{catatanKreditur(data)}</div>
        )}
        {data.tampilkanMitraBast && !!data.mitraNama && (
          <div style={{ textAlign: "justify" }}>{mitraLine(data)}</div>
        )}
        <div>
          Adapun&nbsp; kondisi kendaraan bermotor (&quot;Unit&quot;) yang
          diserahkan sesuai spesifikasi dibawah ini
        </div>
      </div>

      <div style={{ height: "3mm" }} />

      {/* ============ SPESIFIKASI ============ */}
      <table className="doc-table">
        <colgroup>
          <col style={{ width: "24%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "15%" }} />
          <col style={{ width: "46%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td style={midVal}>Merk/Type</td>
            <td style={midVal}>No. Rangka</td>
            <td style={midVal}>Warna</td>
            <td rowSpan={4} style={{ verticalAlign: "top" }}>
              STNK/BKPB a/n :<br />
              {data.bpkbAtasNama}
            </td>
          </tr>
          <tr>
            <td style={midVal}>{data.merekType}</td>
            <td style={smallVal}>{data.noRangka}</td>
            <td style={midVal}>{data.warna}</td>
          </tr>
          <tr>
            <td style={midVal}>No Polisi</td>
            <td style={midVal}>{labelMesin}</td>
            <td style={midVal}>Tahun</td>
          </tr>
          <tr>
            <td style={midVal}>{data.noPolisi}</td>
            <td style={smallVal}>{data.noMesin}</td>
            <td style={midVal}>{data.tahun}</td>
          </tr>
        </tbody>
      </table>

      {/* ============ CHECKLIST ============ */}
      <table className="doc-table" style={{ marginTop: "-1px" }}>
        <colgroup>
          <col style={{ width: "24%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "16%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "6%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "4.5%" }} />
          <col style={{ width: "6%" }} />
        </colgroup>
        <tbody>
          <tr>
            <td rowSpan={2} style={{ textAlign: "center" }}>
              Perlengkapan
            </td>
            <td colSpan={3} style={{ textAlign: "center", height: "7mm" }}>
              Checklist
              <br />
              Pihak I
            </td>
            <td colSpan={3} style={{ textAlign: "center" }}>
              Checklist
              <br />
              Pihak II
            </td>
            <td rowSpan={2} style={{ textAlign: "center" }}>
              Perlengkapan
            </td>
            <td colSpan={3} style={{ textAlign: "center" }}>
              Checklist
              <br />
              Pihak I
            </td>
            <td colSpan={3} style={{ textAlign: "center" }}>
              Checklist
              <br />
              Pihak II
            </td>
          </tr>
          <tr>
            {["A", "TA", "Ket", "A", "TA", "Ket", "A", "TA", "Ket", "A", "TA", "Ket"].map(
              (h, i) => (
                <td key={i} style={headCell}>
                  {h}
                </td>
              ),
            )}
          </tr>

          {Array.from({ length: rows }).map((_, i) => {
            const l = cfg.left[i];
            const r = cfg.right[i];
            return (
              <tr key={i} style={{ height: ROW_H }}>
                <td>{l ?? ""}</td>
                {l ? <CheckCells e={data.checklist[l]} /> : <CheckCells />}
                <td>{r ?? ""}</td>
                {r ? <CheckCells e={data.checklist[r]} /> : <CheckCells />}
              </tr>
            );
          })}

          {/* Karoseri / Aksesoris */}
          <tr style={{ height: "9mm" }}>
            <td style={{ verticalAlign: "top" }}>{cfg.footerLeft}</td>
            <td colSpan={6} />
            <td colSpan={7}>
              {cfg.footerRight.split(":")[0]}:{" "}
              <Opt on={data.karoseri === "Termasuk"}>Termasuk</Opt> /{" "}
              <Opt on={data.karoseri === "Tidak Termasuk"}>Tidak Termasuk</Opt>{" "}
              *)
            </td>
          </tr>

          <tr style={{ height: "5mm" }}>
            <td colSpan={14}>
              Penyelesaian Kewajiban :{" "}
              <Opt on={data.penyelesaian === "YA"}>YA</Opt> /{" "}
              <Opt on={data.penyelesaian === "TIDAK"}>TIDAK</Opt>*
            </td>
          </tr>
          <tr style={{ height: "5mm" }}>
            <td colSpan={14}>*) lingkari salah satu</td>
          </tr>

          {/* Tanda tangan */}
          <tr style={{ height: "6mm" }}>
            <td colSpan={2} style={{ textAlign: "center", fontSize: "10pt" }}>
              Yang Bertandatangan
            </td>
            <td colSpan={5} style={{ textAlign: "center", fontSize: "10pt" }}>
              Yang Menerima
              {data.mitraSebagaiPenerima && data.mitraNama && (
                <div style={{ fontSize: "6.8pt", lineHeight: 1.1 }}>
                  {data.mitraNama}
                </div>
              )}
            </td>
            <td colSpan={3} style={{ textAlign: "center", fontSize: "10pt" }}>
              Yang Menyerahkan
            </td>
            <td colSpan={4} style={{ textAlign: "center", fontSize: "10pt" }}>
              Yang Menerima
            </td>
          </tr>
          <tr style={{ height: "26mm" }}>
            <td colSpan={2} rowSpan={2} style={{ verticalAlign: "bottom", textAlign: "center" }}>
              {data.ttdBertandatangan}
            </td>
            <td colSpan={5} />
            <td colSpan={3} />
            <td colSpan={4} rowSpan={2} style={{ verticalAlign: "bottom", textAlign: "center" }}>
              {data.ttdMenerima2}
            </td>
          </tr>
          <tr style={{ height: "5.5mm" }}>
            <td colSpan={5} style={{ textAlign: "center" }}>
              {data.ttdMenerima1}
            </td>
            <td colSpan={3} style={{ textAlign: "center" }}>
              {data.ttdMenyerahkan}
            </td>
          </tr>

          {/* Catatan kaki */}
          <tr>
            <td colSpan={14} style={{ fontSize: "7.2pt", textAlign: "justify" }}>
              BAST unit ini adalah bagian yang menyatu dan tidak terpisahkan dari
              Surat Tugas No. {data.noSuratTugas}, dan karenanya semua syarat dan
              ketentuan yang tercantum dalam Surat Tugas tersebut berlaku pula
              untuk BAST unit ini.
            </td>
          </tr>
          <tr>
            <td colSpan={14} style={{ fontSize: "8pt", fontWeight: "bold" }}>
              PERHATIAN :
            </td>
          </tr>
          <tr>
            <td colSpan={14} style={{ fontSize: "7.5pt", textAlign: "justify" }}>
              &nbsp;Apabila dalam waktu 7 (tujuh) hari kalender sejak tanggal
              tersebut di atas Konsumen (Debitur) tidak melakukan penyelesaian,
              termasuk namun tidak terbatas pada pengambilan barang-barang yang
              melekat pada dan/atau terbawa di dalam unit, maka ADMF berhak
              menjual dan/atau melelang unit (dalam keadaan sesuai saat BAST ini
              dibuat) dengan mengacu pada Perjanjian Pembiayaan Konsumen yang
              telah disepakati bersama.
            </td>
          </tr>
          <tr>
            <td colSpan={14} style={{ fontSize: "7.5pt" }}>
              1.1 Konsumen (Debitur)
              <br />
              1.2 Collection
              <br />
              1.3 Warehouse
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
