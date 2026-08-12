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
    let { webAppUrl, action, tab, payload, data, auditInfo } = req.body || {};
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

    const postPayload = JSON.stringify({ action, tab, payload, data, auditInfo });

    // Step 1: Initial POST request with redirect manual to capture GAS 302 redirect
    let response = await fetch(webAppUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: postPayload,
      redirect: 'manual',
    });

    // Step 2: Handle 301/302/307/308 redirect manually to preserve POST method & body
    if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
      const redirectUrl = response.headers.get('location');
      if (redirectUrl) {
        response = await fetch(redirectUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: postPayload,
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

