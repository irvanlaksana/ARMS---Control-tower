import { json, preflight, readJsonBody } from '../../lib/http.mjs';
import { sheetsSetup } from '../../lib/sheets.mjs';

/** POST /api/sheets/setup  { spreadsheetId, tabs? } */
export default async function handler(req) {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const body = await readJsonBody(req);
  return json(await sheetsSetup(body));
}
