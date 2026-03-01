import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    define: {
      // Garante que a variável de ambiente seja embutida no build
      __API_URL__: JSON.stringify(env.VITE_API_URL || '')
    }
  }
})