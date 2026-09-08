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
    const { path, rootId } = req.body || {};
    if (!Array.isArray(path) || path.filter(Boolean).length === 0) {
      return res.status(400).json({ success: false, error: 'Missing path (array of folder names)' });
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

    let currentParentId: string | undefined = rootId || undefined;
    const created: Array<{ name: string; folderId: string; webViewLink: string }> = [];
    let lastFolderId = currentParentId || '';
    let lastWebViewLink = currentParentId ? `https://drive.google.com/drive/folders/${currentParentId}?usp=sharing` : '';

    for (const rawName of path) {
      const name = String(rawName).trim();
      if (!name) continue;

      let existingId: string | undefined;
      if (currentParentId) {
        const query = `name = '${name.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
        try {
          const list = await drive.files.list({
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            q: query,
            fields: 'files(id, name)',
            pageSize: 1,
          });
          existingId = list.data.files?.[0]?.id;
        } catch (searchErr) {
          console.warn('Drive search failed, continuing to create:', searchErr);
        }
      }

      let folderId = existingId;
      if (!folderId) {
        const fileMetadata: any = {
          name,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (currentParentId) fileMetadata.parents = [currentParentId];
        const createdFile = await drive.files.create({
          supportsAllDrives: true,
          requestBody: fileMetadata,
          fields: 'id, webViewLink, name',
        });
        folderId = createdFile.data.id as string;
        created.push({
          name,
          folderId,
          webViewLink: `https://drive.google.com/drive/folders/${folderId}?usp=sharing`,
        });

        try {
          await drive.permissions.create({
            supportsAllDrives: true,
            fileId: folderId,
            requestBody: { role: 'reader', type: 'anyone' },
          });
        } catch {
          // ignore permission errors
        }
      }

      currentParentId = folderId;
      lastFolderId = folderId;
      lastWebViewLink = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;
    }

    return res.json({
      success: true,
      configured: true,
      folderId: lastFolderId,
      webViewLink: lastWebViewLink,
      created,
    });
  } catch (err: any) {
    console.error('Google Drive Ensure Path Error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Gagal membuat struktur folder Google Drive',
    });
  }
}
