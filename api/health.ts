import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isGoogleAuthAvailable } from './lib/googleAuth.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const supabaseConfigured = Boolean(
    (process.env.VITE_SUPABASE_URL || 'https://bluniectqqczskfyfyso.supabase.co') &&
    (process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_bc3UYiLZeWXey2dzlnRzWA_3XScheOU')
  );
  const driveConfigured = isGoogleAuthAvailable();

  res.status(200).json({
    status: 'ok',
    system: 'ARMS - Control Tower Agency DC',
    database: 'Supabase Database',
    supabaseConfigured,
    storage: 'Google Drive Storage',
    driveConfigured,
    timestamp: new Date().toISOString(),
  });
}
