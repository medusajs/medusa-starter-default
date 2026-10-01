import { medusaIntegrationTestRunner, TestEventUtils } from "@medusajs/test-utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"

import fulfillPreordersJob from "../../src/jobs/fulfill-preorders"
import { PREORDER_MODULE } from "../../src/modules/preorder"
import { PreorderStatus } from "../../src/modules/preorder/models/preorder"
import { fulfillPreorderWorkflow } from "../../src/workflows/fulfill-preorder"
import { signOrderToken } from "../../src/utils/order-token"
import { createAdminUser, noThrow, type Headers } from "./helpers/auth"
import { completePreorderCart, createReadyCart, type CartItem } from "./helpers/checkout"
import { seedStore, type SeededStore } from "./helpers/seed"

jest.setTimeout(120 * 1000)

const DAY = 24 * 60 * 60 * 1000
const inDays = (days: number) => new Date(Date.now() + days * DAY).toISOString()

const PREORDER_FIELDS = ["id", "available_date", "status"]

type StorePreorder = {
  id: string
  order_id: string
  item_id: string
  status: string
  item: { id: string; variant_id: string }
}

async function listPreorders(container: MedusaContainer, orderId: string) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "preorder",
    fields: ["id", "item_id", "status", "order_id"],
    filters: { order_id: orderId },
  })
  return data
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let seed: SeededStore
    let store: Headers
    let admin: Headers

    beforeAll(async () => {
      seed = await seedStore(getContainer())
      store = { "x-publishable-api-key": seed.publishableKey }
      admin = await createAdminUser(api, getContainer())
    })

    const configurePreorder = async (variantId: string, availableDate: string) => {
      const res = await api.post(
        `/admin/variants/${variantId}/preorders`,
        { available_date: availableDate },
        { headers: admin }
      )
      return res.data.preorder_variant as { id: string; variant_id: string; status: string }
    }

    const guestOrder = async (items: CartItem[]) => {
      const cartId = await createReadyCart(api, seed, store, { email: "preorder@kiji.test", items })
      const order = await completePreorderCart(api, getContainer(), cartId, store)
      return { cartId, order, headers: { ...store, "x-kiji-order-token": signOrderToken(order.id) } }
    }

    describe("admin /admin/variants/:id/preorders", () => {
      it("requires an admin", async () => {
        const res = await api.post(
          `/admin/variants/${seed.variants.preorder}/preorders`,
          { available_date: inDays(30) },
          noThrow
        )
        expect(res.status).toEqual(401)
      })

      it("creates, updates, disables and re-enables the config", async () => {
        const created = await configurePreorder(seed.variants.preorder, inDays(30))
        expect(created).toEqual(
          expect.objectContaining({ variant_id: seed.variants.preorder, status: "enabled" })
        )

        const newDate = inDays(60)
        const updated = await configurePreorder(seed.variants.preorder, newDate)
        expect(updated.id).toEqual(created.id)
        expect(new Date((updated as unknown as { available_date: string }).available_date).toISOString())
          .toEqual(newDate)

        const disabled = await api.delete(`/admin/variants/${seed.variants.preorder}/preorders`, {
          headers: admin,
        })
        expect(disabled.data.preorder_variant).toEqual(
          expect.objectContaining({ id: created.id, status: "disabled" })
        )

        const reenabled = await configurePreorder(seed.variants.preorder, inDays(10))
        expect(reenabled).toEqual(expect.objectContaining({ id: created.id, status: "enabled" }))
      })

      it("returns 404 when disabling a variant without config", async () => {
        const res = await api.delete(`/admin/variants/${seed.variants.normal}/preorders`, {
          headers: admin,
          ...noThrow,
        })
        expect(res.status).toEqual(404)
      })

      it("validates the date and the variant", async () => {
        const badDate = await api.post(
          `/admin/variants/${seed.variants.preorder}/preorders`,
          { available_date: "next tuesday" },
          { headers: admin, ...noThrow }
        )
        expect(badDate.status).toEqual(400)

        const unknownVariant = await api.post(
          "/admin/variants/variant_does_not_exist/preorders",
          { available_date: inDays(30) },
          { headers: admin, ...noThrow }
        )
        expect(unknownVariant.status).toEqual(404)
      })
    })

    describe("POST /store/carts/:id/complete-preorder", () => {
      it("creates exactly one preorder for the preorder variant and none for normal items", async () => {
        const preorderVariant = await configurePreorder(seed.variants.preorder, inDays(30))

        const { order, headers } = await guestOrder([
          { variant_id: seed.variants.preorder, quantity: 2 },
          { variant_id: seed.variants.normal },
        ])

        const res = await api.get(`/store/orders/${order.id}/preorders`, { headers })
        expect(res.data.preorders).toHaveLength(1)
        const [preorder] = res.data.preorders as StorePreorder[]
        expect(preorder).toEqual(
          expect.objectContaining({
            order_id: order.id,
            item_id: preorderVariant.id,
            status: "pending",
            item: expect.objectContaining({
              id: preorderVariant.id,
              variant_id: seed.variants.preorder,
            }),
          })
        )

        const adminRes = await api.get(`/admin/orders/${order.id}/preorders`, { headers: admin })
        expect(adminRes.data.preorders).toEqual([
          expect.objectContaining({
            item_id: preorderVariant.id,
            item: expect.objectContaining({
              product_variant: expect.objectContaining({ id: seed.variants.preorder }),
            }),
          }),
        ])
      })

      it("is idempotent when called again for the same cart", async () => {
        await configurePreorder(seed.variants.preorder, inDays(30))
        const { cartId, order } = await guestOrder([{ variant_id: seed.variants.preorder }])

        const again = await api.post(`/store/carts/${cartId}/complete-preorder`, {}, { headers: store })

        expect(again.data.type).toEqual("order")
        expect(again.data.order.id).toEqual(order.id)
        expect(await listPreorders(getContainer(), order.id)).toHaveLength(1)
      })

      it("creates one preorder per preorder variant", async () => {
        const a = await configurePreorder(seed.variants.preorder, inDays(30))
        const b = await configurePreorder(seed.variants.extra, inDays(40))

        const { order } = await guestOrder([
          { variant_id: seed.variants.preorder },
          { variant_id: seed.variants.extra },
          { variant_id: seed.variants.normal },
        ])

        const preorders = await listPreorders(getContainer(), order.id)
        expect(preorders.map((p) => p.item_id).sort()).toEqual([a.id, b.id].sort())
      })

      it("creates no preorder when the available date has passed", async () => {
        await configurePreorder(seed.variants.preorder, inDays(-1))

        const { order } = await guestOrder([{ variant_id: seed.variants.preorder }])

        expect(await listPreorders(getContainer(), order.id)).toEqual([])
      })

      it("creates no preorder when the config is disabled", async () => {
        await configurePreorder(seed.variants.preorder, inDays(30))
        await api.delete(`/admin/variants/${seed.variants.preorder}/preorders`, { headers: admin })

        const { order } = await guestOrder([{ variant_id: seed.variants.preorder }])

        expect(await listPreorders(getContainer(), order.id)).toEqual([])
      })
    })

    describe("preorder fields on store routes (allowFields)", () => {
      const variantFields = PREORDER_FIELDS.map((f) => `+variants.preorder_variant.${f}`).join(",")
      const itemFields = PREORDER_FIELDS.map((f) => `+items.variant.preorder_variant.${f}`).join(",")

      it("exposes variants.preorder_variant on /store/products and /store/products/:id", async () => {
        const preorderVariant = await configurePreorder(seed.variants.preorder, inDays(30))

        const list = await api.get(`/store/products?fields=${variantFields}`, { headers: store })
        const product = list.data.products.find((p: { id: string }) => p.id === seed.productId)
        const byId = (id: string) =>
          product.variants.find((v: { id: string }) => v.id === id)

        expect(byId(seed.variants.preorder).preorder_variant).toEqual({
          id: preorderVariant.id,
          status: "enabled",
          available_date: expect.any(String),
        })
        expect(byId(seed.variants.normal).preorder_variant ?? null).toBeNull()

        const single = await api.get(`/store/products/${seed.productId}?fields=${variantFields}`, {
          headers: store,
        })
        const variant = single.data.product.variants.find(
          (v: { id: string }) => v.id === seed.variants.preorder
        )
        expect(variant.preorder_variant.id).toEqual(preorderVariant.id)
      })

      it("exposes items.variant.preorder_variant on carts and orders", async () => {
        const preorderVariant = await configurePreorder(seed.variants.preorder, inDays(30))
        const cartId = await createReadyCart(api, seed, store, {
          email: "fields@kiji.test",
          items: [{ variant_id: seed.variants.preorder }],
        })

        const cart = await api.get(`/store/carts/${cartId}?fields=${itemFields}`, { headers: store })
        expect(cart.data.cart.items[0].variant.preorder_variant).toEqual(
          expect.objectContaining({ id: preorderVariant.id, status: "enabled" })
        )

        const order = await completePreorderCart(api, getContainer(), cartId, store)
        const orderRes = await api.get(`/store/orders/${order.id}?fields=${itemFields}`, {
          headers: { ...store, "x-kiji-order-token": signOrderToken(order.id) },
        })
        expect(orderRes.data.order.items[0].variant.preorder_variant).toEqual(
          expect.objectContaining({ id: preorderVariant.id, status: "enabled" })
        )
      })
    })

    describe("fulfillment job / workflows", () => {
      const preorderFulfilledSubscribersDone = () =>
        TestEventUtils.waitSubscribersExecution(
          "preorder.fulfilled",
          getContainer().resolve(Modules.EVENT_BUS)
        )

      it("fulfills due preorders once and leaves future ones alone", async () => {
        const container = getContainer()
        await configurePreorder(seed.variants.preorder, inDays(30))
        const { order } = await guestOrder([
          { variant_id: seed.variants.preorder, quantity: 2 },
          { variant_id: seed.variants.normal },
        ])

        const early = await fulfillPreordersJob(container)
        expect(early).toEqual({ skipped_run: false, processed: 0, failed: 0, actions: {} })

        // Release date reached
        await configurePreorder(seed.variants.preorder, inDays(-1))

        const mailSent = preorderFulfilledSubscribersDone()
        const run = await fulfillPreordersJob(container)
        await mailSent
        expect(run).toEqual({
          skipped_run: false,
          processed: 1,
          failed: 0,
          actions: { fulfill: 1 },
        })

        const [preorder] = await listPreorders(container, order.id)
        expect(preorder.status).toEqual("fulfilled")

        const query = container.resolve(ContainerRegistrationKeys.QUERY)
        const {
          data: [fulfilledOrder],
        } = await query.graph({
          entity: "order",
          fields: ["id", "fulfillments.id", "items.variant_id", "items.detail.fulfilled_quantity"],
          filters: { id: order.id },
        })
        expect(fulfilledOrder.fulfillments).toHaveLength(1)
        const fulfilledQty = Object.fromEntries(
          fulfilledOrder.items!.map((i) => [i!.variant_id, Number(i!.detail?.fulfilled_quantity)])
        )
        expect(fulfilledQty).toEqual({
          [seed.variants.preorder]: 2,
          [seed.variants.normal]: 0,
        })

        // Second run is a no-op
        const second = await fulfillPreordersJob(container)
        expect(second).toEqual({ skipped_run: false, processed: 0, failed: 0, actions: {} })

        // Re-running the workflow for an already fulfilled preorder skips it
        const { result } = await fulfillPreorderWorkflow(container).run({
          input: { preorder_id: preorder.id },
        })
        expect(result.action).toEqual("skip")
        const {
          data: [afterRerun],
        } = await query.graph({
          entity: "order",
          fields: ["id", "fulfillments.id"],
          filters: { id: order.id },
        })
        expect(afterRerun.fulfillments).toHaveLength(1)
      })

      it("does not fulfill preorders of a disabled config", async () => {
        await configurePreorder(seed.variants.preorder, inDays(30))
        const { order } = await guestOrder([{ variant_id: seed.variants.preorder }])
        await configurePreorder(seed.variants.preorder, inDays(-1))
        await api.delete(`/admin/variants/${seed.variants.preorder}/preorders`, { headers: admin })

        const run = await fulfillPreordersJob(getContainer())

        expect(run.processed).toEqual(0)
        const [preorder] = await listPreorders(getContainer(), order.id)
        expect(preorder.status).toEqual("pending")
      })

      it("cancels pending preorders when the order is canceled", async () => {
        const container = getContainer()
        await configurePreorder(seed.variants.preorder, inDays(30))
        const { order } = await guestOrder([{ variant_id: seed.variants.preorder }])

        const subscribersDone = TestEventUtils.waitSubscribersExecution(
          "order.canceled",
          container.resolve(Modules.EVENT_BUS)
        )
        await cancelOrderWorkflow(container).run({ input: { order_id: order.id } })
        await subscribersDone

        const [preorder] = await listPreorders(container, order.id)
        expect(preorder.status).toEqual("cancelled")

        // Even if the release date passes, nothing is fulfilled
        await configurePreorder(seed.variants.preorder, inDays(-1))
        const run = await fulfillPreordersJob(container)
        expect(run.processed).toEqual(0)
      })

      it("cancels instead of fulfilling when a pending preorder belongs to a canceled order", async () => {
        const container = getContainer()
        await configurePreorder(seed.variants.preorder, inDays(30))
        const { order } = await guestOrder([{ variant_id: seed.variants.preorder }])

        const subscribersDone = TestEventUtils.waitSubscribersExecution(
          "order.canceled",
          container.resolve(Modules.EVENT_BUS)
        )
        await cancelOrderWorkflow(container).run({ input: { order_id: order.id } })
        await subscribersDone

        // Simulate a missed order.canceled event
        const [preorder] = await listPreorders(container, order.id)
        await container.resolve(PREORDER_MODULE).updatePreorders({ id: preorder.id, status: PreorderStatus.PENDING })
        await configurePreorder(seed.variants.preorder, inDays(-1))

        const run = await fulfillPreordersJob(container)

        expect(run).toEqual({ skipped_run: false, processed: 1, failed: 0, actions: { cancel: 1 } })
        const [after] = await listPreorders(container, order.id)
        expect(after.status).toEqual("cancelled")
      })

      it("skips the run while another run holds the lock", async () => {
        const locking = getContainer().resolve(Modules.LOCKING)
        await locking.acquire("job:fulfill-preorders", { ownerId: "other-run", expire: 30 })

        try {
          const run = await fulfillPreordersJob(getContainer())
          expect(run.skipped_run).toBe(true)
        } finally {
          await locking.release("job:fulfill-preorders", { ownerId: "other-run" })
        }
      })
    })
  },
})
