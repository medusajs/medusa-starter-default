import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  
  modules: [
	// {
	  // resolve: "@medusajs/medusa/event-bus-redis",
		  // options: { 
			// redisUrl: process.env.REDIS_URL,
		// },
	// },
    // {
      // resolve: "./src/modules/marketplace",
    // },
    // {
      // resolve: "./modules/sanity",
      // options: {
        // api_token: process.env.SANITY_API_TOKEN,
        // project_id: process.env.SANITY_PROJECT_ID,
        // api_version: new Date().toISOString().split("T")[0],
		// useCdn: false, // `false` if you want to ensure fresh data
        // dataset: "production",
        // studio_url: process.env.SANITY_STUDIO_URL || 
          // "http://localhost:8000/studio",
        // type_map: {
          // product: "product",
        // },
      // },
    // },
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
          // {
            // resolve: "medusa-payment-paystack",
            // options: {
              // secret_key: process.env.PAYSTACK_SECRET_KEY,
            // } satisfies import("medusa-payment-paystack").PluginOptions,
          // },
       ],
      },
    },

  ],
})
