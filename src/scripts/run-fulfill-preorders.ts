import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import fulfillPreordersJob from "../jobs/fulfill-preorders"

// Manual trigger: yarn medusa exec ./src/scripts/run-fulfill-preorders.ts
export default async function runFulfillPreorders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const result = await fulfillPreordersJob(container)

  logger.info(`run-fulfill-preorders result: ${JSON.stringify(result)}`)
}
