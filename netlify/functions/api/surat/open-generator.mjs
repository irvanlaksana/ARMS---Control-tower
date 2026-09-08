import { json, preflight, readJsonBody } from '../../lib/http.mjs';
import { suratOpenGenerator } from '../../lib/surat.mjs';

/** POST /api/surat/open-generator  { skNumber, skId, debtor, personnel, driveDocumentUrl? } */
export default async function handler(req) {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const body = await readJsonBody(req);
  return json(await suratOpenGenerator(body));
}
