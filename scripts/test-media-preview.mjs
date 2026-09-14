#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: UJI PREVIEW MEDIA GLOBAL (SEMUA MODUL)
 * ============================================================================
 *  Menguji kode ASLI:
 *    • src/lib/media.ts                       — klasifikasi & tautan preview
 *    • src/components/common/MediaPreview.tsx  — provider, thumbnail, tombol
 *
 *  Yang diverifikasi:
 *    1. Drive file ID diekstrak dari semua bentuk tautan Drive.
 *    2. Jenis media (gambar/PDF/dokumen/spreadsheet/folder/video/audio) tepat.
 *    3. Tautan yang "dibajak" preview in-app hanya berkas & gambar — tautan
 *       folder/spreadsheet/mailto tetap terbuka normal di tab baru.
 *    4. Sumber preview (thumbnail/embed/download/webView) terbentuk benar.
 *    5. Komponen UI merender atribut data-media-* yang dipakai interceptor.
 *
 *  Jalankan: `npm run test:media`
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition, detail = '') {
  if (condition) {
    passed += 1;
    process.stdout.write(`  ✅ ${label}\n`);
  } else {
    failed += 1;
    failures.push(label + (detail ? ` — ${detail}` : ''));
    process.stdout.write(`  ❌ ${label}${detail ? ` — ${detail}` : ''}\n`);
  }
}

function group(title) {
  process.stdout.write(`\n▸ ${title}\n`);
}

/* ======================================================================== *
 *  BUNDLE KODE ASLI (TS/TSX) UNTUK NODE
 * ======================================================================== */

const CACHE_DIR = path.join(ROOT, 'node_modules/.cache/arms-media-test');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const entryPath = path.join(CACHE_DIR, 'media-entry.tsx');
const bundlePath = path.join(CACHE_DIR, 'media-bundle.mjs');

fs.writeFileSync(
  entryPath,
  [
    `export * from '${ROOT}/src/lib/media';`,
    `export { MediaPreviewProvider, MediaThumb, MediaLink, MediaUrlPreviewButton, MediaBadge, useMediaPreview } from '${ROOT}/src/components/common/MediaPreview';`,
    '',
  ].join('\n'),
  'utf8'
);

execSync(
  `npx esbuild "${entryPath}" --bundle --format=esm --platform=node --packages=external --target=node20 --outfile="${bundlePath}" --log-level=error`,
  { cwd: ROOT, stdio: 'inherit' }
);

const media = await import(bundlePath);

/* ======================================================================== *
 *  1. EKSTRAKSI DRIVE FILE ID
 * ======================================================================== */

group('1. Ekstraksi Drive file ID / folder ID');

const FILE_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdef';
check('URL /file/d/<id>', media.extractDriveFileId(`https://drive.google.com/file/d/${FILE_ID}/view`) === FILE_ID);
check('URL ?id=<id>', media.extractDriveFileId(`https://drive.google.com/uc?export=view&id=${FILE_ID}`) === FILE_ID);
check('URL docs /d/<id>/edit', media.extractDriveFileId(`https://docs.google.com/document/d/${FILE_ID}/edit`) === FILE_ID);
check('ID polos', media.extractDriveFileId(FILE_ID) === FILE_ID);
check('URL tanpa ID -> undefined', media.extractDriveFileId('https://drive.google.com/drive/my-drive') === undefined);
check(
  'folder ID dari URL folder',
  media.extractDriveFolderId('https://drive.google.com/drive/folders/1FOLDERabcdef0123456789ABCDEFGHIJK?usp=sharing') ===
    '1FOLDERabcdef0123456789ABCDEFGHIJK'
);

/* ======================================================================== *
 *  2. KLASIFIKASI JENIS MEDIA
 * ======================================================================== */

group('2. Klasifikasi jenis media');

check('JPG langsung', media.classifyMedia('https://cdn.example.com/foto-ktp.jpg') === 'image');
check('PNG dengan query', media.classifyMedia('https://cdn.example.com/foto.png?x=1') === 'image');
check('PDF', media.classifyMedia('https://cdn.example.com/bast.pdf') === 'pdf');
check('Drive file ber-PDF (dari nama berkas)', media.classifyMedia({ url: `https://drive.google.com/file/d/${FILE_ID}/view`, fileName: 'SKP.pdf' }) === 'pdf');
check('Drive file tanpa ekstensi -> doc', media.classifyMedia(`https://drive.google.com/file/d/${FILE_ID}/view`) === 'doc');
check('Google usercontent -> image', media.classifyMedia('https://lh3.googleusercontent.com/d/abcdef') === 'image');
check('Google Spreadsheet -> sheet', media.classifyMedia('https://docs.google.com/spreadsheets/d/abc123456789/edit') === 'sheet');
check('Google Document -> doc', media.classifyMedia('https://docs.google.com/document/d/abc123456789/edit') === 'doc');
check('Folder Drive -> folder', media.classifyMedia('https://drive.google.com/drive/folders/1FOLDERabcdef0123456789') === 'folder');
check('data URL gambar -> image', media.classifyMedia('data:image/jpeg;base64,/9j/4AAQ') === 'image');
check('data URL PDF -> pdf', media.classifyMedia('data:application/pdf;base64,JVBERi0') === 'pdf');
check('Video MP4', media.classifyMedia('https://cdn.example.com/video.mp4') === 'video');
check('Audio MP3', media.classifyMedia('https://cdn.example.com/rekaman.mp3') === 'audio');
check('Arsip ZIP', media.classifyMedia('https://cdn.example.com/berkas.zip') === 'archive');
check('mime image/png menang atas nama berkas', media.classifyMedia({ url: 'x', fileName: 'a.pdf', mimeType: 'image/png' }) === 'image');
check('URL kosong -> unknown', media.classifyMedia('') === 'unknown');

/* ======================================================================== *
 *  3. KEPUTUSAN INTERSEPSI TAUTAN
 * ======================================================================== */

group('3. Tautan yang dibuka preview in-app');

check('Berkas Drive di-preview', media.shouldInterceptLink(`https://drive.google.com/file/d/${FILE_ID}/view`));
check('Gambar .jpg di-preview', media.shouldInterceptLink('https://cdn.example.com/ktp.jpg'));
check('PDF di-preview', media.shouldInterceptLink('https://cdn.example.com/bast.pdf'));
check('data URL di-preview', media.shouldInterceptLink('data:image/png;base64,iVBORw0'));
check('Google Document di-preview', media.shouldInterceptLink('https://docs.google.com/document/d/abc123456789/edit'));
check('Folder Drive TIDAK di-preview', !media.shouldInterceptLink('https://drive.google.com/drive/folders/1FOLDERabcdef0123456789'));
check('Spreadsheet TIDAK di-preview', !media.shouldInterceptLink('https://docs.google.com/spreadsheets/d/abc123456789/edit'));
check('mailto TIDAK di-preview', !media.shouldInterceptLink('mailto:admin@arms.test'));
check('Anchor "#" TIDAK di-preview', !media.shouldInterceptLink('#'));
check('Halaman web biasa TIDAK di-preview', !media.shouldInterceptLink('https://generator-surat-beige.vercel.app/'));
check('Tautan kosong TIDAK di-preview', !media.shouldInterceptLink(''));
check('Nama berkas membantu klasifikasi', media.shouldInterceptLink(`https://drive.google.com/file/d/${FILE_ID}/view`, 'bukti-transfer.jpg'));

/* ======================================================================== *
 *  4. SUMBER PREVIEW
 * ======================================================================== */

group('4. Sumber preview (thumbnail / embed / download / webView)');

const jpg = media.buildMediaSources({ url: `https://drive.google.com/file/d/${FILE_ID}/view`, fileName: 'ktp.jpg' });
check('thumbnail Drive untuk gambar', jpg.thumbnail === `https://drive.google.com/thumbnail?id=${FILE_ID}&sz=w1000`);
check('direct view untuk gambar', String(jpg.direct).includes('uc?export=view'));
check('download untuk gambar', String(jpg.download).includes('uc?export=download'));
check('webView dari file ID', jpg.webView === `https://drive.google.com/file/d/${FILE_ID}/view`);

const pdf = media.buildMediaSources({ url: `https://drive.google.com/file/d/${FILE_ID}/view`, fileName: 'bast.pdf' });
check('embed preview untuk PDF', pdf.embed === `https://drive.google.com/file/d/${FILE_ID}/preview`);
check('PDF tidak diberi thumbnail', !pdf.thumbnail);

const doc = media.buildMediaSources({ url: 'https://docs.google.com/document/d/abc123456789/edit' });
check('Google Doc -> embed /preview', doc.embed === 'https://docs.google.com/document/d/abc123456789/preview');

const inline = media.buildMediaSources({ url: 'data:image/jpeg;base64,/9j/4AAQ' });
check('data URL dipakai langsung', inline.direct === 'data:image/jpeg;base64,/9j/4AAQ');
check('data URL tidak memanggil proxy', !inline.download);

const byId = media.buildMediaSources({ driveFileId: FILE_ID, fileName: 'sph.pdf' });
check('Bisa dibangun dari driveFileId saja', byId.embed === `https://drive.google.com/file/d/${FILE_ID}/preview`);
check('Proxy backend tersedia', media.mediaProxyUrl(FILE_ID, 'sph.pdf').startsWith('/api/drive/file?fileId='));
check('driveEmbedUrl mengubah tautan apa pun', media.driveEmbedUrl(`https://drive.google.com/uc?id=${FILE_ID}`) === `https://drive.google.com/file/d/${FILE_ID}/preview`);

group('5. Utilitas nama berkas');
check('fileNameFromUrl query name', media.fileNameFromUrl('https://drive.google.com/file/d/x/view?name=KTP%20Budi.jpg') === 'KTP Budi.jpg');
check('fileNameFromUrl path', media.fileNameFromUrl('https://cdn.example.com/a/b/bast.pdf') === 'bast.pdf');
check('fileExtension', media.fileExtension('BAST.PDF') === 'pdf');
check('mediaTitle fallback', media.mediaTitle({ url: 'https://cdn.example.com/x/foto-unit.jpg' }) === 'foto-unit.jpg');

/* ======================================================================== *
 *  6. RENDER KOMPONEN (SSR)
 * ======================================================================== */

group('6. Render komponen preview (SSR)');

globalThis.window = globalThis.window || { location: { origin: 'https://arms.test' } };
const { renderToStaticMarkup } = await import('react-dom/server');
const React = (await import('react')).default;

const html = renderToStaticMarkup(
  React.createElement(
    media.MediaPreviewProvider,
    null,
    React.createElement('div', null, [
      React.createElement(media.MediaThumb, {
        key: 't1',
        url: `https://drive.google.com/file/d/${FILE_ID}/view`,
        fileName: 'ktp-budi.jpg',
        title: 'Foto KTP',
        module: 'Personnel',
        label: 'KTP',
      }),
      React.createElement(media.MediaUrlPreviewButton, {
        key: 'b1',
        url: 'https://drive.google.com/file/d/1PDFabcdef0123456789abcdefghij/view',
        fileName: 'bast.pdf',
        module: 'Eksekusi Unit',
      }),
      React.createElement(
        media.MediaLink,
        { key: 'l1', url: `https://drive.google.com/file/d/${FILE_ID}/view`, fileName: 'skp.pdf', module: 'SK' },
        'Buka SKP'
      ),
      React.createElement(media.MediaBadge, { key: 'bd1', kind: 'pdf' }),
      React.createElement(media.MediaThumb, { key: 't2', url: '', label: 'kosong' }),
    ])
  )
);

check('Provider merender anak-anaknya', html.includes('Foto KTP') || html.includes('ktp-budi.jpg'));
check('MediaThumb memuat thumbnail Drive', html.includes(`drive.google.com/thumbnail?id=${FILE_ID}`));
check('MediaThumb punya label', html.includes('KTP'));
check('MediaUrlPreviewButton merender tombol Preview', html.includes('Preview'));
check('MediaLink punya data-media-preview', html.includes('data-media-preview'));
check('MediaLink membawa nama berkas', html.includes('data-media-name="skp.pdf"'));
check('MediaLink membawa modul', html.includes('data-media-module="SK"'));
check('MediaBadge menampilkan jenis PDF', html.includes('PDF'));
check('MediaThumb tanpa URL menampilkan placeholder', html.includes('Belum ada media'));

/* ======================================================================== *
 *  RINGKASAN
 * ======================================================================== */

process.stdout.write(`\n${'='.repeat(72)}\n`);
process.stdout.write(`PREVIEW MEDIA GLOBAL: ${passed} lulus, ${failed} gagal\n`);
if (failed) {
  process.stdout.write('Kegagalan:\n');
  failures.forEach((f) => process.stdout.write(`  - ${f}\n`));
}
process.stdout.write(`${'='.repeat(72)}\n`);
process.exit(failed ? 1 : 0);
