import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "./models/supplier.model"
import SupplierProduct from "./models/supplier-product.model"
import SupplierPriceList from "./models/supplier-price-list.model"
import SupplierPriceListItem from "./models/supplier-price-list-item.model"
import { PurchaseOrder, PurchaseOrderItem, PurchaseOrderStatus } from "./models/purchase-order.model"
import { ParserConfig, ParserTemplate, ParserType, CsvConfig, FixedWidthConfig } from "./types/parser-types"
import { PARSER_TEMPLATES, listParserTemplates as listTemplates } from "./config/parser-templates"
import { FIELD_ALIASES } from "./config/field-aliases"

class PurchasingService extends MedusaService({
  Supplier,
  SupplierProduct,
  SupplierPriceList,
  SupplierPriceListItem,
  PurchaseOrder,
  PurchaseOrderItem,
}) {
  
  // ==========================================
  // PURCHASE ORDER BUSINESS LOGIC
  // ==========================================
  
  async generatePONumber(): Promise<string> {
    const currentDate = new Date()
    const year = currentDate.getFullYear()
    
    const existingPOs = await this.listPurchaseOrders({
      po_number: { $like: `PO-${year}-%` }
    })
    
    return `PO-${year}-${String(existingPOs.length + 1).padStart(3, '0')}`
  }

  async calculateOrderTotals(items: Array<{ quantity_ordered: number; unit_cost: number }>) {
    const subtotal = items.reduce(
      (sum, item) => sum + (item.quantity_ordered * item.unit_cost), 
      0
    )
    
    // Add your business logic for tax, shipping, discounts here
    return {
      subtotal,
      tax_amount: 0, // Calculate based on your business rules
      shipping_amount: 0, // Calculate based on your business rules
      discount_amount: 0, // Calculate based on your business rules
      total_amount: subtotal
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    const updated = await this.updatePurchaseOrders(
      { id: orderId },
      {
        status,
        ...(status === 'received' && { actual_delivery_date: new Date() })
      }
    )
    return updated
  }

  async getPurchaseOrdersByStatus(status: string) {
    return await this.listPurchaseOrders({ status })
  }

  async getPurchaseOrdersBySupplier(supplierId: string) {
    return await this.listPurchaseOrders({ supplier_id: supplierId })
  }

  async getDraftPurchaseOrderBySupplier(supplierId: string) {
    const [draftPO] = await this.listPurchaseOrders({
      supplier_id: supplierId,
      status: PurchaseOrderStatus.DRAFT
    })
    return draftPO
  }

  // ==========================================
  // SUPPLIER BUSINESS LOGIC
  // ==========================================
  
  async generateSupplierCode(name: string): Promise<string> {
    const baseCode = name.substring(0, 3).toUpperCase()
    const existing = await this.listSuppliers({
      code: { $like: `${baseCode}%` }
    })
    
    return `${baseCode}${String(existing.length + 1).padStart(3, '0')}`
  }

  async getSupplierProductPricing(supplierId: string, productVariantId: string) {
    const [supplierProduct] = await this.listSupplierProducts({
      supplier_id: supplierId,
      product_variant_id: productVariantId,
      is_active: true
    })
    
    return supplierProduct
  }

  async updateSupplierProductPricing(supplierId: string, productVariantId: string, costPrice: number) {
    const [existing] = await this.listSupplierProducts({
      supplier_id: supplierId,
      product_variant_id: productVariantId
    })

    if (existing) {
      return await this.updateSupplierProducts([{
        id: existing.id,
        cost_price: costPrice,
        last_cost_update: new Date()
      }])
    } else {
      return await this.createSupplierProducts([{
        supplier_id: supplierId,
        product_variant_id: productVariantId,
        cost_price: costPrice,
        currency_code: "USD", // Default, should be configurable
        minimum_order_quantity: 1,
        is_active: true,
        last_cost_update: new Date()
      }])
    }
  }

  async getActiveSuppliers() {
    return await this.listSuppliers({ is_active: true })
  }

  async getSupplierWithStats(supplierId: string) {
    const supplier = await this.retrieveSupplier(supplierId)
    const purchaseOrders = await this.getPurchaseOrdersBySupplier(supplierId)
    const supplierProducts = await this.listSupplierProducts({ supplier_id: supplierId })
    
    return {
      ...supplier,
      purchase_orders_count: purchaseOrders.length,
      products_count: supplierProducts.length,
      last_order_date: purchaseOrders.length > 0 
        ? Math.max(...purchaseOrders.map(po => new Date(po.order_date).getTime()))
        : null
    }
  }

  // ==========================================
  // PRICE LIST BUSINESS LOGIC
  // ==========================================
  
  async createSupplierPriceList(data: {
    supplier_id: string
    brand_id?: string
    name: string
    description?: string
    effective_date?: Date
    expiry_date?: Date
    currency_code?: string
    upload_filename?: string
    upload_metadata?: any
  }) {
    const supplier = await this.retrieveSupplier(data.supplier_id)
    
    // Get current active price list for version incrementing
    const currentActive = await this.getActivePriceListForSupplier(data.supplier_id, data.brand_id)
    const nextVersion = currentActive ? currentActive.version + 1 : 1
    
    // Deactivate existing active price lists for this supplier
    if (currentActive) {
      await this.updateSupplierPriceLists(
        { id: currentActive.id },
        { is_active: false }
      )
    }
    
    const priceList = await this.createSupplierPriceLists([{
      supplier_id: data.supplier_id,
      brand_id: data.brand_id,
      name: data.name,
      description: data.description,
      effective_date: data.effective_date,
      expiry_date: data.expiry_date,
      currency_code: data.currency_code || supplier.currency_code || "USD",
      upload_filename: data.upload_filename,
      upload_metadata: data.upload_metadata,
      is_active: true,
      version: nextVersion
    }])
    
    return priceList[0]
  }

  async processPriceListItems(priceListId: string, items: Array<{
    product_variant_id: string
    product_id: string
    supplier_sku?: string
    variant_sku?: string
    cost_price: number
    quantity?: number
    lead_time_days?: number
    notes?: string
  }>, overwriteExisting: boolean = false) {
    const priceList = await this.retrieveSupplierPriceList(priceListId)
    
    if (overwriteExisting) {
      // Remove existing items for products that are being updated
      const productVariantIds = items.map(item => item.product_variant_id)
      const existingItems = await this.listSupplierPriceListItems({
        price_list_id: priceListId,
        product_variant_id: { $in: productVariantIds }
      })
      
      if (existingItems.length > 0) {
        await this.deleteSupplierPriceListItems(existingItems.map(item => item.id))
      }
    }
    
    const processedItems = items.map(item => ({
      price_list_id: priceListId,
      product_variant_id: item.product_variant_id,
      product_id: item.product_id,
      supplier_sku: item.supplier_sku ?? undefined,
      variant_sku: item.variant_sku ?? undefined,
      // Map legacy cost_price input to net_price field on the model
      net_price: item.cost_price,
      quantity: item.quantity ?? 1,
      lead_time_days: item.lead_time_days ?? undefined,
      notes: item.notes ?? undefined
    }))
    
    return await this.createSupplierPriceListItems(processedItems)
  }

  async upsertSupplierProductFromPriceList(priceListItem: any) {
    const priceList = await this.retrieveSupplierPriceList(priceListItem.price_list_id)
    
    // Check if supplier-product relationship exists
    const [existing] = await this.listSupplierProducts({
      supplier_id: priceList.supplier_id,
      product_variant_id: priceListItem.product_variant_id
    })

    if (existing) {
      // Update existing relationship with price list data
      return await this.updateSupplierProducts([{
        id: existing.id,
        supplier_sku: priceListItem.supplier_sku || existing.supplier_sku,
        cost_price: priceListItem.net_price,
        currency_code: priceList.currency_code,
        minimum_order_quantity: priceListItem.quantity || existing.minimum_order_quantity,
        lead_time_days: priceListItem.lead_time_days || existing.lead_time_days,
        last_cost_update: new Date(),
        is_active: true
      }])
    } else {
      // Create new supplier-product relationship
      return await this.createSupplierProducts([{
        supplier_id: priceList.supplier_id,
        product_variant_id: priceListItem.product_variant_id,
        supplier_sku: priceListItem.supplier_sku,
        cost_price: priceListItem.net_price,
        currency_code: priceList.currency_code,
        minimum_order_quantity: priceListItem.quantity || 1,
        lead_time_days: priceListItem.lead_time_days,
        is_active: true,
        last_cost_update: new Date()
      }])
    }
  }

  async getSupplierPriceLists(supplierId: string) {
    return await this.listSupplierPriceLists({ 
      supplier_id: supplierId 
    })
  }

  async getActivePriceListForSupplier(supplierId: string, brandId?: string) {
    const now = new Date()
    const filters: any = {
      supplier_id: supplierId,
      is_active: true,
      $and: [
        { $or: [{ effective_date: null }, { effective_date: { $lte: now } }] },
        { $or: [{ expiry_date: null }, { expiry_date: { $gte: now } }] }
      ]
    }
    if (brandId !== undefined) {
      filters.brand_id = brandId ?? null
    }
    const [activeList] = await this.listSupplierPriceLists(filters)
    return activeList
  }

  async getPriceListItems(priceListId: string) {
    return await this.listSupplierPriceListItems({ price_list_id: priceListId })
  }

  async getProductPricingFromPriceLists(productVariantId: string) {
    const now = new Date()
    
    // Get all active price list items for this variant
    const priceListItems = await this.listSupplierPriceListItems({
      product_variant_id: productVariantId
    })
    
    // Filter for active price lists
    const activeItems = []
    for (const item of priceListItems) {
      const priceList = await this.retrieveSupplierPriceList(item.price_list_id)
      if (priceList.is_active && 
          (!priceList.effective_date || priceList.effective_date <= now) &&
          (!priceList.expiry_date || priceList.expiry_date >= now)) {
        activeItems.push({ ...item, price_list: priceList })
      }
    }
    
    return activeItems
  }

  async deactivatePriceList(priceListId: string) {
    return await this.updateSupplierPriceLists(
      { id: priceListId },
      { is_active: false }
    )
  }

  async upsertPriceListItem(supplierId: string, itemData: {
    product_variant_id: string
    product_id: string
    supplier_sku?: string
    variant_sku?: string
    gross_price?: number
    discount_amount?: number
    discount_percentage?: number
    net_price: number
    quantity?: number
    lead_time_days?: number
    notes?: string
  }) {
    const activeList = await this.getActivePriceListForSupplier(supplierId)
    
    if (!activeList) {
      throw new Error(`No active price list found for supplier ${supplierId}`)
    }
    
    // Check if item already exists in the price list
    const [existingItem] = await this.listSupplierPriceListItems({
      price_list_id: activeList.id,
      product_variant_id: itemData.product_variant_id
    })
    
    if (existingItem) {
      // Update existing item
      return await this.updateSupplierPriceListItems(
        { id: existingItem.id },
        {
          supplier_sku: itemData.supplier_sku,
          variant_sku: itemData.variant_sku,
          gross_price: itemData.gross_price,
          discount_amount: itemData.discount_amount,
          discount_percentage: itemData.discount_percentage,
          net_price: itemData.net_price,
          quantity: itemData.quantity || 1,
          lead_time_days: itemData.lead_time_days,
          notes: itemData.notes
        }
      )
    } else {
      // Create new item
      return await this.createSupplierPriceListItems([{
        price_list_id: activeList.id,
        product_variant_id: itemData.product_variant_id,
        product_id: itemData.product_id,
        supplier_sku: itemData.supplier_sku,
        variant_sku: itemData.variant_sku,
        gross_price: itemData.gross_price,
        discount_amount: itemData.discount_amount,
        discount_percentage: itemData.discount_percentage,
        net_price: itemData.net_price,
        quantity: itemData.quantity || 1,
        lead_time_days: itemData.lead_time_days,
        notes: itemData.notes
      }])
    }
  }

  async getPriceListHistory(supplierId: string, config?: any) {
    return await this.listSupplierPriceLists(
      { supplier_id: supplierId },
      { order: { version: 'DESC' }, ...config }
    )
  }

  async getPriceListHistoryAndCount(supplierId: string, brandId?: string, config?: any) {
    const filters: any = { supplier_id: supplierId }
    if (brandId) {
      filters.brand_id = brandId
    }

    return await this.listAndCountSupplierPriceLists(
      filters,
      { order: { version: 'DESC' }, ...config }
    )
  }

  // ==========================================
  // CROSS-ENTITY BUSINESS LOGIC
  // ==========================================
  
  async findBestSupplierForProduct(productVariantId: string) {
    // Get both supplier products and price list items
    const [supplierProducts, priceListItems] = await Promise.all([
      this.listSupplierProducts({
        product_variant_id: productVariantId,
        is_active: true
      }),
      this.getProductPricingFromPriceLists(productVariantId)
    ])

    // Combine all pricing options
    const allOptions = []
    
    // Add supplier products
    for (const sp of supplierProducts) {
      allOptions.push({
        type: 'supplier_product',
        supplier_id: sp.supplier_id,
        cost_price: sp.cost_price,
        is_preferred_supplier: sp.is_preferred_supplier,
        supplier_sku: sp.supplier_sku,
        minimum_order_quantity: sp.minimum_order_quantity,
        lead_time_days: sp.lead_time_days,
        data: sp
      })
    }
    
    // Add price list items (may override supplier products)
    for (const item of priceListItems) {
      allOptions.push({
        type: 'price_list',
        supplier_id: item.price_list.supplier_id,
        cost_price: item.net_price,
        is_preferred_supplier: false, // Price lists don't have preferred status
        supplier_sku: item.supplier_sku,
        minimum_order_quantity: item.quantity,
        lead_time_days: item.lead_time_days,
        data: item
      })
    }

    if (allOptions.length === 0) {
      return null
    }

    // Sort by cost price (ascending) and preferred supplier status
    const sorted = allOptions.sort((a, b) => {
      if (a.is_preferred_supplier && !b.is_preferred_supplier) return -1
      if (!a.is_preferred_supplier && b.is_preferred_supplier) return 1
      return a.cost_price - b.cost_price
    })

    return sorted[0]
  }

  async getDashboardStats() {
    const [suppliers, purchaseOrders] = await Promise.all([
      this.listSuppliers(),
      this.listPurchaseOrders()
    ])

    const activeSuppliers = suppliers.filter(s => s.is_active)
    const pendingOrders = purchaseOrders.filter(po =>
      ['draft', 'sent', 'confirmed'].includes(po.status)
    )

    return {
      total_suppliers: suppliers.length,
      active_suppliers: activeSuppliers.length,
      total_purchase_orders: purchaseOrders.length,
      pending_orders: pendingOrders.length,
      recent_orders: purchaseOrders.slice(0, 5)
    }
  }

  // ==========================================
  // PRICING SYNC BUSINESS LOGIC
  // ==========================================

  /**
   * Update supplier pricing configuration settings
   */
  async updateSupplierPricingSettings(supplierId: string, settings: {
    is_pricing_source?: boolean
    auto_sync_prices?: boolean
    pricing_priority?: number
  }) {
    const updated = await this.updateSuppliers(
      { id: supplierId },
      {
        is_pricing_source: settings.is_pricing_source,
        auto_sync_prices: settings.auto_sync_prices,
        pricing_priority: settings.pricing_priority,
      }
    )
    return updated
  }

  /**
   * Update sync status for a price list item
   */
  async updatePriceListItemSyncStatus(itemId: string, status: {
    sync_status: string
    sync_error?: string
    last_synced_at?: Date
  }) {
    const updated = await this.updateSupplierPriceListItems(
      { id: itemId },
      {
        sync_status: status.sync_status,
        sync_error: status.sync_error || null,
        last_synced_at: status.last_synced_at || new Date(),
      }
    )
    return updated
  }

  /**
   * Get suppliers configured as pricing sources
   */
  async getPricingSourceSuppliers() {
    return await this.listSuppliers({
      is_pricing_source: true,
      is_active: true,
    })
  }

  /**
   * Get price list items pending sync
   */
  async getPendingSyncItems(priceListId?: string) {
    const filters: any = {
      sync_status: { $in: ['pending', 'error', null] },
      gross_price: { $ne: null },
    }

    if (priceListId) {
      filters.price_list_id = priceListId
    }

    return await this.listSupplierPriceListItems(filters)
  }

  /**
   * Mark price list items as pending sync
   */
  async markItemsAsPendingSync(itemIds: string[]) {
    const updates = itemIds.map(id => ({
      id,
      sync_status: 'pending',
      sync_error: null,
    }))

    return await this.updateSupplierPriceListItems(updates)
  }

  // ==========================================
  // PARSER CONFIGURATION MANAGEMENT
  // ==========================================

  /**
   * Get parser configuration for a supplier from metadata
   * @param supplierId - The supplier ID
   * @returns Parser configuration or null if not set
   */
  async getSupplierParserConfig(supplierId: string): Promise<ParserConfig | null> {
    try {
      const supplier = await this.retrieveSupplier(supplierId, {
        select: ["id", "metadata"]
      })

      return supplier?.metadata?.price_list_parser || null
    } catch (error) {
      this.logger_.error("Failed to get supplier parser config", {
        supplierId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * Update parser configuration for a supplier in metadata
   * @param supplierId - The supplier ID
   * @param config - The parser configuration to save
   */
  async updateSupplierParserConfig(
    supplierId: string,
    config: ParserConfig
  ): Promise<void> {
    try {
      // Validate config first
      const validation = await this.validateParserConfig(config)
      if (!validation.valid) {
        throw new Error(`Invalid parser config: ${validation.errors.join(', ')}`)
      }

      const supplier = await this.retrieveSupplier(supplierId)

      const updatedMetadata = {
        ...supplier.metadata,
        price_list_parser: config
      }

      await this.updateSuppliers(
        { id: supplierId },
        { metadata: updatedMetadata }
      )

      this.logger_.info("Updated supplier parser config", {
        supplierId,
        parserType: config.type,
        templateName: config.template_name
      })
    } catch (error) {
      this.logger_.error("Failed to update supplier parser config", {
        supplierId,
        error: error.message
      })
      throw error
    }
  }

  /**
   * List all available parser templates
   * @returns Array of parser templates
   */
  async listParserTemplates(): Promise<ParserTemplate[]> {
    return listTemplates()
  }

  /**
   * Get a specific parser template by name
   * @param templateName - The template identifier
   * @returns Parser configuration or null if not found
   */
  async getParserTemplate(templateName: string): Promise<ParserConfig | null> {
    const template = PARSER_TEMPLATES[templateName]
    if (!template) return null

    return {
      type: template.type,
      template_name: templateName,
      config: template.config
    }
  }

  /**
   * Detect parser type from file content and filename
   * @param fileContent - The file content as string
   * @param fileName - The file name with extension
   * @returns Detected parser type
   */
  async detectParserFromContent(
    fileContent: string,
    fileName: string
  ): Promise<ParserType> {
    // Simple detection based on file extension and content
    const extension = fileName.split('.').pop()?.toLowerCase()

    if (extension === 'csv' || extension === 'tsv') {
      return 'csv'
    }

    if (extension === 'txt') {
      // Check if content has delimiters
      const firstLine = fileContent.split('\n')[0]
      if (firstLine.includes(',') || firstLine.includes('\t')) {
        return 'csv'
      }
      return 'fixed-width'
    }

    // Default to CSV
    return 'csv'
  }

  /**
   * Match CSV headers to known field names using aliases
   * @param headers - Array of column headers from CSV
   * @param fieldAliases - Optional custom field aliases (defaults to FIELD_ALIASES)
   * @returns Mapping of field names to actual headers
   */
  async matchColumnsToFields(
    headers: string[],
    fieldAliases: Record<string, string[]> = FIELD_ALIASES
  ): Promise<Record<string, string>> {
    const mapping: Record<string, string> = {}

    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const header of headers) {
        const normalizedHeader = header.toLowerCase().trim().replace(/[_\s-]/g, '')

        for (const alias of aliases) {
          const normalizedAlias = alias.toLowerCase().trim().replace(/[_\s-]/g, '')

          // Exact match or contains match
          if (normalizedHeader === normalizedAlias ||
              normalizedHeader.includes(normalizedAlias) ||
              normalizedAlias.includes(normalizedHeader)) {
            mapping[field] = header
            break
          }
        }

        if (mapping[field]) break
      }
    }

    return mapping
  }

  /**
   * Validate parser configuration
   * @param config - The parser configuration to validate
   * @returns Validation result with errors if any
   */
  async validateParserConfig(config: ParserConfig): Promise<{ valid: boolean, errors: string[] }> {
    const errors: string[] = []

    if (!config.type) {
      errors.push("Parser type is required")
    }

    if (config.type === 'csv') {
      const csvConfig = config.config as CsvConfig
      if (!csvConfig.delimiter) {
        errors.push("CSV delimiter is required")
      }
      if (csvConfig.skip_rows < 0) {
        errors.push("Skip rows must be non-negative")
      }
      if (!csvConfig.column_mapping || Object.keys(csvConfig.column_mapping).length === 0) {
        errors.push("Column mapping is required")
      }
    }

    if (config.type === 'fixed-width') {
      const fwConfig = config.config as FixedWidthConfig
      if (!fwConfig.fixed_width_columns || fwConfig.fixed_width_columns.length === 0) {
        errors.push("Fixed-width columns are required")
      }
      if (fwConfig.skip_rows < 0) {
        errors.push("Skip rows must be non-negative")
      }

      // Validate column definitions
      for (const col of fwConfig.fixed_width_columns || []) {
        if (!col.field) {
          errors.push("Column field name is required")
        }
        if (col.start < 0) {
          errors.push(`Column ${col.field}: start position must be non-negative`)
        }
        if (col.width <= 0) {
          errors.push(`Column ${col.field}: width must be positive`)
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }
}

export default PurchasingService 