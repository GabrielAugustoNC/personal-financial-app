import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      // '@' aponta para 'src/' — como o paths do tsconfig.json
      // Permite importar '@/components/...' em vez de '../../components/...'
      '@': path.resolve(__dirname, './src'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        // Injeta variáveis e mixins globalmente em todos os arquivos SCSS
        // Evita ter que importar em cada arquivo de componente
        additionalData: `
          @use "@/styles/variables" as *;
          @use "@/styles/mixins" as *;
        `,
      },
    },
  },

  server: {
    port: 5173,
    proxy: {
      // Redireciona /api/* para o backend Go em localhost:8080
      // Análogo ao proxy reverso do Angular CLI (proxy.conf.json)
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
