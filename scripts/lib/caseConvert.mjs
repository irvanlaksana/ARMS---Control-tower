/**
 * caseConvert.mjs
 * ---------------------------------------------------------------------------
 * Konversi nama snake_case (PostgreSQL / skema lama) ke camelCase (TypeScript
 * / field Firestore) dan sebaliknya.
 *
 * SATU sumber logika untuk generator skema, adapter Firestore, dan skrip
 * migrasi — mencegah bugs penamaan seperti gDriveFolderUrl -> g_drive_folder_url
 * padahal kolom aslinya gdrive_folder_url.
 */

/**
 * Penamaan khusus yang TIDAK bisa dihasilkan oleh aturan konversi otomatis.
 * key = nama camelCase, value = nama snake_case yang sebenarnya.
 */
export const CAMEL_TO_SNAKE_OVERRIDES = {
  gDriveFolderUrl: 'gdrive_folder_url',
  gDriveFolderId: 'gdrive_folder_id',
  gDriveFolderName: 'gdrive_folder_name',
};

/** Kebalikan dari CAMEL_TO_SNAKE_OVERRIDES. */
export const SNAKE_TO_CAMEL_OVERRIDES = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE_OVERRIDES).map(([camel, snake]) => [snake, camel])
);

/** Field camelCase yang mengandung akronim kapital (hasil snakeToCamel biasa salah). */
const REVERSE_ACRONYM_FIELDS = {
  principalDebtOs: 'principalDebtOS',
  policeNoVin: 'policeNoVIN',
};

/**
 * camelCase -> snake_case dengan penanganan akronim.
 *   principalDebtOS -> principal_debt_os   (bukan principal_debt_o_s)
 *   policeNoVIN     -> police_no_vin       (bukan police_no_v_i_n)
 *   gDriveFolderUrl -> gdrive_folder_url   (via override)
 */
export function camelToSnake(str) {
  if (CAMEL_TO_SNAKE_OVERRIDES[str]) return CAMEL_TO_SNAKE_OVERRIDES[str];
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * snake_case -> camelCase, konsisten dengan camelToSnake di atas.
 *   principal_debt_os -> principalDebtOS
 *   police_no_vin     -> policeNoVIN
 *   gdrive_folder_url -> gDriveFolderUrl
 */
export function snakeToCamel(str) {
  if (SNAKE_TO_CAMEL_OVERRIDES[str]) return SNAKE_TO_CAMEL_OVERRIDES[str];
  const camel = str.replace(/_([a-z0-9])/g, (_, letter) => letter.toUpperCase());
  return REVERSE_ACRONYM_FIELDS[camel] || camel;
}

/** Konversi rekursif seluruh key objek. */
export function convertKeys(obj, converter) {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map((item) => convertKeys(item, converter));
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    out[converter(key)] = convertKeys(value, converter);
  }
  return out;
}
