export default {
  define: {
    global: "globalThis",
  },
  optimizeDeps: {
    exclude: ["@medusajs/framework"],
  },
}