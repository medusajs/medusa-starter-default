import { defineConfig } from "vite"

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 7001,
    allowedHosts: [
      "temp-medusajs.vwuade.easypanel.host",
      "api.temp-medusajs.vwuade.easypanel.host",
      ".easypanel.host", // Allow all easypanel subdomains
      "localhost"
    ],
    hmr: {
      protocol: "wss",
      host: "temp-medusajs.vwuade.easypanel.host"
    }
  }
})
