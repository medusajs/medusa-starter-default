import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows"

const PAGE_SIZE = 500

type BackfillCustomer = {
  id: string
  metadata?: Record<string, unknown> | null
}

// One-shot script: marks every existing account customer
// (has_account = true) as email-verified so the verify-gate doesn't lock
// them out of checkout. Idempotent — already-verified customers are skipped.
//
// Pages through customers ordered by id; updating metadata doesn't change
// the has_account filter, so offsets stay stable. Only the flag is sent —
// the customer module merges it into existing metadata.
//
// Run with:
//   npx medusa exec ./src/scripts/backfill-email-verified.ts
export default async function backfillEmailVerified({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  let skip = 0
  let total = 0
  let updated = 0
  let skipped = 0

  while (true) {
    const { data } = await query.graph({
      entity: "customer",
      fields: ["id", "metadata"],
      filters: { has_account: true },
      pagination: { skip, take: PAGE_SIZE, order: { id: "ASC" } },
    })
    const customers = data as BackfillCustomer[]
    if (!customers.length) break

    total += customers.length
    const toUpdate = customers
      .filter((c) => c.metadata?.email_verified !== true)
      .map((c) => c.id)
    skipped += customers.length - toUpdate.length

    // One update per customer: with a multi-id selector the customer module
    // merges metadata into a single shared object, which would copy metadata
    // between customers.
    for (const id of toUpdate) {
      await updateCustomersWorkflow(container).run({
        input: {
          selector: { id },
          update: { metadata: { email_verified: true } },
        },
      })
      updated++
    }

    if (customers.length < PAGE_SIZE) break
    skip += PAGE_SIZE
  }

  if (!total) {
    logger.info("[backfill-email-verified] no account customers found — nothing to do")
    return
  }

  logger.info(
    `[backfill-email-verified] updated=${updated} skipped=${skipped} total=${total}`,
  )
}
