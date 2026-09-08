import { json, preflight, readJsonBody } from '../../lib/http.mjs';
import { driveCreateFolder } from '../../lib/drive.mjs';

/** POST /api/drive/create-folder  { name, parentId? } */
export default async function handler(req) {
  const pre = preflight(req);
  if (pre) return pre;
  if (req.method !== 'POST') return json({ success: false, error: 'Method not allowed' }, 405);

  const body = await readJsonBody(req);
  return json(await driveCreateFolder(body));
}
