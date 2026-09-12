import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        'exceljs': path.resolve(__dirname, 'node_modules/exceljs/dist/exceljs.min.js'),
      },
    },
    server: {
      port: 3000,
      watch: {
        ignored: ['**/.agents/**', '**/.git/**', '**/dist/**', '**/.planning/**']
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api/v1': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ detail: 'Backend offline or unauthenticated' }));
              }
            });
          },
        },
        '/api/msg91': {
          target: 'https://control.msg91.com/api/v5',
          changeOrigin: true,
          secure: false,
          rewrite: (p) => p.replace(/^\/api\/msg91/, '')
        }
      }
    },
    optimizeDeps: {
      include: ['exceljs'],
    },
    build: {
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
            'ui-vendor': ['lucide-react', 'motion', 'canvas-confetti'],
            'pdf-vendor': ['jspdf', 'html-to-image'],
            'excel-vendor': ['exceljs'],
          },
        },
      },
    },
  };
});
