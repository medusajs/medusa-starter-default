// Kept outside the dashboard's own namespaces ("orders", "products", ...) so
// invalidating dashboard queries never hits these and vice versa.
export const preorderQueryKeys = {
  all: ["preorders"] as const,
  order: (orderId: string) => ["preorders", "order", orderId] as const,
  variant: (variantId: string) => ["preorders", "variant", variantId] as const,
}

// Matches the dashboard's customersQueryKeys.detail(id) (queryKeysFactory).
export const customerDetailQueryKey = (customerId: string) =>
  ["customers", "detail", customerId] as const
