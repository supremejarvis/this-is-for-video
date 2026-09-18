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
      host: 'localhost',
      strictPort: true,
      watch: {
        ignored: ['**/.agents/**', '**/.git/**', '**/dist/**', '**/.planning/**']
      },
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR === 'true' ? false : {
        host: 'localhost',
        clientPort: 3000,
      },
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '/api/v1'),
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ detail: 'FastAPI backend service is unavailable or restarting' }));
              }
            });
          },
        },
      }
    },
    optimizeDeps: {
      include: ['exceljs'],
    },
    build: {
      chunkSizeWarningLimit: 500,
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['lucide-react', 'motion', 'canvas-confetti', 'react-zoom-pan-pinch'],
            'pdf-vendor': ['jspdf', 'html-to-image'],
            'excel-vendor': ['exceljs'],
            'store-vendor': ['zustand'],
            'utils-vendor': ['clsx', 'tailwind-merge', 'react-helmet-async'],
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const name = assetInfo.name || 'asset';
            const info = name.split('.');
            const ext = info[info.length - 1];
            if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(name)) {
              return `assets/images/[name]-[hash].${ext}`;
            }
            if (/\.(css)$/.test(name)) {
              return `assets/css/[name]-[hash].${ext}`;
            }
            if (/\.(woff2?|eot|ttf|otf)$/.test(name)) {
              return `assets/fonts/[name]-[hash].${ext}`;
            }
            return `assets/[name]-[hash].${ext}`;
          },
        },
      },
    },
  };
});
