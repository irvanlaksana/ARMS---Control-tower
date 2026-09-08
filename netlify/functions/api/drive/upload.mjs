import { json, preflight, readJsonBody } from '../../lib/http.mjs';
import { driveUpload } from '../../lib/drive.mjs';

/** POST /api/drive/upload  { fileName, mimeType, base64, folderId? } */
export default async function handler(req) {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const body = await readJsonBody(req);
  return json(await driveUpload(body));
}
