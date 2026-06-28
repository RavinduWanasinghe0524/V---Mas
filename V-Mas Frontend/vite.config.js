import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'https://d3dqxbt72t73lz.cloudfront.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path
      }
    }
  }
})
