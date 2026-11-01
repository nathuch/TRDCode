import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // Rutas relativas: el mismo build funciona en cualquier carpeta del servidor (RNF-10).
  base: './',
  plugins: [react()],
  // En desarrollo, las llamadas a api/ van al PHP local:
  //   C:\xampp\php\php.exe -S 127.0.0.1:8000 scripts/servidor_dev.php
  // Se usa 127.0.0.1 y no localhost: Node puede resolver localhost a IPv6 (::1) y no encontrar a PHP.
  server: { proxy: { '/api': 'http://127.0.0.1:8000' } },
  test: { environment: 'node' },
})
