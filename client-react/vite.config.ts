import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 3002,
    open: true,
    hmr: { port: 3003 },
    proxy: {
      '/socket.io': { target: 'ws://localhost:8000', ws: true, rewriteWsOrigin: true },
      '/wave':      { target: 'http://localhost:8000', changeOrigin: true },
      '/auth':      { target: 'http://localhost:8000', changeOrigin: true },
      '/loginTest': { target: 'http://localhost:8000', changeOrigin: true },
      '/logoutTest':{ target: 'http://localhost:8000', changeOrigin: true },
      '/logout':    { target: 'http://localhost:8000', changeOrigin: true },
      '/invite':    { target: 'http://localhost:8000', changeOrigin: true },
      '/logError':  { target: 'http://localhost:8000', changeOrigin: true },
      '/use-react':    { target: 'http://localhost:8000', changeOrigin: true },
      '/use-backbone': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})

