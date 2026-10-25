import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el mismo build funciona en cualquier carpeta del servidor (RNF-10).
  base: './',
  plugins: [react()],
  // En desarrollo, las llamadas a api/ van al PHP local (php -S localhost:8000).
  server: { proxy: { '/api': 'http://localhost:8000' } },
  test: { environment: 'node' },
})
