/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import type { Plugin } from 'vite';
import { readFileSync } from 'node:fs';

const PROD_API_ORIGIN = 'https://attendance-api-1xgl.onrender.com';

/**
 * Security headers of the hosting (vercel.json), applied to `vite preview` too so the
 * e2e suite runs under the production CSP. The API origin is swapped for the local
 * one used by the tests; `upgrade-insecure-requests` and HSTS are dropped on http.
 */
function previewSecurityHeaders(): Record<string, string> {
  const config = JSON.parse(readFileSync(new URL('./vercel.json', import.meta.url), 'utf8')) as {
    headers: { source: string; headers: { key: string; value: string }[] }[];
  };
  const all = config.headers.find((h) => h.source === '/(.*)')?.headers ?? [];
  const apiOrigin = process.env.VITE_API_URL ? new URL(process.env.VITE_API_URL).origin : '';
  const out: Record<string, string> = {};
  for (const { key, value } of all) {
    if (key === 'Strict-Transport-Security') continue;
    out[key] =
      key === 'Content-Security-Policy'
        ? value
            .replaceAll(PROD_API_ORIGIN, apiOrigin || PROD_API_ORIGIN)
            .replace(/;\s*upgrade-insecure-requests/, '')
        : value;
  }
  return out;
}

/** Removes the Tailwind licence/version banner comment from built CSS (REL-12). */
function stripCssBanners(): Plugin {
  return {
    name: 'strip-css-banners',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      for (const file of Object.values(bundle)) {
        if (file.type === 'asset' && file.fileName.endsWith('.css')) {
          file.source = String(file.source).replace(/\/\*![\s\S]*?\*\/\s*/g, '');
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    stripCssBanners(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['brand/*.png', 'icons/*.png'],
      manifest: {
        name: 'Assistance Ghana Attendance',
        short_name: 'Attendance',
        description: 'Assistance Ghana staff attendance',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#F7F6F2',
        theme_color: '#256EAD',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell and static assets only. API responses are never cached:
        // no runtimeCaching is declared, and the API lives on another origin.
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        // Push and notification-click handlers (public/push-sw.js).
        importScripts: ['push-sw.js'],
        cleanupOutdatedCaches: true,
        sourcemap: false,
      },
    }),
  ],
  preview: { headers: previewSecurityHeaders() },
  build: {
    sourcemap: false,
    target: 'es2022',
    rolldownOptions: {
      output: {
        // Strip console output and license comments (no library mentions in production).
        minify: { compress: { dropConsole: true, dropDebugger: true } },
        comments: false,
        entryFileNames: 'assets/[hash].js',
        chunkFileNames: 'assets/[hash].js',
        assetFileNames: 'assets/[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
