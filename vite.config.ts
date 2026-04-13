import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  cacheDir: '.vite-cache',
  optimizeDeps: {
    noDiscovery: true,
    include: [],
  },
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
  },
});
