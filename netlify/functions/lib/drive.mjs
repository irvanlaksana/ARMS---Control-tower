/**
 * Operasi Google Drive (Service Account) — dipakai bersama oleh Netlify
 * Functions dan server lokal (server.ts).
 *
 * Setiap fungsi mengembalikan objek payload `{ success, ... }` (bukan
 * Response) agar bisa dipakai di Express maupun Netlify.
 */

import { google } from 'googleapis';
import { Readable } from 'node:stream';
import { authFor, isGoogleAuthAvailable, getServiceAccountEmail } from './googleAuth.mjs';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive';

const NOT_CONFIGURED = {
  success: false,
  configured: false,
  error:
    'Google Drive Service Account belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Netlify (Site settings → Environment variables) atau .env lokal.',
};

function friendlyDriveError(rawError) {
  const msg = String(rawError || '');
  if (msg.includes('File not found') || msg.includes('notFound')) {
    return 'Folder master Google Drive tidak ditemukan atau belum dibagikan (share) dengan email Service Account.';
  }
  if (msg.includes('The user does not have sufficient permissions') || msg.includes('insufficientPermissions')) {
    return 'Izin tidak cukup. Pastikan email Service Account diberi hak akses Editor pada folder master.';
  }
  if (msg.includes('Service Accounts do not have storage quota')) {
    return 'Service Account Google Drive memerlukan folder di dalam Google Workspace Shared Drive (Drive Bersama).';
  }
  if (msg.includes('invalid_grant')) {
    return 'Kredensial Service Account tidak valid atau jam sistem tidak sinkron (invalid_grant). Periksa GOOGLE_SERVICE_ACCOUNT_JSON.';
  }
  return msg || 'Terjadi kesalahan saat mengakses Google Drive.';
}

/** GET /api/drive/status */
export async function driveStatus() {
  const configured = isGoogleAuthAvailable();
  const serviceAccountEmail = configured ? getServiceAccountEmail() : null;
  return {
    status: 'ok',
    service: 'Google Drive Storage',
    configured,
    serviceAccountEmail,
    instructions: configured
      ? 'Google Drive Service Account aktif dan siap membuat folder serta menyimpan berkas.'
      : 'Google Drive belum dikonfigurasi. Tambahkan GOOGLE_SERVICE_ACCOUNT_JSON di Netlify atau .env.',
  };
}

/** POST /api/drive/create-folder  { name, parentId? } */
export async function driveCreateFolder({ name, parentId } = {}) {
  if (!name || !String(name).trim()) {
    return { success: false, error: 'Missing folder name' };
  }
  if (!isGoogleAuthAvailable()) return NOT_CONFIGURED;

  try {
    const auth = authFor([DRIVE_SCOPE]);
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: String(name).trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) fileMetadata.parents = [parentId];

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: fileMetadata,
      fields: 'id, webViewLink, name',
    });

    const folderId = created.data.id;
    const webViewLink = `https://drive.google.com/drive/folders/${folderId}?usp=sharing`;

    try {
      await drive.permissions.create({
        supportsAllDrives: true,
        fileId: folderId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permErr) {
      console.warn('Set Drive folder permission note:', permErr?.message || permErr);
    }

    return {
      success: true,
      configured: true,
      folderId,
      name: created.data.name || String(name).trim(),
      webViewLink,
    };
  } catch (err) {
    console.error('Drive Create Folder Error:', err?.message || err);
    return { success: false, error: friendlyDriveError(err?.message) };
  }
}

/** POST /api/drive/ensure-path  { path: string[], rootId? } */
export async function driveEnsurePath({ path: folderPath, rootId } = {}) {
  if (!Array.isArray(folderPath) || folderPath.filter(Boolean).length === 0) {
    return { success: false, error: 'Missing path (array of folder names)' };
  }
  if (!isGoogleAuthAvailable()) return NOT_CONFIGURED;

  try {
    const auth = authFor([DRIVE_SCOPE]);
    const drive = google.drive({ version: 'v3', auth });

    let currentParentId = rootId || undefined;
    const created = [];
    let lastFolderId = currentParentId || '';
    let lastWebViewLink = currentParentId ? `https://drive.google.com/drive/folders/${currentParentId}?usp=sharing` : '';

    for (const rawName of folderPath) {
      const name = String(rawName).trim();
      if (!name) continue;

      let existingId;
      if (currentParentId) {
        const query = `name = '${name.replace(/'/g, "\\'")}' and '${currentParentId}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.folder'`;
        try {
          const list = await drive.files.list({
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
            q: query,
            fields: 'files(id, name)',
            pageSize: 1,
          });
          existingId = list.data.files?.[0]?.id;
        } catch {
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
            console.warn('Drive folder search failed, will create:', String(searchErr));
          }
        }
      }

      let folderId = existingId;
      if (!folderId) {
        const fileMetadata = { name, mimeType: 'application/vnd.google-apps.folder' };
        if (currentParentId) fileMetadata.parents = [currentParentId];
        const createdFile = await drive.files.create({
          supportsAllDrives: true,
          requestBody: fileMetadata,
          fields: 'id, webViewLink, name',
        });
        folderId = createdFile.data.id;
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

    if (!lastFolderId) {
      return { success: false, error: 'No folder could be created. Check root folder permission.' };
    }

    return {
      success: true,
      configured: true,
      folderId: lastFolderId,
      webViewLink: lastWebViewLink,
      created,
    };
  } catch (err) {
    console.error('Drive Ensure Path Error:', err?.message || err);
    return { success: false, error: friendlyDriveError(err?.message) };
  }
}

/** POST /api/drive/upload  { fileName, mimeType, base64, folderId? } */
export async function driveUpload({ fileName, mimeType, base64, folderId } = {}) {
  if (!fileName || !base64) {
    return { success: false, error: 'Missing fileName or base64 payload' };
  }
  if (!isGoogleAuthAvailable()) return NOT_CONFIGURED;

  try {
    const auth = authFor([DRIVE_SCOPE]);
    const drive = google.drive({ version: 'v3', auth });

    // Strip data URL prefix if present
    const dataUrlMatch = String(base64).match(/^data:(.+);base64,(.*)$/);
    const rawBase64 = dataUrlMatch ? dataUrlMatch[2] : base64;
    const buffer = Buffer.from(rawBase64, 'base64');
    const effectiveMime = (dataUrlMatch ? dataUrlMatch[1] : mimeType) || 'application/octet-stream';

    const media = {
      mimeType: effectiveMime,
      body: Readable.from(buffer),
    };

    const fileMetadata = { name: String(fileName).trim() };
    if (folderId) fileMetadata.parents = [folderId];

    const created = await drive.files.create({
      supportsAllDrives: true,
      requestBody: fileMetadata,
      media,
      fields: 'id, name, webViewLink, webContentLink',
    });

    const fileId = created.data.id;
    const webViewLink = created.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=sharing`;
    const directViewUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;

    try {
      await drive.permissions.create({
        supportsAllDrives: true,
        fileId,
        requestBody: { role: 'reader', type: 'anyone' },
      });
    } catch (permErr) {
      console.warn('Set Drive file permission note:', permErr?.message || permErr);
    }

    return {
      success: true,
      configured: true,
      fileId,
      fileName: created.data.name || fileName,
      webViewLink,
      directViewUrl,
    };
  } catch (err) {
    console.error('Drive Upload Error:', err?.message || err);
    const rawError = String(err?.message || err);
    let userFriendlyError = friendlyDriveError(rawError);
    if (rawError.includes('Service Accounts do not have storage quota')) {
      userFriendlyError = 'Google Drive Service Account memerlukan Google Workspace Shared Drive (Drive Bersama) untuk unggah berkas fisik.';
    }
    return {
      success: false,
      configured: true,
      quotaLimited: rawError.includes('Service Accounts do not have storage quota'),
      error: userFriendlyError,
    };
  }
}
