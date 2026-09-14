/**
 * ============================================================================
 *  ARMS — Control Tower :: GOOGLE DRIVE STORAGE (Apps Script / DriveApp)
 * ============================================================================
 *  SELURUH fitur penyimpanan Google Drive yang ada dipertahankan:
 *    - cek status koneksi          (/api/drive/status)
 *    - buat folder                 (/api/drive/create-folder)
 *    - pastikan struktur folder    (/api/drive/ensure-path)
 *    - unggah berkas KTP/SPPI/SKP  (/api/drive/upload)
 *    - baca berkas utk preview     (/api/drive/file)
 *
 *  Yang berubah hanya CARA penyimpanannya:
 *    - tidak lagi memakai Service Account + GOOGLE_SERVICE_ACCOUNT_JSON,
 *      melainkan DriveApp yang berjalan sebagai akun deploy Apps Script;
 *    - konfigurasi folder (ID/URL root, struktur sub-folder) dibaca & disimpan
 *      pada spreadsheet aktif (tab Settings) sehingga satu sumber kebenaran.
 * ============================================================================
 */

var DRIVE_FOLDER_BASE_URL_ = 'https://drive.google.com/drive/folders/';
var DRIVE_FOLDER_MIME_ = 'application/vnd.google-apps.folder';

/** Root folder Drive default (sama dengan ROOT_GDRIVE_ID di frontend). */
var DEFAULT_DRIVE_ROOT_ID_ = '11OxYLvKiH8P4AIP_NM08KuYu0plAq16_';

/** Struktur sub-folder standar yang ditampilkan di Pengaturan (tetap ada). */
var DRIVE_SUBFOLDER_PROFILE_ = [
  { key: 'KARYAWAN_INTERNAL', label: '📁 KARYAWAN_INTERNAL', desc: 'Database KTP SPV & Desk Officer' },
  { key: 'MITRA_DC_FREELANCE', label: '📁 MITRA_DC_FREELANCE', desc: 'Database KTP Eksekutor Lapangan' },
  { key: 'LEGAL_KYC_DOCUMENTS', label: '📁 LEGAL_KYC_DOCUMENTS', desc: 'Berkas Pendukung & Kontrak' }
];

/** Ambil konfigurasi Drive yang tersimpan di spreadsheet aktif. */
function driveConfigFromSpreadsheet_() {
  var config = { folderId: '', folderUrl: '', companyName: '', source: 'default' };
  try {
    var target = resolveSpreadsheet_('');
    var settings = readSettingsObject_(target.ss, SETTINGS_TAB_);
    if (settings.googleDriveFolderId) config.folderId = String(settings.googleDriveFolderId);
    if (settings.googleDriveFolderUrl) config.folderUrl = String(settings.googleDriveFolderUrl);
    if (settings.companyName) config.companyName = String(settings.companyName);
    if (config.folderId || config.folderUrl) config.source = 'spreadsheet:' + target.name;
  } catch (e) {
    /* pakai default */
  }
  if (!config.folderId) config.folderId = DEFAULT_DRIVE_ROOT_ID_;
  if (!config.folderUrl) config.folderUrl = DRIVE_FOLDER_BASE_URL_ + config.folderId + '?usp=sharing';
  return config;
}

function driveUserEmail_() {
  try {
    return Session.getEffectiveUser().getEmail() || Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

/** GET /api/drive/status */
function driveStatusHandler_(req) {
  var config = driveConfigFromSpreadsheet_();
  var email = driveUserEmail_();
  var rootAccessible = false;
  var rootName = '';
  try {
    var root = DriveApp.getFolderById(config.folderId);
    rootAccessible = Boolean(root);
    rootName = root.getName();
  } catch (e) {
    rootAccessible = false;
  }

  return {
    status: 'ok',
    success: true,
    service: 'Google Drive Storage',
    provider: ARMS_PROVIDER,
    configured: true,
    mode: 'DriveApp (akun deploy Apps Script)',
    /** Dipertahankan agar frontend lama tetap kompatibel. */
    serviceAccountEmail: email,
    driveUser: email,
    ownerEmail: email,
    rootFolderId: config.folderId,
    rootFolderName: rootName,
    rootFolderUrl: config.folderUrl,
    rootAccessible: rootAccessible,
    configSource: config.source,
    subFolders: DRIVE_SUBFOLDER_PROFILE_,
    instructions: rootAccessible
      ? 'Google Drive aktif melalui Apps Script (DriveApp). Konfigurasi folder dibaca dari spreadsheet aktif.'
      : 'Folder root belum bisa diakses akun deploy. Bagikan folder tersebut ke ' + (email || 'akun deploy') + ' sebagai Editor, atau perbarui "Google Drive Storage Folder ID" di Pengaturan (tersimpan di spreadsheet aktif).',
    timestamp: new Date().toISOString()
  };
}

/** POST /api/drive/create-folder  { name, parentId } */
function driveCreateFolderHandler_(req) {
  var name = String(req.name || '').trim();
  if (!name) return fail_('Missing folder name', 400);

  var parentId = String(req.parentId || '').trim() || driveConfigFromSpreadsheet_().folderId;
  var parent = null;
  if (parentId) {
    try {
      parent = DriveApp.getFolderById(parentId);
    } catch (e) {
      return {
        success: false,
        configured: true,
        provider: ARMS_PROVIDER,
        error: 'Folder master Google Drive tidak ditemukan atau belum dibagikan ke akun deploy Apps Script (' + driveUserEmail_() + ').'
      };
    }
  }

  try {
    var folder = parent ? parent.createFolder(name) : DriveApp.createFolder(name);
    var folderId = folder.getId();
    return {
      success: true,
      configured: true,
      provider: ARMS_PROVIDER,
      folderId: folderId,
      name: folder.getName(),
      webViewLink: DRIVE_FOLDER_BASE_URL_ + folderId + '?usp=sharing',
      url: folder.getUrl()
    };
  } catch (err) {
    return driveFriendlyError_(err, 'Gagal membuat folder Google Drive');
  }
}

/**
 * POST /api/drive/ensure-path  { path: string[], rootId }
 * Mencari folder berdasarkan nama di tiap tingkat, membuat bila belum ada.
 */
function driveEnsurePathHandler_(req) {
  var path = req.path;
  if (!path || !path.length) return fail_('Missing path (array of folder names)', 400);
  if (typeof path === 'string') path = [path];

  var cleanPath = [];
  for (var i = 0; i < path.length; i++) {
    var segment = String(path[i] || '').trim();
    if (segment) cleanPath.push(segment);
  }
  if (!cleanPath.length) return fail_('Missing path (array of folder names)', 400);

  var rootId = String(req.rootId || '').trim() || driveConfigFromSpreadsheet_().folderId;
  var currentParent = null;

  if (rootId) {
    try {
      currentParent = DriveApp.getFolderById(rootId);
    } catch (e) {
      return {
        success: false,
        configured: true,
        provider: ARMS_PROVIDER,
        error: 'Folder master Google Drive tidak ditemukan atau belum dibagikan ke akun deploy Apps Script (' + driveUserEmail_() + ').'
      };
    }
  }

  var created = [];
  var lastFolderId = currentParent ? currentParent.getId() : '';
  var lastLink = lastFolderId ? DRIVE_FOLDER_BASE_URL_ + lastFolderId + '?usp=sharing' : '';

  try {
    for (var p = 0; p < cleanPath.length; p++) {
      var name = cleanPath[p];
      var folder = null;

      if (currentParent) {
        var existing = currentParent.getFoldersByName(name);
        if (existing.hasNext()) folder = existing.next();
      } else {
        var rootLevel = DriveApp.getFoldersByName(name);
        if (rootLevel.hasNext()) folder = rootLevel.next();
      }

      if (!folder) {
        folder = currentParent ? currentParent.createFolder(name) : DriveApp.createFolder(name);
        created.push({
          name: name,
          folderId: folder.getId(),
          webViewLink: DRIVE_FOLDER_BASE_URL_ + folder.getId() + '?usp=sharing'
        });
      }

      currentParent = folder;
      lastFolderId = folder.getId();
      lastLink = DRIVE_FOLDER_BASE_URL_ + lastFolderId + '?usp=sharing';
    }
  } catch (err) {
    return driveFriendlyError_(err, 'Gagal membuat struktur folder Google Drive');
  }

  if (!lastFolderId) {
    return { success: false, configured: true, provider: ARMS_PROVIDER, error: 'No folder could be created. Check root folder permission.' };
  }

  return {
    success: true,
    configured: true,
    provider: ARMS_PROVIDER,
    folderId: lastFolderId,
    webViewLink: lastLink,
    name: currentParent ? currentParent.getName() : '',
    created: created,
    path: cleanPath
  };
}

/**
 * POST /api/drive/upload  { fileName, mimeType, base64, folderId }
 * base64 boleh berupa data URL (data:image/jpeg;base64,...).
 */
function driveUploadHandler_(req) {
  var fileName = String(req.fileName || '').trim();
  var base64 = String(req.base64 || '');
  if (!fileName || !base64) return fail_('Missing fileName or base64 payload', 400);

  var match = base64.match(/^data:(.+?);base64,([\s\S]*)$/);
  var mimeType = match ? match[1] : String(req.mimeType || 'application/octet-stream');
  var raw = (match ? match[2] : base64).replace(/[\s\r\n]/g, '');

  var targetFolderId = String(req.folderId || '').trim() || driveConfigFromSpreadsheet_().folderId;
  var folder = null;
  if (targetFolderId) {
    try {
      folder = DriveApp.getFolderById(targetFolderId);
    } catch (e) {
      folder = DriveApp.getRootFolder();
    }
  } else {
    folder = DriveApp.getRootFolder();
  }

  try {
    var bytes = Utilities.base64Decode(raw);
    var blob = Utilities.newBlob(bytes, mimeType, fileName);
    var file = folder.createFile(blob);

    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (shareErr) {
      /* kebijakan domain bisa menolak sharing publik — berkas tetap tersimpan */
    }

    var fileId = file.getId();
    return {
      success: true,
      configured: true,
      provider: ARMS_PROVIDER,
      fileId: fileId,
      fileName: file.getName(),
      mimeType: mimeType,
      sizeBytes: bytes.length,
      folderId: folder.getId(),
      webViewLink: file.getUrl() || ('https://drive.google.com/file/d/' + fileId + '/view?usp=sharing'),
      directViewUrl: 'https://drive.google.com/uc?export=view&id=' + fileId,
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w800'
    };
  } catch (err) {
    return driveFriendlyError_(err, 'Gagal mengunggah berkas ke Google Drive');
  }
}

/* ======================================================================== *
 *  PROXY BACA BERKAS — dipakai preview media SEMUA modul
 * ======================================================================== */

/** Batas aman ukuran berkas yang dikembalikan sebagai base64 (25 MB). */
var DRIVE_FILE_MAX_BYTES_ = 25 * 1024 * 1024;

/** Peta ekspor dokumen Google native -> URL + mime hasil. */
var DRIVE_NATIVE_EXPORT_ = {
  'application/vnd.google-apps.document': { base: 'https://docs.google.com/document/d/', params: 'export?format=pdf', mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.spreadsheet': { base: 'https://docs.google.com/spreadsheets/d/', params: 'export?format=pdf', mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.presentation': { base: 'https://docs.google.com/presentation/d/', params: 'export?format=pdf', mime: 'application/pdf', ext: 'pdf' },
  'application/vnd.google-apps.drawing': { base: 'https://docs.google.com/drawings/d/', params: 'export?format=png', mime: 'image/png', ext: 'png' }
};

/** Ambil Drive file ID dari URL Drive penuh / query id / ID polos. */
function driveFileIdFromInput_(input) {
  var raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.indexOf('http') !== 0 && /^[a-zA-Z0-9_-]{15,}$/.test(raw)) return raw;
  var m = raw.match(/\/file\/d\/([a-zA-Z0-9_-]{10,})/i) ||
          raw.match(/[?&]id=([a-zA-Z0-9_-]{10,})/i) ||
          raw.match(/\/d\/([a-zA-Z0-9_-]{10,})\//i);
  return m ? m[1] : raw;
}

/**
 * GET /api/drive/file  { fileId | url, name?, mode? }
 *
 * Mengembalikan isi berkas sebagai base64 + mimeType (Apps Script tidak bisa
 * melakukan streaming biner). Frontend mengubahnya menjadi Blob URL sehingga
 * <img>, <iframe> (PDF), <video> dan <audio> tetap bisa memutar preview walau
 * berkas tidak dibagikan publik.
 */
function driveFileHandler_(req) {
  var fileId = driveFileIdFromInput_(req.fileId || req.url || req.id || '');
  if (!fileId) return fail_('Parameter fileId wajib diisi', 400);

  try {
    var file = DriveApp.getFileById(fileId);
    var size = Number(file.getSize() || 0);
    var mimeType = file.getMimeType() || 'application/octet-stream';
    var name = String(req.name || '').trim() || file.getName();
    var webViewLink = file.getUrl() || ('https://drive.google.com/file/d/' + fileId + '/view');

    if (size > DRIVE_FILE_MAX_BYTES_) {
      return {
        success: false,
        configured: true,
        provider: ARMS_PROVIDER,
        fileId: fileId,
        name: name,
        mimeType: mimeType,
        size: size,
        webViewLink: webViewLink,
        error: 'Berkas ' + Math.round(size / 1048576) + ' MB terlalu besar untuk preview lewat Apps Script (batas 25 MB). Buka langsung di Google Drive.'
      };
    }

    var native = DRIVE_NATIVE_EXPORT_[mimeType];
    var base64 = '';

    if (native) {
      var exportUrl = native.base + fileId + '/' + native.params;
      var resp = UrlFetchApp.fetch(exportUrl, {
        muteHttpExceptions: true,
        headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }
      });
      if (resp.getResponseCode() === 200) {
        base64 = Utilities.base64Encode(resp.getBlob().getBytes());
        mimeType = native.mime;
        name = name.replace(/\.[a-z0-9]+$/i, '') + '.' + native.ext;
      }
    } else {
      base64 = Utilities.base64Encode(file.getBlob().getBytes());
    }

    if (!base64) {
      return {
        success: false,
        configured: true,
        provider: ARMS_PROVIDER,
        fileId: fileId,
        name: name,
        mimeType: mimeType,
        size: size,
        webViewLink: webViewLink,
        error: 'Isi berkas tidak bisa dibaca Apps Script. Buka langsung di Google Drive.'
      };
    }

    return {
      success: true,
      configured: true,
      provider: ARMS_PROVIDER,
      fileId: fileId,
      name: name,
      mimeType: mimeType,
      size: size,
      webViewLink: webViewLink,
      thumbnailUrl: 'https://drive.google.com/thumbnail?id=' + fileId + '&sz=w1000',
      directViewUrl: 'https://drive.google.com/uc?export=view&id=' + fileId,
      base64: base64
    };
  } catch (err) {
    var friendly = driveFriendlyError_(err, 'Gagal membaca berkas Google Drive');
    friendly.fileId = fileId;
    friendly.webViewLink = 'https://drive.google.com/file/d/' + fileId + '/view';
    return friendly;
  }
}

/** Terjemahkan error DriveApp menjadi pesan yang sama helpful-nya dengan server.ts. */
function driveFriendlyError_(err, fallback) {
  var raw = errorMessage_(err);
  var msg = raw;
  var lower = raw.toLowerCase();

  if (lower.indexOf('not found') !== -1 || lower.indexOf('id tidak') !== -1) {
    msg = 'Folder/berkas master Google Drive tidak ditemukan atau belum dibagikan ke akun deploy Apps Script (' + driveUserEmail_() + ').';
  } else if (lower.indexOf('permission') !== -1 || lower.indexOf('izin') !== -1) {
    msg = 'Izin tidak cukup. Pastikan akun deploy Apps Script (' + driveUserEmail_() + ') memiliki akses Editor pada folder master.';
  } else if (lower.indexOf('quota') !== -1 || lower.indexOf('size') !== -1) {
    msg = 'Kuota/ukuran Google Drive terlampaui: ' + raw;
  } else if (lower.indexOf('exceeded maximum execution time') !== -1) {
    msg = 'Unggahan melebihi batas waktu eksekusi Apps Script (6 menit). Gunakan berkas lebih kecil.';
  } else if (!raw) {
    msg = fallback;
  }

  return {
    success: false,
    configured: true,
    provider: ARMS_PROVIDER,
    error: msg
  };
}
