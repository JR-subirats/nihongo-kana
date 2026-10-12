import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['icon.svg', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'kyoto.jpg'],
      manifest: {
        id: './',
        name: 'Kana Studio',
        short_name: 'Kana Studio',
        description: 'Study Japanese hiragana and katakana with personalized offline quizzes.',
        lang: 'en',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f9f8',
        theme_color: '#357861',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff2,png,jpg,svg,ico}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    watch: {
      usePolling: process.platform === 'win32',
      interval: 300,
    },
  },
});