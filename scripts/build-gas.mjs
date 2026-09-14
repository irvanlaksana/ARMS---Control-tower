#!/usr/bin/env node
/**
 * ============================================================================
 *  ARMS — Control Tower :: BUILD UNTUK DEPLOY GOOGLE APPS SCRIPT
 * ============================================================================
 *  Mengubah aplikasi React (Vite) menjadi berkas-berkas yang bisa di-push ke
 *  project Google Apps Script:
 *
 *    appsscript/dist/
 *      ├── appsscript.json      (manifest: scope, webapp, timezone)
 *      ├── Code.gs              (entry point web app + router API)
 *      ├── Db.gs                (spreadsheet aktif: tab, settings, blob store)
 *      ├── Drive.gs             (DriveApp: folder, ensure-path, upload, status)
 *      ├── Surat.gs             (GitHub issue + link generator surat tugas)
 *      ├── Menu.gs              (menu spreadsheet + utilitas deploy/self-test)
 *      ├── Index.html           (shell HtmlService — dihasilkan otomatis)
 *      ├── Bundle01.html ... NN (bundle frontend ter-chunk, dihasilkan otomatis)
 *      └── BundleRun.html       (perakit + eksekutor bundle)
 *
 *  Cara pakai:
 *    npm run gas:build                     # build + rakit appsscript/dist
 *    npm run gas:build -- --skip-vite      # rakit ulang tanpa build Vite
 *    npm run gas:build -- --scriptId <ID>  # sekalian tulis appsscript/.clasp.json
 *
 *  Tidak ada fitur aplikasi yang diubah; skrip ini hanya mengemas ulang output
 *  build agar bisa dijalankan dari Web App Apps Script.
 * ============================================================================
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const GAS_DIR = path.join(ROOT, 'appsscript');
const VITE_OUT = path.join(ROOT, 'dist-gas');
const OUT_DIR = path.join(GAS_DIR, 'dist');

/** Ukuran maksimum satu berkas HTML Apps Script (aman untuk editor & clasp). */
const CHUNK_LIMIT = Number(process.env.GAS_CHUNK_LIMIT || 700_000);

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  if (idx === -1) return null;
  return args[idx + 1] && !args[idx + 1].startsWith('--') ? args[idx + 1] : true;
};
const hasFlag = (name) => args.includes(`--${name}`);

/* ------------------------------------------------------------------ helpers */

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function toJsStringLiteral(text) {
  // JSON string literal yang aman disisipkan ke dalam <script> HTML.
  return JSON.stringify(String(text))
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** Pecah teks tanpa memotong surrogate pair (emoji dsb.). */
function chunkText(text, limit) {
  const parts = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(text.length, cursor + limit);
    if (end < text.length) {
      const code = text.charCodeAt(end - 1);
      if (code >= 0xd800 && code <= 0xdbff) end -= 1; // jangan potong di tengah pasangan surrogate
    }
    parts.push(text.slice(cursor, end));
    cursor = end;
  }
  return parts.length ? parts : [''];
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/* ------------------------------------------------------------- 1. vite build */

if (!hasFlag('skip-vite')) {
  log('▸ Membangun aplikasi (vite build --config vite.gas.config.ts)…');
  execSync('npx vite build --config vite.gas.config.ts', { cwd: ROOT, stdio: 'inherit' });
} else {
  log('▸ Melewati vite build (--skip-vite).');
}

/* --------------------------------------------------- 2. baca hasil build */

const indexHtmlPath = path.join(VITE_OUT, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  throw new Error(`dist-gas/index.html tidak ditemukan. Jalankan tanpa --skip-vite.`);
}
const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');

function collectAssets(html) {
  const jsFiles = [];
  const cssFiles = [];

  const scriptRe = /<script[^>]*\ssrc=["']([^"']+)["'][^>]*><\/script>/gi;
  let match;
  while ((match = scriptRe.exec(html)) !== null) jsFiles.push(match[1]);

  const linkRe = /<link[^>]*\srel=["']stylesheet["'][^>]*\shref=["']([^"']+)["'][^>]*>/gi;
  while ((match = linkRe.exec(html)) !== null) cssFiles.push(match[1]);

  // Vite bisa menaruh href sebelum rel.
  const linkRe2 = /<link[^>]*\shref=["']([^"']+\.css)["'][^>]*>/gi;
  while ((match = linkRe2.exec(html)) !== null) {
    if (!cssFiles.includes(match[1])) cssFiles.push(match[1]);
  }

  return { jsFiles, cssFiles };
}

function resolveAsset(ref) {
  const clean = String(ref).replace(/^\.?\//, '').split('?')[0];
  const candidate = path.join(VITE_OUT, clean);
  if (!fs.existsSync(candidate)) throw new Error(`Aset build tidak ditemukan: ${candidate}`);
  return fs.readFileSync(candidate, 'utf8');
}

const { jsFiles, cssFiles } = collectAssets(indexHtml);
if (!jsFiles.length) throw new Error('Tidak ada berkas JS pada hasil build (dist-gas/index.html).');

const cssText = cssFiles.map(resolveAsset).join('\n');
const jsText = jsFiles.map(resolveAsset).join('\n;\n');

log(`▸ CSS: ${cssFiles.length} berkas (${formatBytes(Buffer.byteLength(cssText))})`);
log(`▸ JS : ${jsFiles.length} berkas (${formatBytes(Buffer.byteLength(jsText))})`);

/* --------------------------------------------- 3. rakit appsscript/dist */

ensureDir(OUT_DIR);
// Bersihkan bundle lama agar tidak ada sisa chunk yang tidak terpakai.
fs.readdirSync(OUT_DIR).forEach((file) => {
  if (/^Bundle\d+\.html$/.test(file) || file === 'BundleRun.html' || file === 'Index.html') {
    fs.rmSync(path.join(OUT_DIR, file));
  }
});

const bundleFiles = [];
let counter = 0;

function nextBundleName() {
  counter += 1;
  return `Bundle${String(counter).padStart(2, '0')}`;
}

function emitChunk(varName, text) {
  chunkText(text, CHUNK_LIMIT).forEach((part) => {
    const name = nextBundleName();
    const content = `<script>window.${varName}=window.${varName}||[];window.${varName}.push(${toJsStringLiteral(part)});</script>\n`;
    fs.writeFileSync(path.join(OUT_DIR, `${name}.html`), content, 'utf8');
    bundleFiles.push(name);
  });
}

if (cssText.trim()) emitChunk('__ARMS_CSS_PARTS__', cssText);
emitChunk('__ARMS_JS_PARTS__', jsText);

/* --------------------------------------------------------- BundleRun.html */

const bundleRun = `<script>
(function () {
  var boot = document.getElementById('arms-boot');
  function showError(message) {
    if (!boot) return;
    boot.innerHTML =
      '<div style="max-width:560px;text-align:left;background:#0f172a;border:1px solid #7f1d1d;border-radius:14px;padding:18px">' +
      '<div style="font-weight:800;font-size:15px;margin-bottom:8px">Gagal memuat ARMS Control Tower</div>' +
      '<div style="font-size:12px;color:#cbd5e1;line-height:1.7">' + String(message || '').replace(/</g, '&lt;') + '</div>' +
      '</div>';
  }
  try {
    var css = (window.__ARMS_CSS_PARTS__ || []).join('');
    if (css) {
      var styleEl = document.createElement('style');
      styleEl.setAttribute('data-arms-bundle', 'css');
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }
    var js = (window.__ARMS_JS_PARTS__ || []).join('');
    if (!js) {
      showError('Bundle aplikasi kosong. Jalankan <code>npm run gas:build</code> lalu <code>npm run gas:push</code>.');
      return;
    }
    if (boot && boot.parentNode) boot.parentNode.removeChild(boot);
    var scriptEl = document.createElement('script');
    scriptEl.setAttribute('data-arms-bundle', 'js');
    scriptEl.textContent = js;
    document.body.appendChild(scriptEl);
  } catch (err) {
    showError((err && err.message) || String(err));
  }
})();
</script>
`;
fs.writeFileSync(path.join(OUT_DIR, 'BundleRun.html'), bundleRun, 'utf8');

/* ------------------------------------------------------------- Index.html */

const templatePath = path.join(GAS_DIR, 'Index.template.html');
if (!fs.existsSync(templatePath)) throw new Error('appsscript/Index.template.html tidak ditemukan.');
const template = fs.readFileSync(templatePath, 'utf8');
const includes = bundleFiles.map((name) => `    <?!= include('${name}') ?>`).join('\n');
const indexOut = template.replace('<!--__ARMS_BUNDLE_INCLUDES__-->', includes);
if (indexOut.includes('__ARMS_BUNDLE_INCLUDES__')) {
  throw new Error('Placeholder <!--__ARMS_BUNDLE_INCLUDES__--> tidak berhasil diganti.');
}
fs.writeFileSync(path.join(OUT_DIR, 'Index.html'), indexOut, 'utf8');

/* --------------------------------------------- salin sumber Apps Script */

const copied = [];
fs.readdirSync(GAS_DIR).forEach((file) => {
  if (file.endsWith('.gs') || file === 'appsscript.json') {
    fs.copyFileSync(path.join(GAS_DIR, file), path.join(OUT_DIR, file));
    copied.push(file);
  }
});
if (!copied.some((f) => f === 'Code.gs')) throw new Error('appsscript/Code.gs tidak ditemukan.');

fs.writeFileSync(
  path.join(OUT_DIR, '.claspignore'),
  ['node_modules/**', '*.map', '.DS_Store'].join('\n') + '\n',
  'utf8'
);

/* ------------------------------------------------------------- .clasp.json */

const scriptId = getArg('scriptId') || process.env.GAS_SCRIPT_ID || '';
const claspPath = path.join(GAS_DIR, '.clasp.json');
if (scriptId && typeof scriptId === 'string') {
  const existing = fs.existsSync(claspPath) ? JSON.parse(fs.readFileSync(claspPath, 'utf8')) : {};
  fs.writeFileSync(claspPath, JSON.stringify({ ...existing, scriptId, rootDir: 'dist' }, null, 2) + '\n', 'utf8');
  log(`▸ appsscript/.clasp.json diperbarui (scriptId: ${scriptId})`);
} else if (!fs.existsSync(claspPath)) {
  fs.writeFileSync(
    path.join(GAS_DIR, '.clasp.json.example'),
    JSON.stringify({ scriptId: 'ISI_SCRIPT_ID_APPS_SCRIPT', rootDir: 'dist' }, null, 2) + '\n',
    'utf8'
  );
}

/* ---------------------------------------------------------------- ringkasan */

const totalSize = fs
  .readdirSync(OUT_DIR)
  .reduce((acc, file) => acc + fs.statSync(path.join(OUT_DIR, file)).size, 0);

log('');
log('✅ Bundle Google Apps Script siap di appsscript/dist/');
log(`   Berkas Apps Script : ${copied.join(', ')}`);
log(`   Bundle frontend    : ${bundleFiles.length} berkas (Index.html + ${bundleFiles.join(', ')}, BundleRun.html)`);
log(`   Total ukuran       : ${formatBytes(totalSize)}`);
log('');
log('Langkah berikutnya:');
log('   1. npm run gas:login                       # sekali saja (clasp login)');
log('   2. npm run gas:create                      # buat project Apps Script baru, ATAU');
log('      npm run gas:build -- --scriptId <ID>    # pakai project yang sudah ada');
log('   3. npm run gas:push                        # kirim seluruh berkas');
log('   4. Buka script.google.com → Deploy → New deployment → Web app');
log('      Execute as: Me  |  Who has access: Anyone');
log('   5. Jalankan armsSetupDatabase() / armsSelfTest() dari editor (opsional)');
log('');
