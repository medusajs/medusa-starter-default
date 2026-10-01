import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

import { signEmailVerifyToken } from "../../src/utils/email-verify-token"
import {
  customerCreatedSubscribersDone,
  noThrow,
  registerCustomer,
  setEmailVerified,
  type Headers,
} from "./helpers/auth"
import { seedStore, type SeededStore } from "./helpers/seed"

jest.setTimeout(120 * 1000)

async function getCustomerMetadata(container: MedusaContainer, id: string) {
  const customer = await container.resolve(Modules.CUSTOMER).retrieveCustomer(id)
  return (customer.metadata ?? {}) as Record<string, unknown>
}

// The customer.created subscriber sends the signup verification mail
// asynchronously; the local notification provider stores it in the DB.
async function waitForVerifyMail(container: MedusaContainer, customerId: string) {
  const notificationService = container.resolve(Modules.NOTIFICATION)
  for (let i = 0; i < 50; i++) {
    const [notification] = await notificationService.listNotifications({
      template: "email-verify",
      receiver_id: customerId,
    })
    if (notification) return notification
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error(`No email-verify notification for ${customerId}`)
}

medusaIntegrationTestRunner({
  inApp: true,
  env: {},
  testSuite: ({ api, getContainer }) => {
    let seed: SeededStore
    let store: Headers

    beforeAll(async () => {
      seed = await seedStore(getContainer())
      store = { "x-publishable-api-key": seed.publishableKey }
    })

    describe("metadata.email_verified guard on /store/customers", () => {
      it("strips email_verified on signup but keeps other metadata", async () => {
        const register = await api.post("/auth/customer/emailpass/register", {
          email: "self-verify@kiji.test",
          password: "supersecret-customer",
        })

        const subscribersDone = customerCreatedSubscribersDone(getContainer())
        const res = await api.post(
          "/store/customers",
          {
            email: "self-verify@kiji.test",
            metadata: { email_verified: true, foo: "bar" },
          },
          { headers: { ...store, authorization: `Bearer ${register.data.token}` }, ...noThrow }
        )

        await subscribersDone

        expect(res.status).toEqual(200)
        const metadata = await getCustomerMetadata(getContainer(), res.data.customer.id)
        expect(metadata.foo).toEqual("bar")
        expect(metadata.email_verified).not.toBe(true)
      })

      it("strips email_verified on profile updates (POST /store/customers/me)", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "profile@kiji.test",
        })

        const res = await api.post(
          "/store/customers/me",
          { first_name: "Neu", metadata: { email_verified: true, nickname: "neo" } },
          { headers: customer.headers, ...noThrow }
        )

        expect(res.status).toEqual(200)
        expect(res.data.customer.first_name).toEqual("Neu")
        const metadata = await getCustomerMetadata(getContainer(), customer.id)
        expect(metadata.nickname).toEqual("neo")
        expect(metadata.email_verified).not.toBe(true)
      })

      it("does not let a verified customer unset or wipe the flag", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "verified-profile@kiji.test",
          verified: true,
        })

        const wipe = await api.post(
          "/store/customers/me",
          { metadata: null },
          { headers: customer.headers, ...noThrow }
        )
        expect(wipe.status).toEqual(200)
        expect((await getCustomerMetadata(getContainer(), customer.id)).email_verified).toBe(true)

        const unset = await api.post(
          "/store/customers/me",
          { metadata: { email_verified: false, theme: "dark" } },
          { headers: customer.headers, ...noThrow }
        )
        expect(unset.status).toEqual(200)
        const metadata = await getCustomerMetadata(getContainer(), customer.id)
        expect(metadata.email_verified).toBe(true)
        expect(metadata.theme).toEqual("dark")
      })

      it("leaves address metadata alone", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "address@kiji.test",
        })

        const res = await api.post(
          "/store/customers/me/addresses",
          {
            first_name: "Erika",
            address_1: "Hauptstr. 1",
            city: "Berlin",
            country_code: "de",
            postal_code: "10115",
            metadata: { email_verified: true, door: "left" },
          },
          { headers: customer.headers, ...noThrow }
        )

        expect(res.status).toEqual(200)
        const address = res.data.customer.addresses[0]
        expect(address.metadata).toEqual({ email_verified: true, door: "left" })
        expect((await getCustomerMetadata(getContainer(), customer.id)).email_verified).not.toBe(
          true
        )
      })
    })

    describe("POST /store/customers/email-exists", () => {
      it("matches registered accounts case- and whitespace-insensitively", async () => {
        await registerCustomer(api, getContainer(), store, { email: "exists@kiji.test" })

        const hit = await api.post(
          "/store/customers/email-exists",
          { email: "  EXISTS@Kiji.Test " },
          { headers: store }
        )
        expect(hit.data).toEqual({ exists: true })

        const miss = await api.post(
          "/store/customers/email-exists",
          { email: "nobody@kiji.test" },
          { headers: store }
        )
        expect(miss.data).toEqual({ exists: false })
      })

      // Medusa stores customer emails as entered; the route must match
      // case-insensitively.
      it("finds accounts registered with a mixed-case email", async () => {
        await registerCustomer(api, getContainer(), store, { email: "Mixed.Case@kiji.test" })

        const res = await api.post(
          "/store/customers/email-exists",
          { email: "Mixed.Case@kiji.test" },
          { headers: store }
        )
        expect(res.data).toEqual({ exists: true })
      })

      it("ignores guest (shadow) customers and invalid addresses", async () => {
        await getContainer()
          .resolve(Modules.CUSTOMER)
          .createCustomers({ email: "guest@kiji.test", has_account: false })

        const guest = await api.post(
          "/store/customers/email-exists",
          { email: "guest@kiji.test" },
          { headers: store }
        )
        expect(guest.data).toEqual({ exists: false })

        const invalid = await api.post(
          "/store/customers/email-exists",
          { email: "not-an-email" },
          { headers: store }
        )
        expect(invalid.data).toEqual({ exists: false })
      })

      it("validates the body", async () => {
        const res = await api.post("/store/customers/email-exists", {}, { headers: store, ...noThrow })
        expect(res.status).toEqual(400)
      })
    })

    describe("POST /store/auth/verify-email", () => {
      it("verifies with the link from the signup mail and keeps other metadata", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "Verify.Me@kiji.test",
        })
        await api.post(
          "/store/customers/me",
          { metadata: { newsletter: true } },
          { headers: customer.headers }
        )

        const mail = await waitForVerifyMail(getContainer(), customer.id)
        const link = new URL((mail.data as { verify_url: string }).verify_url)
        expect(link.pathname).toEqual("/verify-email")
        expect(link.searchParams.get("customer_id")).toEqual(customer.id)

        const res = await api.post(
          "/store/auth/verify-email",
          {
            customer_id: link.searchParams.get("customer_id"),
            email: link.searchParams.get("email"),
            token: link.searchParams.get("token"),
          },
          { headers: store }
        )

        expect(res.data).toEqual({ verified: true })
        const metadata = await getCustomerMetadata(getContainer(), customer.id)
        expect(metadata).toEqual(expect.objectContaining({ email_verified: true, newsletter: true }))

        // Idempotent
        const again = await api.post(
          "/store/auth/verify-email",
          {
            customer_id: customer.id,
            email: customer.email,
            token: link.searchParams.get("token"),
          },
          { headers: store, ...noThrow }
        )
        expect(again.status).toEqual(200)
      })

      it("rejects an invalid token with 400 and leaves the customer unverified", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "bad-token@kiji.test",
        })

        const res = await api.post(
          "/store/auth/verify-email",
          { customer_id: customer.id, email: customer.email, token: "garbage.token" },
          { headers: store, ...noThrow }
        )

        expect(res.status).toEqual(400)
        expect((await getCustomerMetadata(getContainer(), customer.id)).email_verified).not.toBe(
          true
        )
      })

      it("rejects a token issued for another customer or an expired token", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "other-token@kiji.test",
        })

        const foreign = await api.post(
          "/store/auth/verify-email",
          {
            customer_id: customer.id,
            email: customer.email,
            token: signEmailVerifyToken("cus_someone_else", customer.email),
          },
          { headers: store, ...noThrow }
        )
        expect(foreign.status).toEqual(400)

        const expired = await api.post(
          "/store/auth/verify-email",
          {
            customer_id: customer.id,
            email: customer.email,
            token: signEmailVerifyToken(customer.id, customer.email, Date.now() - 25 * 3600 * 1000),
          },
          { headers: store, ...noThrow }
        )
        expect(expired.status).toEqual(400)
        expect(expired.data.message).toMatch(/expired/i)
      })

      it("rejects a token once the customer's email changed", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "old-address@kiji.test",
        })
        const token = signEmailVerifyToken(customer.id, customer.email)
        await getContainer()
          .resolve(Modules.CUSTOMER)
          .updateCustomers(customer.id, { email: "new-address@kiji.test" })

        const res = await api.post(
          "/store/auth/verify-email",
          { customer_id: customer.id, email: customer.email, token },
          { headers: store, ...noThrow }
        )

        expect(res.status).toEqual(400)
        expect((await getCustomerMetadata(getContainer(), customer.id)).email_verified).not.toBe(
          true
        )
      })

      it("returns 404 for an unknown customer with a correctly signed token", async () => {
        const res = await api.post(
          "/store/auth/verify-email",
          {
            customer_id: "cus_does_not_exist",
            email: "ghost@kiji.test",
            token: signEmailVerifyToken("cus_does_not_exist", "ghost@kiji.test"),
          },
          { headers: store, ...noThrow }
        )

        expect(res.status).toEqual(404)
      })
    })

    describe("POST /store/customers/me/resend-verification", () => {
      it("requires a logged-in customer", async () => {
        const res = await api.post(
          "/store/customers/me/resend-verification",
          {},
          { headers: store, ...noThrow }
        )
        expect(res.status).toEqual(401)
      })

      it("sends once and throttles the second request with 429", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "resend@kiji.test",
        })

        const first = await api.post(
          "/store/customers/me/resend-verification",
          {},
          { headers: customer.headers, ...noThrow }
        )
        expect(first.status).toEqual(200)
        expect(first.data).toEqual({ sent: true })

        const second = await api.post(
          "/store/customers/me/resend-verification",
          {},
          { headers: customer.headers, ...noThrow }
        )
        expect(second.status).toEqual(429)
        expect(second.headers["retry-after"]).toEqual("60")
        expect(second.data.retry_after).toEqual(60)
      })

      it("answers sent:true for verified customers without sending a mail", async () => {
        const customer = await registerCustomer(api, getContainer(), store, {
          email: "resend-verified@kiji.test",
        })
        // registerCustomer waits for the signup mail, so it can't race with the count below
        await setEmailVerified(getContainer(), customer.id, true)
        const notificationService = getContainer().resolve(Modules.NOTIFICATION)
        const before = await notificationService.listNotifications({
          template: "email-verify",
          receiver_id: customer.id,
        })

        const res = await api.post(
          "/store/customers/me/resend-verification",
          {},
          { headers: customer.headers }
        )

        expect(res.data).toEqual({ sent: true })
        const after = await notificationService.listNotifications({
          template: "email-verify",
          receiver_id: customer.id,
        })
        expect(after).toHaveLength(before.length)
      })
    })

  },
})
