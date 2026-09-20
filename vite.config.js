import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [vue()],
  // base './' WAJIB untuk Capacitor. Aset dimuat dari file:// di dalam
  // WebView, jadi path absolut '/assets/...' akan gagal total dan
  // aplikasi tampil layar putih.
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    outDir: 'dist',
    // Sourcemap dimatikan — memperbesar ukuran APK tanpa manfaat di produksi
    sourcemap: false,
  },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
