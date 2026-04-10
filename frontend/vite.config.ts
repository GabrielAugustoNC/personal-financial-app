import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // '@' aponta para 'src/' — permite importar '@/components/...' sem paths relativos
      '@': path.resolve(__dirname, './src'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        // Usa a API moderna do Sass (sem deprecation warnings).
        // additionalData injeta o arquivo _index.scss em todo módulo SCSS,
        // que por sua vez usa @forward para expor variáveis e mixins no escopo global.
        // Analogia Angular: stylePreprocessorOptions.includePaths no angular.json
        api: 'modern-compiler',
        additionalData: `@use "@/styles/index" as *;`,
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Redireciona /api/* para o backend Go em localhost:8080
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
