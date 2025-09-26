import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { resolve } from 'path'
import alias from '@rollup/plugin-alias'

const projectRootDir = resolve(__dirname);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    alias(),
    vue(),
    vueDevTools(),
  ],
  server: {
    port: 4000,
    host: true
  },
  resolve: {
    alias: {
      '@': resolve(projectRootDir, 'src')
    }
  },



  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: [
          'import',
          'mixed-decls',
          'color-functions',
          'global-builtin',
        ],
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          ol: ['ol'],
          vue: ['vue'],
          'chart.js': ['chart.js'],
          '@garmin/fitsdk': ['@garmin/fitsdk'],
          readDroppedFile: ['@/lib/fileReader/readDroppedFile'],
        }
      }
    }
  }
})
