#!/usr/bin/env node
/**
 * Regresi-test pemetaan error sisi server (api/lib/googleAuth.ts + api/lib/driveCore.ts).
 *
 * Tujuan: kegagalan Google Drive harus selalu berubah menjadi JSON terstruktur
 * `{ success:false, errorCode, error, hint, retryable }` dengan HTTP 200, supaya
 * hosting tidak mengganti body-nya dengan teks "A server error occurred." (yang
 * di browser muncul sebagai `Unexpected token 'A', "A server e"... is not valid JSON`).
 *
 * Cara pakai: node --test scripts/test-drive-api-errors.mjs   (atau npm run test:drive:api)
 */
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..');
// Ditulis di dalam node_modules supaya `googleapis` (packages:'external') tetap resolves.
const outDir = path.join(repoRoot, 'node_modules', '.cache', 'arms-tests');
fs.mkdirSync(outDir, { recursive: true });
const bundlePath = path.join(outDir, `drive-server-${process.pid}.mjs`);

let mod;

before(async () => {
  // Gabungkan kedua modul dalam satu bundle agar bisa diimpor sekaligus.
  await build({
    stdin: {
      contents: [
        `export * from "${path.join(repoRoot, 'api/lib/googleAuth.ts')}";`,
        `export * from "${path.join(repoRoot, 'api/lib/driveCore.ts')}";`,
      ].join('\n'),
      resolveDir: repoRoot,
      loader: 'ts',
    },
    bundle: true,
    outfile: bundlePath,
    format: 'esm',
    platform: 'node',
    packages: 'external',
    logLevel: 'error',
  });
  mod = await import(pathToFileURL(bundlePath).href);
});

const gerr = (status, message, reason) => ({
  message,
  code: status,
  response: { status, data: { error: { message, code: status, errors: reason ? [{ reason, domain: 'global' }] : [] } } },
});

test('403 "The caller does not have permission" → forbidden + saran share folder', () => {
  const out = mod.describeGoogleError(gerr(403, "The caller does not have permission", 'forbidden'));
  assert.equal(out.code, 'forbidden');
  assert.match(out.hint, /Editor/);
  assert.equal(out.retryable, false);
});

test('404 "File not found with id" → parent_not_found + cara ambil ID yang benar', () => {
  const out = mod.describeGoogleError(gerr(404, 'File not found with id: 1BxPvATwEy.', 'notFound'));
  assert.equal(out.code, 'parent_not_found');
  assert.match(out.hint, /drive\.google\.com\/drive\/folders/);
});

test('kuota service account → sa_storage_quota dengan flag quotaLimited', () => {
  const out = mod.describeGoogleError(
    new Error("Quota exceeded for quota metric 'Storage' ... Service Accounts do not have storage quota and are not allowed to store data."),
  );
  assert.equal(out.code, 'sa_storage_quota');
  assert.equal(out.quotaLimited, true);
  assert.match(out.hint, /Shared Drive/);
});

test('Drive API belum diaktifkan → api_disabled', () => {
  const out = mod.describeGoogleError(gerr(403, "Drive API has not been used in project arms-ct before or it is disabled.", 'accessNotConfigured'));
  assert.equal(out.code, 'api_disabled');
  assert.match(out.hint, /Google Drive API/);
});

test('429 rate limit → retryable', () => {
  const out = mod.describeGoogleError(gerr(429, 'User Rate Limit Exceeded', 'rateLimitExceeded'));
  assert.equal(out.code, 'rate_limited');
  assert.equal(out.retryable, true);
});

test('5xx dari Google → google_unavailable (retryable)', () => {
  const out = mod.describeGoogleError(gerr(503, 'Backend Error', 'backendError'));
  assert.equal(out.code, 'google_unavailable');
  assert.equal(out.retryable, true);
});

test('invalid_grant → kredensial rusak, bukan "folder master" yang disalahkan', () => {
  const out = mod.describeGoogleError(new Error('invalid_grant: Invalid JWT Signature.'));
  assert.equal(out.code, 'bad_credentials');
  assert.match(out.hint, /validate:creds/);
});

test('error jaringan → network + retryable', () => {
  const out = mod.describeGoogleError(
    Object.assign(new Error('request to https://www.googleapis.com failed, reason: getaddrinfo ENOTFOUND www.googleapis.com'), { code: 'ENOTFOUND' }),
  );
  assert.equal(out.code, 'network');
  assert.equal(out.retryable, true);
});

test('tanpa kredensial → not_configured (configured:false)', async () => {
  const savedJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const savedPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  try {
    assert.equal(mod.isGoogleAuthAvailable(), false);
    await assert.rejects(
      () => mod.createDriveFolder('01_KTP'),
      (err) => {
        assert.equal(err.__driveError, true);
        assert.equal(err.normalized.code, 'not_configured');
        assert.equal(err.configured, false);
        return true;
      },
    );
  } finally {
    if (savedJson !== undefined) process.env.GOOGLE_SERVICE_ACCOUNT_JSON = savedJson;
    if (savedPath !== undefined) process.env.GOOGLE_APPLICATION_CREDENTIALS = savedPath;
  }
});

test('respondDriveError selalu membalas JSON HTTP 200 (bukan 500 yang ditimpa hosting)', async () => {
  const chunks = [];
  const res = {
    headersSent: false,
    writableEnded: false,
    status(code) {
      chunks.push({ code });
      return this;
    },
    json(body) {
      chunks.push({ body });
      return this;
    },
  };
  const original = console.error;
  console.error = () => {};
  try {
    await mod.respondDriveError(res, mod.toDriveOperationError(gerr(404, 'File not found with id: xyz.', 'notFound')));
  } finally {
    console.error = original;
  }
  assert.equal(chunks[0].code, 200, 'status harus 200 agar body JSON tidak diganti Vercel');
  assert.equal(chunks[1].body.success, false);
  assert.equal(chunks[1].body.errorCode, 'parent_not_found');
  assert.equal(chunks[1].body.httpStatus, 404);
  assert.match(chunks[1].body.error, /Folder induk/);
  assert.ok(chunks[1].body.hint, 'harus membawa hint langkah perbaikan');
});

test('nama & path folder dinormalisasi (titik-dua, spasi ganda, terlalu panjang)', () => {
  assert.equal(mod.cleanFolderName('  01_KTP \n\t lagi   '), '01_KTP lagi');
  assert.equal(mod.cleanFolderName('x'.repeat(500)).length, 180);
  assert.deepEqual(mod.cleanPathSegments(['', '  A  ', '..', 'B/C']), ['A', 'B/C']);
  assert.deepEqual(mod.cleanPathSegments('PT_MJ_INDONESIA'), ['PT_MJ_INDONESIA']);
  assert.equal(mod.cleanPathSegments(Array.from({ length: 40 }, (_, i) => `F${i}`)).length, 12);
});

test('scope Drive default penuh (bisa menulis ke folder master hasil share)', () => {
  const saved = process.env.GOOGLE_DRIVE_SCOPES;
  delete process.env.GOOGLE_DRIVE_SCOPES;
  try {
    assert.deepEqual(mod.driveScopes(), ['https://www.googleapis.com/auth/drive']);
    process.env.GOOGLE_DRIVE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
    assert.deepEqual(mod.driveScopes(), ['https://www.googleapis.com/auth/drive.file']);
  } finally {
    if (saved === undefined) delete process.env.GOOGLE_DRIVE_SCOPES;
    else process.env.GOOGLE_DRIVE_SCOPES = saved;
  }
});

test('instance GoogleAuth di-cache (satu token utk banyak panggilan)', () => {
  const file = path.join(os.tmpdir(), `arms-creds-${process.pid}.json`);
  fs.writeFileSync(
    file,
    JSON.stringify({
      type: 'service_account',
      project_id: 'test',
      private_key_id: 'k',
      private_key: '-----BEGIN PRIVATE KEY-----\nZmFrZQ==\n-----END PRIVATE KEY-----\n',
      client_email: 'sa@test.iam.gserviceaccount.com',
      token_uri: 'https://oauth2.googleapis.com/token',
    }),
  );
  const saved = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  process.env.GOOGLE_APPLICATION_CREDENTIALS = file;
  try {
    const a = mod.authFor(['scope-x']);
    const b = mod.authFor(['scope-x']);
    assert.equal(a, b, 'instance yang sama harus dipakai ulang');
    assert.notEqual(mod.authFor(['scope-y']), a);
    const info = mod.getCredentialsInfo();
    assert.equal(info.source, 'GOOGLE_APPLICATION_CREDENTIALS');
    assert.equal(info.clientEmail, 'sa@test.iam.gserviceaccount.com');
    assert.equal(info.privateKeyLooksValid, true);
  } finally {
    fs.rmSync(file, { force: true });
    if (saved === undefined) delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    else process.env.GOOGLE_APPLICATION_CREDENTIALS = saved;
  }
});
