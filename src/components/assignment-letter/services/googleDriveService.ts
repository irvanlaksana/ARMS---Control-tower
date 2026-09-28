// Google Drive API Client Service using GIS Token Client
// Multi-finance parent folder: 1y6uAMRHxV3CWu5mdYFnz95-zIMZhU9zk
// Sample debtor folder reference: 1-Ym58PdL7h9AV_EwXwBUljPNBVsRo9fA

export const SKP_ROOT_FOLDER_ID = '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS';
export const MULTI_FINANCE_ROOT_FOLDER_ID = SKP_ROOT_FOLDER_ID;

import firebaseConfig from '../../../../firebase-applet-config.json';
const CLIENT_ID = firebaseConfig.oAuthClientId; // Provided by AI Studio OAuth setup
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

let tokenClient: any = null;
let currentAccessToken: string | null = null;
let tokenExpiresAt: number = 0;
let pendingTokenPromise: Promise<string> | null = null;

export interface DriveFolder {
  id: string;
  name: string;
  mimeType?: string;
  webViewLink?: string;
}

export interface DriveFileResult {
  id: string;
  name: string;
  webViewLink?: string;
}

/**
 * Initialize GIS Token Client
 */
export async function initGoogleAuth(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();

    // Check if google scripts loaded
    const checkGis = () => {
      if ((window as any).google?.accounts?.oauth2) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: (window as any).__GOOGLE_CLIENT_ID__ || CLIENT_ID,
          scope: SCOPES,
          callback: () => {}, // overridden in getAccessToken
        });
        resolve();
      } else {
        setTimeout(checkGis, 150);
      }
    };

    checkGis();
  });
}

/**
 * Get access token via GIS popup or cached token
 */
export async function getAccessToken(): Promise<string> {
  // Check if current token valid
  if (currentAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return currentAccessToken;
  }

  // If token in localStorage
  const cached = localStorage.getItem('gdrive_access_token');
  const cachedExp = Number(localStorage.getItem('gdrive_token_exp') || '0');
  if (cached && Date.now() < cachedExp - 60000) {
    currentAccessToken = cached;
    tokenExpiresAt = cachedExp;
    return cached;
  }

  if (pendingTokenPromise) {
    return pendingTokenPromise;
  }

  pendingTokenPromise = new Promise<string>((resolve, reject) => {
    try {
      if (!(window as any).google?.accounts?.oauth2) {
        throw new Error('Google Identity Services belum dimuat. Silakan refresh halaman.');
      }

      // Check if client ID is dynamically provided by AI Studio environment
      const clientId =
        (window as any).__GOOGLE_CLIENT_ID__ || CLIENT_ID;

      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: SCOPES,
        callback: (resp: any) => {
          pendingTokenPromise = null;
          if (resp.error) {
            return reject(new Error(resp.error_description || resp.error));
          }
          currentAccessToken = resp.access_token;
          tokenExpiresAt = Date.now() + (Number(resp.expires_in) || 3600) * 1000;
          localStorage.setItem('gdrive_access_token', currentAccessToken || '');
          localStorage.setItem('gdrive_token_exp', String(tokenExpiresAt));
          resolve(currentAccessToken as string);
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    } catch (e) {
      pendingTokenPromise = null;
      reject(e);
    }
  });

  return pendingTokenPromise;
}

export async function getFolderMetadata(folderId: string): Promise<DriveFolder> {
  try {
    const token = await getAccessToken();
    const url = `https://www.googleapis.com/drive/v3/files/${folderId}?fields=id,name,mimeType,webViewLink&supportsAllDrives=true`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Could not fetch folder metadata, using fallback', e);
  }

  return {
    id: folderId,
    name: 'SKP',
    mimeType: 'application/vnd.google-apps.folder',
    webViewLink: `https://drive.google.com/drive/folders/${folderId}`,
  };
}

export async function getSkpRootFolder(): Promise<DriveFolder> {
  return await getFolderMetadata(SKP_ROOT_FOLDER_ID);
}

/**
 * List subfolders inside a parent folder
 */
export async function listSubfolders(parentFolderId: string, searchName?: string): Promise<DriveFolder[]> {
  const token = await getAccessToken();

  let query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (searchName) {
    const escaped = searchName.replace(/'/g, "\\'");
    query += ` and name contains '${escaped}'`;
  }

  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink)&orderBy=name&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengambil folder dari Google Drive (${res.status})`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Find or create a subfolder with specific name
 */
export async function findOrCreateFolder(parentFolderId: string, folderName: string): Promise<DriveFolder> {
  const token = await getAccessToken();

  // 1. Search existing
  const query = `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name = '${folderName.replace(
    /'/g,
    "\\'"
  )}' and trashed = false`;

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&fields=files(id,name,mimeType,webViewLink)&pageSize=1&supportsAllDrives=true&includeItemsFromAllDrives=true`;

  const res = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.ok) {
    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
  }

  // 2. Create if not found
  const createUrl = 'https://www.googleapis.com/drive/v3/files?supportsAllDrives=true';
  const body = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentFolderId],
  };

  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal membuat folder "${folderName}" di Google Drive`);
  }

  return await createRes.json();
}

/**
 * Upload PDF blob to specific folder
 */
export async function uploadPdfToDrive(
  folderId: string,
  fileName: string,
  pdfBlob: Blob
): Promise<DriveFileResult> {
  const token = await getAccessToken();

  const metadata = {
    name: fileName,
    parents: [folderId],
    mimeType: 'application/pdf',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', pdfBlob);

  const uploadUrl =
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink';

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gagal mengunggah file ke Google Drive (${res.status})`);
  }

  return await res.json();
}
