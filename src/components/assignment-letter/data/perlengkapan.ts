import type { VehicleType } from "../types";

export interface PerlengkapanConfig {
  label: string;
  left: string[];
  right: string[];
  footerLeft: string;
  footerRight: string;
}

export const PERLENGKAPAN: Record<VehicleType, PerlengkapanConfig> = {
  roda4: {
    label: "Kendaraan Roda 4 (Mobil)",
    left: [
      "STNK",
      "Kunci Pintu",
      "Mesin",
      "Accu",
      "Tape",
      "Velg",
      "Ban",
      "Ban Serep",
      "Bak (untuk pickup)",
      "Kemudi",
      "Bumper Depan",
      "Bumper Belakang",
      "Kaca Dpn/Blk",
      "Kaca Samping",
      "Wiper",
      "Wheel Dep",
      "Dash Board",
    ],
    right: [
      "Power Window",
      "Speedo Meter+Panel",
      "Lampu Depan",
      "Lampu Kota",
      "Lampu Sein Dpn",
      "Lampu Sein Blk",
      "Lampu Rem",
      "Tanduk",
      "Spion",
      "Knalpot",
      "Alarm",
      "Radiator",
      "Chasis",
      "Jok",
      "Aksesoris Tambahan",
      "Tool Kit",
    ],
    footerLeft: "Karoseri (bak kayu/bak besi/dump/bus/box/lainnya*)",
    footerRight: "Pembiayaan Karoseri : Termasuk / Tidak Termasuk *)",
  },
  roda2: {
    label: "Kendaraan Roda 2 (Motor)",
    left: [
      "STNK",
      "Kunci Kontak",
      "Mesin",
      "Accu",
      "Velg Depan",
      "Velg Belakang",
      "Ban Depan",
      "Ban Belakang",
      "Rangka / Body",
      "Jok",
      "Bagasi",
      "Tangki",
      "Shock Breaker Dpn",
      "Shock Breaker Blk",
      "Rantai / Gear",
      "Standar Tengah",
      "Standar Samping",
    ],
    right: [
      "Speedo Meter+Panel",
      "Lampu Depan",
      "Lampu Kota",
      "Lampu Sein Dpn",
      "Lampu Sein Blk",
      "Lampu Rem",
      "Spion",
      "Knalpot",
      "Alarm",
      "Tanduk",
      "Kunci Stang",
      "Karburator / Injeksi",
      "Cover Body",
      "Foot Step",
      "Spakbor Dpn/Blk",
      "Tool Kit",
    ],
    footerLeft: "Aksesoris (box/bagasi/windshield/lainnya*)",
    footerRight: "Pembiayaan Aksesoris : Termasuk / Tidak Termasuk *)",
  },
};

export function allItems(jenis: VehicleType): string[] {
  const c = PERLENGKAPAN[jenis];
  return [...c.left, ...c.right];
}
