import type { MedusaContainer } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { TestEventUtils } from "@medusajs/test-utils"

import type { Api, Headers } from "./auth"
import type { SeededStore } from "./seed"

export const SHIPPING_ADDRESS = {
  first_name: "Erika",
  last_name: "Mustermann",
  address_1: "Hauptstr. 1",
  city: "Berlin",
  postal_code: "10115",
  country_code: "de",
}

export type CartItem = { variant_id: string; quantity?: number }

/**
 * Creates a cart and brings it to a completable state: items, address,
 * shipping method and a system-provider payment session.
 * Pass the logged-in customer's headers to create an account cart; with the
 * plain store headers it's a guest cart.
 */
export async function createReadyCart(
  api: Api,
  seed: SeededStore,
  headers: Headers,
  input: { items: CartItem[]; email?: string }
): Promise<string> {
  const {
    data: { cart },
  } = await api.post(
    "/store/carts",
    {
      region_id: seed.regionId,
      sales_channel_id: seed.salesChannelId,
      ...(input.email ? { email: input.email } : {}),
      items: input.items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity ?? 1 })),
    },
    { headers }
  )

  await api.post(
    `/store/carts/${cart.id}`,
    { shipping_address: SHIPPING_ADDRESS, billing_address: SHIPPING_ADDRESS },
    { headers }
  )

  await api.post(
    `/store/carts/${cart.id}/shipping-methods`,
    { option_id: seed.shippingOptionId },
    { headers }
  )

  const {
    data: { payment_collection },
  } = await api.post("/store/payment-collections", { cart_id: cart.id }, { headers })

  await api.post(
    `/store/payment-collections/${payment_collection.id}/payment-sessions`,
    { provider_id: "pp_system_default" },
    { headers }
  )

  return cart.id
}

/**
 * Resolves once the order.placed subscribers (confirmation mail) are done.
 * Awaiting it keeps them from running into the DB reset between tests.
 */
export function orderPlacedSubscribersDone(container: MedusaContainer): Promise<unknown> {
  return TestEventUtils.waitSubscribersExecution("order.placed", container.resolve(Modules.EVENT_BUS))
}

/** Completes a ready cart through the custom preorder-aware route; returns the order. */
export async function completePreorderCart(
  api: Api,
  container: MedusaContainer,
  cartId: string,
  headers: Headers
): Promise<{ id: string; email: string; items: { id: string; variant_id: string }[] }> {
  const subscribersDone = orderPlacedSubscribersDone(container)
  const res = await api.post(`/store/carts/${cartId}/complete-preorder`, {}, { headers })
  if (res.data.type !== "order") {
    throw new Error(`Cart ${cartId} was not completed: ${JSON.stringify(res.data)}`)
  }
  await subscribersDone
  return res.data.order
}
