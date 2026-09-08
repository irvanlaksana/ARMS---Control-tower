/**
 * numeric.mjs — Parser angka/moneter Indonesia yang konsisten.
 * Dipakai bersama oleh:
 *   - src/utils/firestoreAdapter.ts (client)
 *   - scripts/seed-firestore.mjs (migrasi)
 *
 * Aturan:
 *   "Rp 2.500.000"  -> 2500000   (titik = pemisah ribuan)
 *   "142500000"     -> 142500000
 *   "4.5"           -> 4.5       (titik = desimal, grup terakhir != 3 digit)
 *   "1,234,567"     -> 1234567   (koma = pemisah ribuan)
 *   "1234,56"       -> 1234.56   (koma = desimal)
 *   "1.234,56"      -> 1234.56   (campuran: pemisah terakhir = desimal)
 */

export function parseNumericString(raw) {
  let s = String(raw ?? '').trim();
  if (!s) return NaN;

  // Buang simbol mata uang, spasi, karakter non-numerik lain
  let cleaned = s.replace(/[^0-9.,+-]/g, '');
  if (!cleaned) return NaN;

  const hasDot = cleaned.includes('.');
  const hasComma = cleaned.includes(',');

  if (hasDot && hasComma) {
    // Pemisah terakhir yang muncul = pemisah desimal
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      // "1.234,56" -> "1234.56"
      cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    } else {
      // "1,234.56" -> "1234.56"
      cleaned = cleaned.replace(/,/g, '');
    }
  } else if (hasDot) {
    const parts = cleaned.split('.');
    const isDotThousands =
      parts.length > 1 && parts.slice(1).every((p) => /^\d{3}$/.test(p));
    cleaned = isDotThousands ? parts.join('') : cleaned;
  } else if (hasComma) {
    const parts = cleaned.split(',');
    const isCommaThousands =
      parts.length > 1 && parts.slice(1).every((p) => /^\d{3}$/.test(p));
    cleaned = isCommaThousands ? parts.join('') : cleaned.replace(/,/g, '.');
  }

  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}
