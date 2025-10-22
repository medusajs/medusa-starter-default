import { loadEnv, defineConfig } from "@medusajs/utils";

const DEFAULT_STORE_CORS = [
  "http://localhost:8000",
  "https://therguminet.hu",
  "https://www.therguminet.hu",
];

const DEFAULT_ADMIN_CORS = [
  "http://localhost:5173",
  "http://localhost:9000",
  "https://admin.teherguminet.hu",
];

const DEFAULT_AUTH_CORS = [
  ...DEFAULT_ADMIN_CORS,
  "https://therguminet.hu",
  "https://www.therguminet.hu",
  "http://localhost:8000",
];

const formatCors = (value: string | undefined, defaults: string[]) => {
  if (value?.trim()) {
    return value
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .join(",");
  }

  return Array.from(new Set(defaults)).join(",");
};

loadEnv(process.env.NODE_ENV || "development", process.cwd());

const sharedRedisUrl = process.env.REDIS_URL;

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: formatCors(process.env.STORE_CORS, DEFAULT_STORE_CORS),
      adminCors: formatCors(process.env.ADMIN_CORS, DEFAULT_ADMIN_CORS),
      authCors: formatCors(process.env.AUTH_CORS, DEFAULT_AUTH_CORS),
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
    databaseDriverOptions: {
      ssl: false,
      sslmode: "disable",
    },
  },
  modules: {
    order: {},
    b2b: {
      resolve: "./src/modules/b2b",
    },
    eventBus: {
      resolve: "@medusajs/event-bus-redis",
      options: {
        redisUrl: process.env.EVENT_BUS_REDIS_URL || sharedRedisUrl,
      },
    },
  },
  // @ts-expect-error Auth configuration isn't typed in the current Medusa release
  auth: {
    customer: {
      strategies: {
        emailpass: {
          enabled: true,
        },
      },
    },
  },
});
