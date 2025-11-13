import { MedusaContainer } from '@medusajs/framework'
import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createServiceZonesWorkflow,
  createShippingOptionsWorkflow,
  createStockLocationsWorkflow,
  createTaxRegionsWorkflow,
  createUserAccountWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  updateStoresWorkflow,
  updateTaxRegionsWorkflow
} from '@medusajs/medusa/core-flows'

import { SELLER_MODULE } from '@mercurjs/b2c-core/modules/seller'
import {
  createConfigurationRuleWorkflow,
  createLocationFulfillmentSetAndAssociateWithSellerWorkflow,
  createSellerWorkflow
} from '@mercurjs/b2c-core/workflows'
import { createCommissionRuleWorkflow } from '@mercurjs/commission/workflows'
import {
  ConfigurationRuleDefaults,
  SELLER_SHIPPING_PROFILE_LINK
} from '@mercurjs/framework'

import { productsToInsert } from './seed-products'

const countries = ['gb']

export async function cleanupExistingData(container: MedusaContainer) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const sellerModuleService: any = container.resolve(SELLER_MODULE)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  // Find existing seller
  const [existingSeller] = await sellerModuleService.listSellers({
    name: 'MercurJS Store'
  })

  if (!existingSeller) {
    logger.info('No existing seller data to clean up')
    return
  }

  logger.info('Cleaning up existing seller data...')

  try {
    const productService = container.resolve(Modules.PRODUCT)
    const stockLocationService = container.resolve(Modules.STOCK_LOCATION)
    const fulfillmentService = container.resolve(Modules.FULFILLMENT)

    // Delete products associated with the seller
    try {
      const productsResult = await query.graph({
        entity: 'seller',
        fields: ['products.*'],
        filters: {
          id: existingSeller.id
        }
      })
      
      const products = productsResult.data?.[0]?.products || []
      if (products.length > 0) {
        const productIds = products.map((p: any) => p.id)
        logger.info(`Deleting ${productIds.length} products...`)
        await productService.deleteProducts(productIds)
      }
    } catch (error: any) {
      logger.warn(`Could not delete products: ${error.message}`)
    }

    // Get related shipping options, service zones, and stock locations
    let shippingOptionIds: string[] = []
    let serviceZoneIds: string[] = []
    let fulfillmentSetIds: string[] = []
    let stockLocationIds: string[] = []

    try {
      const result = await query.graph({
        entity: 'seller',
        fields: [
          'id',
          'stock_locations.*',
          'stock_locations.fulfillment_sets.*',
          'service_zones.*',
          'shipping_options.*'
        ],
        filters: {
          id: existingSeller.id
        }
      })

      const sellerData = result.data?.[0]

      if (sellerData?.shipping_options?.length > 0) {
        shippingOptionIds = sellerData.shipping_options.map((so: any) => so.id)
      }

      if (sellerData?.service_zones?.length > 0) {
        serviceZoneIds = sellerData.service_zones.map((sz: any) => sz.id)
      }

      if (sellerData?.stock_locations?.length > 0) {
        stockLocationIds = sellerData.stock_locations.map((sl: any) => sl.id)
        
        for (const stockLocation of sellerData.stock_locations) {
          if (stockLocation.fulfillment_sets?.length > 0) {
            fulfillmentSetIds.push(...stockLocation.fulfillment_sets.map((fs: any) => fs.id))
          }
        }
      }
    } catch (error: any) {
      logger.warn(`Could not fetch related data: ${error.message}`)
    }

    // Delete shipping options
    if (shippingOptionIds.length > 0) {
      try {
        logger.info(`Deleting ${shippingOptionIds.length} shipping options...`)
        await fulfillmentService.deleteShippingOptions(shippingOptionIds)
      } catch (error: any) {
        logger.warn(`Could not delete shipping options: ${error.message}`)
      }
    }

    // Delete service zones
    if (serviceZoneIds.length > 0) {
      try {
        logger.info(`Deleting ${serviceZoneIds.length} service zones...`)
        await fulfillmentService.deleteServiceZones(serviceZoneIds)
      } catch (error: any) {
        logger.warn(`Could not delete service zones: ${error.message}`)
      }
    }

    // Delete fulfillment sets
    if (fulfillmentSetIds.length > 0) {
      try {
        logger.info(`Deleting ${fulfillmentSetIds.length} fulfillment sets...`)
        await fulfillmentService.deleteFulfillmentSets(fulfillmentSetIds)
      } catch (error: any) {
        logger.warn(`Could not delete fulfillment sets: ${error.message}`)
      }
    }

    // Delete stock locations
    if (stockLocationIds.length > 0) {
      try {
        logger.info(`Deleting ${stockLocationIds.length} stock locations...`)
        await stockLocationService.deleteStockLocations(stockLocationIds)
      } catch (error: any) {
        logger.warn(`Could not delete stock locations: ${error.message}`)
      }
    }

    // Delete all links to seller before deleting the seller
    try {
      await link.dismiss({
        [SELLER_MODULE]: {
          seller_id: existingSeller.id
        }
      })
    } catch (error: any) {
      logger.warn(`Could not dismiss seller links: ${error.message}`)
    }

    // Delete seller
    try {
      logger.info('Deleting seller...')
      await sellerModuleService.deleteSellers([existingSeller.id])
    } catch (error: any) {
      logger.warn(`Could not delete seller: ${error.message}`)
      logger.warn('The seller may have corrupted relationships. Attempting to continue...')
    }

    // Delete auth identity
    try {
      const authService = container.resolve(Modules.AUTH)
      const identities = await authService.listAuthIdentities({
        provider_identities: {
          provider: 'emailpass',
          entity_id: 'seller@mercurjs.com'
        }
      })
      if (identities.length > 0) {
        logger.info('Deleting auth identity...')
        await authService.deleteAuthIdentities(identities.map((i: any) => i.id))
      }
    } catch (error: any) {
      logger.warn(`Could not delete auth identity: ${error.message}`)
    }

    logger.info('Cleanup completed (with possible warnings)')
  } catch (error: any) {
    logger.warn(`Cleanup encountered errors: ${error.message}`)
    logger.warn('Some data may not have been cleaned up. Continuing with seed...')
  }
}

export async function createSalesChannel(container: MedusaContainer) {
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)
  let [defaultSalesChannel] = await salesChannelModuleService.listSalesChannels(
    {
      name: 'Default Sales Channel'
    }
  )

  if (!defaultSalesChannel) {
    const {
      result: [salesChannelResult]
    } = await createSalesChannelsWorkflow(container).run({
      input: {
        salesChannelsData: [
          {
            name: 'Default Sales Channel'
          }
        ]
      }
    })
    defaultSalesChannel = salesChannelResult
  }

  return defaultSalesChannel
}

export async function createStore(
  container: MedusaContainer,
  salesChannelId: string,
  regionId: string
) {
  const storeModuleService = container.resolve(Modules.STORE)
  const [store] = await storeModuleService.listStores()

  if (!store) {
    return
  }

  await updateStoresWorkflow(container).run({
    input: {
      selector: { id: store.id },
      update: {
        supported_currencies: [
          {
            currency_code: 'gbp',
            is_default: true
          }
        ],
        default_sales_channel_id: salesChannelId,
        default_region_id: regionId
      }
    }
  })
}
export async function createRegions(container: MedusaContainer) {
  const regionModuleService = container.resolve(Modules.REGION)
  let [region] = await regionModuleService.listRegions({
    name: 'UK'
  })

  if (!region) {
    const {
      result: [regionResult]
    } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: 'UK',
            currency_code: 'gbp',
            countries,
            payment_providers: ['pp_system_default']
          }
        ]
      }
    })
    region = regionResult

    const { result: taxRegions } = await createTaxRegionsWorkflow(container).run({
      input: countries.map((country_code) => ({
        country_code
      }))
    })

    await updateTaxRegionsWorkflow(container).run({
      input: taxRegions.map((taxRegion => ({
        id: taxRegion.id,
        provider_id: 'tp_system'
      })))
    })
  }

  return region
}

export async function createPublishableKey(
  container: MedusaContainer,
  salesChannelId: string
) {
  const apiKeyService = container.resolve(Modules.API_KEY)

  let [key] = await apiKeyService.listApiKeys({ type: 'publishable' })

  if (!key) {
    const {
      result: [publishableApiKeyResult]
    } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: 'Default publishable key',
            type: 'publishable',
            created_by: ''
          }
        ]
      }
    })
    key = publishableApiKeyResult
  }

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: key.id,
      add: [salesChannelId]
    }
  })

  return key
}

export async function createProductCategories(container: MedusaContainer) {
  const productService = container.resolve(Modules.PRODUCT)
  const existingCategories = await productService.listProductCategories(
    {},
    { select: ['id', 'name'] }
  )
  const existingNames = new Set(existingCategories.map((c) => c.name))

  const categoriesToCreate = [
    { name: 'Sneakers', is_active: true },
    { name: 'Sandals', is_active: true },
    { name: 'Boots', is_active: true },
    { name: 'Sport', is_active: true },
    { name: 'Accessories', is_active: true },
    { name: 'Tops', is_active: true }
  ].filter((cat) => !existingNames.has(cat.name))

  if (categoriesToCreate.length === 0) {
    return existingCategories
  }

  const { result } = await createProductCategoriesWorkflow(container).run({
    input: {
      product_categories: categoriesToCreate
    }
  })

  return result
}

export async function createProductCollections(container: MedusaContainer) {
  const productService = container.resolve(Modules.PRODUCT)
  const existingCollections = await productService.listProductCollections(
    {},
    { select: ['id', 'title'] }
  )
  const existingTitles = new Set(existingCollections.map((c) => c.title))

  const collectionsToCreate = [
    { title: 'Luxury' },
    { title: 'Vintage' },
    { title: 'Casual' },
    { title: 'Soho' },
    { title: 'Streetwear' },
    { title: 'Y2K' }
  ].filter((col) => !existingTitles.has(col.title))

  if (collectionsToCreate.length === 0) {
    return existingCollections
  }

  const { result } = await createCollectionsWorkflow(container).run({
    input: {
      collections: collectionsToCreate
    }
  })

  return result
}

export async function createSeller(container: MedusaContainer) {
  const authService = container.resolve(Modules.AUTH)
  const sellerModuleService: any = container.resolve(SELLER_MODULE)

  // First, check if seller already exists despite cleanup
  const [existingSeller] = await sellerModuleService.listSellers({
    name: 'MercurJS Store'
  })

  if (existingSeller) {
    throw new Error(
      'Seller "MercurJS Store" still exists after cleanup. ' +
      'This indicates corrupted data. Please reset your database manually:\n' +
      '1. Drop and recreate the database, OR\n' +
      '2. Delete the seller record directly from the database\n' +
      'Then run the seed script again.'
    )
  }

  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: 'seller@mercurjs.com',
      password: 'secret'
    }
  })

  const { result: seller } = await createSellerWorkflow.run({
    container,
    input: {
      auth_identity_id: authIdentity?.id,
      member: {
        name: 'John Doe',
        email: 'seller@mercurjs.com'
      },
      seller: {
        name: 'MercurJS Store'
      }
    }
  })

  return seller
}

export async function createAdminUser(container: MedusaContainer) {
  const authService = container.resolve(Modules.AUTH)
  const userService = container.resolve(Modules.USER)

  // Check if admin user already exists
  const existingUsers = await userService.listUsers({
    email: 'admin@medusa-test.com'
  })

  if (existingUsers.length > 0) {
    return existingUsers[0]
  }

  // Register auth identity
  const { authIdentity } = await authService.register('emailpass', {
    body: {
      email: 'admin@medusa-test.com',
      password: 'supersecret'
    }
  })

  if (!authIdentity?.id) {
    throw new Error('Failed to create auth identity for admin user')
  }

  // Create admin user
  const { result: user } = await createUserAccountWorkflow(container).run({
    input: {
      authIdentityId: authIdentity.id,
      userData: {
        email: 'admin@medusa-test.com',
        first_name: 'Admin',
        last_name: 'User'
      }
    }
  })

  return user
}

export async function createSellerStockLocation(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const link = container.resolve(ContainerRegistrationKeys.LINK)

  const {
    result: [stock]
  } = await createStockLocationsWorkflow(container).run({
    input: {
      locations: [
        {
          name: `Stock Location for seller ${sellerId}`,
          address: {
            address_1: 'Random Strasse',
            city: 'Berlin',
            country_code: 'de'
          }
        }
      ]
    }
  })

  await link.create([
    {
      [SELLER_MODULE]: {
        seller_id: sellerId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    },
    {
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      },
      [Modules.FULFILLMENT]: {
        fulfillment_provider_id: 'manual_manual'
      }
    },
    {
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: salesChannelId
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stock.id
      }
    }
  ])

  await createLocationFulfillmentSetAndAssociateWithSellerWorkflow.run({
    container,
    input: {
      fulfillment_set_data: {
        name: `${sellerId} fulfillment set`,
        type: 'shipping'
      },
      location_id: stock.id,
      seller_id: sellerId
    }
  })

  const {
    data: [stockLocation]
  } = await query.graph({
    entity: 'stock_location',
    fields: ['*', 'fulfillment_sets.*'],
    filters: {
      id: stock.id
    }
  })

  return stockLocation
}

export async function createServiceZoneForFulfillmentSet(
  container: MedusaContainer,
  sellerId: string,
  fulfillmentSetId: string
) {
  await createServiceZonesWorkflow.run({
    container,
    input: {
      data: [
        {
          fulfillment_set_id: fulfillmentSetId,
          name: `UK`,
          geo_zones: countries.map((c) => ({
            type: 'country',
            country_code: c
          }))
        }
      ]
    }
  })

  const fulfillmentService = container.resolve(Modules.FULFILLMENT)

  const [zone] = await fulfillmentService.listServiceZones({
    fulfillment_set: {
      id: fulfillmentSetId
    }
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      service_zone_id: zone.id
    }
  })

  return zone
}

export async function createSellerShippingOption(
  container: MedusaContainer,
  sellerId: string,
  sellerName: string,
  regionId: string,
  serviceZoneId: string
) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const {
    data: [shippingProfile]
  } = await query.graph({
    entity: SELLER_SHIPPING_PROFILE_LINK,
    fields: ['shipping_profile_id'],
    filters: {
      seller_id: sellerId
    }
  })

  const {
    result: [shippingOption]
  } = await createShippingOptionsWorkflow.run({
    container,
    input: [
      {
        name: `${sellerName} shipping`,
        shipping_profile_id: shippingProfile.shipping_profile_id,
        service_zone_id: serviceZoneId,
        provider_id: 'manual_manual',
        type: {
          label: `${sellerName} shipping`,
          code: sellerName,
          description: 'UK shipping'
        },
        rules: [
          { value: 'true', attribute: 'enabled_in_store', operator: 'eq' },
          { attribute: 'is_return', value: 'false', operator: 'eq' }
        ],
        prices: [
          { currency_code: 'gbp', amount: 10 },
          { amount: 10, region_id: regionId }
        ],
        price_type: 'flat',
        data: { id: 'manual-fulfillment' }
      }
    ]
  })

  const link = container.resolve(ContainerRegistrationKeys.LINK)
  await link.create({
    [SELLER_MODULE]: {
      seller_id: sellerId
    },
    [Modules.FULFILLMENT]: {
      shipping_option_id: shippingOption.id
    }
  })

  return shippingOption
}

export async function createSellerProducts(
  container: MedusaContainer,
  sellerId: string,
  salesChannelId: string
) {
  const productService = container.resolve(Modules.PRODUCT)
  const collections = await productService.listProductCollections(
    {},
    { select: ['id', 'title'] }
  )
  const categories = await productService.listProductCategories(
    {},
    { select: ['id', 'name'] }
  )

  const randomCategory = () =>
    categories[Math.floor(Math.random() * categories.length)]
  const randomCollection = () =>
    collections[Math.floor(Math.random() * collections.length)]

  const toInsert = productsToInsert.map((p) => ({
    ...p,
    categories: [
      {
        id: randomCategory().id
      }
    ],
    collection_id: randomCollection().id,
    sales_channels: [
      {
        id: salesChannelId
      }
    ]
  }))

  const { result } = await createProductsWorkflow.run({
    container,
    input: {
      products: toInsert,
      additional_data: {
        seller_id: sellerId
      }
    }
  })

  return result
}

export async function createInventoryItemStockLevels(
  container: MedusaContainer,
  stockLocationId: string
) {
  const inventoryService = container.resolve(Modules.INVENTORY)
  const items = await inventoryService.listInventoryItems(
    {},
    { select: ['id'] }
  )

  const toCreate = items.map((i) => ({
    inventory_item_id: i.id,
    location_id: stockLocationId,
    stocked_quantity: Math.floor(Math.random() * 50) + 1
  }))

  const { result } = await createInventoryLevelsWorkflow.run({
    container,
    input: {
      inventory_levels: toCreate
    }
  })
  return result
}

export async function createDefaultCommissionLevel(container: MedusaContainer) {
  try {
    await createCommissionRuleWorkflow.run({
      container,
      input: {
        name: 'default',
        is_active: true,
        reference: 'site',
        reference_id: '',
        rate: {
          include_tax: true,
          type: 'percentage',
          percentage_rate: 2
        }
      }
    })
  } catch (error: any) {
    // Skip if the commission rule already exists
    if (error.message?.includes('already exists')) {
      return
    }
    throw error
  }
}

export async function createConfigurationRules(container: MedusaContainer) {
  for (const [ruleType, isEnabled] of ConfigurationRuleDefaults) {
    try {
      await createConfigurationRuleWorkflow.run({
        container,
        input: {
          rule_type: ruleType,
          is_enabled: isEnabled
        }
      })
    } catch (error: any) {
      // Skip if the configuration rule already exists
      if (error.message?.includes('already exists')) {
        continue
      }
      throw error
    }
  }
}
