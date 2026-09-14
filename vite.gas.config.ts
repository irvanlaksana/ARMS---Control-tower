import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

/**
 * Konfigurasi build khusus deploy Google Apps Script.
 *
 * Perbedaan dengan build biasa (`vite.config.ts`):
 *  - seluruh aplikasi dikemas menjadi SATU berkas JS (IIFE) + SATU berkas CSS
 *    sehingga bisa di-inline ke HTML Apps Script (HtmlService tidak mendukung
 *    berkas aset terpisah maupun code-splitting dinamis);
 *  - semua aset (gambar/font) diubah menjadi data URL;
 *  - output ke `dist-gas/` agar tidak menimpa `dist/` milik deploy Netlify/Vercel.
 *
 * Fitur & fungsi aplikasi tidak diubah — hanya cara pengemasannya.
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  define: {
    // Penanda build Apps Script (dipakai untuk log/branch ringan bila perlu).
    'import.meta.env.VITE_ARMS_GAS_BUILD': JSON.stringify('1'),
  },
  build: {
    outDir: 'dist-gas',
    emptyOutDir: true,
    target: 'es2019',
    cssCodeSplit: false,
    assetsInlineLimit: 100_000_000,
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 8000,
    reportCompressedSize: false,
    rollupOptions: {
      input: path.resolve(__dirname, 'index.html'),
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/arms-app.js',
        assetFileNames: 'assets/arms-app.[ext]',
      },
    },
  },
  server: {
    allowedHosts: true as const,
  },
});
