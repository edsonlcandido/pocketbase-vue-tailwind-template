import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
      },
    },
    target: 'es2015',
    minify: true,
    cssMinify: true
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://solid-palm-tree-j4w7q79wv5xfpwxx-8090.app.github.dev/',
        changeOrigin: true,
        secure: false
      },
      '/_': {
        target: 'https://solid-palm-tree-j4w7q79wv5xfpwxx-8090.app.github.dev/',
        changeOrigin: true,
        secure: false
      },
      '/app':{
        target: 'https://solid-palm-tree-j4w7q79wv5xfpwxx-5174.app.github.dev/',
        changeOrigin: true,
        secure: false
      }
    }
  }
})