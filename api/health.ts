import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    system: 'ARMS - Control Tower Agency DC',
    database: 'Google Sheets',
    timestamp: new Date().toISOString(),
  });
}
