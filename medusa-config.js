const dotenv = require("dotenv");
const transformer = require("medusa-plugin-meilisearch/dist/utils/transformer");

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
  process.env.ADMIN_CORS || "http://localhost:9000,http://localhost:9001";

// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = process.env.STORE_CORS || "http://localhost:8000";

const DATABASE_URL =
  process.env.DATABASE_URL || "postgres://localhost/medusa-store";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const plugins = [
  `medusa-fulfillment-manual`,
  `medusa-payment-manual`,
  {
    resolve: "@medusajs/admin",
    /** @type {import('@medusajs/admin').PluginOptions} */
    options: {
      autoRebuild: true
    },
  },
  {
    resolve: `@medusajs/file-local`,
    options: {
      upload_dir: "uploads",
    },
  },
  {
    resolve: `medusa-plugin-sendgrid`,
    options: {
      api_key: process.env.SENDGRID_API_KEY,
      from: process.env.SENDGRID_FROM,
      order_placed_template: process.env.SENDGRID_ORDER_PLACED_ID,
      order_canceled_template: process.env.SENDGRID_ORDER_CANCELED_ID,
      order_shipped_template: process.env.SENDGRID_ORDER_SHIPPED_ID,
      order_return_requested_template: process.env.SENDGRID_ORDER_RETURN_REQUESTED_ID,
      order_items_returned_template: process.env.SENDGRID_ORDER_ITEMS_RETURNED_ID,
      claim_shipment_created_template: process.env.SENDGRID_CLAIM_SHIPMENT_CREATED_ID,
      swap_created_template: process.env.SENDGRID_SWAP_CREATED_ID,
      swap_shipment_created_template: process.env.SENDGRID_SWAP_SHIPMENT_CREATED_ID,
      swap_received_template: process.env.SENDGRID_SWAP_RECEIVED_ID,
      gift_card_created_template: process.env.SENDGRID_GIFT_CARD_CREATED_ID,
      customer_password_reset_template: process.env.SENDGRID_CUSTOMER_PASSWORD_RESET_ID,
      user_password_reset_template: process.env.SENDGRID_USER_PASSWORD_RESET_ID,
      medusa_restock_template: process.env.SENDGRID_MEDUSA_RESTOCK_ID
    }
  },
  {
    resolve: `medusa-file-spaces`,
    options: {
        spaces_url: process.env.SPACE_URL,
        bucket: process.env.SPACE_BUCKET,
        endpoint: process.env.SPACE_ENDPOINT,
        access_key_id: process.env.SPACE_ACCESS_KEY_ID,
        secret_access_key: process.env.SPACE_SECRET_ACCESS_KEY,
    },
  },
  {
    resolve: `medusa-plugin-meilisearch`,
    options: {
      config: {
        host: process.env.MEILISEARCH_HOST,
        apiKey: process.env.MEILISEARCH_API_KEY,
      },
      settings: {
        products: {
          indexSettings: {
            searchableAttributes: process.env.MEILI_PRODUCTS_SEARCHABLE_ATTRIBUTES.split(' ') ?? [],
            displayedAttributes: process.env.MEILI_PRODUCTS_DISPLAYED_ATTRIBUTES.split(' ') ?? [],
            filterableAttributes: process.env.MEILI_PRODUCTS_FILTERABLE_ATTRIBUTES.split(' ') ?? [],
            sortableAttributes: process.env.MEILI_PRODUCTS_SORTABLE_ATTRIBUTES.split(' ') ?? [],
          },
        },
        stock_locations: {
          indexSettings: {
            searchableAttributes: process.env.MEILI_STOCK_LOCATIONS_SEARCHABLE_ATTRIBUTES.split(' ') ?? [],
            displayedAttributes: process.env.MEILI_STOCK_LOCATIONS_DISPLAYED_ATTRIBUTES.split(' ') ?? [],
            filterableAttributes: process.env.MEILI_STOCK_LOCATIONS_FILTERABLE_ATTRIBUTES.split(' ') ?? [],
            sortableAttributes: process.env.MEILI_STOCK_LOCATIONS_SORTABLE_ATTRIBUTES.split(' ') ?? [],
          },
          transformer: (location) => {
            console.log(location);
            return location;
          }
        },
      },
    },
  },
  {
    resolve: `medusa-payment-stripe`,
    options: {
      api_key: process.env.STRIPE_API_KEY,
      webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
    },
  },
  // To enable the admin plugin, uncomment the following lines and run `yarn add @medusajs/admin`
  // {
  //   resolve: "@medusajs/admin",
  //   /** @type {import('@medusajs/admin').PluginOptions} */
  //   options: {
  //     autoRebuild: true,
  //   },
  // },
];

const modules = {
  eventBus: {
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
  },
  inventoryService: {
    resolve: "@medusajs/inventory",
  },
  stockLocationService: {
    resolve: "@medusajs/stock-location",
  },
};

/** @type {import('@medusajs/medusa').ConfigModule["projectConfig"]} */
const projectConfig = {
  jwtSecret: process.env.JWT_SECRET,
  cookieSecret: process.env.COOKIE_SECRET,
  store_cors: STORE_CORS,
  database_url: DATABASE_URL,
  admin_cors: ADMIN_CORS,
  redis_url: REDIS_URL
};

/** @type {import('@medusajs/medusa').ConfigModule} */
module.exports = {
  projectConfig,
  plugins,
  modules,
};
