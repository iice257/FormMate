import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  cacheDir: '.vite-cache',
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET
          || (process.env.VERCEL_DEV_PORT ? `http://127.0.0.1:${process.env.VERCEL_DEV_PORT}` : 'http://127.0.0.1:3000'),
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-vendor';
          }
          if (id.includes('node_modules/ogl')) {
            return 'ogl-vendor';
          }
          return undefined;
        },
      },
    },
  },
});
