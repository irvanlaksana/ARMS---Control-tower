#!/usr/bin/env node
/**
 * Regresi-test penanganan error klien Google Drive (src/lib/drive.ts).
 *
 * Alasan ada: dulu frontend memanggil `resp.json()` buta. Ketika fungsi server
 * (Vercel / express) crash, timeout, atau belum ter-deploy, body balasannya adalah
 * teks polos "A server error occurred." dan pengguna hanya melihat
 *   SyntaxError: Unexpected token 'A', "A server e"... is not valid JSON
 * yang menyembunyikan penyebab sebenarnya. Test ini memastikan balasan seperti itu
 * berubah menjadi pesan + hint yang bisa ditindaklanjuti.
 *
 * Cara pakai:
 *   node --test scripts/test-drive-error-handling.mjs
 * atau
 *   npm run test:drive
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
const bundlePath = path.join(os.tmpdir(), `arms-drive-client-${process.pid}.mjs`);

let drive;
const calls = [];

before(async () => {
  await build({
    entryPoints: [path.join(repoRoot, 'src/lib/drive.ts')],
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    outfile: bundlePath,
    logLevel: 'error',
  });
  drive = await import(`${pathToFileURL(bundlePath).href}?v=${Date.now()}`);
});

function stubFetch(handler) {
  calls.length = 0;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return handler(String(url), init, calls.length);
  };
}

const res = (status, body, contentType = 'text/plain; charset=utf-8') =>
  new Response(body, { status, headers: { 'content-type': contentType } });

const jsonRes = (status, payload) => res(status, JSON.stringify(payload), 'application/json; charset=utf-8');

test('balasan hosting non-JSON (A server error occurred.) → pesan jelas + hint, bukan SyntaxError', async () => {
  stubFetch(() => res(500, 'A server error occurred.'));
  await assert.rejects(
    () => drive.ensureDrivePath(['PT_MJ_INDONESIA', 'DATABASE_KARYAWAN', 'BUDI'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS'),
    (err) => {
      assert.equal(err.name, 'DriveApiError');
      assert.equal(err.code, 'server_error');
      assert.match(err.message, /bukan JSON \(HTTP 500\)/);
      assert.match(err.message, /A server error occurred/);
      assert.match(err.hint, /Functions Log/);
      assert.equal(err.retryable, true);
      assert.ok(!/is not valid JSON/.test(err.message), 'pesan SyntaxError tidak boleh muncul lagi');
      return true;
    },
  );
  assert.equal(calls.length, 2, 'kegagalan 5xx yang retryable dicoba ulang 1x');
});

test('halaman HTML 404 → endpoint_missing dengan petunjuk deployment', async () => {
  stubFetch(() => res(404, '<!DOCTYPE html><html><head><title>404</title></head><body>not found</body></html>', 'text/html'));
  await assert.rejects(
    () => drive.createDriveFolder('01_KTP', '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS'),
    (err) => {
      assert.equal(err.code, 'endpoint_missing');
      assert.match(err.hint, /Build Output|npm run build/);
      return true;
    },
  );
});

test('success:false dari endpoint dipetakan penuh (errorCode + hint + configured)', async () => {
  stubFetch(() =>
    jsonRes(200, {
      success: false,
      configured: true,
      errorCode: 'parent_not_found',
      error: 'Folder induk (folder master) tidak ditemukan oleh Google Drive.',
      hint: 'Salin ID folder asli dari URL drive.google.com/drive/folders/<ID>',
      httpStatus: 404,
      retryable: false,
    }),
  );
  await assert.rejects(
    () => drive.ensureDrivePath(['PT_MJ_INDONESIA'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS'),
    (err) => {
      assert.equal(err.code, 'parent_not_found');
      assert.match(err.hint, /drive\.google\.com\/drive\/folders/);
      assert.equal(err.status, 404);
      assert.equal(err.retryable, false);
      return true;
    },
  );
});

test('service account belum dikonfigurasi → configured:false terbaca klien', async () => {
  stubFetch(() =>
    jsonRes(200, {
      success: false,
      configured: false,
      errorCode: 'not_configured',
      error: 'Google Drive Service Account belum dikonfigurasi di server.',
      hint: 'Isi GOOGLE_SERVICE_ACCOUNT_JSON ...',
    }),
  );
  await assert.rejects(
    () => drive.ensureDrivePath(['PT_MJ_INDONESIA']),
    (err) => {
      assert.equal(err.configured, false);
      assert.equal(err.code, 'not_configured');
      return true;
    },
  );
});

test('rate limit 429 JSON di-retry lalu dilaporkan', async () => {
  let n = 0;
  stubFetch(() => {
    n += 1;
    return n === 1
      ? jsonRes(429, { success: false, errorCode: 'rate_limited', error: '429 rate limit', retryable: true })
      : jsonRes(200, { success: true, folderId: '1validFolderIdxxxxxxxxxxxxxxxxxxx', webViewLink: 'https://x', created: [] });
  });
  const out = await drive.ensureDrivePath(['PT_MJ_INDONESIA'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS');
  assert.equal(out.success, true);
  assert.equal(calls.length, 2, 'percobaan kedua harus sukses');
});

test('ID folder master tidak valid → ditolak lokal tanpa memanggil server', async () => {
  stubFetch(() => jsonRes(200, { success: true, folderId: 'x' }));
  await assert.rejects(
    () => drive.ensureDrivePath(['PT_MJ_INDONESIA'], 'GDRIVE-CLI-001'),
    (err) => {
      assert.equal(err.code, 'bad_request');
      assert.match(err.message, /bukan ID Google Drive yang valid/);
      assert.match(err.hint, /Pengaturan/);
      return true;
    },
  );
  assert.equal(calls.length, 0, 'tidak boleh ada panggilan jaringan');
});

test('upload: kegagalan server tetap jatuh ke fallback base64 (tidak melempar)', async () => {
  stubFetch(() => res(500, 'A server error occurred.'));
  const out = await drive.uploadBase64ToDrive('data:image/jpeg;base64,AAAA', 'KTP_BUDI.jpg', 'image/jpeg', '1folder');
  assert.equal(out.success, false);
  assert.equal(out.fallbackBase64, true);
  assert.match(out.error, /bukan JSON \(HTTP 500\)/);
  assert.equal(out.webViewLink, 'data:image/jpeg;base64,AAAA');
});

test('upload: 413 dipetakan ke pesan ukuran berkas', async () => {
  stubFetch(() => res(413, 'too large'));
  const out = await drive.uploadBase64ToDrive('data:image/jpeg;base64,AAAA', 'KTP.jpg', 'image/jpeg');
  assert.match(out.error, /melebihi batas yang diizinkan server/i);
  assert.equal(out.errorCode, 'payload_too_large');
});

test('checkDriveStatus: respons non-JSON tidak membuat tab Settings error', async () => {
  stubFetch(() => res(500, 'A server error occurred.'));
  const info = await drive.checkDriveStatus();
  assert.equal(info.configured, false);
  assert.match(info.error, /bukan JSON/);
});

test('checkDriveStatus: hasil probe folder master diteruskan', async () => {
  stubFetch((url) => {
    assert.match(url, /probe=1&folderId=/);
    return jsonRes(200, {
      status: 'ok',
      configured: true,
      serviceAccountEmail: 'arms-sa@p.iam.gserviceaccount.com',
      projectId: 'p',
      scopes: ['https://www.googleapis.com/auth/drive'],
      ready: false,
      probed: true,
      checks: [
        { step: 'access token', ok: true, message: 'ok' },
        { step: 'folder master', ok: false, message: 'tidak ditemukan', hint: 'share dulu', code: 'parent_not_found' },
      ],
    });
  });
  const info = await drive.checkDriveStatus({ probeFolderId: '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS' });
  assert.equal(info.ready, false);
  assert.equal(info.checks.length, 2);
  assert.equal(info.checks[1].code, 'parent_not_found');
});

test('timeout: abort diperlakukan retryable dengan pesan yang menenangkan', async () => {
  stubFetch(() => {
    const e = new Error('The operation was aborted');
    e.name = 'AbortError';
    throw e;
  });
  await assert.rejects(
    () => drive.ensureDrivePath(['A'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS'),
    (err) => {
      assert.equal(err.code, 'timeout');
      assert.match(err.message, /Waktu tunggu/);
      return true;
    },
  );
});

test('formatDriveError menggabungkan pesan + hint untuk banner UI', () => {
  const err = new drive.DriveApiError('Folder master tidak ditemukan.', { hint: 'Share ke service account.' });
  assert.equal(drive.formatDriveError(err), 'Folder master tidak ditemukan. — Share ke service account.');
  assert.equal(drive.formatDriveError(new Error('x'), 'fallback'), 'x');
});

test('dua permintaan path identik paralel hanya memanggil server sekali (anti folder ganda)', async () => {
  stubFetch(() => jsonRes(200, { success: true, folderId: '1SharedFolderIdXxxxxxxxxxxxxxx', webViewLink: 'https://x', created: [{ name: 'A' }] }));
  const [a, b] = await Promise.all([
    drive.ensureDrivePath(['PT_MJ_INDONESIA', 'BUDI'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS'),
    drive.ensureDrivePath(['PT_MJ_INDONESIA', 'BUDI'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS'),
  ]);
  assert.equal(calls.length, 1);
  assert.equal(a.folderId, b.folderId);

  // path berbeda tetap jalan sendiri
  await drive.ensureDrivePath(['PT_MJ_INDONESIA', 'BUDI', '01_KTP'], '1BxPvATwEy_0dw8lKROK-PLZVu8Bkp2AS');
  assert.equal(calls.length, 2);
});
