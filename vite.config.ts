import { defineConfig } from "vite/config"

export default defineConfig({
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ["@medusajs/framework"],
  },
}) 