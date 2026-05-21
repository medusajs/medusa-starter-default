import { ExecArgs } from "@medusajs/framework/types"
import customerCreatedHandler from "../subscribers/customer-created"

export default async function ({ container, args }: ExecArgs) {
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  const email = args?.[0] || "fabian.reichwald1@googlemail.com"

  const { data: [customer] } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "has_account"],
    filters: { email },
  })

  if (!customer) {
    logger.error(`No customer with email ${email}`)
    return
  }

  logger.info(
    `Triggering welcome subscriber for ${customer.id} (${customer.email}, has_account=${customer.has_account})`
  )

  await customerCreatedHandler({
    event: {
      name: "customer.created",
      data: { id: customer.id },
    },
    container,
  } as any)

  logger.info("Done")
}
