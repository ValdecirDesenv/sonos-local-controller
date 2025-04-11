import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true, // Generates source maps for debugging
  },
  server: {
    open: true, // Automatically opens the browser on startup
  },
});
