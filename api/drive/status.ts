import type { VercelRequest, VercelResponse } from '@vercel/node';
import { driveJson, probeDriveAccess } from '../lib/driveCore';

/**
 * GET /api/drive/status            → cek kredensial + token + akses Drive API
 * GET /api/drive/status?probe=1&folderId=<ID> → + verifikasi folder master bisa ditulis
 * Selalu JSON; probing tidak boleh membuat endpoint gagal.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const probe = ['1', 'true', 'yes'].includes(String(req.query?.probe ?? '').toLowerCase());
    const folderId = (req.query?.folderId || req.query?.rootId || '') as string;
    const result = await probeDriveAccess(probe ? folderId : null);
    return driveJson(res, {
      status: 'ok',
      service: 'Google Drive Storage',
      probed: probe,
      ...result,
      instructions:
        result.instructions ||
        (result.configured
          ? 'Google Drive Service Account aktif dan siap menyimpan folder/berkas.'
          : 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.'),
    });
  } catch (err: any) {
    return driveJson(res, {
      status: 'error',
      service: 'Google Drive Storage',
      configured: false,
      error: err?.message || 'Gagal memeriksa status Google Drive.',
    });
  }
}
