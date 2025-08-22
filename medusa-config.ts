import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Function to get database URL with fallback
function getDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_URL
  
  // If FALLBACK_TO_SUPABASE is set, use Supabase URL instead
  if (process.env.FALLBACK_TO_SUPABASE === 'true' && supabaseUrl) {
    console.log('Using Supabase database connection')
    return supabaseUrl
  }
  
  return directUrl
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: getDatabaseUrl(),
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  modules: [
    // Production Redis modules for caching, events, and workflows
    {
      resolve: "@medusajs/cache-redis",
      key: Modules.CACHE,
      options: {
        redisUrl: process.env.REDIS_URL || "redis://localhost:6379"
      }
    },
    {
      resolve: "@medusajs/event-bus-redis", 
      key: Modules.EVENT_BUS,
      options: {
        redisUrl: process.env.REDIS_URL || "redis://localhost:6379"
      }
    },
    {
      resolve: "@medusajs/workflow-engine-redis",
      key: Modules.WORKFLOW_ENGINE,
      options: {
        redis: {
          url: process.env.REDIS_URL || "redis://localhost:6379"
        }
      }
    },
    // Custom business modules
    {
      resolve: "./src/modules/purchasing",
    },
    {
      resolve: "./src/modules/user-preferences",
    },
    {
      resolve: "./src/modules/stock-location-details",
    },
    {
      resolve: "./src/modules/machines",
    },
    {
      resolve: "./src/modules/technicians",
    },
    {
      resolve: "./src/modules/brands",
    },
    {
      resolve: "./src/modules/service-orders",
    },
    {
      resolve: "./src/modules/invoicing",
    },
    {
      resolve: "./src/modules/warranties",
    },
    {
      resolve: "./src/modules/rentals",
    },
    {
      resolve: "@medusajs/index",
    },
  ],
})
