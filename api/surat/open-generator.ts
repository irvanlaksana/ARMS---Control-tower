import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { skNumber, skId, debtor, personnel, driveDocumentUrl } = req.body || {};
    if (!debtor || !personnel) {
      return res.status(400).json({ success: false, error: 'Missing debtor or personnel data' });
    }

    const generatorBase = 'https://generator-surat-new.vercel.app';
    const payload = { skNumber, skId, debtor, personnel, driveDocumentUrl };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    const generatorUrl = `${generatorBase}/?payload=${encodeURIComponent(encoded)}`;

    return res.json({ success: true, url: generatorUrl });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Failed creating generator link' });
  }
}
