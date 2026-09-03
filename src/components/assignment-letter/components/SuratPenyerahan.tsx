import type React from "react";
import type { BastData } from "../types";
import { catatanKreditur } from "../lib/text";

const dots = "(..........................................)";

function Row({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <tr>
      <td
        style={{
          width: "9mm",
          verticalAlign: "top",
          textAlign: "right",
          paddingRight: "1.5mm",
        }}
      >
        {n}
      </td>
      <td style={{ verticalAlign: "top", textAlign: "justify" }}>{children}</td>
    </tr>
  );
}

export default function SuratPenyerahan({ data }: { data: BastData }) {
  const spec: [string, string][] = [
    ["Merek/Type", data.merekType],
    ["No. Rangka", data.noRangka],
    ["No. Mesin", data.noMesin],
    ["No. Polisi", data.noPolisi],
    ["BPKB atas Nama", data.bpkbAtasNama],
  ];

  return (
    <div className="sheet sheet-penyerahan">
      <div style={{ textAlign: "center", fontWeight: "bold", fontSize: "12pt" }}>
        SURAT PENYERAHAN
      </div>

      <div style={{ height: "7mm" }} />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <Row n="1.">
            <div>
              Bahwa saya mengakui kendaraan yang saya serahkan adalah kendaraan
              jaminan fiducia dari Perjanjian
            </div>
            <div style={{ whiteSpace: "nowrap" }}>
              Pembiayaan Nomor
              <span style={{ display: "inline-block", width: "17mm" }} />
              {data.noPerjanjian}
              <span style={{ display: "inline-block", width: "5mm" }} />
              Tanggal {data.tglPerjanjian}
              <span style={{ display: "inline-block", width: "7mm" }} />
              dengan spesifikasi :
            </div>

            <div style={{ height: "4mm" }} />

            <table
              style={{
                borderCollapse: "collapse",
                marginLeft: "4mm",
                width: "auto",
              }}
            >
              <tbody>
                {spec.map(([label, value]) => (
                  <tr key={label}>
                    <td style={{ width: "38mm", verticalAlign: "top", paddingBottom: "1.2mm" }}>
                      {label}
                    </td>
                    <td style={{ verticalAlign: "top", paddingBottom: "1.2mm" }}>
                      : {value}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ marginLeft: "4mm" }}>
              (selanjutnya disebut sebagai &quot;Kendaraan&quot;)
            </div>
          </Row>

          <Row n="2.">
            Bahwa saya mengakui penyerahan kendaraan dilakukan dengan sukarela
            karena saya telah wanprestasi terhadap kewajiban pembayaran angsuran
            sebagaimana yang telah disepakati dalam Perjanjian pembiayaan.
          </Row>

          <Row n="3.">
            Bahwa saya mengakui total hutang pembiayaan kewajiban yang saya
            miliki adalah sama dengan perhitungan dari pihak {data.perusahaan.replace(/^PT\.\s*/, "PT ")}{" "}
            sesuai dengan perincian terlampir.
          </Row>

          <Row n="4.">
            Bahwa saya memberikan persetujuan kepada{" "}
            {data.perusahaan.replace(/^PT\.\s*/, "PT ")} untuk menentukan harga
            jual serta melakukan penjualan atas kendaraan tersebut, yang hasilnya
            akan digunakan untuk melunasi total hutang pembiayaan sebagaimana
            yang tercantum dalam angka 3 di atas.
          </Row>

          {data.tampilkanCatatanPenyerahan && (
            <Row n="5.">{catatanKreditur(data)}</Row>
          )}
        </tbody>
      </table>

      <div style={{ height: "4mm" }} />

      <p style={{ textAlign: "justify", margin: 0 }}>
        Dengan dibuat dan ditandatanganinya Surat Penyerahan ini saya juga
        membebaskan {data.perusahaan.replace(/^PT\.\s*/, "PT ")} dari segala
        gugatan dan/atau tuntutan dari pihak manapun.
      </p>

      <div style={{ height: "4mm" }} />

      <p style={{ textAlign: "justify", margin: 0 }}>
        Demikian Surat Penyerahan ini dibuat, dalam keadaan sadar, tanpa paksaan
        dari pihak mana pun juga.
      </p>

      <div style={{ height: "8mm" }} />

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%", fontWeight: "bold" }}>Yang Menyerahkan</td>
            <td style={{ width: "8%" }} />
            <td style={{ fontWeight: "bold" }}>Yang Menerima</td>
          </tr>
          <tr style={{ height: "40mm" }}>
            <td colSpan={3} />
          </tr>
          <tr>
            <td>{dots}</td>
            <td />
            <td>{dots}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
