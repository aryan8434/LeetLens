import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'firebase/firestore', 'lucide-react'],
        },
        chunkFileNames: 'js/[name].[hash].js',
        entryFileNames: 'js/[name].[hash].js',
        assetFileNames: ({ name }) => {
          if (/\\.css$/.test(name)) {
            return 'css/[name].[hash].css';
          }
          return 'assets/[name].[hash][extname]';
        },
      },
    },
    sourcemap: false,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/firestore', 'firebase/auth', 'lucide-react'],
  },
})
