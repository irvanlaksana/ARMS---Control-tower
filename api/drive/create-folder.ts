import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createDriveFolder, driveJson, readJsonBody, respondDriveError } from '../lib/driveCore';

/**
 * POST /api/drive/create-folder  { name, parentId? }
 *
 * Catatan penting: kegagalan TIDAK dibalas dengan HTTP 500. Vercel menimpa body 500
 * dari fungsi yang crash/timeout dengan teks "A server error occurred.", dan
 * `resp.json()` di browser berubah menjadi
 *   SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON
 * yang menutupi penyebab sebenarnya (kuota, scope, folder master salah ID).
 * Karena itu response selalu JSON HTTP 200 dengan `success: false` + errorCode + hint.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return driveJson(res, { success: false, errorCode: 'bad_request', error: 'Method not allowed' }, 405);
  }

  try {
    const body = await readJsonBody(req);
    const name = String(body?.name ?? '').trim();
    if (!name) {
      return driveJson(res, {
        success: false,
        errorCode: 'bad_request',
        error: 'Nama folder kosong.',
        hint: 'Kirim body JSON { "name": "NAMA_FOLDER", "parentId": "ID_FOLDER_OPSIONAL" }.',
        retryable: false,
      });
    }

    const folder = await createDriveFolder(name, body?.parentId, { reuseExisting: true });
    return driveJson(res, {
      success: true,
      configured: true,
      folderId: folder.folderId,
      name: folder.name,
      webViewLink: folder.webViewLink,
      reused: folder.reused,
    });
  } catch (err: any) {
    return respondDriveError(res, err);
  }
}
