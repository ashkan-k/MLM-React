import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/storage': 'http://127.0.0.1:8000',
      '/ws': {
        target: 'http://127.0.0.1:6001',
        ws: true,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ws/, '/') || '/',
      },
    },
  },
})
