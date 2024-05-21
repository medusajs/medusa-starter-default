import { Logger } from "@medusajs/medusa"
import { 
  ModuleRegistrationName, 
  RemoteLink
} from "@medusajs/modules-sdk"
import { 
  IRegionModuleService,
  IStockLocationServiceNext,
  ISalesChannelModuleService,
  IFulfillmentModuleService,
  ExecArgs,
  IApiKeyModuleService,
  IProductModuleService,
  IPricingModuleService,
  IInventoryServiceNext
} from "@medusajs/types"
import { 
  ContainerRegistrationKeys,
  Modules,
  ProductStatus
} from "@medusajs/utils"

export default async function seedDemoData({
  container,
  args
}: ExecArgs) {
  const logger: Logger = container.resolve(
    ContainerRegistrationKeys.LOGGER
  )
  const remoteLink: RemoteLink = container.resolve(
    ContainerRegistrationKeys.REMOTE_LINK
  )
  const regionModuleService: IRegionModuleService = container.resolve(
    ModuleRegistrationName.REGION
  )
  const fulfillmentModuleService: IFulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  )
  const salesChannelModuleService: ISalesChannelModuleService = container.resolve(
    ModuleRegistrationName.SALES_CHANNEL
  )
  const stockLocationModuleService: IStockLocationServiceNext = container.resolve(
    ModuleRegistrationName.STOCK_LOCATION
  )
  const apiKeyModuleService: IApiKeyModuleService = container.resolve(
    ModuleRegistrationName.API_KEY
  )
  const productModuleService: IProductModuleService = container.resolve(
    ModuleRegistrationName.PRODUCT
  )
  const pricingModuleService: IPricingModuleService = container.resolve(
    ModuleRegistrationName.PRICING
  )
  const inventoryModuleService: IInventoryServiceNext = container.resolve(
    ModuleRegistrationName.INVENTORY
  )
  
  try {
    logger.info("Seeding region data...")
    const region = await regionModuleService.create( {
      name: "Europe",
      currency_code: "eur",
      countries: [
        "gb",
        "de",
        "dk",
        "se",
        "fr",
        "es",
        "it"
      ],
      payment_providers: ["pp_system_default"]
    })
    logger.info("Finished seeding regions.")

    logger.info("Seeding fulfillment data...")
    const shippingProfile = await fulfillmentModuleService.createShippingProfiles({
      name: "Default",
      type: "default"
    })

    const fulfillmentSet = await fulfillmentModuleService.create({
      name: "European Warehouse delivery",
      type: "delivery",
      service_zones: [
        {
          name: "Europe",
          geo_zones: [
            {
              country_code: "gb",
              type: "country"
            },
            {
              country_code: "de",
              type: "country"
            },
            {
              country_code: "dk",
              type: "country"
            },
            {
              country_code: "se",
              type: "country"
            },
            {
              country_code: "fr",
              type: "country"
            },
            {
              country_code: "es",
              type: "country"
            },
            {
              country_code: "it",
              type: "country"
            }
          ],
        }
      ]
    })

    await fulfillmentModuleService.createShippingOptions([
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard"
        },
        prices: [
          {
            region_id: region.id,
            amount: 1000
          },
        ]
      },
      {
        name: "Express Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "Ship in 24 hours.",
          code: "express"
        },
        prices: [
          {
            region_id: region.id,
            amount: 1500
          },
        ]
      }
    ])
    logger.info("Finished seeding fulfillment data.")

    let defaultSalesChannel = await salesChannelModuleService.list({
      name: "Default Sales Channel"
    })
    
    if (!defaultSalesChannel.length) {
      // create the default sales channel
      defaultSalesChannel = await salesChannelModuleService.create([{
        name: "Default Sales Channel"
      }])
    }

    logger.info("Seeding stock location data...")
    const stockLocation = await stockLocationModuleService.create({
      name: "European Warehouse",
    })
    await remoteLink.create({
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: defaultSalesChannel[0].id
      },
      [Modules.STOCK_LOCATION]: {
        stock_location_id: stockLocation.id
      }
    })
    logger.info("Finished seeding stock location data.")

    logger.info("Seeding publishable API key data...")
    const publishableApiKey = await apiKeyModuleService.create({
      title: "Webshop",
      type: "publishable",
      created_by: "Seed Script"
    })
    await remoteLink.create({
      [Modules.API_KEY]: {
        publishable_key_id: publishableApiKey.id
      },
      [Modules.SALES_CHANNEL]: {
        sales_channel_id: defaultSalesChannel[0].id
      }
    })
    logger.info("Finished seeding publishable API key data.")

    logger.info("Seeding product data...")
    const shirtCategory = await productModuleService.createCategory({
      name: "Shirts"
    })
    const sweatshirtCategory = await productModuleService.createCategory({
      name: "Sweatshirts"
    })
    const pantCategory = await productModuleService.createCategory({
      name: "Pants"
    })
    const merchCategory = await productModuleService.createCategory({
      name: "Merch"
    })
    const products = await productModuleService.create([
      {
        title: "Medusa T-Shirt",
        category_ids: [shirtCategory.id],
        description: "Reimagine the feeling of a classic T-shirt. With our cotton T-shirts, everyday essentials no longer have to be ordinary.",
        handle: "t-shirt",
        weight: 400,
        status: ProductStatus.PUBLISHED,
        images: [
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-front.png"
          },
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-black-back.png"
          },
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-front.png"
          },
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/tee-white-back.png"
          }
        ],
        options: [
          {
            title: "Size",
            values: [
              "S",
              "M",
              "L",
              "XL"
            ]
          },
          {
            title: "Color",
            values: [
              "Black",
              "White"
            ]
          }
        ],
        variants: [
          {
            title: "S / Black",
            options: {
              Size: "S",
              Color: "Black"
            },
            manage_inventory: true
          },
          {
            title: "S / White",
            options: {
              Size: "S",
              Color: "White"
            },
            manage_inventory: true
          },
          {
            title: "M / Black",
            options: {
              Size: "M",
              Color: "Black"
            },
            manage_inventory: true
          },
          {
            title: "M / White",
            options: {
              Size: "M",
              Color: "White"
            },
            manage_inventory: true
          },
          {
            title: "L / Black",
            options: {
              Size: "L",
              Color: "Black"
            },
            manage_inventory: true
          },
          {
            title: "L / White",
            options: {
              Size: "L",
              Color: "White"
            },
            manage_inventory: true
          },
          {
            title: "XL / Black",
            options: {
              Size: "XL",
              Color: "Black"
            },
            manage_inventory: true
          },
          {
            title: "XL / White",
            options: {
              Size: "XL",
              Color: "White"
            },
            manage_inventory: true
          },
        ]
      },
      {
        title: "Medusa Sweatshirt",
        category_ids: [sweatshirtCategory.id],
        description: "Reimagine the feeling of a classic sweatshirt. With our cotton sweatshirt, everyday essentials no longer have to be ordinary.",
        handle: "sweatshirt",
        weight: 400,
        status: ProductStatus.PUBLISHED,
        images: [
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-front.png"
          },
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatshirt-vintage-back.png"
          },
        ],
        options: [
          {
            title: "Size",
            values: [
              "S",
              "M",
              "L",
              "XL"
            ]
          },
        ],
        variants: [
          {
            title: "S",
            options: {
              Size: "S"
            },
            manage_inventory: true
          },
          {
            title: "M",
            options: {
              Size: "M",
            },
            manage_inventory: true
          },
          {
            title: "L",
            options: {
              Size: "L",
            },
            manage_inventory: true
          },
          {
            title: "XL",
            options: {
              Size: "XL",
            },
            manage_inventory: true
          },
        ]
      },
      {
        title: "Medusa Sweatpants",
        category_ids: [pantCategory.id],
        description: "Reimagine the feeling of classic sweatpants. With our cotton sweatpants, everyday essentials no longer have to be ordinary.",
        handle: "sweatpants",
        weight: 400,
        status: ProductStatus.PUBLISHED,
        images: [
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-front.png"
          },
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/sweatpants-gray-back.png"
          },
        ],
        options: [
          {
            title: "Size",
            values: [
              "S",
              "M",
              "L",
              "XL"
            ]
          },
        ],
        variants: [
          {
            title: "S",
            options: {
              Size: "S"
            },
            manage_inventory: true
          },
          {
            title: "M",
            options: {
              Size: "M",
            },
            manage_inventory: true
          },
          {
            title: "L",
            options: {
              Size: "L",
            },
            manage_inventory: true
          },
          {
            title: "XL",
            options: {
              Size: "XL",
            },
            manage_inventory: true
          },
        ]
      },
      {
        title: "Medusa Shorts",
        category_ids: [merchCategory.id],
        description: "Reimagine the feeling of classic shorts. With our cotton shorts, everyday essentials no longer have to be ordinary.",
        handle: "shorts",
        weight: 400,
        status: ProductStatus.PUBLISHED,
        images: [
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-front.png"
          },
          {
            url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/shorts-vintage-back.png"
          },
        ],
        options: [
          {
            title: "Size",
            values: [
              "S",
              "M",
              "L",
              "XL"
            ]
          },
        ],
        variants: [
          {
            title: "S",
            options: {
              Size: "S"
            },
            manage_inventory: true
          },
          {
            title: "M",
            options: {
              Size: "M",
            },
            manage_inventory: true
          },
          {
            title: "L",
            options: {
              Size: "L",
            },
            manage_inventory: true
          },
          {
            title: "XL",
            options: {
              Size: "XL",
            },
            manage_inventory: true
          },
        ]
      }
    ])
    for (const product of products) {
      for (const variant of product.variants) {
        const priceSet = await pricingModuleService.create({
          prices: [
            {
              amount: 1000,
              currency_code: "eur",
            },
            {
              amount: 1500,
              currency_code: "usd"
            }
          ]
        })

        await remoteLink.create({
          [Modules.PRODUCT]: {
            variant_id: variant.id
          },
          [Modules.PRICING]: {
            price_set_id: priceSet.id
          }
        })

        const inventoryItem = await inventoryModuleService.create({
          sku: variant.sku
        })
        await inventoryModuleService.createInventoryLevels({
          inventory_item_id: inventoryItem.id,
          location_id: stockLocation.id,
          stocked_quantity: 100
        })

        await remoteLink.create({
          [Modules.PRODUCT]: {
            variant_id: variant.id
          },
          [Modules.INVENTORY]: {
            inventory_item_id: inventoryItem.id
          }
        })
      }
    }
    logger.info("Finished seeding product data.")

  } catch (e) {
    logger.error(`Seeding failed: ${e}`)
  }
}