import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import pkg from './package.json' with { type: 'json' }

// GitHub Pages serves the site from /khet-khata/. Override with BASE_PATH for other hosts.
export default defineConfig({
  base: process.env.BASE_PATH || '/khet-khata/',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
})
