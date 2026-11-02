import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  plugins: [tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./web', import.meta.url)) } },
  root: 'web',
  base: './',
  build: { outDir: '../app/src/main/assets/editor', emptyOutDir: true, assetsInlineLimit: 0, chunkSizeWarningLimit: 1000 },
  server: { port: 5173, strictPort: true },
});
