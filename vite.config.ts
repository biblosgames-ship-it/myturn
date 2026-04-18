import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-myturn.png'],
      manifest: {
        name: "MyTurn",
        short_name: "MyTurn",
        description: "Reserva y sigue tu turno en tiempo real",
        start_url: "/?utm_source=pwa",
        scope: "/",
        display: "standalone",
        background_color: "#09090b",
        theme_color: "#09090b",
        orientation: "portrait",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/logo-myturn.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/logo-myturn.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
})
