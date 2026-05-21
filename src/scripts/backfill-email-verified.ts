import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

// One-shot script: marks every existing account customer
// (has_account = true) as email-verified so the new verify-gate
// doesn't lock them out of checkout. Idempotent — running it again
// re-applies the same flag and has no other side effects.
//
// Run with:
//   npx medusa exec ./src/scripts/backfill-email-verified.ts
export default async function ({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email", "has_account", "metadata"],
    filters: { has_account: true },
    pagination: { take: 10_000 },
  })

  if (!customers.length) {
    logger.info("[backfill-email-verified] no account customers found — nothing to do")
    return
  }

  let updated = 0
  let skipped = 0
  for (const customer of customers as Array<{
    id: string
    metadata?: Record<string, unknown> | null
  }>) {
    if (customer.metadata?.email_verified === true) {
      skipped++
      continue
    }
    const existing = customer.metadata ?? {}
    await updateCustomersWorkflow(container).run({
      input: {
        selector: { id: customer.id },
        update: {
          metadata: { ...existing, email_verified: true },
        },
      },
    })
    updated++
  }

  logger.info(
    `[backfill-email-verified] updated=${updated} skipped=${skipped} total=${customers.length}`,
  )
}
