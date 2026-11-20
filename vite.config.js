import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: true,
    // the preview is served through a proxy host, so accept any Host header
    allowedHosts: true,
    hmr: false
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0
  }
});
