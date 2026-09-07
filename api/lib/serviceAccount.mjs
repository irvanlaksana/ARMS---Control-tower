/**
 * Normalisasi & validasi kredensial Google Service Account.
 *
 * Dipakai bersama oleh:
 *   - api/lib/googleAuth.ts        (runtime server: Sheets & Drive)
 *   - scripts/validate-google-creds.mjs (CLI validasi)
 *
 * File JSON service account dari Google Cloud sebenarnya sudah valid apa adanya.
 * Yang sering rusak adalah SAAT DITEMPEL ke environment variable / secret manager:
 *
 *   1. `\n` pada private_key berubah jadi baris baru sungguhan
 *      → JSON.parse gagal: "Bad control character in string literal".
 *   2. `\n` ter-escape ganda jadi `\\n`
 *      → PEM tidak terbaca: "error:1E08010C:DECODER routines::unsupported".
 *   3. Nilai env terbungkus kutip (') atau (") ikut tersimpan
 *      → JSON.parse gagal di karakter pertama.
 *   4. Secret disimpan sebagai base64 (umum di Cloud Run / K8s secret).
 *   5. Baris PEM ter-join jadi satu baris panjang, atau CRLF (Windows), atau ada BOM.
 *
 * Modul ini memulihkan kelima kasus di atas lalu memverifikasi hasilnya,
 * sehingga pesan error yang muncul spesifik dan bisa ditindaklanjuti.
 */

const REQUIRED_FIELDS = ["type", "project_id", "private_key", "client_email"];

/** Buang BOM + whitespace tepi. */
const stripBom = (value) => value.replace(/^\uFEFF/, "").trim();

/** Buang kutip pembungkus yang ikut tersimpan di env (mis. GOOGLE_..._JSON='{...}'). */
const stripWrappingQuotes = (value) => {
  const v = value.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return v.slice(1, -1).trim();
    }
  }
  return v;
};

/**
 * Escape karakter kontrol mentah (newline/tab/CR) yang berada DI DALAM string JSON.
 * Ini memperbaiki JSON yang rusak karena private_key ditempel dengan baris baru asli.
 */
const escapeRawControlCharsInStrings = (text) => {
  let out = "";
  let inString = false;
  let escaped = false;

  for (const ch of text) {
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      out += ch;
      continue;
    }
    if (inString) {
      if (ch === "\n") { out += "\\n"; continue; }
      if (ch === "\r") { out += "\\r"; continue; }
      if (ch === "\t") { out += "\\t"; continue; }
    }
    out += ch;
  }
  return out;
};

/** Coba decode base64 → JSON (dipakai bila secret disimpan dalam bentuk base64). */
const tryDecodeBase64Json = (value) => {
  const compact = value.replace(/\s+/g, "");
  if (!compact || /[^A-Za-z0-9+/=_-]/.test(compact)) return null;
  try {
    const decoded = Buffer.from(compact, "base64").toString("utf8");
    return decoded.includes('"type"') || decoded.trimStart().startsWith("{") ? decoded : null;
  } catch {
    return null;
  }
};

/**
 * Parse teks kredensial menjadi objek, dengan beberapa lapis pemulihan.
 * @param {string} rawText
 * @param {string} origin  keterangan sumber untuk pesan error
 */
export const parseServiceAccountText = (rawText, origin = "kredensial") => {
  if (typeof rawText !== "string" || !rawText.trim()) {
    throw new Error(`${origin} kosong.`);
  }

  const candidates = [];
  const base = stripWrappingQuotes(stripBom(rawText));
  candidates.push(base);

  const fromBase64 = tryDecodeBase64Json(base);
  if (fromBase64) candidates.push(stripBom(fromBase64));

  // Lapis terakhir: perbaiki newline mentah di dalam string JSON.
  for (const c of [...candidates]) candidates.push(escapeRawControlCharsInStrings(c));

  let lastError;
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
      lastError = new Error("isi JSON bukan objek service account.");
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `${origin} bukan JSON valid: ${lastError?.message || lastError}. ` +
      "Tempel ulang seluruh isi file service-account.json (pertahankan \\n pada private_key), " +
      "atau simpan sebagai base64.",
  );
};

/**
 * Rapikan blok PEM private key:
 * - `\\n` / `\n` literal → baris baru sungguhan
 * - CRLF → LF, buang BOM & kutip pembungkus
 * - body base64 dibungkus ulang 64 karakter per baris
 * - dipastikan diakhiri satu baris baru
 */
export const normalizePrivateKey = (value) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error('"private_key" kosong atau bukan teks.');
  }

  let key = stripWrappingQuotes(stripBom(value));
  key = key.replace(/\\\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "");
  key = key.replace(/\r\n?/g, "\n");

  const match = key.match(
    /-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/,
  );
  if (!match) {
    throw new Error(
      '"private_key" tidak berbentuk PEM yang utuh (butuh "-----BEGIN PRIVATE KEY-----" ' +
        'sampai "-----END PRIVATE KEY-----"). Kemungkinan nilainya terpotong saat disalin.',
    );
  }

  const label = match[1];
  const body = match[2].replace(/\s+/g, "");
  if (!body) throw new Error('"private_key" tidak memiliki isi di antara header dan footer PEM.');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(body)) {
    throw new Error('"private_key" mengandung karakter non-base64 — kemungkinan rusak saat disalin.');
  }

  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${label}-----\n${wrapped}\n-----END ${label}-----\n`;
};

/**
 * Normalisasi objek kredensial + validasi field wajib.
 * Mengembalikan objek baru (tidak memodifikasi input).
 */
export const normalizeServiceAccount = (input, origin = "kredensial") => {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error(`${origin} bukan objek service account.`);
  }

  const creds = { ...input };

  for (const key of Object.keys(creds)) {
    if (typeof creds[key] === "string" && key !== "private_key") {
      creds[key] = stripBom(creds[key]);
    }
  }

  const missing = REQUIRED_FIELDS.filter((f) => !creds[f] || !String(creds[f]).trim());
  if (missing.length > 0) {
    throw new Error(
      `${origin}: field wajib tidak ada/kosong → ${missing.join(", ")}. ` +
        "Unduh ulang key JSON dari Google Cloud Console (IAM → Service Accounts → Keys).",
    );
  }

  creds.private_key = normalizePrivateKey(creds.private_key);

  return creds;
};

/** Pemeriksaan konsistensi non-fatal; mengembalikan array pesan peringatan. */
export const inspectServiceAccount = (creds) => {
  const warnings = [];

  if (creds.type !== "service_account") {
    warnings.push(`"type" = "${creds.type}" (seharusnya "service_account" untuk file key).`);
  }
  if (!/@[^@]+\.iam\.gserviceaccount\.com$/.test(String(creds.client_email))) {
    warnings.push(`"client_email" tidak lazim: ${creds.client_email}`);
  } else if (
    creds.project_id &&
    !String(creds.client_email).endsWith(`@${creds.project_id}.iam.gserviceaccount.com`)
  ) {
    warnings.push(
      `"client_email" (${creds.client_email}) bukan milik project "${creds.project_id}" — pastikan tidak tertukar antar project.`,
    );
  }
  if (creds.private_key_id && !/^[0-9a-f]{40}$/.test(String(creds.private_key_id))) {
    warnings.push('"private_key_id" tidak berformat 40 karakter heksadesimal.');
  }
  if (creds.client_id && !/^\d+$/.test(String(creds.client_id))) {
    warnings.push('"client_id" seharusnya berupa angka.');
  }
  if (creds.token_uri && creds.token_uri !== "https://oauth2.googleapis.com/token") {
    warnings.push(`"token_uri" tidak standar: ${creds.token_uri}`);
  }
  if (creds.client_email && creds.client_x509_cert_url) {
    const expected =
      "https://www.googleapis.com/robot/v1/metadata/x509/" +
      encodeURIComponent(String(creds.client_email));
    if (creds.client_x509_cert_url !== expected) {
      warnings.push('"client_x509_cert_url" tidak cocok dengan client_email (harus URL-encoded).');
    }
  }

  return warnings;
};

/** Verifikasi private_key benar-benar bisa dipakai menandatangani (RS256). */
export const assertPrivateKeyUsable = async (creds) => {
  const { createSign } = await import("node:crypto");
  try {
    const signer = createSign("RSA-SHA256");
    signer.update("arms-control-tower-credential-selftest");
    signer.sign(creds.private_key);
  } catch (err) {
    throw new Error(
      `"private_key" tidak dapat dipakai menandatangani JWT: ${err?.message || err}. ` +
        "Key kemungkinan rusak/terpotong — buat key JSON baru di Google Cloud Console.",
    );
  }
};

export { REQUIRED_FIELDS };
