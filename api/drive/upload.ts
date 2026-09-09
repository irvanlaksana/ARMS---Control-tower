import type { VercelRequest, VercelResponse } from '@vercel/node';
import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { authFor, isGoogleAuthAvailable } from '../lib/googleAuth';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

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
    const { fileName, mimeType, base64, folderId } = req.body || {};
    if (!fileName || !base64) {
      return res.status(400).json({ success: false, error: 'Missing fileName or base64 data' });
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

    // Extract raw base64 and buffer
    const match = String(base64).match(/^data:(.+);base64,(.*)$/);
    const rawBase64 = match ? match[2] : base64;
    const effectiveMime = (match ? match[1] : mimeType) || 'image/jpeg';
    const buffer = Buffer.from(rawBase64, 'base64');

    const fileMetadata: any = {
      name: String(fileName).trim(),
    };
    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: effectiveMime,
      body: Readable.from(buffer),
    };

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = created.data.id as string;
    const webViewLink = created.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const directViewUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    // Set permission agar file bisa dilihat lewat link (jika diizinkan oleh domain/workspace)
    try {
      await drive.permissions.create({
        supportsAllDrives: true,
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permErr: any) {
      console.warn('Set Drive file permission note:', permErr?.message || permErr);
    }

    return res.json({
      success: true,
      configured: true,
      fileId,
      fileName: created.data.name || fileName,
      webViewLink,
      directViewUrl,
    });
  } catch (err: any) {
    console.error('Google Drive Upload Error:', err);
    const rawError = String(err?.message || err);
    let userFriendlyError = rawError;

    if (rawError.includes('Service Accounts do not have storage quota')) {
      userFriendlyError = 'Google Drive Service Account memerlukan Google Workspace Shared Drive (Drive Bersama) untuk unggah berkas fisik. Foto tetap tersimpan di database lokal/cloud.';
    }

    // Kembalikan HTTP 200 dengan flag success: false agar Vercel / serverless runtime
    // tidak menghasilkan halaman HTML error 500.
    return res.status(200).json({
      success: false,
      configured: true,
      quotaLimited: rawError.includes('Service Accounts do not have storage quota'),
      error: userFriendlyError,
    });
  }
}
