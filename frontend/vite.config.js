import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The single shared .env lives one level up (repo root). Only VITE_* vars reach the browser.
const ENV_DIR = '..';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ENV_DIR, '');
  return {
    envDir: ENV_DIR,
    plugins: [react()],
    build: { chunkSizeWarningLimit: 800 },
    server: {
      port: 5173,
      host: true, // also reachable from phones on the same Wi-Fi (needed to test QR codes)
      proxy: {
        '/api': { target: env.VITE_API_PROXY_TARGET || `http://localhost:${env.PORT || 5000}`, changeOrigin: true },
      },
    },
  };
});
