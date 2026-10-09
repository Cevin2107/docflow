import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/pone-upload': {
        target: 'https://pone.rs',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pone-upload/, '/upload'),
      },
    },
  },
})
