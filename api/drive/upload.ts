import type { VercelRequest, VercelResponse } from '@vercel/node';
import { driveJson, readJsonBody, respondDriveError, uploadDriveBuffer } from '../lib/driveCore';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

/**
 * POST /api/drive/upload  { fileName, mimeType?, base64, folderId? }
 * Balasan selalu JSON HTTP 200 (lihat komentar di ./create-folder.ts) supaya frontend
 * tetap bisa memutuskan fallback base64 tanpa SyntaxError saat parse.
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
    const { fileName, mimeType, base64, folderId } = body || {};
    if (!fileName || !base64) {
      return driveJson(res, {
        success: false,
        errorCode: 'bad_request',
        error: 'Body permintaan tidak memuat "fileName" atau "base64".',
        hint: 'Unggah ulang berkasnya; bila tetap gagal, berkas terlalu besar untuk fungsi server (maks ±4,5 MB setelah base64).',
        retryable: false,
      });
    }

    const uploaded = await uploadDriveBuffer({ fileName, base64, mimeType, folderId });
    return driveJson(res, {
      success: true,
      configured: true,
      fileId: uploaded.fileId,
      fileName: uploaded.fileName,
      webViewLink: uploaded.webViewLink,
      directViewUrl: uploaded.directViewUrl,
      sizeBytes: uploaded.sizeBytes,
    });
  } catch (err: any) {
    return respondDriveError(res, err);
  }
}
