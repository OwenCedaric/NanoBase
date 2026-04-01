import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8787',
      '/sitemap.xml': 'http://localhost:8787',
      '/sitemap-docs': 'http://localhost:8787',
      '/robots.txt': 'http://localhost:8787'
    }
  }
});
