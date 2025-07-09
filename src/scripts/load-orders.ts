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
  const [region] = await regionModuleService.listRegions()
  const [salesChannel] = await salesChannelModuleService.listSalesChannels()
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

  // Create orders with Belgian addresses and realistic data
  const orders = [
    {
      customer_id: customers[0].id,
      status: OrderStatus.COMPLETED,
      items: [
        {
          variant_id: productVariants[0].id,
          quantity: 2,
          title: productVariants[0].title,
          unit_price: productVariants[0].prices?.[0]?.amount || 1000,
        }
      ],
      shipping_address: {
        first_name: customers[0].first_name,
        last_name: customers[0].last_name,
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: customers[0].phone
      },
      billing_address: {
        first_name: customers[0].first_name,
        last_name: customers[0].last_name,
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: customers[0].phone
      },
      currency_code: "eur",
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      email: customers[0].email,
      metadata: {
        source: "manual-load",
        order_type: "retail"
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