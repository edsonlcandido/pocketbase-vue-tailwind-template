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
    // Proxy para desenvolvimento local
    // Redireciona requisições para os serviços corretos
    proxy: {
      '/api': {
        target: 'http://localhost:8090',
        changeOrigin: true
      },
      '/_': {
        target: 'http://localhost:8090',
        changeOrigin: true
      },
      '/app': {
        target: 'http://localhost:5174',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/app/, '/app')
      }
    }
  }
})