import { loadEnv, defineConfig } from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const IS_PRODUCTION = ["production", "prod"].includes(process.env.NODE_ENV ?? "")
// `medusa build` also loads this file, but secrets only exist at runtime.
const IS_BUILD = process.argv.slice(2).includes("build")

const env = (name: string): string | undefined => {
  const value = process.env[name]?.trim()
  return value ? value : undefined
}

const configErrors: string[] = []

/** Required in production (fail fast at boot), optional in dev/test. */
const requiredInProduction = (name: string): string | undefined => {
  const value = env(name)
  if (IS_PRODUCTION && !value) {
    configErrors.push(`${name} is not set`)
  }
  return value
}

/** Secrets: never the publicly known default, at least 32 chars in production. */
const secret = (name: string): string | undefined => {
  const value = requiredInProduction(name)
  if (IS_PRODUCTION && value && (value === "supersecret" || value.length < 32)) {
    configErrors.push(
      `${name} must be a random value of at least 32 characters (e.g. \`openssl rand -hex 32\`)`
    )
  }
  return value
}

const WORKER_MODES = ["shared", "worker", "server"] as const
type WorkerMode = (typeof WORKER_MODES)[number]

const workerMode = (env("MEDUSA_WORKER_MODE") ?? "shared") as WorkerMode
if (!WORKER_MODES.includes(workerMode)) {
  configErrors.push(
    `MEDUSA_WORKER_MODE must be one of ${WORKER_MODES.join(", ")} (got "${workerMode}")`
  )
}

const DATABASE_URL = requiredInProduction("DATABASE_URL")
const REDIS_URL = env("REDIS_URL")
const STORE_CORS = requiredInProduction("STORE_CORS")
const ADMIN_CORS = requiredInProduction("ADMIN_CORS")
const AUTH_CORS = requiredInProduction("AUTH_CORS")
const JWT_SECRET = secret("JWT_SECRET")
const COOKIE_SECRET = secret("COOKIE_SECRET")
const MEDUSA_BACKEND_URL = (
  requiredInProduction("MEDUSA_BACKEND_URL") ?? "http://localhost:9000"
).replace(/\/+$/, "")
const STRIPE_API_KEY = requiredInProduction("STRIPE_API_KEY")
const STRIPE_WEBHOOK_SECRET = requiredInProduction("STRIPE_WEBHOOK_SECRET")
const RESEND_API_KEY = requiredInProduction("RESEND_API_KEY")
const RESEND_FROM_EMAIL = requiredInProduction("RESEND_FROM_EMAIL")
// Read directly by src/ (email links); validated here so production fails fast.
requiredInProduction("STOREFRONT_URL")

if (IS_PRODUCTION && !REDIS_URL) {
  // Without Redis, event bus / workflow engine / locking run in-memory and
  // sessions are stored in memory: not safe for production.
  configErrors.push("REDIS_URL is not set")
}

if (configErrors.length && !IS_BUILD) {
  // Boot-time config error, not an HTTP error -> plain Error is intended.
  // eslint-disable-next-line @medusajs/use-medusa-error-not-generic-error
  throw new Error(
    `[medusa-config] Invalid production configuration:\n  - ${configErrors.join("\n  - ")}`
  )
}

// DATABASE_SSL=true   -> TLS without certificate verification (self-signed / managed DBs)
// DATABASE_SSL=verify -> TLS with certificate verification
// unset/false         -> no TLS (e.g. Postgres in the same Docker network)
// The explicit `ssl: false` matters: without driver options Medusa enables TLS
// for every DATABASE_URL whose host isn't localhost/127.0.0.1 (e.g. "postgres"
// in Docker), and the connection then times out against a non-TLS Postgres.
const DATABASE_SSL = env("DATABASE_SSL")
const databaseDriverOptions =
  DATABASE_SSL === "true" || DATABASE_SSL === "verify"
    ? { connection: { ssl: { rejectUnauthorized: DATABASE_SSL === "verify" } } }
    : { connection: { ssl: false } }

// ---------------------------------------------------------------------------
// Infrastructure modules
// ---------------------------------------------------------------------------

// Redis-backed infrastructure modules - only when REDIS_URL is set, so a local
// non-Docker dev setup without Redis keeps working (in-memory defaults).
const redisModules = REDIS_URL
  ? [
      {
        resolve: "@medusajs/medusa/event-bus-redis",
        options: { redisUrl: REDIS_URL },
      },
      {
        resolve: "@medusajs/medusa/workflow-engine-redis",
        options: { redis: { redisUrl: REDIS_URL } },
      },
      {
        resolve: "@medusajs/medusa/locking",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/locking-redis",
              id: "locking-redis",
              is_default: true,
              options: { redisUrl: REDIS_URL },
            },
          ],
        },
      },
      {
        // Caching module (used by core flows once MEDUSA_FF_CACHING=true).
        resolve: "@medusajs/medusa/caching",
        options: {
          providers: [
            {
              resolve: "@medusajs/medusa/caching-redis",
              id: "caching-redis",
              is_default: true,
              options: { redisUrl: REDIS_URL },
            },
          ],
        },
      },
    ]
  : []

// File storage: S3-compatible bucket (AWS S3, Cloudflare R2, MinIO, ...) when
// S3_BUCKET is set, otherwise the local provider writing to <cwd>/static and
// serving it under ${MEDUSA_BACKEND_URL}/static (persist that dir as a volume!).
const S3_BUCKET = env("S3_BUCKET")
const fileProvider = S3_BUCKET
  ? {
      resolve: "@medusajs/medusa/file-s3",
      id: "s3",
      options: {
        file_url: env("S3_FILE_URL"),
        access_key_id: env("S3_ACCESS_KEY_ID"),
        secret_access_key: env("S3_SECRET_ACCESS_KEY"),
        region: env("S3_REGION") ?? "auto",
        bucket: S3_BUCKET,
        endpoint: env("S3_ENDPOINT"),
        prefix: env("S3_PREFIX"),
        ...(env("S3_FORCE_PATH_STYLE") === "true"
          ? { additional_client_config: { forcePathStyle: true } }
          : {}),
      },
    }
  : {
      resolve: "@medusajs/medusa/file-local",
      id: "local",
      options: {
        backend_url: `${MEDUSA_BACKEND_URL}/static`,
      },
    }

// Stripe is only registered when an API key is present (the provider throws
// without one); in production STRIPE_API_KEY + STRIPE_WEBHOOK_SECRET are required.
const paymentProviders = STRIPE_API_KEY
  ? [
      {
        resolve: "@medusajs/medusa/payment-stripe",
        id: "stripe",
        options: {
          apiKey: STRIPE_API_KEY,
          webhookSecret: STRIPE_WEBHOOK_SECRET,
          // Charge immediately (capture_method "automatic"). Authorize-only
          // would expire after ~7 days, too short for preorders.
          capture: true,
        },
      },
    ]
  : []

// Notifications: Resend handles "email" when RESEND_API_KEY is set (required in
// production). Without it (local dev, tests) emails are only logged by the
// local provider, so subscribers calling createNotifications don't fail.
// The local provider also serves the admin "feed" channel (Medusa default).
const notificationProviders = [
  ...(RESEND_API_KEY
    ? [
        {
          resolve: "./src/modules/resend",
          id: "resend",
          options: {
            channels: ["email"],
            api_key: RESEND_API_KEY,
            from: RESEND_FROM_EMAIL,
          },
        },
      ]
    : []),
  {
    resolve: "@medusajs/medusa/notification-local",
    id: "local",
    options: {
      name: "Local Notification Provider",
      channels: RESEND_API_KEY ? ["feed"] : ["feed", "email"],
    },
  },
]

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: DATABASE_URL,
    databaseDriverOptions,
    redisUrl: REDIS_URL,
    workerMode,
    http: {
      storeCors: STORE_CORS!,
      adminCors: ADMIN_CORS!,
      authCors: AUTH_CORS!,
      // Only pass secrets when set: an explicit undefined would override
      // Medusa's dev defaults (production is guarded by the checks above).
      ...(JWT_SECRET ? { jwtSecret: JWT_SECRET } : {}),
      ...(COOKIE_SECRET ? { cookieSecret: COOKIE_SECRET } : {}),
    },
    // Session cookie: Medusa sets `Secure` + `SameSite=Lax` when NODE_ENV=production.
    // Storefront (kiji-games.de) and API (api.kiji-games.de) are same-site,
    // so no cookieOptions override is needed.
  },
  admin: {
    // The admin is served by this backend under /app, so it talks to its own
    // origin ("/"). Not tied to MEDUSA_BACKEND_URL, which would otherwise be
    // baked into the admin bundle at build time.
    backendUrl: "/",
    // Workers never serve the admin.
    disable: env("DISABLE_MEDUSA_ADMIN") === "true" || workerMode === "worker",
    // Only used by `medusa develop` (Vite dev server + HMR inside Docker).
    vite: () => {
      return {
        server: {
          host: "0.0.0.0",
          allowedHosts: ["localhost", ".localhost", "127.0.0.1"],
          hmr: {
            port: 5173,
            clientPort: 5173,
          },
        },
      }
    },
  },
  modules: [
    ...redisModules,
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [fileProvider],
      },
    },
    {
      resolve: "./src/modules/preorder",
    },
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: paymentProviders,
      },
    },
    {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: notificationProviders,
      },
    },
  ],
})
