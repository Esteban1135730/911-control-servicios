import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.jpeg'],
      manifest: {
        name: '911 Control de Servicios',
        short_name: '911 Servicios',
        description: 'Control de servicios para conductores 911 Transportes Especiales',
        theme_color: '#1E6FFF',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        lang: 'es-CO',
        icons: [
          {
            src: '/logo.jpeg',
            sizes: '192x192',
            type: 'image/jpeg',
          },
          {
            src: '/logo.jpeg',
            sizes: '512x512',
            type: 'image/jpeg',
          },
        ],
      },
      workbox: {
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: { cacheName: 'api-cache' },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
    },
  },
});
