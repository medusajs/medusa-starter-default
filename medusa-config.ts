import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { Modules } from '@medusajs/utils'
// @ts-ignore
// Removed rollup progress plugin to avoid requiring it at runtime

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Validate required environment variables in production runtime (not during build)
// Skip validation if:
// 1. MEDUSA_BUILD=true (during medusa build command)
// 2. DATABASE_URL contains 'dummy' (build-time dummy value)
const isBuildTime = process.env.MEDUSA_BUILD === 'true' || 
                    process.env.DATABASE_URL?.includes('dummy')

if (process.env.NODE_ENV === 'production' && !isBuildTime) {
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
    // Worker mode: shared (default) for development, server/worker for production
    workerMode: (process.env.WORKER_MODE || "shared") as "shared" | "worker" | "server",
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
      // Only include allowedHosts if the environment variable is set (production)
      ...(process.env.ALLOWED_HOSTS && { allowedHosts: process.env.ALLOWED_HOSTS }),
    }
  },
  admin: {
    // Disable admin in worker mode to save resources
    disable: process.env.ADMIN_DISABLED === "true",
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
          // Disable HMR for local development to avoid port binding issues
          hmr: false,
          // Add allowedHosts for production
          ...(process.env.ALLOWED_HOSTS && {
            allowedHosts: process.env.ALLOWED_HOSTS.split(',').map(h => h.trim()).filter(Boolean)
          }),
        },
        build: {
          rollupOptions: {
            preserveEntrySignatures: false,
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
  plugins: [
    // Removed @rsc-labs/medusa-documents-v2 plugin
    // It was causing i18n conflicts by changing the global locale
  ],
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
    // File storage module with S3 provider for Supabase (only when credentials are available)
    ...(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? [{
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: process.env.S3_FILE_URL,
              access_key_id: process.env.S3_ACCESS_KEY_ID,
              secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
              region: process.env.S3_REGION,
              bucket: process.env.S3_BUCKET,
              endpoint: process.env.S3_ENDPOINT,
              // Add best practice configurations
              prefix: "medusa-uploads/",
              cache_control: "public, max-age=31536000",
              download_file_duration: 3600,
              additional_client_config: {
                forcePathStyle: true, // Required for Supabase
              },
            },
          },
        ],
      },
    }    ] : []),
    // Notification module for email service
    {
      resolve: "@medusajs/medusa/notification",
      key: Modules.NOTIFICATION,
      options: {
        providers: [
          // Local provider for development (logs emails to console)
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: {
              channels: ["email"],
            },
          },
        ],
      },
    },
    // Custom modules
    {
      resolve: "./src/modules/brands",
    },
    {
      resolve: "./src/modules/invoice-settings",
    },
    {
      resolve: "./src/modules/invoicing",
    },
    {
      resolve: "./src/modules/machines",
    },
    {
      resolve: "./src/modules/offers",
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
