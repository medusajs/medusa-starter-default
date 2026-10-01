import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import { TestEventUtils } from "@medusajs/test-utils"

// `api` from medusaIntegrationTestRunner is an axios instance bound to the
// test server. Requests built with `noThrow` resolve for every status code so
// tests can assert on 4xx responses directly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Api = any

export const noThrow = { validateStatus: () => true }

export type Headers = Record<string, string>

function decodeJwt(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"))
}

/** Creates an admin user through the emailpass flow and returns auth headers. */
export async function createAdminUser(
  api: Api,
  container: MedusaContainer,
  email = "admin@kiji.test",
  password = "supersecret-admin"
): Promise<Headers> {
  const register = await api.post("/auth/user/emailpass/register", { email, password })
  const { auth_identity_id } = decodeJwt(register.data.token) as { auth_identity_id: string }

  await createUserAccountWorkflow(container).run({
    input: { authIdentityId: auth_identity_id, userData: { email } },
  })

  const login = await api.post("/auth/user/emailpass", { email, password })
  return { authorization: `Bearer ${login.data.token}` }
}

export type RegisteredCustomer = {
  id: string
  email: string
  password: string
  // Bearer token of the logged-in customer (actor_id = customer id)
  headers: Headers
}

/**
 * Resolves once the customer.created subscribers (welcome + verify mail) are
 * done. Awaiting it keeps them from running into the DB reset between tests.
 */
export function customerCreatedSubscribersDone(container: MedusaContainer): Promise<unknown> {
  return TestEventUtils.waitSubscribersExecution(
    "customer.created",
    container.resolve(Modules.EVENT_BUS)
  )
}

/**
 * Registers a customer account the way the storefront does:
 * /auth/customer/emailpass/register -> POST /store/customers -> login.
 */
export async function registerCustomer(
  api: Api,
  container: MedusaContainer,
  storeHeaders: Headers,
  input: { email: string; password?: string; first_name?: string; verified?: boolean }
): Promise<RegisteredCustomer> {
  const password = input.password ?? "supersecret-customer"

  const register = await api.post("/auth/customer/emailpass/register", {
    email: input.email,
    password,
  })

  const subscribersDone = customerCreatedSubscribersDone(container)
  const created = await api.post(
    "/store/customers",
    { email: input.email, first_name: input.first_name ?? "Test" },
    { headers: { ...storeHeaders, authorization: `Bearer ${register.data.token}` } }
  )

  await subscribersDone

  const login = await api.post("/auth/customer/emailpass", { email: input.email, password })

  const customer: RegisteredCustomer = {
    id: created.data.customer.id,
    email: input.email,
    password,
    headers: { ...storeHeaders, authorization: `Bearer ${login.data.token}` },
  }

  if (input.verified) {
    await setEmailVerified(container, customer.id, true)
  }

  return customer
}

/** Sets metadata.email_verified directly via the customer module (test setup only). */
export async function setEmailVerified(
  container: MedusaContainer,
  customerId: string,
  verified: boolean
): Promise<void> {
  const customerService = container.resolve(Modules.CUSTOMER)
  await customerService.updateCustomers(customerId, { metadata: { email_verified: verified } })
}
