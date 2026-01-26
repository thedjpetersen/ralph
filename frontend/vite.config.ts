import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Target modern browsers for smaller output
    target: 'es2020',
    // Generate source maps for debugging (disabled in production for smaller builds)
    sourcemap: false,
    // Manual chunk splitting for optimal caching and code splitting
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Core React runtime - needed on first load
          if (id.includes('node_modules/react-dom') ||
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          // State management - needed on first load (small)
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          // Charts library - heavy, lazy loaded with chart pages
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-vendor')) {
            return 'vendor-charts';
          }
          // Animation library - lazy loaded
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-motion';
          }
          // PDF export utilities - lazy loaded on export pages
          if (id.includes('node_modules/jspdf') ||
              id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }
        },
      },
    },
    // Increase chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 300,
  },
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'zustand',
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**'],
  },
})
