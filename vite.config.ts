import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // ✅ FIX 1: Teach Vite how to resolve @/* imports at build time.
    // tsconfig.json paths only help the TypeScript compiler (IDE).
    // Without this, `import X from '@/components/X'` compiles fine but
    // FAILS at runtime with "Cannot find module" because Vite doesn't
    // read tsconfig paths automatically.
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        // ✅ FIX 2: This proxy is only active in `vite dev` (local dev).
        // It only works when VITE_API_URL is NOT set (or set to /api).
        // See .env.development below.
      },
    },
  },
});