import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('recharts') || id.includes('d3-') || id.includes('victory-')) {
            return 'vendor-charts'
          }
          if (id.includes('leaflet') || id.includes('react-leaflet')) {
            return 'vendor-map'
          }
          if (id.includes('socket.io-client') || id.includes('engine.io')) {
            return 'vendor-socket'
          }
          if (id.includes('@radix-ui')) {
            return 'vendor-radix'
          }
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
            return 'vendor-forms'
          }
          if (
            id.includes('/react/') ||
            id.includes('react-dom') ||
            id.includes('react-router') ||
            id.includes('react-is') ||
            id.includes('scheduler')
          ) {
            return 'vendor-react'
          }
          if (id.includes('@tanstack/react-query')) {
            return 'vendor-query'
          }
          if (id.includes('node_modules')) {
            return 'vendor-misc'
          }
        },
      },
    },
  },
})
