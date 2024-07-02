# Custom scheduled jobs

A scheduled job is a function executed at a specified interval of time in the background of your Medusa application.

A scheduled job is created in a TypeScript or JavaScript file under the `src/jobs` directory.

For example, create the file `src/jobs/hello-world.ts` with the following content:

```ts
import {
  ProductService,
  ScheduledJobArgs,
  ScheduledJobConfig,
} from "@medusajs/medusa";

export default async function myCustomJob({ container }: ScheduledJobArgs) {
  const productService: ProductService = container.resolve("productService");

  const products = await productService.listAndCount();

  // Do something with the products
}

export const config: ScheduledJobConfig = {
  name: "daily-product-report",
  schedule: "0 0 * * *", // Every day at midnight
};
```

A scheduled job file must export:

- The function to be executed whenever it’s time to run the scheduled job.
- A configuration object defining the job. It has two properties:
  - `name`: a unique name for the job.
  - `schedule`: a [cron expression](https://crontab.guru/).
  - `numberOfExecutions`: an optional integer, specifying how many times the job will execute before being removed

The `handler` is a function which takes one parameter, `container`, a `MedusaContainer` instance which can be used to resolve services.
