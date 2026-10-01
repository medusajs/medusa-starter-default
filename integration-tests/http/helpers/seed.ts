import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createApiKeysWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows"

export type SeededStore = {
  regionId: string
  salesChannelId: string
  publishableKey: string
  shippingOptionId: string
  stockLocationId: string
  productId: string
  // Variant ids of the seeded product, by option value
  variants: {
    normal: string
    preorder: string
    extra: string
  }
}

/**
 * Minimal storefront setup that lets a cart be completed:
 * EUR region (DE) with the system payment provider, sales channel +
 * publishable key, stock location with a manual-fulfillment shipping option,
 * and one product with three variants (inventory not managed).
 */
export async function seedStore(container: MedusaContainer): Promise<SeededStore> {
  const link = container.resolve(ContainerRegistrationKeys.LINK)
  const fulfillmentService = container.resolve(Modules.FULFILLMENT)
  const storeService = container.resolve(Modules.STORE)

  const [store] = await storeService.listStores()

  const {
    result: [salesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: { salesChannelsData: [{ name: "Test channel" }] },
  })

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [{ currency_code: "eur", is_default: true }],
        default_sales_channel_id: salesChannel.id,
      },
    },
  })

  const {
    result: [region],
  } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "Germany",
          currency_code: "eur",
          countries: ["de"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  })

  const {
    result: [apiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [{ title: "Test storefront", type: "publishable", created_by: "" }],
    },
  })
  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: { id: apiKey.id, add: [salesChannel.id] },
  })

  const {
    result: [stockLocation],
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [{ name: "Warehouse", address: { address_1: "", city: "Berlin", country_code: "DE" } }],
    },
  })
  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: { id: stockLocation.id, add: [salesChannel.id] },
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_provider_id: "manual_manual" },
  })

  const {
    result: [shippingProfile],
  } = await createShippingProfilesWorkflow(container).run({
    input: { data: [{ name: "Default", type: "default" }] },
  })

  const fulfillmentSet = await fulfillmentService.createFulfillmentSets({
    name: "Warehouse delivery",
    type: "shipping",
    service_zones: [{ name: "DE", geo_zones: [{ type: "country", country_code: "de" }] }],
  })
  await link.create({
    [Modules.STOCK_LOCATION]: { stock_location_id: stockLocation.id },
    [Modules.FULFILLMENT]: { fulfillment_set_id: fulfillmentSet.id },
  })

  const {
    result: [shippingOption],
  } = await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: { label: "Standard", description: "2-3 days", code: "standard" },
        prices: [
          { currency_code: "eur", amount: 5 },
          { region_id: region.id, amount: 5 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  })

  const variant = (edition: string, sku: string, amount: number) => ({
    title: edition,
    sku,
    options: { Edition: edition },
    manage_inventory: false,
    prices: [{ currency_code: "eur", amount }],
  })

  const {
    result: [product],
  } = await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Test Game",
          handle: "test-game",
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          options: [{ title: "Edition", values: ["Standard", "Collector", "Deluxe"] }],
          variants: [
            variant("Standard", "GAME-STD", 30),
            variant("Collector", "GAME-COL", 80),
            variant("Deluxe", "GAME-DLX", 50),
          ],
          sales_channels: [{ id: salesChannel.id }],
        },
      ],
    },
  })

  const variantId = (title: string) => {
    const found = product.variants.find((v) => v.title === title)
    if (!found) throw new Error(`Seeded variant ${title} missing`)
    return found.id
  }

  return {
    regionId: region.id,
    salesChannelId: salesChannel.id,
    publishableKey: apiKey.token,
    shippingOptionId: shippingOption.id,
    stockLocationId: stockLocation.id,
    productId: product.id,
    variants: {
      normal: variantId("Standard"),
      preorder: variantId("Collector"),
      extra: variantId("Deluxe"),
    },
  }
}
