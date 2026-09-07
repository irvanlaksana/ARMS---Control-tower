import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { authFor, isGoogleAuthAvailable } from '../lib/googleAuth';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { name, parentId } = req.body || {};
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, error: 'Missing folder name' });
    }

    if (!isGoogleAuthAvailable()) {
      return res.status(200).json({
        success: false,
        configured: false,
        error: 'Google Drive Service Account belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Vercel.',
      });
    }

    const auth = authFor(['https://www.googleapis.com/auth/drive.file']);
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata: any = {
      name: String(name).trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const created = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, webViewLink, name',
    });

    const folderId = created.data.id as string;
    const webViewLink = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;

    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr: any) {
      console.warn('Set Drive folder permission note:', permErr?.message || permErr);
    }

    return res.json({
      success: true,
      configured: true,
      folderId,
      name: created.data.name || String(name).trim(),
      webViewLink,
    });
  } catch (err: any) {
    console.error('Google Drive Create Folder Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal membuat folder di Google Drive',
    });
  }
}
