/// <reference types="vitest/config" />
import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Pure client SPA. No SSR, no dev proxy: in mock mode MSW intercepts fetches in
// the browser; against a real server the API base comes from VITE_API_BASE_URL
// (empty = same-origin, the self-host embed case).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { host: true },
  preview: { host: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: true,
  },
});
