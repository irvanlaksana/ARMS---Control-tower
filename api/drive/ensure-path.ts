import type { VercelRequest, VercelResponse } from '@vercel/node';
import { driveJson, ensureDrivePathCore, readJsonBody, respondDriveError } from '../lib/driveCore';

/**
 * POST /api/drive/ensure-path  { path: string[], rootId? }
 * Pastikan struktur folder bertingkat ada (dibuat hanya yang belum ada).
 * Selalu membalas JSON (HTTP 200) — lihat komentar di ./create-folder.ts.
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
    const path = body?.path ?? body?.segments;
    if (!Array.isArray(path) || path.filter(Boolean).length === 0) {
      return driveJson(res, {
        success: false,
        errorCode: 'bad_request',
        error: 'Parameter "path" wajib berupa array nama folder (min. 1).',
        hint: 'Contoh: { "path": ["PT_MJ_INDONESIA","DATABASE_KARYAWAN","BUDI SANTOSO"], "rootId": "ID_FOLDER_MASTER" }.',
        retryable: false,
      });
    }

    const result = await ensureDrivePathCore(path, body?.rootId ?? body?.parentId);
    return driveJson(res, {
      success: true,
      configured: true,
      folderId: result.folderId,
      webViewLink: result.webViewLink,
      created: result.created,
      reusedPath: result.reusedPath,
    });
  } catch (err: any) {
    return respondDriveError(res, err);
  }
}
