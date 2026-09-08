import { json, preflight } from '../../lib/http.mjs';
import { driveStatus } from '../../lib/drive.mjs';

/** GET /api/drive/status */
export default async function handler(req) {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    return json(await driveStatus());
  } catch (err) {
    return json({
      status: 'error',
      service: 'Google Drive Storage',
      configured: false,
      serviceAccountEmail: null,
      instructions: `Gagal membaca kredensial Service Account: ${err?.message || err}`,
    });
  }
}
