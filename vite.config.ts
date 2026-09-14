import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            icons: ['lucide-react'],
            charts: ['recharts'],
          },
        },
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      // Abaikan artefak build & storage supaya watcher tidak reload berulang
      // (bundle Apps Script bisa >2MB dan memicu HMR storm).
      watch: process.env.DISABLE_HMR === 'true'
        ? null
        : {
            ignored: ['**/node_modules/**', '**/.git/**', '**/dist/**', '**/dist-gas/**', '**/storage/**'],
          },
      allowedHosts: true as const,
    },
    preview: {
      allowedHosts: true as const,
    },
  };
});
