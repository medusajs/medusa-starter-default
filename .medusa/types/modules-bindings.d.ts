import type Cache from '@medusajs/medusa/cache-inmemory'
import type EventBus from '@medusajs/medusa/event-bus-local'
import type Workflows from '@medusajs/medusa/workflow-engine-inmemory'
import type Locking from '@medusajs/medusa/locking'
import type StockLocation from '@medusajs/medusa/stock-location'
import type Inventory from '@medusajs/medusa/inventory'
import type Product from '@medusajs/medusa/product'
import type Pricing from '@medusajs/medusa/pricing'
import type Promotion from '@medusajs/medusa/promotion'
import type Customer from '@medusajs/medusa/customer'
import type SalesChannel from '@medusajs/medusa/sales-channel'
import type Cart from '@medusajs/medusa/cart'
import type Region from '@medusajs/medusa/region'
import type ApiKey from '@medusajs/medusa/api-key'
import type Store from '@medusajs/medusa/store'
import type Tax from '@medusajs/medusa/tax'
import type Currency from '@medusajs/medusa/currency'
import type Payment from '@medusajs/medusa/payment'
import type Order from '@medusajs/medusa/order'
import type Auth from '@medusajs/medusa/auth'
import type User from '@medusajs/medusa/user'
import type File from '@medusajs/medusa/file'
import type Fulfillment from '@medusajs/medusa/fulfillment'
import type Notification from '@medusajs/medusa/notification'

declare module '@medusajs/framework/types' {
  interface ModuleImplementations {
    cache: InstanceType<(typeof Cache)['service']>,
    event_bus: InstanceType<(typeof EventBus)['service']>,
    workflows: InstanceType<(typeof Workflows)['service']>,
    locking: InstanceType<(typeof Locking)['service']>,
    stock_location: InstanceType<(typeof StockLocation)['service']>,
    inventory: InstanceType<(typeof Inventory)['service']>,
    product: InstanceType<(typeof Product)['service']>,
    pricing: InstanceType<(typeof Pricing)['service']>,
    promotion: InstanceType<(typeof Promotion)['service']>,
    customer: InstanceType<(typeof Customer)['service']>,
    sales_channel: InstanceType<(typeof SalesChannel)['service']>,
    cart: InstanceType<(typeof Cart)['service']>,
    region: InstanceType<(typeof Region)['service']>,
    api_key: InstanceType<(typeof ApiKey)['service']>,
    store: InstanceType<(typeof Store)['service']>,
    tax: InstanceType<(typeof Tax)['service']>,
    currency: InstanceType<(typeof Currency)['service']>,
    payment: InstanceType<(typeof Payment)['service']>,
    order: InstanceType<(typeof Order)['service']>,
    auth: InstanceType<(typeof Auth)['service']>,
    user: InstanceType<(typeof User)['service']>,
    file: InstanceType<(typeof File)['service']>,
    fulfillment: InstanceType<(typeof Fulfillment)['service']>,
    notification: InstanceType<(typeof Notification)['service']>
  }
}