import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// CORS when consuming Medusa from admin
const ADMIN_CORS =
  process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:9001"

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000"

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://localhost/medusa-starter-default"

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || ""
  

const plugins = [

]

const modules = [
  {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/payment-stripe",
          id: "stripe",
          options: {
            apiKey: process.env.STRIPE_API_KEY,
          },
        },
      ],
    },
  },

]

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseDriverOptions: process.env.NODE_ENV !== "development" ?
      { ssl: { rejectUnauthorized: false } } : {},
    redisUrl: REDIS_URL,
    redisOptions: {
      password: REDIS_PASSWORD,
      commandTimeout: 10000
    },
    http: {
      storeCors: STORE_CORS!,
      adminCors: ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  plugins,
  modules
})
