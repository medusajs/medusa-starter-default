import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

import { signOrderToken } from "../../src/utils/order-token"
import {
  noThrow,
  registerCustomer,
  setEmailVerified,
  type Headers,
  type RegisteredCustomer,
} from "./helpers/auth"
import {
  completePreorderCart,
  createReadyCart,
  orderPlacedSubscribersDone,
} from "./helpers/checkout"
import { seedStore, type SeededStore } from "./helpers/seed"

jest.setTimeout(120 * 1000)

const TOKEN_HEADER = "x-kiji-order-token"

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let seed: SeededStore
    let store: Headers
    let alice: RegisteredCustomer
    let bob: RegisteredCustomer
    let aliceOrderId: string
    let guestOrderId: string
    const guestEmail = "guest.buyer@kiji.test"

    // Runs before the runner's DB snapshot, so every test starts with these
    // customers and orders in place.
    beforeAll(async () => {
      const container = getContainer()
      seed = await seedStore(container)
      store = { "x-publishable-api-key": seed.publishableKey }

      alice = await registerCustomer(api, container, store, {
        email: "alice@kiji.test",
        verified: true,
      })
      bob = await registerCustomer(api, container, store, { email: "bob@kiji.test", verified: true })

      const aliceCart = await createReadyCart(api, seed, alice.headers, {
        items: [{ variant_id: seed.variants.normal }],
      })
      aliceOrderId = (await completePreorderCart(api, container, aliceCart, alice.headers)).id

      const guestCart = await createReadyCart(api, seed, store, {
        email: guestEmail,
        items: [{ variant_id: seed.variants.normal }],
      })
      guestOrderId = (await completePreorderCart(api, container, guestCart, store)).id
    })

    describe("email verification gate on cart completion", () => {
      it.each(["complete", "complete-preorder"])(
        "blocks unverified account carts on /store/carts/:id/%s with 403",
        async (route) => {
          const carol = await registerCustomer(api, getContainer(), store, {
            email: `carol-${route}@kiji.test`,
          })
          const cartId = await createReadyCart(api, seed, carol.headers, {
            items: [{ variant_id: seed.variants.normal }],
          })

          const res = await api.post(`/store/carts/${cartId}/${route}`, {}, {
            headers: carol.headers,
            ...noThrow,
          })

          expect(res.status).toEqual(403)
          expect(res.data.type).toEqual("email_not_verified")

          const cart = await api.get(`/store/carts/${cartId}`, { headers: carol.headers })
          expect(cart.data.cart.completed_at).toBeFalsy()
        }
      )

      it("blocks accounts whose flag is explicitly false", async () => {
        const dave = await registerCustomer(api, getContainer(), store, { email: "dave@kiji.test" })
        await setEmailVerified(getContainer(), dave.id, false)
        const cartId = await createReadyCart(api, seed, dave.headers, {
          items: [{ variant_id: seed.variants.normal }],
        })

        const res = await api.post(`/store/carts/${cartId}/complete`, {}, {
          headers: dave.headers,
          ...noThrow,
        })
        expect(res.status).toEqual(403)
      })

      it.each(["complete", "complete-preorder"])(
        "lets verified accounts complete via /store/carts/:id/%s",
        async (route) => {
          const cartId = await createReadyCart(api, seed, bob.headers, {
            items: [{ variant_id: seed.variants.normal }],
          })

          const subscribersDone = orderPlacedSubscribersDone(getContainer())
          const res = await api.post(`/store/carts/${cartId}/${route}`, {}, {
            headers: bob.headers,
            ...noThrow,
          })
          await subscribersDone

          expect(res.status).toEqual(200)
          expect(res.data.type).toEqual("order")
        }
      )

      it.each(["complete", "complete-preorder"])(
        "lets guest carts through on /store/carts/:id/%s",
        async (route) => {
          const cartId = await createReadyCart(api, seed, store, {
            email: `guest-${route}@kiji.test`,
            items: [{ variant_id: seed.variants.normal }],
          })

          const subscribersDone = orderPlacedSubscribersDone(getContainer())
          const res = await api.post(`/store/carts/${cartId}/${route}`, {}, {
            headers: store,
            ...noThrow,
          })
          await subscribersDone

          expect(res.status).toEqual(200)
          expect(res.data.type).toEqual("order")
        }
      )
    })

    describe("GET /store/orders/:id access (verifyOrderAccess)", () => {
      it("returns the order to its owner", async () => {
        const res = await api.get(`/store/orders/${aliceOrderId}`, { headers: alice.headers })

        expect(res.status).toEqual(200)
        expect(res.data.order.id).toEqual(aliceOrderId)
      })

      it("hides another customer's order with 404", async () => {
        const res = await api.get(`/store/orders/${aliceOrderId}`, {
          headers: bob.headers,
          ...noThrow,
        })
        expect(res.status).toEqual(404)
      })

      it("hides account orders from anonymous requests, even with a valid HMAC token", async () => {
        const anonymous = await api.get(`/store/orders/${aliceOrderId}`, {
          headers: store,
          ...noThrow,
        })
        expect(anonymous.status).toEqual(404)

        const withToken = await api.get(`/store/orders/${aliceOrderId}`, {
          headers: { ...store, [TOKEN_HEADER]: signOrderToken(aliceOrderId) },
          ...noThrow,
        })
        expect(withToken.status).toEqual(404)
      })

      it("returns a guest order with a valid token", async () => {
        const res = await api.get(`/store/orders/${guestOrderId}`, {
          headers: { ...store, [TOKEN_HEADER]: signOrderToken(guestOrderId) },
        })

        expect(res.status).toEqual(200)
        expect(res.data.order.id).toEqual(guestOrderId)
        expect(res.data.order.email).toEqual(guestEmail)
      })

      it("hides a guest order without, with a wrong or with another order's token", async () => {
        const tokens = [
          undefined,
          "wrong-token",
          signOrderToken(guestOrderId).slice(0, -1) + "x",
          signOrderToken(aliceOrderId),
        ]

        for (const token of tokens) {
          const res = await api.get(`/store/orders/${guestOrderId}`, {
            headers: token ? { ...store, [TOKEN_HEADER]: token } : store,
            ...noThrow,
          })
          expect(res.status).toEqual(404)
        }
      })

      it("returns 404 for unknown orders", async () => {
        const res = await api.get("/store/orders/order_does_not_exist", {
          headers: { ...store, [TOKEN_HEADER]: signOrderToken("order_does_not_exist") },
          ...noThrow,
        })
        expect(res.status).toEqual(404)
      })

      it("applies the same rules to GET /store/orders/:id/preorders", async () => {
        const owner = await api.get(`/store/orders/${aliceOrderId}/preorders`, {
          headers: alice.headers,
        })
        expect(owner.data).toEqual({ preorders: [] })

        const other = await api.get(`/store/orders/${aliceOrderId}/preorders`, {
          headers: bob.headers,
          ...noThrow,
        })
        expect(other.status).toEqual(404)

        const guest = await api.get(`/store/orders/${guestOrderId}/preorders`, {
          headers: { ...store, [TOKEN_HEADER]: signOrderToken(guestOrderId) },
        })
        expect(guest.data).toEqual({ preorders: [] })

        const guestNoToken = await api.get(`/store/orders/${guestOrderId}/preorders`, {
          headers: store,
          ...noThrow,
        })
        expect(guestNoToken.status).toEqual(404)
      })

      it("rejects returns for orders the caller can't access (POST /store/returns)", async () => {
        // Schema-valid body: core body validation runs before verifyOrderAccess
        const body = (orderId: string) => ({
          order_id: orderId,
          items: [{ id: "ordli_any", quantity: 1 }],
          return_shipping: { option_id: "so_any" },
        })

        const foreign = await api.post("/store/returns", body(aliceOrderId), {
          headers: bob.headers,
          ...noThrow,
        })
        expect(foreign.status).toEqual(404)

        const guestNoToken = await api.post("/store/returns", body(guestOrderId), {
          headers: store,
          ...noThrow,
        })
        expect(guestNoToken.status).toEqual(404)
      })
    })

    describe("POST /store/orders/:id/token", () => {
      it("issues the guest token for the order's email (trimmed, case-insensitive)", async () => {
        const res = await api.post(
          `/store/orders/${guestOrderId}/token`,
          { email: "  Guest.Buyer@KIJI.test " },
          { headers: store }
        )

        expect(res.data).toEqual({ token: signOrderToken(guestOrderId) })

        const order = await api.get(`/store/orders/${guestOrderId}`, {
          headers: { ...store, [TOKEN_HEADER]: res.data.token },
        })
        expect(order.status).toEqual(200)
      })

      it("returns 404 for a wrong email or an unknown order", async () => {
        const wrongEmail = await api.post(
          `/store/orders/${guestOrderId}/token`,
          { email: "someone@kiji.test" },
          { headers: store, ...noThrow }
        )
        expect(wrongEmail.status).toEqual(404)
        expect(wrongEmail.data.token).toBeUndefined()

        const unknown = await api.post(
          "/store/orders/order_does_not_exist/token",
          { email: guestEmail },
          { headers: store, ...noThrow }
        )
        expect(unknown.status).toEqual(404)
      })

      it("never issues tokens for account orders", async () => {
        const res = await api.post(
          `/store/orders/${aliceOrderId}/token`,
          { email: alice.email },
          { headers: store, ...noThrow }
        )
        expect(res.status).toEqual(404)
        expect(res.data.token).toBeUndefined()
      })

      it("validates the body", async () => {
        const res = await api.post(
          `/store/orders/${guestOrderId}/token`,
          {},
          { headers: store, ...noThrow }
        )
        expect(res.status).toEqual(400)
      })
    })
  },
})
