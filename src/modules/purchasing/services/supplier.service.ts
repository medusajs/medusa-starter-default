import { MedusaService } from "@medusajs/framework/utils"
import Supplier from "../models/supplier.model"
import SupplierProduct from "../models/supplier-product.model"

class SupplierService extends MedusaService({
  Supplier,
  SupplierProduct,
}) {
  // Supplier-specific business logic
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
}

export default SupplierService 