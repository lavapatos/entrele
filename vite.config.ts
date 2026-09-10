import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['icons/entrele-cow.svg', 'icons/entrele-cow-180.png'],
      manifest: {
        id: '/',
        name: 'ENTRELE',
        short_name: 'ENTRELE',
        description: 'Un juego diario de palabras en español.',
        lang: 'es-CL',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#fbfaf6',
        theme_color: '#fbfaf6',
        icons: [
          {
            src: 'icons/entrele-cow-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/entrele-cow-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/entrele-cow-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ['**/*.{html,js,css,svg,png,woff2}'],
        navigateFallback: 'index.html',
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'supabase/**/*.test.ts'],
  },
})
