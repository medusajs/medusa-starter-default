const dotenv = require("dotenv");
const { Modules } = require("@medusajs/modules-sdk");

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
// Medusa's docs are added for a better learning experience. Feel free to remove.
const ADMIN_CORS =
  `${process.env.ADMIN_CORS?.length ? `${process.env.ADMIN_CORS},` : "http://localhost:7000,http://localhost:7001,"}https://docs.medusajs.com`;

// CORS to avoid issues when consuming Medusa from a client
// Medusa's docs are added for a better learning experience. Feel free to remove.
const STORE_CORS = `${process.env.STORE_CORS?.length ? `${process.env.STORE_CORS},` : "http://localhost:8000,"}https://docs.medusajs.com`

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://localhost/medusa-starter-default";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const plugins = [];

const modules = {
  [Modules.CACHE]: true,
  [Modules.EVENT_BUS]: true,
  [Modules.AUTH]: {
    resolve: "@medusajs/auth",
    options: {
      providers: [
        {
          name: "emailpass",
          scopes: {
            admin: {},
            store: {},
          },
        },
      ],
    },
  },
  [Modules.USER]: {
    resolve: "@medusajs/user",
    options: {
      jwt_secret: process.env.JWT_SECRET ?? "supersecret",
    },
  },
  [Modules.FILE]: {
    resolve: "@medusajs/file",
    options: {
      providers: [
        {
          resolve: "@medusajs/file-local-next",
          options: {
            config: {
              local: {},
            },
          },
        },
      ],
    },
  },
  [Modules.WORKFLOW_ENGINE]: true,
  [Modules.STOCK_LOCATION]: true,
  [Modules.INVENTORY]: true,
  [Modules.PRODUCT]: true,
  [Modules.PRICING]: true,
  [Modules.PROMOTION]: true,
  [Modules.CUSTOMER]: true,
  [Modules.SALES_CHANNEL]: true,
  [Modules.CART]: true,
  [Modules.REGION]: true,
  [Modules.API_KEY]: true,
  [Modules.STORE]: true,
  [Modules.TAX]: true,
  [Modules.CURRENCY]: true,
  [Modules.PAYMENT]: true,
  [Modules.FULFILLMENT]: {
    resolve: "@medusajs/fulfillment",
    options: {
      providers: [
        {
          resolve: "@medusajs/fulfillment-manual",
          options: {
            config: {
              manual: {},
            },
          },
        },
      ],
    },
  },
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
  jwt_secret: process.env.JWT_SECRET || "supersecret",
  cookie_secret: process.env.COOKIE_SECRET || "supersecret",
  store_cors: STORE_CORS,
  database_url: DATABASE_URL,
  admin_cors: ADMIN_CORS,
  auth_cors: process.env.AUTH_CORS || ADMIN_CORS
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
