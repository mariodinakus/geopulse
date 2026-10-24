import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        globe: resolve(process.cwd(), 'globe.html')
      }
    },
    chunkSizeWarningLimit: 2200
  },
  server: { host: '0.0.0.0' }
});
