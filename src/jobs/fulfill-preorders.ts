import { randomUUID } from "node:crypto"
import { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { fulfillPreorderWorkflow } from "../workflows/fulfill-preorder"
import { PreorderStatus } from "../modules/preorder/models/preorder"
import { PreorderVariantStatus } from "../modules/preorder/models/preorder-variant"

const LOCK_KEY = "job:fulfill-preorders"
// Upper bound for a run; the lock is released explicitly when the run ends
const LOCK_TTL_SECONDS = 60 * 60
const PAGE_SIZE = 500

// Last millisecond of the current day in UTC
export function endOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23, 59, 59, 999
  ))
}

// Workflow errors may arrive as plain (serialized) objects
function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    return String(error.message)
  }
  return String(error)
}

export type FulfillPreordersJobResult = {
  skipped_run: boolean
  processed: number
  failed: number
  actions: Record<string, number>
}

/**
 * Fulfills pending preorders of enabled preorder variants whose available
 * date is on or before the current UTC day. Also invoked by
 * src/scripts/run-fulfill-preorders.ts.
 */
export default async function fulfillPreordersJob(
  container: MedusaContainer
): Promise<FulfillPreordersJobResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const locking = container.resolve(Modules.LOCKING)

  const result: FulfillPreordersJobResult = {
    skipped_run: false,
    processed: 0,
    failed: 0,
    actions: {},
  }

  // Prevents overlapping runs (cron + manual script). Across processes this
  // only works with a shared locking provider (redis/postgres).
  const ownerId = `fulfill-preorders:${randomUUID()}`
  try {
    await locking.acquire(LOCK_KEY, { ownerId, expire: LOCK_TTL_SECONDS })
  } catch (err) {
    // Both locking providers signal "already held" with this message; anything
    // else (e.g. Redis unreachable) is a real error and must not look like a skip.
    if (!(err instanceof Error && err.message.startsWith("Failed to acquire lock"))) {
      throw err
    }
    logger.warn("Fulfill preorders job is already running, skipping this run")
    result.skipped_run = true
    return result
  }

  try {
    const cutoff = endOfUtcDay()
    logger.info(`Starting fulfill preorders job (cut-off ${cutoff.toISOString()})...`)

    // Collect ids first: processing changes preorder status, which would
    // shift offset-based pages of a "pending" filter.
    const preorderIds: string[] = []
    let offset = 0
    let pageLength = 0

    do {
      const { data: preorders } = await query.graph({
        entity: "preorder",
        fields: ["id"],
        filters: {
          status: PreorderStatus.PENDING,
          item: {
            status: PreorderVariantStatus.ENABLED,
            // No lower bound: also pick up missed runs (downtime, crash, ...)
            available_date: { $lte: cutoff },
          },
        },
        pagination: {
          skip: offset,
          take: PAGE_SIZE,
          order: { created_at: "ASC" },
        },
      })

      preorderIds.push(...preorders.map((p) => p.id))
      pageLength = preorders.length
      offset += PAGE_SIZE
    } while (pageLength === PAGE_SIZE)

    // One failing preorder must not stop the others
    for (const preorderId of preorderIds) {
      try {
        const { result: workflowResult } = await fulfillPreorderWorkflow(container).run({
          input: { preorder_id: preorderId },
        })

        result.processed += 1
        result.actions[workflowResult.action] = (result.actions[workflowResult.action] ?? 0) + 1
      } catch (error) {
        result.failed += 1
        logger.error(`Failed to fulfill preorder ${preorderId}: ${errorMessage(error)}`)
      }
    }

    logger.info(
      `Fulfill preorders job done: ${result.processed} processed ${JSON.stringify(result.actions)}, ${result.failed} failed`
    )

    return result
  } finally {
    await locking.release(LOCK_KEY, { ownerId })
  }
}

export const config = {
  name: "daily-fulfill-preorders",
  // Runs at 00:00 server time; the cut-off is always computed in UTC
  schedule: "0 0 * * *",
}
