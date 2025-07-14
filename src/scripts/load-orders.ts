import { ExecArgs } from "@medusajs/framework/types"
import { 
  ContainerRegistrationKeys, 
  Modules,
  OrderStatus
} from "@medusajs/framework/utils"
import { 
  createOrderWorkflow,
  convertDraftOrderWorkflow 
} from "@medusajs/medusa/core-flows"

export default async function loadOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const orderModuleService = container.resolve(Modules.ORDER)
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const regionModuleService = container.resolve(Modules.REGION)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

  logger.info("Loading orders...")

  // Get existing data
  const regions = await regionModuleService.listRegions()
  const salesChannels = await salesChannelModuleService.listSalesChannels()
  const customers = await customerModuleService.listCustomers()
  const products = await productModuleService.listProducts()

  if (!customers.length) {
    logger.error("No customers found. Please create customers first.")
    return
  }

  if (!products.length) {
    logger.error("No products found. Please create products first.")
    return
  }

  if (!regions.length) {
    logger.error("No regions found. Please create a region first.")
    return
  }

  if (!salesChannels.length) {
    logger.error("No sales channels found.")
    return
  }

  // Get product variants
  const productVariants: any[] = []
  for (const product of products) {
    const variants = await productModuleService.listProductVariants({
      product_id: product.id
    })
    productVariants.push(...variants)
  }

  if (!productVariants.length) {
    logger.error("No product variants found.")
    return
  }

  logger.info(`Found ${customers.length} customers, ${productVariants.length} variants, ${regions.length} regions, ${salesChannels.length} sales channels`)

  // Create orders with Belgian addresses and realistic data
  const orders = [
    {
      customer_id: customers[0].id,
      status: OrderStatus.COMPLETED,
      items: [
        {
          variant_id: productVariants[0].id,
          quantity: 2,
          title: productVariants[0].title || "Medusa Coffee Mug",
          unit_price: 1500, // €15.00 in cents
        }
      ],
      shipping_address: {
        first_name: customers[0].first_name || "Hannes",
        last_name: customers[0].last_name || "Depauw",
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: customers[0].phone || "+32 123 456 789"
      },
      billing_address: {
        first_name: customers[0].first_name || "Hannes",
        last_name: customers[0].last_name || "Depauw",
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: customers[0].phone || "+32 123 456 789"
      },
      currency_code: "eur",
      region_id: regions[0].id,
      sales_channel_id: salesChannels[0].id,
      email: customers[0].email,
      metadata: {
        source: "manual-load",
        order_type: "retail"
      }
    },
    {
      customer_id: customers[0].id,
      status: OrderStatus.PENDING,
      items: [
        {
          variant_id: productVariants[1]?.id || productVariants[0].id,
          quantity: 1,
          title: productVariants[1]?.title || "Medusa Sweatpants",
          unit_price: 3500, // €35.00 in cents
        }
      ],
      shipping_address: {
        first_name: customers[0].first_name || "Hannes",
        last_name: customers[0].last_name || "Depauw",
        address_1: "Avenue Louise 456",
        city: "Brussels",
        country_code: "be",
        postal_code: "1050",
        phone: customers[0].phone || "+32 123 456 789"
      },
      billing_address: {
        first_name: customers[0].first_name || "Hannes",
        last_name: customers[0].last_name || "Depauw",
        address_1: "Avenue Louise 456",
        city: "Brussels",
        country_code: "be",
        postal_code: "1050",
        phone: customers[0].phone || "+32 123 456 789"
      },
      currency_code: "eur",
      region_id: regions[0].id,
      sales_channel_id: salesChannels[0].id,
      email: customers[0].email,
      metadata: {
        source: "manual-load",
        order_type: "online"
      }
    },
    {
      customer_id: customers[0].id,
      status: OrderStatus.COMPLETED,
      items: [
        {
          variant_id: productVariants[2]?.id || productVariants[0].id,
          quantity: 3,
          title: productVariants[2]?.title || "Medusa Coffee Mug",
          unit_price: 1500, // €15.00 in cents
        },
        {
          variant_id: productVariants[3]?.id || productVariants[1]?.id || productVariants[0].id,
          quantity: 1,
          title: productVariants[3]?.title || "Medusa Sweatpants",
          unit_price: 3500, // €35.00 in cents
        }
      ],
      shipping_address: {
        first_name: customers[0].first_name || "Hannes",
        last_name: customers[0].last_name || "Depauw",
        address_1: "Rue du Commerce 789",
        city: "Antwerp",
        country_code: "be",
        postal_code: "2000",
        phone: customers[0].phone || "+32 123 456 789"
      },
      billing_address: {
        first_name: customers[0].first_name || "Hannes",
        last_name: customers[0].last_name || "Depauw",
        address_1: "Rue du Commerce 789",
        city: "Antwerp",
        country_code: "be",
        postal_code: "2000",
        phone: customers[0].phone || "+32 123 456 789"
      },
      currency_code: "eur",
      region_id: regions[0].id,
      sales_channel_id: salesChannels[0].id,
      email: customers[0].email,
      metadata: {
        source: "manual-load",
        order_type: "wholesale"
      }
    }
  ]

  // Create orders
  for (const orderData of orders) {
    try {
      const { result: order } = await createOrderWorkflow(container).run({
        input: orderData
      })
      
      logger.info(`Created order: ${order.display_id} (${orderData.status})`)
    } catch (error) {
      logger.error(`Failed to create order for customer ${orderData.customer_id}:`, error)
    }
  }

  logger.info("Finished loading orders!")
} 