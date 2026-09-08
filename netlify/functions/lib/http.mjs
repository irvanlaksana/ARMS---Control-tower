/**
 * Helper HTTP untuk Netlify Functions (CORS + JSON + body parsing).
 */

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  'Content-Type': 'application/json; charset=utf-8',
};

/** Buat Response JSON. */
export function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: CORS_HEADERS });
}

/** Tangani preflight OPTIONS. */
export function preflight(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: CORS_HEADERS });
  }
  return null;
}

/** Baca body JSON (aman: kosong -> {}). */
export async function readJsonBody(req) {
  try {
    if (!req.body) return {};
    const text = await req.text();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}
