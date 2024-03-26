const dotenv = require("dotenv");

let ENV_FILE_NAME = "";
switch (process.env.NODE_ENV) {
  case "production":
    ENV_FILE_NAME = ".env.production";
    break;
  case "staging":
    ENV_FILE_NAME = ".env.staging";
    break;
  case "test":
    ENV_FILE_NAME = ".env.test";
    break;
  case "development":
  default:
    ENV_FILE_NAME = ".env";
    break;
}

try {
  dotenv.config({ path: process.cwd() + "/" + ENV_FILE_NAME });
} catch (e) {}

// CORS when consuming Medusa from admin
const ADMIN_CORS =
  process.env.ADMIN_CORS || "http://localhost:7000,http://localhost:7001";

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://localhost/medusa-starter-default";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const plugins = [
  `medusa-fulfillment-manual`,
  `medusa-payment-manual`,
  {
    resolve: `@medusajs/file-local`,
    options: {
      upload_dir: "uploads",
    },
  },
  {
    resolve: "@medusajs/admin",
    /** @type {import('@medusajs/admin').PluginOptions} */
    options: {
      autoRebuild: true,
      develop: {
        open: process.env.OPEN_BROWSER !== "false",
      },
    },
  },
];

const modules = {
  /*eventBus: {
    resolve: "@medusajs/event-bus-redis",
    options: {
      redisUrl: REDIS_URL
    }
  },
  cacheService: {
    resolve: "@medusajs/cache-redis",
    options: {
      redisUrl: REDIS_URL
    }
  },*/
  apiKey: {
    resolve: "@medusajs/api-key"
  },
  auth: {
    resolve: "@medusajs/auth"
  },
  cart: {
    resolve: "@medusajs/cart"
  },
  customer: {
    resolve: "@medusajs/customer"
  },
  currency: {
    resolve: "@medusajs/currency"
  },
  fulfillment: {
    resolve: "@medusajs/fulfillment"
  },
  inventoryService: {
    resolve: "@medusajs/inventory-next"
  },
  order: {
    resolve: "@medusajs/order"
  },
  payment: {
    resolve: "@medusajs/payment"
  },
  pricingService: {
    resolve: "@medusajs/pricing"
  },
  productService: {
    resolve: "@medusajs/product"
  },
  promotion: {
    resolve: "@medusajs/promotion"
  },
  region: {
    resolve: "@medusajs/region"
  },
  salesChannel: {
    resolve: "@medusajs/sales-channel"
  },
  stockLocationService: {
    resolve: "@medusajs/stock-location-next"
  },
  store: {
    resolve: "@medusajs/store"
  },
  tax: {
    resolve: "@medusajs/tax"
  },
  user: {
    resolve: "@medusajs/user",
    options: {
      jwt_secret: process.env.JWT_SECRET
    }
  },
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
  jwtSecret: process.env.JWT_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  store_cors: STORE_CORS,
  database_url: DATABASE_URL,
  admin_cors: ADMIN_CORS,
  // Uncomment the following lines to enable REDIS
  // redis_url: REDIS_URL
};

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig,
  plugins,
  modules,
  featureFlags: {
    medusa_v2: true
  }
};
