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
        // @import injeta no escopo global compartilhado entre todos os arquivos SCSS.
        // @use isolaria cada módulo — mixins não enxergariam as variáveis de outro módulo.
        // Analogia Angular: stylePreprocessorOptions.includePaths no angular.json
        additionalData: `
          @import "@/styles/variables";
          @import "@/styles/mixins";
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
