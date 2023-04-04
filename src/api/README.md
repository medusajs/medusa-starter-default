# Custom endpoints

You may define custom endpoints by putting files in the `/api` directory that export functions returning an express router or a collection of express routers.

```ts
import { Router } from "express"
import { getConfigFile } from "medusa-core-utils"
import { getStoreRouter } from "./routes/store"
import { ConfigModule } from "@medusajs/medusa/dist/types/global";

export default (rootDirectory) => {
  const { configModule: { projectConfig } } = getConfigFile(
    rootDirectory,
    "medusa-config"
  ) as { configModule: ConfigModule }

  const storeCorsOptions = {
    origin: projectConfig.store_cors.split(","),
    credentials: true,
  }

  const storeRouter = getStoreRouter(storeCorsOptions)

  return [storeRouter]
}
```

A global container is available on `req.scope` to allow you to use any of the registered services from the core, installed plugins or your local project:
```js
import { Router } from "express"

export default () => {
  const router = Router()

  router.get("/hello-product", async (req, res) => {
    const productService = req.scope.resolve("productService")

    const [product] = await productService.list({}, { take: 1 })

    res.json({
      message: `Welcome to ${product.title}!`
    })
  })

  return router;
}
```
