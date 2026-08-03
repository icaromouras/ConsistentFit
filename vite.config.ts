import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // caminhos relativos: funciona no GitHub Pages (servido em /ConsistentFit/)
  base: './',
  plugins: [react()],
})
