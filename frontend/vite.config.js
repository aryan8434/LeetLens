import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  build: {
    target: "esnext",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "firebase/firestore"],
        },
        chunkFileNames: "js/[name].[hash].js",
        entryFileNames: "js/[name].[hash].js",
        assetFileNames: ({ name }) => {
          if (/\\.css$/.test(name)) {
            return "css/[name].[hash].css";
          }
          return "assets/[name].[hash][extname]";
        },
      },
    },
    sourcemap: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "firebase/firestore", "firebase/auth"],
  },
});
