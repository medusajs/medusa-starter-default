import "@medusajs/framework/types"
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date | string; output: Date | string; }
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type StockLocationAddress = {
  __typename?: 'StockLocationAddress';
  id: Maybe<Scalars['ID']['output']>;
  address_1: Scalars['String']['output'];
  address_2: Maybe<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  country_code: Scalars['String']['output'];
  city: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type StockLocation = {
  __typename?: 'StockLocation';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  address_id: Scalars['ID']['output'];
  address: Maybe<StockLocationAddress>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  fulfillment_provider_link: Maybe<Array<Maybe<LinkLocationFulfillmentProvider>>>;
  fulfillment_providers: Maybe<Array<Maybe<FulfillmentProvider>>>;
  fulfillment_set_link: Maybe<Array<Maybe<LinkLocationFulfillmentSet>>>;
  fulfillment_sets: Maybe<Array<Maybe<FulfillmentSet>>>;
  sales_channels_link: Maybe<Array<Maybe<LinkSalesChannelStockLocation>>>;
  sales_channels: Maybe<Array<Maybe<SalesChannel>>>;
};

export type InventoryItem = {
  __typename?: 'InventoryItem';
  id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  sku: Maybe<Scalars['String']['output']>;
  origin_country: Maybe<Scalars['String']['output']>;
  hs_code: Maybe<Scalars['String']['output']>;
  mid_code: Maybe<Scalars['String']['output']>;
  material: Maybe<Scalars['String']['output']>;
  weight: Maybe<Scalars['Int']['output']>;
  length: Maybe<Scalars['Int']['output']>;
  height: Maybe<Scalars['Int']['output']>;
  width: Maybe<Scalars['Int']['output']>;
  requires_shipping: Scalars['Boolean']['output'];
  description: Maybe<Scalars['String']['output']>;
  title: Maybe<Scalars['String']['output']>;
  thumbnail: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  location_levels: Maybe<Array<Maybe<InventoryLevel>>>;
  variant_link: Maybe<Array<Maybe<LinkProductVariantInventoryItem>>>;
  variants: Maybe<Array<Maybe<ProductVariant>>>;
};

export type InventoryLevel = {
  __typename?: 'InventoryLevel';
  id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  inventory_item_id: Scalars['String']['output'];
  inventory_item: InventoryItem;
  location_id: Scalars['String']['output'];
  stocked_quantity: Scalars['Int']['output'];
  reserved_quantity: Scalars['Int']['output'];
  incoming_quantity: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  stock_locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type ReservationItem = {
  __typename?: 'ReservationItem';
  id: Scalars['ID']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  line_item_id: Maybe<Scalars['String']['output']>;
  inventory_item_id: Scalars['String']['output'];
  inventory_item: InventoryItem;
  location_id: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  external_id: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
};

export type PromotionTypeEnum =
  | 'standard'
  | 'buyget';

export type PromotionStatusEnum =
  | 'draft'
  | 'active'
  | 'inactive';

export type ApplicationMethod = {
  __typename?: 'ApplicationMethod';
  promotion: Promotion;
  id: Scalars['ID']['output'];
  value: Maybe<Scalars['Float']['output']>;
  currency_code: Maybe<Scalars['String']['output']>;
  max_quantity: Maybe<Scalars['Int']['output']>;
  apply_to_quantity: Maybe<Scalars['Int']['output']>;
  buy_rules_min_quantity: Maybe<Scalars['Int']['output']>;
  type: ApplicationMethodTypeEnum;
  target_type: ApplicationMethodTargetTypeEnum;
  allocation: Maybe<ApplicationMethodAllocationEnum>;
  promotion_id: Scalars['String']['output'];
  target_rules: Array<Maybe<PromotionRule>>;
  buy_rules: Array<Maybe<PromotionRule>>;
  raw_value: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Promotion = {
  __typename?: 'Promotion';
  id: Scalars['ID']['output'];
  code: Scalars['String']['output'];
  is_automatic: Scalars['Boolean']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  limit: Maybe<Scalars['Int']['output']>;
  used: Scalars['Int']['output'];
  type: PromotionTypeEnum;
  status: PromotionStatusEnum;
  campaign_id: Maybe<Scalars['String']['output']>;
  campaign: Maybe<Campaign>;
  application_method: Maybe<ApplicationMethod>;
  rules: Array<Maybe<PromotionRule>>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  order_link: Maybe<LinkOrderPromotion>;
};

export type ApplicationMethodTypeEnum =
  | 'fixed'
  | 'percentage';

export type ApplicationMethodTargetTypeEnum =
  | 'order'
  | 'shipping_methods'
  | 'items';

export type ApplicationMethodAllocationEnum =
  | 'each'
  | 'across'
  | 'once';

export type CampaignBudget = {
  __typename?: 'CampaignBudget';
  campaign: Campaign;
  id: Scalars['ID']['output'];
  type: CampaignBudgetTypeEnum;
  currency_code: Maybe<Scalars['String']['output']>;
  limit: Maybe<Scalars['Float']['output']>;
  used: Scalars['Float']['output'];
  campaign_id: Scalars['String']['output'];
  attribute: Maybe<Scalars['String']['output']>;
  usages: Array<Maybe<CampaignBudgetUsage>>;
  raw_limit: Maybe<Scalars['JSON']['output']>;
  raw_used: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Campaign = {
  __typename?: 'Campaign';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  campaign_identifier: Scalars['String']['output'];
  starts_at: Maybe<Scalars['DateTime']['output']>;
  ends_at: Maybe<Scalars['DateTime']['output']>;
  budget: Maybe<CampaignBudget>;
  promotions: Array<Maybe<Promotion>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CampaignBudgetTypeEnum =
  | 'spend'
  | 'usage'
  | 'use_by_attribute'
  | 'spend_by_attribute';

export type CampaignBudgetUsage = {
  __typename?: 'CampaignBudgetUsage';
  id: Scalars['ID']['output'];
  attribute_value: Scalars['String']['output'];
  used: Scalars['Float']['output'];
  budget_id: Scalars['String']['output'];
  budget: CampaignBudget;
  raw_used: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PromotionRuleOperatorEnum =
  | 'gte'
  | 'lte'
  | 'gt'
  | 'lt'
  | 'eq'
  | 'ne'
  | 'in';

export type PromotionRule = {
  __typename?: 'PromotionRule';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  attribute: Scalars['String']['output'];
  operator: PromotionRuleOperatorEnum;
  values: Array<Maybe<PromotionRuleValue>>;
  promotions: Array<Maybe<Promotion>>;
  method_target_rules: Array<Maybe<ApplicationMethod>>;
  method_buy_rules: Array<Maybe<ApplicationMethod>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PromotionRuleValue = {
  __typename?: 'PromotionRuleValue';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  promotion_rule_id: Scalars['String']['output'];
  promotion_rule: PromotionRule;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductStatus =
  | 'draft'
  | 'proposed'
  | 'published'
  | 'rejected';

export type Product = {
  __typename?: 'Product';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  subtitle: Maybe<Scalars['String']['output']>;
  description: Maybe<Scalars['String']['output']>;
  is_giftcard: Scalars['Boolean']['output'];
  status: ProductStatus;
  thumbnail: Maybe<Scalars['String']['output']>;
  width: Maybe<Scalars['Float']['output']>;
  weight: Maybe<Scalars['Float']['output']>;
  length: Maybe<Scalars['Float']['output']>;
  height: Maybe<Scalars['Float']['output']>;
  origin_country: Maybe<Scalars['String']['output']>;
  hs_code: Maybe<Scalars['String']['output']>;
  mid_code: Maybe<Scalars['String']['output']>;
  material: Maybe<Scalars['String']['output']>;
  collection: Maybe<ProductCollection>;
  collection_id: Maybe<Scalars['String']['output']>;
  categories: Maybe<Array<Maybe<ProductCategory>>>;
  type: Maybe<ProductType>;
  type_id: Maybe<Scalars['String']['output']>;
  tags: Array<ProductTag>;
  variants: Array<ProductVariant>;
  options: Array<ProductOption>;
  images: Array<ProductImage>;
  discountable: Maybe<Scalars['Boolean']['output']>;
  external_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  sales_channels_link: Maybe<Array<Maybe<LinkProductSalesChannel>>>;
  sales_channels: Maybe<Array<Maybe<SalesChannel>>>;
  shipping_profiles_link: Maybe<LinkProductShippingProfile>;
  shipping_profile: Maybe<ShippingProfile>;
};

export type ProductVariant = {
  __typename?: 'ProductVariant';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  sku: Maybe<Scalars['String']['output']>;
  barcode: Maybe<Scalars['String']['output']>;
  ean: Maybe<Scalars['String']['output']>;
  upc: Maybe<Scalars['String']['output']>;
  allow_backorder: Scalars['Boolean']['output'];
  manage_inventory: Scalars['Boolean']['output'];
  requires_shipping: Scalars['Boolean']['output'];
  hs_code: Maybe<Scalars['String']['output']>;
  origin_country: Maybe<Scalars['String']['output']>;
  mid_code: Maybe<Scalars['String']['output']>;
  material: Maybe<Scalars['String']['output']>;
  weight: Maybe<Scalars['Float']['output']>;
  length: Maybe<Scalars['Float']['output']>;
  height: Maybe<Scalars['Float']['output']>;
  width: Maybe<Scalars['Float']['output']>;
  options: Array<ProductOptionValue>;
  images: Array<ProductImage>;
  thumbnail: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  product: Maybe<Product>;
  product_id: Maybe<Scalars['String']['output']>;
  variant_rank: Maybe<Scalars['Int']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  order_items: Maybe<Array<Maybe<OrderLineItem>>>;
  inventory_items: Maybe<Array<Maybe<LinkProductVariantInventoryItem>>>;
  inventory: Maybe<Array<Maybe<InventoryItem>>>;
  price_set_link: Maybe<LinkProductVariantPriceSet>;
  price_set: Maybe<PriceSet>;
};

export type ProductCategory = {
  __typename?: 'ProductCategory';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  is_active: Scalars['Boolean']['output'];
  is_internal: Scalars['Boolean']['output'];
  rank: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  parent_category: Maybe<ProductCategory>;
  parent_category_id: Maybe<Scalars['String']['output']>;
  category_children: Array<ProductCategory>;
  products: Array<Product>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductTag = {
  __typename?: 'ProductTag';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  products: Maybe<Array<Maybe<Product>>>;
};

export type ProductCollection = {
  __typename?: 'ProductCollection';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  handle: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  products: Maybe<Array<Maybe<Product>>>;
};

export type ProductType = {
  __typename?: 'ProductType';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductOption = {
  __typename?: 'ProductOption';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  product: Maybe<Product>;
  product_id: Maybe<Scalars['String']['output']>;
  values: Array<ProductOptionValue>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductImage = {
  __typename?: 'ProductImage';
  id: Scalars['ID']['output'];
  url: Scalars['String']['output'];
  rank: Scalars['Int']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProductOptionValue = {
  __typename?: 'ProductOptionValue';
  id: Scalars['ID']['output'];
  value: Scalars['String']['output'];
  option: Maybe<ProductOption>;
  option_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PriceSet = {
  __typename?: 'PriceSet';
  id: Scalars['ID']['output'];
  prices: Array<Maybe<Price>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  variant_link: Maybe<LinkProductVariantPriceSet>;
  variant: Maybe<ProductVariant>;
  shipping_option_link: Maybe<LinkShippingOptionPriceSet>;
  shipping_option: Maybe<ShippingOption>;
};

export type PriceListStatusEnum =
  | 'active'
  | 'draft';

export type PriceListTypeEnum =
  | 'sale'
  | 'override';

export type PriceList = {
  __typename?: 'PriceList';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  description: Scalars['String']['output'];
  status: PriceListStatusEnum;
  type: PriceListTypeEnum;
  starts_at: Maybe<Scalars['DateTime']['output']>;
  ends_at: Maybe<Scalars['DateTime']['output']>;
  rules_count: Maybe<Scalars['Int']['output']>;
  prices: Array<Maybe<Price>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Price = {
  __typename?: 'Price';
  id: Scalars['ID']['output'];
  title: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  min_quantity: Maybe<Scalars['Float']['output']>;
  max_quantity: Maybe<Scalars['Float']['output']>;
  rules_count: Maybe<Scalars['Int']['output']>;
  price_set_id: Scalars['String']['output'];
  price_set: PriceSet;
  price_list_id: Maybe<Scalars['String']['output']>;
  price_list: Maybe<PriceList>;
  raw_amount: Scalars['JSON']['output'];
  raw_min_quantity: Maybe<Scalars['JSON']['output']>;
  raw_max_quantity: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PricePreference = {
  __typename?: 'PricePreference';
  id: Scalars['ID']['output'];
  attribute: Scalars['String']['output'];
  value: Maybe<Scalars['String']['output']>;
  is_tax_inclusive: Scalars['Boolean']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerAddress = {
  __typename?: 'CustomerAddress';
  id: Scalars['ID']['output'];
  address_name: Maybe<Scalars['String']['output']>;
  is_default_shipping: Scalars['Boolean']['output'];
  is_default_billing: Scalars['Boolean']['output'];
  company: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  customer_id: Scalars['String']['output'];
  customer: Customer;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerGroupCustomer = {
  __typename?: 'CustomerGroupCustomer';
  id: Scalars['ID']['output'];
  created_by: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  customer_id: Scalars['String']['output'];
  customer: Customer;
  customer_group_id: Scalars['String']['output'];
  customer_group: CustomerGroup;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type CustomerGroup = {
  __typename?: 'CustomerGroup';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  customers: Array<Maybe<Customer>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Customer = {
  __typename?: 'Customer';
  id: Scalars['ID']['output'];
  company_name: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  has_account: Scalars['Boolean']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  groups: Array<Maybe<CustomerGroup>>;
  addresses: Array<Maybe<CustomerAddress>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  carts: Maybe<Array<Maybe<Cart>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  account_holder_link: Maybe<Array<Maybe<LinkCustomerAccountHolder>>>;
  account_holders: Maybe<Array<Maybe<AccountHolder>>>;
};

export type Cart = {
  __typename?: 'Cart';
  id: Scalars['ID']['output'];
  region_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  sales_channel_id: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  locale: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  completed_at: Maybe<Scalars['DateTime']['output']>;
  shipping_address_id: Maybe<Scalars['String']['output']>;
  shipping_address: Maybe<Address>;
  billing_address_id: Maybe<Scalars['String']['output']>;
  billing_address: Maybe<Address>;
  items: Array<Maybe<LineItem>>;
  credit_lines: Array<Maybe<CreditLine>>;
  shipping_methods: Array<Maybe<ShippingMethod>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer: Maybe<Customer>;
  region: Maybe<Region>;
  sales_channel: Maybe<SalesChannel>;
  payment_collection_link: Maybe<LinkCartPaymentCollection>;
  payment_collection: Maybe<PaymentCollection>;
  cart_link: Maybe<Array<Maybe<LinkCartPromotion>>>;
  promotions: Maybe<Array<Maybe<Promotion>>>;
  order_link: Maybe<LinkOrderCart>;
  order: Maybe<Order>;
};

export type CreditLine = {
  __typename?: 'CreditLine';
  id: Scalars['ID']['output'];
  cart_id: Scalars['String']['output'];
  cart: Cart;
  reference: Maybe<Scalars['String']['output']>;
  reference_id: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  raw_amount: Scalars['JSON']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Address = {
  __typename?: 'Address';
  id: Scalars['ID']['output'];
  customer_id: Maybe<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type LineItem = {
  __typename?: 'LineItem';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  subtitle: Maybe<Scalars['String']['output']>;
  thumbnail: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  variant_id: Maybe<Scalars['String']['output']>;
  product_id: Maybe<Scalars['String']['output']>;
  product_title: Maybe<Scalars['String']['output']>;
  product_description: Maybe<Scalars['String']['output']>;
  product_subtitle: Maybe<Scalars['String']['output']>;
  product_type: Maybe<Scalars['String']['output']>;
  product_type_id: Maybe<Scalars['String']['output']>;
  product_collection: Maybe<Scalars['String']['output']>;
  product_handle: Maybe<Scalars['String']['output']>;
  variant_sku: Maybe<Scalars['String']['output']>;
  variant_barcode: Maybe<Scalars['String']['output']>;
  variant_title: Maybe<Scalars['String']['output']>;
  variant_option_values: Maybe<Scalars['JSON']['output']>;
  requires_shipping: Scalars['Boolean']['output'];
  is_discountable: Scalars['Boolean']['output'];
  is_giftcard: Scalars['Boolean']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  is_custom_price: Scalars['Boolean']['output'];
  compare_at_unit_price: Maybe<Scalars['Float']['output']>;
  unit_price: Scalars['Float']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  adjustments: Array<Maybe<LineItemAdjustment>>;
  tax_lines: Array<Maybe<LineItemTaxLine>>;
  cart_id: Scalars['String']['output'];
  cart: Cart;
  raw_compare_at_unit_price: Maybe<Scalars['JSON']['output']>;
  raw_unit_price: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  variant: Maybe<ProductVariant>;
};

export type LineItemAdjustment = {
  __typename?: 'LineItemAdjustment';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  item_id: Scalars['String']['output'];
  item: LineItem;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  promotion: Maybe<Promotion>;
};

export type LineItemTaxLine = {
  __typename?: 'LineItemTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  item_id: Scalars['String']['output'];
  item: LineItem;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingMethod = {
  __typename?: 'ShippingMethod';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['JSON']['output']>;
  amount: Scalars['Float']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  shipping_option_id: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  cart_id: Scalars['String']['output'];
  cart: Cart;
  tax_lines: Array<Maybe<ShippingMethodTaxLine>>;
  adjustments: Array<Maybe<ShippingMethodAdjustment>>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingMethodAdjustment = {
  __typename?: 'ShippingMethodAdjustment';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Maybe<Scalars['String']['output']>;
  amount: Scalars['Float']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  shipping_method_id: Scalars['String']['output'];
  shipping_method: ShippingMethod;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingMethodTaxLine = {
  __typename?: 'ShippingMethodTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Scalars['Float']['output'];
  provider_id: Maybe<Scalars['String']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  shipping_method_id: Scalars['String']['output'];
  shipping_method: ShippingMethod;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type SalesChannel = {
  __typename?: 'SalesChannel';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  is_disabled: Scalars['Boolean']['output'];
  created_at: Scalars['DateTime']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  carts: Maybe<Array<Maybe<Cart>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  products_link: Maybe<Array<Maybe<LinkProductSalesChannel>>>;
  api_keys_link: Maybe<Array<Maybe<LinkPublishableApiKeySalesChannel>>>;
  publishable_api_keys: Maybe<Array<Maybe<ApiKey>>>;
  locations_link: Maybe<Array<Maybe<LinkSalesChannelStockLocation>>>;
  stock_locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type Store = {
  __typename?: 'Store';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  default_sales_channel_id: Maybe<Scalars['String']['output']>;
  default_region_id: Maybe<Scalars['String']['output']>;
  default_location_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  supported_currencies: Array<Maybe<StoreCurrency>>;
  supported_locales: Array<Maybe<StoreLocale>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type StoreCurrency = {
  __typename?: 'StoreCurrency';
  id: Scalars['ID']['output'];
  currency_code: Scalars['String']['output'];
  is_default: Scalars['Boolean']['output'];
  store_id: Maybe<Scalars['String']['output']>;
  store: Maybe<Store>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  currency: Maybe<Currency>;
};

export type StoreLocale = {
  __typename?: 'StoreLocale';
  id: Scalars['ID']['output'];
  locale_code: Scalars['String']['output'];
  store_id: Maybe<Scalars['String']['output']>;
  store: Maybe<Store>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ChangeActionType =
  | 'CANCEL_RETURN_ITEM'
  | 'FULFILL_ITEM'
  | 'CANCEL_ITEM_FULFILLMENT'
  | 'ITEM_ADD'
  | 'ITEM_REMOVE'
  | 'ITEM_UPDATE'
  | 'RECEIVE_DAMAGED_RETURN_ITEM'
  | 'RECEIVE_RETURN_ITEM'
  | 'RETURN_ITEM'
  | 'SHIPPING_ADD'
  | 'SHIPPING_REMOVE'
  | 'SHIP_ITEM'
  | 'WRITE_OFF_ITEM'
  | 'REINSTATE_ITEM';

export type OrderSummary = {
  __typename?: 'OrderSummary';
  pending_difference: Maybe<Scalars['Float']['output']>;
  current_order_total: Maybe<Scalars['Float']['output']>;
  original_order_total: Maybe<Scalars['Float']['output']>;
  transaction_total: Maybe<Scalars['Float']['output']>;
  paid_total: Maybe<Scalars['Float']['output']>;
  refunded_total: Maybe<Scalars['Float']['output']>;
  credit_line_total: Maybe<Scalars['Float']['output']>;
  accounting_total: Maybe<Scalars['Float']['output']>;
  raw_pending_difference: Maybe<Scalars['JSON']['output']>;
  raw_current_order_total: Maybe<Scalars['JSON']['output']>;
  raw_original_order_total: Maybe<Scalars['JSON']['output']>;
  raw_transaction_total: Maybe<Scalars['JSON']['output']>;
  raw_paid_total: Maybe<Scalars['JSON']['output']>;
  raw_refunded_total: Maybe<Scalars['JSON']['output']>;
  raw_credit_line_total: Maybe<Scalars['JSON']['output']>;
  raw_accounting_total: Maybe<Scalars['JSON']['output']>;
};

export type OrderShippingMethodAdjustment = {
  __typename?: 'OrderShippingMethodAdjustment';
  id: Scalars['ID']['output'];
  code: Maybe<Scalars['String']['output']>;
  amount: Maybe<Scalars['Float']['output']>;
  order_id: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  shipping_method: Maybe<OrderShippingMethod>;
  shipping_method_id: Scalars['String']['output'];
};

export type OrderLineItemAdjustment = {
  __typename?: 'OrderLineItemAdjustment';
  id: Scalars['ID']['output'];
  code: Maybe<Scalars['String']['output']>;
  amount: Maybe<Scalars['Float']['output']>;
  order_id: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  promotion_id: Maybe<Scalars['String']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  item: Maybe<OrderLineItem>;
  item_id: Scalars['String']['output'];
};

export type OrderShippingMethodTaxLine = {
  __typename?: 'OrderShippingMethodTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Maybe<Scalars['Float']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  shipping_method: Maybe<OrderShippingMethod>;
  shipping_method_id: Scalars['String']['output'];
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
};

export type OrderLineItemTaxLine = {
  __typename?: 'OrderLineItemTaxLine';
  id: Scalars['ID']['output'];
  description: Maybe<Scalars['String']['output']>;
  tax_rate_id: Maybe<Scalars['String']['output']>;
  code: Scalars['String']['output'];
  rate: Maybe<Scalars['Float']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  item: Maybe<OrderLineItem>;
  item_id: Scalars['String']['output'];
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
};

export type OrderAddress = {
  __typename?: 'OrderAddress';
  id: Scalars['ID']['output'];
  customer_id: Maybe<Scalars['String']['output']>;
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  phone: Maybe<Scalars['String']['output']>;
  company: Maybe<Scalars['String']['output']>;
  address_1: Maybe<Scalars['String']['output']>;
  address_2: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  country_code: Maybe<Scalars['String']['output']>;
  province: Maybe<Scalars['String']['output']>;
  postal_code: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderShippingMethod = {
  __typename?: 'OrderShippingMethod';
  id: Scalars['ID']['output'];
  order_id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  amount: Maybe<Scalars['Float']['output']>;
  raw_amount: Maybe<Scalars['JSON']['output']>;
  is_tax_inclusive: Maybe<Scalars['Boolean']['output']>;
  shipping_option_id: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  tax_lines: Maybe<Array<Maybe<OrderShippingMethodTaxLine>>>;
  adjustments: Maybe<Array<Maybe<OrderShippingMethodAdjustment>>>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
  original_total: Maybe<Scalars['Float']['output']>;
  original_subtotal: Maybe<Scalars['Float']['output']>;
  original_tax_total: Maybe<Scalars['Float']['output']>;
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  tax_total: Maybe<Scalars['Float']['output']>;
  discount_total: Maybe<Scalars['Float']['output']>;
  discount_tax_total: Maybe<Scalars['Float']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
};

export type OrderLineItem = {
  __typename?: 'OrderLineItem';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  subtitle: Maybe<Scalars['String']['output']>;
  thumbnail: Maybe<Scalars['String']['output']>;
  variant_id: Maybe<Scalars['String']['output']>;
  product_id: Maybe<Scalars['String']['output']>;
  product_title: Maybe<Scalars['String']['output']>;
  product_description: Maybe<Scalars['String']['output']>;
  product_subtitle: Maybe<Scalars['String']['output']>;
  product_type: Maybe<Scalars['String']['output']>;
  product_type_id: Maybe<Scalars['String']['output']>;
  product_collection: Maybe<Scalars['String']['output']>;
  product_handle: Maybe<Scalars['String']['output']>;
  variant_sku: Maybe<Scalars['String']['output']>;
  variant_barcode: Maybe<Scalars['String']['output']>;
  variant_title: Maybe<Scalars['String']['output']>;
  variant_option_values: Maybe<Scalars['JSON']['output']>;
  requires_shipping: Scalars['Boolean']['output'];
  is_discountable: Scalars['Boolean']['output'];
  is_tax_inclusive: Scalars['Boolean']['output'];
  compare_at_unit_price: Maybe<Scalars['Float']['output']>;
  raw_compare_at_unit_price: Maybe<Scalars['JSON']['output']>;
  unit_price: Scalars['Float']['output'];
  raw_unit_price: Maybe<Scalars['JSON']['output']>;
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  tax_lines: Maybe<Array<Maybe<OrderLineItemTaxLine>>>;
  adjustments: Maybe<Array<Maybe<OrderLineItemAdjustment>>>;
  detail: OrderItem;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  original_total: Maybe<Scalars['Float']['output']>;
  original_subtotal: Maybe<Scalars['Float']['output']>;
  original_tax_total: Maybe<Scalars['Float']['output']>;
  item_total: Maybe<Scalars['Float']['output']>;
  item_subtotal: Maybe<Scalars['Float']['output']>;
  item_tax_total: Maybe<Scalars['Float']['output']>;
  total: Maybe<Scalars['Float']['output']>;
  subtotal: Maybe<Scalars['Float']['output']>;
  tax_total: Maybe<Scalars['Float']['output']>;
  discount_total: Maybe<Scalars['Float']['output']>;
  discount_tax_total: Maybe<Scalars['Float']['output']>;
  refundable_total: Maybe<Scalars['Float']['output']>;
  refundable_total_per_unit: Maybe<Scalars['Float']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_item_total: Maybe<Scalars['JSON']['output']>;
  raw_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_refundable_total: Maybe<Scalars['JSON']['output']>;
  raw_refundable_total_per_unit: Maybe<Scalars['JSON']['output']>;
  product: Maybe<Product>;
  variant: Maybe<ProductVariant>;
};

export type OrderItem = {
  __typename?: 'OrderItem';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  unit_price: Scalars['Float']['output'];
  raw_unit_price: Maybe<Scalars['JSON']['output']>;
  compare_at_unit_price: Scalars['Float']['output'];
  raw_compare_at_unit_price: Maybe<Scalars['JSON']['output']>;
  delivered_quantity: Scalars['Int']['output'];
  raw_delivered_quantity: Maybe<Scalars['JSON']['output']>;
  item_id: Scalars['String']['output'];
  item: OrderLineItem;
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  fulfilled_quantity: Scalars['Int']['output'];
  raw_fulfilled_quantity: Maybe<Scalars['JSON']['output']>;
  shipped_quantity: Scalars['Int']['output'];
  raw_shipped_quantity: Maybe<Scalars['JSON']['output']>;
  return_requested_quantity: Scalars['Int']['output'];
  raw_return_requested_quantity: Maybe<Scalars['JSON']['output']>;
  return_received_quantity: Scalars['Int']['output'];
  raw_return_received_quantity: Maybe<Scalars['JSON']['output']>;
  return_dismissed_quantity: Scalars['Int']['output'];
  raw_return_dismissed_quantity: Maybe<Scalars['JSON']['output']>;
  written_off_quantity: Scalars['Int']['output'];
  raw_written_off_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type OrderStatus =
  | 'pending'
  | 'completed'
  | 'draft'
  | 'archived'
  | 'canceled'
  | 'requires_action';

export type Order = {
  __typename?: 'Order';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  order_change: Maybe<OrderChange>;
  status: OrderStatus;
  region_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  display_id: Maybe<Scalars['String']['output']>;
  custom_display_id: Maybe<Scalars['String']['output']>;
  sales_channel_id: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  shipping_address: Maybe<OrderAddress>;
  billing_address: Maybe<OrderAddress>;
  items: Maybe<Array<Maybe<OrderLineItem>>>;
  shipping_methods: Maybe<Array<Maybe<OrderShippingMethod>>>;
  transactions: Maybe<Array<Maybe<OrderTransaction>>>;
  summary: Maybe<OrderSummary>;
  metadata: Maybe<Scalars['JSON']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  original_item_total: Scalars['Float']['output'];
  original_item_subtotal: Scalars['Float']['output'];
  original_item_tax_total: Scalars['Float']['output'];
  item_total: Scalars['Float']['output'];
  item_subtotal: Scalars['Float']['output'];
  item_tax_total: Scalars['Float']['output'];
  original_total: Scalars['Float']['output'];
  original_subtotal: Scalars['Float']['output'];
  original_tax_total: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  subtotal: Scalars['Float']['output'];
  tax_total: Scalars['Float']['output'];
  discount_total: Scalars['Float']['output'];
  discount_tax_total: Scalars['Float']['output'];
  gift_card_total: Scalars['Float']['output'];
  gift_card_tax_total: Scalars['Float']['output'];
  shipping_total: Scalars['Float']['output'];
  shipping_subtotal: Scalars['Float']['output'];
  shipping_tax_total: Scalars['Float']['output'];
  original_shipping_total: Scalars['Float']['output'];
  original_shipping_subtotal: Scalars['Float']['output'];
  original_shipping_tax_total: Scalars['Float']['output'];
  raw_original_item_total: Maybe<Scalars['JSON']['output']>;
  raw_original_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_item_total: Maybe<Scalars['JSON']['output']>;
  raw_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  customer: Maybe<Customer>;
  region: Maybe<Region>;
  sales_channel: Maybe<SalesChannel>;
  cart_link: Maybe<LinkOrderCart>;
  cart: Maybe<Cart>;
  fulfillment_link: Maybe<Array<Maybe<LinkOrderFulfillment>>>;
  fulfillments: Maybe<Array<Maybe<Fulfillment>>>;
  payment_collections_link: Maybe<LinkOrderPaymentCollection>;
  payment_collections: Maybe<Array<Maybe<PaymentCollection>>>;
  promotion_link: Maybe<Array<Maybe<LinkOrderPromotion>>>;
  promotions: Maybe<Array<Maybe<Promotion>>>;
  promotion: Maybe<Array<Maybe<Promotion>>>;
};

export type ReturnStatus =
  | 'requested'
  | 'received'
  | 'partially_received'
  | 'canceled';

export type Return = {
  __typename?: 'Return';
  id: Scalars['ID']['output'];
  status: ReturnStatus;
  refund_amount: Maybe<Scalars['Float']['output']>;
  order_id: Scalars['String']['output'];
  items: Array<Maybe<OrderReturnItem>>;
  return_fulfillment_link: Maybe<Array<Maybe<LinkReturnFulfillment>>>;
  fulfillments: Maybe<Array<Maybe<Fulfillment>>>;
};

export type OrderReturnItem = {
  __typename?: 'OrderReturnItem';
  id: Scalars['ID']['output'];
  return_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  item_id: Scalars['String']['output'];
  reason_id: Maybe<Scalars['String']['output']>;
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  received_quantity: Maybe<Scalars['Int']['output']>;
  raw_received_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderClaimItem = {
  __typename?: 'OrderClaimItem';
  id: Scalars['ID']['output'];
  claim_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  item_id: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  images: Maybe<Array<Maybe<OrderClaimItemImage>>>;
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderClaimItemImage = {
  __typename?: 'OrderClaimItemImage';
  id: Scalars['ID']['output'];
  claim_item_id: Scalars['String']['output'];
  item: OrderClaimItem;
  url: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderExchangeItem = {
  __typename?: 'OrderExchangeItem';
  id: Scalars['ID']['output'];
  exchange_id: Scalars['String']['output'];
  order_id: Scalars['String']['output'];
  item_id: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  raw_quantity: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Maybe<Scalars['DateTime']['output']>;
  updated_at: Maybe<Scalars['DateTime']['output']>;
};

export type OrderClaim = {
  __typename?: 'OrderClaim';
  order_id: Scalars['String']['output'];
  claim_items: Array<Maybe<OrderClaimItem>>;
  additional_items: Array<Maybe<OrderClaimItem>>;
  return: Maybe<Return>;
  return_id: Maybe<Scalars['String']['output']>;
  no_notification: Maybe<Scalars['Boolean']['output']>;
  refund_amount: Maybe<Scalars['Float']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
};

export type OrderExchange = {
  __typename?: 'OrderExchange';
  order_id: Scalars['String']['output'];
  return_items: Array<Maybe<OrderReturnItem>>;
  additional_items: Array<Maybe<OrderExchangeItem>>;
  no_notification: Maybe<Scalars['Boolean']['output']>;
  difference_due: Maybe<Scalars['Float']['output']>;
  return: Maybe<Return>;
  return_id: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
};

export type PaymentStatus =
  | 'not_paid'
  | 'awaiting'
  | 'authorized'
  | 'partially_authorized'
  | 'captured'
  | 'partially_captured'
  | 'partially_refunded'
  | 'refunded'
  | 'canceled'
  | 'requires_action';

export type FulfillmentStatus =
  | 'not_fulfilled'
  | 'partially_fulfilled'
  | 'fulfilled'
  | 'partially_shipped'
  | 'shipped'
  | 'partially_delivered'
  | 'delivered'
  | 'canceled';

export type OrderDetail = {
  __typename?: 'OrderDetail';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  order_change: Maybe<OrderChange>;
  status: OrderStatus;
  region_id: Maybe<Scalars['String']['output']>;
  customer_id: Maybe<Scalars['String']['output']>;
  sales_channel_id: Maybe<Scalars['String']['output']>;
  email: Maybe<Scalars['String']['output']>;
  currency_code: Scalars['String']['output'];
  shipping_address: Maybe<OrderAddress>;
  billing_address: Maybe<OrderAddress>;
  items: Maybe<Array<Maybe<OrderLineItem>>>;
  shipping_methods: Maybe<Array<Maybe<OrderShippingMethod>>>;
  transactions: Maybe<Array<Maybe<OrderTransaction>>>;
  summary: Maybe<OrderSummary>;
  metadata: Maybe<Scalars['JSON']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  original_item_total: Scalars['Float']['output'];
  original_item_subtotal: Scalars['Float']['output'];
  original_item_tax_total: Scalars['Float']['output'];
  item_total: Scalars['Float']['output'];
  item_subtotal: Scalars['Float']['output'];
  item_tax_total: Scalars['Float']['output'];
  original_total: Scalars['Float']['output'];
  original_subtotal: Scalars['Float']['output'];
  original_tax_total: Scalars['Float']['output'];
  total: Scalars['Float']['output'];
  subtotal: Scalars['Float']['output'];
  tax_total: Scalars['Float']['output'];
  discount_total: Scalars['Float']['output'];
  discount_tax_total: Scalars['Float']['output'];
  gift_card_total: Scalars['Float']['output'];
  gift_card_tax_total: Scalars['Float']['output'];
  shipping_total: Scalars['Float']['output'];
  shipping_subtotal: Scalars['Float']['output'];
  shipping_tax_total: Scalars['Float']['output'];
  original_shipping_total: Scalars['Float']['output'];
  original_shipping_subtotal: Scalars['Float']['output'];
  original_shipping_tax_total: Scalars['Float']['output'];
  raw_original_item_total: Maybe<Scalars['JSON']['output']>;
  raw_original_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_item_total: Maybe<Scalars['JSON']['output']>;
  raw_item_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_item_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_total: Maybe<Scalars['JSON']['output']>;
  raw_original_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_total: Maybe<Scalars['JSON']['output']>;
  raw_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_total: Maybe<Scalars['JSON']['output']>;
  raw_discount_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_total: Maybe<Scalars['JSON']['output']>;
  raw_gift_card_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_total: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_subtotal: Maybe<Scalars['JSON']['output']>;
  raw_original_shipping_tax_total: Maybe<Scalars['JSON']['output']>;
  payment_collections: Maybe<Array<Maybe<PaymentCollection>>>;
  payment_status: PaymentStatus;
  fulfillments: Maybe<Array<Maybe<Fulfillment>>>;
  fulfillment_status: FulfillmentStatus;
};

export type OrderChange = {
  __typename?: 'OrderChange';
  id: Scalars['ID']['output'];
  version: Scalars['Int']['output'];
  change_type: Maybe<Scalars['String']['output']>;
  order_id: Scalars['String']['output'];
  return_id: Maybe<Scalars['String']['output']>;
  exchange_id: Maybe<Scalars['String']['output']>;
  claim_id: Maybe<Scalars['String']['output']>;
  order: Order;
  return_order: Maybe<Return>;
  exchange: Maybe<OrderExchange>;
  claim: Maybe<OrderClaim>;
  actions: Array<Maybe<OrderChangeAction>>;
  status: Scalars['String']['output'];
  requested_by: Maybe<Scalars['String']['output']>;
  requested_at: Maybe<Scalars['DateTime']['output']>;
  confirmed_by: Maybe<Scalars['String']['output']>;
  confirmed_at: Maybe<Scalars['DateTime']['output']>;
  declined_by: Maybe<Scalars['String']['output']>;
  declined_reason: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  declined_at: Maybe<Scalars['DateTime']['output']>;
  canceled_by: Maybe<Scalars['String']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type OrderChangeAction = {
  __typename?: 'OrderChangeAction';
  id: Scalars['ID']['output'];
  order_change_id: Maybe<Scalars['String']['output']>;
  order_change: Maybe<OrderChange>;
  order_id: Maybe<Scalars['String']['output']>;
  return_id: Maybe<Scalars['String']['output']>;
  claim_id: Maybe<Scalars['String']['output']>;
  exchange_id: Maybe<Scalars['String']['output']>;
  order: Maybe<Order>;
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  action: ChangeActionType;
  details: Maybe<Scalars['JSON']['output']>;
  internal_note: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type OrderTransaction = {
  __typename?: 'OrderTransaction';
  id: Scalars['ID']['output'];
  order_id: Scalars['String']['output'];
  order: Order;
  amount: Scalars['Float']['output'];
  raw_amount: Maybe<Scalars['JSON']['output']>;
  currency_code: Scalars['String']['output'];
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
};

export type ViewConfiguration = {
  __typename?: 'ViewConfiguration';
  id: Scalars['ID']['output'];
  entity: Scalars['String']['output'];
  name: Maybe<Scalars['String']['output']>;
  user_id: Maybe<Scalars['String']['output']>;
  is_system_default: Scalars['Boolean']['output'];
  configuration: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type UserPreference = {
  __typename?: 'UserPreference';
  id: Scalars['ID']['output'];
  user_id: Scalars['String']['output'];
  key: Scalars['String']['output'];
  value: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ApiKeyTypeEnum =
  | 'publishable'
  | 'secret';

export type ApiKey = {
  __typename?: 'ApiKey';
  id: Scalars['ID']['output'];
  token: Scalars['String']['output'];
  salt: Scalars['String']['output'];
  redacted: Scalars['String']['output'];
  title: Scalars['String']['output'];
  type: ApiKeyTypeEnum;
  last_used_at: Maybe<Scalars['DateTime']['output']>;
  created_by: Scalars['String']['output'];
  revoked_by: Maybe<Scalars['String']['output']>;
  revoked_at: Maybe<Scalars['DateTime']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  sales_channels_link: Maybe<Array<Maybe<LinkPublishableApiKeySalesChannel>>>;
  sales_channels: Maybe<Array<Maybe<SalesChannel>>>;
};

export type WorkflowExecutionStateEnum =
  | 'not_started'
  | 'invoking'
  | 'waiting_to_compensate'
  | 'compensating'
  | 'done'
  | 'reverted'
  | 'failed';

export type WorkflowExecution = {
  __typename?: 'WorkflowExecution';
  id: Scalars['ID']['output'];
  workflow_id: Scalars['ID']['output'];
  transaction_id: Scalars['ID']['output'];
  run_id: Scalars['ID']['output'];
  execution: Maybe<Scalars['JSON']['output']>;
  context: Maybe<Scalars['JSON']['output']>;
  state: WorkflowExecutionStateEnum;
  retention_time: Maybe<Scalars['Int']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type User = {
  __typename?: 'User';
  id: Scalars['ID']['output'];
  first_name: Maybe<Scalars['String']['output']>;
  last_name: Maybe<Scalars['String']['output']>;
  email: Scalars['String']['output'];
  avatar_url: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Invite = {
  __typename?: 'Invite';
  id: Scalars['ID']['output'];
  email: Scalars['String']['output'];
  accepted: Scalars['Boolean']['output'];
  token: Scalars['String']['output'];
  expires_at: Scalars['DateTime']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type AuthIdentity = {
  __typename?: 'AuthIdentity';
  id: Scalars['ID']['output'];
  provider_identities: Array<Maybe<ProviderIdentity>>;
  app_metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ProviderIdentity = {
  __typename?: 'ProviderIdentity';
  id: Scalars['ID']['output'];
  entity_id: Scalars['String']['output'];
  provider: Scalars['String']['output'];
  auth_identity_id: Scalars['String']['output'];
  auth_identity: AuthIdentity;
  user_metadata: Maybe<Scalars['JSON']['output']>;
  provider_metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Region = {
  __typename?: 'Region';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  currency_code: Scalars['String']['output'];
  automatic_taxes: Scalars['Boolean']['output'];
  countries: Array<Maybe<Country>>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  carts: Maybe<Array<Maybe<Cart>>>;
  orders: Maybe<Array<Maybe<Order>>>;
  payment_provider_link: Maybe<Array<Maybe<LinkRegionPaymentProvider>>>;
  payment_providers: Maybe<Array<Maybe<PaymentProvider>>>;
};

export type Country = {
  __typename?: 'Country';
  iso_2: Scalars['ID']['output'];
  iso_3: Scalars['String']['output'];
  num_code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  display_name: Scalars['String']['output'];
  region_id: Maybe<Scalars['String']['output']>;
  region: Maybe<Region>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type NotificationStatusEnum =
  | 'pending'
  | 'success'
  | 'failure';

export type Notification = {
  __typename?: 'Notification';
  id: Scalars['ID']['output'];
  to: Scalars['String']['output'];
  from: Maybe<Scalars['String']['output']>;
  channel: Scalars['String']['output'];
  template: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  provider_data: Maybe<Scalars['JSON']['output']>;
  trigger_type: Maybe<Scalars['String']['output']>;
  resource_id: Maybe<Scalars['String']['output']>;
  resource_type: Maybe<Scalars['String']['output']>;
  receiver_id: Maybe<Scalars['String']['output']>;
  original_notification_id: Maybe<Scalars['String']['output']>;
  idempotency_key: Maybe<Scalars['String']['output']>;
  external_id: Maybe<Scalars['String']['output']>;
  status: NotificationStatusEnum;
  provider_id: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type GeoZoneType =
  | 'country'
  | 'province'
  | 'city'
  | 'zip';

export type ShippingOptionPriceType =
  | 'calculated'
  | 'flat';

export type FulfillmentItem = {
  __typename?: 'FulfillmentItem';
  id: Scalars['ID']['output'];
  title: Scalars['String']['output'];
  quantity: Scalars['Int']['output'];
  sku: Scalars['String']['output'];
  barcode: Scalars['String']['output'];
  line_item_id: Maybe<Scalars['String']['output']>;
  inventory_item_id: Maybe<Scalars['String']['output']>;
  fulfillment_id: Scalars['String']['output'];
  fulfillment: Fulfillment;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type FulfillmentLabel = {
  __typename?: 'FulfillmentLabel';
  id: Scalars['ID']['output'];
  tracking_number: Scalars['String']['output'];
  tracking_url: Scalars['String']['output'];
  label_url: Scalars['String']['output'];
  fulfillment_id: Scalars['String']['output'];
  fulfillment: Fulfillment;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type FulfillmentProvider = {
  __typename?: 'FulfillmentProvider';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  locations_link: Maybe<Array<Maybe<LinkLocationFulfillmentProvider>>>;
  locations: Maybe<Array<Maybe<StockLocation>>>;
};

export type FulfillmentSet = {
  __typename?: 'FulfillmentSet';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  service_zones: Array<ServiceZone>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  locations_link: Maybe<LinkLocationFulfillmentSet>;
  location: Maybe<StockLocation>;
};

export type Fulfillment = {
  __typename?: 'Fulfillment';
  id: Scalars['ID']['output'];
  location_id: Scalars['String']['output'];
  packed_at: Maybe<Scalars['DateTime']['output']>;
  shipped_at: Maybe<Scalars['DateTime']['output']>;
  delivered_at: Maybe<Scalars['DateTime']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  marked_shipped_by: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  provider_id: Scalars['String']['output'];
  shipping_option_id: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  shipping_option: Maybe<ShippingOption>;
  provider: FulfillmentProvider;
  items: Array<FulfillmentItem>;
  labels: Array<FulfillmentLabel>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  order_link: Maybe<LinkOrderFulfillment>;
  order: Maybe<Order>;
  return_link: Maybe<LinkReturnFulfillment>;
};

export type GeoZone = {
  __typename?: 'GeoZone';
  id: Scalars['ID']['output'];
  type: GeoZoneType;
  country_code: Scalars['String']['output'];
  province_code: Maybe<Scalars['String']['output']>;
  city: Maybe<Scalars['String']['output']>;
  postal_expression: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ServiceZone = {
  __typename?: 'ServiceZone';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  fulfillment_set: FulfillmentSet;
  fulfillment_set_id: Scalars['String']['output'];
  geo_zones: Array<GeoZone>;
  shipping_options: Array<ShippingOption>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingOptionRule = {
  __typename?: 'ShippingOptionRule';
  id: Scalars['ID']['output'];
  attribute: Scalars['String']['output'];
  operator: Scalars['String']['output'];
  value: Maybe<Scalars['JSON']['output']>;
  shipping_option_id: Scalars['String']['output'];
  shipping_option: ShippingOption;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingOptionType = {
  __typename?: 'ShippingOptionType';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  description: Scalars['String']['output'];
  code: Scalars['String']['output'];
  shipping_option_id: Scalars['String']['output'];
  shipping_option: ShippingOption;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type ShippingOption = {
  __typename?: 'ShippingOption';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  price_type: ShippingOptionPriceType;
  service_zone_id: Scalars['String']['output'];
  shipping_profile_id: Scalars['String']['output'];
  provider_id: Scalars['String']['output'];
  shipping_option_type_id: Maybe<Scalars['String']['output']>;
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  service_zone: ServiceZone;
  shipping_profile: ShippingProfile;
  fulfillment_provider: FulfillmentProvider;
  type: ShippingOptionType;
  rules: Array<ShippingOptionRule>;
  fulfillments: Array<Fulfillment>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  price_set_link: Maybe<LinkShippingOptionPriceSet>;
};

export type ShippingProfile = {
  __typename?: 'ShippingProfile';
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  type: Scalars['String']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  shipping_options: Array<ShippingOption>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  products_link: Maybe<Array<Maybe<LinkProductShippingProfile>>>;
};

export type AccountHolder = {
  __typename?: 'AccountHolder';
  id: Scalars['ID']['output'];
  provider_id: Scalars['String']['output'];
  external_id: Scalars['String']['output'];
  email: Maybe<Scalars['String']['output']>;
  data: Scalars['JSON']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  customer_link: Maybe<LinkCustomerAccountHolder>;
  customer: Maybe<Customer>;
};

export type Capture = {
  __typename?: 'Capture';
  id: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  payment_id: Scalars['String']['output'];
  payment: Payment;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PaymentCollectionStatusEnum =
  | 'not_paid'
  | 'awaiting'
  | 'authorized'
  | 'partially_authorized'
  | 'canceled'
  | 'failed'
  | 'partially_captured'
  | 'completed';

export type PaymentCollection = {
  __typename?: 'PaymentCollection';
  id: Scalars['ID']['output'];
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  authorized_amount: Maybe<Scalars['Float']['output']>;
  captured_amount: Maybe<Scalars['Float']['output']>;
  refunded_amount: Maybe<Scalars['Float']['output']>;
  completed_at: Maybe<Scalars['DateTime']['output']>;
  status: PaymentCollectionStatusEnum;
  metadata: Maybe<Scalars['JSON']['output']>;
  payment_providers: Array<Maybe<PaymentProvider>>;
  payment_sessions: Array<Maybe<PaymentSession>>;
  payments: Array<Maybe<Payment>>;
  raw_amount: Scalars['JSON']['output'];
  raw_authorized_amount: Maybe<Scalars['JSON']['output']>;
  raw_captured_amount: Maybe<Scalars['JSON']['output']>;
  raw_refunded_amount: Maybe<Scalars['JSON']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  cart_link: Maybe<LinkCartPaymentCollection>;
  cart: Maybe<Cart>;
  order_link: Maybe<LinkOrderPaymentCollection>;
  order: Maybe<Order>;
};

export type PaymentProvider = {
  __typename?: 'PaymentProvider';
  id: Scalars['ID']['output'];
  is_enabled: Scalars['Boolean']['output'];
  payment_collections: Array<Maybe<PaymentCollection>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
  region_link: Maybe<Array<Maybe<LinkRegionPaymentProvider>>>;
  regions: Maybe<Array<Maybe<Region>>>;
};

export type PaymentSessionStatusEnum =
  | 'authorized'
  | 'captured'
  | 'pending'
  | 'requires_more'
  | 'error'
  | 'canceled';

export type Payment = {
  __typename?: 'Payment';
  payment_session: PaymentSession;
  id: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  currency_code: Scalars['String']['output'];
  provider_id: Scalars['String']['output'];
  data: Maybe<Scalars['JSON']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  captured_at: Maybe<Scalars['DateTime']['output']>;
  canceled_at: Maybe<Scalars['DateTime']['output']>;
  payment_collection_id: Scalars['String']['output'];
  payment_collection: PaymentCollection;
  payment_session_id: Scalars['String']['output'];
  refunds: Array<Maybe<Refund>>;
  captures: Array<Maybe<Capture>>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type PaymentSession = {
  __typename?: 'PaymentSession';
  id: Scalars['ID']['output'];
  currency_code: Scalars['String']['output'];
  amount: Scalars['Float']['output'];
  provider_id: Scalars['String']['output'];
  data: Scalars['JSON']['output'];
  context: Maybe<Scalars['JSON']['output']>;
  status: PaymentSessionStatusEnum;
  authorized_at: Maybe<Scalars['DateTime']['output']>;
  payment_collection_id: Scalars['String']['output'];
  payment_collection: PaymentCollection;
  payment: Maybe<Payment>;
  metadata: Maybe<Scalars['JSON']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type RefundReason = {
  __typename?: 'RefundReason';
  id: Scalars['ID']['output'];
  label: Scalars['String']['output'];
  code: Scalars['String']['output'];
  description: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  refunds: Array<Maybe<Refund>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Refund = {
  __typename?: 'Refund';
  id: Scalars['ID']['output'];
  amount: Scalars['Float']['output'];
  payment_id: Scalars['String']['output'];
  payment: Payment;
  refund_reason_id: Maybe<Scalars['String']['output']>;
  refund_reason: Maybe<RefundReason>;
  note: Maybe<Scalars['String']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  raw_amount: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type Currency = {
  __typename?: 'Currency';
  code: Scalars['ID']['output'];
  symbol: Scalars['String']['output'];
  symbol_native: Scalars['String']['output'];
  name: Scalars['String']['output'];
  decimal_digits: Scalars['Int']['output'];
  rounding: Scalars['Float']['output'];
  raw_rounding: Scalars['JSON']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxRate = {
  __typename?: 'TaxRate';
  id: Scalars['ID']['output'];
  rate: Maybe<Scalars['Float']['output']>;
  code: Scalars['String']['output'];
  name: Scalars['String']['output'];
  is_default: Scalars['Boolean']['output'];
  is_combinable: Scalars['Boolean']['output'];
  tax_region_id: Scalars['String']['output'];
  tax_region: TaxRegion;
  rules: Array<Maybe<TaxRateRule>>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxRegion = {
  __typename?: 'TaxRegion';
  id: Scalars['ID']['output'];
  country_code: Scalars['String']['output'];
  province_code: Maybe<Scalars['String']['output']>;
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  provider_id: Maybe<Scalars['String']['output']>;
  provider: Maybe<TaxProvider>;
  parent_id: Maybe<Scalars['String']['output']>;
  parent: Maybe<TaxRegion>;
  children: Array<Maybe<TaxRegion>>;
  tax_rates: Array<Maybe<TaxRate>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxRateRule = {
  __typename?: 'TaxRateRule';
  id: Scalars['ID']['output'];
  metadata: Maybe<Scalars['JSON']['output']>;
  created_by: Maybe<Scalars['String']['output']>;
  tax_rate_id: Scalars['String']['output'];
  tax_rate: TaxRate;
  reference: Scalars['String']['output'];
  reference_id: Scalars['String']['output'];
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type TaxProvider = {
  __typename?: 'TaxProvider';
  id: Scalars['ID']['output'];
  is_enabled: Scalars['Boolean']['output'];
  regions: Array<Maybe<TaxRegion>>;
  created_at: Scalars['DateTime']['output'];
  updated_at: Scalars['DateTime']['output'];
  deleted_at: Maybe<Scalars['DateTime']['output']>;
};

export type LinkCartPaymentCollection = {
  __typename?: 'LinkCartPaymentCollection';
  cart_id: Scalars['String']['output'];
  payment_collection_id: Scalars['String']['output'];
  cart: Maybe<Cart>;
  payment_collection: Maybe<PaymentCollection>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCartPromotion = {
  __typename?: 'LinkCartPromotion';
  cart_id: Scalars['String']['output'];
  promotion_id: Scalars['String']['output'];
  cart: Maybe<Cart>;
  promotions: Maybe<Promotion>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkCustomerAccountHolder = {
  __typename?: 'LinkCustomerAccountHolder';
  customer_id: Scalars['String']['output'];
  account_holder_id: Scalars['String']['output'];
  customer: Maybe<Customer>;
  account_holder: Maybe<AccountHolder>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkLocationFulfillmentProvider = {
  __typename?: 'LinkLocationFulfillmentProvider';
  stock_location_id: Scalars['String']['output'];
  fulfillment_provider_id: Scalars['String']['output'];
  location: Maybe<StockLocation>;
  fulfillment_provider: Maybe<FulfillmentProvider>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkLocationFulfillmentSet = {
  __typename?: 'LinkLocationFulfillmentSet';
  stock_location_id: Scalars['String']['output'];
  fulfillment_set_id: Scalars['String']['output'];
  location: Maybe<StockLocation>;
  fulfillment_set: Maybe<FulfillmentSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderCart = {
  __typename?: 'LinkOrderCart';
  order_id: Scalars['String']['output'];
  cart_id: Scalars['String']['output'];
  order: Maybe<Order>;
  cart: Maybe<Cart>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderFulfillment = {
  __typename?: 'LinkOrderFulfillment';
  order_id: Scalars['String']['output'];
  fulfillment_id: Scalars['String']['output'];
  order: Maybe<Order>;
  fulfillments: Maybe<Fulfillment>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderPaymentCollection = {
  __typename?: 'LinkOrderPaymentCollection';
  order_id: Scalars['String']['output'];
  payment_collection_id: Scalars['String']['output'];
  order: Maybe<Order>;
  payment_collection: Maybe<PaymentCollection>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkOrderPromotion = {
  __typename?: 'LinkOrderPromotion';
  order_id: Scalars['String']['output'];
  promotion_id: Scalars['String']['output'];
  order: Maybe<Order>;
  promotions: Maybe<Promotion>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkReturnFulfillment = {
  __typename?: 'LinkReturnFulfillment';
  return_id: Scalars['String']['output'];
  fulfillment_id: Scalars['String']['output'];
  return: Maybe<Return>;
  fulfillments: Maybe<Fulfillment>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductSalesChannel = {
  __typename?: 'LinkProductSalesChannel';
  product_id: Scalars['String']['output'];
  sales_channel_id: Scalars['String']['output'];
  product: Maybe<Product>;
  sales_channel: Maybe<SalesChannel>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductShippingProfile = {
  __typename?: 'LinkProductShippingProfile';
  product_id: Scalars['String']['output'];
  shipping_profile_id: Scalars['String']['output'];
  product: Maybe<Product>;
  shipping_profile: Maybe<ShippingProfile>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductVariantInventoryItem = {
  __typename?: 'LinkProductVariantInventoryItem';
  variant_id: Scalars['String']['output'];
  inventory_item_id: Scalars['String']['output'];
  required_quantity: Scalars['Int']['output'];
  variant: Maybe<ProductVariant>;
  inventory: Maybe<InventoryItem>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkProductVariantPriceSet = {
  __typename?: 'LinkProductVariantPriceSet';
  variant_id: Scalars['String']['output'];
  price_set_id: Scalars['String']['output'];
  variant: Maybe<ProductVariant>;
  price_set: Maybe<PriceSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkPublishableApiKeySalesChannel = {
  __typename?: 'LinkPublishableApiKeySalesChannel';
  publishable_key_id: Scalars['String']['output'];
  sales_channel_id: Scalars['String']['output'];
  api_key: Maybe<ApiKey>;
  sales_channel: Maybe<SalesChannel>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkRegionPaymentProvider = {
  __typename?: 'LinkRegionPaymentProvider';
  region_id: Scalars['String']['output'];
  payment_provider_id: Scalars['String']['output'];
  region: Maybe<Region>;
  payment_provider: Maybe<PaymentProvider>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkSalesChannelStockLocation = {
  __typename?: 'LinkSalesChannelStockLocation';
  sales_channel_id: Scalars['String']['output'];
  stock_location_id: Scalars['String']['output'];
  sales_channel: Maybe<SalesChannel>;
  location: Maybe<StockLocation>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

export type LinkShippingOptionPriceSet = {
  __typename?: 'LinkShippingOptionPriceSet';
  shipping_option_id: Scalars['String']['output'];
  price_set_id: Scalars['String']['output'];
  shipping_option: Maybe<ShippingOption>;
  price_set: Maybe<PriceSet>;
  createdAt: Scalars['String']['output'];
  updatedAt: Scalars['String']['output'];
  deletedAt: Maybe<Scalars['String']['output']>;
};

declare module '@medusajs/framework/types' {
  interface RemoteQueryEntryPoints {
    stock_location_address: StockLocationAddress
    stock_location_addresses: StockLocationAddress
    stock_location: StockLocation
    stock_locations: StockLocation
    inventory_items: InventoryItem
    inventory_item: InventoryItem
    inventory: InventoryItem
    reservation: ReservationItem
    reservations: ReservationItem
    reservation_item: ReservationItem
    reservation_items: ReservationItem
    inventory_level: InventoryLevel
    inventory_levels: InventoryLevel
    promotion: Promotion
    promotions: Promotion
    application_method: ApplicationMethod
    application_methods: ApplicationMethod
    campaign: Campaign
    campaigns: Campaign
    campaign_budget: CampaignBudget
    campaign_budgets: CampaignBudget
    campaign_budget_usage: CampaignBudgetUsage
    campaign_budget_usages: CampaignBudgetUsage
    promotion_rule: PromotionRule
    promotion_rules: PromotionRule
    promotion_rule_value: PromotionRuleValue
    promotion_rule_values: PromotionRuleValue
    product_variant: ProductVariant
    product_variants: ProductVariant
    variant: ProductVariant
    variants: ProductVariant
    product: Product
    products: Product
    product_option: ProductOption
    product_options: ProductOption
    product_option_value: ProductOptionValue
    product_option_values: ProductOptionValue
    product_type: ProductType
    product_types: ProductType
    product_tag: ProductTag
    product_tags: ProductTag
    product_collection: ProductCollection
    product_collections: ProductCollection
    product_category: ProductCategory
    product_categories: ProductCategory
    product_image: ProductImage
    product_images: ProductImage
    price_set: PriceSet
    price_sets: PriceSet
    price_list: PriceList
    price_lists: PriceList
    price: Price
    prices: Price
    price_preference: PricePreference
    price_preferences: PricePreference
    customer_address: CustomerAddress
    customer_addresses: CustomerAddress
    customer_group_customer: CustomerGroupCustomer
    customer_group_customers: CustomerGroupCustomer
    customer_group: CustomerGroup
    customer_groups: CustomerGroup
    customer: Customer
    customers: Customer
    cart: Cart
    carts: Cart
    credit_line: CreditLine
    credit_lines: CreditLine
    address: Address
    addresses: Address
    line_item: LineItem
    line_items: LineItem
    line_item_adjustment: LineItemAdjustment
    line_item_adjustments: LineItemAdjustment
    line_item_tax_line: LineItemTaxLine
    line_item_tax_lines: LineItemTaxLine
    shipping_method: ShippingMethod
    shipping_methods: ShippingMethod
    shipping_method_adjustment: ShippingMethodAdjustment
    shipping_method_adjustments: ShippingMethodAdjustment
    shipping_method_tax_line: ShippingMethodTaxLine
    shipping_method_tax_lines: ShippingMethodTaxLine
    sales_channel: SalesChannel
    sales_channels: SalesChannel
    store: Store
    stores: Store
    store_currency: StoreCurrency
    store_currencies: StoreCurrency
    store_locale: StoreLocale
    store_locales: StoreLocale
    order: Order
    orders: Order
    order_address: OrderAddress
    order_addresses: OrderAddress
    order_change: OrderChange
    order_changes: OrderChange
    order_claim: OrderClaim
    order_claims: OrderClaim
    order_exchange: OrderExchange
    order_exchanges: OrderExchange
    order_item: OrderItem
    order_items: OrderItem
    order_line_item: OrderLineItem
    order_line_items: OrderLineItem
    order_shipping_method: OrderShippingMethod
    order_shipping_methods: OrderShippingMethod
    order_transaction: OrderTransaction
    order_transactions: OrderTransaction
    return: Return
    returns: Return
    return_reason: any
    return_reasons: any
    view_configuration: ViewConfiguration
    view_configurations: ViewConfiguration
    user_preference: UserPreference
    user_preferences: UserPreference
    api_key: ApiKey
    api_keys: ApiKey
    workflow_execution: WorkflowExecution
    workflow_executions: WorkflowExecution
    user: User
    users: User
    invite: Invite
    invites: Invite
    auth_identity: AuthIdentity
    auth_identities: AuthIdentity
    provider_identity: ProviderIdentity
    provider_identities: ProviderIdentity
    file: any
    files: any
    region: Region
    regions: Region
    country: Country
    countries: Country
    notification: Notification
    notifications: Notification
    fulfillment_address: any
    fulfillment_addresses: any
    fulfillment_item: FulfillmentItem
    fulfillment_items: FulfillmentItem
    fulfillment_label: FulfillmentLabel
    fulfillment_labels: FulfillmentLabel
    fulfillment_provider: FulfillmentProvider
    fulfillment_providers: FulfillmentProvider
    fulfillment_set: FulfillmentSet
    fulfillment_sets: FulfillmentSet
    fulfillment: Fulfillment
    fulfillments: Fulfillment
    geo_zone: GeoZone
    geo_zones: GeoZone
    service_zone: ServiceZone
    service_zones: ServiceZone
    shipping_option_rule: ShippingOptionRule
    shipping_option_rules: ShippingOptionRule
    shipping_option_type: ShippingOptionType
    shipping_option_types: ShippingOptionType
    shipping_option: ShippingOption
    shipping_options: ShippingOption
    shipping_profile: ShippingProfile
    shipping_profiles: ShippingProfile
    payment_method: any
    payment_methods: any
    account_holder: AccountHolder
    account_holders: AccountHolder
    capture: Capture
    captures: Capture
    payment_collection: PaymentCollection
    payment_collections: PaymentCollection
    payment_provider: PaymentProvider
    payment_providers: PaymentProvider
    payment_session: PaymentSession
    payment_sessions: PaymentSession
    payment: Payment
    payments: Payment
    refund_reason: RefundReason
    refund_reasons: RefundReason
    refund: Refund
    refunds: Refund
    currency: Currency
    currencies: Currency
    tax_rate: TaxRate
    tax_rates: TaxRate
    tax_region: TaxRegion
    tax_regions: TaxRegion
    tax_rate_rule: TaxRateRule
    tax_rate_rules: TaxRateRule
    tax_provider: TaxProvider
    tax_providers: TaxProvider
    cart_payment_collection: LinkCartPaymentCollection
    cart_payment_collections: LinkCartPaymentCollection
    cart_promotion: LinkCartPromotion
    cart_promotions: LinkCartPromotion
    customer_account_holder: LinkCustomerAccountHolder
    customer_account_holders: LinkCustomerAccountHolder
    location_fulfillment_provider: LinkLocationFulfillmentProvider
    location_fulfillment_providers: LinkLocationFulfillmentProvider
    location_fulfillment_set: LinkLocationFulfillmentSet
    location_fulfillment_sets: LinkLocationFulfillmentSet
    order_cart: LinkOrderCart
    order_carts: LinkOrderCart
    order_fulfillment: LinkOrderFulfillment
    order_fulfillments: LinkOrderFulfillment
    order_payment_collection: LinkOrderPaymentCollection
    order_payment_collections: LinkOrderPaymentCollection
    order_promotion: LinkOrderPromotion
    order_promotions: LinkOrderPromotion
    return_fulfillment: LinkReturnFulfillment
    return_fulfillments: LinkReturnFulfillment
    product_sales_channel: LinkProductSalesChannel
    product_sales_channels: LinkProductSalesChannel
    product_shipping_profile: LinkProductShippingProfile
    product_shipping_profiles: LinkProductShippingProfile
    product_variant_inventory_item: LinkProductVariantInventoryItem
    product_variant_inventory_items: LinkProductVariantInventoryItem
    product_variant_price_set: LinkProductVariantPriceSet
    product_variant_price_sets: LinkProductVariantPriceSet
    publishable_api_key_sales_channel: LinkPublishableApiKeySalesChannel
    publishable_api_key_sales_channels: LinkPublishableApiKeySalesChannel
    region_payment_provider: LinkRegionPaymentProvider
    region_payment_providers: LinkRegionPaymentProvider
    sales_channel_location: LinkSalesChannelStockLocation
    sales_channel_locations: LinkSalesChannelStockLocation
    shipping_option_price_set: LinkShippingOptionPriceSet
    shipping_option_price_sets: LinkShippingOptionPriceSet
  }
}