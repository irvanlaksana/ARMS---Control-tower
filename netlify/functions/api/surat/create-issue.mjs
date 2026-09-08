import { json, preflight, readJsonBody } from '../../lib/http.mjs';
import { suratCreateIssue } from '../../lib/surat.mjs';

/** POST /api/surat/create-issue  { skNumber, skId, debtor, personnel, driveDocumentUrl? } */
export default async function handler(req) {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const body = await readJsonBody(req);
  const result = await suratCreateIssue(body);
  return json(result, result.success ? 200 : 500);
}
