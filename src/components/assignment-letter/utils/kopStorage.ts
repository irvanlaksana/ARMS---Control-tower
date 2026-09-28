import { LetterData } from '../types';

export const STORAGE_KEY_LETTER = 'surat-tugas-data-v1';
export const STORAGE_KEY_KOP_TEMPLATE = 'kop-surat-template-v1';

export interface KopTemplateData {
  kopImage: string | null;
  kopImageHeight: number;
  kopImageFit: 'contain' | 'fill' | 'cover';
  kopImageAlign: 'left' | 'center' | 'right';
  kopImageOffsetY: number;
  kopImageOffsetX: number;
  kopImageMarginBottom: number;
  kopCompanyName: string;
}

export function getSavedKopTemplate(): KopTemplateData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_KOP_TEMPLATE);
    if (raw) {
      return JSON.parse(raw) as KopTemplateData;
    }
  } catch (e) {
    console.error('Failed to read kop template from storage:', e);
  }
  return null;
}

export function getEffectiveKopSettings(override?: Partial<KopTemplateData>): KopTemplateData {
  const saved = getSavedKopTemplate();
  return {
    kopImage: override?.kopImage !== undefined ? override.kopImage : (saved?.kopImage ?? null),
    kopImageHeight: override?.kopImageHeight ?? saved?.kopImageHeight ?? 120,
    kopImageFit: override?.kopImageFit ?? saved?.kopImageFit ?? 'contain',
    kopImageAlign: override?.kopImageAlign ?? saved?.kopImageAlign ?? 'center',
    kopImageOffsetY: override?.kopImageOffsetY ?? saved?.kopImageOffsetY ?? 0,
    kopImageOffsetX: override?.kopImageOffsetX ?? saved?.kopImageOffsetX ?? 0,
    kopImageMarginBottom: override?.kopImageMarginBottom ?? saved?.kopImageMarginBottom ?? 24,
    kopCompanyName: override?.kopCompanyName ?? saved?.kopCompanyName ?? 'PT. MITRA JASATRIA INDONESIA',
  };
}

export function saveKopTemplate(data: Partial<LetterData>): void {
  try {
    const current = getSavedKopTemplate();
    const updated: KopTemplateData = {
      kopImage: data.kopImage !== undefined ? data.kopImage : (current?.kopImage || null),
      kopImageHeight: data.kopImageHeight !== undefined ? data.kopImageHeight : (current?.kopImageHeight ?? 120),
      kopImageFit: data.kopImageFit !== undefined ? data.kopImageFit : (current?.kopImageFit ?? 'contain'),
      kopImageAlign: data.kopImageAlign !== undefined ? data.kopImageAlign : (current?.kopImageAlign ?? 'center'),
      kopImageOffsetY: data.kopImageOffsetY !== undefined ? data.kopImageOffsetY : (current?.kopImageOffsetY ?? 0),
      kopImageOffsetX: data.kopImageOffsetX !== undefined ? data.kopImageOffsetX : (current?.kopImageOffsetX ?? 0),
      kopImageMarginBottom: data.kopImageMarginBottom !== undefined ? data.kopImageMarginBottom : (current?.kopImageMarginBottom ?? 32),
      kopCompanyName: data.kopCompanyName !== undefined ? data.kopCompanyName : (current?.kopCompanyName ?? 'PT. MITRA JASATRIA INDONESIA'),
    };
    localStorage.setItem(STORAGE_KEY_KOP_TEMPLATE, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save kop template:', e);
  }
}
