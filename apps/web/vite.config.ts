import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/app/',
  server: {
    // Proxy para desenvolvimento local
    // Redireciona requisições /api e /_ para o PocketBase local
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      },
      '/_': {
        target: 'http://localhost:8090',
        changeOrigin: true,
      }
    },
  },
})
