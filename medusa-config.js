import { loadEnv, defineConfig, Modules } from '@medusajs/utils'

loadEnv(process.env.NODE_ENV, process.cwd())

module.exports = defineConfig({
  databaseUrl: process.env.DATABASE_URL,
  http: {
    storeCors: process.env.STORE_CORS,
    adminCors: process.env.ADMIN_CORS,
    authCors: process.env.AUTH_CORS,
    jwtSecret: process.env.JWT_SECRET || "supersecret",
    cookieSecret: process.env.COOKIE_SECRET || "supersecret",
  },
  modules: {
    [Modules.STOCK_LOCATION]: false,
  }
})
