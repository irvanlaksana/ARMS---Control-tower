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

    const auth = authFor(['https://www.googleapis.com/auth/drive']);
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata: any = {
      name: String(name).trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: fileMetadata,
      fields: 'id, webViewLink, name',
    });

    const folderId = created.data.id as string;
    const webViewLink = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;

    try {
      await drive.permissions.create({
        supportsAllDrives: true,
        fileId: folderId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr: any) {
      console.warn('Set Drive folder permission note:', permErr?.message || permErr);
    }

    return res.status(200).json({
      success: true,
      configured: true,
      folderId,
      name: created.data.name || String(name).trim(),
      webViewLink,
    });
  } catch (err: any) {
    console.error('Google Drive Create Folder Error:', err);
    const rawError = String(err?.message || err);
    let userFriendlyError = rawError;

    if (rawError.includes('File not found') || rawError.includes('notFound')) {
      userFriendlyError = 'Folder master Google Drive tidak ditemukan atau belum dibagikan (share) dengan email Service Account.';
    } else if (rawError.includes('The user does not have sufficient permissions') || rawError.includes('insufficientPermissions')) {
      userFriendlyError = 'Izin tidak cukup. Pastikan email Service Account diberi hak akses Editor pada folder master.';
    } else if (rawError.includes('Service Accounts do not have storage quota')) {
      userFriendlyError = 'Service Account Google Drive memerlukan folder di dalam Google Workspace Shared Drive (Drive Bersama).';
    } else if (rawError.includes('invalid_grant')) {
      userFriendlyError = 'Kredensial Service Account tidak valid atau jam sistem tidak sinkron (invalid_grant). Periksa GOOGLE_SERVICE_ACCOUNT_JSON.';
    }

    // Kembalikan HTTP 200 agar Vercel tidak menghasilkan halaman HTML error 500
    return res.status(200).json({
      success: false,
      error: userFriendlyError,
    });
  }
}
