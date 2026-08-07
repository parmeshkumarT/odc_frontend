import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // Use relative asset paths so the app can be deployed to a subpath (GitHub Pages, subdirectories)
  base: './',
  plugins: [react(), tailwindcss()],

})
