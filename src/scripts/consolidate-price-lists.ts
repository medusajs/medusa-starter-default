import { MedusaApp } from "@medusajs/framework"
import { PURCHASING_MODULE } from "../modules/purchasing"
import PurchasingService from "../modules/purchasing/service"

/**
 * Migration script to consolidate multiple price lists per supplier into single active price lists
 * This script should be run after deploying the new price list model
 */
async function consolidatePriceLists() {
  const app = await MedusaApp.create({
    // Add your configuration here
  })

  const purchasingService = app.modules[PURCHASING_MODULE] as PurchasingService

  try {
    console.log("Starting price list consolidation...")

    // Get all suppliers
    const suppliers = await purchasingService.listSuppliers()
    console.log(`Found ${suppliers.length} suppliers to process`)

    for (const supplier of suppliers) {
      console.log(`Processing supplier: ${supplier.name} (${supplier.id})`)
      
      // Get all price lists for this supplier
      const priceLists = await purchasingService.listSupplierPriceLists({
        supplier_id: supplier.id
      })
      
      if (priceLists.length === 0) {
        console.log(`  No price lists found for supplier ${supplier.name}`)
        continue
      }
      
      if (priceLists.length === 1) {
        // Already has single price list, just ensure it's active and has version
        const priceList = priceLists[0]
        await purchasingService.updateSupplierPriceLists(
          { id: priceList.id },
          { 
            is_active: true,
            version: priceList.version || 1
          }
        )
        console.log(`  Updated single price list for ${supplier.name}`)
        continue
      }
      
      console.log(`  Found ${priceLists.length} price lists, consolidating...`)
      
      // Find the most recent active price list or the most recent one
      let activePriceList = priceLists.find(pl => pl.is_active)
      if (!activePriceList) {
        activePriceList = priceLists.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0]
      }
      
      // Collect all items from all price lists
      const allItems = []
      const itemsByVariant = new Map()
      
      for (const priceList of priceLists) {
        const items = await purchasingService.listSupplierPriceListItems({
          price_list_id: priceList.id
        })
        
        for (const item of items) {
          const key = item.product_variant_id
          // Keep the most recent item for each variant
          if (!itemsByVariant.has(key) || 
              new Date(item.updated_at) > new Date(itemsByVariant.get(key).updated_at)) {
            itemsByVariant.set(key, item)
          }
        }
      }
      
      allItems.push(...Array.from(itemsByVariant.values()))
      
      // Create new consolidated price list
      const consolidatedPriceList = await purchasingService.createSupplierPriceList({
        supplier_id: supplier.id,
        name: `Consolidated Price List - ${supplier.name}`,
        description: `Consolidated from ${priceLists.length} price lists on ${new Date().toISOString()}`,
        currency_code: activePriceList.currency_code,
        effective_date: activePriceList.effective_date,
        expiry_date: activePriceList.expiry_date
      })
      
      // Add all items to the new price list
      if (allItems.length > 0) {
        await purchasingService.processPriceListItems(
          consolidatedPriceList.id,
          allItems.map(item => ({
            product_variant_id: item.product_variant_id,
            product_id: item.product_id,
            supplier_sku: item.supplier_sku,
            variant_sku: item.variant_sku,
            cost_price: item.cost_price,
            quantity: item.quantity,
            lead_time_days: item.lead_time_days,
            notes: item.notes
          }))
        )
      }
      
      // Deactivate old price lists
      for (const oldPriceList of priceLists) {
        await purchasingService.updateSupplierPriceLists(
          { id: oldPriceList.id },
          { is_active: false }
        )
      }
      
      console.log(`  Consolidated ${priceLists.length} price lists into 1 with ${allItems.length} items`)
    }
    
    console.log("Price list consolidation completed successfully!")
    
  } catch (error) {
    console.error("Error during price list consolidation:", error)
    throw error
  } finally {
    await app.close()
  }
}

// Run the migration
consolidatePriceLists()
  .then(() => {
    console.log("Migration completed successfully")
    process.exit(0)
  })
  .catch((error) => {
    console.error("Migration failed:", error)
    process.exit(1)
  })