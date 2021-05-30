// CORS to avoid issues when consuming Medusa from a client
const STORE_CORS = "http://localhost:8000";

// Database URL (here we use a local database called medusa-development)
const DATABASE_URL = "postgres://localhost/medusa-development";

// Medusa uses Redis, so this needs configuration as well
const REDIS_URL = "redis://localhost:6379";

const STRIPE_API_KEY = process.env.STRIPE_API_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";

// This is the place to include plugins. See API documentation for a thorough guide on plugins.
const plugins = [
  `medusa-fulfillment-manual`,
  {
    resolve: `medusa-plugin-sendgrid`,
    options: {
      from: "Medusa <medusa@medusa-commerce.com>",
      api_key: SENDGRID_API_KEY,
    },
  },
  {
    resolve: `medusa-payment-stripe`,
    options: {
      api_key: STRIPE_API_KEY,
      webhook_secret: STRIPE_WEBHOOK_SECRET,
    },
  },
];

module.exports = {
  projectConfig: {
    redis_url: REDIS_URL,
    database_url: DATABASE_URL,
    database_type: "postgres",
    store_cors: STORE_CORS,
  },
  plugins,
};
