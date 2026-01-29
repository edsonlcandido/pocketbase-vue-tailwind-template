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
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false
      },
      '/_': {
        target: 'http://localhost:8090',
        changeOrigin: true,
        secure: false
      }
    }
  }
})