import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      "@": "/src"
    }
  },
  server: {
    host: "127.0.0.1",
    port: 1420,
    strictPort: true
  },
  build: {
    target: "esnext"
  }
});
