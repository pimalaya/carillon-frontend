import path from 'node:path';
import type { UserConfig } from 'vite';
import type { UserConfig as VitestUserConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Pure client SPA. No SSR, no dev proxy: in mock mode MSW intercepts fetches in
// the browser; against a real server the API base comes from VITE_API_BASE_URL
// (empty = same-origin, the self-host embed case).
//
// Typed as vite's own `UserConfig` (so `plugins` matches the plugins' vite
// types) intersected with just vitest's `test` — vitest bundles a duplicate
// nested `vite`, so typing the whole object as vitest's config would clash on
// the `Plugin` type. A plain object is a valid vite config; `defineConfig` is
// only sugar.
const config: UserConfig & { test: VitestUserConfig['test'] } = {
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
    // Ignore the nix flake's in-tree source snapshot, else vitest runs a
    // duplicate (unresolvable) copy of every *.test.ts.
    exclude: ['**/node_modules/**', '**/dist/**', '**/.direnv/**'],
  },
};

export default config;
