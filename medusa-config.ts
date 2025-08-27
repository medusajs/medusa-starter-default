import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { Modules } from '@medusajs/utils'
// @ts-ignore
import progress from 'rollup-plugin-progress'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const required = ['DATABASE_URL', 'JWT_SECRET', 'COOKIE_SECRET', 'STORE_CORS', 'ADMIN_CORS', 'AUTH_CORS']
  for (const env of required) {
    if (!process.env[env] && !process.env.SUPABASE_DATABASE_URL) {
      throw new Error(`Missing required environment variable: ${env}`)
    }
  }
}

function getDatabaseUrl() {
  const directUrl = process.env.DATABASE_URL
  const supabaseUrl = process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_URL

  if (process.env.FALLBACK_TO_SUPABASE === 'true' && supabaseUrl) {
    console.log('Using Supabase database connection')
    return supabaseUrl
  }

  return directUrl
}

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: getDatabaseUrl(),
    redisUrl: process.env.REDIS_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  admin: {
    vite: () => {
      return {
        define: {
          global: "globalThis",
        },
        optimizeDeps: {
          exclude: ["@medusajs/framework"],
        },
        logLevel: 'info',
        server: {
          host: '0.0.0.0',
          hmr: {
            port: 443,
            host: '91.98.114.119',
            protocol: 'wss'
          }
        },
        build: {
          rollupOptions: {
            preserveEntrySignatures: false,
            plugins: [
              progress()
            ],
            // Optimize for low-memory environments
            output: {
              manualChunks: (id: string) => {
                if (id.includes('node_modules')) {
                  return 'vendor';
                }
              },
            },
          },
          // Reduce memory usage during build
          minify: false, // Disable minification to save memory
          sourcemap: true, // Enable source maps for debugging
          chunkSizeWarningLimit: 1000,
        },
      }
    },
  },
  modules: [
    // Use in-memory modules for development, Redis for production
    ...(process.env.NODE_ENV === 'development' ? [
      {
        resolve: "@medusajs/cache-inmemory",
        key: Modules.CACHE,
        options: { ttl: 0 }
      },
      {
        resolve: "@medusajs/event-bus-local",
        key: Modules.EVENT_BUS
      },
      {
        resolve: "@medusajs/workflow-engine-inmemory",
        key: Modules.WORKFLOW_ENGINE
      },
    ] : [
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
    ]),
    // Custom modules
    {
      resolve: "./src/modules/brands",
    },
    {
      resolve: "./src/modules/invoicing",
    },
    {
      resolve: "./src/modules/machines",
    },
    {
      resolve: "./src/modules/purchasing",
    },
    {
      resolve: "./src/modules/rentals",
    },
    {
      resolve: "./src/modules/service-orders",
    },
    {
      resolve: "./src/modules/stock-location-details",
    },
    {
      resolve: "./src/modules/technicians",
    },
    {
      resolve: "./src/modules/user-preferences",
    },
    {
      resolve: "./src/modules/warranties",
    },
    // … your custom modules …
    {
      resolve: "@medusajs/index",
    },
  ],
})
