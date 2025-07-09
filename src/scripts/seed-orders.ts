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

export default async function seedOrders({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const orderModuleService = container.resolve(Modules.ORDER)
  const customerModuleService = container.resolve(Modules.CUSTOMER)
  const productModuleService = container.resolve(Modules.PRODUCT)
  const regionModuleService = container.resolve(Modules.REGION)
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL)

  logger.info("Seeding sample orders...")

  // Get existing data
  const [region] = await regionModuleService.listRegions()
  const [salesChannel] = await salesChannelModuleService.listSalesChannels()
  const customers = await customerModuleService.listCustomers()
  const products = await productModuleService.listProducts()

  if (!customers.length) {
    logger.info("No customers found. Creating sample customers first...")
    await customerModuleService.createCustomers([
      {
        email: "john.doe@example.com",
        first_name: "John",
        last_name: "Doe",
        phone: "+32 123 456 789",
        metadata: {
          country: "Belgium"
        }
      },
      {
        email: "jane.smith@example.com", 
        first_name: "Jane",
        last_name: "Smith",
        phone: "+32 987 654 321",
        metadata: {
          country: "Belgium"
        }
      },
      {
        email: "pierre.dubois@example.com",
        first_name: "Pierre",
        last_name: "Dubois", 
        phone: "+32 555 123 456",
        metadata: {
          country: "Belgium"
        }
      }
    ])
    const newCustomers = await customerModuleService.listCustomers()
    customers.push(...newCustomers)
  }

  if (!products.length) {
    logger.info("No products found. Please run the main seed script first to create products.")
    return
  }

  // Get product variants for orders
  const productVariants: any[] = []
  for (const product of products) {
    const variants = await productModuleService.listProductVariants({
      product_id: product.id
    })
    productVariants.push(...variants)
  }

  if (!productVariants.length) {
    logger.info("No product variants found. Please run the main seed script first to create products.")
    return
  }

  // Sample order data
  const sampleOrders = [
    {
      customer: customers[0],
      status: OrderStatus.COMPLETED,
      payment_status: "captured",
      fulfillment_status: "fulfilled",
      items: [
        {
          variant_id: productVariants[0].id,
          quantity: 2,
          title: productVariants[0].title || "T-Shirt",
          unit_price: 1000, // €10.00 in cents
        }
      ],
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: "+32 123 456 789"
      },
      billing_address: {
        first_name: "John", 
        last_name: "Doe",
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: "+32 123 456 789"
      },
      currency_code: "eur",
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      email: "john.doe@example.com",
      metadata: {
        source: "seed-script",
        order_type: "retail"
      }
    },
    {
      customer: customers[1],
      status: OrderStatus.PENDING,
      payment_status: "awaiting",
      fulfillment_status: "not_fulfilled",
      items: [
        {
          variant_id: productVariants[1]?.id || productVariants[0].id,
          quantity: 1,
          title: productVariants[1]?.title || "Sweatshirt",
          unit_price: 2500, // €25.00 in cents
        },
        {
          variant_id: productVariants[2]?.id || productVariants[0].id,
          quantity: 3,
          title: productVariants[2]?.title || "T-Shirt",
          unit_price: 1000, // €10.00 in cents
        }
      ],
      shipping_address: {
        first_name: "Jane",
        last_name: "Smith", 
        address_1: "Avenue Louise 456",
        city: "Brussels",
        country_code: "be",
        postal_code: "1050",
        phone: "+32 987 654 321"
      },
      billing_address: {
        first_name: "Jane",
        last_name: "Smith",
        address_1: "Avenue Louise 456", 
        city: "Brussels",
        country_code: "be",
        postal_code: "1050",
        phone: "+32 987 654 321"
      },
      currency_code: "eur",
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      email: "jane.smith@example.com",
      metadata: {
        source: "seed-script",
        order_type: "online"
      }
    },
    {
      customer: customers[2],
      status: OrderStatus.COMPLETED,
      payment_status: "captured",
      fulfillment_status: "shipped",
      items: [
        {
          variant_id: productVariants[3]?.id || productVariants[0].id,
          quantity: 1,
          title: productVariants[3]?.title || "T-Shirt",
          unit_price: 1000, // €10.00 in cents
        }
      ],
      shipping_address: {
        first_name: "Pierre",
        last_name: "Dubois",
        address_1: "Rue du Commerce 789",
        city: "Antwerp",
        country_code: "be", 
        postal_code: "2000",
        phone: "+32 555 123 456"
      },
      billing_address: {
        first_name: "Pierre",
        last_name: "Dubois",
        address_1: "Rue du Commerce 789",
        city: "Antwerp", 
        country_code: "be",
        postal_code: "2000",
        phone: "+32 555 123 456"
      },
      currency_code: "eur",
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      email: "pierre.dubois@example.com",
      metadata: {
        source: "seed-script",
        order_type: "wholesale"
      }
    },
    {
      customer: customers[0],
      status: OrderStatus.DRAFT,
      payment_status: "not_paid",
      fulfillment_status: "not_fulfilled",
      items: [
        {
          variant_id: productVariants[4]?.id || productVariants[0].id,
          quantity: 2,
          title: productVariants[4]?.title || "T-Shirt",
          unit_price: 1000, // €10.00 in cents
        }
      ],
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: "+32 123 456 789"
      },
      billing_address: {
        first_name: "John",
        last_name: "Doe", 
        address_1: "Rue de la Loi 123",
        city: "Brussels",
        country_code: "be",
        postal_code: "1000",
        phone: "+32 123 456 789"
      },
      currency_code: "eur",
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      email: "john.doe@example.com",
      metadata: {
        source: "seed-script",
        order_type: "draft"
      }
    },
    {
      customer: customers[1],
      status: OrderStatus.CANCELED,
      payment_status: "canceled",
      fulfillment_status: "canceled",
      items: [
        {
          variant_id: productVariants[5]?.id || productVariants[0].id,
          quantity: 1,
          title: productVariants[5]?.title || "Sweatshirt",
          unit_price: 2500, // €25.00 in cents
        }
      ],
      shipping_address: {
        first_name: "Jane",
        last_name: "Smith",
        address_1: "Avenue Louise 456",
        city: "Brussels",
        country_code: "be",
        postal_code: "1050",
        phone: "+32 987 654 321"
      },
      billing_address: {
        first_name: "Jane",
        last_name: "Smith",
        address_1: "Avenue Louise 456",
        city: "Brussels",
        country_code: "be",
        postal_code: "1050",
        phone: "+32 987 654 321"
      },
      currency_code: "eur",
      region_id: region.id,
      sales_channel_id: salesChannel.id,
      email: "jane.smith@example.com",
      metadata: {
        source: "seed-script",
        order_type: "canceled",
        cancel_reason: "Customer request"
      }
    }
  ]

  // Create orders
  for (const orderData of sampleOrders) {
    try {
      if (orderData.status === OrderStatus.DRAFT) {
        // Create as draft order first
        const { result: draftOrder } = await createOrderWorkflow(container).run({
          input: {
            ...orderData,
            status: OrderStatus.DRAFT
          }
        })
        
        // Convert draft to regular order
        await convertDraftOrderWorkflow(container).run({
          input: {
            id: draftOrder.id
          }
        })
        
        logger.info(`Created order from draft: ${draftOrder.display_id}`)
      } else {
        // Create regular order
        const { result: order } = await createOrderWorkflow(container).run({
          input: orderData
        })
        
        logger.info(`Created order: ${order.display_id} (${orderData.status})`)
      }
    } catch (error) {
      logger.error(`Failed to create order for ${orderData.customer.email}:`, error)
    }
  }

  logger.info("Finished seeding orders!")
} 