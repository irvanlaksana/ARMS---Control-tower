const ROMAN_MONTHS = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII'
];

export function getRomanMonth(monthIndex: number): string {
  return ROMAN_MONTHS[monthIndex] || 'I';
}

export function extractCompanyInitials(companyName?: string): string {
  if (!companyName || !companyName.trim()) return 'MJI';
  
  const clean = companyName.trim();
  
  // If already short uppercase abbreviation (e.g. MJI, KAMM, BAF, FIF, ACC, WOM)
  if (/^[A-Z0-9]{2,6}$/i.test(clean)) {
    return clean.toUpperCase();
  }

  // Remove common company prefixes
  const withoutPrefix = clean
    .replace(/^(PT\.?|CV\.?|KOPERASI|KOP\.?|UD\.?|PERUM\.?|PERSERO\.?)\s+/gi, '')
    .trim();

  // Known standard mappings
  const upper = withoutPrefix.toUpperCase();
  if (upper.includes('MITRA JASATRIA INDONESIA')) return 'MJI';
  if (upper.includes('ANUGRAH MEGA MANDIRI')) return 'KAMM';
  if (upper.includes('OTO MULTIARTHA')) return 'OTO';
  if (upper.includes('FEDERAL INTERNATIONAL FINANCE') || upper.includes('FIF GROUP')) return 'FIF';
  if (upper.includes('BUSSAN AUTO FINANCE')) return 'BAF';
  if (upper.includes('ADIRA')) return 'ADIRA';
  if (upper.includes('WOM FINANCE')) return 'WOM';
  if (upper.includes('KREDIT PLUS') || upper.includes('KB FINANSIA')) return 'KB-KP';

  // Extract acronym from words (length > 1)
  const words = withoutPrefix.split(/[\s,.-]+/).filter((w) => w.length > 1);
  if (words.length >= 2) {
    const acronym = words.map((w) => w[0].toUpperCase()).join('');
    if (acronym.length >= 2 && acronym.length <= 5) {
      return acronym;
    }
  }

  // Fallback: take first 3-4 letters
  return withoutPrefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'MJI';
}

/**
 * Gets or increments a daily sequence counter for specific letter type.
 * Stored in localStorage by YYYY-MM-DD key so that consecutive generations
 * within the same day get 001, 002, 003...
 */
export function getNextDailySequence(letterType: string, date = new Date()): string {
  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;
    const storageKey = `seq_${dateKey}_${letterType.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
    
    const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const next = current + 1;
    localStorage.setItem(storageKey, next.toString());
    
    return String(next).padStart(3, '0');
  } catch {
    const rand = Math.floor(Math.random() * 900) + 100;
    return String(rand);
  }
}

export type OfficialLetterType = 'ST' | 'BAST' | 'SPK';

export interface GenerateLetterNumberOptions {
  type: OfficialLetterType | 'SURAT_TUGAS' | 'SURAT_BAST' | 'SURAT_PENYERAHAN';
  companyName?: string;
  date?: Date | string;
  customSequence?: string | number;
}

export function generateOfficialLetterNumber(options: GenerateLetterNumberOptions): string {
  let d = new Date();
  if (options.date) {
    if (typeof options.date === 'string') {
      const parsed = new Date(options.date);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
    } else {
      d = options.date;
    }
  }

  const day = String(d.getDate()).padStart(2, '0');
  const romanMonth = getRomanMonth(d.getMonth());
  const year = d.getFullYear();
  const companyInitials = extractCompanyInitials(options.companyName);

  let typeInitial = 'ST';
  if (options.type === 'BAST' || options.type === 'SURAT_BAST') {
    typeInitial = 'BAST';
  } else if (options.type === 'SPK' || options.type === 'SURAT_PENYERAHAN') {
    typeInitial = 'SPK';
  } else {
    typeInitial = 'ST';
  }

  const seq = options.customSequence 
    ? String(options.customSequence).padStart(3, '0')
    : getNextDailySequence(typeInitial, d);

  // Format Resmi: [NO_URUT_HARIAN]/[INISIAL_SURAT]/[INISIAL_PERUSAHAAN]/[TANGGAL]/[BULAN_ROMAWI]/[TAHUN]
  // Contoh: 001/ST/MJI/29/VIII/2026 atau 002/BAST/MJI/29/VIII/2026 atau 001/SPK/MJI/29/VIII/2026
  return `${seq}/${typeInitial}/${companyInitials}/${day}/${romanMonth}/${year}`;
}

export function generateLetterNumber(date = new Date(), companyName = 'PT. MITRA JASATRIA INDONESIA'): string {
  return generateOfficialLetterNumber({
    type: 'ST',
    companyName,
    date,
  });
}

export function generateBastNumber(companyName = 'PT. MITRA JASATRIA INDONESIA', date = new Date()): string {
  return generateOfficialLetterNumber({
    type: 'BAST',
    companyName,
    date,
  });
}

export function generateSuratPenyerahanNumber(companyName = 'PT. MITRA JASATRIA INDONESIA', date = new Date()): string {
  return generateOfficialLetterNumber({
    type: 'SPK',
    companyName,
    date,
  });
}
