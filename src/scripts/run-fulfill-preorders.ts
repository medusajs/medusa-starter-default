import { ExecArgs } from "@medusajs/framework/types"
import fulfillPreordersJob from "../jobs/fulfill-preorders"

export default async function ({ container }: ExecArgs) {
  await fulfillPreordersJob(container)
}
