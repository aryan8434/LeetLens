import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }
          if (
            id.includes("react") ||
            id.includes("react-dom") ||
            id.includes("firebase/firestore") ||
            id.includes("lucide-react")
          ) {
            return "vendor";
          }
          return "vendor";
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
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "firebase/firestore",
      "firebase/auth",
      "lucide-react",
    ],
  },
});
