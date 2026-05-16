import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts')) return 'vendor-recharts'
          if (id.includes('node_modules/date-fns')) return 'vendor-date'
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/@hookform')) return 'vendor-forms'
          if (id.includes('node_modules/zod')) return 'vendor-forms'
          if (id.includes('node_modules/@tanstack')) return 'vendor-tanstack'
          if (id.includes('node_modules/lucide-react')) return 'vendor-lucide'
          if (id.includes('node_modules/react-dom')) return 'vendor-react'
          if (id.includes('node_modules/react/') || id.includes('node_modules/react\\')) return 'vendor-react'
          if (id.includes('node_modules/scheduler')) return 'vendor-react'
        },
      },
    },
  },
})
