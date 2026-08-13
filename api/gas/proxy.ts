import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch {}
    }
    let { webAppUrl, googleSpreadsheetId, action, tab, payload, data, auditInfo } = body || {};
    if (!webAppUrl) {
      return res.status(400).json({ success: false, error: 'Missing webAppUrl parameter' });
    }

    webAppUrl = String(webAppUrl).trim();

    if (webAppUrl.endsWith('/dev')) {
      return res.status(400).json({
        success: false,
        error: 'URL berakhiran /dev membutuhkan login Google. Gunakan URL Web App resmi berakhiran /exec dari menu Deploy -> New deployment.',
      });
    }

    const spreadsheetId = googleSpreadsheetId || data?.settings?.googleSpreadsheetId;
    const postPayload = JSON.stringify({ action, tab, payload, data, auditInfo, googleSpreadsheetId: spreadsheetId, spreadsheetId });

    // Step 1: Send POST request to Google Apps Script with 25s timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    let response: Response;
    try {
      response = await fetch(webAppUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: postPayload,
        redirect: 'follow',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Step 2: Fallback manual redirect handling if status is 301/302/307/308
    if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        response = await fetch(redirectUrl, {
          method: 'GET',
        });
      }
    }

    const text = await response.text();
    let jsonRes;
    try {
      jsonRes = JSON.parse(text);
    } catch {
      if (text.includes('The page') || text.includes('<html') || text.includes('<!DOCTYPE') || text.includes('Google Accounts')) {
        return res.status(400).json({
          success: false,
          error: 'Google Apps Script mengembalikan halaman HTML/Akses Ditolak.\n\nPastikan Web App disebarkan (Deploy) dengan pengaturan:\n1. Execute as: Me (Saya)\n2. Who has access: Anyone (Siapa saja)\n3. Gunakan URL berakhiran /exec',
        });
      }
      return res.status(400).json({
        success: false,
        error: `Respon dari Google Apps Script tidak valid (Bukan JSON): ${text.slice(0, 150)}`,
      });
    }

    if (jsonRes.success === false) {
      return res.status(400).json(jsonRes);
    }

    return res.status(200).json(jsonRes);
  } catch (err: any) {
    console.error('GAS Proxy Error:', err?.message || err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal berkomunikasi dengan Web App Google Apps Script.',
    });
  }
}

