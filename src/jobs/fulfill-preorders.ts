import {
  InferTypeOf,
  MedusaContainer,
} from "@medusajs/framework/types"
import { fulfillPreorderWorkflow } from "../workflows/fulfill-preorder"
import { PreorderVariant } from "../modules/preorder/models/preorder-variant"

export default async function fulfillPreordersJob(container: MedusaContainer) {
  const query = container.resolve("query")
  const logger = container.resolve("logger")

  logger.info("Starting daily fulfill preorders job...")

  const endToday = new Date()
  endToday.setHours(23, 59, 59, 999)

  const limit = 1000
  let preorderVariantsOffset = 0
  let preorderVariantsCount = 0
  let totalPreordersCount = 0

  do {
    const {
      data: preorderVariants,
    } = await query.graph({
      entity: "preorder_variant",
      fields: [
        "*",
        "product_variant.*",
      ],
      filters: {
        status: "enabled",
        // No lower bound: also pick up missed preorders (server downtime, crash, etc.)
        // Inner loop only matches preorders with status=pending — no double-fulfillment risk.
        available_date: {
          $lte: endToday,
        },
      },
      pagination: {
        skip: preorderVariantsOffset,
        take: limit,
      },
    })

    preorderVariantsCount = preorderVariants.length

    for (const preorderVariant of preorderVariants) {
      const { data: preorders } = await query.graph({
        entity: "preorder",
        fields: ["*"],
        filters: {
          item_id: preorderVariant.id,
          status: "pending",
        },
      })

      for (const preorder of preorders) {
        try {
          await fulfillPreorderWorkflow(container)
            .run({
              input: {
                preorder_id: preorder.id,
                item: preorderVariant as unknown as InferTypeOf<typeof PreorderVariant>,
                order_id: preorder.order_id,
              },
            })

          totalPreordersCount += 1
        } catch (error) {
          logger.error(
            `Failed to fulfill preorder ${preorder.id}: ${error}`
          )
        }
      }
    }

    preorderVariantsOffset += limit
  } while (preorderVariantsCount === limit)

  logger.info(
    `Fulfilled ${totalPreordersCount} preorders`
  )
}

export const config = {
  name: "daily-fulfill-preorders",
  schedule: "0 0 * * *",
}
