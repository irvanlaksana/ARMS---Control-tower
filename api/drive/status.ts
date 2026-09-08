import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isGoogleAuthAvailable, getServiceAccountEmail } from '../lib/googleAuth.js';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const configured = isGoogleAuthAvailable();
    const serviceAccountEmail = configured ? getServiceAccountEmail() : null;

    return res.status(200).json({
      status: 'ok',
      service: 'Google Drive Storage',
      configured,
      serviceAccountEmail,
      instructions: configured
        ? 'Google Drive Service Account aktif dan siap membuat folder serta menyimpan berkas.'
        : 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
    });
  } catch (err: any) {
    return res.status(200).json({
      status: 'error',
      service: 'Google Drive Storage',
      configured: false,
      serviceAccountEmail: null,
      instructions: `Gagal membaca kredensial Service Account: ${err?.message || err}`,
    });
  }
}
