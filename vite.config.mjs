import { defineConfig } from 'vite';

const apiTarget = process.env.RESUME_API_TARGET || 'http://127.0.0.1:8000';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/data/images': apiTarget,
      '/resume_local_data.json': apiTarget
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    // html2pdf is a self-contained vendor bundle and is loaded only on demand.
    chunkSizeWarningLimit: 950
  }
});
