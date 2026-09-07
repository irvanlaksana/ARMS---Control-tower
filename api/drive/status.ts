import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isGoogleAuthAvailable, getServiceAccountEmail } from '../lib/googleAuth';

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  const configured = isGoogleAuthAvailable();
  const serviceAccountEmail = configured ? getServiceAccountEmail() : null;

  return res.json({
    status: 'ok',
    service: 'Google Drive Storage',
    configured,
    serviceAccountEmail,
    instructions: configured
      ? 'Google Drive Service Account aktif dan siap menyimpan file JPG / dokumen.'
      : 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel atau .env.',
  });
}
