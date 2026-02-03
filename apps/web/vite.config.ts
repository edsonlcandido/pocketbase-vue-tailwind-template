import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/app/',
  server: {
    proxy: {
      '/api': {
        target: 'https://solid-palm-tree-j4w7q79wv5xfpwxx-8090.app.github.dev/',
        changeOrigin: true,
      },
      '/_': {
        target: 'https://solid-palm-tree-j4w7q79wv5xfpwxx-8090.app.github.dev/',
        changeOrigin: true,
      }
    },
  },
})
